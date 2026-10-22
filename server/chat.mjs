// 실시간 채팅: 전체 · 진영 · 연맹 채널.
// 받기는 /api/chat/stream(서버 전송 이벤트, 연결이 안 되면 클라이언트가 3초마다 history로 확인), 보내기는 tRPC chat.send.
// 연맹 채널은 유저 연맹(server/guild.mjs)의 연맹 채팅을 그대로 쓴다(같은 글이 연맹 화면에도 보인다).
import { currentFaction, displayName, isGuestUser, socialDb } from './social-db.mjs'

// ── 연맹 연결: routers.mjs가 guildService로 채운다 ───────────
let guildBridge = null
/** membership(userId) → { guildId, name } | null, history(userId, afterId) → [{ id, userId, name, text, at }], say(userId, text) → { id } */
export function setGuildBridge(bridge) { guildBridge = bridge }
async function guildOf(userId) {
  if (!guildBridge) return null
  try { return await guildBridge.membership(userId) } catch { return null }
}
function guildMessageView(row, guildName) {
  return { id: Number(row.id), userId: Number(row.userId), name: row.name, faction: null, allianceName: guildName ?? null, content: row.text, createdAt: new Date(Number(row.at) || Date.now()).toISOString() }
}

export const CHAT_MAX_LENGTH = 100
export const CHAT_COOLDOWN_MS = 2000
export const CHAT_HISTORY = 50
export const CHAT_KEEP_DAYS = 7
const DUPLICATE_WINDOW_MS = 30_000

// 욕설 · 비하 표현은 글자 수만큼 ○로 가린다(띄어쓰기 · 기호를 섞어도 잡는다)
const BANNED = ['씨발', '시발', '씨팔', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', 'ㅄ', '개새끼', '개새기', '새끼', '좆', '지랄', 'ㅈㄹ', '미친놈', '미친년', '닥쳐', '꺼져', '엠창', '느금', '니애미', '애미', '애비', '썅', 'fuck', 'shit']
const BANNED_RE = BANNED.map(word => new RegExp(word.split('').map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s._\\-*~!]*'), 'giu'))
export function maskBadWords(text) {
  let out = text
  for (const re of BANNED_RE) out = out.replace(re, match => '○'.repeat([...match.replace(/[\s._\-*~!]/g, '')].length))
  return out
}

/** 채팅 글 정리: 줄바꿈 · 연속 공백 제거, 길이 제한, 한 글자 도배 줄이기 */
export function cleanChatText(raw) {
  let text = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  text = text.replace(/(.)\1{9,}/gu, (_m, ch) => ch.repeat(9))
  return [...text].slice(0, CHAT_MAX_LENGTH).join('')
}

function fail(message) { throw new Error(message) }

/** 채널 이름 → 실제 저장 키 */
async function channelKey(user, channel) {
  if (channel === 'all') return { key: 'all' }
  const faction = await currentFaction(user.id)
  if (channel === 'faction') {
    if (!faction) fail('진영을 먼저 선택해 주세요.')
    return { key: `faction:${faction}`, faction }
  }
  if (channel === 'alliance') {
    const guild = await guildOf(user.id)
    if (!guild) fail('연맹에 가입하면 연맹 채팅을 쓸 수 있습니다.')
    return { key: `alliance:${guild.guildId}`, faction, guild }
  }
  fail('없는 채널입니다.')
}

function messageView(row) {
  return { id: Number(row.id), userId: Number(row.userId), name: row.name, faction: row.faction ?? null, allianceName: row.allianceName ?? null, content: row.content, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt }
}

async function blockedIds(userId) {
  const db = await socialDb()
  const [rows] = await db.query('SELECT blockedUserId FROM game_chat_blocks WHERE userId=?', [userId])
  return new Set(rows.map(row => Number(row.blockedUserId)))
}

// ── 실시간 연결 관리 ──────────────────────────────────────────
// 연결마다 그 유저가 들을 수 있는 채널 키와 차단 목록을 들고 있다.
const clients = new Set()

async function subscriptionFor(user) {
  const faction = await currentFaction(user.id)
  const guild = await guildOf(user.id)
  const keys = new Map([['all', 'all']])
  if (faction) keys.set(`faction:${faction}`, 'faction')
  if (guild) keys.set(`alliance:${guild.guildId}`, 'alliance')
  return { keys, blocked: await blockedIds(user.id), alliance: guild ? { id: guild.guildId, name: guild.name } : null, faction }
}

function sendEvent(client, event, data) {
  try { client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) } catch { /* 끊긴 연결은 close에서 정리 */ }
}

/** 이 유저의 연결들이 듣는 채널을 다시 계산(연맹 가입 · 탈퇴 · 진영 변경 · 차단 후) */
export async function refreshChatUser(userId) {
  for (const client of clients) {
    if (Number(client.user.id) !== Number(userId)) continue
    try {
      const before = [...client.keys.keys()].sort().join('|')
      Object.assign(client, await subscriptionFor(client.user))
      // 채널이 실제로 바뀐 경우에만 알린다. 알림을 받은 화면은 chat.status를 다시 묻고, chat.status도
      // 이 함수를 부르므로 바뀌지 않았는데 알리면 끝없이 서로 부른다(창이 깜빡이던 문제, 2026.10.18).
      if ([...client.keys.keys()].sort().join('|') !== before) sendEvent(client, 'channels', { faction: client.faction, alliance: client.alliance })
    } catch { /* 다음 연결 때 다시 */ }
  }
}

function broadcast(key, message) {
  for (const client of clients) {
    const channel = client.keys.get(key)
    if (!channel || client.blocked.has(message.userId)) continue
    sendEvent(client, 'message', { channel, message })
  }
}
function broadcastDelete(id) { for (const client of clients) sendEvent(client, 'delete', { id }) }

/** GET /api/chat/stream: 로그인한 유저에게 새 채팅을 바로 보낸다 */
export function registerChatStream(app, authenticate) {
  app.get('/api/chat/stream', async (req, res) => {
    let user
    try { user = await authenticate(req) } catch { user = null }
    if (!user) return res.status(401).json({ error: 'login_required' })
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()
    const client = { user, res, keys: new Map([['all', 'all']]), blocked: new Set(), alliance: null, faction: null }
    try { Object.assign(client, await subscriptionFor(user)) } catch { /* 전체 채널만 */ }
    clients.add(client)
    res.write('retry: 4000\n\n')
    sendEvent(client, 'hello', { faction: client.faction, alliance: client.alliance })
    const ping = setInterval(() => { try { res.write(': ping\n\n') } catch { /* close에서 정리 */ } }, 20_000)
    req.on('close', () => { clearInterval(ping); clients.delete(client) })
  })
}

export function chatOnlineCount() { return new Set([...clients].map(client => client.user.id)).size }

// ── 기능 ─────────────────────────────────────────────────────
const lastSent = new Map()

/** 채널 기록: afterId가 있으면 그 뒤 새 글만(3초 확인 방식용) */
export async function chatHistory(user, input) {
  const db = await socialDb()
  const { key, guild } = await channelKey(user, input.channel)
  const blocked = await blockedIds(user.id)
  const after = Number(input.afterId ?? 0)
  if (guild) {
    const rows = await guildBridge.history(user.id, after)
    const messages = rows.map(row => guildMessageView(row, guild.name)).filter(message => !blocked.has(message.userId))
    return { channel: input.channel, messages: after ? messages : messages.slice(-CHAT_HISTORY), online: chatOnlineCount() }
  }
  const [rows] = after > 0
    ? await db.query('SELECT id,userId,name,faction,allianceName,content,createdAt FROM game_chat_messages WHERE channel=? AND deleted=0 AND id>? ORDER BY id LIMIT 100', [key, after])
    : await db.query('SELECT id,userId,name,faction,allianceName,content,createdAt FROM game_chat_messages WHERE channel=? AND deleted=0 ORDER BY id DESC LIMIT ?', [key, CHAT_HISTORY])
  const messages = rows.map(messageView).filter(message => !blocked.has(message.userId))
  if (!after) messages.reverse()
  return { channel: input.channel, messages, online: chatOnlineCount() }
}

/** 지금 들을 수 있는 채널 · 내 상태 */
export async function chatStatus(user) {
  const sub = await subscriptionFor(user)
  // 연맹 가입 · 탈퇴는 연맹 화면에서 일어나므로, 상태를 물을 때 실시간 연결의 채널도 다시 맞춘다
  void refreshChatUser(user.id)
  const db = await socialDb()
  const [[mute]] = await db.query('SELECT untilAt,reason FROM game_chat_mutes WHERE userId=? AND untilAt>NOW(3) LIMIT 1', [user.id])
  return { faction: sub.faction, alliance: sub.alliance, canWrite: !isGuestUser(user), guest: isGuestUser(user), mutedUntil: mute ? new Date(mute.untilAt).toISOString() : null, muteReason: mute?.reason ?? '', online: chatOnlineCount(), maxLength: CHAT_MAX_LENGTH, cooldownMs: CHAT_COOLDOWN_MS, isAdmin: user.role === 'admin' }
}

export async function sendChat(user, input, now = Date.now()) {
  // 게스트는 전체 · 진영 채널을 읽기만 한다(연맹 채널은 연맹 규칙대로 쓸 수 있다)
  if (isGuestUser(user) && input.channel !== 'alliance') fail('게스트 계정은 전체 · 진영 채팅을 읽기만 할 수 있습니다. 회원으로 로그인하면 쓸 수 있습니다.')
  const content = maskBadWords(cleanChatText(input.content))
  if (!content) fail('내용을 입력해 주세요.')
  const last = lastSent.get(user.id)
  if (last && now - last.at < CHAT_COOLDOWN_MS) fail('너무 빠릅니다. 잠시 후 다시 보내 주세요.')
  if (last && last.content === content && now - last.at < DUPLICATE_WINDOW_MS) fail('같은 말을 연달아 보낼 수 없습니다.')
  const db = await socialDb()
  const [[mute]] = await db.query('SELECT untilAt FROM game_chat_mutes WHERE userId=? AND untilAt>NOW(3) LIMIT 1', [user.id])
  if (mute) fail(`채팅이 금지된 상태입니다. (${new Date(mute.untilAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}까지)`)
  const { key, faction: keyFaction, guild } = await channelKey(user, input.channel)
  lastSent.set(user.id, { at: now, content })
  if (guild) {
    const result = await guildBridge.say(user.id, content)
    const message = { id: Number(result.id), userId: Number(user.id), name: displayName(user), faction: null, allianceName: guild.name, content, createdAt: new Date(now).toISOString() }
    broadcast(key, message)
    return { channel: input.channel, message }
  }
  const faction = keyFaction ?? await currentFaction(user.id)
  const allianceName = (await guildOf(user.id))?.name ?? null
  const name = displayName(user)
  const [result] = await db.execute('INSERT INTO game_chat_messages (channel,userId,name,faction,allianceName,content) VALUES (?,?,?,?,?,?)', [key, user.id, name, faction, allianceName, content])
  const message = { id: Number(result.insertId), userId: Number(user.id), name, faction, allianceName, content, createdAt: new Date(now).toISOString() }
  broadcast(key, message)
  // 오래된 글 정리(가끔 한 번)
  if (Math.random() < 0.02) void db.execute(`DELETE FROM game_chat_messages WHERE createdAt < NOW(3) - INTERVAL ${CHAT_KEEP_DAYS} DAY`).catch(() => {})
  return { channel: input.channel, message }
}

export async function listBlocks(user) {
  const db = await socialDb()
  const [rows] = await db.query('SELECT blockedUserId,blockedName,createdAt FROM game_chat_blocks WHERE userId=? ORDER BY createdAt DESC', [user.id])
  return rows.map(row => ({ userId: Number(row.blockedUserId), name: row.blockedName, createdAt: row.createdAt }))
}

export async function blockUser(user, input) {
  if (Number(input.userId) === Number(user.id)) fail('자기 자신은 차단할 수 없습니다.')
  const db = await socialDb()
  await db.execute('INSERT INTO game_chat_blocks (userId,blockedUserId,blockedName) VALUES (?,?,?) ON DUPLICATE KEY UPDATE blockedName=VALUES(blockedName)', [user.id, input.userId, String(input.name ?? '').slice(0, 64) || '장군'])
  await refreshChatUser(user.id)
  return listBlocks(user)
}

export async function unblockUser(user, input) {
  const db = await socialDb()
  await db.execute('DELETE FROM game_chat_blocks WHERE userId=? AND blockedUserId=?', [user.id, input.userId])
  await refreshChatUser(user.id)
  return listBlocks(user)
}

export async function reportMessage(user, input) {
  const db = await socialDb()
  const [[row]] = await db.query('SELECT id,userId,name,content FROM game_chat_messages WHERE id=? LIMIT 1', [input.messageId])
  if (!row) fail('메시지를 찾을 수 없습니다.')
  if (Number(row.userId) === Number(user.id)) fail('자기 메시지는 신고할 수 없습니다.')
  await db.execute('INSERT IGNORE INTO game_chat_reports (messageId,reporterUserId,targetUserId,targetName,content,reason) VALUES (?,?,?,?,?,?)', [row.id, user.id, row.userId, row.name, row.content, String(input.reason ?? '').trim().slice(0, 100)])
  return { ok: true }
}

// ── 운영자 ───────────────────────────────────────────────────
export async function adminDeleteMessage(id) {
  const db = await socialDb()
  await db.execute('UPDATE game_chat_messages SET deleted=1 WHERE id=?', [id])
  await db.execute('UPDATE game_chat_reports SET resolved=1 WHERE messageId=?', [id])
  broadcastDelete(Number(id))
  return { ok: true, id: Number(id) }
}

/** 채팅 금지(분). 0이면 해제 */
export async function adminMuteUser(input) {
  const db = await socialDb()
  if (!input.minutes) await db.execute('DELETE FROM game_chat_mutes WHERE userId=?', [input.userId])
  else await db.execute('INSERT INTO game_chat_mutes (userId,untilAt,reason) VALUES (?,NOW(3) + INTERVAL ? MINUTE,?) ON DUPLICATE KEY UPDATE untilAt=VALUES(untilAt),reason=VALUES(reason)', [input.userId, input.minutes, String(input.reason ?? '').slice(0, 100)])
  return { ok: true }
}

export async function adminReports() {
  const db = await socialDb()
  const [rows] = await db.query('SELECT r.id,r.messageId,r.targetUserId,r.targetName,r.content,r.reason,r.createdAt,(SELECT COUNT(*) FROM game_chat_reports x WHERE x.messageId=r.messageId AND x.resolved=0) AS reports FROM game_chat_reports r WHERE r.resolved=0 ORDER BY r.createdAt DESC LIMIT 100')
  return rows.map(row => ({ id: Number(row.id), messageId: Number(row.messageId), targetUserId: Number(row.targetUserId), targetName: row.targetName, content: row.content, reason: row.reason, reports: Number(row.reports ?? 1), createdAt: row.createdAt }))
}

export async function adminResolveReport(id) {
  const db = await socialDb()
  await db.execute('UPDATE game_chat_reports SET resolved=1 WHERE id=?', [id])
  return { ok: true }
}

/** 연맹 화면에서 보낸 연맹 채팅도 채팅 창에 바로 보낸다 */
export async function pushGuildChat(userId, sentId) {
  try {
    const guild = await guildOf(userId)
    if (!guild || !guildBridge) return
    const rows = await guildBridge.history(userId, Math.max(0, Number(sentId) - 1))
    const row = rows.find(item => Number(item.id) === Number(sentId))
    if (row) broadcast(`alliance:${guild.guildId}`, guildMessageView(row, guild.name))
  } catch { /* 채팅 창은 다음 확인 때 받는다 */ }
}

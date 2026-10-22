// 아이디 · 비밀번호 계정(Manus 로그인 대신). 비밀번호는 scrypt 해시로만 저장한다.
//  POST /api/account/signup { name, password } → 계정 생성 + 세션 쿠키, { ok, token, name }
//  POST /api/account/login  { name, password } → 세션 쿠키, { ok, token, name }
// 토큰은 접속기(안드로이드 앱)가 기기에 보관해 Authorization: Bearer 로도 보낼 수 있다.
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { validateGuestName } from './guest-auth.mjs'

const scrypt = promisify(scryptCb)
export const MEMBER_OPEN_ID_PREFIX = 'member_'
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 64
const KEY_LEN = 64
const SIGNUP_LIMIT = 5
const SIGNUP_WINDOW_MS = 60 * 60 * 1000
const LOGIN_LIMIT = 10
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export function validatePassword(raw) {
  const password = typeof raw === 'string' ? raw : ''
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return { ok: false, reason: `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자입니다.` }
  return { ok: true, password }
}

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEY_LEN)
  return `scrypt$${salt.toString('base64')}$${Buffer.from(key).toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [kind, saltB64, keyB64] = String(stored ?? '').split('$')
  if (kind !== 'scrypt' || !saltB64 || !keyB64) return false
  const expected = Buffer.from(keyB64, 'base64')
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function createWindowLimiter(limit, windowMs, now) {
  const attempts = new Map()
  return key => {
    const t = now()
    const list = (attempts.get(key) ?? []).filter(at => t - at < windowMs)
    if (list.length >= limit) { attempts.set(key, list); return false }
    list.push(t); attempts.set(key, list)
    return true
  }
}

const clientIp = req => String(req.headers['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim() || 'unknown'

export function registerAccountAuthRoutes(app, { json, sdk, findUserByName, findPasswordLogin, createPasswordUser, grantAdminByName, setSessionCookie, sessionMaxAgeMs, now = () => Date.now() }) {
  const allowSignup = createWindowLimiter(SIGNUP_LIMIT, SIGNUP_WINDOW_MS, now)
  const allowLogin = createWindowLimiter(LOGIN_LIMIT, LOGIN_WINDOW_MS, now)
  const issue = async (req, res, openId, name) => {
    await grantAdminByName?.(openId, name)
    const token = await sdk.createSessionToken(openId, { name, expiresInMs: sessionMaxAgeMs })
    setSessionCookie(req, res, token)
    res.json({ ok: true, token, name })
  }
  const guard = (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (!req.is('application/json')) { res.status(415).json({ ok: false, reason: 'json_required' }); return null }
    const name = validateGuestName(req.body?.name)
    if (!name.ok) { res.status(400).json(name); return null }
    const password = validatePassword(req.body?.password)
    if (!password.ok) { res.status(400).json(password); return null }
    return { name: name.name, password: password.password }
  }

  app.post('/api/account/signup', json, async (req, res) => {
    const input = guard(req, res)
    if (!input) return
    if (!allowSignup(clientIp(req))) return res.status(429).json({ ok: false, reason: '잠시 뒤 다시 시도하십시오(한 시간에 5개까지 만들 수 있습니다).' })
    try {
      if (await findUserByName(input.name)) return res.status(409).json({ ok: false, reason: '이미 쓰고 있는 아이디입니다. 다른 아이디를 입력하십시오.' })
      const openId = `${MEMBER_OPEN_ID_PREFIX}${randomUUID()}`
      await createPasswordUser(openId, input.name, await hashPassword(input.password))
      await issue(req, res, openId, input.name)
    } catch (error) {
      console.error('[account] signup failed', error instanceof Error ? error.message : error)
      res.status(500).json({ ok: false, reason: '계정을 만들지 못했습니다. 잠시 뒤 다시 시도하십시오.' })
    }
  })

  app.post('/api/account/login', json, async (req, res) => {
    const input = guard(req, res)
    if (!input) return
    if (!allowLogin(`${clientIp(req)}:${input.name.toLowerCase()}`)) return res.status(429).json({ ok: false, reason: '로그인 시도가 너무 많습니다. 10분 뒤 다시 시도하십시오.' })
    try {
      const row = await findPasswordLogin(input.name)
      if (!row || !(await verifyPassword(input.password, row.passwordHash))) return res.status(401).json({ ok: false, reason: '아이디 또는 비밀번호가 맞지 않습니다.' })
      await issue(req, res, row.openId, row.name ?? input.name)
    } catch (error) {
      console.error('[account] login failed', error instanceof Error ? error.message : error)
      res.status(500).json({ ok: false, reason: '로그인하지 못했습니다. 잠시 뒤 다시 시도하십시오.' })
    }
  })
}

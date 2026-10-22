import { royalBadge } from './guild-ui'
import type { RoyalInfo } from '../../server/guild.mjs'
// 실시간 채팅 창(전체 · 진영 · 연맹)과 연맹 관리.
// 화면 오른쪽 아래 인장 버튼 → 채팅 창. 받기는 서버 전송 이벤트(/api/chat/stream), 안 되면 몇 초마다 새 글 확인.
import { fxSeal } from './fx-icons'

export type ChatChannel = 'all' | 'faction' | 'alliance'
export interface ChatMessage { id: number; userId: number; name: string; faction: string | null; allianceName: string | null; content: string; createdAt: string }
interface ChatStatus { faction: string | null; alliance: { id: number; name: string } | null; canWrite: boolean; guest: boolean; mutedUntil: string | null; muteReason: string; online: number; maxLength: number; cooldownMs: number; isAdmin: boolean }
interface ChatReport { id: number; messageId: number; targetUserId: number; targetName: string; content: string; reason: string; reports: number }

export interface SocialSession { online: boolean; userId: number | null; guest: boolean; isAdmin: boolean; faction: string | null }
export interface SocialApi {
  query(procedure: string, input?: unknown): Promise<unknown>
  mutate(procedure: string, input?: unknown): Promise<unknown>
  /** 실시간 받기 주소(없으면 몇 초마다 확인) */
  streamUrl(): string | null
  session(): SocialSession
  /** 전투 중 등 채팅 버튼을 숨길 때 */
  hidden(): boolean
  notify(message: string, tone?: 'jade' | 'ember'): void
  /** 연맹 화면(만들기 · 가입 · 관리)으로 */
  openGuild(): void
}

const CHANNEL_LABEL: Record<ChatChannel, string> = { all: '전체', faction: '진영', alliance: '연맹' }
const FACTION_CLASS: Record<string, string> = { 촉한: 'shu', 위나라: 'wei', 오나라: 'wu', 재야: 'free' }
const MAX_KEEP = 150

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string)
}
function clock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
function errorText(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  return message && /[가-힣]/.test(message) ? message : fallback
}

export class SocialPanel {
  /** 이번 주 왕 · 황제(이름 옆 표시) */
  royal: RoyalInfo | null = null
  private readonly api: SocialApi
  private readonly host: HTMLElement
  private open = false
  private channel: ChatChannel = 'all'
  private readonly messages: Record<ChatChannel, ChatMessage[]> = { all: [], faction: [], alliance: [] }
  private readonly loaded: Record<ChatChannel, boolean> = { all: false, faction: false, alliance: false }
  private readonly unread: Record<ChatChannel, number> = { all: 0, faction: 0, alliance: 0 }
  private status: ChatStatus | null = null
  private blocked = new Map<number, string>()
  private reports: ChatReport[] | null = null
  private menuFor: number | null = null
  private sessionKey = ''
  private source: EventSource | null = null
  private live = false
  private lastPoll = 0
  private draft = ''
  private sending = false

  constructor(api: SocialApi) {
    this.api = api
    this.host = document.createElement('div')
    this.host.className = 'social-root'
    document.body.append(this.host)
    this.host.addEventListener('click', event => this.onClick(event))
    this.host.addEventListener('submit', event => this.onSubmit(event))
    this.host.addEventListener('input', event => {
      const target = event.target as HTMLInputElement
      if (target.matches('[data-chat-input]')) { this.draft = target.value; this.updateCounter() }
    })
    this.host.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.setOpen(false)
    })
    window.setInterval(() => this.tick(), 1000)
    this.tick()
  }

  /** 다른 곳(메뉴 등)에서 연맹 탭으로 열기 */
  openAlliance(): void { this.channel = 'alliance'; this.setOpen(true) }
  openChat(channel: ChatChannel = this.channel): void { this.channel = channel; this.setOpen(true) }

  // ── 연결 · 세션 ────────────────────────────────────────────
  private tick(): void {
    const session = this.api.session()
    const key = `${session.online}|${session.userId}|${session.faction}`
    if (key !== this.sessionKey) { this.sessionKey = key; this.resetSession(session) }
    const hidden = this.api.hidden()
    this.host.classList.toggle('is-hidden', hidden && !this.open)
    // 실시간 연결이 없으면: 창이 열렸을 땐 3초, 닫혔을 땐 20초마다 새 글 확인
    if (session.online && !this.live) {
      const every = this.open ? 3000 : 20_000
      if (Date.now() - this.lastPoll >= every) { this.lastPoll = Date.now(); void this.poll() }
    }
  }

  private resetSession(session: SocialSession): void {
    this.source?.close(); this.source = null; this.live = false
    for (const ch of ['all', 'faction', 'alliance'] as ChatChannel[]) { this.messages[ch] = []; this.loaded[ch] = false; this.unread[ch] = 0 }
    this.status = null; this.reports = null
    if (session.online) { void this.loadStatus(); this.connect() }
    this.render()
  }

  private connect(): void {
    const url = this.api.streamUrl()
    if (!url || typeof EventSource === 'undefined') return
    const source = new EventSource(url, { withCredentials: true })
    this.source = source
    // 다시 붙었을 때 끊긴 사이의 글을 한 번 받아 온다
    source.addEventListener('hello', () => { this.live = true; this.renderStatusLine(); void this.poll() })
    source.addEventListener('message', event => {
      const data = JSON.parse((event as MessageEvent).data) as { channel: ChatChannel; message: ChatMessage }
      this.receive(data.channel, [data.message])
    })
    source.addEventListener('delete', event => { const { id } = JSON.parse((event as MessageEvent).data) as { id: number }; this.removeMessage(id) })
    source.addEventListener('channels', () => { void this.loadStatus() })
    source.onerror = () => {
      this.live = false
      this.renderStatusLine()
      // 서버가 아예 막혀 있으면(401 등) 다시 붙지 않고 몇 초마다 확인으로 바꾼다
      if (source.readyState === EventSource.CLOSED) { this.source = null }
    }
  }

  private async poll(): Promise<void> {
    const channels: ChatChannel[] = ['all']
    if (this.status?.faction) channels.push('faction')
    if (this.status?.alliance) channels.push('alliance')
    for (const ch of channels) {
      if (!this.loaded[ch]) { if (this.open && ch === this.channel) await this.loadHistory(ch); continue }
      const after = this.messages[ch].at(-1)?.id ?? 0
      try {
        const result = await this.api.query('chat.history', { channel: ch, afterId: after }) as { messages: ChatMessage[]; online: number }
        if (this.status) this.status.online = result.online
        this.receive(ch, result.messages)
      } catch { /* 다음에 다시 */ }
    }
  }

  private async loadStatus(): Promise<void> {
    try {
      this.status = await this.api.query('chat.status') as ChatStatus
      if (!this.status.alliance) { this.messages.alliance = []; this.loaded.alliance = false }
    } catch { this.status = null }
    this.render()
    if (this.open) void this.loadHistory(this.channel)
  }

  private async loadHistory(ch: ChatChannel): Promise<void> {
    if (ch === 'faction' && !this.status?.faction) return
    if (ch === 'alliance' && !this.status?.alliance) return
    try {
      const result = await this.api.query('chat.history', { channel: ch }) as { messages: ChatMessage[]; online: number }
      this.messages[ch] = result.messages
      this.loaded[ch] = true
      if (this.status) this.status.online = result.online
    } catch (error) { this.api.notify(errorText(error, '채팅을 불러오지 못했습니다.'), 'ember') }
    if (ch === this.channel) this.render(true)
  }

  private receive(ch: ChatChannel, list: ChatMessage[]): void {
    const fresh = list.filter(message => !this.blocked.has(message.userId) && !this.messages[ch].some(item => item.id === message.id))
    if (!fresh.length) return
    this.messages[ch] = [...this.messages[ch], ...fresh].sort((a, b) => a.id - b.id).slice(-MAX_KEEP)
    const mine = this.api.session().userId
    const others = fresh.filter(message => message.userId !== mine).length
    if (!(this.open && ch === this.channel && this.view() === 'chat')) this.unread[ch] += others
    if (this.open && ch === this.channel) this.appendMessages(fresh)
    this.renderBadges()
  }

  private removeMessage(id: number): void {
    for (const ch of ['all', 'faction', 'alliance'] as ChatChannel[]) this.messages[ch] = this.messages[ch].filter(message => message.id !== id)
    this.host.querySelector(`[data-message-id="${id}"]`)?.remove()
  }

  // ── 열기 · 그리기 ──────────────────────────────────────────
  /** 창이 막 열릴 때만 나타나는 연출을 준다(다시 그릴 때마다 연출하면 깜빡인다) */
  private opening = false

  private setOpen(open: boolean): void {
    this.opening = open && !this.open
    this.open = open
    this.menuFor = null
    if (open) {
      this.unread[this.channel] = 0
      if (this.api.session().online) {
        if (!this.status) void this.loadStatus()
        else if (!this.loaded[this.channel]) void this.loadHistory(this.channel)
        if (!this.blocked.size) void this.loadBlocks()
      }
    }
    this.render(true)
  }

  private view(): 'chat' | 'noguild' {
    return this.channel === 'alliance' && this.status && !this.status.alliance ? 'noguild' : 'chat'
  }

  private totalUnread(): number { return this.unread.all + this.unread.faction + this.unread.alliance }

  private render(scrollBottom = false): void {
    const session = this.api.session()
    const total = this.totalUnread()
    const fab = `<button type="button" class="social-fab ${this.open ? 'is-open' : ''}" data-social="toggle" aria-label="채팅">${fxSeal('chat', 'bond')}<span class="social-fab__label">채팅</span>${total ? `<b class="social-fab__badge">${total > 99 ? '99+' : total}</b>` : ''}</button>`
    if (!this.open) { this.host.innerHTML = fab; return }
    const body = !session.online
      ? `<div class="social-empty">${fxSeal('mute', 'bond')}<p>채팅은 온라인 접속(회원 · 게스트 로그인) 후 이용할 수 있습니다.</p></div>`
      : this.view() === 'noguild' ? this.noGuildView() : this.chatView()
    const factionName = this.status?.faction ?? session.faction ?? '진영'
    const tabs = (['all', 'faction', 'alliance'] as ChatChannel[]).map(ch => {
      const label = ch === 'faction' ? factionName : ch === 'alliance' ? (this.status?.alliance?.name ?? '연맹') : '전체'
      return `<button type="button" class="social-tab ${ch === this.channel ? 'is-active' : ''}" data-social="tab" data-channel="${ch}"><small>${CHANNEL_LABEL[ch]}</small><span>${esc(label)}</span>${this.unread[ch] && ch !== this.channel ? `<b>${this.unread[ch]}</b>` : ''}</button>`
    }).join('')
    this.host.innerHTML = `${fab}<section class="social-panel${this.opening ? ' is-opening' : ''}" role="dialog" aria-label="채팅">
      <header class="social-head"><div class="social-title">${fxSeal('chat', 'bond')}<div><strong>천하 전령</strong><small data-social-status>${this.statusLine()}</small></div></div>
        <div class="social-head__actions">${this.status?.isAdmin ? '<button type="button" class="social-icon-btn" data-social="reports" title="신고 목록">신고</button>' : ''}<button type="button" class="social-icon-btn" data-social="blocks" title="차단 목록">차단</button><button type="button" class="social-close" data-social="toggle" aria-label="닫기">×</button></div></header>
      <nav class="social-tabs">${tabs}</nav>
      <div class="social-body">${body}</div>
    </section>`
    this.opening = false
    if (scrollBottom) this.scrollToBottom()
  }

  private statusLine(): string {
    if (!this.api.session().online) return '오프라인'
    const online = this.status ? ` · 접속 ${this.status.online}명` : ''
    return `${this.live ? '실시간 연결' : '몇 초마다 새 글 확인'}${online}`
  }
  private renderStatusLine(): void { const el = this.host.querySelector('[data-social-status]'); if (el) el.textContent = this.statusLine() }
  private renderBadges(): void {
    if (!this.open) { this.render(); return }
    const total = this.totalUnread()
    const fabBadge = this.host.querySelector('.social-fab__badge')
    if (total && !fabBadge) this.host.querySelector('.social-fab')?.insertAdjacentHTML('beforeend', `<b class="social-fab__badge">${total}</b>`)
    else if (fabBadge) { if (total) fabBadge.textContent = String(total); else fabBadge.remove() }
    this.host.querySelectorAll<HTMLElement>('.social-tab').forEach(tab => {
      const ch = tab.dataset.channel as ChatChannel
      const n = ch === this.channel ? 0 : this.unread[ch]
      const badge = tab.querySelector('b')
      if (n && !badge) tab.insertAdjacentHTML('beforeend', `<b>${n}</b>`)
      else if (badge) { if (n) badge.textContent = String(n); else badge.remove() }
    })
  }

  private messageHtml(message: ChatMessage): string {
    const session = this.api.session()
    const mine = message.userId === session.userId
    const faction = message.faction ? `<i class="social-faction is-${FACTION_CLASS[message.faction] ?? 'free'}" title="${esc(message.faction)}"></i>` : ''
    const tag = message.allianceName && this.channel !== 'alliance' ? `<em class="social-tag" data-no-tr>${esc(message.allianceName)}</em>` : ''
    const royal = royalBadge(this.royal, { userId: message.userId, name: message.name })
    const menu = this.menuFor === message.id ? this.menuHtml(message) : ''
    return `<li class="social-msg ${mine ? 'is-mine' : ''}" data-message-id="${message.id}"><div class="social-msg__meta">${faction}<button type="button" class="social-name" data-social="name" data-id="${message.id}" ${mine ? 'disabled' : ''} data-no-tr>${esc(message.name)}</button>${royal}${tag}<time>${clock(message.createdAt)}</time></div><p data-no-tr>${esc(message.content)}</p>${menu}</li>`
  }

  private menuHtml(message: ChatMessage): string {
    const admin = this.status?.isAdmin
    return `<div class="social-menu"><button type="button" data-social="block" data-user="${message.userId}" data-name="${esc(message.name)}">차단</button><button type="button" data-social="report" data-id="${message.id}">신고</button>${admin ? `<button type="button" data-social="admin-delete" data-id="${message.id}">삭제</button><button type="button" data-social="admin-mute" data-user="${message.userId}" data-minutes="30">30분 금지</button><button type="button" data-social="admin-mute" data-user="${message.userId}" data-minutes="1440">하루 금지</button>` : ''}</div>`
  }

  private chatView(): string {
    const ch = this.channel
    const list = this.messages[ch].filter(message => !this.blocked.has(message.userId))
    const status = this.status
    const allianceBar = ch === 'alliance' && status?.alliance ? `<div class="social-alliance-bar"><span>${fxSeal('bond', 'bond')}<b data-no-tr>${esc(status.alliance.name)}</b><small>연맹 채팅</small></span><button type="button" class="social-ghost" data-social="guild">연맹 화면</button></div>` : ''
    const empty = !this.loaded[ch] ? '<li class="social-hint">불러오는 중…</li>' : list.length ? '' : `<li class="social-hint">${ch === 'all' ? '천하의 모든 장수가 듣습니다. 첫 인사를 건네 보세요.' : ch === 'faction' ? '같은 진영 장수끼리만 보이는 채널입니다.' : '연맹원끼리만 보이는 채널입니다.'}</li>`
    let footer: string
    if (!status) footer = '<p class="social-note">채팅 상태를 확인하는 중…</p>'
    else if (status.guest && ch !== 'alliance') footer = '<p class="social-note">게스트 계정은 전체 · 진영 채팅을 읽기만 할 수 있습니다. 회원으로 로그인하면 쓸 수 있습니다. (연맹 채팅은 쓸 수 있습니다)</p>'
    else if (status.mutedUntil && new Date(status.mutedUntil).getTime() > Date.now()) footer = `<p class="social-note is-warn">채팅 금지 중 · ${new Date(status.mutedUntil).toLocaleString('ko-KR')}까지${status.muteReason ? ` (${esc(status.muteReason)})` : ''}</p>`
    else footer = `<form class="social-form" data-social-form><input data-chat-input maxlength="${status.maxLength}" placeholder="${CHANNEL_LABEL[ch]} 채널에 말하기" autocomplete="off" value="${esc(this.draft)}"><span class="social-count" data-chat-count>${[...this.draft].length}/${status.maxLength}</span><button type="submit" class="social-send" ${this.sending ? 'disabled' : ''}>보내기</button></form>`
    return `${allianceBar}<ol class="social-list" data-social-list>${empty}${list.map(message => this.messageHtml(message)).join('')}</ol>${footer}`
  }

  private noGuildView(): string {
    return `<div class="social-empty">${fxSeal('bond', 'bond')}<p>아직 가입한 연맹이 없습니다.<br>연맹 화면에서 같은 진영의 연맹을 찾아 가입하거나 새로 세울 수 있습니다.</p><button type="button" class="social-gold" data-social="guild">연맹 화면 열기</button></div>`
  }

  private appendMessages(list: ChatMessage[]): void {
    const ol = this.host.querySelector<HTMLElement>('[data-social-list]')
    if (!ol || this.view() !== 'chat') return
    const nearBottom = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 80
    ol.querySelector('.social-hint')?.remove()
    ol.insertAdjacentHTML('beforeend', list.map(message => this.messageHtml(message)).join(''))
    while (ol.children.length > MAX_KEEP) ol.firstElementChild?.remove()
    const mine = list.some(message => message.userId === this.api.session().userId)
    if (nearBottom || mine) ol.scrollTop = ol.scrollHeight
  }

  private scrollToBottom(): void {
    const ol = this.host.querySelector<HTMLElement>('[data-social-list]')
    if (ol) ol.scrollTop = ol.scrollHeight
  }

  private updateCounter(): void {
    const el = this.host.querySelector('[data-chat-count]')
    if (el && this.status) el.textContent = `${[...this.draft].length}/${this.status.maxLength}`
  }

  // ── 차단 목록 ─────────────────────────────────────────────
  private async loadBlocks(): Promise<void> {
    try {
      const list = await this.api.query('chat.blocks') as { userId: number; name: string }[]
      this.blocked = new Map(list.map(item => [item.userId, item.name]))
    } catch { /* 없음 */ }
  }

  // ── 입력 ─────────────────────────────────────────────────
  private onSubmit(event: Event): void {
    const form = event.target as HTMLFormElement
    event.preventDefault()
    if (form.matches('[data-social-form]')) { void this.send(); return }
  }

  private async send(): Promise<void> {
    const content = this.draft.trim()
    if (!content || this.sending) return
    this.sending = true
    try {
      const result = await this.api.mutate('chat.send', { channel: this.channel, content }) as { message: ChatMessage }
      this.draft = ''
      const input = this.host.querySelector<HTMLInputElement>('[data-chat-input]')
      if (input) { input.value = ''; input.focus() }
      this.updateCounter()
      this.receive(this.channel, [result.message])
    } catch (error) {
      this.api.notify(errorText(error, '보내지 못했습니다.'), 'ember')
    } finally { this.sending = false }
  }

  private onClick(event: Event): void {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-social]')
    if (!button) {
      if (this.menuFor !== null && !(event.target as HTMLElement).closest('.social-menu')) { this.menuFor = null; this.render() }
      return
    }
    const action = button.dataset.social
    const id = Number(button.dataset.id ?? 0)
    const user = Number(button.dataset.user ?? 0)
    if (action === 'toggle') this.setOpen(!this.open)
    else if (action === 'tab') {
      this.channel = (button.dataset.channel ?? 'all') as ChatChannel
      this.unread[this.channel] = 0
      this.menuFor = null
      if (!this.loaded[this.channel]) void this.loadHistory(this.channel)
      // 연맹 가입 · 탈퇴는 연맹 화면에서 하므로, 연맹 탭을 열 때 상태를 다시 묻는다
      if (this.channel === 'alliance') void this.loadStatus()
      this.render(true)
    } else if (action === 'name') { this.menuFor = this.menuFor === id ? null : id; this.render() }
    else if (action === 'block') void this.block(user, button.dataset.name ?? '')
    else if (action === 'report') void this.report(id)
    else if (action === 'admin-delete') void this.adminCall('chat.adminDelete', { id }, '메시지를 지웠습니다.')
    else if (action === 'admin-mute') void this.adminCall('chat.adminMute', { userId: user, minutes: Number(button.dataset.minutes ?? 30), reason: '운영 정책 위반' }, '채팅을 금지했습니다.')
    else if (action === 'blocks') this.showBlocks()
    else if (action === 'reports') void this.showReports()
    else if (action === 'unblock') void this.unblock(user)
    else if (action === 'report-resolve') void this.adminCall('chat.adminResolve', { id }, '신고를 처리했습니다.').then(() => this.showReports())
    else if (action === 'report-delete') void this.adminCall('chat.adminDelete', { id }, '메시지를 지웠습니다.').then(() => this.showReports())
    else if (action === 'guild') { this.setOpen(false); this.api.openGuild() }
    else if (action === 'modal-close') this.host.querySelector('.social-modal')?.remove()
  }

  private async block(userId: number, name: string): Promise<void> {
    if (!window.confirm(`${name}을(를) 차단할까요? 차단하면 이 장수의 채팅이 보이지 않습니다.`)) return
    try {
      const list = await this.api.mutate('chat.block', { userId, name }) as { userId: number; name: string }[]
      this.blocked = new Map(list.map(item => [item.userId, item.name]))
      this.menuFor = null
      this.api.notify(`${name}을(를) 차단했습니다.`, 'jade')
      this.render()
    } catch (error) { this.api.notify(errorText(error, '차단하지 못했습니다.'), 'ember') }
  }

  private async unblock(userId: number): Promise<void> {
    try {
      const list = await this.api.mutate('chat.unblock', { userId }) as { userId: number; name: string }[]
      this.blocked = new Map(list.map(item => [item.userId, item.name]))
      this.loaded[this.channel] = false
      void this.loadHistory(this.channel)
      this.showBlocks()
    } catch (error) { this.api.notify(errorText(error, '차단을 풀지 못했습니다.'), 'ember') }
  }

  private async report(messageId: number): Promise<void> {
    const reason = window.prompt('신고 사유를 적어 주세요. (예: 욕설, 도배, 광고)', '욕설')
    if (reason === null) return
    try {
      await this.api.mutate('chat.report', { messageId, reason: reason.slice(0, 100) })
      this.menuFor = null
      this.api.notify('신고를 접수했습니다. 운영자가 확인합니다.', 'jade')
      this.render()
    } catch (error) { this.api.notify(errorText(error, '신고하지 못했습니다.'), 'ember') }
  }

  private async adminCall(procedure: string, input: unknown, done: string): Promise<void> {
    try { await this.api.mutate(procedure, input); this.menuFor = null; this.api.notify(done, 'jade'); this.render() } catch (error) { this.api.notify(errorText(error, '처리하지 못했습니다.'), 'ember') }
  }

  private modal(title: string, body: string): void {
    this.host.querySelector('.social-modal')?.remove()
    this.host.querySelector('.social-panel')?.insertAdjacentHTML('beforeend', `<div class="social-modal"><div class="social-modal__card"><header><strong>${title}</strong><button type="button" class="social-close" data-social="modal-close" aria-label="닫기">×</button></header>${body}</div></div>`)
  }

  private showBlocks(): void {
    const list = [...this.blocked.entries()]
    this.modal('차단 목록', list.length ? `<ul class="ally-apps">${list.map(([userId, name]) => `<li><div><b data-no-tr>${esc(name)}</b></div><button type="button" class="social-ghost" data-social="unblock" data-user="${userId}">차단 풀기</button></li>`).join('')}</ul>` : '<p class="social-hint">차단한 장수가 없습니다. 채팅에서 이름을 누르면 차단할 수 있습니다.</p>')
  }

  private async showReports(): Promise<void> {
    try { this.reports = await this.api.query('chat.adminReports') as ChatReport[] } catch { this.reports = [] }
    const list = this.reports ?? []
    this.modal('채팅 신고 목록', list.length ? `<ul class="ally-apps">${list.map(item => `<li><div><b data-no-tr>${esc(item.targetName)}</b><small> · 신고 ${item.reports}건 · ${esc(item.reason)}</small><p data-no-tr>${esc(item.content)}</p></div><button type="button" class="is-danger" data-social="report-delete" data-id="${item.messageId}">삭제</button><button type="button" class="social-ghost" data-social="admin-mute" data-user="${item.targetUserId}" data-minutes="1440">하루 금지</button><button type="button" class="social-ghost" data-social="report-resolve" data-id="${item.id}">문제없음</button></li>`).join('')}</ul>` : '<p class="social-hint">처리할 신고가 없습니다.</p>')
  }
}

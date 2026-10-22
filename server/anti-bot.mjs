// 자동 진행 프로그램(매크로 · 직접 요청 스크립트) 대책(2026.10.21). 한 서버 프로세스 안의 메모리로 센다(다시 켜면 비워진다).
// 1) 요청 간격: 계정마다 1분 요청 상한 · 영토전 요청 최소 간격
// 2) 공성 표: 공성을 시작할 때 서버가 표를 주고, 결과는 그 표로 한 번만 · 최소 전투 시간 · 피해 상한
// 3) 하루 공성 상한: 넘으면 그 뒤 공성은 영토 · 시즌 · 약탈에 반영하지 않는다
// 4) 이상 행동 기록: 계정 장부(grantLedger.bot)에 날짜별로 남겨 관리자 화면에서 본다
const KST = 9 * 60 * 60 * 1000

export const REQUESTS_PER_MINUTE = 150
export const MIN_INTERVAL_MS = { siegeStart: 3000, siegeRecord: 3000, defense: 8000 }
export const SIEGE_TICKET_TTL_MS = 30 * 60 * 1000
export const SIEGE_MIN_BATTLE_MS = 0
/** 정상 플레이로 낼 수 있는 공성 한 번 피해의 상한(천명 3명 Lv60 5성 · 신화 장비 · 연구 · 연맹 · 열세 버프를 모두 더해도 약 9만) */
export const SIEGE_DAMAGE_CAP = 120000
export const SIEGE_DAILY_LIMIT = 200

export function botDayKey(now = Date.now()) { return new Date(now + KST).toISOString().slice(0, 10) }
export function botHour(now = Date.now()) { return new Date(now + KST).getUTCHours() }

/** 메모리 기반 제한기(시험할 때는 now를 넣는다) */
export function createLimiter() {
  const minute = new Map() // userId → { start, count }
  const last = new Map() // `${userId}:${kind}` → at
  const hits = new Map() // userId → 걸린 횟수
  const tickets = new Map() // ticket → { userId, cityId, issuedAt }
  let seq = 0
  const hit = userId => hits.set(userId, (hits.get(userId) ?? 0) + 1)
  return {
    /** 1분 요청 상한. 넘으면 false */
    request(userId, now = Date.now()) {
      const entry = minute.get(userId)
      if (!entry || now - entry.start >= 60000) { minute.set(userId, { start: now, count: 1 }); return true }
      entry.count += 1
      if (entry.count > REQUESTS_PER_MINUTE) { hit(userId); return false }
      return true
    },
    /** 같은 종류 요청의 최소 간격. 너무 빠르면 false */
    interval(userId, kind, now = Date.now()) {
      const key = `${userId}:${kind}`
      const prev = last.get(key) ?? 0
      if (now - prev < (MIN_INTERVAL_MS[kind] ?? 0)) { hit(userId); return false }
      last.set(key, now)
      return true
    },
    issueTicket(userId, cityId, now = Date.now()) {
      seq += 1
      const ticket = `${now.toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      tickets.set(ticket, { userId, cityId, issuedAt: now })
      if (tickets.size > 20000) for (const [key, value] of tickets) if (now - value.issuedAt > SIEGE_TICKET_TTL_MS) tickets.delete(key)
      return ticket
    },
    /** 표를 한 번 쓴다: 'ok' | 'missing' | 'expired' | 'mismatch' | 'tooFast' */
    useTicket(userId, cityId, ticket, now = Date.now()) {
      const entry = ticket ? tickets.get(ticket) : null
      if (!entry) return 'missing'
      tickets.delete(ticket)
      if (entry.userId !== userId || entry.cityId !== cityId) return 'mismatch'
      if (now - entry.issuedAt > SIEGE_TICKET_TTL_MS) return 'expired'
      if (now - entry.issuedAt < SIEGE_MIN_BATTLE_MS) return 'tooFast'
      return 'ok'
    },
    hits(userId) { return hits.get(userId) ?? 0 },
    allHits() { return new Map(hits) },
  }
}

/** 계정 장부의 이상 행동 기록에 더한다(최근 3일만 남긴다). patch: { sieges, defenses, capHits, badTickets, overLimit } */
export function addBotStats(ledger, patch, now = Date.now()) {
  const day = botDayKey(now)
  const days = ledger.bot && typeof ledger.bot === 'object' ? ledger.bot : {}
  const today = days[day] ?? { sieges: 0, defenses: 0, capHits: 0, badTickets: 0, overLimit: 0, hours: Array(24).fill(0) }
  for (const key of ['sieges', 'defenses', 'capHits', 'badTickets', 'overLimit']) today[key] = (Number(today[key]) || 0) + (Number(patch[key]) || 0)
  if (patch.sieges || patch.defenses) { today.hours = Array.isArray(today.hours) && today.hours.length === 24 ? today.hours : Array(24).fill(0); today.hours[botHour(now)] += 1 }
  const kept = Object.fromEntries(Object.entries({ ...days, [day]: today }).sort(([a], [b]) => b.localeCompare(a)).slice(0, 3))
  ledger.bot = kept
  return today
}

/** 의심 점수: 하루 공성 상한 근접 · 쉬지 않은 시간 · 피해 상한 · 잘못된 표 · 요청 제한 */
export function botScore(day, limitHits = 0) {
  if (!day) return 0
  const activeHours = (day.hours ?? []).filter(count => count > 0).length
  return Math.round((Number(day.sieges) || 0) / SIEGE_DAILY_LIMIT * 40 + Math.max(0, activeHours - 12) * 4 + (Number(day.capHits) || 0) * 10 + (Number(day.badTickets) || 0) * 5 + (Number(day.overLimit) || 0) * 0.2 + limitHits * 0.5)
}

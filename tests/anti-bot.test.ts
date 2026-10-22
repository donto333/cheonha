import { describe, expect, it } from 'vitest'
import { REQUESTS_PER_MINUTE, SIEGE_DAILY_LIMIT, addBotStats, botDayKey, botScore, createLimiter } from '../server/anti-bot.mjs'

// 2026.10.21 자동 진행 대책
describe('자동 진행 대책', () => {
  it('1분 요청 상한을 넘으면 막고, 1분이 지나면 다시 받는다', () => {
    const limiter = createLimiter()
    const t = 1_000_000
    for (let i = 0; i < REQUESTS_PER_MINUTE; i += 1) expect(limiter.request(1, t + i)).toBe(true)
    expect(limiter.request(1, t + 500)).toBe(false)
    expect(limiter.request(2, t + 500)).toBe(true)
    expect(limiter.request(1, t + 60_001)).toBe(true)
    expect(limiter.hits(1)).toBe(1)
  })
  it('공성 기록은 3초 간격, 수비는 8초 간격', () => {
    const limiter = createLimiter()
    expect(limiter.interval(1, 'siegeRecord', 10_000)).toBe(true)
    expect(limiter.interval(1, 'siegeRecord', 12_000)).toBe(false)
    expect(limiter.interval(1, 'siegeRecord', 13_000)).toBe(true)
    expect(limiter.interval(1, 'defense', 13_000)).toBe(true)
    expect(limiter.interval(1, 'defense', 20_000)).toBe(false)
  })
  it('공성 표는 그 유저 · 그 도시에 한 번만', () => {
    const limiter = createLimiter()
    const ticket = limiter.issueTicket(1, 'xiangyang', 0)
    expect(limiter.useTicket(2, 'xiangyang', ticket, 10_000)).toBe('mismatch')
    const second = limiter.issueTicket(1, 'xiangyang', 0)
    expect(limiter.useTicket(1, 'xiangyang', second, 10_000)).toBe('ok')
    expect(limiter.useTicket(1, 'xiangyang', second, 11_000)).toBe('missing')
    expect(limiter.useTicket(1, 'xiangyang', undefined, 11_000)).toBe('missing')
    const old = limiter.issueTicket(1, 'xiangyang', 0)
    expect(limiter.useTicket(1, 'xiangyang', old, 31 * 60_000)).toBe('expired')
  })
  it('이상 행동 기록은 날짜 · 시간별로 쌓이고, 하루 상한 · 24시간 활동이면 의심 점수가 높다', () => {
    const ledger: Record<string, unknown> = {}
    const day0 = Date.parse('2026-10-21T00:00:00+09:00')
    for (let h = 0; h < 24; h += 1) for (let i = 0; i < Math.ceil(SIEGE_DAILY_LIMIT / 24); i += 1) addBotStats(ledger, { sieges: 1 }, day0 + h * 3_600_000 + i * 1000)
    const today = (ledger.bot as Record<string, { sieges: number; hours: number[] }>)[botDayKey(day0)]
    expect(today.sieges).toBeGreaterThanOrEqual(SIEGE_DAILY_LIMIT)
    expect(today.hours.filter(count => count > 0)).toHaveLength(24)
    expect(botScore(today as never)).toBeGreaterThan(80)
    const normal = addBotStats({}, { sieges: 30 }, day0 + 20 * 3_600_000)
    expect(botScore(normal)).toBeLessThan(10)
  })
})

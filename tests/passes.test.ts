import { describe, expect, it } from 'vitest'
import { PASSES, activatePassLocal, autoPassActive, claimPassGoldLocal, createInitialState, isPassActive } from '../src/game/strategy'
import { ensureMissions } from '../src/game/missions'
import { PASS_DAY_MS, extendPass, passGoldDue } from '../server/passes.mjs'

// 2026.10.20 정액권: 일주일 · 한달(하루 금화 2개) · 자동 전투(자동 대응 85% · 3배속)
const fresh = () => { const state = createInitialState(); ensureMissions(state); return state }

describe('정액권', () => {
  it('세 가지 정액권과 가격', () => {
    expect(PASSES.map(pass => [pass.id, pass.priceKRW, pass.days, pass.dailyGold])).toEqual([['pass-week', 2900, 7, 2], ['pass-month', 9900, 30, 2], ['pass-auto', 4900, 7, 0]])
  })
  it('출시 전 무료 체험은 정액권마다 한 번, 산 날 금화 2개를 바로 준다', () => {
    const state = fresh()
    const now = Date.UTC(2026, 9, 20, 3)
    const gold = state.gold
    expect(activatePassLocal(state, 'pass-week', now, false).ok).toBe(true)
    expect(state.gold).toBe(gold + 2)
    expect(isPassActive(state, 'pass-week', now + 6 * PASS_DAY_MS)).toBe(true)
    expect(isPassActive(state, 'pass-week', now + 7 * PASS_DAY_MS)).toBe(false)
    expect(activatePassLocal(state, 'pass-week', now, false).ok).toBe(false)
    // 같은 날 다시 받지 않고, 다음 날 2개
    expect(claimPassGoldLocal(state, now + 1000)).toBe(0)
    expect(claimPassGoldLocal(state, now + PASS_DAY_MS)).toBe(2)
  })
  it('출시 후에는 결제 연동 전까지 잠긴다', () => {
    const state = fresh()
    expect(activatePassLocal(state, 'pass-month', Date.now(), true).ok).toBe(false)
  })
  it('자동 전투 정액권이면 자동 전투 혜택이 켜진다', () => {
    const state = fresh()
    const now = Date.now()
    expect(autoPassActive(state, now)).toBe(false)
    activatePassLocal(state, 'pass-auto', now, false)
    expect(autoPassActive(state, now)).toBe(true)
    expect(autoPassActive(state, now + 7 * PASS_DAY_MS + 1)).toBe(false)
  })
  it('다시 사면 남은 기간에 이어서 늘어나고, 금화는 정액권마다 하루 한 번', () => {
    const now = 1_000_000
    const week = PASSES[0]
    expect(extendPass(now + PASS_DAY_MS, week, now)).toBe(now + 8 * PASS_DAY_MS)
    const passes = { 'pass-week': { until: now + PASS_DAY_MS }, 'pass-month': { until: now + PASS_DAY_MS } }
    expect(passGoldDue(passes, {}, '2026-10-20', now).map(pass => pass.id)).toEqual(['pass-week', 'pass-month'])
    expect(passGoldDue(passes, { 'pass-week': '2026-10-20' }, '2026-10-20', now).map(pass => pass.id)).toEqual(['pass-month'])
  })
})

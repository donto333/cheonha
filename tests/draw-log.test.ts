import { describe, expect, it } from 'vitest'
import { DRAW_LOG_LIMIT, createInitialState as baseState, drawEquipment, recruit } from '../src/game/strategy'
import { ensureMissions } from '../src/game/missions'

const createInitialState = () => { const state = baseState(); ensureMissions(state); return state }

// 2026.10.20 뽑기 기록: 최근 200회씩 · 최고 등급(천명 · 전설) 누적
describe('뽑기 기록', () => {
  it('모집은 등급 · 무장을 최신순으로 남기고 200회까지만 둔다, 누적 횟수는 계속 센다', () => {
    const state = createInitialState()
    state.honor = 1e9
    for (let i = 0; i < 21; i += 1) recruit(state, 10)
    const log = state.missions!.recruitLog!
    expect(log.length).toBe(DRAW_LOG_LIMIT)
    expect(state.missions!.drawStats!.recruit.n).toBe(210)
    expect(state.missions!.drawStats!.recruit.top).toBeGreaterThanOrEqual(log.filter(e => e.g === 5).length)
    expect(log[0].at).toBeGreaterThanOrEqual(log[log.length - 1].at)
  })
  it('최고 등급 횟수는 결과와 같다', () => {
    const state = createInitialState()
    state.honor = 1e9
    const result = recruit(state, 10)
    expect(state.missions!.drawStats!.recruit.top).toBe(state.missions!.recruitLog!.filter(e => e.g === 5).length)
    expect(state.missions!.recruitLog!.map(e => e.id).reverse()).toEqual(result.rewards.map(r => r.id))
  })
  it('장비 뽑기는 이름 · 등급을 남기고 전설을 센다', () => {
    const state = createInitialState()
    state.honor = 1e9
    const result = drawEquipment(state, 10)
    const log = state.missions!.equipLog!
    expect(log.length).toBe(10)
    expect(log[0].n).toBe(result.rewards[9].name)
    expect(state.missions!.drawStats!.equip.top).toBe(result.rewards.filter(r => r.grade === 'legendary').length)
  })
})

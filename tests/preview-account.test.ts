import { describe, expect, it } from 'vitest'
import { allGenerals, createInitialState, grantAllGenerals } from '../src/game/strategy'

describe('미리보기 계정', () => {
  it('모든 무장을 한 명씩 보유하고, 다시 불러도 중복되지 않는다', () => {
    const state = createInitialState()
    const before = state.generals.length
    const added = grantAllGenerals(state)
    expect(added).toBe(allGenerals().length - before)
    expect(new Set(state.generals.map(g => g.id)).size).toBe(allGenerals().length)
    expect(state.formation.length).toBe(3)
    expect(grantAllGenerals(state)).toBe(0)
  })
})

describe('도감 차례', () => {
  it('높은 등급부터, 같은 등급은 남성 → 여성', async () => {
    const { codexOrder, isFemaleGeneral } = await import('../src/game/strategy')
    const list = codexOrder(allGenerals())
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i]
      expect(a.grade).toBeGreaterThanOrEqual(b.grade)
      if (a.grade === b.grade) expect(Number(isFemaleGeneral(a.id))).toBeLessThanOrEqual(Number(isFemaleGeneral(b.id)))
    }
    expect(list.filter(g => isFemaleGeneral(g.id))).toHaveLength(7)
  })
})

describe('미리보기 계정 무료 뽑기', () => {
  it('켜면 무장 모집 · 장비 뽑기에 옥패를 쓰지 않는다', async () => {
    const { setFreeDraws, recruit, drawEquipment, recruitCost, equipmentDrawCost } = await import('../src/game/strategy')
    const state = createInitialState()
    state.honor = 0
    setFreeDraws(true)
    try {
      expect(recruitCost(state, 10)).toBe(0)
      expect(equipmentDrawCost(10)).toBe(0)
      expect(recruit(state, 10).ok).toBe(true)
      expect(drawEquipment(state, 10).ok).toBe(true)
      expect(state.honor).toBe(0)
    } finally { setFreeDraws(false) }
    expect(recruitCost(state, 1)).toBeGreaterThan(0)
    expect(equipmentDrawCost(1)).toBe(240)
    expect(recruit(state, 1).ok).toBe(false)
  })
})

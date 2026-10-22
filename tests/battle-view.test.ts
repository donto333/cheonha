import { describe, expect, it } from 'vitest'
import { BATTLE_VIEWS, BATTLE_VIEW_LABEL, nextBattleView } from '../src/game/battle-view'

describe('전투 시점', () => {
  it('모든 시점을 차례로 돌고 처음으로 돌아온다', () => {
    let view = BATTLE_VIEWS[0]
    const seen = [view]
    for (let i = 1; i < BATTLE_VIEWS.length; i++) { view = nextBattleView(view); seen.push(view) }
    expect(new Set(seen).size).toBe(BATTLE_VIEWS.length)
    expect(nextBattleView(view)).toBe('default')
    for (const v of BATTLE_VIEWS) expect(BATTLE_VIEW_LABEL[v]).toMatch(/^[가-힣]+$/)
  })
})

describe('시점 고르기 판', () => {
  it('3×3 판에 모든 시점이 한 번씩 있다', async () => {
    const { BATTLE_VIEW_GRID, DIAGONAL_VIEWS } = await import('../src/game/battle-view')
    const flat = BATTLE_VIEW_GRID.flat()
    expect(flat).toHaveLength(9)
    expect(new Set(flat)).toEqual(new Set(BATTLE_VIEWS))
    expect(Object.keys(DIAGONAL_VIEWS).sort()).toEqual(['frontLeft', 'frontRight', 'rearLeft', 'rearRight'])
  })
})

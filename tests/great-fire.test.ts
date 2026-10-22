import { describe, expect, it } from 'vitest'
import { BattleCore } from '../src/game/battle-core'
import { scaleGeneral, templateGeneral } from '../src/game/strategy'

// 2026.10.20 육손 대화계: 화계와 따로 겹치고 상태이상 해제로 지워지지 않는다
const deck = (ids: string[]) => ids.map(id => ({ ...scaleGeneral({ ...templateGeneral(id)!, level: 1, stars: 1 }, 40, 3), skillUnlocked: true }))
const quiet = (core: BattleCore) => { core.players.forEach(unit => { unit.attackTimer = 999; unit.cd = 999 }); core.enemies.forEach(unit => { unit.attackTimer = 999; unit.cd = 999 }) }
const troops = (core: BattleCore) => core.enemies.reduce((sum, unit) => sum + unit.troops, 0)

describe('육손 대화계', () => {
  it('육손 스킬은 적 전체에 대화계를 건다', () => {
    const core = new BattleCore(deck(['lu-xun', 'cao-ren', 'zhang-liao']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.5 })
    quiet(core); core.players[0].cd = 0
    expect(core.castSkill(0)).toBe(true)
    expect(core.debuffs.some(effect => effect.id === 'great-fire')).toBe(true)
  })
  it('화계와 대화계가 함께 걸리면 화상 피해가 두 배다', () => {
    const one = new BattleCore(deck(['cao-ren', 'xu-chu', 'dian-wei']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.5 })
    const two = new BattleCore(deck(['cao-ren', 'xu-chu', 'dian-wei']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.5 })
    quiet(one); quiet(two)
    one.addEffect('debuff', 'burning', 6)
    two.addEffect('debuff', 'burning', 6); two.addEffect('debuff', 'great-fire', 6)
    const a = troops(one), b = troops(two)
    one.tick(1); two.tick(1)
    expect((b - troops(two)) / (a - troops(one))).toBeCloseTo(2, 1)
  })
  it('상태이상 해제로 지워지지 않는다', () => {
    const core = new BattleCore(deck(['guan-yu', 'zhang-fei', 'zhao-yun']), deck(['liu-bei', 'cao-ren', 'zhang-liao']), { mode: 'scenario', rng: () => 0.5 })
    quiet(core)
    core.addEffect('debuff', 'great-fire', 6); core.addEffect('debuff', 'burning', 6); core.addEffect('debuff', 'fear', 6)
    core.enemies[0].cd = 0.01; core.enemies[0].warned = true
    core.tick(0.05)
    expect(core.debuffs.some(effect => effect.id === 'great-fire')).toBe(true)
    expect(core.debuffs.some(effect => effect.id === 'burning' || effect.id === 'fear')).toBe(false)
  })
})

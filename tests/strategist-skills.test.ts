import { describe, expect, it } from 'vitest'
import { BattleCore } from '../src/game/battle-core'
import { scaleGeneral, templateGeneral } from '../src/game/strategy'

// 2026.10.19 사마의 · 제갈량 · 가후 새 스킬과 적 AI 스킬 대칭
const deck = (ids: string[]) => ids.map(id => ({ ...scaleGeneral({ ...templateGeneral(id)!, level: 1, stars: 1 }, 40, 3), skillUnlocked: true }))
const quiet = (core: BattleCore) => { core.players.forEach(unit => { unit.attackTimer = 999 }); core.enemies.forEach(unit => { unit.attackTimer = 999; unit.cd = 999 }) }

describe('사마의 견벽청야', () => {
  it('직전 조작이 성공이면 70% 확률로 사기 감소 · 지력 차 피해 · 스킬 봉인이 따로 발동한다', () => {
    const core = new BattleCore(deck(['simayi', 'cao-ren', 'zhang-liao']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.1 })
    quiet(core); core.players[0].cd = 0
    const morale = core.morale, troops = core.enemies.reduce((sum, unit) => sum + unit.troops, 0)
    expect(core.castSkill(0)).toBe(true)
    expect(core.morale).toBeLessThan(morale)
    expect(core.enemies.reduce((sum, unit) => sum + unit.troops, 0)).toBeLessThan(troops)
    expect(core.debuffs.some(effect => effect.id === 'silence')).toBe(true)
  })
  it('직전 조작이 실패였으면 발동하지 않는다', () => {
    const core = new BattleCore(deck(['simayi', 'cao-ren', 'zhang-liao']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.1 })
    quiet(core); core.players[0].cd = 0; core.lastCommandFailed = true
    const morale = core.morale
    core.castSkill(0)
    expect(core.morale).toBe(morale)
    expect(core.debuffs.some(effect => effect.id === 'silence')).toBe(false)
  })
  it('적 AI 사마의는 50% 확률로 아군 스킬을 봉인한다', () => {
    const core = new BattleCore(deck(['guan-yu', 'zhang-fei', 'zhao-yun']), deck(['simayi', 'cao-ren', 'zhang-liao']), { mode: 'scenario', rng: () => 0.4 })
    quiet(core); core.enemies[0].cd = 0.01; core.enemies[0].warned = true
    core.tick(0.05)
    expect(core.playerDebuffs.some(effect => effect.id === 'silence')).toBe(true)
  })
})

describe('제갈량 팔진도', () => {
  it('태세 중 상대가 스킬을 쓰면 70% 확률로 막고 봉인한다', () => {
    const core = new BattleCore(deck(['zhuge-liang', 'cao-ren', 'zhang-liao']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.1 })
    quiet(core); core.players[0].cd = 0
    expect(core.castSkill(0)).toBe(true)
    const foe = core.enemies[0]
    foe.cd = 0.01; foe.warned = true
    const threat = core.threat
    core.tick(0.05)
    expect(foe.cd).toBeGreaterThan(1)
    expect(core.debuffs.some(effect => effect.id === 'silence')).toBe(true)
    expect(core.threat).toBeLessThanOrEqual(threat + 0.01)
  })
})

describe('가후 독계', () => {
  it('직전 조작이 성공이면 70% 확률로 적 공격 · 방어를 낮춘다', () => {
    const core = new BattleCore(deck(['jia-xu', 'cao-ren', 'zhang-liao']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.1 })
    quiet(core); core.players[0].cd = 0
    core.castSkill(0)
    expect(core.debuffs.some(effect => effect.id === 'weaken')).toBe(true)
  })
})

describe('진궁 계중계 · 순유 기묘한 계책', () => {
  it('진궁: 확률로 상대의 다음 스킬을 무효로 하고 표적 낙인을 건다', () => {
    const core = new BattleCore(deck(['chen-gong', 'cao-ren', 'zhang-liao']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.1 })
    quiet(core); core.players[0].cd = 0
    core.castSkill(0)
    expect(core.debuffs.some(effect => effect.id === 'mark')).toBe(true)
    // 봉인(침묵)이 걸리면 적 쿨다운이 멈추므로 무효 판정만 보려고 풀어 둔다
    core.debuffs.splice(0, core.debuffs.length, ...core.debuffs.filter(effect => effect.id !== 'silence'))
    const foe = core.enemies[0]
    foe.cd = 0.01; foe.warned = true
    core.tick(0.05)
    expect(foe.cd).toBeGreaterThan(1)
    expect(core.playerDebuffs.some(effect => effect.id === 'armor-break')).toBe(false)
  })
  it('순유: 확률로 아군 공격 강화와 쿨다운 단축', () => {
    const core = new BattleCore(deck(['xun-you', 'cao-ren', 'zhang-liao']), deck(['guan-yu', 'zhang-fei', 'zhao-yun']), { mode: 'scenario', rng: () => 0.1 })
    quiet(core); core.players[0].cd = 0; core.players[1].cd = 8
    core.castSkill(0)
    expect(core.buffs.some(effect => effect.id === 'atk-up')).toBe(true)
    expect(core.players[1].cd).toBeLessThanOrEqual(5)
  })
})

describe('적 AI도 고유 스킬을 쓴다', () => {
  it('적 관우는 고유 스킬로 아군에게 갑주 균열을 건다', () => {
    const core = new BattleCore(deck(['cao-ren', 'zhang-fei', 'zhao-yun']), deck(['guan-yu', 'xu-chu', 'zhang-liao']), { mode: 'scenario', rng: () => 0.4 })
    quiet(core); core.enemies[0].cd = 0.01; core.enemies[0].warned = true
    core.tick(0.05)
    expect(core.playerDebuffs.some(effect => effect.id === 'armor-break')).toBe(true)
  })
})

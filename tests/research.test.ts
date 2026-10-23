import { describe, expect, it } from 'vitest'
import { battleResearch, cancelResearch, normalizeResearch, researchMods, researchStatus, rushCost, rushResearch, settleResearch, startResearch, RESEARCH_MINUTES, masteryMinutes } from '../src/game/research'
import { createInitialState, recruitCost, type StrategyState } from '../src/game/strategy'

function rich(): StrategyState {
  const state = createInitialState()
  state.resources = { grain: 1e6, silver: 1e6, wood: 1e6, iron: 1e6, influence: 1e6 }
  state.silver = 1e6
  state.gold = 1000
  return state
}
function finish(state: StrategyState, id: string, now: number): number {
  expect(startResearch(state, id, now).ok).toBe(true)
  const node = state.research.find(item => item.id === id)!
  const end = node.endsAt!
  expect(settleResearch(state, end).map(item => item.id)).toEqual([id])
  return end
}

describe('timed research', () => {
  it('uses longer research times for higher tiers', () => {
    expect(RESEARCH_MINUTES).toEqual([5, 20, 60, 120, 240, 480])
    const state = createInitialState()
    for (const node of state.research) expect(node.durationMs).toBe(node.tier === 7 ? masteryMinutes(1) * 60_000 : RESEARCH_MINUTES[node.tier - 1] * 60_000)
  })

  it('charges on start, finishes only after the timer, and runs one at a time (a second start becomes a reservation)', () => {
    const state = rich()
    const before = state.resources.influence
    expect(startResearch(state, 'econ-1', 1000).ok).toBe(true)
    expect(state.resources.influence).toBe(before - 600)
    expect(researchStatus(state, state.research.find(node => node.id === 'army-1')!)).toBe('busy')
    // 진행 중에 다른 연구를 고르면 예약(비용은 예약할 때), 예약은 하나만
    const reserve = startResearch(state, 'army-1', 1000)
    expect(reserve.ok).toBe(true)
    expect(reserve.queued).toBe(true)
    expect(state.resources.influence).toBe(before - 1200)
    expect(researchStatus(state, state.research.find(node => node.id === 'army-1')!)).toBe('queued')
    expect(startResearch(state, 'strat-1', 1000).ok).toBe(false)
    expect(settleResearch(state, 1000 + 5 * 60_000 - 1)).toHaveLength(0)
    expect(settleResearch(state, 1000 + 5 * 60_000)).toHaveLength(1)
    expect(researchMods(state).grain).toBeCloseTo(0.15)
    // 앞 연구가 끝난 그 순간부터 예약한 연구가 돈다
    const army = state.research.find(node => node.id === 'army-1')!
    expect(army.queued).toBeUndefined()
    expect(army.startedAt).toBe(1000 + 5 * 60_000)
    expect(army.endsAt).toBe(1000 + 10 * 60_000)
  })

  it('refunds everything on cancel', () => {
    const state = rich()
    const snapshot = { ...state.resources }
    startResearch(state, 'realm-1', 0)
    expect(cancelResearch(state).ok).toBe(true)
    expect(state.resources).toEqual(snapshot)
    expect(state.research.every(node => node.endsAt === undefined)).toBe(true)
  })

  it('rushes with gold: one gold per 10 minutes left', () => {
    expect(rushCost(1)).toBe(1)
    expect(rushCost(10 * 60_000)).toBe(1)
    expect(rushCost(10 * 60_000 + 1)).toBe(2)
    expect(rushCost(8 * 3_600_000)).toBe(48)
    const state = rich()
    startResearch(state, 'talent-1', 0)
    expect(rushResearch(state, 60_000).ok).toBe(true)
    expect(state.gold).toBe(999)
    expect(state.research.find(node => node.id === 'talent-1')!.unlocked).toBe(true)
  })

  it('keeps only one side of a tier-3 choice', () => {
    const state = rich()
    let now = finish(state, 'talent-1', 0)
    now = finish(state, 'talent-2', now)
    // 인재 연구는 모집 비용 · 확률을 바꾸지 않는다(과금 재화에 영향 없음)
    expect(recruitCost(state, 1)).toBe(100)
    expect(researchMods(state).formationStats).toBeCloseTo(0.02)
    now = finish(state, 'talent-3a', now)
    expect(researchMods(state).levelCost).toBeCloseTo(0.1)
    expect(researchStatus(state, state.research.find(node => node.id === 'talent-3b')!)).toBe('switch')
    finish(state, 'talent-3b', now)
    expect(researchMods(state).levelCost).toBe(0)
    expect(researchMods(state).enhanceCost).toBeCloseTo(0.15)
    expect(recruitCost(state, 10)).toBe(900)
    // 3단계가 하나라도 끝났으므로 4단계는 열려 있다
    expect(researchStatus(state, state.research.find(node => node.id === 'talent-4')!)).toBe('available')
  })

  it('feeds battle modifiers to the battle core', () => {
    const state = rich()
    let now = finish(state, 'army-1', 0)
    now = finish(state, 'army-2', now)
    finish(state, 'army-3b', now)
    const battle = battleResearch(state)
    expect(battle.troops).toBeCloseTo(0.08)
    expect(battle.archerAtk).toBeCloseTo(0.12)
    expect(battle.damageTaken).toBeCloseTo(0.1)
    expect(battle.chargeSkill).toBe(0)
  })

  it('refunds legacy unlocked research and keeps a running timer through reload', () => {
    const state = rich()
    startResearch(state, 'strat-1', 0)
    const influence = state.resources.influence
    state.research.push({ id: 'irrigation', name: '관개', branch: '부국', tier: 1, description: '', cost: { influence: 300, grain: 500 }, durationMs: 0, unlocked: true })
    const refund = normalizeResearch(state)
    expect(refund).toEqual({ influence: 300, grain: 500 })
    expect(state.resources.influence).toBe(influence + 300)
    expect(state.research).toHaveLength(63)
    expect(state.research.find(node => node.id === 'strat-1')!.endsAt).toBe(5 * 60_000)
    expect(normalizeResearch(state)).toBeNull()
  })
})

describe('재야(중립 진영) 전용 연구', () => {
  it('재야는 부국 · 제패 대신 약탈 · 유격 분야를 연구하고, 세 진영은 그 반대다', async () => {
    const { researchBranchesFor, branchActive } = await import('../src/game/research')
    const state = rich()
    expect(researchBranchesFor(state).map(branch => branch.id)).toEqual(['부국', '강병', '지략', '제패', '인재'])
    expect(startResearch(state, 'loot-1', 0).ok).toBe(false)
    state.faction = '재야'
    expect(researchBranchesFor(state).map(branch => branch.id)).toEqual(['약탈', '강병', '지략', '유격', '인재'])
    expect(branchActive(state, '부국')).toBe(false)
    expect(startResearch(state, 'econ-1', 0).ok).toBe(false)
    expect(startResearch(state, 'loot-1', 0).ok).toBe(true)
    // 두 분야 모두 6단계 · 갈림길 2개(8개) + 심화 1개
    for (const branch of ['약탈', '유격']) expect(state.research.filter(node => node.branch === branch)).toHaveLength(9)
  })
  it('진영에 맞지 않는 분야의 연구는 효과가 없다', () => {
    const state = rich()
    for (const node of state.research) if (['econ-1', 'realm-2', 'loot-1', 'loot-4', 'raid-1', 'raid-4'].includes(node.id)) node.unlocked = true
    expect(researchMods(state).grain).toBeCloseTo(0.15)
    expect(researchMods(state).siegeDamage).toBeCloseTo(0.15)
    expect(researchMods(state).plunder.grain).toBe(0)
    state.faction = '재야'
    const mods = researchMods(state)
    expect(mods.grain).toBe(0)
    expect(mods.siegeDamage).toBeCloseTo(0.15) // 파성추(유격)만
    expect(mods.plunder.grain).toBeCloseTo(0.25)
    expect(mods.plunder.extraCount).toBe(6)
    expect(mods.plunder.battle).toBeCloseTo(0.08)
  })
})

describe('세 진영 ↔ 재야 연구 연동', () => {
  it('같은 단계 · 같은 갈림길 쪽끼리 함께 완료된다(부국 ↔ 약탈, 제패 ↔ 유격)', async () => {
    const { linkedResearchId } = await import('../src/game/research')
    expect(linkedResearchId('econ-3a')).toBe('loot-3a')
    expect(linkedResearchId('raid-6b')).toBe('realm-6b')
    expect(linkedResearchId('army-1')).toBeNull()
    const state = rich()
    finish(state, 'econ-1', 0)
    expect(state.research.find(node => node.id === 'loot-1')!.unlocked).toBe(true)
    // 재야로 바꾸면 약탈 2단계부터 이어서 연구한다
    state.faction = '재야'
    const loot2 = state.research.find(node => node.id === 'loot-2')!
    expect(researchStatus(state, loot2)).toBe('available')
    finish(state, 'loot-2', 10 * 60_000)
    expect(state.research.find(node => node.id === 'econ-2')!.unlocked).toBe(true)
  })
  it('예전 저장분도 불러올 때 맞춘다', () => {
    const state = rich()
    for (const node of state.research) if (['econ-1', 'econ-2', 'econ-3b', 'realm-1'].includes(node.id)) node.unlocked = true
    normalizeResearch(state)
    const done = (id: string) => state.research.find(node => node.id === id)!.unlocked
    expect(['loot-1', 'loot-2', 'loot-3b', 'raid-1'].every(done)).toBe(true)
    expect(done('loot-3a')).toBe(false)
  })
})

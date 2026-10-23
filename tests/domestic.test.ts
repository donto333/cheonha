// 내정 보강(2026.10.23): 심화 연구 · 연구 예약 · 연구 시간 단축(태학 서원 · 태학 박사) · 연맹 도움 · 관직(태수 · 두목)
import { describe, expect, it } from 'vitest'
import {
  MASTERY_MAX, applyHelpCount, battleResearch, cancelQueuedResearch, cancelResearch, helpJob, masteryCost, masteryMinutes, normalizeResearch,
  packResearchSave, queueBlocker, queuedResearch, researchDurationFor, researchMods, researchStatus, researchSummary, rushResearch, settleResearch, startResearch,
} from '../src/game/research'
import {
  academyCut, appointOffice, chiefBonuses, cityGovernor, dismissOffice, officePostCount, officeValue, researchSpeedCut, sanitizeOffices, scholarCut, setGovernorCity,
} from '../src/game/offices'
import { buildingDurationMs, cityIncome, createInitialState, deployCityGarrison, frontierSiegeBonus, templateGeneral, upgradeBuilding, type General, type StrategyState } from '../src/game/strategy'

function rich(): StrategyState {
  const state = createInitialState()
  state.resources = { grain: 1e8, silver: 1e8, wood: 1e8, iron: 1e8, influence: 1e8 }
  state.silver = 1e8
  state.gold = 10_000
  return state
}
/** 한 분야의 1~6단계를 모두 마친다(갈림길은 a) */
function finishBranch(state: StrategyState, prefix: string): void {
  for (const id of [`${prefix}-1`, `${prefix}-2`, `${prefix}-3a`, `${prefix}-4`, `${prefix}-5`, `${prefix}-6a`]) {
    const node = state.research.find(item => item.id === id)!
    node.unlocked = true
  }
}
const node = (state: StrategyState, id: string) => state.research.find(item => item.id === id)!
/** 편성에 없는 무장을 능력치를 정해 넣는다 */
function addGeneral(state: StrategyState, id: string, stats: Partial<Pick<General, 'leadership' | 'martial' | 'stratagem' | 'speed'>>): General {
  const template = templateGeneral(id)!
  const general = { ...template, level: 1, stars: 1, ...stats }
  state.generals = state.generals.filter(item => item.id !== id)
  state.generals.push(general)
  state.formation = state.formation.filter(item => item !== id)
  state.reserveSquads = (state.reserveSquads ?? []).map(list => list.filter(item => item !== id))
  return general
}

describe('심화 연구', () => {
  it('6단계를 마쳐야 열리고, 레벨마다 시간 · 비용이 늘며 Lv.20이 끝이다', () => {
    const state = rich()
    expect(researchStatus(state, node(state, 'econ-m'))).toBe('locked')
    expect(startResearch(state, 'econ-m', 0).ok).toBe(false)
    finishBranch(state, 'econ')
    expect(researchStatus(state, node(state, 'econ-m'))).toBe('available')
    expect(masteryMinutes(1)).toBe(240)
    expect(masteryMinutes(2)).toBe(270)
    expect(masteryMinutes(17)).toBe(720)
    expect(masteryMinutes(20)).toBe(720)
    expect(masteryCost('부국', 1)).toEqual({ influence: 13000, grain: 26000 })
    expect(masteryCost('부국', 3)).toEqual({ influence: 16900, grain: 33800 })
    const before = state.resources.influence
    expect(startResearch(state, 'econ-m', 0).ok).toBe(true)
    expect(state.resources.influence).toBe(before - 13000)
    expect(node(state, 'econ-m').endsAt).toBe(4 * 3600_000)
    expect(settleResearch(state, 4 * 3600_000).map(item => item.id)).toEqual(['econ-m'])
    const mastery = node(state, 'econ-m')
    expect(mastery.level).toBe(1)
    expect(mastery.unlocked).toBe(false)
    expect(mastery.durationMs).toBe(270 * 60_000)
    expect(mastery.cost).toEqual(masteryCost('부국', 2))
    // 연동: 재야 약탈 심화도 같은 레벨
    expect(node(state, 'loot-m').level).toBe(1)
    mastery.level = MASTERY_MAX
    expect(researchStatus(state, mastery)).toBe('done')
    expect(startResearch(state, 'econ-m', 10 * 3600_000).message).toContain('최고 레벨')
  })

  it('레벨만큼 효과가 쌓인다(분야마다 다른 효과)', () => {
    const state = rich()
    const set = (id: string, level: number) => { node(state, id).level = level }
    set('econ-m', 5); set('army-m', 4); set('strat-m', 6); set('realm-m', 10); set('talent-m', 3); set('loot-m', 7); set('raid-m', 8)
    const mods = researchMods(state)
    expect(mods.allIncome).toBeCloseTo(0.05)
    expect(mods.newGarrison).toBeCloseTo(0.05)
    expect(mods.raidGarrison).toBeCloseTo(0.05)
    expect(mods.levelCost).toBeCloseTo(0.03)
    // 세 진영은 약탈 · 유격 심화가 꺼져 있다
    expect(mods.plunder.all).toBe(0)
    expect(mods.siegeDamage).toBe(0)
    expect(battleResearch(state).troops).toBeCloseTo(0.02)
    expect(battleResearch(state).tacticCost).toBeCloseTo(0.03)
    expect(researchSummary(state).some(line => line.startsWith('천하 창름 Lv.5 · 모든 수확 +5%'))).toBe(true)
    state.faction = '재야'
    const wild = researchMods(state)
    expect(wild.allIncome).toBe(0)
    expect(wild.plunder.all).toBeCloseTo(0.07)
    expect(wild.siegeDamage).toBeCloseTo(0.08)
  })

  it('저장 · 불러오기에서 레벨과 진행이 이어지고 비용은 레벨에 맞춰진다', () => {
    const state = rich()
    finishBranch(state, 'army')
    node(state, 'army-m').level = 3
    normalizeResearch(state)
    expect(node(state, 'army-m').level).toBe(3)
    expect(node(state, 'army-m').cost).toEqual(masteryCost('강병', 4))
    expect(startResearch(state, 'army-m', 0).ok).toBe(true)
    const saved = JSON.parse(JSON.stringify(packResearchSave(state)))
    const other = rich()
    other.research = saved
    normalizeResearch(other)
    expect(node(other, 'army-m').level).toBe(3)
    expect(node(other, 'army-m').endsAt).toBe(masteryMinutes(4) * 60_000)
  })
})

describe('연구 예약', () => {
  it('진행 중인 연구의 다음 단계를 예약하고, 끝나면 그 순간부터 이어서 돈다(접속하지 않은 동안에도)', () => {
    const state = rich()
    expect(startResearch(state, 'army-1', 0).ok).toBe(true)
    expect(queueBlocker(state, node(state, 'army-3a'))).toContain('앞 단계')
    expect(startResearch(state, 'army-2', 0)).toMatchObject({ ok: true, queued: true })
    expect(queuedResearch(state)?.id).toBe('army-2')
    // 5분 + 20분이 지나 접속: 둘 다 끝나 있다
    const done = settleResearch(state, 30 * 60_000)
    expect(done.map(item => item.id)).toEqual(['army-1', 'army-2'])
    expect(queuedResearch(state)).toBeNull()
  })

  it('지금 연구를 취소하면 예약이 바로 시작하고, 앞 단계를 취소해 못 하게 된 예약은 비용을 돌려준다', () => {
    const state = rich()
    startResearch(state, 'army-1', 0)
    startResearch(state, 'strat-1', 0)
    expect(cancelResearch(state, 60_000).message).toContain('예약한 손자병법 주해')
    expect(node(state, 'strat-1').startedAt).toBe(60_000)
    // 앞 단계(army-1)를 취소하면 그 다음 단계(army-2) 예약은 돌려받는다
    const other = rich()
    startResearch(other, 'army-1', 0)
    const influence = other.resources.influence
    startResearch(other, 'army-2', 0)
    expect(cancelResearch(other, 60_000).message).toContain('돌려받았습니다')
    expect(other.resources.influence).toBe(influence + 600)
    expect(queuedResearch(other)).toBeNull()
    expect(other.research.every(item => item.endsAt === undefined)).toBe(true)
  })

  it('예약 취소는 전액 환급, 즉시 완료하면 예약이 바로 시작한다', () => {
    const state = rich()
    startResearch(state, 'talent-1', 0)
    const before = state.resources.influence
    startResearch(state, 'econ-1', 0)
    expect(cancelQueuedResearch(state).ok).toBe(true)
    expect(state.resources.influence).toBe(before)
    startResearch(state, 'econ-1', 0)
    expect(rushResearch(state, 60_000).ok).toBe(true)
    expect(node(state, 'talent-1').unlocked).toBe(true)
    expect(node(state, 'econ-1').startedAt).toBe(60_000)
  })

  it('6단계 연구 중에는 그 분야 심화를 예약할 수 있다', () => {
    const state = rich()
    for (const id of ['strat-1', 'strat-2', 'strat-3a', 'strat-4', 'strat-5']) node(state, id).unlocked = true
    startResearch(state, 'strat-6b', 0)
    expect(startResearch(state, 'strat-m', 0)).toMatchObject({ ok: true, queued: true })
    settleResearch(state, 8 * 3600_000)
    expect(node(state, 'strat-m').startedAt).toBe(8 * 3600_000)
  })
})

describe('연구 시간 단축 · 연맹 도움', () => {
  it('태학 서원 단계 합 5당 1%(최대 15%), 태학 박사 모략 10당 1%(최대 15%)', () => {
    const state = rich()
    expect(academyCut(state)).toBe(0)
    // 성도(촉한) 태학 서원 2단계 + 아군 도시 4곳 태학 서원 5단계 = 22 → 4%
    const extra = state.cities.filter(city => city.owner === '중립').slice(0, 4)
    for (const city of extra) { city.owner = '촉한'; city.buildings.find(building => building.kind === 'academy')!.level = 5 }
    expect(academyCut(state)).toBeCloseTo(0.04)
    const scholar = addGeneral(state, 'zhuge-liang', { stratagem: 128 })
    expect(appointOffice(state, 'scholar', 0, scholar.id).ok).toBe(true)
    expect(scholarCut(state)).toBeCloseTo(0.12)
    expect(researchSpeedCut(state)).toBeCloseTo(0.16)
    expect(researchDurationFor(state, node(state, 'army-1'))).toBe(Math.round(5 * 60_000 * 0.84))
    startResearch(state, 'army-1', 0)
    expect(node(state, 'army-1').endsAt).toBe(Math.round(5 * 60_000 * 0.84))
    // 출전 편성에 넣으면 효과가 꺼진다
    state.formation = [scholar.id]
    expect(scholarCut(state)).toBe(0)
    // 재야는 다스리는 도시가 없어 태학 서원 단축이 없다
    state.faction = '재야'
    expect(academyCut(state)).toBe(0)
  })

  it('도움 한 번에 남은 시간 1%(최소 1분), 받은 도움만 한 번씩, 최대 10번', () => {
    const job = { endsAt: 10 * 3600_000, help: { id: 1, job: helpJob('econ-m', 0), applied: 0 } }
    expect(applyHelpCount(job, 1, 0)).toBe(360_000)
    expect(job.endsAt).toBe(10 * 3600_000 - 360_000)
    expect(applyHelpCount(job, 1, 0)).toBe(0)
    applyHelpCount(job, 25, 0)
    expect(job.help.applied).toBe(10)
    const short = { endsAt: 30 * 60_000, help: { id: 2, job: 'x', applied: 0 } }
    expect(applyHelpCount(short, 2, 0)).toBe(120_000)
    // 다 끝나 가면 남은 시간까지만
    const tiny = { endsAt: 30_000, help: { id: 3, job: 'y', applied: 0 } }
    expect(applyHelpCount(tiny, 3, 0)).toBe(30_000)
    expect(tiny.help.applied).toBe(3)
  })
})

describe('관직', () => {
  it('자리 수는 1명 + 인재 3단계 + 인재 6단계, 출전 무장은 앉힐 수 없다', () => {
    const state = rich()
    expect(officePostCount(state)).toBe(1)
    node(state, 'talent-3b').unlocked = true
    expect(officePostCount(state)).toBe(2)
    node(state, 'talent-6a').unlocked = true
    expect(officePostCount(state)).toBe(3)
    const deployed = state.formation[0]
    expect(appointOffice(state, 'scholar', 0, deployed).message).toContain('출전 편성')
    const kongming = addGeneral(state, 'zhuge-liang', {})
    node(state, 'talent-3b').unlocked = false
    node(state, 'talent-6a').unlocked = false
    expect(appointOffice(state, 'governor', 1, kongming.id).ok).toBe(false)
  })

  it('태수: 모략 → 은전 · 영향력, 속도 → 공사 시간, 통솔 → 새 수비대, 무력 → 맞닿은 적 도시 공성(같은 나라 ×1.2)', () => {
    const state = rich()
    const city = state.cities.find(item => item.id === 'chengdu')!
    const plain = cityIncome(city, state)
    const farm = city.buildings.find(building => building.kind === 'agriculture')!
    const plainBuild = buildingDurationMs(farm, state, city)
    // 촉 무장(관우)이 촉한 성도 태수: ×1.2
    const guanyu = addGeneral(state, 'guan-yu', { leadership: 200, martial: 260, stratagem: 100, speed: 140 })
    expect(appointOffice(state, 'governor', 0, guanyu.id).ok).toBe(true)
    const governor = cityGovernor(state, 'chengdu')!
    expect(governor.nation).toBe(true)
    expect(governor.bonus.stratagem).toBeCloseTo(0.06)
    expect(governor.bonus.speed).toBeCloseTo(0.084)
    expect(governor.bonus.leadership).toBeCloseTo(0.12)
    expect(governor.bonus.martial).toBeCloseTo(0.156)
    const income = cityIncome(city, state)
    expect(income.silver).toBe(Math.round(plain.silver * 1.06))
    expect(income.influence).toBe(Math.round(plain.influence * 1.06))
    expect(income.grain).toBe(plain.grain)
    expect(buildingDurationMs(farm, state, city)).toBe(Math.round(plainBuild * (1 - 0.084)))
    expect(upgradeBuilding(state, 'chengdu', farm.id, 0).ok).toBe(true)
    expect(farm.endsAt).toBe(Math.round(plainBuild * (1 - 0.084)))
    // 성도와 맞닿은 도시를 공성할 때 무력 보너스
    const neighbor = ['fucheng', 'xindu', 'bajun', 'baxi', 'jianning'].find(id => frontierSiegeBonus(state, id) > 0)
    expect(neighbor).toBeTruthy()
    expect(frontierSiegeBonus(state, neighbor!)).toBeCloseTo(0.156)
    // 새로 세우는 수비대 전력 +12%
    const before = deployCityGarrison(state, 'chengdu')
    expect(before.ok).toBe(true)
    const garrison = city.garrisons!.at(-1)!
    dismissOffice(state, 'governor', 0)
    deployCityGarrison(state, 'chengdu')
    const plainGarrison = city.garrisons!.at(-1)!
    expect(Math.abs(garrison.power - plainGarrison.power * 1.12)).toBeLessThanOrEqual(1)
    expect(cityGovernor(state, 'chengdu')).toBeNull()
  })

  it('태수 도시 바꾸기는 서로 바꾸고, 도시를 잃으면 효과가 꺼진다', () => {
    const state = rich()
    node(state, 'talent-3a').unlocked = true
    const hanzhong = state.cities.find(item => item.id === 'hanzhong')!
    hanzhong.owner = '촉한'
    const a = addGeneral(state, 'zhuge-liang', {})
    const b = addGeneral(state, 'pang-tong', {})
    expect(appointOffice(state, 'governor', 0, a.id).message).toContain('성도')
    expect(appointOffice(state, 'governor', 1, b.id).message).toContain('한중')
    expect(setGovernorCity(state, 0, 'hanzhong').ok).toBe(true)
    expect(state.offices!.governors!.map(post => post?.cityId)).toEqual(['hanzhong', 'chengdu'])
    hanzhong.owner = '위나라'
    expect(cityGovernor(state, 'hanzhong')).toBeNull()
    expect(cityGovernor(state, 'chengdu')?.general.id).toBe(b.id)
  })

  it('재야 두목: 효과마다 두목 중 가장 높은 값, 군웅이면 ×1.2, 약탈 효과로 들어간다', () => {
    const state = rich()
    state.faction = '재야'
    for (const city of state.cities) if (city.owner !== '중립') city.owner = '중립'
    node(state, 'talent-3a').unlocked = true
    const lubu = addGeneral(state, 'lu-bu', { leadership: 100, martial: 300, stratagem: 40, speed: 160 })
    const kongming = addGeneral(state, 'zhuge-liang', { leadership: 130, martial: 60, stratagem: 300, speed: 60 })
    expect(appointOffice(state, 'governor', 0, lubu.id).ok).toBe(false)
    expect(appointOffice(state, 'chief', 0, lubu.id).ok).toBe(true)
    expect(appointOffice(state, 'chief', 1, kongming.id).ok).toBe(true)
    const chief = chiefBonuses(state)
    expect(chief.wall).toBeCloseTo(0.18) // 여포(군웅) 무력 300 → 15% × 1.2
    expect(chief.plunder).toBeCloseTo(0.15) // 제갈량 모략 300 → 15%
    expect(chief.raidCount).toBe(2) // 제갈량 통솔 130 → 2회, 여포 100 × 1.2 → 2회
    expect(chief.cooldown).toBeCloseTo(0.096) // 여포 속도 160 → 8% × 1.2
    const mods = researchMods(state)
    expect(mods.plunder.all).toBeCloseTo(0.15)
    expect(mods.plunder.extraCount).toBe(2)
    expect(mods.siegeDamage).toBeCloseTo(0.18)
    // 세 진영으로 돌아가면 두목 효과는 없다
    state.faction = '촉한'
    expect(chiefBonuses(state).plunder).toBe(0)
  })

  it('한 무장은 한 자리만: 다른 자리로 옮기면 앞 자리는 비고, 저장분도 같은 규칙으로 정리한다', () => {
    const state = rich()
    const kongming = addGeneral(state, 'zhuge-liang', { stratagem: 150 })
    appointOffice(state, 'scholar', 0, kongming.id)
    expect(appointOffice(state, 'governor', 0, kongming.id).message).toContain('태학 박사에서 옮김')
    expect(state.offices!.scholar).toBeNull()
    expect(sanitizeOffices({ scholar: 'a', governors: [{ generalId: 'a', cityId: 'chengdu' }, { generalId: 'b', cityId: 'ye' }, null, { generalId: 'c', cityId: 'x' }], chiefs: ['b', 'd', 7] }))
      .toEqual({ scholar: 'a', governors: [null, { generalId: 'b', cityId: 'ye' }, null], chiefs: [null, 'd', null] })
    expect(officeValue(219)).toBeCloseTo(0.1)
    expect(officeValue(999)).toBeCloseTo(0.15)
    expect(officeValue(999, true)).toBeCloseTo(0.18)
  })

  it('관직은 연구 저장 끝에 덧붙여 서버 · 이 기기에 함께 저장되고, 불러올 때 꺼낸다', () => {
    const state = rich()
    const kongming = addGeneral(state, 'zhuge-liang', { stratagem: 150 })
    appointOffice(state, 'scholar', 0, kongming.id)
    const saved = JSON.parse(JSON.stringify(packResearchSave(state))) as Array<{ id: string }>
    expect(saved).toHaveLength(64)
    expect(saved.at(-1)!.id).toBe('__domestic')
    const other = rich()
    other.formation = []
    other.reserveSquads = [[], []]
    other.generals = [...other.generals.filter(item => item.id !== kongming.id), kongming]
    other.research = saved as never
    normalizeResearch(other)
    expect(other.research).toHaveLength(63)
    expect(other.offices?.scholar).toBe(kongming.id)
    expect(scholarCut(other)).toBeCloseTo(0.15)
    // 관직이 없으면 덧붙이지 않는다
    expect(packResearchSave(rich())).toHaveLength(63)
  })
})

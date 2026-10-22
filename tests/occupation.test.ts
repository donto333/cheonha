import { describe, expect, it } from 'vitest'
import { CAPTURE_BAN_MS, OCCUPY_GRACE_MS, OCCUPY_MS, cityDefenseForLevel, conquestEligibility, createInitialState, deployCityGarrison, findCity, launchConquest, launchFactionBattle, mergeFactionTerritories, resolveConquestBattle, settleOccupations, CITY_ADJACENCY, CONQUEST_COOLDOWN_MS, FACTION_GOLD_DAILY_LIMIT, FACTION_WAR_GOLD_REWARD } from '../src/game/strategy'

// 2026.10.20 임시 점령: 10분 지키면 최종 점령 · 얻은 뒤 1분 공성 금지 · 수비병 전멸 시 넘어감 · 최종 점령 뒤 1시간 공성 금지 후 성벽 완전 회복
const ready = () => {
  const state = createInitialState()
  const city = findCity(state, 'fucheng')!
  city.defense = 0
  city.garrisons = [{ id: 'd', generalIds: state.formation, averageLevel: 1, power: 1, source: 'player' as const, label: '격파된 수비대' }]
  city.defendersDefeated = 3
  return { state, city }
}

describe('임시 점령', () => {
  it('최종 세력전에서 이기면 주인은 그대로 두고 10분 임시 점령, 그 진영만 수비병을 세운다', () => {
    const { state, city } = ready()
    const t = Date.now()
    expect(launchFactionBattle(state, city.id, t).won).toBe(true)
    expect(city.owner).toBe('중립')
    expect(city.occupy).toMatchObject({ faction: '촉한', until: t + OCCUPY_GRACE_MS + OCCUPY_MS, graceUntil: t + OCCUPY_GRACE_MS })
    expect(deployCityGarrison(state, city.id).ok).toBe(true)
    // 이미 임시 점령 중이면 최종 세력전은 다시 할 수 없다
    expect(launchFactionBattle(state, city.id, t + 1000).ok).toBe(false)
  })

  it('다른 진영은 1분 준비 시간 뒤, 국경이 맞닿았을 때만 공격할 수 있다', () => {
    const { state, city } = ready()
    const t = Date.now()
    city.occupy = { faction: '위나라', until: t + OCCUPY_MS, graceUntil: t + OCCUPY_GRACE_MS }
    city.garrisons = []
    city.defendersDefeated = 0
    expect(conquestEligibility(state, city.id, t + 1000).allowed).toBe(false)
    const border = (CITY_ADJACENCY[city.id] ?? []).some(id => findCity(state, id)?.owner === state.faction)
    expect(conquestEligibility(state, city.id, t + OCCUPY_GRACE_MS + 1).allowed).toBe(border)
    state.cities.forEach(other => { if ((CITY_ADJACENCY[city.id] ?? []).includes(other.id)) other.owner = '오나라' })
    expect(conquestEligibility(state, city.id, t + OCCUPY_GRACE_MS + 1).allowed).toBe(false)
  })

  it('수비병이 없으면 한 번 이겨 넘겨받고, 남은 시간은 그대로 이어진다', () => {
    const { state, city } = ready()
    const t = Date.now()
    state.cities.forEach(other => { if ((CITY_ADJACENCY[city.id] ?? []).includes(other.id)) other.owner = '촉한' })
    city.occupy = { faction: '위나라', until: t + OCCUPY_MS, graceUntil: t + OCCUPY_GRACE_MS }
    city.garrisons = []
    city.defendersDefeated = 0
    const at = t + 2 * 60 * 1000
    expect(launchConquest(state, city.id, at).ok).toBe(true)
    const won = resolveConquestBattle(state, city.id, true, at)
    expect(won.damage).toBeGreaterThan(0)
    expect(city.occupy).toMatchObject({ faction: '촉한', until: t + OCCUPY_MS + OCCUPY_GRACE_MS, graceUntil: at + OCCUPY_GRACE_MS })
  })

  it('세운 수비병을 모두 격파해야 넘어간다', () => {
    const { state, city } = ready()
    const t = Date.now()
    state.cities.forEach(other => { if ((CITY_ADJACENCY[city.id] ?? []).includes(other.id)) other.owner = '촉한' })
    city.occupy = { faction: '위나라', until: t + OCCUPY_MS, graceUntil: t + OCCUPY_GRACE_MS }
    city.garrisons = [1, 2].map(index => ({ id: `w-${index}`, generalIds: [], averageLevel: 10, power: 1, source: 'player' as const, label: `위 ${index}` }))
    city.defendersDefeated = 0
    expect(launchConquest(state, city.id, t + 70_000).ok).toBe(true)
    resolveConquestBattle(state, city.id, true, t + 70_000)
    expect(city.occupy?.faction).toBe('위나라')
    expect(launchConquest(state, city.id, t + 70_000 + CONQUEST_COOLDOWN_MS).ok).toBe(true)
    resolveConquestBattle(state, city.id, true, t + 70_000 + CONQUEST_COOLDOWN_MS)
    expect(city.occupy?.faction).toBe('촉한')
  })

  it('10분이 끝나면 최종 점령 · 1시간 공성 금지 · 그 뒤 성벽 완전 회복', () => {
    const { state, city } = ready()
    const t = Date.now()
    launchFactionBattle(state, city.id, t)
    const end = t + OCCUPY_GRACE_MS + OCCUPY_MS
    settleOccupations(state, end - 1)
    expect(city.owner).toBe('중립')
    settleOccupations(state, end)
    expect(city.owner).toBe('촉한')
    expect(city.occupy).toBeUndefined()
    expect(city.captureBanUntil).toBe(end + CAPTURE_BAN_MS)
    state.faction = '위나라'
    expect(conquestEligibility(state, city.id, end + 1000).allowed).toBe(false)
    settleOccupations(state, end + CAPTURE_BAN_MS)
    expect(city.captureBanUntil).toBeUndefined()
    expect(city.defense).toBe(cityDefenseForLevel(city.level))
  })

  it('서버 스냅샷의 임시 점령 · 공성 금지를 따른다', () => {
    const state = createInitialState()
    const city = findCity(state, 'fucheng')!
    const until = Date.now() + OCCUPY_MS
    mergeFactionTerritories(state, [{ cityId: city.id, owner: '중립', conquestProgress: 100, defense: 0, prosperity: 40, occupy: { faction: '오나라', until, graceUntil: until - OCCUPY_MS + OCCUPY_GRACE_MS }, banUntil: null }])
    expect(city.occupy?.faction).toBe('오나라')
    mergeFactionTerritories(state, [{ cityId: city.id, owner: '오나라', conquestProgress: 0, defense: 0, prosperity: 40, occupy: null, banUntil: until + CAPTURE_BAN_MS }])
    expect(city.occupy).toBeUndefined()
    expect(city.captureBanUntil).toBe(until + CAPTURE_BAN_MS)
  })

  it('세력전 금화는 하루 5번까지', () => {
    const state = createInitialState()
    const t = Date.now()
    const cities = state.cities.filter(city => city.owner === '중립').slice(0, FACTION_GOLD_DAILY_LIMIT + 1)
    cities.forEach(city => { city.occupy = { faction: '촉한', until: t, graceUntil: t, mine: true } })
    settleOccupations(state, t)
    const each = cities.map(city => FACTION_WAR_GOLD_REWARD[city.level])
    expect(state.pendingFactionGold).toBe(each.slice(0, FACTION_GOLD_DAILY_LIMIT).reduce((sum, value) => sum + value, 0))
    expect(state.factionGoldDay?.count).toBe(FACTION_GOLD_DAILY_LIMIT)
  })
})

import { describe, expect, it } from 'vitest'
import { GARRISON_FATIGUE_GAP_MS, addGarrisonFatigue, fatiguedPower, garrisonFatigue } from '../server/garrison-fatigue.mjs'
import { createInitialState, currentCityGarrison, findCity, mergeFactionTerritories, type FactionTerritorySnapshot } from '../src/game/strategy'
import { ensureMissions } from '../src/game/missions'

const HOUR = 3_600_000

describe('수비대 피로', () => {
  it('막을 때마다 8%, 최대 60%, 1시간에 10% 회복, 1분 안의 반복은 쌓이지 않는다', () => {
    const g: { power: number; fatigue?: number; fatigueAt?: number; fatigueHitAt?: number } = { power: 1000 }
    let t = 1_000_000
    expect(addGarrisonFatigue(g, t)).toBe(true)
    expect(garrisonFatigue(g, t)).toBeCloseTo(0.08)
    expect(addGarrisonFatigue(g, t + 1000)).toBe(false)
    for (let i = 0; i < 12; i++) { t += GARRISON_FATIGUE_GAP_MS; addGarrisonFatigue(g, t) }
    expect(garrisonFatigue(g, t)).toBeCloseTo(0.6)
    expect(fatiguedPower(g, t)).toBe(400)
    expect(garrisonFatigue(g, t + HOUR)).toBeCloseTo(0.5)
    expect(garrisonFatigue(g, t + 6 * HOUR)).toBe(0)
  })

  it('적 진영 도시는 서버의 실제 수비대(덱 · 피로)를 쓰고, 내가 격파한 수는 유지한다', () => {
    const state = createInitialState(); ensureMissions(state); state.faction = '촉한'; state.factionConfirmed = true
    const city = findCity(state, 'hanzhong') ?? state.cities.find(c => c.owner !== '촉한')!
    city.owner = '위나라'
    const snap = (fatigue: number): FactionTerritorySnapshot => ({ cityId: city.id, owner: '위나라', conquestProgress: 0, defense: city.defense, prosperity: 60,
      garrisons: { defeated: 0, list: [
        { id: 'g1', power: 9000, averageLevel: 60, label: '위나라 수비 진형 1', deck: [{ id: 'cao-cao', level: 60, stars: 5 }], fatigue },
        { id: 'g2', power: 5000, averageLevel: 40, label: '위나라 수비 진형 2', deck: [{ id: 'zhang-liao', level: 40, stars: 3 }], fatigue: 0 },
      ] } })
    mergeFactionTerritories(state, [snap(0)])
    expect(city.garrisons!.map(g => g.id)).toEqual(['g1', 'g2'])
    expect(currentCityGarrison(city)?.deck?.[0].id).toBe('cao-cao')
    city.defendersDefeated = 1
    mergeFactionTerritories(state, [snap(0.24)])
    expect(city.defendersDefeated).toBe(1)
    expect(currentCityGarrison(city)?.id).toBe('g2')
    expect(city.garrisons![0].fatigue).toBeCloseTo(0.24)
  })
})

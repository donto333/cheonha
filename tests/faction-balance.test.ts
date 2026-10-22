import { describe, expect, it } from 'vitest'
import { balanceFactions, factionTotals, weakestFaction, REALM_FACTIONS } from '../server/faction-balance.mjs'

const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

describe('시즌 진영 재배정(2026.10.22)', () => {
  it('연맹 · 미소속 유저를 세 진영에 인원 · 접속 · 전투력 · 금화가 고르게 나눈다', () => {
    const rng = seeded(7)
    const units: Array<{ id: string; members: number; days: number; power: number; gold: number }> = []
    for (let g = 0; g < 10; g += 1) { const n = 3 + Math.floor(rng() * 12); units.push({ id: `g${g}`, members: n, days: n * 15 * rng(), power: n * 3000 * (0.5 + rng()), gold: n * 100 * rng() }) }
    for (let u = 0; u < 120; u += 1) units.push({ id: `u${u}`, members: 1, days: 30 * rng(), power: 1000 + 4000 * rng(), gold: rng() < 0.3 ? 1000 * rng() : 0 })
    const assigned = balanceFactions(units, { rng })
    expect(units.every(unit => REALM_FACTIONS.includes(assigned.get(unit.id) ?? ''))).toBe(true)
    const totals = factionTotals(assigned, units) as Record<string, Record<string, number>>
    for (const key of ['members', 'days', 'power', 'gold']) {
      const values = REALM_FACTIONS.map(faction => totals[faction][key])
      const sum = values.reduce((a, b) => a + b, 0)
      // 가장 많은 진영과 가장 적은 진영의 차이가 전체의 6% 이내
      expect((Math.max(...values) - Math.min(...values)) / sum).toBeLessThan(0.06)
    }
  })
  it('무작위로 섞여 매번 같은 배정이 되지는 않는다', () => {
    const units = Array.from({ length: 30 }, (_, i) => ({ id: `u${i}`, members: 1, days: 10, power: 3000, gold: 0 }))
    const a = balanceFactions(units, { rng: seeded(1) }), b = balanceFactions(units, { rng: seeded(99) })
    expect(units.some(unit => a.get(unit.id) !== b.get(unit.id))).toBe(true)
  })
  it('새로 오는 유저는 가장 약한 진영에 들어간다', () => {
    const rows = [
      { faction: '촉한', days: 30, power: 5000, gold: 100 }, { faction: '촉한', days: 20, power: 4000, gold: 0 },
      { faction: '위나라', days: 2, power: 1000, gold: 0 },
      { faction: '오나라', days: 25, power: 4500, gold: 0 }, { faction: '오나라', days: 10, power: 3000, gold: 0 },
    ]
    expect(weakestFaction(rows, { rng: seeded(3) })).toBe('위나라')
  })
})

import { describe, expect, it } from 'vitest'
import { cityDefenseForLevel, createInitialState, findCity, rebuildRazedWalls } from '../src/game/strategy'

// 2026.10.20 성벽 자연 회복: 1시간에 최대 방어도의 20%
const HOUR = 3600000

describe('성벽 자연 회복', () => {
  it('깎인 성벽은 1시간에 20%씩, 최대치까지만 회복한다', () => {
    const state = createInitialState()
    const city = findCity(state, 'jiaozhi')!
    const max = cityDefenseForLevel(city.level)
    const t0 = 1_000_000
    city.defense = Math.round(max * 0.3)
    rebuildRazedWalls(state, t0)
    rebuildRazedWalls(state, t0 + HOUR)
    expect(city.defense).toBe(Math.round(max * 0.3) + Math.floor(max * 0.2))
    rebuildRazedWalls(state, t0 + 10 * HOUR)
    expect(city.defense).toBe(max)
  })
  it('자주 계산해도 잘린 나머지가 쌓여 같은 양이 회복된다', () => {
    const state = createInitialState()
    const city = findCity(state, 'jiaozhi')!
    const max = cityDefenseForLevel(city.level)
    city.defense = 1
    const t0 = 5_000_000
    rebuildRazedWalls(state, t0)
    for (let t = 1; t <= 3600; t++) rebuildRazedWalls(state, t0 + t * 1000)
    expect(city.defense).toBeGreaterThanOrEqual(1 + Math.floor(max * 0.2) - 1)
  })
  it('무너진(0) 성벽은 1시간 동안 그대로이고, 그 뒤부터 시간당 20%씩 회복한다', () => {
    const state = createInitialState()
    const city = findCity(state, 'jiaozhi')!
    const max = cityDefenseForLevel(city.level)
    city.defense = 0; city.razedAt = 1_000_000
    rebuildRazedWalls(state, 1_000_000)
    rebuildRazedWalls(state, 1_000_000 + HOUR / 2)
    expect(city.defense).toBe(0)
    // 2시간 뒤에 처음 확인해도 회복은 무너진 지 1시간 되는 때부터 센다
    rebuildRazedWalls(state, 1_000_000 + 2 * HOUR)
    expect(city.defense).toBe(1 + Math.floor(max * 0.2))
  })
})

import { describe, expect, it } from 'vitest'
import { SEASON_ROTATION, SEASON_WANDERER_PLUNDER, nextSeasonKey, previousSeasonKey, seasonCopiesFor, seasonEndsAt, seasonGeneral, seasonKey, seasonNumber, seasonStandings } from '../server/season.mjs'
import { createInitialState, grantGeneralCopies } from '../src/game/strategy'

// 2026.10.21 천하 시즌: 한 달 한 시즌 · 도시 등급 합 순위 · 로테이션 무장 1위 2장 · 2 · 3위 1장 · 재야 약탈 10만 이상 1장
describe('천하 시즌', () => {
  it('시즌은 한국 날짜의 달: 2026년 10월이 시즌 1, 매월 1일 0시에 바뀐다', () => {
    expect(seasonKey(Date.parse('2026-10-31T14:59:59Z'))).toBe('2026-10')
    expect(seasonKey(Date.parse('2026-10-31T15:00:00Z'))).toBe('2026-11')
    expect(seasonNumber('2026-10')).toBe(1)
    expect(seasonNumber('2027-01')).toBe(4)
    expect(previousSeasonKey('2027-01')).toBe('2026-12')
    expect(nextSeasonKey('2026-12')).toBe('2027-01')
    expect(new Date(seasonEndsAt('2026-10')).toISOString()).toBe('2026-10-31T15:00:00.000Z')
  })
  it('보상 무장은 좌자 → 우길 → 화타 → 남화노선 → 사마휘 → 다시 좌자', () => {
    expect(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'].map(seasonGeneral)).toEqual([...SEASON_ROTATION, 'zuo-ci'])
  })
  it('순위는 도시 등급 합(수도 제외) → 도시 수 → 낙양', () => {
    const rows = seasonStandings([
      { cityId: 'chengdu', owner: '촉한', level: 5 }, { cityId: 'a', owner: '촉한', level: 1 }, { cityId: 'b', owner: '촉한', level: 1 },
      { cityId: 'c', owner: '위나라', level: 3 },
      { cityId: 'luoyang', owner: '오나라', level: 5 }, { cityId: 'd', owner: '재야', level: 5 },
    ])
    expect(rows.map(row => [row.faction, row.levels, row.rank])).toEqual([['오나라', 5, 1], ['위나라', 3, 2], ['촉한', 2, 3]])
  })
  it('받을 장수: 영토전 1회 이상 · 순위별 2 · 1 · 1, 재야는 약탈 기준', () => {
    const rows = seasonStandings([{ cityId: 'a', owner: '촉한', level: 3 }, { cityId: 'b', owner: '위나라', level: 2 }])
    expect(seasonCopiesFor(rows, { faction: '촉한', battles: 1 })).toBe(2)
    expect(seasonCopiesFor(rows, { faction: '촉한', battles: 0 })).toBe(0)
    expect(seasonCopiesFor(rows, { faction: '위나라', battles: 3 })).toBe(1)
    expect(seasonCopiesFor(rows, { faction: '오나라', battles: 3 })).toBe(1)
    expect(seasonCopiesFor(rows, { faction: '재야', battles: 9, plunder: SEASON_WANDERER_PLUNDER - 1 })).toBe(0)
    expect(seasonCopiesFor(rows, { faction: '재야', plunder: SEASON_WANDERER_PLUNDER })).toBe(1)
  })
  it('장수 지급: 없으면 1성으로 얻고 남은 장은 성급, 5성이면 병서', () => {
    const state = createInitialState()
    expect(grantGeneralCopies(state, 'zuo-ci', 2)).toContain('2성')
    expect(state.generals.find(general => general.id === 'zuo-ci')?.stars).toBe(2)
    grantGeneralCopies(state, 'zuo-ci', 3)
    const manuals = state.manuals
    expect(grantGeneralCopies(state, 'zuo-ci', 1)).toContain('병서')
    expect(state.manuals).toBeGreaterThan(manuals)
    expect(state.generals.find(general => general.id === 'zuo-ci')?.stars).toBe(5)
  })
})

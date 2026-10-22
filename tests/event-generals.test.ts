import { describe, expect, it } from 'vitest'
import { EVENT_GENERALS, allGenerals, createInitialState, recruit, recruitableGenerals, templateGeneral } from '../src/game/strategy'
import { ensureMissions } from '../src/game/missions'
import { BONDS, GENERAL_SKILLS, bondFor } from '../src/game/skills'

// 2026.10.21 이벤트 한정 천명: 좌자 · 우길 · 화타 · 남화노선 · 사마휘
describe('이벤트 한정 무장', () => {
  it('도감(전체 무장)에는 있고 천명 · 스킬 · 패시브 · 각성을 갖는다', () => {
    for (const id of EVENT_GENERALS) {
      expect(templateGeneral(id)?.grade).toBe(5)
      expect(GENERAL_SKILLS[id]?.passive).toBeTruthy()
      expect(GENERAL_SKILLS[id]?.awaken).toBeTruthy()
      expect(BONDS.some(bond => bond.members.includes(id))).toBe(true)
    }
    expect(allGenerals().filter(general => EVENT_GENERALS.has(general.id))).toHaveLength(5)
    expect(recruitableGenerals().some(general => EVENT_GENERALS.has(general.id))).toBe(false)
  })
  it('정식 모집에서는 나오지 않는다(천명 확정 모집을 여러 번 해도)', () => {
    const state = createInitialState(); ensureMissions(state); state.honor = 1e9
    for (let i = 0; i < 200; i += 1) recruit(state, 10, { guaranteeGrade: 5 })
    expect(state.generals.some(general => EVENT_GENERALS.has(general.id))).toBe(false)
    expect(state.generals.filter(general => general.grade === 5).length).toBeGreaterThan(10)
  })
  it('이벤트 무장 인연은 그 무장이 출전해야만 켜져 기존 덱의 인연을 빼앗지 않는다', () => {
    expect(bondFor(['zhuge-liang', 'pang-tong', 'guan-yu'])?.id).toBe('dragon-phoenix')
    expect(bondFor(['zhang-jiao', 'zhang-bo', 'zhang-liang'])?.id).toBe('yellow-heaven')
    expect(bondFor(['sima-hui', 'zhuge-liang', 'guan-yu'])?.id).toBe('water-mirror')
    expect(bondFor(['nanhua', 'zhang-jiao', 'guan-yu'])?.id).toBe('taiping-book')
    expect(bondFor(['hua-tuo', 'guan-yu', 'zhao-yun'])?.id).toBe('scrape-bone')
    expect(bondFor(['hua-tuo', 'yu-ji', 'zuo-ci'])?.id).toBe('divine-healers')
    expect(bondFor(['zuo-ci', 'yu-ji', 'nanhua'])?.id).toBe('three-immortals')
  })
})

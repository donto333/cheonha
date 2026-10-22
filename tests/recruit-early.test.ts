import { describe, expect, it } from 'vitest'
import { EARLY_RECRUIT_PULLS, createInitialState, recruit, recruitGradeWeights } from '../src/game/strategy'
import { ensureMissions } from '../src/game/missions'

const sum = (w: number[]) => w.reduce((a, b) => a + b, 0)

describe('모집 초반 구간(200회 미만)', () => {
  it('천명 확률만 2배, 늘어난 만큼 용사 · 신병에서 반씩 빠지고 합은 100', () => {
    expect(recruitGradeWeights(false, false)).toEqual([2, 8, 20, 35, 35])
    expect(recruitGradeWeights(false, true)).toEqual([4, 8, 20, 34, 34])
    expect(recruitGradeWeights(true, false)).toEqual([3, 10, 17, 35, 35])
    expect(recruitGradeWeights(true, true)).toEqual([6, 10, 17, 33.5, 33.5])
    for (const b of [false, true]) for (const e of [false, true]) expect(sum(recruitGradeWeights(b, e))).toBe(100)
  })
  it('이번 업데이트부터 센 횟수가 200회가 되면 원래 확률로 돌아간다', () => {
    const state = createInitialState(); ensureMissions(state); state.honor = 1e9
    // 굴림 3% → 초반에는 천명, 이후에는 명장
    const random = Math.random
    Math.random = () => 0.03
    try {
      expect(state.missions!.recruitPulls ?? 0).toBe(0)
      expect(recruit(state, 1).rewards[0].grade).toBe(5)
      state.missions!.recruitPulls = EARLY_RECRUIT_PULLS - 1
      expect(recruit(state, 1).rewards[0].grade).toBe(5)
      expect(state.missions!.recruitPulls).toBe(EARLY_RECRUIT_PULLS)
      expect(recruit(state, 1).rewards[0].grade).toBe(4)
    } finally { Math.random = random }
  })
  it('10회 모집은 10회로 센다', () => {
    const state = createInitialState(); ensureMissions(state); state.honor = 1e9
    recruit(state, 10)
    expect(state.missions!.recruitPulls).toBe(10)
  })
})

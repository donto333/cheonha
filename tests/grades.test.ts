import { describe, expect, it } from 'vitest'
import { GRADE_DOWN_COMPENSATION, PREVIOUS_GRADES, allGenerals, isEventGeneral, createInitialState, migrateGeneralGrades, templateGeneral } from '../src/game/strategy'

describe('무장 등급 재설정(삼국지 속 역할·비중, 천명은 진영마다 4명)', () => {
  it('천명은 촉·위 4명씩 · 오 5명(2026.10.20 소교) · 군웅 5명(2026.10.22 고순) 18명', () => {
    const heaven = allGenerals().filter(general => general.grade === 5 && !isEventGeneral(general.id)).map(general => general.name).sort()
    expect(heaven).toEqual(['유비', '제갈량', '관우', '조운', '조조', '사마의', '장료', '하후돈', '손권', '손책', '주유', '육손', '소교', '여포', '동탁', '원소', '장각', '고순'].sort())
    expect(allGenerals().length).toBe(78) // 2026.10.21 이벤트 한정 천명 5명
    expect(templateGeneral('zhang-fei')?.grade).toBe(4)
    expect(['송헌', '관해'].sort()).toEqual(allGenerals().filter(general => general.grade === 1).map(general => general.name).sort())
  })
  it('보유 무장을 새 등급으로 옮기고, 내려간 등급만큼 옥패로 보상한다(두 번 불러도 한 번만)', () => {
    const state = createInitialState()
    const old = (id: string) => {
      const now = templateGeneral(id)!
      return { ...now, grade: PREVIOUS_GRADES[id], leadership: now.leadership + 30, level: 7 }
    }
    state.generals = [old('guo-jia'), old('zhang-liang'), old('sun-quan')]
    const honor = state.honor
    const before = state.generals.map(general => general.leadership)
    const first = migrateGeneralGrades(state)
    expect(first.changed).toBe(3)
    expect(state.generals.map(general => general.grade)).toEqual([4, 2, 5])
    // 곽가 5→4(1000), 장량 4→2(300+100), 손권은 올라가 보상 없음
    expect(first.honor).toBe(GRADE_DOWN_COMPENSATION[5] + GRADE_DOWN_COMPENSATION[4] + GRADE_DOWN_COMPENSATION[3])
    expect(state.honor).toBe(honor + first.honor)
    // 확장 무장 능력치는 등급 기본값 차이만큼 움직인다(내려가면 줄고, 올라가면 는다), 레벨은 그대로
    expect(state.generals[0].leadership).toBeLessThan(before[0])
    expect(state.generals[2].leadership).toBeGreaterThan(before[2])
    expect(state.generals[0].level).toBe(7)
    const second = migrateGeneralGrades(state)
    expect(second.changed).toBe(0)
    expect(state.honor).toBe(honor + first.honor)
  })
})

describe('여성 무장 명장 승격(2026.10.18)', () => {
  it('관은병 · 축융 · 대교 · 채문희는 4등급 · 소교는 5등급, 예전 등급으로 저장된 보유 무장도 옮긴다', () => {
    const ids = ['xiao-qiao', 'guan-yinping', 'zhu-rong', 'da-qiao', 'cai-wenji']
    for (const id of ids) expect(templateGeneral(id)?.grade, id).toBe(id === 'xiao-qiao' ? 5 : 4)
    const state = createInitialState()
    const saved: Record<string, number> = { 'xiao-qiao': 3, 'guan-yinping': 3, 'zhu-rong': 2, 'da-qiao': 3, 'cai-wenji': 1 }
    state.generals = ids.map(id => ({ ...templateGeneral(id)!, grade: saved[id] as 1 | 2 | 3, level: 5, stars: 2, leadership: 10, martial: 10, stratagem: 10, speed: 10 }))
    const honor = state.honor
    const result = migrateGeneralGrades(state)
    expect(result.changed).toBe(5)
    expect(result.honor).toBe(0)
    expect(state.honor).toBe(honor)
    expect(state.generals.every(general => general.grade === (general.id === 'xiao-qiao' ? 5 : 4))).toBe(true)
    expect(state.generals.every(general => general.level === 5 && general.stars === 2)).toBe(true)
    expect(migrateGeneralGrades(state).changed).toBe(0)
  })
})

describe('명장 승격 2차(2026.10.18)', () => {
  it('태사자 · 고순 · 황개 · 능통 · 공손찬은 4등급, 예전 등급의 보유 무장도 레벨 · 성급 그대로 옮긴다', () => {
    const saved: Record<string, number> = { 'taishi-ci': 3, 'gao-shun': 3, 'huang-gai': 3, 'ling-tong': 3, 'gongsun-zan': 3 }
    const ids = Object.keys(saved)
    // 고순은 2026.10.22에 5등급(천명)으로 한 번 더 올랐다
    for (const id of ids) expect(templateGeneral(id)?.grade, id).toBe(id === 'gao-shun' ? 5 : 4)
    const state = createInitialState()
    state.generals = ids.map(id => ({ ...templateGeneral(id)!, grade: saved[id] as 3, level: 9, stars: 3, attack: 50 }))
    const result = migrateGeneralGrades(state)
    expect(result.changed).toBe(5)
    expect(result.honor).toBe(0)
    expect(state.generals.every(general => general.grade === (general.id === 'gao-shun' ? 5 : 4) && general.level === 9 && general.stars === 3)).toBe(true)
    // 손으로 정한 능력치(태사자 · 고순)도 예전 원형과의 차이만큼 오른다
    expect(state.generals.find(general => general.id === 'taishi-ci')!.attack).toBe(50 + 86 - 81)
    expect(state.generals.find(general => general.id === 'gao-shun')!.attack).toBe(50 + 87 - 72)
    expect(migrateGeneralGrades(state).changed).toBe(0)
  })
  it('아주 예전(2등급)으로 저장된 고순도 옮긴다', () => {
    const state = createInitialState()
    state.generals = [{ ...templateGeneral('gao-shun')!, grade: 2, defense: 76 }]
    migrateGeneralGrades(state)
    expect(state.generals[0].grade).toBe(5)
    expect(state.generals[0].defense).toBe(96)
  })
})

describe('고순 천명 · 진궁 명장 승격(2026.10.22)', () => {
  it('4등급 고순 · 3등급 진궁을 가진 계정도 레벨 · 성급 그대로 새 등급으로 옮긴다', () => {
    expect(templateGeneral('gao-shun')?.grade).toBe(5)
    expect(templateGeneral('chen-gong')?.grade).toBe(4)
    const state = createInitialState()
    state.generals = [{ ...templateGeneral('gao-shun')!, grade: 4, level: 12, stars: 2, attack: 90 }, { ...templateGeneral('chen-gong')!, grade: 3, level: 7, stars: 1, stratagem: 80 }]
    const result = migrateGeneralGrades(state)
    expect(result.changed).toBe(2)
    expect(result.honor).toBe(0)
    expect(state.generals[0]).toMatchObject({ grade: 5, level: 12, stars: 2, attack: 90 + 87 - 77 })
    expect(state.generals[1]).toMatchObject({ grade: 4, level: 7, stars: 1, stratagem: 80 + 12 })
  })
})

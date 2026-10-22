import { describe, expect, it } from 'vitest'
import { TIANMING_RIDERS, heroLook } from '../src/game/hero-style'
import { templateGeneral } from '../src/game/strategy'

// 프로젝트 타입 설정에 Node 타입이 없으므로(node:fs 불가) Vite의 파일 목록으로 확인한다
const riderFiles = new Set(Object.keys(import.meta.glob('../public/assets/models/riders/*.glb')).map(path => path.split('/').pop()))

describe('천명 무장 전용 기수 모델', () => {
  it('모델 파일이 있고, 천명 기운 · 깃발만 두르며 수염 · 망토 장식은 모델에 맡긴다', () => {
    expect(TIANMING_RIDERS.size).toBe(16)
    for (const id of TIANMING_RIDERS) {
      expect(riderFiles.has(`${id}.glb`), id).toBe(true)
      const general = templateGeneral(id)!
      expect(general.grade, id).toBe(5)
      const look = heroLook(general)
      expect(look.rider).toBe(id)
      expect(look.model).toBe('cavalry')
      expect(look.tianming?.ornaments ?? []).toEqual(id === 'lu-bu' ? ['redPlume'] : [])
      expect(look.tianming?.cape).toBeUndefined()
      expect(look.dress).toBeUndefined()
      expect(look.skin).toBeUndefined()
    }
  })
})

describe('궁병 무장의 손 무기', () => {
  it('활을 쏘는 무장은 모두 활을 든다(원소 · 손권 · 손상향 · 대교 …)', async () => {
    const { allGenerals } = await import('../src/game/strategy')
    const archers = allGenerals().filter(general => general.role === '궁병')
    expect(archers.length).toBeGreaterThan(0)
    for (const general of archers) {
      const look = heroLook(general)
      expect(look.kind, general.id).toBe('shoot')
      expect(look.weapon, general.id).toBe('bow')
    }
  })
})

describe('병종별 손 무기', () => {
  it('모든 무장이 병종에 맞는 무기를 든다', async () => {
    const { allGenerals } = await import('../src/game/strategy')
    const melee = ['sword', 'spear', 'glaive', 'halberd', 'snake', 'blade']
    for (const general of allGenerals()) {
      const look = heroLook(general)
      if (general.role === '궁병') expect(look.weapon, general.id).toBe('bow')
      else if (general.role === '책사') { expect(look.weapon, general.id).toBe('fan'); expect(look.kind, general.id).toBe('cast') }
      else expect(melee, `${general.id} ${general.role} ${look.weapon}`).toContain(look.weapon)
    }
  })
})

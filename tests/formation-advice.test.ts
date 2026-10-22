import { describe, expect, it } from 'vitest'
import WIN_TABLE from '../src/game/recommended-decks.json'
import { ARCHETYPES, applyCombo, deckStyle, recommendDecks } from '../src/game/formation-advice'
import { GENERAL_SKILLS, bondFor } from '../src/game/skills'
import { allGenerals, createInitialState, templateGeneral } from '../src/game/strategy'

describe('무장별 추천 덱', () => {
  it('무장마다 유형별(연계·버티기·초반·디버프·유틸) 서로 다른 조합 5개, 모두 그 무장을 포함', () => {
    for (const id of ['guan-yu', 'song-xian', 'cao-ren', 'zhuge-liang']) {
      const decks = recommendDecks(id)
      expect(decks.map(deck => deck.archetype)).toEqual(ARCHETYPES)
      for (const deck of decks) {
        expect(deck.ids).toContain(id)
        expect(new Set(deck.ids).size).toBe(3)
      }
      expect(new Set(decks.map(deck => [...deck.ids].sort().join())).size).toBe(5)
    }
  })
  it('버티기 덱은 가운데(전열)에 수호형을 세운다', () => {
    for (const id of ['guan-yu', 'lu-bu', 'liu-bei', 'zhou-yu']) {
      const sustain = recommendDecks(id).find(deck => deck.archetype === 'sustain')!
      expect(GENERAL_SKILLS[sustain.ids[1]].type).toBe('수호')
    }
  })
  it('천명 무장은 유형마다 시뮬레이션 최고 승률 조합(승률 표)을 추천한다', () => {
    const table = WIN_TABLE as Record<string, Record<string, { ids: string[]; winRate: number }>>
    const legends = allGenerals().filter(general => general.grade === 5)
    expect(legends.every(general => table[general.id])).toBe(true)
    for (const general of legends) {
      for (const deck of recommendDecks(general.id)) {
        const entry = table[general.id][deck.archetype]
        // 속공은 속공 인연 덱(합비 질풍대 등)에 든 무장이면 그 덱이 먼저 나온다
        if (!entry || (deck.archetype === 'early' && deck.bond?.early)) continue
        expect([...deck.ids].sort()).toEqual([...entry.ids].sort())
        expect(deck.winRate).toBe(entry.winRate)
      }
    }
    // 천명이 아닌 무장은 승률 표 없이 스킬 설계 점수로 추천한다
    expect(recommendDecks('guan-ping').every(deck => deck.winRate === undefined)).toBe(true)
  })
  it('세 무장을 모두 가져야 편성되고, 순서(좌·전열·우)대로 선다', () => {
    const state = createInitialState()
    state.generals = ['guan-yu', 'liu-bei', 'zhang-fei'].map(id => templateGeneral(id)!)
    expect(applyCombo(state, ['guan-yu', 'liu-bei', 'zhang-fei']).ok).toBe(true)
    expect(state.formation).toEqual(['guan-yu', 'liu-bei', 'zhang-fei'])
    expect(applyCombo(state, ['guan-yu', 'lu-bu', 'zhang-fei']).ok).toBe(false)
    expect(allGenerals().length).toBe(78)
  })
  it('속공 인연 덱: 세 명이 모두 출전하면 켜지고, 구성원의 속공 추천에 나오며 속공으로 판정된다', () => {
    const trios = [['zhang-liao', 'yue-jin', 'li-dian'], ['yan-liang', 'wen-chou', 'zhang-he'], ['wei-yan', 'huang-zhong', 'ma-dai'], ['gan-ning', 'ling-tong', 'sun-ce'], ['lu-bu', 'gao-shun', 'chen-gong'], ['guan-yu', 'ma-chao', 'guan-yinping']]
    for (const trio of trios) {
      expect(bondFor(trio)?.early?.sec).toBe(20)
      expect(deckStyle(trio)).toBe('early')
      for (const id of trio) {
        const rush = recommendDecks(id).find(deck => deck.archetype === 'early')!
        expect([...rush.ids].sort()).toEqual([...trio].sort())
        expect(rush.winRate).toBeGreaterThan(0.8); expect(rush.winRate).toBeLessThan(0.92) // 2026.10.22 조정: 속공 인연 덱은 종합 약 85~87%(상위 20위권)
      }
    }
    // 두 명만 있으면 예전 인연(합비 수비)이 켜진다
    expect(bondFor(['zhang-liao', 'yue-jin', 'cao-cao'])?.id).toBe('hefei')
  })
})

import { describe, expect, it } from 'vitest'
import { DUEL_TIER_FRAGMENTS, DUEL_USER_THRESHOLD, assignDuelTiers, duelDeckPower, duelTierFor, pickDuelMatches } from '../server/duel-match.mjs'
import { MYTHIC_FRAGMENT_COST } from '../src/game/strategy'
import { dummyDuelDecks } from '../src/game/duel'
import { GENERAL_SKILLS } from '../src/game/skills'
import { scaleGeneral, templateGeneral } from '../src/game/strategy'

const grown = (id: string, level: number, stars = 3) => ({ ...scaleGeneral({ ...templateGeneral(id)!, level: 1, stars: 1 }, level, stars), skillUnlocked: true })

describe('유저 대련 매칭', () => {
  it('실제 유저는 20명부터, 내 전력의 50~120%에서 쉬움 · 보통 · 어려움을 고르게 고른다', () => {
    expect(DUEL_USER_THRESHOLD).toBe(20)
    const candidates = [400, 550, 600, 800, 900, 1000, 1150, 1180, 1300, 3000].map((power, index) => ({ id: `user-${index}`, power }))
    expect(pickDuelMatches(candidates, 1000, 3).map(item => item.power)).toEqual([600, 900, 1150])
    expect(pickDuelMatches(candidates, 1000, 6).map(item => item.power)).toEqual([550, 600, 800, 900, 1150, 1180])
  })
  it('훈련 상대는 내 덱 전력의 60%·90%·115%에 맞추고, 가운데에 수호형을 세운다', () => {
    for (const level of [1, 5, 20, 45]) {
      const mine = [grown('guan-yu', level), grown('cao-ren', level), grown('zhuge-liang', level)]
      const power = duelDeckPower(mine)
      const dummies = dummyDuelDecks(mine, '2026-10-14')
      expect(dummies).toHaveLength(3)
      dummies.forEach((dummy, index) => {
        const target = power * [0.6, 0.9, 1.15][index]
        expect(Math.abs(dummy.power - target) / target).toBeLessThan(0.08)
        expect(GENERAL_SKILLS[dummy.deck[1].id].type).toBe('수호')
      })
    }
  })
  it('날마다 훈련 상대 무장 구성이 바뀐다', () => {
    const mine = [grown('guan-yu', 20), grown('cao-ren', 20), grown('zhuge-liang', 20)]
    const ids = (day: string) => dummyDuelDecks(mine, day).map(dummy => dummy.deck.map(general => general.id).join()).join('|')
    expect(ids('2026-10-14')).not.toBe(ids('2026-10-15'))
  })
  it('승리 보상은 쉬움 1 · 보통 2 · 어려움 3조각, 신화장비 1개는 100조각', () => {
    expect(DUEL_TIER_FRAGMENTS).toEqual({ easy: 1, normal: 2, hard: 3 })
    expect(MYTHIC_FRAGMENT_COST).toBe(100)
    const mine = [grown('guan-yu', 20), grown('cao-ren', 20), grown('zhuge-liang', 20)]
    expect(dummyDuelDecks(mine, 'x').map(dummy => dummy.tier)).toEqual(['easy', 'normal', 'hard'])
    expect(duelTierFor(1100, 1000)).toBe('hard')
    expect(duelTierFor(1090, 1000)).toBe('normal')
    expect(duelTierFor(700, 1000)).toBe('normal')
    expect(duelTierFor(690, 1000)).toBe('easy')
  })
  it('나보다 센 상대(110% 이상)가 없으면 보통 구간 상대 중 센 쪽이 어려움을 함께 쓴다', () => {
    expect(assignDuelTiers([{ power: 600 }, { power: 800 }, { power: 950 }, { power: 1050 }], 1000)).toEqual(['easy', 'normal', 'hard', 'hard'])
    expect(assignDuelTiers([{ power: 600 }, { power: 900 }], 1000)).toEqual(['easy', 'hard'])
    expect(assignDuelTiers([{ power: 600 }, { power: 900 }, { power: 1150 }], 1000)).toEqual(['easy', 'normal', 'hard'])
  })
})

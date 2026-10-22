import { describe, expect, it } from 'vitest'
import { BattleCore, MYTHIC_EFFECT } from '../src/game/battle-core'
import { EQUIPMENT_GRADE_META, MYTHIC_EFFECT_TEXT, MYTHIC_SHOP_EQUIPMENT, equipmentBonusFromItems, equipmentValue, makeEquipment, mythicKeysFromItems, scaleGeneral, specialtyValue, templateGeneral, withEquipmentStats } from '../src/game/strategy'

// 2026.10.20 전설 강화(기본 40 · Lv15부터 특기 절반) · 신화 강화(기본 150 · 강화당 +6% · 부위마다 고유 효과)
describe('전설 · 신화 장비 강화', () => {
  it('전설 Lv20은 146, 신화 Lv1은 150 · Lv20은 약 321', () => {
    expect(EQUIPMENT_GRADE_META.legendary.base).toBe(40)
    expect(equipmentValue(makeEquipment('weapon', 'martial', 'legendary', 20))).toBe(146)
    expect(equipmentValue(makeEquipment('weapon', 'martial', 'mythic', 1))).toBe(150)
    expect(equipmentValue(makeEquipment('weapon', 'martial', 'mythic', 20))).toBe(321)
    // 예전에 저장된 신화(기본값 52)도 새 기본값을 따른다
    expect(equipmentValue({ grade: 'mythic', level: 1, baseValue: 52 })).toBe(150)
  })
  it('전설 특기는 Lv15부터 신화의 절반', () => {
    const low = makeEquipment('weapon', 'martial', 'legendary', 14)
    const high = makeEquipment('weapon', 'martial', 'legendary', 15)
    const mythic = makeEquipment('weapon', 'martial', 'mythic', 1)
    expect(low.specialty).toBeTruthy()
    expect(specialtyValue(low)).toBe(0)
    expect(specialtyValue(high)).toBe(Math.round(specialtyValue(mythic) * 0.5))
  })
  it('신화 12종 모두 고유 효과 설명이 있다', () => {
    expect(MYTHIC_SHOP_EQUIPMENT).toHaveLength(12)
    for (const item of MYTHIC_SHOP_EQUIPMENT) expect(item.skillDescription).toBe(MYTHIC_EFFECT_TEXT[`${item.set}-${item.type}`])
  })
  it('적룡천극(스킬 위력)과 질풍유성창(첫 스킬 즉시)이 전투에 반영된다', () => {
    const general = (id: string, items: ReturnType<typeof makeEquipment>[]) => ({ ...withEquipmentStats(scaleGeneral({ ...templateGeneral(id)!, level: 1, stars: 1 }, 40, 3), equipmentBonusFromItems([]), [], mythicKeysFromItems(items)), skillUnlocked: true })
    const foes = ['guan-yu', 'zhang-fei', 'zhao-yun'].map(id => general(id, []))
    const plain = new BattleCore([general('xu-huang', []), general('cao-ren', []), general('xu-chu', [])], foes, { mode: 'scenario', rng: () => 0.5 })
    const armed = new BattleCore([general('xu-huang', [makeEquipment('weapon', 'martial', 'mythic', 1)]), general('cao-ren', []), general('xu-chu', [])], foes, { mode: 'scenario', rng: () => 0.5 })
    const quick = new BattleCore([general('zhang-liao', [makeEquipment('weapon', 'speed', 'mythic', 1)]), general('cao-ren', []), general('xu-chu', [])], foes, { mode: 'scenario', rng: () => 0.5 })
    expect(quick.players[0].cd).toBe(0)
    const hit = (core: BattleCore) => { core.players.forEach(unit => { unit.attackTimer = 999 }); core.players[0].cd = 0; const before = core.morale; core.castSkill(0); return before - core.morale }
    expect(hit(armed)).toBeGreaterThan(hit(plain))
    expect(armed.players[0].general.mythicGear).toEqual(['martial-weapon'])
    expect(plain.players[0].general.mythicGear).toBeUndefined()
    expect(MYTHIC_EFFECT.martialSkill).toBeGreaterThan(0)
  })
})

describe('호위무사 조조', () => {
  it('전위 · 허저와 함께면 조조가 돌격형으로 싸운다', () => {
    const g = (id: string) => ({ ...scaleGeneral({ ...templateGeneral(id)!, level: 1, stars: 1 }, 40, 3), skillUnlocked: true })
    const foes = ['guan-yu', 'zhang-fei', 'zhao-yun'].map(g)
    const guard = new BattleCore([g('dian-wei'), g('cao-cao'), g('xu-chu')], foes, { mode: 'scenario', rng: () => 0.5 })
    const plain = new BattleCore([g('xiahou-dun'), g('cao-cao'), g('zhang-liao')], foes, { mode: 'scenario', rng: () => 0.5 })
    expect(guard.players[1].def.type).toBe('돌격')
    expect(guard.players[1].def.active.name).toBe('패왕의 진격')
    expect(plain.players[1].def.type).toBe('수호')
  })
})

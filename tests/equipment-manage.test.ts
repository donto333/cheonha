import { describe, expect, it } from 'vitest'
import { applyEquipmentPreset, bulkDismantle, bulkDismantlePreview, bulkDismantleTargets, dismantleEquipment, dismantlableCount, packLoadouts, saveEquipmentPreset, toggleEquipmentLock, unpackLoadouts } from '../src/game/equipment-manage'
import { autoEquip, createInitialState, enhanceEquipment, ensureEquipmentState, equipEquipment, equipmentBonus, makeEquipment, unequipEquipment, type Equipment } from '../src/game/strategy'

const add = (state: ReturnType<typeof createInitialState>, item: Equipment) => { state.equipmentInventory.push(item); return item }

describe('장비 보관·관리', () => {
  it('분해하면 옥패·철을 받고, 장착분·잠금·신화는 남는다', () => {
    const state = createInitialState()
    const normal = add(state, { ...makeEquipment('weapon', 'martial', 'normal', 1), id: 'n1', quantity: 3 })
    const general = state.generals[0].id
    expect(equipEquipment(state, general, 'n1').ok).toBe(true)
    const honor = state.honor, iron = state.resources.iron
    const result = dismantleEquipment(state, 'n1', 99)
    expect(result.ok).toBe(true)
    expect(result.count).toBe(2) // 장착한 1개는 남는다(장착분은 자기 줄로 떨어져 있다)
    const kept = state.equipmentLoadouts[general].weapon!
    expect(state.equipmentInventory.find(item => item.id === kept)?.quantity).toBe(1)
    expect(state.equipmentInventory.some(item => item === normal)).toBe(false)
    expect(state.honor).toBe(honor + 12)
    expect(state.resources.iron).toBe(iron + 60)
    expect(dismantleEquipment(state, kept).ok).toBe(false)
    const rare = add(state, { ...makeEquipment('armor', 'command', 'rare', 1), id: 'r1' })
    toggleEquipmentLock(state, rare.id)
    expect(dismantleEquipment(state, 'r1').ok).toBe(false)
    const mythic = add(state, { ...makeEquipment('armor', 'speed', 'mythic', 1), id: 'm1' })
    ensureEquipmentState(state)
    expect(mythic.locked).toBe(true)
    expect(dismantleEquipment(state, 'm1').ok).toBe(false)
  })
  it('강화한 장비를 분해하면 강화 비용 절반을 돌려받고, 일괄 분해는 강화한 장비를 건너뛴다', () => {
    const state = createInitialState()
    add(state, { ...makeEquipment('weapon', 'martial', 'normal', 1), id: 'a', quantity: 5 })
    add(state, { ...makeEquipment('armor', 'martial', 'normal', 3), id: 'b' })
    add(state, { ...makeEquipment('armor', 'martial', 'rare', 1), id: 'c', quantity: 2 })
    const before = bulkDismantlePreview(state, 'normal')
    expect(before.count).toBeGreaterThanOrEqual(5)
    const silver = state.silver
    expect(dismantleEquipment(state, 'b').gain?.silver).toBeGreaterThan(0)
    expect(state.silver).toBeGreaterThan(silver)
    expect(bulkDismantle(state, 'rare').ok).toBe(true)
    expect(state.equipmentInventory.some(item => item.id === 'a' || item.id === 'c')).toBe(false)
  })
  it('프리셋: 저장해 둔 장비 조합을 한 번에 장착하고, 서버 저장 형식으로 오간다', () => {
    const state = createInitialState()
    const general = state.generals[0].id, other = state.generals[1].id
    const w = add(state, { ...makeEquipment('weapon', 'speed', 'rare', 1), id: 'w' })
    const r = add(state, { ...makeEquipment('armor', 'speed', 'rare', 1), id: 'r' })
    equipEquipment(state, general, w.id); equipEquipment(state, general, r.id)
    expect(saveEquipmentPreset(state, general, 0).ok).toBe(true)
    equipEquipment(state, other, w.id)
    expect(state.equipmentLoadouts[general].weapon).not.toBe('w')
    expect(applyEquipmentPreset(state, general, 0).ok).toBe(true)
    expect(state.equipmentLoadouts[general].weapon).toBe('w')
    const packed = JSON.parse(JSON.stringify(packLoadouts(state)))
    const unpacked = unpackLoadouts(packed)
    expect(unpacked.loadouts[general].weapon).toBe('w')
    expect(Object.keys(unpacked.loadouts)).not.toContain('__presets')
    expect(unpacked.presets?.[general]?.[0]?.armor).toBe('r')
  })
  it('같은 장비 묶음은 여러 무장이 1개씩 나눠 끼고, 강화 · 합치기 뒤에도 한 장비를 두 무장이 함께 끼지 않는다', () => {
    const state = createInitialState()
    state.equipmentLoadouts = {}
    state.equipmentInventory = []
    state.resources.iron = 1e9; state.silver = state.resources.silver = 1e9
    const [a, b, c] = state.formation
    add(state, { ...makeEquipment('weapon', 'martial', 'legendary', 1), id: 'L', quantity: 3 })
    ensureEquipmentState(state)
    equipEquipment(state, a, 'L'); equipEquipment(state, b, 'L'); equipEquipment(state, c, 'L')
    const ids = [a, b, c].map(id => state.equipmentLoadouts[id].weapon)
    expect(new Set(ids).size).toBe(3)
    expect(state.equipmentInventory.reduce((n, item) => n + (item.quantity ?? 1), 0)).toBe(3)
    // 장착한 장비를 강화하면 끼고 있는 그 장비가 강화된다
    const before = equipmentBonus(state, a).martial
    enhanceEquipment(state, state.equipmentLoadouts[a].weapon!)
    expect(equipmentBonus(state, a).martial).toBeGreaterThan(before)
    enhanceEquipment(state, state.equipmentLoadouts[b].weapon!)
    ensureEquipmentState(state)
    expect(state.equipmentLoadouts[a].weapon).not.toBe(state.equipmentLoadouts[b].weapon)
    expect(state.equipmentInventory.reduce((n, item) => n + dismantlableCount(state, item), 0)).toBe(0)
    // 해제하면 보관 묶음으로 돌아간다
    unequipEquipment(state, c, 'weapon')
    expect(state.equipmentInventory.reduce((n, item) => n + (item.quantity ?? 1), 0)).toBe(3)
  })
  it('예전 저장(묶음 하나를 여러 무장이 가리킴)은 수량만큼만 남기고 무장마다 따로 떼어 낸다', () => {
    const state = createInitialState()
    add(state, { ...makeEquipment('armor', 'command', 'rare', 1), id: 'old', quantity: 1 })
    const [a, b] = state.formation
    state.equipmentLoadouts = { [a]: { armor: 'old' }, [b]: { armor: 'old' } }
    ensureEquipmentState(state)
    expect([state.equipmentLoadouts[a].armor, state.equipmentLoadouts[b].armor].filter(Boolean)).toHaveLength(1)
  })
  it('자동 장착은 보관 묶음을 수량만큼 나눠 끼우고, 프리셋에 저장한 장비는 일괄 분해하지 않는다', () => {
    const state = createInitialState()
    state.equipmentLoadouts = {}
    state.equipmentInventory = []
    add(state, { ...makeEquipment('weapon', 'speed', 'unique', 1), id: 'U', quantity: 3 })
    ensureEquipmentState(state)
    autoEquip(state)
    expect(new Set(state.formation.map(id => state.equipmentLoadouts[id]?.weapon).filter(Boolean)).size).toBe(3)
    const n = add(state, { ...makeEquipment('armor', 'martial', 'normal', 1), id: 'N' })
    equipEquipment(state, state.formation[0], n.id)
    saveEquipmentPreset(state, state.formation[0], 0)
    unequipEquipment(state, state.formation[0], 'armor')
    expect(bulkDismantleTargets(state, 'normal').some(entry => entry.item.id === 'N')).toBe(false)
  })
})

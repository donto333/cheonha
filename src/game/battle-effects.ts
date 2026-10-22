// 전투 효과 카탈로그.
// 쪽(side): buff = 아군에게 거는 강화, debuff = 적에게 거는 약화,
// 'player-debuff' = 적이 아군에게 거는 약화, 'enemy-buff' = 적이 스스로 거는 강화.
export type BuffId =
  | 'dragon-might'
  | 'swift-step'
  | 'iron-wall'
  | 'jade-command'
  | 'war-chant'
  | 'chain-fury'
  | 'hawk-eye'
  | 'phoenix-guard'
  | 'battle-focus'
  | 'rally-banner'
  | 'atk-up'
  | 'dr-up'
  | 'counter'
  | 'tactic-discount'
  | 'east-wind'
  | 'insight'
  | 'chaos-craft'
  | 'archer-focus'
  | 'cavalry-surge'
  | 'heavy-step'
  | 'hangover'

export type DebuffId =
  | 'armor-break'
  | 'burning'
  | 'great-fire'
  | 'fear'
  | 'confusion'
  | 'slow'
  | 'bleed'
  | 'fracture'
  | 'mark'
  | 'silence'
  | 'blind'
  | 'chain'
  | 'flood'
  | 'rage'
  | 'weaken'

export type PlayerDebuffId = 'p-burn' | 'p-confuse' | 'p-fear'
export type EnemyBuffId = 'e-guard'

export type BattleEffectId = BuffId | DebuffId | PlayerDebuffId | EnemyBuffId

export interface BattleEffectDefinition {
  id: BattleEffectId
  kind: 'buff' | 'debuff'
  name: string
  icon: string
  duration: number
  description: string
}

export interface ActiveBattleEffect extends BattleEffectDefinition {
  remaining: number
  stacks: number
  /** 세기(공격 +15%면 0.15). 같은 효과가 다시 걸리면 큰 값을 남긴다. */
  value?: number
}

export const BATTLE_EFFECTS: Record<BattleEffectId, BattleEffectDefinition> = {
  'dragon-might': { id: 'dragon-might', kind: 'buff', name: '청룡의 기세', icon: '🐉', duration: 6, description: '스킬 피해량 +18%' },
  'swift-step': { id: 'swift-step', kind: 'buff', name: '질풍보법', icon: '⚡', duration: 6, description: '스킬 쿨다운 회복 속도 +25%' },
  'iron-wall': { id: 'iron-wall', kind: 'buff', name: '철벽진', icon: '🛡', duration: 7, description: '매초 사기 +4' },
  'jade-command': { id: 'jade-command', kind: 'buff', name: '옥패 지휘', icon: '💎', duration: 6, description: '틀린 대응의 아군 사기 하락 −35%' },
  'war-chant': { id: 'war-chant', kind: 'buff', name: '전군 함성', icon: '📣', duration: 6, description: '전술 게이지 획득량 +25%' },
  'chain-fury': { id: 'chain-fury', kind: 'buff', name: '연계 격화', icon: '🔗', duration: 6, description: '연계 피해 증폭 +10%' },
  'hawk-eye': { id: 'hawk-eye', kind: 'buff', name: '천리안', icon: '👁', duration: 6, description: '스킬 사기 피해 +4' },
  'phoenix-guard': { id: 'phoenix-guard', kind: 'buff', name: '봉화 수호', icon: '🔥', duration: 7, description: '사기 하락량 −25%' },
  'battle-focus': { id: 'battle-focus', kind: 'buff', name: '무념 집중', icon: '🎯', duration: 5, description: '다음 스킬 쿨다운 −1.5초' },
  'rally-banner': { id: 'rally-banner', kind: 'buff', name: '군심 결집', icon: '🚩', duration: 6, description: '매초 상대 사기 −3' },
  'atk-up': { id: 'atk-up', kind: 'buff', name: '공세', icon: '⚔', duration: 6, description: '공격 증가' },
  'dr-up': { id: 'dr-up', kind: 'buff', name: '굳건한 방진', icon: '🛡', duration: 6, description: '받는 피해 감소' },
  counter: { id: 'counter', kind: 'buff', name: '반격', icon: '↩', duration: 5, description: '받은 병력 피해 일부를 상대에게 돌려줌' },
  'tactic-discount': { id: 'tactic-discount', kind: 'buff', name: '묘책', icon: '📜', duration: 6, description: '전술 명령 비용 −30%' },
  'east-wind': { id: 'east-wind', kind: 'buff', name: '동남풍', icon: '🌬', duration: 12, description: '화계 지속 +3초, 화계 피해 ×1.5' },
  insight: { id: 'insight', kind: 'buff', name: '간파', icon: '🔍', duration: 12, description: '다음 스킬 피해 ×2' },
  'chaos-craft': { id: 'chaos-craft', kind: 'buff', name: '난무', icon: '🌀', duration: 10, description: '분노한 상대의 화계·공포 지속 ×1.5' },
  'archer-focus': { id: 'archer-focus', kind: 'buff', name: '강동 궁진', icon: '🏹', duration: 6, description: '궁병 공격 증가' },
  'cavalry-surge': { id: 'cavalry-surge', kind: 'buff', name: '백마 쇄도', icon: '🐎', duration: 6, description: '기병 공격·속도 증가' },
  'heavy-step': { id: 'heavy-step', kind: 'buff', name: '폭정의 무게', icon: '⛓', duration: 6, description: '공격 속도 감소' },
  hangover: { id: 'hangover', kind: 'buff', name: '야심의 대가', icon: '🍶', duration: 8, description: '5초 뒤 공격 감소' },
  'armor-break': { id: 'armor-break', kind: 'debuff', name: '갑주 균열', icon: '🪓', duration: 6, description: '받는 스킬 피해 +35%' },
  burning: { id: 'burning', kind: 'debuff', name: '화계', icon: '🔥', duration: 6, description: '매초 사기 −2.2 · 병력 −0.6%' },
  'great-fire': { id: 'great-fire', kind: 'debuff', name: '대화계', icon: '🔥', duration: 6, description: '매초 사기 −2.2 · 병력 −0.6% · 화계와 따로 겹쳐 들어감 · 상태이상 해제로 지워지지 않음' },
  fear: { id: 'fear', kind: 'debuff', name: '공포', icon: '😨', duration: 5, description: '매초 사기 −1.5' },
  confusion: { id: 'confusion', kind: 'debuff', name: '혼란', icon: '🌀', duration: 5, description: '무장 1명이 정해진 시간 동안 적과 아군을 가리지 않고 공격하고(35% 확률로 같은 편을 치며 피해는 절반), 스킬이 준비되면 아무에게나 저절로 쓴다(직접 쓸 수 없음)' },
  slow: { id: 'slow', kind: 'debuff', name: '둔화', icon: '🐢', duration: 6, description: '적 전술 예고 주기 지연' },
  bleed: { id: 'bleed', kind: 'debuff', name: '출혈', icon: '🩸', duration: 6, description: '매초 사기 −1.3' },
  fracture: { id: 'fracture', kind: 'debuff', name: '진형 붕괴', icon: '💥', duration: 6, description: '받는 사기 피해 +15%' },
  mark: { id: 'mark', kind: 'debuff', name: '표적 낙인', icon: '🎯', duration: 7, description: '모든 스킬 피해 +20%' },
  silence: { id: 'silence', kind: 'debuff', name: '침묵', icon: '🤫', duration: 5, description: '스킬 쿨다운 정지 · 받는 피해 +15% · 공격 −15%' },
  blind: { id: 'blind', kind: 'debuff', name: '시야 차단', icon: '🌫', duration: 5, description: '공격 −10% · 적에게 걸리면 아군 틀린 대응의 사기 하락 −20%' },
  chain: { id: 'chain', kind: 'debuff', name: '연환', icon: '⛓', duration: 6, description: '화계·광역 피해 ×1.5, 스킬 병력 피해가 상대 전체로' },
  flood: { id: 'flood', kind: 'debuff', name: '수공', icon: '🌊', duration: 5, description: '둔화 + 받는 피해 +15%' },
  rage: { id: 'rage', kind: 'debuff', name: '분노', icon: '💢', duration: 6, description: '공격 +10%, 받는 피해 +25%' },
  weaken: { id: 'weaken', kind: 'debuff', name: '약화', icon: '⬇️', duration: 6, description: '공격 · 방어 감소(가후 독계 −30%)' },
  'p-burn': { id: 'p-burn', kind: 'debuff', name: '아군 화상', icon: '🔥', duration: 6, description: '매초 아군 병력 −0.6% · 아군 사기 −2.2' },
  'p-confuse': { id: 'p-confuse', kind: 'debuff', name: '아군 혼란', icon: '🌀', duration: 6, description: '아군 무장 1명이 정해진 시간 동안 적과 아군을 가리지 않고 공격하고(35% 확률로 같은 편을 치며 피해는 절반), 스킬이 준비되면 아무에게나 저절로 쓴다(직접 쓸 수 없음)' },
  'p-fear': { id: 'p-fear', kind: 'debuff', name: '아군 위축', icon: '😰', duration: 6, description: '아군 공격 −15% · 매초 아군 사기 −1.5' },
  'e-guard': { id: 'e-guard', kind: 'buff', name: '적 방진', icon: '🛡', duration: 6, description: '적이 받는 피해 −20%' },
}

export function hasBattleEffect(effects: ActiveBattleEffect[], id: BattleEffectId): boolean {
  return effects.some(effect => effect.id === id && effect.remaining > 0)
}

export function effectValue(effects: ActiveBattleEffect[], id: BattleEffectId): number {
  return effects.reduce((best, effect) => effect.id === id && effect.remaining > 0 ? Math.max(best, effect.value ?? 0) : best, 0)
}

export function effectDefinition(id: BattleEffectId): BattleEffectDefinition {
  return BATTLE_EFFECTS[id]
}

export function effectNames(effects: ActiveBattleEffect[]): string {
  return effects.filter(effect => effect.remaining > 0).map(effect => `${effect.icon} ${effect.name}`).join(' · ')
}

// 무장 스킬 정의 — '무장 스킬 재구성 및 밸런스 구성안'(2026-10-12)의 단일 원본.
// 수치를 바꿀 때는 이 파일만 고친다. 전투 계산은 battle-core.ts가 이 정의를 읽는다.
import type { BuffId, DebuffId } from './battle-effects'

export type SkillType = '돌격' | '사격' | '계략' | '통솔' | '수호' | '치유'
export type FactionTag = '촉' | '위' | '오' | '군웅'
type Grade = 1 | 2 | 3 | 4 | 5

export const SKILL_TYPE_META: Record<SkillType, { base: number; cooldown: number; stat: 'martial' | 'stratagem' | 'leadership'; label: string }> = {
  돌격: { base: 14, cooldown: 10, stat: 'martial', label: '단일 대상 큰 피해' },
  사격: { base: 11, cooldown: 8, stat: 'martial', label: '약한 적 마무리' },
  계략: { base: 11, cooldown: 11, stat: 'stratagem', label: '디버프·지속 피해' },
  통솔: { base: 10, cooldown: 11, stat: 'leadership', label: '아군 전체 버프 · 쓰면 6초 동안 아군 공격 +15%' },
  수호: { base: 3, cooldown: 12, stat: 'leadership', label: '피해 감소·반격' },
  치유: { base: 0, cooldown: 16, stat: 'leadership', label: '회복·상태이상 해제' },
}

/** 통솔(아군 강화)형: 버프 지속 +초, 버프 수치는 등급이 높을수록 크게(신병 ×1.25 ~ 천명 ×1.9, 2026.10.19: 적 AI도 통솔 버프를 쓰게 되어 천명 2.4 → 1.9). 스킬을 쓰면 6초 동안 아군 전체 공격 +15%, 전술 게이지 효과 ×1.5 */
export const COMMAND_BUFF_SEC = 4
export const COMMAND_BUFF_GRADE: Record<number, number> = { 1: 1.25, 2: 1.4, 3: 1.6, 4: 1.8, 5: 1.9 }

export const SKILL_GRADE_COEF: Record<Grade, number> = { 1: 0.8, 2: 0.88, 3: 1, 4: 1.1, 5: 1.2 }
export const SKILL_STAR_COEF = [1, 1, 1.08, 1.16, 1.24, 1.32] // index = 성급
export const SKILL_MORALE_CAP = 40
/** 스킬 위력 버프가 걸린 동안(속공 인연 초반 효과 · 공격 강화 · 용의 위세 · 연환의 분노 · 간파)에는 상한을 여기까지 연다(2026.10.22) */
export const SKILL_MORALE_CAP_BUFFED = 50
export const SKILL_MIN_COOLDOWN = 5

export type SkillCond = 'firstSkill' | 'enemyMoraleLow' | 'targetLow' | 'centerPattern' | 'afterGuanYu' | 'perFallenEnemy' | 'early' | 'stripped'

/** 스킬 효과 조각. battle-core.ts의 applySkillEffect가 해석한다. */
export type SkillFx =
  | { k: 'debuff'; id: DebuffId; sec: number; value?: number }
  | { k: 'buff'; id: BuffId; sec: number; value?: number }
  | { k: 'selfDr'; value: number; sec: number }
  | { k: 'undying' }
  | { k: 'bodyguard'; who: 'lowest' | 'strongest'; sec: number }
  | { k: 'heal'; pct: number; target: 'all' | 'lowest' }
  | { k: 'hot'; pctPerSec: number; sec: number }
  | { k: 'cleanse'; n: number }
  | { k: 'gauge'; n: number }
  | { k: 'threat'; n: number }
  | { k: 'selfCost'; pct: number }
  | { k: 'hits'; n: number; each: number }
  | { k: 'allyCd'; sec: number; scope: 'all' | 'cavalry' }
  | { k: 'strip'; n: number }
  | { k: 'delayPattern'; sec: number }
  | { k: 'autoBreak' }
  | { k: 'freeTactic' }
  | { k: 'aoe' }
  | { k: 'ignoreDr' }
  | { k: 'cond'; when: SkillCond; mult: number }
  | { k: 'condThreat'; n: number }
  | { k: 'afterDebuff'; sec: number; value: number }
  | { k: 'power'; mult: number }
  | { k: 'selfAtk'; value: number; sec: number }
  /** 조작 성공 시 70%(적 AI 50%) 확률로 효과마다 따로 발동: 사기 감소 · 지력 차 병력 피해 · 스킬 봉인 · 공격 · 방어 감소 · 표적 낙인 · 상대 다음 스킬 무효 · 아군 공격 강화 · 아군 쿨다운 단축 */
  | { k: 'gamble'; needCommand: boolean; parts: Array<'morale' | 'intDamage' | 'seal' | 'weaken' | 'mark' | 'nullify' | 'atkUp' | 'cdCut'>; sealSec?: number; weaken?: number; weakenSec?: number; markSec?: number; nullifySec?: number; atkUp?: number; atkSec?: number; cdCut?: number }
  /** 제갈량 팔진도: sec초 동안 상대가 스킬을 쓰면 70%(적 AI 50%) 확률로 막고 봉인 · 지력 차 피해 · 사기 감소 */
  | { k: 'stance'; sec: number; sealSec: number }

export interface SkillPart { name: string; desc: string; fx: SkillFx[] }

/** 패시브는 id로 구분하고 battle-core.ts의 훅이 처리한다. */
export interface PassiveDef { id: string; name: string; desc: string; partner?: string; value?: number }

export interface GeneralSkillDef {
  faction: FactionTag
  type: SkillType
  /** 무장 배율(재배치표의 ×값). 없으면 1.0 */
  mult: number
  active: SkillPart
  passive?: PassiveDef
  awaken?: SkillPart
  weakness?: { id: string; desc: string }
}

const a = (name: string, desc: string, ...fx: SkillFx[]): SkillPart => ({ name, desc, fx })
const p = (id: string, name: string, desc: string, extra: Partial<PassiveDef> = {}): PassiveDef => ({ id, name, desc, ...extra })

export const GENERAL_SKILLS: Record<string, GeneralSkillDef> = {
  // ── 촉 ──
  'liu-bei': { faction: '촉', type: '치유', mult: 0.8, active: a('인덕의 결집', '아군 병력 7% 회복, 상태이상 2개 해제', { k: 'heal', pct: 7, target: 'all' }, { k: 'cleanse', n: 2 }), passive: p('cdForStrategists', '삼고초려', '편성한 책사의 쿨다운 −10%', { value: 0.1 }), awaken: a('도원의 맹세', '회복 +5%, 아군 공격 +8% 6초', { k: 'heal', pct: 5, target: 'all' }, { k: 'buff', id: 'atk-up', sec: 6, value: 0.08 }), weakness: { id: 'noMorale', desc: '자기 사기 피해 없음' } },
  'guan-yu': { faction: '촉', type: '돌격', mult: 2.8, active: a('오관참장', '사기 피해 ×2.8 + 갑주 균열 9초 + 적 피해 감소 무시', { k: 'debuff', id: 'armor-break', sec: 9 }, { k: 'ignoreDr' }), passive: p('atkHighTroops', '미염공의 위엄', '병력 70% 이상일 때 공격 +20%', { value: 0.2 }), awaken: a('수엄칠군', '수공 7.5초 추가', { k: 'debuff', id: 'flood', sec: 7.5 }) },
  'zhao-yun': { faction: '촉', type: '통솔', mult: 0.6, active: a('상산의 기개', '아군 공격 +5% · 받는 피해 −5% 6초 + 병력이 가장 낮은 아군 호위 2초', { k: 'buff', id: 'atk-up', sec: 6, value: 0.05 }, { k: 'buff', id: 'dr-up', sec: 6, value: 0.05 }, { k: 'bodyguard', who: 'lowest', sec: 2 }), passive: p('cdIfAllyLow', '일신시담', '병력 30% 이하 아군이 있으면 쿨다운 −2초', { value: 2 }), awaken: a('칠진칠출', '아군 공격 +6% 6초 + 아군 기병 쿨다운 −1.5초', { k: 'buff', id: 'atk-up', sec: 6, value: 0.06 }, { k: 'allyCd', sec: 1.5, scope: 'cavalry' }) },
  'zhuge-liang': { faction: '촉', type: '계략', mult: 0.8, active: a('팔진도', '8초 동안 상대가 스킬을 쓸 때마다 70%(적 AI는 50%) 확률로 그 스킬을 막고 봉인 2초 · 지력 차 피해 · 상대 사기 감소(쿨다운은 태세가 끝난 뒤부터)', { k: 'stance', sec: 8, sealSec: 2 }), passive: p('threatSave', '공성계', '아군 사기 20 이하이면 아군 사기 +20 (전투당 1회)', { value: 20 }), awaken: a('칠성 동남풍', '아군 화계 지속 +3초, 화계 피해 ×1.5', { k: 'buff', id: 'east-wind', sec: 11 }), weakness: { id: 'frail10', desc: '최대 병력 −10%' } },
  // 전열 수호형: 장판교에서 홀로 대군을 막아선 장비 — 가운데에 서서 적을 끌어당기고, 맞을수록 스킬이 빨리 돈다
  'zhang-fei': { faction: '촉', type: '수호', mult: 0.55, active: a('장판교 일갈', '자신 받는 피해 −17% 4초 + 아군 받는 피해 −4% 5초 + 반격 10% 5초 + 적 공포 5초 + 적 전술 예고 1회 지연', { k: 'selfDr', value: 0.17, sec: 5 }, { k: 'buff', id: 'dr-up', sec: 5, value: 0.04 }, { k: 'buff', id: 'counter', sec: 5, value: 0.1 }, { k: 'debuff', id: 'fear', sec: 4 }, { k: 'delayPattern', sec: 2 }), passive: p('cdOnHit', '만인지적', '공격받을 때마다 쿨다운 −0.25초') },
  'huang-zhong': { faction: '촉', type: '사격', mult: 2.25, active: a('정군산 일격', '병력이 가장 낮은 적 사격, 대상 병력 30% 이하면 피해 ×3.25', { k: 'cond', when: 'targetLow', mult: 3.25 }), passive: p('atkRamp', '노당익장', '7초마다 공격 +2% (최대 +10%)', { value: 0.1 }) },
  'ma-chao': { faction: '촉', type: '돌격', mult: 1.2, active: a('철기 쇄도', '사기 피해 + 출혈 7초', { k: 'debuff', id: 'bleed', sec: 7 }), passive: p('flankCharge', '금마초', '좌·우 기동 성공 시 다음 스킬 피해 +20%', { value: 0.2 }) },
  'pang-tong': { faction: '촉', type: '계략', mult: 2.55, active: a('연환계', '연환 11.5초 (화계·광역 피해 ×1.5) + 화계 2초 + 적 전체 사기 피해', { k: 'debuff', id: 'chain', sec: 11.5 }, { k: 'debuff', id: 'burning', sec: 2 }, { k: 'aoe' }), passive: p('cdPerCombo', '봉추', '연계 1당 쿨다운 −0.3초', { value: 0.3 }) },
  'fa-zheng': { faction: '촉', type: '수호', mult: 0.45, active: a('한중 반격', '아군 전체 반격 4초', { k: 'buff', id: 'counter', sec: 4, value: 0.11 }), passive: p('cdOnHit', '일찬일벌', '공격받을 때마다 쿨다운 −0.25초', { value: 0.25 }) },
  'xu-shu': { faction: '촉', type: '통솔', mult: 1.65, active: a('단기묘책', '7.5초 동안 전술 명령 비용 −50% + 질풍보법', { k: 'buff', id: 'tactic-discount', sec: 6, value: 0.5 }, { k: 'buff', id: 'swift-step', sec: 7.5 }), passive: p('partnerPower', '주마천거', '제갈량과 편성 시 위력 +10%', { partner: 'zhuge-liang', value: 0.1 }) },
  'wei-yan': { faction: '촉', type: '돌격', mult: 1, active: a('자오곡 기습', '사기 피해, 그 전투 첫 스킬이면 ×1.4', { k: 'cond', when: 'firstSkill', mult: 1.4 }), passive: p('flankMorale', '진군', '기동 명령 성공 시 사기 피해 +4', { value: 4 }) },
  'meng-huo': { faction: '촉', type: '수호', mult: 0.55, active: a('칠종칠금', '불굴(전투당 1회) + 받는 피해 −11% 6초', { k: 'undying' }, { k: 'selfDr', value: 0.11, sec: 6 }), passive: p('undyingMorale', '남만왕', '불굴이 발동하면 적 사기 −8', { value: 8 }) },
  'zhu-rong': { faction: '촉', type: '사격', mult: 0.65, active: a('화신 비도', '불붙은 비도 3연타(각 ×0.13) + 화계 3.5초', { k: 'hits', n: 3, each: 0.13 }, { k: 'debuff', id: 'burning', sec: 3.5 }), passive: p('vsBurning', '화신의 후예', '화계에 걸린 적에게 위력 +10%', { value: 0.1 }) },
  'wang-ping': { faction: '촉', type: '사격', mult: 1.65, active: a('가정 고지', '사격, 적이 중앙 돌파 예고 중이면 ×1.65', { k: 'cond', when: 'centerPattern', mult: 1.65 }), passive: p('crossfireGuard', '고지 수비', '십자 포화 예고의 아군 사기 하락 −30%', { value: 0.3 }) },
  'guan-ping': { faction: '촉', type: '돌격', mult: 1.65, active: a('청룡 계승', '사기 피해, 직전 스킬이 관우면 ×1.5', { k: 'cond', when: 'afterGuanYu', mult: 1.5 }) },
  'guan-xing': { faction: '촉', type: '돌격', mult: 1.85, active: a('춘추 계승', '사기 피해, 쓰러뜨린 적 부대 1개당 +27%', { k: 'cond', when: 'perFallenEnemy', mult: 0.27 }) },
  'zhang-bao': { faction: '촉', type: '돌격', mult: 2.25, active: a('장팔사모', '사기 피해 + 공포 4.5초', { k: 'debuff', id: 'fear', sec: 4.5 }) },
  'ma-dai': { faction: '촉', type: '돌격', mult: 1.65, active: a('서량 추격', '사기 피해, 적 사기 30 이하면 ×1.8', { k: 'cond', when: 'enemyMoraleLow', mult: 1.8 }) },

  // ── 위 ──
  'cao-cao': { faction: '위', type: '수호', mult: 0.75, active: a('위무의 방진', '아군 받는 피해 −9% + 아군 공격 +9% 6초 + 아군 사기 +8', { k: 'buff', id: 'dr-up', sec: 6, value: 0.09 }, { k: 'buff', id: 'atk-up', sec: 6, value: 0.09 }, { k: 'threat', n: -8 }), passive: p('factionPower', '치세의 능신', '편성한 위 무장 1명당 위력 +5%', { value: 0.05 }), awaken: a('천하 쟁패', '아군 받는 피해 −9% · 공격 +9% 9초 + 적 공포 3.5초', { k: 'buff', id: 'dr-up', sec: 9, value: 0.09 }, { k: 'buff', id: 'atk-up', sec: 9, value: 0.09 }, { k: 'debuff', id: 'fear', sec: 3.5 }), weakness: { id: 'weakToFire', desc: '화계에 받는 피해 +20% (적벽)' } },
  simayi: { faction: '위', type: '계략', mult: 0.65, active: a('견벽청야', '조작 성공 시 70%(적 AI는 50%) 확률로 따로 발동: 적 사기 감소 · 지력 차 병력 피해 · 적 스킬 봉인 6초', { k: 'gamble', needCommand: true, parts: ['morale', 'intDamage', 'seal'], sealSec: 6 }), passive: p('lowTroopDr', '낭고', '아군 병력 50% 이하일 때 받는 피해 −15%', { value: 0.15 }), awaken: a('고평릉의 일격', '침묵 걸린 적에게 사기 피해 ×2', { k: 'afterDebuff', sec: 0, value: 2 }) },
  'zhang-liao': { faction: '위', type: '돌격', mult: 4, active: a('합비 질풍', '사기 피해 + 둔화 12초', { k: 'debuff', id: 'slow', sec: 12 }), passive: p('earlyAtk', '요래', '전투 시작 10초 동안 공격 +20%', { value: 0.2 }), awaken: a('팔백 돌격대', '3회 연속 타격(각 ×2.02) + 둔화', { k: 'hits', n: 3, each: 2.02 }) },
  'guo-jia': { faction: '위', type: '계략', mult: 2.55, active: a('십승십패', '표적 낙인 12초 + 갑주 균열 7.5초 + 적 공격 · 방어 −10% 6초 + 다음 아군 스킬 피해 ×2', { k: 'debuff', id: 'mark', sec: 12 }, { k: 'debuff', id: 'armor-break', sec: 7.5 }, { k: 'debuff', id: 'weaken', sec: 6, value: 0.1 }, { k: 'buff', id: 'insight', sec: 12 }), passive: p('earlyWarning', '귀재', '적 전술 예고를 더 일찍 보여 줌 (대응 시간 +0.5초)', { value: 0.5 }) },
  'jia-xu': { faction: '위', type: '계략', mult: 1.4, active: a('독계', '조작 성공 시 70%(적 AI는 50%) 확률로 따로 발동: 적 공격 · 방어 −30% 8초 · 적 사기 감소', { k: 'gamble', needCommand: true, parts: ['weaken', 'morale'], weaken: 0.3, weakenSec: 8 }), passive: p('cdOnBreak', '난무', '적 전술 대응 성공 시 쿨다운 −1초', { value: 1 }) },
  'xu-chu': { faction: '위', type: '돌격', mult: 1.2, active: a('호치 난무', '사기 피해 ×1.2 + 자신 받는 피해 −15% 4초', { k: 'selfDr', value: 0.15, sec: 4 }), passive: p('atkHighTroops', '호치', '병력 70% 이상일 때 공격 +10%', { value: 0.1 }) },
  'dian-wei': { faction: '위', type: '수호', mult: 0.9, active: a('쌍극 수호', '호위 3.5초(전투력 가장 높은 아군), 자신 피해 −18%', { k: 'bodyguard', who: 'strongest', sec: 3.5 }, { k: 'selfDr', value: 0.18, sec: 4 }), passive: p('deathRally', '완성의 최후', '병력 0이 되면 아군 전체 공격 +20% 5초', { value: 0.2 }) },
  'cao-ren': { faction: '위', type: '수호', mult: 0.4, active: a('번성 철벽', '아군 받는 피해 −8% 3.5초 + 철벽진', { k: 'buff', id: 'dr-up', sec: 6, value: 0.08 }, { k: 'buff', id: 'iron-wall', sec: 3.5 }), passive: p('defenseBattle', '거점 수비', '도시 방어전에서 위력 +20%', { value: 0.2 }) },
  'xun-yu': { faction: '위', type: '통솔', mult: 0.9, active: a('왕좌의 보좌', '전술 게이지 +32 + 옥패 지휘 + 아군 받는 피해 −9% 6초', { k: 'gauge', n: 32 }, { k: 'buff', id: 'jade-command', sec: 5.5 }, { k: 'buff', id: 'dr-up', sec: 6, value: 0.09 }), passive: p('partnerCd', '왕좌지재', '조조와 편성 시 조조 쿨다운 −2초', { partner: 'cao-cao', value: 2 }) },
  'pang-de': { faction: '위', type: '수호', mult: 0.45, active: a('여츤결사', '반격 15% 6초 + 자신 공격 +8%', { k: 'buff', id: 'counter', sec: 6, value: 0.15 }, { k: 'selfAtk', value: 0.08, sec: 6 }), passive: p('vsCavalry', '백마장군', '기병 상대 피해 +10%', { value: 0.1 }) },
  'xu-huang': { faction: '위', type: '돌격', mult: 1.1, active: a('번성 해위', '사기 피해 + 진형 붕괴 6.5초', { k: 'debuff', id: 'fracture', sec: 6.5 }), passive: p('atkRamp', '주아부의 풍모', '7초마다 공격 +2% (최대 +10%)', { value: 0.1 }) },
  'zhang-he': { faction: '위', type: '돌격', mult: 1.4, active: a('유연한 기동', '사기 피해, 직전 명령이 실패였으면 아군 사기 +20', { k: 'condThreat', n: -20 }), passive: p('cdOnBreak', '교변', '적 전술 대응 성공 시 쿨다운 −1초', { value: 1 }) },
  // 2026.10.22: 자기 병력 5% 소모를 없앴다(스킬 피해는 이미 상한에 닿아 있어, 소모 때문에 오래 버티지 못하던 것이 약점이었다)
  'xiahou-dun': { faction: '위', type: '돌격', mult: 2.85, active: a('발시담목', '사기 피해 ×2.85'), passive: p('lowTroopAtk', '맹진', '병력 50% 이하면 공격 +20%', { value: 0.2 }), awaken: a('독안의 맹장', '사기 피해 ×1.45 + 아군 받는 피해 −23% 6초', { k: 'power', mult: 1.45 }, { k: 'buff', id: 'dr-up', sec: 6, value: 0.23 }) },
  'cao-hong': { faction: '위', type: '치유', mult: 1.8, active: a('급행 원군', '병력이 가장 낮은 아군 26% 회복', { k: 'heal', pct: 26, target: 'lowest' }) },
  'xun-you': { faction: '위', type: '통솔', mult: 3.1, active: a('기묘한 계책', '조작 성공 시 70%(적 AI는 50%) 확률로 따로 발동: 아군 공격 +20% 6초 · 아군 스킬 쿨다운 −3초 · 적 사기 감소', { k: 'gamble', needCommand: true, parts: ['atkUp', 'cdCut', 'morale'], atkUp: 0.2, atkSec: 6, cdCut: 3 }), passive: p('gaugeOnBreak', '기책 열두 가지', '전술 성공 시 게이지 +3', { value: 3 }) },
  'cheng-yu': { faction: '위', type: '수호', mult: 0.4, active: a('태산 책략', '아군 받는 피해 −6% + 아군 사기 +6', { k: 'buff', id: 'dr-up', sec: 6, value: 0.06 }, { k: 'threat', n: -6 }), passive: p('shortDebuff', '강직', '아군 상태이상 지속 −1초', { value: 1 }) },
  'yue-jin': { faction: '위', type: '돌격', mult: 1.9, active: a('선등 돌파', '사기 피해, 전투 시작 7초 안이면 ×1.75', { k: 'cond', when: 'early', mult: 1.75 }), passive: p('firstStrike', '선등', '첫 자동 공격 피해 +20%', { value: 0.2 }) },
  'li-dian': { faction: '위', type: '통솔', mult: 0.95, active: a('학문 진형', '아군 공격·방어 +6% 6초', { k: 'buff', id: 'atk-up', sec: 6, value: 0.06 }, { k: 'buff', id: 'dr-up', sec: 6, value: 0.06 }) },
  'yu-jin': { faction: '위', type: '수호', mult: 0.4, active: a('군율 철벽', '받는 피해 −8%, 아군 병력이 낮을수록 최대 −30%', { k: 'buff', id: 'dr-up', sec: 6, value: 0.08 }), passive: p('highTroopDr', '엄정', '병력 70% 이상일 때 받는 피해 −10%', { value: 0.1 }), weakness: { id: 'weakToFlood', desc: '수공에 받는 피해 +30% (번성 항복)' } },
  'wen-ping': { faction: '위', type: '수호', mult: 0.3, active: a('강하 수비', '아군 사기 +6 + 봉화 수호', { k: 'threat', n: -6 }, { k: 'buff', id: 'phoenix-guard', sec: 4.5 }) },
  'cai-wenji': { faction: '위', type: '치유', mult: 1.05, active: a('호가십팔박', '아군 병력 10% 회복 + 상태이상 2개 해제 + 6초간 초당 1% 회복', { k: 'heal', pct: 10, target: 'all' }, { k: 'cleanse', n: 2 }, { k: 'hot', pctPerSec: 1, sec: 6 }), passive: p('failThreatCut', '비분시', '아군 실패 명령의 아군 사기 하락 −25%', { value: 0.25 }) },

  // ── 오 ──
  'sun-ce': { faction: '오', type: '돌격', mult: 1.75, active: a('소패왕 돌격', '사기 피해 ×1.75 + 공포 5초', { k: 'debuff', id: 'fear', sec: 5 }), passive: p('resetOnKill', '강동 평정', '적 부대가 쓰러질 때마다 남은 쿨다운 절반', { value: 0.5 }), awaken: a('소패왕의 위세', '사기 피해 ×1.3 + 아군 공격 +16%', { k: 'power', mult: 1.3 }, { k: 'buff', id: 'atk-up', sec: 6, value: 0.16 }), weakness: { id: 'fragile10', desc: '받는 피해 +10% (요절)' } },
  'lu-xun': { faction: '오', type: '계략', mult: 1, active: a('이릉 화진', '적 전체 대화계 6초 (화계와 따로 겹쳐 들어가고 상태이상 해제로 지워지지 않음)', { k: 'debuff', id: 'great-fire', sec: 6 }, { k: 'aoe' }), passive: p('finalAct', '서생의 인내', '전투 40초 이후 위력 +25%', { value: 0.25 }), awaken: a('연영 칠백리', '대화계 지속 +3초 + 연환 부여', { k: 'debuff', id: 'great-fire', sec: 9 }, { k: 'debuff', id: 'chain', sec: 6 }) },
  'sun-quan': { faction: '오', type: '수호', mult: 1.05, active: a('강동 수성', '아군 받는 피해 −13% 6초', { k: 'buff', id: 'dr-up', sec: 6, value: 0.13 }), passive: p('factionDr', '수성지주', '편성한 오 무장 1명당 받는 피해 −4%', { value: 0.04 }), awaken: a('강동 대제', '아군 받는 피해 −16% 6초 + 전술 게이지 +10', { k: 'buff', id: 'dr-up', sec: 6, value: 0.16 }, { k: 'gauge', n: 10 }) },
  'sun-jian': { faction: '오', type: '돌격', mult: 1.35, active: a('강동 선봉', '사기 피해 + 공포 3.5초', { k: 'debuff', id: 'fear', sec: 3.5 }), passive: p('vsHighMorale', '강동의 호랑이', '적 사기 70 이상일 때 피해 +15%', { value: 0.15 }) },
  'zhou-yu': { faction: '오', type: '계략', mult: 0.7, active: a('적벽 화공', '사기 피해 ×0.7 + 적 전체 화계 6.5초', { k: 'debuff', id: 'burning', sec: 6.5 }, { k: 'aoe' }), passive: p('vsBurning', '곡유오 주랑고', '화계 피해 +50%', { value: 0.5 }), awaken: a('적벽 대화', '화계 7초 + 적 공포 2초', { k: 'debuff', id: 'burning', sec: 7 }, { k: 'debuff', id: 'fear', sec: 2 }) },
  'huang-gai': { faction: '오', type: '수호', mult: 0.35, active: a('고육지계', '자기 병력 5% 소모 + 자신 받는 피해 −14% 3.5초 + 반격 4% 5초 + 화계 6초', { k: 'selfCost', pct: 5 }, { k: 'selfDr', value: 0.14, sec: 6 }, { k: 'buff', id: 'counter', sec: 5, value: 0.04 }, { k: 'debuff', id: 'burning', sec: 3.5 }), passive: p('redCliffsVanguard', '거짓 항복', '함께 출전한 주유·육손의 스킬 쿨다운 −2초 · 적이 화계에 걸려 있으면 자신 받는 피해 −15%', { value: 2 }) },
  'gan-ning': { faction: '오', type: '돌격', mult: 1, active: a('백기 야습', '사기 피해 + 시야 차단 4.5초', { k: 'debuff', id: 'blind', sec: 4.5 }), passive: p('fastOpener', '금범적', '첫 스킬 쿨다운 −3초', { value: 3 }) },
  'lu-su': { faction: '오', type: '치유', mult: 1.3, active: a('강동 동맹', '아군 병력 13% 회복 + 상태이상 전부 해제 + 전술 게이지 +19', { k: 'heal', pct: 13, target: 'all' }, { k: 'cleanse', n: 99 }, { k: 'gauge', n: 19 }), passive: p('alliance', '손유동맹', '다른 세력 무장 1명당 위력 +5%', { value: 0.05 }) },
  'lu-meng': { faction: '오', type: '돌격', mult: 2.25, active: a('백의 도하', '적 버프 1개 제거, 제거했으면 사기 피해 ×1.7', { k: 'strip', n: 1 }, { k: 'cond', when: 'stripped', mult: 1.7 }), passive: p('veteran', '괄목상대', 'Lv30 이상이면 위력 +10%', { value: 0.1 }) },
  'ling-tong': { faction: '오', type: '돌격', mult: 0.75, active: a('필사의 연격', '3회 타격(각 ×0.37) + 출혈 4.5초', { k: 'hits', n: 3, each: 0.37 }, { k: 'debuff', id: 'bleed', sec: 4.5 }), passive: p('cdOnHit', '불굴의 맹장', '공격받을 때마다 쿨다운 −0.25초', { value: 0.25 }) },
  'taishi-ci': { faction: '오', type: '사격', mult: 1, active: a('신정 쌍궁', '2연사(각 ×0.6) + 시야 차단 5초 + 표식 4초', { k: 'hits', n: 2, each: 0.6 }, { k: 'debuff', id: 'blind', sec: 5 }, { k: 'debuff', id: 'mark', sec: 4 }), passive: p('partnerPower', '신정의 맹약', '손책과 편성 시 위력 +12%', { partner: 'sun-ce', value: 0.12 }) },
  'da-qiao': { faction: '오', type: '치유', mult: 1.1, active: a('옥련의 가호', '아군 쿨다운 −3초 + 병력 8% 회복 + 상태이상 1개 해제', { k: 'allyCd', sec: 3, scope: 'all' }, { k: 'heal', pct: 8, target: 'all' }, { k: 'cleanse', n: 1 }), passive: p('healBoost', '강동의 옥련', '아군 회복량 +10%', { value: 0.1 }) },
  'sun-shangxiang': { faction: '오', type: '사격', mult: 1.2, active: a('궁요희 연사', '3회 연속 사격(각 ×0.53) + 표식 5초', { k: 'hits', n: 3, each: 0.53 }, { k: 'debuff', id: 'mark', sec: 5 }), passive: p('partnerPower', '궁요희', '유비와 편성 시 위력 +10%', { partner: 'liu-bei', value: 0.1 }) },
  'xiao-qiao': { faction: '오', type: '계략', mult: 0.7, active: a('화선 난무', '혼란 2.5초 + 둔화 5.5초 + 대화계 5초 (화계와 따로 겹쳐 들어가고 상태이상 해제로 지워지지 않음)', { k: 'debuff', id: 'confusion', sec: 2.5 }, { k: 'debuff', id: 'slow', sec: 5.5 }, { k: 'debuff', id: 'great-fire', sec: 5 }), passive: p('partnerPower', '강동의 자매', '대교와 편성 시 위력 +15%', { partner: 'da-qiao', value: 0.15 }), awaken: a('화선 천무', '아군 공격 +10% 6초', { k: 'buff', id: 'atk-up', sec: 6, value: 0.1 }) },
  'guan-yinping': { faction: '촉', type: '돌격', mult: 2.3, active: a('호녀 돌격', '사기 피해 ×2.3 + 갑주 균열 7.5초 + 출혈 6.5초 + 적 피해 감소 무시, 직전 스킬이 관우면 ×1.65', { k: 'cond', when: 'afterGuanYu', mult: 1.65 }, { k: 'ignoreDr' }, { k: 'debuff', id: 'armor-break', sec: 7.5 }, { k: 'debuff', id: 'bleed', sec: 6.5 }), passive: p('lowTroopAtk', '호녀의 기개', '병력 50% 이하면 공격 +20%', { value: 0.2 }) },

  // ── 군웅 ──
  'lu-bu': { faction: '군웅', type: '돌격', mult: 1.1, active: a('무쌍 돌격', '사기 피해 + 공포 5초', { k: 'debuff', id: 'fear', sec: 5 }), passive: p('peerless', '인중여포', '속도 +10%, 적 사기 70 이상이면 피해 +20%', { value: 0.2 }), awaken: a('원문사극', '무쌍 돌격이 적 전체에 피해', { k: 'aoe' }), weakness: { id: 'distrust', desc: '책사 버프 효과 −30% (초선·진궁 편성 시 해제)' } },
  'dong-zhuo': { faction: '군웅', type: '수호', mult: 0.6, active: a('폭정의 방벽', '적 공포 2.5초 + 자신 받는 피해 −12% 5초 + 아군 받는 피해 −6% 5초 + 반격 9% 5초', { k: 'debuff', id: 'fear', sec: 2.5 }, { k: 'selfDr', value: 0.12, sec: 5 }, { k: 'buff', id: 'dr-up', sec: 5, value: 0.06 }, { k: 'buff', id: 'counter', sec: 5, value: 0.09 }), passive: p('highTroopDr', '서량 철기', '병력 70% 이상일 때 받는 피해 −10%', { value: 0.1 }), awaken: a('상국의 위세', '적 공포 3.5초 + 아군 받는 피해 −6% 6초', { k: 'debuff', id: 'fear', sec: 3.5 }, { k: 'buff', id: 'dr-up', sec: 6, value: 0.06 }) },
  'diao-chan': { faction: '군웅', type: '계략', mult: 1.1, active: a('연환 미혹', '혼란 6초 + 연환 6초', { k: 'debuff', id: 'confusion', sec: 6 }, { k: 'debuff', id: 'chain', sec: 6 }), passive: p('calmLuBu', '폐월', '여포와 편성 시 여포 약점 해제', { partner: 'lu-bu' }) },
  'yuan-shao': { faction: '군웅', type: '통솔', mult: 0.6, active: a('사세삼공', '아군 전체 공격 +16% 8초 + 전술 게이지 +6', { k: 'buff', id: 'atk-up', sec: 8, value: 0.16 }, { k: 'gauge', n: 6 }), passive: p('warlordHost', '하북의 대군', '편성 3명이 모두 군웅이면 위력 +15%', { value: 0.15 }), awaken: a('하북 대군', '아군 공격 +9% 6초 + 전술 게이지 +9', { k: 'buff', id: 'atk-up', sec: 6, value: 0.09 }, { k: 'gauge', n: 9 }) },
  'gongsun-zan': { faction: '군웅', type: '돌격', mult: 0.85, active: a('백마의종', '사기 피해 + 아군 기병 공격 +11% 6초 + 아군 기병 쿨다운 −1.5초', { k: 'buff', id: 'cavalry-surge', sec: 6, value: 0.11 }, { k: 'allyCd', sec: 1.5, scope: 'cavalry' }), passive: p('cavalryPair', '백마 기병대', '기병 2명 이상 편성 시 쿨다운 −1.5초', { value: 1.5 }) },
  'chen-gong': { faction: '군웅', type: '계략', mult: 2, active: a('계중계', '조작 성공 시 70%(적 AI는 50%) 확률로 따로 발동: 10초 안에 상대가 쓰는 다음 스킬 무효 · 표적 낙인 7초 · 적 사기 감소 · 지력 차 병력 피해 · 적 스킬 봉인 2초', { k: 'gamble', needCommand: true, parts: ['nullify', 'mark', 'morale', 'intDamage', 'seal'], nullifySec: 10, markSec: 7, sealSec: 2 }), passive: p('calmLuBu', '여포의 모사', '여포와 편성 시 여포 약점 해제', { partner: 'lu-bu' }) },
  'ma-teng': { faction: '군웅', type: '돌격', mult: 1.05, active: a('서량 철기 대열', '사기 피해 + 아군 기병 속도 +10% 6초', { k: 'buff', id: 'cavalry-surge', sec: 6, value: 0.1 }), passive: p('partnerCd', '부자 연계', '마초와 편성 시 마초 쿨다운 −1초', { partner: 'ma-chao', value: 1 }) },
  'wen-chou': { faction: '군웅', type: '돌격', mult: 2.1, active: a('하북 맹돌', '사기 피해 ×2.1'), passive: p('partnerAtk', '하북 쌍장', '안량과 편성 시 공격 +10%', { partner: 'yan-liang', value: 0.1 }) },
  'yan-liang': { faction: '군웅', type: '돌격', mult: 3.3, active: a('선봉 참격', '사기 피해 + 공포 5초', { k: 'debuff', id: 'fear', sec: 5 }), passive: p('partnerAtk', '하북 쌍장', '문추와 편성 시 공격 +10%', { partner: 'wen-chou', value: 0.1 }) },
  'yuan-shu': { faction: '군웅', type: '통솔', mult: 0.8, active: a('중원 야심', '아군 공격 +16% 5초, 끝난 뒤 3초 −8%', { k: 'buff', id: 'atk-up', sec: 5, value: 0.16 }, { k: 'buff', id: 'hangover', sec: 8, value: 0.08 }), passive: p('earlyAtk', '사세의 명문', '전투 시작 10초 동안 공격 +15%', { value: 0.15 }) },
  'zhang-lu': { faction: '군웅', type: '치유', mult: 1.95, active: a('오두미도', '6초 동안 매초 아군 병력 3% 회복', { k: 'hot', pctPerSec: 3, sec: 6 }), passive: p('healBoost', '오두미도', '회복량 +10%', { value: 0.1 }) },
  'han-sui': { faction: '군웅', type: '수호', mult: 0.55, active: a('서량 연합', '아군 받는 피해 −8% 6초', { k: 'buff', id: 'dr-up', sec: 6, value: 0.08 }), passive: p('lowTroopDr', '구곡황하', '아군 병력 50% 이하일 때 받는 피해 −15%', { value: 0.15 }) },
  'gao-shun': { faction: '군웅', type: '돌격', mult: 1.15, active: a('함진영 돌파', '사기 피해, 적의 피해 감소 무시 + 갑주 균열 4.5초', { k: 'ignoreDr' }, { k: 'debuff', id: 'armor-break', sec: 4.5 }), passive: p('highTroopDr', '불퇴의 함진영', '병력 70% 이상일 때 받는 피해 −12%', { value: 0.12 }), awaken: a('함진영 불파', '사기 피해 ×1.3 + 아군 받는 피해 −15% 5초', { k: 'power', mult: 1.3 }, { k: 'buff', id: 'dr-up', sec: 5, value: 0.15 }) },
  'song-xian': { faction: '군웅', type: '통솔', mult: 1.55, active: a('적토 헌상', '아군 기병 1명 쿨다운 −3.5초', { k: 'allyCd', sec: 3.5, scope: 'cavalry' }) },

  // ── 황건적 ──
  'zhang-jiao': { faction: '군웅', type: '계략', mult: 1.05, active: a('태평요술', '혼란 2.5초 + 공포 3.5초 + 전술 게이지 +13', { k: 'debuff', id: 'confusion', sec: 2.5 }, { k: 'debuff', id: 'fear', sec: 3.5 }, { k: 'gauge', n: 13 }), passive: p('yellowSky', '창천이사', '편성한 황건 무장 1명당 위력 +8%', { value: 0.08 }), awaken: a('황천당립', '아군 공격 +13% 6초 + 아군 사기 +11', { k: 'buff', id: 'atk-up', sec: 6, value: 0.13 }, { k: 'threat', n: -11 }), weakness: { id: 'frail10', desc: '최대 병력 −10% (병사)' } },
  'zhang-bo': { faction: '군웅', type: '계략', mult: 1.3, active: a('부적 계략', '혼란 3초 + 표적 낙인 7초', { k: 'debuff', id: 'confusion', sec: 3 }, { k: 'debuff', id: 'mark', sec: 7 }) },
  'zhang-liang': { faction: '군웅', type: '수호', mult: 0.5, active: a('황건 선봉', '아군 받는 피해 −10% 6초 + 아군 사기 +4', { k: 'buff', id: 'dr-up', sec: 6, value: 0.1 }, { k: 'threat', n: -4 }) },
  'guan-hai': { faction: '군웅', type: '돌격', mult: 1.7, active: a('백파 격돌', '사기 피해 + 갑주 균열 5.5초', { k: 'debuff', id: 'armor-break', sec: 5.5 }) },
  'zhou-cang': { faction: '군웅', type: '돌격', mult: 2, active: a('황건 추격', '사기 피해 + 출혈 7초', { k: 'debuff', id: 'bleed', sec: 7 }) },
  // ── 2026.10.21 이벤트 한정 천명(정식 모집 제외 · 도감에만): 좌자 · 우길 · 화타 · 남화노선 · 사마휘 ──
  'zuo-ci': { faction: '군웅', type: '계략', mult: 0.38, active: a('둔갑 환술', '혼란 3초 + 실명 4초 + 침묵 2초', { k: 'debuff', id: 'confusion', sec: 3 }, { k: 'debuff', id: 'blind', sec: 4 }, { k: 'debuff', id: 'silence', sec: 2 }), passive: p('earlyWarning', '오각 선생', '적 전술 예고를 더 일찍 보여 줌 (대응 시간 +0.5초)', { value: 0.5 }), awaken: a('척반희조', '적 공격 −10% 6초', { k: 'debuff', id: 'weaken', sec: 6, value: 0.1 }) },
  'yu-ji': { faction: '군웅', type: '치유', mult: 1.0, active: a('부수 치병', '아군 병력 11% 회복 + 상태이상 2개 해제 + 6초간 초당 1% 회복 + 적 공포 4초', { k: 'heal', pct: 11, target: 'all' }, { k: 'cleanse', n: 2 }, { k: 'hot', pctPerSec: 1, sec: 6 }, { k: 'debuff', id: 'fear', sec: 4 }), passive: p('failThreatCut', '강동의 선도', '아군 실패 명령의 아군 사기 하락 −25%', { value: 0.25 }), awaken: a('우길의 저주', '적 둔화 4초', { k: 'debuff', id: 'slow', sec: 4 }) },
  'hua-tuo': { faction: '군웅', type: '치유', mult: 1.0, active: a('괄골요독', '병력이 가장 낮은 아군 14% 회복 + 아군 상태이상 전부 해제 + 6초간 초당 1% 회복', { k: 'heal', pct: 14, target: 'lowest' }, { k: 'cleanse', n: 99 }, { k: 'hot', pctPerSec: 1, sec: 6 }), passive: p('healBoost', '청낭서', '아군 회복량 +15%', { value: 0.15 }), awaken: a('오금희', '아군 받는 피해 −8% 6초', { k: 'buff', id: 'dr-up', sec: 6, value: 0.08 }) },
  nanhua: { faction: '군웅', type: '통솔', mult: 0.6, active: a('천서 전수', '아군 스킬 쿨다운 −2초 + 전술 게이지 +15 + 아군 공격 +8% 6초', { k: 'allyCd', sec: 2, scope: 'all' }, { k: 'gauge', n: 15 }, { k: 'buff', id: 'atk-up', sec: 6, value: 0.08 }), passive: p('partnerPower', '태평요술서', '장각과 편성 시 위력 +15%', { partner: 'zhang-jiao', value: 0.15 }), awaken: a('남화의 가르침', '아군 사기 +8', { k: 'threat', n: -8 }) },
  'sima-hui': { faction: '군웅', type: '통솔', mult: 0.5, active: a('수경 천거', '아군 공격 +8% · 받는 피해 −5% 6초 + 전술 게이지 +8', { k: 'buff', id: 'atk-up', sec: 6, value: 0.08 }, { k: 'buff', id: 'dr-up', sec: 6, value: 0.05 }, { k: 'gauge', n: 8 }), passive: p('cdForStrategists', '호호 선생', '편성한 책사의 쿨다운 −10%', { value: 0.1 }), awaken: a('인물 감별', '아군 스킬 쿨다운 −1.5초', { k: 'allyCd', sec: 1.5, scope: 'all' }) },
}

/** 호위무사 인연(전위 · 허저와 함께)일 때 조조는 수호형 대신 돌격형으로 싸운다(2026.10.20) */
export const CAO_CAO_TIGER_GUARD: GeneralSkillDef = {
  ...GENERAL_SKILLS['cao-cao'],
  type: '돌격',
  mult: 1.5,
  active: a('패왕의 진격', '호위무사 인연 · 돌격형: 사기 피해 ×1.5 + 아군 공격 +12% 6초 + 아군 사기 +10', { k: 'buff', id: 'atk-up', sec: 6, value: 0.12 }, { k: 'threat', n: -10 }),
}
/** 인연에 따라 바뀌는 무장 스킬 */
export function bondSkillOverride(id: string, bondId: string | undefined): GeneralSkillDef | null {
  if (id === 'cao-cao' && bondId === 'tiger-guard') return CAO_CAO_TIGER_GUARD
  return null
}

/** 인연: 하나만 적용되며 여러 개가 성립하면 위에 있는 것이 우선. */
export interface BondDef {
  id: string; name: string; members: string[]; need: number; desc: string
  /** 일반 효과(새 인연은 이 값들로만 정한다): 아군 공격 · 받는 피해 감소 · 스킬 위력 · 특정 유형 스킬 위력 · 쿨다운 */
  atk?: number; dr?: number; skillMult?: number; typeMult?: { types: SkillType[]; value: number }; cd?: number; cdTypes?: { types: SkillType[]; sec: number }
  /** 이 무장이 출전해야만 켜진다(기존 덱의 인연을 빼앗지 않게 — 이벤트 무장 인연) */
  requires?: string
  /** 속공 인연(2026.10.22): 전투 시작 sec초 동안만 아군 공격 · 스킬 위력이 더 오른다 */
  early?: { sec: number; atk?: number; skillMult?: number }
}
/** 출전 무장(ids)으로 이 인연이 켜지는가 */
export function bondActive(bond: BondDef, ids: Iterable<string>): boolean {
  const set = ids instanceof Set ? ids as Set<string> : new Set(ids)
  return (!bond.requires || set.has(bond.requires)) && bond.members.filter(id => set.has(id)).length >= bond.need
}
export const BONDS: BondDef[] = [
  // ── 속공 인연(2026.10.22): 세 명이 모두 출전하면 켜지고, 그 조합에 원래 켜지던 인연 효과에 전투 시작 20초 동안 아군 공격 · 스킬 위력 보너스(2026.10.22 조정: 공격 +80% · 스킬 +100%, 버프 중 스킬 상한 50)를 더한다 ──
  { id: 'hefei-rush', name: '합비 질풍대', members: ['zhang-liao', 'yue-jin', 'li-dian'], need: 3, desc: '합비 수비 효과(아군 받는 피해 −8%, 공격 +4%)에 전투 시작 20초 동안 아군 공격 +80% · 스킬 위력 +100%', dr: 0.08, atk: 0.04, early: { sec: 20, atk: 0.8, skillMult: 1.0 } },
  { id: 'hebei-vanguard', name: '하북 선봉', members: ['yan-liang', 'wen-chou', 'zhang-he'], need: 3, desc: '하북의 패자 효과(아군 공격 +7%)에 전투 시작 20초 동안 아군 공격 +80% · 스킬 위력 +100%', atk: 0.07, early: { sec: 20, atk: 0.8, skillMult: 1.0 } },
  { id: 'ziwu-raid', name: '자오곡 기습', members: ['wei-yan', 'huang-zhong', 'ma-dai'], need: 3, desc: '아군 공격 +6% · 받는 피해 −15%에 전투 시작 20초 동안 아군 공격 +80% · 스킬 위력 +100%', atk: 0.06, dr: 0.15, early: { sec: 20, atk: 0.8, skillMult: 1.0 } },
  { id: 'baiqi-raid', name: '백기 야습', members: ['gan-ning', 'ling-tong', 'sun-ce'], need: 3, desc: '강동의 맹장 효과(돌격 · 사격 스킬 위력 +10%)에 전투 시작 20초 동안 아군 공격 +80% · 스킬 위력 +100%', typeMult: { types: ['돌격', '사격'], value: 0.1 }, early: { sec: 20, atk: 0.8, skillMult: 1.0 } },
  { id: 'xianzhen-rush', name: '함진영 돌격', members: ['lu-bu', 'gao-shun', 'chen-gong'], need: 3, desc: '여포군 효과(여포 약점 해제, 사기 피해 +8%)와 아군 받는 피해 −5%에 전투 시작 20초 동안 아군 공격 +80% · 스킬 위력 +100%', skillMult: 0.08, dr: 0.05, early: { sec: 20, atk: 0.8, skillMult: 1.0 } },
  { id: 'guan-ma', name: '관마 쌍웅', members: ['guan-yu', 'ma-chao', 'guan-yinping'], need: 3, desc: '전투 시작 20초 동안 아군 공격 +80% · 스킬 위력 +100%', early: { sec: 20, atk: 0.8, skillMult: 1.0 } },
  { id: 'peach-garden', name: '도원결의', members: ['liu-bei', 'guan-yu', 'zhang-fei'], need: 3, desc: '아군 공격 +12%, 받는 피해 −12%' },
  { id: 'five-tigers', name: '오호대장군', members: ['guan-yu', 'zhang-fei', 'zhao-yun', 'ma-chao', 'huang-zhong'], need: 3, desc: '돌격·사격 스킬 피해 +10%' },
  { id: 'lu-bu-army', name: '여포군', members: ['lu-bu', 'gao-shun', 'chen-gong', 'diao-chan', 'song-xian'], need: 3, desc: '여포 약점 해제, 사기 피해 +8%' },
  { id: 'five-generals', name: '오자양장', members: ['zhang-liao', 'yue-jin', 'yu-jin', 'zhang-he', 'xu-huang'], need: 3, desc: '받는 피해 −10%' },
  // 2026.10.21 이벤트 한정 무장 인연(먼저 둔다)
  { id: 'water-mirror', name: '수경 문하', members: ['sima-hui', 'zhuge-liang', 'pang-tong', 'xu-shu'], need: 2, requires: 'sima-hui', desc: '사마휘와 문하생 1명 이상: 계략 · 통솔 스킬 위력 +12% · 계략 · 통솔 스킬 쿨다운 −1초', typeMult: { types: ['계략', '통솔'], value: 0.12 }, cdTypes: { types: ['계략', '통솔'], sec: 1 } },
  { id: 'divine-healers', name: '신의와 선도', members: ['hua-tuo', 'yu-ji', 'zuo-ci'], need: 2, requires: 'hua-tuo', desc: '화타와 우길 · 좌자 중 1명 이상: 아군 받는 피해 −8% · 모든 스킬 쿨다운 −0.5초', dr: 0.08, cd: 0.5 },
  { id: 'three-immortals', name: '강호의 세 선인', members: ['zuo-ci', 'yu-ji', 'nanhua'], need: 2, desc: '아군 받는 피해 −5%', dr: 0.05 },
  { id: 'taiping-book', name: '태평요술서', members: ['nanhua', 'zhang-jiao', 'zhang-bo', 'zhang-liang'], need: 2, requires: 'nanhua', desc: '남화노선과 황건 장수 1명 이상: 아군 공격 +8% · 스킬 위력 +8%', atk: 0.08, skillMult: 0.08 },
  { id: 'scrape-bone', name: '괄골요독', members: ['hua-tuo', 'guan-yu'], need: 2, desc: '아군 받는 피해 −12% · 아군 공격 +6%', dr: 0.12, atk: 0.06 },
  { id: 'dragon-phoenix', name: '와룡봉추', members: ['zhuge-liang', 'pang-tong'], need: 2, desc: '계략 스킬 쿨다운 −1초' },
  // 주유 · 육손 · 황개가 모이면 적벽의 불과 강동의 대도독을 함께 받는다(인연은 하나만 적용되므로 먼저 둔다)
  { id: 'red-cliffs-trio', name: '적벽대전', members: ['zhou-yu', 'lu-xun', 'huang-gai'], need: 3, desc: '적벽의 불(화계 · 대화계 지속 +2초)에 스킬 위력 +8%', skillMult: 0.08 },
  { id: 'red-cliffs', name: '적벽의 불', members: ['zhou-yu', 'huang-gai', 'pang-tong', 'zhuge-liang'], need: 2, desc: '화계 지속 +2초' },
  { id: 'yellow-heaven', name: '황천당립', members: ['zhang-jiao', 'zhang-bo', 'zhang-liang', 'guan-hai', 'zhou-cang'], need: 3, desc: '아군 공격 +5%, 계략 스킬 쿨다운 −1초' },
  // ── 모든 무장이 하나 이상의 인연을 갖도록 더한 인연(역사 속 인연 · 같은 군벌 · 함께 싸운 전투) ──
  // 2026.10.20: 조조 · 사마의(먼저 둔다)
  { id: 'wei-sima', name: '위왕과 중달', members: ['cao-cao', 'simayi'], need: 2, desc: '아군 공격 +8% · 받는 피해 −10% · 스킬 위력 +12% · 모든 스킬 쿨다운 −0.5초', atk: 0.08, dr: 0.1, skillMult: 0.12, cd: 0.5 },
  { id: 'wei-clan', name: '조씨 · 하후씨 일족', members: ['cao-cao', 'xiahou-dun', 'cao-ren', 'cao-hong'], need: 2, desc: '아군 공격 +5%, 받는 피해 −5%', atk: 0.05, dr: 0.05 },
  { id: 'tiger-guard', name: '호위무사', members: ['xu-chu', 'dian-wei', 'cao-cao'], need: 2, desc: '아군 받는 피해 −10% · 아군 공격 +15% · 조조가 돌격형으로 싸운다', dr: 0.1, atk: 0.15 },
  { id: 'wei-advisors', name: '위의 모사', members: ['guo-jia', 'xun-yu', 'xun-you', 'jia-xu', 'cheng-yu', 'simayi'], need: 2, desc: '계략 · 통솔 스킬 쿨다운 −1초', cdTypes: { types: ['계략', '통솔'], sec: 1 } },
  { id: 'hefei', name: '합비 수비', members: ['zhang-liao', 'li-dian', 'yue-jin'], need: 2, desc: '아군 받는 피해 −8%, 공격 +4%', dr: 0.08, atk: 0.04 },
  { id: 'fancheng', name: '번성 공방', members: ['cao-ren', 'xu-huang', 'wen-ping', 'pang-de', 'yu-jin'], need: 2, desc: '아군 받는 피해 −10%', dr: 0.1 },
  { id: 'sun-family', name: '손가의 패업', members: ['sun-jian', 'sun-ce', 'sun-quan', 'sun-shangxiang'], need: 2, desc: '아군 공격 +8%', atk: 0.08 },
  { id: 'jiangdong-tigers', name: '강동의 맹장', members: ['gan-ning', 'ling-tong', 'taishi-ci', 'lu-meng'], need: 2, desc: '돌격 · 사격 스킬 위력 +10%', typeMult: { types: ['돌격', '사격'], value: 0.1 } },
  { id: 'wu-commanders', name: '강동의 대도독', members: ['zhou-yu', 'lu-su', 'lu-meng', 'lu-xun'], need: 2, desc: '스킬 위력 +8%', skillMult: 0.08 },
  // 대교 · 소교 · 손상향이 모두 모이면 강동이교 효과에 아군 공격 +10%가 더해진다(인연은 하나만 적용되므로 강동이교보다 먼저 둔다)
  { id: 'jiangdong-trio', name: '강동의 세 여걸', members: ['da-qiao', 'xiao-qiao', 'sun-shangxiang'], need: 3, desc: '아군 받는 피해 −10% · 모든 스킬 쿨다운 −1초 · 아군 공격 +15% · 스킬 위력 +12%', dr: 0.1, cd: 1, atk: 0.15, skillMult: 0.12 },
  // 2026.10.20: 손책 · 주유를 빼고 대교 · 소교 자매 인연으로
  { id: 'two-qiao', name: '강동이교', members: ['da-qiao', 'xiao-qiao'], need: 2, desc: '아군 받는 피해 −8%, 모든 스킬 쿨다운 −0.5초', dr: 0.08, cd: 0.5 },
  { id: 'shu-advisors', name: '촉의 책사', members: ['xu-shu', 'fa-zheng', 'zhuge-liang', 'pang-tong'], need: 2, desc: '모든 스킬 쿨다운 −0.8초', cd: 0.8 },
  { id: 'shu-rising', name: '촉의 신진', members: ['wei-yan', 'wang-ping', 'guan-ping', 'guan-xing', 'guan-yinping', 'zhang-bao', 'ma-dai'], need: 2, desc: '아군 공격 +6%', atk: 0.06 },
  { id: 'nanman', name: '남만 왕가', members: ['meng-huo', 'zhu-rong'], need: 2, desc: '아군 공격 +5%, 받는 피해 −8%', atk: 0.05, dr: 0.08 },
  { id: 'xiliang', name: '서량 군벌', members: ['ma-teng', 'han-sui', 'ma-chao', 'ma-dai', 'pang-de'], need: 2, desc: '돌격 스킬 위력 +12%', typeMult: { types: ['돌격'], value: 0.12 } },
  { id: 'hebei', name: '하북의 패자', members: ['yuan-shao', 'yan-liang', 'wen-chou'], need: 2, desc: '아군 공격 +7%', atk: 0.07 },
  { id: 'yuan-clan', name: '사세삼공', members: ['yuan-shao', 'yuan-shu'], need: 2, desc: '스킬 위력 +10%', skillMult: 0.1 },
  { id: 'white-horse', name: '백마의종', members: ['gongsun-zan', 'zhao-yun'], need: 2, desc: '돌격 · 통솔 스킬 위력 +10%', typeMult: { types: ['돌격', '통솔'], value: 0.1 } },
  { id: 'dong-court', name: '동탁의 조정', members: ['dong-zhuo', 'lu-bu', 'diao-chan'], need: 2, desc: '스킬 위력 +8%, 아군 받는 피해 −4%', skillMult: 0.08, dr: 0.04 },
  { id: 'wenji-return', name: '문희귀한', members: ['cai-wenji', 'cao-cao'], need: 2, desc: '아군 받는 피해 −6%, 모든 스킬 쿨다운 −0.5초', dr: 0.06, cd: 0.5 },
  { id: 'hanzhong', name: '한중의 객장', members: ['zhang-lu', 'ma-chao', 'pang-de'], need: 2, desc: '아군 공격 +5%, 받는 피해 −4%', atk: 0.05, dr: 0.04 },
]

export function bondFor(ids: string[], options: { skipEarly?: boolean } = {}): BondDef | null {
  const set = new Set(ids)
  return BONDS.find(bond => (!options.skipEarly || !bond.early) && bondActive(bond, set)) ?? null
}

const FALLBACK: Record<string, SkillType> = { 기병: '돌격', 궁병: '사격', 책사: '계략', 보병: '수호' }

export function skillDefFor(id: string, role = '보병', name = '고유 스킬', desc = ''): GeneralSkillDef {
  return GENERAL_SKILLS[id] ?? { faction: '군웅', type: FALLBACK[role] ?? '돌격', mult: 1, active: a(name, desc) }
}

export type GrowthStat = 'attack' | 'defense' | 'command' | 'leadership' | 'martial' | 'stratagem' | 'speed'
export const GROWTH_STATS: GrowthStat[] = ['attack', 'defense', 'command', 'leadership', 'martial', 'stratagem', 'speed']
export const GROWTH_PROFILE: Record<SkillType, Record<GrowthStat, number>> = {
  돌격: { attack: 0.22, defense: 0.14, command: 0.08, leadership: 0.12, martial: 0.24, stratagem: 0.06, speed: 0.14 },
  사격: { attack: 0.22, defense: 0.12, command: 0.08, leadership: 0.12, martial: 0.24, stratagem: 0.06, speed: 0.16 },
  계략: { attack: 0.20, defense: 0.14, command: 0.04, leadership: 0.18, martial: 0.04, stratagem: 0.30, speed: 0.10 },
  수호: { attack: 0.20, defense: 0.20, command: 0.12, leadership: 0.22, martial: 0.12, stratagem: 0.04, speed: 0.10 },
  통솔: { attack: 0.18, defense: 0.12, command: 0.16, leadership: 0.28, martial: 0.08, stratagem: 0.10, speed: 0.08 },
  치유: { attack: 0.22, defense: 0.14, command: 0.12, leadership: 0.22, martial: 0.04, stratagem: 0.20, speed: 0.06 },
}
export const GROWTH_OWN_SHARE = 0.3
/** 레벨 1 오를 때 받는 능력치 총량 */
export const levelBudget = (stars: number) => 26 + 2.5 * stars
/** 성급 k가 될 때 받는 능력치 총량 */
export const starBudget = (k: number) => 21 + 3 * k + 4 * Math.floor(k / 2)
/** Lv60·5성까지 받는 능력치 총량 */
export const MAX_GROWTH_BUDGET = 59 * levelBudget(5) + [2, 3, 4, 5].reduce((sum, k) => sum + starBudget(k), 0)

export interface SkillGrowthInput { id: string; role: string; grade: Grade; level: number; stars: number; skillRank?: number; martial: number; stratagem: number; leadership: number; speed: number; skillName?: string; skillDescription?: string }

/** 공식의 주 능력치 보정: 도감 Lv1 능력치 기준 0.85~1.15. */
export function statFactor(stat: number): number {
  return Math.max(0.85, Math.min(1.15, 1 + (stat - 70) / 200))
}

export function starRank(general: Pick<SkillGrowthInput, 'stars' | 'skillRank'>): number {
  return Math.max(1, Math.min(5, Math.trunc(general.skillRank ?? general.stars ?? 1)))
}

/**
 * 스킬 1회 사기 피해(버프·조건 적용 전, 상한 전).
 * base: 도감 Lv1 능력치(성장 제외)를 넘기면 그 값을 쓰고, 없으면 현재 능력치를 쓴다.
 */
export function baseMoraleDamage(general: SkillGrowthInput, base?: Pick<SkillGrowthInput, 'martial' | 'stratagem' | 'leadership'>, override?: GeneralSkillDef): number {
  const def = override ?? skillDefFor(general.id, general.role)
  const meta = SKILL_TYPE_META[def.type]
  const stat = (base ?? general)[meta.stat]
  const level = mainStatGrowth(general, base, def.type)
  return meta.base * def.mult * statFactor(stat) * SKILL_GRADE_COEF[general.grade] * (SKILL_STAR_COEF[starRank(general)] ?? 1) * level
}

/**
 * 스킬 성장: 주 능력치(돌격·사격=무력, 계략=모략, 통솔·수호·치유=통솔)가 원형보다 얼마나 올랐는지로 정한다.
 * Lv60·5성에서 유형 기본 성장만큼 올랐으면 ×1.3, 장비로 더 올리면 더 세진다(최대 ×1.45).
 * 원형을 모르면 예전처럼 레벨로 정한다.
 */
export function mainStatGrowth(general: SkillGrowthInput, base: Pick<SkillGrowthInput, 'martial' | 'stratagem' | 'leadership'> | undefined, type: SkillType): number {
  const key = SKILL_TYPE_META[type].stat
  if (!base || base === general) return 1 + 0.005 * Math.min(Math.max(general.level, 1) - 1, 59)
  const expected = MAX_GROWTH_BUDGET * (GROWTH_PROFILE[type][key] * (1 - GROWTH_OWN_SHARE) + GROWTH_OWN_SHARE / 7)
  return Math.min(1.45, Math.max(1, 1 + 0.3 * (general[key] - base[key]) / expected))
}

/** 속도 쿨다운 단축 곡선: 최대치와 그 절반에 닿는 속도(30 초과분) */
export const SPEED_CD_MAX = 0.3
export const SPEED_CD_HALF = 240

export function skillCooldownFor(general: SkillGrowthInput, base?: Pick<SkillGrowthInput, 'speed'>, override?: GeneralSkillDef): number {
  const def = override ?? skillDefFor(general.id, general.role)
  const meta = SKILL_TYPE_META[def.type]
  // 현재 속도(레벨업·장비 포함)로 줄인다. 빠를수록 덜 줄어들며 최대 30%에 다가간다(속도 66 ≈ −4%, 200 ≈ −13%, 400 ≈ −18%)
  void base
  const over = Math.max(0, general.speed - 30)
  const cut = SPEED_CD_MAX * over / (over + SPEED_CD_HALF)
  let cooldown = meta.cooldown * (1 - cut) - 0.5 * (starRank(general) - 1)
  if (def.weakness?.id === 'indecisive') cooldown += 2
  return Math.max(SKILL_MIN_COOLDOWN, Math.round(cooldown * 10) / 10)
}

export function isAwakened(general: Pick<SkillGrowthInput, 'id' | 'grade' | 'stars' | 'skillRank'>): boolean {
  return general.grade === 5 && starRank(general) >= 5 && Boolean(GENERAL_SKILLS[general.id]?.awaken)
}

/** 화면에 보일 스킬 이름: 각성하면 각성 이름 */
export function activeSkillName(general: SkillGrowthInput): string {
  const def = skillDefFor(general.id, general.role, general.skillName, general.skillDescription)
  return isAwakened(general) && def.awaken ? def.awaken.name : def.active.name
}

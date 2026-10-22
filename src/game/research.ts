// 기술 연구: 5분야 × 6단계(30단계, 갈림길 포함 40개). 3·6단계는 둘 중 하나를 고르는 갈림길.
// 재야(중립 진영)는 내정 · 영토 방어가 없으므로 부국 · 제패 대신 재야 전용 '약탈' · '유격' 분야를 연구한다(2026.10.18).
// 모든 연구 항목(7분야 56개)은 한 목록에 저장하고, 진영에 맞는 다섯 분야만 보이고 효과를 낸다.
// 부국 ↔ 약탈, 제패 ↔ 유격은 같은 단계(같은 갈림길 쪽)끼리 연동된다: 한쪽을 완료하면 다른 쪽도 완료.
// 연구에는 단계별 시간이 걸리고 한 번에 하나만 진행한다. 금화로 즉시 완료하거나 취소(전액 환급)할 수 있다.
// 이 파일은 strategy.ts의 타입만 가져다 쓴다(실행 시 순환 참조 없음).
import type { ResearchNode, ResourceKey, StrategyState } from './strategy'
import { locale } from '../i18n/lang'

export type ResearchBranch = '부국' | '강병' | '지략' | '제패' | '인재' | '약탈' | '유격'

export const RESEARCH_BRANCHES: Array<{ id: ResearchBranch; prefix: string; hint: string; resource: ResourceKey }> = [
  { id: '부국', prefix: 'econ', hint: '내정 수확·건물·수확 주기', resource: 'grain' },
  { id: '강병', prefix: 'army', hint: '전투 병력·피해·사기', resource: 'iron' },
  { id: '지략', prefix: 'strat', hint: '예고 대응·스킬·전술 명령', resource: 'silver' },
  { id: '제패', prefix: 'realm', hint: '공성·수비대·세력전', resource: 'wood' },
  { id: '인재', prefix: 'talent', hint: '병서·육성·강화', resource: 'silver' },
  { id: '약탈', prefix: 'loot', hint: '재야 전용 · 약탈량·약탈 횟수·병서', resource: 'grain' },
  { id: '유격', prefix: 'raid', hint: '재야 전용 · 약탈 공성·출정·전리품', resource: 'wood' },
]
/** 세 진영의 분야(부국 · 강병 · 지략 · 제패 · 인재) */
const SETTLED_BRANCHES: ResearchBranch[] = ['부국', '강병', '지략', '제패', '인재']
/** 재야의 분야: 부국 → 약탈, 제패 → 유격 */
const WANDERER_BRANCHES: ResearchBranch[] = ['약탈', '강병', '지략', '유격', '인재']
const isWandererState = (state: Pick<StrategyState, 'faction'>) => state.faction === '재야'
/** 이 진영이 연구하는 다섯 분야(화면 차례대로) */
export function researchBranchesFor(state: Pick<StrategyState, 'faction'>): typeof RESEARCH_BRANCHES {
  const ids = isWandererState(state) ? WANDERER_BRANCHES : SETTLED_BRANCHES
  return ids.map(id => RESEARCH_BRANCHES.find(branch => branch.id === id)!)
}
/** 이 분야가 지금 진영에서 효과를 내는가(재야는 부국 · 제패, 세 진영은 약탈 · 유격이 꺼진다) */
export function branchActive(state: Pick<StrategyState, 'faction'>, branch: string): boolean {
  return (isWandererState(state) ? WANDERER_BRANCHES : SETTLED_BRANCHES).includes(branch as ResearchBranch)
}

/** 단계별 연구 시간(분): 5분 → 20분 → 1시간 → 2시간 → 4시간 → 8시간 */
export const RESEARCH_MINUTES = [5, 20, 60, 120, 240, 480] as const
const INFLUENCE_COST = [600, 1400, 3000, 5200, 8500, 13000]
const RESOURCE_COST = [1200, 2800, 6000, 10500, 17000, 26000]

type Def = [id: string, tier: number, choice: '' | 'a' | 'b', name: string, description: string]
const DEFS: Record<ResearchBranch, Def[]> = {
  부국: [
    ['econ-1', 1, '', '둔전제', '모든 아군 도시의 식량 수확 +15%'],
    ['econ-2', 2, '', '상평창', '은전 수확 +15%'],
    ['econ-3a', 3, 'a', '염철 전매', '철·목재 수확 +25%'],
    ['econ-3b', 3, 'b', '호시 교역', '영향력 수확 +20%'],
    ['econ-4', 4, '', '도량형 통일', '건물 강화 비용 −15%'],
    ['econ-5', 5, '', '역참망', '내정 수확 대기 시간 −20%'],
    ['econ-6a', 6, 'a', '천하 곳간', '모든 수확 +10%'],
    ['econ-6b', 6, 'b', '구휼 제도', '방어전 패배 때 번영도 하락 절반, 식량 수확 +5%'],
  ],
  강병: [
    ['army-1', 1, '', '오부 훈련', '전투 아군 최대 병력 +8%'],
    ['army-2', 2, '', '연노 제식', '궁병 무장의 병력 공격 +12%'],
    ['army-3a', 3, 'a', '철기 돌격', '돌격형 스킬 사기 피해 +10%'],
    ['army-3b', 3, 'b', '방패 진형', '아군이 받는 병력 피해 −10%'],
    ['army-4', 4, '', '군량 보급', '전투 시작 전술 게이지 +20'],
    ['army-5', 5, '', '정예 징집', '사기 0일 때 아군 공격·방어 70% → 76%(사기가 더 떨어져도 덜 약해짐)'],
    ['army-6a', 6, 'a', '패왕의 군세', '적 사기 최대치 −10%'],
    ['army-6b', 6, 'b', '불패 진형', '전투마다 아군 사기가 처음 0이 되면 사기 절반 회복'],
  ],
  지략: [
    ['strat-1', 1, '', '손자병법 주해', '예고 대응에 성공하면 아군 사기 추가 +4'],
    ['strat-2', 2, '', '천문 관측', '적 전술 예고 대응 시간 +0.3초'],
    ['strat-3a', 3, 'a', '팔진 연구', '계략·통솔형 스킬 쿨다운 −10%'],
    ['strat-3b', 3, 'b', '화공 연구', '화계로 깎이는 적 사기 +25%'],
    ['strat-4', 4, '', '간자 운용', '적장 스킬 예고를 0.5초 일찍'],
    ['strat-5', 5, '', '묘책', '전술 명령 비용 −15%'],
    ['strat-6a', 6, 'a', '와룡의 지혜', '스킬 1회 사기 피해 상한 40 → 44'],
    ['strat-6b', 6, 'b', '연환계', '연계 피해 증폭 +10%'],
  ],
  제패: [
    ['realm-1', 1, '', '성벽 보강', '방어전에서 성벽이 받는 피해 −15%'],
    ['realm-2', 2, '', '공성 병기', '공성 성벽 피해 +15%'],
    ['realm-3a', 3, 'a', '봉화대', '방어전 수비대 전력 +15%'],
    ['realm-3b', 3, 'b', '운제 공성', '공성 출정 비용 −25%'],
    ['realm-4', 4, '', '둔병제', '새로 세우는 수비대 전력 +10%'],
    ['realm-5', 5, '', '기동 군단', '공성 재출정 대기 −25%'],
    ['realm-6a', 6, 'a', '천하 통일', '세력전 승리 금화 +20%'],
    ['realm-6b', 6, 'b', '철옹성', '방어전에서 성벽이 받는 피해 추가 −30%'],
  ],
  인재: [
    ['talent-1', 1, '', '인재 등용', '수확할 때 병서 획득(영향력 200당 1), 모든 병서 획득 +20%'],
    ['talent-2', 2, '', '무예 수련', '출전 무장 3명의 능력치 +2%'],
    ['talent-3a', 3, 'a', '병법 전수', '무장 레벨업 비용 −10% (사관 교육과 합쳐 −20%)'],
    ['talent-3b', 3, 'b', '장인 공방', '장비 강화 비용 −15%'],
    ['talent-4', 4, '', '사관 교육', '무장 레벨업 비용 −10%'],
    ['talent-5', 5, '', '역사 편찬', '전투 승리 은전 +15%'],
    ['talent-6a', 6, 'a', '천하 인재', '출전 무장 3명의 능력치 +3%'],
    ['talent-6b', 6, 'b', '명품 제련', '장비 강화 비용 −15% 추가 (장인 공방과 합쳐 −30%)'],
  ],
  // ── 재야 전용 ──
  약탈: [
    ['loot-1', 1, '', '군량 징발', '약탈하는 식량 +25%'],
    ['loot-2', 2, '', '재물 수탈', '약탈하는 은전 +25%'],
    ['loot-3a', 3, 'a', '병장기 노획', '약탈하는 철·목재 +30%'],
    ['loot-3b', 3, 'b', '민심 매수', '약탈하는 영향력 +30%'],
    ['loot-4', 4, '', '야습 행군', '하루 약탈 횟수 30 → 36회'],
    ['loot-5', 5, '', '장물 거래', '약탈할 때 병서 획득(영향력 200당 1), 모든 병서 획득 +20%'],
    ['loot-6a', 6, 'a', '천하 대도', '모든 약탈량 +15%'],
    ['loot-6b', 6, 'b', '초토화', '성벽을 무너뜨리면 그 성 하루 생산량의 50%를 더 약탈'],
  ],
  유격: [
    ['raid-1', 1, '', '파성추', '약탈 공성 성벽 피해 +15%'],
    ['raid-2', 2, '', '경장 출정', '공성 출정 비용 −25%'],
    ['raid-3a', 3, 'a', '기습 전술', '공성 재출정 대기 −25%'],
    ['raid-3b', 3, 'b', '공성 사다리', '약탈 공성 성벽 피해 +15% 추가'],
    ['raid-4', 4, '', '척후 정찰', '약탈 공성 전투 아군 전투 이점 +8%'],
    ['raid-5', 5, '', '전리품 포상', '약탈에 성공할 때마다 병서 +6'],
    ['raid-6a', 6, 'a', '파죽지세', '약탈 공성 전투 아군 전투 이점 +12% 추가'],
    ['raid-6b', 6, 'b', '함락 전문', '약탈 공성 성벽 피해 +30% 추가'],
  ],
}

export function createResearch(): ResearchNode[] {
  return RESEARCH_BRANCHES.flatMap(branch => DEFS[branch.id].map(([id, tier, choice, name, description]) => ({
    id, name, branch: branch.id, tier: tier as ResearchNode['tier'], description,
    choice: choice || undefined,
    cost: { influence: INFLUENCE_COST[tier - 1], [branch.resource]: RESOURCE_COST[tier - 1] } as Partial<Record<ResourceKey, number>>,
    durationMs: RESEARCH_MINUTES[tier - 1] * 60_000,
    unlocked: false,
  })))
}

const DEF_IDS = new Set(Object.values(DEFS).flat().map(def => def[0]))

/**
 * 저장된 연구를 새 구성에 맞춘다. 예전 연구(58개 체계)를 완료했다면 들인 자원을 돌려준다.
 * 반환값: 환급한 자원(없으면 null)
 */
export function normalizeResearch(state: StrategyState): Partial<Record<ResourceKey, number>> | null {
  const saved = Array.isArray(state.research) ? state.research : []
  const refund: Partial<Record<ResourceKey, number>> = {}
  let refunded = false
  for (const node of saved) {
    if (!node || DEF_IDS.has(node.id) || !node.unlocked) continue
    for (const [key, value] of Object.entries(node.cost ?? {})) {
      refund[key as ResourceKey] = (refund[key as ResourceKey] ?? 0) + (value ?? 0)
      refunded = true
    }
  }
  const byId = new Map(saved.filter(node => node && DEF_IDS.has(node.id)).map(node => [node.id, node]))
  state.research = createResearch().map(node => {
    const old = byId.get(node.id)
    return old ? { ...node, unlocked: Boolean(old.unlocked), endsAt: old.unlocked ? undefined : old.endsAt, startedAt: old.unlocked ? undefined : old.startedAt } : node
  })
  syncLinkedResearch(state)
  // 진행 중 연구는 하나만
  let active = false
  for (const node of state.research) {
    if (node.endsAt === undefined) continue
    if (active || node.unlocked) { node.endsAt = undefined; node.startedAt = undefined } else active = true
  }
  if (!refunded) return null
  for (const [key, value] of Object.entries(refund)) {
    if (key === 'silver') { state.silver += value ?? 0; state.resources.silver = state.silver } else state.resources[key as ResourceKey] += value ?? 0
  }
  return refund
}

export function researchDone(state: StrategyState, id: string): boolean {
  return state.research.some(node => node.id === id && node.unlocked)
}
export function activeResearch(state: StrategyState): ResearchNode | null {
  return state.research.find(node => node.endsAt !== undefined && !node.unlocked) ?? null
}
function sibling(state: StrategyState, node: ResearchNode): ResearchNode | undefined {
  if (!node.choice) return undefined
  return state.research.find(other => other.branch === node.branch && other.tier === node.tier && other.id !== node.id)
}
function tierDone(state: StrategyState, branch: string, tier: number): boolean {
  return state.research.some(node => node.branch === branch && node.tier === tier && node.unlocked)
}

export type ResearchStatus = 'done' | 'active' | 'available' | 'switch' | 'locked' | 'busy'
/** 화면 표시용 상태: switch = 갈림길의 다른 쪽을 이미 완료(다시 고르면 그쪽 효과는 사라진다) */
export function researchStatus(state: StrategyState, node: ResearchNode): ResearchStatus {
  if (node.unlocked) return 'done'
  if (node.endsAt !== undefined) return 'active'
  if (node.tier > 1 && !tierDone(state, node.branch, node.tier - 1)) return 'locked'
  if (activeResearch(state)) return 'busy'
  const other = sibling(state, node)
  if (other?.unlocked) return 'switch'
  return 'available'
}

export function researchCostText(cost: Partial<Record<ResourceKey, number>>, labels: Record<ResourceKey, string>): string {
  return Object.entries(cost).map(([key, value]) => `${labels[key as ResourceKey]} ${new Intl.NumberFormat(locale()).format(value ?? 0)}`).join(' · ')
}

export function canPay(state: StrategyState, cost: Partial<Record<ResourceKey, number>>): boolean {
  return Object.entries(cost).every(([key, value]) => (key === 'silver' ? state.silver : state.resources[key as ResourceKey]) >= (value ?? 0))
}
function pay(state: StrategyState, cost: Partial<Record<ResourceKey, number>>, sign: 1 | -1): void {
  for (const [key, value] of Object.entries(cost)) {
    if (key === 'silver') state.silver -= sign * (value ?? 0)
    else state.resources[key as ResourceKey] -= sign * (value ?? 0)
  }
  state.resources.silver = state.silver
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  if (h) return `${h}시간${m ? ` ${m}분` : ''}`
  if (m) return `${m}분${s && m < 10 ? ` ${s}초` : ''}`
  return `${s}초`
}

export function startResearch(state: StrategyState, id: string, now = Date.now()): { ok: boolean; message: string } {
  settleResearch(state, now)
  const node = state.research.find(item => item.id === id)
  if (!node) return { ok: false, message: '연구 항목을 찾을 수 없습니다.' }
  if (!branchActive(state, node.branch)) return { ok: false, message: isWandererState(state) ? '재야(중립 진영)는 이 분야를 연구할 수 없습니다. 약탈 · 유격 분야를 연구하십시오.' : '재야(중립 진영) 전용 분야입니다.' }
  const status = researchStatus(state, node)
  if (status === 'done') return { ok: false, message: '이미 완료한 연구입니다.' }
  if (status === 'active') return { ok: false, message: '이미 진행 중인 연구입니다.' }
  if (status === 'locked') return { ok: false, message: `앞 단계(${node.tier - 1}단계) 연구를 먼저 완료하십시오.` }
  if (status === 'busy') return { ok: false, message: `다른 연구가 진행 중입니다 · ${activeResearch(state)?.name}` }
  if (!canPay(state, node.cost)) return { ok: false, message: '연구 자원이 부족합니다.' }
  pay(state, node.cost, 1)
  node.startedAt = now
  node.endsAt = now + node.durationMs
  state.lastNotice = `연구 시작 · ${node.name} · ${formatDuration(node.durationMs)} 후 완료`
  return { ok: true, message: state.lastNotice }
}

export function cancelResearch(state: StrategyState): { ok: boolean; message: string } {
  const node = activeResearch(state)
  if (!node) return { ok: false, message: '진행 중인 연구가 없습니다.' }
  pay(state, node.cost, -1)
  node.endsAt = undefined
  node.startedAt = undefined
  state.lastNotice = `연구 취소 · ${node.name} · 자원을 모두 돌려받았습니다.`
  return { ok: true, message: state.lastNotice }
}

/** 남은 시간 10분마다 금화 1개(최소 1개) */
export function rushCost(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 600_000))
}

export function rushResearch(state: StrategyState, now = Date.now()): { ok: boolean; message: string } {
  const node = activeResearch(state)
  if (!node || node.endsAt === undefined) return { ok: false, message: '진행 중인 연구가 없습니다.' }
  const cost = rushCost(node.endsAt - now)
  if (state.gold < cost) return { ok: false, message: `금화가 부족합니다. 즉시 완료에 금화 ${cost}개가 필요합니다.` }
  state.gold -= cost
  complete(state, node)
  state.lastNotice = `즉시 완료 · ${node.name} (금화 −${cost})`
  return { ok: true, message: state.lastNotice }
}

function complete(state: StrategyState, node: ResearchNode): void {
  for (const item of [node, linkedNode(state, node)]) {
    if (!item) continue
    item.unlocked = true
    item.endsAt = undefined
    item.startedAt = undefined
    const other = sibling(state, item)
    if (other) other.unlocked = false // 갈림길은 한쪽만
  }
}

/**
 * 세 진영 분야와 재야 분야는 같은 단계끼리 연동된다: 부국 ↔ 약탈, 제패 ↔ 유격(같은 단계 · 같은 갈림길 쪽).
 * 한쪽을 완료하면 다른 쪽도 완료로 친다 — 진영을 바꿔도 쌓은 단계가 그대로 이어진다.
 */
const LINKED_PREFIX: Record<string, string> = { econ: 'loot', loot: 'econ', realm: 'raid', raid: 'realm' }
export function linkedResearchId(id: string): string | null {
  const [prefix, rest] = [id.slice(0, id.indexOf('-')), id.slice(id.indexOf('-'))]
  const other = LINKED_PREFIX[prefix]
  return other ? other + rest : null
}
function linkedNode(state: StrategyState, node: ResearchNode): ResearchNode | undefined {
  const id = linkedResearchId(node.id)
  return id ? state.research.find(item => item.id === id) : undefined
}
/** 저장분을 불러올 때 연동된 쌍을 맞춘다(한쪽만 완료돼 있으면 다른 쪽도 완료) */
function syncLinkedResearch(state: StrategyState): void {
  for (const node of state.research) {
    if (!node.unlocked) continue
    const twin = linkedNode(state, node)
    if (!twin || twin.unlocked) continue
    // 갈림길 반대쪽이 이미 완료돼 있으면 지금 진영 분야 쪽을 따른다
    const rival = sibling(state, twin)
    if (rival?.unlocked && branchActive(state, twin.branch) && !branchActive(state, node.branch)) continue
    twin.unlocked = true; twin.endsAt = undefined; twin.startedAt = undefined
    if (rival) rival.unlocked = false
  }
}

/** 시간이 다 된 연구를 완료 처리한다. 완료한 연구 목록을 돌려준다. */
export function settleResearch(state: StrategyState, now = Date.now()): ResearchNode[] {
  const done: ResearchNode[] = []
  for (const node of state.research) {
    if (node.endsAt !== undefined && !node.unlocked && now >= node.endsAt) { complete(state, node); done.push(node) }
  }
  if (done.length) state.lastNotice = `연구 완료 · ${done.map(node => node.name).join(' · ')}`
  return done
}

// ── 효과 ─────────────────────────────────────────────────────
export interface ResearchMods {
  grain: number; silver: number; woodIron: number; influence: number; allIncome: number
  buildingCost: number; incomeCooldown: number; prosperityLoss: number
  raidWallDamage: number; siegeDamage: number; raidGarrison: number; siegeCost: number; newGarrison: number; siegeCooldown: number; factionGold: number
  harvestManuals: boolean; manuals: number; enhanceCost: number; levelCost: number; battleSilver: number; formationStats: number
  /** 재야 약탈: 자원별 · 전체 배율 증가분, 하루 횟수 추가, 병서, 성벽 붕괴 추가 약탈, 공성 전투 이점, 약탈 병서 */
  plunder: { grain: number; silver: number; material: number; influence: number; all: number; extraCount: number; manuals: boolean; razeBonus: number; battle: number; bonusManuals: number }
  battle: BattleResearch
}

/** 전투 규칙(battle-core)에 넘기는 아군 보정 */
export interface BattleResearch {
  troops?: number
  archerAtk?: number
  chargeSkill?: number
  damageTaken?: number
  startGauge?: number
  moraleFloorUp?: number
  finalActMorale?: number
  ignoreFirstCollapse?: boolean
  breakThreat?: number
  window?: number
  strategistCd?: number
  fire?: number
  enemyWarn?: number
  tacticCost?: number
  capBonus?: number
  combo?: number
}

export function researchMods(state: StrategyState): ResearchMods {
  // 지금 진영에서 쓰지 않는 분야(재야의 부국 · 제패, 세 진영의 약탈 · 유격)는 효과가 없다
  const has = (id: string) => state.research.some(node => node.id === id && node.unlocked && branchActive(state, node.branch))
  const raidWall = (has('raid-1') ? 0.15 : 0) + (has('raid-3b') ? 0.15 : 0) + (has('raid-6b') ? 0.3 : 0)
  return {
    grain: (has('econ-1') ? 0.15 : 0) + (has('econ-6b') ? 0.05 : 0),
    silver: has('econ-2') ? 0.15 : 0,
    woodIron: has('econ-3a') ? 0.25 : 0,
    influence: has('econ-3b') ? 0.2 : 0,
    allIncome: has('econ-6a') ? 0.1 : 0,
    buildingCost: has('econ-4') ? 0.15 : 0,
    incomeCooldown: has('econ-5') ? 0.2 : 0,
    prosperityLoss: has('econ-6b') ? 0.5 : 0,
    raidWallDamage: 1 - (has('realm-1') ? 0.15 : 0) - (has('realm-6b') ? 0.3 : 0),
    siegeDamage: (has('realm-2') ? 0.15 : 0) + raidWall,
    raidGarrison: has('realm-3a') ? 0.15 : 0,
    siegeCost: has('realm-3b') || has('raid-2') ? 0.25 : 0,
    newGarrison: has('realm-4') ? 0.1 : 0,
    siegeCooldown: has('realm-5') || has('raid-3a') ? 0.25 : 0,
    factionGold: has('realm-6a') ? 0.2 : 0,
    harvestManuals: has('talent-1'),
    manuals: (has('talent-1') ? 0.2 : 0) + (has('loot-5') ? 0.2 : 0),
    // 인재 연구는 무장 육성(레벨 · 장비 강화 · 능력치 · 은전)에만 듣는다: 모집 · 장비 뽑기 확률과 옥패(과금 재화)에는 영향이 없다(2026.10.19)
    enhanceCost: (has('talent-3b') ? 0.15 : 0) + (has('talent-6b') ? 0.15 : 0),
    levelCost: (has('talent-4') ? 0.1 : 0) + (has('talent-3a') ? 0.1 : 0),
    battleSilver: has('talent-5') ? 0.15 : 0,
    formationStats: (has('talent-2') ? 0.02 : 0) + (has('talent-6a') ? 0.03 : 0),
    plunder: {
      grain: has('loot-1') ? 0.25 : 0, silver: has('loot-2') ? 0.25 : 0, material: has('loot-3a') ? 0.3 : 0, influence: has('loot-3b') ? 0.3 : 0, all: has('loot-6a') ? 0.15 : 0,
      extraCount: has('loot-4') ? 6 : 0, manuals: has('loot-5'), razeBonus: has('loot-6b') ? 0.5 : 0,
      battle: (has('raid-4') ? 0.08 : 0) + (has('raid-6a') ? 0.12 : 0), bonusManuals: has('raid-5') ? 6 : 0, // 옥패(과금 재화) 대신 병서(2026.10.19)
    },
    battle: battleResearch(state),
  }
}

export function battleResearch(state: Pick<StrategyState, 'research'>): BattleResearch {
  const has = (id: string) => state.research.some(node => node.id === id && node.unlocked)
  return {
    troops: has('army-1') ? 0.08 : 0,
    archerAtk: has('army-2') ? 0.12 : 0,
    chargeSkill: has('army-3a') ? 0.1 : 0,
    damageTaken: has('army-3b') ? 0.1 : 0,
    startGauge: has('army-4') ? 20 : 0,
    moraleFloorUp: has('army-5') ? 0.06 : 0,
    finalActMorale: has('army-6a') ? 0.1 : 0,
    ignoreFirstCollapse: has('army-6b'),
    breakThreat: has('strat-1') ? 4 : 0,
    window: has('strat-2') ? 0.3 : 0,
    strategistCd: has('strat-3a') ? 0.1 : 0,
    fire: has('strat-3b') ? 0.25 : 0,
    enemyWarn: has('strat-4') ? 0.5 : 0,
    tacticCost: has('strat-5') ? 0.15 : 0,
    capBonus: has('strat-6a') ? 4 : 0,
    combo: has('strat-6b') ? 0.1 : 0,
  }
}

/** 화면에 보일 효과 요약(완료한 연구) */
export function researchSummary(state: StrategyState): string[] {
  return state.research.filter(node => node.unlocked && branchActive(state, node.branch)).map(node => `${node.name} · ${node.description}`)
}

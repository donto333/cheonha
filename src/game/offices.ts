// 관직(내정 → 관직, 2026.10.23): 출전하지 않는 무장을 자리에 앉혀 능력치만큼 내정 효과를 얻는다.
//  태학 박사 1명: 모략 10당 연구 시간 −1%(최대 −15%)
//  태수(세 진영): 아군 도시 하나를 맡는다. 그 도시에서
//    통솔 → 새로 세우는 수비대 전력 · 모략 → 은전 · 영향력 수확 · 무력 → 맞닿은 적 도시 공성 성벽 피해 · 속도 → 공사 시간
//    (능력치 20당 1%, 최대 15%)
//  두목(재야, 다스리는 도시가 없어 태수 대신): 통솔 → 하루 약탈 횟수(60당 1회, 최대 5회) · 모략 → 약탈량 ·
//    무력 → 약탈 공성 성벽 피해 · 속도 → 공성 재출정 대기(20당 1%, 최대 15%). 효과마다 두목들 중 가장 높은 값을 쓴다
//  같은 나라 무장(태수: 촉 무장 → 촉한 도시처럼 진영과 같은 나라, 두목: 군웅)이면 효과 ×1.2
//  태수 · 두목 자리: 1명 + 인재 3단계 연구 + 인재 6단계 연구(최대 3명)
//  1 · 2 · 3군에 편성된 무장은 효과가 없다(편성에서 빼면 다시 켜진다)
// 연구 시간 단축에는 아군 도시의 태학 서원 단계 합도 들어간다(합 5당 −1%, 최대 −15%).
// 이 파일은 strategy.ts의 타입만 쓴다(research.ts가 불러도 실행 시 순환 참조가 없다).
import type { City, Faction, General, StrategyState } from './strategy'
import { GENERAL_SKILLS, type FactionTag } from './skills'

export type OfficeStat = 'leadership' | 'martial' | 'stratagem' | 'speed'
export const OFFICE_STATS: OfficeStat[] = ['leadership', 'martial', 'stratagem', 'speed']
export const OFFICE_STAT_LABEL: Record<OfficeStat, string> = { leadership: '통솔', martial: '무력', stratagem: '모략', speed: '속도' }
export interface GovernorPost { generalId: string; cityId: string }
export interface OfficeState {
  /** 태학 박사 */
  scholar?: string | null
  /** 태수(자리 번호 순) */
  governors?: Array<GovernorPost | null>
  /** 재야 두목(자리 번호 순) */
  chiefs?: Array<string | null>
}
export type OfficePost = 'scholar' | 'governor' | 'chief'

export const OFFICE_MAX_POSTS = 3
export const SCHOLAR_STEP = 10
export const SCHOLAR_CAP = 0.15
export const ACADEMY_STEP = 5
export const ACADEMY_CAP = 0.15
export const OFFICE_STEP = 20
export const OFFICE_CAP = 0.15
export const RAID_COUNT_STEP = 60
export const RAID_COUNT_CAP = 5
export const NATION_MULT = 1.2
/** 태수 · 두목 자리가 열리는 인재 연구 단계 */
export const OFFICE_UNLOCK_TIERS = [3, 6] as const

const isWanderer = (state: Pick<StrategyState, 'faction'>) => state.faction === '재야'
const NATION_OF: Record<Faction, FactionTag> = { 촉한: '촉', 위나라: '위', 오나라: '오', 재야: '군웅' }

/** 1 · 2 · 3군에 편성된 무장 */
export function deployedGeneralIds(state: Pick<StrategyState, 'formation' | 'reserveSquads'>): Set<string> {
  const ids = [...(state.formation ?? []), ...(state.reserveSquads ?? []).flat()]
  return new Set(ids.filter((id): id is string => typeof id === 'string' && id !== ''))
}

/** 태수(재야는 두목) 자리 수: 1 + 인재 3단계 + 인재 6단계 */
export function officePostCount(state: Pick<StrategyState, 'research'>): number {
  const done = (tier: number) => state.research.some(node => node.branch === '인재' && node.tier === tier && node.unlocked)
  return 1 + OFFICE_UNLOCK_TIERS.filter(done).length
}

/** 무장의 나라(촉 · 위 · 오 · 군웅) */
export function generalNation(id: string): FactionTag | undefined {
  return GENERAL_SKILLS[id]?.faction
}
/** 같은 나라 보너스: 태수는 진영과 같은 나라, 재야 두목은 군웅 */
export function nationMatch(faction: Faction, generalId: string): boolean {
  return generalNation(generalId) === NATION_OF[faction]
}

/** 능력치 → 효과(20당 1%, 최대 15%, 같은 나라면 ×1.2) */
export function officeValue(stat: number, nation = false, step = OFFICE_STEP, cap = OFFICE_CAP): number {
  const base = Math.min(cap, Math.floor(Math.max(0, stat) / step) / 100)
  return Math.round(base * (nation ? NATION_MULT : 1) * 10000) / 10000
}

/** 효과가 있는(가진 · 출전하지 않은) 무장 */
function activeGeneral(state: StrategyState, id: string | null | undefined, deployed = deployedGeneralIds(state)): General | null {
  if (!id || deployed.has(id)) return null
  return state.generals.find(general => general.id === id) ?? null
}

// ── 태학 박사 · 태학 서원(연구 시간) ─────────────────────────────
export function scholarGeneral(state: StrategyState): General | null {
  return activeGeneral(state, state.offices?.scholar)
}
export function scholarCut(state: StrategyState): number {
  const general = scholarGeneral(state)
  return general ? officeValue(general.stratagem, false, SCHOLAR_STEP, SCHOLAR_CAP) : 0
}
/** 아군 도시 태학 서원 단계 합(재야는 다스리는 도시가 없어 0) */
export function academyLevelSum(state: Pick<StrategyState, 'faction' | 'cities'>): number {
  if (isWanderer(state)) return 0
  return state.cities.filter(city => city.owner === state.faction).reduce((sum, city) => sum + (city.buildings.find(building => building.kind === 'academy')?.level ?? 0), 0)
}
export function academyCut(state: Pick<StrategyState, 'faction' | 'cities'>): number {
  return Math.min(ACADEMY_CAP, Math.floor(academyLevelSum(state) / ACADEMY_STEP) / 100)
}
/** 연구 시간 단축: 태학 서원 + 태학 박사(각각 최대 15%) */
export function researchSpeedCut(state: StrategyState): number {
  return Math.round((academyCut(state) + scholarCut(state)) * 10000) / 10000
}

// ── 태수(세 진영) ─────────────────────────────────────────────
export type OfficeBonus = Record<OfficeStat, number>
export function governorBonus(general: Pick<General, 'id' | OfficeStat>, faction: Faction): OfficeBonus {
  const nation = nationMatch(faction, general.id)
  return { leadership: officeValue(general.leadership, nation), martial: officeValue(general.martial, nation), stratagem: officeValue(general.stratagem, nation), speed: officeValue(general.speed, nation) }
}
export interface CityGovernor { slot: number; general: General; bonus: OfficeBonus; nation: boolean }
/** 이 도시의 태수(효과가 있을 때만): 세 진영 · 열린 자리 · 아군 도시 · 출전하지 않은 무장 */
export function cityGovernor(state: StrategyState, cityId: string): CityGovernor | null {
  if (isWanderer(state)) return null
  const posts = state.offices?.governors ?? []
  const open = officePostCount(state)
  const slot = posts.findIndex((post, index) => index < open && post?.cityId === cityId)
  if (slot < 0) return null
  const city = state.cities.find(item => item.id === cityId)
  if (!city || city.owner !== state.faction) return null
  const general = activeGeneral(state, posts[slot]?.generalId)
  if (!general) return null
  return { slot, general, bonus: governorBonus(general, state.faction), nation: nationMatch(state.faction, general.id) }
}

// ── 두목(재야) ────────────────────────────────────────────────
export interface ChiefBonuses { raidCount: number; plunder: number; wall: number; cooldown: number }
export function chiefBonus(general: Pick<General, 'id' | OfficeStat>): ChiefBonuses {
  const nation = nationMatch('재야', general.id)
  return {
    raidCount: Math.min(RAID_COUNT_CAP, Math.floor(Math.max(0, general.leadership) * (nation ? NATION_MULT : 1) / RAID_COUNT_STEP)),
    plunder: officeValue(general.stratagem, nation),
    wall: officeValue(general.martial, nation),
    cooldown: officeValue(general.speed, nation),
  }
}
const NO_CHIEF: ChiefBonuses = { raidCount: 0, plunder: 0, wall: 0, cooldown: 0 }
/** 재야 두목들의 효과(효과마다 가장 높은 값). 세 진영은 0 */
export function chiefBonuses(state: StrategyState): ChiefBonuses {
  if (!isWanderer(state)) return NO_CHIEF
  const open = officePostCount(state)
  const deployed = deployedGeneralIds(state)
  const list = (state.offices?.chiefs ?? []).slice(0, open).map(id => activeGeneral(state, id, deployed)).filter((general): general is General => Boolean(general)).map(chiefBonus)
  if (!list.length) return NO_CHIEF
  return {
    raidCount: Math.max(...list.map(item => item.raidCount)),
    plunder: Math.max(...list.map(item => item.plunder)),
    wall: Math.max(...list.map(item => item.wall)),
    cooldown: Math.max(...list.map(item => item.cooldown)),
  }
}

// ── 임명 · 해임 ───────────────────────────────────────────────
/** 이 무장이 앉아 있는 자리 */
export function officeOf(state: Pick<StrategyState, 'offices'>, generalId: string): { post: OfficePost; slot: number } | null {
  const offices = state.offices
  if (!offices) return null
  if (offices.scholar === generalId) return { post: 'scholar', slot: 0 }
  const governor = (offices.governors ?? []).findIndex(post => post?.generalId === generalId)
  if (governor >= 0) return { post: 'governor', slot: governor }
  const chief = (offices.chiefs ?? []).findIndex(id => id === generalId)
  if (chief >= 0) return { post: 'chief', slot: chief }
  return null
}
function clearHolder(offices: OfficeState, generalId: string): void {
  if (offices.scholar === generalId) offices.scholar = null
  offices.governors = (offices.governors ?? []).map(post => post?.generalId === generalId ? null : post)
  offices.chiefs = (offices.chiefs ?? []).map(id => id === generalId ? null : id)
}
const postName = (post: OfficePost, slot: number) => post === 'scholar' ? '태학 박사' : `${post === 'governor' ? '태수' : '두목'} ${slot + 1}`
/** 태수가 없는 아군 도시(본성 먼저) */
export function freeGovernorCity(state: StrategyState, except = -1): City | undefined {
  const taken = new Set((state.offices?.governors ?? []).map((post, index) => index === except ? null : post?.cityId).filter(Boolean))
  const home: Record<string, string> = { 촉한: 'chengdu', 위나라: 'ye', 오나라: 'jianye' }
  const owned = state.cities.filter(city => city.owner === state.faction && !taken.has(city.id))
  return owned.find(city => city.id === home[state.faction]) ?? owned.sort((a, b) => b.level - a.level)[0]
}

export interface OfficeResult { ok: boolean; message: string }
/** 임명: 다른 자리에 있던 무장이면 옮긴다. 태수는 맡은 도시가 없으면 빈 아군 도시를 맡긴다 */
export function appointOffice(state: StrategyState, post: OfficePost, slot: number, generalId: string, cityId?: string): OfficeResult {
  const general = state.generals.find(item => item.id === generalId)
  if (!general) return { ok: false, message: '무장을 찾을 수 없습니다.' }
  if (deployedGeneralIds(state).has(generalId)) return { ok: false, message: `${general.name}은(는) 출전 편성(1 · 2 · 3군)에 있어 관직에 앉힐 수 없습니다.` }
  const index = post === 'scholar' ? 0 : Math.trunc(slot)
  if (post !== 'scholar') {
    if (post === 'governor' && isWanderer(state)) return { ok: false, message: '재야는 다스리는 도시가 없어 태수 대신 두목을 둡니다.' }
    if (post === 'chief' && !isWanderer(state)) return { ok: false, message: '두목은 재야만 둘 수 있습니다.' }
    if (index < 0 || index >= officePostCount(state)) return { ok: false, message: `아직 열리지 않은 자리입니다. 인재 ${OFFICE_UNLOCK_TIERS[Math.max(0, index - 1)] ?? 6}단계 연구를 마치면 열립니다.` }
  }
  const previous = state.offices
  const offices: OfficeState = state.offices = { scholar: previous?.scholar ?? null, governors: [...(previous?.governors ?? [])], chiefs: [...(previous?.chiefs ?? [])] }
  const before = officeOf(state, generalId)
  if (before && before.post === post && before.slot === index && !(post === 'governor' && cityId && offices.governors?.[index]?.cityId !== cityId)) { state.offices = previous; return { ok: false, message: `${general.name}은(는) 이미 ${postName(post, index)}입니다.` } }
  clearHolder(offices, generalId)
  if (post === 'scholar') offices.scholar = generalId
  else if (post === 'chief') { while ((offices.chiefs ??= []).length <= index) offices.chiefs.push(null); offices.chiefs[index] = generalId }
  else {
    const governors = offices.governors ??= []
    while (governors.length <= index) governors.push(null)
    // 이 자리가 맡던 도시(다른 무장이 있었으면 그 무장과 바꾼다) → 고른 도시 → 태수가 없는 아군 도시
    const current = governors[index]?.cityId
    const want = cityId ?? current ?? freeGovernorCity(state, index)?.id
    const city = want ? state.cities.find(item => item.id === want) : undefined
    if (!city || city.owner !== state.faction) { state.offices = previous; return { ok: false, message: '태수를 보낼 아군 도시가 없습니다(도시 하나에 태수 한 명).' } }
    const other = governors.findIndex((item, i) => i !== index && item?.cityId === city.id)
    if (other >= 0) {
      // 다른 자리가 맡은 도시: 이 자리의 도시와 서로 바꾼다(이 자리에 도시가 없으면 고를 수 없다)
      if (!current) { state.offices = previous; return { ok: false, message: `${city.name}은(는) 태수 ${other + 1}이(가) 맡고 있습니다.` } }
      governors[other] = { ...governors[other]!, cityId: current }
    }
    governors[index] = { generalId, cityId: city.id }
    return { ok: true, message: `${city.name} 태수에 ${general.name}을(를) 임명했습니다.${before ? ` (${postName(before.post, before.slot)}에서 옮김)` : ''}` }
  }
  return { ok: true, message: `${postName(post, index)}에 ${general.name}을(를) 임명했습니다.${before ? ` (${postName(before.post, before.slot)}에서 옮김)` : ''}` }
}

/** 태수가 맡을 도시 바꾸기(다른 태수가 맡은 도시면 서로 바꾼다) */
export function setGovernorCity(state: StrategyState, slot: number, cityId: string): OfficeResult {
  const city = state.cities.find(item => item.id === cityId)
  if (!city || city.owner !== state.faction) return { ok: false, message: '아군 도시만 맡길 수 있습니다.' }
  const posts = [...(state.offices?.governors ?? [])]
  const post = posts[slot]
  if (!post) return { ok: false, message: '먼저 태수를 임명하십시오.' }
  if (post.cityId === cityId) return { ok: false, message: `이미 ${city.name}을(를) 맡고 있습니다.` }
  const other = posts.findIndex((item, index) => index !== slot && item?.cityId === cityId)
  if (other >= 0 && posts[other]) posts[other] = { ...posts[other]!, cityId: post.cityId }
  posts[slot] = { ...post, cityId }
  state.offices = { ...state.offices, governors: posts }
  const general = state.generals.find(item => item.id === post.generalId)
  return { ok: true, message: `${general?.name ?? '태수'}이(가) 이제 ${city.name}을(를) 맡습니다.` }
}

/** 해임 */
export function dismissOffice(state: StrategyState, post: OfficePost, slot: number): OfficeResult {
  const offices = state.offices
  const id = !offices ? null : post === 'scholar' ? offices.scholar : post === 'governor' ? offices.governors?.[slot]?.generalId : offices.chiefs?.[slot]
  if (!offices || !id) return { ok: false, message: '비어 있는 자리입니다.' }
  clearHolder(offices, id)
  const general = state.generals.find(item => item.id === id)
  return { ok: true, message: `${general?.name ?? '무장'}을(를) ${postName(post, slot)}에서 해임했습니다.` }
}

/** 저장분 정리(모양이 다르면 버린다) */
export function sanitizeOffices(value: unknown): OfficeState | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const id = (item: unknown) => typeof item === 'string' && item.length > 0 && item.length <= 64 ? item : null
  const governors = Array.isArray(raw.governors) ? raw.governors.slice(0, OFFICE_MAX_POSTS).map(item => {
    const post = item as Partial<GovernorPost> | null
    const generalId = id(post?.generalId), cityId = id(post?.cityId)
    return generalId && cityId ? { generalId, cityId } : null
  }) : []
  const chiefs = Array.isArray(raw.chiefs) ? raw.chiefs.slice(0, OFFICE_MAX_POSTS).map(id) : []
  const out: OfficeState = { scholar: id(raw.scholar), governors, chiefs }
  // 한 무장은 한 자리만
  const seen = new Set<string>()
  const keep = (generalId: string | null | undefined) => { if (!generalId || seen.has(generalId)) return false; seen.add(generalId); return true }
  if (!keep(out.scholar)) out.scholar = null
  out.governors = out.governors!.map(post => post && keep(post.generalId) ? post : null)
  out.chiefs = out.chiefs!.map(item => keep(item) ? item : null)
  return out
}

/** 비어 있지 않으면 true(저장에 넣을지) */
export function hasOffices(offices: OfficeState | undefined): boolean {
  return Boolean(offices && (offices.scholar || offices.governors?.some(Boolean) || offices.chiefs?.some(Boolean)))
}

/** 화면용: 0.123 → '12.3%' */
export function percentText(value: number): string {
  return `${(Math.round(value * 1000) / 10).toString()}%`
}

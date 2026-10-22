import { assetUrl } from '../asset-url'
import { OFFICIAL_LAUNCH, isLaunched } from '../../server/launch.mjs'
import { BATTLE_VIEW_ARROW, BATTLE_VIEW_GRID, BATTLE_VIEW_HINT, BATTLE_VIEW_LABEL, BATTLE_VIEWS, loadBattleView, nextBattleView, saveBattleView, type BattleView } from '../game/battle-view'
import { SQUAD_LABELS, squadIds, squadOf, squadPower } from '../game/squads'
import { raidBossDeck, raidBossFor } from '../game/raid'
import { RAID_REWARDS, raidWeekKey } from '../../server/raid.mjs'
import { EQUIPMENT_PRESET_SLOTS, EQUIPMENT_STORAGE_WARN, bulkDismantlePreview, dismantlableCount, dismantleYield, equipmentOwners, presetItemIds } from '../game/equipment-manage'
import { TUTORIAL_REWARD, TUTORIAL_STEPS, nextTutorialStep, tutorialFinished, DAILY_BONUS, DAILY_BONUS_ID, MISSIONS, dailyBonusReady, ensureMissions, missionStatus, rewardText, type MissionDef } from '../game/missions'
import { packageBonus, shopNeeds, shopPackages, type ShopPackage, type ShopResource } from '../game/shop'
import { effectsSetting, muteSetting, musicSetting, qualitySetting, setEffectsSetting, setMusicSetting, setMuteSetting, setQualitySetting, setSfxSetting, sfxSetting, type EffectsSetting, type QualitySetting, type SoundLevel } from '../game/settings'
import { sound } from '../engine/sound'
import { branchActive, researchBranchesFor, canPay, activeResearch, formatDuration, researchStatus, researchSummary, rushCost } from '../game/research'
import { ensureEquipmentState, DRAW_LOG_LIMIT, EARLY_RECRUIT_PULLS, isEventGeneral, currentCityGarrison, codexOrder, deployedIds, isFemaleGeneral, equipmentDrawCost, plunderTake, wandererDailyPlunder, factionInfluence, underdogBuff, type CityFaction, statsAt, STARTER_PACKS, starterPackBought, type StarterPack, LEVEL_RESET_GOLD, levelResetRefund, growthWeights, affordableUpgrades, upgradeCost, templateGeneral, MYTHIC_FRAGMENT_COST, dayKey, CITY_ADJACENCY, FACTION_CAPITALS, homeCityId, isWanderer, wandererPlunderLeft, WANDERER_DAILY_PLUNDER, WANDERER_PLUNDER_RATE, FACTION_CHANGE_COOLDOWN_MS, RAZE_REBUILD_MS, LEGENDARY_SPECIALTY_LEVEL, trackGoldChange, GOLD_LOG_LIMIT, PASSES, PASS_PAYMENT_ENABLED, passUntil, passGoldClaimedToday, cityOccupation, cityCaptureBanned, OCCUPY_MS, EQUIPMENT_GRADE_META, EQUIPMENT_SET_META, EQUIPMENT_TYPE_META, FACTION_WAR_GOLD_REWARD, FACTION_WAR_HONOR_COST, GOLD_PACKAGES, GOLD_PURCHASE_ENABLED, GRADE_META, MYTHIC_EVENT_EQUIPMENT, MYTHIC_SHOP_EQUIPMENT, capitalFactionForCity, cityWallCapacity, conquestEligibility, duelAttemptsRemaining, RESOURCE_META, allGenerals, equipmentInventoryCount, equipmentSetCounts, equipmentSpecialty, skillDetail, type City, type CityBuilding, type Grade, type Equipment, type EquipmentGrade, type EquipmentType, type Faction, type General, type Role, type ResearchNode, type Section, type StrategyState, buildingCost, buildingDurationMs, cityIncome, combatPower, conquestCost, conquestPower, equipmentBonus, equipmentCost, recruitCost, equipmentValue, formatNumber, incomeCooldownRemaining, researchCost, skillPower, skillRank, skillUnlockLevel, MAX_GENERAL_LEVEL, isMaxLevel } from '../game/strategy'
import type { BattleOpponent, BattleSnapshot, UnitEffectChip } from '../game/arena'
import { ATTENDANCE_REWARDS, type AttendanceReward } from '../../server/attendance.mjs'
import { HARD_LEVEL_BONUS, HARD_RULE_INFO, SCENARIOS, hardClearReward, hardCleared, hardClearedCount, hardScenarioStars, hardUnlocked, scenarioEnemyIds, scenarioEnemyLevel, scenarioEnemyLevelFor, scenarioHardRule, scenarioStars, type ScenarioDifficulty } from '../game/scenarios'
import { matchup, type BattleResult } from '../game/battle-core'
import { BATTLE_EFFECTS, type BattleEffectId } from '../game/battle-effects'
import { fxGlyph, fxSeal } from './fx-icons'
import { BONDS, GENERAL_SKILLS, bondActive, skillDefFor, type SkillFx } from '../game/skills'
import { SEASON_COPIES, SEASON_WANDERER, SEASON_WANDERER_PLUNDER, seasonEndsAt, seasonGeneral, seasonKey, nextSeasonKey, seasonNumber, seasonStandings, type SeasonStanding } from '../../server/season.mjs'
import { emptyGuildUi, guildEmblem, royalBadge, guildRankingCard, guildSection, type GuildTab, type GuildUiState } from './guild-ui'
import { ARCHETYPES, ARCHETYPE_META, STYLE_BEATS, deckRanking, deckStyle, recommendDecks, styleEdge, type Archetype, type ComboAdvice } from '../game/formation-advice'

/** 덱 유형 상성 설명: 강한 두 유형 · 약한 두 유형 */
function styleCounters(style: Archetype): { strong: string; weak: string } {
  const label = (key: Archetype) => ARCHETYPE_META[key].label
  return { strong: STYLE_BEATS[style].map(label).join(', '), weak: ARCHETYPES.filter(key => STYLE_BEATS[key].includes(style)).map(label).join(', ') }
}
import { ensureIconSprite, icon, type IconName } from './icons'
import { playForgeCeremony, playSummonCeremony } from './summon-ceremony'

const POWER_MARK_KEY = 'cheonharo.powerMark'
import { TerritoryMapController, type MapCity } from './territory-map'
import { isEnglish, locale, setLang } from '../i18n/lang'
import { tr } from '../i18n/translate'
import { MENU_TOURS, maybeShowIntro } from './coach'

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character))
const equipmentImage = (type: EquipmentType): string => `/assets/equipment/${type}.webp`
/** 상점 구매 기록(이 기기 · 최근 10건) */
export function readPurchaseLog(): Array<{ text: string; at: number }> {
  try { const value = JSON.parse(localStorage.getItem('cheonharo.purchases') ?? '[]'); return Array.isArray(value) ? value.slice(0, 10) : [] } catch { return [] }
}
export function recordPurchase(text: string): void {
  try { localStorage.setItem('cheonharo.purchases', JSON.stringify([{ text, at: Date.now() }, ...readPurchaseLog()].slice(0, 10))) } catch { /* 저장 불가 */ }
}
const STAT_LABEL: Record<string, string> = { leadership: '통솔', martial: '무력', stratagem: '모략', speed: '속도' }
type RosterSort = 'power' | 'level' | 'grade' | 'name' | 'role'
type EquipmentSort = 'grade' | 'level' | 'name'
type FormationSort = 'power' | 'grade'

// 도시 위치: 삼국시대 치소의 실제 경위도를 지도 그림 좌표(%)로 옮긴 값.
// scripts/map/geo-fit.py가 해안·섬·강·분지 기준점 18곳으로 그림의 원근 왜곡을 맞춰 계산한다.
// 예외: 광한(xindu, 옛 이름 신도)은 실제로는 성도 바로 옆이라 성이 겹쳐, 성도 동남쪽으로 떼어 놓았다(손으로 고친 값).
// 예외: 남해(nanhai)는 그림의 주강 하구에, 건안(jianan)은 그림의 해안선에 맞춰 손으로 옮겼다(2026.10.17).
// 예외: 기춘(qichun) · 하간(hejian) · 예장(yuzhang)은 시상 · 발해와 겹쳐 조금 옮겼다(2026.10.17).
// 예외: 성이 겹쳐 이름이 가려지던 곳(운남·영창, 낭야, 수춘·합비·여강, 완성·신야·양양, 복양, 광릉)은 조금씩 떼어 놓았다(2026.10.17).
const CITY_MAP_POSITIONS: Readonly<Record<string, { x: number; y: number }>> = {
  chengdu: { x: 29.8, y: 44.7 }, xindu: { x: 33.6, y: 46.8 }, fucheng: { x: 31.8, y: 42.0 }, hanzhong: { x: 37.5, y: 37.2 }, badong: { x: 44.8, y: 48.2 },
  jianning: { x: 27.4, y: 65.8 }, yunnan: { x: 20.5, y: 62.5 }, yongchang: { x: 16.0, y: 64.8 }, jiaozhi: { x: 32.9, y: 85.7 }, nanhai: { x: 61.0, y: 81.5 }, shixing: { x: 59.1, y: 75.6 },
  guiyang: { x: 57.0, y: 72.2 }, lingling: { x: 52.3, y: 69.6 }, changsha: { x: 56.1, y: 63.1 }, wuling: { x: 51.9, y: 58.9 }, jiangling: { x: 53.2, y: 53.3 },
  yiling: { x: 50.3, y: 51.0 }, jiangxia: { x: 59.7, y: 53.1 }, xiangyang: { x: 53.8, y: 45.8 }, xinye: { x: 51.4, y: 41.8 }, wancheng: { x: 55.4, y: 38.6 },
  shangyong: { x: 46.6, y: 43.1 }, xuchang: { x: 58.0, y: 33.6 }, luoyang: { x: 53.8, y: 30.8 }, chenliu: { x: 60.8, y: 29.7 }, puyang: { x: 62.9, y: 26.0 },
  ye: { x: 60.2, y: 22.3 }, jinyang: { x: 52.9, y: 17.3 }, pingyuan: { x: 66.3, y: 19.9 }, bohai: { x: 67.1, y: 16.8 }, beihai: { x: 75.1, y: 22.0 }, langya: { x: 74.2, y: 28.2 },
  xiapi: { x: 71.5, y: 33.2 }, guangling: { x: 77.4, y: 38.6 }, jianye: { x: 74.3, y: 42.5 }, wujun: { x: 80.9, y: 45.7 }, kuaiji: { x: 81.5, y: 51.8 }, jianan: { x: 80.3, y: 69.6 }, yuzhang: { x: 63.6, y: 61.2 }, linhai: { x: 84.3, y: 57.3 }, qichun: { x: 62.4, y: 50.4 }, bajun: { x: 37.1, y: 51.6 }, baxi: { x: 35.3, y: 42.6 }, shangdang: { x: 55.3, y: 23.5 }, hejian: { x: 63.0, y: 14.0 },
  hefei: { x: 70.4, y: 42.4 }, shouchun: { x: 66.5, y: 40.0 }, lujiang: { x: 68.6, y: 47.8 }, jiujiang: { x: 65.4, y: 54.4 }, poyang: { x: 67.9, y: 56.6 },
  changan: { x: 41.9, y: 33.0 }, meixian: { x: 38.9, y: 32.6 }, anding: { x: 37.0, y: 26.1 }, tianshui: { x: 32.4, y: 29.0 }, wuwei: { x: 23.9, y: 14.4 },
}

// 후한 말 13주(州) 이름표 위치 (같은 방식으로 계산)
const MAP_REGION_LABELS: ReadonlyArray<{ id: string; name: string; hanja: string; x: number; y: number }> = [
  { id: 'liangzhou', name: '양주', hanja: '涼州', x: 22.2, y: 17.8 },
  { id: 'yongzhou', name: '옹주', hanja: '雍州', x: 38.2, y: 28.4 },
  { id: 'bingzhou', name: '병주', hanja: '幷州', x: 52.2, y: 14.5 },
  { id: 'jizhou', name: '기주', hanja: '冀州', x: 63.4, y: 17.7 },
  { id: 'qingzhou', name: '청주', hanja: '青州', x: 72.0, y: 21.2 },
  { id: 'sili', name: '사례', hanja: '司隷', x: 50.4, y: 30.3 },
  { id: 'yanzhou', name: '연주', hanja: '兗州', x: 65.8, y: 26.1 },
  { id: 'yuzhou', name: '예주', hanja: '豫州', x: 61.6, y: 35.6 },
  { id: 'xuzhou', name: '서주', hanja: '徐州', x: 73.6, y: 34.0 },
  { id: 'yangzhou', name: '양주', hanja: '揚州', x: 72.1, y: 49.9 },
  { id: 'jingzhou', name: '형주', hanja: '荊州', x: 52.1, y: 56.5 },
  { id: 'yizhou', name: '익주', hanja: '益州', x: 32.6, y: 52.4 },
  { id: 'jiaozhou', name: '교주', hanja: '交州', x: 48.1, y: 81.0 },
]

/** 휴대폰 하단 탭에 늘 보이는 메뉴(나머지는 ‘더보기’) */
const MOBILE_TABS: Section[] = ['overview', 'roster', 'formation', 'recruit', 'battle']
/**
 * 가로 휴대폰(모바일 게임형) 화면 묶음: 본영의 붉은 메뉴로 들어간 화면은 같은 묶음 화면끼리 위쪽 탭으로 오가고,
 * 왼쪽 위 ‹ 본영 으로 돌아간다.
 */
interface NavHub { id: string; ko: string; en: string; icon: IconName; sections: Section[] }
const NAV_HUBS: NavHub[] = [
  { id: 'home', ko: '본영', en: 'Base', icon: 'overview', sections: ['overview'] },
  { id: 'generals', ko: '무장', en: 'Generals', icon: 'roster', sections: ['roster', 'formation', 'equipment', 'codex'] },
  { id: 'recruit', ko: '모집', en: 'Recruit', icon: 'recruit', sections: ['recruit', 'shop'] },
  { id: 'land', ko: '영토', en: 'Territory', icon: 'territory', sections: ['territory', 'research'] },
  { id: 'war', ko: '전투', en: 'Battle', icon: 'battle', sections: ['battle', 'duel', 'raid', 'rank'] },
  { id: 'social', ko: '소통', en: 'Social', icon: 'guild', sections: ['guild', 'board'] },
  { id: 'more', ko: '설정', en: 'More', icon: 'account', sections: ['account', 'updates', 'admin'] },
]
/** 가로 휴대폰(모바일 게임형 화면) 조건: CSS의 mobile-landscape.css와 같다 */
const PHONE_LANDSCAPE = '(orientation: landscape) and (max-height: 500px)'
const isPhoneLandscape = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(PHONE_LANDSCAPE).matches)
/** 가로 휴대폰 본영: 화면 아래쪽 메뉴 바(12칸) */
const LOBBY_MENU: Array<[Section, IconName, string, string]> = [
  ['formation', 'formation', '편성', 'Lineup'], ['roster', 'roster', '무장', 'Generals'], ['equipment', 'equipment', '장비', 'Gear'], ['recruit', 'recruit', '모집', 'Recruit'],
  ['research', 'research', '연구', 'Research'], ['territory', 'territory', '영토', 'Territory'], ['duel', 'duel', '대련', 'Duel'], ['raid', 'raid', '레이드', 'Raid'],
  ['guild', 'guild', '연맹', 'Guild'], ['board', 'board', '게시판', 'Board'], ['codex', 'codex', '도감', 'Codex'], ['shop', 'shop', '상점', 'Shop'],
]
const CALENDAR_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="8" width="20" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 13.5h20M11 5.5v5M21 5.5v5M11.5 19l3 3 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const HUB_TAB_NAMES: Partial<Record<Section, [string, string]>> = { roster: ['보유', 'Owned'], battle: ['시나리오', 'Scenario'] }
const hubOf = (section: Section): NavHub => NAV_HUBS.find(hub => hub.sections.includes(section)) ?? NAV_HUBS[0]
/** 휴대폰에서 쓰는 짧은 메뉴 이름(한·영을 직접 고른다: ‘장비’ 같은 말이 사전에서 인물 이름으로 바뀌지 않게) */
const SHORT_NAV: Record<string, [string, string]> = {
  overview: ['본영', 'Base'], roster: ['무장', 'Generals'], codex: ['도감', 'Codex'], formation: ['편성', 'Lineup'], recruit: ['모집', 'Recruit'], equipment: ['장비', 'Gear'], research: ['연구', 'Research'], territory: ['영토', 'Territory'],
  battle: ['전투', 'Battle'], duel: ['대련', 'Duel'], raid: ['레이드', 'Raid'], rank: ['랭킹', 'Ranks'], board: ['게시판', 'Board'], guild: ['연맹', 'Guild'], shop: ['상점', 'Shop'], updates: ['소식', 'News'], account: ['계정', 'Account'], admin: ['관리', 'Admin'], balance: ['밸런스', 'Balance'],
}
/** 무장 사진 테두리·카드 강조색: 무장마다 다르던 색 대신 등급색으로 통일 */
const gradeColor = (general: Pick<General, 'grade' | 'accent'>) => GRADE_META[general.grade]?.color ?? general.accent
/** 출전 편성 카드의 등급 · 레벨 · 성급 표시 */
// 원본이 이미 밝은 무장 사진(평균 밝기 110 이상): 화면 밝기 보정을 걸면 하얗게 날아가므로 보정하지 않는다.
const BRIGHT_PORTRAITS = new Set(['diao-chan', 'gongsun-zan', 'li-dian', 'pang-de'])
const formationTags = (general: Pick<General, 'grade' | 'level' | 'stars'>) => `<span class="formation-tags"><i class="formation-grade" style="--grade:${GRADE_META[general.grade]?.color ?? '#a9b1b8'}">${general.grade}등급 ${GRADE_META[general.grade]?.label ?? ''}</i><i class="formation-level">Lv.${general.level}</i><i class="formation-stars">${'★'.repeat(Math.max(1, Math.min(5, general.stars)))}</i></span>`
const shortNavLabel = (key: string) => { const pair = SHORT_NAV[key]; return pair ? `<span class="nav-short" data-no-tr>${isEnglish() ? pair[1] : pair[0]}</span>` : '' }

/** 사용자가 쓴 글·이름: 번역하지 않는다 */
const ugc = (text: string) => `<span data-no-tr>${escapeHtml(text)}</span>`

/** 상단 재화: 10만 이상은 만·억 단위로 짧게(정확한 값은 마우스를 올리면 보인다) */
function compactNumber(value: number): string {
  const n = Math.floor(value)
  if (n < 100_000) return formatNumber(n)
  if (isEnglish()) return n < 1_000_000 ? `${Math.floor(n / 1000)}K` : `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`
  if (n < 100_000_000) return `${(n / 10_000).toFixed(n < 1_000_000 ? 1 : 0).replace(/\.0$/, '')}만`
  return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`
}

/** 로그인 버튼 안쪽: 이름은 길면 말줄임, 로그아웃은 항상 보인다 */
function authButtonInner(auth: { status: string; name?: string | null }): string {
  if (auth.status === 'authenticated') return `<span class="auth-name"${auth.name ? ' data-no-tr' : ''}>${escapeHtml(auth.name ?? '장군')}</span><span class="auth-out">로그아웃</span>`
  return auth.status === 'offline' ? '오프라인 모드' : 'Manus 로그인'
}

export interface LuoyangHistory {
  weeks: Array<{ weekKey: string; winnerFaction: Faction | null }>
  factions: Array<{ faction: Faction; damage: number; battles: number }>
  top: Array<{ displayName: string; faction: string; totalDamage: number }>
}

export interface AuthView {
  status: 'authenticated' | 'logged_out' | 'offline'
  name: string | null
}

export interface AccountView {
  id: number
  openId: string
  name: string
  email: string
  loginMethod: string
  role: string
  createdAt: string | Date
  updatedAt: string | Date
  lastSignedIn: string | Date
  /** 무장 최고 레벨(관리자 계정 목록) */
  maxLevel?: number
  /** 운영자(관리자 권한) 계정: 랭킹 · 영토전에 반영되지 않는다 */
  operator?: boolean
}

/** 관리자가 고칠 수 있는 숫자 칸 */
export const ADMIN_GAME_FIELDS = [
  ['재화', [['honor', '옥패'], ['silver', '은전'], ['gold', '금화'], ['manuals', '병서']]],
  ['신화 장비', [['mythicFragments', '신화 조각'], ['mythicStones', '낙양 강화석']]],
  ['전적 · 세력전', [['wins', '승리'], ['battleScore', '최고 점수'], ['factionWarScore', '세력전 공헌도'], ['luoyangBoxes', '낙양 상자']]],
  ['내정 자원', [['grain', '식량'], ['wood', '목재'], ['iron', '철'], ['influence', '영향력']]],
] as const
export type AdminGameField = typeof ADMIN_GAME_FIELDS[number][1][number][0]
export type AdminGameEdit = { userId: number; faction?: '촉한' | '위나라' | '오나라' } & Partial<Record<AdminGameField, number>>

export interface GameAccountView extends AccountView {
  game: {
    userId: number
    honor: number
    silver: number
    gold: number
    manuals: number
    wins: number
    battleScore: number
    grain: number
    wood: number
    iron: number
    influence: number
    mythicFragments?: number
    mythicStones?: number
    factionWarScore?: number
    luoyangBoxes?: number
    faction?: '촉한' | '위나라' | '오나라'
    factionChosen?: boolean
    generalCount?: number
    maxLevel?: number
    scenarioCleared?: number
    hardCleared?: number
    updatedAt: string | Date
  }
}

export interface RankEntry {
  rank: number
  displayName: string
  score: number
}

export interface BoardPost {
  id: number
  board: '전체' | Faction | '연맹'
  title: string
  content: string
  authorName: string
  authorFaction: Faction
  createdAt: string | Date
  canDelete?: boolean
}

export interface AdminBoardState {
  postingEnabled: boolean
  posts: BoardPost[]
}
export interface CityDamageRanking {
  userId: number
  faction: Faction
  displayName: string
  totalDamage: number
  battleCount: number
  updatedAt: string | Date
  guildName?: string | null
}

export interface RaidInfoView {
  weekKey: string
  bossLevel: number
  registered: number
  participants: number
  attemptsLeft: number
  dailyLimit: number
  totalDamage: number
  bestDamage: number
  attempts: number
  rank: number
  lastWeek: { weekKey: string; totalDamage: number; rank: number; reward: { gold: number; stones: number; honor?: number }; claimed: boolean } | null
  /** 게스트·서버 연결 실패: 연습 모드 */
  offline: boolean
  resetIn: number
}
export interface RaidView {
  loading: boolean
  info: RaidInfoView | null
  ranking: Array<{ rank: number; displayName: string; guildName?: string | null; totalDamage: number; attempts: number; isMe: boolean }>
  message: string
}

export interface DuelOpponent {
  id: string
  displayName: string
  score: number
  isDummy: boolean
  /** 덱 전력(server/duel-match.mjs) */
  power?: number
  /** 난이도(승리 보상: 쉬움 1 · 보통 2 · 어려움 3 조각) */
  tier?: 'easy' | 'normal' | 'hard'
  deck?: General[]
  /** 훈련 상대 설명(난이도 · 평균 레벨) */
  note?: string
  /** 상대의 연맹 이름 · 대련 기술 보너스 */
  guildName?: string | null
  guildDuel?: number
}

export interface StrategyUiCallbacks {
  onSection: (section: Section) => void
  onRecruit: (count: number) => void
  onUpgrade: (id: string) => void
  onSkill: (id: string) => void
  onFormation: (id: string) => void
  onFormationSlot: (id: string, slot: number) => void
  onUpgradeMany: (id: string) => void
  /** 레벨 초기화(금화 10 · 재화 80% 반환) */
  onLevelReset: (id: string) => void
  onAutoFormation: (withEquipment: boolean) => void
  onAutoEquip: () => void
  /** 추천 덱으로 편성(좌·중·우 순서) */
  onApplyCombo: (ids: string[], squad?: number) => void
  onEquipmentDraw: (count: number) => void
  onEquipmentEnhance: (id: string) => void
  onEquipmentEquip: (generalId: string, itemId: string) => void
  onEquipmentUnequip: (generalId: string, type: EquipmentType) => void
  onEquipmentLock: (id: string) => void
  onSquadToggle: (squad: number, id: string) => void
  onRaidStart: () => void
  onRaidRefresh: () => void
  onRaidClaim: () => void
  onSquadAuto: (squad: number, withEquipment: boolean) => void
  onSquadEquip: (squad: number) => void
  onSquadSwap: (squad: number) => void
  onEquipmentDismantle: (id: string, count: number) => void
  onEquipmentBulkDismantle: (grade: 'normal' | 'rare' | 'unique') => void
  onEquipmentPreset: (generalId: string, slot: number, mode: 'save' | 'apply') => void
  onEquipmentSelectGeneral: (id: string) => void
  onCitySelect: (id: string) => void
  onCityDamageRankingRefresh: (cityId: string) => void
  onTerritoryRefresh: () => void
  onConquest: (id: string) => void
  onDefense: (id: string) => void
  onGarrisonDeploy: (id: string) => void
  onFactionBattle: (id: string) => void
  onCollectIncome: () => void
  onBuildingUpgrade: (cityId: string, buildingId: string) => void
  onBuildingRush: (cityId: string) => void
  onBuildingCancel: (cityId: string) => void
  onResearch: (id: string) => void
  onResearchCancel: () => void
  onMissionClaim: (id: string) => void
  /** 처음 시작 안내: 보상 받기(false) · 닫기(true) */
  onTutorial: (skip: boolean) => void
  /** 전투 효과 설정이 바뀜 */
  onEffectsSetting?: () => void
  onResearchRush: () => void
  onBattleStart: () => void
  onScenarioStart: (id: string, difficulty?: ScenarioDifficulty) => void
  onBattleMove: (index: number) => void
  onBattleSkill: (index?: number) => void
  onBattleSpeed: (speed: number) => void
  onBattleView: (view: BattleView) => void
  onBattleAuto: (on: boolean) => void
  onBattleAutoSkill: (on: boolean) => void
  onBattlePause: (on: boolean) => void
  /** 전투 규칙 그림 설명 열기 */
  onBattleGuide: () => void
  /** 따라하기 안내를 처음부터 다시 */
  onCoachReset: () => void
  /** 이 기기의 게스트 기록을 지우고 처음부터 */
  onGuestReset: () => void
  onBattleStop: () => void
  onBattleTactic: (tactic: 'guard' | 'feint' | 'charge') => void
  onDuelRefresh: () => void
  onDuelStart: (opponentId: string) => void
  onFactionSelect: (faction: Faction | 'auto') => void
  /** 진영 변경(30일에 한 번) */
  onFactionChange: (faction: Faction | 'realm') => void
  onGuestLogin: () => void
  /** 서버 없이 이 기기에만 저장하는 게스트(서버에 연결할 수 없을 때) */
  onLocalGuestLogin: () => void
  onLogin: () => void
  onLogout: () => void
  onAccountRefresh: () => void
  onAccountSave: (name: string) => void
  onRankRefresh: () => void
  onBoardRefresh: (board: BoardPost['board']) => void
  onBoardPost: (board: BoardPost['board'], title: string, content: string, password: string) => void
  onBoardDelete: (id: number, password: string) => void
  /** 연맹: 동작 이름과 버튼 · 입력 값 */
  onGuild: (action: string, data: Record<string, string>) => void
  onStore: () => void
  onShopPurchase: (equipmentId: string) => void
  onCashShopPurchase: (productId: string) => void
  /** 신규유저 패키지(계정당 1회) */
  onStarterPack: (id: string) => void
  onPassBuy: (id: string) => void
  onHonorShopPurchase: (packageId: string) => void
  onGoldPurchase: (packageId: string) => void
  onAdminAction: (action: string) => void
  onAdminAccountsRefresh: (search?: string) => void
  onAdminRoleChange: (id: number, role: 'user' | 'admin') => void
  onAdminRename: (id: number, name: string) => void
  onAdminDelete: (id: number) => void
  onAdminGameDataRefresh: () => void
  onAdminGameDataSave: (data: AdminGameEdit) => void
  onAdminBoardRefresh: () => void
  onAdminBoardPostingToggle: (enabled: boolean) => void
  onAdminBoardDelete: (id: number) => void
}

type CityFilter = 'all' | 'front' | 'ally' | 'enemy' | 'neutral'
export interface AdminBotRow {
  userId: number; name: string; faction: string | null; score: number; limitHits: number; banUntil: number
  today: { sieges: number; defenses: number; capHits: number; badTickets: number; overLimit: number; activeHours: number } | null
  yesterday: { sieges: number; defenses: number; capHits: number; badTickets: number; overLimit: number; activeHours: number } | null
}
export interface SeasonInfo {
  key: string; number: number; endsAt: number; general: string; nextGeneral: string; standings: SeasonStanding[]; faction: string | null; battles: number; plunder: number
  last: { key: string; number: number; general: string; standings: SeasonStanding[]; copies: number; claimed: boolean } | null
  /** 이번 시즌에 서버가 다시 나눈 진영(2026.10.22) */
  assigned?: { faction: string; from: string } | null
  history: Array<{ key: string; number: number; general: string; standings: SeasonStanding[] }>
}

/** 메뉴 설명 창에 넣을 주요 기능: 따라하기 안내(MENU_TOURS) 뒤에 붙인다 */
const MENU_GUIDE_EXTRA: Record<string, Array<{ title: string; body: string }>> = {
  roster: [
    { title: '능력치', body: '카드의 통솔 · 무력 · 모략 · 속도를 누르면 각 능력치가 전투에서 하는 일을 볼 수 있습니다. 4 · 5등급 무장 카드는 테두리가 빛납니다.' },
  ],
  equipment: [
    { title: '강화 · 신화장비', body: '장비는 은전과 철로 강화합니다. 전설 장비는 Lv.15부터 특기가 붙고, 신화장비는 낙양 강화석 1개로 한 번 강화합니다.' },
  ],
  territory: [
    { title: '천하 시즌', body: '한 달이 한 시즌입니다. 매월 1일 0시에 진영 순위(가진 도시의 등급 합, 수도 제외)를 정산해 1위 진영은 이달의 로테이션 무장(좌자 → 우길 → 화타 → 남화노선 → 사마휘) 2장, 2 · 3위 진영은 1장을 받습니다. 시즌 중 영토전을 1회 이상 해야 받고, 재야는 약탈 10만 이상이면 1장입니다. 새 시즌에는 수도를 뺀 모든 도시가 처음 상태로 돌아가고 무장 · 레벨 · 장비는 그대로입니다.' },
    { title: '공정한 영토전', body: '자동 진행 프로그램을 막기 위해 공성은 하루 200회까지 영토 · 시즌 · 약탈에 반영되고, 공성 · 수비 기록은 몇 초 간격을 두고 받습니다. 공성 한 번의 피해에는 정상 플레이로 낼 수 있는 상한이 있습니다.' },
    { title: '임시 점령', body: '성벽과 수비병을 무너뜨리고 최종 세력전에서 이기면 10분 동안 임시 점령합니다(처음 1분은 수비병을 세울 시간). 끝까지 지키면 최종 점령하고, 그 뒤 1시간 동안은 아무도 공성할 수 없습니다.' },
    { title: '도시 연맹 · 왕', body: '최종 점령한 지휘관의 연맹이 그 도시의 연맹이 됩니다. 매주 월요일 0시에 진영마다 연맹이 가진 도시의 등급 합(도시 1~5등급)이 가장 큰 연맹이 왕 연맹이 됩니다. 수도만 남아 도시를 가진 연맹이 없으면 지난 주 적 · 중립 성벽을 가장 많이 깎은 연맹이 왕 연맹이 됩니다(수도는 점령할 수 없어 세지 않습니다).' },
  ],
  battle: [
    { title: '이기는 법', body: '적 병력을 모두 쓰러뜨리면 이깁니다. 제한 시간은 120초이고, 적 공격은 40초마다 거세집니다(서전 → 격전 → 결전). 사기가 떨어진 편은 공격 · 방어가 약해집니다.' },
  ],
  shop: [
    { title: '옥패 · 재화 · 정액권', body: '금화로 옥패 묶음과 재화를 삽니다. 정액권(일주일 · 한 달 금화, 자동 전투)과 신화장비 조각 상점도 여기 있습니다.' },
  ],
  codex: [
    { title: '무장 도감', body: '게임에 나오는 모든 무장을 등급 · 병과별로 봅니다. 아직 없는 무장도 능력치와 스킬을 미리 확인할 수 있습니다.' },
    { title: '스킬 상세', body: '무장을 펼치면 스킬 효과 · 쿨다운 · 패시브 · 각성을 볼 수 있고, 버프 · 디버프를 누르면 효과가 나옵니다.' },
  ],
  duel: [
    { title: '유저 대련', body: '다른 지휘관이 저장한 덱과 겨룹니다. 하루 5회까지 도전할 수 있습니다.' },
    { title: '난이도와 보상', body: '상대 덱 전력에 따라 쉬움 · 보통 · 어려움으로 나뉘고, 이기면 신화장비 조각을 쉬움 1 · 보통 2 · 어려움 3개 받습니다.' },
    { title: '훈련 상대', body: '덱을 저장한 지휘관이 20명보다 적으면 내 덱 전력에 맞춘 훈련 상대 세 팀과 겨룹니다.' },
  ],
  raid: [
    { title: '주간 레이드', body: '매주 바뀌는 무한 병력 보스에게 1 · 2 · 3군을 차례로 90초씩 보내 준 피해를 합칩니다. 하루 3번 도전할 수 있고, 2 · 3군은 출전 편성에서 꾸립니다.' },
    { title: '순위와 보상', body: '매주 월요일 0시에 순위가 정해집니다. 1위 금화 50 · 강화석 2개, 2위 40 · 강화석 1개, 3위 30 · 강화석 1개, 4~10위 20, 11~50위 12, 51~100위 8, 101~300위 옥패 1,000, 301위부터 옥패 500입니다. 주가 바뀌면 보스와 기록이 새로 시작합니다.' },
  ],
  rank: [
    { title: '천하 랭킹', body: '전투 점수가 높은 지휘관 순위입니다. 로그인한 계정의 기록이 올라갑니다.' },
    { title: '연맹 순위 · 칭호', body: '아래에서 연맹 순위(레벨 · 주간 기여 · 주간 레이드)를 봅니다. 이번 주 왕 · 황제는 이름 옆에 표시가 붙습니다.' },
  ],
  guild: [
    { title: '연맹', body: '같은 진영 지휘관끼리 연맹을 만들거나 가입합니다(만들기: 금화 50개 · 무장 최고 레벨 Lv.15). 인원은 Lv.1 20명에서 Lv.10 38명까지 늘어납니다.' },
    { title: '기여와 레벨', body: '헌납(은전 · 자원 · 금화, 하루 한 번씩)과 공성 · 수비 · 레이드 · 출석으로 기여 포인트와 연맹 경험치가 쌓입니다.' },
    { title: '연맹 기술', body: '연맹 자금으로 둔전 · 공성 기계 · 성곽 수비 · 토벌 · 축성 · 군량 보급 · 무예 수련을 연구하면 연맹원 모두에게 적용됩니다.' },
    { title: '상점 · 공동 공성', body: '기여 포인트로 연맹 상점을 이용하고, 매주 정하는 목표 도시를 함께 공성해 점령하면 연맹원 모두가 보상을 받습니다.' },
    { title: '왕궁', body: '매주 월요일 0시에 진영마다 연맹이 가진 도시의 등급 합이 가장 큰 연맹이 왕 연맹, 그 연맹장이 왕이 됩니다. 도시를 가진 연맹이 없는 진영(수도만 남은 진영)은 지난 주 공성 1위 연맹, 재야는 낙양 점령 연맹 또는 지난 주 약탈 1위 연맹(녹림왕)이 왕 연맹입니다. 낙양 주인 진영의 왕은 황제가 됩니다. 왕 연맹원은 영토전 +5%와 왕궁 상점을 쓰고, 왕은 주 30 · 황제는 주 50 금화를 받습니다.' },
    { title: '소통 · 순위', body: '연맹 채팅 · 연맹 게시판 · 활동 기록이 있고, 천하 랭킹에서 연맹 순위(레벨 · 주간 기여 · 주간 레이드)를 봅니다.' },
  ],
  board: [
    { title: '진영 게시판', body: '전체 게시판과 내 진영 게시판에 글을 쓸 수 있습니다. 글을 쓸 때 정한 비밀번호로 지울 수 있습니다.' },
  ],
  updates: [
    { title: '업데이트 기록', body: '지금까지 바뀐 내용을 날짜별로 정리해 둡니다. 새 기록이 있으면 메뉴에 표시가 붙습니다.' },
  ],
  account: [
    { title: '계정', body: '로그인 상태와 계정 정보를 봅니다.' },
    { title: '이 기기 설정', body: '언어 · 배경음악 · 효과음 · 그래픽 품질 · 전투 효과를 바꾸고, 따라하기 안내를 다시 볼 수 있습니다.' },
    { title: '진영 변경', body: '위 · 촉 · 오 사이의 진영은 시즌마다 서버가 연맹 단위로 고르게 나눕니다. 재야로 옮기거나 재야에서 삼국으로 돌아오는 것만 30일에 한 번 할 수 있습니다(삼국으로 오면 가장 약한 진영에 배정).' },
  ],
}

/** 보유 무장 능력치 설명(누르면 펼쳐짐) — battle-core.ts의 계산과 맞춘다 */
const STAT_INFO = {
  leadership: { title: '통솔', body: '최대 병력이 늘어나고 일반 공격에도 조금 더해집니다. 통솔 · 수호 · 치유형 스킬의 위력과 통솔형 무장의 일반 공격은 통솔로 정해집니다. 장비로 오른 통솔은 방어력도 높입니다.' },
  martial: { title: '무력', body: '돌격 · 사격 · 수호형 무장의 일반 공격 피해가 커지고, 돌격 · 사격형 스킬의 위력이 무력으로 정해집니다. 장비로 오른 무력은 공격력도 높입니다.' },
  stratagem: { title: '모략', body: '계략 · 치유형 무장의 일반 공격 피해가 커지고, 계략형 스킬(화계 · 혼란 같은 디버프)의 위력이 모략으로 정해집니다.' },
  speed: { title: '속도', body: '일반 공격 간격이 짧아집니다(빠를수록 줄어드는 폭은 조금씩 작아짐). 전장 평균보다 빠르면 전투 시작 때 첫 스킬이 더 빨리 준비됩니다.' },
} as const

export class StrategyUI {
  private readonly root: HTMLElement
  private readonly callbacks: StrategyUiCallbacks
  private ranks: RankEntry[] = []
  private boardPosts: BoardPost[] = []
  private boardTab: BoardPost['board'] = '전체'
  /** 연맹 화면 상태 */
  private guildUi: GuildUiState = emptyGuildUi()
  private duelOpponents: DuelOpponent[] = []
  private raidView: RaidView = { loading: false, info: null, ranking: [], message: '' }
  private duelMyPower = 0
  private latestBattle: BattleSnapshot | null = null
  private unitLocator: ((side: 'player' | 'enemy', lane: number) => { x: number; y: number } | null) | null = null
  private recruitAnimationActive = false
  private auth: AuthView = { status: 'logged_out', name: null }
  private account: AccountView | null = null
  private adminTab = 'overview'
  private adminDeckStyle: Archetype | 'all' = 'all'
  private adminPublished = true
  private adminAccounts: AccountView[] = []
  private adminAccountsError: string | null = null
  private adminAccountSearch = ''
  /** 관리자 계정 · 게임 데이터 목록 정렬 */
  private adminSort: 'id' | 'level-desc' | 'level-asc' | 'recent' = 'id'
  private adminGameAccounts: GameAccountView[] = []
  private adminGameDataError: string | null = null
  private adminGameSearch = ''
  private adminBoard: AdminBoardState = { postingEnabled: true, posts: [] }
  private cityDamageRankings: CityDamageRanking[] = []
  private luoyangHistory: LuoyangHistory | null = null
  /** 처음 시작 안내: 다음에 가야 할 메뉴(반짝임) */
  private coachSection: string | null = null
  private cityDamageRankingCityId = ''
  private rosterSort: RosterSort = 'power'
  private rosterSortDescending = true
  private rosterFilter: 'all' | '5' | '4' | Role = 'all'
  private codexFilter: 'all' | 'owned' | 'missing' | '5' | '4' | Role = 'all'
  private codexQuery = ''
  /** 출전 편성 · 대기 무장 찾기(이름 · 칭호 · 병종 · 진영 · 등급 · 스킬) */
  private formationQuery = ''
  private formationSort: FormationSort = 'power'
  private formationSortDescending = true
  /** 편성 화면에서 보는 군(0=1군, 1=2군, 2=3군) */
  private formationSquad = 0
  /** 추천 덱을 볼 무장(없으면 출전 첫 무장) */
  private comboAnchorId: string | null = null
  private comboCache = new Map<string, ComboAdvice[]>()
  private renderedState: StrategyState | null = null
  private summonTab: 'generals' | 'equipment' = 'generals'
  private equipmentSort: EquipmentSort = 'grade'
  private equipmentSortDescending = true
  /** 보관함 필터: 부위 · 세트 · 등급 · 장착 여부 */
  private equipmentFilter: { type: string; set: string; grade: string; owner: string } = { type: 'all', set: 'all', grade: 'all', owner: 'all' }
  /** 장비 관리: 접어 둔 칸(프리셋 · 세트 능력 / 필터 · 일괄 분해)을 펼쳤는가 — 다시 그려도 유지 */
  private equipmentMoreOpen = false
  private equipmentFilterOpen = false
  private equipmentScrollTop = 0
  private equipmentScrollFrame: number | null = null
  private equipmentIndexSource: Equipment[] | null = null
  private equipmentIndex = new Map<string, Equipment>()
  private equipmentSortCache: { key: string; items: Equipment[]; source: Equipment[] } | null = null
  private readonly equipmentRowHeight = 213 // 카드 204 + 간격 9(2026.10.20: 전설에도 특기 줄이 생겨 늘림)
  private shopTab: 'gold' | 'resources' | 'mythic' | 'packages' | 'passes' = 'resources'
  /** 튜토리얼: 10회 모집을 무료로 보여 준다 */
  private freeRecruit = false
  private territorySyncText = '영토 정보 확인 전'
  private scenarioSelectedId = SCENARIOS[0]?.id ?? ''
  /** 이번 접속에서 시나리오를 직접 골랐는지(안 골랐으면 다음에 깰 시나리오를 자동 선택) */
  private scenarioPicked = false
  /** 시나리오 화면에서 마지막으로 본 클리어 수(새로 깨면 다음 단계로 넘어간다). -1이면 처음 */
  private scenarioClearedSeen = -1
  private scenarioListOpen = false
  /** 시나리오 난이도 보기(보통 · 어려움) */
  private scenarioDifficulty: ScenarioDifficulty = 'normal'
  private lastSection = ''
  private boardComposeOpen = false
  private battleViewActive = false
  // 영토 지도: 확대·이동 상태는 다시 그려도 유지된다.
  private readonly territoryMap = new TerritoryMapController(id => {
    this.citySheetOpen = true
    this.callbacks.onCitySelect(id)
  })
  private citySheetOpen = false
  private battleAutoAvailable = false
  private battleLogOpen = false
  private battleView: BattleView = loadBattleView()
  getBattleView(): BattleView { return this.battleView }
  private noticeSeen: string | undefined
  private noticeAt = 0
  private powerMarked = false
  private longPressTimer = 0
  private suppressMoveUntil = 0
  private stopConfirmUntil = 0
  private cityFilter: CityFilter = 'all'
  private cityQuery = ''

  constructor(root: HTMLElement, callbacks: StrategyUiCallbacks) {
    this.root = root
    this.callbacks = callbacks
    root.addEventListener('click', this.handleClick)
    root.addEventListener('change', this.handleChange)
    root.addEventListener('submit', this.handleSubmit)
    root.addEventListener('scroll', this.handleScroll, true)
    root.addEventListener('input', this.handleInput)
    root.addEventListener('pointerdown', this.handleUnitPress)
    // 가로 휴대폰 화면으로 들어가거나 나오면(회전 · 창 크기) 본영 배치가 달라지므로 다시 그린다
    window.matchMedia?.(PHONE_LANDSCAPE)?.addEventListener?.('change', () => { if (this.renderedState) this.render(this.renderedState) })
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) root.addEventListener(type, this.cancelUnitPress)
    root.addEventListener('contextmenu', event => { if ((event.target as HTMLElement).closest('[data-bt-unit]')) event.preventDefault() })
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.territoryMap.fullscreen) this.territoryMap.setFullscreen(false)
      // 전투 중 V 키: 시점 바꾸기(글 입력 중에는 무시)
      if ((event.key === 'v' || event.key === 'V' || event.key === 'ㅍ') && !event.ctrlKey && !event.metaKey && !event.altKey && this.latestBattle?.active && !(event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) this.cycleBattleView()
    })
  }

  /** 연구 화면의 남은 시간·진행 막대·즉시 완료 비용만 고친다(전체 다시 그리기 없음) */
  /** 내정 공사 남은 시간만 갱신(1초마다) */
  updateBuildTimers(): void {
    const now = Date.now()
    this.root.querySelectorAll<HTMLElement>('[data-build-left]').forEach(el => { el.textContent = formatDuration(Math.max(0, Number(el.dataset.buildLeft) - now)) })
    this.root.querySelectorAll<HTMLElement>('[data-build-bar]').forEach(el => { const left = Math.max(0, Number(el.dataset.buildBar) - now); el.style.width = `${Math.min(100, (1 - left / Math.max(1, Number(el.dataset.buildTotal))) * 100).toFixed(1)}%` })
    this.root.querySelectorAll<HTMLElement>('[data-build-rush]').forEach(el => { el.textContent = `즉시 완공 · 금화 ${rushCost(Math.max(0, Number(el.dataset.buildRush) - now))}` })
  }

  /** 옥패 비용 표시(미리보기 계정은 무료) */
  private honorCost(amount: number): string {
    return amount <= 0 ? '무료' : `${icon('honor', 'gi--cost')}${formatNumber(amount)}`
  }

  /** 전투 시점을 다음 것으로(V 키) */
  private cycleBattleView(): void { this.setBattleView(nextBattleView(this.battleView)) }

  /** 시점 고르기 판(3×3): 위가 적진 쪽, 아래가 아군 쪽 */
  private toggleBattleViewPicker(anchor?: HTMLElement): void {
    const open = document.querySelector<HTMLElement>('.bt-view-picker')
    if (open) { open.remove(); return }
    if (!anchor) return
    const panel = document.createElement('div')
    panel.className = 'bt-view-picker'
    panel.setAttribute('role', 'menu')
    panel.innerHTML = `<div class="bt-view-head"><b>${tr('전투 시점')}</b><small>${tr('위가 적진 · 아래가 아군')}</small></div><div class="bt-view-grid">${BATTLE_VIEW_GRID.flat().map(view => `<button type="button" role="menuitemradio" aria-checked="${view === this.battleView}" class="bt-view-cell ${view === this.battleView ? 'is-on' : ''}" data-view="${view}" title="${tr(BATTLE_VIEW_HINT[view])}"><i>${BATTLE_VIEW_ARROW[view]}</i><span>${tr(BATTLE_VIEW_LABEL[view])}</span></button>`).join('')}</div>`
    const rect = anchor.getBoundingClientRect()
    // 화면 아래쪽 단추(전투 오른쪽 아래)면 단추 위로 연다
    const above = rect.top > window.innerHeight / 2
    if (above) panel.style.bottom = `${Math.round(window.innerHeight - rect.top + 6)}px`
    else panel.style.top = `${Math.round(rect.bottom + 6)}px`
    // 단추 오른쪽 끝에 맞추되 화면 밖으로 나가지 않게(좁은 휴대폰)
    panel.style.left = `${Math.round(Math.min(Math.max(6, rect.right - 228), window.innerWidth - 234))}px`
    panel.addEventListener('click', event => {
      const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-view]')
      if (!cell) return
      event.stopPropagation()
      this.setBattleView(cell.dataset.view as BattleView)
      panel.remove()
    })
    document.body.appendChild(panel)
    // 판 밖을 누르면 닫는다
    const close = (event: Event) => {
      if (!panel.isConnected) { document.removeEventListener('pointerdown', close, true); return }
      const t = event.target as HTMLElement
      if (panel.contains(t) || t.closest('[data-bt-view]')) return
      panel.remove(); document.removeEventListener('pointerdown', close, true)
    }
    document.addEventListener('pointerdown', close, true)
  }

  private setBattleView(view: BattleView): void {
    if (!BATTLE_VIEWS.includes(view)) return
    this.battleView = view
    saveBattleView(this.battleView)
    this.callbacks.onBattleView(this.battleView)
    this.root.querySelectorAll<HTMLElement>('[data-bt-view]').forEach(el => { const label = el.querySelector<HTMLElement>('[data-bt-view-label]'); if (label) label.textContent = tr(BATTLE_VIEW_LABEL[this.battleView]); el.title = `전투 시점 바꾸기 (V 키) · ${BATTLE_VIEW_HINT[this.battleView]}` })
    this.notify(`전투 시점 · ${BATTLE_VIEW_LABEL[this.battleView]} — ${BATTLE_VIEW_HINT[this.battleView]}`)
  }

  updateResearchTimer(state: StrategyState): void {
    const active = activeResearch(state)
    if (!active || active.endsAt === undefined) return
    const remaining = Math.max(0, active.endsAt - Date.now())
    const remainingEl = this.root.querySelector<HTMLElement>('[data-research-remaining]')
    if (!remainingEl) return
    remainingEl.textContent = formatDuration(remaining)
    const bar = this.root.querySelector<HTMLElement>('[data-research-progress]')
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, (1 - remaining / active.durationMs) * 100)).toFixed(1)}%`
    const rush = this.root.querySelector<HTMLElement>('[data-research-rush]')
    if (rush) rush.textContent = `즉시 완료 · 금화 ${rushCost(remaining)}`
    const card = this.root.querySelector<HTMLElement>('.research-node.is-active .research-running')
    if (card) card.textContent = `연구 중 · ${formatDuration(remaining)}`
  }

  render(state: StrategyState): void {
    // 장비 정리(합치기 · 스킬 동기화)는 그리기마다 한 번만 하고, 장비 전투력도 이번 그리기 동안 한 번씩만 계산한다
    ensureEquipmentState(state)
    resetUiPowerMemo()
    // 효과 줄임 설정을 CSS에서도 알 수 있게(카드 오라 등 반복 효과를 멈춘다)
    document.documentElement.dataset.fx = effectsSetting()
    this.coachSection = nextTutorialStep(state)?.section ?? null
    // 금화 내역: 지난 화면 이후 금화가 바뀌었으면 그때의 안내 문구와 함께 남긴다
    if (this.goldSeen !== null && this.goldSeen !== state.gold) trackGoldChange(state, this.goldSeen, this.noticeSeen !== state.lastNotice ? state.lastNotice : '')
    this.goldSeen = state.gold
    if (this.noticeSeen !== undefined && this.noticeSeen !== state.lastNotice) this.noticeAt = Date.now()
    this.noticeSeen = state.lastNotice
    const previousSection = this.renderedState?.section
    this.renderedState = state
    if (previousSection === 'equipment' && state.section === 'equipment') {
      const section = this.root.querySelector<HTMLElement>('.page-section--equipment')
      if (section) {
        const scroll = this.root.querySelector<HTMLElement>('[data-equipment-scroll]')
        const scrollTop = scroll?.scrollTop ?? this.equipmentScrollTop
        section.outerHTML = this.equipmentSection(state)
        window.requestAnimationFrame(() => {
          const nextScroll = this.root.querySelector<HTMLElement>('[data-equipment-scroll]')
          if (nextScroll) nextScroll.scrollTop = scrollTop
        })
        return
      }
    }
    // ‘모집 · 장비’ 메뉴에 새로 들어오면 언제나 무장 모집 탭부터
    if (state.section === 'recruit' && this.lastSection !== 'recruit') this.summonTab = 'generals'
    if (state.section !== 'equipment') this.equipmentScrollTop = 0
    if (state.section !== 'battle') this.battleViewActive = false
    else if (this.latestBattle?.active) this.battleViewActive = true // 전투가 진행 중이면 그리는 순서와 관계없이 전투 화면
    const enteringScenario = state.section === 'battle' && this.lastSection !== 'battle'
    // 상태 객체를 그대로 고쳐 쓰므로 이전 메뉴는 따로 기억해 둔 값으로 비교한다
    const sameSection = this.lastSection === state.section
    this.lastSection = state.section
    if (enteringScenario && !this.scenarioPicked) this.scenarioSelectedId = this.nextScenario(state)?.id ?? this.scenarioSelectedId
    // 같은 메뉴 안에서 버튼을 눌러 다시 그릴 때는 보던 자리(스크롤)와 펼친 칸을 그대로 둔다
    const kept = sameSection ? this.captureView() : null
    this.root.innerHTML = this.shell(state)
    if (kept) this.restoreView(kept)
    ensureIconSprite()
    // 시나리오 목록에 들어오면 고른(다음에 깰) 시나리오가 보이게 스크롤
    if (enteringScenario) window.requestAnimationFrame(() => this.root.querySelector('.scenario-card.is-selected')?.scrollIntoView({ block: 'center' }))
    this.attachTerritoryMap(state)
    const shell = this.root.querySelector<HTMLElement>('.app-shell')
    if (shell && !sameSection) {
      shell.classList.add('is-entering')
      window.requestAnimationFrame(() => shell.classList.remove('is-entering'))
    }
    if (this.latestBattle) this.updateBattle(this.latestBattle)
    this.watchTopbar()
    this.tidyChrome()
  }

  /** 꾸밈 기호(→ ↗ ✦ ↻ …)를 버튼에서 걷어 내고, 제목 아래 설명 문장은 (i) 안으로 접는다 */
  private tidyChrome(): void {
    const ornament = /^[\s→↗✦↻✎⚒⌁⌖›»]+$/
    this.root.querySelectorAll<HTMLElement>('.main-content button, .main-content a.action-button, .topbar button').forEach(button => {
      if (button.closest('.page-section--battle .bt-tactic-row, [data-bt-unit], .bt-hud, .bt-callout, [data-keep-glyph]')) return
      button.querySelectorAll('span, b, em').forEach(node => { if (node.childElementCount === 0 && ornament.test(node.textContent ?? '')) node.remove() })
      for (const node of [...button.childNodes]) {
        if (node.nodeType !== Node.TEXT_NODE) continue
        const text = node.textContent ?? ''
        const cleaned = text.replace(/\s*[→↗↻›»]\s*$/, '').replace(/^\s*[✦⚒✎]\s+/, '')
        if (cleaned !== text) node.textContent = cleaned
      }
    })
    // 메뉴 설명: 제목 옆 (i) 대신 오른쪽에 'OO 설명' 버튼(영토는 '영토전 설명'이 따로 있다)
    this.root.querySelectorAll<HTMLElement>('.section-heading').forEach(heading => {
      const title = heading.querySelector('h1')
      if (!title || heading.querySelector('.menu-guide-button') || heading.querySelector('[data-action="territory-rules"]') || heading.closest('.page-section--battle')) return
      const button = document.createElement('button')
      button.className = 'action-button action-button--outline menu-guide-button'
      button.type = 'button'
      button.dataset.action = 'menu-guide'
      button.textContent = tr(`${(title.textContent ?? '').trim()} 설명`)
      const side = [...heading.children].find(child => child !== title.closest('.section-heading > *'))
      const wrap = document.createElement('div')
      wrap.className = 'heading-side'
      if (side) { heading.insertBefore(wrap, side); wrap.appendChild(side) } else heading.appendChild(wrap)
      wrap.appendChild(button)
    })
  }


  /** 화면 상태 기록: 스크롤 위치(세로·가로)와 펼친 칸 */
  private captureView(): { scroll: Array<[string, number, number]>; open: string[]; windowY: number } {
    const scroll: Array<[string, number, number]> = []
    const keyOf = (element: Element) => {
      const parts: string[] = []
      for (let node: Element | null = element; node && node !== this.root; node = node.parentElement) {
        const parent: Element | null = node.parentElement
        const index = parent ? Array.prototype.indexOf.call(parent.children, node) : 0
        parts.unshift(`${node.tagName}.${(node.getAttribute('class') ?? '').split(' ')[0]}:${index}`)
      }
      return parts.join('>')
    }
    this.root.querySelectorAll<HTMLElement>('*').forEach(element => {
      if (element.scrollTop > 0 || element.scrollLeft > 0) scroll.push([keyOf(element), element.scrollTop, element.scrollLeft])
    })
    const open = [...this.root.querySelectorAll('details[open]')].map(keyOf)
    return { scroll, open, windowY: window.scrollY }
  }

  private restoreView(view: { scroll: Array<[string, number, number]>; open: string[]; windowY: number }): void {
    const find = (key: string): HTMLElement | null => {
      let node: Element | null = this.root
      for (const part of key.split('>')) {
        const index = Number(part.slice(part.lastIndexOf(':') + 1))
        node = node?.children[index] ?? null
        if (!node) return null
      }
      return node as HTMLElement
    }
    view.open.forEach(key => { const element = find(key); if (element instanceof HTMLDetailsElement) element.open = true })
    const apply = () => {
      view.scroll.forEach(([key, top, left]) => { const element = find(key); if (element) { element.scrollTop = top; element.scrollLeft = left } })
      if (view.windowY) window.scrollTo(0, view.windowY)
    }
    apply()
    // 그림·글꼴이 늦게 자리를 잡아도 한 번 더 맞춘다
    window.requestAnimationFrame(apply)
  }

  private topbarObserver: ResizeObserver | null = null
  /** 휴대폰 상단 바 높이(글자 크기·줄바꿈에 따라 달라짐)를 본문 위 여백에 반영한다 */
  private watchTopbar(): void {
    const topbar = this.root.querySelector<HTMLElement>('.topbar')
    if (!topbar || typeof ResizeObserver === 'undefined') return
    const apply = () => document.documentElement.style.setProperty('--mobile-top', `${Math.ceil(topbar.getBoundingClientRect().height)}px`)
    this.topbarObserver?.disconnect()
    this.topbarObserver = new ResizeObserver(apply)
    this.topbarObserver.observe(topbar)
    apply()
  }

  setAuth(auth: AuthView): void {
    this.auth = auth
    if (auth.status !== 'authenticated') this.account = null
    const button = this.root.querySelector<HTMLElement>('[data-auth-button]')
    if (button) {
      button.innerHTML = authButtonInner(auth)
      button.title = auth.status === 'authenticated' ? `${auth.name ?? '장군'} · 로그아웃` : ''
      button.dataset.action = auth.status === 'authenticated' ? 'logout' : 'login'
    }
    const status = this.root.querySelector<HTMLElement>('[data-auth-status]')
      if (status) status.textContent = auth.status === 'authenticated' ? `${auth.name ?? '장군'} 계정으로 전적을 동기화합니다.` : auth.status === 'offline' ? '독립 실행 중 · 전투와 모집은 로컬에서 이용할 수 있습니다.' : '로그인하면 순위표에 이름을 올릴 수 있습니다.'
  }

  showAccessGate(): void {
    this.renderedState = null
    this.root.innerHTML = this.accessGate()
  }

  /** 게스트: 처음 들어올 때 아이디(표시 이름)를 정한다. onSubmit이 오류 문구를 돌려주면 그대로 보여 준다 */
  enterLocalGuest(): void { this.callbacks.onLocalGuestLogin() }

  /** 출석 체크 창: 접속하면 저절로 뜬다(오늘 받은 보상 + 37일 달력) */
  /** 출석 보상 그림: 무장은 초상, 재화는 재화 그림, 뽑기권은 옥패 · 장비 그림 */
  private attendanceArt(reward: AttendanceReward): string {
    const img = (src: string, cls = '') => `<img class="${cls}" src="${src}" alt="" loading="lazy" decoding="async" draggable="false">`
    if (reward.general) return img(assetUrl(`/assets/generals-realistic-webp/${reward.general}.webp`), 'is-portrait')
    if (reward.randomLegend) return `${img('/assets/ui/recruit-montage.webp', 'is-portrait')}<i class="attendance-day__mystery">?</i>`
    if (reward.freeRecruits) return `${img('/assets/ui/jade-summon.svg')}<i class="attendance-day__count">×${reward.freeRecruits}</i>`
    if (reward.freeDraws) return `${img('/assets/equipment/weapon.webp')}<i class="attendance-day__count">×${reward.freeDraws}</i>`
    if (reward.resources) return `<span class="attendance-day__trio">${img('/assets/currency/grain.webp')}${img('/assets/currency/wood.webp')}${img('/assets/currency/iron.webp')}</span>`
    const currency = reward.gold ? 'gold' : reward.silver ? 'silver' : reward.honor ? 'honor' : reward.manuals ? 'manuals' : reward.fragments ? 'mythic' : reward.stones ? 'mythic' : ''
    return currency ? img(`/assets/currency/${currency}.webp`, reward.stones ? 'is-stone' : '') : ''
  }

  showAttendance(day: number, label: string): void {
    document.querySelector('.attendance-modal')?.remove()
    const layer = document.createElement('div')
    layer.className = 'attendance-modal'
    const cell = (reward: AttendanceReward) => `<li class="attendance-day ${reward.day < day ? 'is-done' : reward.day === day ? 'is-today' : ''} ${reward.general || reward.randomLegend ? 'is-hero' : ''}"><b>${reward.day}일</b><span class="attendance-day__art">${this.attendanceArt(reward)}</span><span class="attendance-day__label">${escapeHtml(reward.label)}</span></li>`
    layer.innerHTML = `<div class="attendance-modal__panel glass-card" role="dialog" aria-label="출석 체크"><span class="eyebrow">출석 체크 이벤트 · ${day}일째</span><h2>${escapeHtml(label)}</h2><p>접속할 때마다 하루에 한 번 다음 날짜의 보상을 받습니다(한국 시간 자정에 바뀜). 첫 7일 뒤 30일 동안 이어집니다.</p><h3>첫 7일</h3><ol class="attendance-grid attendance-grid--week">${ATTENDANCE_REWARDS.filter(reward => reward.day <= 7).map(cell).join('')}</ol><h3>이어지는 30일</h3><ol class="attendance-grid">${ATTENDANCE_REWARDS.filter(reward => reward.day > 7).map(cell).join('')}</ol><button class="action-button action-button--primary attendance-modal__ok" type="button">받기 완료 <span>→</span></button></div>`
    document.body.appendChild(layer)
    layer.querySelector('.attendance-modal__ok')?.addEventListener('click', () => layer.remove())
    layer.addEventListener('click', event => { if (event.target === layer) layer.remove() })
    window.setTimeout(() => layer.querySelector('.attendance-day.is-today')?.scrollIntoView({ block: 'nearest' }), 60)
  }

  showGuestSignup(onSubmit: (name: string) => Promise<string | null>, onCancel?: () => void): void {
    document.querySelector('.guest-signup')?.remove()
    const layer = document.createElement('div')
    layer.className = 'guest-signup'
    layer.innerHTML = `<form class="guest-signup__panel glass-card"><span class="eyebrow">게스트 시작</span><h2>아이디를 정하십시오</h2><p>아이디만 정하면 회원처럼 서버에 저장되고 랭킹 · 영토전 · 대련 · 레이드 · 게시판을 모두 쓸 수 있습니다. 한글 · 영문 · 숫자 · 밑줄(_) 2~12자.</p><label><span>아이디</span><input name="name" maxlength="12" autocomplete="nickname" required placeholder="예: 상산조자룡"></label><small class="guest-signup__error" role="alert"></small><div class="guest-signup__actions">${onCancel ? '<button type="button" class="ghost-button" data-guest-cancel>뒤로</button>' : ''}<button type="submit" class="action-button action-button--primary">시작하기 <span>→</span></button></div><small class="guest-signup__note">이 기기에 게스트 계정 정보가 보관됩니다. 브라우저 데이터를 지우면 이 계정으로 다시 들어올 수 없습니다.</small></form>`
    document.body.appendChild(layer)
    const form = layer.querySelector('form')!
    const input = form.querySelector<HTMLInputElement>('input')!
    const error = form.querySelector<HTMLElement>('.guest-signup__error')!
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
    window.setTimeout(() => input.focus(), 50)
    layer.querySelector('[data-guest-cancel]')?.addEventListener('click', () => { layer.remove(); onCancel?.() })
    form.addEventListener('submit', event => {
      event.preventDefault()
      submit.disabled = true
      error.textContent = ''
      void onSubmit(input.value.trim()).then(message => {
        if (message) { error.textContent = message; submit.disabled = false; return }
        layer.remove()
      })
    })
  }

  /** 아이디 · 비밀번호 로그인 / 회원가입 창(자체 서버). onSubmit이 오류 문장을 돌려주면 창에 보여 준다. */
  showAccountLogin(onSubmit: (mode: 'login' | 'signup', name: string, password: string) => Promise<string | null>, onCancel?: () => void): void {
    document.querySelector('.guest-signup')?.remove()
    let mode: 'login' | 'signup' = 'login'
    const layer = document.createElement('div')
    layer.className = 'guest-signup account-login'
    layer.innerHTML = `<form class="guest-signup__panel glass-card"><span class="eyebrow">회원 로그인</span><h2 data-account-title>아이디로 로그인</h2><p data-account-lead>아이디와 비밀번호를 입력하십시오. 진행 · 전적 · 랭킹이 서버에 저장되어 다른 기기에서도 이어 할 수 있습니다.</p><label><span>아이디</span><input name="name" maxlength="12" autocomplete="username" autocapitalize="off" spellcheck="false" required placeholder="한글 · 영문 · 숫자 · _ 2~12자"></label><label><span>비밀번호</span><input name="password" type="password" minlength="6" maxlength="64" autocomplete="current-password" required placeholder="6자 이상"></label><label data-account-confirm hidden><span>비밀번호 확인</span><input name="confirm" type="password" maxlength="64" autocomplete="new-password" placeholder="한 번 더 입력"></label><small class="guest-signup__error" role="alert"></small><div class="guest-signup__actions">${onCancel ? '<button type="button" class="ghost-button" data-guest-cancel>뒤로</button>' : ''}<button type="submit" class="action-button action-button--primary"><b data-account-submit>로그인</b> <span>→</span></button></div><button type="button" class="ghost-button account-login__switch" data-account-switch>처음이신가요? 회원가입</button><small class="guest-signup__note">비밀번호는 암호화해 저장하며, 운영자도 볼 수 없습니다. 잊으면 되찾을 수 없으니 꼭 기억하십시오.</small></form>`
    document.body.appendChild(layer)
    const form = layer.querySelector('form')!
    const name = form.querySelector<HTMLInputElement>('input[name="name"]')!
    const password = form.querySelector<HTMLInputElement>('input[name="password"]')!
    const confirm = form.querySelector<HTMLInputElement>('input[name="confirm"]')!
    const confirmRow = form.querySelector<HTMLElement>('[data-account-confirm]')!
    const error = form.querySelector<HTMLElement>('.guest-signup__error')!
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
    const setMode = (next: 'login' | 'signup') => {
      mode = next
      const signup = mode === 'signup'
      form.querySelector('[data-account-title]')!.textContent = signup ? '새 계정 만들기' : '아이디로 로그인'
      form.querySelector('[data-account-submit]')!.textContent = signup ? '가입하고 시작' : '로그인'
      form.querySelector('[data-account-switch]')!.textContent = signup ? '이미 계정이 있습니다 · 로그인' : '처음이신가요? 회원가입'
      confirmRow.hidden = !signup
      confirm.required = signup
      password.autocomplete = signup ? 'new-password' : 'current-password'
      error.textContent = ''
    }
    window.setTimeout(() => name.focus(), 50)
    layer.querySelector('[data-guest-cancel]')?.addEventListener('click', () => { layer.remove(); onCancel?.() })
    layer.querySelector('[data-account-switch]')!.addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'))
    form.addEventListener('submit', event => {
      event.preventDefault()
      if (mode === 'signup' && password.value !== confirm.value) { error.textContent = '비밀번호 확인이 맞지 않습니다.'; return }
      submit.disabled = true
      error.textContent = ''
      void onSubmit(mode, name.value.trim(), password.value).then(message => {
        if (message) { error.textContent = message; submit.disabled = false; return }
        layer.remove()
      })
    })
  }

  showFactionSelection(): void {
    this.renderedState = null
    this.root.innerHTML = this.factionSelection()
    maybeShowIntro()
  }

  /** 운영자 계정이면 랭킹 · 영토전에 반영되지 않는다는 안내 */
  private operatorNote(where: string): string {
    const account = this.account
    if (!account || !(account.operator || account.role === 'admin')) return ''
    return `<p class="operator-note">운영자 계정 · ${where}</p>`
  }

  setAccount(account: AccountView | null): void {
    this.account = account
  }
  setTerritorySync(text: string): void {
    this.territorySyncText = text
    const status = this.root.querySelector<HTMLElement>('[data-territory-sync]')
    if (status) status.textContent = text
  }
  private isAdmin(): boolean {
    return this.account?.role === 'admin'
  }

  /** 밸런스 테스트 페이지: 정식 출시 전엔 모두, 출시 후엔 운영자만 */
  private canOpenBalance(): boolean {
    return !OFFICIAL_LAUNCH || this.isAdmin()
  }

  setAdminAccounts(accounts: AccountView[], error: string | null = null): void {
    this.adminAccounts = accounts
    this.adminAccountsError = error
  }

  setAdminGameAccounts(accounts: GameAccountView[], error: string | null = null): void {
    this.adminGameAccounts = accounts
    this.adminGameDataError = error
  }

  setAdminBoard(state: AdminBoardState): void {
    this.adminBoard = state
  }

  /** 신화장비 강화 성공 연출 */
  showMythicEnhance(item: Equipment): void {
    document.querySelector('.mythic-enhance-fx')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'mythic-enhance-fx'
    overlay.innerHTML = `<div class="mythic-enhance-fx__ring"></div><div class="mythic-enhance-fx__card"><img src="${equipmentImage(item.type)}" alt="" width="96" height="96"><span>신화 강화 성공</span><strong>${escapeHtml(item.name)} · Lv.${item.level}</strong><em>${STAT_LABEL[item.mainStat] ?? item.mainStat} +${equipmentValue(item)}</em></div>`
    document.body.appendChild(overlay)
    overlay.addEventListener('click', () => overlay.remove())
    window.setTimeout(() => overlay.classList.add('is-leaving'), 1900)
    window.setTimeout(() => overlay.remove(), 2400)
  }

  setLuoyangHistory(history: LuoyangHistory): void {
    this.luoyangHistory = history
    if (this.renderedState?.section === 'territory') this.render(this.renderedState)
  }

  /** 낙양전 기록 카드 */
  private luoyangHistoryCard(state: StrategyState): string {
    const history = this.luoyangHistory
    if (!history) return '<div class="glass-card luoyang-history"><div class="card-header"><div><span class="eyebrow">낙양전 기록</span><h3>역대 낙양 주인</h3></div></div><p class="luoyang-history__empty">로그인하면 역대 낙양전 결과와 진영별 공헌을 볼 수 있습니다.</p></div>'
    const totals = new Map(history.factions.map(row => [row.faction, row]))
    const max = Math.max(1, ...history.factions.map(row => Number(row.damage) || 0))
    const factions = (['촉한', '위나라', '오나라', '재야'] as const).map(faction => {
      const row = totals.get(faction)
      const damage = Number(row?.damage) || 0
      const wins = history.weeks.filter(week => week.winnerFaction === faction).length
      return `<li class="${faction === state.faction ? 'is-mine' : ''}"><span>${faction}${faction === state.faction ? ' (내 진영)' : ''}</span><i><b style="width:${damage / max * 100}%"></b></i><em>성벽 피해 ${formatNumber(damage)} · 출정 ${formatNumber(Number(row?.battles) || 0)} · 최근 ${wins}승</em></li>`
    }).join('')
    const weeks = history.weeks.length ? history.weeks.map(week => `<li><span>${week.weekKey.slice(5).replace('-', '월 ')}일</span><b class="${week.winnerFaction === state.faction ? 'is-mine' : ''}">${week.winnerFaction ?? '주인 없음'}</b></li>`).join('') : '<li><span>아직 결과가 없습니다</span></li>'
    const top = history.top.length ? history.top.map((row, index) => `<li><span>${index + 1}. ${ugc(row.displayName)}${royalBadge(this.guildUi.royal, { name: row.displayName })}</span><small>${row.faction} · ${formatNumber(Number(row.totalDamage) || 0)}</small></li>`).join('') : ''
    return `<div class="glass-card luoyang-history"><div class="card-header"><div><span class="eyebrow">낙양전 기록</span><h3>역대 낙양 주인 · 진영 공헌</h3></div><span class="rate-note">최근 12주</span></div><ul class="luoyang-history__factions">${factions}</ul><div class="luoyang-history__cols"><div><h4>주간 승자</h4><ul class="luoyang-history__weeks">${weeks}</ul></div>${top ? `<div><h4>공헌 상위 장수</h4><ul class="luoyang-history__top">${top}</ul></div>` : ''}</div></div>`
  }

  setCityDamageRankings(cityId: string, rankings: CityDamageRanking[]): void {
    this.cityDamageRankingCityId = cityId
    this.cityDamageRankings = rankings
    if (this.renderedState?.section === 'territory') this.render(this.renderedState)
  }

  setRanks(ranks: RankEntry[]): void {
    this.ranks = ranks
    const panel = this.root.querySelector<HTMLElement>('[data-rank-list]')
    if (panel) panel.innerHTML = this.rankRows()
  }
  /** 연맹 화면 상태 바꾸기(연맹 · 랭킹 화면이면 다시 그린다). 쓰고 있던 글(채팅 · 게시글 · 공지)은 그대로 둔다 */
  setGuildUi(patch: Partial<GuildUiState>): void {
    const chat = this.root.querySelector<HTMLElement>('[data-guild-chat]')
    const stick = !chat || chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 30
    this.guildUi = { ...this.guildUi, ...patch }
    const section = this.renderedState?.section
    if (section !== 'guild' && section !== 'rank') return
    const drafts = [...this.root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-guild-form] input:not([type="radio"]):not([type="hidden"]), [data-guild-form] textarea')].map(field => ({ form: field.closest<HTMLElement>('[data-guild-form]')?.dataset.guildForm, name: field.name, value: field.value, focused: document.activeElement === field }))
    this.render(this.renderedState!)
    for (const draft of drafts) {
      const field = this.root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-guild-form="${draft.form}"] [name="${draft.name}"]`)
      if (!field || field.type === 'password' && !draft.value) continue
      if (draft.form !== 'notice' && draft.form !== 'settings') field.value = draft.value
      if (draft.focused) field.focus()
    }
    const list = this.root.querySelector<HTMLElement>('[data-guild-chat]')
    if (list && stick) list.scrollTop = list.scrollHeight
  }
  /** 관리자: 연맹 목록(이름 바꾸기 · 강제 해산) */
  private adminGuilds: Array<{ id: number; name: string; faction: string; level: number; members: number; capacity: number; weekPoints: number }> = []
  setAdminGuilds(rows: typeof this.adminGuilds): void { this.adminGuilds = rows }
  /** 관리자 · 연맹 관리: 이름 바꾸기 · 강제 해산 */
  private adminGuildPanel(): string {
    const rows = this.adminGuilds.map(guild => `<article class="admin-board-row"><div><span class="pill pill--jade">${escapeHtml(guild.faction)}</span><strong>${ugc(guild.name)}</strong><small>Lv.${guild.level} · ${guild.members}/${guild.capacity}명 · 주간 기여 ${formatNumber(guild.weekPoints)}</small></div><form class="guild-form-row" data-guild-form="admin-rename"><input type="hidden" name="guildId" value="${guild.id}"><input name="name" maxlength="8" placeholder="새 이름" required><button class="mini-action" type="submit">이름 변경</button></form><button class="mini-action" data-action="guild-admin-disband" data-guild-id="${guild.id}" data-name="${escapeHtml(guild.name)}">강제 해산</button></article>`).join('')
    return `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">연맹 관리</span><h3>유저 연맹</h3><p>부적절한 연맹 이름을 바꾸거나 연맹을 강제로 해산할 수 있습니다(연맹원은 모두 연맹 없음으로).</p></div></div><div class="admin-board-list">${rows || '<div class="admin-empty-row">아직 연맹이 없습니다.</div>'}</div></div>`
  }
  /** 관리자 · 시즌 운영: 낙양전 주간 승자 바로잡기 */
  private adminLuoyangPanel(): string {
    return `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">낙양전 관리</span><h3>주간 승자 바로잡기</h3><p>밤사이 중립 습격으로 낙양을 잃어 승자가 비었던 주 등을 바로잡습니다. 그 진영 유저는 다음 접속 때 그 주 낙양 상자를 받습니다(이미 받은 유저는 그대로).</p></div></div><form class="guild-form-row" data-guild-form="admin-luoyang"><input name="weekKey" value="${(() => { const k = new Date(Date.now() + 9 * 3600000); k.setUTCDate(k.getUTCDate() - (k.getUTCDay() === 0 ? 7 : k.getUTCDay())); return k.toISOString().slice(0, 10) })()}" pattern="\\d{4}-\\d{2}-\\d{2}" aria-label="그 주 일요일" required><select name="faction" aria-label="승자 진영">${['오나라', '촉한', '위나라', '재야'].map(f => `<option value="${f}">${f}</option>`).join('')}</select><label class="admin-check"><input type="checkbox" name="restoreOwner" value="1" checked> 낙양 주인도 되돌리기</label><button class="mini-action" type="submit">승자 지정</button></form></div>`
  }
  /** 관리자 · 시즌 운영: 이번 주 왕 · 황제 지정 · 위임 · 다시 계산 */
  private adminRoyalPanel(): string {
    const royal = this.guildUi.royal
    const factions = ['촉한', '위나라', '오나라', '재야'] as const
    const current = royal ? factions.map(faction => { const king = royal.kings[faction]; return `<li><b>${faction}</b><span>${king ? `${ugc(king.guildName)} · ${escapeHtml(royal.emperorFaction === faction ? '황제' : king.title ?? '왕')} ${ugc(king.leaderName || '-')}${king.appointed ? ' · 지정' : ''}` : '왕 없음'}</span></li>` }).join('') : '<li>왕궁 정보를 불러오지 못했습니다. 연맹 화면을 한 번 열거나 새로고침하십시오.</li>'
    const guildOptions = this.adminGuilds.map(guild => `<option value="${guild.id}">[${escapeHtml(guild.faction)}] ${escapeHtml(guild.name)}</option>`).join('')
    return `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">왕 연맹 · ${escapeHtml(royal?.weekKey ?? '')} 주</span><h3>이번 주 왕 · 황제 관리</h3><p>정산이 잘못됐을 때 이번 주 왕 연맹 · 왕 · 황제를 직접 정합니다. 위임할 연맹원 이름을 적으면 연맹장 대신 그 연맹원이 왕(황제) 칭호와 금화 · 상점 한도를 받습니다. 이미 산 물품 · 받은 금화 기록은 그대로입니다.</p></div><button class="mini-action" data-action="guild-admin-royal">지금 영토로 다시 계산</button></div>
      <ul class="admin-royal-list">${current}</ul>
      <form class="guild-form-row" data-guild-form="admin-royal-set"><select name="faction" aria-label="진영">${factions.map(f => `<option value="${f}">${f}</option>`).join('')}</select><select name="guildId" aria-label="왕 연맹"><option value="0">왕 없음</option>${guildOptions}</select><input name="leaderName" maxlength="32" placeholder="위임할 연맹원 이름(비우면 연맹장)"><button class="mini-action" type="submit">왕 연맹 지정</button></form>
      <form class="guild-form-row" data-guild-form="admin-emperor"><select name="faction" aria-label="황제 진영"><option value="">황제 없음</option>${factions.map(f => `<option value="${f}" ${royal?.emperorFaction === f ? 'selected' : ''}>${f}</option>`).join('')}</select><button class="mini-action" type="submit">황제 진영 지정</button></form></div>`
  }
  /** 관리자 · 유저 무장 편집 창: 레벨 · 성급 · 삭제 · 추가. 저장하면 능력치를 다시 계산한 전체 목록을 보낸다 */
  showAdminGeneralEditor(userId: number, name: string, generals: General[]): void {
    document.querySelector('.admin-generals-modal')?.remove()
    const list = generals.filter(general => general && typeof general.id === 'string')
    const owned = new Set(list.map(general => general.id))
    const row = (general: Pick<General, 'id' | 'name' | 'grade' | 'level' | 'stars'>, fresh = false) => `<li data-gen-id="${escapeHtml(general.id)}" ${fresh ? 'data-gen-new="1"' : ''}><b>${escapeHtml(general.name)} <small>${general.grade}등급</small></b><label>Lv.<input type="number" min="1" max="${MAX_GENERAL_LEVEL}" value="${general.level}" data-gen-level></label><label>성급<input type="number" min="1" max="5" value="${general.stars}" data-gen-stars></label><label class="admin-check"><input type="checkbox" data-gen-remove> 삭제</label></li>`
    const options = allGenerals().filter(general => !owned.has(general.id)).sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name, 'ko-KR')).map(general => `<option value="${general.id}">${general.grade}등급 ${escapeHtml(general.name)}</option>`).join('')
    const modal = document.createElement('div')
    modal.className = 'territory-rules-modal admin-generals-modal'
    modal.innerHTML = `<div class="territory-rules__card glass-card" role="dialog" aria-label="무장 편집"><div class="territory-rules__head"><div><span class="eyebrow">무장 편집 · #${userId}</span><h2>${escapeHtml(name || '유저')}의 무장 ${list.length}명</h2></div><button class="territory-rules__close" data-rules-close aria-label="닫기">✕</button></div><p class="guild-hint">레벨 · 성급을 바꾸면 능력치를 다시 계산합니다. 삭제한 무장은 편성에서도 빠집니다. 그 유저가 접속 중이면 바로 반영됩니다.</p><div class="admin-gen-add"><select data-gen-add-select>${options}</select><button class="mini-action" data-gen-add>추가</button></div><ul class="admin-gen-list">${list.sort((a, b) => b.grade - a.grade || b.level - a.level).map(general => row(general)).join('')}</ul><div class="admin-gen-foot"><button class="action-button action-button--primary" data-gen-save>저장</button></div></div>`
    const close = () => modal.remove()
    modal.addEventListener('click', event => {
      const target = event.target as HTMLElement
      if (target === modal || target.closest('[data-rules-close]')) { close(); return }
      if (target.closest('[data-gen-add]')) {
        const select = modal.querySelector<HTMLSelectElement>('[data-gen-add-select]')
        const template = select?.value ? templateGeneral(select.value) : undefined
        if (!template || !select) return
        modal.querySelector('.admin-gen-list')?.insertAdjacentHTML('afterbegin', row({ ...template, level: 1, stars: 1 }, true))
        select.selectedOptions[0]?.remove()
        return
      }
      if (target.closest('[data-gen-save]')) {
        const byId = new Map(list.map(general => [general.id, general]))
        const out: General[] = []
        let bad = ''
        modal.querySelectorAll<HTMLElement>('[data-gen-id]').forEach(item => {
          if (item.querySelector<HTMLInputElement>('[data-gen-remove]')?.checked) return
          const id = item.dataset.genId ?? ''
          const template = templateGeneral(id)
          const level = Math.trunc(Number(item.querySelector<HTMLInputElement>('[data-gen-level]')?.value))
          const stars = Math.trunc(Number(item.querySelector<HTMLInputElement>('[data-gen-stars]')?.value))
          if (!template || !(level >= 1 && level <= MAX_GENERAL_LEVEL) || !(stars >= 1 && stars <= 5)) { bad = template?.name ?? id; return }
          const base = byId.get(id) ?? { ...template, skillUnlocked: true }
          const starsChanged = base.stars !== stars || !byId.has(id)
          out.push({ ...base, level, stars, ...statsAt(template, level, stars), ...(starsChanged ? { skillRank: stars, skillPower: 100 + 18 * (stars - 1) } : {}) })
        })
        if (bad) { this.notify(`${bad}의 레벨(1~${MAX_GENERAL_LEVEL}) · 성급(1~5)을 확인하십시오.`, 'ember'); return }
        this.confirmPurchase('무장 저장', `${name || '유저'}의 무장을 ${out.length}명으로 저장합니다.`, () => this.callbacks.onGuild('admin-generals-save', { userId: String(userId), generalData: JSON.stringify(out) }), { eyebrow: '관리자', ok: '저장' })
      }
    })
    document.body.appendChild(modal)
  }
  /** 관리자 · 이상 행동(자동 진행 의심) 목록 */
  private adminBots: AdminBotRow[] = []
  setAdminBots(rows: AdminBotRow[]): void { this.adminBots = rows; if (this.renderedState?.section === 'admin') this.render(this.renderedState) }
  private adminBotPanel(): string {
    const day = (d: AdminBotRow['today'], label: string) => d ? `<span>${label} 공성 ${d.sieges} · 수비 ${d.defenses} · 활동 ${d.activeHours}시간${d.capHits ? ` · 피해 상한 ${d.capHits}` : ''}${d.badTickets ? ` · 잘못된 표 ${d.badTickets}` : ''}${d.overLimit ? ` · 하루 상한 초과 ${d.overLimit}` : ''}</span>` : ''
    const rows = this.adminBots.map(row => `<article class="admin-board-row admin-bot-row"><div><span class="pill ${row.score >= 40 ? 'pill--ember' : 'pill--jade'}">의심 ${row.score}</span><strong>${ugc(row.name)} <small>#${row.userId} · ${escapeHtml(row.faction ?? '')}</small></strong><small>${day(row.today, '오늘')}${day(row.yesterday, ' / 어제')}${row.limitHits ? ` · 요청 제한 ${row.limitHits}회` : ''}${row.banUntil > Date.now() ? ` · <b>영토전 정지 ~${new Date(row.banUntil).toLocaleString(locale())}</b>` : ''}</small></div><div class="admin-bot-actions"><button class="mini-action" data-action="guild-admin-ban" data-user-id="${row.userId}" data-hours="24" data-name="${escapeHtml(row.name)}">24시간 정지</button><button class="mini-action" data-action="guild-admin-ban" data-user-id="${row.userId}" data-hours="168" data-name="${escapeHtml(row.name)}">7일 정지</button>${row.banUntil > Date.now() ? `<button class="mini-action" data-action="guild-admin-ban" data-user-id="${row.userId}" data-hours="0" data-name="${escapeHtml(row.name)}">정지 풀기</button>` : ''}</div></article>`).join('')
    return `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">자동 진행 대책</span><h3>이상 행동 계정</h3><p>하루 공성 수(상한 200), 쉬지 않고 활동한 시간, 피해 상한 · 잘못된 공성 표 · 요청 제한에 걸린 횟수로 의심 점수를 매깁니다. 확인한 뒤 영토전 참여를 정지할 수 있습니다(정지 중 공성 · 수비는 반영되지 않음).</p></div><button class="ghost-button" data-action="guild-admin-bots">새로고침 ↻</button></div><div class="admin-board-list">${rows || '<div class="admin-empty-row">의심되는 계정이 없습니다.</div>'}</div></div>`
  }
  /** 관리자 · 천하 영토 편집 */
  private adminCityId = ''
  private adminTerritoryPanel(state: StrategyState): string {
    const cities = [...state.cities].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
    const city = cities.find(item => item.id === this.adminCityId) ?? cities[0]
    if (!city) return '<div class="glass-card admin-panel">도시 정보가 없습니다.</div>'
    const owners = ['촉한', '위나라', '오나라', '재야', '중립'] as const
    const occupied = cityOccupation(city)
    const status = [`${city.level}등급`, `성벽 ${formatNumber(city.defense)} / ${formatNumber(cityWallCapacity(city))}`, `민심 ${city.prosperity}`, `공성 진행 ${city.conquestProgress ?? 0}%`, `수비대 ${city.garrisons?.length ?? 0}`, occupied ? `임시 점령 ${occupied.faction}` : '', city.captureBanUntil && city.captureBanUntil > Date.now() ? '공성 금지 중' : '', city.guild ? `연맹 ${city.guild.name}` : ''].filter(Boolean)
    const guildOptions = this.adminGuilds.map(guild => `<option value="${guild.id}" ${city.guild?.id === guild.id ? 'selected' : ''}>[${escapeHtml(guild.faction)}] ${escapeHtml(guild.name)}</option>`).join('')
    return `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">천하 영토</span><h3>도시 편집</h3><p>도시 주인 · 성벽 · 민심 · 공성 진행과 도시 연맹을 바로 고칩니다. 바꾼 값은 모든 유저의 천하 영토에 반영됩니다.</p></div><button class="ghost-button" data-action="guild-admin-load">새로고침 ↻</button></div>
      <label class="admin-city-pick"><span>도시</span><select data-action="admin-city-pick">${cities.map(item => `<option value="${item.id}" ${item.id === city.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${escapeHtml(item.owner)} · ${item.level}등급</option>`).join('')}</select></label>
      <div class="game-data-chips">${status.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
      <form class="admin-city-form" data-guild-form="admin-city"><input type="hidden" name="cityId" value="${city.id}">
        <label><span>주인</span><select name="owner">${owners.map(owner => `<option value="${owner}" ${city.owner === owner ? 'selected' : ''}>${owner}</option>`).join('')}</select></label>
        <label><span>성벽</span><input type="number" name="defense" min="0" step="1" value="${city.defense}"></label>
        <label><span>민심</span><input type="number" name="prosperity" min="0" max="100" step="1" value="${city.prosperity}"></label>
        <label><span>공성 진행(%)</span><input type="number" name="conquestProgress" min="0" max="100" step="1" value="${city.conquestProgress ?? 0}"></label>
        <label><span>도시 연맹</span><select name="guildId"><option value="0">없음</option>${guildOptions}</select></label>
        <label class="admin-check"><input type="checkbox" name="clearGarrisons" value="1"> 수비대 모두 비우기</label>
        <label class="admin-check"><input type="checkbox" name="clearLocks" value="1"> 임시 점령 · 공성 금지 · 무너짐 풀기</label>
        <button class="action-button action-button--primary" type="submit">도시 저장</button></form></div>`
  }
  /** 보낸 뒤 그 입력 칸을 비운다 */
  resetGuildForm(kind: string): void {
    this.root.querySelector<HTMLFormElement>(`[data-guild-form="${kind}"]`)?.reset()
  }
  get guildTab(): GuildTab { return this.guildUi.tab }
  get guildRankingKind(): GuildUiState['rankingKind'] { return this.guildUi.rankingKind }

  setBoardPosts(posts: BoardPost[], board: BoardPost['board']): void {
    this.boardPosts = posts
    this.boardTab = board
    if (this.renderedState?.section === 'board') this.render(this.renderedState)
  }

  setRaidView(view: RaidView): void {
    this.raidView = view
    if (this.renderedState?.section === 'raid') this.render(this.renderedState)
  }

  setDuelOpponents(opponents: DuelOpponent[], myPower = 0): void {
    this.duelOpponents = opponents
    this.duelMyPower = myPower
    if (this.renderedState?.section === 'duel') this.render(this.renderedState)
  }

  notify(message: string, tone: 'jade' | 'ember' = 'jade'): void {
    let toast = this.root.querySelector<HTMLElement>('[data-toast]')
    // 접속 화면처럼 알림 칸이 없는 화면에서도 보이게 떠 있는 알림을 쓴다(예전에는 조용히 사라져 ‘반응이 없는’ 것처럼 보였다)
    if (!toast) {
      toast = document.querySelector<HTMLElement>('[data-floating-toast]')
      if (!toast) {
        toast = document.createElement('div')
        toast.className = 'toast'
        toast.dataset.floatingToast = ''
        toast.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));top:auto;right:auto;transform:translateX(-50%);z-index:9999;max-width:min(92vw,520px);pointer-events:none'
        document.body.appendChild(toast)
      }
    }
    toast.textContent = message
    toast.dataset.tone = tone
    if (tone === 'ember') sound.play('error')
    toast.classList.remove('is-visible')
    void toast.offsetWidth
    toast.classList.add('is-visible')
    window.setTimeout(() => toast?.classList.remove('is-visible'), toast.dataset.floatingToast !== undefined ? 6000 : 3300)
  }

  /** 무장 모집 연출(옥패 의식 → 5등급이면 천명 강림) */
  celebrateRecruit(rewards: General[]): Promise<void> {
    return playSummonCeremony(rewards, general => this.portraitAsset(general))
  }

  /** 장비 뽑기 연출(대장간 불꽃 → 전설·신화면 등장) */
  celebrateDraw(items: Equipment[]): Promise<void> {
    return playForgeCeremony(items, item => equipmentImage(item.type), item => ({ type: EQUIPMENT_TYPE_META[item.type].label, set: EQUIPMENT_SET_META[item.set].label }))
  }

  playRecruitAnimation(general: General, count: number, revealNow = false, eyebrow = ''): Promise<void> {
    if (this.recruitAnimationActive) return Promise.resolve()
    this.recruitAnimationActive = true
    const meta = GRADE_META[general.grade]
    const overlay = document.createElement('div')
    overlay.className = 'summon-ritual'
    overlay.innerHTML = `<div class="ritual-backdrop"></div><div class="ritual-orbit ritual-orbit--one"></div><div class="ritual-orbit ritual-orbit--two"></div><div class="ritual-stage"><div class="ritual-heading"><span class="eyebrow">${eyebrow || (count === 10 ? '10회 연속 모집 · 대표 등장' : '1회 모집 · 옥패의 응답')}</span><strong>천명이 인장을 깨운다</strong></div><div class="ritual-seal"><span>✦</span><i>옥패의 응답</i></div><div class="ritual-reveal" style="--grade:${meta.color};--accent:${gradeColor(general)}"><span class="ritual-grade">${meta.label} · ${general.grade}등급</span>${this.ritualPortrait(general)}<h2>${general.name}</h2><p>${general.epithet}</p><small>${general.role} · Lv.${general.level} · ${general.stars}성</small><div class="ritual-skill"><b>${general.skillName}</b><span>${general.skillDescription}</span></div></div>${this.drawBalance('recruit')}<button class="action-button action-button--primary ritual-continue" data-action="close-summon">결과 확인 <span>→</span></button></div>`
    this.root.appendChild(overlay)

    return new Promise(resolve => {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        overlay.classList.remove('is-visible')
        window.setTimeout(() => {
          overlay.remove()
          this.recruitAnimationActive = false
          resolve()
        }, 380)
      }
      overlay.querySelector('[data-action="close-summon"]')?.addEventListener('click', finish, { once: true })
      requestAnimationFrame(() => overlay.classList.add('is-visible'))
      window.setTimeout(() => overlay.classList.add('is-revealed'), revealNow ? 60 : 980)
      window.setTimeout(finish, 5200)
    })
  }

  private goldSeen: number | null = null
  /** 출전 편성: 무장을 누르면 간단한 스킬 정보(스킬 · 쿨다운 · 패시브 · 각성) */
  private showFormationSkill(id: string): void {
    const state = this.renderedState
    const general = state?.generals.find(item => item.id === id)
    if (!general) return
    this.root.querySelector('.formation-skill-pop')?.remove()
    const detail = skillDetail(general)
    const meta = GRADE_META[general.grade]
    const row = (label: string, text: string) => text ? `<div class="formation-skill-pop__row"><b>${label}</b><span>${escapeHtml(text)}</span></div>` : ''
    const overlay = document.createElement('div')
    overlay.className = 'recruit-results formation-skill-pop'
    overlay.innerHTML = `<div class="recruit-results-backdrop" data-action="close-formation-skill"></div><div class="recruit-results-panel formation-skill-pop__panel" style="--accent:${gradeColor(general)}"><div class="formation-skill-pop__head">${this.portrait(general, 'formation-bench-portrait')}<div><strong>${escapeHtml(general.name)}</strong>${formationTags(general)}<small>${general.role} · ${detail.type}형 · ${meta.label}</small></div><button class="mini-action" data-action="close-formation-skill">닫기</button></div>${row('스킬', detail.effect)}${row('쿨다운', detail.cooldown)}${row('대상', detail.target)}${row('패시브', detail.passive)}${row('각성', detail.awaken)}${row('약점', detail.weakness)}</div>`
    this.root.appendChild(overlay)
    requestAnimationFrame(() => overlay.classList.add('is-visible'))
  }

  /** 관리자 목록 정렬 선택 */
  private adminSortSelect(): string {
    const options: Array<[typeof this.adminSort, string]> = [['id', '가입순'], ['level-desc', '레벨 높은 순'], ['level-asc', '레벨 낮은 순'], ['recent', '최근 로그인 순']]
    return `<label class="admin-sort"><span>정렬</span><select data-action="admin-sort">${options.map(([value, label]) => `<option value="${value}" ${this.adminSort === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`
  }

  /** 뽑기 기록 창: 최근 200회 결과와 최고 등급(무장 천명 · 장비 전설) 누적 확률 */
  showDrawLog(kind: 'recruit' | 'equip'): void {
    const state = this.renderedState
    if (!state) return
    this.root.querySelector('.draw-log')?.remove()
    const missions = state.missions
    const time = (at: number) => new Intl.DateTimeFormat(locale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(at))
    const pct = (top: number, n: number) => n ? `${(top / n * 100).toFixed(2)}%` : '—'
    const stats = missions?.drawStats?.[kind] ?? { n: 0, top: 0 }
    let rows = '', recentTop = 0, recentN = 0, title = '', topLabel = '', official = '', grades = ''
    if (kind === 'recruit') {
      const log = missions?.recruitLog ?? []
      recentN = log.length
      recentTop = log.filter(entry => entry.g === 5).length
      const names = new Map(allGenerals().map(general => [general.id, general.name]))
      rows = log.map((entry, index) => { const meta = GRADE_META[entry.g as Grade]; return `<li class="${entry.g === 5 ? 'is-top' : ''}"><em>${recentN - index}</em><time>${time(entry.at)}</time><b style="color:${meta?.color ?? '#ccc'}">${entry.g}등급 ${meta?.label ?? ''}</b><span>${escapeHtml(names.get(entry.id) ?? entry.id)}</span></li>` }).join('')
      grades = ([5, 4, 3, 2, 1] as Grade[]).map(grade => `<span style="color:${GRADE_META[grade].color}">${GRADE_META[grade].label} ${log.filter(entry => entry.g === grade).length}</span>`).join('')
      title = '무장 모집 기록'; topLabel = '천명(5등급)'
      official = `공개 확률 ${GRADE_META[5].rate} · 처음 ${EARLY_RECRUIT_PULLS}회는 2배(${(missions?.recruitPulls ?? 0) < EARLY_RECRUIT_PULLS ? `지금 적용 중 · ${missions?.recruitPulls ?? 0}/${EARLY_RECRUIT_PULLS}회` : '끝남'})`
    } else {
      const log = missions?.equipLog ?? []
      recentN = log.length
      recentTop = log.filter(entry => entry.g === 'legendary' || entry.g === 'mythic').length
      rows = log.map((entry, index) => { const meta = EQUIPMENT_GRADE_META[entry.g as EquipmentGrade]; return `<li class="${entry.g === 'legendary' || entry.g === 'mythic' ? 'is-top' : ''}"><em>${recentN - index}</em><time>${time(entry.at)}</time><b style="color:${meta?.color ?? '#ccc'}">${meta?.label ?? entry.g}</b><span>${escapeHtml(entry.n)}</span></li>` }).join('')
      grades = (['legendary', 'unique', 'rare', 'normal'] as EquipmentGrade[]).map(grade => `<span style="color:${EQUIPMENT_GRADE_META[grade].color}">${EQUIPMENT_GRADE_META[grade].label} ${log.filter(entry => entry.g === grade).length}</span>`).join('')
      title = '장비 뽑기 기록'; topLabel = '전설'
      official = `공개 확률 ${EQUIPMENT_GRADE_META.legendary.drawWeight}%`
    }
    const empty = '<li class="gold-log__empty">아직 기록이 없습니다. 이제부터 뽑으면 여기에 남습니다.</li>'
    const overlay = document.createElement('div')
    overlay.className = 'recruit-results gold-log draw-log'
    overlay.innerHTML = `<div class="recruit-results-backdrop" data-action="close-draw-log"></div><div class="recruit-results-panel gold-log__panel"><div class="recruit-results-heading"><div><span class="eyebrow">${title}</span><h2>${topLabel} 누적 확률 ${pct(stats.top, stats.n)}</h2><p>누적 ${formatNumber(stats.n)}회 중 ${topLabel} ${formatNumber(stats.top)}회 · ${official}</p></div><button class="mini-action" data-action="close-draw-log">닫기</button></div><div class="draw-log__summary"><strong>최근 ${recentN}회(최대 ${DRAW_LOG_LIMIT}회)</strong><span>${topLabel} ${recentTop}회 · ${pct(recentTop, recentN)}</span><div class="draw-log__grades">${grades}</div></div><ul class="gold-log__list draw-log__list">${rows || empty}</ul></div>`
    this.root.appendChild(overlay)
    requestAnimationFrame(() => overlay.classList.add('is-visible'))
  }

  /** 금화 내역 창(상단 금화를 누르면) */
  showGoldLog(): void {
    const state = this.renderedState
    if (!state) return
    this.root.querySelector('.gold-log')?.remove()
    const log = state.missions?.goldLog ?? []
    const time = (at: number) => new Intl.DateTimeFormat(locale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(at))
    const rows = log.length ? log.map(entry => `<li><time>${time(entry.at)}</time><b class="${entry.delta > 0 ? 'is-gain' : 'is-spend'}">${entry.delta > 0 ? '+' : ''}${formatNumber(entry.delta)}</b><span>${escapeHtml(entry.note)}</span><small>잔액 ${formatNumber(entry.after)}</small></li>`).join('') : '<li class="gold-log__empty">아직 기록이 없습니다. 이제부터 금화를 얻거나 쓰면 여기에 남습니다.</li>'
    const spent = log.filter(entry => entry.delta < 0).reduce((sum, entry) => sum - entry.delta, 0)
    const gained = log.filter(entry => entry.delta > 0).reduce((sum, entry) => sum + entry.delta, 0)
    const overlay = document.createElement('div')
    overlay.className = 'recruit-results gold-log'
    overlay.innerHTML = `<div class="recruit-results-backdrop" data-action="close-gold-log"></div><div class="recruit-results-panel gold-log__panel"><div class="recruit-results-heading"><div><span class="eyebrow">금화 내역</span><h2>${icon('gold', 'gi--inline')} 보유 금화 ${formatNumber(state.gold)}</h2><p>최근 ${GOLD_LOG_LIMIT}건 · 이 내역에서 얻은 금화 +${formatNumber(gained)} · 쓴 금화 −${formatNumber(spent)}</p></div><button class="mini-action" data-action="close-gold-log">닫기</button></div><ul class="gold-log__list">${rows}</ul></div>`
    this.root.appendChild(overlay)
    requestAnimationFrame(() => overlay.classList.add('is-visible'))
  }

  /** 뽑기 결과창: 지금 옥패 보유량(+ 남은 무료권) */
  private drawBalance(kind: 'recruit' | 'equipment'): string {
    const state = this.renderedState
    if (!state) return ''
    const free = kind === 'recruit' ? state.missions?.freeRecruits ?? 0 : state.missions?.freeDraws ?? 0
    return `<div class="draw-balance">${icon('honor', 'gi--inline')} 보유 옥패 <b>${formatNumber(state.honor)}</b>${free > 0 ? `<span>${kind === 'recruit' ? '무료 모집권' : '무료 장비 뽑기권'} ${free}회</span>` : ''}</div>`
  }

  showRecruitResults(rewards: General[]): void {
    this.root.querySelector('.recruit-results')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'recruit-results'
    const cards = rewards.map((general, index) => `<div class="recruit-result-card ${general.grade === 5 ? 'recruit-result-card--five-star' : ''}" style="--grade:${GRADE_META[general.grade].color};--accent:${gradeColor(general)};--reveal-delay:${Math.min(index, 9) * 70}ms"><span class="recruit-result-index">${String(index + 1).padStart(2, '0')}</span>${this.ritualPortrait(general)}<div><b>${escapeHtml(general.name)}</b><small>${general.grade}등급 · ${GRADE_META[general.grade].label} · Lv.${general.level}</small></div></div>`).join('')
    overlay.innerHTML = `<div class="recruit-results-backdrop"></div><div class="recruit-results-panel"><div class="recruit-results-heading"><div><span class="eyebrow">10회 모집 결과</span><h2>열 명의 무장이 응답했습니다</h2><p>획득한 무장은 도감에 기록되고, 중복 인장은 성급 성장에 사용됩니다.</p></div><button class="mini-action" data-action="close-recruit-results">닫기</button></div><div class="recruit-results-grid">${cards}</div>${this.drawBalance('recruit')}<div class="recruit-results-actions"><button class="action-button action-button--outline" data-action="reroll-recruit"><span>10명 다시 뽑기</span><b class="cost">${this.renderedState ? this.honorCost(recruitCost(this.renderedState, 10)) : this.honorCost(900)}</b></button><button class="action-button action-button--primary" data-action="close-recruit-results">결과 확인 완료 <span>→</span></button></div></div>`
    this.root.appendChild(overlay)
    requestAnimationFrame(() => overlay.classList.add('is-visible'))
  }

  showEquipmentResults(rewards: Equipment[]): void {
    this.root.querySelector('.recruit-results')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'recruit-results'
    const cards = rewards.map((item, index) => { const specialty = equipmentSpecialty(item); return `<div class="recruit-result-card equipment-result-card equipment-result-card--${item.grade}" style="--grade:${EQUIPMENT_GRADE_META[item.grade].color};--reveal-delay:${Math.min(index, 9) * 70}ms"><span class="recruit-result-index">${String(index + 1).padStart(2, '0')}</span><div class="equipment-result-icon"><img src="${equipmentImage(item.type)}" alt="${EQUIPMENT_TYPE_META[item.type].label}" /></div><div><b>${escapeHtml(item.name)}</b><small>${EQUIPMENT_GRADE_META[item.grade].label} · ${EQUIPMENT_TYPE_META[item.type].label} · +${equipmentValue(item)}</small><em>${escapeHtml(EQUIPMENT_SET_META[item.set].label)} · ${escapeHtml(item.skillName)}</em>${specialty ? `<strong class="equipment-specialty-badge">특기 · ${escapeHtml(specialty.label)}</strong>` : ''}</div></div>` }).join('')
    overlay.innerHTML = `<div class="recruit-results-backdrop"></div><div class="recruit-results-panel"><div class="recruit-results-heading"><div><span class="eyebrow">장비 획득 결과</span><h2>${rewards.length}개의 장비를 획득했습니다</h2><p>획득한 장비는 보유 장비에 추가되며, 무장에게 장착하거나 강화할 수 있습니다.</p></div><button class="mini-action" data-action="close-recruit-results">닫기</button></div><div class="recruit-results-grid equipment-results-grid">${cards}</div>${this.drawBalance('equipment')}<div class="recruit-results-actions"><button class="action-button action-button--outline" data-action="extra-equipment-draw" data-count="1"><span>1회 추가 뽑기</span><b class="cost">${this.honorCost(equipmentDrawCost(1))}</b></button><button class="action-button action-button--outline" data-action="extra-equipment-draw" data-count="10"><span>10회 추가 뽑기</span><b class="cost">${this.honorCost(equipmentDrawCost(10))}</b></button><button class="action-button action-button--primary" data-action="close-recruit-results">결과 확인 완료 <span>→</span></button></div></div>`
    this.root.appendChild(overlay)
    requestAnimationFrame(() => overlay.classList.add('is-visible'))
  }

  /** 튜토리얼이 화면을 옮길 때 모집·상점 탭과 무료 모집 표시를 맞춘다 */
  setOnboarding(options: { summonTab?: 'generals' | 'equipment'; shopTab?: 'resources'; freeRecruit?: boolean }): void {
    if (options.summonTab) this.summonTab = options.summonTab
    if (options.shopTab) this.shopTab = options.shopTab
    if (options.freeRecruit !== undefined) this.freeRecruit = options.freeRecruit
  }

  setBattleAutoAvailable(available: boolean): void {
    this.battleAutoAvailable = available
  }

  /** 무장 버튼을 길게 누르면 스킬(0.42초). 짧게 누르면 기동(클릭). */
  private handleUnitPress = (event: PointerEvent): void => {
    const unit = (event.target as HTMLElement).closest<HTMLElement>('[data-bt-unit]')
    if (!unit || (event.target as HTMLElement).closest('[data-action="battle-skill"]')) return
    window.clearTimeout(this.longPressTimer)
    const index = Number(unit.dataset.btUnit ?? 0)
    this.longPressTimer = window.setTimeout(() => {
      this.suppressMoveUntil = Date.now() + 700
      unit.classList.add('is-long-pressed')
      window.setTimeout(() => unit.classList.remove('is-long-pressed'), 260)
      this.callbacks.onBattleSkill(index)
    }, 420)
  }

  private cancelUnitPress = (): void => {
    window.clearTimeout(this.longPressTimer)
  }

  updateBattle(snapshot: BattleSnapshot): void {
    if (!snapshot.active) document.querySelector('.bt-view-picker')?.remove()
    if (snapshot.active && !this.powerMarked && this.renderedState) {
      this.powerMarked = true
      try { localStorage.setItem(POWER_MARK_KEY, JSON.stringify({ power: totalPower(this.renderedState), at: Date.now() })) } catch { /* 저장 못 해도 진행 */ }
    } else if (!snapshot.active) this.powerMarked = false
    this.latestBattle = snapshot
    if (snapshot.active) this.battleViewActive = true
    else if (this.renderedState?.section === 'battle') this.battleViewActive = false
    const q = <T extends HTMLElement = HTMLElement>(selector: string) => this.root.querySelector<T>(selector)
    // 전투 전체화면(Manus 개선안): 전투 중에는 좌측 메뉴·상단 재화를 숨기고, 끝나면 되돌린다.
    this.root.querySelector('.app-shell')?.classList.toggle('app-shell--battle', this.battleViewActive && this.renderedState?.section === 'battle')
    const section = q('.page-section--battle')
    if (!section) return
    const set = (selector: string, raw: string) => { const node = q(selector); const text = tr(raw); if (node && node.textContent !== text) node.textContent = text }
    const width = (selector: string, value: number) => { const node = q(selector); if (node) node.style.width = `${Math.max(0, Math.min(100, value))}%` }
    set('[data-bt-status]', snapshot.status)
    set('[data-bt-time]', snapshot.active || snapshot.result ? `남은 ${Math.ceil(snapshot.timeLeft)}초` : `제한 ${snapshot.mode === 'raid' ? 90 : snapshot.hardRule === 'swift' ? 80 : 120}초`)
    if (snapshot.mode === 'raid') set('[data-bt-raid]', formatNumber(snapshot.raidDamage ?? 0))
    q('[data-bt-time]')?.classList.toggle('is-urgent', snapshot.active && snapshot.timeLeft <= 20)
    set('[data-bt-phase]', `${snapshot.phaseName}`)
    set('[data-bt-morale-text]', `적 사기 ${snapshot.moraleValue} / ${snapshot.moraleMax}`)
    width('[data-bt-morale]', snapshot.morale)
    // 아군 사기 = 100 − 위협도(계산은 그대로, 화면만 사기로 보여 준다)
    // 사기는 0 아래로도 내려간다(음수로 표시, 막대는 0에서 멈춤)
    const allyMorale = 100 - snapshot.threat
    width('[data-bt-threat]', Math.max(0, allyMorale))
    set('[data-bt-threat-text]', `${Math.round(allyMorale * 6)} / 600`)
    q('.bt-hud-row--threat')?.classList.toggle('is-low', allyMorale <= 30)
    // 사기에 따른 아군 공격 · 방어 비율(사기 0이면 70%, 더 떨어지면 계속 감소 · 최저 10%)
    const allyStat = Math.max(10, Math.round(70 + 0.3 * allyMorale))
    set('[data-bt-collapse]', `공격·방어 ${allyStat}%`)
    q('[data-bt-collapse]')?.classList.toggle('is-danger', allyStat < 85)
    set('[data-bt-combo]', `연계 ${snapshot.combo}`)
    set('[data-bt-pressure]', `적 압박 ×${snapshot.difficultyMultiplier.toFixed(2)}`)
    set('[data-bt-bond]', snapshot.bond ? `인연 · ${snapshot.bond}` : '인연 없음')
    const pattern = snapshot.pattern
    const callout = q('[data-bt-callout]')
    callout?.classList.toggle('is-open', Boolean(pattern))
    callout?.classList.toggle('is-guard', pattern?.kind === 'guard')
    callout?.classList.toggle('is-hold', pattern?.kind === 'hold')
    set('[data-bt-pattern]', pattern ? pattern.label : snapshot.active ? '다음 예고 대기' : '전투 시작 전')
    width('[data-bt-window]', pattern ? pattern.timeLeft / pattern.window * 100 : 0)
    this.root.querySelectorAll<HTMLElement>('[data-bt-lane]').forEach(node => node.classList.toggle('is-target', Boolean(pattern && pattern.kind !== 'guard' && pattern.lanes.includes(Number(node.dataset.btLane)))))
    const warn = q('[data-bt-enemy-warn]')
    if (warn) {
      warn.hidden = !snapshot.enemyWarning
      if (snapshot.enemyWarning) warn.textContent = `적장 스킬 예고 · ${snapshot.enemyWarning.general}의 ‘${snapshot.enemyWarning.name}’`
    }
    section.classList.toggle('is-enemy-warning', Boolean(snapshot.enemyWarning))
    snapshot.units.forEach(unit => {
      const node = q(`[data-bt-unit="${unit.lane}"]`)
      if (!node) return
      const pct = unit.maxTroops ? unit.troops / unit.maxTroops * 100 : 0
      const bar = node.querySelector<HTMLElement>('[data-bt-unit-troops]')
      if (bar) bar.style.width = `${pct}%`
      const edge = node.querySelector<HTMLElement>('[data-bt-unit-edge]')
      if (edge) {
        edge.hidden = !unit.edge
        edge.className = `bt-unit-edge ${unit.edge === 'adv' ? 'is-adv' : unit.edge === 'dis' ? 'is-dis' : ''}`
        const text = unit.edge === 'adv' ? '상성 유리' : unit.edge === 'dis' ? '상성 불리' : ''
        if (edge.textContent !== tr(text)) edge.textContent = tr(text)
      }
      const cd = node.querySelector<HTMLElement>('[data-bt-unit-cd]')
      const ratio = unit.cooldownMax ? Math.min(1, unit.cooldown / unit.cooldownMax) : 0
      node.style.setProperty('--cd', `${Math.round(ratio * 360)}deg`)
      if (cd) cd.textContent = !snapshot.active ? unit.skillName : unit.ready ? '사용 가능 ▶' : `${unit.cooldown.toFixed(1)}초`
      node.classList.toggle('is-ready', unit.ready)
      node.classList.toggle('is-down', !unit.alive)
      node.classList.toggle('is-target', Boolean(pattern && pattern.kind !== 'guard' && pattern.lanes.includes(unit.lane)))
      node.classList.toggle('is-selected', unit.lane === snapshot.selectedUnit)
      const skill = node.querySelector<HTMLButtonElement>('[data-action="battle-skill"]')
      if (skill) skill.disabled = !unit.ready
    })
    width('[data-bt-gauge]', snapshot.tacticGauge)
    set('[data-bt-gauge-text]', `전술 게이지 ${snapshot.tacticGauge}`)
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="battle-tactic"]').forEach(button => {
      const tactic = (button.dataset.tactic ?? 'guard') as keyof BattleSnapshot['tacticCosts']
      const cost = snapshot.tacticCosts[tactic]
      button.disabled = !snapshot.active || snapshot.tacticGauge < cost
      const label = button.querySelector('em')
      if (label) label.textContent = String(cost)
      button.classList.toggle('is-called', tactic === 'guard' && (pattern?.kind === 'guard' || Boolean(snapshot.enemyWarning)))
    })
    q('[data-bt-guard]')?.classList.toggle('is-on', snapshot.guardActive)
    // 버프 · 디버프: 무장 이름 옆 아이콘
    const fx = (node: HTMLElement | null, chips: UnitEffectChip[] = []) => {
      if (!node) return
      const html = this.unitEffectIcons(chips)
      if (node.dataset.html !== html) { node.innerHTML = html; node.dataset.html = html }
    }
    snapshot.units.forEach(unit => fx(q(`[data-bt-unit="${unit.lane}"] [data-bt-unit-fx]`), snapshot.unitEffects.player[unit.lane]))
    snapshot.opponentDeck.forEach((_, index) => fx(q(`[data-bt-enemy="${index}"] [data-bt-enemy-fx]`), snapshot.unitEffects.enemy[index]))
    snapshot.troopStatus.filter(unit => unit.side === 'enemy').forEach(unit => {
      const card = q(`[data-bt-enemy="${unit.index}"]`)
      if (!card) return
      card.classList.toggle('is-down', !unit.alive)
      const bar = card.querySelector<HTMLElement>('i')
      if (bar) bar.style.width = `${unit.maxTroops ? unit.troops / unit.maxTroops * 100 : 0}%`
    })
    const enemies = q('[data-bt-enemies]')
    if (enemies && snapshot.opponentDeck.length && !enemies.dataset.filled) { enemies.innerHTML = this.enemyHudMarkup(snapshot.opponentDeck); enemies.dataset.filled = '1' }
    const log = q('[data-bt-log]')
    if (log) {
      const lines = this.battleLogOpen ? snapshot.log.slice(-8) : snapshot.log.slice(-2)
      const html = lines.map(line => `<li>${escapeHtml(line)}</li>`).join('') || '<li>전투 기록이 여기에 표시됩니다.</li>'
      if (log.dataset.html !== html) { log.innerHTML = html; log.dataset.html = html }
    }
    const speedButton = q('[data-bt-speed]')
    speedButton?.classList.toggle('is-on', snapshot.speed >= 2)
    if (speedButton && speedButton.textContent !== this.speedLabel(snapshot.speed)) speedButton.textContent = this.speedLabel(snapshot.speed)
    set('[data-bt-pause]', snapshot.paused ? '▶ 계속' : '❚❚ 멈춤')
    q('[data-bt-pause]')?.classList.toggle('is-on', snapshot.paused)
    const paused = q('[data-bt-paused]')
    if (paused) paused.hidden = !snapshot.paused
    section.classList.toggle('is-paused', snapshot.paused)
    const stop = q('[data-bt-stop]')
    if (stop) stop.textContent = Date.now() < this.stopConfirmUntil ? '한 번 더 누르면 중지' : '■ 전투 중지'
    q('[data-bt-auto]')?.classList.toggle('is-on', snapshot.autoPlay)
    const autoSkillButton = q('[data-bt-auto-skill]')
    autoSkillButton?.classList.toggle('is-on', snapshot.autoSkill)
    autoSkillButton?.setAttribute('aria-pressed', String(snapshot.autoSkill))
    const startButton = q('[data-action="battle-start"]')
    if (startButton) startButton.style.display = snapshot.active ? 'none' : 'inline-flex'
  }

  /** 스킬 사용: 그 무장 머리 위에 초상 · 스킬 이름이 솟아올랐다 사라진다(무장이 움직이면 따라간다) */
  showSkillCutIn(info: { side: 'player' | 'enemy'; lane: number; id: string; name: string; skill: string }): void {
    const key = `skill-pop-${info.side}-${info.lane}`
    document.getElementById(key)?.remove()
    const pop = document.createElement('div')
    pop.id = key
    pop.className = `skill-pop skill-pop--${info.side}`
    pop.setAttribute('aria-live', 'polite')
    pop.innerHTML = `<div class="skill-pop__card"><span class="skill-pop__face" style="background-image:url('${assetUrl(`/assets/generals-realistic-webp/${info.id}.webp`)}')"></span><span class="skill-pop__text"><small>${escapeHtml(info.name)}</small><strong>${escapeHtml(info.skill)}</strong></span></div>`
    document.body.appendChild(pop)
    const started = performance.now()
    let last: { x: number; y: number } | null = null
    const place = () => {
      if (!pop.isConnected) return
      const point = this.unitLocator?.(info.side, info.lane) ?? last
      if (point) {
        last = point
        // 화면 가장자리에서 잘리지 않게 안쪽으로
        const half = Math.min(pop.offsetWidth / 2, window.innerWidth / 2)
        const x = Math.max(half + 4, Math.min(window.innerWidth - half - 4, point.x))
        const y = Math.max(pop.offsetHeight + 4, point.y - 6)
        pop.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
        pop.classList.add('is-placed')
      }
      if (performance.now() - started < 1700) requestAnimationFrame(place)
      else pop.remove()
    }
    place()
  }

  /** 전장 무장의 화면 위치를 알려 주는 함수(전투 화면이 넣어 준다) */
  setUnitLocator(locate: ((side: 'player' | 'enemy', lane: number) => { x: number; y: number } | null) | null): void {
    this.unitLocator = locate
  }

  showBattleResult(result: BattleResult, notice = '', factors: Array<{ label: string; text: string; tone: 'good' | 'bad' | 'neutral' }> = []): void {
    const stars = [1, 2, 3].map(index => `<i class="${index <= result.stars ? 'is-on' : ''}">★</i>`).join('')
    const reason = { morale: '적 사기를 무너뜨렸습니다', wipe: '적 병력을 전멸시켰습니다', timeout: '제한 시간 안에 끝내지 못했습니다', troops: '아군 병력이 전멸했습니다', collapse: '아군 사기가 무너졌습니다', ratio: '남은 병력 비율로 판정했습니다', raid: `레이드 종료 · 누적 피해 ${(result.raidDamage ?? 0).toLocaleString('ko-KR')}` }[result.reason]
    const rows = [
      ['예고 파훼', `${result.breaks} / ${result.patterns}`],
      ['최대 연계', String(result.maxCombo)],
      ['남은 병력', `${Math.round(result.troopRatio * 100)}%`],
      ['전투 시간', `${Math.round(result.durationMs / 1000)}초`],
    ].map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('')
    const checks = result.won ? `<ul class="result-checks"><li class="is-on">승리</li><li class="${result.troopRatio >= 0.5 ? 'is-on' : ''}">병력 50% 이상</li><li class="${result.breaks > 0 ? 'is-on' : ''}">적 사기 꺾기</li></ul>` : ''
    const modal = document.createElement('div')
    modal.className = 'result-modal'
    modal.innerHTML = `<div class="result-card"><span class="eyebrow">작전 결과</span><div class="result-mark">${result.won ? '승리' : '패배'}</div>${result.won ? `<div class="result-stars">${stars}</div>` : ''}<h2>${escapeHtml(reason)}</h2>${checks}<div class="result-grid">${rows}</div>${factors.length ? `<div class="result-factors"><span class="eyebrow">승패 요인</span><ul>${factors.map(item => `<li class="is-${item.tone}"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.text)}</span></li>`).join('')}</ul></div>` : ''}${notice ? `<p>${escapeHtml(notice)}</p>` : ''}<div class="result-score"><span>작전 점수</span><strong>${formatNumber(result.score)}</strong></div><button class="action-button action-button--primary" data-action="close-result">확인</button></div>`
    this.root.appendChild(modal)
    requestAnimationFrame(() => modal.classList.add('is-visible'))
  }

  private accessGate(): string {
    const offline = this.auth.status === 'offline'
    return `<section class="access-gate"><div class="access-gate__backdrop"></div><div class="access-gate__panel"><div class="access-gate__art" aria-hidden="true"></div><div class="access-gate__seal"><span>✦</span></div><span class="eyebrow">천하 · 패왕의 시대</span><h1>천하: 패왕의 시대</h1><p class="access-gate__lead">무장을 모으고, 진형을 지휘하고,<br>당신의 이름을 전장에 새기십시오.</p><div class="access-gate__divider"><i></i><span>접속 방식 선택</span><i></i></div><div class="access-gate__actions"><button class="access-choice access-choice--member" data-action="login"><strong>회원 로그인</strong><span>계정·전적·랭킹을 안전하게 저장합니다.</span><b>아이디 · 비밀번호로 계속 <em>→</em></b></button><button class="access-choice access-choice--guest" data-action="guest-login"><strong>게스트 로그인</strong><span>아이디만 정하고 바로 시작합니다.</span><b>${offline ? '이 기기에서만 로컬 저장' : '서버에 저장 · 모든 콘텐츠 이용'} <em>→</em></b></button></div><p class="access-gate__note">${offline ? '현재 회원 인증 서버에 연결할 수 없습니다. 게스트 모드로 플레이할 수 있습니다.' : '회원 로그인 후에도 기존 게스트 진행 데이터는 이 기기에 보존됩니다.'}</p><div class="setting-seg access-gate__lang" data-no-tr><button class="setting-seg__btn ${isEnglish() ? '' : 'is-active'}" data-action="set-lang" data-value="ko">한국어</button><button class="setting-seg__btn ${isEnglish() ? 'is-active' : ''}" data-action="set-lang" data-value="en">English</button></div></div></section>`
  }

  private factionSelection(): string {
    // 삼국(위 · 촉 · 오)은 고르지 않고 서버가 가장 약한 진영에 넣는다(2026.10.22). 재야만 직접 고른다
    const factions: Array<{ id: Faction | 'auto'; cls: string; name: string; title: string; region: string; color: string; description: string; cta: string }> = [
      { id: 'auto', cls: 'realm', name: '삼국', title: '위 · 촉 · 오', region: '자동 배정 · 가장 약한 진영으로', color: '#52e0c4', description: '위 · 촉 · 오 가운데 지금 가장 약한 진영에 배정됩니다. 시즌이 바뀔 때마다 접속 · 전투력 · 금화 사용량에 따라 연맹 단위로 세 진영을 고르게 다시 나눕니다.', cta: '삼국 진영으로 시작' },
      { id: '재야', cls: 'wanderer', name: '재', title: '재야', region: '중립 진영 · 천하 유랑 · 본성 없음', color: '#d8c3a0', description: '본성 없이 어느 도시든 공성해 그 성의 자원을 약탈합니다. 점령 · 내정 · 최종 세력전은 할 수 없고, 낙양만은 세 진영처럼 차지할 수 있습니다. 시즌이 바뀌어도 재야로 남습니다.', cta: '재야로 시작' },
    ]
    return `<section class="faction-selection"><div class="faction-selection__backdrop"></div><div class="faction-selection__panel"><span class="eyebrow">진영 선택</span><h1>어느 진영으로 천하를 이끌겠습니까?</h1><p class="faction-selection__lead">삼국 진영은 세 진영의 힘이 고르도록 자동으로 배정되고,<br>재야는 본성 없이 천하를 떠돌며 약탈합니다.</p><div class="faction-selection__cards">${factions.map(faction => `<button class="faction-choice faction-choice--${faction.cls}" style="--faction-color:${faction.color}" data-action="faction-select" data-faction="${faction.id}"><span class="faction-choice__crest">${faction.name}</span><span class="faction-choice__copy"><strong>${faction.title}</strong><small>${faction.region}</small><em>${faction.description}</em></span><b>${faction.cta} <i>→</i></b></button>`).join('')}</div><p class="faction-selection__note">배정된 진영은 영토 지도에서 아군으로 표시됩니다. 재야로 옮기거나 재야에서 삼국으로 돌아오는 것은 30일에 한 번 할 수 있고, 삼국 사이의 진영은 시즌마다 서버가 정합니다.</p></div></section>`
  }

  private shell(state: StrategyState): string {
    return `
      <div class="app-shell${state.section === 'battle' && this.battleViewActive ? ' app-shell--battle' : ''}">
        <header class="topbar">
          <div class="brand-lockup"><div class="brand-seal brand-seal--img"><img src="/assets/ui/brand-seal.svg" alt="천하 인장" width="40" height="40" draggable="false"></div><div class="brand-text"><div class="brand-title">천하</div><div class="brand-subtitle">패왕의 시대</div></div><button type="button" class="brand-attendance" data-action="attendance-open" title="출석 체크 보기" aria-label="출석 체크 보기"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="8" width="20" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 13.5h20" stroke="currentColor" stroke-width="1.6"/><path d="M11 5.5v5M21 5.5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M11.2 19.6l3.2 3.1 6.6-6.6" fill="none" stroke="#e8553a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="brand-attendance__count"><b>${Math.min(ATTENDANCE_REWARDS.length, state.missions?.attendance?.count ?? 0)}</b>/${ATTENDANCE_REWARDS.length}</span></button></div>
          <div class="topbar-center">${this.seasonChip()}<button type="button" class="topbar-chapter" data-action="section" data-section="battle" title="시나리오로 이동"><span class="season-dot"></span><span>${this.chapterLabel(state)}</span></button><span class="topbar-divider"></span><div class="topbar-resources"><button type="button" class="topbar-resource topbar-resource--gold" data-action="gold-log" title="금화 · 눌러서 사용 내역 보기">${icon('gold')}<small>금화</small><strong>${formatNumber(state.gold)}</strong></button><span class="topbar-resource topbar-resource--silver" title="은전">${icon('silver')}<small>은전</small><strong title="${formatNumber(state.silver)}">${compactNumber(state.silver)}</strong></span><span class="topbar-resource topbar-resource--honor" title="옥패">${icon('honor')}<small>옥패</small><strong title="${formatNumber(state.honor)}">${compactNumber(state.honor)}</strong></span><span class="topbar-resource topbar-resource--influence" title="영향력">${icon('influence')}<small>영향력</small><strong title="${formatNumber(state.resources.influence)}">${compactNumber(state.resources.influence)}</strong></span><span class="topbar-resource topbar-resource--grain" title="식량">${icon('grain')}<small>식량</small><strong title="${formatNumber(state.resources.grain)}">${compactNumber(state.resources.grain)}</strong></span><span class="topbar-resource topbar-resource--wood" title="목재">${icon('wood')}<small>목재</small><strong title="${formatNumber(state.resources.wood)}">${compactNumber(state.resources.wood)}</strong></span><span class="topbar-resource topbar-resource--iron" title="철">${icon('iron')}<small>철</small><strong title="${formatNumber(state.resources.iron)}">${compactNumber(state.resources.iron)}</strong></span></div></div>
          ${state.section === 'battle' && this.battleViewActive ? this.battleTopControls() : ''}
          <div class="topbar-actions"><button class="lang-toggle sound-toggle ${muteSetting() ? 'is-muted' : ''}" data-action="sound-toggle" data-no-tr title="${muteSetting() ? '소리 켜기' : '소리 끄기'}" aria-label="${muteSetting() ? '소리 켜기' : '소리 끄기'}">${muteSetting() ? '🔇' : '🔊'}</button><button class="lang-toggle" data-action="set-lang" data-value="${isEnglish() ? 'ko' : 'en'}" data-no-tr title="언어 / Language">${isEnglish() ? '한국어' : 'EN'}</button><button class="auth-button" data-auth-button data-action="${this.auth.status === 'authenticated' ? 'logout' : this.auth.status === 'offline' ? 'offline' : 'login'}" title="${this.auth.status === 'authenticated' ? `${escapeHtml(this.auth.name ?? '장군')} · 로그아웃` : ''}">${authButtonInner(this.auth)}</button></div>
        </header>
        <aside class="sidebar">
          ${this.navGroup('본진')}
          ${this.navButton('overview', icon('overview'), '본영', state.section)}
          ${this.navButton('roster', icon('roster'), '보유 무장', state.section, `${state.generals.length}`)}
          ${this.navButton('codex', icon('codex'), '무장 도감', state.section, `${allGenerals().length}`)}
          ${this.navButton('formation', icon('formation'), '출전 편성', state.section, `${deployedIds(state.formation).length}/3`)}
          ${this.navGroup('육성')}
          ${this.navButton('recruit', icon('recruit'), '모집 · 장비', state.section, state.lastRecruit ? 'NEW' : '')}
          ${this.navButton('equipment', icon('equipment'), '장비 관리', state.section, `${equipmentInventoryCount(state)}`)}
          ${this.navButton('research', icon('research'), '기술 연구', state.section)}
          ${this.navButton('territory', icon('territory'), '영토 · 내정', state.section, `${state.cities.filter(city => city.owner === state.faction).length}`)}
          ${this.navGroup('전투')}
          ${this.navButton('battle', icon('battle'), '시나리오', state.section)}
          ${this.navButton('duel', icon('duel'), '유저 대련', state.section, `${duelAttemptsRemaining(state)}/5`)}
          ${this.navButton('raid', icon('raid'), '주간 레이드', state.section, this.raidView.info ? `${this.raidView.info.attemptsLeft}/${this.raidView.info.dailyLimit}` : '')}
          ${this.navButton('rank', icon('rank'), '천하 랭킹', state.section)}
          ${this.navGroup('소통')}
          ${this.navButton('board', icon('board'), '진영 게시판', state.section)}
          ${this.navButton('guild', icon('guild'), '연맹', state.section, this.guildUi.me?.requests?.length ? `${this.guildUi.me.requests.length}` : this.guildUi.me?.pending?.length ? '보상' : '')}
          ${this.navButton('shop', icon('shop'), '상점', state.section)}
          ${this.navButton('updates', icon('updates'), '업데이트 기록', state.section, 'NEW')}
          ${this.navButton('account', icon('account'), '계정 관리', state.section)}
          ${this.canOpenBalance() || this.isAdmin() ? `<div class="nav-ops">${this.canOpenBalance() ? `<a class="nav-button nav-button--link nav-button--ops" href="./balance.html" data-nav><span class="nav-icon">${icon('balance')}</span><span class="nav-label">밸런스 테스트</span>${shortNavLabel('balance')}</a>` : ''}${this.isAdmin() ? this.navButton('admin', icon('admin'), '관리자 센터', state.section).replace('class="nav-button ', 'class="nav-button nav-button--ops ') : ''}</div>` : ''}
          ${this.navMoreButton(state)}
          <div class="sidebar-spacer"></div>
          <div class="sidebar-profile"><div class="profile-orb">${state.faction.slice(0, 1)}</div><div><strong>${state.faction} 진영</strong><small>무장 ${state.generals.length}명 · 영토 ${state.cities.filter(city => city.owner === state.faction).length}성</small></div></div>
        </aside>
        <main class="main-content">
          ${this.hubTabs(state)}
          ${this.renderSection(state)}
        </main>
        <div class="ambient-vignette"></div>
        <div class="toast" data-toast></div>
      </div>`
  }

  private navButton(section: Section, icon: string, label: string, current: Section, badge = ''): string {
    // 배지: 숫자는 금테 작은 상자, 새 소식(NEW)은 붉은 ‘새’ 표시
    const mark = !badge ? '' : badge === 'NEW' ? '<b class="nav-badge nav-badge--new">새</b>' : `<b class="nav-badge">${badge}</b>`
    const coach = this.coachSection === section && current !== section ? 'nav-coach' : ''
    const primary = MOBILE_TABS.includes(section) ? 'nav-button--primary' : ''
    return `<button class="nav-button ${primary} ${current === section ? 'is-active' : ''} ${coach}" data-action="section" data-section="${section}" data-nav><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span>${shortNavLabel(section)}${mark}</button>`
  }

  /** 묶음 안에서 지금 보여 줄 수 있는 화면(관리자 화면은 관리자만) */
  private hubSections(hub: NavHub): Section[] {
    return hub.sections.filter(section => section !== 'admin' || this.isAdmin())
  }

  /** 가로 휴대폰: 묶음 안 화면을 고르는 위쪽 탭(화면 제목을 겸한다) */
  private hubTabs(state: StrategyState): string {
    if (state.section === 'battle' && this.battleViewActive) return ''
    const hub = hubOf(state.section)
    const sections = this.hubSections(hub)
    const tabs = sections.map(section => {
      // 묶음 이름과 겹치지 않게: 무장 묶음의 첫 탭은 ‘보유’, 전투 묶음의 첫 탭은 ‘시나리오’
      const pair = HUB_TAB_NAMES[section] ?? SHORT_NAV[section]
      const label = pair ? (isEnglish() ? pair[1] : pair[0]) : section
      return `<button class="hub-tabs__tab${section === state.section ? ' is-active' : ''}" data-action="section" data-section="${section}" data-no-tr>${label}</button>`
    }).join('')
    const balance = hub.id === 'more' && this.canOpenBalance() ? `<a class="hub-tabs__tab" href="./balance.html" data-no-tr>${isEnglish() ? 'Balance' : '밸런스'}</a>` : ''
    const back = `<button class="hub-tabs__back" data-action="section" data-section="overview" aria-label="본영으로">‹ <span data-no-tr>${isEnglish() ? 'Base' : '본영'}</span></button>`
    return `<div class="hub-tabs hub-tabs--${hub.id}" role="tablist">${back}${tabs}${balance}</div>`
  }

  /** 휴대폰 하단 탭의 ‘더보기’: 주요 5개 밖의 메뉴를 펼친다 */
  private navMoreButton(state: StrategyState): string {
    const outside = !MOBILE_TABS.includes(state.section)
    const coach = this.coachSection && !MOBILE_TABS.includes(this.coachSection as Section) && this.coachSection !== state.section ? 'nav-coach' : ''
    return `<div class="nav-more-rule" aria-hidden="true"></div><button class="nav-button nav-button--primary nav-button--more ${outside ? 'is-active' : ''} ${coach}" data-action="nav-more" aria-label="더보기"><span class="nav-icon"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="nav-short">${isEnglish() ? 'More' : '더보기'}</span></button>`
  }

  /** 메뉴 분류 패(칠기 목패 위 금박 패) */
  private navGroup(label: string): string {
    return `<div class="nav-group"><span>${label}</span></div>`
  }

  private renderSection(state: StrategyState): string {
    if (state.section === 'equipment') return this.equipmentSection(state)
    if (state.section === 'recruit') return this.summoningSection(state)
    if (state.section === 'roster') return this.rosterSection(state)
    if (state.section === 'codex') return this.codexSection(state)
    if (state.section === 'formation') return this.formationSection(state)
    if (state.section === 'territory') return this.territorySection(state)
    if (state.section === 'research') return this.researchSection(state)
    if (state.section === 'battle') return this.battleViewActive ? this.battleSection(state) : this.scenarioSection(state)
    if (state.section === 'duel') return this.duelSection(state)
    if (state.section === 'raid') return this.raidSection(state)
    if (state.section === 'shop') return this.shopSection(state)
    if (state.section === 'rank') return this.rankSection(state)
    if (state.section === 'board') return this.boardSection(state)
    if (state.section === 'guild') return guildSection(state, this.guildUi)
    if (state.section === 'updates') return this.updatesSection()
    if (state.section === 'account') return this.accountSection()
    if (state.section === 'admin') return this.isAdmin() ? this.adminSection(state) : this.overviewSection(state)
    return this.overviewSection(state)
  }

  /** 다음에 깰 시나리오(모두 깼으면 마지막 시나리오) */
  private nextScenario(state: StrategyState) {
    return SCENARIOS.find(scenario => !state.scenarioCleared.includes(scenario.id)) ?? SCENARIOS[SCENARIOS.length - 1]
  }

  /** 위쪽 막대·본영 꼬리글에 함께 쓰는 지금의 장 이름 */
  private chapterLabel(state: StrategyState): string {
    const next = this.nextScenario(state)
    // 다음에 치를 시나리오(누르면 시나리오 화면으로)
    return next ? `다음 전투 · ${next.year}년 ${next.title}` : '모든 시나리오 완료'
  }


  /** 작전 전투력 변화: 마지막 전투를 시작할 때의 전투력과 비교(이 기기 기준) */
  private powerDelta(power: number): string {
    let mark = 0
    try { mark = Number(JSON.parse(localStorage.getItem(POWER_MARK_KEY) ?? 'null')?.power) || 0 } catch { mark = 0 }
    if (!mark) return ''
    const diff = power - mark
    if (Math.abs(diff) < 1) return ''
    return `<span class="stat-delta ${diff < 0 ? 'stat-delta--down' : ''}" title="지난 전투 대비">${diff > 0 ? '▲' : '▼'} ${formatNumber(Math.abs(Math.round(diff)))}</span>`
  }

  private noticeTime(): string {
    if (!this.noticeAt) return '최근 소식'
    const minutes = Math.floor((Date.now() - this.noticeAt) / 60000)
    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    return `${Math.floor(minutes / 60)}시간 전`
  }

  /** 가로 휴대폰 본영: 임무 창 */
  private lobbyPanel: 'missions' | null = null

  /**
   * 가로 휴대폰 본영(모바일 전략 게임형): 대표 무장 그림을 화면 전체에 깔고
   * 왼쪽 위 내 정보 · 이벤트 아이콘 · 임무, 오른쪽 출전 무장, 오른쪽 아래 붉은 메뉴 묶음과 출전 버튼을 얹는다.
   */
  private mobileLobby(state: StrategyState): string {
    const next = this.nextScenario(state)
    const allCleared = SCENARIOS.every(scenario => state.scenarioCleared.includes(scenario.id))
    const stars = next ? scenarioStars(state.scenarioCleared, next.id) : 0
    const power = totalPower(state)
    const deployed = state.formation.map(id => state.generals.find(item => item.id === id)).filter((item): item is General => Boolean(item))
    const leader = [...deployed].sort((a, b) => combatPower(b) - combatPower(a))[0] ?? state.generals[0]
    const en = isEnglish()
    const name = this.auth.status === 'authenticated' && this.auth.name ? this.auth.name : (en ? 'Guest' : '게스트')
    const cities = state.cities.filter(city => city.owner === state.faction).length
    // 일일 임무: 끝낸 수 / 전체, 받을 보상이 있으면 붉은 점
    const daily = MISSIONS.filter(mission => mission.scope === 'daily')
    const statuses = daily.map(mission => missionStatus(state, mission))
    const doneCount = statuses.filter(status => status !== 'progress').length
    const claimable = statuses.includes('ready') || dailyBonusReady(state)
    const nextMission = daily.find((_, index) => statuses[index] === 'progress')
    // 본영은 상단바를 숨기고 재화 줄을 직접 그린다(내 정보 카드와 겹치지 않게)
    const chip = (name: IconName, value: number, extra = '') => `<span class="ml-res__chip"${extra}>${icon(name)}<strong title="${formatNumber(value)}">${compactNumber(value)}</strong></span>`
    const resources = `<div class="ml-res"><button type="button" class="ml-res__chip" data-action="gold-log">${icon('gold')}<strong>${formatNumber(state.gold)}</strong></button>${chip('silver', state.silver)}${chip('honor', state.honor)}${chip('grain', state.resources.grain)}<button type="button" class="ml-res__sound" data-action="sound-toggle" aria-label="${muteSetting() ? '소리 켜기' : '소리 끄기'}">${muteSetting() ? '🔇' : '🔊'}</button></div>`
    const profile = `<button class="ml-profile" data-action="section" data-section="account">${leader ? `<span class="ml-profile__face" style="background-image:url('${this.portraitAsset(leader)}')"></span>` : ''}<span class="ml-profile__seal" data-no-tr>${escapeHtml(state.faction.slice(0, 1))}</span><span class="ml-profile__body"><strong>${ugc(name)}</strong><small>${escapeHtml(state.faction)} · ${en ? 'Power' : '전투력'} <b>${formatNumber(power)}</b></small><small>${en ? 'Generals' : '무장'} ${state.generals.length} · ${en ? 'Cities' : '영토'} ${cities}${en ? '' : '성'}</small></span></button>`
    const events = `<div class="ml-events"><button class="ml-event" data-action="attendance-open"><span class="ml-event__icon">${CALENDAR_SVG}</span><span>${en ? 'Check-in' : '출석'}</span></button><button class="ml-event" data-action="section" data-section="updates"><span class="ml-event__icon">${icon('updates')}</span><span>${en ? 'News' : '소식'}</span></button><button class="ml-event" data-action="section" data-section="rank"><span class="ml-event__icon">${icon('rank')}</span><span>${en ? 'Ranks' : '랭킹'}</span></button></div>`
    const missions = `<button class="ml-missions${claimable ? ' has-reward' : ''}" data-action="lobby-panel" data-panel="missions"><span class="ml-missions__head"><b>${en ? 'Daily missions' : '일일 임무'}</b><span>(${doneCount}/${daily.length})</span></span><span class="ml-missions__line">${doneCount >= daily.length ? (en ? '✓ All done today' : '✓ 오늘 임무 완료') : escapeHtml(nextMission?.label ?? '')}</span></button>`
    const army = `<div class="ml-army">${[0, 1, 2].map(index => { const general = deployed[index]; return general ? `<button class="ml-army__slot" data-action="section" data-section="formation" style="--grade:${gradeColor(general)}"><span class="ml-army__face" style="background-image:url('${this.portraitAsset(general)}')"></span><small>${escapeHtml(general.name)}</small></button>` : `<button class="ml-army__slot is-empty" data-action="section" data-section="formation"><span class="ml-army__face">＋</span><small>${en ? 'Empty' : '빈 자리'}</small></button>` }).join('')}</div>`
    // 화면 아래쪽을 가로로 꽉 채우는 메뉴 바(12칸)
    const menu = `<nav class="ml-dock" aria-label="메뉴">${LOBBY_MENU.map(([section, iconName, ko, enLabel]) => { const badge = section === 'formation' ? (deployed.length < 3 ? '!' : '') : section === 'duel' ? `${duelAttemptsRemaining(state)}` : section === 'recruit' && state.lastRecruit ? '●' : ''; return `<button class="ml-dock__btn${this.coachSection === section ? ' is-coach' : ''}" data-action="section" data-section="${section}"><span class="ml-dock__icon">${icon(iconName)}</span><span class="ml-dock__label" data-no-tr>${en ? enLabel : ko}</span>${badge ? `<b>${badge}</b>` : ''}</button>` }).join('')}</nav>`
    const march = next ? `<button class="ml-march" data-action="section" data-section="battle" data-scenario-id="${next.id}"><span class="ml-march__info"><small>${allCleared ? (en ? 'Replay' : '다시 도전') : `${next.year}${en ? '' : '년'}`} · ${en ? 'Enemy' : '적'} Lv.${scenarioEnemyLevel(next)} <i>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</i></small><strong>${escapeHtml(next.title)}</strong></span><span class="ml-march__go">${en ? 'March' : '출전'}</span></button>` : ''
    const tools = `<div class="ml-tools"><button class="ml-tool" data-action="section" data-section="account" aria-label="설정">${icon('account')}</button>${this.isAdmin() ? `<button class="ml-tool" data-action="section" data-section="admin" aria-label="관리자">${icon('admin')}</button>` : ''}</div>`
    const panel = this.lobbyPanel === 'missions' ? `<div class="ml-panel" role="dialog" aria-label="임무"><div class="ml-panel__backdrop" data-action="lobby-panel-close"></div><div class="ml-panel__body"><button class="ml-panel__close" data-action="lobby-panel-close" aria-label="닫기">✕</button>${this.tutorialCard(state)}${this.missionCard(state)}</div></div>` : ''
    return `<section class="page-section page-section--mlobby"><div class="ml-bg" aria-hidden="true"></div>${leader ? `<div class="ml-hero" style="--portrait:url('${this.portraitAsset(leader)}')" aria-hidden="true"></div>` : ''}${resources}${profile}${events}${missions}${army}${menu}${march}${tools}${panel}</section>`
  }

  private overviewSection(state: StrategyState): string {
    if (isPhoneLandscape()) return this.mobileLobby(state)
    const next = this.nextScenario(state)
    const allCleared = SCENARIOS.every(scenario => state.scenarioCleared.includes(scenario.id))
    const stars = next ? scenarioStars(state.scenarioCleared, next.id) : 0
    const power = totalPower(state)
    // 로비: 대표 무장(출전 중 전투력 1위) 그림 + 다음 전투 + 큰 출전 버튼 + 아이콘 바로가기
    const leader = state.formation.map(id => state.generals.find(item => item.id === id)).filter((item): item is General => Boolean(item)).sort((a, b) => combatPower(b) - combatPower(a))[0] ?? state.generals[0]
    const shortcuts: Array<[Section, IconName, string, string]> = [
      ['recruit', 'recruit', '모집', ''],
      ['formation', 'formation', '편성', `${deployedIds(state.formation).length}/3`],
      ['research', 'research', '연구', ''],
      ['territory', 'territory', '영토', ''],
      ['duel', 'duel', '대련', `${duelAttemptsRemaining(state)}`],
      ['shop', 'shop', '상점', ''],
    ]
    const stage = next ? `<div class="lobby-stage">${leader ? `<div class="lobby-leader" style="--portrait:url('${this.portraitAsset(leader)}')" role="img" aria-label="${escapeHtml(leader.name)}"></div>` : ''}<div class="lobby-info"><span class="lobby-chapter">${allCleared ? '다시 도전' : `${next.year}년`}</span><h2>${escapeHtml(next.title)}</h2><div class="lobby-enemy"><span>적 Lv.${scenarioEnemyLevel(next)}</span><span class="lobby-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></div><div class="lobby-power"><small>전투력</small><strong>${formatNumber(power)}</strong>${this.powerDelta(power)}</div><button class="action-button action-button--primary lobby-march" data-action="section" data-section="battle" data-scenario-id="${next.id}">출전</button></div></div>` : ''
    const shortcutRow = `<nav class="lobby-shortcuts">${shortcuts.map(([section, name, label, badge]) => `<button class="lobby-shortcut" data-action="section" data-section="${section}"><span class="lobby-shortcut__icon">${icon(name)}</span><span>${label}</span>${badge ? `<b>${badge}</b>` : ''}</button>`).join('')}</nav>`
    return `<section class="page-section page-section--overview page-section--lobby">${stage}${shortcutRow}
      ${this.tutorialCard(state)}${this.missionCard(state)}
      <div class="overview-grid"><div class="glass-card formation-card"><div class="card-header"><div><span class="eyebrow">편성</span><h3>출전 진형</h3></div><button class="text-button" data-action="section" data-section="roster">편성 변경</button></div><div class="formation-row">${state.formation.map(id => { const general = state.generals.find(item => item.id === id); return general ? this.miniGeneral(general) : '' }).join('')}</div><div class="formation-footer"><span><i class="status-dot"></i> ${deployedIds(state.formation).length >= 3 ? '출전 준비 완료' : '빈 자리가 있습니다'}</span><span class="muted">${deployedIds(state.formation).length}/3 자리</span></div></div><div class="glass-card notice-card"><h3>최근 소식</h3><p class="notice-text">${escapeHtml(state.lastNotice)}</p><div class="notice-meta"><span>${this.noticeTime()}</span><button class="text-button" data-action="section" data-section="updates">업데이트 기록</button></div></div></div>
      <div class="section-footnote"><span class="footnote-line"></span><span>${this.chapterLabel(state)}</span><span class="footnote-line"></span></div></section>`
  }

  /** 본영: 처음 시작 안내(6단계 · 모두 마치면 보상) */
  private tutorialCard(state: StrategyState): string {
    const missions = ensureMissions(state)
    if (missions.tutorialDone) return ''
    const done = new Set(missions.tutorial ?? [])
    const next = nextTutorialStep(state)
    const steps = TUTORIAL_STEPS.map((step, index) => `<li class="${done.has(step.id) ? 'is-done' : next?.id === step.id ? 'is-next' : ''}"><span class="tut-num">${done.has(step.id) ? '✓' : index + 1}</span><div><strong>${step.label}</strong><small>${step.hint}</small></div>${!done.has(step.id) ? `<button class="mini-action" ${step.section === 'overview' ? 'data-action="scroll-missions"' : `data-action="section" data-section="${step.section}"`}>바로 가기</button>` : ''}</li>`).join('')
    const finished = tutorialFinished(state)
    return `<div class="glass-card tutorial-card"><div class="card-header"><div><span class="eyebrow">처음 시작 안내 · ${done.size}/${TUTORIAL_STEPS.length}</span><h3>${finished ? '모든 안내를 마쳤습니다!' : `다음: ${next?.label ?? ''}`}</h3></div><button class="text-button" data-action="tutorial-skip">안내 닫기</button></div><ol class="tutorial-steps">${steps}</ol><div class="tutorial-reward"><span>모두 마치면 · ${rewardText(TUTORIAL_REWARD)}</span><button class="mini-action mini-action--research" data-action="tutorial-claim" ${finished ? '' : 'disabled'}>보상 받기</button></div></div>`
  }

  /** 바뀐 규칙 안내(접속 때 한 번) */
  showNoticePopup(items: Array<[string, string]>, onClose: () => void): void {
    document.querySelector('.notice-popup')?.remove()
    const popup = document.createElement('div')
    popup.className = 'notice-popup'
    popup.innerHTML = `<div class="notice-popup__card"><span class="eyebrow">새로 바뀐 점</span><h2>이렇게 달라졌습니다</h2><ul>${items.map(([title, text]) => `<li><b>${escapeHtml(title)}</b><span>${escapeHtml(text)}</span></li>`).join('')}</ul><div class="notice-popup__actions"><button class="action-button action-button--outline" data-notice-more>업데이트 기록 보기</button><button class="action-button action-button--primary" data-notice-close>확인</button></div></div>`
    const close = () => { popup.remove(); onClose() }
    popup.querySelector('[data-notice-close]')?.addEventListener('click', close)
    popup.querySelector('[data-notice-more]')?.addEventListener('click', () => { close(); this.callbacks.onSection('updates') })
    document.body.appendChild(popup)
  }

  /** 본영: 일일·주간 임무 */
  private missionCard(state: StrategyState): string {
    const missions = ensureMissions(state)
    const row = (mission: MissionDef) => {
      const status = missionStatus(state, mission)
      const progress = Math.min(mission.goal, missions.progress[mission.id] ?? 0)
      const button = status === 'claimed' ? '<span class="mission-done">받음</span>' : `<button class="mini-action ${status === 'ready' ? 'mini-action--research' : ''}" data-action="mission-claim" data-mission="${mission.id}" ${status === 'ready' ? '' : 'disabled'}>${status === 'ready' ? '보상 받기' : `${progress}/${mission.goal}`}</button>`
      return `<li class="mission-row is-${status}"><div><strong>${mission.label}</strong><small>${rewardText(mission.reward)}</small><span class="mission-bar"><i style="width:${progress / mission.goal * 100}%"></i></span></div>${button}</li>`
    }
    const daily = MISSIONS.filter(mission => mission.scope === 'daily')
    const weekly = MISSIONS.filter(mission => mission.scope === 'weekly')
    const bonusDone = missions.claimed.includes(DAILY_BONUS_ID)
    const bonus = `<div class="mission-bonus ${dailyBonusReady(state) ? 'is-ready' : ''}"><span>일일 임무 모두 완료 · ${rewardText(DAILY_BONUS)}</span>${bonusDone ? '<span class="mission-done">받음</span>' : `<button class="mini-action mini-action--research" data-action="mission-claim" data-mission="${DAILY_BONUS_ID}" ${dailyBonusReady(state) ? '' : 'disabled'}>추가 보상</button>`}</div>`
    return `<div class="glass-card mission-card"><div class="card-header"><div><span class="eyebrow">일일 · 주간 임무</span><h3>오늘의 임무</h3></div><span class="rate-note">일일은 매일 0시, 주간은 월요일 0시(한국 시간)에 새로 시작</span></div><div class="mission-cols"><div><h4>일일</h4><ul>${daily.map(row).join('')}</ul>${bonus}</div><div><h4>주간</h4><ul>${weekly.map(row).join('')}</ul></div></div></div>`
  }

  private summoningSection(state: StrategyState): string {
    const active = this.summonTab
    return `<section class="page-section page-section--summoning"><div class="summon-menu-head"><div><span class="eyebrow">육성</span><h1>모집 · 장비</h1><p class="heading-copy">무장과 병장기를 한 곳에서 모집하고, 결과를 확인한 뒤 바로 성장시키십시오.</p></div><div class="summon-tabs"><button class="summon-tab ${active === 'generals' ? 'is-active' : ''}" data-action="summon-tab" data-summon-tab="generals">✦ 무장 모집</button><button class="summon-tab ${active === 'equipment' ? 'is-active' : ''}" data-action="summon-tab" data-summon-tab="equipment">⚒ 장비 뽑기</button></div></div>${active === 'equipment' ? this.equipmentDrawSection(state) : this.recruitSection(state)}</section>`
  }

  private recruitSection(state: StrategyState): string {
    const result = state.lastRecruit
    const freeRecruits = state.missions?.freeRecruits ?? 0
    return `<section class="page-section page-section--recruit"><div class="section-heading section-heading--compact"><div><span class="eyebrow">육성</span><h1>무장 모집</h1><p class="heading-copy">옥패로 무장을 모집합니다. 이미 있는 무장이 나오면 성급이 오릅니다.</p></div><div class="section-counter"><span>보유 무장</span><strong>${state.generals.length}<small> / ${allGenerals().length}</small></strong></div><button class="mini-action draw-log-button" data-action="draw-log" data-kind="recruit">기록</button></div><div class="recruit-layout"><div class="recruit-pedestal glass-card"><div class="pedestal-glow"></div><div class="summon-banner" role="img" aria-label="옥패의 부름에 응답하는 삼국의 무장들"><figure class="summon-banner__slide summon-banner__slide--solo"><img src="/assets/ui/recruit-montage.webp" alt="" width="720" height="900" draggable="false"><figcaption><b>군웅할거</b><span>천하의 영웅이 모인다</span></figcaption></figure><img class="summon-banner__jade" src="/assets/ui/jade-summon.svg" alt="" width="64" height="80" draggable="false"></div><div class="recruit-copy"><span class="pill pill--gold">무료 게임 내 재화</span><h2>옥패의 부름</h2><p>역사 속 무장들이 인장 너머에서 응답합니다.<br>중복 무장은 즉시 성급으로 전환됩니다.</p></div><div class="recruit-actions"><button class="action-button action-button--primary" data-action="recruit" data-count="1"><span>1회 모집</span><b class="cost">${freeRecruits >= 1 ? '무료권' : `${this.honorCost(recruitCost(state, 1))}`}</b></button><button class="action-button action-button--outline" data-action="recruit" data-count="10"><span>${this.freeRecruit ? '무료 10회 모집' : '10회 연속 모집'}</span><b>${this.freeRecruit ? '5등급 1명 확정' : freeRecruits >= 10 ? '무료권' : `<span class="cost">${this.honorCost(recruitCost(state, 10))}</span>`}</b></button></div>${freeRecruits > 0 ? `<p class="free-ticket-note">출석 보상 무료 모집권 <b>${freeRecruits}회</b> 남음 · 모집하면 먼저 쓰입니다</p>` : ''}<div class="fair-play-note"><span>◎</span><span>현금 결제 없음 · 모집 확률 상시 공개</span></div></div><div class="recruit-side"><div class="glass-card rate-card"><div class="card-header"><div><span class="eyebrow">확률표</span><h3>모집 확률</h3></div><span class="rate-note">1회 기준</span></div>${([5, 4, 3, 2, 1] as const).map(grade => `<div class="rate-row"><span class="grade-dot" style="--grade:${GRADE_META[grade].color}"></span><span>${grade}등급 <small>${GRADE_META[grade].label}</small></span><strong>${GRADE_META[grade].rate}</strong><div class="rate-track"><i style="width:${GRADE_META[grade].rate}"></i></div></div>`).join('')}<div class="rate-footnote">* 중복 획득 시 해당 무장의 성급이 +1 상승합니다. 최대 5성.<br>* 모집 확률은 모든 유저가 같습니다(연구 · 진영으로 바뀌지 않음).</div></div>${result ? `<div class="glass-card recruit-result"><span class="eyebrow">최근 획득</span><div class="result-card-row">${this.portrait(result, 'general-portrait--large')}<div><h3>${result.name}<span class="star-row">${'★'.repeat(result.stars)}${'☆'.repeat(5 - result.stars)}</span></h3><p>${result.epithet}</p><small>${result.grade}등급 · ${result.role} · Lv.${result.level}</small></div></div><p class="result-note">${state.lastNotice}</p></div>` : '<div class="glass-card empty-result"><span class="empty-rune">✦</span><p>모집 결과가 이곳에 기록됩니다.</p></div>'}</div></div></section>`
  }

  /** 출전 자리가 꽉 찼을 때: 어느 자리와 바꿀지 고르는 창 */
  private openSlotPicker(state: StrategyState, id: string): void {
    const incoming = state.generals.find(general => general.id === id)
    if (!incoming) return
    document.querySelector('.slot-picker')?.remove()
    const layer = document.createElement('div')
    layer.className = 'slot-picker'
    const slots = state.formation.map((current, index) => {
      const general = state.generals.find(item => item.id === current)
      return `<button class="slot-picker__slot" data-slot="${index}"><span>${['↙ 좌측', '↑ 중앙 · 전열', '↘ 우측'][index]}</span>${general ? this.portrait(general, 'slot-picker__portrait') : ''}<strong>${escapeHtml(general?.name ?? '빈 자리')}</strong><small>${general ? `${general.role} · Lv.${general.level}` : ''}</small><em>이 자리에 넣기</em></button>`
    }).join('')
    layer.innerHTML = `<div class="slot-picker__card glass-card"><span class="eyebrow">출전 교체</span><h3>${escapeHtml(incoming.name)}을(를) 어느 자리에 넣을까요?</h3><p>고른 자리의 무장은 대기로 돌아갑니다.</p><div class="slot-picker__slots">${slots}</div><button class="text-button" data-slot-cancel>취소</button></div>`
    const close = () => layer.remove()
    layer.addEventListener('click', event => {
      const target = event.target as HTMLElement
      const slot = target.closest<HTMLElement>('[data-slot]')
      if (slot) { close(); this.callbacks.onFormationSlot(id, Number(slot.dataset.slot)) }
      else if (target === layer || target.closest('[data-slot-cancel]')) close()
    })
    document.body.appendChild(layer)
  }

  private rosterSection(state: StrategyState): string {
    const sortOptions: Array<[RosterSort, string]> = [['power', '전투력'], ['level', '레벨'], ['grade', '등급'], ['name', '이름'], ['role', '병과']]
    const match = (general: General) => this.rosterFilter === 'all' ? true : this.rosterFilter === '5' ? general.grade === 5 : this.rosterFilter === '4' ? general.grade === 4 : general.role === this.rosterFilter
    // 출전 무장은 좌·중·우 순서로 맨 앞에 고정, 나머지는 고른 정렬
    const deployed = state.formation.map(id => state.generals.find(general => general.id === id)).filter((general): general is General => Boolean(general) && match(general!))
    // 2군·3군도 따로 묶어 보여 준다(편성 순서대로), 대기는 어느 군에도 없는 무장
    const squadGroups = [1, 2].map(squad => ({ squad, list: squadIds(state, squad).map(id => state.generals.find(general => general.id === id)).filter((general): general is General => Boolean(general) && match(general!)) }))
    const inSquad = new Set([1, 2].flatMap(squad => squadIds(state, squad)))
    const reserve = this.sortedOwnedGenerals(state).filter(general => !state.formation.includes(general.id) && !inSquad.has(general.id) && match(general))
    const filters: Array<[typeof this.rosterFilter, string, number]> = [
      ['all', '전체', state.generals.length], ['5', '천명', state.generals.filter(g => g.grade === 5).length], ['4', '명장', state.generals.filter(g => g.grade === 4).length],
      ...(['기병', '보병', '궁병', '책사'] as Role[]).map(role => [role, role, state.generals.filter(g => g.role === role).length] as [Role, string, number]),
    ]
    const scale = Math.max(this.level60Scale(), ...state.generals.flatMap(g => [g.leadership, g.martial, g.stratagem, g.speed]))
    const cards = (list: General[]) => list.map(general => this.generalCard(state, general, scale)).join('')
    const empty = !deployed.length && !reserve.length ? '<div class="roster-empty">이 조건에 맞는 무장이 없습니다.</div>' : ''
    return `<section class="page-section page-section--roster"><div class="section-heading section-heading--compact"><div><span class="eyebrow">본진</span><h1>보유 무장</h1><p class="heading-copy">무장을 키우고 장비를 갖춰 출전 진형에 배치하십시오.</p></div><div class="section-counter"><span>출전 전투력</span><strong>${formatNumber(totalPower(state))}</strong></div></div><div class="roster-toolbar roster-toolbar--expanded"><div class="filter-tabs">${filters.map(([id, label, count]) => `<button class="filter-tab ${this.rosterFilter === id ? 'is-active' : ''}" data-action="roster-filter" data-filter="${id}">${label} <b>${count}</b></button>`).join('')}</div><div class="roster-sort-controls"><label>정렬 <select data-action="roster-sort">${sortOptions.map(([value, label]) => `<option value="${value}" ${this.rosterSort === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button class="sort-direction" data-action="roster-sort-direction" title="정렬 방향">${this.rosterSortDescending ? '↓' : '↑'}</button><button class="ghost-button ghost-button--small" data-action="section" data-section="formation">편성 화면 →</button></div></div>
      <div class="roster-summary"><span>보유 ${state.generals.length}명 · 1군 ${deployedIds(state.formation).length}/3 · 2군 ${deployedIds(squadIds(state, 1)).length}/3 · 3군 ${deployedIds(squadIds(state, 2)).length}/3 · 은전 ${formatNumber(state.silver)} · 병서 ${formatNumber(state.manuals)}</span><span>대기 무장은 ${this.sortLabel()} ${this.rosterSortDescending ? '높은 순' : '낮은 순'}</span></div>
      <nav class="roster-squad-jump">${SQUAD_LABELS.map((label, index) => `<button class="roster-squad-chip" data-action="roster-jump" data-squad="${index}" ${deployedIds(squadIds(state, index)).length ? '' : 'disabled'}>${label} <b>${deployedIds(squadIds(state, index)).length}/3</b><small>${formatNumber(squadPower(state, index))}</small></button>`).join('')}<button class="text-button" data-action="section" data-section="formation">편성 바꾸기 →</button></nav>
      ${deployed.length ? `<h2 class="roster-group" id="roster-squad-0">1군 · 출전 중</h2><div class="roster-grid">${cards(deployed)}</div>` : ''}${squadGroups.map(group => group.list.length ? `<h2 class="roster-group" id="roster-squad-${group.squad}">${SQUAD_LABELS[group.squad]} <small>레이드에서 ${group.squad === 1 ? '1군' : '2군'} 다음으로 출전</small></h2><div class="roster-grid">${cards(group.list)}</div>` : '').join('')}${reserve.length ? `<h2 class="roster-group">대기</h2><div class="roster-grid">${cards(reserve)}</div>` : ''}${empty}</section>`
  }

  /** 도감 이름 찾기: 다시 그리지 않고 카드만 숨긴다(입력 칸 초점 유지) */
  private applyCodexSearch(): void {
    const query = this.codexQuery.trim()
    let shown = 0
    this.root.querySelectorAll<HTMLElement>('[data-codex-name]').forEach(card => {
      const name = card.dataset.codexName ?? ''
      const match = !query || name.includes(query)
      card.hidden = !match
      if (match) shown += 1
    })
    // 찾은 무장이 없는 등급은 머리말도 숨긴다
    this.root.querySelectorAll<HTMLElement>('[data-codex-grade]').forEach(head => {
      let next = head.nextElementSibling as HTMLElement | null, any = false
      while (next && !next.matches('[data-codex-grade]')) { if (next.matches('[data-codex-name]') && !next.hidden) any = true; next = next.nextElementSibling as HTMLElement | null }
      head.hidden = !any
    })
    const empty = this.root.querySelector<HTMLElement>('[data-codex-empty]')
    if (empty) empty.hidden = shown > 0
  }

  private codexSection(state: StrategyState): string {
    const catalog = allGenerals()
    const owned = new Map(state.generals.map(general => [general.id, general]))
    const ownedCount = catalog.filter(general => owned.has(general.id)).length
    const f = this.codexFilter
    const visible = codexOrder(catalog).filter(general => (f === 'all' ? true : f === 'owned' ? owned.has(general.id) : f === 'missing' ? !owned.has(general.id) : f === '5' ? general.grade === 5 : f === '4' ? general.grade === 4 : general.role === f)).filter(general => !this.codexQuery.trim() || general.name.includes(this.codexQuery.trim()))
    const filters: Array<[typeof f, string, number]> = [['all', '전체', catalog.length], ['owned', '영입', ownedCount], ['missing', '미영입', catalog.length - ownedCount], ['5', '천명', catalog.filter(g => g.grade === 5).length], ['4', '명장', catalog.filter(g => g.grade === 4).length], ...(['기병', '보병', '궁병', '책사'] as Role[]).map(role => [role, role, catalog.filter(g => g.role === role).length] as [Role, string, number])]
    return `<section class="page-section page-section--codex"><div class="section-heading section-heading--compact"><div><span class="eyebrow">본진</span><h1>무장 도감</h1><p class="heading-copy">천하에 이름을 남긴 ${catalog.length}명의 무장과 영입 현황입니다.</p></div><div class="section-counter"><span>수집 현황</span><strong>${ownedCount}<small> / ${catalog.length}</small></strong></div></div><div class="codex-toolbar"><div class="filter-tabs">${filters.map(([id, label, count]) => `<button class="filter-tab ${f === id ? 'is-active' : ''}" data-action="codex-filter" data-filter="${id}">${label} <b>${count}</b></button>`).join('')}</div><label class="codex-search"><span>찾기</span><input data-codex-search type="search" placeholder="무장 이름" value="${escapeHtml(this.codexQuery)}"></label><div class="codex-progress"><i><b style="width:${(ownedCount / catalog.length) * 100}%"></b></i><small>${Math.round((ownedCount / catalog.length) * 100)}% · ${ownedCount}명 영입</small></div></div><div class="codex-grid">${visible.map((general, index) => {
      // 등급이 바뀌는 자리에 등급 머리말(그 등급 몇 명 · 남성/여성)
      const head = index === 0 || visible[index - 1].grade !== general.grade
        ? (() => { const group = visible.filter(item => item.grade === general.grade); const women = group.filter(item => isFemaleGeneral(item.id)).length; return `<div class="codex-grade-head" data-codex-grade="${general.grade}" style="--grade:${GRADE_META[general.grade].color}"><b>${GRADE_META[general.grade].label}</b><span>${general.grade}등급 · ${group.length}명</span>${women ? `<small>남성 ${group.length - women} · 여성 ${women}</small>` : ''}</div>` })()
        : ''
      return head + this.codexCard(owned.get(general.id) ?? general, owned.has(general.id))
    }).join('')}</div><div class="roster-empty" data-codex-empty ${visible.length ? 'hidden' : ''}>조건에 맞는 무장이 없습니다.</div></section>`
  }


  /** 1·2·3군 탭 */
  private squadTabs(state: StrategyState): string {
    return `<div class="squad-tabs" role="tablist">${SQUAD_LABELS.map((label, index) => { const count = deployedIds(squadIds(state, index)).length; return `<button class="squad-tab ${this.formationSquad === index ? 'is-active' : ''}" role="tab" aria-selected="${this.formationSquad === index}" data-action="squad-tab" data-squad="${index}"><strong>${label}</strong><span>${count}/3 · ${formatNumber(squadPower(state, index))}</span></button>` }).join('')}<p class="squad-tabs__note">2군·3군은 레이드에서 1군 다음으로 이어 싸웁니다. 한 무장은 한 군에만 설 수 있습니다.</p></div>`
  }

  /** 2군·3군 편성 화면: 1군과 같은 짜임(자리 · 상성 · 전열 · 장착 장비 · 추천 덱 · 대기 무장). 상성은 이번 주 레이드 보스 기준 */
  private reserveSquadSection(state: StrategyState, squad: number): string {
    const ids = deployedIds(squadIds(state, squad))
    const label = SQUAD_LABELS[squad]
    const bench = this.sortedFormationBench(state, squad)
    const sortOptions: Array<[FormationSort, string]> = [['power', '전투력'], ['grade', '등급']]
    const boss = raidBossFor(this.raidView.info?.weekKey ?? raidWeekKey())
    return `<section class="page-section page-section--formation"><div class="section-heading section-heading--compact"><div><span class="eyebrow">본진</span><h1>출전 편성</h1><p class="heading-copy">${label}은 레이드에서 1군 다음으로 출전합니다. 좌·중·우 자리와 전열 규칙은 1군과 같습니다. 한 무장은 한 군에만 설 수 있어, 다른 군 무장을 넣으면 그 군에서 옮겨 옵니다.</p><div class="auto-actions"><button class="action-button action-button--primary" data-action="squad-auto" data-squad="${squad}" data-with-equipment="1">${label} 자동 편성 + 장착 <span>✦</span></button><button class="action-button action-button--outline" data-action="squad-auto" data-squad="${squad}">자동 편성</button><button class="action-button action-button--outline" data-action="squad-equip" data-squad="${squad}">자동 장착</button><button class="action-button action-button--outline" data-action="squad-swap" data-squad="${squad}">1군과 바꾸기</button></div></div><div class="section-counter"><span>${label} 편성 전투력</span><strong>${formatNumber(squadPower(state, squad))}</strong></div></div>${this.squadTabs(state)}<div class="formation-screen glass-card"><div class="formation-screen-head"><div><span class="eyebrow">${label} · 레이드 출전</span><h3>${label} 진형 · ${ids.length}/3</h3><p>상성은 이번 주 레이드 보스 ‘${escapeHtml(boss.name)}’ 기준입니다. 기병은 궁병에, 궁병은 보병에, 보병은 기병에 강합니다.</p></div><span class="formation-readiness">${ids.length >= 3 ? '출정 준비 완료' : ids.length ? '빈 자리가 있습니다' : '비어 있음 · 레이드에서 건너뜁니다'}</span></div><div class="formation-slots">${[0, 1, 2].map(index => this.formationSlot(state, index, squad)).join('')}</div></div>${this.comboAdvice(state, squad)}<div class="formation-bench-head"><div><span class="eyebrow">대기 무장</span><h3>${label}에 넣을 무장</h3></div><div class="roster-sort-controls formation-sort-controls">${this.formationSearchBox()}<label>정렬 <select data-action="formation-sort">${sortOptions.map(([value, text]) => `<option value="${value}" ${this.formationSort === value ? 'selected' : ''}>${text}</option>`).join('')}</select></label><button class="sort-direction" data-action="formation-sort-direction" title="정렬 방향">${this.formationSortDescending ? '↓' : '↑'}</button></div></div><div class="formation-bench">${bench.length ? bench.map(general => this.formationBenchCard(general, squad, state)).join('') : '<div class="formation-empty glass-card">더 넣을 무장이 없습니다.</div>'}${bench.length ? this.formationNoResult(bench) : ''}</div></section>`
  }

  private formationSection(state: StrategyState): string {
    if (this.formationSquad > 0) return this.reserveSquadSection(state, this.formationSquad)
    const bench = this.sortedFormationBench(state)
    const sortOptions: Array<[FormationSort, string]> = [['power', '전투력'], ['grade', '등급']]
    return `<section class="page-section page-section--formation"><div class="section-heading section-heading--compact"><div><span class="eyebrow">본진</span><h1>출전 편성</h1><p class="heading-copy">좌·중·우 세 자리에 무장을 배치하십시오. 같은 자리의 적장과 병종 상성이 맞으면 유리하고, 가운데(전열)에는 수호형이나 단단한 무장을 세우면 좌우 공격수가 오래 살아남습니다.</p><div class="auto-actions"><button class="action-button action-button--primary" data-action="auto-formation" data-with-equipment="1">자동 편성 + 장착 <span>✦</span></button><button class="action-button action-button--outline" data-action="auto-formation">자동 편성</button><button class="action-button action-button--outline" data-action="auto-equip">자동 장착</button></div></div><div class="section-counter"><span>현재 편성 전투력</span><strong>${formatNumber(totalPower(state))}</strong></div></div>${this.squadTabs(state)}<div class="formation-screen glass-card"><div class="formation-screen-head"><div><span class="eyebrow">1군 · 출전 중</span><h3>출전 진형 · ${deployedIds(state.formation).length}/3</h3><p>${this.formationEnemyNote(state)}</p></div><span class="formation-readiness">${deployedIds(state.formation).length >= 3 ? '출정 준비 완료' : '빈 자리가 있습니다'}</span></div><div class="formation-slots">${[0, 1, 2].map(index => this.formationSlot(state, index)).join('')}</div></div>${this.comboAdvice(state)}<div class="formation-bench-head"><div><span class="eyebrow">대기 무장</span><h3>대기 중인 보유 무장</h3></div><div class="roster-sort-controls formation-sort-controls">${this.formationSearchBox()}<label>정렬 <select data-action="formation-sort">${sortOptions.map(([value, label]) => `<option value="${value}" ${this.formationSort === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button class="sort-direction" data-action="formation-sort-direction" title="정렬 방향">${this.formationSortDescending ? '↓' : '↑'}</button></div></div><div class="formation-bench">${bench.length ? bench.map(general => this.formationBenchCard(general, 0, state)).join('') : '<div class="formation-empty glass-card">모든 보유 무장이 편성되었습니다.</div>'}${bench.length ? this.formationNoResult(bench) : ''}</div></section>`
  }

  private equipmentSection(state: StrategyState): string {
    const selected = state.generals.find(general => general.id === state.selectedEquipmentGeneralId) ?? state.generals[0]
    const selectableGenerals = this.sortedEquipmentGenerals(state)
    const loadout = selected ? state.equipmentLoadouts[selected.id] ?? {} : {}
    const equipped = new Set(Object.values(loadout).filter((id): id is string => Boolean(id)))
    const setCounts = equipmentSetCounts(state, selected?.id ?? '')
    const activeSets = (Object.keys(EQUIPMENT_SET_META) as Array<keyof typeof EQUIPMENT_SET_META>).filter(set => (setCounts[set] ?? 0) >= 2)
    const setBonusPanel = `<div class="equipment-set-bonuses glass-card"><div class="card-header"><div><span class="eyebrow">세트 효과</span><h3>종류별 세트 능력</h3></div><span class="rate-note">${selected?.name ?? '무장'} 기준</span></div><div class="set-bonus-grid">${(Object.keys(EQUIPMENT_SET_META) as Array<keyof typeof EQUIPMENT_SET_META>).map(set => { const count = setCounts[set] ?? 0; const meta = EQUIPMENT_SET_META[set]; return `<div class="set-bonus-card ${count >= 2 ? 'is-active' : ''}" style="--set-color:${EQUIPMENT_GRADE_META.legendary.color}"><strong>${meta.label}</strong><span>${count}/3 장착</span><small>2세트 · ${meta.twoPiece}</small><small>3세트 · ${meta.threePiece}</small></div>` }).join('')}</div>${activeSets.length ? `<p class="set-active-note">활성 세트: ${activeSets.map(set => EQUIPMENT_SET_META[set].label).join(' · ')}</p>` : '<p class="set-active-note is-muted">같은 세트 장비를 2개 이상 장착하면 세트 능력이 활성화됩니다.</p>'}</div>`
    return this.equipmentManageSection(state, selected, selectableGenerals, loadout, equipped, setBonusPanel, activeSets)
  }

  /** 장비 관리(간단히 보기): 무장 고르기 → 장비 3칸 → 보유 장비. 프리셋 · 세트 능력 · 필터는 접어 둔다 */
  private equipmentManageSection(state: StrategyState, selected: General | undefined, selectable: General[], loadout: Partial<Record<EquipmentType, string>>, equipped: Set<string>, setBonusPanel: string, activeSets: Array<keyof typeof EQUIPMENT_SET_META>): string {
    const lanes = ['좌측', '중앙', '우측']
    const chips = state.formation.map((id, index) => {
      const general = state.generals.find(item => item.id === id)
      if (!general) return ''
      const filled = Object.values(state.equipmentLoadouts[id] ?? {}).filter(Boolean).length
      return `<button class="equip-chip ${general.id === selected?.id ? 'is-active' : ''} ${filled < 3 ? 'is-missing' : ''}" data-action="equip-general" data-id="${general.id}">${this.portrait(general, 'equip-chip__face')}<span class="equip-chip__text"><small>${lanes[index] ?? ''}</small><strong>${escapeHtml(general.name)}</strong><em>장비 ${filled}/3</em></span></button>`
    }).join('')
    const others = selectable.filter(general => !state.formation.includes(general.id))
    // 다른 무장은 2군 · 3군 · 대기로 묶어 보여 준다
    const groups = [1, 2, -1].map(squad => [squad, others.filter(general => squadOf(state, general.id) === squad)] as const).filter(([, list]) => list.length)
    const option = (general: General) => `<option value="${general.id}" ${general.id === selected?.id ? 'selected' : ''}>${general.name} · ${formatNumber(combatPower(general) + equipmentPowerForUi(state, general.id))}</option>`
    const selectedSquad = selected ? squadOf(state, selected.id) : -1
    const squadAuto = selectedSquad > 0 ? `<button class="mini-action mini-action--deploy equipment-auto" data-action="squad-equip" data-squad="${selectedSquad}" title="${SQUAD_LABELS[selectedSquad]} 무장에게 가장 좋은 장비 조합을 장착(다른 군 장비는 건드리지 않음)">${SQUAD_LABELS[selectedSquad]} 자동 장착</button>` : ''
    const picker = `<div class="equip-picker glass-card"><div class="equip-picker__head"><h3>무장 선택</h3><span class="mythic-stone-note">낙양 강화석 <b>${state.mythicStones}</b></span><button class="mini-action mini-action--deploy equipment-auto" data-action="auto-equip" title="1군 무장에게 가장 좋은 장비 조합을 장착(2 · 3군 장비는 건드리지 않음)">1군 자동 장착</button>${squadAuto}</div><div class="equip-picker__chips">${chips}</div>${others.length ? `<select class="equip-picker__others" data-action="equipment-general" aria-label="다른 무장"><option value="" ${state.formation.includes(selected?.id ?? '') ? 'selected' : ''} disabled>${selectedSquad > 0 ? `${SQUAD_LABELS[selectedSquad]} · ${escapeHtml(selected?.name ?? '')}` : `다른 무장 고르기 (${others.length}명)`}</option>${groups.map(([squad, list]) => `<optgroup label="${squad > 0 ? SQUAD_LABELS[squad] : '대기 무장'}">${list.map(option).join('')}</optgroup>`).join('')}</select>` : ''}</div>`
    const setLine = activeSets.length ? `<p class="equip-set-line">세트 효과 · ${activeSets.map(set => EQUIPMENT_SET_META[set].label).join(' · ')}</p>` : '<p class="equip-set-line is-muted">같은 세트를 2개 이상 끼면 세트 효과가 붙습니다</p>'
    const slots = `<div class="equipment-slots glass-card"><div class="equip-slots__head"><h3>${escapeHtml(selected?.name ?? '무장')}의 장비</h3>${selected ? `<b>전투력 ${formatNumber(combatPower(selected) + equipmentPowerForUi(state, selected.id))}</b>` : ''}</div><div class="equip-slots__row">${(['weapon', 'armor', 'accessory'] as EquipmentType[]).map(type => this.equipmentSlot(type, loadout[type], state, selected?.id ?? '')).join('')}</div>${setLine}</div>`
    const more = `<details class="equipment-more glass-card" ${this.equipmentMoreOpen ? 'open' : ''}><summary data-action="equipment-more">프리셋 · 세트 능력 자세히 보기</summary>${selected ? this.equipmentPresetBar(state, selected.id) : ''}${setBonusPanel}</details>`
    const f = this.equipmentFilter
    const applied = [f.set, f.grade, f.owner].filter(value => value !== 'all').length
    const tabs = `<div class="equip-type-tabs setting-seg" role="group" aria-label="부위">${([['all', '전체'], ['weapon', EQUIPMENT_TYPE_META.weapon.label], ['armor', EQUIPMENT_TYPE_META.armor.label], ['accessory', EQUIPMENT_TYPE_META.accessory.label]] as Array<[string, string]>).map(([value, label]) => `<button class="setting-seg__btn ${f.type === value ? 'is-active' : ''}" data-action="equipment-type-tab" data-type="${value}">${label}</button>`).join('')}</div>`
    const filterMore = `<details class="equipment-filter-more" ${this.equipmentFilterOpen ? 'open' : ''}><summary data-action="equipment-filter-more">필터 · 일괄 분해${applied ? ` <b>${applied}개 적용</b>` : ''}</summary><div class="equipment-manage">${this.equipmentManageBar(state, false)}</div></details>`
    const inventory = `<div class="equipment-inventory"><div class="equipment-inventory-toolbar"><div class="card-header"><div><h3>보유 장비</h3></div><span class="rate-note">${formatNumber(equipmentInventoryCount(state))}개</span></div><div class="equipment-sort-controls"><label>정렬 <select data-action="equipment-sort"><option value="grade" ${this.equipmentSort === 'grade' ? 'selected' : ''}>등급</option><option value="level" ${this.equipmentSort === 'level' ? 'selected' : ''}>강화 레벨</option><option value="name" ${this.equipmentSort === 'name' ? 'selected' : ''}>이름</option></select></label><button class="sort-direction" data-action="equipment-sort-direction">${this.equipmentSortDescending ? '↓' : '↑'}</button></div></div>${tabs}${filterMore}${this.equipmentVirtualList(state, selected?.id ?? '', equipped)}</div>`
    return `<section class="page-section page-section--equipment page-section--equipment-simple"><div class="section-heading section-heading--compact"><div><span class="eyebrow">육성</span><h1>장비 관리</h1><p class="heading-copy">무장을 고르고, 장비 칸을 채우고, 아래 목록에서 장착 · 강화합니다.</p></div><div class="section-counter"><span>보유 장비</span><strong>${equipmentInventoryCount(state)}</strong></div></div>${picker}<div class="equipment-layout"><div>${slots}${more}</div><div>${inventory}</div></div></section>`
  }

  /** 모집 · 장비 > 장비 뽑기: 뽑기만(장착·강화·보유 목록은 ‘장비 관리’에서). 무장 모집과 같은 짜임 */
  private equipmentDrawSection(state: StrategyState): string {
    const rates: Array<[EquipmentGrade, string]> = [['legendary', '5%'], ['unique', '12%'], ['rare', '28%'], ['normal', '55%']]
    const rank: Record<EquipmentGrade, number> = { normal: 1, rare: 2, unique: 3, legendary: 4, mythic: 5 }
    const best = [...state.lastEquipmentDraw].sort((a, b) => rank[b.grade] - rank[a.grade])[0]
    const recent = best ? `<div class="glass-card recruit-result gear-draw-recent"><span class="eyebrow">최근 획득</span><div class="result-card-row"><div class="gear-draw-recent__icon" style="--grade:${EQUIPMENT_GRADE_META[best.grade].color}"><img src="${equipmentImage(best.type)}" alt="" width="72" height="72"></div><div><h3>${escapeHtml(best.name)}</h3><p>${EQUIPMENT_GRADE_META[best.grade].label} · ${EQUIPMENT_TYPE_META[best.type].label} · ${escapeHtml(EQUIPMENT_SET_META[best.set].label)}</p><small>이번에 ${state.lastEquipmentDraw.length}개 획득</small></div></div><div class="equipment-mini-row">${state.lastEquipmentDraw.slice(0, 10).map(item => this.equipmentMiniCard(item)).join('')}</div></div>` : ''
    const freeDraws = state.missions?.freeDraws ?? 0
    return `<section class="page-section page-section--recruit page-section--gear-draw"><div class="section-heading section-heading--compact"><div><span class="eyebrow">육성</span><h1>장비 뽑기</h1><p class="heading-copy">무기·갑옷·장신구를 뽑습니다. 장착과 강화는 장비 관리에서 합니다.</p></div><div class="section-counter"><span>보유 장비</span><strong>${equipmentInventoryCount(state)}</strong></div><button class="mini-action draw-log-button" data-action="draw-log" data-kind="equip">기록</button></div><div class="recruit-layout"><div class="recruit-pedestal glass-card"><div class="pedestal-glow"></div><div class="summon-banner" role="img" aria-label="대장간에서 갓 나온 천하의 병장기"><figure class="summon-banner__slide summon-banner__slide--solo"><img src="/assets/ui/forge-montage.webp" alt="" width="720" height="900" draggable="false"><figcaption><b>명장의 병기</b><span>천하의 병장기가 모인다</span></figcaption></figure><img class="summon-banner__jade" src="/assets/ui/jade-summon.svg" alt="" width="64" height="80" draggable="false"></div><div class="recruit-copy"><span class="pill pill--gold">무료 게임 내 재화</span><h2>천하의 병장기</h2><p>대장간의 불꽃이 새 병기를 벼려 냅니다.<br>같은 세트 3개를 모으면 세트 능력이 붙습니다.</p></div><div class="recruit-actions"><button class="action-button action-button--primary" data-action="equipment-draw" data-count="1"><span>1회 뽑기</span><b class="cost">${freeDraws >= 1 ? '무료권' : `${this.honorCost(equipmentDrawCost(1))}`}</b></button><button class="action-button action-button--outline" data-action="equipment-draw" data-count="10"><span>10회 연속 뽑기</span><b class="cost">${freeDraws >= 10 ? '무료권' : `${this.honorCost(equipmentDrawCost(10))}`}</b></button></div>${freeDraws > 0 ? `<p class="free-ticket-note">출석 보상 무료 뽑기권 <b>${freeDraws}회</b> 남음 · 뽑으면 먼저 쓰입니다</p>` : ''}<div class="fair-play-note"><span>◎</span><span>현금 결제 없음 · 뽑기 확률 상시 공개</span></div></div><div class="recruit-side"><div class="glass-card rate-card"><div class="card-header"><div><span class="eyebrow">확률표</span><h3>뽑기 확률</h3></div><span class="rate-note">1회 기준</span></div>${rates.map(([grade, rate]) => `<div class="rate-row"><span class="grade-dot" style="--grade:${EQUIPMENT_GRADE_META[grade].color}"></span><span>${EQUIPMENT_GRADE_META[grade].label}</span><strong>${rate}</strong><div class="rate-track"><i style="width:${rate};background:${EQUIPMENT_GRADE_META[grade].color}"></i></div></div>`).join('')}<div class="rate-footnote">* 신화 장비(${escapeHtml(MYTHIC_EVENT_EQUIPMENT.name)})는 이벤트로만 지급되며 뽑기로는 나오지 않습니다.</div></div>${recent}<button class="action-button action-button--outline gear-draw-manage" data-action="section" data-section="equipment">장비 관리로 · 장착 · 강화</button></div></div></section>`
  }

  /** 보유 장비 목록(필터 · 정렬 적용). 처음 그릴 때와 스크롤할 때 같은 목록을 쓴다 */
  private equipmentListItems(state: StrategyState, equipped: Set<string>): Equipment[] {
    // 이 무장이 낀 장비 → 아무도 안 낀 장비 → 다른 무장이 낀 장비 순
    const owners = equipmentOwners(state)
    const rank = (item: Equipment) => equipped.has(item.id) ? 0 : owners.has(item.id) ? 2 : 1
    const f = this.equipmentFilter
    this.equipmentOwnerNames = new Map([...owners].map(([itemId, ownerId]) => [itemId, state.generals.find(general => general.id === ownerId)?.name ?? '']))
    this.equipmentOwnerIds = owners
    return this.sortedEquipment(state)
      .filter(item => (f.type === 'all' || item.type === f.type) && (f.set === 'all' || item.set === f.set) && (f.grade === 'all' || item.grade === f.grade) && (f.owner === 'all' || (f.owner === 'equipped' ? owners.has(item.id) : f.owner === 'locked' ? Boolean(item.locked) : !owners.has(item.id))))
      .map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map(entry => entry.item)
  }

  private equipmentVirtualList(state: StrategyState, generalId: string, equipped: Set<string>): string {
    const items = this.equipmentListItems(state, equipped)
    if (!items.length) return '<div class="rank-empty equipment-empty">조건에 맞는 장비가 없습니다. 필터를 바꿔 보십시오.</div>'
    const start = Math.max(0, Math.floor(this.equipmentScrollTop / this.equipmentRowHeight) - 3)
    const count = Math.ceil(720 / this.equipmentRowHeight) + 6
    const visible = items.slice(start, start + count)
    return `<div class="equipment-inventory-scroll" data-equipment-scroll><div class="equipment-virtual-list" style="height:${items.length * this.equipmentRowHeight}px"><div class="equipment-virtual-window" style="transform:translateY(${start * this.equipmentRowHeight}px)">${visible.map(item => this.equipmentCard(item, generalId, equipped.has(item.id))).join('')}</div></div></div>`
  }

  private equipmentSlot(type: EquipmentType, itemId: string | undefined, state: StrategyState, generalId: string): string {
    const item = itemId ? this.equipmentById(state).get(itemId) : undefined
    const action = item ? `<button class="equipment-slot-unequip" data-action="equipment-unequip" data-equipment-type="${type}" data-general-id="${generalId}">장착 해제</button>` : ''
    const specialty = item ? equipmentSpecialty(item) : undefined
    return `<div class="equipment-slot ${item ? 'is-filled' : ''}"><span class="equipment-slot-icon"><img src="${equipmentImage(type)}" alt="${EQUIPMENT_TYPE_META[type].label}" /></span><div><small>${EQUIPMENT_TYPE_META[type].label}</small>${item ? `<strong style="--grade:${EQUIPMENT_GRADE_META[item.grade].color}">${item.name}</strong><em>Lv.${item.level} · ${EQUIPMENT_GRADE_META[item.grade].label}</em>${specialty ? `<b class="equipment-specialty-line">특기 · ${escapeHtml(specialty.label)}${item.grade === 'legendary' ? (item.level >= LEGENDARY_SPECIALTY_LEVEL ? ' (절반)' : ` (Lv.${LEGENDARY_SPECIALTY_LEVEL}부터)`) : ''}</b>` : ''}${action}` : '<strong>비어 있음</strong><em>보유 장비를 선택하십시오</em>'}</div></div>`
  }

  private equipmentCard(item: Equipment, generalId: string, equipped: boolean): string {
    const grade = EQUIPMENT_GRADE_META[item.grade]
    const set = EQUIPMENT_SET_META[item.set]
    const specialty = equipmentSpecialty(item)
    return `<article class="equipment-card ${equipped ? 'is-equipped' : ''}" style="--grade:${grade.color}"><div class="equipment-card-top"><span class="equipment-type"><img loading="lazy" decoding="async" width="21" height="21" src="${equipmentImage(item.type)}" alt="" /> ${EQUIPMENT_TYPE_META[item.type].label}</span><span class="equipment-grade">${grade.label}${(item.quantity ?? 1) > 1 ? ` · ×${item.quantity}` : ''}</span><button class="equipment-lock ${item.locked ? 'is-locked' : ''}" data-action="equipment-lock" data-equipment-id="${item.id}" title="${item.locked ? '잠금 해제' : '잠그면 분해되지 않습니다'}" aria-label="${item.locked ? '잠금 해제' : '잠금'}">${item.locked ? '🔒' : '🔓'}</button></div>${this.equipmentOwnerNames.get(item.id) ? `<span class="equipment-owner">${escapeHtml(this.equipmentOwnerNames.get(item.id) ?? '')} 장착</span>` : ''}<img loading="lazy" decoding="async" width="72" height="72" class="equipment-image ${item.grade === 'mythic' ? 'equipment-image--mythic' : ''}" src="${equipmentImage(item.type)}" alt="${EQUIPMENT_TYPE_META[item.type].label}" /><h4>${item.name}</h4><p>${set.label} · ${item.skillName}</p><div class="equipment-stat"><b>${STAT_LABEL[item.mainStat] ?? item.mainStat}</b><strong>+${equipmentValue(item)}</strong><span>Lv.${item.level}/20</span></div><small>${item.skillDescription}</small>${specialty ? `<div class="equipment-specialty"><b>특기 · ${escapeHtml(specialty.label)}</b><span>${item.grade === 'legendary' ? `전설 특기 · 강화 Lv.${LEGENDARY_SPECIALTY_LEVEL}부터 ${STAT_LABEL[specialty.stat] ?? specialty.stat} +${Math.round(specialty.value * 0.5)}${item.level >= LEGENDARY_SPECIALTY_LEVEL ? ' (발동 중)' : ''}` : escapeHtml(specialty.description)}</span></div>` : ''}<div class="equipment-card-actions">${item.grade === 'mythic' ? `<div class="mythic-preview">${item.level >= 20 ? `최고 단계 · ${STAT_LABEL[item.mainStat] ?? item.mainStat} +${equipmentValue(item)}` : `강화 시 ${STAT_LABEL[item.mainStat] ?? item.mainStat} +${equipmentValue(item)} → <b>+${equipmentValue({ ...item, level: item.level + 1 })}</b> · 최대(Lv.20) +${equipmentValue({ ...item, level: 20 })}`}</div><button class="mini-action mini-action--mythic" data-action="equipment-enhance" data-equipment-id="${item.id}" title="신화장비는 낙양 강화석으로만 강화합니다(낙양 점령 1회당 1개)" ${item.level >= 20 || (this.renderedState?.mythicStones ?? 0) < 1 ? 'disabled' : ''}>${item.level >= 20 ? '최고 단계' : `강화 · 낙양 강화석 1 (보유 ${this.renderedState?.mythicStones ?? 0})`}</button>` : (item.level >= 20 ? `<button class="mini-action" disabled>최고 단계</button>` : `<button class="mini-action" data-action="equipment-enhance" data-equipment-id="${item.id}">강화 <span class="cost">${icon('silver', 'gi--cost')}${compactNumber(equipmentCost(item, this.renderedState ?? undefined).silver ?? 0)}</span><span class="cost">${icon('iron', 'gi--cost')}${compactNumber(equipmentCost(item, this.renderedState ?? undefined).iron ?? 0)}</span></button>`)}${equipped ? `<button class="mini-action" data-action="equipment-unequip" data-equipment-type="${item.type}" data-general-id="${generalId}">장착 해제</button>` : (this.equipmentOwnerNames.get(item.id) ? `<button class="mini-action mini-action--take" data-action="equipment-equip" data-equipment-id="${item.id}" data-general-id="${generalId}" title="${escapeHtml(this.equipmentOwnerNames.get(item.id) ?? '')}에게서 빼서 장착">가져오기</button>` : `<button class="mini-action" data-action="equipment-equip" data-equipment-id="${item.id}" data-general-id="${generalId}">장착</button>`)}${item.grade !== 'mythic' && !item.locked && (item.quantity ?? 1) - (this.equipmentOwnerNames.has(item.id) ? 1 : 0) > 0 ? `<button class="mini-action mini-action--ghost" data-action="equipment-dismantle" data-equipment-id="${item.id}">분해</button>` : ''}</div></article>`
  }

  private equipmentOwnerNames = new Map<string, string>()
  private equipmentOwnerIds = new Map<string, string>()

  /** 보관함 필터·일괄 분해·보관 경고 */
  private equipmentManageBar(state: StrategyState, withType = true): string {
    const f = this.equipmentFilter
    const opt = (key: keyof typeof f, value: string, label: string) => `<option value="${value}" ${f[key] === value ? 'selected' : ''}>${label}</option>`
    const filters = `<div class="equipment-filters">
      ${withType ? `<select data-action="equipment-filter" data-key="type" aria-label="부위">${opt('type', 'all', '부위 전체')}${(['weapon', 'armor', 'accessory'] as EquipmentType[]).map(type => opt('type', type, EQUIPMENT_TYPE_META[type].label)).join('')}</select>` : ''}
      <select data-action="equipment-filter" data-key="set" aria-label="세트">${opt('set', 'all', '세트 전체')}${(Object.keys(EQUIPMENT_SET_META) as Array<keyof typeof EQUIPMENT_SET_META>).map(set => opt('set', set, EQUIPMENT_SET_META[set].label)).join('')}</select>
      <select data-action="equipment-filter" data-key="grade" aria-label="등급">${opt('grade', 'all', '등급 전체')}${(['mythic', 'legendary', 'unique', 'rare', 'normal'] as EquipmentGrade[]).map(grade => opt('grade', grade, EQUIPMENT_GRADE_META[grade].label)).join('')}</select>
      <select data-action="equipment-filter" data-key="owner" aria-label="장착">${opt('owner', 'all', '장착 전체')}${opt('owner', 'equipped', '장착 중')}${opt('owner', 'free', '미장착')}${opt('owner', 'locked', '잠금')}</select>
    </div>`
    const bulk = (['normal', 'rare'] as const).map(grade => { const preview = bulkDismantlePreview(state, grade); return `<button class="mini-action equipment-bulk" data-action="equipment-bulk-dismantle" data-grade="${grade}" ${preview.count ? '' : 'disabled'}>${EQUIPMENT_GRADE_META[grade].label}${grade === 'normal' ? '' : ' 이하'} 일괄 분해 <span>${formatNumber(preview.count)}개</span></button>` }).join('')
    const warn = state.equipmentInventory.length > EQUIPMENT_STORAGE_WARN ? `<p class="equipment-storage-warn">보관 장비가 ${formatNumber(state.equipmentInventory.length)}줄로 많습니다. 일괄 분해로 정리하면 옥패·철을 돌려받습니다.</p>` : ''
    return `${filters}<div class="equipment-bulk-row">${bulk}<small>잠금 · 장착 · 강화 · 프리셋 장비와 신화장비는 빠집니다</small></div>${warn}`
  }

  /** 선택한 무장의 장비 프리셋 3칸(저장 · 장착) */
  private equipmentPresetBar(state: StrategyState, generalId: string): string {
    const list = state.equipmentPresets?.[generalId] ?? []
    const names = this.equipmentById(state)
    const slots = Array.from({ length: EQUIPMENT_PRESET_SLOTS }, (_, slot) => {
      const preset = list[slot]
      const items = preset ? Object.values(preset).map(id => names.get(id ?? '')).filter((item): item is Equipment => Boolean(item)) : []
      const summary = preset ? (items.length ? items.map(item => `${EQUIPMENT_TYPE_META[item.type].label} ${EQUIPMENT_GRADE_META[item.grade].label}`).join(' · ') : '장비 없음') : '비어 있음'
      return `<div class="equipment-preset ${preset ? 'is-filled' : ''}"><strong>프리셋 ${slot + 1}</strong><small>${escapeHtml(summary)}</small><div><button class="mini-action" data-action="equipment-preset" data-mode="apply" data-slot="${slot}" data-general-id="${generalId}" ${preset ? '' : 'disabled'}>장착</button><button class="mini-action mini-action--ghost" data-action="equipment-preset" data-mode="save" data-slot="${slot}" data-general-id="${generalId}">지금 장비 저장</button></div></div>`
    }).join('')
    return `<div class="equipment-presets glass-card"><div class="card-header"><div><span class="eyebrow">장비 프리셋</span><h3>상황별 장비 조합</h3></div><span class="rate-note">시나리오·대련·공성용으로 저장해 두고 한 번에 바꿉니다</span></div><div class="equipment-preset-grid">${slots}</div></div>`
  }

  private equipmentMiniCard(item: Equipment): string {
    const grade = EQUIPMENT_GRADE_META[item.grade]
    return `<span class="equipment-mini-card" style="--grade:${grade.color}"><img src="${equipmentImage(item.type)}" alt="" /><b>${grade.label}</b><strong>${item.name}</strong><small>${EQUIPMENT_TYPE_META[item.type].label} · +${equipmentValue(item)}${(item.quantity ?? 1) > 1 ? ` · x${item.quantity}` : ''}</small></span>`
  }

  private sortedEquipment(state: StrategyState): Equipment[] {
    const gradeRank: Record<EquipmentGrade, number> = { normal: 1, rare: 2, unique: 3, legendary: 4, mythic: 5 }
    const direction = this.equipmentSortDescending ? -1 : 1
    // 배열이 바뀌었거나(불러오기 · 합치기) 개수 · 레벨 · 수량 · 잠금이 바뀌면 다시 정렬한다
    let levelSum = 0, quantitySum = 0, locks = 0
    for (const item of state.equipmentInventory) { levelSum += item.level; quantitySum += item.quantity ?? 1; if (item.locked) locks += 1 }
    const key = `${state.equipmentInventory.length}:${levelSum}:${quantitySum}:${locks}:${this.equipmentSort}:${this.equipmentSortDescending}`
    if (this.equipmentSortCache?.key === key && this.equipmentSortCache.source === state.equipmentInventory) return this.equipmentSortCache.items
    const items = [...state.equipmentInventory].sort((a, b) => {
      const left = this.equipmentSort === 'grade' ? gradeRank[a.grade] : this.equipmentSort === 'level' ? a.level : a.name
      const right = this.equipmentSort === 'grade' ? gradeRank[b.grade] : this.equipmentSort === 'level' ? b.level : b.name
      if (left < right) return -1 * direction
      if (left > right) return 1 * direction
      return a.name.localeCompare(b.name, 'ko')
    })
    this.equipmentSortCache = { key, items, source: state.equipmentInventory }
    return items
  }

  private equipmentById(state: StrategyState): Map<string, Equipment> {
    if (this.equipmentIndexSource !== state.equipmentInventory || this.equipmentIndex.size !== state.equipmentInventory.length) {
      this.equipmentIndexSource = state.equipmentInventory
      this.equipmentIndex = new Map(state.equipmentInventory.map(item => [item.id, item]))
    }
    return this.equipmentIndex
  }

  private handleScroll = (event: Event): void => {
    const target = event.target as HTMLElement
    if (!target.matches('[data-equipment-scroll]') || !this.renderedState || this.renderedState.section !== 'equipment') return
    this.equipmentScrollTop = target.scrollTop
    if (this.equipmentScrollFrame !== null) return
    this.equipmentScrollFrame = window.requestAnimationFrame(() => {
      this.equipmentScrollFrame = null
      const state = this.renderedState
      if (!state || state.section !== 'equipment') return
      const selected = state.generals.find(general => general.id === state.selectedEquipmentGeneralId) ?? state.generals[0]
      const loadout = selected ? state.equipmentLoadouts[selected.id] ?? {} : {}
      const windowNode = target.querySelector<HTMLElement>('.equipment-virtual-window')
      if (windowNode) windowNode.outerHTML = this.equipmentVirtualWindow(state, selected?.id ?? '', new Set(Object.values(loadout).filter((id): id is string => Boolean(id))))
    })
  }

  private equipmentVirtualWindow(state: StrategyState, generalId: string, equipped: Set<string>): string {
    const items = this.equipmentListItems(state, equipped)
    const start = Math.max(0, Math.floor(this.equipmentScrollTop / this.equipmentRowHeight) - 3)
    const count = Math.ceil(720 / this.equipmentRowHeight) + 6
    return `<div class="equipment-virtual-window" style="transform:translateY(${start * this.equipmentRowHeight}px)">${items.slice(start, start + count).map(item => this.equipmentCard(item, generalId, equipped.has(item.id))).join('')}</div>`
  }

  private sortedOwnedGenerals(state: StrategyState): General[] {
    return [...state.generals].sort((a, b) => {
      const direction = this.rosterSortDescending ? -1 : 1
      const values: Record<RosterSort, [string | number, string | number]> = {
        power: [combatPower(a) + equipmentPowerForUi(state, a.id), combatPower(b) + equipmentPowerForUi(state, b.id)], level: [a.level, b.level], grade: [a.grade, b.grade], name: [a.name, b.name], role: [a.role, b.role],
      }
      const [left, right] = values[this.rosterSort]
      if (left < right) return -1 * direction
      if (left > right) return 1 * direction
      return a.name.localeCompare(b.name, 'ko')
    })
  }

  private sortedEquipmentGenerals(state: StrategyState): General[] {
    return [...state.generals].sort((a, b) => {
      const powerDifference = (combatPower(b) + equipmentPowerForUi(state, b.id)) - (combatPower(a) + equipmentPowerForUi(state, a.id))
      if (powerDifference !== 0) return powerDifference
      if (b.grade !== a.grade) return b.grade - a.grade
      if (b.level !== a.level) return b.level - a.level
      return a.name.localeCompare(b.name, 'ko')
    })
  }

  private sortedFormationBench(state: StrategyState, squad = 0): General[] {
    const direction = this.formationSortDescending ? -1 : 1
    const members = squadIds(state, squad)
    return state.generals.filter(general => !members.includes(general.id)).sort((a, b) => {
      const left = this.formationSort === 'power' ? combatPower(a) + equipmentPowerForUi(state, a.id) : a.grade
      const right = this.formationSort === 'power' ? combatPower(b) + equipmentPowerForUi(state, b.id) : b.grade
      if (left < right) return -1 * direction
      if (left > right) return 1 * direction
      return a.name.localeCompare(b.name, 'ko')
    })
  }

  private sortLabel(): string {
    return ({ power: '전투력', level: '레벨', grade: '등급', name: '이름', role: '병과' } as Record<RosterSort, string>)[this.rosterSort]
  }


  private territorySection(state: StrategyState): string {
    const selected = state.cities.find(city => city.id === state.selectedCityId) ?? state.cities[0]
    const income = selected ? cityIncome(selected, state) : { grain: 0, silver: 0, wood: 0, iron: 0, influence: 0 }
    const owned = state.cities.filter(city => city.owner === state.faction).length
    const contested = state.cities.filter(city => city.owner !== state.faction).length
    const incomeWait = incomeCooldownRemaining(state)
    const incomeLabel = incomeWait ? `오늘 수확 완료 · ${Math.ceil(incomeWait / 3600000)}시간 후` : '오늘의 내정 수확'
    const wanderer = isWanderer(state)
    return `<section class="page-section page-section--territory${this.citySheetOpen ? ' is-sheet-open' : ''}"><div class="section-heading section-heading--compact"><div><span class="eyebrow">육성</span><h1>영토 · 내정</h1><p class="heading-copy">내정을 키운 군세로 전선을 열고, 성벽을 무너뜨려 천하를 점령하십시오.</p>${this.operatorNote('공성 · 점령 · 수비병 · 도시 피해 순위가 영토전에 반영되지 않습니다.')}</div><div class="territory-heading-actions"><button class="action-button action-button--outline" data-action="territory-rules">영토전 설명 <span>?</span></button><button class="action-button action-button--outline" data-action="territory-refresh">영토 새로고침 <span>↻</span></button>${wanderer ? '' : `<button class="action-button action-button--primary" data-action="collect-income">${incomeLabel} <span>✦</span></button>`}</div></div>${this.seasonCard(state)}<div class="conquest-overview glass-card">${wanderer ? `<div><span class="eyebrow">재야 · 중립 진영</span><h3>천하 약탈</h3><p>본성 없이 어느 도시든 공성합니다. 이기면 성벽을 깎고 그 성 하루 생산량의 ${Math.round(WANDERER_PLUNDER_RATE * 100)}%를 약탈합니다(하루 ${wandererDailyPlunder(state)}회, 오늘 ${wandererPlunderLeft(state)}회 남음). 성벽을 0으로 무너뜨리면 그 성의 내정 건물이 초기화되고, 성벽은 ${Math.round(RAZE_REBUILD_MS / 3600000)}시간 뒤 다시 세워집니다. 점령 · 내정 · 최종 세력전은 할 수 없고, 낙양만은 세 진영과 같은 규칙입니다.</p></div>` : `<div><span class="eyebrow">공략 전선</span><h3>영토 점령전</h3><p>출정할 때마다 식량·은전·철을 소모합니다. 공성 진전을 100%까지 쌓으면 ${state.faction}의 전선이 됩니다.</p>${this.influenceNote(state)}</div>`}<div class="conquest-overview-stats"><span><b>${owned}</b><small>아군 도시</small></span><span><b>${contested}</b><small>남은 전선</small></span><span><b>${formatNumber(conquestPower(state))}</b><small>출정 전투력</small></span><span><b>${formatNumber(state.factionWarScore)}</b><small>세력전 공헌도</small></span></div></div><div class="territory-layout"><div class="glass-card territory-map"><div class="card-header"><div><span class="eyebrow">삼국 영토</span><h3>천하 영토</h3></div><button class="sync-label sync-label--button" data-action="territory-refresh" data-territory-sync>${this.territorySyncText}</button></div>${this.mapViewport(state)}<div class="map-legend"><span><i class="legend-dot legend-dot--ally"></i>${state.faction} 영토</span><span><i class="legend-dot legend-dot--neutral"></i>중립</span><span><i class="legend-dot legend-dot--enemy"></i>타 세력</span><span><i class="legend-line"></i>연결 전선</span></div>${this.mobileCitySelector(state)}</div>${selected ? this.cityManagementCard(selected, income, state) : ''}</div></section>`
  }

  /** 천하 시즌(서버) */
  private seasonInfo: SeasonInfo | null = null
  /** 위쪽 막대의 천하 시즌 칩: 시즌 번호 · 남은 시간(1분마다 갱신, 누르면 영토 · 시즌 카드) */
  private seasonChip(): string {
    const key = this.seasonInfo?.key ?? seasonKey()
    const number = this.seasonInfo?.number ?? seasonNumber(key)
    const endsAt = this.seasonInfo?.endsAt ?? seasonEndsAt(key)
    return `<button type="button" class="topbar-season" data-action="season-guide" data-season-ends="${endsAt}" aria-haspopup="dialog" title="천하 시즌 ${number} · 매월 1일 0시(한국 시간) 정산 · 눌러서 시즌 설명 보기"><span class="topbar-season__k">시즌 ${number}</span><span class="topbar-season__v" data-season-left>${seasonLeftText(endsAt)}</span></button>`
  }
  /** 남은 시간 글자만 바꾼다(다시 그리지 않음) */
  updateSeasonClock(now = Date.now()): void {
    this.root.querySelectorAll<HTMLElement>('[data-season-ends]').forEach(el => { const left = el.querySelector('[data-season-left]'); if (left) left.textContent = seasonLeftText(Number(el.dataset.seasonEnds), now) })
  }
  setSeasonInfo(info: SeasonInfo | null): void { this.seasonInfo = info; if (this.renderedState?.section === 'territory') this.render(this.renderedState) }
  /** 천하 영토 위쪽 시즌 카드: 남은 기간 · 실시간 진영 순위(도시 등급 합) · 이달 · 다음 달 보상 무장 · 내 받을 자격 */
  private seasonCard(state: StrategyState): string {
    const info = this.seasonInfo
    if (!info) return ''
    const name = (id: string) => templateGeneral(id)?.name ?? id
    const standings = seasonStandings(state.cities.map(city => ({ cityId: city.id, owner: city.owner, level: city.level })))
    const left = Math.max(0, info.endsAt - Date.now())
    const days = Math.floor(left / 86400000), hours = Math.floor(left % 86400000 / 3600000)
    const ends = new Date(info.endsAt - 1000)
    const copies = (rank: number) => SEASON_COPIES[rank] ?? 0
    const rows = standings.map(row => `<li class="${row.faction === state.faction ? 'is-mine' : ''}"><b>${row.rank}위</b><span>${escapeHtml(row.faction)}</span><em>도시 등급 ${row.levels} · ${row.cities}곳${row.luoyang ? ' · 낙양' : ''}</em><small>${name(info.general)} ${copies(row.rank)}장</small></li>`).join('')
    const wanderer = state.faction === SEASON_WANDERER
    const myRank = standings.find(row => row.faction === state.faction)?.rank ?? 0
    const mine = wanderer
      ? `재야 약탈 ${formatNumber(info.plunder)} / ${formatNumber(SEASON_WANDERER_PLUNDER)} ${info.plunder >= SEASON_WANDERER_PLUNDER ? '· 1장 받을 자격 ✓' : '(넘기면 1장)'}`
      : `이번 시즌 영토전 ${info.battles}회 ${info.battles >= 1 ? '✓' : '· 1회 이상 해야 보상을 받습니다'} · 지금 순위면 ${name(info.general)} ${copies(myRank)}장`
    const last = info.last ? `<p class="season-last">지난 시즌 ${info.last.number} · ${info.last.standings.map(row => `${row.rank}위 ${escapeHtml(row.faction)}`).join(' · ')} · 보상 ${name(info.last.general)}${info.last.copies ? ` · 나 ${info.last.copies}장${info.last.claimed ? ' 받음' : ''}` : ''}</p>` : ''
    return `<div class="season-card glass-card"><div class="season-card__head"><span class="season-card__portrait" style="background-image:url('${assetUrl(`/assets/generals-realistic-webp/${info.general}.webp`)}')"></span><div><span class="eyebrow">천하 시즌 ${info.number} · ${ends.getMonth() + 1}월 ${ends.getDate()}일까지 · ${days}일 ${hours}시간 남음</span><h3>이달의 보상 무장 · ${escapeHtml(name(info.general))}</h3><p>1위 진영 2장 · 2 · 3위 진영 1장 · 다음 달 ${escapeHtml(name(info.nextGeneral))}</p></div></div><ol class="season-standings">${rows}</ol><p class="season-mine">${mine}</p>${last}<p class="guild-hint">순위는 진영이 가진 도시의 등급 합(수도 제외)입니다. 매월 1일 0시에 정산하고 수도를 뺀 모든 도시가 처음 상태로 돌아갑니다(무장 · 레벨 · 장비는 그대로). 보상은 정산 때 그 진영이고 시즌 중 영토전을 1회 이상 한 지휘관이 받습니다. 재야는 시즌 중 약탈 ${formatNumber(SEASON_WANDERER_PLUNDER)} 이상이면 1장입니다.</p></div>`
  }

  /** 위쪽 막대의 시즌 칩을 누르면: 천하 시즌 설명(지금 순위 · 보상 · 정산 규칙) */
  showSeasonGuide(state: StrategyState): void {
    document.querySelector('.season-guide-modal')?.remove()
    const key = this.seasonInfo?.key ?? seasonKey()
    const number = this.seasonInfo?.number ?? seasonNumber(key)
    const endsAt = this.seasonInfo?.endsAt ?? seasonEndsAt(key)
    const general = this.seasonInfo?.general ?? seasonGeneral(key)
    const next = this.seasonInfo?.nextGeneral ?? seasonGeneral(nextSeasonKey(key))
    const name = (id: string) => templateGeneral(id)?.name ?? id
    const ends = new Date(endsAt - 1000)
    // 로그인해 시즌 정보를 받았으면 시즌 카드(순위 · 내 자격 · 지난 시즌)를 그대로 보여 준다
    const card = this.seasonInfo ? this.seasonCard(state) : `<div class="season-card glass-card"><div class="season-card__head"><span class="season-card__portrait" style="background-image:url('${assetUrl(`/assets/generals-realistic-webp/${general}.webp`)}')"></span><div><span class="eyebrow">천하 시즌 ${number} · ${ends.getMonth() + 1}월 ${ends.getDate()}일까지 · ${seasonLeftText(endsAt)}</span><h3>이달의 보상 무장 · ${escapeHtml(name(general))}</h3><p>1위 진영 ${SEASON_COPIES[1]}장 · 2 · 3위 진영 ${SEASON_COPIES[2]}장 · 다음 달 ${escapeHtml(name(next))}</p></div></div><p class="guild-hint">로그인하면 지금 진영 순위와 내 보상 자격을 볼 수 있습니다.</p></div>`
    const rules = [
      ['기간', `한 달이 한 시즌입니다(2026년 10월 = 시즌 1). 매월 1일 0시(한국 시간)에 정산하고 새 시즌이 시작됩니다.`],
      ['순위', `세 진영(촉한 · 위나라 · 오나라)이 가진 도시의 등급 합으로 매깁니다(수도 제외). 같으면 도시 수 → 낙양을 가진 진영 순입니다.`],
      ['보상', `이달의 보상 무장을 1위 진영 ${SEASON_COPIES[1]}장, 2 · 3위 진영 ${SEASON_COPIES[2]}장씩 줍니다. 1장은 모집 1번과 같아 없으면 얻고, 있으면 성급이 오릅니다. 보상 무장은 달마다 바뀝니다.`],
      ['자격', `진영 유저는 그 시즌에 영토전(공성 · 수비)을 1회 이상 해야 받습니다. 재야는 그 시즌 약탈 ${formatNumber(SEASON_WANDERER_PLUNDER)} 이상이면 1장을 받습니다.`],
      ['초기화', '정산 때 수도를 뺀 모든 도시가 처음 상태(중립)로 돌아갑니다. 무장 · 레벨 · 장비 · 연구 · 재화는 그대로입니다.'],
      ['받기', '보상은 정산 뒤 처음 접속할 때 저절로 받습니다.'],
    ].map(([k, v]) => `<li><b>${escapeHtml(k)}</b><span>${escapeHtml(v)}</span></li>`).join('')
    const modal = document.createElement('div')
    modal.className = 'territory-rules-modal season-guide-modal'
    modal.innerHTML = `<div class="territory-rules__card glass-card season-guide" role="dialog" aria-label="천하 시즌 설명"><div class="territory-rules__head"><div><span class="eyebrow">천하 시즌 ${number}</span><h2>시즌 안내</h2></div><button class="territory-rules__close" data-rules-close aria-label="닫기">✕</button></div>${card}<ul class="season-guide__rules">${rules}</ul><button class="action-button action-button--outline season-guide__go" data-season-go>영토에서 시즌 순위 보기 <span>→</span></button></div>`
    modal.addEventListener('click', event => {
      const target = event.target as HTMLElement
      if (target.closest('[data-season-go]')) { modal.remove(); this.callbacks.onSection('territory'); return }
      if (target === modal || target.closest('[data-rules-close]')) modal.remove()
    })
    document.body.appendChild(modal)
  }

  /** 시즌 보상을 받았을 때 */
  showSeasonReward(title: string, detail: string, generalId: string | null, eyebrow = '천하 시즌 보상'): void {
    document.querySelector('.season-reward-modal')?.remove()
    const modal = document.createElement('div')
    modal.className = 'territory-rules-modal season-reward-modal'
    modal.innerHTML = `<div class="territory-rules__card glass-card season-reward" role="dialog" aria-label="${escapeHtml(title)}"><div class="territory-rules__head"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h2>${escapeHtml(title)}</h2></div><button class="territory-rules__close" data-rules-close aria-label="닫기">✕</button></div>${generalId ? `<span class="season-reward__portrait" style="background-image:url('${assetUrl(`/assets/generals-realistic-webp/${generalId}.webp`)}')"></span>` : ''}<p>${escapeHtml(detail)}</p></div>`
    modal.addEventListener('click', event => { const target = event.target as HTMLElement; if (target === modal || target.closest('[data-rules-close]')) modal.remove() })
    document.body.appendChild(modal)
  }

  private mapCities(state: StrategyState): MapCity[] {
    const capitals = new Set(Object.values(FACTION_CAPITALS))
    const own = homeCityId(state.faction)
    return state.cities.map(city => {
      const pos = CITY_MAP_POSITIONS[city.id] ?? { x: 50, y: 50 }
      const group = this.cityGroup(city, state)
      const priority = (city.id === own ? 90 : capitals.has(city.id) ? 80 : 0) + (group === 'ally' ? 40 : group === 'front' ? 30 : 0) + city.level * 5
      return { id: city.id, name: city.name, x: pos.x, y: pos.y, priority }
    })
  }

  /** 아군 / 전선(아군 도시와 맞닿은 다른 세력·중립 도시) / 적 / 중립 */
  private cityGroup(city: City, state: StrategyState): Exclude<CityFilter, 'all'> {
    if (city.owner === state.faction) return 'ally'
    if (isWanderer(state)) return city.defense > 0 || city.id === 'luoyang' ? 'front' : city.owner === '중립' ? 'neutral' : 'enemy'
    const touchesAlly = (CITY_ADJACENCY[city.id] ?? []).some(id => state.cities.find(c => c.id === id)?.owner === state.faction)
    if (touchesAlly) return 'front'
    return city.owner === '중립' ? 'neutral' : 'enemy'
  }

  private mapViewport(state: StrategyState): string {
    const home = homeCityId(state.faction)
    return `<div class="map-viewport" data-map-viewport data-lod="far"><div class="map-world map-canvas" data-map-world><div class="map-river"></div>${this.frontlineLines(state)}${state.cities.map(city => this.cityMarker(city, state.selectedCityId, state.faction)).join('')}${MAP_REGION_LABELS.map(region => `<span class="map-label map-label--province" style="left:${region.x}%;top:${region.y}%">${region.name}</span>`).join('')}</div><div class="map-controls"><button type="button" data-map-action="zoom-in" data-map-zoom-in aria-label="확대">+</button><button type="button" data-map-action="zoom-out" data-map-zoom-out aria-label="축소">−</button><button type="button" data-map-action="home" data-home="${home}" aria-label="내 영토로">◎</button><button type="button" data-map-action="fullscreen" aria-label="지도 전체 화면">${this.territoryMap.fullscreen ? '✕' : '□'}</button></div><div class="map-hint"><span class="hint-touch">두 손가락으로 확대 · 끌어서 이동 · 눌러서 도시 선택</span><span class="hint-mouse">휠로 확대 · 끌어서 이동 · 눌러서 도시 선택</span></div></div>`
  }

  private attachTerritoryMap(state: StrategyState): void {
    const viewport = this.root.querySelector<HTMLElement>('[data-map-viewport]')
    if (state.section !== 'territory' || !viewport) {
      this.territoryMap.detach()
      if (this.territoryMap.fullscreen) this.territoryMap.setFullscreen(false)
      this.citySheetOpen = false
      return
    }
    this.territoryMap.attach(viewport, this.mapCities(state), state.selectedCityId, homeCityId(state.faction))
    this.applyCityFinder()
  }

  private mobileCitySelector(state: StrategyState): string {
    const order: Record<Exclude<CityFilter, 'all'>, number> = { front: 0, ally: 1, enemy: 2, neutral: 3 }
    const rows = state.cities
      .map(city => ({ city, group: this.cityGroup(city, state) }))
      .sort((a, b) => order[a.group] - order[b.group] || b.city.level - a.city.level || a.city.name.localeCompare(b.city.name, 'ko'))
    const counts = { all: rows.length, front: 0, ally: 0, enemy: 0, neutral: 0 }
    rows.forEach(row => { counts[row.group] += 1 })
    const labels: Record<CityFilter, string> = { all: '전체', front: '전선', ally: '내 도시', enemy: '적', neutral: '중립' }
    const groupLabel: Record<Exclude<CityFilter, 'all'>, string> = { front: '전선', ally: '아군', enemy: '적', neutral: '중립' }
    const chips = (['all', 'front', 'ally', 'enemy', 'neutral'] as CityFilter[]).map(key => `<button type="button" class="city-filter-chip city-filter-chip--${key}" data-action="city-filter" data-filter="${key}">${labels[key]} <b>${counts[key]}</b></button>`).join('')
    const list = rows.map(({ city, group }) => `<button type="button" class="city-finder-row is-${group} ${state.selectedCityId === city.id ? 'is-selected' : ''}" data-action="city-find" data-city="${city.id}" data-group="${group}" data-name="${escapeHtml(city.name)}"><span class="city-finder-dot"></span><strong>${escapeHtml(city.name)}</strong><small>${groupLabel[group]} · ${escapeHtml(city.owner)}</small><em>Lv.${city.level}</em></button>`).join('')
    return `<div class="mobile-city-selector city-finder" data-city-finder><div class="city-finder-head"><span class="eyebrow">도시 찾기</span><small data-city-finder-count>${rows.length}개 도시</small></div><input class="city-finder-search" type="search" placeholder="도시 이름 검색" value="${escapeHtml(this.cityQuery)}" data-city-search enterkeyhint="search"><div class="city-finder-filters">${chips}</div><div class="city-finder-list">${list}</div><p class="city-finder-empty" data-city-finder-empty hidden>조건에 맞는 도시가 없습니다.</p></div>`
  }

  /** 검색어·필터를 목록에 바로 반영한다(화면 전체를 다시 그리지 않음). */
  private applyCityFinder(): void {
    const finder = this.root.querySelector<HTMLElement>('[data-city-finder]')
    if (!finder) return
    const query = this.cityQuery.trim()
    let shown = 0
    finder.querySelectorAll<HTMLElement>('.city-finder-row').forEach(row => {
      const visible = (this.cityFilter === 'all' || row.dataset.group === this.cityFilter) && (!query || (row.dataset.name ?? '').includes(query))
      row.hidden = !visible
      if (visible) shown += 1
    })
    finder.querySelectorAll<HTMLElement>('.city-filter-chip').forEach(chip => chip.classList.toggle('is-active', chip.dataset.filter === this.cityFilter))
    const count = finder.querySelector<HTMLElement>('[data-city-finder-count]')
    if (count) count.textContent = `${shown}개 도시`
    const empty = finder.querySelector<HTMLElement>('[data-city-finder-empty]')
    if (empty) empty.hidden = shown > 0
  }

  private handleInput = (event: Event): void => {
    const input = event.target as HTMLInputElement
    if (input.matches('[data-codex-search]')) { this.codexQuery = input.value; this.applyCodexSearch(); return }
    if (input.matches('[data-formation-search]')) { this.formationQuery = input.value; this.applyFormationSearch(); return }
    if (input.matches('[data-game-field]')) {
      // 관리자 게임 데이터: 바꾼 칸 표시
      input.classList.toggle('is-changed', input.value !== input.dataset.original)
      const row = input.closest<HTMLElement>('[data-game-user]')
      const changed = row?.querySelectorAll('[data-game-field].is-changed').length ?? 0
      const note = row?.querySelector<HTMLElement>('[data-game-changed]')
      if (note) note.textContent = changed ? `바꾼 칸 ${changed}개 · 저장을 눌러 반영하십시오` : '바꾼 칸만 저장됩니다.'
      return
    }
    if (!input.matches('[data-city-search]')) return
    this.cityQuery = input.value
    this.applyCityFinder()
  }

  private frontlineLines(state: StrategyState): string {
    const cities = new Map(state.cities.map(city => [city.id, city]))
    const drawn = new Set<string>()
    const lines: string[] = []
    Object.entries(CITY_ADJACENCY).forEach(([fromId, neighbors]) => {
      neighbors.forEach(toId => {
        const key = [fromId, toId].sort().join(':')
        if (drawn.has(key)) return
        drawn.add(key)
        const from = CITY_MAP_POSITIONS[fromId]
        const to = CITY_MAP_POSITIONS[toId]
        if (!from || !to) return
        const fromCity = cities.get(fromId)
        const toCity = cities.get(toId)
        if (!fromCity || !toCity) return
        const className = fromCity.owner === state.faction && toCity.owner === state.faction ? 'territory-frontline territory-frontline--owned' : fromCity.owner !== toCity.owner ? 'territory-frontline territory-frontline--contested' : 'territory-frontline territory-frontline--regional'
        lines.push(`<line class="${className}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`)
      })
    })
    return `<svg class="territory-frontlines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="도시 연결 전선">${lines.join('')}</svg>`
  }

  private cityMarker(city: City, selectedId: string, faction: StrategyState['faction']): string {
    const ownerClass = city.owner === faction ? 'is-ally' : city.owner === '중립' ? 'is-neutral' : 'is-enemy'
    const mapPosition = CITY_MAP_POSITIONS[city.id] ?? { x: 50, y: 50 }
    const position = `left:${mapPosition.x}%;top:${mapPosition.y}%`
    const castle = city.level >= 3 ? 'castle-city-major' : city.level === 2 ? 'castle-city-medium' : 'castle-city-minor'
    const target = this.renderedState?.guild?.target?.cityId === city.id
    return `<button class="city-marker city-marker--lv${Math.min(city.level, 3)} ${ownerClass} ${selectedId === city.id ? 'is-selected' : ''} ${target ? 'is-guild-target' : ''}" data-action="city-select" data-city="${city.id}" style="${position}">${target && this.renderedState?.guild ? `<span class="city-marker-guild" title="연맹 공동 공성 목표">${guildEmblem(this.renderedState.guild.emblem, 'sm')}</span>` : ''}<span class="city-marker-castle"><img src="/assets/territory/${castle}.webp" alt="${city.name} 성채" loading="eager"></span><span class="city-marker-level">${city.level}</span><strong>${city.name}</strong></button>`
  }

  /** 전투 기록 결과 표시: 중립 습격은 방어하는 우리 입장(방어 성공/실패), 유저 공격은 공격 성공/실패 */
  private battleLogBadge(log: { won: boolean; attackerKind: 'user' | 'ai' }): string {
    const good = log.attackerKind === 'ai' ? !log.won : log.won
    const label = log.attackerKind === 'ai' ? (log.won ? '방어 실패' : '방어 성공') : (log.won ? '공격 성공' : '공격 실패')
    return `<span class="city-battle-log-result ${good ? 'is-win' : 'is-loss'}">${label}</span>`
  }

  private cityManagementCard(city: City, income: ReturnType<typeof cityIncome>, state: StrategyState): string {
    const canManage = city.owner === state.faction
    const capitalFaction = capitalFactionForCity(city.id)
    const eligibility = conquestEligibility(state, city.id)
    const defense = Math.min(100, city.defense)
    const wallCapacity = cityWallCapacity(city)
    const metrics = [['민심', city.prosperity], ['성벽', defense], ['도시 등급', city.level * 20]] as const
    const siege = Math.min(100, city.conquestProgress ?? 0)
    const occupied = cityOccupation(city)
    const conquest = occupied ? this.occupationCard(city, state, occupied, eligibility) : canManage ? this.defenseCard(city, state) : this.conquestCard(city, state, siege, eligibility)
    const panelClass = canManage ? 'city-management--owned' : 'city-management--frontline'
    const capitalBadge = capitalFaction ? `<span class="capital-badge">${capitalFaction} 본성 · ${isWanderer(state) ? '약탈 가능' : '점령 불가'}</span>` : ''
    const frontierNote = canManage ? '내정 핵심지 · 방어선 유지' : eligibility.allowed ? `접경 전선 · ${eligibility.reason}` : '원거리 전선 · 진군 경로 차단'
    return `<div class="glass-card city-management ${panelClass}"><div class="city-sheet-bar"><span class="city-sheet-grip"></span><button class="city-sheet-close" data-action="city-sheet-close" aria-label="도시 정보 닫기">✕</button></div><div class="city-management-head"><div><span class="eyebrow">도시 관리 · ${city.region}</span><h2>${city.name}</h2><p>${city.region} · ${city.owner === state.faction ? '아군 직할령' : `${city.owner} 관할`}${city.guild ? ` · <span class="city-guild">연맹 <b data-no-tr>${escapeHtml(city.guild.name)}</b></span>` : ''}</p></div><div class="city-management-status"><span class="city-level">Lv.${city.level}</span>${capitalBadge}</div></div><div class="city-map-context"><span>인접 전선</span><strong>${frontierNote}</strong><small>인접 도시 ${eligibility.neighborNames.length ? eligibility.neighborNames.join(' · ') : '독립 성 · 연결 전선 없음'}</small></div><div class="city-metrics">${metrics.map(([label, value]) => `<div><span>${label}</span><i><b style="width:${Math.min(value, 100)}%"></b></i><em>${value}</em></div>`).join('')}</div><p class="wall-status">성벽 방어도 ${formatNumber(city.defense)} / ${formatNumber(wallCapacity)} · ${isWanderer(state) && city.id !== 'luoyang' ? '재야는 점령하지 않고 성벽을 깎아 약탈합니다.' : '성벽을 0으로 깨고 수비병을 모두 물리치면 점령할 수 있습니다.'}</p>${conquest}${city.id === 'luoyang' ? this.luoyangHistoryCard(state) : ''}${this.cityDamageRankingCard(city)}${this.battleLogCard(city)}<div class="city-yield"><div class="card-header"><div><span class="eyebrow">예상 수확</span><h3>도시 생산량</h3></div><span class="rate-note">${canManage ? '수확 1회 기준' : '점령 후 활성화'}</span></div><div class="yield-grid">${(['grain', 'silver', 'wood', 'iron', 'influence'] as const).map(key => `<span style="--resource-color:${RESOURCE_META[key].color}">${icon(key, 'gi--inline')} ${RESOURCE_META[key].label} +${formatNumber(income[key])}</span>`).join('')}</div></div><div class="building-list"><div class="card-header"><div><span class="eyebrow">건물</span><h3>내정 건물</h3></div><span class="rate-note">${canManage ? '건물마다 생산 특화' : '정찰 정보'}</span></div>${city.buildings.map(building => this.buildingRow(city, building, canManage)).join('')}</div>${canManage ? '<p class="management-tip">병영을 강화하면 성벽이 더 튼튼해지고 방어도 회복 한도가 오릅니다.</p>' : '<p class="management-tip management-tip--warn">성벽을 깨고 수비병을 모두 물리친 뒤, 마지막 세력전에서 이기면 점령합니다.</p>'}</div>`
  }

  private cityDamageRankingCard(city: City): string {
    const rankings = this.cityDamageRankingCityId === city.id ? this.cityDamageRankings : []
    const rows = rankings.length ? rankings.map((entry, index) => `<li><span class="damage-rank-number">${index + 1}</span><strong>${ugc(entry.displayName)}${royalBadge(this.guildUi.royal, { userId: entry.userId, name: entry.displayName })}${entry.guildName ? ` <small class="guild-tag">${ugc(entry.guildName)}</small>` : ''}</strong><small>${escapeHtml(entry.faction)} · ${entry.battleCount}회 참여</small><b>${formatNumber(entry.totalDamage)}</b></li>`).join('') : '<li class="city-damage-ranking-empty">아직 기록된 공성 피해 기여가 없습니다.</li>'
    return `<details class="city-damage-ranking" open><summary><span><span class="eyebrow">공성 기여</span><strong>공성 피해 기여 랭킹</strong></span><b>상위 ${rankings.length}명</b></summary><p>이 도시의 성벽 방어도를 가장 많이 깎은 유저 순위입니다.</p><ol>${rows}</ol></details>`
  }

  private battleLogCard(city: City): string {
    const logs = [...(city.battleLogs ?? [])].reverse()
    const entries = logs.length ? logs.map(log => `<li class="city-battle-log-entry">${this.battleLogBadge(log)}<div><strong>${escapeHtml(log.attackerName)} → ${escapeHtml(log.defenderName)}</strong><small>${log.attackerKind === 'ai' ? '인공지능 공격' : '유저 공격'} · 피해 ${formatNumber(log.damage)} · ${escapeHtml(log.note)}</small></div><time>${new Intl.DateTimeFormat(locale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(log.timestamp)}</time></li>`).join('') : '<li class="city-battle-log-empty">아직 기록된 전투가 없습니다. 수비덱을 배치한 뒤 공격을 받으면 이곳에 기록됩니다.</li>'
    return `<details class="city-battle-log" ${logs.length ? 'open' : ''}><summary><span><span class="eyebrow">도시 전투 기록</span><strong>성 전투 기록</strong></span><b>${logs.length}건</b></summary><p>이 성의 공성전·세력전과 인공지능 습격 결과를 최근 30건까지 보관합니다.</p><ul>${entries}</ul></details>`
  }

  /** 메뉴 설명 창: 제목 아래 설명 문장 + 이 메뉴의 주요 기능 */
  private showMenuGuide(): void {
    const state = this.renderedState
    const heading = this.root.querySelector<HTMLElement>('.section-heading')
    const title = (heading?.querySelector('h1')?.textContent ?? '').trim()
    const intro = (heading?.querySelector('.heading-copy')?.textContent ?? '').trim()
    const items = [...(MENU_TOURS[state?.section ?? ''] ?? []), ...(MENU_GUIDE_EXTRA[state?.section ?? ''] ?? [])].map(step => `<li><b>${escapeHtml(tr(step.title))}</b> ${escapeHtml(tr(step.body))}</li>`).join('')
    document.querySelector('.territory-rules-modal')?.remove()
    const modal = document.createElement('div')
    modal.className = 'territory-rules-modal'
    modal.innerHTML = `<div class="territory-rules__card glass-card" role="dialog" aria-label="${escapeHtml(tr(`${title} 설명`))}"><div class="territory-rules__head"><div><span class="eyebrow">${escapeHtml(tr('메뉴 설명'))}</span><h2>${escapeHtml(tr(`${title} 설명`))}</h2></div><button class="territory-rules__close" data-rules-close aria-label="닫기">✕</button></div><div class="territory-rules__body">${intro ? `<p class="menu-guide__intro">${escapeHtml(intro)}</p>` : ''}${items ? `<section class="territory-rules__section"><h3>${escapeHtml(tr('주요 기능'))}</h3><ul>${items}</ul></section>` : ''}</div></div>`
    const close = () => modal.remove()
    modal.addEventListener('click', event => { if (event.target === modal) close() })
    modal.querySelector('[data-rules-close]')?.addEventListener('click', close)
    document.body.appendChild(modal)
  }

  /** 영토전 설명(세 진영 점령전 · 재야 · 낙양전) */
  /** 진영 영향도와 열세 버프 */
  private influenceNote(state: StrategyState): string {
    const influence = factionInfluence(state)
    const top = Math.max(1, ...Object.values(influence))
    const buff = underdogBuff(state)
    const bars = (Object.keys(influence) as CityFaction[]).map(faction => `<span class="influence-row ${faction === state.faction ? 'is-mine' : ''}"><small>${faction}</small><i><b style="width:${Math.round(influence[faction] / top * 100)}%"></b><em style="left:50%"></em></i><strong>${influence[faction]}</strong></span>`).join('')
    return `<div class="influence-note"><span class="eyebrow">진영 영향도 · 차지한 도시 단계 합</span>${bars}${buff ? `<p class="underdog-buff underdog-buff--${buff.id}"><b>${buff.name}</b>${buff.desc}</p>` : '<p class="underdog-hint">영향도가 가장 강한 진영의 50%(점선) 미만이면 열세 버프 ‘열세의 노력’, 수도만 남으면 ‘구국의 총력전’을 받습니다.</p>'}</div>`
  }

  private showTerritoryRules(): void {
    document.querySelector('.territory-rules-modal')?.remove()
    const mine = this.renderedState?.faction
    const section = (title: string, items: string[], active = false) => `<section class="territory-rules__section ${active ? 'is-mine' : ''}"><h3>${title}${active ? ' <em>내 진영</em>' : ''}</h3><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul></section>`
    const modal = document.createElement('div')
    modal.className = 'territory-rules-modal'
    modal.innerHTML = `<div class="territory-rules__card glass-card" role="dialog" aria-label="영토전 설명"><div class="territory-rules__head"><div><span class="eyebrow">천하영토</span><h2>영토전 설명</h2></div><button class="territory-rules__close" data-rules-close aria-label="닫기">✕</button></div><div class="territory-rules__body">${section('촉한 · 위나라 · 오나라 점령전', [
      '내 진영 도시와 진군로로 맞닿은 도시만 공성할 수 있습니다. 세 진영 수도와 양양(중립 인공지능 수도)은 점령할 수 없습니다.',
      '공성 출정마다 식량 · 은전 · 철을 씁니다. 공성 전투에서 이기면 수비병 1부대를 격파하고 성벽이 덱 전투력만큼 깎입니다.',
      '깎인 성벽은 1시간에 최대 방어도의 20%씩 회복합니다(재야가 0으로 무너뜨린 성벽은 1시간 뒤부터 회복합니다).',
      '성벽 방어도가 0이 되고 수비병을 모두 격파한 뒤 가장 먼저 최종 세력전에서 이긴 유저의 진영이 10분 동안 임시 점령합니다(도시 단계에 따라 옥패를 씁니다).',
      '임시 점령을 얻으면 1분 동안 공성 금지 · 그동안 그 진영 유저가 수비병을 세우고, 임시 점령 시간은 흐르지 않습니다. 그 뒤 국경이 맞닿은 다른 진영(낙양은 낙양전 동안 네 진영 모두)이 그 수비병과 싸울 수 있습니다.',
      '수비병을 모두 격파하면(세운 수비병이 없으면 한 번 이기면) 마지막으로 이긴 유저의 진영이 임시 점령을 넘겨받고, 남은 시간은 처음 10분에서 그대로 이어집니다.',
      '10분이 끝날 때 임시 점령 중인 진영이 최종 점령하고, 마지막으로 임시 점령을 얻은 유저가 금화를 받습니다(한 유저당 하루 5번까지). 최종 점령 뒤 1시간은 공성 금지이며 그 뒤 성벽이 완전히 회복됩니다.',
      '도시 단계: 수도 바로 옆은 1단계, 두 걸음은 2단계, 그 너머는 3단계, 대도시는 4단계, 낙양은 5단계입니다. 단계가 높을수록 성벽과 수비대가 강하고 생산량이 많습니다.',
      '아군 도시에는 지금 덱을 수비병으로 세울 수 있습니다(도시마다 100부대). 상대는 수비병을 모두 격파해야 점령할 수 있습니다.',
      '적 진영 도시를 공성하면 그 진영 유저가 세운 수비대의 실제 덱과 싸웁니다(수비대가 없으면 기본 수비대).',
      '수비대 피로: 공성을 막아 낼 때마다 그 수비대의 능력치가 8%씩 떨어집니다(최대 60%). 1시간에 10%씩 회복합니다. 아무리 강한 수비대도 여러 번 공격받으면 뚫립니다.',
      '중립 인공지능이 맞닿은 아군 도시를 습격합니다. 수비전으로 막고, 성벽이 0이 되면 도시를 빼앗깁니다.',
      '내정: 하루 한 번 아군 도시의 자원을 수확하고, 건물을 시간을 들여 강화합니다. 도시를 빼앗기면 그 도시의 건물이 초기화됩니다.',
      '진영 영향도는 차지한 도시의 단계 합입니다. 영향도가 가장 강한 진영의 50% 미만이면 ‘열세의 노력’: 영토전 전투(공성 · 수비전 · 최종 세력전) 이점 +10%, 공성에서 이기면 성벽 방어도 차감 1.5배.',
      '같은 조건에서 수도만 남으면 ‘구국의 총력전’: 영토전 전투 이점 +20%, 공성에서 이기면 성벽 방어도 차감 2배.',
      '영토전(공성)에는 덱 유형 상성이 적용됩니다: 유리한 유형을 만나면 주는 피해 +12%, 불리하면 −12%.',
    ], mine !== '재야')}${section('재야(중립 진영)', [
      '본성이 없어 세 진영 수도와 양양을 포함한 어느 도시든 국경과 상관없이 공성할 수 있습니다.',
      '약탈 공성에는 출정 비용(식량 · 은전 · 철)이 들지 않습니다.',
      `공성 전투에서 이기면 성벽이 덱 전투력만큼 깎이고, 그 성 하루 생산량의 ${Math.round(WANDERER_PLUNDER_RATE * 100)}%를 약탈합니다(하루 ${this.renderedState ? wandererDailyPlunder(this.renderedState) : WANDERER_DAILY_PLUNDER}회).`,
      `성벽을 0으로 무너뜨리면 그 성의 내정 건물이 모두 초기화됩니다. 무너진 성은 ${Math.round(RAZE_REBUILD_MS / 3600000)}시간 뒤부터 성벽이 다시 회복하기 시작하고(1시간에 20%), 그때까지는 공성할 수 없으며 중립 인공지능 습격도 받지 않습니다.`,
      '도시를 점령하지 않고, 내정(수확 · 건물)과 최종 세력전을 할 수 없습니다. 낙양만은 세 진영과 같은 규칙으로 차지할 수 있습니다.',
      '진영은 설정에서 30일에 한 번 바꿀 수 있습니다.',
    ], mine === '재야')}${section('주간 낙양전', [
      '매주 일요일 20:00에 열리고 24:00 정각에 끝납니다. 낙양은 모든 전선과 떨어진 독립 성입니다.',
      '점령 창이 열린 동안 촉 · 위 · 오와 재야 모두 직접 출정할 수 있습니다.',
      '끝날 때까지 낙양을 점령하고 지킨 진영이 승자가 되고, 다음 점령 창까지 낙양을 영토로 유지합니다.',
      '승리 진영의 유저는 주 1회 낙양 상자, 금화 10~100개, 낙양 강화석 1개를 받습니다.',
      '신화장비는 낙양 강화석으로만 강화할 수 있으며, 강화석 1개로 1회(+1단계) 강화합니다.',
    ])}</div></div>`
    const close = () => modal.remove()
    modal.addEventListener('click', event => { if (event.target === modal) close() })
    modal.querySelector('[data-rules-close]')?.addEventListener('click', close)
    document.body.appendChild(modal)
  }


  private conquestCard(city: City, state: StrategyState, siege: number, eligibility: ReturnType<typeof conquestEligibility>): string {
    if (isWanderer(state) && city.id !== 'luoyang') return this.plunderCard(city, state, eligibility)
    const cost = conquestCost(city, state)
    const power = conquestPower(state)
    const costText = `${icon('grain', 'gi--inline')} ${formatNumber(cost.grain ?? 0)} · ${icon('silver', 'gi--inline')} ${formatNumber(cost.silver ?? 0)} · ${icon('iron', 'gi--inline')} ${formatNumber(cost.iron ?? 0)}`
    const garrisonCount = city.garrisons?.length ?? 3
    const defeated = Math.min(garrisonCount, city.defendersDefeated ?? 0)
    const remaining = Math.max(0, garrisonCount - defeated)
    const finalReady = city.defense <= 0 && remaining === 0
    // 버튼이 잠긴 까닭을 바로 보여 준다(방어도 · 남은 수비병)
    const finalWait = [city.defense > 0 ? `성벽 방어도 ${formatNumber(city.defense)} 남음(0이 되어야 함)` : '', remaining > 0 ? `수비병 ${remaining}부대 남음` : ''].filter(Boolean).join(' · ') || '준비 완료'
    const honorCost = FACTION_WAR_HONOR_COST[city.level] ?? FACTION_WAR_HONOR_COST[5]
    const goldReward = FACTION_WAR_GOLD_REWARD[city.level] ?? FACTION_WAR_GOLD_REWARD[5]
    const actions = eligibility.allowed ? `<div class="territory-actions"><button class="action-button action-button--primary conquest-button" data-action="conquer" data-city="${city.id}">공성 출정 <span>${costText}</span></button><button class="action-button action-button--outline conquest-button" data-action="faction-battle" data-city="${city.id}" ${finalReady ? '' : 'disabled'} title="${escapeHtml(finalWait)}">최종 세력전 <span>옥패 ${formatNumber(honorCost)} · 금화 +${goldReward}</span></button></div>${finalReady ? '' : `<p class="final-war-wait">최종 세력전 조건: ${escapeHtml(finalWait)}</p>`}` : `<div class="frontier-lock"><strong>진군 경로 차단</strong><span>${eligibility.reason}</span><small>국경 전선: ${eligibility.neighborNames.length ? eligibility.neighborNames.join(' · ') : '연결된 아군 도시 없음'}</small></div>`
    return `<div class="conquest-card"><div class="conquest-card-head"><div><span class="eyebrow">진영전 · ${city.owner}</span><h3>성벽 방어도 ${formatNumber(city.defense)} · 점령 진전 ${siege}%</h3></div><strong>${formatNumber(power)} 전투력</strong></div><div class="conquest-progress"><i style="width:${siege}%"></i></div><p>수비병 ${defeated}/${garrisonCount}부대 격파 · 덱 전투력에 따라 성벽 방어도가 감소합니다. 방어도 0·수비병 전멸 후 최종 세력전에서 가장 먼저 이기면 10분 임시 점령합니다.</p>${this.facingGarrisonLine(city)}${actions}</div>`
  }
  /** 임시 점령(2026.10.20): 남은 시간 · 수비병 격파 · 수비병 배치(임시 점령 진영) 또는 쟁탈 출정(다른 진영) */
  private occupationCard(city: City, state: StrategyState, occupied: NonNullable<City['occupy']>, eligibility: ReturnType<typeof conquestEligibility>): string {
    const now = Date.now()
    const mine = occupied.faction === state.faction
    const leftMin = Math.max(1, Math.ceil((occupied.until - Math.max(now, occupied.graceUntil)) / 60000))
    const graceSec = Math.max(0, Math.ceil((occupied.graceUntil - now) / 1000))
    // 수비 준비 중에는 시간이 멈춘다: 남은 시간 = 끝 − 준비 끝
    const total = OCCUPY_MS
    const remainMs = occupied.until - Math.max(now, occupied.graceUntil)
    const elapsed = Math.round(Math.min(100, Math.max(0, (1 - remainMs / total) * 100)))
    const garrisonCount = city.garrisons?.length ?? 0
    const defeated = Math.min(garrisonCount, city.defendersDefeated ?? 0)
    const goldReward = FACTION_WAR_GOLD_REWARD[city.level] ?? FACTION_WAR_GOLD_REWARD[5]
    const head = `<div class="conquest-card-head"><div><span class="eyebrow">임시 점령 · ${occupied.faction}</span><h3>남은 시간 약 ${leftMin}분${now < occupied.graceUntil ? '(수비 준비 중 · 멈춤)' : ''} · 수비병 ${garrisonCount - defeated}/${garrisonCount}부대</h3></div><strong>${formatNumber(conquestPower(state))} 전투력</strong></div><div class="conquest-progress"><i style="width:${elapsed}%"></i></div>`
    const rule = `<p>${occupied.faction}이(가) 남은 시간을 지켜 내면 최종 점령합니다(마지막으로 임시 점령을 얻은 유저에게 금화 +${goldReward} · 한 유저당 하루 5번까지). 국경이 맞닿은 다른 진영이 수비병을 모두 격파하면 임시 점령이 넘어가고, 남은 시간은 그대로 이어집니다. 임시 점령을 얻은 뒤 1분 수비 준비 동안은 시간이 흐르지 않습니다. 최종 점령 뒤 1시간은 공성 금지이고 그 뒤 성벽이 완전히 회복됩니다.</p>`
    if (mine) {
      const canDeploy = garrisonCount < 100
      return `<div class="conquest-card defense-card">${head}${rule}${graceSec > 0 ? `<p class="final-war-wait">수비 준비 시간 ${graceSec}초(임시 점령 시간 멈춤) · 그동안 다른 진영은 공격할 수 없습니다. 수비병을 세우지 않으면 첫 공격에 임시 점령을 빼앗깁니다. 임시 점령 동안 진영 유저가 함께 최대 100부대까지 세울 수 있습니다.</p>` : garrisonCount ? '' : '<p class="final-war-wait">세운 수비병이 없습니다. 다른 진영이 한 번만 이겨도 임시 점령을 빼앗깁니다.</p>'}<div class="territory-actions"><button class="action-button action-button--primary conquest-button" data-action="garrison-deploy" data-city="${city.id}" ${canDeploy ? '' : 'disabled'}>현재 덱 수비병 배치 <span>${garrisonCount}/100부대</span></button></div></div>`
    }
    const action = eligibility.allowed
      ? `<div class="territory-actions"><button class="action-button action-button--primary conquest-button" data-action="conquer" data-city="${city.id}">임시 점령 쟁탈 출정 <span>출정 비용 없음</span></button></div>`
      : `<div class="frontier-lock"><strong>쟁탈 불가</strong><span>${escapeHtml(eligibility.reason)}</span></div>`
    return `<div class="conquest-card">${head}${rule}${this.facingGarrisonLine(city)}${action}</div>`
  }
  /** 공격: 다음에 맞붙을 유저 수비대와 그 피로 */
  private facingGarrisonLine(city: City): string {
    const facing = currentCityGarrison(city)
    if (!facing || facing.source !== 'player') return ''
    const fatigue = Math.round((facing.fatigue ?? 0) * 100)
    const power = Math.round(facing.power * (1 - (facing.fatigue ?? 0)))
    return `<p class="garrison-facing">다음 수비대 · <b>${escapeHtml(facing.label)}</b> · 전투력 ${formatNumber(power)}${fatigue ? ` <span class="garrison-fatigue">피로 ${fatigue}%</span>` : ''}</p>`
  }
  /** 방어: 우리 수비대 피로(막을 때마다 쌓이고 1시간에 10%씩 회복) */
  private garrisonFatigueLine(city: City): string {
    const tired = (city.garrisons ?? []).filter(garrison => garrison.source === 'player' && (garrison.fatigue ?? 0) > 0.005)
    if (!tired.length) return ''
    const worst = Math.round(Math.max(...tired.map(garrison => garrison.fatigue ?? 0)) * 100)
    return `<p class="garrison-facing">지친 수비대 ${tired.length}부대 · 가장 지친 부대 <span class="garrison-fatigue">피로 ${worst}%</span> · 1시간에 10%씩 회복</p>`
  }
  /** 재야: 약탈 공성 카드(점령 · 최종 세력전 없음) */
  private plunderCard(city: City, state: StrategyState, eligibility: ReturnType<typeof conquestEligibility>): string {
    const costText = '출정 비용 없음'
    const take = plunderTake(city, state)
    const share = (value: number) => formatNumber(value)
    const left = wandererPlunderLeft(state)
    const wall = cityWallCapacity(city)
    const rebuild = city.razedAt ? Math.max(0, city.razedAt + RAZE_REBUILD_MS - Date.now()) : 0
    const action = eligibility.allowed
      ? `<div class="territory-actions"><button class="action-button action-button--primary conquest-button" data-action="conquer" data-city="${city.id}">약탈 공성 <span>${costText}</span></button></div>`
      : `<div class="frontier-lock"><strong>${city.defense <= 0 ? '성벽 붕괴' : '공성 불가'}</strong><span>${escapeHtml(eligibility.reason)}</span>${rebuild ? `<small>성벽 회복 시작까지 ${Math.max(1, Math.ceil(rebuild / 60000))}분</small>` : ''}</div>`
    return `<div class="conquest-card plunder-card"><div class="conquest-card-head"><div><span class="eyebrow">재야 약탈 · ${city.owner}</span><h3>성벽 방어도 ${formatNumber(city.defense)} / ${formatNumber(wall)}</h3></div><strong>${formatNumber(conquestPower(state))} 전투력</strong></div><div class="conquest-progress"><i style="width:${Math.round((1 - city.defense / Math.max(1, wall)) * 100)}%"></i></div><p>이기면 성벽이 덱 전투력만큼 깎이고 약탈합니다 · 식량 +${share(take.grain)} · 은전 +${share(take.silver)} · 목재 +${share(take.wood)} · 철 +${share(take.iron)} · 영향력 +${share(take.influence)} · 오늘 약탈 ${left}/${wandererDailyPlunder(state)}회 남음</p><p class="final-war-wait">성벽을 0으로 무너뜨리면 이 성의 내정 건물이 모두 초기화됩니다. 점령과 최종 세력전은 할 수 없습니다.</p>${action}</div>`
  }

  private defenseCard(city: City, state: StrategyState): string {
    const power = conquestPower(state)
    const cost = `${icon('grain', 'gi--inline')} ${formatNumber(280 + city.level * 90)} · ${icon('iron', 'gi--inline')} ${formatNumber(100 + city.level * 55)}`
    const garrisonCount = city.garrisons?.length ?? 0
    const canDeploy = garrisonCount < 100
    const ban = cityCaptureBanned(city) ? `<p class="final-war-wait">최종 점령 직후 공성 금지 · ${Math.max(1, Math.ceil(((city.captureBanUntil ?? 0) - Date.now()) / 60000))}분 뒤 성벽이 완전히 회복됩니다.</p>` : ''
    return `<div class="conquest-card defense-card">${ban}<div class="conquest-card-head"><div><span class="eyebrow">성 방어</span><h3>방어병 ${garrisonCount}/100부대</h3></div><strong>${formatNumber(power)} 전투력</strong></div><p>현재 출전 진형을 이 도시에 수비병으로 세울 수 있습니다. 상대는 배치된 수비병을 모두 격파해야 점령할 수 있습니다.</p>${this.garrisonFatigueLine(city)}<div class="territory-actions"><button class="action-button action-button--primary conquest-button" data-action="garrison-deploy" data-city="${city.id}" ${canDeploy ? '' : 'disabled'}>현재 덱 수비병 배치</button><button class="action-button action-button--outline conquest-button" data-action="defense" data-city="${city.id}">수비전 출격 <span>${cost}</span></button></div></div>`
  }
  private buildingRow(city: City, building: CityBuilding, canManage: boolean): string {
    const cost = buildingCost(building, this.renderedState ?? undefined)
    const costText = `${icon('silver', 'gi--inline')} ${formatNumber(cost.silver ?? 0)} · ${icon('wood', 'gi--inline')} ${formatNumber(cost.wood ?? 0)} · ${icon('iron', 'gi--inline')} ${formatNumber(cost.iron ?? 0)}`
    const maxed = building.level >= building.maxLevel
    // 공사 중: 남은 시간 · 즉시 완공(금화) · 취소, 같은 도시의 다른 건물은 기다린다
    const busyBuilding = city.buildings.find(item => item.endsAt !== undefined)
    if (building.endsAt !== undefined) {
      const left = Math.max(0, building.endsAt - Date.now())
      const total = Math.max(1, building.endsAt - (building.startedAt ?? building.endsAt - 1))
      return `<div class="building-row is-building"><div class="building-glyph">${icon(building.kind === 'agriculture' ? 'grain' : building.kind === 'commerce' ? 'silver' : building.kind === 'barracks' ? 'duel' : building.kind === 'workshop' ? 'iron' : 'research')}</div><div class="building-copy"><strong>${building.name} <em class="building-next">→ ${building.level + 1}단계 공사 중</em></strong><small>남은 시간 <b data-build-left="${building.endsAt}">${formatDuration(left)}</b></small><span class="building-progress"><i data-build-bar="${building.endsAt}" data-build-total="${total}" style="width:${Math.min(100, (1 - left / total) * 100).toFixed(1)}%"></i></span></div><div class="building-actions"><button class="mini-action" data-action="building-rush" data-city="${city.id}" data-build-rush="${building.endsAt}" ${canManage ? '' : 'disabled'}>즉시 완공 · 금화 ${rushCost(left)}</button><button class="mini-action" data-action="building-cancel" data-city="${city.id}" ${canManage ? '' : 'disabled'}>취소</button></div></div>`
    }
    const waitOther = Boolean(busyBuilding && !maxed)
    return `<div class="building-row"><div class="building-glyph">${icon(building.kind === 'agriculture' ? 'grain' : building.kind === 'commerce' ? 'silver' : building.kind === 'barracks' ? 'duel' : building.kind === 'workshop' ? 'iron' : 'research')}</div><div class="building-copy"><strong>${building.name}</strong><small>${building.description}</small><span class="building-level">${'◆'.repeat(building.level)}${'◇'.repeat(building.maxLevel - building.level)}</span></div><button class="mini-action ${maxed ? 'is-maxed' : ''}" data-action="building-upgrade" data-city="${city.id}" data-building="${building.id}" ${!canManage || maxed || waitOther ? 'disabled' : ''} title="${waitOther ? '이 도시는 다른 건물을 짓는 중입니다' : ''}">${maxed ? '최고 단계' : waitOther ? `다른 공사 중 · ${costText}` : `강화 · ${formatDuration(buildingDurationMs(building, this.renderedState ?? undefined))} · ${costText}`}</button></div>`
  }

  private researchSection(state: StrategyState): string {
    const now = Date.now()
    const active = activeResearch(state)
    const doneCount = state.research.filter(node => node.unlocked && branchActive(state, node.branch)).length
    const effects = researchSummary(state)
    const activePanel = active && active.endsAt !== undefined
      ? (() => {
        const remaining = Math.max(0, active.endsAt - now)
        const progress = Math.min(100, Math.max(0, (1 - remaining / active.durationMs) * 100))
        return `<div class="research-active glass-card is-running"><div class="research-active__copy"><span class="eyebrow">진행 중인 연구 · ${active.branch} ${active.tier}단계</span><h3>${active.name}</h3><p>${active.description}</p></div><div class="research-active__timer"><strong data-research-remaining>${formatDuration(remaining)}</strong><small>남음 · 전체 ${formatDuration(active.durationMs)}</small><div class="research-progress"><i data-research-progress style="width:${progress.toFixed(1)}%"></i></div></div><div class="research-active__actions"><button class="mini-action mini-action--rush" data-action="research-rush"><span data-research-rush>즉시 완료 · 금화 ${rushCost(remaining)}</span></button><button class="mini-action" data-action="research-cancel">연구 취소 (전액 환급)</button></div></div>`
      })()
      : (() => {
        const options = state.research.filter(node => branchActive(state, node.branch) && researchStatus(state, node) === 'available')
        const pick = options.filter(node => canPay(state, node.cost)).sort((a, b) => a.tier - b.tier || a.durationMs - b.durationMs)[0] ?? options.sort((a, b) => a.tier - b.tier)[0]
        if (!pick) return `<div class="research-active glass-card is-idle"><div class="research-active__copy"><span class="eyebrow">연구소</span><h3>${doneCount >= 30 ? '모든 연구를 마쳤습니다' : '지금 시작할 수 있는 연구가 없습니다'}</h3></div></div>`
        const affordable = canPay(state, pick.cost)
        return `<div class="research-active glass-card is-idle"><div class="research-active__copy"><span class="eyebrow">연구소가 비어 있습니다 · 추천 연구</span><h3>${pick.branch} ${pick.tier}단계 · ${pick.name}</h3><p>${pick.description}</p></div><div class="research-active__timer"><strong>${formatDuration(pick.durationMs)}</strong><small class="${affordable ? '' : 'is-short'}">${researchCost(pick)}${affordable ? '' : ' · 자원 부족'}</small></div><div class="research-active__actions"><button class="mini-action mini-action--research" data-action="research" data-research="${pick.id}" ${affordable ? '' : 'disabled'}>추천 연구 시작 →</button></div></div>`
      })()
    // 재야는 부국 · 제패 대신 재야 전용 약탈 · 유격 분야
    const columns = researchBranchesFor(state).map(branch => {
      const nodes = state.research.filter(node => node.branch === branch.id)
      const done = nodes.filter(node => node.unlocked).length
      const tiers = [1, 2, 3, 4, 5, 6].map(tier => {
        const row = nodes.filter(node => node.tier === tier)
        if (row.length > 1) return `<div class="research-choice"><span class="research-choice__label">${tier}단계 갈림길 · 둘 중 하나</span><div class="research-choice__pair">${row.map(node => this.researchCard(node, state, now)).join('<i class="research-choice__or">또는</i>')}</div></div>`
        return row.map(node => this.researchCard(node, state, now)).join('')
      }).join('')
      return `<div class="glass-card research-branch research-branch--${branch.prefix}"><div class="research-branch-head"><span class="branch-rune">${icon(branch.prefix === 'econ' || branch.prefix === 'loot' ? 'grain' : branch.prefix === 'army' ? 'battle' : branch.prefix === 'strat' ? 'research' : branch.prefix === 'realm' || branch.prefix === 'raid' ? 'territory' : 'rank')}</span><div><span class="eyebrow">${branch.hint}</span><h3>${branch.id} · ${done}/6단계</h3></div></div><div class="research-nodes">${tiers}</div></div>`
    }).join('')
    const summary = `<details class="research-summary glass-card" ${effects.length ? 'open' : ''}><summary>적용 중인 연구 효과 · ${effects.length}개</summary>${effects.length ? `<ul>${effects.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p>아직 완료한 연구가 없습니다.</p>'}</details>`
    return `<section class="page-section page-section--research"><div class="section-heading section-heading--compact"><div><span class="eyebrow">육성</span><h1>기술 연구</h1><p class="heading-copy">다섯 분야를 6단계씩 연구합니다. 한 번에 하나씩, 단계가 오를수록 오래 걸리며(5분 → 8시간) 3·6단계는 둘 중 하나를 고릅니다.</p></div><div class="section-counter"><span>완료 단계</span><strong>${doneCount}<small> / 30</small></strong></div></div>${activePanel}<div class="research-grid research-grid--five">${columns}</div>${summary}</section>`
  }

  private researchCard(node: ResearchNode, state: StrategyState, now: number): string {
    const status = researchStatus(state, node)
    const footer = status === 'done' ? '<span class="research-check">✓ 적용 중</span>'
      : status === 'active' ? `<span class="research-running">연구 중 · ${formatDuration(Math.max(0, (node.endsAt ?? now) - now))}</span>`
      : status === 'locked' ? `<span class="research-lock">${node.tier - 1}단계 완료 필요</span>`
      : status === 'busy' ? '<span class="research-lock">다른 연구 진행 중</span>'
      : `<button class="mini-action mini-action--research" data-action="research" data-research="${node.id}">${status === 'switch' ? '이쪽으로 바꾸기' : '연구 시작'} <span>→</span></button>`
    return `<article class="research-node is-${status}"><div class="research-node-top"><span class="research-tier">${node.tier}단계${node.choice ? ` · ${node.choice === 'a' ? '갑' : '을'}` : ''}</span><span class="research-time">${formatDuration(node.durationMs)}</span></div><h4>${node.name}</h4><p>${node.description}</p><div class="research-node-footer"><span class="research-cost ${status === 'available' && !canPay(state, node.cost) ? 'is-short' : ''}">${researchCost(node)}</span>${footer}</div>${status === 'switch' ? '<small class="research-switch-note">바꾸면 같은 단계의 다른 연구 효과는 사라집니다.</small>' : ''}</article>`
  }


  private portraitAsset(general: General): string {
    return assetUrl(`/assets/generals-realistic-webp/${general.id}.webp`)
  }

  private portrait(general: General, className = ''): string {
    const portraitPath = this.portraitAsset(general)
    const imageClass = BRIGHT_PORTRAITS.has(general.id) ? ' has-portrait is-bright' : ' has-portrait'
    const imageStyle = `--portrait:url('${portraitPath}');`
    return `<div class="general-portrait${className ? ` ${className}` : ''}${imageClass}" style="--accent:${gradeColor(general)};${imageStyle}"><span>${general.portrait}</span><i></i></div>`
  }

  private ritualPortrait(general: General): string {
    const portraitPath = this.portraitAsset(general)
    const imageClass = ' has-portrait'
    const imageStyle = `--portrait:url('${portraitPath}');`
    return `<div class="ritual-portrait${imageClass}" style="--accent:${gradeColor(general)};${imageStyle}"><span>${general.portrait}</span><i></i></div>`
  }

  /** 무장 이름 옆 버프 · 디버프 아이콘(최대 4개, 넘치면 +개수). 남은 시간은 1초 단위로만 바꿔 다시 그리기를 줄인다 */
  private unitEffectIcons(chips: UnitEffectChip[]): string {
    const shown = chips.slice(0, 4)
    const more = chips.length - shown.length
    return shown.map(chip => `<i class="bt-fx__icon is-${chip.kind}" title="${escapeHtml(`${tr(chip.name)} · ${tr(chip.description)} · ${Math.ceil(chip.remaining)}${tr('초')}`)}" aria-label="${escapeHtml(tr(chip.name))}">${fxGlyph(chip.id)}</i>`).join('') + (more > 0 ? `<i class="bt-fx__more">+${more}</i>` : '')
  }

  private attributeRows(general: General, scale = 0): string {
    const stats = [
      ['통솔', general.leadership, 'leadership'],
      ['무력', general.martial, 'martial'],
      ['모략', general.stratagem, 'stratagem'],
      ['속도', general.speed, 'speed'],
    ] as const
    // 기준값(보유 무장 중 가장 높은 능력치) 대비 비율. 이 무장의 가장 높은 능력치는 강조
    const top = Math.max(...stats.map(([, value]) => value))
    const base = scale || Math.max(100, top)
    // 유형별 성장: 레벨업 때 가장 많이 오르는 능력치(무력형=무력, 책사형=모략, 방어·지휘형=통솔)
    const weights = growthWeights(general)
    const grow = stats.reduce((best, row) => weights[row[2]] > weights[best[2]] ? row : best)[2]
    return stats.map(([label, value, key]) => `<div class="${value === top ? 'is-top' : ''}${key === grow ? ' is-grow' : ''} stat-row--info" data-action="stat-info" data-stat="${key}" role="button" tabindex="0" title="눌러서 ${label} 설명 보기"><span>${label}${key === grow ? '<sup title="레벨업 때 가장 많이 오릅니다">▲</sup>' : ''}</span><i><b style="width:${Math.min(100, value / base * 100).toFixed(1)}%"></b></i><em>${value}</em></div>`).join('') + '<p class="stat-info" data-stat-info hidden></p>'
  }

  /** 이 무장이 속한 인연: 누르면 아래에 효과 · 구성원이 펼쳐진다 */
  private bondChips(general: General): string {
    const bonds = BONDS.filter(bond => bond.members.includes(general.id))
    if (!bonds.length) return ''
    const formation = new Set(this.renderedState?.formation ?? [])
    const buttons = bonds.map(bond => {
      const count = bond.members.filter(id => formation.has(id)).length
      const active = bondActive(bond, formation)
      return `<button type="button" class="skill-fx-chip is-bond ${active ? 'is-active' : 'is-inactive'}" data-action="bond-info" data-bond="${bond.id}">${fxSeal('bond', 'bond')}<span class="fx-name">${escapeHtml(tr(bond.name))}</span>${active ? '<small>발동 중</small>' : `<small>미발동 ${count}/${bond.need}</small>`}</button>`
    }).join('')
    return `<div class="skill-detail-wide skill-fx skill-bond"><small>인연 <em>눌러서 효과 보기</em></small><div class="skill-fx-chips">${buttons}</div><p class="skill-fx-info" data-effect-info hidden></p></div>`
  }

  /** 스킬이 거는 버프 · 디버프: 누르면 아래에 효과 설명이 펼쳐진다 */
  private skillEffectChips(general: General): string {
    const def = skillDefFor(general.id, general.role, general.skillName, general.skillDescription)
    const chips = new Map<string, { id: BattleEffectId; sec: number; awaken: boolean }>()
    const collect = (fx: SkillFx[] = [], awaken: boolean) => fx.forEach(part => {
      if ((part.k === 'buff' || part.k === 'debuff') && BATTLE_EFFECTS[part.id] && !chips.has(part.id)) chips.set(part.id, { id: part.id, sec: part.sec, awaken })
    })
    collect(def.active.fx, false)
    collect(def.awaken?.fx, true)
    if (!chips.size) return ''
    const buttons = [...chips.values()].map(chip => {
      const effect = BATTLE_EFFECTS[chip.id]
      return `<button type="button" class="skill-fx-chip is-${effect.kind}" data-action="effect-info" data-effect="${chip.id}" data-sec="${chip.sec}" data-awaken="${chip.awaken ? '1' : ''}">${fxSeal(chip.id, effect.kind)}<span class="fx-name">${escapeHtml(effect.name)}</span>${chip.awaken ? '<small>각성</small>' : ''}</button>`
    }).join('')
    return `<div class="skill-detail-wide skill-fx"><small>버프 · 디버프 <em>눌러서 효과 보기</em></small><div class="skill-fx-chips">${buttons}</div><p class="skill-fx-info" data-effect-info hidden></p></div>`
  }

  private skillDetailPanel(general: General): string {
    const detail = skillDetail(general)
    const extra = [
      detail.passive ? `<div class="skill-detail-wide"><small>패시브 (3성)</small><strong>${escapeHtml(detail.passive)}</strong></div>` : '',
      detail.awaken ? `<div class="skill-detail-wide"><small>각성 (5성)</small><strong>${escapeHtml(detail.awaken)}</strong></div>` : '',
      detail.weakness ? `<div class="skill-detail-wide skill-detail-weak"><small>약점</small><strong>${escapeHtml(detail.weakness)}</strong></div>` : '',
      this.skillEffectChips(general),
      this.bondChips(general),
    ].join('')
    return `<div class="skill-detail-panel skill-detail-panel--${detail.category === '정화·치료' ? 'cleanse' : detail.category === '버프' ? 'buff' : detail.category === '디버프' ? 'debuff' : 'combat'}"><div class="skill-detail-title"><span>◈ 스킬 상세 <b class="skill-category">${detail.type}</b></span><b>${skillRank(general)}성 · 사기 −${skillPower(general)}</b></div><div class="skill-detail-grid"><div><small>발동</small><strong>${escapeHtml(detail.trigger)}</strong></div><div><small>대상</small><strong>${escapeHtml(detail.target)}</strong></div><div class="skill-detail-wide"><small>효과</small><strong>${escapeHtml(detail.effect)}</strong></div><div><small>유형</small><strong>${escapeHtml(detail.duration)}</strong></div><div><small>쿨다운</small><strong>${escapeHtml(detail.cooldown)}</strong></div>${extra}</div></div>`
  }


  private generalCard(state: StrategyState, general: General, scale: number): string {
    const meta = GRADE_META[general.grade]
    const lane = state.formation.indexOf(general.id)
    const inFormation = lane >= 0
    const detail = skillDetail(general)
    const cost = upgradeCost(state, general)
    const canUpgrade = state.silver >= cost.silver && state.manuals >= cost.manuals
    const many = affordableUpgrades(state, general.id, 10)
    const unlockAt = skillUnlockLevel(general)
    const loadout = state.equipmentLoadouts?.[general.id] ?? {}
    const gear = (['weapon', 'armor', 'accessory'] as EquipmentType[]).map(type => {
      const item = state.equipmentInventory.find(candidate => candidate.id === loadout[type])
      return item ? `<span class="gcard-gear__slot is-on" style="--grade:${EQUIPMENT_GRADE_META[item.grade].color}" title="${escapeHtml(item.name)} +${item.level}"><img class="gear-glyph" src="${equipmentImage(type)}" alt="" width="18" height="18" draggable="false"><small>+${item.level}</small></span>` : `<span class="gcard-gear__slot" title="${EQUIPMENT_TYPE_META[type].label} 비어 있음"><img class="gear-glyph" src="${equipmentImage(type)}" alt="" width="18" height="18" draggable="false"></span>`
    }).join('')
    const sets = Object.entries(equipmentSetCounts(state, general.id)).filter(([, count]) => (count ?? 0) >= 2).map(([set, count]) => `${EQUIPMENT_SET_META[set as keyof typeof EQUIPMENT_SET_META].label} ${count}`).join(' · ')
    const gearPower = equipmentPowerForUi(state, general.id)
    // 스킬 해금 없음(2026.10.20): 모든 무장이 Lv.1부터 스킬을 쓴다
    void unlockAt
    const skillState = `<span class="gcard-skill-state is-on">스킬 ${skillRank(general)}성</span>`
    return `<article class="gcard ${general.grade >= 4 ? `gcard--aura gcard--g${general.grade}` : ''} ${inFormation ? 'is-deployed' : ''} " style="--accent:${gradeColor(general)};--grade:${meta.color}">
      <div class="gcard-portrait" style="--portrait:url('${this.portraitAsset(general)}')"><span class="gcard-grade">${general.grade} · ${meta.label}</span>${inFormation ? `<span class="gcard-lane">1군 · ${['좌측', '중앙', '우측'][lane]}</span>` : (() => { const where = squadOf(state, general.id); return where > 0 ? `<span class="gcard-lane gcard-lane--reserve">${SQUAD_LABELS[where]} · ${['좌측', '중앙', '우측'][squadIds(state, where).indexOf(general.id)] ?? ''}</span>` : '' })()}</div>
      <div class="gcard-body">
        <div class="gcard-head"><div><h3>${general.name}<span class="star-row">${'★'.repeat(general.stars)}${'☆'.repeat(5 - general.stars)}</span></h3><p>${escapeHtml(general.epithet)}</p></div><span class="role-tag">${general.role}</span></div>
        <div class="level-line"><span>Lv.${general.level}</span><span>전투력 <b>${formatNumber(combatPower(general) + gearPower)}</b>${gearPower ? `<small> (장비 +${formatNumber(gearPower)})</small>` : ''}</span></div>
        <div class="stat-bars stat-bars--attributes">${this.attributeRows(general, scale)}</div>
        <details class="gcard-skill"><summary><span>◈ ${escapeHtml(general.skillName)}</span><em>${detail.type}</em>${skillState}</summary><p>${escapeHtml(general.skillDescription)}</p>${this.skillDetailPanel(general)}</details>
        <button class="gcard-gear" data-action="equip-general" data-id="${general.id}" title="이 무장의 장비 화면으로">${gear}<span>${sets || (gearPower ? '세트 효과 없음' : '장비 없음')}</span><b>장착</b></button>
        <div class="gcard-actions"><button class="mini-action mini-action--deploy" data-action="formation" data-id="${general.id}">${inFormation ? '편성 해제' : squadOf(state, general.id) > 0 ? '1군으로' : '출전 편성'}</button>${isMaxLevel(general) ? `<button class="mini-action gcard-up is-max" disabled title="최고 레벨입니다. 성급을 올리면 더 강해집니다.">최고 레벨 Lv.${MAX_GENERAL_LEVEL}<small class="cost-row">성급으로 더 강해집니다</small></button>` : `<button class="mini-action gcard-up" data-action="upgrade" data-id="${general.id}" ${canUpgrade ? '' : 'disabled'} title="은전 ${formatNumber(cost.silver)} · 병서 ${formatNumber(cost.manuals)}">강화 Lv.${general.level + 1}<small class="cost-row"><span class="cost ${state.silver < cost.silver ? 'is-short' : ''}">${icon('silver', 'gi--cost')}${compactNumber(cost.silver)}</span><span class="cost ${state.manuals < cost.manuals ? 'is-short' : ''}">${icon('manuals', 'gi--cost')}${formatNumber(cost.manuals)}</span></small></button>`}${many >= 2 ? `<button class="mini-action gcard-up-many" data-action="upgrade-many" data-id="${general.id}">${many}회 강화</button>` : ''}${general.level > 1 ? `<button class="mini-action gcard-reset" data-action="level-reset" data-id="${general.id}" ${state.gold < LEVEL_RESET_GOLD ? 'disabled' : ''} title="금화 ${LEVEL_RESET_GOLD}개 · 레벨에 쓴 은전 · 병서 80% 반환">레벨 초기화<small class="cost-row"><span class="cost ${state.gold < LEVEL_RESET_GOLD ? 'is-short' : ''}">${icon('gold', 'gi--cost')}${LEVEL_RESET_GOLD}</span><span>80% 반환</span></small></button>` : ''}</div>
      </div></article>`
  }

  private lv60StatMax = 0
  /** 도감 기준: 원형을 Lv.60(기본 성급)까지 키운 능력치 */
  private atLevel60(general: General): General {
    const base = templateGeneral(general.id) ?? general
    return { ...base, ...statsAt(base, MAX_GENERAL_LEVEL, base.stars), level: MAX_GENERAL_LEVEL, stars: base.stars }
  }
  /** 능력치 막대의 기준값: 전체 무장 Lv.60 능력치 중 가장 높은 값 */
  private level60Scale(): number {
    if (!this.lv60StatMax) this.lv60StatMax = Math.max(100, ...allGenerals().flatMap(item => { const g = this.atLevel60(item); return [g.leadership, g.martial, g.stratagem, g.speed] })) * 1.04
    return this.lv60StatMax
  }

  private codexCard(general: General, owned: boolean): string {
    const meta = GRADE_META[general.grade]
    const hidden = owned ? '' : ' codex-card--locked'
    const g60 = this.atLevel60(general)
    const skillOf = owned ? general : g60
    const status = owned
      ? `<div class="codex-own-line"><span>보유 Lv.${general.level} · ${'★'.repeat(general.stars)}</span><b>${formatNumber(combatPower(general))}</b></div>`
      : `<div class="codex-lock-note">무장 모집에서 획득할 수 있습니다. (${meta.label} 등급 확률 ${meta.rate})</div>`
    const body = `<div class="codex-stat-line"><span>Lv.60 기준 능력치</span><b>전투력 ${formatNumber(combatPower(g60))}</b></div><div class="stat-bars stat-bars--attributes codex-stats">${this.attributeRows(g60, this.level60Scale())}</div><details class="gcard-skill"><summary><span>◈ ${escapeHtml(skillOf.skillName)}</span><em>${skillDetail(skillOf).type}</em></summary><p>${escapeHtml(skillOf.skillDescription)}</p>${this.skillDetailPanel(skillOf)}</details>${status}`
    return `<article class="codex-card${hidden}${general.grade >= 4 ? ` gcard--aura gcard--g${general.grade}` : ''}" data-codex-name="${escapeHtml(general.name)}" style="--accent:${gradeColor(general)};--grade:${meta.color}"><div class="codex-card-art">${this.portrait(general, 'codex-portrait')}<span class="codex-grade">${general.grade} · ${meta.label}</span><span class="codex-state">${owned ? '영입 완료' : '미영입'}</span>${isEventGeneral(general.id) ? '<span class="codex-event" title="정식 모집에는 나오지 않고 이벤트로만 얻을 수 있습니다">이벤트 한정</span>' : ''}</div><div class="codex-card-body"><div class="codex-card-heading"><div><h3>${escapeHtml(general.name)}</h3><p>${escapeHtml(general.epithet)}</p></div><span>${general.role}</span></div>${body}</div></article>`
  }



  /** 출전 편성 비교 대상: 다음 시나리오의 같은 자리 적장 */
  /**
   * 무장별 추천 덱: 무장을 고르면 그 무장이 들어간 이상적인 조합을 유형마다 하나씩(스킬 연계·버티기·초반 끝내기·디버프·유틸) 보여 준다.
   * 지금 키운 정도는 따지지 않고 스킬 설계와 전열 규칙만 본다. 70명 전체에서 고르므로 없는 무장은 미보유로 표시한다.
   */
  /** 대련 상대 덱 유형과 내 덱 기준 상성 */
  private duelStyleBadge(state: StrategyState, opponent: DuelOpponent): string {
    const theirs = opponent.deck?.length === 3 ? deckStyle(opponent.deck.map(general => general.id)) : null
    if (!theirs) return ''
    const mine = deployedIds(state.formation).length >= 3 ? deckStyle(deployedIds(state.formation)) : null
    const edge = styleEdge(mine, theirs)
    return `<span class="duel-style ${edge > 0 ? 'is-adv' : edge < 0 ? 'is-dis' : ''}">${ARCHETYPE_META[theirs].label} 덱${edge > 0 ? ' · 유리' : edge < 0 ? ' · 불리' : ''}</span>`
  }

  /** 지금 편성의 덱 유형과 상성(영토전 · 유저 대련) */
  private styleNote(ids: string[]): string {
    const style = ids.length >= 3 ? deckStyle(ids) : null
    if (!style) return `<p class="combo-style-note">덱 유형 상성(영토전 · 유저 대련): 세 명을 모두 편성하면 덱 유형이 정해집니다. 유리한 유형을 만나면 주는 피해 +12%, 불리하면 −12%입니다.</p>`
    const counters = styleCounters(style)
    return `<p class="combo-style-note">현재 덱 유형 <b>${ARCHETYPE_META[style].label}</b> · 강함: ${counters.strong} · 약함: ${counters.weak}<small>영토전 · 유저 대련에서 유리한 유형을 만나면 주는 피해 +12%, 불리하면 −12%</small></p>`
  }

  private comboAdvice(state: StrategyState, squad = 0): string {
    const members = squadIds(state, squad)
    const owned = new Set(state.generals.map(general => general.id))
    const catalog = allGenerals()
    const byId = new Map(catalog.map(general => [general.id, general]))
    const ownedFirst = [...catalog].sort((left, right) => Number(owned.has(right.id)) - Number(owned.has(left.id)) || right.grade - left.grade)
    const anchorId = (this.comboAnchorId && byId.has(this.comboAnchorId) ? this.comboAnchorId : null) ?? (members[1] || members[0] || deployedIds(state.formation)[0] || ownedFirst[0].id)
    const anchor = byId.get(anchorId)!
    let combos = this.comboCache.get(anchorId)
    if (!combos) { combos = recommendDecks(anchorId); this.comboCache.set(anchorId, combos) }
    const current = members.join(',')
    const chips = ownedFirst.map(general => `<button class="combo-chip ${general.id === anchorId ? 'is-active' : ''} ${owned.has(general.id) ? '' : 'is-unowned'}" data-action="combo-anchor" data-id="${general.id}" style="--accent:${gradeColor(general)}" aria-pressed="${general.id === anchorId}">${this.portrait(general, 'combo-chip__portrait')}<span>${escapeHtml(general.name)}</span></button>`).join('')
    const lanes = ['↙ 좌측', '↑ 전열', '↘ 우측']
    const rows = combos.map(combo => {
      const meta = ARCHETYPE_META[combo.archetype]
      const missing = combo.ids.filter(id => !owned.has(id))
      const members = combo.ids.map((id, lane) => {
        const general = byId.get(id)!
        const has = owned.has(id)
        return `<div class="combo-member ${id === anchorId ? 'is-anchor' : ''} ${has ? '' : 'is-unowned'}" style="--accent:${gradeColor(general)}">${this.portrait(general, 'combo-member__portrait')}<div><small>${lanes[lane]}</small><strong>${escapeHtml(general.name)}</strong><span>${general.role} · ${GRADE_META[general.grade].label}</span>${has ? '' : '<em class="combo-edge is-dis">미보유</em>'}</div></div>`
      }).join('')
      // 인연 꼬리표: 누르면 설명이 펼쳐진다(효과 · 필요 인원 · 구성원)
      const nameOf = (id: string) => catalog.find(item => item.id === id)?.name ?? id
      const bondTag = combo.bond ? `<details class="combo-tag combo-tag--bond combo-tag--info"><summary>인연 ‘${escapeHtml(combo.bond.name)}’</summary><div class="combo-tag__pop"><b>인연 ‘${escapeHtml(combo.bond.name)}’</b><p>${escapeHtml(combo.bond.desc)}</p><small>${combo.bond.need}명 이상 함께 출전 · ${combo.bond.members.map(id => escapeHtml(nameOf(id))).join(' · ')}</small></div></details>` : ''
      // 꼬리표는 인연만(누르면 효과 · 필요 인원 · 구성원)
      const tags = bondTag
      const isCurrent = combo.ids.join(',') === current
      const action = isCurrent ? '<span class="combo-current">현재 편성</span>' : missing.length ? `<span class="combo-missing">미보유 ${missing.length}명</span>` : `<button class="mini-action mini-action--deploy" data-action="apply-combo" data-squad="${squad}" data-ids="${combo.ids.join(',')}">${squad > 0 ? `${SQUAD_LABELS[squad]}에 ` : ''}이 덱으로 편성</button>`
      const counters = styleCounters(combo.archetype)
      return `<li class="combo-row combo-row--${combo.archetype} ${isCurrent ? 'is-current' : ''}"><div class="combo-type"><b>${meta.label}</b><small>${meta.desc}</small><small class="combo-style">강함: ${counters.strong} · 약함: ${counters.weak}</small>${combo.winRate !== undefined && this.isAdmin() ? `<small class="combo-winrate" title="유저 대련 규칙 · Lv40 3성 · 장비 없음으로 대표 덱 10개와 싸운 평균 승률">시뮬레이션 승률 <b>${Math.round(combo.winRate * 100)}%</b></small>` : ''}</div><div class="combo-members">${members}</div><div class="combo-side"><div class="combo-tags">${tags}</div>${action}</div></li>`
    }).join('')
    return `<div class="combo-advice glass-card"><div class="card-header"><div><span class="eyebrow">추천 덱</span><h3>무장별 추천 덱</h3><p class="combo-note">무장을 고르면 그 무장이 들어간 이상적인 조합을 유형마다 하나씩 보여 드립니다. 천명 무장은 유형마다 전투 시뮬레이션으로 승률이 가장 높았던 조합을 보여 줍니다. 가운데(전열)에는 수호형이나 단단한 무장을 세웁니다. 아직 없는 무장도 미보유로 함께 보여 줍니다.</p></div></div><div class="combo-anchor-row" role="group" aria-label="추천 덱을 볼 무장">${chips}</div>${this.styleNote(members)}<div class="combo-anchor-name"><b>${escapeHtml(anchor.name)}</b> 추천 덱</div><ol class="combo-list">${rows}</ol></div>`
  }

  private formationEnemies(state: StrategyState): Array<General | undefined> {
    const next = this.nextScenario(state)
    return next ? scenarioEnemyIds(next, state.faction).map(id => templateGeneral(id)) : []
  }

  /** 2·3군 상성 기준: 이번 주 레이드 보스 덱(좌·중·우) */
  private raidEnemies(): General[] {
    const info = this.raidView.info
    return raidBossDeck(info?.bossLevel ?? 30, info?.weekKey ?? raidWeekKey())
  }

  private formationEnemyNote(state: StrategyState): string {
    const next = this.nextScenario(state)
    return next ? `상성은 다음 시나리오 ‘${escapeHtml(next.title)}’의 적장 기준입니다. 기병은 궁병에, 궁병은 보병에, 보병은 기병에 강합니다.` : '대기 무장의 편성 버튼으로 빈 자리를 채우십시오.'
  }

  private formationSlot(state: StrategyState, index: number, squad = 0): string {
    const lane = ['↙ 좌측', '↑ 중앙 · 전열', '↘ 우측'][index]
    const enemy = (squad > 0 ? this.raidEnemies() : this.formationEnemies(state))[index]
    const id = squadIds(state, squad)[index]
    const general = id ? state.generals.find(item => item.id === id) : undefined
    // 가운데는 전열: 적의 30%가 먼저 노리고 받는 피해 −20%, 수호형이면 도발 + 피해 −40%
    const tank = general ? skillDetail(general).type === '수호' : false
    const frontNote = index === 1 ? `<div class="formation-front ${tank ? 'is-tank' : ''}"><b>전열</b><span>${tank ? '수호형 · 적을 더 끌어당기고 받는 피해 −40%' : '적이 먼저 노림 · 받는 피해 −20% · 수호형을 세우면 더 단단'}</span></div>` : ''
    const enemyLine = (edge: number) => enemy ? `<div class="formation-enemy ${edge > 1 ? 'is-adv' : edge < 1 ? 'is-dis' : ''}"><span>상대 ${escapeHtml(enemy.name)} · ${enemy.role}</span><b>${edge > 1 ? '상성 유리' : edge < 1 ? '상성 불리' : '상성 보통'}</b></div>` : ''
    if (!general) return `<div class="formation-slot formation-slot--empty ${index === 1 ? 'formation-slot--front' : ''}"><span class="formation-slot-index">${lane}</span><strong>빈 자리</strong><small>${index === 1 ? '전열 자리: 수호형이나 단단한 무장을 세우십시오.' : '아래 대기 무장의 편성 버튼을 누르십시오.'}</small>${enemy ? `<div class="formation-enemy"><span>상대 ${escapeHtml(enemy.name)} · ${enemy.role}</span></div>` : ''}</div>`
    const loadout = state.equipmentLoadouts[general.id] ?? {}
    const equipment = (['weapon', 'armor', 'accessory'] as EquipmentType[]).map(type => {
      const itemId = loadout[type]
      const item = itemId ? this.equipmentById(state).get(itemId) : undefined
      return item
        ? `<div class="formation-equipment-chip is-equipped"><span><img class="gear-glyph" src="${equipmentImage(type)}" alt="" width="18" height="18" draggable="false"></span><strong>${escapeHtml(item.name)}</strong><button class="formation-unequip" data-action="equipment-unequip" data-equipment-type="${type}" data-general-id="${general.id}">해제</button></div>`
        : `<div class="formation-equipment-chip"><span><img class="gear-glyph" src="${equipmentImage(type)}" alt="" width="18" height="18" draggable="false"></span><strong>${EQUIPMENT_TYPE_META[type].label} 없음</strong><button class="formation-unequip formation-equip" data-action="equip-general" data-id="${general.id}">장착하기</button></div>`
    }).join('')
    return `<div class="formation-slot formation-slot--filled ${index === 1 ? 'formation-slot--front' : ''}" style="--accent:${gradeColor(general)}"><div class="formation-slot-main" data-action="formation-skill" data-id="${general.id}" title="눌러서 스킬 보기"><span class="formation-slot-index">${lane}</span>${this.portrait(general, 'formation-portrait')}<strong>${general.name}</strong>${formationTags(general)}<small>${general.role}</small><b>${formatNumber(combatPower(general) + equipmentPowerForUi(state, general.id))}</b><button class="text-button formation-release" ${squad > 0 ? `data-action="squad-toggle" data-squad="${squad}"` : 'data-action="formation"'} data-id="${general.id}">편성 해제</button></div>${enemyLine(enemy ? matchup(general.role, enemy.role) : 1)}${frontNote}<div class="formation-equipment"><span class="formation-equipment-label">장착 장비</span>${equipment}</div></div>`
  }

  private formationSearchBox(): string {
    return `<label class="codex-search formation-search"><span>찾기</span><input data-formation-search type="search" placeholder="이름 · 병종 · 진영 · 등급" value="${escapeHtml(this.formationQuery)}" aria-label="대기 무장 찾기"></label>`
  }

  private formationNoResult(bench: General[]): string {
    const none = !bench.some(general => matchesFormationQuery(general, this.formationQuery))
    return `<div class="formation-empty glass-card" data-formation-noresult${none ? '' : ' hidden'}>‘<span data-formation-query>${escapeHtml(this.formationQuery.trim())}</span>’에 맞는 대기 무장이 없습니다.</div>`
  }

  /** 입력할 때마다 다시 그리지 않고(입력칸 초점 유지) 카드만 숨긴다 */
  private applyFormationSearch(): void {
    const tokens = searchTokens(this.formationQuery)
    let shown = 0
    this.root.querySelectorAll<HTMLElement>('[data-bench-search]').forEach(card => {
      const match = tokensMatch(tokens, card.dataset.benchSearch ?? '')
      card.hidden = !match
      if (match) shown += 1
    })
    const none = this.root.querySelector<HTMLElement>('[data-formation-noresult]')
    if (none) { none.hidden = shown > 0; const q = none.querySelector('[data-formation-query]'); if (q) q.textContent = this.formationQuery.trim() }
  }

  private formationBenchCard(general: General, squad = 0, state?: StrategyState): string {
    // 다른 군에 있는 무장은 어느 군에서 옮겨 오는지 알려 준다
    const where = state ? squadOf(state, general.id) : -1
    const button = squad > 0
      ? `<button class="mini-action mini-action--deploy" data-action="squad-toggle" data-squad="${squad}" data-id="${general.id}">${where >= 0 ? `${SQUAD_LABELS[where]}에서 옮기기` : '편성'}</button>`
      : `<button class="mini-action mini-action--deploy" data-action="formation" data-id="${general.id}">${where > 0 ? `${SQUAD_LABELS[where]}에서 옮기기` : '편성'}</button>`
    return `<article class="formation-bench-card ${where >= 0 && where !== squad ? 'is-assigned' : ''}" style="--accent:${gradeColor(general)}" data-action="formation-skill" data-id="${general.id}" title="눌러서 스킬 보기" data-bench-search="${escapeHtml(formationSearchText(general))}"${matchesFormationQuery(general, this.formationQuery) ? '' : ' hidden'}>${this.portrait(general, 'formation-bench-portrait')}<div><strong>${general.name}</strong>${formationTags(general)}<small>${general.role}${where >= 0 && where !== squad ? ` · ${SQUAD_LABELS[where]}` : ''}</small></div><b>${formatNumber(combatPower(general) + (state ? equipmentPowerForUi(state, general.id) : 0))}</b>${button}</article>`
  }

  /** 추천 무장: 가졌으면 ✓, 없으면 같은 병과의 내 무장 중 가장 강한 무장을 대신 추천 */
  private recommendedDeck(state: StrategyState, names: string[]): string {
    const catalog = allGenerals()
    const used = new Set<string>()
    const rows = names.map(name => {
      const template = catalog.find(general => general.name === name)
      const mine = state.generals.find(general => general.name === name)
      if (mine) { used.add(mine.id); return `<li class="is-owned"><b>✓</b>${escapeHtml(name)}<small>${mine.role} · Lv.${mine.level}</small></li>` }
      const alt = state.generals.filter(general => !used.has(general.id) && general.role === template?.role && !names.includes(general.name)).sort((a, b) => combatPower(b) - combatPower(a))[0]
      if (alt) used.add(alt.id)
      return `<li><b>✕</b>${escapeHtml(name)}<small>미보유${alt ? ` → 대신 <em>${escapeHtml(alt.name)}</em> (${alt.role} · Lv.${alt.level})` : template ? ` · ${template.role}` : ''}</small></li>`
    }).join('')
    return `<ul class="scenario-recommend">${rows}</ul>`
  }

  private scenarioSection(state: StrategyState): string {
    // 연대기를 한 단계씩: 지금 단계(다음 미완료)가 크게 보이고, 깨면 다음 단계로 넘어간다. 전체 목록은 접어 둔다
    // 어려움: 보통을 깬 시나리오를 적 Lv+10 · 특수 규칙으로 다시(앞 단계 어려움을 깨야 다음이 열린다)
    const normalCleared = SCENARIOS.filter(scenario => state.scenarioCleared.includes(scenario.id)).length
    const hardOpen = normalCleared > 0
    const hard = hardOpen && this.scenarioDifficulty === 'hard'
    const difficulty: ScenarioDifficulty = hard ? 'hard' : 'normal'
    const done = (id: string) => hard ? hardCleared(state.scenarioCleared, id) : state.scenarioCleared.includes(id)
    const starsOf = (id: string) => hard ? hardScenarioStars(state.scenarioCleared, id) : scenarioStars(state.scenarioCleared, id)
    const next = hard ? (SCENARIOS.find(scenario => !hardCleared(state.scenarioCleared, scenario.id)) ?? SCENARIOS[SCENARIOS.length - 1]) : this.nextScenario(state)
    const reachable = Math.max(0, SCENARIOS.findIndex(scenario => scenario.id === next?.id))
    const cleared = SCENARIOS.filter(scenario => done(scenario.id)).length
    // 새로 깬 단계가 있으면 다음 단계로 자동 이동
    const seenKey = cleared + (hard ? 1000 : 0)
    if (seenKey !== this.scenarioClearedSeen) { if (this.scenarioClearedSeen >= 0 && seenKey > this.scenarioClearedSeen && seenKey - this.scenarioClearedSeen < 1000) { this.scenarioSelectedId = next?.id ?? this.scenarioSelectedId; this.scenarioPicked = false } this.scenarioClearedSeen = seenKey }
    let index = SCENARIOS.findIndex(scenario => scenario.id === this.scenarioSelectedId)
    if (index < 0 || index > reachable) index = reachable
    const selected = SCENARIOS[index] ?? SCENARIOS[0]
    const selectedCleared = Boolean(selected && done(selected.id))
    // 어려움인데 이 시나리오의 보통을 아직 못 깼으면 출전할 수 없다
    const blocked = Boolean(hard && selected && !hardUnlocked(state.scenarioCleared, selected))
    const reward = selected ? (hard ? hardClearReward(selected, []) : selected.reward) : null
    const stars = selected ? starsOf(selected.id) : 0
    const rule = hard && selected ? scenarioHardRule(selected) : null
    const chapterNo = (selected?.chapterIndex ?? 0) + 1
    const inChapter = SCENARIOS.filter(scenario => scenario.chapter === selected?.chapter)
    const chapterPos = inChapter.findIndex(scenario => scenario.id === selected?.id) + 1
    const prev = SCENARIOS[index - 1]
    const after = SCENARIOS[index + 1]
    const nextLocked = !after || index + 1 > reachable
    const chapters = [...new Set(SCENARIOS.map(scenario => scenario.chapter))]
    const list = chapters.map(chapter => {
      const items = SCENARIOS.filter(scenario => scenario.chapter === chapter)
      const head = items[0]
      return `<div class="scenario-mini-chapter"><div class="scenario-mini-head"><b>제${(head?.chapterIndex ?? 0) + 1}장</b><span>${escapeHtml(head?.era ?? '')}</span><small>${items.filter(scenario => done(scenario.id)).length}/${items.length}</small></div>${items.map(scenario => { const at = SCENARIOS.indexOf(scenario); const locked = at > reachable; const isDone = done(scenario.id); return `<button class="scenario-mini ${scenario.id === selected?.id ? 'is-selected' : ''} ${isDone ? 'is-cleared' : ''} ${locked ? 'is-locked' : ''}" data-action="scenario-select" data-scenario-id="${scenario.id}" ${locked ? 'disabled' : ''}><span>${scenario.year}</span><strong>${escapeHtml(scenario.title)}</strong><em>${locked ? '🔒' : isDone ? '★'.repeat(starsOf(scenario.id)) : '도전'}</em></button>` }).join('')}</div>`
    }).join('')
    const hardCount = hardClearedCount(state.scenarioCleared)
    const toggle = `<div class="setting-seg scenario-difficulty" role="group" aria-label="난이도"><button class="setting-seg__btn ${hard ? '' : 'is-active'}" data-action="scenario-difficulty" data-difficulty="normal" aria-pressed="${!hard}">보통 <small>${normalCleared}/${SCENARIOS.length}</small></button><button class="setting-seg__btn ${hard ? 'is-active' : ''}" data-action="scenario-difficulty" data-difficulty="hard" aria-pressed="${hard}" ${hardOpen ? '' : 'disabled'} title="${hardOpen ? '적 Lv+10 · 별 +1 · 특수 규칙' : '보통 시나리오를 하나 깨면 열립니다'}">${hardOpen ? '' : '🔒 '}어려움 <small>${hardCount}/${SCENARIOS.length}</small></button></div>`
    const ruleBox = rule ? `<div class="scenario-rule"><span class="eyebrow">어려움 특수 규칙</span><strong>${escapeHtml(HARD_RULE_INFO[rule].label)}</strong><small>${escapeHtml(HARD_RULE_INFO[rule].desc)} · 적 Lv+${HARD_LEVEL_BONUS} · 적 별 +1</small></div>` : ''
    const rewardText = hard ? `옥패 +${formatNumber(reward?.honor ?? 0)} · 은전 +${formatNumber(reward?.silver ?? 0)} · 병서 +${formatNumber(reward?.manuals ?? 0)}` : `금화 +${formatNumber(reward?.gold ?? 0)} · 옥패 +${formatNumber(reward?.honor ?? 0)} · 은전 +${formatNumber(reward?.silver ?? 0)} · 병서 +${formatNumber(reward?.manuals ?? 0)}`
    const startLabel = blocked ? '🔒 보통을 먼저 깨십시오' : selectedCleared ? '다시 전투(보상 없음)' : hard ? '어려움 출전' : '시나리오 출전'
    return `<section class="page-section page-section--scenario ${hard ? 'is-hard' : ''}"><div class="section-heading section-heading--compact"><div><span class="eyebrow">전투 · 제${chapterNo}장 ${escapeHtml(selected?.era ?? '')}${hard ? ' · 어려움' : ''}</span><h1>시나리오</h1></div><div class="heading-side"><div class="section-counter"><span>${hard ? '어려움 진행' : '연대기 진행'}</span><strong>${cleared}<small> / ${SCENARIOS.length}</small></strong></div><button class="action-button action-button--outline menu-guide-button" data-action="battle-guide">? 전투 규칙</button></div></div>
      ${toggle}
      <div class="scenario-progress" aria-hidden="true"><i style="width:${(cleared / Math.max(1, SCENARIOS.length) * 100).toFixed(1)}%"></i></div>
      <div class="scenario-stepper"><button class="action-button action-button--outline" data-action="scenario-select" data-scenario-id="${prev?.id ?? ''}" ${prev ? '' : 'disabled'}>← 이전</button><div><strong>${index + 1} / ${SCENARIOS.length}</strong><small>제${chapterNo}장 ${chapterPos}/${inChapter.length}단계</small></div><button class="action-button action-button--outline" data-action="scenario-select" data-scenario-id="${after?.id ?? ''}" ${nextLocked ? 'disabled' : ''} title="${nextLocked && after ? '이번 단계를 깨면 열립니다' : ''}">${nextLocked && after ? '🔒 다음' : '다음 →'}</button></div>
      <article class="scenario-detail scenario-main glass-card ${selectedCleared ? 'is-cleared' : 'is-current'}"><span class="pill ${hard ? 'pill--ember' : 'pill--jade'}">${selected?.year ?? ''} · ${escapeHtml(selected?.era ?? '')}${hard ? ' · 어려움' : ''}</span>${selectedCleared ? `<span class="scenario-main__done">완료 ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>` : '<span class="scenario-main__done is-new">이번 단계</span>'}<h2>${escapeHtml(selected?.title ?? '')}</h2><p class="scenario-story">${escapeHtml(selected?.story ?? '')}</p>${ruleBox}<div class="scenario-deck"><span class="eyebrow">추천 편성</span>${selected ? this.recommendedDeck(state, selected.deck) : '—'}</div><div class="scenario-deck scenario-enemy"><span class="eyebrow">적군 · 평균 Lv.${selected ? scenarioEnemyLevelFor(selected, difficulty) : 1}</span><strong>${selected ? scenarioEnemyIds(selected, state.faction).map(id => escapeHtml(templateGeneral(id)?.name ?? id)).join(' · ') : '—'}</strong><small class="scenario-stars">${selected ? `최고 기록 ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : ''}</small></div><div class="scenario-reward"><span class="eyebrow">${hard ? '어려움 최초 클리어 보상' : '최초 클리어 보상'}${selectedCleared ? ' · 획득 완료' : ''}</span><p>${rewardText}</p><small>식량 +${formatNumber(reward?.grain ?? 0)} · 목재 +${formatNumber(reward?.wood ?? 0)} · 철 +${formatNumber(reward?.iron ?? 0)} · 영향력 +${formatNumber(reward?.influence ?? 0)}</small></div>
        <div class="scenario-main__actions">${selectedCleared && next && next.id !== selected?.id ? `<button class="action-button action-button--primary" data-action="scenario-select" data-scenario-id="${next.id}">다음 단계로 (${next.year} ${escapeHtml(next.title)}) →</button>` : ''}<button class="action-button ${selectedCleared && next && next.id !== selected?.id ? 'action-button--outline' : 'action-button--primary'} scenario-start-button" data-action="scenario-start" data-scenario-id="${selected?.id ?? ''}" data-difficulty="${difficulty}" ${blocked ? 'disabled' : ''}>${startLabel} <span>→</span></button></div></article>
      <details class="scenario-all glass-card" ${this.scenarioListOpen ? 'open' : ''}><summary data-action="scenario-list-toggle">전체 시나리오 목록 <small>${cleared}/${SCENARIOS.length} 클리어 · 다시 전투할 단계를 고르십시오</small></summary><div class="scenario-mini-list">${list}</div></details></section>`
  }


  private battleSection(state: StrategyState): string {
    const battle = this.latestBattle
    const active = Boolean(battle?.active)
    const lanes = ['↙ 좌측', '↑ 전열', '↘ 우측']
    // 지금 전장에 나선 무장(레이드 2 · 3군처럼 1군 편성과 다를 수 있다) — 전투 전이면 1군 편성
    const fielded = battle?.units?.length ? battle.units.map(unit => unit.id) : state.formation
    const units = fielded.map((id, index) => {
      const general = state.generals.find(item => item.id === id)
      if (!general) return ''
      const live = battle?.units[index]
      const pct = live && live.maxTroops ? live.troops / live.maxTroops * 100 : 100
      const detail = skillDetail(general)
      return `<div class="bt-unit ${live?.ready ? 'is-ready' : ''} ${live && !live.alive ? 'is-down' : ''}" data-bt-unit="${index}" style="--accent:${gradeColor(general)}"><button class="bt-unit-main" data-action="move" data-index="${index}" aria-label="${general.name} 기동 · 길게 누르면 스킬">${this.portrait(general, 'bt-portrait')}<span class="bt-unit-lane">${lanes[index] ?? ''}</span><strong class="bt-name-row"><span class="bt-name">${general.name}</span><span class="bt-fx" data-bt-unit-fx></span></strong><small>${general.role} · Lv.${general.level} · ${detail.type}</small><span class="bt-unit-troops"><i data-bt-unit-troops style="width:${pct}%"></i></span><span class="bt-unit-edge" data-bt-unit-edge hidden></span></button><button class="bt-unit-skill" data-action="battle-skill" data-index="${index}" ${live?.ready ? '' : 'disabled'}><b>${escapeHtml(live?.skillName ?? general.skillName)}</b><small data-bt-unit-cd>${general.skillUnlocked ? (active ? '대기' : '스킬') : '스킬 잠김'}</small></button></div>`
    }).join('')
    const modeLabel = battle?.mode === 'scenario' ? (battle.hardRule ? `시나리오 어려움 · ${HARD_RULE_INFO[battle.hardRule].label}` : '시나리오 전투') : battle?.mode === 'siege' ? '공성전' : battle?.mode === 'duel' ? '유저 대련' : battle?.mode === 'raid' ? `주간 레이드${this.raidSquadLabel ? ` · ${this.raidSquadLabel}` : ''}` : '일반 전투'
    const tactic = (id: 'guard' | 'feint' | 'charge', icon: string, label: string, note: string) => `<button class="bt-tactic bt-tactic--${id}" title="${label} · ${note}" data-action="battle-tactic" data-tactic="${id}" ${id === 'guard' ? 'data-bt-guard' : ''} disabled><span>${icon}</span><strong>${label}</strong><small>${note}</small><em>${battle?.tacticCosts[id] ?? { guard: 35, feint: 50, charge: 65 }[id]}</em></button>`
    return `<section class="page-section page-section--battle">
<div class="bt-top">
<div class="bt-hud glass-card"><div class="bt-hud-row"><span class="bt-phase" data-bt-phase>${battle?.phaseName ?? '서전'}</span><b data-bt-morale-text>적 사기 ${battle?.moraleValue ?? 600} / ${battle?.moraleMax ?? 600}</b></div><div class="bt-bar bt-bar--morale"><i data-bt-morale style="width:${battle?.morale ?? 100}%"></i></div><div class="bt-hud-row bt-hud-row--threat"><span>아군 사기 <b data-bt-threat-text>${Math.round((100 - (battle?.threat ?? 0)) * 6)} / 600</b></span><div class="bt-bar bt-bar--threat bt-bar--ally-morale"><i data-bt-threat style="width:${100 - (battle?.threat ?? 0)}%"></i></div><b class="bt-collapse" data-bt-collapse>공격·방어 ${Math.round(70 + 0.3 * (100 - (battle?.threat ?? 0)))}%</b></div><div class="bt-hud-meta"><span class="bt-mode">${modeLabel}</span>${battle?.mode === 'raid' ? `<span class="bt-raid-damage">누적 피해 <b data-bt-raid>${formatNumber(battle?.raidDamage ?? 0)}</b></span>` : ''}<span data-bt-status>${battle?.status ?? '대기 중'}</span><span class="bt-time" data-bt-time>제한 ${battle?.mode === 'raid' ? 90 : 120}초</span><span data-bt-combo>연계 ${battle?.combo ?? 0}</span><span data-bt-pressure>적 압박 ×1.00</span><span data-bt-bond>${escapeHtml(battle?.bond ? `인연 · ${battle.bond}` : '인연 없음')}</span></div></div>
<div class="bt-enemies glass-card"><span class="bt-enemies-label">상대 무장</span><div class="bt-enemy-row" data-bt-enemies>${this.enemyHudMarkup(battle?.opponentDeck)}</div></div>
</div>
<div class="bt-stage"><div class="bt-paused" data-bt-paused hidden><strong>일시 정지</strong><small>전투 시간과 적의 행동이 멈췄습니다.</small><button class="action-button action-button--primary" data-action="battle-pause">▶ 계속하기</button></div><div class="bt-callout" data-bt-callout><span class="eyebrow">적 전술 예고</span><strong data-bt-pattern>${active ? '다음 예고 대기' : '전투 시작 전'}</strong><div class="bt-lanes"><span data-bt-lane="0">↙ 좌</span><span data-bt-lane="1">↑ 중</span><span data-bt-lane="2">↘ 우</span></div><div class="bt-bar bt-bar--window"><i data-bt-window style="width:0%"></i></div></div><div class="bt-enemy-warn" data-bt-enemy-warn hidden></div><div class="bt-feed"><ul class="bt-log" data-bt-log><li>전투 기록이 여기에 표시됩니다.</li></ul><button class="bt-log-toggle" data-action="battle-log">${this.battleLogOpen ? '접기' : '더 보기'}</button></div></div>
<div class="bt-controls glass-card"><div class="bt-units">${units}</div><div class="bt-tactic-row"><div class="bt-gauge"><span data-bt-gauge-text>전술 게이지 ${battle?.tacticGauge ?? 0}</span><div class="bt-bar bt-bar--gauge"><i data-bt-gauge style="width:${battle?.tacticGauge ?? 0}%"></i></div></div>${tactic('guard', '▣', '철벽 태세', '위협·적장 스킬 억제')}${tactic('feint', '⌁', '유인책', '연계 +2')}${tactic('charge', '⚔', '전군 돌격', '연계를 사기 피해로')}</div><button class="bt-view-fab" data-action="battle-view" data-bt-view title="전투 시점 바꾸기 (V 키) · ${BATTLE_VIEW_HINT[this.battleView]}" aria-label="전투 시점 바꾸기" aria-haspopup="menu"><i aria-hidden="true">◎</i><span class="tb-view-k">시점</span><span class="tb-view-v" data-bt-view-label>${BATTLE_VIEW_LABEL[this.battleView]}</span></button>${active ? '' : '<button class="action-button action-button--primary battle-start" data-action="battle-start">전투 시작 <span>→</span></button>'}</div>
</section>`
  }

  /** 자동 전투 정액권: 최대 배속(기본 2배, 정액권 3배)과 자동 대응 85% 표시 */
  private maxBattleSpeed = 2
  private autoPassOn = false
  setAutoPass(on: boolean, maxSpeed: number): void { this.autoPassOn = on; this.maxBattleSpeed = maxSpeed }
  /** 배속 버튼 글: 지금 1배면 다음 배속을 보여 준다 */
  private speedLabel(speed: number): string { return speed >= 2 ? `×${speed} 배속` : `×2 배속` }
  /** 전투 중 상단 바: 멈춤 · ×2 배속 · 자동(별 3개 시나리오) · 전투 중지 */
  private battleTopControls(): string {
    const battle = this.latestBattle
    return `<div class="topbar-battle"><button class="tb-btn" data-action="battle-pause" data-bt-pause aria-label="일시 정지">${battle?.paused ? '▶ 계속' : '❚❚ 멈춤'}</button><button class="tb-btn ${(battle?.speed ?? 1) >= 2 ? 'is-on' : ''}" data-action="battle-speed" data-bt-speed aria-label="배속">${this.speedLabel(battle?.speed ?? 1)}</button>${this.battleAutoAvailable ? `<button class="tb-btn ${battle?.autoPlay ? 'is-on' : ''}" data-action="battle-auto" data-bt-auto title="자동 전투: 예고 대응 정확도 ${this.autoPassOn ? '85%(자동 전투 정액권)' : '70%'} · 스킬은 한 박자 늦게. 직접 하는 것보다 약합니다.">자동</button>` : ''}${battle?.duelMode ? `<button class="tb-btn ${battle.autoSkill ? 'is-on' : ''}" data-action="battle-auto-skill" data-bt-auto-skill aria-pressed="${battle.autoSkill}" title="스킬이 준비되면 알아서 씁니다. 예고 대응은 직접 하세요.">스킬 자동</button>` : ''}<button class="tb-btn" data-action="battle-guide" aria-label="전투 규칙">? 규칙</button><button class="tb-btn tb-btn--stop" data-action="battle-stop" data-bt-stop>■ 전투 중지</button></div>`
  }

  /** 상단 HUD의 적 무장 카드(초상·레벨·병력 막대) — Manus 전투 HUD 개선안 */
  private enemyHudMarkup(opponents: BattleOpponent[] = []): string {
    return opponents.length
      ? opponents.map((opponent, index) => `<div class="bt-enemy" data-bt-enemy="${index}"><div class="general-portrait bt-enemy-portrait has-portrait" style="--portrait:url('${assetUrl(`/assets/generals-realistic-webp/${opponent.id}.webp`)}')"><span>${escapeHtml(opponent.name.slice(0, 1))}</span></div><div><strong class="bt-name-row"><span class="bt-name">${escapeHtml(opponent.name)}</span><span class="bt-fx" data-bt-enemy-fx></span></strong><small>${opponent.role} · Lv.${opponent.level}</small><span class="bt-enemy-troops"><i style="width:100%"></i></span></div></div>`).join('')
      : '<span class="bt-enemies-empty">전투 시작 시 적 무장이 배치됩니다.</span>'
  }


  /** 이 기기 설정: 그래픽 품질(새로고침 후) · 전투 효과(바로 적용) */
  /** 진영 변경(30일에 한 번) */
  private factionChangeRow(): string {
    const state = this.renderedState
    if (!state?.factionConfirmed) return ''
    const last = state.missions?.factionChangedAt ?? 0
    const wait = last ? Math.max(0, last + FACTION_CHANGE_COOLDOWN_MS - Date.now()) : 0
    // 삼국 사이는 시즌마다 서버가 정한다: 재야 ↔ 삼국(자동 배정)만 바꿀 수 있다
    const wanderer = state.faction === '재야'
    const options: Array<[string, string, boolean]> = [['realm', wanderer ? '삼국(자동 배정)' : `삼국 · ${state.faction}`, !wanderer], ['재야', '재야(중립)', wanderer]]
    return `<div class="setting-row"><div><strong>진영 변경</strong><small>지금 진영: ${state.faction}${wanderer ? '(중립 진영)' : ''} · 삼국 사이의 진영은 시즌마다 서버가 고르게 나눕니다. 재야로 옮기거나 삼국으로 돌아오는 것은 30일에 한 번 할 수 있습니다(삼국으로 오면 가장 약한 진영에 배정).${wait ? ` ${Math.ceil(wait / 86400000)}일 뒤 다시 바꿀 수 있습니다.` : ''}</small></div><div class="setting-seg">${options.map(([id, label, active]) => `<button class="setting-seg__btn ${active ? 'is-active' : ''}" data-action="faction-change" data-faction="${id}" ${active || wait ? 'disabled' : ''}>${label}</button>`).join('')}</div></div>`
  }

  private deviceSettingsCard(): string {
    const quality = qualitySetting(), effects = effectsSetting()
    const seg = (action: string, current: string, items: Array<[string, string]>) => `<div class="setting-seg">${items.map(([value, label]) => `<button class="setting-seg__btn ${current === value ? 'is-active' : ''}" data-action="${action}" data-value="${value}">${label}</button>`).join('')}</div>`
    return `<div class="glass-card device-settings"><div class="card-header"><div><span class="eyebrow">이 기기 설정</span><h3>화면 · 소리 · 전투 효과</h3></div></div><div class="setting-row"><div><strong>언어 / Language</strong><small>게임 전체 글자를 한국어 또는 영어로 보여 줍니다. 바꾸면 화면을 다시 불러옵니다.</small></div><div class="setting-seg" data-no-tr><button class="setting-seg__btn ${isEnglish() ? '' : 'is-active'}" data-action="set-lang" data-value="ko">한국어</button><button class="setting-seg__btn ${isEnglish() ? 'is-active' : ''}" data-action="set-lang" data-value="en">English</button></div></div><div class="setting-row"><div><strong>따라하기 안내</strong><small>게임 소개, 메뉴 짚어 주기, 첫 전투 따라하기를 처음부터 다시 봅니다.</small></div><button class="mini-action" data-action="coach-reset">안내 다시 보기</button></div><div class="setting-row"><div><strong>배경음악</strong><small>본영 · 전투 · 대련 · 레이드마다 다른 곡이 흐릅니다. 위쪽 🔊 버튼으로 모든 소리를 한 번에 끌 수 있습니다.</small></div>${seg('setting-music', muteSetting() ? 'off' : musicSetting(), [['off', '끔'], ['low', '작게'], ['mid', '보통'], ['high', '크게']])}</div><div class="setting-row"><div><strong>효과음</strong><small>버튼 · 강화 · 장비 · 전투(공격 · 스킬 · 승패) 소리입니다.</small></div>${seg('setting-sfx', muteSetting() ? 'off' : sfxSetting(), [['off', '끔'], ['low', '작게'], ['mid', '보통'], ['high', '크게']])}</div><div class="setting-row"><div><strong>그래픽 품질</strong><small>낮음은 빛 번짐·그림자를 끄고 병사 수를 줄입니다. 새로고침하면 적용됩니다.</small></div>${seg('setting-quality', quality, [['auto', '자동'], ['high', '높음'], ['low', '낮음']])}</div><div class="setting-row"><div><strong>전투 효과</strong><small>줄임은 불꽃·화살 수와 화면 흔들림을 줄입니다. 바로 적용됩니다. 자동은 화면이 버벅이면 스스로 줄입니다.</small></div>${seg('setting-effects', effects, [['auto', '자동'], ['full', '전체'], ['reduced', '줄임']])}</div>${this.factionChangeRow()}${this.account && !this.account.openId.startsWith('guest_') ? '' : `<div class="setting-row setting-row--danger"><div><strong>게스트 기록 초기화</strong><small>${this.account ? '이 게스트 아이디와 진행(무장 · 재화 · 튜토리얼 · 출석 · 안내 기록)을 서버에서 모두 지웁니다. 다시 게스트로 들어오면 새 아이디를 정합니다(같은 아이디를 다시 써도 됩니다).' : '이 기기에 저장된 게스트 진행(무장·재화·튜토리얼·안내 기록)을 모두 지우고 접속 화면부터 다시 시작합니다. 이 기기로 만든 게스트 아이디가 있으면 그 아이디와 서버 기록도 함께 지웁니다. 회원 계정 기록은 지워지지 않습니다.'}</small></div><button class="mini-action mini-action--danger" data-action="guest-reset">초기화</button></div>`}</div>`
  }

  private accountSection(): string {
    const html = this.accountMain()
    // 로그인 전에는 바로 쓸 수 있는 기기 설정을 위에, 로그인 안내를 아래에
    if (this.auth.status !== 'authenticated') {
      const head = html.indexOf('<div class="glass-card account-gate">')
      if (head > 0) return `${html.slice(0, head)}${this.deviceSettingsCard()}${html.slice(head)}`
    }
    const at = html.lastIndexOf('</section>')
    return at < 0 ? html : `${html.slice(0, at)}${this.deviceSettingsCard()}${html.slice(at)}`
  }

  private accountMain(): string {
    if (this.auth.status !== 'authenticated') {
      return `<section class="page-section page-section--account"><div class="section-heading section-heading--compact"><div><span class="eyebrow">소통</span><h1>계정 관리</h1><p class="heading-copy">계정 정보를 확인하고 전적 동기화에 사용할 표시 이름을 관리합니다.</p></div></div><div class="glass-card account-gate"><div class="account-gate-mark">◎</div><h2>로그인하면 더 좋아집니다</h2><ul class="account-benefits"><li>다른 기기에서도 진행 상황 이어 하기</li><li>천하 랭킹에 이름 올리기 · 유저 대련 참가</li><li>매일 금화와 진영전 보상 받기</li></ul><button class="action-button action-button--primary" data-action="login">Manus 로그인 <span>→</span></button></div></section>`
    }
    if (!this.account) {
      return `<section class="page-section page-section--account"><div class="section-heading section-heading--compact"><div><span class="eyebrow">소통</span><h1>계정 관리</h1><p class="heading-copy">로그인 계정 정보를 불러오는 중입니다.</p></div><button class="ghost-button" data-action="account-refresh">새로고침 ↻</button></div><div class="glass-card account-loading">계정 정보를 안전하게 불러오고 있습니다…</div></section>`
    }
    const account = this.account
    const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
    const date = (value: string | Date) => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    return `<section class="page-section page-section--account"><div class="section-heading section-heading--compact"><div><span class="eyebrow">소통</span><h1>계정 관리</h1><p class="heading-copy">계정 정보는 로그인한 사용자 본인만 조회하고 수정할 수 있습니다.</p></div><div class="account-badge"><span class="status-dot"></span> 보호된 계정</div></div><div class="account-layout"><div class="glass-card account-profile"><div class="account-profile-head"><div class="account-avatar">${escape(account.name.slice(0, 1) || '장')} </div><div><span class="eyebrow">로그인 정보</span><h2>${escape(account.name || '장군')}</h2><p>${escape(account.loginMethod)} · ${escape(account.role)}</p></div></div><div class="account-facts"><div><span>계정 번호</span><strong>#${account.id}</strong></div><div><span>가입일</span><strong>${date(account.createdAt)}</strong></div><div><span>최근 로그인</span><strong>${date(account.lastSignedIn)}</strong></div><div><span>마지막 변경</span><strong>${date(account.updatedAt)}</strong></div></div></div><div class="glass-card account-editor"><div class="card-header"><div><span class="eyebrow">프로필 편집</span><h3>계정 정보 편집</h3></div><span class="sync-label">본인만 수정</span></div><form data-account-form><label class="account-field"><span>표시 이름</span><input name="name" value="${escape(account.name)}" maxlength="32" required autocomplete="nickname"><small>천하 랭킹과 전적에 표시되는 이름입니다. 1~32자로 입력할 수 있습니다.</small></label><label class="account-field"><span>이메일</span><input value="${escape(account.email || 'OAuth 제공자에서 비공개')}" readonly><small>인증 제공자가 관리하는 정보는 게임에서 변경하지 않습니다.</small></label><div class="account-editor-actions"><span data-account-feedback>변경 사항을 저장하면 다음 로그인부터도 유지됩니다.</span><button class="action-button action-button--primary" type="submit">변경 저장 <span>→</span></button></div></form></div></div></section>`
  }

  private adminSection(state: StrategyState): string {
    const catalog = allGenerals()
    const tabs = [['overview', '운영 개요'], ['accounts', '로그인 계정'], ['game-data', '게임 데이터'], ['board', '게시판 관리'], ['guilds', '연맹 관리'], ['territory', '천하 영토'], ['bots', '이상 행동'], ['season', '시즌 운영'], ['decks', '덱 승률'], ['audit', '변경 기록']] as const
    const activity: Array<[string, string, string, string]> = [
      ['08:04', '장수 도감', '삼국지 장수 50명 콘텐츠 팩 등록', 'jade'],
      ['07:24', '게임 밸런스', '모집 풀 70명 및 등급 확률 검증 완료', 'gold'],
      ['07:07', '전투 연출', '화살 궤적·검기·충격파 VFX 배포', 'jade'],
      ['06:52', '시즌 운영', '제1장 황혼의 관문 활성화', 'muted'],
    ]
    const tabMarkup = tabs.map(([id, label]) => `<button class="admin-tab ${this.adminTab === id ? 'is-active' : ''}" data-action="admin-tab" data-admin-tab="${id}">${label}</button>`).join('')
    let body = ''
    if (this.adminTab === 'overview') {
      body = `<div class="admin-kpis"><div class="glass-card admin-kpi"><span>도감 콘텐츠</span><strong>${catalog.length}</strong><small>전체 등록 장수</small><b class="kpi-up">+50 이번 업데이트</b></div><div class="glass-card admin-kpi"><span>활성 영토</span><strong>${state.cities.filter(city => city.owner === state.faction).length}<em> / ${state.cities.length}</em></strong><small>시즌 01 점령 상태</small><b class="kpi-neutral">정상 운영</b></div><div class="glass-card admin-kpi"><span>출전 진형</span><strong>${deployedIds(state.formation).length}<em> / 3</em></strong><small>현재 배치 장수</small><b class="kpi-up">전투 준비</b></div><div class="glass-card admin-kpi"><span>최고 전투 점수</span><strong>${formatNumber(state.battleScore)}</strong><small>${state.wins}승 · 개인 기록</small><b class="kpi-gold">로컬 기록</b></div></div><div class="admin-grid"><div class="glass-card admin-panel"><div class="card-header"><div><span class="eyebrow">서비스 상태</span><h3>서비스 상태</h3></div><span class="sync-label">실시간</span></div><div class="health-row"><span><i class="health-dot"></i> 게임 클라이언트</span><b>정상</b><small>Three.js · Vite</small></div><div class="health-row"><span><i class="health-dot"></i> 전투 시뮬레이션</span><b>정상</b><small>Rapier · 실시간</small></div><div class="health-row"><span><i class="health-dot"></i> 온라인 랭킹</span><b class="health-warn">대기</b><small>로그인 연결 시 활성</small></div><button class="action-button action-button--outline admin-action" data-action="admin-refresh">상태 새로고침 ↻</button></div><div class="glass-card admin-panel"><div class="card-header"><div><span class="eyebrow">최근 작전</span><h3>최근 운영 기록</h3></div><span class="rate-note">최근 24시간</span></div><div class="admin-activity">${activity.map(([time, category, message, tone]) => `<div class="activity-row"><time>${time}</time><span class="activity-mark activity-mark--${tone}"></span><div><b>${category}</b><p>${message}</p></div></div>`).join('')}</div></div></div>`
    } else if (this.adminTab === 'accounts') {
      const levelOf = (account: AccountView) => account.maxLevel ?? 0
      const sortedAccounts = [...this.adminAccounts].sort((a, b) => this.adminSort === 'level-desc' ? levelOf(b) - levelOf(a) || a.id - b.id : this.adminSort === 'level-asc' ? levelOf(a) - levelOf(b) || a.id - b.id : this.adminSort === 'recent' ? new Date(b.lastSignedIn).getTime() - new Date(a.lastSignedIn).getTime() : a.id - b.id)
      const accountRows = sortedAccounts.map(account => `<div class="admin-account-row"><div class="admin-account-identity"><span class="admin-account-avatar">${escapeHtml((account.name || '장').slice(0, 1))}</span><span><b>${escapeHtml(account.name || '이름 없음')}</b><small>${escapeHtml(account.email || account.openId)}</small></span></div><span>#${account.id} · Lv.${account.maxLevel ?? 0}</span><span>${escapeHtml(account.loginMethod)}</span><span class="admin-account-last">${new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(new Date(account.lastSignedIn))}</span><span class="admin-role admin-role--${account.role}">${account.role === 'admin' ? '관리자' : '일반 사용자'}</span><button class="mini-action" data-action="admin-role" data-account-id="${account.id}" data-account-role="${account.role === 'admin' ? 'user' : 'admin'}">${account.role === 'admin' ? '일반으로' : '관리자로'}</button><button class="mini-action" data-action="admin-rename" data-account-id="${account.id}" data-account-name="${escapeHtml(account.name || '')}">아이디 변경</button><button class="mini-action mini-action--danger" data-action="admin-delete" data-account-id="${account.id}" data-account-name="${escapeHtml(account.name || '')}" ${account.role === 'admin' ? 'disabled title="관리자 계정은 먼저 일반으로 바꾼 뒤 지울 수 있습니다"' : ''}>삭제</button></div>`).join('')
      body = `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">가입 유저 목록</span><h3>로그인 계정 관리</h3><p>Manus OAuth로 로그인한 사용자와 관리자 권한을 관리합니다.</p></div><button class="ghost-button" data-action="admin-accounts-refresh">계정 새로고침 ↻</button></div><div class="admin-account-toolbar"><label><span>계정 검색</span><input data-admin-account-search value="${escapeHtml(this.adminAccountSearch)}" placeholder="이름·이메일·Open ID 검색"></label><button class="action-button action-button--outline" data-action="admin-account-search">검색</button>${this.adminSortSelect()}<span class="admin-directory-count">${this.adminAccounts.length}명 표시</span></div>${this.adminAccountsError ? `<div class="admin-account-gate"><div class="account-gate-mark">◎</div><h3>관리자 권한이 필요합니다</h3><p>${escapeHtml(this.adminAccountsError)}</p><small>현재 계정의 role이 admin인지 확인한 뒤 다시 시도하십시오.</small></div>` : `<div class="admin-account-table"><div class="admin-table-head"><span>계정</span><span>번호 · 레벨</span><span>로그인 방식</span><span>최근 로그인</span><span>권한</span><span>작업</span></div>${accountRows || '<div class="admin-empty-row">표시할 로그인 계정이 없습니다.</div>'}</div><div class="admin-table-foot">계정 목록은 서버의 관리자 전용 라우터에서 조회됩니다. 권한 변경은 데이터베이스에 저장됩니다.</div>`}</div>`
    } else if (this.adminTab === 'board') {
      const boardRows = this.adminBoard.posts.map(post => `<article class="admin-board-row"><div><span class="pill pill--jade">${escapeHtml(post.board)}</span><strong>${ugc(post.title)}</strong><small>${ugc(post.authorName)} · ${escapeHtml(post.authorFaction)}</small></div><button class="mini-action" data-action="admin-board-delete" data-post-id="${post.id}">관리자 삭제</button></article>`).join('')
      body = `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">게시판 관리</span><h3>게시판 운영 관리</h3><p>관리자는 모든 게시글을 삭제할 수 있고, 일반 사용자의 새 글 작성을 제한할 수 있습니다.</p></div><button class="ghost-button" data-action="admin-board-refresh">게시판 새로고침 ↻</button></div><div class="admin-board-control"><div><strong>일반 사용자 글 작성</strong><small>${this.adminBoard.postingEnabled ? '현재 허용 중입니다.' : '현재 제한 중입니다.'}</small></div><button class="action-button ${this.adminBoard.postingEnabled ? 'action-button--outline' : 'action-button--primary'}" data-action="admin-board-posting" data-enabled="${this.adminBoard.postingEnabled ? 'false' : 'true'}">${this.adminBoard.postingEnabled ? '작성 제한하기' : '작성 허용하기'}</button></div><div class="admin-board-list">${boardRows || '<div class="admin-empty-row">현재 게시글이 없습니다.</div>'}</div></div>`
    } else if (this.adminTab === 'guilds') {
      body = this.adminGuildPanel()
    } else if (this.adminTab === 'territory') {
      body = this.adminTerritoryPanel(state)
    } else if (this.adminTab === 'bots') {
      body = this.adminBotPanel()
    } else if (this.adminTab === 'game-data') {
      const search = this.adminGameSearch.toLocaleLowerCase('ko-KR')
      const gameLevel = (account: GameAccountView) => account.game?.maxLevel ?? 0
      const shown = this.adminGameAccounts.filter(account => !search || `${account.name} ${account.email} ${account.openId} #${account.id}`.toLocaleLowerCase('ko-KR').includes(search))
        .sort((a, b) => this.adminSort === 'level-desc' ? gameLevel(b) - gameLevel(a) || a.id - b.id : this.adminSort === 'level-asc' ? gameLevel(a) - gameLevel(b) || a.id - b.id : this.adminSort === 'recent' ? new Date(b.lastSignedIn).getTime() - new Date(a.lastSignedIn).getTime() : a.id - b.id)
      const stateRows = shown.map(account => {
        const game = account.game
        const chips = [`진영 ${game.faction ?? '—'}${game.factionChosen === false ? '(미선택)' : ''}`, `무장 ${formatNumber(game.generalCount ?? 0)}명`, `최고 Lv.${game.maxLevel ?? 0}`, `시나리오 ${game.scenarioCleared ?? 0}/${SCENARIOS.length}`, `어려움 ${game.hardCleared ?? 0}/${SCENARIOS.length}`]
        const groups = ADMIN_GAME_FIELDS.map(([title, fields]) => `<fieldset class="game-data-group"><legend>${title}</legend>${fields.map(([field, label]) => { const value = Number(game[field as keyof typeof game] ?? 0); return `<label><span>${label}</span><input type="number" min="0" step="1" inputmode="numeric" data-game-field="${field}" data-original="${value}" value="${value}"></label>` }).join('')}</fieldset>`).join('')
        const faction = `<fieldset class="game-data-group"><legend>진영</legend><label><span>소속</span><select data-game-field="faction" data-original="${game.faction ?? '촉한'}">${(['촉한', '위나라', '오나라', '재야'] as const).map(option => `<option value="${option}" ${game.faction === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label></fieldset>`
        return `<article class="game-data-row" data-game-user="${account.id}"><header class="game-data-head"><div class="admin-account-identity"><span class="admin-account-avatar">${escapeHtml((account.name || '장').slice(0, 1))}</span><span><b>${escapeHtml(account.name || '이름 없음')} <small>#${account.id}</small></b><small>${escapeHtml(account.email || account.openId)}</small></span></div>${account.operator ? '<span class="admin-role admin-role--admin" title="랭킹 · 영토전 · 레이드 순위 · 대련 상대에 반영되지 않습니다">운영자 · 순위 제외</span>' : ''}<div class="game-data-chips">${chips.map(chip => `<span>${escapeHtml(chip)}</span>`).join('')}</div></header><div class="game-data-fields">${groups}${faction}</div><footer class="game-data-foot"><small data-game-changed>바꾼 칸만 저장됩니다.</small><button class="ghost-button" data-action="guild-admin-generals" data-user-id="${account.id}" data-name="${escapeHtml(account.name || '')}">무장 편집</button><button class="ghost-button" data-action="admin-game-reset">되돌리기</button><button class="action-button action-button--primary game-data-save" data-action="admin-game-save" data-account-id="${account.id}">저장</button></footer></article>`
      }).join('')
      body = `<div class="glass-card admin-panel admin-content-panel"><div class="admin-panel-top"><div><span class="eyebrow">계정 진행 상황</span><h3>게임 계정 데이터 편집</h3><p>계정별 재화 · 신화 장비 재료 · 전적 · 내정 자원 · 진영을 고칩니다. 금화 · 신화 조각 · 낙양 강화석(서버 원장)도 적은 값 그대로 저장됩니다.</p></div><button class="ghost-button" data-action="admin-game-refresh">데이터 새로고침 ↻</button></div>${this.adminGameDataError ? `<div class="admin-account-gate"><div class="account-gate-mark">◎</div><h3>관리자 권한이 필요합니다</h3><p>${escapeHtml(this.adminGameDataError)}</p></div>` : `<div class="game-data-legend"><span>저장 방식</span><b>바꾼 칸만 서버에 저장</b><small>그 유저가 접속 중이면 다음 저장 때 게임 화면에도 바로 반영됩니다(10분 안). 운영자 계정은 랭킹 · 영토전 · 레이드 순위 · 대련 상대에서 빠집니다.</small></div><div class="admin-account-toolbar"><label><span>계정 검색</span><input data-admin-game-search value="${escapeHtml(this.adminGameSearch)}" placeholder="이름 · 이메일 · #번호"></label><button class="action-button action-button--outline" data-action="admin-game-search">검색</button>${this.adminSortSelect()}<span class="admin-directory-count">${shown.length} / ${this.adminGameAccounts.length}명</span></div><div class="game-data-list">${stateRows || '<div class="admin-empty-row">게임 계정 데이터가 없습니다.</div>'}</div>`}</div>`
    } else if (this.adminTab === 'decks') {
      // 덱 승률 순위(천명 추천 덱 + 속공 인연 덱): 일반 유저 화면에는 승률을 보여 주지 않는다
      const byId = new Map(catalog.map(general => [general.id, general]))
      const lanes = ['좌', '전열', '우']
      const ranking = deckRanking(100)
      const style = this.adminDeckStyle
      const filters = (['all', ...ARCHETYPES] as const).map(key => `<button class="admin-filter ${style === key ? 'is-active' : ''}" data-action="admin-deck-style" data-deck-style="${key}">${key === 'all' ? '전체' : ARCHETYPE_META[key].label} <small>${key === 'all' ? ranking.length : ranking.filter(row => row.archetype === key).length}</small></button>`).join('')
      const rows = ranking.map((row, index) => [row, index] as const).filter(([row]) => style === 'all' || row.archetype === style).map(([row, index]) => `<tr><td class="admin-deck-rank">${index + 1}</td><td class="admin-deck-rate"><b>${(row.winRate * 100).toFixed(1)}%</b><i style="--w:${Math.round(row.winRate * 100)}%"></i></td><td><span class="admin-deck-style admin-deck-style--${row.archetype}">${ARCHETYPE_META[row.archetype].label}</span></td><td class="admin-deck-members">${row.ids.map((id, lane) => { const general = byId.get(id); return `<span><small>${lanes[lane]}</small>${general?.grade === 5 ? `<b>${escapeHtml(general.name)}</b>` : escapeHtml(general?.name ?? id)}</span>` }).join('')}</td><td>${row.bond ? escapeHtml(row.bond.name) : '—'}</td><td class="admin-deck-anchors">${row.anchors.map(id => escapeHtml(byId.get(id)?.name ?? id)).join(' · ') || '—'}</td></tr>`).join('')
      body = `<div class="glass-card admin-panel admin-decks"><div class="card-header"><div><span class="eyebrow">밸런스 점검</span><h3>덱 승률 순위 1~${ranking.length}위</h3></div><span class="sync-label">시뮬레이션 기준</span></div><p class="admin-decks-note">천명 무장의 유형별 최고 승률 추천 덱과 속공 인연 덱을 모아 같은 조합은 한 번만 셌습니다. 대표 덱 10개 상대 평균 · 유저 대련 규칙(자리 바꿔 두 번) · 양쪽 Lv40 3성 · 장비 없음. 굵은 이름은 천명입니다. 승률표를 다시 만들려면 scripts/balance/recommend-decks.ts를 돌립니다.</p><div class="admin-filters admin-decks-filters">${filters}</div><div class="admin-decks-scroll"><table class="admin-decks-table"><thead><tr><th>순위</th><th>승률</th><th>유형</th><th>구성 (좌 · 전열 · 우)</th><th>인연</th><th>추천하는 천명</th></tr></thead><tbody>${rows}</tbody></table></div></div>`
    } else if (this.adminTab === 'season') {
      body = `<div class="admin-grid"><div class="glass-card admin-panel season-control"><div class="card-header"><div><span class="eyebrow">시즌 관리</span><h3>시즌 01 · 황혼의 관문</h3></div><span class="admin-state-chip ${this.adminPublished ? 'is-on' : 'is-off'}">${this.adminPublished ? '게시 중' : '비공개'}</span></div><div class="season-banner"><span>시즌 1</span><strong>황혼의 관문</strong><small>실시간 전술 전략 캠페인</small></div><div class="season-meta"><span>시작일 <b>2026.10.01</b></span><span>콘텐츠 <b>정상</b></span><span>모집 풀 <b>${allGenerals().length}명</b></span></div><button class="action-button action-button--primary admin-action" data-action="admin-toggle-publish">${this.adminPublished ? '시즌 비공개 전환' : '시즌 게시 재개'} <span>→</span></button></div><div class="glass-card admin-panel"><div class="card-header"><div><span class="eyebrow">공지</span><h3>운영 공지</h3></div><span class="rate-note">시즌 배너</span></div><label class="admin-field"><span>현재 공지 문구</span><input value="황혼의 관문 · 삼국지 장수 50명 업데이트" readonly></label><button class="action-button action-button--outline admin-action" data-action="admin-announce">공지 미리보기 표시</button><p class="admin-note">이 화면의 시즌 변경은 로컬 관리자 미리보기 상태이며 서버 게시 권한을 대신하지 않습니다.</p></div></div>` + this.adminLuoyangPanel() + this.adminRoyalPanel()
    } else {
      body = `<div class="glass-card admin-panel admin-audit"><div class="card-header"><div><span class="eyebrow">작업 기록</span><h3>변경 기록</h3></div><span class="sync-label">최근 작업</span></div>${activity.concat([['06:31', '품질 검증', '타입 검사·38개 테스트·프로덕션 빌드 통과', 'jade'] as const]).map(([time, category, message, tone]) => `<div class="audit-row"><time>${time}</time><span class="activity-mark activity-mark--${tone}"></span><div><b>${category}</b><p>${message}</p></div><small>검증됨</small></div>`).join('')}</div>`
    }
    return `<section class="page-section page-section--admin"><div class="admin-heading"><div><span class="eyebrow">관리자</span><h1>관리자 센터</h1><p class="heading-copy">게임 콘텐츠와 시즌 운영 상태를 한 화면에서 점검합니다.</p></div><div class="admin-live-badge"><i></i><span>운영 콘솔 · 로컬 상태</span></div><a class="admin-balance-link" href="./balance.html">⚖ 밸런스 조정 테스트 열기</a></div><div class="admin-tabs">${tabMarkup}</div>${body}</section>`
  }

  private shopSection(state: StrategyState): string {
    const statLabels: Record<string, string> = { leadership: '통솔', martial: '무력', stratagem: '모략', speed: '속도' }
    const nameOf = (resource: ShopResource) => resource === 'honor' ? '옥패' : resource === 'manuals' ? '병서' : RESOURCE_META[resource].label
    const iconOf = (resource: ShopResource) => icon(resource)
    const holdingOf = (resource: ShopResource) => resource === 'honor' ? state.honor : resource === 'manuals' ? state.manuals : resource === 'silver' ? state.silver : state.resources[resource]
    const all = shopPackages()
    const buyButton = (item: ShopPackage, label = `${item.goldCost}금화`) => {
      const short = item.goldCost - state.gold
      const bonus = packageBonus(item, all)
      const action = item.kind === 'honor' ? 'honor-shop-purchase' : 'cash-shop-purchase'
      const idAttr = item.kind === 'honor' ? `data-package-id="${item.id}"` : `data-product-id="${item.id}"`
      return `<button class="shop-buy ${bonus >= 0.4 ? 'is-best' : ''}" data-action="${action}" ${idAttr} data-cost="${item.goldCost}" data-label="${escapeHtml(`${nameOf(item.resource)} +${formatNumber(item.amount)}`)}" ${short > 0 ? 'disabled' : ''}><b>${label}</b><span>+${formatNumber(item.amount)}</span>${bonus >= 0.05 ? `<em>+${Math.round(bonus * 100)}% 이득</em>` : '<em class="is-plain">기본</em>'}${short > 0 ? `<small>금화 ${short}개 부족</small>` : ''}</button>`
    }
    const balances = `<div class="shop-balances shop-balances--strip glass-card"><span>${icon('gold', 'gi--inline')} 금화 <b>${formatNumber(state.gold)}</b></span><span>${icon('honor', 'gi--inline')} 옥패 <b>${formatNumber(state.honor)}</b></span><span>${icon('mythic', 'gi--inline')} 신화 조각 <b>${state.mythicFragments}</b></span><span>낙양 강화석 <b>${state.mythicStones}</b></span></div>`
    const tabs = `<div class="shop-tabs shop-tabs--row" role="tablist"><button class="shop-tab ${this.shopTab === 'packages' ? 'is-active' : ''}" data-action="shop-tab" data-shop-tab="packages">패키지${STARTER_PACKS.some(pack => !starterPackBought(state, pack.id)) ? '<i class="shop-tab__dot"></i>' : ''}</button><button class="shop-tab ${this.shopTab === 'passes' ? 'is-active' : ''}" data-action="shop-tab" data-shop-tab="passes">정액권</button><button class="shop-tab ${this.shopTab === 'resources' ? 'is-active' : ''}" data-action="shop-tab" data-shop-tab="resources">자원·옥패</button><button class="shop-tab ${this.shopTab === 'mythic' ? 'is-active' : ''}" data-action="shop-tab" data-shop-tab="mythic">신화 장비</button><button class="shop-tab ${this.shopTab === 'gold' ? 'is-active' : ''}" data-action="shop-tab" data-shop-tab="gold">금화 충전</button></div>`
    let body = ''
    if (this.shopTab === 'packages') body = this.starterPackSection(state)
    else if (this.shopTab === 'passes') body = this.passSection(state)
    else if (this.shopTab === 'gold') {
      if (GOLD_PURCHASE_ENABLED) body = `<div class="shop-grid">${GOLD_PACKAGES.map(goldPackage => `<article class="shop-item shop-item--gold glass-card"><div class="shop-item-icon shop-item-icon--gold">${icon('gold')}</div><div class="shop-item-copy"><span class="pill pill--mythic">금화 충전</span><h2>${escapeHtml(goldPackage.name)}</h2><small>금화 +${goldPackage.gold}개 · 1개당 1,500원</small></div><button class="action-button action-button--primary" data-action="gold-purchase" data-package-id="${goldPackage.id}">₩ ${goldPackage.priceKRW.toLocaleString(locale())} · 충전</button></article>`).join('')}</div>`
      else {
        const gotToday = state.prelaunchGoldDayKey === dayKey()
        body = `<div class="glass-card shop-prelaunch"><span class="eyebrow">정식 출시 전</span><h2>매일 금화 100개를 드립니다</h2><p>금화 충전은 정식 출시 때 열립니다. 그 전까지는 접속하면 하루 한 번 금화 100개가 지급됩니다.</p><strong class="${gotToday ? 'is-done' : ''}">${gotToday ? '오늘 금화를 받았습니다' : '오늘 금화는 접속·동기화 때 자동으로 지급됩니다'}</strong></div>`
      }
    } else if (this.shopTab === 'resources') {
      const needs = shopNeeds(state)
      const needCard = needs.length ? `<div class="glass-card shop-needs"><div class="card-header"><div><span class="eyebrow">지금 필요한 것</span><h3>모자란 자원 추천</h3></div></div><ul>${needs.map(need => `<li><div><strong>${escapeHtml(need.reason)}</strong><small>${nameOf(need.resource)} ${formatNumber(need.short)} 부족 · 보유 ${formatNumber(holdingOf(need.resource))}</small></div>${need.item ? buyButton(need.item) : '<small class="shop-needs__none">묶음 하나로는 부족합니다</small>'}</li>`).join('')}</ul></div>` : '<div class="glass-card shop-needs shop-needs--ok"><span class="eyebrow">지금 필요한 것</span><p>다음 무장 레벨업·연구·건물 강화·10회 모집에 필요한 재화가 모두 충분합니다.</p></div>'
      const resources: ShopResource[] = ['honor', 'manuals', 'silver', 'iron', 'grain', 'wood', 'influence']
      const rows = resources.map(resource => `<div class="shop-row"><div class="shop-row__head">${iconOf(resource)}<div><strong>${nameOf(resource)}</strong><small>보유 ${formatNumber(holdingOf(resource))}</small></div></div><div class="shop-row__buys">${all.filter(item => item.resource === resource).map(item => buyButton(item)).join('')}</div></div>`).join('')
      body = `${needCard}<div class="shop-notice glass-card"><strong>교환 안내</strong><span>금화로 병서(무장 레벨업)·옥패(무장 모집)·자원을 삽니다. 큰 묶음일수록 이득이고, 20금화 이상은 한 번 더 묻습니다.</span></div><div class="glass-card shop-table">${rows}</div>${this.purchaseLogCard()}`
    } else {
      const fragments = state.mythicFragments
      const progress = Math.min(1, fragments / MYTHIC_FRAGMENT_COST)
      const duelsLeft = duelAttemptsRemaining(state)
      const formation = state.formation.map(id => state.generals.find(general => general.id === id)).filter((general): general is General => Boolean(general))
      const preview = (item: Equipment) => {
        // 출전 무장 중 이 종류 칸이 가장 약한 무장에게 끼웠을 때
        const options = formation.map(general => {
          const currentId = state.equipmentLoadouts[general.id]?.[item.type]
          const current = currentId ? state.equipmentInventory.find(entry => entry.id === currentId) : undefined
          return { general, current, gain: equipmentValue(item) - (current && current.mainStat === item.mainStat ? equipmentValue(current) : 0) }
        }).sort((x, y) => y.gain - x.gain)
        const best = options[0]
        return best ? `<p class="shop-preview">${escapeHtml(best.general.name)}에게 장착 시 ${statLabels[item.mainStat]} <b>+${best.gain}</b> <small>(지금 ${EQUIPMENT_TYPE_META[item.type].label}: ${best.current ? escapeHtml(best.current.name) : '비어 있음'})</small></p>` : ''
      }
      const cards = MYTHIC_SHOP_EQUIPMENT.map(item => { const specialty = equipmentSpecialty(item); return `<article class="shop-item shop-item--${item.set} glass-card"><div class="shop-item-icon"><img class="equipment-image--mythic" src="${equipmentImage(item.type)}" alt="${EQUIPMENT_TYPE_META[item.type].label}" /></div><div class="shop-item-copy"><span class="pill pill--mythic">신화 · ${EQUIPMENT_TYPE_META[item.type].label}</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.skillDescription)}</p><small>${escapeHtml(EQUIPMENT_SET_META[item.set].label)} · ${statLabels[item.mainStat]} +${item.baseValue} · ${escapeHtml(item.skillName)}</small>${specialty ? `<strong class="shop-specialty">특기 · ${escapeHtml(specialty.label)} · ${escapeHtml(specialty.description)}</strong>` : ''}${preview(item)}<span class="shop-progress"><i style="width:${progress * 100}%"></i><em>조각 ${Math.min(fragments, MYTHIC_FRAGMENT_COST)}/${MYTHIC_FRAGMENT_COST}</em></span></div><button class="action-button action-button--primary" data-action="shop-purchase" data-equipment-id="${item.id}" data-cost-fragments="${MYTHIC_FRAGMENT_COST}" data-label="${escapeHtml(item.name)}" ${fragments < MYTHIC_FRAGMENT_COST ? 'disabled' : ''}>${fragments < MYTHIC_FRAGMENT_COST ? `조각 ${MYTHIC_FRAGMENT_COST - fragments}개 더 필요` : `조각 ${MYTHIC_FRAGMENT_COST}개로 교환`}</button></article>` }).join('')
      body = `<div class="glass-card shop-mythic-guide"><div class="shop-mythic-guide__bar"><span>신화 조각 <b>${fragments}</b> / ${MYTHIC_FRAGMENT_COST}</span><i><b style="width:${progress * 100}%"></b></i></div><p>유저 대련 승리 = 조각 쉬움 1 · 보통 2 · 어려움 3개 · 하루 5회 · 오늘 남은 대련 <b>${duelsLeft}회</b></p><p class="shop-mythic-guide__stone">신화장비는 낙양 강화석으로만 강화합니다(낙양 점령 1회당 1개 · 보유 ${state.mythicStones}개).</p><button class="action-button action-button--outline" data-action="section" data-section="duel">유저 대련 하러 가기 →</button></div><div class="shop-grid">${cards}</div>${this.purchaseLogCard()}`
    }
    const description = this.shopTab === 'packages' ? '계정마다 한 번만 살 수 있는 신규유저 패키지입니다.' : this.shopTab === 'gold' ? '금화 충전 안내' : this.shopTab === 'resources' ? '금화로 자원과 옥패를 바꿉니다. 지금 모자란 것을 먼저 추천합니다.' : '유저 대련에서 모은 신화 조각으로 신화장비를 교환합니다.'
    return `<section class="page-section page-section--shop"><div class="section-heading section-heading--compact"><div><span class="eyebrow">소통</span><h1>상점</h1><p class="heading-copy">${description}</p></div></div>${balances}${tabs}${body}</section>`
  }

  /** 상점 > 패키지: 신규유저 패키지 4종(계정당 1회). 정식 출시 전에는 무료 */
  private starterPackSection(state: StrategyState): string {
    const launched = isLaunched()
    const art = (pack: StarterPack) => pack.randomLegend ? `<img class="starter-pack__art is-portrait" src="/assets/ui/recruit-montage.webp" alt=""><i class="starter-pack__mystery">?</i>`
      : pack.freeRecruits ? `<img class="starter-pack__art" src="/assets/ui/jade-summon.svg" alt=""><i class="starter-pack__count">×${pack.freeRecruits}</i>`
      : pack.freeDraws ? `<img class="starter-pack__art" src="/assets/equipment/weapon.webp" alt=""><i class="starter-pack__count">×${pack.freeDraws}</i>`
      : `<span class="starter-pack__trio">${icon('grain')}${icon('wood')}${icon('iron')}${icon('silver')}${icon('manuals')}</span>`
    const cards = STARTER_PACKS.map((pack, index) => {
      const bought = starterPackBought(state, pack.id)
      const price = `₩ ${pack.priceKRW.toLocaleString('ko-KR')}`
      const button = bought ? '<button class="action-button starter-pack__buy is-done" disabled>구매 완료</button>'
        : launched ? `<button class="action-button action-button--primary starter-pack__buy" data-action="starter-pack" data-pack-id="${pack.id}" data-label="${escapeHtml(pack.name)}" data-price="${price}">${price} 구매</button>`
        : `<button class="action-button action-button--primary starter-pack__buy" data-action="starter-pack" data-pack-id="${pack.id}" data-label="${escapeHtml(pack.name)}">무료로 받기</button>`
      return `<article class="starter-pack glass-card ${bought ? 'is-bought' : ''} ${index === 0 ? 'is-hero' : ''}"><span class="starter-pack__tag">계정당 1회</span><div class="starter-pack__visual">${art(pack)}</div><div class="starter-pack__copy"><h3>${escapeHtml(pack.name)}</h3><p>${escapeHtml(pack.description)}</p><small class="starter-pack__price">${launched ? price : `<s>${price}</s> 정식 출시 전 무료`}</small></div>${button}</article>`
    }).join('')
    const note = launched ? '<p class="starter-pack-note">한 계정에서 패키지마다 한 번씩만 살 수 있습니다.</p>' : '<p class="starter-pack-note">정식 출시 전에는 누구나 패키지마다 한 번씩 무료로 받을 수 있습니다. 출시 후에는 표시된 가격으로 판매됩니다.</p>'
    return `<div class="glass-card starter-pack-head"><span class="eyebrow">신규유저 패키지</span><h2>처음 한 번만 드리는 특별 구성</h2>${note}</div><div class="starter-pack-grid">${cards}</div>`
  }

  /** 정액권(2026.10.20): 일주일 · 한달(하루 금화 2개) · 자동 전투(자동 대응 85% · 3배속) */
  private passSection(state: StrategyState): string {
    const launched = isLaunched()
    const now = Date.now()
    const cards = PASSES.map(pass => {
      const until = passUntil(state, pass.id)
      const active = until > now
      const daysLeft = Math.max(0, Math.ceil((until - now) / 86400000))
      const tried = state.missions?.passTrials?.includes(pass.id) ?? false
      const price = `₩ ${pass.priceKRW.toLocaleString('ko-KR')}`
      const goldToday = pass.dailyGold > 0 && passGoldClaimedToday(state, pass.id)
      const status = active ? `<strong class="pass-card__status is-on">사용 중 · ${daysLeft}일 남음${pass.dailyGold ? ` · 오늘 금화 ${goldToday ? '받음' : '받기 전(접속 · 동기화 때 지급)'}` : ''}</strong>` : '<strong class="pass-card__status">사용 안 함</strong>'
      const button = launched
        ? (PASS_PAYMENT_ENABLED ? `<button class="action-button action-button--primary" data-action="pass-buy" data-pass-id="${pass.id}" data-label="${escapeHtml(pass.name)}" data-price="${price}">${price} ${active ? '연장' : '구매'}</button>` : '<button class="action-button" disabled>결제 준비 중</button>')
        : tried ? '<button class="action-button is-done" disabled>무료 체험 받음</button>' : `<button class="action-button action-button--primary" data-action="pass-buy" data-pass-id="${pass.id}" data-label="${escapeHtml(pass.name)}">무료 체험 받기</button>`
      const perks = pass.auto ? ['자동 전투 예고 대응 확률 70% → 85%', '전투 배속 3배 사용 가능', `${pass.days}일`] : [`매일 금화 ${pass.dailyGold}개 · ${pass.days}일 동안 총 ${pass.dailyGold * pass.days}개`, '산 날 바로 첫 금화 지급', '다시 사면 남은 기간에 이어서 연장']
      return `<article class="pass-card glass-card ${active ? 'is-active' : ''}"><div class="pass-card__head"><span class="eyebrow">${pass.auto ? '편의' : '금화'}</span><h3>${escapeHtml(pass.name)}</h3><b class="pass-card__price">${launched ? price : `<s>${price}</s> 출시 전 무료 체험`}</b></div><ul>${perks.map(perk => `<li>${perk}</li>`).join('')}</ul>${status}${button}</article>`
    }).join('')
    const note = launched ? '<p class="starter-pack-note">정액권 기간은 산 순간부터 셉니다. 금화는 한국 날짜로 하루 한 번 받습니다.</p>' : '<p class="starter-pack-note">정식 출시 전에는 정액권마다 한 번씩 무료로 체험할 수 있습니다. 출시 후에는 표시된 가격으로 판매됩니다.</p>'
    return `<div class="glass-card starter-pack-head"><span class="eyebrow">정액권</span><h2>매일 받는 금화 · 편한 자동 전투</h2>${note}</div><div class="pass-grid">${cards}</div>`
  }

  /** 이 기기에서 최근 구매 10건 */
  private purchaseLogCard(): string {
    const log = readPurchaseLog()
    if (!log.length) return ''
    return `<div class="glass-card shop-log"><span class="eyebrow">최근 구매</span><ul>${log.map(entry => `<li><span>${escapeHtml(entry.text)}</span><small>${new Intl.DateTimeFormat(locale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(entry.at))}</small></li>`).join('')}</ul></div>`
  }

  /** 구매 확인 창(금화 20개 이상 · 신화 조각 교환) */
  private raidStepTimer: number | null = null
  /** 지금 싸우는 레이드 군(예: 2군 2/3) */
  raidSquadLabel = ''

  /** 레이드 군 사이: 방금 군의 피해와 다음 출전 군(5초 뒤 자동 출전) */
  showRaidStep(info: { finishedLabel: string; damage: number; total: number; nextLabel: string; nextNames: string[]; step: number; count: number }, onGo: () => void): void {
    this.closeRaidStep()
    const modal = document.createElement('div')
    modal.className = 'shop-confirm raid-step'
    let left = 5
    let done = false
    const go = () => { if (done) return; done = true; this.closeRaidStep(); onGo() }
    modal.innerHTML = `<div class="shop-confirm__card"><span class="eyebrow">주간 레이드 · ${info.step - 1}/${info.count} 완료</span><h2>${escapeHtml(info.finishedLabel)} 피해 ${formatNumber(info.damage)}</h2><p>지금까지 합계 ${formatNumber(info.total)}</p><div class="raid-step__next"><small>다음 출전</small><strong>${escapeHtml(info.nextLabel)} (${info.step}/${info.count})</strong><span>${info.nextNames.map(escapeHtml).join(' · ')}</span></div><div class="shop-confirm__actions"><button class="action-button action-button--primary" data-raid-go>${escapeHtml(info.nextLabel)} 출전 <b data-raid-count>${left}</b></button></div></div>`
    modal.querySelector('[data-raid-go]')?.addEventListener('click', go)
    document.body.appendChild(modal)
    this.raidStepTimer = window.setInterval(() => {
      left -= 1
      const count = modal.querySelector('[data-raid-count]')
      if (count) count.textContent = String(Math.max(0, left))
      if (left <= 0) go()
    }, 1000)
  }

  closeRaidStep(): void {
    if (this.raidStepTimer !== null) { window.clearInterval(this.raidStepTimer); this.raidStepTimer = null }
    document.querySelector('.raid-step')?.remove()
  }

  /** 2·3군이 비어 있을 때: 남은 무장으로 채울지, 그대로 출전할지, 편성으로 갈지 */
  askRaidSquads(emptyLabels: string[], spare: number, onChoose: (choice: 'fill' | 'go' | 'edit') => void): void {
    document.querySelector('.shop-confirm')?.remove()
    const modal = document.createElement('div')
    modal.className = 'shop-confirm'
    modal.innerHTML = `<div class="shop-confirm__card"><span class="eyebrow">주간 레이드</span><h2>${escapeHtml(emptyLabels.join('·'))}이 비어 있습니다</h2><p>레이드는 1군 → 2군 → 3군의 피해 합계로 순위를 겨룹니다. 대기 무장 ${spare}명으로 빈 군을 자동 편성·장착하고 출전할까요?</p><div class="shop-confirm__actions raid-ask"><button class="action-button action-button--primary" data-raid-choice="fill">자동 편성 후 출전</button><button class="action-button action-button--outline" data-raid-choice="go">이대로 출전</button><button class="action-button action-button--outline" data-raid-choice="edit">편성하러 가기</button></div></div>`
    const close = () => modal.remove()
    modal.addEventListener('click', event => {
      const target = event.target as HTMLElement
      const choice = target.closest<HTMLElement>('[data-raid-choice]')?.dataset.raidChoice as 'fill' | 'go' | 'edit' | undefined
      if (choice) { close(); onChoose(choice) }
      else if (target === modal) close()
    })
    document.body.appendChild(modal)
  }

  private confirmPurchase(title: string, detail: string, onOk: () => void, labels: { eyebrow?: string; ok?: string; alt?: { label: string; onClick: () => void } } = {}): void {
    document.querySelector('.shop-confirm')?.remove()
    const modal = document.createElement('div')
    modal.className = 'shop-confirm'
    modal.innerHTML = `<div class="shop-confirm__card"><span class="eyebrow">${escapeHtml(labels.eyebrow ?? '구매 확인')}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p><div class="shop-confirm__actions"><button class="action-button action-button--outline" data-confirm-no>취소</button>${labels.alt ? `<button class="action-button action-button--outline" data-confirm-alt>${escapeHtml(labels.alt.label)}</button>` : ''}<button class="action-button action-button--primary" data-confirm-yes>${escapeHtml(labels.ok ?? '구매')}</button></div></div>`
    const close = () => modal.remove()
    modal.addEventListener('click', event => { if (event.target === modal) close() })
    modal.querySelector('[data-confirm-no]')?.addEventListener('click', close)
    modal.querySelector('[data-confirm-yes]')?.addEventListener('click', () => { close(); onOk() })
    modal.querySelector('[data-confirm-alt]')?.addEventListener('click', () => { close(); labels.alt?.onClick() })
    document.body.appendChild(modal)
  }

  private updatesSection(): string {
    // 지금까지의 업데이트를 주제별로 요약(새 항목은 맨 위에 더한다)
    const completed = [
    ['2026.10.22', '속공 인연 6종 조정 · 스킬 위력 상한', '스킬 한 번의 사기 피해 상한(40)이 스킬 위력 버프가 걸린 동안(속공 인연의 초반 효과 · 공격 강화 · 용의 위세 · 연환의 분노 · 간파)에는 50까지 열립니다. 속공 인연 6종의 전투 시작 20초 효과는 아군 공격 +80% · 스킬 위력 +100%(기존 스킬 +80%)가 되고, 이 동안 스킬 상한 50이 적용됩니다. 속공 덱은 버티기 · 유틸 덱에 강하고, 스킬 연계 · 디버프 덱에 약합니다.', '완료', 'jade'],
    ['2026.10.22', '고순 천명 · 진궁 명장', '고순이 5등급(천명)이 되었습니다. 능력치가 천명 수준으로 오르고, 5성 각성 함진영 불파(사기 피해 ×1.3 + 아군 받는 피해 −15% 5초)가 생겼습니다. 진궁은 4등급(명장)이 되었습니다. 이미 가진 고순 · 진궁도 레벨 · 성급은 그대로 두고 능력치가 새 등급 기준으로 오릅니다. 함진영 돌격 인연의 아군 받는 피해 감소는 −15%에서 −5%로 낮춰 덱 승률을 90%대 초반(약 92%)으로 맞췄습니다.', '완료', 'jade'],
    ['2026.10.22', '속공 인연 6종', '세 명이 모두 출전하면 켜지는 속공 인연 6종이 생겼습니다: 합비 질풍대(장료 · 악진 · 이전), 하북 선봉(안량 · 문추 · 장합), 자오곡 기습(위연 · 황충 · 마대 · 받는 피해 −15% 추가), 백기 야습(감녕 · 능통 · 손책), 함진영 돌격(여포 · 고순 · 진궁 · 받는 피해 −5% 추가), 관마 쌍웅(관우 · 마초 · 관은병). 그 조합에 원래 켜지던 인연 효과에 전투 시작 20초 동안 아군 공격 · 스킬 위력 +80%가 더해지고, 영토전 · 대련에서는 속공 덱으로 판정됩니다. 구성원의 추천 덱 속공 칸에 이 덱이 나옵니다. 시나리오 · 레이드의 적에게는 켜지지 않습니다.', '완료', 'jade'],
    ['2026.10.22', '하후돈 상향', '하후돈의 발시담목이 더 이상 자기 병력 5%를 소모하지 않습니다(사기 피해 ×2.85는 그대로). 스킬 피해는 이미 상한에 닿아 있어 소모 때문에 오래 버티지 못하던 것이 약점이었습니다. 시뮬레이션 기준 하후돈 추천 덱 평균 승률이 약 4%p 오르고, 하후돈 추천 덱도 새 승률로 바뀌었습니다.', '완료', 'jade'],
    ['2026.10.22', '시즌마다 진영 재배정', '새 시즌이 시작되면 위 · 촉 · 오 지휘관을 연맹 단위(연맹원은 함께) · 연맹 미소속 지휘관 단위로 무작위로 섞어 세 진영에 다시 나눕니다. 각 진영의 인원 · 지난 시즌 접속 일수 · 전투력 · 금화 사용량이 고르게 되도록 나누고, 재야는 그대로 남습니다. 처음 시작하거나 재야에서 삼국으로 돌아오면 지금 가장 약한 진영에 배정되며, 삼국 사이에서 진영을 직접 바꿀 수는 없습니다. 새 시즌에 배정된 진영은 접속할 때 한 번 알려 드립니다.', '완료', 'jade'],
      ['2026.10.22', '고친 문제', '초선 무장 사진에서 얼굴이 왼쪽 위 등급 표시에 가려지던 것을 고쳤습니다(사진 아래를 잘라 인물을 조금 크게, 얼굴을 아래로 내림).', '완료', 'jade'],
      ['2026.10.21', '천하 시즌 · 이벤트 천명', '한 달을 한 시즌으로 하는 천하 시즌을 시작했습니다(10월이 시즌 1). 매월 1일 0시에 진영이 가진 도시의 등급 합(수도 제외)으로 순위를 정해, 1위 진영은 이달의 로테이션 무장 2장, 2 · 3위 진영은 1장을 받습니다(좌자 → 우길 → 화타 → 남화노선 → 사마휘 순). 시즌 중 영토전을 1회 이상 한 지휘관이 받고, 재야는 시즌 중 약탈 10만 이상이면 1장을 받습니다. 새 시즌에는 수도를 뺀 도시가 처음 상태로 돌아가고 무장 · 레벨 · 장비는 그대로입니다. 모든 메뉴 위쪽 막대에 시즌 남은 시간이 나오고, 누르면 순위 · 보상 무장 · 자격 · 정산 규칙을 봅니다. 이벤트 한정 천명 5명(좌자 · 우길 · 화타 · 남화노선 · 사마휘)이 새 사진 · 3D 얼굴과 함께 도감에 들어왔습니다. 정식 모집 · 출석 보상 · 신규유저 패키지의 무작위 천명에는 나오지 않고, 새 인연(수경 문하 · 강호의 세 선인 · 태평요술서 · 괄골요독 · 신의와 선도)은 그 무장이 출전해야 켜집니다.', '완료', 'jade'],
      ['2026.10.21', '영토전 · 레이드 · 대련', '자동 진행 프로그램 대책을 넣었습니다. 공성은 하루 200회까지 영토 · 시즌 · 약탈에 반영되고, 공성 · 수비 기록은 몇 초 간격을 두고 받으며, 공성 한 번의 피해에는 정상 플레이로 낼 수 있는 상한이 있습니다. 공성 결과는 서버가 준 표로 한 번만 기록하고, 너무 잦은 요청은 잠시 막힙니다. 주간 레이드 순위 보상을 바꿨습니다(10월 26일 주부터): 1위 금화 50 · 낙양 강화석 2개, 2위 금화 40 · 강화석 1개, 3위 금화 30 · 강화석 1개, 4~10위 금화 20, 11~50위 금화 12, 51~100위 금화 8, 101~300위 옥패 1,000, 301위부터 옥패 500. 유저 대련이 끝나면 대련 메뉴로 돌아와 다음 상대를 바로 고릅니다.', '완료', 'jade'],
      ['2026.10.21', '추천 덱 · 전투 조작감', '천명 무장의 추천 덱은 유형(스킬 연계 · 버티기 · 속공 · 디버프 · 유틸)마다 전투 시뮬레이션으로 승률이 가장 높았던 조합을 보여 줍니다(유저 대련 규칙 · Lv40 3성 · 장비 없음 · 대표 덱 10개 상대 평균). 효과음 크기를 고르게 맞추고 스킬 · 승리 · 말 울음 소리가 누르자마자 들리게 했습니다. 쓸 수 있는 스킬은 ‘사용 가능 ▶’으로 빛나고, 이미 깬 시나리오는 ‘다음 단계로’를 앞에 둡니다. 전투 시작 때 그림을 미리 준비해 첫 장면에서 멈칫하던 것을 줄였습니다.', '완료', 'jade'],
      ['2026.10.21', '장비 관리', '같은 장비를 여러 개 가지고 있으면 무장마다 1개씩 나눠 낄 수 있습니다. 장착한 장비를 강화하면 끼고 있는 그 장비가 강화되고, 한 장비를 두 무장이 함께 끼던 오류를 고쳤습니다. 장비 화면의 자동 장착은 1군만 맞추고 2 · 3군 장비는 건드리지 않으며, 2 · 3군 무장을 고르면 그 군의 자동 장착 단추가 나옵니다. 다른 군 무장의 장비는 ‘가져오기’로 표시하고 한 번 묻습니다. 목록을 스크롤해도 필터가 유지되고 화면이 더 가볍습니다. 분해는 1개만 / 모두 중에서 고르고, 프리셋에 저장한 장비는 일괄 분해에서 빠집니다. 최고 단계 장비 표시와 강화 알림의 한글 능력치 이름도 고쳤습니다.', '완료', 'jade'],
      ['2026.10.21', '계정 · 게스트', '아이디를 바꾸면 채팅 · 게시판 · 연맹 · 순위표의 예전 이름도 함께 바뀌고, 다른 사람이 쓰는 아이디로는 바꿀 수 없습니다. 게스트 기록 초기화를 하면 게스트 아이디(서버 계정)까지 지워, 다시 들어오면 새 아이디를 정합니다(같은 아이디를 다시 써도 됩니다). 게스트 로그인이 안 되면 접속 화면에 이유를 알려 주고(서버 응답 없음 · 브라우저가 로그인 정보를 막는 경우 등), 여러 번 눌러도 한 번만 처리합니다.', '완료', 'jade'],
      ['2026.10.20', '왕 연맹 · 왕 · 황제 · 녹림왕', '도시를 최종 점령한 유저의 연맹이 그 도시의 연맹이 됩니다. 매주 월요일 0시에 진영마다 가진 도시의 등급 합이 가장 큰 연맹이 왕 연맹, 연맹장이 왕이 되고, 낙양 주인 진영의 왕은 황제가 됩니다. 도시를 가진 연맹이 없는 진영은 지난 주 적 · 중립 성벽을 가장 많이 깎은 연맹이 왕 연맹입니다. 재야는 낙양을 차지한 주에는 낙양을 점령한 연맹이, 아니면 적 성벽을 가장 많이 깎은 연맹이 왕 연맹이 되고 연맹장은 녹림왕이 됩니다. 왕 연맹원은 영토전 아군 피해 +5%와 왕궁 상점(낙양 강화석 · 무장 모집 · 신화장비 조각)을 쓰고, 왕은 주 30, 황제는 주 50 금화를 받습니다. 이름 옆에는 왕 · 황제 표시가 붙습니다.'],
      ['2026.10.20', '임시 점령 · 성벽 회복', '성벽 0 · 수비병 전멸 뒤 가장 먼저 최종 세력전에서 이긴 유저의 진영이 10분 동안 임시 점령합니다. 처음 1분은 수비 준비 시간이라 공성할 수 없고 임시 점령 시간도 흐르지 않으며, 그 진영 유저가 함께 수비병을 최대 100부대까지 세웁니다. 국경이 맞닿은 다른 진영(낙양은 낙양전 동안 네 진영 모두)이 수비병을 모두 격파하면 임시 점령을 넘겨받습니다. 10분이 끝나면 그 진영이 최종 점령하고, 마지막으로 임시 점령을 얻은 유저가 세력전 금화를 받습니다(하루 5번까지). 최종 점령 뒤 1시간은 공성할 수 없습니다. 성벽은 1시간에 최대치의 20%씩 회복하고, 재야가 무너뜨린 성벽은 1시간 뒤부터 회복합니다.'],
      ['2026.10.20', '허저 · 조조 돌격형 · 위 인연', '허저가 돌격형이 되었습니다(호치 난무: 사기 피해 ×1.2 + 자신 받는 피해 −15% 4초). 호위무사 인연(전위 · 허저와 함께)이면 조조도 돌격형으로 싸우고(패왕의 진격: 사기 피해 ×1.5 + 아군 공격 +12% 6초 + 아군 사기 +10), 인연 효과에 아군 공격 +15%가 더해졌습니다. 자동 편성과 적 덱은 이 덱에서 전위를 가운데에 세웁니다. 새 인연 위왕과 중달(조조 · 사마의)은 아군 공격 +8% · 받는 피해 −10% · 스킬 위력 +12% · 모든 스킬 쿨다운 −0.5초입니다.'],
      ['2026.10.20', '소교 천명 · 육손 대화계 · 오 인연', '소교가 5등급(천명)이 되었습니다. 화선 난무는 혼란 2.5초 · 둔화 5.5초 · 대화계 5초, 패시브 강동의 자매는 대교와 편성 시 위력 +15%, 5성 각성은 아군 공격 +10% 6초를 더합니다. 육손 이릉 화진은 적 전체에 대화계를 겁니다. 대화계는 화계와 따로 겹쳐 함께 걸리면 화상 피해가 두 배가 되고 해제되지 않습니다. 강동의 세 여걸 인연은 아군 받는 피해 −10% · 쿨다운 −1초 · 공격 +15% · 스킬 위력 +12%로 올랐고, 강동이교는 대교 · 소교 자매 인연이 되었습니다. 새 인연 적벽대전(주유 · 육손 · 황개)은 화계 · 대화계 지속 +2초와 스킬 위력 +8%입니다.'],
      ['2026.10.20', '무장 밸런스 재조정', '밸런스 측정이 무장을 실제 편성처럼 앞줄부터 배치하도록 바꾸고 전 무장을 다시 맞췄습니다(같은 등급 평균과의 차이 최대 20%p → 4.5%p). 유비 삼고초려의 책사 쿨다운 감소는 15% → 10%, 인덕의 결집 회복량은 8% → 7%, 와룡봉추 인연의 계략 쿨다운 단축은 1.5초 → 1초로 낮췄습니다. 우금은 패시브를 병력 70% 이상일 때 받는 피해 −10%로 바꿨고, 황충 · 소교 · 공손찬 · 손상향은 소폭 올렸습니다. 방통 연환계에 적 전체 사기 피해와 화계 2초, 곽가 십승십패에 갑주 균열과 적 공격 · 방어 −10%를 더했고, 관은병은 적 피해 감소를 무시합니다. 스킬로 얻는 불굴은 전투당 1번만 발동합니다.'],
      ['2026.10.20', '전설 · 신화 장비 강화', '전설 장비 기본 능력치가 34에서 40으로 올라 Lv20이 146이 되고, 전설에도 신화 특기의 절반이 강화 Lv15부터 붙습니다. 신화 장비는 받자마자 쓸모 있게 기본 능력치를 52에서 150으로 올리고 강화당 증가를 14%에서 6%로 바꿨습니다(Lv20 약 321). 신화 12종 모든 부위에 고유 효과가 생겼습니다(예: 적룡천극 스킬 위력 +8%, 천군용갑 받는 피해 −6%, 질풍유성창 첫 스킬 즉시). 강화는 지금처럼 낙양 강화석 1개로 1회입니다. 이미 가진 장비에도 바로 적용됩니다.'],
      ['2026.10.20', '상점 정액권 · 뽑기 기록', '상점에 정액권 탭을 열었습니다. 일주일 정액권(2,900원 · 7일 동안 매일 금화 2개), 한달 정액권(9,900원 · 30일 동안 매일 금화 2개), 자동 전투 정액권(4,900원 · 7일 동안 자동 전투 예고 대응 확률 70% → 85%, 전투 3배속)이 있고, 정식 출시 전에는 하나씩 무료로 체험할 수 있습니다. 자원 · 옥패 탭은 옥패를 맨 위로 옮겼습니다. 무장 모집 · 장비 뽑기 화면의 기록 단추로 최근 200회 결과와 최고 등급 누적 확률을 공개 확률과 함께 보고, 결과창에는 보유 옥패와 남은 무료 뽑기권이 나옵니다. 화면 위 금화를 누르면 최근 50건의 금화 사용 내역을 봅니다.'],
      ['2026.10.20', '스킬 해금 없앰 · 편성 화면', '스킬을 배우는(해금하는) 단계를 없앴습니다. 모든 무장이 Lv.1부터 스킬을 쓰고, 시나리오 · 레이드 등 상대 무장도 레벨과 상관없이 스킬을 씁니다. 출전 편성에서 출전 자리나 대기 무장을 누르면 스킬 · 쿨다운 · 패시브 · 각성을 간단히 보여 주고, 카드에 등급 · 레벨 · 성급이 함께 나옵니다. 모든 메뉴의 설명(? 단추 · 처음 들어갈 때 안내)을 지금 규칙에 맞게 고치고 모집 확률 · 임시 점령 · 왕궁 · 레이드 보상 같은 설명을 더했습니다. 레이드 보스는 상위 지휘관 평균이 30보다 낮아도 Lv.30을 유지합니다. 초선의 무장 사진을 새 그림(연보랏빛 비단옷 · 둥근 부채)으로 바꿨습니다.'],
      ['2026.10.20', '고친 문제', '휴대폰 강제 다크 모드에서 무장 사진이 뿌옇게 보이던 문제, 밝은 사진(초선 · 공손찬 · 이전 · 방덕)이 하얗게 뜨던 문제, 사진을 바꿔도 옛 사진이 보이던 문제를 고쳤습니다. 4 · 5등급 무장 카드의 반짝임은 휴대폰 절전 모드가 아니라 게임 설정의 효과 줄임에서만 멈춥니다. 스킬을 쓸 때 화면이 느려지거나 첫 스킬에 멈칫하던 것과 화계에 걸린 적이 계속 밀려나던 연출을 고쳤습니다. 특기 장비 카드의 버튼이 가려지던 문제와 랭킹에 기록하지 않는 전투마다 랭킹 서버 안내가 잘못 뜨던 문제도 고쳤습니다. 로그인 전 화면에서 게스트 기록을 초기화하면 서버 기록 · 순위 · 연맹 소속도 함께 정리합니다.'],
      ['2026.10.19', '사기 · 승리 규칙 개편', '적과 아군의 사기가 같은 규칙을 따릅니다. 양쪽 모두 사기 600에서 시작해 저절로 차지 않고, 막이 없어졌으며, 0 아래로도 계속 내려갑니다. 사기가 낮을수록 공격 · 방어가 떨어집니다(사기 0이면 70%, −600이면 40%, 최저 10%). 사기만으로는 이기지 않고 적 병력을 모두 쓰러뜨려야 승리합니다. 병력 피해를 양쪽 모두 20% 늘려(레이드 제외) 평균 전투는 약 48~65초이고, 제한 시간은 120초(레이드 90초, 어려움 속전 80초)입니다. 적 공격 패턴은 40초마다 거세집니다. 진형 붕괴는 적이 받는 사기 피해 +15%, 군심 결집은 매초 적 사기 −3, 철벽진은 매초 아군 사기 +4입니다.'],
      ['2026.10.19', '적 AI 스킬 대칭 · 확률형 스킬', '적 AI(유저 대련 상대 · 시나리오 · 공성 수비대 · 레이드 보스)도 무장 고유 스킬 · 패시브 · 인연을 그대로 쓰고, 그만큼 적 AI 보정은 낮췄습니다(대련 피해 1.55 → 1.35배, 시나리오 적 쿨다운 1.3 → 2.2배). 사마의 · 가후 · 진궁 · 순유 스킬은 조작 성공 시 70%(적 AI 50%) 확률로 효과마다 따로 발동합니다: 사마의 견벽청야(사기 감소 · 지력 차 병력 피해 · 스킬 봉인), 가후 독계(적 공격 · 방어 −30% 8초), 진궁 계중계(다음 스킬 무효 · 표적 낙인 7초 · 봉인 2초), 순유 기묘한 계책(아군 공격 +20% 6초 · 쿨다운 −3초).'],
      ['2026.10.19', '무장 밸런스 조정', '무장 73명을 1,440개 무작위 덱 리그로 시뮬레이션해 스킬 수치를 다시 맞췄습니다(같은 등급 안 승률 차이 7%p → 2%p). 제갈량 팔진도는 8초 동안 상대 스킬마다 70%(적 AI 50%) 확률로 막고 봉인 2초 · 사기 감소를 주며, 쿨다운은 태세가 끝난 뒤부터 돕니다. 덱 유형 특성: 속공 첫 18초 피해 +30% · 스킬 연계 +15% · 유틸 쿨다운 −28% · 버티기 받는 피해 −8%. 혼란은 같은 편을 칠 확률 35%, 화계는 매초 최대 병력 0.6% 피해, 침묵에 걸린 적은 받는 피해 +25%, 갑주 균열 +35%, 표적 낙인 +20%입니다. 관우 · 장비 · 도원결의는 올리고 축융은 낮췄습니다.'],
      ['2026.10.19', '공성 · 수비대 · 낙양', '적 진영 도시를 공성하면 그 진영 유저가 세운 수비대의 실제 덱(무장 · 레벨 · 성급)과 싸웁니다. 수비대는 공성을 막을 때마다 피로가 쌓여 능력치가 8%씩 떨어지고(최대 60%) 1시간에 10%씩 회복하므로, 가장 강한 수비대도 여러 번 공격받으면 뚫립니다. 유저 수비대가 없는 진영 성은 중립 성처럼 등급별 평균 레벨 ±2로 싸웁니다. 낙양은 세 진영 수도처럼 중립 습격을 받지 않아, 주인은 일요일 저녁 8시~자정 낙양전에서만 바뀝니다. 재야의 약탈 공성은 출정 비용이 들지 않습니다(낙양 공성은 그대로).'],
      ['2026.10.19', '연구 개편', '연구 인재 분야에서 과금에 영향을 주던 효과(모집 옥패 비용 · 모집 확률 · 장비 뽑기 전설 확률 · 전투 승리 옥패)를 모두 빼, 모집 · 뽑기 확률과 옥패는 모든 유저가 같습니다. 대신 무예 수련(출전 무장 능력치 +2%) · 병법 전수(레벨업 비용 −10%, 사관 교육과 합쳐 −20%) · 역사 편찬(전투 승리 은전 +15%) · 명품 제련(장비 강화 비용 −15%, 장인 공방과 합쳐 −30%)으로 바꿨습니다. 재야 유격 분야의 전리품 포상도 약탈마다 옥패 +40 대신 병서 +6을 줍니다. 이미 마친 연구는 새 효과로 이어집니다.'],
      ['2026.10.19', '유저 대련 난이도', '유저 대련 상대 난이도를 내 덱 전력 기준으로 다시 나눴습니다: 쉬움 50~69% · 보통 70~109% · 어려움 110~120%. 실제 유저 상대는 이 범위에서 고르게 보여 주고, 훈련 상대는 60% · 90% · 115%로 맞춥니다. 나보다 센 상대가 없으면 보통 구간 중 센 쪽 절반을 어려움으로 함께 씁니다. 승리 보상(신화 조각 1 · 2 · 3)은 그대로입니다.'],
      ['2026.10.19', '고친 문제', '강타 순간 멈춤 · 스킬 슬로모션이 전투 시간까지 늦춰 전투가 20% 안팎 길어지던 것을 고쳤습니다. 이제 연출은 그대로 보이고 전투 시간 · 피해 · 쿨다운은 실제 시간대로 흐릅니다. 그림자는 무장 본체만 그리고, 휴대폰 등 저품질에서는 그림자를 꺼 그래픽 부담을 줄였습니다. 보유 무장 화면의 정렬 상자를 누르면 목록이 바로 닫히던 문제도 고쳤습니다.'],
      ['2026.10.18', '여성 무장 새 3D 모델', '여성 무장 7명(초선 · 소교 · 대교 · 채문희 · 손상향 · 관은병 · 축융) 모두 새로 만든 3D 모델로 말을 탑니다. 초선과 소교는 모델 · 초상화를 맞바꿔 초선은 붉은 비단 도포, 소교는 금빛 어깨 갑옷 차림입니다. 얼굴은 2.5배 해상도로 따로 담아 훨씬 선명해졌고, 피부를 곱게 보정했습니다. 팔 · 손목이 이상하게 꺾이거나 발이 말 배 아래로 빠지던 것, 채문희의 큰 머리와 날개처럼 뻗던 소매를 고쳤습니다. 소교 · 관은병 · 손상향 무장 사진을 실사풍 초상으로 바꾸고, 다른 무장 사진 70장도 얼굴을 또렷하게 다시 그렸습니다.'],
      ['2026.10.18', '말 · 무기 · 공격 동작', '모든 무장의 손 무기를 병종에 맞췄습니다(궁병 활 · 책사 부채 · 기병 창과 언월도 · 보병 창 · 칼 · 극 · 사모 · 대도). 말 위에서 휘두르는 무기는 말머리 앞의 적을 향해 베고, 청룡언월도는 칼날이 베는 쪽을 향합니다. 말 탄 책사는 가슴 높이에서 부채를 펼쳐 휘두르고, 스킬도 상체를 세운 채 부채를 펼칩니다. 대각선의 적과 싸울 때는 그 상대가 쓰러질 때까지 계속 그쪽을 봅니다. 여포 투구에 붉은 깃 두 가닥이 머리 위로 아치를 그리며 등 뒤로 늘어집니다. 전용 모델을 태운 말의 옆구리가 비치거나 투명해 보이던 것도 고쳤습니다.'],
      ['2026.10.18', '모집 연출 · 효과음', '무장 모집 ‘천명의 전당’에서 석상이 깨지면 무장이 말을 몰아 달려 나옵니다(1회는 카메라 쪽으로, 10회는 천명 무장이 먼저 달려 나온 뒤 모두 전당 가운데로 모임). 연출 곡을 새 곡(약 19초)으로 바꾸고 옥패 깨짐 · 빛 조각 · 석상 깨짐 · 5등급 결과 효과음을 넣었으며, 장비 뽑기도 같은 곡과 효과음을 씁니다. 10회 모집은 넓은 화면이나 휴대폰 세로 화면에서도 석상 10개가 모두 들어옵니다. 연출 중 글자는 모두 없애고 건너뛰기 단추만 남겨, 이름과 등급은 결과 화면에서 봅니다.'],
      ['2026.10.18', '명장 승격 · 강동의 세 여걸', '소교 · 관은병 · 축융 · 대교 · 채문희와 태사자 · 고순 · 황개 · 능통 · 공손찬을 명장(4등급)으로 올리고 스킬을 새로 짰습니다(소교 화선 연무 · 관은병 호녀 돌격 · 축융 화신 비도 · 대교 옥련의 가호 · 채문희 호가십팔박 · 태사자 신정 쌍궁 · 고순 함진영 돌파 · 황개 고육지계 · 능통 필사의 연격 · 공손찬 백마의종). 보유 무장은 레벨 · 성급 그대로 등급과 능력치만 올라갑니다. 대교 · 소교 · 손상향을 함께 편성하면 새 인연 강동의 세 여걸이 적용되어, 강동이교 효과(아군 받는 피해 −8% · 모든 스킬 쿨다운 −0.5초)에 아군 공격 +10%가 더해집니다.'],
      ['2026.10.18', '실시간 채팅', '오른쪽 아래 채팅 버튼으로 전체 · 진영 · 연맹 채널에서 실시간으로 대화할 수 있습니다. 연맹 채널은 연맹 화면의 연맹 채팅과 같은 대화이고, 연맹이 없으면 연맹 화면으로 바로 갈 수 있습니다. 욕설은 가려지고, 2초에 한 번 · 100자까지 보낼 수 있으며, 이름을 누르면 차단 · 신고할 수 있습니다. 게스트 계정은 전체 · 진영 채팅을 읽기만 할 수 있습니다.'],
      ['2026.10.18', '재야 전용 연구', '재야는 쓸모없던 부국 · 제패 분야 대신 재야 전용 약탈 · 유격 분야를 연구합니다. 약탈은 군량 징발 · 재물 수탈 · 야습 행군(하루 약탈 36회) · 장물 거래 등, 유격은 파성추 · 경장 출정 · 척후 정찰(약탈 공성 전투 이점 +8%) · 전리품 포상(약탈마다 옥패 +40) 등입니다. 강병 · 지략 · 인재는 그대로입니다. 부국 ↔ 약탈, 제패 ↔ 유격은 같은 단계끼리 연동되어, 진영을 바꿔도 쌓은 단계가 이어집니다.'],
      ['2026.10.18', '전투 시점 · 편성 · 도감', '전투 화면 오른쪽 아래 시점 단추로 전장 둘레 아홉 자리(기본 · 좌후방 · 우후방 · 조감 · 측면 · 장수 · 좌전방 · 우전방 · 적진)에서 시점을 고릅니다. PC는 V 키로 바꾸고, 고른 시점은 다음 전투에도 이어집니다. 출전 편성 대기 목록에 찾기 칸이 생겨 이름 · 칭호 · 병종 · 스킬 이름, 진영(‘오’), 등급(‘5’)으로 거를 수 있습니다. 무장을 출전 해제해도 다른 무장은 제자리를 지킵니다. 무장 도감은 등급순으로 묶고 등급마다 인원을 보여 줍니다.'],
      ['2026.10.18', '고친 문제', '공성 한 번에 성 전투 기록이 공격 실패와 공격 성공 두 줄로 찍히던 것을 고쳐, 3D 공성전 결과만 한 줄 남깁니다. 채팅 창을 열면 창이 계속 깜빡이던 문제를 고쳤습니다.'],
      ['2026.10.17', '천명 · 여성 무장 3D 모델 · 신규 무장', '천명 무장 16명과 여성 무장 7명이 전용으로 만든 새 3D 모델로 말을 탑니다. 갑옷 · 관 · 수염 · 망토가 모델에 들어가 무장마다 한눈에 구별되고, 전투와 모집 연출에 모두 쓰입니다. 다른 무장은 초상화 얼굴을 3D 얼굴에 입혀 초상화와 더 닮게 했습니다. 새 무장 손상향(오 · 궁병 · 4등급, 궁요희 연사: 3회 연속 사격 + 표식), 소교(오 · 책사 · 3등급, 화선무: 혼란 + 둔화), 관은병(촉 · 기병 · 3등급, 호녀 돌격: 사기 피해 + 갑주 균열)이 모집에 합류했습니다.'],
      ['2026.10.17', '모집 연출 ‘천명의 전당’', '무장 모집과 장비 뽑기 연출이 3D 전당으로 바뀌었습니다. 붉은 기둥과 화로가 선 전당에 석상(무장 모집은 말 탄 무장, 장비 뽑기는 봉인석)이 늘어서고, 금이 퍼지며 등급 색이 드러난 뒤 낮은 등급부터 깨져 실제 무장(장비)이 나타납니다. 천명 무장과 전설 · 신화 장비는 화면이 어두워지며 클로즈업 · 폭발 뒤 이름이 뜹니다. 언제든 건너뛸 수 있고, 설정에서 효과를 줄이면 가벼운 화질로 보여 줍니다.'],
      ['2026.10.17', '유저 연맹', '소통 메뉴에 연맹이 생겼습니다. 같은 진영 지휘관끼리 연맹을 만들고(금화 50개 · 무장 최고 레벨 Lv.15) 가입합니다. 인원은 Lv.1 20명에서 Lv.10 38명까지 늘고, 직위는 연맹장 · 부연맹장(2명) · 정예(5명) · 연맹원입니다. 헌납 · 공성 승리 · 수비전 성공 · 주간 레이드 참여 · 출석으로 기여 포인트와 연맹 경험치가 쌓이고, 연맹 기술 7가지를 연구하면 연맹원 모두에게 적용됩니다. 기여 포인트로 연맹 상점을 쓰고, 매주 공동 공성 목표 도시를 공성하면 성벽 방어도 차감 +10% · 기여 2배입니다. 연맹 채팅 · 게시판이 있고, 천하 랭킹에 연맹 순위가 생겨 매주 월요일 0시에 보상을 줍니다.'],
      ['2026.10.17', '덱 유형 상성 · 영토전 열세 버프', '영토전과 유저 대련에 덱 유형 상성이 생겼습니다. 세 무장의 스킬 구성으로 덱 유형(속공 · 버티기 · 유틸 · 디버프 · 스킬 연계)이 정해지고, 유형마다 두 유형에 강하고 두 유형에 약합니다. 유리하면 주는 피해와 스킬 사기 피해 +12%, 불리하면 −12%입니다. 영토전에는 진영 영향도(차지한 도시의 단계 합)가 생겨, 가장 강한 진영의 50% 미만인 진영은 열세의 노력(영토전 전투 이점 +10% · 성벽 방어도 차감 1.5배), 같은 조건에서 수도만 남으면 구국의 총력전(+20% · 2배)을 받습니다.'],
      ['2026.10.17', '인연 · 장비 수호형 개편', '인연이 없던 무장 44명에게 새 인연 19가지를 만들어 70명 모두가 인연을 갖습니다(여러 개가 맞으면 목록에서 먼저 나오는 하나만 적용). 인연 꼬리표를 누르면 효과 · 구성원이 펼쳐지고, 추천 덱은 인연 효과와 덱 성격을 따져 고릅니다. 초반 끝내기는 속공으로 이름을 바꿨습니다. 장비는 전열을 맡는 수호형이 되어 장판교 일갈(자신 받는 피해 −30% · 반격 15% · 적 공포 4초)과 패시브 만인지적을 씁니다. 혼란에 빠진 무장은 반반 확률로 같은 편을 노립니다. 중립 도시 수비대 평균 레벨이 2배(Lv.20~60)가 되었고, 유저 대련 훈련 상대는 10% 쉬워졌습니다.'],
      ['2026.10.17', '네 번째 진영 재야 · 천하영토 재배치', '진영 선택에 재야(중립 진영)가 생겼습니다. 재야는 본성 없이 어느 도시든 공성해 성벽을 깎고 그 성 하루 생산량의 25%를 약탈합니다(하루 30회). 성벽을 0으로 무너뜨리면 그 성의 건물이 초기화됩니다. 점령 · 내정은 할 수 없고 낙양만 세 진영과 같은 규칙이며, 진영은 30일에 한 번 바꿀 수 있습니다. 천하영토는 수도에서 떨어진 거리로 1~3단계를 다시 나누고, 성도 · 건업과 요충지(장안 · 한중 · 허창 · 수춘 · 강릉 · 양양)를 4단계로 올렸습니다. 새 중립 도시 10곳과 진군로가 생겼고, 신도는 광한으로 이름을 바꿨습니다.'],
      ['2026.10.17', '출석 체크 · 상점 패키지', '접속하면 하루 한 번 출석 보상 창이 뜹니다(한국 시간 자정 기준, 빠진 날이 있어도 다음 날짜로 이어짐). 첫 7일은 조인 · 무장 뽑기 무료 50회 · 장비 뽑기 무료 50회 · 금화 100 · 은전 5만 · 병서 500 · 조운, 이어지는 30일은 옥패 · 자원 · 무료 뽑기 · 금화 · 신화장비 조각 · 낙양 강화석이고 마지막 날 천명 무장 1명입니다. 상점에 패키지 칸이 생겨 신규유저 패키지 4종(천명 무장 1명 · 무장 뽑기 50회 · 장비 뽑기 50회 · 자원 묶음)을 계정당 한 번씩 받을 수 있습니다(출시 전 무료, 출시 후 4,900원 · 9,900원).'],
      ['2026.10.17', '화면 · 편의 · 고친 문제', '메뉴 제목 옆 ‘○○ 설명’ 버튼에서 메뉴 설명과 주요 기능을 봅니다. 무장 도감에서 미영입 무장의 스킬 · 인연도 보입니다. 버프 · 디버프 · 인연 아이콘을 금테 인장 문양으로 바꿨고, 전투에서는 스킬을 쓴 무장 머리 위에 스킬 이름이 뜹니다. 보유 무장에 레벨 초기화(금화 10개, 쓴 은전 · 병서 80% 반환)가 생겼습니다. 아이디를 정한 게스트 계정의 기록 초기화가 듣지 않던 문제와, 튜토리얼 안내에 막혀 출석 창의 받기 버튼이 눌리지 않던 문제를 고쳤습니다.'],
      ['2026.10.16', '시나리오 어려움 · 자동 전투', '보통으로 깬 시나리오 58개를 적 Lv+10 · 별 +1과 특수 규칙 하나(철벽 · 속전 · 짙은 안개 · 화공 금지)로 다시 도전합니다(첫 클리어 보상은 옥패 1.5배 · 은전과 병서 절반 · 자원). 유저 대련을 뺀 모든 전투에서 ‘자동’을 켤 수 있고 다음 전투에도 유지됩니다. 직접 하는 것보다 약합니다(예고 대응 정확도 70% · 스킬은 한 박자 늦게).', '완료', 'jade'],
      ['2026.10.16', '영토 · 내정', '내정 건물 강화에 시간이 걸립니다(10분 · 30분 · 1시간 30분 · 4시간, 도시마다 하나씩, 금화로 즉시 완공 또는 취소). 도시를 점령당하면 그 도시의 건물이 1단계로 돌아갑니다. 최종 세력전 버튼이 잠겨 있으면 남은 조건(성벽 방어도 · 남은 수비병)을 보여 주고, 도시 관리 칸의 버튼이 잘리던 것을 고쳤습니다.', '완료', 'jade'],
      ['2026.10.16', '배경음 · 효과음', '화면마다 곡이 따로 흐릅니다(본영 · 모집 · 천하영토 · 전투 · 대련 · 레이드). 전투에서 이기면 원래 화면의 곡으로 돌아갑니다. 버튼 · 스킬 효과음을 새 녹음으로 바꾸고, 승리 함성, 전투 처음 3초 말발굽과 말 울음을 넣었습니다. 맞을 때 나던 소리와 큰북 · 징 · 뿔나팔, 뽑기 연출 소리는 뺐습니다.', '완료', 'jade'],
      ['2026.10.16', '전투 화면 · 최적화', '한 레인에 명령하면 다른 레인 부대가 그쪽으로 몸을 틉니다. 피해 숫자는 큰 타격에만 띄우고, 전장 배경을 실사풍으로, 기병 병사에게 장도를 쥐여 주었습니다. 다리 떨림과 레이드 2 · 3군 무장 표시를 고쳤고, 3D 모델을 압축해 내려받는 용량을 약 24MB에서 8MB로 줄였습니다. 전투 규칙에 강화 · 약화 효과 설명을 더했습니다.', '완료', 'jade'],
      ['2026.10.16', '계정 · 서버', '게스트도 처음에 아이디를 정하면 서버 계정이 생겨 저장 · 랭킹 · 영토전 · 대련 · 레이드 · 게시판을 회원과 똑같이 씁니다. 보상을 받는 순간 저장이 겹치면 금화 · 신화 재료가 사라질 수 있던 문제를 고쳤습니다.', '완료', 'jade'],
      ['2026.10.15', '무장 · 밸런스', '무장 최고 레벨을 Lv.60으로 정했습니다. 동탁 · 손권 · 조조는 전열을 맡는 수호형, 조운은 통솔형이 되었고, 황개는 주유 · 육손과 짝을 이루는 적벽 탱커가 되었습니다. 이에 맞춰 시나리오 난이도를 다시 맞췄습니다.', '완료', 'jade'],
      ['2026.10.15', '전투 연출', '병사 부대가 무장 뒤에서 함께 싸우고, 선두 무장은 모두 말을 탑니다. 천명 무장은 전용 연출과 실사풍 모습을 갖췄고, 실사 모델에 뼈대 애니메이션을 넣었습니다. 창병 두 손 찌르기, 책사 화염구, 적군 피격 모션을 더하고 맞을 때 떨림과 스킬 때 카메라 확대를 없앴습니다.', '완료', 'jade'],
      ['2026.10.15', '천하영토 · 편성 · 모바일', '천하영토 지도를 4배 해상도로 바꾸고, 칼 표시를 없애고, 건녕–교지 전선을 잇고 신도 위치를 옮겼습니다. 2 · 3군 편성 화면을 1군과 같게 바꾸고, 휴대폰에서 한글 줄바꿈과 부대 배치를 다듬었습니다.', '완료', 'jade'],
      ['2026.10.14', '1 · 2 · 3군 · 주간 레이드', '출전 편성에 1 · 2 · 3군이 생기고, 보유 무장에서 군별로 볼 수 있습니다. 주간 레이드는 세 군이 차례로 보스와 싸워 피해 합계로 순위를 겨룹니다.', '완료', 'jade'],
      ['2026.10.14', '유저 대련', '덱을 저장한 지휘관이 20명 이상이면 전력이 비슷한 실제 유저 덱과 겨룹니다. 스킬 자동 버튼과 난이도별 보상이 생겼고, 신화장비 1개에 필요한 조각은 100개로 바뀌었습니다.', '완료', 'jade'],
      ['2026.10.14', '진형 · 성장 개편', '가운데 자리가 전열이 되고, 무장 유형에 맞는 능력치가 크게 자랍니다. 통솔형 강화, 속도 · 장비 세트 개편, 무장별 추천 덱, 등급 재설정을 했습니다.', '완료', 'jade'],
      ['2026.10.14', '무장 카드 · 뽑기 연출', '무장 사진을 고해상도로 바꾸고 테두리를 등급색으로, 명장 · 천명 카드에 오라를 넣었습니다. 무장 모집 · 장비 뽑기에 연출이 생기고, 장비 뽑기 화면과 장비 보관함 필터를 정리했습니다.', '완료', 'jade'],
      ['2026.10.14', '화면 편의', '휴대폰 가로 화면, 모바일 아래쪽 잘림, 버튼을 눌러도 화면이 튀지 않게 고쳤습니다. 시나리오는 단계별로 진행하고, 로그인 화면 그림을 넣었으며 고레벨 전투 끊김을 고쳤습니다.', '완료', 'jade'],
      ['2026.10.13', '튜토리얼 · 영문판', '처음 들어오면 튜토리얼이 시작되고(첫 전투는 쉽게), 본영에 시작 안내와 바뀐 점 안내가 생겼습니다. 게임 전체를 한국어 또는 영어로 볼 수 있고, 게스트 기록을 초기화할 수 있습니다.', '완료', 'jade'],
      ['2026.10.13', '재화 · 상점 · 임무', '시나리오 보상을 금화 중심으로 바꾸고 금화로 병서를 살 수 있습니다. 명망을 옥패로 이름을 바꾸고 재화 그림을 넣었으며 상점을 개편했습니다. 금화 · 신화 조각 · 낙양 강화석은 서버가 관리하고, 일일 · 주간 임무가 생겼습니다.', '완료', 'jade'],
      ['2026.10.13', '화면 개편', '본영 · 보유 무장 · 무장 도감 · 출전 편성 화면을 새로 짜고, 모든 기기에서 같은 한글 글꼴로 보이게 했습니다. 예고를 잘 받으면 레벨 차를 뒤집을 수 있게 전투 밸런스를 다듬었습니다.', '완료', 'jade'],
      ['2026.10.12', '전투 · 스킬 개편', '적 사기를 무너뜨려 3막을 넘기면 이기는 전투(제한 90초)로 바꿨습니다. 무장 70명에게 고유 스킬 · 3성 패시브 · 5성 각성 · 인연을 주고 황건적 무장 5명이 합류했습니다. 전투 상단 바, 자동 편성 · 장착, 밸런스 테스트 페이지를 더했습니다.', '완료', 'jade'],
      ['2026.10.12', '실사 3D · 메뉴 · 연구', '실사 3D 모델과 전장, 병종별 공격 동작을 넣고 전투 화면을 전면 개편했습니다. 왼쪽 메뉴와 상단바를 새로 꾸미고, 기술 연구를 5분야 6단계로 다시 짰습니다.', '완료', 'jade'],
      ['2026.10.11', '영토 · 보상 조정', '도시 내정 수확과 시나리오 첫 클리어 보상(금화 제외)을 10배로 올리고, 재전투 중복 보상을 막았습니다. 세력전 점령 동기화와 방어도 규칙을 고치고, 상단바에 재화를 실시간으로 보여 줍니다.', '완료', 'jade'],
      ['2026.10.07', '장비 · 상점 · 표기', '신화 장비 특기와 장비 그림을 넣고 상점을 하나로 합쳤습니다. 무장 스킬 설명을 자세히 하고, 화면의 한자 표기를 한글로 바꿨습니다. 유저 대련은 실제 저장 덱과 겨루고, 천하영토의 25개 성을 모두 표시합니다.', '완료', 'jade'],
      ['2026.10.06', '첫 기반', '장비 관리(뽑기 · 장착 · 강화 · 세트 효과)와 신화 상점, 전투 연출, 로그인 화면을 갖췄습니다.', '완료', 'jade'],
    ] as const
    const completedLatestFirst = [...completed].sort((left, right) => right[0].localeCompare(left[0]))
    const completedMarkup = completedLatestFirst.map(([date, title, detail, status, tone]) => `<article class="update-entry"><time>${date}</time><span class="update-mark update-mark--${tone}"></span><div class="update-entry-copy"><div><h3>${title}</h3><span class="update-status update-status--${tone}">${status}</span></div><p>${detail}</p></div></article>`).join('')
    return `<section class="page-section page-section--updates"><div class="section-heading section-heading--compact"><div><span class="eyebrow">소통</span><h1>업데이트 기록</h1><p class="heading-copy">지금까지 반영된 변경사항을 주제별로 요약했습니다.</p></div><div class="updates-summary glass-card"><span>요약 항목</span><strong>${completed.length}<small>건</small></strong><em>최신 적용순</em></div></div><div class="updates-layout updates-layout--single"><div class="glass-card updates-panel"><div class="card-header"><div><span class="eyebrow">배포된 업데이트</span><h2>적용된 업데이트</h2></div><span class="sync-label">최신순</span></div><div class="update-list">${completedMarkup}</div></div></div><div class="updates-footnote"><span class="status-dot"></span><span>적용된 업데이트는 최신 날짜순으로 표시됩니다.</span><span class="muted">현재 버전 · 2026.10</span></div></section>`
  }

  private rankSection(state: StrategyState): string {
    const loggedIn = this.auth.status === 'authenticated'
    const me = this.ranks.find(entry => entry.displayName === this.auth.name)
    return `<section class="page-section page-section--rank"><div class="section-heading section-heading--compact"><div><span class="eyebrow">전투</span><h1>천하 랭킹</h1><p class="heading-copy">전투에서 얻은 전적 점수로 순위를 다툽니다.</p>${this.operatorNote('전적이 순위표에 기록되지 않습니다.')}</div><button class="ghost-button" data-action="rank-refresh">순위 새로고침 ↻</button></div><div class="rank-layout"><div class="glass-card rank-hero"><div class="rank-hero-bg">★</div><span class="pill pill--jade">이번 시즌 전적</span><h2>나의 기록</h2><p>전투에서 이길수록, 높은 별로 이길수록 점수가 오릅니다.<br>로그인하면 순위표에 이름이 올라갑니다.</p><div class="my-record"><span>나의 전적 점수</span><strong>${state.battleScore ? formatNumber(state.battleScore) : '기록 없음'}</strong><small>${state.wins}승${me ? ` · 현재 ${me.rank}위` : loggedIn ? ' · 순위표 밖' : ''}</small></div><div class="auth-status" data-auth-status>${loggedIn ? '로그인 중 · 전적이 순위표에 기록됩니다.' : '로그인하면 순위표에 이름을 올릴 수 있습니다.'}</div></div><div class="glass-card rank-table"><div class="card-header"><div><span class="eyebrow">순위표</span><h3>상위 지휘관</h3></div><span class="sync-label">${this.ranks.length ? `${this.ranks.length}명` : ''}</span></div><div data-rank-list>${this.rankRows()}</div><div class="rank-footnote">* 순위는 들어올 때와 새로고침할 때 서버에서 받아 옵니다.</div></div>${guildRankingCard(this.guildUi)}</div></section>`
  }

  private boardSection(state: StrategyState): string {
    const tabs: BoardPost['board'][] = ['전체', state.faction]
    const posts = this.boardPosts.filter(post => post.board === this.boardTab)
    const formatDate = (value: string | Date) => new Intl.DateTimeFormat(locale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    return `<section class="page-section page-section--board"><div class="section-heading section-heading--compact"><div><span class="eyebrow">소통</span><h1>진영 게시판</h1><p class="heading-copy">전체 지휘관과 ${escapeHtml(state.faction)} 진영 동료에게 작전 소식을 전하십시오.</p></div><button class="ghost-button" data-action="board-refresh">게시글 새로고침 ↻</button></div><div class="board-tabs">${tabs.map(tab => `<button class="filter-tab ${this.boardTab === tab ? 'is-active' : ''}" data-action="board-tab" data-board="${tab}">${tab} 게시판</button>`).join('')}</div><div class="board-layout"><div class="glass-card board-list"><div class="card-header"><div><span class="eyebrow">${this.boardTab} 게시판</span><h2>최근 게시글</h2></div><span class="sync-label">최대 100건</span></div>${posts.length ? posts.map(post => `<article class="board-post"><div class="board-post__meta"><span class="pill pill--jade">${escapeHtml(post.authorFaction)}</span><strong>${ugc(post.authorName)}</strong><time>${formatDate(post.createdAt)}</time></div><h3>${ugc(post.title)}</h3><p>${ugc(post.content).replace(/\n/g, '<br>')}</p>${post.canDelete ? `<form class="board-delete-form" data-board-delete-form><input type="hidden" name="postId" value="${post.id}"><input name="password" type="password" minlength="4" maxlength="64" placeholder="삭제 비밀번호" required><button class="text-button" type="submit">내 글 삭제</button></form>` : ''}</article>`).join('') : '<div class="board-empty">아직 게시글이 없습니다.<br><small>오른쪽 ‘새 글 쓰기’로 첫 소식을 남겨 보십시오.</small></div>'}</div><div class="glass-card board-compose ${this.boardComposeOpen ? 'is-open' : ''}"><div class="card-header"><div><span class="eyebrow">글쓰기</span><h2>새 글 작성</h2></div><button class="text-button board-compose-toggle" data-action="board-compose">${this.boardComposeOpen ? '접기' : '새 글 쓰기 ✎'}</button></div><form data-board-form><label>게시판<select name="board">${tabs.map(tab => `<option value="${tab}" ${this.boardTab === tab ? 'selected' : ''}>${tab} 게시판</option>`).join('')}</select></label><label>제목<input name="title" maxlength="120" placeholder="작전 제목을 입력하세요" required></label><label>내용<textarea name="content" rows="7" maxlength="4000" placeholder="진영에 전할 내용을 작성하세요" required></textarea></label><label>삭제 비밀번호<input name="password" type="password" minlength="4" maxlength="64" placeholder="4자 이상 · 삭제할 때 필요" required></label><button class="action-button action-button--primary" type="submit">게시글 올리기 <span>→</span></button></form><p class="board-note">삭제 비밀번호를 알아야만 글을 지울 수 있습니다.</p></div></div></section>`
  }
  private raidSection(state: StrategyState): string {
    const view = this.raidView
    const info = view.info
    const weekKey = info?.weekKey ?? raidWeekKey()
    const boss = raidBossFor(weekKey)
    const level = info?.bossLevel ?? 30
    const bossDeck = raidBossDeck(level, weekKey)
    const squads = [0, 1, 2].map(index => ({ index, ids: deployedIds(squadIds(state, index)), power: squadPower(state, index) }))
    const ready = squads.filter(squad => squad.ids.length)
    const days = info ? Math.floor(info.resetIn / 86400000) : 0, hours = info ? Math.floor(info.resetIn / 3600000) % 24 : 0
    const left = info?.attemptsLeft ?? 0
    const fmt = (n: number) => formatNumber(Math.round(n))
    const bossCards = bossDeck.map((general, lane) => `<div class="raid-boss__unit" style="--accent:${gradeColor(general)}">${this.portrait(general, 'raid-boss__portrait')}<span>${['좌측', '중앙 · 전열', '우측'][lane]}</span><strong>${escapeHtml(general.name)}</strong><small>Lv.${general.level} · ${'★'.repeat(general.stars)}</small></div>`).join('')
    const squadRows = squads.map(squad => `<li class="${squad.ids.length ? '' : 'is-empty'}"><b>${SQUAD_LABELS[squad.index]}</b><span>${squad.ids.length ? squad.ids.map(id => escapeHtml(state.generals.find(general => general.id === id)?.name ?? '')).join(' · ') : '비어 있음 · 건너뜀'}</span><em>${squad.ids.length ? fmt(squad.power) : '-'}</em></li>`).join('')
    const rewardRows = RAID_REWARDS.map(row => `<tr class="${info && !info.offline && info.rank && info.rank >= row.from && info.rank <= row.to ? 'is-me' : ''}"><td>${row.from === row.to ? `${row.from}위` : row.to === Infinity ? `${row.from}위~` : `${row.from}~${row.to}위`}</td><td>${row.gold ? `금화 ${row.gold}` : `옥패 ${formatNumber(row.honor ?? 0)}`}</td><td>${row.stones ? `낙양 강화석 ${row.stones}` : '-'}</td></tr>`).join('')
    const ranking = info?.offline ? '<div class="rank-empty">연습 모드에서는 순위가 기록되지 않습니다.</div>' : view.ranking.length ? `<ol class="raid-ranking">${view.ranking.map(row => `<li class="${row.isMe ? 'is-me' : ''}"><b>${row.rank}</b><span>${ugc(row.displayName)}${royalBadge(this.guildUi.royal, { name: row.displayName })}${row.guildName ? ` <small class="guild-tag">${ugc(row.guildName)}</small>` : ''}</span><em>${fmt(row.totalDamage)}</em><small>${row.attempts}회</small></li>`).join('')}</ol>` : '<div class="rank-empty">이번 주 기록이 아직 없습니다. 첫 기록의 주인공이 되십시오.</div>'
    const last = info?.lastWeek
    const claim = last ? `<div class="raid-claim glass-card"><div><span class="eyebrow">지난주 결과</span><strong>${last.rank}위 · 피해 ${fmt(last.totalDamage)}</strong><small>보상 · ${[last.reward.gold ? `금화 ${last.reward.gold}` : '', last.reward.stones ? `낙양 강화석 ${last.reward.stones}` : '', last.reward.honor ? `옥패 ${formatNumber(last.reward.honor)}` : ''].filter(Boolean).join(' · ')}</small></div><button class="action-button action-button--primary" data-action="raid-claim" ${last.claimed ? 'disabled' : ''}>${last.claimed ? '받음' : '보상 받기'}</button></div>` : ''
    return `<section class="page-section page-section--raid"><div class="section-heading section-heading--compact"><div><span class="eyebrow">전투</span><h1>주간 레이드</h1><p class="heading-copy">끝없는 병력의 보스에게 1군 → 2군 → 3군이 차례로 90초씩 맞서 준 피해의 합계로 순위를 겨룹니다. 매주 월요일 0시 초기화 · 하루 ${info?.dailyLimit ?? 3}회.</p>${this.operatorNote('레이드 순위와 순위 보상에서 빠집니다.')}</div><button class="ghost-button" data-action="raid-refresh">새로고침 ↻</button></div>
      ${view.message ? `<p class="raid-message">${escapeHtml(view.message)}</p>` : ''}${claim}
      <div class="raid-layout"><div class="raid-main">
        <div class="raid-boss glass-card"><div class="raid-boss__head"><div><span class="pill pill--ember">이번 주 보스 · 무한 병력</span><h2>${escapeHtml(boss.name)}</h2><p>${escapeHtml(boss.desc)} · 보스 Lv.${level}${info && !info.offline ? (info.registered > 20 ? ' (상위 지휘관 평균, 최소 Lv.30)' : ' (기본 레벨)') : ''}</p></div><div class="raid-boss__reset"><small>초기화까지</small><strong>${days}일 ${hours}시간</strong></div></div><div class="raid-boss__units">${bossCards}</div><p class="raid-boss__note">보스의 병력은 줄지 않습니다. 3막 사기를 무너뜨릴 때마다 큰 피해 보너스가 붙고 보스가 사기를 다시 세웁니다. 아군 사기가 낮을수록 아군 공격 · 방어가 떨어지고(사기 0이면 70%), 아군이 전멸하거나 90초가 지나면 그 군의 전투가 끝납니다.</p></div>
        <div class="raid-start glass-card"><div><span class="eyebrow">출전 군</span><ul class="raid-squads">${squadRows}</ul><button class="text-button" data-action="section" data-section="formation">2군·3군 편성하기 →</button></div><div class="raid-start__cta"><strong>오늘 남은 도전 ${left}/${info?.dailyLimit ?? 3}</strong><small>도전을 시작하면 1회가 차감됩니다</small><button class="action-button action-button--primary raid-go" data-action="raid-start" ${left > 0 && ready.length && !view.loading ? '' : 'disabled'}>${ready.length}개 군 출전 <span>⚔</span></button></div></div>
        <div class="raid-me glass-card"><div><small>이번 주 누적 피해</small><strong>${fmt(info?.totalDamage ?? 0)}</strong></div><div><small>${info?.offline ? '연습 최고 기록' : '1회 최고'}</small><strong>${fmt(info?.bestDamage ?? 0)}</strong></div><div><small>내 순위</small><strong>${info?.offline ? '-' : info?.rank ? `${info.rank}위` : '기록 없음'}</strong></div><div><small>참여 지휘관</small><strong>${info?.offline ? '-' : fmt(info?.participants ?? 0)}</strong></div></div>
      </div><div class="raid-side">
        <div class="glass-card raid-rewards"><div class="card-header"><div><span class="eyebrow">주간 보상</span><h3>순위 보상</h3></div><span class="rate-note">월요일 0시 정산 · 다음 주에 받기</span></div><table><tbody>${rewardRows}</tbody></table></div>
        <div class="glass-card"><div class="card-header"><div><span class="eyebrow">이번 주</span><h3>누적 피해 순위</h3></div><span class="rate-note">상위 100명</span></div>${view.loading ? '<div class="rank-empty">불러오는 중…</div>' : ranking}</div>
      </div></div></section>`
  }

  private duelSection(state: StrategyState): string {
    const formationReady = deployedIds(state.formation).length >= 3
    const opponents = this.duelOpponents
    return `<section class="page-section page-section--duel"><div class="section-heading section-heading--compact"><div><span class="eyebrow">전투</span><h1>유저 대련</h1><p class="heading-copy">다른 지휘관이 저장한 덱과 겨룹니다. 이기면 신화장비 조각을 받습니다.</p></div><button class="ghost-button" data-action="duel-refresh">상대 새로고침 ↻</button></div><div class="duel-hero glass-card"><div><span class="pill pill--jade">실시간 대련 · ${formationReady ? '출전 준비 완료' : '편성 필요'}</span><h2>상대 덱을 선택하십시오</h2><p>${opponents.some(opponent => !opponent.isDummy) ? '내 덱 전력과 비슷한 지휘관이 저장한 출전 덱과 겨룹니다.' : '덱을 저장한 지휘관이 20명이 될 때까지는 내 덱 전력에 맞춘 훈련 상대와 겨룹니다.'}${this.duelMyPower ? ` <b>내 덱 전력 ${formatNumber(this.duelMyPower)}</b>` : ''}</p><div class="duel-daily-limit"><strong>오늘 남은 대련 ${duelAttemptsRemaining(state)}회</strong><span>매일 5회 · 승리 시 신화장비 조각 쉬움 +1 · 보통 +2 · 어려움 +3 (신화장비 1개 = 조각 ${MYTHIC_FRAGMENT_COST}개)</span></div></div><div class="duel-hero-mark">⚔</div></div><div class="duel-list">${opponents.length ? '' : '<div class="rank-empty">상대를 찾는 중입니다…</div>'}${opponents.map((opponent, index) => `<article class="duel-opponent glass-card ${opponent.isDummy ? 'is-dummy' : ''}"><div class="duel-rank">${String(index + 1).padStart(2, '0')}</div><div class="duel-avatar">${escapeHtml(opponent.displayName.slice(0, 1))}</div><div class="duel-opponent-copy"><strong>${ugc(opponent.displayName)}${royalBadge(this.guildUi.royal, { name: opponent.displayName })}${opponent.guildName ? ` <small class="guild-tag">${ugc(opponent.guildName)}</small>` : ''}</strong><span>${opponent.isDummy ? `훈련 상대 · ${escapeHtml(opponent.note ?? '')}` : `지휘관 · 전력 ${formatNumber(opponent.power ?? 0)}${this.duelMyPower && opponent.power ? ` (내 덱 대비 ${opponent.power >= this.duelMyPower ? '+' : '−'}${Math.round(Math.abs(opponent.power / this.duelMyPower - 1) * 100)}%)` : ''} · 전적 점수 ${formatNumber(opponent.score)}`}</span></div>${this.duelStyleBadge(state, opponent)}<span class="duel-reward duel-reward--${opponent.tier ?? 'normal'}">${{ easy: '쉬움', normal: '보통', hard: '어려움' }[opponent.tier ?? 'normal']} · 조각 +${{ easy: 1, normal: 2, hard: 3 }[opponent.tier ?? 'normal']}</span><button class="action-button action-button--primary" data-action="duel-start" data-opponent-id="${escapeHtml(opponent.id)}">대련 신청 <span>→</span></button></article>`).join('')}</div></section>`
  }

  private rankRows(): string {
    const rows = this.ranks
    if (!rows.length) return '<div class="rank-empty">아직 순위 기록이 없습니다.<br><small>로그인한 지휘관이 전투를 치르면 이곳에 순위가 표시됩니다.</small></div>'
    return rows.map(entry => `<div class="rank-row"><span class="rank-number rank-number--${entry.rank}">${entry.rank.toString().padStart(2, '0')}</span><span class="rank-avatar">${entry.displayName.slice(0, 1)}</span><strong>${entry.displayName}${royalBadge(this.guildUi.royal, { name: entry.displayName })}</strong><span class="rank-score">${formatNumber(entry.score)}</span></div>`).join('')
  }

  private miniGeneral(general: General): string {
    return `<div class="mini-general">${this.portrait(general)}<div><strong>${general.name}</strong><small>Lv.${general.level} · ${general.role}</small></div><b>${general.stars}★</b></div>`
  }

  /** 누를 때 소리: 메뉴·탭은 현 한 번, 그 밖은 나무 딱. 뽑기는 연출이 따로 소리를 낸다 */
  private clickSound(action: string | undefined, button: HTMLElement): void {
    if (!action || button.hasAttribute('disabled')) return
    if (['recruit', 'equipment-draw', 'extra-equipment-draw', 'reroll-recruit', 'sound-toggle'].includes(action)) return
    const tab = action === 'section' || action === 'nav-more' || action === 'roster-jump' || action === 'scenario-select' || /-(tab|filter)$/.test(action)
    sound.play(tab ? 'tab' : 'click')
  }

  private handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement
    const button = target.closest<HTMLElement>('[data-action]')
    // ‘더보기’를 펼친 채 다른 곳을 누르면 닫는다
    const openMore = this.root.querySelector('.sidebar.is-more-open')
    if (openMore && !target.closest('.sidebar')) openMore.classList.remove('is-more-open')
    if (!button) return
    // 선택 상자는 클릭으로 다시 그리지 않는다(열린 목록이 닫힘) · 값 변경은 change 이벤트에서
    if (button instanceof HTMLSelectElement) return
    const action = button.dataset.action
    this.clickSound(action, button)
    if (button.dataset.opponentId) {
      this.callbacks.onDuelStart(button.dataset.opponentId)
      return
    }
    if (action === 'lobby-panel') { this.lobbyPanel = button.dataset.panel === 'missions' ? 'missions' : null; if (this.renderedState) this.render(this.renderedState); return }
    if (action === 'lobby-panel-close') { this.lobbyPanel = null; if (this.renderedState) this.render(this.renderedState); return }
    if (action === 'scroll-missions') {
      // 같은 화면(본영)의 임무 칸으로 내려가 받을 수 있는 보상을 깜빡여 보여 준다
      const card = this.root.querySelector<HTMLElement>('.mission-card')
      card?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      card?.querySelectorAll<HTMLElement>('[data-action="mission-claim"]:not([disabled])').forEach(item => { item.classList.remove('is-flash'); void item.offsetWidth; item.classList.add('is-flash') })
      return
    }
    if (action?.startsWith('guild-')) { if (button.tagName !== 'SELECT') this.guildClick(action, button); return }
    if (action === 'nav-more') { this.root.querySelector('.sidebar')?.classList.toggle('is-more-open'); return }
    if (action === 'section') { this.root.querySelector('.sidebar')?.classList.remove('is-more-open') }
    if (action === 'section') { if (button.dataset.scenarioId) { this.scenarioSelectedId = button.dataset.scenarioId; this.scenarioPicked = true; this.scenarioDifficulty = 'normal' } this.callbacks.onSection((button.dataset.section ?? 'overview') as Section) }
    else if (action === 'summon-tab') {
      this.summonTab = button.dataset.summonTab === 'equipment' ? 'equipment' : 'generals'
      if (this.renderedState) this.render(this.renderedState)
    }
    else if (action === 'recruit') this.callbacks.onRecruit(Number(button.dataset.count ?? 1))
    else if (action === 'upgrade') this.callbacks.onUpgrade(button.dataset.id ?? '')
    else if (action === 'skill') this.callbacks.onSkill(button.dataset.id ?? '')
    else if (action === 'formation') {
      const id = button.dataset.id ?? ''
      const state = this.renderedState
      // 3명이 모두 출전 중이면 누구와 바꿀지 고르게 한다
      if (state && !state.formation.includes(id) && deployedIds(state.formation).length >= 3) this.openSlotPicker(state, id)
      else this.callbacks.onFormation(id)
    }
    else if (action === 'upgrade-many') this.callbacks.onUpgradeMany(button.dataset.id ?? '')
    else if (action === 'level-reset') {
      const general = this.renderedState?.generals.find(item => item.id === button.dataset.id)
      if (!general || !this.renderedState) return
      const refund = levelResetRefund(this.renderedState, general)
      if (window.confirm(tr(`${general.name}을(를) Lv.${general.level}에서 Lv.1로 되돌립니다.\n금화 ${LEVEL_RESET_GOLD}개를 쓰고 은전 ${formatNumber(refund.silver)} · 병서 ${formatNumber(refund.manuals)}(레벨에 쓴 재화의 80%)를 돌려받습니다.\n성급 · 장비 · 스킬 해금은 그대로입니다. 계속하시겠습니까?`))) this.callbacks.onLevelReset(general.id)
    }
    else if (action === 'equipment-more') this.equipmentMoreOpen = !(button.closest('details') as HTMLDetailsElement | null)?.open
    else if (action === 'equipment-filter-more') this.equipmentFilterOpen = !(button.closest('details') as HTMLDetailsElement | null)?.open
    else if (action === 'equipment-type-tab') {
      this.equipmentFilter.type = button.dataset.type ?? 'all'
      this.equipmentScrollTop = 0
      if (this.renderedState) this.render(this.renderedState)
    }
    else if (action === 'equip-general') { this.callbacks.onEquipmentSelectGeneral(button.dataset.id ?? ''); this.callbacks.onSection('equipment') }
    else if (action === 'board-compose') { this.boardComposeOpen = !this.boardComposeOpen; if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'codex-filter') { this.codexFilter = (button.dataset.filter ?? 'all') as typeof this.codexFilter; if (this.renderedState) this.render(this.renderedState); this.applyCodexSearch() }
    else if (action === 'roster-filter') { this.rosterFilter = (button.dataset.filter ?? 'all') as typeof this.rosterFilter; if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'auto-formation') this.callbacks.onAutoFormation(button.dataset.withEquipment === '1')
    else if (action === 'auto-equip') this.callbacks.onAutoEquip()
    else if (action === 'equipment-draw') this.callbacks.onEquipmentDraw(Number(button.dataset.count ?? 1))
    else if (action === 'equipment-enhance') this.callbacks.onEquipmentEnhance(button.dataset.equipmentId ?? '')
    else if (action === 'equipment-equip') {
      const state = this.renderedState
      const generalId = button.dataset.generalId ?? '', itemId = button.dataset.equipmentId ?? ''
      const ownerId = this.equipmentOwnerIds.get(itemId)
      const ownerSquad = state && ownerId && ownerId !== generalId ? squadOf(state, ownerId) : -1
      const item = state?.equipmentInventory.find(candidate => candidate.id === itemId)
      // 1 · 2 · 3군에 선 무장의 장비를 가져올 때는 한 번 묻는다(대기 무장 것은 바로 가져온다)
      if (state && item && ownerId && ownerSquad >= 0) {
        const ownerName = state.generals.find(general => general.id === ownerId)?.name ?? '다른 무장'
        const myName = state.generals.find(general => general.id === generalId)?.name ?? '이 무장'
        this.confirmPurchase(`${item.name} 가져오기`, `${SQUAD_LABELS[ownerSquad]} ${ownerName}의 장비입니다. ${myName}에게 옮기면 ${ownerName}의 ${EQUIPMENT_TYPE_META[item.type].label} 칸이 빕니다.`, () => this.callbacks.onEquipmentEquip(generalId, itemId), { eyebrow: '장비 옮기기', ok: '가져오기' })
      } else this.callbacks.onEquipmentEquip(generalId, itemId)
    }
    else if (action === 'equipment-unequip') this.callbacks.onEquipmentUnequip(button.dataset.generalId ?? '', (button.dataset.equipmentType ?? 'weapon') as EquipmentType)
    else if (action === 'equipment-lock') this.callbacks.onEquipmentLock(button.dataset.equipmentId ?? '')
    else if (action === 'raid-start') this.callbacks.onRaidStart()
    else if (action === 'raid-refresh') this.callbacks.onRaidRefresh()
    else if (action === 'raid-claim') this.callbacks.onRaidClaim()
    else if (action === 'roster-jump') this.root.querySelector(`#roster-squad-${button.dataset.squad ?? '0'}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (action === 'squad-tab') { this.formationSquad = Math.max(0, Math.min(2, Number(button.dataset.squad ?? 0))); if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'squad-toggle') this.callbacks.onSquadToggle(Number(button.dataset.squad ?? 1), button.dataset.id ?? '')
    else if (action === 'squad-auto') this.callbacks.onSquadAuto(Number(button.dataset.squad ?? 1), button.dataset.withEquipment === '1')
    else if (action === 'squad-equip') this.callbacks.onSquadEquip(Number(button.dataset.squad ?? 1))
    else if (action === 'squad-swap') this.callbacks.onSquadSwap(Number(button.dataset.squad ?? 1))
    else if (action === 'equipment-preset') this.callbacks.onEquipmentPreset(button.dataset.generalId ?? '', Number(button.dataset.slot ?? 0), button.dataset.mode === 'save' ? 'save' : 'apply')
    else if (action === 'equipment-dismantle') {
      const state = this.renderedState
      const item = state?.equipmentInventory.find(candidate => candidate.id === button.dataset.equipmentId)
      if (state && item) {
        const free = dismantlableCount(state, item)
        const gain = dismantleYield(item)
        const preset = presetItemIds(state).has(item.id) ? ' · 프리셋에 저장한 장비입니다(분해하면 프리셋에서 빠집니다)' : ''
        const refund = `${item.level > 1 ? ` · 강화 Lv.${item.level} (강화 비용의 50% 환급)` : ''}${preset} · 되돌릴 수 없습니다`
        const one = `1개당 옥패 +${formatNumber(gain.honor)} · 철 +${formatNumber(gain.iron)}${gain.silver ? ` · 은전 +${formatNumber(gain.silver)}` : ''}`
        // 여러 개면 1개만 / 전부 중에서 고른다
        if (free > 1) this.confirmPurchase(`${EQUIPMENT_GRADE_META[item.grade].label} ${item.name} 분해 (보관 ${free}개)`, `${one}${refund}`, () => this.callbacks.onEquipmentDismantle(item.id, free), { eyebrow: '분해 확인', ok: `${free}개 모두 분해`, alt: { label: '1개만 분해', onClick: () => this.callbacks.onEquipmentDismantle(item.id, 1) } })
        else if (free === 1) this.confirmPurchase(`${EQUIPMENT_GRADE_META[item.grade].label} ${item.name} 분해`, `${one.replace('1개당 ', '')}${refund}`, () => this.callbacks.onEquipmentDismantle(item.id, 1), { eyebrow: '분해 확인', ok: '분해' })
      }
    }
    else if (action === 'equipment-bulk-dismantle') {
      const state = this.renderedState
      const grade = (button.dataset.grade === 'rare' ? 'rare' : 'normal') as 'normal' | 'rare'
      if (state) {
        const preview = bulkDismantlePreview(state, grade)
        this.confirmPurchase(`${EQUIPMENT_GRADE_META[grade].label}${grade === 'normal' ? '' : ' 이하'} 장비 ${formatNumber(preview.count)}개 일괄 분해`, `옥패 +${formatNumber(preview.honor)} · 철 +${formatNumber(preview.iron)} · 잠금 · 장착 · 강화 · 프리셋에 저장한 장비는 남깁니다 · 되돌릴 수 없습니다`, () => this.callbacks.onEquipmentBulkDismantle(grade), { eyebrow: '분해 확인', ok: '일괄 분해' })
      }
    }
    // 정렬 선택(select)은 change 이벤트에서만 처리한다: 클릭 때 다시 그리면 목록이 바로 닫혀 고를 수 없었다
    else if (action === 'roster-sort-direction') {
      this.rosterSortDescending = !this.rosterSortDescending
      if (this.renderedState) this.render(this.renderedState)
    } else if (action === 'combo-anchor') {
      this.comboAnchorId = button.dataset.id ?? null
      if (this.renderedState) this.render(this.renderedState)
    } else if (action === 'apply-combo') {
      this.callbacks.onApplyCombo((button.dataset.ids ?? '').split(',').filter(Boolean), Number(button.dataset.squad ?? 0))
    } else if (action === 'formation-sort-direction') {
      this.formationSortDescending = !this.formationSortDescending
      if (this.renderedState) this.render(this.renderedState)
    } else if (action === 'equipment-sort-direction') {
      this.equipmentSortDescending = !this.equipmentSortDescending
      if (this.renderedState) this.render(this.renderedState)
    }
    else if (action === 'city-select') {
      const cityId = button.dataset.city ?? ''
      this.citySheetOpen = true
      this.callbacks.onCitySelect(cityId)
      this.callbacks.onCityDamageRankingRefresh(cityId)
    }
    else if (action === 'city-find') {
      const id = button.dataset.city ?? ''
      this.citySheetOpen = true
      this.territoryMap.queueFocus(id)
      if (this.territoryMap.fullscreen) this.territoryMap.setFullscreen(false)
      this.callbacks.onCitySelect(id)
      this.callbacks.onCityDamageRankingRefresh(id)
      this.root.querySelector('[data-map-viewport]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    else if (action === 'city-filter') { this.cityFilter = (button.dataset.filter as CityFilter) || 'all'; this.applyCityFinder() }
    else if (action === 'city-sheet-close') {
      this.citySheetOpen = false
      this.root.querySelector('.page-section--territory')?.classList.remove('is-sheet-open')
    }
    else if (action === 'territory-refresh') this.callbacks.onTerritoryRefresh()
    else if (action === 'conquer') this.callbacks.onConquest(button.dataset.city ?? '')
    else if (action === 'defense') this.callbacks.onDefense(button.dataset.city ?? '')
    else if (action === 'garrison-deploy') this.callbacks.onGarrisonDeploy(button.dataset.city ?? '')
    else if (action === 'faction-battle') this.callbacks.onFactionBattle(button.dataset.city ?? '')
    else if (action === 'collect-income') this.callbacks.onCollectIncome()
    else if (action === 'territory-rules') this.showTerritoryRules()
    else if (action === 'season-guide') { if (this.renderedState) this.showSeasonGuide(this.renderedState) }
    else if (action === 'menu-guide') this.showMenuGuide()
    else if (action === 'building-upgrade') this.callbacks.onBuildingUpgrade(button.dataset.city ?? '', button.dataset.building ?? '')
    else if (action === 'building-rush') this.callbacks.onBuildingRush(button.dataset.city ?? '')
    else if (action === 'building-cancel') this.callbacks.onBuildingCancel(button.dataset.city ?? '')
    else if (action === 'research') this.callbacks.onResearch(button.dataset.research ?? '')
    else if (action === 'battle-guide') this.callbacks.onBattleGuide()
    else if (action === 'coach-reset') this.callbacks.onCoachReset()
    else if (action === 'attendance-open') {
      const count = Math.min(ATTENDANCE_REWARDS.length, this.renderedState?.missions?.attendance?.count ?? 0)
      this.showAttendance(count, count ? `출석 ${count}일째 · 보상을 받았습니다` : '접속하면 출석 보상을 받습니다')
    }
    else if (action === 'stat-info') {
      const key = button.dataset.stat as keyof typeof STAT_INFO
      const info = STAT_INFO[key]
      const box = button.parentElement?.querySelector<HTMLElement>('[data-stat-info]')
      if (!info || !box) return
      const same = box.dataset.stat === key && !box.hidden
      button.parentElement?.querySelectorAll('[data-action="stat-info"]').forEach(row => row.classList.toggle('is-open', !same && row === button))
      box.hidden = same
      box.dataset.stat = key
      box.innerHTML = `<b>${escapeHtml(tr(info.title))}</b> ${escapeHtml(tr(info.body))}`
    }
    else if (action === 'bond-info') {
      const bond = BONDS.find(item => item.id === button.dataset.bond)
      const box = button.closest('.skill-fx')?.querySelector<HTMLElement>('[data-effect-info]')
      if (!bond || !box) return
      const same = box.dataset.effect === bond.id && !box.hidden
      button.closest('.skill-fx')?.querySelectorAll('.skill-fx-chip').forEach(chip => chip.classList.toggle('is-open', !same && chip === button))
      box.hidden = same
      box.dataset.effect = bond.id
      box.className = 'skill-fx-info is-bond'
      const owned = new Set(this.renderedState?.generals.map(item => item.id) ?? [])
      const formation = new Set(this.renderedState?.formation ?? [])
      const members = bond.members.map(id => { const name = templateGeneral(id)?.name ?? id; return `<span class="bond-member ${formation.has(id) ? 'is-deployed' : owned.has(id) ? 'is-owned' : ''}">${escapeHtml(tr(name))}</span>` }).join('')
      const count = bond.members.filter(id => formation.has(id)).length
      box.innerHTML = `<b class="fx-title">${fxSeal('bond', 'bond')}${escapeHtml(tr(bond.name))}</b> <span>${tr(`출전 무장 중 ${bond.need}명 이상`)} · ${tr('지금')} ${count}/${bond.need}</span><br><em class="bond-state ${bondActive(bond, formation) ? 'is-on' : 'is-off'}">${bondActive(bond, formation) ? tr('발동 중') : `${tr('미발동')} · ${bond.need - count}${tr('명 더 출전하면 발동')}`}</em><br>${escapeHtml(tr(bond.desc))}<div class="bond-members">${members}</div><small class="bond-note">${tr('인연은 한 번에 하나만 적용되며, 여러 개가 성립하면 먼저 정해진 인연이 우선합니다. 금색은 출전 중, 밝은 글자는 보유 중인 무장입니다.')}</small>`
    }
    else if (action === 'effect-info') {
      const effect = BATTLE_EFFECTS[button.dataset.effect as BattleEffectId]
      const box = button.closest('.skill-fx')?.querySelector<HTMLElement>('[data-effect-info]')
      if (!effect || !box) return
      const same = box.dataset.effect === effect.id && !box.hidden
      button.closest('.skill-fx')?.querySelectorAll('.skill-fx-chip').forEach(chip => chip.classList.toggle('is-open', !same && chip === button))
      box.hidden = same
      box.dataset.effect = effect.id
      box.className = `skill-fx-info is-${effect.kind}`
      box.innerHTML = `<b class="fx-title">${fxSeal(effect.id, effect.kind)}${escapeHtml(tr(effect.name))}</b> <span>${tr(effect.kind === 'buff' ? '버프 · 아군에게' : '디버프 · 적에게')} · ${button.dataset.sec ?? effect.duration}${tr('초')}${button.dataset.awaken ? ` · ${tr('5성 각성 시')}` : ''}</span><br>${escapeHtml(tr(effect.description))}`
    }
    else if (action === 'guest-reset') { if (window.confirm(tr(this.account ? '이 게스트 아이디와 진행 기록을 서버에서 모두 지웁니다. 다시 들어오면 새 아이디를 정합니다. 되돌릴 수 없습니다. 계속하시겠습니까?' : '이 기기의 게스트 진행 기록을 모두 지웁니다(이 기기의 게스트 아이디가 있으면 그 아이디와 서버 기록 포함). 되돌릴 수 없습니다. 계속하시겠습니까?'))) this.callbacks.onGuestReset() }
    else if (action === 'set-lang') setLang(button.dataset.value === 'en' ? 'en' : 'ko')
    else if (action === 'setting-quality') { setQualitySetting((button.dataset.value ?? 'auto') as QualitySetting); this.notify('그래픽 품질을 바꿨습니다. 새로고침하면 적용됩니다.', 'jade'); if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'setting-music') { setMusicSetting((button.dataset.value ?? 'mid') as SoundLevel); if (muteSetting()) setMuteSetting(false); sound.unlock(); sound.applyVolumes(); if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'setting-sfx') { setSfxSetting((button.dataset.value ?? 'mid') as SoundLevel); if (muteSetting()) setMuteSetting(false); sound.unlock(); sound.applyVolumes(); sound.play('success'); if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'sound-toggle') { setMuteSetting(!muteSetting()); sound.unlock(); sound.applyVolumes(); if (!muteSetting()) sound.play('tab'); if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'setting-effects') { setEffectsSetting((button.dataset.value ?? 'auto') as EffectsSetting); this.callbacks.onEffectsSetting?.(); if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'mission-claim') this.callbacks.onMissionClaim(button.dataset.mission ?? '')
    else if (action === 'tutorial-claim') this.callbacks.onTutorial(false)
    else if (action === 'tutorial-skip') this.callbacks.onTutorial(true)
    else if (action === 'research-cancel') this.callbacks.onResearchCancel()
    else if (action === 'research-rush') this.callbacks.onResearchRush()
    else if (action === 'scenario-select') { if (!button.dataset.scenarioId) return; this.scenarioSelectedId = button.dataset.scenarioId; this.scenarioPicked = true; if (this.renderedState) this.render(this.renderedState); this.root.querySelector('.scenario-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
    else if (action === 'scenario-list-toggle') { event.preventDefault(); this.scenarioListOpen = !this.scenarioListOpen; if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'scenario-start') this.callbacks.onScenarioStart(button.dataset.scenarioId ?? '', button.dataset.difficulty === 'hard' ? 'hard' : 'normal')
    else if (action === 'scenario-difficulty') { this.scenarioDifficulty = button.dataset.difficulty === 'hard' ? 'hard' : 'normal'; this.scenarioPicked = false; this.scenarioSelectedId = ''; if (this.renderedState) this.render(this.renderedState) }
    else if (action === 'battle-start') this.callbacks.onBattleStart()
    else if (action === 'battle-unit' || action === 'move') { if (Date.now() >= this.suppressMoveUntil) this.callbacks.onBattleMove(Number(button.dataset.index ?? 0)) }
    else if (action === 'battle-skill') {
      // 누른 즉시 보이는 반응(발동 여부는 컷인 · 효과로 이어진다)
      button.classList.remove('is-fired'); void button.offsetWidth; button.classList.add('is-fired')
      this.callbacks.onBattleSkill(button.dataset.index === undefined ? undefined : Number(button.dataset.index))
    }
    else if (action === 'battle-view') this.toggleBattleViewPicker(button)
    else if (action === 'battle-speed') { const speed = this.latestBattle?.speed ?? 1; this.callbacks.onBattleSpeed(speed >= this.maxBattleSpeed ? 1 : speed + 1) }
    else if (action === 'battle-pause') this.callbacks.onBattlePause(!this.latestBattle?.paused)
    else if (action === 'battle-stop') {
      // 실수로 누르는 것을 막기 위해 3초 안에 한 번 더 눌러야 중지한다.
      if (Date.now() < this.stopConfirmUntil) { this.stopConfirmUntil = 0; this.callbacks.onBattleStop() }
      else { this.stopConfirmUntil = Date.now() + 3000; button.textContent = '한 번 더 누르면 중지'; button.classList.add('is-confirm'); window.setTimeout(() => { button.classList.remove('is-confirm'); if (Date.now() >= this.stopConfirmUntil) button.textContent = '■ 전투 중지' }, 3050) }
    }
    else if (action === 'battle-auto') this.callbacks.onBattleAuto(!this.latestBattle?.autoPlay)
    else if (action === 'battle-auto-skill') this.callbacks.onBattleAutoSkill(!this.latestBattle?.autoSkill)
    else if (action === 'battle-log') { this.battleLogOpen = !this.battleLogOpen; button.textContent = this.battleLogOpen ? '접기' : '전체 기록'; const log = this.root.querySelector<HTMLElement>('[data-bt-log]'); if (log) log.dataset.html = ''; if (this.latestBattle) this.updateBattle(this.latestBattle) }
    else if (action === 'battle-tactic') this.callbacks.onBattleTactic((button.dataset.tactic ?? 'guard') as 'guard' | 'feint' | 'charge')
    else if (action === 'duel-refresh') this.callbacks.onDuelRefresh()
    else if (action === 'duel-start') this.callbacks.onDuelStart(button.dataset.opponentId ?? '')
    else if (action === 'faction-select' && (button.dataset.faction === 'auto' || button.dataset.faction === '재야')) this.callbacks.onFactionSelect(button.dataset.faction)
    else if (action === 'faction-change') {
      const next = button.dataset.faction
      if ((next !== 'realm' && next !== '재야') || !this.renderedState) return
      const text = next === '재야' ? `${this.renderedState.faction}에서 재야(중립 진영)로 옮깁니다. 연맹에서는 나가게 되고, 진영은 30일에 한 번만 바꿀 수 있습니다. 계속하시겠습니까?` : '재야에서 삼국 진영으로 돌아갑니다. 위 · 촉 · 오 가운데 지금 가장 약한 진영에 배정됩니다. 진영은 30일에 한 번만 바꿀 수 있습니다. 계속하시겠습니까?'
      if (window.confirm(tr(text))) this.callbacks.onFactionChange(next === '재야' ? '재야' : 'realm')
    }
    else if (action === 'guest-login') this.callbacks.onGuestLogin()
    else if (action === 'login') this.callbacks.onLogin()
    else if (action === 'logout') this.callbacks.onLogout()
    else if (action === 'account-refresh') this.callbacks.onAccountRefresh()
    else if (action === 'rank-refresh') this.callbacks.onRankRefresh()
    else if (action === 'board-refresh') this.callbacks.onBoardRefresh((button.dataset.board ?? this.boardTab) as BoardPost['board'])
    else if (action === 'board-tab') this.callbacks.onBoardRefresh((button.dataset.board ?? '전체') as BoardPost['board'])
    else if (action === 'store') this.callbacks.onStore()
    else if (action === 'shop-purchase') {
      const id = button.dataset.equipmentId ?? 'shop-mythic-martial-weapon'
      const remain = (this.renderedState?.mythicFragments ?? 0) - MYTHIC_FRAGMENT_COST
      this.confirmPurchase(`${button.dataset.label ?? '신화장비'} 교환`, `신화 조각 ${MYTHIC_FRAGMENT_COST}개를 씁니다 · 교환 후 ${Math.max(0, remain)}개 남음`, () => this.callbacks.onShopPurchase(id))
    }
    else if (action === 'cash-shop-purchase' || action === 'honor-shop-purchase') {
      const cost = Number(button.dataset.cost ?? 0)
      const buy = () => action === 'cash-shop-purchase' ? this.callbacks.onCashShopPurchase(button.dataset.productId ?? '') : this.callbacks.onHonorShopPurchase(button.dataset.packageId ?? '')
      if (cost >= 20) this.confirmPurchase(`금화 ${cost}개 → ${button.dataset.label ?? ''}`, `구매 후 금화 ${Math.max(0, (this.renderedState?.gold ?? 0) - cost)}개 남음`, buy)
      else buy()
    }
    else if (action === 'starter-pack') {
      const id = button.dataset.packId ?? ''
      const price = button.dataset.price
      this.confirmPurchase(`${button.dataset.label ?? '패키지'} ${price ? '구매' : '받기'}`, price ? `${price} · 계정당 한 번만 살 수 있습니다` : '정식 출시 전 무료 · 계정당 한 번만 받을 수 있습니다', () => this.callbacks.onStarterPack(id))
    }
    else if (action === 'gold-purchase') this.callbacks.onGoldPurchase(button.dataset.packageId ?? '')
    else if (action === 'pass-buy') {
      const id = button.dataset.passId ?? ''
      const price = button.dataset.price
      this.confirmPurchase(`${button.dataset.label ?? '정액권'} ${price ? '구매' : '무료 체험'}`, price ? `${price} · 남은 기간이 있으면 이어서 연장됩니다` : '정식 출시 전 무료 · 정액권마다 한 번만 받을 수 있습니다', () => this.callbacks.onPassBuy(id))
    }
    else if (action === 'shop-tab') {
      this.shopTab = button.dataset.shopTab === 'mythic' ? 'mythic' : button.dataset.shopTab === 'resources' ? 'resources' : button.dataset.shopTab === 'packages' ? 'packages' : button.dataset.shopTab === 'passes' ? 'passes' : 'gold'
      if (this.renderedState) this.render(this.renderedState)
    }
    else if (action === 'admin-deck-style') {
      const key = button.dataset.deckStyle as Archetype | 'all' | undefined
      this.adminDeckStyle = key && (key === 'all' || ARCHETYPES.includes(key)) ? key : 'all'
      if (this.renderedState) this.render(this.renderedState)
    }
    else if (action === 'admin-tab') {
      this.adminTab = button.dataset.adminTab ?? 'overview'
      if (['guilds', 'territory', 'season'].includes(this.adminTab)) this.callbacks.onGuild('admin-load', {})
      if (this.adminTab === 'bots') this.callbacks.onGuild('admin-bots', {})
      this.callbacks.onAdminAction(`관리자 탭을 ‘${button.textContent?.trim() ?? '운영 개요'}’로 전환했습니다.`)
    } else if (action === 'admin-toggle-publish') {
      this.adminPublished = !this.adminPublished
      this.callbacks.onAdminAction(this.adminPublished ? '시즌 01 게시를 재개했습니다. (로컬 미리보기)' : '시즌 01을 비공개 상태로 전환했습니다. (로컬 미리보기)')
    } else if (action === 'admin-announce') {
      this.callbacks.onAdminAction('운영 공지 미리보기를 표시했습니다.')
    } else if (action === 'admin-refresh') {
      this.callbacks.onAdminAction('서비스 상태를 새로고침했습니다.')
    } else if (action === 'admin-accounts-refresh') {
      this.callbacks.onAdminAccountsRefresh(this.adminAccountSearch)
    } else if (action === 'admin-account-search') {
      const input = this.root.querySelector<HTMLInputElement>('[data-admin-account-search]')
      this.adminAccountSearch = input?.value.trim() ?? ''
      this.callbacks.onAdminAccountsRefresh(this.adminAccountSearch)
    } else if (action === 'admin-game-refresh') {
      this.callbacks.onAdminGameDataRefresh()
    } else if (action === 'admin-board-refresh') {
      this.callbacks.onAdminBoardRefresh()
    } else if (action === 'admin-board-posting') {
      this.callbacks.onAdminBoardPostingToggle(button.dataset.enabled === 'true')
    } else if (action === 'admin-board-delete') {
      const id = Number(button.dataset.postId ?? 0)
      if (id && window.confirm(tr('이 게시글을 관리자 권한으로 삭제하시겠습니까?'))) this.callbacks.onAdminBoardDelete(id)
    } else if (action === 'admin-game-search') {
      this.adminGameSearch = this.root.querySelector<HTMLInputElement>('[data-admin-game-search]')?.value.trim() ?? ''
      if (this.renderedState) this.render(this.renderedState)
    } else if (action === 'admin-game-reset') {
      button.closest<HTMLElement>('[data-game-user]')?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-game-field]').forEach(input => { input.value = input.dataset.original ?? input.value; input.classList.remove('is-changed') })
    } else if (action === 'admin-game-save') {
      const row = button.closest<HTMLElement>('[data-game-user]')
      const userId = Number(button.dataset.accountId)
      const edit: AdminGameEdit = { userId }
      let bad = ''
      row?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-game-field]').forEach(input => {
        const field = input.dataset.gameField ?? ''
        if (input.value === input.dataset.original) return
        if (field === 'faction') { edit.faction = input.value as AdminGameEdit['faction']; return }
        const value = Number(input.value)
        if (!Number.isInteger(value) || value < 0 || value > 2_000_000_000) { bad = input.closest('label')?.querySelector('span')?.textContent ?? field; return }
        ;(edit as unknown as Record<string, number>)[field] = value
      })
      if (bad) { this.notify(`${bad}: 0 이상 20억 이하의 정수만 저장할 수 있습니다.`, 'ember'); return }
      if (Object.keys(edit).length <= 1) { this.notify('바꾼 칸이 없습니다.'); return }
      if (Number.isInteger(userId) && userId > 0) this.callbacks.onAdminGameDataSave(edit)
    } else if (action === 'admin-rename') {
      const id = Number(button.dataset.accountId)
      const before = button.dataset.accountName ?? ''
      const name = window.prompt(`#${id} ${before}의 새 아이디(한글 · 영문 · 숫자 · 밑줄 2~12자)`, before)?.trim()
      if (name && name !== before && Number.isInteger(id) && id > 0) this.callbacks.onAdminRename(id, name)
    } else if (action === 'admin-delete') {
      const id = Number(button.dataset.accountId)
      const name = button.dataset.accountName ?? ''
      const typed = window.prompt(`#${id} ${name} 계정을 삭제합니다. 게임 진행 · 순위 기록 · 연맹 소속이 모두 지워지고 되돌릴 수 없습니다.\n확인하려면 아이디(${name || id})를 그대로 입력하십시오.`)
      if (typed !== null && typed.trim() === (name || String(id)) && Number.isInteger(id) && id > 0) this.callbacks.onAdminDelete(id)
      else if (typed !== null) this.notify('입력한 아이디가 달라 삭제하지 않았습니다.', 'ember')
    } else if (action === 'admin-role') {
      const id = Number(button.dataset.accountId)
      const role = button.dataset.accountRole === 'admin' ? 'admin' : 'user'
      if (Number.isInteger(id) && id > 0) this.callbacks.onAdminRoleChange(id, role)
    }
    else if (action === 'close-result') button.closest('.result-modal')?.remove()
    else if (action === 'close-recruit-results') button.closest('.recruit-results')?.remove()
    else if (action === 'gold-log') this.showGoldLog()
    else if (action === 'formation-skill') this.showFormationSkill(button.dataset.id ?? '')
    else if (action === 'close-formation-skill') button.closest('.formation-skill-pop')?.remove()
    else if (action === 'close-gold-log') button.closest('.gold-log')?.remove()
    else if (action === 'draw-log') this.showDrawLog(button.dataset.kind === 'equip' ? 'equip' : 'recruit')
    else if (action === 'close-draw-log') button.closest('.draw-log')?.remove()
    else if (action === 'reroll-recruit') {
      button.closest('.recruit-results')?.remove()
      this.callbacks.onRecruit(10)
    }
    else if (action === 'extra-equipment-draw') {
      button.closest('.recruit-results')?.remove()
      this.callbacks.onEquipmentDraw(Number(button.dataset.count ?? 1))
    }
  }
  private guildClick(action: string, button: HTMLElement): void {
    const data = { ...button.dataset } as Record<string, string>
    if (action === 'guild-tab') { this.guildUi = { ...this.guildUi, tab: (data.tab ?? 'info') as GuildTab }; if (this.renderedState) this.render(this.renderedState); this.callbacks.onGuild('tab', data); return }
    if (action === 'guild-create-toggle') { this.guildUi.createOpen = !(button.closest('details') as HTMLDetailsElement | null)?.open; return }
    if (action === 'guild-rank-kind') { this.guildUi = { ...this.guildUi, rankingKind: (data.kind ?? 'level') as GuildUiState['rankingKind'] }; this.callbacks.onGuild('ranking', data); return }
    const ask = (title: string, detail: string, ok: string) => this.confirmPurchase(title, detail, () => this.callbacks.onGuild(action.slice(6), data), { eyebrow: '연맹', ok })
    if (action === 'guild-leave') return ask('연맹 탈퇴', '탈퇴하면 24시간 동안 다른 연맹에 가입할 수 없습니다. 기여 포인트는 남습니다.', '탈퇴')
    if (action === 'guild-disband') return ask('연맹 해산', '연맹이 사라지고 연맹 자금 · 기술도 없어집니다.', '해산')
    if (action === 'guild-kick') return ask('연맹원 추방', `${data.name ?? ''}을(를) 추방합니다. 24시간 동안 다시 가입할 수 없습니다.`, '추방')
    if (action === 'guild-admin-disband') return ask('연맹 강제 해산', `연맹 ‘${data.name ?? ''}’을(를) 해산합니다. 되돌릴 수 없습니다.`, '해산')
    if (action === 'guild-research') return ask('연맹 기술 연구', '연맹 자금을 써서 기술을 한 단계 올립니다.', '연구')
    if (action === 'guild-admin-ban') return ask('영토전 참여 정지', Number(data.hours) > 0 ? `${data.name ?? ''}의 영토전 참여를 ${Number(data.hours) >= 168 ? `${Number(data.hours) / 24}일` : `${data.hours}시간`} 정지합니다.` : `${data.name ?? ''}의 영토전 정지를 풉니다.`, Number(data.hours) > 0 ? '정지' : '풀기')
    if (action === 'guild-admin-royal') return ask('왕 연맹 다시 정하기', '지금 영토로 이번 주 왕 연맹 · 왕 · 황제를 다시 정합니다.', '다시 정하기')
    if (action === 'guild-royal-buy') return ask('왕궁 상점', `${data.name ?? ''}을(를) 옥패 ${formatNumber(Number(data.honor) || 0)}에 삽니다.`, '구매')
    this.callbacks.onGuild(action.slice(6), data)
  }

  private handleChange = (event: Event): void => {
    const select = event.target as HTMLSelectElement
    if (select.matches('[data-action="guild-role"]')) {
      const data = { userId: select.dataset.userId ?? '', role: select.value }
      if (select.value === 'leader') this.confirmPurchase('연맹장 위임', '연맹장을 넘기면 나는 부연맹장(자리가 없으면 연맹원)이 됩니다.', () => this.callbacks.onGuild('role', data), { eyebrow: '연맹', ok: '위임' })
      else this.callbacks.onGuild('role', data)
      return
    }
    if (select.matches('[data-action="admin-city-pick"]')) {
      this.adminCityId = select.value
      if (this.renderedState) this.render(this.renderedState)
      return
    }
    if (select.matches('[data-action="admin-sort"]')) {
      const value = select.value
      this.adminSort = value === 'level-desc' || value === 'level-asc' || value === 'recent' ? value : 'id'
      if (this.renderedState) this.render(this.renderedState)
    } else if (select.matches('[data-action="roster-sort"]')) {
      this.rosterSort = select.value as RosterSort
      if (this.renderedState) this.render(this.renderedState)
    } else if (select.matches('[data-action="formation-sort"]')) {
      this.formationSort = select.value as FormationSort
      if (this.renderedState) this.render(this.renderedState)
    } else if (select.matches('[data-action="equipment-filter"]')) {
      const key = select.dataset.key as keyof typeof this.equipmentFilter
      if (key in this.equipmentFilter) this.equipmentFilter[key] = select.value
      this.equipmentScrollTop = 0
      if (this.renderedState) this.render(this.renderedState)
    } else if (select.matches('[data-action="equipment-sort"]')) {
      this.equipmentSort = select.value as EquipmentSort
      if (this.renderedState) this.render(this.renderedState)
    } else if (select.matches('[data-action="equipment-general"]')) {
      this.callbacks.onEquipmentSelectGeneral(select.value)
    }
  }
  private handleSubmit = (event: SubmitEvent): void => {
    const form = event.target as HTMLFormElement
    if (form.matches('[data-guild-form]')) {
      event.preventDefault()
      const data = Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]))
      if (form.dataset.guildForm === 'target') data.cityName = form.querySelector<HTMLSelectElement>('select[name="cityId"]')?.selectedOptions[0]?.dataset.name ?? ''
      this.callbacks.onGuild(`form:${form.dataset.guildForm}`, data)
      return
    }
    if (form.matches('[data-board-form]')) {
      event.preventDefault()
      const data = new FormData(form)
      this.callbacks.onBoardPost((String(data.get('board') ?? '전체')) as BoardPost['board'], String(data.get('title') ?? ''), String(data.get('content') ?? ''), String(data.get('password') ?? ''))
      return
    }
    if (form.matches('[data-board-delete-form]')) {
      event.preventDefault()
      const data = new FormData(form)
      this.callbacks.onBoardDelete(Number(data.get('postId') ?? 0), String(data.get('password') ?? ''))
      return
    }
    if (!form.matches('[data-account-form]')) return
    event.preventDefault()
    const input = form.elements.namedItem('name') as HTMLInputElement | null
    if (input) this.callbacks.onAccountSave(input.value)
  }
}

function totalPower(state: StrategyState): number {
  return state.formation.reduce((sum, id) => {
    const general = state.generals.find(item => item.id === id)
    return sum + (general ? combatPower(general) + equipmentPowerForUi(state, general.id) : 0)
  }, 0)
}

/** 한 번 그리는 동안 무장별 장비 전투력을 한 번만 계산한다(그리기 시작 때 비운다) */
let uiPowerMemo = new Map<string, number>()
function resetUiPowerMemo(): void { uiPowerMemo = new Map() }
function equipmentPowerForUi(state: StrategyState, generalId: string): number {
  const cached = uiPowerMemo.get(generalId)
  if (cached !== undefined) return cached
  const bonus = equipmentBonus(state, generalId)
  const power = Math.round(bonus.leadership * 1.15 + bonus.martial * 1.25 + bonus.stratagem * 0.9 + bonus.speed * 0.65)
  uiPowerMemo.set(generalId, power)
  return power
}

/** 출전 편성 찾기: 이름 · 칭호 · 병종 · 진영 · 등급(‘5등급’ · ‘5’) · 스킬 이름 */
function formationSearchText(general: General): string {
  const faction = GENERAL_SKILLS[general.id]?.faction ?? ''
  return [general.name, general.epithet, general.role, `진영:${faction}`, `${general.grade}등급`, general.skillName].join(' ').toLowerCase()
}
const SEARCH_FACTIONS = new Set(Object.values(GENERAL_SKILLS).map(def => def.faction as string))
function searchTokens(query: string): string[] { return query.trim().toLowerCase().split(/\s+/).filter(Boolean) }
/** 띄어 쓴 낱말이 모두 들어 있으면 맞음. 숫자만 쓰면 등급(‘5’ → 5등급), 진영 이름만 쓰면 그 진영(‘오’ → 오나라 무장만) */
function tokensMatch(tokens: string[], text: string): boolean {
  return tokens.every(token => /^[1-5]$/.test(token) ? text.includes(`${token}등급`) : SEARCH_FACTIONS.has(token) ? text.includes(`진영:${token}`) : text.includes(token))
}
function matchesFormationQuery(general: General, query: string): boolean {
  return tokensMatch(searchTokens(query), formationSearchText(general))
}

/** 시즌 남은 시간: 하루 넘게 남으면 'n일 n시간', 하루 안이면 'n시간 n분', 1시간 안이면 'n분' */
function seasonLeftText(endsAt: number, now = Date.now()): string {
  const ms = Math.max(0, endsAt - now)
  const d = Math.floor(ms / 86_400_000), h = Math.floor(ms % 86_400_000 / 3_600_000), m = Math.floor(ms % 3_600_000 / 60_000)
  if (ms <= 0) return tr('정산 중')
  return d > 0 ? `${d}${tr('일')} ${h}${tr('시간')} ${tr('남음')}` : h > 0 ? `${h}${tr('시간')} ${m}${tr('분')} ${tr('남음')}` : `${Math.max(1, m)}${tr('분')} ${tr('남음')}`
}

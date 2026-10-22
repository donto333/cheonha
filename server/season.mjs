// 천하 시즌(2026.10.21): 한 달이 한 시즌. 매월 1일 0시(한국)에 지난 시즌을 정산하고 천하 영토(수도 제외)를 처음 상태로 돌린다.
// 순위: 진영이 가진 도시의 등급 합(수도 제외) → 도시 수 → 낙양 보유. 보상: 이달의 로테이션 무장 — 1위 진영 2장, 2 · 3위 진영 1장.
// 받을 자격: 정산 때 그 진영이고 시즌 중 영토전(공성 · 수비)을 1번 이상 한 유저. 재야는 순위에서 빼고, 시즌 중 약탈(실제로 깎은 성벽) 10만 이상이면 1장.
const KST = 9 * 60 * 60 * 1000

/** 첫 시즌(시즌 1)의 달 */
export const FIRST_SEASON = '2026-10'
/** 이달의 보상 무장(시즌 1부터 차례로, 5달마다 돌아온다) */
export const SEASON_ROTATION = ['zuo-ci', 'yu-ji', 'hua-tuo', 'nanhua', 'sima-hui']
export const SEASON_CAPITALS = ['chengdu', 'ye', 'jianye']
export const SEASON_FACTIONS = ['촉한', '위나라', '오나라']
export const SEASON_WANDERER = '재야'
/** 재야 보상 기준: 시즌 중 약탈(깎은 성벽) 합계 */
export const SEASON_WANDERER_PLUNDER = 100000
/** 순위별 장수 */
export const SEASON_COPIES = { 1: 2, 2: 1, 3: 1 }

/** 한국 날짜의 'YYYY-MM' */
export function seasonKey(now = Date.now()) { return new Date(now + KST).toISOString().slice(0, 7) }
export function seasonNumber(key) {
  const [y, m] = key.split('-').map(Number)
  const [fy, fm] = FIRST_SEASON.split('-').map(Number)
  return (y - fy) * 12 + (m - fm) + 1
}
export function previousSeasonKey(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return d.toISOString().slice(0, 7)
}
export function nextSeasonKey(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)
}
/** 그 시즌의 보상 무장 */
export function seasonGeneral(key) {
  const n = seasonNumber(key)
  return SEASON_ROTATION[((n - 1) % SEASON_ROTATION.length + SEASON_ROTATION.length) % SEASON_ROTATION.length]
}
/** 시즌이 끝나는 때(다음 달 1일 0시, 한국) */
export function seasonEndsAt(key) {
  const [y, m] = key.split('-').map(Number)
  return Date.UTC(y, m, 1) - KST
}
/** 진영 순위: cities [{ cityId, owner, level }] → [{ faction, levels, cities, luoyang, rank }] (세 진영) */
export function seasonStandings(cities) {
  const rows = SEASON_FACTIONS.map(faction => {
    const own = cities.filter(city => city.owner === faction && !SEASON_CAPITALS.includes(city.cityId))
    return { faction, levels: own.reduce((sum, city) => sum + (Number(city.level) || 1), 0), cities: own.length, luoyang: own.some(city => city.cityId === 'luoyang') }
  }).sort((a, b) => b.levels - a.levels || b.cities - a.cities || Number(b.luoyang) - Number(a.luoyang) || SEASON_FACTIONS.indexOf(a.faction) - SEASON_FACTIONS.indexOf(b.faction))
  return rows.map((row, index) => ({ ...row, rank: index + 1 }))
}
/** 이 유저가 받을 장수: { faction, battles, plunder } → 0 · 1 · 2 */
export function seasonCopiesFor(standings, account) {
  if (account.faction === SEASON_WANDERER) return (Number(account.plunder) || 0) >= SEASON_WANDERER_PLUNDER ? 1 : 0
  if (!((Number(account.battles) || 0) >= 1)) return 0
  const row = standings.find(item => item.faction === account.faction)
  return row ? SEASON_COPIES[row.rank] ?? 0 : 0
}

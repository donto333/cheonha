// 전투 시점: 화면 위 '시점' 단추를 누르면 전장 둘레 아홉 자리(3×3) 중 하나를 고른다.
// PC는 V 키로 차례로 바꾼다. 고른 시점은 이 기기에 기억한다.
export type BattleView = 'default' | 'rearLeft' | 'rearRight' | 'high' | 'side' | 'general' | 'frontLeft' | 'frontRight' | 'enemy'
/** V 키로 도는 차례 */
export const BATTLE_VIEWS: BattleView[] = ['default', 'rearLeft', 'rearRight', 'high', 'side', 'frontLeft', 'frontRight', 'enemy', 'general']
/** 고르기 판(위가 적진 쪽, 아래가 아군 쪽) */
export const BATTLE_VIEW_GRID: BattleView[][] = [
  ['frontLeft', 'enemy', 'frontRight'],
  ['general', 'high', 'side'],
  ['rearLeft', 'default', 'rearRight'],
]
export const BATTLE_VIEW_LABEL: Record<BattleView, string> = {
  default: '기본', rearLeft: '좌후방', rearRight: '우후방', high: '조감', side: '측면', general: '장수', frontLeft: '좌전방', frontRight: '우전방', enemy: '적진',
}
export const BATTLE_VIEW_ARROW: Record<BattleView, string> = {
  default: '↓', rearLeft: '↙', rearRight: '↘', high: '◎', side: '→', general: '⚑', frontLeft: '↖', frontRight: '↗', enemy: '↑',
}
export const BATTLE_VIEW_HINT: Record<BattleView, string> = {
  default: '아군 뒤에서 적진까지 한눈에',
  rearLeft: '아군 왼쪽 뒤에서 비스듬히',
  rearRight: '아군 오른쪽 뒤에서 비스듬히',
  high: '전장 위에서 내려다보기',
  side: '옆에서 두 진영이 맞붙는 모습',
  general: '고른 무장의 등 뒤를 따라가기',
  frontLeft: '적진 왼쪽 앞에서 비스듬히',
  frontRight: '적진 오른쪽 앞에서 비스듬히',
  enemy: '적진 뒤에서 아군 쪽 보기',
}
const KEY = 'cheonharo.battleView.v1'
export function loadBattleView(): BattleView {
  try { const v = window.localStorage.getItem(KEY) as BattleView | null; return v && BATTLE_VIEWS.includes(v) ? v : 'default' } catch { return 'default' }
}
export function saveBattleView(view: BattleView): void {
  try { window.localStorage.setItem(KEY, view) } catch { /* 저장 불가 */ }
}
export function nextBattleView(view: BattleView): BattleView {
  return BATTLE_VIEWS[(BATTLE_VIEWS.indexOf(view) + 1) % BATTLE_VIEWS.length]
}
/** 대각선 시점: 전장 가운데를 중심으로 어느 쪽(x: 왼쪽 −1 · 오른쪽 +1, z: 아군 뒤 +1 · 적진 쪽 −1)에 서는가 */
export const DIAGONAL_VIEWS: Partial<Record<BattleView, { x: number; z: number }>> = {
  rearLeft: { x: -1, z: 1 }, rearRight: { x: 1, z: 1 }, frontLeft: { x: -1, z: -1 }, frontRight: { x: 1, z: -1 },
}

// ── 카메라 거리(시점 판 아래 ‘거리’): 가깝게 · 보통 · 멀게 · 아주 멀게. 고른 값은 이 기기에 기억한다 ──
export type BattleDistance = 'near' | 'mid' | 'far' | 'farthest'
export const BATTLE_DISTANCES: BattleDistance[] = ['near', 'mid', 'far', 'farthest']
export const BATTLE_DISTANCE_LABEL: Record<BattleDistance, string> = { near: '가깝게', mid: '보통', far: '멀게', farthest: '아주 멀게' }
/** 카메라를 보는 곳에서 얼마나 물릴지(배율) */
export const BATTLE_DISTANCE_SCALE: Record<BattleDistance, number> = { near: 1, mid: 1.25, far: 1.5, farthest: 1.85 }
const DIST_KEY = 'cheonharo.battleDistance.v1'
export function loadBattleDistance(): BattleDistance {
  try { const v = window.localStorage.getItem(DIST_KEY) as BattleDistance | null; return v && BATTLE_DISTANCES.includes(v) ? v : 'far' } catch { return 'far' }
}
export function saveBattleDistance(value: BattleDistance): void {
  try { window.localStorage.setItem(DIST_KEY, value) } catch { /* 저장 불가: 이번 접속에만 */ }
}

// ── 전투 시간대(시점 판 아래 ‘시간’): 노을 · 아침. 배경 그림과 빛이 바뀐다. 고른 값은 이 기기에 기억한다 ──
export type BattleTime = 'dusk' | 'morning'
export const BATTLE_TIMES: BattleTime[] = ['dusk', 'morning']
export const BATTLE_TIME_LABEL: Record<BattleTime, string> = { dusk: '노을', morning: '아침' }
const TIME_KEY = 'cheonharo.battleTime.v1'
export function loadBattleTime(): BattleTime {
  try { const v = window.localStorage.getItem(TIME_KEY) as BattleTime | null; return v && BATTLE_TIMES.includes(v) ? v : 'dusk' } catch { return 'dusk' }
}
export function saveBattleTime(value: BattleTime): void {
  try { window.localStorage.setItem(TIME_KEY, value) } catch { /* 저장 불가: 이번 접속에만 */ }
}

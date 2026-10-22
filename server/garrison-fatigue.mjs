// 수비대 피로(2026.10.19): 유저 수비대가 공성을 막을 때마다 지친다.
// 막을 때마다 −8%(최대 −60%), 1시간에 10%씩 회복. 아무리 강한 수비대도 여러 번 공격받으면 뚫린다.
export const GARRISON_FATIGUE_HIT = 0.08
export const GARRISON_FATIGUE_MAX = 0.6
export const GARRISON_FATIGUE_RECOVER_PER_HOUR = 0.1
/** 같은 수비대에 피로가 쌓이는 최소 간격(전투를 바로 끄며 피로만 쌓는 것을 막는다) */
export const GARRISON_FATIGUE_GAP_MS = 60_000
const HOUR = 3_600_000

/** 지금 시각의 피로(0 ~ 0.6) */
export function garrisonFatigue(garrison, now = Date.now()) {
  const stored = Math.max(0, Math.min(GARRISON_FATIGUE_MAX, Number(garrison?.fatigue) || 0))
  const at = Number(garrison?.fatigueAt) || 0
  if (!stored || garrison?.fatigueAt === undefined) return stored
  return Math.max(0, stored - Math.max(0, now - at) / HOUR * GARRISON_FATIGUE_RECOVER_PER_HOUR)
}

/** 수비대가 공성을 한 번 막았다: 피로를 쌓는다. 간격 안의 반복이면 false */
export function addGarrisonFatigue(garrison, now = Date.now()) {
  if (garrison.fatigueHitAt !== undefined && garrison.fatigueHitAt !== null && now - Number(garrison.fatigueHitAt) < GARRISON_FATIGUE_GAP_MS) return false
  garrison.fatigue = Math.min(GARRISON_FATIGUE_MAX, garrisonFatigue(garrison, now) + GARRISON_FATIGUE_HIT)
  garrison.fatigueAt = now
  garrison.fatigueHitAt = now
  return true
}

/** 피로를 반영한 전투력 */
export function fatiguedPower(garrison, now = Date.now()) {
  return Math.round((Number(garrison?.power) || 0) * (1 - garrisonFatigue(garrison, now)))
}

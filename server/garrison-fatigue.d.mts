export const GARRISON_FATIGUE_HIT: number
export const GARRISON_FATIGUE_MAX: number
export const GARRISON_FATIGUE_RECOVER_PER_HOUR: number
export const GARRISON_FATIGUE_GAP_MS: number
export interface FatigueHolder { power?: number; fatigue?: number; fatigueAt?: number; fatigueHitAt?: number }
export function garrisonFatigue(garrison: FatigueHolder | null | undefined, now?: number): number
export function addGarrisonFatigue(garrison: FatigueHolder, now?: number): boolean
export function fatiguedPower(garrison: FatigueHolder | null | undefined, now?: number): number

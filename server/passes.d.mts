export interface PassDef { id: string; name: string; priceKRW: number; days: number; dailyGold: number; auto?: boolean; desc: string }
export const PASS_DAY_MS: number
export const PASSES: PassDef[]
export const PASS_PAYMENT_ENABLED: boolean
export const AUTO_PASS_ACCURACY: number
export const AUTO_PASS_SPEED: number
export function passById(id: string): PassDef | null
export function extendPass(until: number | undefined, pass: PassDef, now?: number): number
export function passActive(passes: Record<string, { until: number }> | undefined, id: string, now?: number): boolean
export function passGoldDue(passes: Record<string, { until: number }> | undefined, goldDays: Record<string, string> | undefined, day: string, now?: number): PassDef[]

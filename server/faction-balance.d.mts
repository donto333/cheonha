export const REALM_FACTIONS: string[]
export const WANDERER_FACTION: string
export const BALANCE_WEIGHTS: { members: number; days: number; power: number; gold: number }
export interface BalanceUnit { id: string; members: number; days: number; power: number; gold: number }
export function unitStats(users: Array<{ days?: number; power?: number; gold?: number }>): Omit<BalanceUnit, 'id'>
export function balanceFactions(units: BalanceUnit[], options?: { rng?: () => number; factions?: string[] }): Map<string, string>
export function weakestFaction(rows: Array<{ faction: string; days?: number; power?: number; gold?: number }>, options?: { rng?: () => number; factions?: string[] }): string
export function factionTotals(assignments: Map<string, string>, units: BalanceUnit[], factions?: string[]): Record<string, Omit<BalanceUnit, 'id'>>
export function kstDay(now?: number): string

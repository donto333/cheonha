export declare const FIRST_SEASON: string
export declare const SEASON_ROTATION: string[]
export declare const SEASON_CAPITALS: string[]
export declare const SEASON_FACTIONS: string[]
export declare const SEASON_WANDERER: string
export declare const SEASON_WANDERER_PLUNDER: number
export declare const SEASON_COPIES: Record<number, number>
export interface SeasonStanding { faction: string; levels: number; cities: number; luoyang: boolean; rank: number }
export declare function seasonKey(now?: number): string
export declare function seasonNumber(key: string): number
export declare function previousSeasonKey(key: string): string
export declare function nextSeasonKey(key: string): string
export declare function seasonGeneral(key: string): string
export declare function seasonEndsAt(key: string): number
export declare function seasonStandings(cities: Array<{ cityId: string; owner: string; level?: number }>): SeasonStanding[]
export declare function seasonCopiesFor(standings: SeasonStanding[], account: { faction: string; battles?: number; plunder?: number }): number

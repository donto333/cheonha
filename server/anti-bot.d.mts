export declare const REQUESTS_PER_MINUTE: number
export declare const MIN_INTERVAL_MS: Record<string, number>
export declare const SIEGE_TICKET_TTL_MS: number
export declare const SIEGE_MIN_BATTLE_MS: number
export declare const SIEGE_DAMAGE_CAP: number
export declare const SIEGE_DAILY_LIMIT: number
export interface BotDay { sieges: number; defenses: number; capHits: number; badTickets: number; overLimit: number; hours: number[] }
export declare function botDayKey(now?: number): string
export declare function botHour(now?: number): number
export declare function createLimiter(): {
  request(userId: number, now?: number): boolean
  interval(userId: number, kind: string, now?: number): boolean
  issueTicket(userId: number, cityId: string, now?: number): string
  useTicket(userId: number, cityId: string, ticket: string | undefined, now?: number): 'ok' | 'missing' | 'expired' | 'mismatch' | 'tooFast'
  hits(userId: number): number
  allHits(): Map<number, number>
}
export declare function addBotStats(ledger: Record<string, unknown>, patch: Partial<Record<'sieges' | 'defenses' | 'capHits' | 'badTickets' | 'overLimit', number>>, now?: number): BotDay
export declare function botScore(day: BotDay | undefined, limitHits?: number): number

export type GuildRole = 'leader' | 'deputy' | 'elite' | 'member'
export type GuildTechId = 'harvest' | 'siege' | 'garrison' | 'raid' | 'build' | 'supply' | 'duel'
export type GuildContributionKind = 'donateSilver' | 'donateResources' | 'donateGold' | 'siege' | 'targetSiege' | 'defense' | 'raid' | 'attendance' | 'help'
export interface GuildEmblem { color: number; pattern: number }
export interface GuildTarget { cityId: string; cityName: string; weekKey: string; setBy: string; done?: boolean }
export interface GuildView {
  id: number; name: string; faction: string; level: number; exp: number; expToNext: number; funds: number; capacity: number; members: number
  emblem: GuildEmblem; notice: string; joinMode: 'open' | 'approval'; minLevel: number; tech: Partial<Record<GuildTechId, number>>; techCap: number
  target: GuildTarget | null; weekPoints: number; weekRaid: number; leaderUserId: number; createdAt: number
}
export interface GuildMemberView { userId: number; name: string; role: GuildRole; power: number; lastActiveAt: number; weekPoints: number; weekRaid: number; joinedAt: number }
export interface GuildRequestView { id: number; userId: number; name: string; power: number; maxLevel: number; createdAt: number }
export interface GuildInviteView { id: number; guildId: number; guildName: string; emblem: GuildEmblem; level: number; from: string }
export interface GuildPendingReward { id: string; label: string; gold?: number; manuals?: number; honor?: number }
/** 연맹 도움 요청(연구 · 공사): helped = 받은 도움 수, mine = 내 요청, done = 내가 이미 도움 */
export interface GuildHelpView { id: number; userId: number; name: string; key: string; job: string; label: string; endsAt: number; helped: number; max: number; mine: boolean; done: boolean }
export interface GuildMe {
  guild: GuildView | null; member: GuildMemberView | null; members?: GuildMemberView[]; requests?: GuildRequestView[]
  pending: GuildPendingReward[]; points: number; rejoinAt: number; invites: GuildInviteView[]; applications: number[]; usage: Record<string, number>
  helps?: GuildHelpView[]
}
export interface GuildLog { id: number; guildId: number; at: number; text: string }
export interface GuildChatMessage { id: number; guildId: number; userId: number; name: string; role?: GuildRole; text: string; at: number }
export interface GuildRankingRow { id: number; name: string; faction: string; emblem: GuildEmblem; level: number; members: number; score: number; rank: number; mine: boolean }
export interface GuildRanking { kind: string; rows: GuildRankingRow[]; lastWeek: { contribution: Array<{ guildId: number; name: string; score: number; rank: number }>; raid: Array<{ guildId: number; name: string; score: number; rank: number }> } | null }
export interface GuildGrant { manuals?: number; silver?: number; grain?: number; wood?: number; iron?: number; freeRecruits?: number; freeDraws?: number }
export interface GuildShopItem { id: string; name: string; price: number; minLevel: number; limit: number; period: 'week' | 'month'; grant: GuildGrant & { fragments?: number; stones?: number } }
export interface GuildContributionRule { label: string; cost?: { silver?: number; grain?: number; wood?: number; iron?: number; gold?: number }; points: number; exp: number; funds: number; limit: number; period: 'day' | 'week'; shares?: string }
export interface GuildTechRule { name: string; desc: string; per: number; unit: '+' | '−'; max: number }
export interface GuildBonuses { harvest: number; wall: number; garrison: number; raid: number; buildCut: number; siegeCostCut: number; duel: number }

export type RoyalRank = 'member' | 'king' | 'emperor'
export interface RoyalKing { guildId: number; guildName: string; emblem: GuildEmblem; leaderUserId: number; leaderName?: string; cities: number; levels: number; siege?: number; title?: string; appointed?: boolean }
export interface RoyalShopItem { id: string; name: string; honor: number; limits: Record<RoyalRank, number>; grant: GuildGrant & { fragments?: number; stones?: number } }
export interface RoyalInfo {
  weekKey: string; settledAt: number; kings: Partial<Record<string, RoyalKing>>; emperorFaction: string | null; rank: RoyalRank | null; bonus: number
  shop: Array<{ id: string; name: string; honor: number; grant: GuildGrant & { fragments?: number; stones?: number }; limit: number; used: number }>
  goldAmount: number; goldClaimed: boolean
}
export declare const ROYAL_GOLD: { king: number; emperor: number }
export declare const ROYAL_BATTLE_BONUS: number
export declare const ROYAL_SHOP: RoyalShopItem[]
export declare const ROYAL_RANK_LABEL: Record<RoyalRank, string>
export declare const WANDERER_FACTION: string
export declare const WANDERER_KING_TITLE: string
export declare function royalTitle(faction: string): string
export declare function pickRoyalGuilds(cities: Array<{ cityId: string; owner: string; guildId?: number | null; level?: number; at?: number }>, guilds: Array<{ id: number; name: string; faction: string; emblem?: GuildEmblem; leaderUserId?: number }>): Record<string, RoyalKing>
export declare const GUILD_CREATE_GOLD: number
export declare const GUILD_CREATE_MIN_LEVEL: number
export declare const GUILD_MAX_LEVEL: number
export declare const GUILD_REJOIN_MS: number
export declare const GUILD_APPLY_EXPIRE_MS: number
export declare const GUILD_LEADER_AFK_MS: number
export declare const GUILD_REWARD_MIN_MEMBER_MS: number
export declare const GUILD_ROLE_LIMIT: Record<'leader' | 'deputy' | 'elite', number>
export declare const GUILD_ROLES: GuildRole[]
export declare const GUILD_ROLE_LABEL: Record<GuildRole, string>
export declare const GUILD_NAME_RE: RegExp
export declare const GUILD_COLORS: string[]
export declare const GUILD_PATTERNS: string[]
export declare const GUILD_CHAT_MAX: number
export declare const GUILD_CHAT_KEEP: number
export declare const GUILD_CHAT_INTERVAL_MS: number
export declare const GUILD_NOTICE_MAX: number
export declare const GUILD_CONTRIBUTIONS: Record<GuildContributionKind, GuildContributionRule>
export declare const GUILD_DONATIONS: GuildContributionKind[]
export declare const GUILD_HELP_MAX: number
export declare const GUILD_HELP_CUT: number
export declare const GUILD_HELP_MIN_MS: number
export declare const GUILD_HELP_OPEN_MAX: number
export declare function guildHelpCut(remainingMs: number): number
export declare const GUILD_TECHS: Record<GuildTechId, GuildTechRule>
export declare const GUILD_TECH_IDS: GuildTechId[]
export declare const GUILD_BONUS_CAP: number
export declare const GUILD_TARGET_WALL: number
export declare const GUILD_SHOP: GuildShopItem[]
export declare const GUILD_WEEKLY_REWARDS: Array<{ rank?: number; top?: number; gold: number; manuals: number }>
export declare const GUILD_TARGET_REWARD: { honor: number; manuals: number; exp: number }
export declare function guildCapacity(level: number): number
export declare function guildExpToNext(level: number): number
export declare function addGuildExp<T extends { level: number; exp: number }>(guild: T, exp: number): T
export declare function guildTechCap(guildLevel: number): number
export declare function guildTechCost(nextLevel: number): number
export declare function guildBonuses(tech?: Partial<Record<string, number>>): GuildBonuses
export declare function guildWeeklyReward(rank: number, total: number): { gold: number; manuals: number } | null
export declare function guildDayKey(now?: number): string
export declare function guildMonthKey(now?: number): string
export declare function guildWeekKey(now?: number): string
export declare function validGuildName(name: string): string | null
export declare class GuildError extends Error {}

export interface GuildAccount { userId: number; name: string; faction: string; maxLevel: number; power: number; operator?: boolean; gold?: number; fragments?: number; stones?: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GuildRepo = Record<string, (...args: any[]) => Promise<any>> & { accounts?: Map<number, GuildAccount> }
export declare function createMemoryGuildRepo(accounts?: Map<number, GuildAccount>): GuildRepo
export interface GuildService {
  me(userId: number): Promise<GuildMe>
  list(userId: number, query?: string): Promise<GuildView[]>
  create(userId: number, input: { name: string; color?: number; pattern?: number; joinMode?: 'open' | 'approval'; minLevel?: number }): Promise<{ ok: true; guildId: number; goldSpent: number }>
  apply(userId: number, guildId: number): Promise<{ ok: true; joined: boolean }>
  cancelApply(userId: number, guildId: number): Promise<{ ok: true }>
  decide(userId: number, requestId: number, accept: boolean): Promise<{ ok: true }>
  invite(userId: number, targetName: string): Promise<{ ok: true }>
  respondInvite(userId: number, requestId: number, accept: boolean): Promise<{ ok: true }>
  leave(userId: number): Promise<{ ok: true }>
  kick(userId: number, targetUserId: number): Promise<{ ok: true }>
  setRole(userId: number, targetUserId: number, role: GuildRole): Promise<{ ok: true }>
  disband(userId: number): Promise<{ ok: true }>
  updateSettings(userId: number, input: { notice?: string; joinMode?: 'open' | 'approval'; minLevel?: number; color?: number; pattern?: number }): Promise<{ ok: true }>
  donate(userId: number, kind: GuildContributionKind): Promise<{ ok: true; cost: NonNullable<GuildContributionRule['cost']>; points: number }>
  research(userId: number, techId: GuildTechId): Promise<{ ok: true }>
  helps(userId: number): Promise<GuildHelpView[]>
  requestHelp(userId: number, input: { key: string; job: string; label?: string; endsAt: number }): Promise<{ ok: true; id: number; helped: number }>
  closeHelp(userId: number, key?: string): Promise<{ ok: true }>
  help(userId: number, requestId?: number): Promise<{ ok: true; helped: number; points: number }>
  buy(userId: number, itemId: string): Promise<{ ok: true; grant: GuildGrant; ledger: { fragments: number; stones: number }; points: number }>
  setTarget(userId: number, cityId: string, cityName?: string): Promise<{ ok: true }>
  claim(userId: number): Promise<{ ok: true; gold: number; manuals: number; honor: number; items: GuildPendingReward[] }>
  logs(userId: number): Promise<GuildLog[]>
  chat(userId: number, afterId?: number): Promise<GuildChatMessage[]>
  say(userId: number, text: string): Promise<{ ok: true; id: number }>
  ranking(userId: number, kind?: 'level' | 'contribution' | 'raid'): Promise<GuildRanking>
  record(userId: number, kind: GuildContributionKind, opts?: { cityId?: string; damage?: number }): Promise<{ ok: boolean; credited?: boolean; kind?: string }>
  cityCaptured(faction: string, cityId: string): Promise<void>
  tags(userIds: number[]): Promise<Map<number, GuildBonuses & { guildId: number; name: string; emblem: GuildEmblem }>>
  siege(userId: number, damage: number): Promise<{ ok: boolean; weekSiege?: number }>
  royalSettle(): Promise<{ ok: true }>
  royal(userId: number): Promise<RoyalInfo>
  royalBuy(userId: number, itemId: string): Promise<{ ok: true; honor: number; grant: GuildGrant; ledger: { fragments: number; stones: number } }>
  royalClaim(userId: number): Promise<{ ok: true; gold: number; rank: RoyalRank }>
  adminSetRoyal(input: { faction: string; guildId: number; leaderName?: string }): Promise<{ weekKey: string; kings: Partial<Record<string, RoyalKing>>; emperorFaction: string | null }>
  adminSetEmperor(faction: string | null): Promise<{ weekKey: string; kings: Partial<Record<string, RoyalKing>>; emperorFaction: string | null }>
  adminResettleRoyal(): Promise<{ weekKey: string; kings: Partial<Record<string, RoyalKing>>; emperorFaction: string | null }>
  adminList(): Promise<GuildView[]>
  adminRename(guildId: number, name: string): Promise<{ ok: true }>
  adminDisband(guildId: number): Promise<{ ok: true }>
  adminRemoveUser(userId: number): Promise<{ ok: true }>
  adminRenameUser(userId: number, name: string): Promise<{ ok: true }>
}
export declare function createGuildService(repo: GuildRepo, options?: { now?: () => number; territory?: () => Promise<{ cities: Array<{ cityId: string; owner: string; guildId?: number | null; level?: number; at?: number }>; luoyangWinner: string | null }> }): GuildService

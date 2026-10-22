import { z } from 'zod'
import { adminProcedure, router, publicProcedure, protectedProcedure, getCityDamageRankings, getFactionTerritories, getGameState, getLuoyangReward, getLuoyangHistory, grantCurrency, deployFactionGarrison, recordFactionDefense, listDuelOpponents, getRaidInfo, startRaid, submitRaid, getRaidRanking, claimRaidReward, listGameStates, listUsers, recordFactionTerritoryBattle, updateGameState, updateUserName, updateUserRole, adminUpdateGameState, adminGameView, isOperatorUser, resetGuestGameState, guildService, adminSetLuoyangWinner, adminUpdateCity, adminUserGenerals, getSeasonInfo, claimSeasonReward, beginSiege, adminBotReport, adminTerritoryBan, adminRenameUser, adminDeleteUser } from './webdev-adapter.mjs'

import { leaderboard } from './leaderboard.mjs'
import { createLeaderboardRouter } from './leaderboard/router.mjs'
import { adminDeleteMessage, adminMuteUser, adminReports, adminResolveReport, blockUser, chatHistory, chatStatus, listBlocks, pushGuildChat, reportMessage, sendChat, setGuildBridge, unblockUser } from './chat.mjs'
import { createBoardPost, deleteBoardPost, deleteBoardPostAsAdmin, getBoardSettings, listAdminBoardPosts, listBoardPosts, setBoardPostingEnabled } from './board.mjs'

// 계정 상태 숫자 한도: DB 컬럼(int / int unsigned)이 담을 수 있는 범위 안에서 넉넉하게 잡는다.
// 예전 한도(병법서·승리·낙양 상자·신화 조각 1,000,000)를 넘은 계정은 저장 자체가 거절되었다.
export const SAVE_INT_MAX = 2_000_000_000

function accountView(user) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name ?? '',
    email: user.email ?? '',
    loginMethod: user.loginMethod ?? 'Manus OAuth',
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignedIn: user.lastSignedIn,
    ...(typeof user.maxLevel === 'number' ? { maxLevel: user.maxLevel } : {}),
  }
}

// 채팅 창의 연맹 채널 = 유저 연맹의 연맹 채팅
setGuildBridge({
  membership: async userId => { const tag = (await guildService.tags([userId])).get(userId); return tag ? { guildId: tag.guildId, name: tag.name } : null },
  history: (userId, afterId) => guildService.chat(userId, afterId),
  say: (userId, text) => guildService.say(userId, text),
})

export const gameRouter = router({
  admin: router({
    listUsers: adminProcedure.input(z.object({ search: z.string().trim().max(64).optional() }).optional()).query(async ({ input }) => {
      const users = await listUsers()
      const search = input?.search?.toLocaleLowerCase('ko-KR') ?? ''
      return users.filter(user => !search || `${user.name ?? ''} ${user.email ?? ''} ${user.openId}`.toLocaleLowerCase('ko-KR').includes(search)).map(accountView)
    }),
    updateRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(['user', 'admin']) })).mutation(async ({ ctx, input }) => {
      const updated = await updateUserRole(input.id, input.role, ctx.user.openId)
      if (!updated) throw new Error('해당 계정을 찾을 수 없습니다.')
      return accountView(updated)
    }),
    renameUser: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(12) }).strict()).mutation(async ({ input }) => {
      const updated = await adminRenameUser(input.id, input.name)
      if (!updated) throw new Error('해당 계정을 찾을 수 없습니다.')
      return accountView(updated)
    }),
    deleteUser: adminProcedure.input(z.object({ id: z.number().int().positive() }).strict()).mutation(({ ctx, input }) => adminDeleteUser(input.id, ctx.user.openId)),
    listGameStates: adminProcedure.query(async () => (await listGameStates()).map(user => ({ ...accountView(user), operator: Boolean(user.operator), game: adminGameView(user) }))),
    // 관리자 편집: 보낸 칸만 바꾼다. 금화 · 신화 조각 · 낙양 강화석(서버 원장)도 그대로 정하고, 접속 중인 게임이 덮어쓰지 않게 한다.
    updateGameState: adminProcedure.input(z.object({
      userId: z.number().int().positive(),
      ...Object.fromEntries(['honor', 'silver', 'gold', 'manuals', 'wins', 'battleScore', 'grain', 'wood', 'iron', 'influence', 'mythicFragments', 'mythicStones', 'factionWarScore', 'luoyangBoxes'].map(key => [key, z.number().int().min(0).max(SAVE_INT_MAX).optional()])),
      faction: z.enum(['촉한', '위나라', '오나라', '재야']).optional(),
      // 무장 편집(관리자 화면이 능력치까지 계산해 보낸 전체 목록)
      generalData: z.string().max(500000).optional(),
    }).strict()).mutation(async ({ input }) => {
      const { userId, ...values } = input
      return { userId, game: await adminUpdateGameState(userId, values) }
    }),
    // 유저 무장 목록(무장 편집용 원본)
    userGenerals: adminProcedure.input(z.object({ userId: z.number().int().positive() }).strict()).query(({ input }) => adminUserGenerals(input.userId)),
    boardSettings: adminProcedure.query(async () => ({ settings: await getBoardSettings(), posts: await listAdminBoardPosts() })),
    deleteBoardPost: adminProcedure.input(z.object({ id: z.number().int().positive() }).strict()).mutation(({ input }) => deleteBoardPostAsAdmin(input.id)),
    setBoardPosting: adminProcedure.input(z.object({ enabled: z.boolean() }).strict()).mutation(({ input }) => setBoardPostingEnabled(input.enabled)),
    // 낙양전 주간 승자 바로잡기(weekKey: 그 주 일요일 YYYY-MM-DD, 없으면 지난 일요일)
    setLuoyangWinner: adminProcedure.input(z.object({ weekKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), faction: z.enum(['촉한', '위나라', '오나라', '재야']), restoreOwner: z.boolean().default(true) }).strict()).mutation(({ input }) => adminSetLuoyangWinner(input)),
    guilds: adminProcedure.query(() => guildService.adminList()),
    renameGuild: adminProcedure.input(z.object({ guildId: z.number().int().positive(), name: z.string().trim().min(2).max(8) }).strict()).mutation(({ input }) => guildService.adminRename(input.guildId, input.name)),
    resettleRoyal: adminProcedure.mutation(() => guildService.adminResettleRoyal()),
    // 자동 진행 대책: 이상 행동 목록 · 영토전 참여 정지
    botReport: adminProcedure.query(() => adminBotReport()),
    territoryBan: adminProcedure.input(z.object({ userId: z.number().int().positive(), hours: z.number().int().min(0).max(24 * 30) }).strict()).mutation(({ input }) => adminTerritoryBan(input.userId, input.hours)),
    // 천하 영토 편집
    updateCity: adminProcedure.input(z.object({ cityId: z.string().trim().min(1).max(64), owner: z.enum(['촉한', '위나라', '오나라', '중립', '재야']).optional(), defense: z.number().int().min(0).max(1_000_000).optional(), prosperity: z.number().int().min(0).max(100).optional(), conquestProgress: z.number().int().min(0).max(100).optional(), clearGarrisons: z.boolean().optional(), clearLocks: z.boolean().optional(), guildId: z.number().int().min(0).optional() }).strict()).mutation(({ input }) => adminUpdateCity(input)),
    setRoyal: adminProcedure.input(z.object({ faction: z.enum(['촉한', '위나라', '오나라', '재야']), guildId: z.number().int().min(0), leaderName: z.string().trim().max(32).optional() }).strict()).mutation(({ input }) => guildService.adminSetRoyal(input)),
    setEmperor: adminProcedure.input(z.object({ faction: z.enum(['촉한', '위나라', '오나라', '재야']).nullable() }).strict()).mutation(({ input }) => guildService.adminSetEmperor(input.faction)),
    disbandGuild: adminProcedure.input(z.object({ guildId: z.number().int().positive() }).strict()).mutation(({ input }) => guildService.adminDisband(input.guildId)),
  }),
  leaderboard: createLeaderboardRouter({ router, publicProcedure, protectedProcedure, isOperator: isOperatorUser }, leaderboard),
  duel: router({
    // power(내 덱 전력)를 보내면 비슷한 실력의 유저를 고르고, 덱을 저장한 지휘관이 20명 미만이면 훈련 상대 모드를 알려 준다
    listOpponents: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(12), power: z.number().min(0).max(10_000_000).optional() }).strict()).query(({ ctx, input }) => listDuelOpponents(ctx.user.id, input.limit, input.power)),
  }),
  // 주간 레이드: 월요일 0시(KST) 초기화 · 하루 3회 · 1·2·3군 피해 합계로 순위
  raid: router({
    info: protectedProcedure.query(({ ctx }) => getRaidInfo(ctx.user.id)),
    ranking: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).strict()).query(({ ctx, input }) => getRaidRanking(ctx.user.id, input.limit)),
    start: protectedProcedure.mutation(({ ctx }) => {
      if (ctx.user.isCron) throw new Error('예약 실행 계정은 레이드에 도전할 수 없습니다.')
      return startRaid(ctx.user)
    }),
    submit: protectedProcedure.input(z.object({ token: z.string().min(8).max(64), damages: z.array(z.number().min(0).max(1_000_000_000)).min(1).max(3) }).strict()).mutation(({ ctx, input }) => submitRaid(ctx.user.id, input)),
    claim: protectedProcedure.mutation(({ ctx }) => claimRaidReward(ctx.user.id)),
  }),
  territory: router({
    list: protectedProcedure.query(({ ctx }) => getFactionTerritories(ctx.user.id)),
    // 공성 시작: 결과를 한 번 기록할 표를 받는다(자동 진행 대책)
    beginSiege: protectedProcedure.input(z.object({ cityId: z.string().trim().min(1).max(64) }).strict()).mutation(({ ctx, input }) => beginSiege(ctx.user.id, input.cityId, { operator: isOperatorUser(ctx.user) })),
    luoyangHistory: protectedProcedure.query(() => getLuoyangHistory()),
    recordBattle: protectedProcedure.input(z.object({
      cityId: z.string().trim().min(1).max(64),
      damage: z.number().int().min(0).max(1000000),
      won: z.boolean(),
      captured: z.boolean(),
      // 졌을 때 막아 낸 유저 수비대(피로를 쌓는다)
      garrisonId: z.string().trim().min(1).max(96).optional(),
      // 공성 표(territory.beginSiege)
      ticket: z.string().trim().min(1).max(64).optional(),
    }).strict()).mutation(async ({ ctx, input }) => {
      if (ctx.user.isCron) throw new Error('예약 실행 계정은 영토 전투를 기록할 수 없습니다.')
      return recordFactionTerritoryBattle(ctx.user.id, input, { operator: isOperatorUser(ctx.user) })
    }),
    deployGarrison: protectedProcedure.input(z.object({
      cityId: z.string().trim().min(1).max(64),
      garrisonId: z.string().trim().min(1).max(96),
      power: z.number().int().min(0).max(2_000_000),
      averageLevel: z.number().int().min(1).max(999),
      label: z.string().trim().min(1).max(40),
      // 공격자가 3D 공성에서 맞붙을 실제 덱(구버전 클라이언트는 보내지 않는다)
      deck: z.array(z.object({ id: z.string().trim().min(1).max(64), level: z.number().int().min(1).max(60), stars: z.number().int().min(1).max(5) }).strict()).max(3).optional(),
    }).strict()).mutation(async ({ ctx, input }) => {
      if (ctx.user.isCron) throw new Error('예약 실행 계정은 수비병을 세울 수 없습니다.')
      return deployFactionGarrison(ctx.user.id, input, { operator: isOperatorUser(ctx.user) })
    }),
    recordDefense: protectedProcedure.input(z.object({
      cityId: z.string().trim().min(1).max(64),
    }).strict()).mutation(async ({ ctx, input }) => {
      if (ctx.user.isCron) throw new Error('예약 실행 계정은 방어전을 지휘할 수 없습니다.')
      return recordFactionDefense(ctx.user.id, input, { operator: isOperatorUser(ctx.user) })
    }),
    damageRanking: protectedProcedure.input(z.object({ cityId: z.string().trim().min(1).max(64) }).strict()).query(({ input }) => getCityDamageRankings(input.cityId)),
  }),
  // 천하 시즌(server/season.mjs): 한 달 한 시즌 · 진영 순위 보상(로테이션 무장)
  season: router({
    info: protectedProcedure.query(({ ctx }) => getSeasonInfo(ctx.user.id)),
    claim: protectedProcedure.mutation(({ ctx }) => claimSeasonReward(ctx.user.id)),
  }),
  // 유저 연맹(server/guild.mjs): 같은 진영끼리 · 기여 · 기술 · 상점 · 공동 공성 · 채팅 · 주간 정산
  guild: router({
    me: protectedProcedure.query(({ ctx }) => guildService.me(ctx.user.id)),
    list: protectedProcedure.input(z.object({ query: z.string().trim().max(16).optional() }).strict()).query(({ ctx, input }) => guildService.list(ctx.user.id, input.query ?? '')),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(8), color: z.number().int().min(0).max(31).optional(), pattern: z.number().int().min(0).max(31).optional(), joinMode: z.enum(['open', 'approval']).optional(), minLevel: z.number().int().min(1).max(60).optional() }).strict()).mutation(({ ctx, input }) => guildService.create(ctx.user.id, input)),
    // tRPC는 router 키로 apply · call · then 을 쓸 수 없다(서버가 시작되지 않음)
    applyGuild: protectedProcedure.input(z.object({ guildId: z.number().int().positive() }).strict()).mutation(({ ctx, input }) => guildService.apply(ctx.user.id, input.guildId)),
    cancelApply: protectedProcedure.input(z.object({ guildId: z.number().int().positive() }).strict()).mutation(({ ctx, input }) => guildService.cancelApply(ctx.user.id, input.guildId)),
    decide: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), accept: z.boolean() }).strict()).mutation(({ ctx, input }) => guildService.decide(ctx.user.id, input.requestId, input.accept)),
    invite: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(32) }).strict()).mutation(({ ctx, input }) => guildService.invite(ctx.user.id, input.name)),
    respondInvite: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), accept: z.boolean() }).strict()).mutation(({ ctx, input }) => guildService.respondInvite(ctx.user.id, input.requestId, input.accept)),
    leave: protectedProcedure.mutation(({ ctx }) => guildService.leave(ctx.user.id)),
    kick: protectedProcedure.input(z.object({ userId: z.number().int().positive() }).strict()).mutation(({ ctx, input }) => guildService.kick(ctx.user.id, input.userId)),
    setRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(['leader', 'deputy', 'elite', 'member']) }).strict()).mutation(({ ctx, input }) => guildService.setRole(ctx.user.id, input.userId, input.role)),
    disband: protectedProcedure.mutation(({ ctx }) => guildService.disband(ctx.user.id)),
    settings: protectedProcedure.input(z.object({ notice: z.string().max(200).optional(), joinMode: z.enum(['open', 'approval']).optional(), minLevel: z.number().int().min(1).max(60).optional(), color: z.number().int().min(0).max(31).optional(), pattern: z.number().int().min(0).max(31).optional() }).strict()).mutation(({ ctx, input }) => guildService.updateSettings(ctx.user.id, input)),
    donate: protectedProcedure.input(z.object({ kind: z.enum(['donateSilver', 'donateResources', 'donateGold']) }).strict()).mutation(({ ctx, input }) => guildService.donate(ctx.user.id, input.kind)),
    research: protectedProcedure.input(z.object({ techId: z.enum(['harvest', 'siege', 'garrison', 'raid', 'build', 'supply', 'duel']) }).strict()).mutation(({ ctx, input }) => guildService.research(ctx.user.id, input.techId)),
    buy: protectedProcedure.input(z.object({ itemId: z.string().max(16) }).strict()).mutation(({ ctx, input }) => guildService.buy(ctx.user.id, input.itemId)),
    setTarget: protectedProcedure.input(z.object({ cityId: z.string().trim().min(2).max(32), cityName: z.string().trim().max(16).optional() }).strict()).mutation(({ ctx, input }) => guildService.setTarget(ctx.user.id, input.cityId, input.cityName)),
    claim: protectedProcedure.mutation(({ ctx }) => guildService.claim(ctx.user.id)),
    // 왕궁(2026.10.20 왕 연맹 · 왕 · 황제)
    royal: protectedProcedure.query(({ ctx }) => guildService.royal(ctx.user.id)),
    royalBuy: protectedProcedure.input(z.object({ itemId: z.string().max(16) }).strict()).mutation(({ ctx, input }) => guildService.royalBuy(ctx.user.id, input.itemId)),
    royalClaim: protectedProcedure.mutation(({ ctx }) => guildService.royalClaim(ctx.user.id)),
    logs: protectedProcedure.query(({ ctx }) => guildService.logs(ctx.user.id)),
    chat: protectedProcedure.input(z.object({ afterId: z.number().int().min(0).optional() }).strict()).query(({ ctx, input }) => guildService.chat(ctx.user.id, input.afterId ?? 0)),
    say: protectedProcedure.input(z.object({ text: z.string().trim().min(1).max(400) }).strict()).mutation(async ({ ctx, input }) => { const result = await guildService.say(ctx.user.id, input.text); void pushGuildChat(ctx.user.id, result.id); return result }),
    ranking: protectedProcedure.input(z.object({ kind: z.enum(['level', 'contribution', 'raid']) }).strict()).query(({ ctx, input }) => guildService.ranking(ctx.user.id, input.kind)),
  }),
  board: router({
    list: protectedProcedure.input(z.object({ board: z.enum(['전체', '촉한', '위나라', '오나라', '재야', '연맹']) })).query(({ ctx, input }) => listBoardPosts(ctx.user, input.board)),
    create: protectedProcedure.input(z.object({ board: z.enum(['전체', '촉한', '위나라', '오나라', '재야', '연맹']), title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(4000), password: z.string().min(4).max(64) }).strict()).mutation(({ ctx, input }) => createBoardPost(ctx.user, input)),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive(), password: z.string().min(4).max(64) }).strict()).mutation(({ ctx, input }) => deleteBoardPost(ctx.user, input.id, input.password)),
  }),
  // 실시간 채팅(전체 · 진영 · 연맹). 받기는 /api/chat/stream
  chat: router({
    status: protectedProcedure.query(({ ctx }) => chatStatus(ctx.user)),
    history: protectedProcedure.input(z.object({ channel: z.enum(['all', 'faction', 'alliance']), afterId: z.number().int().min(0).optional() }).strict()).query(({ ctx, input }) => chatHistory(ctx.user, input)),
    send: protectedProcedure.input(z.object({ channel: z.enum(['all', 'faction', 'alliance']), content: z.string().min(1).max(400) }).strict()).mutation(({ ctx, input }) => sendChat(ctx.user, input)),
    blocks: protectedProcedure.query(({ ctx }) => listBlocks(ctx.user)),
    block: protectedProcedure.input(z.object({ userId: z.number().int().positive(), name: z.string().max(64).optional() }).strict()).mutation(({ ctx, input }) => blockUser(ctx.user, input)),
    unblock: protectedProcedure.input(z.object({ userId: z.number().int().positive() }).strict()).mutation(({ ctx, input }) => unblockUser(ctx.user, input)),
    report: protectedProcedure.input(z.object({ messageId: z.number().int().positive(), reason: z.string().max(100).optional() }).strict()).mutation(({ ctx, input }) => reportMessage(ctx.user, input)),
    adminDelete: adminProcedure.input(z.object({ id: z.number().int().positive() }).strict()).mutation(({ input }) => adminDeleteMessage(input.id)),
    adminMute: adminProcedure.input(z.object({ userId: z.number().int().positive(), minutes: z.number().int().min(0).max(60 * 24 * 30), reason: z.string().max(100).optional() }).strict()).mutation(({ input }) => adminMuteUser(input)),
    adminReports: adminProcedure.query(() => adminReports()),
    adminResolve: adminProcedure.input(z.object({ id: z.number().int().positive() }).strict()).mutation(({ input }) => adminResolveReport(input.id)),
  }),
  account: router({
    me: protectedProcedure.query(({ ctx }) => ({ ...accountView(ctx.user), operator: isOperatorUser(ctx.user) })),
    gameState: protectedProcedure.query(({ ctx }) => getGameState(ctx.user.id)),
    luoyangReward: protectedProcedure.query(({ ctx }) => getLuoyangReward(ctx.user.id)),
    // 게스트 계정의 진행을 처음으로 되돌린다(아이디는 유지)
    // 게스트 초기화: 계정(아이디)까지 지우고 세션 쿠키도 지운다
    resetGuest: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await resetGuestGameState(ctx.user)
      try { ctx.res?.clearCookie?.('webdev_app_session', { path: '/', secure: true, sameSite: 'none', httpOnly: true, maxAge: -1 }) } catch { /* 쿠키를 못 지워도 계정은 지워졌다 */ }
      return result
    }),
    grant: protectedProcedure.input(z.object({
      kind: z.enum(['daily', 'scenario', 'faction', 'duel', 'attendance', 'pass', 'passGold']),
      key: z.string().max(96).optional(),
      bonus: z.number().min(0).max(1).optional(),
    })).mutation(({ ctx, input }) => {
      if (ctx.user.isCron) throw new Error('예약 실행 계정은 보상을 받을 수 없습니다.')
      return grantCurrency(ctx.user.id, input)
    }),
    saveGameState: protectedProcedure.input(z.object({
      honor: z.number().int().min(0).max(SAVE_INT_MAX),
      silver: z.number().int().min(0).max(SAVE_INT_MAX),
      gold: z.number().int().min(0).max(SAVE_INT_MAX).optional(),
      manuals: z.number().int().min(0).max(SAVE_INT_MAX),
      wins: z.number().int().min(0).max(SAVE_INT_MAX),
      battleScore: z.number().int().min(0).max(SAVE_INT_MAX),
      grain: z.number().int().min(0).max(SAVE_INT_MAX),
      wood: z.number().int().min(0).max(SAVE_INT_MAX),
      iron: z.number().int().min(0).max(SAVE_INT_MAX),
      influence: z.number().int().min(0).max(SAVE_INT_MAX),
      generalData: z.string().max(500000).optional(),
      formationData: z.string().max(2000).optional(),
      // 도시별 최근 전투 기록(도시당 최대 30건)을 포함해도 저장되도록 TEXT 컬럼 범위에 맞춘다.
      citiesData: z.string().max(4_000_000).optional(),
      researchData: z.string().max(100000).optional(),
      equipmentData: z.string().max(4_000_000).optional(),
      equipmentLoadoutsData: z.string().max(500_000).optional(),
      selectedEquipmentGeneralId: z.string().max(64).optional(),
      selectedCityId: z.string().max(64).nullable().optional(),
      faction: z.enum(['촉한', '위나라', '오나라', '재야']).optional(),
      factionChosen: z.boolean().optional(),
      factionWarScore: z.number().int().min(0).max(SAVE_INT_MAX).optional(),
      luoyangBoxes: z.number().int().min(0).max(SAVE_INT_MAX).optional(),
      lastLuoyangReward: z.number().int().min(0).max(100).nullable().optional(),
      luoyangRewardWeekKey: z.string().max(16).nullable().optional(),
      mythicFragments: z.number().int().min(0).max(SAVE_INT_MAX).optional(),
      mythicStones: z.number().int().min(0).max(SAVE_INT_MAX).optional(),
      duelAttemptsToday: z.number().int().min(0).max(5).optional(),
      duelDayKey: z.string().max(16).nullable().optional(),
      prelaunchGoldDayKey: z.string().max(16).nullable().optional(),
      incomeCollectedAt: z.string().max(32).nullable().optional(),
      conquestAt: z.string().max(32).nullable().optional(),
      scenarioData: z.string().max(100000).optional(),
      missionData: z.string().max(20000).optional(),
      squadData: z.string().max(4000).optional(),
      // 관리자 수정값을 받아들였다는 표시(account.gameState의 adminPatchId 또는 저장 응답의 adminPatch.id)
      adminPatchAck: z.string().max(64).optional(),
      // 불러올 때의 계정 번호: 그 사이 계정이 지워졌다 다시 만들어졌으면(번호가 다름) 옛 진행을 새 계정에 쓰지 않는다
      accountId: z.number().int().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.isCron) throw new Error('예약 실행 계정은 게임 상태를 저장할 수 없습니다.')
      if (input.accountId !== undefined && input.accountId !== ctx.user.id) throw new Error('ACCOUNT_CHANGED')
      const { accountId: _accountId, ...data } = input
      return updateGameState(ctx.user.id, data)
    }),
    updateName: protectedProcedure.input(z.object({
      name: z.string().trim().min(1, '표시 이름을 입력해 주세요.').max(32, '표시 이름은 32자 이내로 입력해 주세요.'),
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.isCron) throw new Error('예약 실행 계정은 수정할 수 없습니다.')
      const updated = await updateUserName(ctx.user.openId, input.name.trim())
      if (!updated) throw new Error('계정 정보를 불러오지 못했습니다.')
      return accountView(updated)
    }),
  }),
  // Gameplay writes and Stripe Checkout mutations must remain protected and derive ownership from ctx.user.
  player: protectedProcedure.query(({ ctx }) => ({ id: ctx.user.id, name: ctx.user.name })),
})

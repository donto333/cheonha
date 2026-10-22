import { describe, expect, it } from 'vitest'
import { ROYAL_GOLD, createGuildService, createMemoryGuildRepo, pickRoyalGuilds } from '../server/guild.mjs'

// 2026.10.20 왕 연맹 · 왕 · 황제
async function throws(run: Promise<unknown>, text: string) {
  let message = ''
  try { await run } catch (error) { message = error instanceof Error ? error.message : String(error) }
  expect(message).toContain(text)
}
const HOUR = 3600_000
const DAY = 24 * HOUR

function world() {
  const accounts = new Map<number, Record<string, unknown>>()
  const add = (userId: number, name: string, faction = '촉한') => accounts.set(userId, { userId, name, faction, maxLevel: 30, power: 1000, gold: 500 })
  add(1, '유비'); add(2, '관우'); add(3, '제갈량'); add(4, '조조', '위나라'); add(5, '손권', '오나라'); add(6, '늦은 이')
  // 화요일 정오(한국)에 시작
  let clock = Date.parse('2026-10-20T03:00:00Z')
  let cities: Array<{ cityId: string; owner: string; guildId?: number | null; level?: number; at?: number }> = []
  let luoyangWinner: string | null = null
  const repo = createMemoryGuildRepo(accounts as never)
  const svc = createGuildService(repo, { now: () => clock, territory: async () => ({ cities, luoyangWinner }) })
  return { svc, repo, accounts, tick: (ms: number) => { clock += ms }, setCities: (list: typeof cities) => { cities = list }, setLuoyang: (f: string | null) => { luoyangWinner = f } }
}

describe('왕 연맹 고르기', () => {
  it('도시 등급 합 → 도시 수 → 먼저 이른 순, 연맹 진영과 도시 주인이 같아야 센다', () => {
    const guilds = [{ id: 1, name: '도원', faction: '촉한', leaderUserId: 1 }, { id: 2, name: '와룡', faction: '촉한', leaderUserId: 3 }, { id: 3, name: '패왕', faction: '위나라', leaderUserId: 4 }]
    const kings = pickRoyalGuilds([
      { cityId: 'a', owner: '촉한', guildId: 1, level: 1, at: 10 }, { cityId: 'b', owner: '촉한', guildId: 1, level: 1, at: 20 },
      { cityId: 'c', owner: '촉한', guildId: 2, level: 2, at: 5 }, { cityId: 'd', owner: '촉한', guildId: 2, level: 1, at: 6 },
      { cityId: 'e', owner: '중립', guildId: 3, level: 5, at: 1 }, // 주인이 바뀐 도시는 세지 않는다
    ], guilds)
    expect(kings['촉한']).toMatchObject({ guildId: 2, cities: 2, levels: 3 })
    const grade = pickRoyalGuilds([{ cityId: 'a', owner: '촉한', guildId: 1, level: 1, at: 1 }, { cityId: 'b', owner: '촉한', guildId: 1, level: 1, at: 1 }, { cityId: 'c', owner: '촉한', guildId: 1, level: 1, at: 1 }, { cityId: 'd', owner: '촉한', guildId: 2, level: 4, at: 9 }], guilds)
    expect(grade['촉한']).toMatchObject({ guildId: 2, cities: 1, levels: 4 }) // 도시 1곳이라도 등급 합 4 > 3
    expect(kings['위나라']).toBeUndefined()
    const tie = pickRoyalGuilds([{ cityId: 'a', owner: '촉한', guildId: 1, level: 1, at: 50 }, { cityId: 'b', owner: '촉한', guildId: 2, level: 1, at: 40 }], guilds)
    expect(tie['촉한'].guildId).toBe(2)
  })
})

describe('왕궁', () => {
  async function setup() {
    const w = world()
    await w.svc.create(1, { name: '도원' })
    await w.svc.apply(2, 1)
    await w.svc.create(4, { name: '패왕' })
    await w.svc.create(5, { name: '강동' })
    w.setCities([{ cityId: 'chengdu', owner: '촉한', guildId: 1, level: 3, at: 1 }, { cityId: 'ye', owner: '위나라', guildId: 2, level: 3, at: 1 }, { cityId: 'luoyang', owner: '위나라', guildId: 2, level: 5, at: 1 }, { cityId: 'jianye', owner: '오나라', guildId: 3, level: 3, at: 1 }])
    w.setLuoyang('위나라')
    return w
  }
  it('정산은 주에 한 번: 그 주 동안 영토가 바뀌어도 칭호는 그대로, 다음 주 월요일에 다시 정한다', async () => {
    const w = await setup()
    const first = await w.svc.royal(1)
    expect(first.kings['촉한']?.guildName).toBe('도원')
    expect(first.kings['위나라']?.guildName).toBe('패왕')
    expect(first.emperorFaction).toBe('위나라')
    expect(first.rank).toBe('king')
    expect((await w.svc.royal(4)).rank).toBe('emperor')
    expect((await w.svc.royal(2)).rank).toBe('member')
    expect((await w.svc.royal(3)).rank).toBeNull()
    w.setCities([])
    expect((await w.svc.royal(1)).kings['촉한']?.guildName).toBe('도원')
    w.tick(7 * DAY)
    expect((await w.svc.royal(1)).kings['촉한']).toBeUndefined()
  })
  it('정산 뒤 들어온 연맹원은 이번 주 혜택이 없다', async () => {
    const w = await setup()
    await w.svc.royal(1)
    w.tick(HOUR)
    await w.svc.apply(6, 1)
    expect((await w.svc.royal(6)).rank).toBeNull()
    await throws(w.svc.royalBuy(6, 'stone'), '왕 연맹원만')
  })
  it('상점 한도: 강화석 연맹원 1 · 왕 2 · 황제 3, 모집 10회 · 조각 5개는 1회, 강화석 · 조각은 서버 장부로', async () => {
    const w = await setup()
    const member = await w.svc.royalBuy(2, 'stone')
    expect(member).toMatchObject({ honor: 3000, ledger: { stones: 1, fragments: 0 } })
    await throws(w.svc.royalBuy(2, 'stone'), '한도(1회)')
    await w.svc.royalBuy(1, 'stone'); await w.svc.royalBuy(1, 'stone')
    await throws(w.svc.royalBuy(1, 'stone'), '한도(2회)')
    for (let i = 0; i < 3; i += 1) await w.svc.royalBuy(4, 'stone')
    await throws(w.svc.royalBuy(4, 'stone'), '한도(3회)')
    expect(w.accounts.get(4)?.stones).toBe(3)
    const recruit = await w.svc.royalBuy(1, 'recruit10')
    expect(recruit).toMatchObject({ honor: 450, grant: { freeRecruits: 10 } })
    await throws(w.svc.royalBuy(1, 'recruit10'), '한도(1회)')
    expect(await w.svc.royalBuy(1, 'fragment5')).toMatchObject({ honor: 1000, ledger: { fragments: 5, stones: 0 } })
    w.tick(7 * DAY)
    // 다음 주: 영토가 그대로면 다시 왕 · 한도 초기화
    expect((await w.svc.royal(1)).shop.find(item => item.id === 'stone')).toMatchObject({ limit: 2, used: 0 })
  })
  it('왕 30 · 황제 50 금화, 주 1회, 연맹원은 못 받는다', async () => {
    const w = await setup()
    expect(await w.svc.royalClaim(1)).toMatchObject({ gold: ROYAL_GOLD.king })
    await throws(w.svc.royalClaim(1), '이미')
    expect(await w.svc.royalClaim(4)).toMatchObject({ gold: ROYAL_GOLD.emperor, rank: 'emperor' })
    await throws(w.svc.royalClaim(2), '왕 · 황제만')
    expect(w.accounts.get(1)?.gold).toBe(500 - 50 + 30)
  })
  it('관리자 재정산: 지금 영토로 다시 정한다', async () => {
    const w = await setup()
    await w.svc.royal(1)
    w.setCities([])
    expect((await w.svc.adminResettleRoyal()).kings).toEqual({})
    expect((await w.svc.royal(1)).rank).toBeNull()
  })
})

describe('재야 녹림왕', () => {
  async function wanderers() {
    const w = world()
    w.accounts.set(7, { userId: 7, name: '팽월', faction: '재야', maxLevel: 30, power: 1000, gold: 500 })
    w.accounts.set(8, { userId: 8, name: '감녕', faction: '재야', maxLevel: 30, power: 1000, gold: 500 })
    await w.svc.create(7, { name: '녹림' })
    await w.svc.create(8, { name: '금범적' })
    return w
  }
  it('지난 주 약탈(성벽 피해) 1위 연맹이 녹림왕, 재야 연맹만 센다', async () => {
    const w = await wanderers()
    await w.svc.siege(7, 3000)
    await w.svc.siege(8, 5000)
    expect((await w.svc.royal(7)).kings['재야']).toBeUndefined() // 이번 주 정산은 이미 지난 주 기준
    w.tick(7 * DAY)
    const info = await w.svc.royal(8)
    expect(info.kings['재야']).toMatchObject({ guildName: '금범적', siege: 5000, title: '녹림왕' })
    expect(info.rank).toBe('king')
    expect(info.kings['재야']?.title).toBe('녹림왕')
  })
  it('재야가 낙양을 차지한 주에는 낙양 점령 연맹이 우선하고 황제가 된다', async () => {
    const w = await wanderers()
    await w.svc.siege(8, 5000)
    w.tick(7 * DAY)
    w.setCities([{ cityId: 'luoyang', owner: '재야', guildId: 1, level: 5, at: 1 }])
    w.setLuoyang('재야')
    const info = await w.svc.royal(7)
    expect(info.kings['재야']?.guildName).toBe('녹림')
    expect(info.emperorFaction).toBe('재야')
    expect(info.rank).toBe('emperor')
  })
})

describe('도시 없는 진영의 왕', () => {
  it('도시를 가진 연맹이 없으면 지난 주 공성(성벽 피해) 1위 연맹, 도시를 가진 연맹이 있으면 도시가 우선', async () => {
    const w = world()
    await w.svc.create(1, { name: '도원' })
    await w.svc.create(3, { name: '와룡' })
    await w.svc.siege(1, 2000)
    await w.svc.siege(3, 7000)
    w.tick(7 * DAY)
    const info = await w.svc.royal(3)
    expect(info.kings['촉한']).toMatchObject({ guildName: '와룡', siege: 7000, title: '왕', cities: 0 })
    expect(info.rank).toBe('king')
    // 다음 주: 도원이 도시 하나를 가지면 공성이 더 적어도 도시가 우선
    await w.svc.siege(3, 9000)
    w.setCities([{ cityId: 'hanzhong', owner: '촉한', guildId: 1, level: 2, at: 1 }])
    w.tick(7 * DAY)
    expect((await w.svc.royal(1)).kings['촉한']?.guildName).toBe('도원')
  })
})

describe('관리자 왕 · 황제 지정 · 위임', () => {
  it('왕 연맹을 직접 정하고, 연맹원에게 왕을 맡기고, 황제를 정하거나 비운다', async () => {
    const w = world()
    await w.svc.create(1, { name: '도원' })
    await w.svc.apply(2, 1)
    await w.svc.royal(1)
    await w.svc.adminSetRoyal({ faction: '촉한', guildId: 1, leaderName: '관우' })
    expect((await w.svc.royal(2)).rank).toBe('king')
    expect((await w.svc.royal(1)).rank).toBe('member')
    await throws(w.svc.adminSetRoyal({ faction: '촉한', guildId: 1, leaderName: '조조' }), '연맹원이 아닙니다')
    await throws(w.svc.adminSetRoyal({ faction: '위나라', guildId: 1 }), '촉한 연맹')
    await throws(w.svc.adminSetEmperor('위나라'), '왕이 없습니다')
    await w.svc.adminSetEmperor('촉한')
    expect((await w.svc.royal(2)).rank).toBe('emperor')
    await w.svc.adminSetRoyal({ faction: '촉한', guildId: 0 })
    const info = await w.svc.royal(2)
    expect(info.rank).toBeNull()
    expect(info.emperorFaction).toBeNull()
  })
  it('왕이 아이디를 바꾸면 왕 이름도 바뀌고, 계정을 지우면 칭호가 새 연맹장에게 간다', async () => {
    const w = world()
    await w.svc.create(1, { name: '도원' })
    await w.svc.apply(2, 1)
    w.setCities([{ cityId: 'chengdu', owner: '촉한', guildId: 1, level: 3, at: 1 }])
    expect((await w.svc.royal(1)).kings['촉한']?.leaderName).toBe('유비')
    await w.svc.adminRenameUser(1, '현덕')
    expect((await w.svc.royal(1)).kings['촉한']?.leaderName).toBe('현덕')
    await w.svc.adminRemoveUser(1)
    const after = await w.svc.royal(2)
    expect(after.kings['촉한']?.leaderUserId).toBe(2)
    expect(after.kings['촉한']?.leaderName).toBe('관우')
  })
})

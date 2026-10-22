import { describe, expect, it } from 'vitest'
import { PURGE_STATEMENTS, RENAME_STATEMENTS, purgeUserRecords, renameUserRecords, withoutUserGarrisons } from '../server/account-records.mjs'

// 2026.10.21 아이디 변경 · 계정 삭제 뒤 남던 기록 정리
describe('계정 기록 정리', () => {
  it('아이디를 바꾸면 채팅 · 게시판 · 연맹 채팅 · 순위표 이름을 모두 새 이름으로 맞춘다', async () => {
    const calls: Array<[string, unknown[]]> = []
    await renameUserRecords(async (sql: string, params: unknown[]) => { calls.push([sql, params]) }, 7, '새이름')
    expect(calls.length).toBe(RENAME_STATEMENTS.length)
    for (const [, params] of calls) expect(params).toEqual(['새이름', 7])
    const joined = calls.map(([sql]) => sql).join('\n')
    for (const table of ['game_chat_messages', 'game_board_posts', 'game_guild_chat', 'game_lb_players', 'raid_weekly_scores', 'city_damage_rankings']) expect(joined.includes(table)).toBe(true)
  })
  it('계정을 지우면 기록을 지우고, 없는 표는 건너뛰며 나머지를 계속 지운다', async () => {
    const calls: string[] = []
    const result = await purgeUserRecords(async (sql: string, params: unknown[]) => {
      calls.push(sql)
      for (const value of params) expect(value).toBe(9)
      if (sql.includes('game_board_posts')) { const error = new Error('no table') as Error & { code?: string }; error.code = 'ER_NO_SUCH_TABLE'; throw error }
    }, 9)
    expect(calls.length).toBe(PURGE_STATEMENTS.length)
    expect(result.failed).toBe(0)
    // 순위표 계정 연결은 맨 마지막에 지운다(앞의 JOIN이 쓰기 때문)
    expect(calls[calls.length - 1]).toBe('DELETE FROM game_lb_accounts WHERE user_id=?')
  })
  it('지운 계정의 도시 수비대를 빼고 격파 수를 남은 부대 수 안으로 줄인다', () => {
    expect(withoutUserGarrisons({ list: [{ userId: 1 }, { userId: 2 }, { userId: 1 }], defeated: 3 }, 1)).toEqual({ list: [{ userId: 2 }], defeated: 1 })
    expect(withoutUserGarrisons({ list: [{ userId: 2 }], defeated: 0 }, 1)).toBe(null)
  })
})

// 계정 아이디를 바꾸거나 계정을 지울 때, 이름을 따로 적어 둔 기록(채팅 · 게시판 · 연맹 채팅 · 순위표)을 함께 맞춘다.
// 표가 아직 없는 서버도 있으므로 문장마다 따로 실행하고 실패는 건너뛴다.
// exec(sql, params) 는 mysql2 pool.execute 와 같은 모양이다(테스트는 가짜를 넣는다).

/** 아이디를 바꿀 때: 그 계정 이름이 적힌 기록을 새 이름으로 */
export const RENAME_STATEMENTS = [
  'UPDATE city_damage_rankings SET displayName=? WHERE userId=?',
  'UPDATE raid_weekly_scores SET displayName=? WHERE userId=?',
  'UPDATE game_chat_messages SET name=? WHERE userId=?',
  'UPDATE game_chat_blocks SET blockedName=? WHERE blockedUserId=?',
  'UPDATE game_chat_reports SET targetName=? WHERE targetUserId=?',
  'UPDATE game_board_posts SET authorName=? WHERE authorUserId=?',
  'UPDATE game_guild_chat SET name=? WHERE userId=?',
  'UPDATE game_lb_players p JOIN game_lb_accounts a ON a.namespace=p.namespace AND a.player_id=p.id SET p.display_name=? WHERE a.user_id=?',
]

/** 계정을 지울 때: 그 계정의 기록을 모두 지운다(순서: 기록 → 순위표 선수 → 계정 연결) */
export const PURGE_STATEMENTS = [
  ['DELETE FROM city_damage_rankings WHERE userId=?', 1],
  ['DELETE FROM raid_weekly_scores WHERE userId=?', 1],
  ['DELETE FROM game_chat_messages WHERE userId=?', 1],
  ['DELETE FROM game_chat_blocks WHERE userId=? OR blockedUserId=?', 2],
  ['DELETE FROM game_chat_reports WHERE targetUserId=? OR reporterUserId=?', 2],
  ['DELETE FROM game_chat_mutes WHERE userId=?', 1],
  ['DELETE FROM game_board_posts WHERE authorUserId=?', 1],
  ['DELETE FROM game_guild_chat WHERE userId=?', 1],
  ['DELETE FROM game_guild_requests WHERE userId=?', 1],
  ['DELETE FROM game_guild_members WHERE userId=?', 1],
  ['DELETE b FROM game_lb_best b JOIN game_lb_accounts a ON a.namespace=b.namespace AND a.player_id=b.player_id WHERE a.user_id=?', 1],
  ['DELETE r FROM game_lb_runs r JOIN game_lb_accounts a ON a.namespace=r.namespace AND a.player_id=r.player_id WHERE a.user_id=?', 1],
  ['DELETE p FROM game_lb_players p JOIN game_lb_accounts a ON a.namespace=p.namespace AND a.player_id=p.id WHERE a.user_id=?', 1],
  ['DELETE FROM game_lb_accounts WHERE user_id=?', 1],
]

async function runEach(exec, list) {
  const failed = []
  for (const [statement, params] of list) {
    try { await exec(statement, params) } catch (error) {
      // 표가 없는 서버(ER_NO_SUCH_TABLE)는 조용히 넘긴다
      if (error?.code !== 'ER_NO_SUCH_TABLE') failed.push(`${statement.split(' ').slice(0, 3).join(' ')}: ${error instanceof Error ? error.message : error}`)
    }
  }
  if (failed.length) console.warn('[account-records]', failed.join(' | ').slice(0, 500))
  return { failed: failed.length }
}

export function renameUserRecords(exec, userId, name) {
  return runEach(exec, RENAME_STATEMENTS.map(statement => [statement, [name, userId]]))
}

export function purgeUserRecords(exec, userId) {
  return runEach(exec, PURGE_STATEMENTS.map(([statement, count]) => [statement, Array(count).fill(userId)]))
}

/** 도시 수비대 목록에서 이 계정이 세운 부대를 뺀다(격파 수는 남은 부대 수를 넘지 않게) */
export function withoutUserGarrisons(garrisons, userId) {
  const list = (garrisons?.list ?? []).filter(item => Number(item?.userId) !== Number(userId))
  if (list.length === (garrisons?.list ?? []).length) return null
  return { list, defeated: Math.min(list.length, Number(garrisons?.defeated) || 0) }
}

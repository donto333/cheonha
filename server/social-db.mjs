// 채팅이 쓰는 DB 연결과 표 만들기.
// 표는 038_chat.sql로 만들지만, SQL을 아직 실행하지 않은 서버에서도 첫 사용 때 스스로 만든다.
import mysql from 'mysql2/promise'

let pool
let ready = null

export function socialPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('Database is not available')
    pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 6, connectTimeout: 5000 })
  }
  return pool
}

/** 테스트에서 가짜 DB를 끼울 때 */
export function setSocialPool(next) { pool = next; ready = Promise.resolve() }

export const SOCIAL_TABLES = [
  `CREATE TABLE IF NOT EXISTS game_chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  channel VARCHAR(32) NOT NULL,
  userId INT UNSIGNED NOT NULL,
  name VARCHAR(64) NOT NULL,
  faction VARCHAR(16) NULL,
  allianceName VARCHAR(24) NULL,
  content VARCHAR(200) NOT NULL,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_game_chat_channel_id (channel, id),
  INDEX idx_game_chat_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS game_chat_blocks (
  userId INT UNSIGNED NOT NULL,
  blockedUserId INT UNSIGNED NOT NULL,
  blockedName VARCHAR(64) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (userId, blockedUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS game_chat_reports (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  messageId BIGINT UNSIGNED NOT NULL,
  reporterUserId INT UNSIGNED NOT NULL,
  targetUserId INT UNSIGNED NOT NULL,
  targetName VARCHAR(64) NOT NULL,
  content VARCHAR(200) NOT NULL,
  reason VARCHAR(100) NOT NULL DEFAULT '',
  resolved TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_game_chat_reports_once (messageId, reporterUserId),
  INDEX idx_game_chat_reports_open (resolved, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS game_chat_mutes (
  userId INT UNSIGNED NOT NULL PRIMARY KEY,
  untilAt DATETIME(3) NOT NULL,
  reason VARCHAR(100) NOT NULL DEFAULT '',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
]

/** 표가 없으면 만든다(한 번만) */
export async function socialDb() {
  const db = socialPool()
  if (!ready) ready = (async () => { for (const sql of SOCIAL_TABLES) await db.query(sql) })().catch(error => { ready = null; throw error })
  await ready
  return db
}

/** 이 계정의 지금 진영(없으면 null) */
export async function currentFaction(userId) {
  const db = await socialDb()
  const [rows] = await db.query('SELECT faction FROM game_account_states WHERE userId=? LIMIT 1', [userId])
  return rows[0]?.faction ?? null
}

export const GUEST_PREFIX = 'guest_'
export function isGuestUser(user) { return String(user?.openId ?? '').startsWith(GUEST_PREFIX) }
export function displayName(user) { return ((user?.name ?? '').trim() || '이름 없는 장군').slice(0, 64) }

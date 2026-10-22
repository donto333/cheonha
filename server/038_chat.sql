-- 실시간 채팅(전체 · 진영 채널, 차단 · 신고 · 채팅 금지). 연맹 채널은 037_guilds.sql의 game_guild_chat을 쓴다.
-- 서버가 첫 사용 때 같은 표를 스스로 만들지만, 미리 실행해 두면 첫 접속이 빨라진다.
CREATE TABLE IF NOT EXISTS game_chat_messages (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_chat_blocks (
  userId INT UNSIGNED NOT NULL,
  blockedUserId INT UNSIGNED NOT NULL,
  blockedName VARCHAR(64) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (userId, blockedUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_chat_reports (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_chat_mutes (
  userId INT UNSIGNED NOT NULL PRIMARY KEY,
  untilAt DATETIME(3) NOT NULL,
  reason VARCHAR(100) NOT NULL DEFAULT '',
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

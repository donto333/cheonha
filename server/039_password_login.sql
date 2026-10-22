-- 2026.10.22: Manus 로그인 대신 아이디 · 비밀번호 로그인(server/account-auth.mjs). 비밀번호는 scrypt 해시로만 저장한다.
ALTER TABLE users ADD COLUMN passwordHash varchar(255) NULL;

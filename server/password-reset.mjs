// 비밀번호 재설정(운영자용): Render 환경 변수 PASSWORD_RESET="아이디:새비밀번호" 를 넣고 서버를 다시 켜면
//  - 회원 계정이면 비밀번호를 새 값으로 바꾼다(게임 기록 그대로).
//  - 게스트로 시작한 아이디면 그 계정에 비밀번호를 붙여 회원 계정으로 바꾼다(게임 기록 그대로, 게스트 기기 토큰은 끊김).
//  - 그 아이디가 아예 없으면 그 아이디 · 비밀번호로 새 회원 계정을 만든다.
// 바꾼 뒤에는 환경 변수를 지우는 것이 안전하다(남겨 두어도 같은 값이면 다시 바꾸지 않는다).
import { randomUUID } from 'node:crypto'
import { MEMBER_OPEN_ID_PREFIX, hashPassword, validatePassword, verifyPassword } from './account-auth.mjs'
import { validateGuestName } from './guest-auth.mjs'

/** "아이디:새비밀번호" → { name, password } (비밀번호에 : 이 있어도 첫 : 에서만 나눈다) */
export function parsePasswordReset(raw) {
  const text = String(raw ?? '').trim()
  const at = text.indexOf(':')
  if (!text || at <= 0) return null
  const name = text.slice(0, at).trim()
  const password = validatePassword(text.slice(at + 1))
  if (!name) return null
  if (!password.ok) return { error: password.reason }
  return { name, password: password.password }
}

/** 서버가 켜질 때 한 번 실행. 결과는 비밀번호 없이 로그에만 남긴다 */
export async function applyPasswordResetFromEnv({ findAccountByName, setPasswordHash, convertToMember, createPasswordUser, env = process.env, log = console.log }) {
  const input = parsePasswordReset(env.PASSWORD_RESET)
  if (!input) return 'none'
  if (input.error) { log(`[password-reset] 적용 안 함: ${input.error}`); return 'invalid' }
  const row = await findAccountByName(input.name)
  const hash = await hashPassword(input.password)
  if (!row) {
    const name = validateGuestName(input.name)
    if (!name.ok) { log(`[password-reset] 적용 안 함: ${name.reason}`); return 'invalid' }
    await createPasswordUser(`${MEMBER_OPEN_ID_PREFIX}${randomUUID()}`, name.name, hash)
    log(`[password-reset] '${name.name}' 아이디가 없어서 이 아이디 · 비밀번호로 새 회원 계정을 만들었습니다. 이제 PASSWORD_RESET 환경 변수를 지우십시오.`)
    return 'created'
  }
  if (row.passwordHash && await verifyPassword(input.password, row.passwordHash)) { log(`[password-reset] '${row.name}' 이미 새 비밀번호입니다. PASSWORD_RESET 환경 변수를 지워도 됩니다.`); return 'same' }
  if (!row.passwordHash) {
    await convertToMember(row.id, `${MEMBER_OPEN_ID_PREFIX}${randomUUID()}`, hash)
    log(`[password-reset] '${row.name}' 게스트 계정에 비밀번호를 붙여 회원 계정으로 바꿨습니다(게임 기록 그대로). 이제 PASSWORD_RESET 환경 변수를 지우십시오.`)
    return 'converted'
  }
  await setPasswordHash(row.openId, hash)
  log(`[password-reset] '${row.name}' 비밀번호를 바꿨습니다. 이제 PASSWORD_RESET 환경 변수를 지우십시오.`)
  return 'changed'
}

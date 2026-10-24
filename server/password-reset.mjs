// 비밀번호 재설정(운영자용): Render 환경 변수 PASSWORD_RESET="아이디:새비밀번호" 를 넣고 서버를 다시 켜면
// 그 아이디(회원 계정)의 비밀번호를 새 값으로 바꾼다. 게임 기록은 그대로 남는다.
// 바꾼 뒤에는 환경 변수를 지우는 것이 안전하다(남겨 두어도 같은 값이면 다시 바꾸지 않는다).
import { hashPassword, validatePassword, verifyPassword } from './account-auth.mjs'

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
export async function applyPasswordResetFromEnv({ findPasswordLogin, setPasswordHash, env = process.env, log = console.log }) {
  const input = parsePasswordReset(env.PASSWORD_RESET)
  if (!input) return 'none'
  if (input.error) { log(`[password-reset] 적용 안 함: ${input.error}`); return 'invalid' }
  const row = await findPasswordLogin(input.name)
  if (!row) { log(`[password-reset] '${input.name}' 회원 계정을 찾지 못했습니다(게스트 계정은 비밀번호가 없습니다).`); return 'missing' }
  if (await verifyPassword(input.password, row.passwordHash)) { log(`[password-reset] '${row.name}' 이미 새 비밀번호입니다. PASSWORD_RESET 환경 변수를 지워도 됩니다.`); return 'same' }
  await setPasswordHash(row.openId, await hashPassword(input.password))
  log(`[password-reset] '${row.name}' 비밀번호를 바꿨습니다. 이제 PASSWORD_RESET 환경 변수를 지우십시오.`)
  return 'changed'
}

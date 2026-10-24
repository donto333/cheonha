import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../server/account-auth.mjs'
import { applyPasswordResetFromEnv, parsePasswordReset } from '../server/password-reset.mjs'

describe('운영자 비밀번호 재설정(PASSWORD_RESET)', () => {
  it('아이디:새비밀번호를 첫 : 에서 나누고 길이를 확인한다', () => {
    expect(parsePasswordReset('')).toBeNull()
    expect(parsePasswordReset('천하:ab:cd:ef')).toEqual({ name: '천하', password: 'ab:cd:ef' })
    expect(parsePasswordReset('천하:123')).toHaveProperty('error')
  })
  it('회원 계정의 비밀번호만 바꾸고, 같은 값이면 다시 바꾸지 않는다', async () => {
    const row = { openId: 'member_1', name: '천하', passwordHash: await hashPassword('old-pass') }
    const deps = { findPasswordLogin: async name => (name === '천하' ? row : null), setPasswordHash: async (_, hash) => { row.passwordHash = hash }, log: () => {} }
    expect(await applyPasswordResetFromEnv({ ...deps, env: { PASSWORD_RESET: '천하:new-pass' } })).toBe('changed')
    expect(await verifyPassword('new-pass', row.passwordHash)).toBe(true)
    expect(await applyPasswordResetFromEnv({ ...deps, env: { PASSWORD_RESET: '천하:new-pass' } })).toBe('same')
    expect(await applyPasswordResetFromEnv({ ...deps, env: { PASSWORD_RESET: '없는이:new-pass' } })).toBe('missing')
    expect(await applyPasswordResetFromEnv({ ...deps, env: {} })).toBe('none')
  })
})

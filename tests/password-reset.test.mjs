import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../server/account-auth.mjs'
import { applyPasswordResetFromEnv, parsePasswordReset } from '../server/password-reset.mjs'

function harness(rows) {
  const deps = {
    findAccountByName: async name => rows.find(row => row.name.toLowerCase() === name.toLowerCase()) ?? null,
    setPasswordHash: async (openId, hash) => { rows.find(row => row.openId === openId).passwordHash = hash },
    convertToMember: async (id, openId, hash) => { Object.assign(rows.find(row => row.id === id), { openId, passwordHash: hash }) },
    createPasswordUser: async (openId, name, hash) => { rows.push({ id: rows.length + 1, openId, name, passwordHash: hash }) },
    log: () => {},
  }
  return (value) => applyPasswordResetFromEnv({ ...deps, env: value === undefined ? {} : { PASSWORD_RESET: value } })
}

describe('운영자 비밀번호 재설정(PASSWORD_RESET)', () => {
  it('아이디:새비밀번호를 첫 : 에서 나누고 길이를 확인한다', () => {
    expect(parsePasswordReset('')).toBeNull()
    expect(parsePasswordReset('천하:ab:cd:ef')).toEqual({ name: '천하', password: 'ab:cd:ef' })
    expect(parsePasswordReset('천하:123')).toHaveProperty('error')
  })
  it('회원 계정의 비밀번호를 바꾸고, 같은 값이면 다시 바꾸지 않는다', async () => {
    const rows = [{ id: 1, openId: 'member_1', name: '천하', passwordHash: await hashPassword('old-pass') }]
    const run = harness(rows)
    expect(await run('천하:new-pass')).toBe('changed')
    expect(await verifyPassword('new-pass', rows[0].passwordHash)).toBe(true)
    expect(await run('천하:new-pass')).toBe('same')
    expect(await run()).toBe('none')
  })
  it('게스트 아이디는 회원 계정으로 바꾸고, 없는 아이디는 새로 만든다', async () => {
    const rows = [{ id: 1, openId: 'guest_1', name: 'donto333', passwordHash: null }]
    const run = harness(rows)
    expect(await run('DONTO333:new-pass')).toBe('converted')
    expect(rows[0].openId.startsWith('member_')).toBe(true)
    expect(await verifyPassword('new-pass', rows[0].passwordHash)).toBe(true)
    expect(await run('새장군:new-pass')).toBe('created')
    expect(rows).toHaveLength(2)
  })
})

import { describe, expect, it } from 'vitest'
import { registerAccountAuthRoutes, hashPassword, verifyPassword, validatePassword } from '../server/account-auth.mjs'
import { normalizeDatabaseUrl } from '../server/db-url.mjs'

function harness() {
  const routes = {}
  const users = new Map()
  const byName = async name => [...users.values()].find(u => u.name.toLowerCase() === String(name).toLowerCase()) ?? null
  registerAccountAuthRoutes({ post: (path, _json, fn) => { routes[path] = fn } }, {
    json: null,
    sdk: { createSessionToken: async (openId, options) => `tok:${openId}:${options.name}` },
    findUserByName: byName,
    findPasswordLogin: byName,
    createPasswordUser: async (openId, name, passwordHash) => users.set(openId, { openId, name, passwordHash }),
    grantAdminByName: async () => {},
    setSessionCookie: (_req, res, token) => { res.cookie = token },
    sessionMaxAgeMs: 1000,
  })
  return async (path, body, ip = '1.1.1.1') => {
    const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this }, json(value) { this.body = value; return this } }
    await routes[path]({ body, headers: { 'x-forwarded-for': ip }, is: () => true }, res)
    return res
  }
}

describe('아이디 · 비밀번호 계정', () => {
  it('비밀번호 해시를 확인한다', async () => {
    const stored = await hashPassword('secret123')
    expect(stored.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('secret123', stored)).toBe(true)
    expect(await verifyPassword('wrong123', stored)).toBe(false)
    expect(await verifyPassword('secret123', 'junk')).toBe(false)
    expect(validatePassword('12345').ok).toBe(false)
  })

  it('가입 · 중복 · 로그인 · 틀린 비밀번호', async () => {
    const call = harness()
    const signup = await call('/api/account/signup', { name: '조자룡', password: 'abcdef1' })
    expect(signup.code).toBe(200)
    expect(signup.body.token.startsWith('tok:member_')).toBe(true)
    expect(signup.cookie).toBe(signup.body.token)
    expect((await call('/api/account/signup', { name: '조자룡', password: 'abcdef1' })).code).toBe(409)
    expect((await call('/api/account/login', { name: '조자룡', password: 'abcdef1' })).code).toBe(200)
    expect((await call('/api/account/login', { name: '조자룡', password: 'nope1234' })).code).toBe(401)
    expect((await call('/api/account/login', { name: '없는사람', password: 'nope1234' })).code).toBe(401)
    expect((await call('/api/account/signup', { name: 'a', password: 'abcdef1' })).code).toBe(400)
  })

  it('한 IP에서 한 시간에 5개까지만 가입한다', async () => {
    const call = harness()
    for (let i = 0; i < 5; i++) expect((await call('/api/account/signup', { name: `user${i}`, password: 'abcdef1' }, '9.9.9.9')).code).toBe(200)
    expect((await call('/api/account/signup', { name: 'user9', password: 'abcdef1' }, '9.9.9.9')).code).toBe(429)
  })
})

describe('클라우드 MySQL 주소', () => {
  it('ssl-mode=REQUIRED를 mysql2 ssl 옵션으로 바꾼다', () => {
    const url = new URL(normalizeDatabaseUrl('mysql://u:p@db.example.com:12345/defaultdb?ssl-mode=REQUIRED'))
    expect(url.searchParams.has('ssl-mode')).toBe(false)
    expect(JSON.parse(url.searchParams.get('ssl'))).toEqual({ rejectUnauthorized: false })
    expect(normalizeDatabaseUrl('mysql://u:p@h:1/d')).toBe('mysql://u:p@h:1/d')
  })
})

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const root = process.cwd()
// .env(DATABASE_URL · JWT_SECRET 등)가 있으면 읽는다
if (existsSync(`${root}/.env`)) process.loadEnvFile(`${root}/.env`)
const env = { ...process.env }
// DB 구조를 먼저 맞춘다(DATABASE_URL이 있을 때)
if (env.DATABASE_URL) {
  for (const script of ['db-migrate.mjs', 'leaderboard/migrate.mjs']) {
    const result = spawnSync(process.execPath, [script], { cwd: `${root}/server`, env, stdio: 'inherit' })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
}
const apiPort = Number(env.API_PORT ?? 3001)
const children = []

const api = spawn(process.execPath, ['index.mjs'], {
  cwd: `${root}/server`,
  env: { ...env, PORT: String(apiPort) },
  stdio: 'inherit',
})
children.push(api)

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
  cwd: root,
  env: { ...env, PORT: env.PORT ?? '3000', HOST: env.HOST ?? '0.0.0.0' },
  stdio: 'inherit',
})
children.push(vite)

let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  setTimeout(() => process.exit(code), 300)
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`online development process stopped (${signal ?? code ?? 'unknown'})`)
      shutdown(code ?? 1)
    }
  })
}

process.once('SIGINT', () => shutdown(0))
process.once('SIGTERM', () => shutdown(0))

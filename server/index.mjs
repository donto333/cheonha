import './db-url.mjs'
import { createGameApp } from './app.mjs'
import { leaderboard } from './leaderboard.mjs'
import { gameRouter } from './routers.mjs'

// 자체 서버: DATABASE_URL(MySQL)과 세션 서명용 JWT_SECRET만 있으면 된다(예전 MANUS_JWT_SECRET도 받는다).
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const secret = process.env.JWT_SECRET || process.env.MANUS_JWT_SECRET || ''
if (secret.length < 32) throw new Error('JWT_SECRET is required (32자 이상의 무작위 문자열)')
const app = createGameApp(gameRouter, { leaderboard })
// Render 등 프록시 뒤에서 req.ip · https 판단이 맞게
app.set('trust proxy', 1)
const port = Number(process.env.PORT || 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
app.listen(port, '0.0.0.0', () => console.log(`천하 서버: http://0.0.0.0:${port}`))

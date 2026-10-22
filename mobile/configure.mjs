// 접속기 설정 만들기: node configure.mjs https://내서버주소
// 앱은 이 주소의 게임 화면을 그대로 열어 API · 쿠키가 같은 주소로 동작한다.
import { writeFileSync } from 'node:fs'

const raw = (process.argv[2] || process.env.SERVER_URL || '').trim()
let url
try { url = new URL(raw) } catch { console.error('서버 주소가 필요합니다: node configure.mjs https://example.onrender.com'); process.exit(1) }
if (url.protocol !== 'https:') { console.error('서버 주소는 https:// 로 시작해야 합니다.'); process.exit(1) }

const config = {
  appId: process.env.APP_ID || 'com.donto333.cheonha',
  appName: '천하',
  webDir: 'www',
  server: {
    url: url.origin + url.pathname.replace(/\/?$/, '/'),
    allowNavigation: [url.hostname],
    errorPath: 'offline.html',
  },
  android: {
    backgroundColor: '#2a1810',
    allowMixedContent: false,
  },
}
writeFileSync('capacitor.config.json', JSON.stringify(config, null, 2) + '\n')
// 연결 실패 화면의 [다시 연결] 버튼이 돌아갈 주소
writeFileSync('www/server.js', `window.CHEONHA_URL = ${JSON.stringify(config.server.url)}\n`)
console.log(`접속 주소: ${config.server.url}`)

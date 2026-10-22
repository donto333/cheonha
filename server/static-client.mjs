// 빌드한 게임 화면(dist/)을 API와 같은 서버에서 준다. STATIC_DIR이 없거나 비어 있으면 아무것도 하지 않는다.
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import express from 'express'

export function registerStaticClient(app, { dir } = {}) {
  if (!dir) return false
  const root = resolve(dir)
  const index = join(root, 'index.html')
  if (!existsSync(index)) {
    console.warn(`[static] ${index} 없음: 게임 화면 없이 API만 엽니다.`)
    return false
  }
  app.use(express.static(root, {
    index: 'index.html',
    setHeaders(res, path) {
      // index.html은 늘 새로 받고, 나머지 자산은 하루 캐시(배포 때 파일 이름 · 버전이 바뀐다)
      res.setHeader('Cache-Control', path.endsWith('.html') ? 'no-cache' : 'public, max-age=86400')
    },
  }))
  // /api 밖의 알 수 없는 주소는 게임 첫 화면으로
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(index))
  return true
}

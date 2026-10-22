import { describe, expect, it } from 'vitest'

// tRPC router({ ... })는 apply · call · then 키를 예약어로 막는다. 쓰면 서버가 시작되지 않는다(2026.10.18 게시 실패).
// 프로젝트 타입 설정에 Node 타입이 없으므로(node:fs 불가) Vite의 파일 불러오기로 서버 파일 글을 읽는다.
const sources = import.meta.glob<string>(['../server/routers.mjs', '../server/leaderboard/*.mjs'], { query: '?raw', import: 'default', eager: true })

describe('서버 tRPC 라우터 키', () => {
  it('예약어(apply · call · then)를 라우터 키로 쓰지 않는다', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0)
    for (const [file, text] of Object.entries(sources)) {
      const bad = text.split('\n').filter((line: string) => /^\s+(apply|call|then)\s*:\s*(protectedProcedure|publicProcedure|adminProcedure|router)\b/.test(line))
      expect(bad, file).toEqual([])
    }
  })
})

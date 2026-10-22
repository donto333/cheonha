import { describe, expect, it } from 'vitest'
import { rewriteStatement, splitTopLevel, stripLineComments } from '../server/migrate-compat.mjs'

describe('MySQL용 마이그레이션 변환', () => {
  it('따옴표 · 괄호 안의 쉼표는 나누지 않는다', () => {
    expect(splitTopLevel("ADD COLUMN a enum('x','y'), ADD COLUMN b int", ',')).toHaveLength(2)
    expect(stripLineComments("SELECT '--x' -- 설명\nFROM t")).toBe("SELECT '--x' \nFROM t")
  })
  it('없는 열만 ADD COLUMN으로 바꾸고, 다 있으면 실행하지 않는다', async () => {
    const existing = new Set(['t.a'])
    const has = async (table, column) => existing.has(`${table}.${column}`)
    const sql = "ALTER TABLE `t`\n  ADD COLUMN IF NOT EXISTS `a` int NULL,\n  ADD COLUMN IF NOT EXISTS `b` enum('x','y') NOT NULL DEFAULT 'x'"
    expect(await rewriteStatement(sql, has)).toBe("ALTER TABLE `t` ADD COLUMN `b` enum('x','y') NOT NULL DEFAULT 'x'")
    existing.add('t.b')
    expect(await rewriteStatement(sql, has)).toBeNull()
    expect(await rewriteStatement('ALTER TABLE t MODIFY COLUMN a int', has)).toBe('ALTER TABLE t MODIFY COLUMN a int')
  })
})

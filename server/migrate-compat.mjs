// MySQL 8은 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`를 모른다(TiDB · MariaDB만 안다).
// 마이그레이션 파일은 그대로 두고, 실행할 때 실제 열 목록을 보고 없는 열만 ADD COLUMN으로 바꿔 실행한다.

/** 따옴표 · 괄호 안이 아닌 곳의 구분자로 나눈다 */
export function splitTopLevel(text, separator) {
  const parts = []
  let depth = 0, quote = null, start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === '\\') { i++; continue }
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === separator && depth === 0) { parts.push(text.slice(start, i)); start = i + 1 }
  }
  parts.push(text.slice(start))
  return parts
}

/** 줄 주석(-- …)을 지운다(따옴표 안은 건드리지 않는다) */
export function stripLineComments(sql) {
  let out = '', quote = null
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (quote) {
      out += ch
      if (ch === '\\') { out += sql[++i] ?? ''; continue }
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; out += ch; continue }
    if (ch === '-' && sql[i + 1] === '-') { while (i < sql.length && sql[i] !== '\n') i++; out += '\n'; continue }
    out += ch
  }
  return out
}

const IF_NOT_EXISTS_COLUMN = /^\s*ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+`?([A-Za-z0-9_]+)`?/i
const ALTER_TABLE = /^\s*ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?\s+/i

/**
 * 문장 하나를 MySQL용으로 바꾼다. hasColumn(table, column)으로 이미 있는 열은 빼고,
 * 남는 절이 없으면 null(실행하지 않음).
 */
export async function rewriteStatement(statement, hasColumn) {
  const alter = statement.match(ALTER_TABLE)
  if (!alter || !/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i.test(statement)) return statement
  const table = alter[1]
  const clauses = splitTopLevel(statement.slice(alter[0].length), ',')
  const kept = []
  for (const clause of clauses) {
    const column = clause.match(IF_NOT_EXISTS_COLUMN)
    if (!column) { kept.push(clause); continue }
    if (await hasColumn(table, column[1])) continue
    kept.push(clause.replace(/IF\s+NOT\s+EXISTS\s+/i, ''))
  }
  if (kept.length === 0) return null
  return `ALTER TABLE \`${table}\` ${kept.map(c => c.trim()).join(',\n  ')}`
}

/** 마이그레이션 파일 하나를 실행한다(ADD COLUMN IF NOT EXISTS가 없으면 통째로 그대로) */
export async function runMigrationSql(connection, sql) {
  if (!/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i.test(sql)) {
    await connection.query(sql)
    return
  }
  const hasColumn = async (table, column) => {
    const [rows] = await connection.query(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
      [table, column],
    )
    return rows.length > 0
  }
  for (const raw of splitTopLevel(stripLineComments(sql), ';')) {
    if (!raw.trim()) continue
    const statement = await rewriteStatement(raw.trim(), hasColumn)
    if (statement) await connection.query(statement)
  }
}

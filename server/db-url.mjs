// 클라우드 MySQL 주소 정리: Aiven · PlanetScale 등이 주는 ?ssl-mode=REQUIRED 를 mysql2가 알아듣는 ssl 옵션으로 바꾼다.
// (mysql2는 ssl-mode를 무시하고 암호화 없이 붙으려다 거절당한다.) 가져오기만 하면 process.env.DATABASE_URL을 고친다.
export function normalizeDatabaseUrl(raw) {
  if (!raw) return raw
  let url
  try { url = new URL(raw) } catch { return raw }
  const mode = (url.searchParams.get('ssl-mode') ?? url.searchParams.get('sslmode') ?? '').toUpperCase()
  url.searchParams.delete('ssl-mode'); url.searchParams.delete('sslmode')
  if (['REQUIRED', 'REQUIRE', 'VERIFY_CA', 'VERIFY_IDENTITY'].includes(mode) && !url.searchParams.has('ssl')) {
    // 서비스 자체 인증서(CA)를 따로 넣지 않으므로 암호화만 하고 인증서 검증은 하지 않는다(임시 서버용)
    url.searchParams.set('ssl', JSON.stringify({ rejectUnauthorized: false }))
  }
  return url.toString()
}
if (process.env.DATABASE_URL) process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL)

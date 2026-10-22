// 휴대폰 크기로 게임 화면을 메뉴마다 캡처한다(모바일 UI 점검용).
//  node scripts/ui-shots.mjs [출력 폴더]   (먼저 pnpm build)
// 가로 화면 두 크기로, 로컬 게스트(서버 없음) 상태에서 찍는다.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const out = process.argv[2] || 'ui-shots'
mkdirSync(out, { recursive: true })
const port = 4791
const url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const SECTIONS = ['overview', 'recruit', 'roster', 'codex', 'formation', 'equipment', 'territory', 'research', 'battle', 'duel', 'raid', 'shop', 'rank', 'board', 'guild', 'updates', 'account']
// 가로 고정 게임: 일반 휴대폰 · 작은 휴대폰 가로 화면
const VIEWS = [
  { name: 'land', viewport: { width: 844, height: 390 } },
  { name: 'galaxy', viewport: { width: 915, height: 412 } },
  { name: 'small', viewport: { width: 740, height: 360 } },
]
const errors = []

try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) break } catch {}
    await sleep(250)
  }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
  for (const view of VIEWS) {
    const context = await browser.newContext({ viewport: view.viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' })
    // 처음 안내(인트로)는 이미 본 것으로
    await context.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(`[${view.name}] ${error}`))
    const shot = async name => {
      await sleep(700)
      // 늦게 뜨는 출석 · 안내 창도 지운다
      await page.evaluate(() => { if (document.querySelector('.app-shell')) document.querySelectorAll('.attendance-modal, .coach-layer, .notice-popup, .game-intro').forEach(el => el.remove()); document.querySelectorAll('.toast').forEach(el => { el.style.visibility = 'hidden' }) })
      await page.screenshot({ path: `${out}/${view.name}-${name}.png` })
    }

    await page.goto(url)
    await page.waitForSelector('.access-gate', { timeout: 20_000 })
    await shot('00-access-gate')
    await page.locator('[data-action="login"]').evaluate(b => b.click()).catch(() => {})
    await sleep(500)
    if (await page.locator('.account-login').count()) await shot('01-account-login')
    await page.evaluate(() => document.querySelector('.account-login')?.remove())
    await page.locator('[data-action="guest-login"]').evaluate(b => b.click())
    await page.waitForSelector('.faction-selection, .app-shell', { timeout: 15_000 })
    if (await page.locator('.faction-selection').count()) {
      await shot('02-faction-select')
      await page.locator('[data-action="faction-select"]').first().evaluate(b => b.click())
    }
    await page.waitForSelector('.app-shell', { timeout: 15_000 }).catch(async error => { await shot('99-stuck'); throw error })
    // 코치 말풍선 · 출석 같은 덮개는 닫는다
    const clearOverlays = () => page.evaluate(() => {
      // 첫 입장 튜토리얼 · 출석 · 안내 창은 캡처에서 뺀다
      const g = window.__strategy
      if (g?.state?.missions) g.state.missions.onboardDone = true
      document.querySelectorAll('.attendance-modal, .coach-layer, .notice-popup, .game-intro').forEach(el => el.remove()); document.querySelectorAll('.toast').forEach(el => { el.style.visibility = 'hidden' })
      document.body.classList.remove('coach-open')
    })
    await clearOverlays()

    for (const [index, section] of SECTIONS.entries()) {
      try {
        await page.evaluate(s => { const g = window.__strategy; g.state.section = s; g.ui.render(g.state) }, section)
        await clearOverlays()
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(`${String(10 + index).padStart(2, '0')}-${section}`)
        // 긴 화면은 아래쪽도 한 장
        const tall = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight * 1.6)
        if (tall) { await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2)); await shot(`${String(10 + index).padStart(2, '0')}-${section}-b`) }
      } catch (error) { errors.push(`[${view.name}] ${section}: ${error}`) }
    }
    // 더보기 메뉴
    await page.evaluate(() => { const g = window.__strategy; g.state.section = 'overview'; g.ui.render(g.state) })
    await clearOverlays()
    const more = page.locator('[data-action="nav-more"]')
    if (await more.count()) { await more.first().evaluate(b => b.click()); await shot('90-nav-more') }
    // 본영 임무 창 · 메뉴 접기
    const missionsBtn = page.locator('[data-action="lobby-panel"]')
    if (await missionsBtn.count()) {
      await page.evaluate(() => { const g = window.__strategy; g.state.section = 'overview'; g.ui.render(g.state) })
      await page.locator('[data-action="lobby-panel"]').first().evaluate(b => b.click()); await shot('92-lobby-missions')
      await page.locator('[data-action="lobby-panel-close"]').first().evaluate(b => b.click())
      await page.locator('[data-action="lobby-menu-toggle"]').first().evaluate(b => b.click()); await shot('93-lobby-collapsed')
      await page.locator('[data-action="lobby-menu-toggle"]').first().evaluate(b => b.click())
    }
    // 채팅 창
    const chat = page.locator('[data-social="toggle"]')
    if (await chat.count()) { await page.keyboard.press('Escape'); await chat.first().evaluate(b => b.click()); await shot('91-chat') }
    await context.close()
  }
  await browser.close()
} finally {
  server.kill('SIGTERM')
}
console.log(errors.length ? `오류 ${errors.length}개:\n${errors.join('\n')}` : '오류 없음')

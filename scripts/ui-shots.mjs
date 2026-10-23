// 휴대폰 크기로 게임 화면을 메뉴마다 캡처한다(모바일 UI 점검용).
//  node scripts/ui-shots.mjs [출력 폴더]   (먼저 pnpm build)
// 가로 화면 두 크기로, 로컬 게스트(서버 없음) 상태에서 찍는다.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
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
const metrics = []

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
    // 휴대폰에서는 게임이 가로 틀(iframe) 안에서 뜬다(src/boot.ts): 찍기는 탭, 조작은 게임 틀에서
    const tab = await context.newPage()
    tab.on('pageerror', error => errors.push(`[${view.name}] ${error}`))
    let page = tab.mainFrame()
    const shot = async name => {
      await sleep(700)
      // 늦게 뜨는 출석 · 안내 창도 지운다
      await page.evaluate(() => { if (document.querySelector('.app-shell')) document.querySelectorAll('.attendance-modal, .coach-layer, .notice-popup, .game-intro').forEach(el => el.remove()); document.querySelectorAll('.toast').forEach(el => { el.style.visibility = 'hidden' }) })
      await tab.screenshot({ path: `${out}/${view.name}-${name}.png` })
    }

    await tab.goto(url)
    await sleep(800)
    const shell = await tab.$('iframe.landscape-shell__frame')
    if (shell) page = (await shell.contentFrame()) ?? page
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
    // 실제 플레이와 비슷하게: 무장 30명(1~3군 편성) · 장비 40여 개 · 넉넉한 재화
    await page.evaluate(() => {
      const g = window.__strategy
      const all = g.catalog.generals()
      const pick = all.slice(0, 30).map((general, index) => ({ ...general, level: 1 + (index * 7) % 40, stars: 1 + index % 5 }))
      g.state.generals = pick
      g.state.formation = pick.slice(0, 3).map(general => general.id)
      g.state.reserveSquads = [pick.slice(3, 6).map(general => general.id), pick.slice(6, 9).map(general => general.id)]
      g.state.honor = 999999; g.state.gold = 683; g.state.silver = 62920
      for (let i = 0; i < 4; i += 1) g.debug.drawEquipment(10)
      g.state.honor = 11480
      g.ui.render(g.state)
    })
    await clearOverlays()

    for (const [index, section] of SECTIONS.entries()) {
      try {
        await page.evaluate(s => { const g = window.__strategy; g.state.section = s; g.ui.render(g.state) }, section)
        await clearOverlays()
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(`${String(10 + index).padStart(2, '0')}-${section}`)
        // 화면 길이 재기: 실제로 스크롤되는 칸(문서 또는 내용 칸)의 높이 ÷ 화면 높이
        const metric = await page.evaluate(() => {
          const candidates = [document.scrollingElement, document.querySelector('.main-content'), ...document.querySelectorAll('.main-content *')]
          let best = { h: 0, v: window.innerHeight, el: null }
          for (const el of candidates) {
            if (!el) continue
            const style = el === document.scrollingElement ? null : getComputedStyle(el)
            const scrolls = el === document.scrollingElement || /(auto|scroll)/.test(style.overflowY)
            if (scrolls && el.scrollHeight > el.clientHeight + 4 && el.scrollHeight > best.h) best = { h: el.scrollHeight, v: el.clientHeight, el }
          }
          if (best.el) best.el.setAttribute('data-shot-scroller', '1')
          return best.el ? { ratio: +(best.h / best.v).toFixed(2), scroller: best.el === document.scrollingElement ? 'document' : (best.el.className || best.el.tagName).toString().slice(0, 40) } : { ratio: 1, scroller: '-' }
        })
        metrics.push(`${view.name}\t${section}\t${metric.ratio}\t${metric.scroller}`)
        // 긴 화면은 아래로 넘겨 가며 두 장 더
        for (const [step, label] of [[1, 'b'], [2, 'c']]) {
          if (metric.ratio <= step) break
          await page.evaluate(n => { const el = document.querySelector('[data-shot-scroller]'); if (el) el.scrollTop = el.clientHeight * n; else window.scrollTo(0, window.innerHeight * n) }, step)
          await shot(`${String(10 + index).padStart(2, '0')}-${section}-${label}`)
        }
        await page.evaluate(() => { const el = document.querySelector('[data-shot-scroller]'); if (el) { el.scrollTop = 0; el.removeAttribute('data-shot-scroller') } })
      } catch (error) { errors.push(`[${view.name}] ${section}: ${error}`) }
    }
    // 더보기 메뉴
    await page.evaluate(() => { const g = window.__strategy; g.state.section = 'overview'; g.ui.render(g.state) })
    await clearOverlays()
    const more = page.locator('[data-action="nav-more"]')
    if (await more.count()) { await more.first().evaluate(b => b.click()); await shot('90-nav-more') }
    // 본영 임무 창 · 이벤트 창
    for (const [panel, label] of [['missions', '92-lobby-missions'], ['events', '93-lobby-events']]) {
      await page.evaluate(() => { const g = window.__strategy; g.state.section = 'overview'; g.ui.render(g.state) })
      await clearOverlays()
      const btn = page.locator(`[data-action="lobby-panel"][data-panel="${panel}"]`)
      if (await btn.count()) { await btn.first().evaluate(b => b.click()); await shot(label); await page.locator('[data-action="lobby-panel-close"]').first().evaluate(b => b.click()) }
    }
    // 모집 결과 · 장비 결과 창
    await page.evaluate(() => { const g = window.__strategy; g.ui.showRecruitResults(g.catalog.generals().slice(10, 20)) })
    await shot('95-recruit-results'); await page.evaluate(() => document.querySelectorAll('.recruit-results').forEach(el => el.remove()))
    await page.evaluate(() => { const g = window.__strategy; g.ui.showEquipmentResults(g.debug.drawEquipment(10)) })
    await shot('96-gear-results'); await page.evaluate(() => document.querySelectorAll('.recruit-results').forEach(el => el.remove()))
    // 모집 연출 · 작전 결과 창
    await page.evaluate(() => { const g = window.__strategy; const general = g.catalog.generals().find(item => item.grade >= 5) ?? g.catalog.generals()[0]; void g.ui.playRecruitAnimation(general, 1, true, '신규유저 패키지 · 천명 무장 추적권') })
    await sleep(1600); await shot('99a-ritual'); await page.evaluate(() => document.querySelectorAll('.summon-ritual').forEach(el => el.remove()))
    await page.evaluate(() => { const g = window.__strategy; g.ui.recruitAnimationActive = false; g.ui.showBattleResult({ won: true, reason: 'wipe', stars: 2, score: 12840, durationMs: 14000, breaks: 3, patterns: 7, maxCombo: 1, troopRatio: 0.86, collapses: 0 }, '', [{ label: '전투 연구', text: '2개 적용 · 오부 훈련, 손자병법 주해', tone: 'good' }, { label: '병종 상성', text: '유리 1레인 · 불리 1레인', tone: 'neutral' }, { label: '장비', text: '출전 무장 장착 9/9칸', tone: 'good' }, { label: '무장 성장', text: '평균 Lv.22 · 적 Lv.12', tone: 'good' }]) })
    await shot('99b-battle-result'); await page.evaluate(() => document.querySelectorAll('.result-modal').forEach(el => el.remove()))
    // 장비 상세 창 · 영토 내정 탭 · 상점 최근 구매
    await page.evaluate(() => { const g = window.__strategy; g.state.section = 'equipment'; g.ui.render(g.state) })
    if (await page.locator('.eqtile').count()) { await page.locator('.eqtile').first().evaluate(b => b.click()); await shot('97-equipment-detail'); await page.locator('[data-action="equipment-detail-close"]').first().evaluate(b => b.click()) }
    await page.evaluate(() => { const g = window.__strategy; g.state.section = 'territory'; g.ui.render(g.state) })
    if (await page.locator('[data-action="city-tab"][data-tab="dev"]').count()) { await page.locator('[data-action="city-tab"][data-tab="dev"]').first().evaluate(b => b.click()); await shot('98-territory-dev'); await page.locator('[data-action="city-tab"][data-tab="act"]').first().evaluate(b => b.click()) }
    // 영토 도시 검색
    await page.evaluate(() => { const g = window.__strategy; g.state.section = 'territory'; g.ui.render(g.state) })
    if (await page.locator('[data-terr-search-input]').count()) { await page.locator('[data-terr-search-input]').first().fill('양'); await shot('99-territory-search') }
    // 무장 상세 창
    await page.evaluate(() => { const g = window.__strategy; g.state.section = 'roster'; g.ui.render(g.state) })
    if (await page.locator('.gtile').count()) { await page.locator('.gtile').first().evaluate(b => b.click()); await shot('94-roster-detail'); await page.locator('[data-action="general-detail-close"]').first().evaluate(b => b.click()) }
    // 채팅 창
    const chat = page.locator('[data-social="toggle"]')
    if (await chat.count()) { await tab.keyboard.press('Escape'); await chat.first().evaluate(b => b.click()); await shot('91-chat') }
    // 전투 중 화면(시점 단추 자리 확인)
    try {
      await page.evaluate(() => { document.querySelectorAll('.social-panel, .chat-panel').forEach(el => el.remove()); const g = window.__strategy; g.state.section = 'battle'; g.ui.render(g.state) })
      const start = page.locator('[data-action="battle-start"], [data-action="scenario-start"]')
      if (await start.count()) { await start.first().evaluate(b => b.click()); await sleep(4000); await clearOverlays(); await shot('99c-battle-live') }
    } catch (error) { errors.push(`[${view.name}] battle-live: ${error}`) }
    await context.close()
  }
  // 세로로 든 휴대폰: 게임이 90도 돌아간 가로 화면으로 떠야 한다
  {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', screen: { width: 412, height: 915 } })
    await context.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
    const page = await context.newPage()
    await page.goto(url)
    await sleep(5000)
    await page.screenshot({ path: `${out}/portrait-shell.png` })
    await context.close()
  }
  await browser.close()
} finally {
  server.kill('SIGTERM')
}
writeFileSync(`${out}/lengths.tsv`, `화면\t메뉴\t화면 대비 길이\t스크롤 칸\n${metrics.join('\n')}\n`)
console.log(errors.length ? `오류 ${errors.length}개:\n${errors.join('\n')}` : '오류 없음')

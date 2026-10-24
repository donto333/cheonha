// 임시: 불러오기 화면 → 로그인 화면 → 게스트 입장 → 새로고침하면 다시 로그인 화면인지
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
const out = process.argv[2] || '/tmp/out'
mkdirSync(out, { recursive: true })
const port = 4796, url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = []
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break } catch {} await sleep(250) }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' })
  await ctx.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
  const tab = await ctx.newPage()
  tab.on('pageerror', e => log.push(`pageerror ${e}`))
  // 느린 연결 흉내(그림마다 120ms 늦게)
  await ctx.route(/\.(webp|png|svg|mp3)(\?|$)/, async route => { await sleep(120); await route.continue() })
  const t0 = Date.now()
  await tab.goto(url)
  const frameOf = async () => (await (await tab.$('iframe.landscape-shell__frame'))?.contentFrame()) ?? tab.mainFrame()
  let frame = await frameOf()
  for (const ms of [400, 1500, 3000]) { await sleep(ms - (Date.now() - t0) > 0 ? ms - (Date.now() - t0) : 0); frame = await frameOf(); const st = await frame.evaluate(() => ({ loader: !!document.querySelector('.boot-loader'), pct: document.querySelector('.boot-loader__pct')?.textContent, status: document.querySelector('.boot-loader__status')?.textContent, gate: !!document.querySelector('.access-gate') })).catch(e => String(e)); log.push(`t=${ms} ${JSON.stringify(st)}`); await tab.screenshot({ path: `${out}/1-loader-${ms}.png` }) }
  frame = await frameOf()
  await frame.waitForFunction(() => !document.querySelector('.boot-loader'), null, { timeout: 90000 })
  log.push(`loader gone after ${Date.now() - t0}ms, gate=${await frame.locator('.access-gate').count()}`)
  await sleep(800); await tab.screenshot({ path: `${out}/2-gate.png` })
  await frame.locator('[data-action="guest-login"]').evaluate(b => b.click())
  await frame.waitForSelector('.faction-selection, .app-shell', { timeout: 15000 })
  if (await frame.locator('[data-action="faction-select"]').count()) await frame.locator('[data-action="faction-select"]').first().evaluate(b => b.click())
  await frame.waitForSelector('.app-shell', { timeout: 15000 }); await sleep(1500)
  await frame.evaluate(() => document.querySelectorAll('.attendance-modal, .coach-layer, .notice-popup').forEach(el => el.remove()))
  await tab.screenshot({ path: `${out}/3-in-game.png` })
  log.push(`entered: shell=${await frame.locator('.app-shell').count()}`)
  // 새로고침: 다시 불러오기 → 로그인 화면이어야 한다
  await tab.reload(); await sleep(1000)
  frame = await frameOf()
  await frame.waitForSelector('.access-gate', { timeout: 30000 }).catch(() => {})
  await frame.waitForFunction(() => !document.querySelector('.boot-loader'), null, { timeout: 90000 }).catch(() => {})
  await sleep(2500)
  log.push(`after reload: gate=${await frame.locator('.access-gate').count()} shell=${await frame.locator('.app-shell').count()}`)
  await tab.screenshot({ path: `${out}/4-reload-gate.png` })
  // 다시 게스트로 들어가면 예전 진행이 남아 있어야 한다(진영 선택 없이 바로 본영)
  await frame.locator('[data-action="guest-login"]').evaluate(b => b.click()); await sleep(2500)
  log.push(`re-enter: faction=${await frame.locator('.faction-selection').count()} shell=${await frame.locator('.app-shell').count()}`)
  await ctx.close(); await browser.close()
} finally { writeFileSync(`${out}/log.txt`, log.join('\n')); server.kill() }

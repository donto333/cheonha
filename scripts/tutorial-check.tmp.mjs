// 임시: 튜토리얼 5(무장 강화) · 6(장비 강화)를 실제 터치로 진행해 본다
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
const out = process.argv[2] || '/tmp/out'
mkdirSync(out, { recursive: true })
const port = 4793, url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = []
const VIEWS = [
  { name: 'phone-844x390', viewport: { width: 844, height: 390 }, touch: true },
  { name: 'pc-1600x900', viewport: { width: 1600, height: 900 } },
]
const UP = ['.roster-grid .gcard .gcard-up:not([disabled])', '.gdetail .gcard .gcard-up:not([disabled])', '.gdetail:not(.eqdetail) .gdetail__close', '.gtile[data-kind="roster"]']
const EN = ['.equipment-card [data-action="equipment-enhance"]:not([disabled])', '.eqdetail .gdetail__close', '.eqtile:not([data-grade="mythic"])']
let failed = false
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break } catch {} await sleep(250) }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
  for (const v of VIEWS) {
    const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: 1, isMobile: !!v.touch, hasTouch: !!v.touch, locale: 'ko-KR', ...(v.touch ? { userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' } : {}) })
    await ctx.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
    const tab = await ctx.newPage()
    tab.on('pageerror', e => log.push(`[${v.name}] pageerror ${e}`))
    await tab.goto(url)
    await sleep(1500)
    const shellEl = await tab.$('iframe.landscape-shell__frame')
    const frame = (await shellEl?.contentFrame()) ?? tab.mainFrame()
    const off = shellEl ? await shellEl.boundingBox() : { x: 0, y: 0 }
    await frame.waitForSelector('.access-gate', { timeout: 25000 })
    await frame.locator('[data-action="guest-login"]').evaluate(b => b.click())
    await frame.waitForSelector('.faction-selection, .app-shell', { timeout: 15000 })
    if (await frame.locator('[data-action="faction-select"]').count()) await frame.locator('[data-action="faction-select"]').first().evaluate(b => b.click())
    await frame.waitForSelector('.app-shell', { timeout: 15000 })
    await sleep(2000)
    await frame.evaluate(() => document.querySelectorAll('.attendance-modal').forEach(el => el.remove()))
    // 4단계까지 끝낸 상태로: 무장 · 장비를 갖추고 5단계(무장 강화)로
    await frame.evaluate(() => { const g = window.__strategy; const s = g.state; s.honor = Math.max(s.honor, 5000); g.debug.drawEquipment(10); s.missions.onboardDone = false; s.missions.onboardStep = 5; g.ui.render(s) })
    let shot = 0
    for (let t = 0; t < 40; t++) {
      await sleep(1200)
      await frame.evaluate(() => document.querySelectorAll('.attendance-modal').forEach(el => el.remove()))
      const st = await frame.evaluate(() => { const s = window.__strategy.state; return { step: s.missions.onboardStep, done: s.missions.onboardDone, section: s.section, coach: document.querySelector('.coach-layer .coach-bubble')?.textContent?.slice(0, 60) ?? '' } })
      if (st.step >= 7 || st.done) { log.push(`${v.name} OK step=${st.step}`); await tab.screenshot({ path: `${out}/${v.name}-${String(++shot).padStart(2, '0')}-done.png` }); break }
      const list = st.step === 5 ? UP : EN
      const sel = await frame.evaluate(list => list.find(s => document.querySelector(s)) ?? '', list)
      await tab.screenshot({ path: `${out}/${v.name}-${String(++shot).padStart(2, '0')}-s${st.step}.png` })
      log.push(`${v.name} t=${t} step=${st.step} section=${st.section} target=${sel} coach="${st.coach}"`)
      if (!sel) continue
      const box = await frame.locator(sel).first().boundingBox()
      if (!box) continue
      const x = off.x + box.x + box.width / 2, y = off.y + box.y + box.height / 2
      if (v.touch) await tab.touchscreen.tap(x, y); else await tab.mouse.click(x, y)
      if (t === 39) { failed = true; log.push(`${v.name} STUCK`) }
    }
    await ctx.close()
  }
  await browser.close()
} finally { writeFileSync(`${out}/log.txt`, log.join('\n')); server.kill() }
if (failed) process.exit(1)

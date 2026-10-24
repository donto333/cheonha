// 임시: 지도 전체 화면에서 도시를 눌러 공성 출정까지
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
const out = process.argv[2] || '/tmp/out'
mkdirSync(out, { recursive: true })
const port = 4797, url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = []
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break } catch {} await sleep(250) }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
  for (const v of [{ name: 'land', w: 844, h: 390 }, { name: 'small', w: 740, h: 360 }]) {
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' })
    await ctx.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
    const tab = await ctx.newPage()
    tab.on('pageerror', e => log.push(`[${v.name}] pageerror ${e}`))
    await tab.goto(url); await sleep(1200)
    const shell = await tab.$('iframe.landscape-shell__frame')
    const frame = (await shell?.contentFrame()) ?? tab.mainFrame()
    const off = shell ? await shell.boundingBox() : { x: 0, y: 0 }
    await frame.waitForSelector('.access-gate', { timeout: 30000 })
    await frame.waitForFunction(() => !document.querySelector('.boot-loader'), null, { timeout: 90000 })
    await frame.locator('[data-action="guest-login"]').evaluate(b => b.click())
    await frame.waitForSelector('.faction-selection, .app-shell', { timeout: 15000 })
    if (await frame.locator('[data-action="faction-select"]').count()) await frame.locator('[data-action="faction-select"]').first().evaluate(b => b.click())
    await frame.waitForSelector('.app-shell', { timeout: 15000 }); await sleep(1500)
    const clear = () => frame.evaluate(() => { document.querySelectorAll('.attendance-modal, .coach-layer, .notice-popup').forEach(el => el.remove()); document.querySelectorAll('.toast').forEach(el => { el.style.visibility = 'hidden' }); document.body.classList.remove('coach-open') })
    await frame.evaluate(() => { const g = window.__strategy; g.state.missions.onboardDone = true; g.state.section = 'territory'; g.ui.render(g.state) })
    await sleep(800); await clear()
    await frame.locator('[data-map-action="fullscreen"]').first().evaluate(b => b.click()); await sleep(600); await clear()
    await tab.screenshot({ path: `${out}/${v.name}-1-full.png` })
    const zoomOf = () => frame.evaluate(() => getComputedStyle(document.querySelector('[data-map-world]')).transform)
    log.push(`[${v.name}] before ${await zoomOf()}`)
    const id = await frame.evaluate(() => { const s = window.__strategy.state; const m = [...document.querySelectorAll('.city-marker')].find(m => { const r = m.getBoundingClientRect(); const c = s.cities.find(x => x.id === m.dataset.city); return c && c.owner !== s.faction && r.left > innerWidth * .3 && r.right < innerWidth * .75 && r.top > 60 && r.bottom < innerHeight - 60 }); return m?.dataset.city })
    await sleep(1200); await clear()
    const box = await frame.locator(`.city-marker[data-city="${id}"]`).boundingBox()
    await tab.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await sleep(900); await clear()
    const after = await frame.evaluate(id => { const m = document.querySelector(`.city-marker[data-city="${id}"]`).getBoundingClientRect(); return { sel: window.__strategy.state.selectedCityId, x: Math.round(m.left + m.width / 2), y: Math.round(m.top + m.height / 2), w: innerWidth } }, id)
    log.push(`[${v.name}] tapped ${id} → ${JSON.stringify(after)} ${await zoomOf()}`)
    await tab.screenshot({ path: `${out}/${v.name}-2-closeup.png` })
    await frame.locator('.city-sheet-close').first().evaluate(b => b.click()); await sleep(900); await clear()
    log.push(`[${v.name}] closed sheet=${await frame.locator('.is-sheet-open').count()} ${await zoomOf()}`)
    await tab.screenshot({ path: `${out}/${v.name}-3-closed.png` })
    await ctx.close()
  }
  await browser.close()
} finally { writeFileSync(`${out}/log.txt`, log.join('\n')); server.kill() }

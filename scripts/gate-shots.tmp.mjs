import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
const out = process.argv[2] || '/tmp/out'
mkdirSync(out, { recursive: true })
const port = 4792, base = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = []
const say = l => { log.push(l); writeFileSync(`${out}/log.txt`, log.join('\n')) }
setTimeout(() => { say('HARD TIMEOUT'); server.kill(); process.exit(0) }, 240000)
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break } catch {} await sleep(250) }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
  for (const v of [{ n: 'phone', vp: { width: 844, height: 390 } }, { n: 'small', vp: { width: 740, height: 360 } }]) {
    const ctx = await browser.newContext({ viewport: v.vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' })
    await ctx.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
    const tab = await ctx.newPage()
    tab.on('pageerror', e => say(`PAGEERROR ${e}`))
    await tab.goto(base); await sleep(2000)
    const F = () => tab.frames().find(f => f !== tab.mainFrame()) ?? tab.mainFrame()
    await F().waitForSelector('[data-action="guest-login"]', { timeout: 90000 })
    await F().locator('[data-action="guest-login"]').evaluate(b => b.click())
    await F().waitForSelector('.faction-selection, .app-shell', { timeout: 30000 })
    if (await F().locator('[data-action="faction-select"]').count()) await F().locator('[data-action="faction-select"]').first().evaluate(b => b.click())
    await F().waitForSelector('.app-shell', { timeout: 30000 }); await sleep(1500)
    await F().evaluate(() => { document.querySelectorAll('.attendance-modal, .notice-popup, .coach-layer, .toast').forEach(e => e.remove()); const g = window.__strategy; g.state.missions.onboardDone = true; g.state.section = 'research'; g.ui.render(g.state) })
    await sleep(1800)
    await F().evaluate(() => document.querySelectorAll('.coach-layer, .toast').forEach(e => e.remove()))
    const bg = await F().evaluate(() => { const a = getComputedStyle(document.querySelector('.app-shell')); return a.backgroundImage.slice(0, 300) })
    say(`${v.n} bg=${bg}`)
    await tab.screenshot({ path: `${out}/res-${v.n}.png` })
    await ctx.close()
  }
  await browser.close()
} catch (e) { say(`FATAL ${e}`) } finally { server.kill(); process.exit(0) }

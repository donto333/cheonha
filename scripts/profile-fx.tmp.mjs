// 임시: 무장 프로필 연출을 시간대별로 찍는다
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
const out = process.argv[2] || '/tmp/out'
mkdirSync(out, { recursive: true })
const port = 4794, url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = []
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break } catch {} await sleep(250) }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
  const v = { name: 'phone', viewport: { width: 844, height: 390 } }
  const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' })
  await ctx.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
  const tab = await ctx.newPage()
  tab.on('pageerror', e => log.push(`pageerror ${e}`))
  await tab.goto(url); await sleep(1500)
  const frame = (await (await tab.$('iframe.landscape-shell__frame'))?.contentFrame()) ?? tab.mainFrame()
  await frame.waitForSelector('.access-gate', { timeout: 25000 })
  await frame.locator('[data-action="guest-login"]').evaluate(b => b.click())
  await frame.waitForSelector('.faction-selection, .app-shell', { timeout: 15000 })
  if (await frame.locator('[data-action="faction-select"]').count()) await frame.locator('[data-action="faction-select"]').first().evaluate(b => b.click())
  await frame.waitForSelector('.app-shell', { timeout: 15000 }); await sleep(1500)
  const clear = () => frame.evaluate(() => { document.querySelectorAll('.attendance-modal, .coach-layer, .notice-popup').forEach(el => el.remove()); document.querySelectorAll('.toast').forEach(el => { el.style.visibility = 'hidden' }); document.body.classList.remove('coach-open') })
  await frame.evaluate(() => { const g = window.__strategy; const s = g.state; s.missions.onboardDone = true; s.silver = 9e6; s.manuals = 9e5; const five = g.catalog.generals().find(x => x.grade === 5 && !s.generals.some(o => o.id === x.id)); if (five && !s.generals.some(o => o.grade === 5)) s.generals.push(JSON.parse(JSON.stringify(five))); s.section = 'roster'; g.ui.render(s) })
  await sleep(800); await clear()
  const pick = await frame.evaluate(() => { const s = window.__strategy.state; const top = [...s.generals].sort((a, b) => b.grade - a.grade)[0]; return top.id })
  log.push(`pick ${pick}`)
  const open = async (sel, tag) => {
    await clear()
    await frame.locator(sel).first().evaluate(b => b.click())
    for (const [ms, label] of [[90, 'a'], [300, 'b'], [550, 'c'], [1600, 'd'], [3200, 'e']]) {
      await sleep(ms - (label === 'a' ? 0 : 0)); await clear()
      await tab.screenshot({ path: `${out}/${tag}-${label}.png` })
    }
    const info = await frame.evaluate(() => { const d = document.querySelector('.gdetail'); return d && { cls: d.className, grade: d.dataset.grade, fx: !!d.querySelector('.gfx-art'), embers: d.querySelectorAll('.gfx-embers i').length, art: getComputedStyle(d.querySelector('.gfx-art') || d).backgroundImage.slice(0, 60) } })
    log.push(`${tag} ${JSON.stringify(info)}`)
  }
  const close = async () => { await frame.locator('.gdetail__close').first().evaluate(b => b.click()); await sleep(300) }
  const still = async (sel, tag) => { await clear(); await frame.locator(sel).first().evaluate(b => b.click()); await sleep(2200); await clear(); await tab.screenshot({ path: `${out}/${tag}.png` }); log.push(`${tag} ${await frame.evaluate(() => document.querySelector('.gdetail article')?.className)}`); await close() }
  await still(`.gtile[data-kind="roster"][data-id="${pick}"]`, '1-roster-owned')
  await frame.evaluate(() => { const g = window.__strategy; g.state.section = 'codex'; g.ui.render(g.state) }); await sleep(800)
  await still(`.gtile[data-kind="codex"][data-id="${pick}"]`, '2-codex-owned')
  await still('.gtile[data-kind="codex"].is-locked', '3-codex-locked')
  const ev = await frame.evaluate(() => [...document.querySelectorAll('.gtile[data-kind="codex"].is-locked')].length)
  log.push(`locked tiles ${ev}`)
  await frame.locator('.gtile[data-kind="codex"].is-locked').first().evaluate(b => b.click()); await sleep(500)
  await frame.locator('.gdetail [data-section="recruit"]').first().evaluate(b => b.click()); await sleep(600)
  log.push(`after recruit button: section=${await frame.evaluate(() => window.__strategy.state.section)} detail=${await frame.locator('.gdetail').count()}`)
  await ctx.close(); await browser.close()
} finally { writeFileSync(`${out}/log.txt`, log.join('\n')); server.kill() }

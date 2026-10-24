// 임시: 새 출석 체크 창을 휴대폰 가로 세 크기로 찍는다
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
const out = process.argv[2] || '/tmp/out'
mkdirSync(out, { recursive: true })
const port = 4795, url = `http://127.0.0.1:${port}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = []
const VIEWS = [
  { name: 'land', viewport: { width: 844, height: 390 } },
  { name: 'galaxy', viewport: { width: 915, height: 412 } },
  { name: 'small', viewport: { width: 740, height: 360 } },
  { name: 'pc', viewport: { width: 1600, height: 900 }, desktop: true },
]
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break } catch {} await sleep(250) }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
  for (const v of VIEWS) {
    const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: v.desktop ? 1 : 2, isMobile: !v.desktop, hasTouch: !v.desktop, locale: 'ko-KR', ...(v.desktop ? {} : { userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' }) })
    await ctx.addInitScript(() => { try { localStorage.setItem('cheonharo.intro.seen', '1') } catch {} })
    const tab = await ctx.newPage()
    tab.on('pageerror', e => log.push(`[${v.name}] pageerror ${e}`))
    await tab.goto(url); await sleep(1500)
    const frame = (await (await tab.$('iframe.landscape-shell__frame'))?.contentFrame()) ?? tab.mainFrame()
    await frame.waitForSelector('.access-gate', { timeout: 25000 })
    await frame.locator('[data-action="guest-login"]').evaluate(b => b.click())
    await frame.waitForSelector('.faction-selection, .app-shell', { timeout: 15000 })
    if (await frame.locator('[data-action="faction-select"]').count()) await frame.locator('[data-action="faction-select"]').first().evaluate(b => b.click())
    await frame.waitForSelector('.app-shell', { timeout: 15000 }); await sleep(1500)
    for (const [day, label] of [[1, '조인 무장 획득'], [24, '24일째 보상 · 무장 뽑기 무료 10회']]) {
      await frame.evaluate(([d, l]) => { document.querySelectorAll('.coach-layer, .notice-popup').forEach(el => el.remove()); document.querySelectorAll('.toast').forEach(el => { el.style.visibility = 'hidden' }); const g = window.__strategy; g.state.missions.onboardDone = true; g.state.section = 'overview'; g.ui.render(g.state); g.ui.showAttendance(d, l) }, [day, label])
      await sleep(1200)
      const m = await frame.evaluate(() => { const p = document.querySelector('.attendance-modal__panel'); const r = p?.getBoundingClientRect(); const cells = [...document.querySelectorAll('.attendance-day')]; const clip = cells.filter(c => { const cr = c.getBoundingClientRect(); return cr.bottom > r.bottom + 1 || cr.right > r.right + 1 || cr.height < 30 }).length; const lab = cells.filter(c => { const l = c.querySelector('.attendance-day__label'); return l && l.scrollHeight > l.clientHeight + 2 }).length; return { panel: r && [Math.round(r.width), Math.round(r.height)], vh: innerHeight, cells: cells.length, clipped: clip, labelCut: lab, cellH: Math.round(cells[10]?.getBoundingClientRect().height ?? 0) } })
      log.push(`${v.name} day${day} ${JSON.stringify(m)}`)
      await tab.screenshot({ path: `${out}/${v.name}-day${day}.png` })
    }
    await ctx.close()
  }
  await browser.close()
} finally { writeFileSync(`${out}/log.txt`, log.join('\n')); server.kill() }

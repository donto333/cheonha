// 처음 불러오기 화면(2026.10.24): 게임 코드와 로그인 화면 · 본영 · 화면 틀 그림을 다 받아 둔 뒤 로그인 화면으로 넘어간다.
// 받을 목록은 빌드 때 scripts/asset-versions.mjs가 src/preload-manifest.json에 적는다.
//  critical   — 다 받아야 넘어간다(로그인 화면 · 본영 · 화면 틀 · 얼굴 · 재화 · 장비)
//  background — 로그인 화면에 있는 동안 이어서 받는다(메뉴 안쪽 그림 · 무장 초상 · 영토 · 전장 · 효과음)
// 받은 그림은 브라우저 캐시에 남아, 게임 안에서는 기다리지 않고 바로 뜬다.
import manifest from '../preload-manifest.json'
import { assetUrl } from '../asset-url'

const list = manifest as { critical: string[]; background: string[] }

/** 게임이 실제로 부르는 주소(같은 주소여야 캐시가 맞는다): 무장 초상은 해시 붙은 주소, 화면 틀 · 아이콘 · 상점 그림은 둘 다 */
function urlsOf(path: string): string[] {
  const versioned = assetUrl(path)
  if (versioned === path) return [path]
  if (path.startsWith('/assets/generals-realistic-webp/')) return [versioned]
  if (/^\/assets\/ui\/v2\/(kit|icons|shop)\//.test(path)) return [path, versioned]
  return [path]
}

function fetchOne(url: string): Promise<void> {
  return new Promise(resolve => {
    if (/\.mp3(\?|$)/i.test(url)) {
      // 소리는 내려받아 캐시에만 둔다
      fetch(url, { cache: 'force-cache' }).then(r => r.blob()).then(() => resolve(), () => resolve())
      return
    }
    const img = new Image()
    img.decoding = 'async'
    const done = () => resolve()
    img.onload = () => { if (img.decode) img.decode().then(done, done); else done() }
    img.onerror = done
    img.src = url
  })
}

/** 여러 개를 동시에(최대 width개) 받는다 */
async function pool(urls: string[], width: number, step: () => void): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++]
      await fetchOne(url)
      step()
    }
  }
  await Promise.all(Array.from({ length: Math.min(width, urls.length) }, worker))
}

const TIPS = [
  '같은 진영 무장을 함께 내보내면 인연 효과로 능력이 오릅니다.',
  '출석 체크는 한국 시간 자정에 새 보상으로 바뀝니다.',
  '가운데 자리는 적이 먼저 노리는 전열입니다. 단단한 무장을 세우십시오.',
  '장비는 같은 세트를 모아 끼우면 세트 효과가 붙습니다.',
  '전투 중 경고가 뜨면 같은 쪽 무장을 눌러 막을 수 있습니다.',
  '무장 레벨이 오르면 능력치와 병력이 함께 늘어납니다.',
]

const STYLE = `
.boot-loader{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;background:#0b0705;color:#f3e6c4;font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif;transition:opacity .45s ease;user-select:none;-webkit-user-select:none}
.boot-loader.is-done{opacity:0;pointer-events:none}
.boot-loader__bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 38%,rgba(120,70,20,.35),transparent 62%),linear-gradient(180deg,#140b06,#070403);}
.boot-loader__art{position:absolute;inset:0;background:center/cover no-repeat;opacity:0;transition:opacity .8s ease;filter:brightness(.42) saturate(.9)}
.boot-loader__art.is-on{opacity:1}
.boot-loader__vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,.85) 100%)}
.boot-loader__body{position:relative;display:grid;justify-items:center;gap:6px;width:min(560px,86vw);text-align:center}
.boot-loader__title{width:min(340px,62vw);aspect-ratio:2087/650;background:center/contain no-repeat;opacity:0;transition:opacity .6s ease;filter:drop-shadow(0 4px 10px rgba(0,0,0,.8))}
.boot-loader__title.is-on{opacity:1}
.boot-loader__name{margin:0;font-size:34px;font-weight:900;letter-spacing:.2em;color:#ffe08a;text-shadow:0 2px 0 #6b3d0c,0 4px 12px #000}
.boot-loader__sub{margin:-2px 0 8px;font-size:13px;letter-spacing:.5em;color:#d9c08a}
.boot-loader__bar{position:relative;width:100%;height:12px;margin-top:10px;padding:2px;box-sizing:border-box;background:linear-gradient(180deg,#1a120b,#0b0705);border:1px solid #b8913f;border-radius:7px;box-shadow:0 0 0 1px #000,0 2px 8px rgba(0,0,0,.8)}
.boot-loader__fill{position:relative;height:100%;width:0;border-radius:5px;background:linear-gradient(180deg,#ffe9a6,#f0b640 55%,#b8761c);box-shadow:0 0 10px rgba(255,190,80,.7);transition:width .25s ease}
.boot-loader__fill::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);background-size:60px 100%;background-repeat:no-repeat;animation:boot-shine 1.4s linear infinite}
@keyframes boot-shine{from{background-position:-60px 0}to{background-position:calc(100% + 60px) 0}}
.boot-loader__row{display:flex;justify-content:space-between;width:100%;font-size:12px;color:#d8c9a6}
.boot-loader__row b{color:#ffe08a;font-weight:800}
.boot-loader__tip{margin-top:12px;min-height:2.6em;font-size:12px;line-height:1.45;color:#cdbb94}
.boot-loader__tip::before{content:'TIP ';color:#f0b640;font-weight:800}
@media (max-height:420px){.boot-loader__title{width:min(260px,44vw)}.boot-loader__tip{margin-top:6px}}
@media (prefers-reduced-motion:reduce){.boot-loader__fill::after{animation:none}}
`

export interface BootLoader {
  /** 다 받았으면(또는 너무 오래 걸리면) 화면을 걷는다 */
  finished: Promise<void>
}

/**
 * 불러오기 화면을 띄우고, 게임 코드(app)와 필수 그림을 받는다.
 * 둘 다 끝나면 화면이 사라지며 그 아래 로그인 화면이 보인다. 이어서 나머지 그림을 조용히 받는다.
 */
export function startBootLoader(app: Promise<unknown>): BootLoader {
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)
  const root = document.createElement('div')
  root.className = 'boot-loader'
  root.setAttribute('role', 'progressbar')
  root.setAttribute('aria-label', '게임을 불러오는 중')
  root.innerHTML = `<div class="boot-loader__bg"></div><div class="boot-loader__art"></div><div class="boot-loader__vignette"></div><div class="boot-loader__body"><div class="boot-loader__title" aria-hidden="true"></div><p class="boot-loader__name">천하</p><p class="boot-loader__sub">패왕의 시대</p><div class="boot-loader__bar"><div class="boot-loader__fill"></div></div><div class="boot-loader__row"><span class="boot-loader__status">게임을 준비하는 중…</span><b class="boot-loader__pct">0%</b></div><p class="boot-loader__tip"></p></div>`
  document.body.appendChild(root)
  const fill = root.querySelector<HTMLElement>('.boot-loader__fill')!
  const pct = root.querySelector<HTMLElement>('.boot-loader__pct')!
  const status = root.querySelector<HTMLElement>('.boot-loader__status')!
  const tip = root.querySelector<HTMLElement>('.boot-loader__tip')!
  let tipIndex = Math.floor(Math.random() * TIPS.length)
  tip.textContent = TIPS[tipIndex]
  const tipTimer = window.setInterval(() => { tipIndex = (tipIndex + 1) % TIPS.length; tip.textContent = TIPS[tipIndex] }, 3500)

  // 배경 · 제목 그림이 오면 띄운다(글자 제목은 그림이 오면 숨긴다)
  const show = (cls: string, url: string, after?: () => void) => { const el = root.querySelector<HTMLElement>(cls)!; const img = new Image(); img.onload = () => { el.style.backgroundImage = `url('${url}')`; el.classList.add('is-on'); after?.() }; img.src = url }
  show('.boot-loader__art', '/assets/login/v3/background.webp')
  show('.boot-loader__title', '/assets/login/v3/title.webp', () => { root.querySelector<HTMLElement>('.boot-loader__name')!.style.display = 'none'; root.querySelector<HTMLElement>('.boot-loader__sub')!.style.display = 'none' })

  const critical = list.critical.flatMap(urlsOf)
  let got = 0, appReady = false, fontsReady = false
  const paint = () => {
    const ratio = 0.22 * Number(appReady) + 0.06 * Number(fontsReady) + 0.72 * (critical.length ? got / critical.length : 1)
    const value = Math.min(100, Math.round(ratio * 100))
    fill.style.width = `${value}%`
    pct.textContent = `${value}%`
    root.setAttribute('aria-valuenow', String(value))
    status.textContent = !appReady ? '게임을 준비하는 중…' : got < critical.length ? `그림을 불러오는 중… ${got} / ${critical.length}` : '천하로 들어가는 중…'
  }
  paint()
  const codeDone = app.then(() => { appReady = true; paint() }, () => { appReady = true; paint() })
  const fontsDone = (document.fonts?.ready ?? Promise.resolve()).then(() => { fontsReady = true; paint() }, () => { fontsReady = true })
  const imagesDone = pool(critical, 8, () => { got++; paint() })
  // 아주 느린 연결: 25초가 지나면 받은 만큼만 두고 넘어간다(나머지는 이어서 받는다)
  const timeout = new Promise<void>(resolve => window.setTimeout(resolve, 25000))
  const finished = Promise.race([Promise.all([codeDone, fontsDone, imagesDone]).then(() => undefined), timeout.then(() => codeDone)]).then(() => {
    got = critical.length; paint()
    window.clearInterval(tipTimer)
    return new Promise<void>(resolve => window.setTimeout(() => {
      root.classList.add('is-done')
      window.setTimeout(() => { root.remove(); style.remove(); resolve() }, 480)
    }, 220))
  })
  // 나머지 그림 · 소리는 로그인 화면에 있는 동안 천천히(동시에 3개씩)
  void finished.then(() => window.setTimeout(() => { void pool(list.background.flatMap(urlsOf), 3, () => undefined) }, 600))
  return { finished }
}

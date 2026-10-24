// 시작점: 휴대폰 브라우저에서는 게임을 항상 가로 화면으로 띄운다.
// 휴대폰을 세로로 들고 있으면, 게임을 가로 크기의 틀(iframe)에 넣고 틀을 90도 돌려 보여 준다.
// 틀 안에서는 화면이 늘 가로이므로 화면 배치 규칙(CSS)과 터치 좌표가 그대로 맞는다.
// 데스크톱 · 태블릿 · 기타 기기도 휴대폰 가로 크기의 틀에 띄워 키워 보여 준다(mountScaledShell). 안드로이드 앱(이미 가로 고정)은 그대로 띄운다.

import { enableRotatedTouchScroll } from './platform/rotated-scroll'

const isTouchPhone = () => Boolean(window.matchMedia?.('(pointer: coarse)').matches) && Math.min(window.screen.width, window.screen.height) <= 600
/** 터치가 아니어도 세로로 좁은 창(컴퓨터 개발자 도구의 휴대폰 화면 등)은 휴대폰처럼 가로로 돌려 보여 준다 */
const isNarrowPortrait = () => window.innerWidth <= 600 && window.innerHeight > window.innerWidth
/**
 * 기기를 세로로 들고 있는가(창 크기가 아니라 기기 방향으로 판단).
 * 휴대폰 키보드가 올라오면 창 높이가 줄어 창이 가로처럼 보이는데, 창 크기로 판단하면
 * 그때 화면이 돌아가 버린다(아이디 만들기 등 글자 입력 중 화면 회전 버그). 그래서 기기 방향을 먼저 본다.
 */
function devicePortrait(): boolean {
  // 마우스로 쓰는 좁은 창(개발자 도구 등)은 창 모양 그대로
  if (!window.matchMedia?.('(pointer: coarse)').matches) return window.innerHeight > window.innerWidth
  const type = window.screen.orientation?.type
  if (type) return type.startsWith('portrait')
  const legacy = (window as { orientation?: unknown }).orientation
  if (typeof legacy === 'number') return legacy === 0 || legacy === 180
  return window.innerHeight > window.innerWidth
}

/** 틀 안 게임에서 글자 입력 칸을 쓰는 중인가(휴대폰 키보드가 올라와 있을 때) */
function typingIn(frame: HTMLIFrameElement): boolean {
  try {
    const el = frame.contentDocument?.activeElement as HTMLElement | null | undefined
    return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
  } catch { return false }
}

/**
 * 돌릴지 정한다. 글자 입력 중 창 너비는 그대로인데 높이만 줄었다면(키보드) 직전 결정을 그대로 쓴다.
 * 일부 브라우저는 키보드가 올라오면 기기 방향 값까지 가로로 바꿔 알려 주므로 이중으로 막는다.
 */
function rotationKeeper(frame: HTMLIFrameElement, decide: () => boolean): () => boolean {
  let last: boolean | null = null, lastW = 0
  return () => {
    const w = window.innerWidth
    const keep = last !== null && w === lastW && typingIn(frame)
    const rotate = keep ? last! : decide()
    last = rotate; lastW = w
    return rotate
  }
}

const inFrame = (() => { try { return window.self !== window.top } catch { return true } })()
const inApp = Boolean((window as { Capacitor?: unknown }).Capacitor)

function mountLandscapeShell(): void {
  document.documentElement.classList.add('landscape-shell')
  const style = document.createElement('style')
  style.textContent = 'html.landscape-shell,html.landscape-shell body{margin:0;width:100%;height:100%;overflow:hidden;background:#231710}html.landscape-shell #game,html.landscape-shell #ui{display:none}.landscape-shell__frame{position:fixed;top:0;left:0;border:0;display:block;background:#231710;transform-origin:top left}'
  document.head.appendChild(style)
  const frame = document.createElement('iframe')
  frame.className = 'landscape-shell__frame'
  frame.title = '천하: 패왕의 시대'
  frame.allow = 'fullscreen; autoplay; screen-wake-lock'
  frame.setAttribute('allowfullscreen', '')
  frame.src = window.location.href
  const shouldRotate = rotationKeeper(frame, devicePortrait)
  const layout = () => {
    const w = window.innerWidth, h = window.innerHeight
    const rotated = shouldRotate()
    // 틀 안 게임이 끌기(스크롤)를 직접 처리하도록 돌렸는지 알린다(src/platform/rotated-scroll.ts)
    ;(window as Window & { __cheonhaShellRotated?: boolean }).__cheonhaShellRotated = rotated
    // 돌린 화면에서는 브라우저 기본 끌기(방향이 틀어짐)를 끄고 게임이 직접 넘긴다
    frame.style.touchAction = rotated ? 'none' : ''
    if (rotated) {
      // 세로로 든 휴대폰: 가로 크기로 만들어 시계 방향 90도로 돌린다(휴대폰을 왼쪽으로 눕히면 바로 보인다)
      frame.style.left = '0'
      frame.style.width = `${h}px`
      frame.style.height = `${w}px`
      frame.style.transform = `translateX(${w}px) rotate(90deg)`
    } else {
      // 가로로 든 휴대폰: 노치 · 카메라 구멍 쪽은 비워 둔다(틀 안에서는 안전 영역 값을 알 수 없다)
      frame.style.width = 'calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))'
      frame.style.height = '100%'
      frame.style.left = 'env(safe-area-inset-left, 0px)'
      frame.style.transform = 'none'
    }
  }
  layout()
  window.addEventListener('resize', layout)
  window.addEventListener('orientationchange', () => window.setTimeout(layout, 120))
  document.body.appendChild(frame)
  // 틀 안 게임이 제목을 바꾸면 따라간다
  frame.addEventListener('load', () => { try { document.title = frame.contentDocument?.title || document.title } catch { /* 무시 */ } })
}

/**
 * PC · 태블릿 · 기타 기기: 휴대폰과 똑같은 화면으로 보여 준다.
 * 게임을 휴대폰 가로 크기의 틀(폭 844, 높이 360~500)에 띄우고 화면에 맞게 통째로 키운다.
 * 틀 안은 휴대폰 가로 화면이라 휴대폰용 배치 규칙(CSS)이 그대로 쓰인다. 세로로 든 태블릿은 휴대폰처럼 90도 돌린다.
 * 주소 끝에 ?pc 를 붙이면 예전 PC 화면으로 연다(운영 · 점검용).
 */
const SHELL_W = 844
const SHELL_MIN_H = 360
const SHELL_MAX_H = 500
function mountScaledShell(): void {
  document.documentElement.classList.add('landscape-shell')
  const style = document.createElement('style')
  style.textContent = 'html.landscape-shell,html.landscape-shell body{margin:0;width:100%;height:100%;overflow:hidden;background:#140b06}html.landscape-shell #game,html.landscape-shell #ui{display:none}.landscape-shell__frame{position:fixed;top:0;left:0;border:0;display:block;background:#231710;transform-origin:top left}'
  document.head.appendChild(style)
  const frame = document.createElement('iframe')
  frame.className = 'landscape-shell__frame'
  frame.title = '천하: 패왕의 시대'
  frame.allow = 'fullscreen; autoplay; screen-wake-lock'
  frame.src = window.location.href
  const shell = window as Window & { __cheonhaShellScale?: number }
  const shouldRotate = rotationKeeper(frame, () => devicePortrait() && Boolean(window.matchMedia?.('(pointer: coarse)').matches))
  const layout = () => {
    const vw = window.innerWidth, vh = window.innerHeight
    // 세로로 든 터치 기기(태블릿)는 휴대폰처럼 돌려서 가로로 보여 준다
    const rotate = shouldRotate()
    const bw = rotate ? vh : vw, bh = rotate ? vw : vh
    const h = Math.round(Math.min(SHELL_MAX_H, Math.max(SHELL_MIN_H, SHELL_W * bh / bw)))
    const scale = Math.min(bw / SHELL_W, bh / h)
    shell.__cheonhaShellScale = scale
    ;(window as Window & { __cheonhaShellRotated?: boolean }).__cheonhaShellRotated = rotate
    frame.style.touchAction = rotate ? 'none' : ''
    frame.style.width = `${SHELL_W}px`
    frame.style.height = `${h}px`
    // 남는 곳은 가운데 맞춤(위아래 또는 좌우 여백)
    const x = (bw - SHELL_W * scale) / 2, y = (bh - h * scale) / 2
    frame.style.transform = rotate
      ? `translate(${vw - y}px, ${x}px) rotate(90deg) scale(${scale})`
      : `translate(${x}px, ${y}px) scale(${scale})`
  }
  layout()
  window.addEventListener('resize', layout)
  window.addEventListener('orientationchange', () => window.setTimeout(layout, 120))
  document.body.appendChild(frame)
  frame.addEventListener('load', () => {
    try { document.title = frame.contentDocument?.title || document.title } catch { /* 무시 */ }
    // 키보드(전투 단축키 등)가 바로 게임에 가도록
    frame.focus()
  })
}

/** 키운 틀 안: 3D 전장 · 그림을 키운 만큼 선명하게 그리도록 화면 배율을 함께 올린다 */
function followShellScale(): void {
  let parentShell: (Window & { __cheonhaShellScale?: number }) | null = null
  try { parentShell = window.parent as Window & { __cheonhaShellScale?: number }; void parentShell.document } catch { return }
  if (!parentShell || typeof parentShell.__cheonhaShellScale !== 'number') return
  // 브라우저마다 창 자체 또는 원형(prototype)에 있다
  const own = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio') ?? Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio')
  const base = (): number => (own?.get ? own.get.call(window) as number : typeof own?.value === 'number' ? own.value : 1) || 1
  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      get() { return base() * Math.max(1, parentShell?.__cheonhaShellScale ?? 1) },
    })
  } catch { /* 바꿀 수 없으면 그대로 */ }
}

const forcePc = new URLSearchParams(window.location.search).has('pc')
if (inFrame) { followShellScale(); enableRotatedTouchScroll(); void import('./main') }
else if (inApp || forcePc) void import('./main')
else if (isTouchPhone() || isNarrowPortrait()) mountLandscapeShell()
else mountScaledShell()

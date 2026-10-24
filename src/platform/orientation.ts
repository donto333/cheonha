// 가로 화면 전용 게임: 휴대폰 브라우저에서 처음 화면을 누르면 전체 화면으로 바꾸고 가로로 고정한다.
// 브라우저는 사용자가 누르기 전에는 방향을 바꾸지 못하게 막으므로 첫 터치에 맞춰 요청한다.
// (안드로이드 크롬 등은 지원, 아이폰 사파리는 방향 고정을 지원하지 않아 그대로 둔다. 안드로이드 앱은 앱 설정으로 이미 가로 고정.)

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> }

const isTouchPhone = () => window.matchMedia?.('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) <= 600

/** 글을 쓰는 칸인가(글자 입력 칸 · 여러 줄 칸 · 직접 고치는 글) */
function isTextField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true
  if (el.tagName !== 'INPUT') return false
  const type = ((el as HTMLInputElement).type || 'text').toLowerCase()
  return ['text', 'search', 'password', 'email', 'tel', 'url', 'number'].includes(type)
}

/** 바깥 창 기준으로 휴대폰을 세로로 들고 있는가(키보드로 창 높이가 줄어도 기기 방향으로 판단) */
function devicePortrait(): boolean {
  const top = topWindow()
  const type = top.screen.orientation?.type
  if (type) return type.startsWith('portrait')
  const legacy = (top as { orientation?: unknown }).orientation
  if (typeof legacy === 'number') return legacy === 0 || legacy === 180
  return top.innerHeight > top.innerWidth
}

/** 가로 틀(src/boot.ts) 안에서 돌고 있으면 바깥 페이지를 전체 화면으로 만든다(같은 주소라 접근할 수 있다) */
function topWindow(): Window {
  try { return window.top && window.top.document ? window.top : window } catch { return window }
}

async function lockLandscape(): Promise<void> {
  const top = topWindow()
  const orientation = top.screen.orientation as LockableOrientation | undefined
  if (!orientation?.lock) return
  try {
    const doc = top.document
    if (!doc.fullscreenElement && doc.documentElement.requestFullscreen) {
      await doc.documentElement.requestFullscreen({ navigationUI: 'hide' })
    }
    await orientation.lock('landscape')
  } catch {
    // 지원하지 않는 브라우저 · 거절: 지금 방향 그대로 쓴다
  }
}

export function enableLandscapeLock(): void {
  if (typeof window === 'undefined' || !isTouchPhone()) return
  // 앱(접속기) 안에서는 앱이 이미 가로로 고정한다
  if ((window as { Capacitor?: unknown }).Capacitor) return
  const onFirstTouch = () => { void lockLandscape() }
  // 글쓰기는 무조건 가로로: 세로로 든 채 글 칸(아이디 · 채팅 · 게시판 등)을 누르면 그 자리에서 가로 고정을 다시 청한다.
  // 휴대폰이 실제로 가로로 돌아가 키보드도 가로로 뜬다. 누른 직후라 브라우저가 전체 화면 · 방향 고정을 허락한다.
  // 방향 고정을 지원하지 않는 브라우저(아이폰 사파리 등)는 지금처럼 게임 화면을 돌린 채(가로 배치) 그대로 쓴다.
  document.addEventListener('focusin', event => {
    if (isTextField(event.target) && devicePortrait()) void lockLandscape()
  }, true)
  window.addEventListener('pointerup', onFirstTouch, { once: true, capture: true })
  // 전체 화면에서 빠져나왔다가 다시 누르면 다시 가로로
  const top = topWindow()
  top.document.addEventListener('fullscreenchange', () => {
    if (!top.document.fullscreenElement) window.addEventListener('pointerup', onFirstTouch, { once: true, capture: true })
  })
}

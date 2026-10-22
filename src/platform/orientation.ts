// 가로 화면 전용 게임: 휴대폰 브라우저에서 처음 화면을 누르면 전체 화면으로 바꾸고 가로로 고정한다.
// 브라우저는 사용자가 누르기 전에는 방향을 바꾸지 못하게 막으므로 첫 터치에 맞춰 요청한다.
// (안드로이드 크롬 등은 지원, 아이폰 사파리는 방향 고정을 지원하지 않아 그대로 둔다. 안드로이드 앱은 앱 설정으로 이미 가로 고정.)

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> }

const isTouchPhone = () => window.matchMedia?.('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) <= 600

async function lockLandscape(): Promise<void> {
  const orientation = screen.orientation as LockableOrientation | undefined
  if (!orientation?.lock) return
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
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
  window.addEventListener('pointerup', onFirstTouch, { once: true, capture: true })
  // 전체 화면에서 빠져나왔다가 다시 누르면 다시 가로로
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) window.addEventListener('pointerup', onFirstTouch, { once: true, capture: true })
  })
}

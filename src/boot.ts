// 시작점: 휴대폰 브라우저에서는 게임을 항상 가로 화면으로 띄운다.
// 휴대폰을 세로로 들고 있으면, 게임을 가로 크기의 틀(iframe)에 넣고 틀을 90도 돌려 보여 준다.
// 틀 안에서는 화면이 늘 가로이므로 화면 배치 규칙(CSS)과 터치 좌표가 그대로 맞는다.
// 데스크톱 · 태블릿 · 안드로이드 앱(이미 가로 고정)은 그대로 게임을 띄운다.

const isTouchPhone = () => Boolean(window.matchMedia?.('(pointer: coarse)').matches) && Math.min(window.screen.width, window.screen.height) <= 600
/** 터치가 아니어도 세로로 좁은 창(컴퓨터 개발자 도구의 휴대폰 화면 등)은 휴대폰처럼 가로로 돌려 보여 준다 */
const isNarrowPortrait = () => window.innerWidth <= 600 && window.innerHeight > window.innerWidth
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
  const layout = () => {
    const w = window.innerWidth, h = window.innerHeight
    if (h > w) {
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

if ((isTouchPhone() || isNarrowPortrait()) && !inFrame && !inApp) mountLandscapeShell()
else void import('./main')

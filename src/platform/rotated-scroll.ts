// 세로로 든 휴대폰(가로 틀을 90도 돌려 보여 줄 때, src/boot.ts): 브라우저가 손가락으로 끌기를
// 돌리기 전 방향으로 처리해 목록 · 설정 화면이 넘어가지 않는다. 그때만 끌기를 직접 받아 넘긴다.
// 틀 안의 터치 좌표는 이미 게임 화면(가로) 기준이라 그 움직임만큼 넘기면 손가락을 그대로 따라간다.

type ShellWindow = Window & { __cheonhaShellRotated?: boolean }

function parentRotated(): boolean {
  try { return Boolean((window.parent as ShellWindow).__cheonhaShellRotated) } catch { return false }
}

/** 손가락 아래에서 실제로 넘길 수 있는 칸(세로 또는 가로) */
function scrollerAt(target: EventTarget | null): HTMLElement | null {
  for (let el = target instanceof Element ? target : null; el && el !== document.documentElement; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue
    const style = getComputedStyle(el)
    const y = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1
    const x = /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1
    if (x || y) return el
  }
  const doc = document.scrollingElement as HTMLElement | null
  return doc && doc.scrollHeight > doc.clientHeight + 1 ? doc : null
}

export function enableRotatedTouchScroll(): void {
  if (typeof window === 'undefined' || window.parent === window) return
  let box: HTMLElement | null = null
  let id = -1
  let lastX = 0, lastY = 0, lastT = 0, vx = 0, vy = 0, moved = 0
  let glide = 0
  const stopGlide = () => { if (glide) cancelAnimationFrame(glide); glide = 0 }
  document.addEventListener('touchstart', event => {
    stopGlide()
    if (!parentRotated() || event.touches.length !== 1) { box = null; return }
    // 입력 칸 · 슬라이더 · 지도처럼 스스로 끌기를 쓰는 곳은 그대로 둔다
    const target = event.target as Element | null
    if (target?.closest('input[type="range"], canvas, [data-own-drag]')) { box = null; return }
    const touch = event.touches[0]
    box = scrollerAt(target)
    id = touch.identifier; lastX = touch.clientX; lastY = touch.clientY; lastT = performance.now(); vx = vy = 0; moved = 0
  }, { capture: true, passive: true })
  document.addEventListener('touchmove', event => {
    if (!box) return
    const touch = [...event.changedTouches].find(t => t.identifier === id)
    if (!touch) return
    const dx = touch.clientX - lastX, dy = touch.clientY - lastY
    moved += Math.abs(dx) + Math.abs(dy)
    if (moved < 6) return
    event.preventDefault()
    box.scrollTop -= dy
    box.scrollLeft -= dx
    const now = performance.now(), dt = Math.max(1, now - lastT)
    vx = 0.8 * (dx / dt) + 0.2 * vx; vy = 0.8 * (dy / dt) + 0.2 * vy
    lastX = touch.clientX; lastY = touch.clientY; lastT = now
  }, { capture: true, passive: false })
  const end = () => {
    const el = box
    box = null
    if (!el || moved < 6 || performance.now() - lastT > 80) return
    // 손을 뗀 뒤 조금 더 미끄러지듯 넘긴다
    let svx = vx * 16, svy = vy * 16
    const step = () => {
      el.scrollTop -= svy; el.scrollLeft -= svx
      svx *= 0.94; svy *= 0.94
      glide = Math.abs(svx) + Math.abs(svy) > 0.5 ? requestAnimationFrame(step) : 0
    }
    glide = requestAnimationFrame(step)
  }
  document.addEventListener('touchend', end, { capture: true, passive: true })
  document.addEventListener('touchcancel', () => { box = null }, { capture: true, passive: true })
}

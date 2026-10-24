// 영상 초상: 크게 보이는 곳(무장 상세 창 · 모집 결과 카드 · 본영 대표 무장)에서만 사진 위에 움직이는 초상을 겹쳐 튼다.
// 작은 목록 칸은 사진 그대로. 영상이 없거나 · 효과 줄이기 · 동작 줄이기 · 데이터 절약이면 사진만 보인다.
// 영상은 사진(포스터) 위에 겹치므로, 못 불러오면 그 자리에 사진이 그대로 남는다.
import { assetUrl } from '../asset-url'
import { effectsSetting } from '../game/settings'

/**
 * 무장 id → 영상(세로 600×814 권장 · 앞으로 재생 후 거꾸로 재생해 끊김 없이 반복).
 * 영상은 public/assets/generals-video/에 넣고 여기에 적는다. 예: 'lu-bu': '/assets/generals-video/lu-bu.mp4'
 * 상업 이용이 허락된(생성 도구 표시 없는 유료 플랜) 영상만 넣는다. 지금은 비어 있어 모든 무장이 사진으로 나온다.
 */
export const PORTRAIT_VIDEOS: Record<string, string> = {}

function videoAllowed(): boolean {
  if (effectsSetting() === 'reduced') return false
  try { if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false } catch { /* 무시 */ }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return !connection?.saveData
}

/** 이 무장에게 영상 초상이 있고 지금 틀어도 되면 영상 주소 */
export function portraitVideoUrl(generalId: string): string | null {
  const path = PORTRAIT_VIDEOS[generalId]
  return path && videoAllowed() ? assetUrl(path) : null
}

/** 사진 위에 겹칠 영상 칸(없으면 빈 문자열). 재생 · 멈춤은 watchPortraitVideos가 맡는다 */
export function portraitVideo(generalId: string, poster: string, className = ''): string {
  const src = portraitVideoUrl(generalId)
  if (!src) return ''
  return `<video class="pvid${className ? ` ${className}` : ''}" src="${src}" poster="${poster}" muted loop playsinline autoplay preload="metadata" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video>`
}

/**
 * 화면에 보이는 영상만 틀고, 안 보이거나 앱이 뒤로 가면 멈춘다(배터리 · 발열).
 * 새로 그려지는 영상도 따라가도록 root 아래 변화를 지켜본다. 한 번만 부르면 된다.
 */
export function watchPortraitVideos(root: HTMLElement): void {
  const seen = new WeakSet<HTMLVideoElement>()
  const visible = new Set<HTMLVideoElement>()
  const play = (video: HTMLVideoElement) => { if (!document.hidden) { video.muted = true; void video.play().catch(() => { /* 자동 재생 막힘: 사진(포스터)만 */ }) } }
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement
        if (entry.isIntersecting) { visible.add(video); play(video) } else { visible.delete(video); video.pause() }
      }
    }, { threshold: 0.15 })
    : null
  const adopt = (video: HTMLVideoElement) => {
    if (seen.has(video)) return
    seen.add(video)
    // 못 불러오면 영상 칸을 치워 밑의 사진이 보이게
    video.addEventListener('error', () => video.remove(), { once: true })
    if (io) io.observe(video); else play(video)
  }
  const videosIn = (node: Node): HTMLVideoElement[] => node instanceof HTMLVideoElement ? (node.classList.contains('pvid') ? [node] : []) : node instanceof Element ? [...node.querySelectorAll<HTMLVideoElement>('video.pvid')] : []
  root.querySelectorAll<HTMLVideoElement>('video.pvid').forEach(adopt)
  // 화면은 자주 통째로 다시 그려진다. 그때마다 영상이 처음부터 다시 뜨면 깜빡이므로,
  // 같은 영상이 다시 그려지면 방금 빠진 영상 칸을 그 자리에 되돌려 끊김 없이 이어 튼다.
  // 우리가 되돌려 넣은 영상 · 버린 새 영상(아래 바꿔 넣기가 다시 변화로 잡혀 되풀이되지 않게)
  const restored = new WeakSet<HTMLVideoElement>(), discarded = new WeakSet<HTMLVideoElement>()
  new MutationObserver(records => {
    const removed = new Map<string, HTMLVideoElement>()
    for (const record of records) record.removedNodes.forEach(node => videosIn(node).forEach(video => {
      if (video.isConnected) return
      visible.delete(video); io?.unobserve(video); seen.delete(video)
      if (discarded.has(video)) return
      removed.set(video.getAttribute('src') ?? '', video)
    }))
    for (const record of records) record.addedNodes.forEach(node => videosIn(node).forEach(video => {
      if (!video.isConnected) return
      if (restored.has(video)) { restored.delete(video); adopt(video); return }
      const key = video.getAttribute('src') ?? ''
      const previous = removed.get(key)
      if (previous) {
        removed.delete(key)
        previous.className = video.className
        restored.add(previous); discarded.add(video)
        video.replaceWith(previous)
        adopt(previous)
      } else adopt(video)
    }))
  }).observe(root, { childList: true, subtree: true })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll<HTMLVideoElement>('video.pvid').forEach(video => video.pause())
    else visible.forEach(play)
  })
}

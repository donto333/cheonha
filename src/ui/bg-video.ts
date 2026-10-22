// 움직이는 배경 영상(AI로 만든 반복 영상). public/assets/ui/v2/video/<이름>.webm · .mp4 를 넣으면 재생한다.
// 파일이 없거나 재생할 수 없으면 아무것도 하지 않는다(지금 그림 배경 그대로).
// 화면을 다시 그려도 영상이 처음부터 다시 시작하지 않게, 영상 요소를 하나만 만들어 새 자리로 옮겨 붙인다.
// 영상 만드는 법: docs/ART_ASSETS.md 「움직이는 배경 영상」
import { assetUrl } from '../asset-url'
import { effectsSetting } from '../game/settings'

const videos = new Map<string, HTMLVideoElement | 'failed'>()

function calmPreferred(): boolean {
  if (effectsSetting() === 'reduced') return true
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

function create(name: string, readyClass: string): HTMLVideoElement {
  const video = document.createElement('video')
  video.className = 'bg-video'
  video.muted = true
  video.defaultMuted = true
  video.loop = true
  video.autoplay = true
  video.playsInline = true
  video.preload = 'auto'
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('aria-hidden', 'true')
  for (const [ext, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']] as const) {
    const source = document.createElement('source')
    source.src = assetUrl(`/assets/ui/v2/video/${name}.${ext}`)
    source.type = type
    video.appendChild(source)
  }
  const fail = () => { videos.set(name, 'failed'); video.remove(); document.documentElement.classList.remove(readyClass) }
  // 마지막 후보(mp4)까지 못 불러오면 포기
  video.lastElementChild?.addEventListener('error', fail)
  video.addEventListener('error', fail)
  video.addEventListener('playing', () => document.documentElement.classList.add(readyClass))
  return video
}

/** container 맨 앞에 배경 영상을 붙이고 재생한다 */
export function mountBgVideo(container: Element | null, name: string, readyClass: string): void {
  if (!container || calmPreferred()) return
  let video = videos.get(name)
  if (video === 'failed') return
  if (!video) { video = create(name, readyClass); videos.set(name, video) }
  if (video.parentElement !== container) container.prepend(video)
  void video.play().catch(() => { /* 자동 재생이 막히면 첫 터치 때 다시 시도 */ window.addEventListener('pointerdown', () => { void (video as HTMLVideoElement).play().catch(() => undefined) }, { once: true }) })
}

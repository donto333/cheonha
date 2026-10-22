// 새 디자인(2026.10) 아이콘: 금빛 메달 안에 선 그림.
// public/assets/ui/v2/icons/<이름>.png 를 넣으면 그 그림이 선 그림 위를 덮는다(파일이 없으면 선 그림 그대로).
// 그림 목록 · 크기 · 프롬프트: docs/ART_ASSETS.md
import { assetUrl } from '../asset-url'
import { icon, type IconName } from './icons'

const LINE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
const svg = (body: string) => `<svg class="gi" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`

/** icons.ts에 없는 새 아이콘 */
const EXTRA: Record<string, string> = {
  gift: svg(`<rect x="4" y="10" width="16" height="10" rx="1" ${LINE}/><path d="M3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5-1 1 1 5 1 5 1zm0 0c2-4 6-3 5-1-1 1-5 1-5 1z" ${LINE}/>`),
  scroll: svg(`<path d="M7 4h11a2 2 0 0 1 2 2v1H9v11a2 2 0 0 1-4 0V6a2 2 0 0 1 2-2zM9 7v11a2 2 0 0 1-2 2h10a2 2 0 0 0 2-2V9" ${LINE}/><path d="M12 11h5M12 14h5" ${LINE}/>`),
  trophy: svg(`<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6v3H9z" ${LINE}/>`),
  gear: svg(`<circle cx="12" cy="12" r="3" ${LINE}/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" ${LINE}/><circle cx="12" cy="12" r="6.5" ${LINE}/>`),
  help: svg(`<circle cx="12" cy="12" r="9" ${LINE}/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" ${LINE}/>`),
  logout: svg(`<path d="M14 4H6v16h8M10 12h10M16 8l4 4-4 4" ${LINE}/>`),
  more: svg(`<path d="M12 3l3 3-3 3-3-3zM6 9l3 3-3 3-3-3zM18 9l3 3-3 3-3-3zM12 15l3 3-3 3-3-3z" ${LINE}/>`),
  bag: svg(`<path d="M8 7V6a4 4 0 0 1 8 0v1M5 8h14l-1.5 12h-11z" ${LINE}/><path d="M9 12h6" ${LINE}/>`),
  mail: svg(`<rect x="3" y="6" width="18" height="12" rx="1" ${LINE}/><path d="m3 7 9 6 9-6" ${LINE}/>`),
  chat: svg(`<path d="M4 5h16v11H9l-5 4z" ${LINE}/><path d="M8 10h.01M12 10h.01M16 10h.01" ${LINE}/>`),
  calendar: svg(`<rect x="4" y="6" width="16" height="14" rx="1.5" ${LINE}/><path d="M4 10h16M8 4v4M16 4v4M9 15l2 2 4-4" ${LINE}/>`),
  swords: svg(`<path d="M4 4l10 10M4 4h4M4 4v4M20 4 10 14M20 4h-4M20 4v4M7 17l-3 3M17 17l3 3M6 15l3 3M18 15l-3 3" ${LINE}/>`),
}

export type ArtIconKey = IconName | keyof typeof EXTRA

function base(key: ArtIconKey): string {
  return EXTRA[key] ?? icon(key as IconName)
}

/**
 * 메달 아이콘. art 이름의 그림 파일이 있으면 그 그림을, 없으면 금빛 선 그림을 보여 준다.
 * @param art public/assets/ui/v2/icons/<art>.png
 */
export function artIcon(key: ArtIconKey, art: string = key, className = ''): string {
  const src = assetUrl(`/assets/ui/v2/icons/${art}.png`)
  return `<span class="art-ico ${className}"><span class="art-ico__line">${base(key)}</span><img class="art-ico__img" src="${src}" alt="" draggable="false" loading="lazy" onload="this.parentElement.classList.add('has-art')" onerror="this.remove()"></span>`
}

/** 큰 그림(배경 등)이 있으면 html에 표시해 CSS가 대신 그림을 쓰게 한다 */
export function probeArt(path: string, className: string): void {
  if (typeof Image === 'undefined') return
  const image = new Image()
  image.onload = () => document.documentElement.classList.add(className)
  image.src = assetUrl(path)
}

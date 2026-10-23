// 휴대폰 가로: 긴 목록(도감 · 장수 · 장비 · 대기 무장 · 시나리오)을 스크롤 대신 쪽 넘기기로.
// 칸 높이에 들어가는 만큼만 보여 주고 아래에 ◀ 1/4 ▶ 를 붙인다. 화면을 다시 그리지 않고 항목만 숨긴다.

const TARGETS: Array<{ key: string; selector: string; items?: string }> = [
  { key: 'gtile', selector: '.gtile-grid' },
  { key: 'eqtile', selector: '.eqtile-grid' },
  { key: 'bench', selector: '.page-section--formation > .formation-bench' },
  { key: 'scenario', selector: '.scenario-mini-list', items: '.scenario-mini-head, .scenario-mini' },
]

const pages = new Map<string, number>()
const PAGER_H = 30

function visibleItems(box: HTMLElement, itemSelector?: string): HTMLElement[] {
  if (itemSelector) return Array.from(box.querySelectorAll<HTMLElement>(itemSelector)).filter(el => !el.hidden)
  return Array.from(box.children).filter((el): el is HTMLElement => el instanceof HTMLElement && !el.classList.contains('mpager') && !el.hidden && !el.matches('[data-formation-noresult], .formation-empty, .roster-empty'))
}

function columns(box: HTMLElement): number {
  const tpl = getComputedStyle(box).gridTemplateColumns
  if (!tpl || tpl === 'none') return 1
  return Math.max(1, tpl.split(' ').filter(Boolean).length)
}

/** 한 목록을 쪽으로 나눈다 */
function paginate(box: HTMLElement, key: string, itemSelector?: string): void {
  const items = visibleItems(box, itemSelector)
  items.forEach(el => el.classList.remove('is-paged-out'))
  box.querySelector(':scope > .mpager')?.remove()
  box.classList.remove('is-paged')
  if (!items.length) return
  // 칸에 다 들어가면 쪽 나누기 없음
  if (box.scrollHeight <= box.clientHeight + 2) return
  box.classList.add('is-paged')
  const style = getComputedStyle(box)
  const rowGap = parseFloat(style.rowGap) || 0
  const padTop = parseFloat(style.paddingTop) || 0
  const usable = box.clientHeight - padTop - PAGER_H
  const scale = box.clientHeight / (box.getBoundingClientRect().height || box.clientHeight)
  const itemH = Math.max(...items.slice(0, 6).map(el => el.getBoundingClientRect().height)) * scale
  const rows = Math.max(1, Math.floor((usable + rowGap) / (itemH + rowGap)))
  const perPage = rows * (itemSelector ? 1 : columns(box))
  const total = Math.max(1, Math.ceil(items.length / perPage))
  if (total <= 1) { box.classList.remove('is-paged'); return }
  // 처음 열 때는 고른 항목(.is-selected)이 있는 쪽으로
  const selectedAt = items.findIndex(el => el.classList.contains('is-selected'))
  const start = pages.has(key) ? pages.get(key)! : selectedAt >= 0 ? Math.floor(selectedAt / perPage) : 0
  const page = Math.min(Math.max(0, start), total - 1)
  pages.set(key, page)
  items.forEach((el, index) => el.classList.toggle('is-paged-out', Math.floor(index / perPage) !== page))
  const pager = document.createElement('div')
  pager.className = 'mpager'
  pager.innerHTML = `<button type="button" class="mpager__btn" data-action="pager" data-pager="${key}" data-dir="-1" ${page === 0 ? 'disabled' : ''} aria-label="이전 쪽">◀</button><span class="mpager__num"><b>${page + 1}</b> / ${total}</span><button type="button" class="mpager__btn" data-action="pager" data-pager="${key}" data-dir="1" ${page >= total - 1 ? 'disabled' : ''} aria-label="다음 쪽">▶</button>`
  box.appendChild(pager)
}

/** 화면의 모든 대상 목록을 다시 나눈다(그린 뒤 · 찾기 · 거르기 · 창 크기 바뀜) */
export function applyPagers(root: ParentNode, enabled: boolean): void {
  for (const { key, selector, items } of TARGETS) {
    root.querySelectorAll<HTMLElement>(selector).forEach(box => {
      if (!enabled) { box.classList.remove('is-paged'); box.querySelector(':scope > .mpager')?.remove(); visibleItems(box, items).forEach(el => el.classList.remove('is-paged-out')); return }
      paginate(box, key, items)
    })
  }
}

/** ◀ ▶ 눌렀을 때 */
export function turnPage(root: ParentNode, key: string, dir: number): void {
  const current = Number(document.querySelector(`[data-pager="${key}"]`)?.closest('.mpager')?.querySelector('b')?.textContent ?? '1') - 1
  pages.set(key, current + dir)
  const target = TARGETS.find(item => item.key === key)
  if (target) root.querySelectorAll<HTMLElement>(target.selector).forEach(box => paginate(box, key, target.items))
}

/** 목록 내용이 바뀌면(거르기 · 정렬) 첫 쪽부터 */
export function resetPage(key?: string): void {
  if (key) pages.delete(key)
  else pages.clear()
}

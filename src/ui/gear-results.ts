// 뽑기 결과창(장비 뽑기 · 무장 모집 10회): 1672×941 도안(5열 × 2행 카드 · 금테 버튼)을 화면 크기에 맞춰 그대로 줄이고 늘린다.
// 틀 · 버튼 · 배경 그림은 /assets/ui/v2/gear-result/, 장비 · 무장 그림은 게임의 그림을 쓴다.
import { assetUrl } from '../asset-url'
import { sound } from '../engine/sound'
import { generalRealm } from '../game/general-factions'
import { EQUIPMENT_GRADE_META, EQUIPMENT_SET_META, EQUIPMENT_TYPE_META, GRADE_META, equipmentSpecialty, equipmentValue, formatNumber, type Equipment, type EquipmentSet, type General } from '../game/strategy'

const KIT = '/assets/ui/v2/gear-result/'
const art = (name: string): string => assetUrl(`${KIT}${name}`)
const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character))
const delay = (index: number) => `--reveal-delay:${Math.min(index, 9) * 20}ms`
const cardBack = '<span class="gr-card__back" aria-hidden="true"><i></i></span><span class="gr-card__frame" aria-hidden="true"></span>'

/** 세트 표식(카드 아래 줄 앞의 작은 인장) */
const SET_SEAL: Record<EquipmentSet, string> = { command: '軍', martial: '霸', stratagem: '策', speed: '疾' }
/** 무장 병과 → 병과 아이콘 이름 */
const ROLE_KEY: Record<string, string> = { 기병: 'cavalry', 보병: 'infantry', 궁병: 'archer', 책사: 'strategist' }

/** 연출 등급: 0 보통 · 1 좋음(테 반짝) · 2 높음(카드 빛남 강하게) · 3 최고(화면 섬광) */
const GEAR_TIER: Record<Equipment['grade'], number> = { normal: 0, rare: 1, unique: 2, legendary: 3, mythic: 3 }
const GENERAL_TIER: Record<number, number> = { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3 }

interface ShellAction { label: string; value: string; action: string; count: number }
interface ShellOptions {
  label: string
  title: string
  cards: string
  count: number
  honor: number
  honorIcon: string
  freeNote: string
  actions: [ShellAction, ShellAction]
}

/** 그림 · 글자 크기를 도안 기준으로 쓰기 위한 CSS 변수(카드 틀 그림 등) */
export function gearResultsStyle(): string {
  const url = (name: string) => `url('${art(name)}')`
  return `--gr-panel:${url('panel.png')};--gr-card-normal:${url('card_normal.png')};--gr-card-rare:${url('card_rare.png')};--gr-slot:${url('card_inner_slot.png')};--gr-glow:${url('card_rare_glow.png')};--gr-banner:${url('title_banner.png')};--gr-btn:${url('button_brown.png')};--gr-btn-red:${url('button_red.png')};--gr-btn-close:${url('button_close.png')};--gr-tile-frame:url('${assetUrl('/assets/ui/v2/kit/card-frame.webp')}');--gr-back:url('${assetUrl('/assets/ui/v2/kit/card-back.webp')}')`
}

function shell(o: ShellOptions): string {
  const rows = o.count > 5 ? 2 : 1
  const actions = o.actions.map(a => `<button class="gr-btn gr-btn--action" data-action="${a.action}" data-count="${a.count}"><span>${a.label}</span><b>${a.value}</b></button>`).join('')
  return `<div class="recruit-results-backdrop gr-backdrop"></div><section class="gr-stage" role="dialog" aria-modal="true" aria-label="${o.label}" style="${gearResultsStyle()}"><header class="gr-head"><img class="gr-head__dragon" src="${art('title_dragon.png')}" alt="" draggable="false"><span class="gr-head__banner">${o.label}</span><h2 class="gr-head__title">${o.title}</h2></header><button class="gr-btn gr-btn--close" data-action="close-recruit-results"><span>닫기</span></button><div class="gr-grid gr-grid--rows-${rows}${o.count === 1 ? ' gr-grid--single' : ''}">${o.cards}</div><p class="gr-skip">화면을 누르면 모두 열립니다</p><div class="gr-balance"><i class="gr-balance__icon" aria-hidden="true">${o.honorIcon}</i><span>보유 옥패</span><b>${formatNumber(o.honor)}</b>${o.freeNote ? `<em>${o.freeNote}</em>` : ''}</div><div class="gr-actions">${actions}<button class="gr-btn gr-btn--confirm" data-action="close-recruit-results"><span>결과 확인 완료</span><b aria-hidden="true">→</b></button></div></section>`
}

/* ───── 장비 뽑기 ───── */

export interface GearResultsOptions {
  /** 지금 보유 옥패 */
  honor: number
  /** 남은 무료 장비 뽑기권 */
  freeDraws: number
  /** 1회 · 10회 추가 뽑기 버튼 오른쪽 값(옥패 비용 또는 무료권) */
  cost: { one: string; ten: string }
  image: (item: Equipment) => string
  /** 옥패 아이콘(게임 공용 아이콘 마크업) */
  honorIcon: string
}

function gearCard(item: Equipment, index: number, image: (item: Equipment) => string): string {
  const grade = EQUIPMENT_GRADE_META[item.grade]
  const set = EQUIPMENT_SET_META[item.set]
  const specialty = equipmentSpecialty(item)
  return `<article class="gr-card gr-card--gear gr-card--${item.grade}" data-tier="${GEAR_TIER[item.grade]}" style="--grade:${grade.color};${delay(index)}">${cardBack}<span class="gr-card__art gr-card__art--item"><img src="${image(item)}" alt="${EQUIPMENT_TYPE_META[item.type].label}" draggable="false"></span><span class="gr-card__grade">${grade.label}</span><span class="gr-card__seal" title="${escapeHtml(set.label)}">${SET_SEAL[item.set]}</span>${specialty ? `<strong class="gr-card__badge">특기 · ${escapeHtml(specialty.label)}</strong>` : ''}<span class="gr-card__foot"><span class="gr-card__line"><b>${EQUIPMENT_TYPE_META[item.type].label} +${equipmentValue(item)}</b><em>${escapeHtml(set.label)}</em></span><strong>${escapeHtml(item.name)}</strong></span></article>`
}

/** 장비 결과창 속 내용(바깥 .recruit-results 안에 넣는다) */
export function gearResultsMarkup(rewards: Equipment[], options: GearResultsOptions): string {
  return shell({
    label: '장비 획득 결과',
    title: `${rewards.length}개의 장비를 획득했습니다`,
    cards: rewards.map((item, index) => gearCard(item, index, options.image)).join(''),
    count: rewards.length,
    honor: options.honor,
    honorIcon: options.honorIcon,
    freeNote: options.freeDraws > 0 ? `무료 장비 뽑기권 ${formatNumber(options.freeDraws)}회` : '',
    actions: [
      { label: '1회 추가 뽑기', value: options.cost.one, action: 'extra-equipment-draw', count: 1 },
      { label: '10회 추가 뽑기', value: options.cost.ten, action: 'extra-equipment-draw', count: 10 },
    ],
  })
}

/* ───── 무장 모집 ───── */

export interface RecruitResultsOptions {
  honor: number
  /** 남은 무료 모집권 */
  freeRecruits: number
  /** 1회 · 10회 추가 모집 버튼 오른쪽 값(옥패 비용 또는 무료권) */
  cost: { one: string; ten: string }
  portrait: (general: General) => string
  /** 영상 초상(있는 무장만, 사진 위에 겹침) */
  video?: (general: General) => string
  honorIcon: string
}

function generalCard(general: General, index: number, portrait: (general: General) => string, video?: (general: General) => string): string {
  const meta = GRADE_META[general.grade]
  const realm = generalRealm(general.id)
  const stars = Math.max(0, Math.min(5, general.stars ?? 1))
  const role = ROLE_KEY[general.role] ?? 'infantry'
  return `<article class="gr-card gr-card--general gr-card--g${general.grade}" data-tier="${GENERAL_TIER[general.grade] ?? 0}" style="--grade:${meta.color};${delay(index)}">${cardBack}<span class="gr-card__art gr-card__art--portrait" style="background-image:url('${portrait(general)}')">${video?.(general) ?? ''}</span><span class="gr-card__role" style="background-image:url('${assetUrl(`/assets/ui/v2/kit/role-${role}.webp`)}')" title="${escapeHtml(general.role)}"></span><span class="gr-card__realm" style="background-image:url('${assetUrl(`/assets/ui/v2/kit/logo-${realm}.webp`)}')"></span><span class="gr-card__foot"><span class="gr-card__line"><b>Lv.${general.level}</b><span class="gr-card__stars" aria-label="${stars}성">${'★'.repeat(stars)}<s>${'★'.repeat(5 - stars)}</s></span></span><strong>${escapeHtml(general.name)}</strong></span></article>`
}

/** 무장 모집 결과창 속 내용 */
export function recruitResultsMarkup(rewards: General[], options: RecruitResultsOptions): string {
  return shell({
    label: '무장 모집 결과',
    title: rewards.length === 10 ? '열 명의 무장이 응답했습니다' : `${rewards.length}명의 무장이 응답했습니다`,
    cards: rewards.map((general, index) => generalCard(general, index, options.portrait, options.video)).join(''),
    count: rewards.length,
    honor: options.honor,
    honorIcon: options.honorIcon,
    freeNote: options.freeRecruits > 0 ? `무료 모집권 ${formatNumber(options.freeRecruits)}회` : '',
    actions: [
      { label: '1회 추가 모집', value: options.cost.one, action: 'extra-recruit', count: 1 },
      { label: '10회 추가 모집', value: options.cost.ten, action: 'extra-recruit', count: 10 },
    ],
  })
}

/* ───── 결과 연출 ─────
   앞의 전당 연출에서 이미 결과를 봤으므로 짧게(약 1초): 뒷면이 깔리자마자 차례로 빠르게 걷히고(돌리지 않음),
   높은 등급은 열리는 순간 카드 전체가 등급색으로 환하게 빛나고, 최고 등급은 화면이 잠깐 번쩍인다(흔들림 없음). 효과음은 가장 높은 등급 하나만.
   화면(버튼 밖)을 누르면 남은 카드가 한꺼번에 열린다. */

export interface RevealOptions { reduced: boolean }

/** 뒷면이 걷히기까지 · 카드 사이 간격(ms). 돌리지 않고 뒷면이 사라지며 앞면이 드러난다 */
const FLIP_MS = 0
const STEP_MS = 55

/** 열리는 카드 전체가 등급색으로 환하게 빛났다가 가라앉는다(사방으로 뻗는 빛살 없음) */
function burst(card: HTMLElement, tier: number): void {
  if (tier < 1) return
  const el = document.createElement('span')
  el.className = `gr-burst gr-burst--t${tier}`
  el.setAttribute('aria-hidden', 'true')
  card.appendChild(el)
  window.setTimeout(() => el.remove(), tier >= 3 ? 1300 : 900)
}

function openSound(tier: number): void {
  if (tier >= 3) { sound.hallSfx('hall-star'); sound.hallSfx('hall-light', 0.6) }
  else if (tier === 2) sound.hallSfx('hall-jade', 0.75)
  else if (tier === 1) sound.play('coin')
  else sound.play('tab')
}

/** 결과창을 붙인 뒤 부른다. 연출을 줄이는 설정이면 바로 다 보여 준다. */
export function playResultReveal(overlay: HTMLElement, options: RevealOptions): void {
  const stage = overlay.querySelector<HTMLElement>('.gr-stage')
  const cards = [...overlay.querySelectorAll<HTMLElement>('.gr-card')]
  if (!stage || !cards.length) return
  const tierOf = (card: HTMLElement) => Number(card.dataset.tier ?? 0)
  if (options.reduced) {
    cards.forEach(card => card.classList.add('is-open'))
    stage.classList.add('is-revealed')
    return
  }
  const timers: number[] = []
  const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => { if (overlay.isConnected) fn() }, ms)) }
  stage.classList.add('is-revealing')
  cards.forEach(card => card.classList.add('is-covered'))

  const open = (card: HTMLElement, quiet = false) => {
    if (!card.classList.contains('is-covered')) return
    const tier = tierOf(card)
    window.setTimeout(() => {
      card.classList.remove('is-covered')
      card.classList.add('is-open')
      burst(card, tier)
      if (tier >= 3 && !quiet) {
        stage.classList.add('is-flash')
        window.setTimeout(() => stage.classList.remove('is-flash'), 460)
      }
    }, FLIP_MS)
  }
  const finish = () => {
    stage.classList.remove('is-revealing')
    stage.classList.add('is-revealed')
    stage.removeEventListener('click', skip)
  }
  function skip(event: Event): void {
    if ((event.target as HTMLElement).closest('button')) return
    timers.forEach(id => window.clearTimeout(id))
    timers.length = 0
    const covered = cards.filter(card => card.classList.contains('is-covered'))
    const top = Math.max(-1, ...covered.map(tierOf))
    covered.forEach(card => open(card, true))
    if (top >= 0) openSound(top)
    window.setTimeout(finish, 450)
  }
  stage.addEventListener('click', skip)

  // 뒷면이 깔리는 대로 바로 차례로 열기(장당 55ms)
  const top = Math.max(...cards.map(tierOf))
  let t = 200
  cards.forEach(card => { later(t, () => open(card)); t += STEP_MS })
  later(200 + FLIP_MS, () => openSound(top))
  later(t + 200, finish)
}

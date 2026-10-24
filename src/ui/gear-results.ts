// 뽑기 결과창(장비 뽑기 · 무장 모집 10회): 1672×941 도안(5열 × 2행 카드 · 금테 버튼)을 화면 크기에 맞춰 그대로 줄이고 늘린다.
// 틀 · 버튼 · 배경 그림은 /assets/ui/v2/gear-result/, 장비 · 무장 그림은 게임의 그림을 쓴다.
import { assetUrl } from '../asset-url'
import { generalRealm, type Realm } from '../game/general-factions'
import { EQUIPMENT_GRADE_META, EQUIPMENT_SET_META, EQUIPMENT_TYPE_META, GRADE_META, equipmentSpecialty, equipmentValue, formatNumber, type Equipment, type EquipmentSet, type General } from '../game/strategy'

const KIT = '/assets/ui/v2/gear-result/'
const art = (name: string): string => assetUrl(`${KIT}${name}`)
const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character))
const delay = (index: number) => `--reveal-delay:${Math.min(index, 9) * 70}ms`
const indexLabel = (index: number) => `<span class="gr-card__index">${String(index + 1).padStart(2, '0')}</span>`

/** 세트 표식(카드 아래 줄 앞의 작은 인장) */
const SET_SEAL: Record<EquipmentSet, string> = { command: '軍', martial: '霸', stratagem: '策', speed: '疾' }
/** 무장 진영 표식 */
const REALM_SEAL: Record<Realm, string> = { wei: '魏', shu: '蜀', wu: '吳', qun: '群' }

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
  return `--gr-panel:${url('panel.png')};--gr-card-normal:${url('card_normal.png')};--gr-card-rare:${url('card_rare.png')};--gr-slot:${url('card_inner_slot.png')};--gr-glow:${url('card_rare_glow.png')};--gr-banner:${url('title_banner.png')};--gr-btn:${url('button_brown.png')};--gr-btn-red:${url('button_red.png')};--gr-btn-close:${url('button_close.png')}`
}

function shell(o: ShellOptions): string {
  const rows = o.count > 5 ? 2 : 1
  const actions = o.actions.map(a => `<button class="gr-btn gr-btn--action" data-action="${a.action}" data-count="${a.count}"><span>${a.label}</span><b>${a.value}</b></button>`).join('')
  return `<div class="recruit-results-backdrop gr-backdrop"></div><section class="gr-stage" role="dialog" aria-modal="true" aria-label="${o.label}" style="${gearResultsStyle()}"><header class="gr-head"><img class="gr-head__dragon" src="${art('title_dragon.png')}" alt="" draggable="false"><span class="gr-head__banner">${o.label}</span><h2 class="gr-head__title">${o.title}</h2></header><button class="gr-btn gr-btn--close" data-action="close-recruit-results"><span>닫기</span></button><div class="gr-grid gr-grid--rows-${rows}${o.count === 1 ? ' gr-grid--single' : ''}">${o.cards}</div><div class="gr-balance"><i class="gr-balance__icon" aria-hidden="true">${o.honorIcon}</i><span>보유 옥패</span><b>${formatNumber(o.honor)}</b>${o.freeNote ? `<em>${o.freeNote}</em>` : ''}</div><div class="gr-actions">${actions}<button class="gr-btn gr-btn--confirm" data-action="close-recruit-results"><span>결과 확인 완료</span><b aria-hidden="true">→</b></button></div></section>`
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
  return `<article class="gr-card gr-card--${item.grade}" style="--grade:${grade.color};${delay(index)}">${indexLabel(index)}${specialty ? `<strong class="gr-card__badge">특기 · ${escapeHtml(specialty.label)}</strong>` : ''}<div class="gr-card__art"><img src="${image(item)}" alt="${EQUIPMENT_TYPE_META[item.type].label}" draggable="false"></div><b class="gr-card__name">${escapeHtml(item.name)}</b><small class="gr-card__stat">${grade.label} · ${EQUIPMENT_TYPE_META[item.type].label} · +${equipmentValue(item)}</small><em class="gr-card__set"><i aria-hidden="true">${SET_SEAL[item.set]}</i><span>${escapeHtml(set.label)} · ${escapeHtml(item.skillName)}</span></em></article>`
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
  honorIcon: string
}

/** 무장 등급 → 카드 틀(색이 가까운 틀) */
const GENERAL_FRAME: Record<number, string> = { 1: 'normal', 2: 'unique', 3: 'rare', 4: 'elite', 5: 'legendary' }

function generalCard(general: General, index: number, portrait: (general: General) => string): string {
  const meta = GRADE_META[general.grade]
  const realm = generalRealm(general.id)
  const stars = Math.max(0, Math.min(5, general.stars ?? 1))
  return `<article class="gr-card gr-card--general gr-card--${GENERAL_FRAME[general.grade] ?? 'normal'}" style="--grade:${meta.color};${delay(index)}">${indexLabel(index)}<span class="gr-card__stars" aria-label="${stars}성">${'★'.repeat(stars)}<s>${'★'.repeat(5 - stars)}</s></span><div class="gr-card__art gr-card__art--portrait"><img src="${portrait(general)}" alt="" draggable="false" loading="eager" decoding="async"></div><b class="gr-card__name">${escapeHtml(general.name)}</b><small class="gr-card__stat">${general.grade}등급 · ${meta.label} · Lv.${general.level}</small><em class="gr-card__set"><i aria-hidden="true">${REALM_SEAL[realm]}</i><span>${escapeHtml(general.role)} · ${escapeHtml(general.epithet)}</span></em></article>`
}

/** 무장 모집 결과창 속 내용 */
export function recruitResultsMarkup(rewards: General[], options: RecruitResultsOptions): string {
  return shell({
    label: '무장 모집 결과',
    title: rewards.length === 10 ? '열 명의 무장이 응답했습니다' : `${rewards.length}명의 무장이 응답했습니다`,
    cards: rewards.map((general, index) => generalCard(general, index, options.portrait)).join(''),
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

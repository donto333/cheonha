// 장비 획득 결과창: 1672×941 도안(5열 × 2행 카드 · 금테 버튼)을 화면 크기에 맞춰 그대로 줄이고 늘린다.
// 틀 · 버튼 · 배경 그림은 /assets/ui/v2/gear-result/, 장비 그림은 게임의 장비 그림을 쓴다.
import { assetUrl } from '../asset-url'
import { EQUIPMENT_GRADE_META, EQUIPMENT_SET_META, EQUIPMENT_TYPE_META, equipmentSpecialty, equipmentValue, formatNumber, type Equipment, type EquipmentSet } from '../game/strategy'

const KIT = '/assets/ui/v2/gear-result/'
const art = (name: string): string => assetUrl(`${KIT}${name}`)
const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character))

/** 세트 표식(카드 아래 줄 앞의 작은 인장) */
const SET_SEAL: Record<EquipmentSet, string> = { command: '軍', martial: '霸', stratagem: '策', speed: '疾' }

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

/** 그림 · 글자 크기를 도안 기준으로 쓰기 위한 CSS 변수(카드 틀 그림 등) */
export function gearResultsStyle(): string {
  const url = (name: string) => `url('${art(name)}')`
  return `--gr-panel:${url('panel.png')};--gr-card-normal:${url('card_normal.png')};--gr-card-rare:${url('card_rare.png')};--gr-slot:${url('card_inner_slot.png')};--gr-glow:${url('card_rare_glow.png')};--gr-banner:${url('title_banner.png')};--gr-btn:${url('button_brown.png')};--gr-btn-red:${url('button_red.png')};--gr-btn-close:${url('button_close.png')}`
}

function card(item: Equipment, index: number, image: (item: Equipment) => string): string {
  const grade = EQUIPMENT_GRADE_META[item.grade]
  const set = EQUIPMENT_SET_META[item.set]
  const specialty = equipmentSpecialty(item)
  return `<article class="gr-card gr-card--${item.grade}" style="--grade:${grade.color};--reveal-delay:${Math.min(index, 9) * 70}ms"><span class="gr-card__index">${String(index + 1).padStart(2, '0')}</span>${specialty ? `<strong class="gr-card__badge">특기 · ${escapeHtml(specialty.label)}</strong>` : ''}<div class="gr-card__art"><img src="${image(item)}" alt="${EQUIPMENT_TYPE_META[item.type].label}" draggable="false"></div><b class="gr-card__name">${escapeHtml(item.name)}</b><small class="gr-card__stat">${grade.label} · ${EQUIPMENT_TYPE_META[item.type].label} · +${equipmentValue(item)}</small><em class="gr-card__set"><i aria-hidden="true">${SET_SEAL[item.set]}</i><span>${escapeHtml(set.label)} · ${escapeHtml(item.skillName)}</span></em></article>`
}

/** 결과창 속 내용(바깥 .recruit-results 안에 넣는다) */
export function gearResultsMarkup(rewards: Equipment[], options: GearResultsOptions): string {
  const cards = rewards.map((item, index) => card(item, index, options.image)).join('')
  const rows = rewards.length > 5 ? 2 : 1
  return `<div class="recruit-results-backdrop gr-backdrop"></div><section class="gr-stage" role="dialog" aria-modal="true" aria-label="장비 획득 결과" style="${gearResultsStyle()}"><header class="gr-head"><img class="gr-head__dragon" src="${art('title_dragon.png')}" alt="" draggable="false"><span class="gr-head__banner">장비 획득 결과</span><h2 class="gr-head__title">${rewards.length}개의 장비를 획득했습니다</h2></header><button class="gr-btn gr-btn--close" data-action="close-recruit-results"><span>닫기</span></button><div class="gr-grid gr-grid--rows-${rows}${rewards.length === 1 ? ' gr-grid--single' : ''}">${cards}</div><div class="gr-balance"><i class="gr-balance__icon" aria-hidden="true">${options.honorIcon}</i><span>보유 옥패</span><b>${formatNumber(options.honor)}</b>${options.freeDraws > 0 ? `<em>무료 장비 뽑기권 ${formatNumber(options.freeDraws)}회</em>` : ''}</div><div class="gr-actions"><button class="gr-btn gr-btn--action" data-action="extra-equipment-draw" data-count="1"><span>1회 추가 뽑기</span><b>${options.cost.one}</b></button><button class="gr-btn gr-btn--action" data-action="extra-equipment-draw" data-count="10"><span>10회 추가 뽑기</span><b>${options.cost.ten}</b></button><button class="gr-btn gr-btn--confirm" data-action="close-recruit-results"><span>결과 확인 완료</span><b aria-hidden="true">→</b></button></div></section>`
}

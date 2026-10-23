// 내정 → 관직 화면(2026.10.23): 태학 박사 1자리 + 태수(재야는 두목) 3자리. 규칙 · 수치는 game/offices.ts.
// 휴대폰 가로에서는 스크롤 없이 한 화면에 자리 카드 4장을 나란히 놓고, 무장 · 도시는 덮개 창에서 고른다.
import {
  OFFICE_UNLOCK_TIERS, RAID_COUNT_STEP, SCHOLAR_CAP, SCHOLAR_STEP, academyCut, academyLevelSum, chiefBonus, cityGovernor, deployedGeneralIds,
  governorBonus, nationMatch, officeOf, officePostCount, officeValue, percentText, scholarCut, type OfficePost,
} from '../game/offices'
import { GRADE_META, type General, type StrategyState } from '../game/strategy'

export interface OfficeUiState {
  /** 무장 고르기 창: 어느 자리 */
  picker: { post: OfficePost; slot: number } | null
  /** 태수가 맡을 도시 고르기 창: 자리 번호 */
  cityPicker: number | null
}
export function emptyOfficeUi(): OfficeUiState {
  return { picker: null, cityPicker: null }
}
interface Helpers { portrait: (general: General) => string }

const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character))
const isWanderer = (state: StrategyState) => state.faction === '재야'
const postTitle = (post: OfficePost, slot: number) => post === 'scholar' ? '태학 박사' : `${post === 'governor' ? '태수' : '두목'} ${slot + 1}`
const nationNote = (post: OfficePost) => post === 'chief' ? '군웅 ×1.2' : '같은 나라 ×1.2'
/** 줄이는 효과 · 늘리는 효과 글(0이면 부호 없이 0%) */
const minus = (value: number) => value > 0 ? `−${percentText(value)}` : '0%'
const plus = (value: number) => value > 0 ? `+${percentText(value)}` : '0%'
/** 자리 카드 아래 규칙 한 줄 */
const RULE_NOTE: Record<OfficePost, string> = {
  scholar: `모략 ${SCHOLAR_STEP}당 −1% · 최대 −15%`,
  governor: '능력치 20당 1% · 최대 15% · 같은 나라 ×1.2',
  chief: `능력치 20당 1%(최대 15%) · 통솔 ${RAID_COUNT_STEP}당 약탈 +1회 · 군웅 ×1.2`,
}

/** 자리별 효과 줄: [능력치 이름 · 값, 효과] */
function effectLines(state: StrategyState, post: OfficePost, general: General): Array<[string, string]> {
  if (post === 'scholar') return [[`모략 ${general.stratagem}`, `연구 시간 ${minus(officeValue(general.stratagem, false, SCHOLAR_STEP, SCHOLAR_CAP))}`]]
  if (post === 'chief') {
    const bonus = chiefBonus(general)
    return [
      [`통솔 ${general.leadership}`, `하루 약탈 +${bonus.raidCount}회`],
      [`모략 ${general.stratagem}`, `약탈량 ${plus(bonus.plunder)}`],
      [`무력 ${general.martial}`, `약탈 공성 성벽 피해 ${plus(bonus.wall)}`],
      [`속도 ${general.speed}`, `재출정 대기 ${minus(bonus.cooldown)}`],
    ]
  }
  const bonus = governorBonus(general, state.faction)
  return [
    [`통솔 ${general.leadership}`, `새 수비대 전력 ${plus(bonus.leadership)}`],
    [`모략 ${general.stratagem}`, `은전 · 영향력 ${plus(bonus.stratagem)}`],
    [`무력 ${general.martial}`, `맞닿은 적 도시 공성 ${plus(bonus.martial)}`],
    [`속도 ${general.speed}`, `공사 시간 ${minus(bonus.speed)}`],
  ]
}
/** 고르기 창 정렬 점수 */
function postScore(state: StrategyState, post: OfficePost, general: General): number {
  if (post === 'scholar') return general.stratagem
  if (post === 'chief') { const bonus = chiefBonus(general); return bonus.plunder + bonus.wall + bonus.cooldown + bonus.raidCount * 0.03 }
  const bonus = governorBonus(general, state.faction)
  return bonus.leadership + bonus.martial + bonus.stratagem + bonus.speed
}

function face(general: General | null, helpers: Helpers): string {
  if (!general) return '<span class="office-face office-face--empty"><b>＋</b><small>임명</small></span>'
  const color = GRADE_META[general.grade]?.color ?? '#a9b1b8'
  return `<span class="office-face" style="--grade:${color};background-image:url('${helpers.portrait(general)}')"><i class="office-face__grade" data-no-tr>${general.grade}</i></span>`
}

function postCard(state: StrategyState, post: OfficePost, slot: number, helpers: Helpers): string {
  const open = post === 'scholar' || slot < officePostCount(state)
  const title = postTitle(post, slot)
  const sub = post === 'scholar' ? '모략 → 연구 시간' : post === 'governor' ? '맡은 도시를 다스린다' : '산채를 이끈다'
  if (!open) {
    const tier = OFFICE_UNLOCK_TIERS[slot - 1] ?? 6
    return `<article class="office-post is-locked"><header class="office-post__head"><strong>${title}</strong><small>${sub}</small></header><div class="office-post__lock"><b>🔒</b><span>인재 ${tier}단계 연구를 마치면 열립니다</span></div></article>`
  }
  const offices = state.offices
  const id = post === 'scholar' ? offices?.scholar : post === 'governor' ? offices?.governors?.[slot]?.generalId : offices?.chiefs?.[slot]
  const general = id ? state.generals.find(item => item.id === id) ?? null : null
  const pick = `data-action="office-pick" data-post="${post}" data-slot="${slot}"`
  if (!general) {
    return `<article class="office-post is-empty"><header class="office-post__head"><strong>${title}</strong><small>${sub}</small></header><button class="office-post__face" ${pick}>${face(null, helpers)}</button><p class="office-post__empty">${post === 'scholar' ? '모략이 높은 무장을 앉히면 연구가 빨라집니다.' : post === 'governor' ? '통솔 · 모략 · 무력 · 속도가 그 도시 내정을 돕습니다.' : '통솔 · 모략 · 무력 · 속도가 약탈을 돕습니다.'}</p><button class="mini-action mini-action--research office-post__cta" ${pick}>무장 임명</button></article>`
  }
  const deployed = deployedGeneralIds(state).has(general.id)
  const city = post === 'governor' ? state.cities.find(item => item.id === offices?.governors?.[slot]?.cityId) : undefined
  const cityLost = post === 'governor' && (!city || city.owner !== state.faction)
  const off = deployed ? '출전 편성(1 · 2 · 3군)에 있어 효과가 꺼져 있습니다' : cityLost ? '맡은 도시를 잃어 효과가 꺼져 있습니다' : ''
  const nation = post !== 'scholar' && nationMatch(state.faction, general.id)
  const lines = effectLines(state, post, general).map(([stat, text]) => `<li><span>${esc(stat)}</span><b>${esc(text)}</b></li>`).join('')
  const cityButton = post === 'governor' ? `<button class="office-city" data-action="office-city-pick" data-slot="${slot}">${city ? `${esc(city.name)} <small>Lv.${city.level}</small>` : '도시 고르기'} <i>▾</i></button>` : ''
  return `<article class="office-post${off ? ' is-off' : ''}">
    <header class="office-post__head"><strong>${title}</strong><small>${sub}</small></header>
    <button class="office-post__face" ${pick}>${face(general, helpers)}</button>
    <div class="office-post__name"><strong>${esc(general.name)}</strong><small>Lv.${general.level} · ${esc(general.role)}${nation ? ` · <em>${nationNote(post)}</em>` : ''}</small></div>
    ${cityButton}
    <ul class="office-effects">${lines}</ul>
    ${off ? `<p class="office-post__warn">${off}</p>` : ''}
    <p class="office-post__note">${RULE_NOTE[post]}</p>
    <footer class="office-post__foot"><button class="mini-action" ${pick}>바꾸기</button><button class="mini-action" data-action="office-dismiss" data-post="${post}" data-slot="${slot}">해임</button></footer>
  </article>`
}

/** 무장 고르기 창: 출전하지 않은 무장, 이 자리에 맞는 순 */
function pickerPanel(state: StrategyState, ui: OfficeUiState, helpers: Helpers): string {
  const picker = ui.picker
  if (!picker) return ''
  const deployed = deployedGeneralIds(state)
  const current = picker.post === 'scholar' ? state.offices?.scholar : picker.post === 'governor' ? state.offices?.governors?.[picker.slot]?.generalId : state.offices?.chiefs?.[picker.slot]
  const list = state.generals.filter(general => !deployed.has(general.id)).sort((a, b) => postScore(state, picker.post, b) - postScore(state, picker.post, a) || b.level - a.level)
  const tiles = list.map(general => {
    const held = officeOf(state, general.id)
    const badge = general.id === current ? '지금 자리' : held ? postTitle(held.post, held.slot) : ''
    const nation = picker.post !== 'scholar' && nationMatch(state.faction, general.id)
    const lines = effectLines(state, picker.post, general).map(([stat, text]) => `<li><span>${esc(stat)}</span><b>${esc(text)}</b></li>`).join('')
    return `<button class="office-pick${general.id === current ? ' is-current' : ''}" data-action="office-appoint" data-post="${picker.post}" data-slot="${picker.slot}" data-general-id="${general.id}" ${general.id === current ? 'disabled' : ''}>${face(general, helpers)}<span class="office-pick__copy"><strong>${esc(general.name)} <small>Lv.${general.level}</small></strong>${badge ? `<em class="office-pick__badge">${esc(badge)}</em>` : ''}${nation ? `<em class="office-pick__nation">${nationNote(picker.post)}</em>` : ''}<ul class="office-effects">${lines}</ul></span></button>`
  }).join('')
  const hint = picker.post === 'scholar' ? '모략 10당 연구 시간 −1%(최대 −15%)' : picker.post === 'governor' ? '능력치 20당 1%(최대 15%) · 같은 나라 무장이면 ×1.2' : `능력치 20당 1%(최대 15%) · 통솔 ${RAID_COUNT_STEP}당 약탈 +1회 · 군웅이면 ×1.2`
  return `<div class="gdetail office-picker" role="dialog"><div class="gdetail__backdrop" data-action="office-close"></div><div class="gdetail__body office-picker__body"><button class="gdetail__close" data-action="office-close" aria-label="닫기">✕</button>
    <div class="office-picker__head"><strong>${postTitle(picker.post, picker.slot)} 임명</strong><small>${hint} · 1 · 2 · 3군에 편성된 무장은 고를 수 없습니다</small></div>
    ${tiles ? `<div class="office-picker__grid">${tiles}</div>` : '<p class="office-picker__none">앉힐 무장이 없습니다. 출전 편성에 없는 무장만 관직에 앉힐 수 있습니다.</p>'}
  </div></div>`
}

/** 태수가 맡을 도시 고르기 창(다른 태수가 맡은 도시면 서로 바꾼다) */
function cityPanel(state: StrategyState, ui: OfficeUiState): string {
  if (ui.cityPicker === null) return ''
  const slot = ui.cityPicker
  const posts = state.offices?.governors ?? []
  const owned = state.cities.filter(city => city.owner === state.faction).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'ko'))
  const rows = owned.map(city => {
    const holder = posts.findIndex(post => post?.cityId === city.id)
    const mine = holder === slot
    const other = holder >= 0 && !mine ? state.generals.find(general => general.id === posts[holder]?.generalId) : undefined
    return `<button class="office-cityrow${mine ? ' is-current' : ''}" data-action="office-city" data-slot="${slot}" data-city-id="${city.id}" ${mine ? 'disabled' : ''}><strong>${esc(city.name)}</strong><small>Lv.${city.level} · ${esc(city.region)}</small><em>${mine ? '지금 맡은 도시' : other ? `태수 ${holder + 1} ${esc(other.name)} · 서로 바꾸기` : ''}</em></button>`
  }).join('')
  return `<div class="gdetail office-picker" role="dialog"><div class="gdetail__backdrop" data-action="office-close"></div><div class="gdetail__body office-picker__body office-picker__body--city"><button class="gdetail__close" data-action="office-close" aria-label="닫기">✕</button>
    <div class="office-picker__head"><strong>태수 ${slot + 1} · 맡을 도시</strong><small>도시 하나에 태수 한 명 · 무력 효과는 그 도시와 맞닿은 적 도시를 공성할 때 붙습니다</small></div>
    ${rows ? `<div class="office-citylist">${rows}</div>` : '<p class="office-picker__none">아군 도시가 없습니다.</p>'}
  </div></div>`
}

export function officeSection(state: StrategyState, ui: OfficeUiState, helpers: Helpers): string {
  const wanderer = isWanderer(state)
  const posts = [postCard(state, 'scholar', 0, helpers), ...[0, 1, 2].map(slot => postCard(state, wanderer ? 'chief' : 'governor', slot, helpers))].join('')
  const academy = academyCut(state)
  const scholar = scholarCut(state)
  const governed = wanderer ? 0 : state.cities.filter(city => cityGovernor(state, city.id)).length
  const foot = wanderer
    ? `재야는 다스리는 도시가 없어 태수 대신 두목을 둡니다. 효과마다 두목 중 가장 높은 값이 들어갑니다 · 태수 · 두목 자리는 인재 ${OFFICE_UNLOCK_TIERS.join(' · ')}단계 연구로 늘어납니다.`
    : `아군 도시 태학 서원 단계 합 ${academyLevelSum(state)}${academy ? ` → 연구 시간 −${percentText(academy)}` : ''}(5당 −1%, 최대 −15%) · 태수가 다스리는 도시 ${governed}곳 · 자리는 인재 ${OFFICE_UNLOCK_TIERS.join(' · ')}단계 연구로 늘어납니다.`
  return `<section class="page-section page-section--office">
    <div class="section-heading section-heading--compact"><div><span class="eyebrow">내정</span><h1>관직</h1><p class="heading-copy">출전하지 않는 무장을 자리에 앉히면 능력치만큼 내정 효과가 생깁니다.</p></div><div class="section-counter"><span>연구 시간</span><strong>${minus(academy + scholar)}</strong></div></div>
    <div class="office-board">${posts}</div>
    <p class="office-foot">${esc(foot)}</p>
    ${pickerPanel(state, ui, helpers)}${cityPanel(state, ui)}
  </section>`
}

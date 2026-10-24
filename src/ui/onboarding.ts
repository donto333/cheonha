// 첫 입장 튜토리얼(건너뛸 수 없음): 상점 → 무료 10회 모집 → 장비 10회 뽑기 → 자동 편성 → 무장 강화 → 장비 강화 → 영토전 알아보기 → 시나리오 클리어 → 마무리.
// 빛나는 버튼 말고는 누를 수 없게 막고, 정해진 행동을 하면 다음 단계로 넘어간다. 진행 단계는 계정(임무 데이터)에 저장된다.
import type { Section, StrategyState } from '../game/strategy'
import { ensureMissions } from '../game/missions'
import { Coach } from './coach'

export type OnboardEvent = 'honor-buy' | 'recruit10' | 'gear10' | 'auto-formation' | 'upgrade' | 'enhance' | 'scenario-win' | 'scenario-lose'

export interface OnboardStep {
  id: 'welcome' | 'shop' | 'recruit' | 'gear' | 'formation' | 'upgrade' | 'enhance' | 'territory' | 'scenario' | 'finale'
  section?: Section
  /** 비출 버튼(이 버튼만 누를 수 있다). 여러 개면 화면에 있는 첫 번째(예: 강화 버튼 → 없으면 상세 창 닫기 → 무장 칸) */
  target?: string | string[]
  title: string
  body: string
  /** 이 일이 일어나면 다음 단계 */
  event?: OnboardEvent
  /** 안내만 하는 단계의 버튼 글 */
  next?: string
  /** 안내만 하는 단계를 여러 장으로 나눠 화면 곳곳을 비추며 설명한다(다음을 누르며 넘김) */
  pages?: OnboardPage[]
}

export interface OnboardPage {
  /** 비출 곳(누를 필요 없음). 없거나 화면에 없으면 가운데 말풍선 */
  target?: string
  title: string
  body: string
}

/** 튜토리얼 상점에서 사는 옥패 묶음(10금화 → 옥패 1,000) */
export const ONBOARD_HONOR_PACKAGE = 'honor-10'
/** 장비 10회 뽑기 비용(옥패) */
export const ONBOARD_GEAR_COST = 2200

/** 7단계 영토전: 영토 화면 곳곳을 비추며 차례로 설명한다(규칙은 영토전 설명 창과 같은 내용) */
export const TERRITORY_PAGES: OnboardPage[] = [
  { title: '영토전이란', body: '위 · 촉 · 오 세 진영이 천하의 도시를 두고 다투는 싸움입니다. 차지한 도시의 등급 합이 진영 순위가 되고, 한 달(시즌)마다 순위를 정산해 1위 진영이 보상 무장을 받습니다. (재야는 본성 없이 어느 도시든 약탈 공성을 합니다.)' },
  { target: '.territory-map', title: '지도 읽기', body: '점의 색이 주인입니다: 아군 · 적 · 중립. 도시를 잇는 선이 진군로입니다. 두 손가락으로 확대하고 끌어서 옮기며, 도시를 누르면 그 도시의 정보가 열립니다.' },
  { target: '.conquest-overview', title: '전선 한눈에 보기', body: '아군 도시 수, 공격할 수 있는 남은 전선, 지금 덱의 출정 전투력, 세력전 공헌도입니다. 출정 전투력은 무장 · 장비를 강화할수록 오릅니다.' },
  { target: '.city-management', title: '도시 정보', body: '고른 도시의 성벽 · 단계 · 수비병이 여기 나옵니다. 휴대폰에서는 위의 탭으로 수비(적 도시는 공성) · 내정 · 기록을 바꿔 봅니다.' },
  { title: '공성: 성벽 무너뜨리기', body: '내 진영 도시와 진군로로 맞닿은 적 · 중립 도시만 공성할 수 있습니다. 출정마다 식량 · 은전 · 철을 쓰고, 이기면 수비병 1부대를 격파하고 성벽이 내 덱 전투력만큼 깎입니다. 깎인 성벽은 1시간에 20%씩 회복하니 몰아서 공격하십시오.' },
  { title: '점령: 10분 쟁탈전', body: '성벽이 0이 되고 수비병을 모두 물리친 뒤 최종 세력전에서 이긴 진영이 10분 동안 임시 점령합니다. 그동안 다른 진영이 수비병을 격파하면 임시 점령을 빼앗깁니다. 10분이 끝날 때 가진 진영이 최종 점령하고, 마지막 점령자는 금화를 받습니다.' },
  { target: '.defense-card', title: '수비: 수비병 세우기', body: '아군 도시에는 지금 덱을 수비병으로 세웁니다(도시마다 100부대). 적은 이 덱과 실제로 싸웁니다. 막아 낼 때마다 수비병이 지쳐 능력이 떨어지고 1시간에 10%씩 회복합니다. 중립 습격대가 오면 수비전으로 막으십시오.' },
  { target: '[data-action="collect-income"]', title: '내정: 하루 한 번 수확', body: '하루 한 번 아군 도시의 식량 · 은전 · 목재 · 철 · 영향력을 거둡니다. 도시의 건물을 강화하면 생산이 늘지만, 도시를 빼앗기면 건물이 처음으로 돌아갑니다.' },
  { title: '낙양전과 상성', body: '매주 일요일 20~24시에는 모든 진영이 낙양을 두고 맞붙습니다. 공성에는 덱 유형 상성이 있어 유리하면 피해 +12%, 불리하면 −12%입니다. 약한 진영에는 전투 이점이 붙습니다.' },
  { target: '[data-action="territory-rules"]', title: '규칙은 언제든 여기서', body: '자세한 규칙은 이 "영토전 설명" 단추에서 다시 볼 수 있습니다. 이제 무장과 장비를 키운 덱으로 첫 전투에 나가 보겠습니다.' },
]

export const ONBOARD_STEPS: OnboardStep[] = [
  { id: 'welcome', title: '금화 100개를 드립니다', body: '천하에 오신 것을 환영합니다. 금화 100개가 지급되었습니다. 먼저 상점에서 금화로 옥패를 사 보겠습니다. 옥패는 무장 모집과 장비 뽑기에 씁니다.', next: '상점으로' },
  { id: 'shop', section: 'shop', target: `[data-action="honor-shop-purchase"][data-package-id="${ONBOARD_HONOR_PACKAGE}"]`, title: '1. 옥패 사기', body: '빛나는 "10금화 · 옥패 +1,000"을 누르십시오. 큰 묶음일수록 금화 하나당 더 많이 받습니다.', event: 'honor-buy' },
  { id: 'recruit', section: 'recruit', target: '[data-action="recruit"][data-count="10"]', title: '2. 무료 10회 모집', body: '첫 10회 모집은 무료이고, 5등급 무장 한 명이 반드시 나옵니다. 빛나는 버튼을 누르십시오.', event: 'recruit10' },
  { id: 'gear', section: 'recruit', target: '[data-action="equipment-draw"][data-count="10"]', title: '3. 장비 10회 뽑기', body: '이번에는 방금 산 옥패로 무기·갑옷·장신구를 10개 뽑습니다.', event: 'gear10' },
  { id: 'formation', section: 'formation', target: '[data-action="auto-formation"]:not([data-with-equipment])', title: '4. 자동 편성', body: '새 무장이 들어왔으니 출전 무장을 다시 고릅니다. 자동 편성을 누르면 전투력·인연·병종을 따져 세 명을 세웁니다. 가운데는 적이 먼저 노리는 전열이라 단단한 무장이 섭니다.', event: 'auto-formation' },
  { id: 'upgrade', section: 'roster', target: ['.roster-grid .gcard .gcard-up:not([disabled])', '.gdetail .gcard .gcard-up:not([disabled])', '.gdetail:not(.eqdetail) .gdetail__close', '.gtile[data-kind="roster"]'], title: '5. 무장 강화', body: '은전과 병서로 무장의 레벨을 올립니다. 무장을 눌러 상세 창을 열고 빛나는 "강화" 버튼을 누르십시오. 레벨이 오르면 능력치와 병력이 늘어납니다.', event: 'upgrade' },
  { id: 'enhance', section: 'equipment', target: ['.equipment-card [data-action="equipment-enhance"]:not([disabled])', '.eqdetail .gdetail__close', '.eqtile:not([data-grade="mythic"])'], title: '6. 장비 강화', body: '은전과 철로 장비를 강화합니다. 장비를 눌러 상세 창을 열고 빛나는 "강화" 버튼을 누르십시오. 강화할수록 장착한 무장의 능력이 오릅니다.', event: 'enhance' },
  { id: 'territory', section: 'territory', title: '7. 영토전 알아보기', body: '진영과 함께 천하의 도시를 다툽니다. 진군로로 맞닿은 적 도시를 공성해 성벽을 무너뜨리고 수비병을 모두 물리치면 우리 진영이 점령합니다.', next: '첫 전투로', pages: TERRITORY_PAGES },
  { id: 'scenario', section: 'battle', target: '.scenario-start-button', title: '8. 시나리오 클리어', body: '이제 첫 전투입니다. 출정을 누르고 184년 황건적의 난을 이기십시오. 튜토리얼 전투는 쉽게 맞춰 두었고, 싸우는 동안 방법을 하나씩 알려 드립니다.', event: 'scenario-win' },
  { id: 'finale', title: '천하 제패를 향해', body: '무장을 성장시켜 천하를 제패하세요.', next: '시작하기' },
]

export interface OnboardingHost {
  state: StrategyState
  /** 메뉴 옮기기(게임의 메뉴 버튼과 같은 처리) */
  openSection(section: Section): void
  /** 탭·무료 모집 표시 맞추기 */
  prepare(step: OnboardStep): void
  /** 진행 저장 */
  save(): void
  /** 지금 다른 창(전투·결과·소개 등)이 떠 있어 잠시 멈춰야 하는가 */
  busy(): boolean
  notify(message: string): void
  /** 끝났을 때 */
  finished(): void
}

export class Onboarding {
  private readonly coach = new Coach()
  private shownStep = -1
  private shownAt = 0
  private retry = false
  private blocking = false
  /** 여러 장 안내 단계의 지금 장 */
  private page = 0
  /** 지금 비추고 있는 버튼(target 중 화면에 있는 것) */
  private shownTarget = ''

  constructor(private readonly host: OnboardingHost) {
    // 빛나는 버튼과 안내 말풍선 말고는 누르지 못하게 막는다(캡처 단계에서 먼저 받는다)
    const guard = (event: Event) => {
      if (!this.blocking) return
      const target = event.target as Element | null
      if (!target || !(target instanceof Element)) return
      if (target.closest('.coach-layer--forced .coach-bubble')) return
      // 튜토리얼 위에 뜨는 창(출석 체크 · 아이디 정하기)은 언제나 누를 수 있다
      if (target.closest('.attendance-modal, .guest-signup')) return
      const selector = this.shownTarget
      if (selector && target.closest(selector)) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }
    for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick', 'contextmenu']) document.addEventListener(type, guard, { capture: true, passive: false })
  }

  /** 단계의 비출 버튼 중 지금 화면에 있는 첫 번째(없으면 '') */
  private resolveTarget(step: OnboardStep): string {
    const list = Array.isArray(step.target) ? step.target : step.target ? [step.target] : []
    return list.find(selector => document.querySelector(selector)) ?? ''
  }

  private missions() { return ensureMissions(this.host.state) }

  /** 아직 끝나지 않았는가 */
  get pending(): boolean { return !this.missions().onboardDone }
  /** 지금 화면을 이끌고 있는가(메뉴 안내 등은 이때 쉰다) */
  get active(): boolean { return this.pending }

  stepIndex(): number {
    const index = Math.trunc(this.missions().onboardStep ?? 0)
    return Math.min(Math.max(0, index), ONBOARD_STEPS.length - 1)
  }

  current(): OnboardStep | null {
    return this.pending ? ONBOARD_STEPS[this.stepIndex()] : null
  }

  /** 지금 단계가 이것인가 */
  at(id: OnboardStep['id']): boolean { return this.current()?.id === id }

  /** 게임에서 일어난 일 */
  event(kind: OnboardEvent): void {
    const step = this.current()
    if (!step) return
    if (kind === 'scenario-lose' && step.id === 'scenario') { this.retry = true; this.shownStep = -1; return }
    if (step.event !== kind) return
    this.advance()
  }

  private advance(): void {
    const missions = this.missions()
    const next = this.stepIndex() + 1
    this.coach.hide()
    this.blocking = false
    this.shownStep = -1
    this.retry = false
    this.page = 0
    if (next >= ONBOARD_STEPS.length) {
      missions.onboardDone = true
      missions.onboardStep = ONBOARD_STEPS.length
      this.host.prepare({ id: 'finale', title: '', body: '' })
      this.host.save()
      this.host.finished()
      return
    }
    missions.onboardStep = next
    this.host.save()
  }

  /** 주기적으로 불러 화면을 맞춘다 */
  tick(): void {
    const step = this.current()
    if (!step) { if (this.coach.active) this.coach.hide(); this.blocking = false; return }
    if (this.host.busy()) {
      if (this.coach.active) this.coach.hide()
      this.blocking = false
      this.shownStep = -1
      return
    }
    const index = this.stepIndex()
    const resolved = this.resolveTarget(step)
    if (this.shownStep === index && this.coach.active) {
      // 비출 버튼이 바뀌면(상세 창이 열리거나 닫힘) 그 버튼으로 옮긴다
      if (resolved && this.shownTarget && resolved !== this.shownTarget) { this.shownStep = -1; return }
      if (resolved) this.shownAt = performance.now()
      // 비출 버튼이 한동안 안 나타나면 막히지 않게 다음으로 넘길 수 있게 한다
      else if (step.target && this.shownTarget && performance.now() - this.shownAt > 2500) this.showFallback(step)
      return
    }
    if (step.section && this.host.state.section !== step.section) {
      this.host.prepare(step)
      this.host.openSection(step.section)
      return
    }
    // 화면이 막 바뀌어 버튼이 아직 없으면 잠깐 기다린다(2.5초가 지나도 없으면 넘긴다)
    if (step.target && !resolved) {
      if (this.shownStep !== index) { this.shownStep = index; this.shownAt = performance.now(); this.prepareOnce(step, index) }
      if (performance.now() - this.shownAt > 2500) { this.shownTarget = ''; this.blocking = true; this.showFallback(step) }
      return
    }
    this.prepareOnce(step, index)
    this.shownStep = index
    this.shownAt = performance.now()
    this.shownTarget = resolved
    const total = ONBOARD_STEPS.length - 2
    const number = Math.max(0, Math.min(total, index))
    if (!step.target && step.pages?.length) {
      // 여러 장 안내: 장마다 화면의 한 곳을 비추고 '다음'으로 넘긴다(마지막 장에서 다음 단계로)
      const pages = step.pages
      const at = Math.min(this.page, pages.length - 1)
      const page = pages[at]
      const last = at === pages.length - 1
      this.blocking = true
      this.coach.show({ target: page.target && document.querySelector(page.target) ? page.target : undefined, title: `${step.title} · ${page.title}`, body: page.body }, { forced: true, seal: '튜토리얼', index: at, total: pages.length, nextLabel: last ? (step.next ?? '다음') : '다음', onNext: () => { if (last) this.advance(); else { this.page = at + 1; this.shownStep = -1 } }, onSkip: () => undefined })
      return
    }
    if (!step.target) {
      this.blocking = true
      this.coach.show({ title: step.title, body: step.body }, { forced: true, seal: '튜토리얼', nextLabel: step.next ?? '다음', onNext: () => this.advance(), onSkip: () => undefined })
      return
    }
    const body = this.retry && step.id === 'scenario' ? '아쉽게 졌습니다. 경고가 뜨면 같은 쪽 무장을 눌러 막아 보십시오. 다시 출정하십시오.' : step.body
    this.blocking = true
    this.coach.show({ target: resolved, title: step.title, body, expect: 'click' }, { forced: true, seal: '튜토리얼', index: number - 1, total, onNext: () => undefined, onSkip: () => undefined })
  }

  /** 재료 채우기 · 탭 맞추기는 단계마다 한 번만(상세 창을 열고 닫을 때마다 다시 그리지 않게) */
  private preparedStep = -1
  private prepareOnce(step: OnboardStep, index: number): void {
    if (this.preparedStep === index) return
    this.preparedStep = index
    this.host.prepare(step)
  }

  /** 버튼을 찾지 못할 때: 설명만 띄우고 다음으로 */
  private showFallback(step: OnboardStep): void {
    this.shownTarget = ''
    this.coach.show({ title: step.title, body: '이 단계는 지금 진행할 수 없어 다음으로 넘어갑니다.' }, { forced: true, seal: '튜토리얼', nextLabel: '다음', onNext: () => this.advance(), onSkip: () => undefined })
  }
}

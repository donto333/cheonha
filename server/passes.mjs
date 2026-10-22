// 정액권(서버와 게임이 같이 쓴다) · 2026.10.20
// - 일주일 정액권 2,900원: 7일 동안 하루 금화 2개
// - 한달 정액권 9,900원: 30일 동안 하루 금화 2개
// - 자동 전투 정액권 4,900원: 7일 동안 자동 전투 예고 대응 확률 70% → 85%, 전투 3배속
// 다시 사면 남은 기간에 이어서 늘어난다. 금화는 한국 날짜로 하루 한 번(접속 · 동기화 때) 받는다.
// 정식 출시 전에는 정액권마다 계정당 한 번 무료 체험, 출시 후에는 결제 연동(PASS_PAYMENT_ENABLED) 전까지 잠긴다.

export const PASS_DAY_MS = 24 * 60 * 60 * 1000

export const PASSES = [
  { id: 'pass-week', name: '일주일 정액권', priceKRW: 2900, days: 7, dailyGold: 2, desc: '7일 동안 매일 금화 2개' },
  { id: 'pass-month', name: '한달 정액권', priceKRW: 9900, days: 30, dailyGold: 2, desc: '30일 동안 매일 금화 2개' },
  { id: 'pass-auto', name: '자동 전투 정액권', priceKRW: 4900, days: 7, dailyGold: 0, auto: true, desc: '7일 동안 자동 전투 예고 대응 확률 70% → 85% · 전투 3배속' },
]

/** 결제 연동이 붙으면 true(그 전까지 출시 후 구매는 잠김) */
export const PASS_PAYMENT_ENABLED = false

/** 자동 전투 정액권의 자동 대응 확률(기본 70%) */
export const AUTO_PASS_ACCURACY = 0.85
/** 자동 전투 정액권의 최대 배속(기본 2배) */
export const AUTO_PASS_SPEED = 3

export function passById(id) {
  return PASSES.find(pass => pass.id === id) ?? null
}

/** 정액권 기간 연장: 남아 있으면 이어서, 끝났으면 지금부터 */
export function extendPass(until, pass, now = Date.now()) {
  return Math.max(Number(until) || 0, now) + pass.days * PASS_DAY_MS
}

/** 지금 쓰는 중인 정액권 */
export function passActive(passes, id, now = Date.now()) {
  return (Number(passes?.[id]?.until) || 0) > now
}

/** 오늘 받을 금화: 쓰는 중이고 오늘 아직 안 받은 정액권들 */
export function passGoldDue(passes, goldDays, day, now = Date.now()) {
  return PASSES.filter(pass => pass.dailyGold > 0 && passActive(passes, pass.id, now) && goldDays?.[pass.id] !== day)
}

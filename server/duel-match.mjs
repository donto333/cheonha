// 유저 대련 상대 고르기(서버와 게임이 같이 쓴다).
// - 덱을 저장한 지휘관이 DUEL_USER_THRESHOLD명 이상이면: 실제 유저 덱 중 내 덱 전력과 가장 가까운 상대
// - 그보다 적으면: 내 덱 전력에 맞춘 훈련 상대(더미 덱)
// 전력은 저장된 무장 능력치만으로 계산한다(서버에 장비·연구 정보가 없어도 같은 값이 나오게).

export const DUEL_USER_THRESHOLD = 20
/** 실제 유저 상대로 보여 줄 수 */
export const DUEL_MATCH_COUNT = 6

const GRADE_MULT = { 1: 0.82, 2: 0.91, 3: 1, 4: 1.12, 5: 1.28 }
const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback)

/** 무장 한 명의 대련 전력(능력치·등급·레벨·성급) */
export function duelGeneralPower(general) {
  if (!general || typeof general !== 'object') return 0
  const base = num(general.leadership) * 1.15 + num(general.martial) * 1.25 + num(general.stratagem) * 0.9 + num(general.speed) * 0.65 + num(general.defense) * 0.25
  const level = Math.max(1, Math.min(60, num(general.level, 1))) // 무장 최고 레벨 60
  const stars = Math.max(1, Math.min(5, num(general.stars, 1)))
  return base * (GRADE_MULT[num(general.grade, 3)] ?? 1) * (1 + (level - 1) * 0.035) * (1 + (stars - 1) * 0.06)
}

/** 덱(최대 3명) 전력 */
export function duelDeckPower(deck) {
  if (!Array.isArray(deck)) return 0
  return Math.round(deck.slice(0, 3).reduce((sum, general) => sum + duelGeneralPower(general), 0))
}

/** 대련 난이도 구간(상대 덱 전력 ÷ 내 덱 전력): 쉬움 50~69% · 보통 70~109% · 어려움 110~120% */
export const DUEL_TIER_RANGES = { easy: [0.5, 0.7], normal: [0.7, 1.1], hard: [1.1, 1.2] }
const TIER_ORDER = ['easy', 'normal', 'hard']

/**
 * 실제 유저 상대 count명: 내 전력의 50~120% 안에서 쉬움 · 보통 · 어려움을 고르게(구간마다 차례로 한 명씩, 구간 가운데에 가까운 상대부터).
 * 구간 안 상대가 모자라면 구간에서 가장 덜 벗어난 상대로 채운다. 결과는 약한 상대부터. 같은 조건이면 id 순으로 고정한다.
 */
export function pickDuelMatches(candidates, myPower, count = DUEL_MATCH_COUNT) {
  const me = Math.max(1, num(myPower, 1))
  const want = Math.max(1, count)
  const ratioOf = candidate => num(candidate.power) / me
  const byId = (left, right) => String(left.id).localeCompare(String(right.id))
  const pools = TIER_ORDER.map(tier => {
    const [lo, hi] = DUEL_TIER_RANGES[tier]
    const mid = (lo + hi) / 2
    return candidates.filter(c => { const r = ratioOf(c); return tier === 'hard' ? r >= lo && r <= hi : r >= lo && r < hi })
      .sort((left, right) => Math.abs(ratioOf(left) - mid) - Math.abs(ratioOf(right) - mid) || byId(left, right))
  })
  const picked = []
  for (let round = 0; picked.length < want && pools.some(pool => pool.length > round); round += 1) {
    for (const pool of pools) if (pool[round] && picked.length < want) picked.push(pool[round])
  }
  if (picked.length < want) {
    const taken = new Set(picked)
    const outside = r => (r < 0.5 ? 0.5 - r : r > 1.2 ? r - 1.2 : 0)
    picked.push(...candidates.filter(c => !taken.has(c)).sort((left, right) => outside(ratioOf(left)) - outside(ratioOf(right)) || byId(left, right)).slice(0, want - picked.length))
  }
  return picked.sort((left, right) => num(left.power) - num(right.power) || byId(left, right))
}

/** 대련 난이도별 승리 보상(신화장비 조각): 쉬움 1 · 보통 2 · 어려움 3 */
export const DUEL_TIER_FRAGMENTS = { easy: 1, normal: 2, hard: 3 }

/** 실제 유저 상대의 난이도: 내 덱 전력 대비 70% 미만이면 쉬움, 110% 이상이면 어려움, 그 사이는 보통 */
export function duelTierFor(opponentPower, myPower) {
  const ratio = num(opponentPower) / Math.max(1, num(myPower, 1))
  return ratio >= DUEL_TIER_RANGES.hard[0] ? 'hard' : ratio < DUEL_TIER_RANGES.normal[0] ? 'easy' : 'normal'
}

/**
 * 보여 줄 상대들의 난이도: 전력 비율로 정하되, 어려움(110~120%) 상대가 하나도 없으면(나보다 센 상대가 없을 때)
 * 보통 구간 상대 중 센 쪽 절반(최소 1명)을 어려움으로 함께 쓴다(보통 · 어려움 공유). opponents와 같은 순서의 배열.
 */
export function assignDuelTiers(opponents, myPower) {
  const tiers = opponents.map(opponent => duelTierFor(num(opponent.power), myPower))
  if (tiers.includes('hard')) return tiers
  const normal = opponents.map((opponent, index) => ({ index, power: num(opponent.power) })).filter(entry => tiers[entry.index] === 'normal').sort((a, b) => b.power - a.power)
  normal.slice(0, Math.ceil(normal.length / 2)).forEach(entry => { tiers[entry.index] = 'hard' })
  return tiers
}

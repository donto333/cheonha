// 진영 균형 배정(2026.10.22)
// - 시즌이 바뀌면 위 · 촉 · 오 유저를 연맹 단위(연맹원은 함께) · 연맹 미소속 유저 단위로 무작위 순서로 섞어 세 진영에 다시 나눈다.
//   각 진영의 인원 · 지난 시즌 접속 일수 · 전투력 · 금화 사용량 합이 고르게 되도록, 큰 묶음부터 가장 가벼운 진영에 넣는다.
// - 재야는 그대로 둔다(재야 유저 · 재야 연맹은 섞지 않는다).
// - 시즌 중 새로 들어온 유저(또는 재야에서 삼국으로 오는 유저)는 지금 가장 약한 진영에 넣는다.

export const REALM_FACTIONS = ['촉한', '위나라', '오나라']
export const WANDERER_FACTION = '재야'
/** 기준별 무게: 인원 · 접속 일수 · 전투력 · 금화 사용량 */
export const BALANCE_WEIGHTS = { members: 1, days: 1, power: 1, gold: 1 }
const METRICS = ['members', 'days', 'power', 'gold']

const num = value => Math.max(0, Number(value) || 0)

/** 묶음(연맹 또는 혼자인 유저)의 기준 값 합 */
export function unitStats(users) {
  return users.reduce((sum, user) => ({ members: sum.members + 1, days: sum.days + num(user.days), power: sum.power + num(user.power), gold: sum.gold + num(user.gold) }), { members: 0, days: 0, power: 0, gold: 0 })
}

function totalsOf(units) {
  const totals = { members: 0, days: 0, power: 0, gold: 0 }
  for (const unit of units) for (const key of METRICS) totals[key] += num(unit[key])
  for (const key of METRICS) totals[key] = Math.max(1, totals[key])
  return totals
}

/** 진영 하나가 맡은 몫(기준마다 전체 대비 비율에 무게를 곱한 합) */
function share(load, totals) {
  return METRICS.reduce((sum, key) => sum + BALANCE_WEIGHTS[key] * load[key] / totals[key], 0)
}

/**
 * 묶음들을 세 진영에 나눈다. units: [{ id, members, days, power, gold }] → Map(id → 진영)
 * 무작위로 섞은 뒤 무거운 묶음부터, 넣었을 때 진영 사이 차이(기준마다 가장 많은 진영 − 가장 적은 진영)가 가장 작아지는 진영에 넣는다.
 */
export function balanceFactions(units, { rng = Math.random, factions = REALM_FACTIONS } = {}) {
  const totals = totalsOf(units)
  const weight = unit => share(unit, totals)
  // 무작위로 섞고(같은 무게끼리 순서가 매번 달라지게), 조금씩 흔든 무게 순으로 줄 세운다
  const order = units.map(unit => ({ unit, key: weight(unit) * (1 + (rng() - 0.5) * 0.1) }))
  for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  order.sort((a, b) => b.key - a.key)
  const loads = factions.map(() => ({ members: 0, days: 0, power: 0, gold: 0 }))
  const result = new Map()
  for (const { unit } of order) {
    let best = [], bestCost = Infinity
    factions.forEach((_, index) => {
      const next = loads.map((load, k) => (k === index ? Object.fromEntries(METRICS.map(key => [key, load[key] + num(unit[key])])) : load))
      // 기준마다 진영 사이 차이(전체 대비 비율)의 합 + 이 진영의 몫(작을수록 먼저)
      const cost = METRICS.reduce((sum, key) => {
        const values = next.map(load => load[key] / totals[key])
        return sum + BALANCE_WEIGHTS[key] * (Math.max(...values) - Math.min(...values))
      }, 0) + share(next[index], totals) * 1e-6
      if (cost < bestCost - 1e-9) { bestCost = cost; best = [index] } else if (Math.abs(cost - bestCost) <= 1e-9) best.push(index)
    })
    const pick = best[Math.floor(rng() * best.length)]
    for (const key of METRICS) loads[pick][key] += num(unit[key])
    result.set(unit.id, factions[pick])
  }
  return result
}

/** 지금 가장 약한 진영: rows [{ faction, days, power, gold }](유저 한 명씩) → 진영 이름(같으면 무작위) */
export function weakestFaction(rows, { rng = Math.random, factions = REALM_FACTIONS } = {}) {
  const loads = factions.map(faction => unitStats(rows.filter(row => row.faction === faction)))
  const totals = totalsOf(loads)
  const shares = loads.map(load => share(load, totals))
  const min = Math.min(...shares)
  const candidates = factions.filter((_, index) => shares[index] - min <= 1e-9)
  return candidates[Math.floor(rng() * candidates.length)]
}

/** 진영별 합계(확인 · 기록용) */
export function factionTotals(assignments, units, factions = REALM_FACTIONS) {
  return Object.fromEntries(factions.map(faction => [faction, units.filter(unit => assignments.get(unit.id) === faction).reduce((sum, unit) => ({ members: sum.members + num(unit.members), days: sum.days + num(unit.days), power: sum.power + num(unit.power), gold: sum.gold + num(unit.gold) }), { members: 0, days: 0, power: 0, gold: 0 })]))
}

/** 이 달(한국 시간) 날짜 키 */
export function kstDay(now = Date.now()) { return new Date(now + 9 * 3600000).toISOString().slice(0, 10) }

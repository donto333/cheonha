// 천명(5등급) 무장마다, 다섯 덱 유형(연계 · 버티기 · 속공 · 디버프 · 유틸)별로 승률이 가장 높은 조합을 찾아
// src/game/recommended-decks.json에 적는다. 추천 덱(formation-advice.ts recommendDecks)이 이 표를 먼저 쓴다.
//
// 방법: 유형 점수 상위 조합 중 그 유형으로 판정되는 후보(K개)를 골라, 기준 상대 덱(GAUNTLET)과
// 유저 대련 규칙 · 사람 대 사람(자리 바꿔 평균) · Lv40 3성 · 장비 없음으로 싸워 평균 승률을 잰다.
// 1차(적은 판수)로 거른 뒤 상위 후보만 2차(많은 판수)로 다시 재서 고른다.
//
// 실행: esbuild로 묶어 node로 돌린다(약 20~40분)
//   npx esbuild scripts/balance/recommend-decks.ts --bundle --platform=node --format=esm --outfile=/tmp/rd.mjs && node /tmp/rd.mjs [part] [parts]
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { runBatch, defaultConfig, emptyGear, type SlotConfig } from '../../src/balance/sim'
import { ARCHETYPES, deckStyle, rankTrios, type Archetype } from '../../src/game/formation-advice'
import { allGenerals } from '../../src/game/strategy'

const LEVEL = 40, STARS = 3
const K = Number(process.env.K ?? 8), TOP = Number(process.env.TOP ?? 3)
const RUNS1 = Number(process.env.RUNS1 ?? 8), RUNS2 = Number(process.env.RUNS2 ?? 40)
const OUT = process.env.OUT ?? 'src/game/recommended-decks.json'
/** 기준 상대: 유형이 고루 섞인 대표 덱(인연 덱 · 진영 덱) */
export const GAUNTLET: string[][] = [
  ['liu-bei', 'guan-yu', 'zhang-fei'],
  ['cao-cao', 'zhang-liao', 'xiahou-dun'],
  ['sun-ce', 'zhou-yu', 'lu-xun'],
  ['lu-bu', 'diao-chan', 'chen-gong'],
  ['zhang-fei', 'ma-chao', 'huang-zhong'],
  ['da-qiao', 'xiao-qiao', 'sun-ce'],
  ['zhang-jiao', 'zhang-bo', 'zhang-liang'],
  ['zhuge-liang', 'zhao-yun', 'pang-tong'],
  ['simayi', 'xu-chu', 'dian-wei'],
  ['yuan-shao', 'yan-liang', 'wen-chou'],
]
const slot = (id: string): SlotConfig => ({ id, level: LEVEL, stars: STARS, skill: true, gear: emptyGear() })
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
async function winRate(ids: string[], runs: number, seed: number): Promise<number> {
  let total = 0
  for (let k = 0; k < GAUNTLET.length; k += 1) {
    const enemy = GAUNTLET[k]
    if (enemy.slice().sort().join() === ids.slice().sort().join()) { total += 0.5; continue }
    const r = await runBatch({ ...defaultConfig(), ally: ids.map(slot), enemy: enemy.map(slot), settings: { mode: 'duel', moraleBonus: 0, accuracy: 0.7, runs, match: 'pvp' } }, undefined, { rng: seeded(seed + k * 101), chunk: 100000 })
    total += r.winRate
  }
  return total / GAUNTLET.length
}

const part = Number(process.argv[2] ?? 0), parts = Number(process.argv[3] ?? 1)
const legends = allGenerals().filter(general => general.grade === 5).map(general => general.id).sort()
// ONLY=id1,id2 이면 그 무장만 다시 계산해 기존 표에 덮어쓴다
const only = (process.env.ONLY ?? '').split(',').filter(Boolean)
const mine = (only.length ? legends.filter(id => only.includes(id)) : legends).filter((_, index) => index % parts === part)
const table: Record<string, Partial<Record<Archetype, { ids: string[]; winRate: number }>>> = existsSync(OUT) && (parts > 1 || only.length) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const started = Date.now()
for (const id of mine) {
  const used = new Set<string>()
  const row: Partial<Record<Archetype, { ids: string[]; winRate: number }>> = {}
  for (const archetype of ARCHETYPES) {
    const ranked = rankTrios(id, archetype, 300)
    const key = (ids: string[]) => ids.slice().sort().join()
    let candidates = ranked.filter(entry => entry.style === archetype && !used.has(key(entry.ids))).slice(0, K)
    if (candidates.length < 2) candidates = [...candidates, ...ranked.filter(entry => !used.has(key(entry.ids)) && !candidates.includes(entry)).slice(0, 4 - candidates.length)]
    const first = []
    for (const entry of candidates) first.push({ ids: entry.ids, rate: await winRate(entry.ids, RUNS1, 7) })
    first.sort((a, b) => b.rate - a.rate)
    const second = []
    for (const entry of first.slice(0, TOP)) second.push({ ids: entry.ids, rate: await winRate(entry.ids, RUNS2, 31) })
    second.sort((a, b) => b.rate - a.rate)
    const best = second[0]
    if (!best) continue
    used.add(key(best.ids))
    row[archetype] = { ids: best.ids, winRate: Math.round(best.rate * 1000) / 1000 }
    console.log(`${id} ${archetype}: ${best.ids.join(',')} ${(best.rate * 100).toFixed(1)}% (style ${deckStyle(best.ids)}) · ${Math.round((Date.now() - started) / 1000)}s`)
  }
  table[id] = row
  writeFileSync(parts > 1 ? `${OUT}.part${part}` : OUT, JSON.stringify(parts > 1 ? Object.fromEntries(mine.filter(m => table[m]).map(m => [m, table[m]])) : table, null, 1) + '\n')
}

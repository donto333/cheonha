// 구운 부품(JSON)의 삼각형을 meshoptimizer로 줄인다(꼭짓점은 그대로, 인덱스만). 사용: simplify.mjs 입력.json 출력.json 비율 [오차]
import { readFileSync, writeFileSync } from 'fs'
import { MeshoptSimplifier } from '../three/examples/jsm/libs/meshopt_simplifier.module.js'
const [inp, out, ratioArg, errArg] = process.argv.slice(2)
const ratio = Number(ratioArg ?? 0.5), err = Number(errArg ?? 0.008)
await MeshoptSimplifier.ready
const data = JSON.parse(readFileSync(inp, 'utf8'))
const dec = (s, T) => { const b = Buffer.from(s, 'base64'); return new T(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) }
let before = 0, after = 0
// 얼굴 · 머리 부품(머리 · 목 뼈 가중치가 큰 부품)은 거의 줄이지 않는다(코 · 눈가에 구멍이 나 뒤가 비친다)
const BONES = JSON.parse(readFileSync(new URL('./cavalry-bones.json', import.meta.url), 'utf8'))
const HEAD = new Set(BONES.map((n, i) => ['Head', 'HeadTop_End', 'Neck'].includes(n) ? i : -1).filter(i => i >= 0))
for (const p of data.parts) {
  const P = dec(p.P, Float32Array), I = dec(p.I, Uint32Array)
  const Jp = dec(p.J, Uint16Array), Wp = dec(p.W, Float32Array)
  let hw = 0; for (let k = 0; k < Jp.length; k++) if (HEAD.has(Jp[k])) hw += Wp[k]
  const head = hw / (Jp.length / 4) > 0.5
  const target = Math.max(3, Math.floor(I.length / 3 * (head ? Math.max(ratio, 0.9) : ratio)) * 3)
  const [J] = MeshoptSimplifier.simplify(I, P, 3, target, err, [])
  before += I.length / 3; after += J.length / 3
  p.I = Buffer.from(new Uint32Array(J).buffer).toString('base64')
}
writeFileSync(out, JSON.stringify(data))
console.log(inp.split('/').pop(), before, '->', after, 'tris')

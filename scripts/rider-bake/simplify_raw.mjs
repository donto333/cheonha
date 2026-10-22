import { readFileSync, writeFileSync } from 'fs'
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js'
const [dir, count, ratioArg] = process.argv.slice(2); const ratio = Number(ratioArg)
await MeshoptSimplifier.ready
for (let k = 0; k < Number(count); k++) {
  const rd = f => { const b = readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }
  const P = new Float32Array(rd(`${dir}/${k}.p`)), I = new Uint32Array(rd(`${dir}/${k}.i`))
  const target = Math.min(I.length, Math.max(3, Math.floor(I.length / 3 * ratio) * 3))
  const [out] = MeshoptSimplifier.simplify(I, P, 3, target, 0.01, [])
  writeFileSync(`${dir}/${k}.o`, Buffer.from(new Uint32Array(out).buffer))
}

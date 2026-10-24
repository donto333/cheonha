// 전투 장면 그래픽: 배경 그림 · 빛 · 불티, 무장·병사 모델.
// 외부 3D 파일 없이 도형과 직접 그린 질감으로 만든다. 전투 규칙(battle-core)과는 무관하다.
import * as THREE from 'three'
import { markShared } from './gpu-shared'
import { easeIn2, easeInOut, track } from './motion-math'
import { strikeInfluences } from './battle-rig'
import type { General } from './strategy'
import { loadModel } from './battle-models'

export type Team = 'player' | 'enemy'
export type SceneQuality = 'low' | 'high'

/** 휴대폰·저사양에서는 그림자 해상도·풀·대군 수를 줄인다. */
export function detectSceneQuality(): SceneQuality {
  // 직접 고르기: 주소에 ?quality=low|high, 또는 localStorage 'cheonharo.quality'
  try {
    const forced = new URLSearchParams(location.search).get('quality') ?? localStorage.getItem('cheonharo.quality')
    if (forced === 'low' || forced === 'high') return forced
  } catch { /* 저장소를 못 쓰면 자동 */ }
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4
  return coarse || cores <= 4 ? 'low' : 'high'
}

export const TEAM_COLORS: Record<Team, { armor: number; cloth: number; trim: number; banner: number; dark: number; leather: number }> = {
  player: { armor: 0x4a5052, cloth: 0x24584c, trim: 0xc9a457, banner: 0x1f6e5c, dark: 0x262422, leather: 0x4e3826 },
  enemy: { armor: 0x4c4644, cloth: 0x6e1f18, trim: 0xb8924a, banner: 0x9a2a1e, dark: 0x241c1a, leather: 0x4a3222 },
}

// ── 작은 도구 ────────────────────────────────────────────────
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
function noise2(x: number, z: number): number {
  return Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * 0.5 + Math.sin(z * 0.13 + x * 0.05) * 0.35 + Math.sin((x + z) * 0.31) * 0.15
}
/** 전장 양옆은 언덕, 앞뒤(카메라 쪽·성채 쪽)는 평평하게 */
function terrainLift(x: number, z: number): number {
  return Math.max(0, (Math.abs(x) - 20) / 9) + Math.max(0, (-z - 88) / 18)
}
export function terrainHeight(x: number, z: number): number {
  const lift = terrainLift(x, z)
  return noise2(x, z) * Math.min(2.2, lift * 1.4) + lift * lift * 0.6 - 0.02
}
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  return texture
}
let softSpriteCache: THREE.CanvasTexture | null = null
function softSprite(): THREE.CanvasTexture {
  if (softSpriteCache) return softSpriteCache
  softSpriteCache = canvasTexture(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
  })
  softSpriteCache.wrapS = softSpriteCache.wrapT = THREE.ClampToEdgeWrapping
  markShared(softSpriteCache)
  return softSpriteCache
}
let lamellarCache: THREE.CanvasTexture | null = null
/** 찰갑(작은 쇠비늘을 엮은 갑옷) 무늬 — 색은 재질 color로 물들인다. */
function lamellarTexture(): THREE.CanvasTexture {
  if (lamellarCache) return lamellarCache
  lamellarCache = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#bdbdbd'; ctx.fillRect(0, 0, s, s)
    const w = 8, h = 12
    for (let row = 0; row < s / h; row += 1) {
      for (let col = 0; col < s / w + 1; col += 1) {
        const x = col * w + (row % 2 ? w / 2 : 0), y = row * h
        const g = ctx.createLinearGradient(x, y, x, y + h)
        g.addColorStop(0, '#f2f2f2'); g.addColorStop(0.7, '#a8a8a8'); g.addColorStop(1, '#5a5a5a')
        ctx.fillStyle = g; ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1)
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x + w / 2 - 0.5, y + 2, 1, 1); ctx.fillRect(x + w / 2 - 0.5, y + h - 4, 1, 1)
      }
    }
  }, 1)
  markShared(lamellarCache)
  return lamellarCache
}

/** 여러 도형을 정점 색을 가진 한 덩어리로 합친다(병사 수백 명을 한 번에 그리기 위해). */
function mergeColored(parts: Array<{ geometry: THREE.BufferGeometry; color: number; matrix: THREE.Matrix4 }>): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = []
  const color = new THREE.Color()
  const normalMatrix = new THREE.Matrix3()
  for (const part of parts) {
    const g = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone()
    g.applyMatrix4(part.matrix)
    normalMatrix.getNormalMatrix(part.matrix)
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal')
    color.setHex(part.color)
    for (let i = 0; i < pos.count; i += 1) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i))
      colors.push(color.r, color.g, color.b)
    }
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  merged.computeBoundingSphere()
  return merged
}
const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz))

// ── 병사 한 명의 모양(합친 도형) ─────────────────────────────
const soldierCache = new Map<string, THREE.BufferGeometry>()
export function soldierGeometry(kind: 'infantry' | 'archer' | 'cavalry' | 'pike', team: Team): THREE.BufferGeometry {
  const key = `${kind}-${team}`
  const cached = soldierCache.get(key)
  if (cached) return cached
  const c = TEAM_COLORS[team]
  const skin = 0xa87a5c, wood = 0x4a3020, metal = 0xb9b6ae, black = 0x1b1410
  const parts: Array<{ geometry: THREE.BufferGeometry; color: number; matrix: THREE.Matrix4 }> = []
  const add = (geometry: THREE.BufferGeometry, color: number, matrix: THREE.Matrix4) => parts.push({ geometry, color, matrix })
  const riderY = kind === 'cavalry' ? 0.62 : 0
  if (kind === 'cavalry') {
    const horse = team === 'player' ? 0x4a3526 : 0x2b211b
    add(new THREE.CapsuleGeometry(0.17, 0.52, 3, 8), horse, M(0, 0.6, 0, Math.PI / 2))
    add(new THREE.CapsuleGeometry(0.08, 0.3, 2, 6), horse, M(0, 0.82, -0.36, -0.75))
    add(new THREE.BoxGeometry(0.1, 0.12, 0.24), horse, M(0, 0.98, -0.52, -0.3))
    for (const [x, z] of [[-0.1, -0.24], [0.1, -0.24], [-0.1, 0.24], [0.1, 0.24]]) add(new THREE.CylinderGeometry(0.035, 0.03, 0.5, 5), horse, M(x, 0.27, z))
    add(new THREE.BoxGeometry(0.4, 0.06, 0.5), c.cloth, M(0, 0.78, 0.02))
    add(new THREE.ConeGeometry(0.05, 0.3, 4), black, M(0, 0.7, 0.42, 0.9))
  } else {
    add(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 5), c.dark, M(-0.07, 0.21, 0))
    add(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 5), c.dark, M(0.07, 0.21, 0))
    add(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 6), c.leather, M(-0.07, 0.05, -0.02))
    add(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 6), c.leather, M(0.07, 0.05, -0.02))
  }
  add(new THREE.CylinderGeometry(0.17, 0.21, 0.24, 8), c.cloth, M(0, riderY + 0.48, 0))
  add(new THREE.CylinderGeometry(0.15, 0.17, 0.32, 8), c.armor, M(0, riderY + 0.72, 0))
  add(new THREE.BoxGeometry(0.2, 0.3, 0.02), c.cloth, M(0, riderY + 0.62, -0.165))
  add(new THREE.BoxGeometry(0.42, 0.08, 0.2), c.armor, M(0, riderY + 0.87, 0))
  add(new THREE.CylinderGeometry(0.06, 0.07, 0.07, 6), c.leather, M(0, riderY + 0.92, 0))
  add(new THREE.SphereGeometry(0.085, 8, 6), skin, M(0, riderY + 0.99, -0.02))
  add(new THREE.SphereGeometry(0.11, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), c.armor, M(0, riderY + 1.01, 0.01))
  add(new THREE.CylinderGeometry(0.125, 0.13, 0.03, 9), c.dark, M(0, riderY + 0.98, 0.01))
  add(new THREE.ConeGeometry(0.035, 0.12, 5), c.cloth, M(0, riderY + 1.14, 0.03, 0.4))
  if (kind === 'archer') {
    add(new THREE.TorusGeometry(0.28, 0.014, 4, 10, Math.PI * 1.2), wood, M(-0.22, riderY + 0.8, -0.05, 0, Math.PI / 2, -Math.PI * 0.6))
    add(new THREE.CylinderGeometry(0.045, 0.04, 0.34, 6), wood, M(0.1, riderY + 0.76, 0.14, 0.25))
  } else if (kind === 'pike' || kind === 'cavalry') {
    add(new THREE.CylinderGeometry(0.012, 0.012, 1.9, 4), wood, M(0.2, riderY + 0.95, -0.05, -0.12))
    add(new THREE.ConeGeometry(0.03, 0.16, 4), metal, M(0.2 + Math.sin(0.12) * 0, riderY + 1.92, -0.17, -0.12))
  } else {
    add(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 4), wood, M(0.2, riderY + 0.82, -0.04, -0.1))
    add(new THREE.ConeGeometry(0.03, 0.14, 4), metal, M(0.2, riderY + 1.58, -0.11, -0.1))
    add(new THREE.BoxGeometry(0.05, 0.42, 0.3), c.leather, M(-0.2, riderY + 0.68, -0.02))
    add(new THREE.BoxGeometry(0.055, 0.12, 0.31), c.cloth, M(-0.2, riderY + 0.7, -0.02))
  }
  const geometry = mergeColored(parts)
  soldierCache.set(key, geometry)
  markShared(geometry)
  return geometry
}

// ── 부대(무장 주변 병사 대열): 인스턴스 한 번에 그린다 ─────────────
export interface Squad {
  group: THREE.Group
  /** strike: 부대 공격이 시작된 뒤 흐른 시간(초, 공격 중이 아니면 음수) */
  /** moving: 걸음 가중치(0~1, true/false도 받는다) */
  update: (t: number, moving: boolean | number, attack: number, hit: number, alive: number, strike?: number) => void
  /** 실사 모델(병종별 공격 자세를 구운 도형)로 교체: 병사가 커지므로 간격을 넓히고 수를 줄인다 */
  upgrade: (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], strikeDuration?: number, frames?: number, times?: number[], walkFrames?: number, walkPeriod?: number) => void
}
export function createSquad(role: General['role'], team: Team, quality: SceneQuality): Squad {
  const kind = role === '기병' ? 'cavalry' : role === '궁병' ? 'archer' : role === '보병' ? 'pike' : 'infantry'
  const r = rng(role.length * 97 + (team === 'enemy' ? 13 : 7))
  const layout = (cols: number, rows: number, gapX: number, gapZ: number, aisle: number, front: number) => {
    const list: Array<{ x: number; z: number; phase: number; jitter: number }> = []
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        let x = (col - (cols - 1) / 2) * gapX
        x += Math.sign(x || (col % 2 ? 1 : -1)) * aisle
        list.push({ x: x + (r() - 0.5) * gapX * 0.2, z: front + row * gapZ + (r() - 0.5) * gapZ * 0.15, phase: r() * Math.PI * 2, jitter: r() })
      }
    }
    return list
  }
  const cols = kind === 'cavalry' ? 5 : 7
  const rows = quality === 'low' ? 3 : kind === 'cavalry' ? 3 : 4
  let base = layout(cols, rows, kind === 'cavalry' ? 0.62 : 0.46, (kind === 'cavalry' ? 0.62 : 0.46) * 1.05, 0.55, 0.5)
  let count = base.length
  let yaw = 0
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.18 })
  let mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> = new THREE.InstancedMesh(soldierGeometry(kind, team), material, count)
  mesh.castShadow = quality === 'high'
  mesh.frustumCulled = false
  const tintAll = (target: THREE.InstancedMesh, realistic: boolean) => {
    const tint = new THREE.Color()
    for (let i = 0; i < base.length; i += 1) {
      const v = (realistic ? 0.92 : 0.82) + base[i].jitter * (realistic ? 0.14 : 0.3)
      // 실사 모델은 양 진영이 같은 옷이라, 적은 붉은 기운으로 물들여 구분한다
      if (realistic && team === 'enemy') tint.setRGB(v * 1.08, v * 0.72, v * 0.66)
      else if (realistic) tint.setRGB(v * 0.84, v * 0.96, v * 1.02)
      else tint.setRGB(v, v * (0.97 + r() * 0.05), v * (0.94 + r() * 0.08))
      target.setColorAt(i, tint)
    }
    if (target.instanceColor) target.instanceColor.needsUpdate = true
  }
  tintAll(mesh, false)
  const group = new THREE.Group()
  group.add(mesh)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), e = new THREE.Euler()
  let bobScale = 1
  // 병종별 공격 자세(모프): 병사마다 조금씩 늦게 시작해 한 몸처럼 보이지 않게 한다
  let strikeDuration = 0
  let morphHolder: { morphTargetInfluences: number[] } | null = null
  let strikeTimes: number[] | null = null
  // 뼈대 모델을 구운 걷기 자세(공격 자세 뒤에 이어 붙어 있다)
  let walkFrames = 0
  let walkPeriod = 1
  let strikeBuf: number[] = []
  // 병력이 줄면 그만큼의 병사가 뒤로 쓰러지며 사라진다(쓰러지기 시작한 시각, 없으면 -1)
  let prevVisible = -1
  let fallAt: number[] = []
  const FALL_TIME = 0.9
  // 걸음 시계: 걷는 빠르기가 바뀌어도 걸음 위상이 튀지 않게 시간을 쌓아 간다
  // (예전에는 전체 경과 시간 × 빠르기로 위상을 구해, 빠르기가 조금만 흔들려도 다리가 앞뒤로 튀며 부르르 떨었다)
  let walkClock = 0
  let lastT = -1
  const update = (t: number, movingIn: boolean | number, attack: number, hit: number, alive: number, strike = -1) => {
    const g = Math.min(1, Math.max(0, Number(movingIn)))
    const stepDt = lastT < 0 ? 0 : Math.min(0.1, Math.max(0, t - lastT))
    lastT = t
    walkClock += stepDt * (0.8 + 0.4 * g)
    const visible = Math.max(0, Math.min(count, Math.ceil(count * alive)))
    if (fallAt.length !== count) { fallAt = new Array(count).fill(-1); prevVisible = visible }
    if (visible < prevVisible) for (let i = visible; i < prevVisible; i += 1) fallAt[i] = t
    if (visible > prevVisible) for (let i = prevVisible; i < visible; i += 1) fallAt[i] = -1
    prevVisible = visible
    let drawn = visible
    for (let i = visible; i < count; i += 1) if (fallAt[i] >= 0 && t - fallAt[i] < FALL_TIME) drawn = i + 1
    mesh.count = drawn
    if (morphHolder && strikeDuration > 0) {
      const influences = morphHolder.morphTargetInfluences
      const strikeCount = influences.length - walkFrames
      if (strikeBuf.length !== strikeCount) strikeBuf = new Array(strikeCount).fill(0)
      for (let i = 0; i < count; i += 1) {
        influences.fill(0)
        const p = strike < 0 ? -1 : (strike - base[i].jitter * 0.22) / strikeDuration
        strikeInfluences(p, strikeBuf, strikeTimes ?? undefined)
        let striking = 0
        for (let k = 0; k < strikeCount; k += 1) { influences[k] = strikeBuf[k]; striking += strikeBuf[k] }
        // 걷기: 병사마다 다른 걸음 위상으로 걷기 자세 두 장을 섞는다(공격 중에는 공격 자세가 우선)
        const wg = walkFrames ? g * Math.max(0, 1 - striking) : 0
        if (wg > 0.001) {
          const phase = (walkClock / walkPeriod + base[i].phase / (Math.PI * 2)) % 1
          const f = phase * walkFrames, i0 = Math.floor(f) % walkFrames, i1 = (i0 + 1) % walkFrames, a = f - Math.floor(f)
          influences[strikeCount + i0] += wg * (1 - a)
          influences[strikeCount + i1] += wg * a
        }
        mesh.setMorphAt(i, morphHolder as unknown as THREE.Mesh)
      }
      if (mesh.morphTexture) mesh.morphTexture.needsUpdate = true
    }
    // 병사 돌진: 살짝 물러섰다가(예비 동작) → 빨라지며 밀고 나가 → 천천히 돌아온다
    const ak = Math.min(1, Math.max(0, attack))
    const lunge = attack <= 0 ? 0 : track([{ t: 0, v: 0 }, { t: 0.2, v: -0.25 }, { t: 0.45, v: 1, e: easeIn2 }, { t: 1, v: 0, e: easeInOut }], ak)
    for (let i = 0; i < drawn; i += 1) {
      const b = base[i]
      // 맞으면 병사마다 조금씩 다르게 뒤로 밀리며 몸이 젖혀진다(기병은 말이 앞발을 드는 듯 크게)
      const stagger = hit * (0.6 + b.jitter * 0.8)
      // 걷기와 서 있기를 걸음 가중치로 섞는다(멈출 때 병사들이 뚝 서지 않게)
      const bob = (Math.abs(Math.sin(t * (kind === 'cavalry' ? 9 : 7) + b.phase)) * (walkFrames ? 0.015 : 0.07) * g + Math.sin(t * 1.4 + b.phase) * 0.012 * (1 - g)) * bobScale
      p.set(b.x + Math.sin(t * 0.7 + b.phase) * 0.02, bob, b.z - lunge * (kind === 'archer' ? 0.05 : 0.35) * (0.6 + b.jitter * 0.4) * bobScale + stagger * 0.2)
      e.set(-0.06 * g + stagger * (kind === 'cavalry' ? 0.3 : 0.22), yaw + Math.sin(t * 0.5 + b.phase) * 0.06 + stagger * (b.jitter - 0.5) * 0.4, Math.sin(t * 7 + b.phase) * 0.04 * g + Math.sin(t * 1.4 + b.phase) * 0.012 * (1 - g))
      if (i >= visible) {
        // 쓰러지는 병사: 뒤로 넘어가며 땅으로 가라앉는다
        const f = Math.min(1, (t - fallAt[i]) / FALL_TIME)
        const ease = f * f * (3 - 2 * f)
        e.x = ease * (kind === 'cavalry' ? 0.9 : 1.45)
        e.z += (b.jitter - 0.5) * ease * 0.8
        p.y = -ease * 0.35 * bobScale
        p.z += ease * 0.3
      }
      q.setFromEuler(e)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  const upgrade = (geometry: THREE.BufferGeometry, realMaterial: THREE.Material | THREE.Material[], duration = 0, frames = 0, times?: number[], walk = 0, period = 1) => {
    strikeTimes = times ?? null
    walkFrames = walk
    walkPeriod = period
    const cav = kind === 'cavalry'
    // 무장 뒤에 대열을 지어 선다(앞줄은 무장 바로 뒤, 가운데 열도 무장 뒤를 받친다)
    const [c2, r2] = quality === 'low' ? (cav ? [3, 1] : [4, 2]) : (cav ? [3, 2] : [5, 3])
    base = cav ? layout(c2, r2, 1.3, 2.6, 0.25, 2.3) : layout(c2, r2, 0.8, 0.95, 0.2, 1.45)
    count = base.length
    yaw = Math.PI // 실사 모델은 +Z를 보도록 맞춰 두었다 → 부대 앞(-Z)으로 돌린다
    bobScale = 1.6
    const next = new THREE.InstancedMesh(geometry, realMaterial, count)
    strikeDuration = duration
    morphHolder = frames > 1 && geometry.morphAttributes.position?.length ? { morphTargetInfluences: new Array(frames - 1 + walk).fill(0) } : null
    next.castShadow = quality === 'high'
    next.frustumCulled = false
    tintAll(next, true)
    group.remove(mesh)
    mesh.dispose()
    mesh = next
    group.add(mesh)
    update(0, false, 0, 0, 1)
  }
  update(0, false, 0, 0, 1)
  return { group, update, upgrade }
}

// ── 무장 모델 ────────────────────────────────────────────────
interface Signature { weapon: 'glaive' | 'spear' | 'halberd' | 'snake' | 'twin' | 'sword' | 'fan' | 'bow' | 'staff' | 'mace'; beard?: 'long' | 'wild' | 'short'; crest?: 'plume' | 'feathers' | 'crown' | 'hat' | 'band'; robe?: boolean; cape: number; armor?: number }
const SIGNATURES: Record<string, Partial<Signature>> = {
  'guan-yu': { weapon: 'glaive', beard: 'long', crest: 'band', cape: 0x1f6b3a, armor: 0x2f6b48 },
  'zhang-fei': { weapon: 'snake', beard: 'wild', crest: 'band', cape: 0x2a2a2a, armor: 0x3a3a3a },
  'liu-bei': { weapon: 'twin', beard: 'short', crest: 'crown', cape: 0xb88a2a, armor: 0x7a6a3a },
  'zhao-yun': { weapon: 'spear', crest: 'plume', cape: 0xcfc8b8, armor: 0x9aa4ac },
  'lu-bu': { weapon: 'halberd', crest: 'feathers', cape: 0x8a1d1d, armor: 0x4a2a2a },
  'zhuge-liang': { weapon: 'fan', robe: true, crest: 'hat', cape: 0xb8bcae },
  'pang-tong': { weapon: 'fan', robe: true, crest: 'hat', cape: 0x6a6a5a },
  'sima-yi': { weapon: 'fan', robe: true, crest: 'hat', cape: 0x2b2440 },
  'simayi': { weapon: 'fan', robe: true, crest: 'hat', cape: 0x2b2440 },
  'zhou-yu': { weapon: 'sword', crest: 'crown', cape: 0x9b2a2a },
  'cao-cao': { weapon: 'sword', beard: 'short', crest: 'crown', cape: 0x2a2f55, armor: 0x3a3f5a },
  'sun-quan': { weapon: 'sword', crest: 'crown', cape: 0xa82a2a },
  'sun-ce': { weapon: 'twin', crest: 'band', cape: 0xb03a2a },
  'huang-zhong': { weapon: 'bow', beard: 'long', cape: 0x8a6a2a },
  'ma-chao': { weapon: 'spear', crest: 'plume', cape: 0xd8d8e8, armor: 0xb8c0d0 },
  'dian-wei': { weapon: 'mace', beard: 'wild', cape: 0x3a2a1a },
  'xiahou-dun': { weapon: 'sword', beard: 'short', crest: 'band', cape: 0x2a3050 },
  'zhang-jiao': { weapon: 'staff', robe: true, beard: 'long', crest: 'band', cape: 0xc9a020 },
  'diao-chan': { weapon: 'fan', robe: true, crest: 'crown', cape: 0xc23a5a },
}
function signatureFor(general: General): Signature {
  const preset = SIGNATURES[general.id] ?? {}
  const role = general.role
  const weapon = preset.weapon ?? (role === '책사' ? 'fan' : role === '궁병' ? 'bow' : role === '기병' ? 'spear' : 'sword')
  return { weapon, beard: preset.beard, crest: preset.crest ?? (role === '책사' ? 'hat' : 'plume'), robe: preset.robe ?? role === '책사', cape: preset.cape ?? new THREE.Color(general.accent).multiplyScalar(0.7).getHex(), armor: preset.armor }
}

export interface GeneralRig {
  root: THREE.Group
  body: THREE.Group
  weaponArm: THREE.Group
  shieldArm: THREE.Group
  cape: THREE.Mesh
  capeBase: Float32Array
  horseLegs: THREE.Object3D[]
  horseHead: THREE.Object3D | null
  mounted: boolean
  materials: THREE.MeshStandardMaterial[]
}

function std(color: number, roughness = 0.6, metalness = 0.2, map?: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive: 0x000000 })
  if (map) material.map = map
  return material
}

export function createGeneralModel(general: General, team: Team): GeneralRig {
  const sig = signatureFor(general)
  const tc = TEAM_COLORS[team]
  const accent = new THREE.Color(general.accent)
  const armorColor = new THREE.Color(sig.armor ?? tc.armor).lerp(new THREE.Color(0x585c60), sig.armor ? 0.35 : 0).lerp(accent, 0.12).getHex()
  const lamellar = lamellarTexture()
  const mats = {
    armor: std(armorColor, 0.45, 0.55, lamellar),
    plate: std(new THREE.Color(armorColor).multiplyScalar(0.75).getHex(), 0.38, 0.65),
    gold: std(0xd9b062, 0.32, 0.85),
    cloth: std(new THREE.Color(sig.cape).lerp(new THREE.Color(TEAM_COLORS[team].cloth), 0.15).getHex(), 0.85, 0.02),
    under: std(new THREE.Color(sig.cape).multiplyScalar(0.55).getHex(), 0.9, 0.02),
    robe: std(sig.cape, 0.8, 0.02),
    skin: std(0xb8866a, 0.72, 0),
    hair: std(0x161210, 0.7, 0.05),
    leather: std(0x3a2416, 0.8, 0.05),
    steel: std(0xd8dde2, 0.22, 0.95),
    wood: std(0x4a2e18, 0.7, 0.05),
    horse: std(general.id === 'lu-bu' ? 0x5a1a12 : general.id === 'zhao-yun' || general.id === 'ma-chao' ? 0xd8d2c4 : 0x3a2a1e, 0.62, 0.05),
    jade: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3 }),
  }
  const root = new THREE.Group()
  root.name = `model-${general.id}`
  const mounted = general.role === '기병'
  const horseLegs: THREE.Object3D[] = []
  let horseHead: THREE.Object3D | null = null
  const body = new THREE.Group()
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const node = new THREE.Mesh(geometry, material)
    node.position.set(x, y, z); node.rotation.set(rx, ry, rz)
    node.castShadow = true
    return node
  }

  // 말
  if (mounted) {
    const horse = new THREE.Group()
    horse.add(mesh(new THREE.CapsuleGeometry(0.36, 1.05, 6, 14), mats.horse, 0, 1.12, 0, Math.PI / 2))
    const neck = new THREE.Group(); neck.position.set(0, 1.35, -0.62)
    neck.add(mesh(new THREE.CapsuleGeometry(0.17, 0.55, 4, 10), mats.horse, 0, 0.25, -0.12, -0.7))
    const head = new THREE.Group(); head.position.set(0, 0.6, -0.42)
    head.add(mesh(new THREE.CapsuleGeometry(0.13, 0.36, 4, 10), mats.horse, 0, 0, -0.12, -1.25))
    head.add(mesh(new THREE.ConeGeometry(0.05, 0.14, 4), mats.horse, -0.07, 0.17, 0.02), mesh(new THREE.ConeGeometry(0.05, 0.14, 4), mats.horse, 0.07, 0.17, 0.02))
    head.add(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.1), mats.gold, 0, 0.06, -0.12))
    neck.add(head)
    neck.add(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.42), mats.hair, 0, 0.36, 0.0, -0.7))
    horseHead = neck
    horse.add(neck)
    for (const [x, z] of [[-0.2, -0.5], [0.2, -0.5], [-0.2, 0.55], [0.2, 0.55]]) {
      const leg = new THREE.Group(); leg.position.set(x, 0.92, z)
      leg.add(mesh(new THREE.CapsuleGeometry(0.075, 0.42, 3, 8), mats.horse, 0, -0.3, 0))
      leg.add(mesh(new THREE.CapsuleGeometry(0.05, 0.36, 3, 6), mats.horse, 0, -0.72, 0))
      leg.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8), mats.hair, 0, -0.92, 0))
      horseLegs.push(leg); horse.add(leg)
    }
    const tail = mesh(new THREE.ConeGeometry(0.1, 0.7, 6), mats.hair, 0, 1.0, 0.95, 2.6)
    horse.add(tail)
    horse.add(mesh(new THREE.BoxGeometry(0.82, 0.08, 0.95), mats.cloth, 0, 1.46, 0.05))
    horse.add(mesh(new THREE.BoxGeometry(0.86, 0.32, 0.04), mats.cloth, 0, 1.32, 0.52), mesh(new THREE.BoxGeometry(0.06, 0.3, 0.9), mats.gold, -0.42, 1.34, 0.05), mesh(new THREE.BoxGeometry(0.06, 0.3, 0.9), mats.gold, 0.42, 1.34, 0.05))
    horse.add(mesh(new THREE.BoxGeometry(0.34, 0.14, 0.42), mats.leather, 0, 1.54, 0.05))
    root.add(horse)
  }

  // 사람
  body.position.y = mounted ? 1.12 : 0
  if (!mounted) {
    body.add(mesh(new THREE.CapsuleGeometry(0.1, 0.5, 3, 8), mats.under, -0.14, 0.42, 0), mesh(new THREE.CapsuleGeometry(0.1, 0.5, 3, 8), mats.under, 0.14, 0.42, 0))
    body.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.26, 8), mats.leather, -0.14, 0.12, -0.02), mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.26, 8), mats.leather, 0.14, 0.12, -0.02))
  } else {
    body.add(mesh(new THREE.CapsuleGeometry(0.1, 0.42, 3, 8), mats.under, -0.3, 0.42, -0.05, 0.6, 0, 0.35), mesh(new THREE.CapsuleGeometry(0.1, 0.42, 3, 8), mats.under, 0.3, 0.42, -0.05, 0.6, 0, -0.35))
  }
  const hipY = mounted ? 0.62 : 0.78
  if (sig.robe) {
    body.add(mesh(new THREE.CylinderGeometry(0.26, 0.48, 0.9, 12, 1, true), mats.robe, 0, hipY - 0.25, 0))
    body.add(mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.6, 12), mats.robe, 0, hipY + 0.42, 0))
    body.add(mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 16), mats.gold, 0, hipY + 0.16, 0, Math.PI / 2))
    body.add(mesh(new THREE.BoxGeometry(0.12, 0.55, 0.02), mats.under, 0, hipY + 0.42, -0.27))
  } else {
    // 갑옷 치마(전후좌우 판)
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2
      body.add(mesh(new THREE.BoxGeometry(0.2, 0.42, 0.04), mats.armor, Math.sin(a) * 0.25, hipY - 0.12, Math.cos(a) * 0.25, 0.18 * Math.cos(a), a, -0.18 * Math.sin(a)))
    }
    body.add(mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.62, 12), mats.armor, 0, hipY + 0.4, 0))
    body.add(mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.plate, 0, hipY + 0.52, -0.16, -Math.PI / 2 + 0.2))
    body.add(mesh(new THREE.TorusGeometry(0.255, 0.04, 6, 18), mats.gold, 0, hipY + 0.12, 0, Math.PI / 2))
    body.add(mesh(new THREE.CircleGeometry(0.09, 16), mats.gold, 0, hipY + 0.14, -0.29))
    // 견갑
    for (const side of [-1, 1]) {
      body.add(mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.plate, side * 0.33, hipY + 0.68, 0, 0, 0, -side * 0.5))
      body.add(mesh(new THREE.TorusGeometry(0.15, 0.02, 4, 14, Math.PI), mats.gold, side * 0.36, hipY + 0.64, 0, 0, Math.PI / 2, -side * 0.5))
    }
  }
  // 망토
  const capeGeo = new THREE.PlaneGeometry(0.72, mounted ? 1.1 : 1.25, 6, 8)
  capeGeo.translate(0, -(mounted ? 0.55 : 0.62), 0)
  const cape = mesh(capeGeo, new THREE.MeshStandardMaterial({ color: sig.cape, roughness: 0.85, side: THREE.DoubleSide }), 0, hipY + 0.72, 0.25, 0.12)
  body.add(cape)
  const capeBase = Float32Array.from(capeGeo.getAttribute('position').array as Float32Array)
  // 머리
  const headY = hipY + 0.95
  body.add(mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), mats.skin, 0, headY - 0.17, 0))
  body.add(mesh(new THREE.SphereGeometry(0.15, 16, 12), mats.skin, 0, headY, 0))
  body.add(mesh(new THREE.SphereGeometry(0.152, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), mats.hair, 0, headY + 0.01, 0.01))
  if (sig.beard === 'long') body.add(mesh(new THREE.ConeGeometry(0.1, 0.55, 8), mats.hair, 0, headY - 0.34, -0.1, Math.PI + 0.12))
  else if (sig.beard === 'wild') body.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), mats.hair, 0, headY - 0.1, -0.06))
  else if (sig.beard === 'short') body.add(mesh(new THREE.ConeGeometry(0.06, 0.16, 6), mats.hair, 0, headY - 0.18, -0.11, Math.PI + 0.25))
  // 투구·관
  if (sig.crest === 'hat') {
    body.add(mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 10), mats.hair, 0, headY + 0.17, 0))
    body.add(mesh(new THREE.BoxGeometry(0.42, 0.02, 0.2), mats.hair, 0, headY + 0.27, 0))
  } else if (sig.crest === 'crown') {
    body.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 8), mats.gold, 0, headY + 0.16, 0))
    body.add(mesh(new THREE.BoxGeometry(0.4, 0.03, 0.18), mats.gold, 0, headY + 0.24, 0))
    body.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.jade, 0, headY + 0.17, -0.12))
  } else if (sig.crest === 'band') {
    body.add(mesh(new THREE.TorusGeometry(0.152, 0.03, 6, 18), mats.cloth, 0, headY + 0.05, 0, Math.PI / 2 - 0.15))
    body.add(mesh(new THREE.BoxGeometry(0.05, 0.3, 0.02), mats.cloth, 0.05, headY - 0.05, 0.16, 0.3, 0, 0.2))
  } else {
    body.add(mesh(new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.plate, 0, headY + 0.03, 0))
    body.add(mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.06, 14, 1, true), mats.gold, 0, headY - 0.02, 0))
    body.add(mesh(new THREE.ConeGeometry(0.03, 0.14, 6), mats.gold, 0, headY + 0.24, 0))
    if (sig.crest === 'feathers') {
      for (const side of [-1, 1]) body.add(mesh(new THREE.ConeGeometry(0.025, 0.9, 5), mats.cloth, side * 0.12, headY + 0.55, 0.1, 0.35, 0, -side * 0.5))
    } else {
      body.add(mesh(new THREE.ConeGeometry(0.07, 0.5, 8), mats.cloth, 0, headY + 0.3, 0.16, 1.9))
    }
  }
  // 팔
  const shoulderY = hipY + 0.62
  const weaponArm = new THREE.Group(); weaponArm.position.set(0.36, shoulderY, 0)
  const shieldArm = new THREE.Group(); shieldArm.position.set(-0.36, shoulderY, 0)
  for (const arm of [weaponArm, shieldArm]) {
    const sleeve = sig.robe ? mats.robe : mats.armor
    arm.add(mesh(new THREE.CapsuleGeometry(0.075, 0.3, 3, 8), sleeve, 0, -0.18, 0))
    arm.add(mesh(new THREE.CapsuleGeometry(0.065, 0.26, 3, 8), sig.robe ? mats.robe : mats.leather, 0, -0.44, -0.08, 0.5))
    arm.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mats.skin, 0, -0.58, -0.18))
  }
  weaponArm.rotation.set(-0.35, 0, -0.18)
  shieldArm.rotation.set(-0.25, 0, 0.18)
  // 무기
  const hand = new THREE.Group(); hand.position.set(0, -0.58, -0.18)
  weaponArm.add(hand)
  const pole = (length: number) => mesh(new THREE.CylinderGeometry(0.025, 0.028, length, 8), mats.wood, 0, 0, 0)
  switch (sig.weapon) {
    case 'glaive': { // 청룡언월도
      const g = new THREE.Group(); g.add(pole(2.3))
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(0.34, 0.25, 0.2, 0.75); shape.quadraticCurveTo(0.06, 0.4, -0.06, 0.05); shape.lineTo(0, 0)
      const blade = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), mats.steel, 0.02, 1.12, -0.01)
      g.add(blade, mesh(new THREE.SphereGeometry(0.06, 8, 6), mats.jade, 0, 1.12, 0), mesh(new THREE.ConeGeometry(0.03, 0.18, 6), mats.gold, 0, -1.2, 0, Math.PI))
      g.rotation.x = -0.25; g.position.y = 0.3; hand.add(g); break
    }
    case 'halberd': { // 방천화극
      const g = new THREE.Group(); g.add(pole(2.4))
      g.add(mesh(new THREE.ConeGeometry(0.05, 0.5, 4), mats.steel, 0, 1.45, 0))
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.absarc(0, 0, 0.26, -Math.PI / 2, Math.PI / 2, false); shape.absarc(0, 0, 0.14, Math.PI / 2, -Math.PI / 2, true)
        g.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), mats.steel, side * 0.04, 1.1, -0.01, 0, side < 0 ? Math.PI : 0, 0))
      }
      g.add(mesh(new THREE.BoxGeometry(0.04, 0.24, 0.02), mats.cloth, 0.08, 0.95, 0))
      g.rotation.x = -0.2; g.position.y = 0.35; hand.add(g); break
    }
    case 'snake': { // 장팔사모
      const g = new THREE.Group(); g.add(pole(2.5))
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, 0.12, 0), new THREE.Vector3(-0.05, 0.26, 0), new THREE.Vector3(0.05, 0.4, 0), new THREE.Vector3(0, 0.55, 0)])
      g.add(mesh(new THREE.TubeGeometry(curve, 20, 0.025, 6, false), mats.steel, 0, 1.25, 0))
      g.add(mesh(new THREE.ConeGeometry(0.035, 0.12, 6), mats.steel, 0, 1.86, 0))
      g.rotation.x = -0.15; g.position.y = 0.3; hand.add(g); break
    }
    case 'spear': {
      const g = new THREE.Group(); g.add(pole(2.4))
      g.add(mesh(new THREE.ConeGeometry(0.045, 0.42, 6), mats.steel, 0, 1.4, 0), mesh(new THREE.ConeGeometry(0.08, 0.18, 8), mats.cloth, 0, 1.12, 0, Math.PI))
      g.rotation.x = -0.25; g.position.y = 0.3; hand.add(g); break
    }
    case 'twin': case 'sword': {
      const sword = (x: number, rz: number) => {
        const g = new THREE.Group()
        g.add(mesh(new THREE.BoxGeometry(0.06, 0.95, 0.015), mats.steel, 0, 0.55, 0), mesh(new THREE.ConeGeometry(0.04, 0.1, 4), mats.steel, 0, 1.07, 0, 0, Math.PI / 4), mesh(new THREE.BoxGeometry(0.22, 0.04, 0.05), mats.gold, 0, 0.07, 0), mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), mats.leather, 0, -0.04, 0))
        g.position.x = x; g.rotation.set(-1.0, 0, rz); return g
      }
      hand.add(sword(0, 0))
      if (sig.weapon === 'twin') { const off = new THREE.Group(); off.position.set(0, -0.58, -0.18); off.add(sword(0, 0)); shieldArm.add(off) }
      break
    }
    case 'mace': {
      for (const arm of [hand]) { arm.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), mats.wood, 0, 0.2, 0, -0.6), mesh(new THREE.DodecahedronGeometry(0.13, 0), mats.steel, 0, 0.5, -0.2)) }
      const off = new THREE.Group(); off.position.set(0, -0.58, -0.18); off.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), mats.wood, 0, 0.2, 0, -0.6), mesh(new THREE.DodecahedronGeometry(0.13, 0), mats.steel, 0, 0.5, -0.2)); shieldArm.add(off)
      break
    }
    case 'bow': {
      const off = new THREE.Group(); off.position.set(0, -0.58, -0.18)
      off.add(mesh(new THREE.TorusGeometry(0.55, 0.022, 6, 24, Math.PI * 1.25), mats.wood, 0, 0, -0.05, 0, Math.PI / 2, -Math.PI * 0.62))
      shieldArm.add(off)
      body.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 8), mats.leather, 0.12, hipY + 0.55, 0.25, 0.35))
      break
    }
    case 'staff': {
      const g = new THREE.Group(); g.add(pole(1.9), mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16), mats.gold, 0, 1.0, 0), mesh(new THREE.IcosahedronGeometry(0.08, 1), mats.jade, 0, 1.0, 0))
      g.rotation.x = -0.2; g.position.y = 0.2; hand.add(g); break
    }
    case 'fan': default: {
      const fan = new THREE.Group()
      for (let i = 0; i < 9; i += 1) fan.add(mesh(new THREE.ConeGeometry(0.035, 0.36, 4), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9 }), Math.sin((i - 4) * 0.13) * 0.18, 0.18 + Math.cos((i - 4) * 0.13) * 0.03, 0, 0, 0, -(i - 4) * 0.13))
      fan.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), mats.gold, 0, -0.04, 0))
      fan.rotation.set(-0.9, 0.3, 0); hand.add(fan)
      shieldArm.rotation.set(-0.6, 0, -0.1)
    }
  }
  body.add(weaponArm, shieldArm)
  root.add(body)
  root.scale.setScalar(mounted ? 1.3 : 1.45)
  const materials: THREE.MeshStandardMaterial[] = []
  root.traverse(node => { const m = (node as THREE.Mesh).material; if (m && !Array.isArray(m) && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial && !materials.includes(m as THREE.MeshStandardMaterial)) materials.push(m as THREE.MeshStandardMaterial) })
  return { root, body, weaponArm, shieldArm, cape, capeBase, horseLegs, horseHead, mounted, materials }
}

/** 무장 움직임: 숨쉬기·말 걸음·무기 휘두르기·망토 펄럭임·피격 번쩍임 */
export function animateGeneral(rig: GeneralRig, t: number, moving: boolean, attack: number, skill: number, hit: number): void {
  const breathe = Math.sin(t * 2.1) * 0.015
  rig.body.position.y = (rig.mounted ? 1.12 : 0) + breathe + (rig.mounted && moving ? Math.abs(Math.sin(t * 9)) * 0.06 : 0)
  const swing = Math.sin(Math.min(1, attack) * Math.PI)
  const spin = skill > 0 ? Math.sin((1 - skill) * Math.PI) : 0
  rig.weaponArm.rotation.x = -0.35 - swing * 1.5 - spin * 0.9 + Math.sin(t * 1.3) * 0.04
  rig.weaponArm.rotation.z = -0.18 - swing * 0.4
  rig.body.rotation.y = spin * 0.9 * Math.sin((1 - skill) * Math.PI * 2) + swing * 0.25
  rig.body.rotation.x = swing * 0.12 - hit * 0.2
  if (rig.mounted) {
    rig.horseLegs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(t * 9 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.55 : Math.sin(t * 0.8 + i) * 0.03 })
    if (rig.horseHead) rig.horseHead.rotation.x = moving ? Math.sin(t * 9) * 0.12 : Math.sin(t * 0.9) * 0.05
  }
  // 망토: 위쪽은 고정, 아래로 갈수록 크게 흔들린다
  const pos = rig.cape.geometry.getAttribute('position') as THREE.BufferAttribute
  const base = rig.capeBase
  const wind = moving ? 0.22 : 0.08
  for (let i = 0; i < pos.count; i += 1) {
    const x = base[i * 3], y = base[i * 3 + 1]
    const depth = Math.min(1, -y / 1.2)
    pos.setZ(i, base[i * 3 + 2] + Math.sin(t * 3.2 + x * 4 + y * 3) * wind * depth + depth * depth * (moving ? 0.35 : 0.08))
  }
  pos.needsUpdate = true
  rig.cape.geometry.computeVertexNormals()
  const flash = Math.max(hit * hit, skill > 0 ? Math.sin(skill * Math.PI) * 0.5 : 0)
  for (const material of rig.materials) {
    if (material === undefined) continue
    material.emissive.setRGB(flash * 0.16, flash * 0.08, flash * 0.03)
  }
}

// ── 전장 환경 ────────────────────────────────────────────────
export interface Environment {
  update: (t: number, delta: number) => void
  sun: THREE.DirectionalLight
  /** 화면 비율이 바뀌면 배경 그림을 다시 맞춘다 */
  setAspect: (aspect: number) => void
}

export function buildEnvironment(scene: THREE.Scene, quality: SceneQuality): Environment {
  const updaters: Array<(t: number, delta: number) => void> = []
  // 배경: 사용자 제공 전장 그림 한 장(화면에 꽉 차게). 하늘 · 산 · 성채 · 풀 · 나무 · 깃발 모델은 쓰지 않고, 전장(섬) 모델만 얹는다.
  scene.fog = null
  scene.background = new THREE.Color(0x2a1a0e)
  let bgAspect = 16 / 9
  let viewAspect = 16 / 9
  let bg: THREE.Texture | null = null
  const fitBackground = () => {
    if (!bg) return
    // CSS background-size: cover 와 같게 자른다
    const ratio = viewAspect / bgAspect
    if (ratio > 1) { bg.repeat.set(1, 1 / ratio); bg.offset.set(0, (1 - 1 / ratio) * 0.5) }
    else { bg.repeat.set(ratio, 1); bg.offset.set((1 - ratio) * 0.5, 0) }
  }
  new THREE.TextureLoader().load('/assets/battlefield/battle-bg.webp', texture => {
    texture.colorSpace = THREE.SRGBColorSpace
    const image = texture.image as { width: number; height: number }
    bgAspect = image.width / Math.max(1, image.height)
    bg = texture
    fitBackground()
    scene.background = texture
  })

  // 빛: 노을 햇빛 + 하늘빛 + 테두리 빛
  scene.add(new THREE.HemisphereLight(0xffe0bc, 0x5a3a22, 1.6))
  const sun = new THREE.DirectionalLight(0xffc68a, 3.4)
  sun.position.set(-18, 16, -22)
  sun.castShadow = true
  sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024)
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 })
  sun.shadow.bias = -0.0008
  sun.shadow.normalBias = 0.03
  scene.add(sun, sun.target)
  const fill = new THREE.DirectionalLight(0xffb070, 0.55)
  fill.position.set(14, 10, 18)
  scene.add(fill)

  // 바닥: 보이지 않고 그림자만 받는 판(병사 · 무장 발밑 그림자)
  const shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ color: 0x1a0c04, opacity: 0.38 }))
  shadowGround.rotation.x = -Math.PI / 2
  shadowGround.position.y = 0.001
  shadowGround.receiveShadow = true
  scene.add(shadowGround)
  // 사용자 제공 실사 전장(2:1 섬 지형): 긴 쪽을 앞뒤로, 땅 높이가 0이 되게 얹는다
  const ISLAND_SCALE = 3.6
  void loadModel('battlefield').then(gltf => {
    const island = gltf.scene
    island.scale.setScalar(ISLAND_SCALE)
    island.rotation.y = Math.PI / 2
    island.position.set(0, 0.867 * ISLAND_SCALE + 0.02, -4)
    scene.add(island)
  }).catch(() => { /* 모델이 없으면 배경 그림만 */ })
  const tr = rng(9)

  // 불티 · 먼지(가벼운 입자)
  const emberCount = quality === 'high' ? 220 : 90
  const emberGeo = new THREE.BufferGeometry()
  const emberPos = new Float32Array(emberCount * 3), emberSeed = new Float32Array(emberCount)
  for (let i = 0; i < emberCount; i += 1) { emberPos.set([(tr() - 0.5) * 50, tr() * 10, (tr() - 0.5) * 40 - 6], i * 3); emberSeed[i] = tr() }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3))
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ map: softSprite(), color: 0xffa050, size: 0.22, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }))
  scene.add(embers)
  const dustGeo = new THREE.BufferGeometry()
  const dustPos = new Float32Array(160 * 3)
  for (let i = 0; i < 160; i += 1) dustPos.set([(tr() - 0.5) * 36, 0.3 + tr() * 3, (tr() - 0.5) * 30 - 2], i * 3)
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: softSprite(), color: 0xd8b48a, size: 0.6, transparent: true, opacity: 0.08, depthWrite: false }))
  scene.add(dust)
  updaters.push((t, delta) => {
    const a = emberGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < emberCount; i += 1) {
      let y = a.getY(i) + delta * (0.6 + emberSeed[i] * 0.9)
      if (y > 12) y = 0
      a.setY(i, y)
      a.setX(i, a.getX(i) + Math.sin(t * 0.8 + emberSeed[i] * 10) * delta * 0.3)
    }
    a.needsUpdate = true
    dust.rotation.y = Math.sin(t * 0.05) * 0.05
  })

  return { update: (t, delta) => updaters.forEach(fn => fn(t, delta)), sun, setAspect: (aspect: number) => { viewAspect = aspect; fitBackground() } }
}

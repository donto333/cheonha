import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { mountRider } from '/app/src/game/rider-models.js'
const loader = new GLTFLoader()
const draco = new DRACOLoader(); draco.setDecoderPath('/assets/draco/'); loader.setDRACOLoader(draco)
const ALIAS = { BoneRoot: 'Hips*', Hip: 'Hips', Pelvis: 'Hips*', Waist: 'Spine', Spine01: 'Spine1', Spine02: 'Spine2', NeckTwist01: 'Neck', NeckTwist02: 'Neck*', Head: 'Head', FacialBone: 'Head*', L_Eye: 'Head*', R_Eye: 'Head*' }
for (const [s, side] of [['L', 'Left'], ['R', 'Right']]) {
  Object.assign(ALIAS, { [`${s}_Thigh`]: `${side}UpLeg`, [`${s}_ThighTwist01`]: `${side}UpLeg*`, [`${s}_ThighTwist02`]: `${side}UpLeg*`, [`${s}_Calf`]: `${side}Leg`, [`${s}_CalfTwist01`]: `${side}Leg*`, [`${s}_CalfTwist02`]: `${side}Leg*`, [`${s}_KneeShareBone`]: `${side}Leg*`, [`${s}_Foot`]: `${side}Foot`, [`${s}_ToeBase`]: `${side}ToeBase`,
    [`${s}_Clavicle`]: `${side}Shoulder`, [`${s}_Upperarm`]: `${side}Arm`, [`${s}_UpperarmTwist01`]: `${side}Arm*`, [`${s}_UpperarmTwist02`]: `${side}Arm*`, [`${s}_Forearm`]: `${side}ForeArm`, [`${s}_ForearmTwist01`]: `${side}ForeArm*`, [`${s}_ForearmTwist02`]: `${side}ForeArm*`, [`${s}_ElbowShareBone`]: `${side}ForeArm*`, [`${s}_Hand`]: `${side}Hand` })
  for (const [a, f] of [['Thumb', 'Thumb'], ['Index', 'Index'], ['Mid', 'Middle'], ['Ring', 'Ring'], ['Pinky', 'Pinky']]) for (let k = 1; k <= 3; k++) ALIAS[`${s}_${a}${k}`] = `${side}Hand${f}${k}`
}
// 이름 → mixamo 이름. '*'가 붙은 것은 보조 뼈(위치는 쓰지 않고 가중치만 그 뼈로)
const canon = name => { const n = name.replace(/^mixamorig:?/, ''); return ALIAS[n] ?? n }
const strip = name => canon(name).replace('*', '')
async function load(url) { const g = await loader.loadAsync(url); g.scene.updateMatrixWorld(true); let m = null; g.scene.traverse(n => { if (n.isSkinnedMesh && !m && !n.userData.rider) m = n }); let plain = null; g.scene.traverse(n => { if (n.isMesh && !plain) plain = n }); return { g, m, plain } }
function joints(mesh, rest = false) {
  const out = new Map()
  if (rest) for (const bone of mesh.skeleton.bones) { let top = bone; while (top.parent) top = top.parent; top.updateMatrixWorld(true) }
  // rest: 지금 놓인 뼈 위치(원본 모델) — 역바인드 행렬이 메시와 돌아가 있는 파일도 있어서 실제 보이는 자세를 기준으로 한다
  mesh.skeleton.bones.forEach((bone, i) => { if (canon(bone.name).endsWith('*')) return; const w = rest ? bone.matrixWorld : new THREE.Matrix4().copy(mesh.skeleton.boneInverses[i]).invert(); out.set(strip(bone.name), { i, pos: new THREE.Vector3().setFromMatrixPosition(w) }) })
  return out
}
/** 원본 메시를 지금 뼈 자세로 스키닝한 위치 · 법선(월드) */
function restSkin(mesh) {
  const geo = mesh.geometry, pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), si = geo.getAttribute('skinIndex'), sw = geo.getAttribute('skinWeight')
  mesh.skeleton.update()
  const mats = mesh.skeleton.bones.map((bone, i) => new THREE.Matrix4().multiplyMatrices(bone.matrixWorld, mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix))
  const P = [], N = [], m = new THREE.Matrix4(), v = new THREE.Vector3(), n = new THREE.Vector3()
  for (let k = 0; k < pos.count; k++) {
    const e = new Float32Array(16)
    for (let c = 0; c < 4; c++) { const w = sw.getComponent(k, c); if (!w) continue; const me = mats[si.getComponent(k, c)].elements; for (let t = 0; t < 16; t++) e[t] += me[t] * w }
    m.fromArray(e)
    P.push(v.fromBufferAttribute(pos, k).applyMatrix4(m).clone())
    N.push(n.fromBufferAttribute(nor, k).applyMatrix3(new THREE.Matrix3().setFromMatrix4(m)).normalize().clone())
  }
  return { P, N }
}
// 방향(뼈 → 자식): 몸통은 두 축으로 맞춘다
const CHILD = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End' }
for (const s of ['Left', 'Right']) {
  Object.assign(CHILD, { [`${s}Shoulder`]: `${s}Arm`, [`${s}Arm`]: `${s}ForeArm`, [`${s}ForeArm`]: `${s}Hand`, [`${s}Hand`]: `${s}HandMiddle1`, [`${s}UpLeg`]: `${s}Leg`, [`${s}Leg`]: `${s}Foot`, [`${s}Foot`]: `${s}ToeBase`, [`${s}ToeBase`]: `${s}Toe_End` })
  for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k < 4; k++) CHILD[`${s}Hand${f}${k}`] = `${s}Hand${f}${k + 1}`
}
const FAR = Infinity
const TORSO = new Set(['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'])
function basis(a, b) { const x = a.clone().normalize(); const z = new THREE.Vector3().crossVectors(x, b).normalize(); const y = new THREE.Vector3().crossVectors(z, x); return new THREE.Matrix4().makeBasis(x, y, z) }
function rotations(src, dst) {
  const R = new Map()
  const lat = (J, name) => name === 'Hips' || name === 'Spine' ? J.get('LeftUpLeg').pos.clone().sub(J.get('RightUpLeg').pos) : J.get('LeftShoulder').pos.clone().sub(J.get('RightShoulder').pos)
  for (const [name] of src) {
    if (!dst.has(name)) continue
    const child = CHILD[name]
    if (!child || !src.has(child) || !dst.has(child)) continue
    const ds = src.get(child).pos.clone().sub(src.get(name).pos), dt = dst.get(child).pos.clone().sub(dst.get(name).pos)
    let q
    if (TORSO.has(name)) { const m = basis(dt, lat(dst, name)).multiply(basis(ds, lat(src, name)).transpose()); q = new THREE.Quaternion().setFromRotationMatrix(m) }
    else q = new THREE.Quaternion().setFromUnitVectors(ds.normalize(), dt.normalize())
    R.set(name, q)
  }
  return R
}
const PARENT = {}
for (const [p, c] of Object.entries(CHILD)) PARENT[c] = p
for (const s of ['Left', 'Right']) { PARENT[`${s}Shoulder`] = 'Spine2'; PARENT[`${s}UpLeg`] = 'Hips'; for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) PARENT[`${s}Hand${f}1`] = `${s}Hand` }
function rotOf(R, name) { let n = name; while (n && !R.has(n)) n = PARENT[n]; return R.get(n) ?? new THREE.Quaternion() }

/** 원본(T자세 · mixamo 뼈)을 기마 모델 기수 자세로 굽고 기마 뼈 번호로 다시 묶는다 */
function bake(source, donor, host) {
  const src = joints(donor ?? source.skel ?? source.m)
  // 어떤 파일은 역바인드 뼈대가 메시와 Y축으로 돌아가 있다: 왼손→오른손이 +X가 되게 뼈 위치를 돌려 맞춘다
  const lr = src.get('LeftHand').pos.clone().sub(src.get('RightHand').pos)
  const yaw = Math.atan2(-lr.z, lr.x)
  if (Math.abs(yaw) > 0.2) { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw); const c = src.get('Hips').pos.clone(); for (const j of src.values()) j.pos.sub(c).applyQuaternion(q).add(c); console.log('yaw fix', yaw.toFixed(2)) }
  const rest = null
  const dst = joints(host)
  const geo = (source.m ?? source.plain).geometry
  const srcBind = (source.m ?? source.plain).matrixWorld.clone()
  if (source.m) srcBind.copy(source.m.bindMatrix)
  const R = rotations(src, dst)
  const s = dst.get('Hips').pos.distanceTo(dst.get('Neck').pos) / src.get('Hips').pos.distanceTo(src.get('Neck').pos)
  const names = [...src.keys()]
  // 다리 길이 맞추기(window.__limbFit): 다리가 긴 모델은 기마 모델 비율로 허벅지 · 정강이를 줄여 발이 등자 높이에 오게 한다
  const limbScale = name => {
    if (!window.__limbFit || !/(Left|Right)(UpLeg|Leg)$/.test(name)) return s
    const child = CHILD[name], a = src.get(name), b = src.get(child), c = dst.get(name), d = dst.get(child)
    if (!a || !b || !c || !d) return s
    return Math.min(s, c.pos.distanceTo(d.pos) / Math.max(1e-6, a.pos.distanceTo(b.pos)))
  }
  const byIndex = names.map(name => ({ name, k: limbScale(name), rot: rotOf(R, name), js: src.get(name).pos, jt: dst.get(name)?.pos ?? dst.get(PARENT[name] ?? 'Hips').pos, ti: (dst.get(name) ?? dst.get(PARENT[name]) ?? dst.get('Hips')).i }))
  // 원본 뼈 번호 → 이름
  const srcSkin = donor ?? source.skel ?? source.m
  const indexToSrc = srcSkin.skeleton.bones.map(b => byIndex.find(e => e.name === strip(b.name)))
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), uv = geo.getAttribute('uv')
  let sIdx = geo.getAttribute('skinIndex'), sW = geo.getAttribute('skinWeight')
  const n = pos.count
  let wIdx = new Uint16Array(n * 4), wVal = new Float32Array(n * 4)
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3)
  const world = new THREE.Vector3(), nv = new THREE.Vector3(), acc = new THREE.Vector3(), accN = new THREE.Vector3(), tmp = new THREE.Vector3()
  const nm = new THREE.Matrix3().getNormalMatrix(srcBind)
  // 뼈대 없는 모델: 비슷한 모델(donor)의 가장 가까운 점에서 가중치를 빌린다
  let borrow = null, borrowDist = 0
  const byName = new Map(byIndex.map(e => [e.name, e]))
  // 빌린 가중치에서 몸에서 멀리 떨어진 치맛자락 · 소매가 정강이 · 발을 따라가면 말을 탄 자세에서 길게 찢어진다: 허벅지까지만 따르게
  const LOWLEG = new Set(['LeftLeg', 'LeftFoot', 'LeftToeBase', 'LeftToe_End', 'RightLeg', 'RightFoot', 'RightToeBase', 'RightToe_End'])
  if (donor) {
    const dg = donor.geometry, dp = dg.getAttribute('position'), dbm = donor.bindMatrix
    const pts = []; for (let i = 0; i < dp.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(dp, i).applyMatrix4(dbm))
    const cell = 0.02, grid = new Map(); const key = (x, y, z) => `${x},${y},${z}`
    pts.forEach((p, i) => { const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell)); (grid.get(k) ?? grid.set(k, []).get(k)).push(i) })
    borrow = v => { const cx = Math.floor(v.x / cell), cy = Math.floor(v.y / cell), cz = Math.floor(v.z / cell); let best = -1, bd = Infinity; for (let r = 1; r < 8 && best < 0; r++) for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) for (const i of grid.get(key(cx + x, cy + y, cz + z)) ?? []) { const d = pts[i].distanceToSquared(v); if (d < bd) { bd = d; best = i } } if (best < 0) { /* 몸에서 멀리 떨어진 치맛자락 · 소매 끝: 전체에서 가장 가까운 점 */ for (let i = 0; i < pts.length; i++) { const d = pts[i].distanceToSquared(v); if (d < bd) { bd = d; best = i } } } borrowDist = Math.sqrt(bd); return best }
    sIdx = dg.getAttribute('skinIndex'); sW = dg.getAttribute('skinWeight')
  }
  const hostInv = host.bindMatrixInverse
  const hostNm = new THREE.Matrix3().getNormalMatrix(hostInv)
  for (let v = 0; v < n; v++) {
    if (rest) { world.copy(rest.P[v]); nv.copy(rest.N[v]) }
    else { world.fromBufferAttribute(pos, v).applyMatrix4(srcBind); nv.fromBufferAttribute(nor, v).applyMatrix3(nm).normalize() }
    const from = borrow ? borrow(world) : v
    acc.set(0, 0, 0); accN.set(0, 0, 0)
    const slots = new Map()
    let picks = []
    for (let k = 0; k < 4; k++) {
      const w = sW.getComponent(from, k); if (w <= 0) continue
      let e = indexToSrc[sIdx.getComponent(from, k)]; if (!e) continue
      if (borrow && borrowDist > FAR && LOWLEG.has(e.name)) e = byName.get(e.name.startsWith('Left') ? 'LeftUpLeg' : 'RightUpLeg') ?? e
      picks.push([e, w])
    }
    // 빌린 가중치: 얼굴 · 머리는 머리뼈 하나로 단단히(대역과 머리 모양이 달라 목 · 머리 가중치가 섞이면 얼굴에 주름이 진다)
    if (borrow || window.__rigidHead) {
      const head = picks.reduce((t, [e, w]) => t + (e.name === 'Head' || e.name === 'HeadTop_End' ? w : 0), 0)
      const total = picks.reduce((t, [, w]) => t + w, 0) || 1
      const neckY = src.get('Neck')?.pos.y ?? Infinity
      // 목 위(머리 · 얼굴 · 머리장식)는 통째로 머리뼈에
      // 머리를 단단히 묶을 때(대역 없이)는 원래 머리 · 목을 따르던 점만(T자세 팔이 목보다 높은 모델에서 소매가 머리에 묶여 날개처럼 남지 않게)
      const headNeck = picks.reduce((t, [e, w]) => t + (e.name === 'Head' || e.name === 'HeadTop_End' || e.name === 'Neck' ? w : 0), 0)
      const allowed = borrow ? true : headNeck / total > 0.5
      if (allowed && (head / total > 0.45 || (world.y > neckY + 0.012 && Math.abs(world.x) < 0.25)) && byName.get('Head')) picks = [[byName.get('Head'), 1]]
    }
    // 머리 비율 바꾸기(window.__headScale = [가로, 세로, 앞뒤]): 머리뼈를 따르는 몫만큼 머리 관절을 중심으로 줄인다(목 쪽은 부드럽게 이어진다)
    if (window.__headScale && src.get('Head')) {
      const hw = picks.reduce((t, [e, w]) => t + (e.name === 'Head' || e.name === 'HeadTop_End' ? w : 0), 0) / (picks.reduce((t, [, w]) => t + w, 0) || 1)
      if (hw > 0) { const c = src.get('Head').pos, k = window.__headScale; world.set(c.x + (world.x - c.x) * (1 + (k[0] - 1) * hw), c.y + (world.y - c.y) * (1 + (k[1] - 1) * hw), c.z + (world.z - c.z) * (1 + (k[2] - 1) * hw)) }
    }
    let wsum = 0
    for (const [e, w] of picks) {
      tmp.copy(world).sub(e.js).multiplyScalar(e.k ?? s).applyQuaternion(e.rot).add(e.jt)
      acc.addScaledVector(tmp, w)
      accN.addScaledVector(tmp.copy(nv).applyQuaternion(e.rot), w)
      slots.set(e.ti, (slots.get(e.ti) ?? 0) + w); wsum += w
    }
    if (wsum > 0) acc.divideScalar(wsum)
    acc.applyMatrix4(hostInv); accN.applyMatrix3(hostNm).normalize()
    P.set([acc.x, acc.y, acc.z], v * 3); N.set([accN.x, accN.y, accN.z], v * 3)
    const list = [...slots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); const total = list.reduce((t, e) => t + e[1], 0) || 1
    list.forEach(([ti, w], k) => { wIdx[v * 4 + k] = ti; wVal[v * 4 + k] = w / total })
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(P, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3))
  out.setAttribute('uv', uv.clone())
  out.setAttribute('skinIndex', new THREE.BufferAttribute(wIdx, 4))
  out.setAttribute('skinWeight', new THREE.BufferAttribute(wVal, 4))
  out.setIndex(geo.index.clone())
  out.computeBoundingSphere()
  return out
}
const b64 = arr => { const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s) }

/** 부품이 여러 개로 나뉜 모델(Tripo 부품 내보내기): 부품마다 구워 따로 돌려준다(아틀라스는 assemble_parts.py) */
/** 부품 모델 전체를 한 덩어리 '대역'(donor)으로: 위치(바인드 공간) · 뼈 번호 · 가중치를 합친다 */
async function mergedDonor(file) {
  const g = await loader.loadAsync(`/up/${file}`); g.scene.updateMatrixWorld(true)
  const ms = []; g.scene.traverse(n => { if (n.isSkinnedMesh) ms.push(n) })
  const P = [], J = [], W = []
  for (const m of ms) { const pos = m.geometry.getAttribute('position'), si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight'); const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.bindMatrix); P.push(v.x, v.y, v.z); for (let k = 0; k < 4; k++) { J.push(si.getComponent(i, k)); W.push(sw.getComponent(i, k)) } } }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4))
  return { geometry, bindMatrix: new THREE.Matrix4(), skeleton: ms[0].skeleton }
}
window.__bakeParts = async (file, donorFile = null) => {
  const host = await load('/assets/models/cavalry.glb')
  const g = await loader.loadAsync(`/up/${file}`); g.scene.updateMatrixWorld(true)
  const meshes = []; g.scene.traverse(n => { if (n.isSkinnedMesh) meshes.push(n) })
  // 뼈대가 망가진 모델(뼈 위치 · 가중치가 몸과 맞지 않음): 비슷한 모델의 뼈대 · 가중치를 빌린다
  const donor = donorFile ? await mergedDonor(donorFile) : null
  const parts = []
  const geos = []
  for (const m of meshes) {
    const geo = donor ? bake({ m: null, plain: m }, donor, host.m) : bake({ m, skel: meshes[0] }, null, host.m)
    geos.push({ geometry: geo, material: m.material })
    const mat = g.parser.associations.get(m.material)?.materials ?? -1 // 원본 glTF 재질 번호(텍스처)
    parts.push({ name: m.name, mat: m.material.name, count: geo.getAttribute('position').count, P: b64(geo.getAttribute('position').array), N: b64(geo.getAttribute('normal').array), U: b64(geo.getAttribute('uv').array), J: b64(geo.getAttribute('skinIndex').array), W: b64(geo.getAttribute('skinWeight').array), I: b64(new Uint32Array(geo.index.array)), _m: mat })
  }
  window.__last = { parts: geos, host }
  return { parts }
}
window.__bake = async (file, donorFile, opts = {}) => {
  const host = await load('/assets/models/cavalry.glb')
  const source = await load(`/up/${file}`)
  const donor = donorFile ? (await load(`/up/${donorFile}`)).m : null
  // 뼈 가중치가 망가진 파일(전부 엉덩이뼈 등): 뼈대 없는 모델처럼 donor에서 가중치를 빌린다
  if (donor && source.m) source.m = null
  const geo = bake(source, source.m ? null : donor, host.m)
  window.__last = { geo, material: (source.m ?? source.plain).material, host }
  return { count: geo.getAttribute('position').count, index: geo.index.count, P: b64(geo.getAttribute('position').array), N: b64(geo.getAttribute('normal').array), U: b64(geo.getAttribute('uv').array), J: b64(geo.getAttribute('skinIndex').array), W: b64(geo.getAttribute('skinWeight').array), I: b64(geo.index.array instanceof Uint32Array ? geo.index.array : new Uint32Array(geo.index.array)) }
}

// 확인: 기마 모델에 태워 동작 재생 · 찍기
window.__view = async (clipName = 'MountedIdle', t = 0.5, ry = 0.9, W = 520, H = 520) => {
  const last = window.__last
  const riderParts = last.parts ?? [{ geometry: last.geo, material: last.material }]
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a3a44)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2)); const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(3, 5, 6); scene.add(sun)
  const host = await load('/assets/models/cavalry.glb')
  const root = host.g.scene; root.rotation.y = ry; scene.add(root)
  mountRider(root, { parts: riderParts })
  const mixer = new THREE.AnimationMixer(root)
  const clip = host.g.animations.find(c => c.name === clipName)
  if (clip) { mixer.clipAction(clip).play(); mixer.update(t) }
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root); const c = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3())
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.01, 200); const d = Math.max(size.x, size.y, size.z) * 1.9
  cam.position.set(c.x, c.y + size.y * 0.15, c.z + d); cam.lookAt(c)
  if (window.__zoomHead) { const top = new THREE.Vector3(c.x, box.max.y - size.y * 0.1, c.z); cam.position.set(top.x, top.y, top.z + d * 0.18); cam.lookAt(top) }
  renderer.render(scene, cam)
  return true
}

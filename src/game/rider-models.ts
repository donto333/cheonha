// 전용 기수 모델(여성 무장 등): 기마 모델(cavalry.glb)의 말 · 뼈대 · 동작은 그대로 쓰고, 사람만 바꿔 태운다.
// 기수 파일(assets/models/riders/<id>.glb)은 기마 모델의 기본 자세(말에 앉은 자세)에 맞춰 미리 구워 둔 메시다:
//  · 뼈 번호(JOINTS_0)는 cavalry.glb 뼈대 순서 그대로 → 같은 뼈대에 묶으면 기존 기마 동작이 모두 그대로 입혀진다
//  · 용량을 줄이려고 KHR_mesh_quantization(위치 int16 · 법선 int8 · UV uint16 · 가중치 uint8)로 저장하고, 위치는 노드 변환으로 되돌린다
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface RiderPart { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }
export interface RiderAsset { parts: RiderPart[] }

const BASE = '/assets/models/riders/'
const cache = new Map<string, Promise<RiderAsset>>()

/** 양자화된 속성을 실수 배열로 풀고(정규화 반영), 필요하면 행렬을 곱한다 */
function toFloat(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, size: number, matrix?: THREE.Matrix4, normal = false): THREE.BufferAttribute {
  const out = new Float32Array(attribute.count * size)
  const v = new THREE.Vector3()
  const nm = matrix ? new THREE.Matrix3().getNormalMatrix(matrix) : null
  for (let i = 0; i < attribute.count; i += 1) {
    if (size === 3) {
      v.set(attribute.getX(i), attribute.getY(i), attribute.getZ(i))
      if (matrix) { if (normal) v.applyMatrix3(nm!).normalize(); else v.applyMatrix4(matrix) }
      out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z
    } else {
      out[i * 2] = attribute.getX(i); out[i * 2 + 1] = attribute.getY(i)
    }
  }
  return new THREE.BufferAttribute(out, size)
}

export function loadRider(id: string): Promise<RiderAsset> {
  const cached = cache.get(id)
  if (cached) return cached
  const pending = new GLTFLoader().loadAsync(`${BASE}${id}.glb`).then(gltf => {
    const parts: RiderPart[] = []
    gltf.scene.updateMatrixWorld(true)
    gltf.scene.traverse(node => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      const src = mesh.geometry
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', toFloat(src.getAttribute('position'), 3, mesh.matrixWorld))
      if (src.getAttribute('normal')) geometry.setAttribute('normal', toFloat(src.getAttribute('normal'), 3, mesh.matrixWorld, true))
      if (src.getAttribute('uv')) geometry.setAttribute('uv', toFloat(src.getAttribute('uv'), 2))
      geometry.setAttribute('skinIndex', src.getAttribute('skinIndex'))
      geometry.setAttribute('skinWeight', src.getAttribute('skinWeight'))
      if (src.index) geometry.setIndex(src.index)
      geometry.computeBoundingSphere()
      const material = mesh.material as THREE.MeshStandardMaterial
      material.side = THREE.DoubleSide // 소매 · 치맛자락 안쪽이 비어 보이지 않게
      parts.push({ geometry, material })
    })
    return { parts }
  })
  pending.catch(() => cache.delete(id))
  cache.set(id, pending)
  return pending
}

/** 원래 사람 뼈를 따르는 몫이 거의 전부인 곳만 지운다(말 등 · 안장 둘레는 사람 다리 뼈를 조금 따라서 0.5로 자르면 구멍이 뚫려 투명해 보였다) */
const KEEP_THRESHOLD = '0.03'

/** 기마 모델의 원래 사람(뼈 31번부터)을 감춘다 — 말과 손에 쥔 무기(Weapon_R)는 남긴다 */
export function hideOriginalRider(material: THREE.MeshStandardMaterial, weaponBone: number): void {
  const previous = material.onBeforeCompile
  const previousKey = material.customProgramCacheKey?.() ?? ''
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vKeepRider;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_SKINNING
          vKeepRider = dot(skinWeight, vec4(lessThan(skinIndex, vec4(30.5)))) + dot(skinWeight, vec4(lessThan(abs(skinIndex - ${weaponBone.toFixed(1)}), vec4(.5))));
        #else
          vKeepRider = 1.;
        #endif`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vKeepRider;')
      .replace('void main() {', `void main() {\n  if (vKeepRider < ${KEEP_THRESHOLD}) discard;`)
  }
  material.customProgramCacheKey = () => `${previousKey}|hide-rider`
  material.needsUpdate = true
}

/**
 * 기마 모델(복제본)에 전용 기수를 태운다: 원래 사람은 감추고, 기수 메시를 같은 뼈대에 묶어 몸 메시 옆에 붙인다.
 * material: 기수 재질을 바꿔 쓸 때(석상 · 테두리 빛 등). 붙인 메시를 돌려준다.
 */
export function mountRider(root: THREE.Object3D, asset: RiderAsset, material: (m: THREE.MeshStandardMaterial) => THREE.Material = m => m.clone()): THREE.SkinnedMesh[] {
  let body: THREE.SkinnedMesh | null = null
  root.traverse(node => { const m = node as THREE.SkinnedMesh; if (m.isSkinnedMesh && !body && !m.userData.rider) body = m })
  const host = body as THREE.SkinnedMesh | null
  if (!host) return []
  const weapon = host.skeleton.bones.findIndex(b => b.name === 'Weapon_R')
  hideOriginalRider(host.material as THREE.MeshStandardMaterial, weapon)
  // 말 몸은 원래 기수의 다리가 덮던 자리(안장 옆 · 옆구리)에 면이 없다 → 안쪽 면도 그려 그 틈으로 배경 대신 반대쪽 옆구리 안쪽이 보이게
  ;(host.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
  // 그 틈이 양쪽 옆구리에 마주 나 있어 옆에서 보면 그대로 뚫려 보인다 → 말 몸통 안쪽에 말 털빛 몸통 덩어리를 채워 넣는다(겉면 바로 안쪽이라 틈으로만 보인다)
  const spine = host.skeleton.bones.findIndex(b => b.name === 'HorseSpine')
  if (spine >= 0 && !host.skeleton.bones[spine].getObjectByName('rider-barrel-fill')) {
    // 석상 등 재질을 바꿔 태울 때(material)는 채움도 같은 재질로
    const fill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material(new THREE.MeshStandardMaterial({ color: 0x5c2312, roughness: 0.9, metalness: 0 })))
    fill.name = 'rider-barrel-fill'
    fill.scale.set(0.37, 0.25, 0.52)
    fill.position.set(0, 1.21, -0.02) // 말 모델 좌표(안장 아래 몸통 가운데)
    fill.updateMatrix()
    fill.applyMatrix4(new THREE.Matrix4().multiplyMatrices(host.skeleton.boneInverses[spine], host.bindMatrix))
    fill.castShadow = false
    host.skeleton.bones[spine].add(fill)
  }
  // 그림자에서도 감춘다: 색에서만 지우면 원래 사람이 그림자를 드리워 말 옆구리에 다리 모양 얼룩(투명해 보이는 자국)이 진다
  if (!host.customDepthMaterial) {
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    hideOriginalRider(depth as unknown as THREE.MeshStandardMaterial, weapon)
    host.customDepthMaterial = depth
  }
  return asset.parts.map(part => {
    const mesh = new THREE.SkinnedMesh(part.geometry, material(part.material))
    mesh.userData.rider = true
    mesh.castShadow = true
    mesh.frustumCulled = false
    host.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)
    mesh.bind(host.skeleton, host.bindMatrix)
    host.parent?.add(mesh)
    return mesh
  })
}

# 부품으로 나뉜 Tripo 모델(부품마다 텍스처) → 구운 부품(JSON) 합치기 + 텍스처 아틀라스 → 양자화 GLB 한 덩어리
# 사용: assemble_parts.py 원본.glb 구운.parts.json 출력.glb [아틀라스 크기=1536] [법선 크기=768]
import sys, json, base64, struct, io, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
src_glb, baked_json, out_path = sys.argv[1:4]
ATLAS = int(sys.argv[4]) if len(sys.argv) > 4 else 1536
NATLAS = int(sys.argv[5]) if len(sys.argv) > 5 else 768
PAD = 3

b = open(src_glb, 'rb').read(); l = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + l]); binstart = 20 + l + 8
def image(idx):
    im = g['images'][idx]; bv = g['bufferViews'][im['bufferView']]; o = binstart + bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(b[o:o + bv['byteLength']])).convert('RGB')
def tex(entry): return image(g['textures'][entry['index']]['source'])

parts = json.load(open(baked_json))['parts']
dec = lambda s, dt, c: np.frombuffer(base64.b64decode(s), dt).reshape(-1, c) if c > 1 else np.frombuffer(base64.b64decode(s), dt)
items = []
for p in parts:
    P = dec(p['P'], np.float32, 3); N = dec(p['N'], np.float32, 3); U = dec(p['U'], np.float32, 2)
    J = dec(p['J'], np.uint16, 4); W = dec(p['W'], np.float32, 4); I = dec(p['I'], np.uint32, 1)
    # 단순화로 쓰이지 않게 된 꼭짓점은 버린다
    used = np.unique(I); remap = np.full(len(P), -1, np.int64); remap[used] = np.arange(len(used))
    P, N, U, J, W = P[used], N[used], U[used], J[used], W[used]; I = remap[I].astype(np.uint32)
    if len(I) == 0: continue
    # 같은 점(위치 · 법선 · UV · 가중치) 합치기 — 부품 내보내기는 꼭짓점이 겹쳐 있다
    key = np.concatenate([np.round(P * 2e4), np.round(N * 200), np.round(U * 2e4), J.astype(np.float64), np.round(W * 200)], 1)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    P, N, U, J, W = P[first], N[first], U[first], J[first], W[first]; I = inv[I].astype(np.uint32)
    tri = P[I.reshape(-1, 3)]; area = float(np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1).sum() / 2)
    items.append(dict(P=P, N=N, U=U, J=J, W=W, I=I, mat=p['_m'], area=area, cy=float(P[:, 1].mean())))

# 얼굴 · 머리 부품은 화면에서 가장 눈에 띄니 칸을 넓힌다(머리 · 목 뼈 가중치가 큰 부품)
import os
BONES = json.load(open(os.path.join(os.path.dirname(__file__), 'cavalry-bones.json')))
HEAD = [i for i, name in enumerate(BONES) if name in ('Head', 'HeadTop_End', 'Neck')]
# 칸 크기 기준: 넓이 몫 + 삼각형 몫(얼굴처럼 잘게 나뉜 부품일수록 세밀하다), 머리 · 얼굴은 2배
A = sum(it['area'] for it in items); TT = sum(len(it['I']) for it in items)
for it in items:
    head = float((it['W'] * np.isin(it['J'], HEAD)).sum() / max(1, len(it['W'])))
    it['area'] = (it['area'] / A + len(it['I']) / TT) * (2 if head > 0.5 else 1)

def bleed(img, U, I):
    """UV 섬 바깥(배경)을 가장 가까운 섬 색으로 채운다 — 줄인 텍스처에서 섬 가장자리에 검은 금이 생기지 않게"""
    w, h = img.size
    mask = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(mask)
    uv = np.clip(U, 0, 1) * [w - 1, h - 1]
    for t in I.reshape(-1, 3):
        dr.polygon([tuple(uv[k]) for k in t], fill=255, outline=255)
    m = ndimage.binary_dilation(np.array(mask) > 0, iterations=2)
    if m.all() or not m.any(): return img
    _, (iy, ix) = ndimage.distance_transform_edt(~m, return_indices=True)
    a = np.array(img); return Image.fromarray(a[iy, ix])

# ── 아틀라스: 부품 넓이에 비례해 칸 크기를 정하고(최소 24px) 선반식으로 채운다 ──
def pack(scale):
    """스카이라인 채우기: 큰 칸부터, 가장 낮은 자리에"""
    sizes = [min(ATLAS, max(24, int(math.sqrt(it['area']) * scale))) for it in items]
    order = sorted(range(len(items)), key=lambda i: -sizes[i]); sky = [(0, 0, ATLAS)]; place = {}
    for i in order:
        sz = sizes[i]; best = None
        for k in range(len(sky)):
            x = sky[k][0]
            if x + sz > ATLAS: break
            # 이 자리에서 폭 sz를 덮는 구간들의 최고 높이
            y = 0; w = 0; j = k
            while w < sz: y = max(y, sky[j][1]); w += sky[j][2]; j += 1
            if y + sz <= ATLAS and (best is None or y < best[1] or (y == best[1] and x < best[0])): best = (x, y)
        if best is None: return None
        x, y = best; place[i] = (x, y, sz)
        # 스카이라인 갱신
        new = []; 
        for (sx, sy, sw) in sky:
            ex = sx + sw
            if ex <= x or sx >= x + sz: new.append((sx, sy, sw)); continue
            if sx < x: new.append((sx, sy, x - sx))
            if ex > x + sz: new.append((x + sz, sy, ex - x - sz))
        new.append((x, y + sz, sz)); new.sort()
        merged = []
        for seg in new:
            if merged and merged[-1][1] == seg[1] and merged[-1][0] + merged[-1][2] == seg[0]: merged[-1] = (merged[-1][0], seg[1], merged[-1][2] + seg[2])
            else: merged.append(seg)
        sky = merged
    return place
lo, hi = 1.0, 1e5
for _ in range(40):
    mid = (lo + hi) / 2
    if pack(mid): lo = mid
    else: hi = mid
place = pack(lo)
atlas = Image.new('RGB', (ATLAS, ATLAS), (128, 128, 128)); natlas = Image.new('RGB', (max(1, NATLAS), max(1, NATLAS)), (128, 128, 255))
nk = NATLAS / ATLAS
for i, it in enumerate(items):
    x, y, s = place[i]; mat = g['materials'][it['mat']]
    base = tex(mat['pbrMetallicRoughness']['baseColorTexture']); work = min(1024, base.size[0])
    atlas.paste(bleed(base.resize((work, work), Image.LANCZOS), it['U'], it['I']).resize((s, s), Image.LANCZOS), (x, y))
    if NATLAS and 'normalTexture' in mat:
        ns = max(1, round(s * nk)); nt = tex(mat['normalTexture']); nw = min(512, nt.size[0])
        natlas.paste(bleed(nt.resize((nw, nw), Image.LANCZOS), it['U'], it['I']).resize((ns, ns), Image.LANCZOS), (round(x * nk), round(y * nk)))
    u = np.clip(it['U'], 0, 1)
    it['U'] = np.stack([(x + PAD + u[:, 0] * (s - 2 * PAD)) / ATLAS, (y + PAD + u[:, 1] * (s - 2 * PAD)) / ATLAS], 1)
def jpeg(im, q): buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True); return buf.getvalue()
base_jpg = jpeg(atlas, 84); norm_jpg = jpeg(natlas, 80) if NATLAS else None
atlas.save(out_path.replace('.glb', '-atlas.jpg'), quality=80)

# ── 합치기 ──
off = 0; Ps, Ns, Us, Js, Ws, Is = [], [], [], [], [], []
for it in items:
    Ps.append(it['P']); Ns.append(it['N']); Us.append(it['U']); Js.append(it['J']); Ws.append(it['W']); Is.append(it['I'] + off); off += len(it['P'])
P, N, U, J, W, I = map(np.concatenate, (Ps, Ns, Us, Js, Ws, Is)); n = len(P)

lo3, hi3 = P.min(0), P.max(0); ext = np.maximum(hi3 - lo3, 1e-6); center = (lo3 + hi3) / 2; half = ext / 2
Pq4 = np.zeros((n, 4), np.int16); Pq4[:, :3] = np.round((P - center) / half * 32767).astype(np.int16)
Nn = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-8)
Nq4 = np.zeros((n, 4), np.int8); Nq4[:, :3] = np.round(Nn * 127).astype(np.int8)
Uq = np.round(np.clip(U, 0, 1) * 65535).astype(np.uint16)
Jq = J.astype(np.uint8)
Wq = np.round(W * 255).astype(np.int32); Wq[:, 0] += 255 - Wq.sum(1); Wq = np.clip(Wq, 0, 255).astype(np.uint8)
Iq = I.astype(np.uint16) if n < 65536 else I.astype(np.uint32)

chunks, views, accessors = [], [], []
def add(data, target=None, stride=None):
    o = sum(len(c) for c in chunks); pad = (-o) % 4
    if pad: chunks.append(b'\0' * pad); o += pad
    chunks.append(data); v = {'buffer': 0, 'byteOffset': o, 'byteLength': len(data)}
    if target: v['target'] = target
    if stride: v['byteStride'] = stride
    views.append(v); return len(views) - 1
def acc(view, ctype, count, typ, normalized=False, mn=None, mx=None):
    a = {'bufferView': view, 'componentType': ctype, 'count': count, 'type': typ}
    if normalized: a['normalized'] = True
    if mn is not None: a['min'] = mn; a['max'] = mx
    accessors.append(a); return len(accessors) - 1
ARR, ELEM = 34962, 34963
attrs = {
  'POSITION': acc(add(Pq4.tobytes(), ARR, 8), 5122, n, 'VEC3', True, [-1, -1, -1], [1, 1, 1]),
  'NORMAL': acc(add(Nq4.tobytes(), ARR, 4), 5120, n, 'VEC3', True),
  'TEXCOORD_0': acc(add(Uq.tobytes(), ARR), 5123, n, 'VEC2', True),
  'JOINTS_0': acc(add(Jq.tobytes(), ARR), 5121, n, 'VEC4'),
  'WEIGHTS_0': acc(add(Wq.tobytes(), ARR), 5121, n, 'VEC4', True),
}
ind = acc(add(Iq.tobytes(), ELEM), 5123 if Iq.dtype == np.uint16 else 5125, len(Iq), 'SCALAR')
images = [{'bufferView': add(base_jpg), 'mimeType': 'image/jpeg'}]
textures = [{'source': 0, 'sampler': 0}]
material = {'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.2, 'roughnessFactor': 0.72}, 'doubleSided': True}
if norm_jpg:
    images.append({'bufferView': add(norm_jpg), 'mimeType': 'image/jpeg'}); textures.append({'source': 1, 'sampler': 0}); material['normalTexture'] = {'index': 1}
binary = b''.join(chunks); binary += b'\0' * ((-len(binary)) % 4)
gltf = {
  'asset': {'version': '2.0', 'generator': 'cheonharo-rider-bake (Tripo parts → atlas)'},
  'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'],
  'scene': 0, 'scenes': [{'nodes': [0]}],
  'nodes': [{'mesh': 0, 'translation': center.tolist(), 'scale': half.tolist()}],
  'meshes': [{'primitives': [{'attributes': attrs, 'indices': ind, 'material': 0}]}],
  'materials': [material], 'textures': textures, 'images': images, 'samplers': [{'magFilter': 9729, 'minFilter': 9987}],
  'buffers': [{'byteLength': len(binary)}], 'bufferViews': views, 'accessors': accessors,
}
js = json.dumps(gltf, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binary)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binary), 0x004E4942) + binary
open(out_path, 'wb').write(out)
print(out_path, len(items), 'parts', n, 'verts', len(I) // 3, 'tris', len(out) // 1024, 'KB', '(base', len(base_jpg) // 1024, 'norm', len(norm_jpg or b'') // 1024, ')')

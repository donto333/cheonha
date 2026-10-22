# 구운 부품(JSON) 합치기 + UV 섬 단위 텍스처 아틀라스 → 양자화 GLB 한 덩어리
# assemble_parts.py는 부품 텍스처를 통째로 줄여 붙여서 얼굴처럼 작은 섬이 뭉개진다.
# 여기서는 UV 섬(이어진 삼각형 묶음)마다 원본 해상도에서 잘라 따로 배치하고, 얼굴 · 머리 섬에 해상도를 더 준다.
# 사용: assemble_islands.py 원본.glb 구운.parts.json 출력.glb [아틀라스=1536] [법선=768] [머리 배율=2.5]
import sys, json, base64, struct, io, math, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
src_glb, baked_json, out_path = sys.argv[1:4]
ATLAS = int(sys.argv[4]) if len(sys.argv) > 4 else 1536
NATLAS = int(sys.argv[5]) if len(sys.argv) > 5 else 768
HEADK = float(sys.argv[6]) if len(sys.argv) > 6 else 2.5
PAD = 4

b = open(src_glb, 'rb').read(); l = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + l]); binstart = 20 + l + 8
_img = {}
def image(idx):
    if idx not in _img:
        im = g['images'][idx]; bv = g['bufferViews'][im['bufferView']]; o = binstart + bv.get('byteOffset', 0)
        _img[idx] = Image.open(io.BytesIO(b[o:o + bv['byteLength']])).convert('RGB')
    return _img[idx]
def tex(entry): return image(g['textures'][entry['index']]['source'])

BONES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cavalry-bones.json')))
HEAD = [i for i, name in enumerate(BONES) if name in ('Head', 'HeadTop_End', 'Neck')]
parts = json.load(open(baked_json))['parts']
dec = lambda s, dt, c: np.frombuffer(base64.b64decode(s), dt).reshape(-1, c) if c > 1 else np.frombuffer(base64.b64decode(s), dt)
items = []
for p in parts:
    P = dec(p['P'], np.float32, 3); N = dec(p['N'], np.float32, 3); U = dec(p['U'], np.float32, 2)
    J = dec(p['J'], np.uint16, 4); W = dec(p['W'], np.float32, 4); I = dec(p['I'], np.uint32, 1)
    used = np.unique(I); remap = np.full(len(P), -1, np.int64); remap[used] = np.arange(len(used))
    P, N, U, J, W = P[used], N[used], U[used], J[used], W[used]; I = remap[I].astype(np.uint32)
    if len(I) == 0: continue
    key = np.concatenate([np.round(P * 2e4), np.round(N * 200), np.round(U * 2e4), J.astype(np.float64), np.round(W * 200)], 1)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True); inv = inv.reshape(-1)
    P, N, U, J, W = P[first], N[first], U[first], J[first], W[first]; I = inv[I].astype(np.uint32)
    items.append(dict(P=P, N=N, U=np.clip(U, 0, 1).astype(np.float64), J=J, W=W, I=I, mat=p['_m']))

# ── UV 섬 ──
islands = []  # (item, 정점 목록, 삼각형 목록, 머리?, 원본 픽셀 bbox)
for k, it in enumerate(items):
    T = it['I'].reshape(-1, 3); n = len(it['P'])
    rows = np.concatenate([T[:, 0], T[:, 1], T[:, 2]]); cols = np.concatenate([T[:, 1], T[:, 2], T[:, 0]])
    nc, lab = connected_components(coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n)), directed=False)
    hw = (it['W'] * np.isin(it['J'], HEAD)).sum(1)
    tri_lab = lab[T[:, 0]]; tri_head = (hw[T] >= 0.5).all(1)
    base = tex(g['materials'][it['mat']]['pbrMetallicRoughness']['baseColorTexture']); tw, th = base.size
    order = np.argsort(tri_lab, kind='stable'); bounds = np.searchsorted(tri_lab[order], np.arange(nc + 1))
    for c in range(nc):
        tris = order[bounds[c]:bounds[c + 1]]
        if len(tris) == 0: continue
        vs = np.unique(T[tris].reshape(-1)); uv = it['U'][vs]
        x0, y0 = uv.min(0) * [tw, th]; x1, y1 = uv.max(0) * [tw, th]
        x0, y0 = max(0, math.floor(x0) - 1), max(0, math.floor(y0) - 1); x1, y1 = min(tw, math.ceil(x1) + 1), min(th, math.ceil(y1) + 1)
        islands.append(dict(item=k, vs=vs, tris=tris, head=tri_head[tris].mean() > 0.5, box=(x0, y0, max(x1, x0 + 1), max(y1, y0 + 1)), tex=(tw, th)))
print('islands', len(islands), 'head', sum(i['head'] for i in islands))

def sizes(d):
    out = []
    for isl in islands:
        x0, y0, x1, y1 = isl['box']; s = min(1.0, d * (HEADK if isl['head'] else 1.0))
        out.append((max(1, round((x1 - x0) * s)) + 2 * PAD, max(1, round((y1 - y0) * s)) + 2 * PAD, s))
    return out
def pack(d):
    sz = sizes(d); order = sorted(range(len(sz)), key=lambda i: (-sz[i][1], -sz[i][0])); sky = [(0, 0, ATLAS)]; place = {}
    for i in order:
        w, h, _ = sz[i]
        if w > ATLAS or h > ATLAS: return None
        best = None
        for k in range(len(sky)):
            x = sky[k][0]
            if x + w > ATLAS: break
            y = 0; ww = 0; j = k
            while ww < w: y = max(y, sky[j][1]); ww += sky[j][2]; j += 1
            if y + h <= ATLAS and (best is None or y < best[1] or (y == best[1] and x < best[0])): best = (x, y)
        if best is None: return None
        x, y = best; place[i] = (x, y)
        new = []
        for (sx, sy, sw) in sky:
            ex = sx + sw
            if ex <= x or sx >= x + w: new.append((sx, sy, sw)); continue
            if sx < x: new.append((sx, sy, x - sx))
            if ex > x + w: new.append((x + w, sy, ex - x - w))
        new.append((x, y + h, w)); new.sort(); merged = []
        for seg in new:
            if merged and merged[-1][1] == seg[1] and merged[-1][0] + merged[-1][2] == seg[0]: merged[-1] = (merged[-1][0], seg[1], merged[-1][2] + seg[2])
            else: merged.append(seg)
        sky = merged
    return place, sz
lo, hi = 0.01, 1.0
if pack(hi): lo = hi
else:
    for _ in range(30):
        mid = (lo + hi) / 2
        if pack(mid): lo = mid
        else: hi = mid
place, SZ = pack(lo)
print(f'density body {lo:.3f} head {min(1, lo * HEADK):.3f} (원본 대비)')

BEAUTY = float(os.environ.get('BEAUTY', '0'))
def beauty(piece, scale):
    """얼굴 피부 보정: 피부색 영역만 골라 결은 살리고 얼룩 · 잡티를 매끈하게(양방향 필터), 밝고 고르게, 눈 · 입술은 또렷하게"""
    import cv2
    a = np.array(piece).astype(np.float32); h, w = a.shape[:2]
    if min(h, w) < 12: return piece
    u8 = a.astype(np.uint8)
    ycc = cv2.cvtColor(u8, cv2.COLOR_RGB2YCrCb).astype(np.float32)
    Y, Cr, Cb = ycc[..., 0], ycc[..., 1], ycc[..., 2]
    skin = ((Cr > 133) & (Cr < 178) & (Cb > 80) & (Cb < 132) & (Y > 60)).astype(np.float32)
    rad = max(1.0, 3.0 / max(scale, 0.25))  # 원본 픽셀 기준(줄어들 비율만큼 넓게)
    skin = cv2.GaussianBlur(skin, (0, 0), rad * 1.5)
    k = int(max(5, min(25, rad * 4))) | 1
    smooth = cv2.bilateralFilter(u8, k, 28, rad * 2.5).astype(np.float32)
    smooth = cv2.bilateralFilter(smooth.astype(np.uint8), k, 22, rad * 2).astype(np.float32)
    m = (skin * 0.75 * BEAUTY)[..., None]
    out = a * (1 - m) + smooth * m
    # 피부: 밝게 · 그늘 걷기(감마) · 약간 따뜻하고 맑게
    lift = (skin * BEAUTY)[..., None]
    bright = 255 * np.power(np.clip(out / 255, 0, 1), 0.86) * [1.02, 1.0, 0.985]
    out = out * (1 - lift * 0.6) + bright * lift * 0.6
    # 눈 · 눈썹 · 입술(피부 아닌 얼굴 세부)은 또렷하게
    blur = cv2.GaussianBlur(out, (0, 0), rad)
    det = (1 - skin)[..., None] * 0.5 * BEAUTY + 0.15 * BEAUTY
    out = out + (out - blur) * det
    # 입술: 붉은 쪽(Cr 높음)은 채도 조금
    lips = cv2.GaussianBlur(((Cr > 160) & (Y > 50) & (Y < 200)).astype(np.float32), (0, 0), rad)[..., None] * 0.25 * BEAUTY
    g = out.mean(2, keepdims=True); out = out + (out - g) * lips
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def bleed_crop(img, poly_uv, box):
    """섬 영역만 남기고 바깥은 가장 가까운 섬 색으로 채운다(이웃 섬 색이 번지지 않게)"""
    x0, y0, x1, y1 = box; crop = img.crop(box)
    mask = Image.new('L', crop.size, 0); dr = ImageDraw.Draw(mask)
    for t in poly_uv: dr.polygon([(u - x0, v - y0) for u, v in t], fill=255, outline=255)
    m = ndimage.binary_dilation(np.array(mask) > 0, iterations=1)
    if m.all() or not m.any(): return crop
    _, (iy, ix) = ndimage.distance_transform_edt(~m, return_indices=True)
    a = np.array(crop); return Image.fromarray(a[iy, ix])

atlas = Image.new('RGB', (ATLAS, ATLAS), (128, 128, 128)); natlas = Image.new('RGB', (max(1, NATLAS), max(1, NATLAS)), (128, 128, 255))
nk = NATLAS / ATLAS
newU = [it['U'].copy() for it in items]
for i, isl in enumerate(islands):
    it = items[isl['item']]; mat = g['materials'][it['mat']]; (x, y) = place[i]; w, h, s = SZ[i]
    tw, th = isl['tex']; x0, y0, x1, y1 = isl['box']
    # 테두리(PAD)까지 덮도록 원본에서 조금 더 넓게 자른다
    mx = PAD / max(s, 1e-6); bx0, by0, bx1, by1 = x0 - mx, y0 - mx, x1 + mx, y1 + mx
    T = it['I'].reshape(-1, 3)[isl['tris']]; poly = (it['U'][T] * [tw, th])
    box = (math.floor(bx0), math.floor(by0), math.ceil(bx1), math.ceil(by1))
    base = tex(mat['pbrMetallicRoughness']['baseColorTexture'])
    piece = bleed_crop(base, poly, box)
    if BEAUTY and isl['head']: piece = beauty(piece, s)
    sx = w / (box[2] - box[0]); sy = h / (box[3] - box[1])
    atlas.paste(piece.resize((w, h), Image.LANCZOS), (x, y))
    if NATLAS and 'normalTexture' in mat and not isl['head']:  # 얼굴 · 머리는 법선 그림 없이(Tripo 법선 그림은 얼굴에 얼룩 · 조각 무늬를 만든다)
        nt = tex(mat['normalTexture']); ntw, nth = nt.size; fx, fy = ntw / tw, nth / th
        nb = (math.floor(box[0] * fx), math.floor(box[1] * fy), math.ceil(box[2] * fx), math.ceil(box[3] * fy))
        npiece = bleed_crop(nt, poly * [fx, fy], nb)
        nw, nh = max(1, round(w * nk)), max(1, round(h * nk))
        natlas.paste(npiece.resize((nw, nh), Image.LANCZOS), (round(x * nk), round(y * nk)))
    uv = it['U'][isl['vs']] * [tw, th]
    newU[isl['item']][isl['vs']] = np.stack([(x + (uv[:, 0] - box[0]) * sx) / ATLAS, (y + (uv[:, 1] - box[1]) * sy) / ATLAS], 1)
for it, u in zip(items, newU): it['U'] = u
def jpeg(im, q): buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True); return buf.getvalue()
base_jpg = jpeg(atlas, 84); norm_jpg = jpeg(natlas, 80) if NATLAS else None
atlas.save(out_path.replace('.glb', '-atlas.jpg'), quality=80)

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
  'asset': {'version': '2.0', 'generator': 'cheonharo-rider-bake (UV islands → atlas)'},
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

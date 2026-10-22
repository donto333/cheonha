# 리깅 없는 T자세 모델(Tripo 부품) → mixamo 뼈대를 맞춰 세우고 가중치를 계산해 스킨 GLB로 저장한다.
# 사용: autorig.py 입력.glb 출력.glb [목표 삼각형 수=0(줄이지 않음)]
# 1) 부품 노드 이동을 정점에 굽는다  2) (선택) meshoptimizer로 부품마다 줄인다
# 3) 몸 치수(키 · 팔 높이 · 손끝 · 다리 사이)로 뼈 위치를 정한다  4) 뼈 구간까지 거리로 가중치(가까운 두 뼈 부드럽게 섞기)
import sys, json, struct, subprocess, os, tempfile
import numpy as np
src, out = sys.argv[1], sys.argv[2]
target_tris = int(sys.argv[3]) if len(sys.argv) > 3 else 0
b = open(src, 'rb').read(); l = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + l]); bs = 20 + l + 8
def acc(i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]; o = bs + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    dt = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}[a['componentType']]; nc = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    stride = bv.get('byteStride')
    arr = np.frombuffer(b[o:o + (a['count'] - 1) * (stride or nc * np.dtype(dt).itemsize) + nc * np.dtype(dt).itemsize], np.uint8)
    if stride and stride != nc * np.dtype(dt).itemsize:
        rows = np.lib.stride_tricks.as_strided(arr, (a['count'], nc * np.dtype(dt).itemsize), (stride, 1))
        return np.ascontiguousarray(rows).view(dt).reshape(-1, nc)
    return np.frombuffer(arr.tobytes(), dt).reshape(-1, nc)
# 노드 월드 이동(이 파일들은 이동만 쓴다)
world = {}
def walk(i, t):
    n = g['nodes'][i]; t = t + np.array(n.get('translation', [0, 0, 0]))
    if 'rotation' in n or 'scale' in n or 'matrix' in n: raise SystemExit('rotation/scale nodes not supported')
    world[i] = t
    for c in n.get('children', []): walk(c, t)
for r in g['scenes'][g.get('scene', 0)]['nodes']: walk(r, np.zeros(3))
parts = []
for ni, n in enumerate(g['nodes']):
    if 'mesh' not in n: continue
    for p in g['meshes'][n['mesh']]['primitives']:
        P = acc(p['attributes']['POSITION']).astype(np.float64) + world[ni]
        N = acc(p['attributes']['NORMAL']).astype(np.float32); U = acc(p['attributes']['TEXCOORD_0']).astype(np.float32)
        I = acc(p['indices']).reshape(-1).astype(np.uint32)
        parts.append(dict(P=P, N=N, U=U, I=I, mat=p['material']))
tris0 = sum(len(p['I']) // 3 for p in parts)
# ── 줄이기(meshoptimizer, node) ──
if target_tris and tris0 > target_tris:
    ratio = target_tris / tris0
    here = os.path.dirname(os.path.abspath(__file__))
    with tempfile.TemporaryDirectory() as tmp:
        for k, p in enumerate(parts):
            p['P'].astype(np.float32).tofile(f'{tmp}/{k}.p'); p['I'].tofile(f'{tmp}/{k}.i')
        subprocess.run(['node', os.path.join(here, 'simplify_raw.mjs'), tmp, str(len(parts)), str(ratio)], check=True)
        for k, p in enumerate(parts):
            I = np.fromfile(f'{tmp}/{k}.o', np.uint32)
            used = np.unique(I); remap = np.full(len(p['P']), 0, np.int64); remap[used] = np.arange(len(used))
            p['P'], p['N'], p['U'], p['I'] = p['P'][used], p['N'][used], p['U'][used], remap[I].astype(np.uint32)
    parts = [p for p in parts if len(p['I'])]
print('tris', tris0, '->', sum(len(p['I']) // 3 for p in parts))
ALL = np.concatenate([p['P'] for p in parts])
# 바닥 0 · 가운데 x=0 · 앞이 +Z(T자세 기준, 정면 = 얼굴 쪽)
lo, hi = ALL.min(0), ALL.max(0); H = hi[1] - lo[1]; cx = (lo[0] + hi[0]) / 2; cz = np.median(ALL[:, 2])
for p in parts: p['P'] = p['P'] - [cx, lo[1], 0]
ALL = np.concatenate([p['P'] for p in parts])
# 팔 높이: 몸통 바깥(|x| > 0.22H) 점들의 높이 중앙값, 손끝: 가장 먼 x
side = ALL[np.abs(ALL[:, 0]) > 0.24 * H]
armY = float(np.median(side[:, 1])) if len(side) else 0.81 * H
tip = float(np.abs(ALL[:, 0]).max())
# 머리 꼭대기(머리 장식 포함 가장 높은 점 → 실제 머리 꼭대기는 그보다 조금 아래)
top = H
Y = lambda r: r * H
SLEEVE = float(os.environ.get('SLEEVE', '0')); DRAPE_SHIN = float(os.environ.get('DRAPE_SHIN', '0.7')); SL0 = float(os.environ.get('SL0', '0.035')); SL1 = float(os.environ.get('SL1', '0.08'))
# 다리 사이 간격: 무릎 높이에서 좌우 점들의 중앙
# 다리 사이 간격: 발목 높이의 가운데 점들(넓은 치맛자락 바깥은 빼고)
feet = ALL[(ALL[:, 1] < 0.06 * H) & (np.abs(ALL[:, 0]) < 0.1 * H) & (np.abs(ALL[:, 0]) > 0.01 * H)]
legX = float(np.median(np.abs(feet[:, 0]))) if len(feet) else 0.05 * H
legX = float(np.clip(legX, 0.035 * H, 0.08 * H))
zc = float(np.median(ALL[(ALL[:, 1] > 0.5 * H) & (ALL[:, 1] < 0.75 * H)][:, 2]))
# 어깨 · 팔(손목은 손끝에서 손 길이만큼 안쪽)
# 어깨 관절: 몸통이 끝나는 x(그 너비 띠의 위아래 폭이 키의 15% 아래로 떨어지는 곳) 바로 안쪽
shX = 0.085 * H
for xx in np.arange(0.05, 0.2, 0.01):
    band = ALL[(ALL[:, 0] > xx * H) & (ALL[:, 0] < (xx + 0.01) * H) & (ALL[:, 1] > 0.55 * H)]
    if len(band) and band[:, 1].max() - band[:, 1].min() < 0.15 * H: shX = max(0.08 * H, (xx - 0.01) * H); break
# 사람 팔 비율(위팔 : 아래팔 : 손 = 0.186 : 0.146 : 0.108)로 팔꿈치 · 손목을 둔다
armLen = tip - shX
handLen = armLen * 0.108 / 0.44
wristX = tip - handLen
elbowX = shX + armLen * 0.186 / 0.44
J = {}
def put(name, x, y, z=zc): J[name] = np.array([x, y, z], np.float64)
put('Hips', 0, Y(0.535)); put('Spine', 0, Y(0.585)); put('Spine1', 0, Y(0.64)); put('Spine2', 0, Y(0.70))
put('Neck', 0, armY + Y(0.035)); put('Head', 0, armY + Y(0.075)); put('HeadTop_End', 0, Y(0.985))
for s, sg in (('Left', 1), ('Right', -1)):
    # mixamo: 왼쪽(Left)은 캐릭터의 왼쪽 = 정면에서 볼 때 +X
    # 팔 마디 높이 · 앞뒤: 그 x의 팔 단면 윗면에서 팔 반지름만큼 아래(늘어진 소매는 무시), 앞뒤는 윗부분의 가운데
    def arm_at(x):
        sl = ALL[(sg * ALL[:, 0] > x - 0.015 * H) & (sg * ALL[:, 0] < x + 0.015 * H) & (ALL[:, 1] > 0.5 * H)]
        if len(sl) < 5: return armY, zc
        topy = sl[:, 1].max(); upper = sl[sl[:, 1] > topy - 0.05 * H]
        return topy - 0.025 * H, (upper[:, 2].max() + upper[:, 2].min()) / 2
    ya, za = arm_at(shX + 0.03 * H); ye, ze = arm_at(elbowX); yw, zw = arm_at(wristX - 0.01 * H)
    put(f'{s}Shoulder', sg * 0.03 * H, ya - Y(0.005), za); put(f'{s}Arm', sg * shX, ya, za); put(f'{s}ForeArm', sg * elbowX, ye, ze); put(f'{s}Hand', sg * wristX, yw, zw); put(f'{s}HandMiddle1', sg * (wristX + handLen * 0.45), yw, zw)
    put(f'{s}UpLeg', sg * legX, Y(0.505)); put(f'{s}Leg', sg * legX, Y(0.275)); put(f'{s}Foot', sg * legX, Y(0.045)); put(f'{s}ToeBase', sg * legX, Y(0.012), zc + 0.06 * H); put(f'{s}Toe_End', sg * legX, Y(0.012), zc + 0.1 * H)
PARENT = {'Spine': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1', 'Neck': 'Spine2', 'Head': 'Neck', 'HeadTop_End': 'Head'}
for s in ('Left', 'Right'):
    PARENT.update({f'{s}Shoulder': 'Spine2', f'{s}Arm': f'{s}Shoulder', f'{s}ForeArm': f'{s}Arm', f'{s}Hand': f'{s}ForeArm', f'{s}HandMiddle1': f'{s}Hand', f'{s}UpLeg': 'Hips', f'{s}Leg': f'{s}UpLeg', f'{s}Foot': f'{s}Leg', f'{s}ToeBase': f'{s}Foot', f'{s}Toe_End': f'{s}ToeBase'})
names = list(J.keys())
idx = {n: i for i, n in enumerate(names)}
# 가중치를 받는 뼈 구간(뼈 → 자식)
SEG = {'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head', 'Head': 'HeadTop_End'}
for s in ('Left', 'Right'):
    SEG.update({f'{s}Shoulder': f'{s}Arm', f'{s}Arm': f'{s}ForeArm', f'{s}ForeArm': f'{s}Hand', f'{s}Hand': f'{s}HandMiddle1', f'{s}UpLeg': f'{s}Leg', f'{s}Leg': f'{s}Foot', f'{s}Foot': f'{s}ToeBase'})
segs = list(SEG.items())
def seg_dist(X, a, c):
    A, C = J[a], J[c]; d = C - A; t = np.clip(((X - A) @ d) / max(d @ d, 1e-12), 0, 1)
    return np.linalg.norm(X - (A + t[:, None] * d), axis=1)
def weights(X):
    Xall = X
    n = len(X); D = np.stack([seg_dist(X, a, c) for a, c in segs], 1)
    side = np.sign(X[:, 0]); ax = np.abs(X[:, 0]); y = X[:, 1]
    for k, (a, c) in enumerate(segs):
        bad = np.zeros(n, bool)
        isArm = any(t in a for t in ('Arm', 'Hand')) or 'Shoulder' in a
        isLeg = any(t in a for t in ('UpLeg', 'Leg', 'Foot'))
        if isArm:
            sg = 1 if a.startswith('Left') else -1
            bad |= side != sg
            bad |= ax < (0.06 * H if 'Shoulder' in a else shX - 0.01 * H)   # 몸통 안쪽은 팔이 아니다
        if isLeg:
            sg = 1 if a.startswith('Left') else -1
            bad |= (side != sg) & (ax > 0.01 * H)
            bad |= y > J['Hips'][1] + 0.01 * H
            # 다리를 감싸지 않는 넓은 치맛자락(다리 축에서 멀리)은 정강이 · 발을 따르지 않는다 → 엉덩이 · 허벅지만
            if a.endswith('Leg') and not a.endswith('UpLeg') or a.endswith('Foot'):
                bad |= D[:, k] > 0.07 * H
        if a in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'):
            bad |= (ax > shX + 0.02 * H) & (np.abs(y - armY) < 0.12 * H)  # 팔 띠
        if a in ('Neck', 'Head'): bad |= y < armY - 0.02 * H
        if a == 'Head': bad |= y < J['Neck'][1] + 0.005 * H
        D[bad, k] = np.inf
    # 머리 위는 통째로 머리
    headOnly = y > J['Head'][1] + 0.01 * H
    order = np.argsort(D, 1)[:, :2]
    d0 = D[np.arange(n), order[:, 0]]; d1 = D[np.arange(n), order[:, 1]]
    # 부드럽게: 가까운 두 뼈를 거리 비로 섞되, 두 번째가 훨씬 멀면 하나만
    w1 = np.where(np.isfinite(d1), np.clip((d0 + 1e-6) / (d0 + d1 + 2e-6) * 2 - 0.2, 0, 0.5), 0)
    w1 = np.where(d1 - d0 > 0.03 * H, 0, w1)
    w0 = 1 - w1
    bone0 = np.array([idx[segs[k][0]] for k in range(len(segs))])[order[:, 0]]
    bone1 = np.array([idx[segs[k][0]] for k in range(len(segs))])[order[:, 1]]
    # 끝까지 찾지 못한 점(모두 inf)은 엉덩이
    lost = ~np.isfinite(d0); bone0[lost] = idx['Hips']; w0[lost] = 1; w1[lost] = 0
    bone0[headOnly] = idx['Head']; w0[headOnly] = 1; w1[headOnly] = 0
    Jw = np.zeros((n, 4), np.uint8); Ww = np.zeros((n, 4), np.float32)
    Jw[:, 0] = bone0; Jw[:, 1] = bone1; Ww[:, 0] = w0; Ww[:, 1] = w1
    # 허리 아래(치마 · 바지 · 도포 자락): 좌우는 x로 부드럽게 나누고, 무릎 위는 허벅지 · 아래는 정강이를 따른다
    # (말에 앉으면 허벅지가 앞으로 눕고 정강이가 늘어지므로 자락이 다리를 따라 말 옆구리로 드리운다)
    hipY = J['Hips'][1]; kneeY = J['LeftLeg'][1]; ankleY = J['LeftFoot'][1]
    low = (y < hipY) & ~((ax > shX + 0.02 * H) & (np.abs(y - armY) < 0.15 * H))
    if low.any():
        X = X[low]; yy = X[:, 1]
        wl = np.clip(0.5 + X[:, 0] / (0.06 * H), 0, 1)          # 왼쪽(+x) 몫
        kneeT = np.clip((kneeY + 0.04 * H - yy) / (0.08 * H), 0, 1)  # 0 = 허벅지, 1 = 정강이
        hipT = np.clip((yy - (hipY - 0.07 * H)) / (0.07 * H), 0, 1)  # 엉덩이 쪽으로 갈수록 엉덩이뼈
        foot = (yy < ankleY + 0.02 * H) & np.array([min(np.linalg.norm(v[[0, 2]] - J['LeftFoot'][[0, 2]]), np.linalg.norm(v[[0, 2]] - J['RightFoot'][[0, 2]])) < 0.05 * H for v in X])
        L = {k: idx[f'Left{k}'] for k in ('UpLeg', 'Leg', 'Foot')}; R = {k: idx[f'Right{k}'] for k in ('UpLeg', 'Leg', 'Foot')}
        m = len(X); jj = np.zeros((m, 4), np.uint8); ww = np.zeros((m, 4), np.float32)
        seg = np.where(foot, 2, 0)
        chain = lambda side, t: np.where(foot, side['Foot'], np.where(t > 0.5, side['Leg'], side['UpLeg']))
        jj[:, 0] = chain(L, kneeT); jj[:, 1] = chain(R, kneeT); jj[:, 2] = idx['Hips']
        # 다리에서 멀리 퍼진 자락(뒤로 끌리는 옷자락 · 넓은 치맛단)은 엉덩이에 매달려 아래로 드리운다(다리를 따라 돌면 날개처럼 뻗는다)
        dleg = np.minimum(seg_dist(X, 'LeftUpLeg', 'LeftFoot'), seg_dist(X, 'RightUpLeg', 'RightFoot'))
        drape = np.clip((dleg - 0.06 * H) / (0.06 * H), 0, 1) * np.clip((kneeY + 0.06 * H - yy) / (0.1 * H), 0, 1)
        # 말 위에서 엉덩이에 매단 자락은 서 있을 때 길이 그대로 곧게 내려가 말 배 아래로 빠진다 → DRAPE_SHIN 몫은 정강이를 따르게(무릎에서 말 옆구리로 드리운다)
        hipT = np.maximum(hipT, drape * (1 - DRAPE_SHIN))
        lw = wl * (1 - hipT); rw = (1 - wl) * (1 - hipT)
        ww[:, 0] = lw; ww[:, 1] = rw; ww[:, 2] = hipT
        Jw[low] = jj; Ww[low] = ww
    # 팔: 가장 가까운 뼈 구간으로 고르면 아래팔 중간에 위팔 · 손 가중치가 섞여 지그재그로 꺾인다
    # → 팔 띠(어깨 바깥)는 x(어깨 → 손끝 거리)만으로 정한다: 팔꿈치 한 곳에서 부드럽게 굽고, 손목은 조금만(손가락 뼈가 없어 손이 통째로 꺾이므로)
    ss = lambda t: t * t * (3 - 2 * t)
    for s_, sg in (('Left', 1), ('Right', -1)):
        ar, fa, hd = idx[f'{s_}Arm'], idx[f'{s_}ForeArm'], idx[f'{s_}Hand']
        arm_ids = [ar, fa, hd, idx[f'{s_}HandMiddle1']]
        sel = np.isin(Jw[:, 0], arm_ids) & ~low & (side == sg) & (ax > shX + 0.015 * H)
        if not sel.any(): continue
        u = ax[sel]
        e = ss(np.clip((u - (elbowX - 0.03 * H)) / (0.06 * H), 0, 1))
        h = 0.2 * ss(np.clip((u - (wristX - 0.01 * H)) / (0.04 * H), 0, 1))
        Jw[sel, 0] = ar; Jw[sel, 1] = fa; Jw[sel, 2] = hd; Jw[sel, 3] = 0
        Ww[sel, 0] = 1 - e; Ww[sel, 1] = np.maximum(e - h, 0); Ww[sel, 2] = h; Ww[sel, 3] = 0
        # 넓은 소매 자락: T자세에서 팔 아래로 늘어진 천은 팔을 내리면 통째로 돌아 옆으로 날개처럼 뻗친다
        # → 팔 줄기에서 멀리 늘어진 만큼 몸통(Spine2)을 따르게 해 팔을 내려도 몸 옆으로 드리운다
        X0 = Xall[sel]
        ax_pts = np.array([J[f'{s_}Arm'], J[f'{s_}ForeArm'], J[f'{s_}Hand'], J[f'{s_}HandMiddle1']])
        xs = np.abs(ax_pts[:, 0]); order = np.argsort(xs)
        ay = np.interp(u, xs[order], ax_pts[order, 1]); az = np.interp(u, xs[order], ax_pts[order, 2])
        dist = np.hypot(X0[:, 1] - ay, X0[:, 2] - az)
        sl = SLEEVE * np.clip((dist - SL0 * H) / (SL1 * H), 0, 1)
        Ww[sel, :3] *= (1 - sl)[:, None]; Jw[sel, 3] = idx['Spine2']; Ww[sel, 3] = sl
        if os.environ.get('DBG'): print(s_, sel.sum(), 'sl>0.3', int((sl > 0.3).sum()), 'dist max', round(float(dist.max() / H), 3))
    return Jw, Ww
# ── GLB 쓰기 ──
chunks = []; views = []; accs = []
def add(data, target=None):
    o = sum(len(c) for c in chunks); pad = (-o) % 4
    if pad: chunks.append(b'\0' * pad); o += pad
    chunks.append(data); v = {'buffer': 0, 'byteOffset': o, 'byteLength': len(data)}
    if target: v['target'] = target
    views.append(v); return len(views) - 1
def accw(arr, ctype, typ, mm=False, normalized=False):
    a = {'bufferView': add(arr.tobytes(), 34963 if typ == 'SCALAR' and ctype in (5123, 5125) else (34962 if typ != 'MAT4' else None)), 'componentType': ctype, 'count': len(arr), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    if normalized: a['normalized'] = True
    accs.append(a); return len(accs) - 1
nodes = []
# 뼈 노드(앞에), 이름은 mixamorig:
for nm in names:
    par = PARENT.get(nm); t = J[nm] - (J[par] if par else 0)
    nodes.append({'name': 'mixamorig:' + nm, 'translation': t.tolist()})
for nm in names:
    kids = [idx[c] for c, p in PARENT.items() if p == nm]
    if kids: nodes[idx[nm]]['children'] = kids
ibm = np.stack([np.linalg.inv(np.array([[1, 0, 0, J[n][0]], [0, 1, 0, J[n][1]], [0, 0, 1, J[n][2]], [0, 0, 0, 1]])).T.reshape(-1) for n in names]).astype(np.float32)
skin = {'joints': list(range(len(names))), 'inverseBindMatrices': accw(ibm, 5126, 'MAT4'), 'skeleton': idx['Hips']}
# 재질 · 텍스처 · 이미지는 원본 그대로 옮긴다
img_out = []
for im in g['images']:
    bv = g['bufferViews'][im['bufferView']]; o = bs + bv.get('byteOffset', 0)
    img_out.append({'bufferView': add(b[o:o + bv['byteLength']]), 'mimeType': im.get('mimeType', 'image/jpeg')})
meshes = []; meshnodes = []
for p in parts:
    Jw, Ww = weights(p['P'])
    attrs = {'POSITION': accw(p['P'].astype(np.float32), 5126, 'VEC3', mm=True), 'NORMAL': accw(p['N'], 5126, 'VEC3'), 'TEXCOORD_0': accw(p['U'], 5126, 'VEC2'), 'JOINTS_0': accw(Jw, 5121, 'VEC4'), 'WEIGHTS_0': accw(Ww, 5126, 'VEC4')}
    meshes.append({'primitives': [{'attributes': attrs, 'indices': accw(p['I'].astype(np.uint32), 5125, 'SCALAR'), 'material': p['mat']}]})
    meshnodes.append(len(nodes)); nodes.append({'name': f'part_{len(meshes) - 1}', 'mesh': len(meshes) - 1, 'skin': 0})
mats = []
for m in g['materials']:
    m = {k: v for k, v in m.items() if k != 'extensions'}; mats.append(m)
binary = b''.join(chunks); binary += b'\0' * ((-len(binary)) % 4)
gl = {'asset': {'version': '2.0', 'generator': 'cheonharo autorig'}, 'scene': 0, 'scenes': [{'nodes': [idx['Hips']] + meshnodes}], 'nodes': nodes, 'skins': [skin], 'meshes': meshes,
      'materials': mats, 'textures': g['textures'], 'images': img_out, 'samplers': g.get('samplers', [{}]), 'buffers': [{'byteLength': len(binary)}], 'bufferViews': views, 'accessors': accs}
js = json.dumps(gl, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
open(out, 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binary)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binary), 0x004E4942) + binary)
print(out, 'shX', round(shX / H, 3), 'elbow', round(elbowX / H, 3), 'wrist', round(wristX / H, 3), 'H', round(H, 3), 'armY', round(armY / H, 3), 'tip', round(tip / H, 3), 'legX', round(legX / H, 3), len(parts), 'parts')

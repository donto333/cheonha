"""무장 초상화 화질 개선: 얼굴(GFPGAN 1.4) 복원 + 전체(Real-ESRGAN x4) 재구성.

python3 restore.py <입력 폴더> <출력 폴더> <이름...>
"""
import os
import sys

import cv2
import numpy as np
import onnxruntime as ort

M = os.path.join(os.path.dirname(__file__), 'models')
opts = ort.SessionOptions()
opts.intra_op_num_threads = os.cpu_count() or 2
prov = ['CPUExecutionProvider']
det = ort.InferenceSession(f'{M}/retinaface_10g.onnx', opts, providers=prov)
gfp = ort.InferenceSession(f'{M}/gfpgan_1.4.onnx', opts, providers=prov)
esr = ort.InferenceSession(f'{M}/real_esrgan_x4.onnx', opts, providers=prov) if os.environ.get('ESR', '1') == '1' else None

FFHQ = np.array([[0.37691676, 0.46864664], [0.62285697, 0.46912813], [0.50123859, 0.61331904], [0.39308822, 0.72541100], [0.61150205, 0.72490465]], np.float32)


def detect(img):
    h, w = img.shape[:2]
    s = 640 / max(h, w)
    pad = np.zeros((640, 640, 3), np.float32)
    small = cv2.resize(img, (int(w * s), int(h * s)))
    pad[:small.shape[0], :small.shape[1]] = small
    x = ((pad - 127.5) / 128.0).transpose(2, 0, 1)[None].astype(np.float32)
    out = det.run(None, {det.get_inputs()[0].name: x})
    best = None
    for i, st in enumerate([8, 16, 32]):
        n = 640 // st
        yy, xx = np.mgrid[:n, :n]
        anc = np.stack([xx, yy], -1).reshape(-1, 2).repeat(2, 0) * st
        sc = out[i].reshape(-1)
        bb = out[i + 3].reshape(-1, 4) * st
        kp = out[i + 6].reshape(-1, 5, 2) * st
        for j in np.where(sc > 0.5)[0]:
            box = np.array([anc[j, 0] - bb[j, 0], anc[j, 1] - bb[j, 1], anc[j, 0] + bb[j, 2], anc[j, 1] + bb[j, 3]]) / s
            area = (box[2] - box[0]) * (box[3] - box[1])
            if best is None or area * sc[j] > best[0]:
                best = (area * sc[j], box, (anc[j][None] + kp[j]) / s, sc[j])
    return best


def esrgan(img):
    """전체 그림: 1/2로 줄여 4배로 키운 뒤 원래 크기로(뭉개진 결을 새 결로 다시 그림)"""
    h, w = img.shape[:2]
    small = cv2.resize(img, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    x = (small[:, :, ::-1] / 255.0).transpose(2, 0, 1)[None].astype(np.float32)
    tiles = []
    out = np.zeros((1, 3, x.shape[2] * 4, x.shape[3] * 4), np.float32)
    T, P = 160, 12
    for y0 in range(0, x.shape[2], T):
        for x0 in range(0, x.shape[3], T):
            ya, xa = max(0, y0 - P), max(0, x0 - P)
            yb, xb = min(x.shape[2], y0 + T + P), min(x.shape[3], x0 + T + P)
            r = esr.run(None, {esr.get_inputs()[0].name: x[:, :, ya:yb, xa:xb]})[0]
            oy, ox = (y0 - ya) * 4, (x0 - xa) * 4
            hh, ww = min(T, x.shape[2] - y0) * 4, min(T, x.shape[3] - x0) * 4
            out[:, :, y0 * 4:y0 * 4 + hh, x0 * 4:x0 * 4 + ww] = r[:, :, oy:oy + hh, ox:ox + ww]
    up = (np.clip(out[0].transpose(1, 2, 0), 0, 1) * 255)[:, :, ::-1]
    up = cv2.resize(up, (w, h), interpolation=cv2.INTER_AREA)
    # 원본 색 · 분위기를 지키려고 25%는 원본을 섞는다
    return up * 0.75 + img * 0.25


def face(img, kps, strength=0.85):
    S = 512
    mat, _ = cv2.estimateAffinePartial2D(kps.astype(np.float32), FFHQ * S, method=cv2.LMEDS)
    crop = cv2.warpAffine(img, mat, (S, S), borderMode=cv2.BORDER_REPLICATE)
    x = ((crop[:, :, ::-1] / 255.0 - 0.5) / 0.5).transpose(2, 0, 1)[None].astype(np.float32)
    r = gfp.run(None, {gfp.get_inputs()[0].name: x})[0][0]
    r = ((np.clip(r, -1, 1) + 1) / 2 * 255).transpose(1, 2, 0)[:, :, ::-1]
    # 얼굴 생김새가 너무 바뀌지 않게 원본 일부를 섞는다
    r = r * strength + crop * (1 - strength)
    mask = np.zeros((S, S), np.float32)
    cv2.ellipse(mask, (S // 2, int(S * 0.56)), (int(S * 0.36), int(S * 0.44)), 0, 0, 360, 1, -1)
    mask = cv2.GaussianBlur(mask, (0, 0), S * 0.05)
    inv = cv2.invertAffineTransform(mat)
    h, w = img.shape[:2]
    back = cv2.warpAffine(r, inv, (w, h), flags=cv2.INTER_CUBIC)
    m = cv2.warpAffine(mask, inv, (w, h))[:, :, None]
    return img * (1 - m) + back * m


def finish(img):
    # 뭉개진 결을 살짝 세우고(언샤프) 아주 고운 필름 결을 얹어 플라스틱 느낌을 덜어낸다
    blur = cv2.GaussianBlur(img, (0, 0), 1.6)
    img = img + (img - blur) * 0.55
    rng = np.random.default_rng(7)
    g = cv2.GaussianBlur(rng.normal(0, 1, img.shape[:2]).astype(np.float32), (0, 0), 0.6)
    return img + g[:, :, None] * 3.2


def main():
    src, dst, names = sys.argv[1], sys.argv[2], sys.argv[3:]
    os.makedirs(dst, exist_ok=True)
    for n in names:
        img = cv2.imread(os.path.join(src, n), cv2.IMREAD_COLOR).astype(np.float32)
        d = detect(img)
        out = esrgan(img) if esr is not None else img
        note = 'no face'
        if d is not None:
            out = face(out, d[2])
            note = f'face {d[3]:.2f} w{int(d[1][2] - d[1][0])}'
        out = finish(out)
        cv2.imwrite(os.path.join(dst, os.path.splitext(n)[0] + '.png'), np.clip(out, 0, 255).astype(np.uint8))
        print(n, note, flush=True)


main()

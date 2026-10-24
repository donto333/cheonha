# border-image 9칸 그림의 이음새(가는 줄)를 없애려고, 같은 그림을 조각내 배경 층으로 깔아 둔다(1px 겹침).
import re, os, sys
from PIL import Image
ROOT = __import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..'))
CSS = f'{ROOT}/src/styles/design-v2.css'
OUTDIR = f'{ROOT}/public/assets/ui/v2/slice'
os.makedirs(OUTDIR, exist_ok=True)

SOURCE_ONLY_SLICE = {  # 이 그림이 '그림만 바꾸는' 규칙에서 쓸 때의 자르기 값(바탕 규칙과 같음)
  '/assets/ui/v2/kit/btn-gold.webp': '20', '/assets/ui/v2/kit/tab-red.webp': '20 30', '/assets/ui/v2/kit/stage-box-on.webp': '40',
  '/assets/ui/v2/kit/stage-box.webp': '40', '/assets/ui/v2/kit/cell-gold.webp': '16', '/assets/ui/v2/kit/cell-line.webp': '16',
  '/assets/ui/v2/research/plate-on.webp': '20 24', '/assets/ui/v2/research/card-on.webp': '40', '/assets/ui/v2/research/card-done.webp': '40',
  '/assets/ui/v2/research/card-lock.webp': '40', '/assets/ui/v2/shop/btn-gray.webp': '24 40',
  '/assets/ui/v2/lobby/chip-gold.webp': '0 150 0 185', '/assets/ui/v2/lobby/chip-honor.webp': '0 150 0 185', '/assets/ui/v2/lobby/chip-silver.webp': '0 150 0 185',
}

def four(vals):
    v = vals
    if len(v) == 1: v = v * 4
    elif len(v) == 2: v = [v[0], v[1], v[0], v[1]]
    elif len(v) == 3: v = [v[0], v[1], v[2], v[1]]
    return v  # t r b l

def tokens(s):
    out, depth, cur = [], 0, ''
    for ch in s.strip():
        if ch == '(': depth += 1
        if ch == ')': depth -= 1
        if ch.isspace() and depth == 0:
            if cur: out.append(cur); cur = ''
        else: cur += ch
    if cur: out.append(cur)
    return out

PIECES = ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r', 'c']
CACHE={}
def cut(src, slice_s, fill):
    k=(src,slice_s,fill)
    if k in CACHE: return CACHE[k]
    CACHE[k]=_cut(src,slice_s,fill); return CACHE[k]
def _cut(src, slice_s, fill):
    t, r, b, l = [int(x) for x in four(slice_s.split())]
    im = Image.open(ROOT + '/public' + src).convert('RGBA'); W, H = im.size
    boxes = {'tl': (0, 0, l, t), 'tr': (W - r, 0, W, t), 'bl': (0, H - b, l, H), 'br': (W - r, H - b, W, H),
             't': (l, 0, W - r, t), 'b': (l, H - b, W - r, H), 'l': (0, t, l, H - b), 'r': (W - r, t, W, H - b), 'c': (l, t, W - r, H - b)}
    name = os.path.splitext(src.split('/assets/ui/v2/')[1])[0].replace('/', '-') + '-' + '_'.join(map(str, (t, r, b, l)))
    urls = {}
    for key in PIECES:
        if key == 'c' and not fill: continue
        x0, y0, x1, y1 = boxes[key]
        if x1 - x0 <= 0 or y1 - y0 <= 0: continue
        path = f'{OUTDIR}/{name}-{key}.webp'
        im.crop(boxes[key]).save(path, 'WEBP', quality=88, method=4)
        urls[key] = f"url('/assets/ui/v2/slice/{name}-{key}.webp')"
    return urls

def layers(urls, w):
    T, R, B, L = w
    pos = {'tl': '0 0', 'tr': '100% 0', 'bl': '0 100%', 'br': '100% 100%',
           't': f'calc({L} - 1px) 0', 'b': f'calc({L} - 1px) 100%', 'l': f'0 calc({T} - 1px)', 'r': f'100% calc({T} - 1px)', 'c': f'calc({L} - 1px) calc({T} - 1px)'}
    mw, mh = f'calc(100% - {L} - {R} + 2px)', f'calc(100% - {T} - {B} + 2px)'
    size = {'tl': f'{L} {T}', 'tr': f'{R} {T}', 'bl': f'{L} {B}', 'br': f'{R} {B}', 't': f'{mw} {T}', 'b': f'{mw} {B}', 'l': f'{L} {mh}', 'r': f'{R} {mh}', 'c': f'{mw} {mh}'}
    keys = [k for k in PIECES if k in urls]
    return keys, ', '.join(urls[k] for k in keys), ', '.join(pos[k] for k in keys), ', '.join(size[k] for k in keys)

css = open(CSS).read()
MARK = '/* 9칸 이음새 메움 */'
def border_width(body):
    m = re.search(r'border-width:\s*([^;]+);', body)
    if m: return four(tokens(m.group(1)))
    m = re.search(r'border:\s*(\d+(?:\.\d+)?px)\s+solid', body)
    if m: return [m.group(1)] * 4
    return None

done = []
def fix(m):
    sel, body = m.group(1), m.group(2)
    if MARK in body or 'border-image' not in body: return m.group(0)
    if re.search(r'border-image:\s*none', body):
        return m.group(0).rstrip('}').rstrip() + f' {MARK} background-image: none; }}'
    src = slice_s = width_s = None; fill = False
    sh = re.search(r"border-image:\s*url\('([^']+)'\)\s*([^;]+);", body)
    if sh:
        src = sh.group(1); parts = [p.strip() for p in sh.group(2).split('/')]
        sl = parts[0]; fill = 'fill' in sl; slice_s = sl.replace('fill', '').strip()
        width_s = parts[1] if len(parts) > 1 else None
    else:
        ms = re.search(r"border-image-source:\s*url\('([^']+)'\)", body)
        if ms: src = ms.group(1)
        msl = re.search(r'border-image-slice:\s*([^;]+);', body)
        if msl: fill = 'fill' in msl.group(1); slice_s = msl.group(1).replace('fill', '').strip()
        mw = re.search(r'border-image-width:\s*([^;]+);', body)
        if mw: width_s = mw.group(1)
    add = ''
    if src and slice_s is None:  # 그림만 바꾸는 규칙
        urls = cut(src, SOURCE_ONLY_SLICE[src], True)
        keys = [k for k in PIECES if k in urls]
        add = f"background-image: {', '.join(urls[k] for k in keys)};"
    elif slice_s is not None and src:
        if width_s:
            ws = four(tokens(width_s))
            bw = border_width(body)
            ws = [bw[i] if re.fullmatch(r'\d+(\.\d+)?', x) else x for i, x in enumerate(ws)]
        else:
            ws = border_width(body)
        ws = ['0px' if x == '0' else x for x in ws]
        urls = cut(src, slice_s, fill)
        keys, imgs, pos, size = layers(urls, ws)
        add = f"background-image: {imgs}; background-position: {pos}; background-size: {size}; background-repeat: no-repeat; background-origin: border-box; background-clip: border-box;"
    elif slice_s is not None and 'var(--chip)' in body:  # 본영 재화 칩: 그림은 --chip-* 규칙에서
        ws = ['0px' if x == '0' else x for x in four(tokens(width_s))]
        urls = cut('/assets/ui/v2/lobby/chip-gold.webp', slice_s, fill)
        keys, imgs, pos, size = layers(urls, ws)
        add = f"background-position: {pos}; background-size: {size}; background-repeat: no-repeat; background-origin: border-box; background-clip: border-box;"
    else:
        return m.group(0)
    done.append(sel.strip().split('\n')[-1][:80])
    return m.group(0).rstrip('}').rstrip() + f' {MARK} {add} }}'

css = re.sub(r'([^{}]+)\{([^{}]*)\}', fix, css)
# 본영 재화 칩: --chip 그림에 맞는 조각을 배경으로
def chip(m):
    name = m.group(2)
    urls = cut(f'/assets/ui/v2/lobby/{name}.webp', '0 150 0 185', True)
    keys = [k for k in PIECES if k in urls]
    return m.group(0).rstrip('}').rstrip() + f" {MARK} background-image: {', '.join(urls[k] for k in keys)}; }}"
css = re.sub(r"(html body \.v2-res--\w+ \{ --chip: url\('/assets/ui/v2/lobby/(chip-\w+)\.webp'\); )\}", lambda m: chip(m) if MARK not in m.group(0) else m.group(0), css)
open(CSS, 'w').write(css)
print(len(done), 'rules'); print('\n'.join(done))

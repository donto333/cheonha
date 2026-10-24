// 접속(로그인) 화면 · 2026.10.24 도안(1844 × 853) — 그림: public/assets/login/v3/
// 도안 좌표 그대로 1844 × 853 무대에 놓고, 화면에 맞게 통째로 줄인다(StrategyUI.fitAccessGate).
// 휴대폰에서는 글자가 너무 작아지므로 로그인 패널 · 아래 단추만 한 번 더 키운다(--k).
import { assetUrl } from '../asset-url'
import { isEnglish } from '../i18n/lang'

const A = (name: string) => assetUrl(`/assets/login/v3/${name}`)

/** 그림 원본 크기와 실제 그림이 있는 영역[left, top, right, bottom](투명 여백 제외) */
const ART: Record<string, { file: string; size: [number, number]; vb: [number, number, number, number] }> = {
  background: { file: 'background.webp', size: [1844, 853], vb: [0, 0, 1844, 853] },
  cao_cao: { file: 'cao_cao.webp', size: [1320, 1192], vb: [0, 4, 1320, 1192] },
  guan_yu: { file: 'guan_yu.webp', size: [1334, 1179], vb: [0, 0, 1334, 1179] },
  lu_bu: { file: 'lu_bu.webp', size: [1402, 1122], vb: [0, 5, 1402, 1122] },
  vignette: { file: 'vignette.webp', size: [1844, 853], vb: [0, 0, 1844, 853] },
  title: { file: 'title.webp', size: [2135, 736], vb: [26, 51, 2113, 701] },
  divider: { file: 'divider.webp', size: [1983, 793], vb: [84, 347, 1888, 442] },
  panel_shadow: { file: 'panel_shadow.webp', size: [1000, 500], vb: [63, 30, 937, 470] },
  panel: { file: 'panel.webp', size: [1922, 818], vb: [49, 81, 1874, 736] },
  heading_underline: { file: 'heading_underline.webp', size: [410, 8], vb: [0, 3, 390, 5] },
  input: { file: 'input.webp', size: [2070, 760], vb: [19, 275, 2051, 454] },
  checkbox_off: { file: 'checkbox_off.webp', size: [32, 32], vb: [1, 1, 31, 31] },
  checkbox_on: { file: 'checkbox_on.webp', size: [32, 32], vb: [1, 1, 31, 31] },
  button_red: { file: 'button_red.webp', size: [2025, 777], vb: [30, 178, 1996, 579] },
  button_gold: { file: 'button_gold.webp', size: [2107, 746], vb: [61, 173, 2041, 558] },
  button_dark: { file: 'button_dark.webp', size: [2012, 782], vb: [25, 242, 1987, 504] },
  footer_pill: { file: 'footer_pill.webp', size: [220, 64], vb: [0, 0, 220, 64] },
}

const box = (x: number, y: number, w: number, h: number) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`
/** 보이는 영역이 (x, y, w, h)에 오도록 투명 여백까지 포함한 그림을 놓는다 */
function img(id: string, x: number, y: number, w: number, h: number, cls = ''): string {
  const a = ART[id]
  const [l, t, r, b] = a.vb
  const sx = w / (r - l), sy = h / (b - t)
  return `<img class="lg-img ${cls}" src="${A(a.file)}" alt="" draggable="false" decoding="async" style="${box(x - l * sx, y - t * sy, a.size[0] * sx, a.size[1] * sy)}">`
}
const icon = (name: string, x: number, y: number, s: number) => `<img class="lg-ico" src="${A(`${name}.svg`)}" alt="" draggable="false" style="${box(x, y, s, s)}">`

export interface LoginGateOptions {
  offline: boolean
  savedId: string
}

/** 접속 화면 HTML. 단추는 data-action으로 StrategyUI가 처리한다 */
export function loginGateHtml(options: LoginGateOptions): string {
  const { offline, savedId } = options
  const esc = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch)
  // 패널 묶음(도안 좌표 855,337 · 989 × 449)의 안쪽 좌표
  const P = (x: number, y: number) => [x - 855, y - 337] as const
  const pi = (id: string, x: number, y: number, w: number, h: number, cls = '') => { const [px, py] = P(x, y); return img(id, px, py, w, h, cls) }
  const pIcon = (name: string, x: number, y: number, s: number) => { const [px, py] = P(x, y); return icon(name, px, py, s) }
  const pBox = (x: number, y: number, w: number, h: number) => { const [px, py] = P(x, y); return box(px, py, w, h) }
  const social = (id: 'google' | 'apple' | 'steam', label: string, y: number) =>
    `<button type="button" class="lg-btn lg-btn--social" data-action="login-soon" data-label="${label}" style="${pBox(1406, y, 377, 49)}">${img('button_dark', 0, 0, 377, 49)}${icon(id, 22, 9, 31)}<span>${label}</span></button>`
  const panel = `<div class="lg-panel" style="${box(855, 337, 989, 449)}">
    ${pi('panel_shadow', 855, 337, 989, 449)}${pi('panel', 883, 359, 931, 400)}
    ${pIcon('user', 1014, 376, 29)}<b class="lg-text lg-head" style="${pBox(1053, 372, 152, 39)}">회원 로그인</b>
    ${pIcon('helmet', 1490, 376, 29)}<b class="lg-text lg-head lg-head--guest" style="${pBox(1530, 372, 165, 39)}">게스트 로그인</b>
    ${pi('heading_underline', 884, 412, 463, 3)}
    <form class="lg-form" data-login-form autocomplete="on" novalidate>
      <label class="lg-text lg-label" style="${pBox(932, 423, 120, 28)}" for="lg-id">아이디</label>
      ${pi('input', 928, 453, 402, 46)}${pIcon('user', 941, 463, 26)}
      <input id="lg-id" class="lg-input" name="name" maxlength="12" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="아이디를 입력하세요." value="${esc(savedId)}" style="${pBox(984, 453, 332, 46)}" ${offline ? 'disabled' : ''}>
      <label class="lg-text lg-label" style="${pBox(932, 510, 140, 28)}" for="lg-pw">비밀번호</label>
      ${pi('input', 928, 540, 402, 46)}${pIcon('lock', 941, 550, 26)}
      <input id="lg-pw" class="lg-input" name="password" type="password" maxlength="64" autocomplete="current-password" placeholder="비밀번호를 입력하세요." style="${pBox(984, 540, 294, 46)}" ${offline ? 'disabled' : ''}>
      <button type="button" class="lg-btn lg-eye" data-action="login-eye" aria-label="비밀번호 보기" aria-pressed="false" style="${pBox(1284, 546, 34, 34)}">${icon('eye', 3, 3, 28)}</button>
      <button type="button" class="lg-btn lg-check" data-action="login-remember" role="checkbox" aria-checked="${savedId ? 'true' : 'false'}" style="${pBox(928, 604, 150, 32)}">${img(savedId ? 'checkbox_on' : 'checkbox_off', 4, 4, 25, 25, 'lg-check__box')}<span>아이디 저장</span></button>
      <span class="lg-links" style="${pBox(1100, 604, 238, 32)}"><button type="button" class="lg-link" data-action="login-signup">회원가입</button><i>|</i><button type="button" class="lg-link" data-action="login-find">비밀번호 찾기</button></span>
      <button type="submit" class="lg-btn lg-btn--login" style="${pBox(928, 656, 401, 74)}" ${offline ? 'disabled' : ''}>${img('button_red', 0, 0, 401, 74)}<span>로그인</span></button>
      <small class="lg-status" role="alert" style="${pBox(928, 730, 402, 26)}">${offline ? '서버에 연결할 수 없어 회원 로그인을 쓸 수 없습니다 · 게스트로 시작할 수 있습니다' : ''}</small>
    </form>
    <p class="lg-text lg-guest-desc" style="${pBox(1396, 425, 397, 56)}">아이디만 정하고 바로 시작합니다.<br>${offline ? '지금은 이 기기에만 저장됩니다.' : '서버에 저장되는 모든 콘텐츠를 이용할 수 있습니다.'}</p>
    <button type="button" class="lg-btn lg-btn--guest" data-action="guest-login" style="${pBox(1406, 495, 377, 63)}">${img('button_gold', 0, 0, 377, 63)}<span>게스트로 시작</span>${icon('chevron_right', 329, 19, 25)}</button>
    ${social('google', 'Google로 로그인', 570)}${social('apple', 'Apple로 로그인', 628)}${social('steam', 'Steam으로 로그인', 686)}
  </div>`
  const footLeft = `<div class="lg-foot lg-foot--left" style="${box(39, 773, 342, 49)}">
    <button type="button" class="lg-btn lg-pill" data-action="login-lang" style="${box(0, 0, 166, 49)}">${img('footer_pill', 0, 0, 166, 49)}${icon('globe', 18, 11, 27)}<span>${isEnglish() ? 'English' : '한국어'}</span>${icon('chevron_down', 129, 16, 18)}</button>
    <button type="button" class="lg-btn lg-pill" data-action="login-settings" style="${box(177, 0, 165, 49)}">${img('footer_pill', 0, 0, 165, 49)}${icon('gear', 20, 11, 27)}<span>환경 설정</span></button>
  </div>`
  const footRight = `<nav class="lg-foot lg-foot--right" style="${box(1440, 775, 374, 39)}"><button type="button" class="lg-link" data-action="login-info" data-info="terms">이용약관</button><i>|</i><button type="button" class="lg-link" data-action="login-info" data-info="privacy">개인정보처리방침</button><i>|</i><button type="button" class="lg-link" data-action="login-info" data-info="support">고객센터</button></nav>`
  return `<section class="access-gate login-gate"><div class="login-gate__fill" style="background-image:url('${A('background.webp')}')"></div><div class="login-gate__stage">
    ${img('background', 0, 0, 1844, 853)}
    ${img('cao_cao', 430, 175, 660, 594, 'lg-art')}${img('guan_yu', -425, 111, 900, 795, 'lg-art')}${img('lu_bu', -105, 30, 1100, 876, 'lg-art')}
    ${img('vignette', 0, 0, 1844, 853, 'lg-vignette')}
    ${img('title', 1008, 74, 739, 180, 'lg-title')}
    <p class="lg-text lg-subtitle" style="${box(1090, 250, 560, 66)}">무장을 모으고, 진형을 지휘하고,<br>당신의 이름을 천하에 새기십시오.</p>
    ${img('divider', 1052, 327, 650, 19, 'lg-divider')}
    ${panel}${footLeft}${footRight}
  </div></section>`
}

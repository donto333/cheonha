// 모델 · 의상 · 소리 파일의 내용 해시를 src/asset-versions.json에 적는다(빌드 전에 실행).
// 게임은 이 해시를 주소 뒤에 붙여(?v=…) 파일을 고쳐 올려도 CDN · 브라우저가 옛 파일을 내주지 않게 한다.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = 'public/assets', out = {}
const walk = dir => {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(glb|jpg|png|mp3|webp|mp4|webm)$/i.test(name)) out['/assets/' + relative(root, path).split('\\').join('/')] = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 10)
  }
}
walk(join(root, 'models')); walk(join(root, 'sfx')); walk(join(root, 'music')); walk(join(root, 'generals-realistic-webp')); walk(join(root, 'ui', 'v2'))
writeFileSync('src/asset-versions.json', JSON.stringify(out, null, 1) + '\n')
console.log(`자산 해시: ${Object.keys(out).length}개`)

// 처음 불러오기 화면(src/ui/loader.ts)이 미리 받아 둘 그림 목록
//  critical: 로그인 화면 · 화면 틀(그림) · 얼굴 · 재화 · 장비 — 다 받아야 로그인 화면으로 넘어간다
//  background: 무장 초상 · 영토 · 전장 · 효과음 — 로그인 화면에 있는 동안 이어서 받는다
const files = dir => { const list = []; const go = d => { for (const name of readdirSync(d).sort()) { const p = join(d, name); if (statSync(p).isDirectory()) go(p); else list.push('/assets/' + relative(root, p).split('\\').join('/')) } }; try { go(join(root, dir)) } catch { /* 없는 폴더 */ } return list }
const image = p => /\.(webp|png|jpg|svg)$/i.test(p)
// 본영 · 상단 바 · 무장 칸 · 출석 체크처럼 들어가자마자 보이는 화면 그림은 필수, 메뉴 안쪽 그림은 이어서
const first = p => !/^\/assets\/ui\/v2\//.test(p) || /^\/assets\/ui\/v2\/(kit|lobby|icons|attendance)\//.test(p)
const uiAll = files('ui').filter(image)
const critical = [...files('login'), ...uiAll.filter(first), ...files('faces'), ...files('currency'), ...files('equipment')].filter(image)
const background = [...uiAll.filter(p => !first(p)), ...files('generals-realistic-webp'), ...files('territory'), ...files('battlefield'), ...files('generals')].filter(image).concat(files('sfx').filter(p => /\.mp3$/i.test(p)))
writeFileSync('src/preload-manifest.json', JSON.stringify({ critical, background }) + '\n')
console.log(`미리 받을 그림: 필수 ${critical.length}개 · 이어서 ${background.length}개`)

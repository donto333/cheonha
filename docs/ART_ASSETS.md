# 새 디자인 그림 목록 (2026.10)

게임 화면은 그림 없이도 동작하도록 이미 만들어져 있습니다. 아래 파일을 **정해진 이름 그대로** `public/assets/ui/v2/`에 넣으면, 다음 배포부터 그 그림으로 자동으로 바뀝니다. 파일이 없으면 지금 그림(관문 배경 · 금빛 선 아이콘)이 그대로 나옵니다.

- 넣는 곳: `public/assets/ui/v2/` (아이콘은 `public/assets/ui/v2/icons/`)
- 아이콘은 **배경이 투명한 PNG**, 큰 그림은 **WebP**(없으면 PNG를 WebP로 바꿔 드립니다)
- 크기는 최소 기준입니다. 더 크게 만들어도 됩니다(제가 줄여서 넣습니다).

## 공통 스타일 문구 (모든 프롬프트 앞에 붙이기)

모든 그림의 분위기를 맞추려면, 아래 문구를 각 프롬프트 앞에 붙여 쓰세요.

```
Premium Three Kingdoms (ancient China) mobile strategy game UI art, ornate oriental style,
polished gold metal (#D4AF37) with dark brown lacquer (#2B1F17), red (#B23B2B) and blue (#3A6EA5) accents,
painterly semi-realistic rendering, soft rim light, high detail, clean silhouette, no text, no watermark
```

아이콘에는 끝에 다음을 덧붙이세요.

```
, single game icon centered, transparent background, square 1:1, readable at small size
```

---

## 1. 큰 그림 (3장)

| 파일 | 크기 | 쓰이는 곳 | 프롬프트 (공통 문구 뒤에) |
|---|---|---|---|
| `lobby-city.webp` | 1920×1080 | 본영(메인) 화면 전체 배경 | `wide aerial view of a grand ancient Chinese walled capital city with palaces, pagodas, river, bridges and cherry blossoms, mountains in the distance, golden hour, isometric-like 3/4 view, center area slightly darker for UI overlays, 16:9` |
| `screen-bg.webp` | 1920×1080 | 장수 · 편성 · 상점 등 메뉴 화면 배경 | `dark atmospheric background of an ancient Chinese fortress wall at dusk, misty mountains, low contrast and dark so UI panels stay readable, 16:9` |
| `btn-battle.png` | 720×280 (투명) | 오른쪽 아래 큰 **전투** 버튼 바탕 | `ornate golden banner-shaped button plate with crossed swords emblem on the left, empty space on the right for a label, embossed gold frame, transparent background, wide 18:7` |

## 2. 메뉴 아이콘 (512×512 투명 PNG, `icons/` 폴더)

| 파일 | 메뉴 | 프롬프트 (공통 + 아이콘 문구 사이에) |
|---|---|---|
| `generals.png` | 장수 | `golden warrior helmet with red plume` |
| `formation.png` | 편성 | `three golden war banners arranged in a triangle formation` |
| `gear.png` | 장비(가방) | `brown leather travel pouch with gold clasp and a sword hilt` |
| `recruit.png` | 모집 | `jade token seal with golden tassel glowing softly` |
| `research.png` | 연구 | `open bamboo scroll with brush and ink stone` |
| `territory.png` | 영토 | `golden chinese fortress gate tower` |
| `duel.png` | 대련 | `two crossed golden spears` |
| `raid.png` | 레이드 | `fierce bronze demon mask (taotie) with red eyes` |
| `guild.png` | 연맹 | `red and gold alliance war flag on a pole` |
| `board.png` | 게시판 | `wooden notice board with paper notes` |
| `codex.png` | 도감 | `thick bound ancient book with gold corners` |
| `shop.png` | 상점 | `small golden pagoda-shaped shop stall` |
| `more.png` | 더보기 | `four golden diamond tiles arranged as a menu symbol` |
| `missions.png` | 임무 | `rolled scroll with red wax seal` |
| `rank.png` | 랭킹 | `golden trophy cup with dragon handles` |
| `event.png` | 이벤트 | `red and gold gift box with ribbon` |
| `attendance.png` | 출석 | `golden calendar plaque with a check mark` |
| `news.png` | 소식 | `sealed envelope letter with red seal` |
| `settings.png` | 설정 | `ornate golden gear cog` |
| `logout.png` | 로그아웃 | `open wooden door with golden frame` |
| `admin.png` | 관리 | `golden official seal stamp` |
| `battle.png` | 전투 버튼 문양 | `two crossed golden swords with a round shield emblem` |

## 3. 다음 단계에서 쓸 그림 (선택)

화면을 더 화려하게 다듬을 때 쓰면 좋은 그림입니다. 지금 화면에는 아직 자리가 없으니, 만드시면 알려 주세요.

| 파일 | 크기 | 쓰이는 곳 | 프롬프트 |
|---|---|---|---|
| `banner-recruit.webp` | 800×300 | 모집 화면 왼쪽 ‘무장 모집’ 배너 | `heroic group of three kingdoms generals posing, banner composition, dark vignette on the left` |
| `banner-gear.webp` | 800×300 | 모집 화면 ‘장비 뽑기’ 배너 | `blacksmith forge with glowing swords and armor, banner composition` |
| `item-gold.png` 등 | 256×256 | 상점 · 가방 아이템 | `gold ingot` · `jade token` · `silver sycee` · `military manual book` · `treasure chest` |
| `pack-starter.png` 등 | 512×512 | 상점 패키지 그림 | `overflowing treasure chest with gold and jade` |

## 넣는 방법

1. 위 이름대로 저장합니다.
2. GitHub 저장소 `public/assets/ui/v2/` 폴더에서 **Add file → Upload files**로 올립니다(아이콘은 `icons/` 안으로).
3. 또는 채팅에 그림을 첨부해 주시면 제가 크기를 맞춰 넣고 올립니다.

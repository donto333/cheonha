# 모바일 접속기 · 자체 서버 안내

Manus 없이 돌아가는 구성입니다. 서버 하나가 **게임 화면과 API를 함께** 내주고, 안드로이드 앱(접속기)은 그 서버 주소를 앱 화면으로 엽니다.

```
휴대폰 APK (Capacitor) ──https──▶ Render 무료 웹 서비스 (Docker: 게임 화면 + API) ──▶ 무료 MySQL (Aiven)
```

## 로그인

- **회원 로그인**: 아이디 · 비밀번호(6자 이상). 비밀번호는 scrypt 해시로만 저장합니다. 한 IP에서 한 시간에 가입 5개, 같은 아이디 로그인 시도는 10분에 10번까지.
- **게스트 로그인**: 기존처럼 아이디만 정해 시작(이 기기에만 토큰 보관).
- **운영자**: 환경 변수 `ADMIN_NAMES`에 적은 아이디로 로그인하면 관리자 권한을 받습니다. (`운영`, `관리`, `admin`으로 시작하는 아이디는 가입할 수 없습니다.)

## 1. 무료 MySQL 만들기 (Aiven)

1. https://aiven.io 가입 → **Create service** → **MySQL** → **Free plan** 선택.
2. 서비스가 켜지면 **Service URI**(`mysql://avnadmin:...@...aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED`)를 복사합니다. 그대로 `DATABASE_URL`에 넣으면 됩니다.

## 2. 서버 배포 (Render 무료)

1. https://render.com 가입(GitHub 계정으로) → **New → Blueprint** → `donto333/cheonha` 저장소 선택.
2. 저장소의 `render.yaml`을 읽어 `cheonha` 웹 서비스를 만듭니다. `DATABASE_URL`, `ADMIN_NAMES`를 입력합니다. `JWT_SECRET`은 Render가 자동으로 만듭니다.
3. 배포가 끝나면 `https://cheonha-xxxx.onrender.com` 같은 주소가 생깁니다. 브라우저로 열어 게임이 뜨는지 확인합니다.

시작할 때마다 DB 구조(마이그레이션)를 자동으로 맞춥니다. 무료 서비스는 15분 동안 접속이 없으면 잠들고, 다음 접속 때 깨어나는 데 1분쯤 걸립니다.

## 3. 안드로이드 APK 만들기

1. GitHub 저장소 → **Actions → 안드로이드 접속기 APK → Run workflow**.
2. `server_url`에 2번에서 받은 서버 주소를 넣고 실행합니다(매번 넣기 싫으면 저장소 Variables에 `SERVER_URL`을 만들어 둡니다).
3. 끝나면 **Releases → 천하 안드로이드 접속기**에 `cheonha.apk`가 올라갑니다. 휴대폰에서 받아 설치합니다(‘출처를 알 수 없는 앱’ 허용 필요).

서버 주소가 그대로면 게임을 고쳐 서버만 다시 배포해도 앱은 새 화면을 엽니다. APK는 서버 주소가 바뀔 때만 다시 만들면 됩니다.

## 내 PC에서 실행

```bash
pnpm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET 채우기
pnpm dev               # 게임 http://localhost:3000, API http://localhost:3001
```

## 자동 점검

`main`에 올릴 때마다 **서버 · 게임 빌드 점검** 워크플로가 타입 검사 · 단위 테스트 · 게임 빌드 · MySQL에 서버를 실제로 띄워 가입/로그인 확인 · Docker 이미지 빌드를 합니다.

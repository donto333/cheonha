# 천하 자체 서버: 게임 화면(dist/)을 빌드해 API 서버와 한 컨테이너에서 띄운다.
# 필요한 환경 변수: DATABASE_URL(MySQL), JWT_SECRET(32자 이상). 선택: ADMIN_NAMES(운영자 아이디, 쉼표 구분)

FROM node:22-bookworm-slim AS client
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /app/dist /app/dist
ENV NODE_ENV=production STATIC_DIR=/app/dist PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "node db-migrate.mjs && node leaderboard/migrate.mjs && node index.mjs"]

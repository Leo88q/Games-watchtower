# Watchtower OS — образ для деплоя одним сервисом.
#
#   docker build -t watchtower-os .
#   docker run -p 8787:8787 --env-file .env -v watchtower-data:/app/data watchtower-os
#
# Собирает интерфейс и запускает read-only API, который раздаёт dist/ и /api/* с одного порта.
# Секреты передаются только переменными окружения. В образе нет .env и ключей.
# В production сервер не стартует без WATCHTOWER_INGEST_TOKEN (или HMAC-секрета) и WATCHTOWER_PII_SALT —
# это проверка server/config.js, а не пожелание.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.js index.html ios.html ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
LABEL org.opencontainers.image.title="watchtower-os" \
      org.opencontainers.image.description="Read-only аналитический хаб студии (без права записи в блокчейн)" \
      org.opencontainers.image.licenses="proprietary"
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=8787 \
    WATCHTOWER_SERVE_STATIC=1 \
    WATCHTOWER_STATIC_DIR=/app/dist \
    WATCHTOWER_CURSOR_FILE=/app/data/ingestion-cursors.json \
    WATCHTOWER_SNAPSHOT_FILE=/app/data/investor-snapshots.json

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server ./server
COPY scripts ./scripts
COPY docs ./docs
COPY prompts ./prompts
COPY studio.config.json ./
# Серверные модули читают реестр игр из src/data — без него контейнер падал на старте.
COPY src/data ./src/data
COPY --from=build /app/dist ./dist

# Единственный каталог, куда сервис пишет (курсоры и снимки отчётов).
RUN mkdir -p /app/data && chown -R node:node /app
VOLUME ["/app/data"]
USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Node как PID 1 сам обрабатывает SIGTERM: см. graceful shutdown в server/index.js.
STOPSIGNAL SIGTERM
CMD ["node", "server/index.js"]

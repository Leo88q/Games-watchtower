# Watchtower OS — минимальный образ для API и собранного интерфейса.
# Секреты передаются только через окружение / secret store; ни .env, ни ключи сюда не копируются.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY vite.config.js index.html ios.html ./
COPY src ./src
COPY public ./public
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
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY server ./server
COPY studio.config.json ./
# Runtime reads only this public ecosystem spec and audit summaries, not the documentation tree.
COPY docs/ecosystem-target.spec.json ./docs/ecosystem-target.spec.json
COPY reports/*-audit.json ./reports/
# The API serves this allowlist of prompts. Do not copy the full prompts repository into the image.
COPY prompts/arena/PROMPT_ARENA_WATCHTOWER_HUB.md ./prompts/arena/PROMPT_ARENA_WATCHTOWER_HUB.md
COPY prompts/arena/PROMPT_ARENA_ARES1.md ./prompts/arena/PROMPT_ARENA_ARES1.md
COPY prompts/arena/PROMPT_ARENA_AOF.md ./prompts/arena/PROMPT_ARENA_AOF.md
COPY prompts/arena/PROMPT_ARENA_NEONRELAY.md ./prompts/arena/PROMPT_ARENA_NEONRELAY.md
COPY prompts/arena/PROMPT_ARENA_GUTTERCAPS.md ./prompts/arena/PROMPT_ARENA_GUTTERCAPS.md
COPY prompts/arena/PROMPT_ARENA_TRAFFICGEN.md ./prompts/arena/PROMPT_ARENA_TRAFFICGEN.md
COPY prompts/arena/max/PROMPT_MAX_HUB.md ./prompts/arena/max/PROMPT_MAX_HUB.md
COPY prompts/arena/max/PROMPT_MAX_ARES1.md ./prompts/arena/max/PROMPT_MAX_ARES1.md
COPY prompts/arena/max/PROMPT_MAX_AOF.md ./prompts/arena/max/PROMPT_MAX_AOF.md
COPY prompts/arena/max/PROMPT_MAX_NEONRELAY.md ./prompts/arena/max/PROMPT_MAX_NEONRELAY.md
COPY prompts/arena/max/PROMPT_MAX_GUTTERCAPS.md ./prompts/arena/max/PROMPT_MAX_GUTTERCAPS.md
COPY prompts/arena/max/PROMPT_MAX_TRAFFICGEN.md ./prompts/arena/max/PROMPT_MAX_TRAFFICGEN.md
COPY prompts/arena/max/PROMPT_MAX_INVESTOR.md ./prompts/arena/max/PROMPT_MAX_INVESTOR.md
COPY prompts/studio-os/PROMPT_STUDIO_FINANCE_CONFIG.md ./prompts/studio-os/PROMPT_STUDIO_FINANCE_CONFIG.md
# Server modules read the game registry; this is runtime data, not game implementation source.
COPY src/data ./src/data
COPY --from=build /app/dist ./dist

# The only writable location is persistent runtime state.
RUN mkdir -p /app/data && chown -R node:node /app
VOLUME ["/app/data"]
USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

STOPSIGNAL SIGTERM
CMD ["node", "server/index.js"]

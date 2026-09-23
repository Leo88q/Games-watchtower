# Watchtower OS — образ для деплоя одним сервисом.
# Собирает фронтенд и запускает read-only API, который раздаёт dist/ и /api/* с одного порта.
#
#   docker build -t watchtower-os .
#   docker run -p 8787:8787 --env-file .env watchtower-os
#
# Секреты передаются только переменными окружения. Никаких ключей и .env внутри образа.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=8787
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src ./src
COPY scripts ./scripts
COPY docs ./docs
COPY prompts ./prompts
COPY reports ./reports
COPY studio.config.json ./
COPY .env.example ./
EXPOSE 8787
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]

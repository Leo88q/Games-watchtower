# Watchtower OS — эксплуатация (runbook)

Документ для того, кто дежурит по хабу. Все утверждения проверяемы командами из текста.
Хаб — read-only по отношению к блокчейну: он не подписывает и не отправляет транзакции
(`writes: false` в `/api/health`, проверка `npm run test:readonly`).

- [1. Запуск и конфигурация](#1-запуск-и-конфигурация)
- [2. Секреты и ротация](#2-секреты-и-ротация)
- [3. Мониторинг: что и о чём говорит](#3-мониторинг-что-и-о-чём-говорит)
- [4. Данные: окно, retention, TTL](#4-данные-окно-retention-ttl)
- [5. Приватность игроков и удаление по запросу](#5-приватность-игроков-и-удаление-по-запросу)
- [6. Инциденты](#6-инциденты)
- [7. Деплой, обновление, откат](#7-деплой-обновление-откат)
- [8. Проверка исправности после выката](#8-проверка-исправности-после-выката)

## 1. Запуск и конфигурация

```bash
# Локально
WATCHTOWER_INGEST_TOKEN=$(openssl rand -hex 32) \
WATCHTOWER_READ_TOKEN=$(openssl rand -hex 32) \
WATCHTOWER_PII_SALT=$(openssl rand -hex 16) \
node server/index.js

# Контейнер
docker build -t watchtower-os .
docker run -d --name watchtower -p 8787:8787 --env-file .env \
  -v watchtower-data:/app/data watchtower-os
```

Сервер проверяет конфигурацию на старте (fail-fast, `server/config.js`):

| Условие | Поведение |
|---|---|
| `NODE_ENV=production` и нет `WATCHTOWER_INGEST_TOKEN` / `WATCHTOWER_INGEST_HMAC_SECRET` | выход с кодом 1, список отсутствующих переменных в stderr |
| `NODE_ENV=production` и `WATCHTOWER_PII_SALT` короче 16 символов | выход с кодом 1: псевдонимы игроков без соли перебираются |
| нет `WATCHTOWER_READ_TOKEN` | `/api/*` открыты на чтение: допустимо только для локальной разработки |
| `WATCHTOWER_TRUST_PROXY=0` (по умолчанию) | `X-Forwarded-For` игнорируется, IP берётся из сокета |
| `WATCHTOWER_ALLOW_DEMO=0` (в production по умолчанию) | `?demo=1` отвечает `403 demo_disabled` |

Полный список переменных — `.env.example`; какие именно читает сервер — `/api/config` и
`CONFIG_ENV_KEYS` в `server/config.js` (совпадение проверяет `npm run test:docs`).

## 2. Секреты и ротация

Секретов четыре, все передаются только окружением (в репозитории и образе их нет):

| Переменная | Назначение | Как ротировать |
|---|---|---|
| `WATCHTOWER_INGEST_TOKEN` | приём событий (`POST /api/ingest/*`) | выдать новый токен игре → дождаться смены → сменить переменную → перезапустить → старый токен больше не принимается |
| `WATCHTOWER_INGEST_HMAC_SECRET` | альтернатива токену: подпись тела (`X-Watchtower-Timestamp`, `X-Watchtower-Signature`) | окно подписи ±5 мин: сначала выдать секрет отправителю, затем включить, затем убрать токен |
| `WATCHTOWER_READ_TOKEN` | чтение `/api/*` | перезапуск с новым токеном; у операторов один ключ чтения — меняйте с уведомлением |
| `WATCHTOWER_PII_SALT` | псевдонимизация игроков в ответах | смена соли меняет все псевдонимы: снимки инвесторов и дашборды «разъедутся». Менять только с полным пересчётом снимков |

Проверка, что секрет не утёк в логи: журнал — JSON в stdout, значения с ключами `token`, `secret`,
`authorization`, `signature` маскируются. Убедиться:

```bash
curl -s -H "Authorization: Bearer $WATCHTOWER_READ_TOKEN" localhost:8787/api/audit | head
```

## 3. Мониторинг: что и о чём говорит

- `GET /api/health` — процесс жив, `writes: false`, `dataSource: event-inbox`, размер inbox и retention.
- `GET /api/readyz` — готовность: 200, когда inbox не переполнен и данные свежие. 503 с
  `reason: ["freshness"]` означает «игры молчат», а не «сервер упал». Порог задаёт
  `WATCHTOWER_MAX_EVENT_AGE_SECONDS` (0 = выключено).
- `GET /metrics` — Prometheus: `watchtower_events_total`, `watchtower_events_rejected_total`,
  `watchtower_inbox_events`, `watchtower_inbox_evicted_total`, `watchtower_last_event_age_seconds`,
  `watchtower_http_requests_total`, `watchtower_http_request_duration_seconds`, `watchtower_blockchain_writes_enabled 0`.
- `GET /api/ingestion/status` — счётчики приёма, дубликаты, отклонения, вытеснение, свежесть, курсоры.

Рекомендуемые алерты (PromQL-набросок):

```promql
watchtower_blockchain_writes_enabled > 0        # критично: нарушен read-only инвариант
watchtower_last_event_age_seconds > 3600        # игры не передают события
increase(watchtower_events_rejected_total[15m]) > 100   # отправитель шлёт невалидные события
watchtower_inbox_events / watchtower_inbox_capacity > 0.9  # приближается вытеснение по лимиту
rate(watchtower_http_requests_total{status="429"}[5m]) > 5 # флуд или неверный прокси
```

## 4. Данные: окно, retention, TTL

Inbox — оперативное хранилище, не архив:

- `WATCHTOWER_MAX_EVENTS` (по умолчанию 250 000) — при превышении вытесняются самые старые события;
  счётчик вытеснения виден в `/api/ingestion/status` (`evictedByLimit`) и в `/metrics`.
- `WATCHTOWER_EVENT_TTL_HOURS` (0 = выключено) — события старше TTL удаляются при приёме.
- Экономические метрики считаются по окнам 7/30/90 дней из inbox: если события вытеснены,
  метрика честно вернёт `quality: unavailable` с причиной, а не заниженное число.
- Файлы состояния: `data/ingestion-cursors.json`, `data/investor-snapshots.json`.
- Статика: бандл отдаётся из `WATCHTOWER_STATIC_DIR` (по умолчанию `./dist`). Если каталог задан
  явно и не существует — сервер не стартует: пустая страница вместо ошибки в проде недопустима.
  В образе переменная уже установлена (`/app/dist`). Запросы вне каталога отклоняются.

Резервная копия:

```bash
tar czf watchtower-state-$(date +%F).tgz data/*.json
```

## 4.1. Финансовые факты экономики

13 из 40 экономических метрик невозможно посчитать без цифр студии: supply, выручка, расходы, казна,
ликвидность. Хаб их не выдумывает — до заполнения метрики показывают «нет данных» с причиной.

- Сбор цифр у финансовой команды: `prompts/studio-os/PROMPT_STUDIO_FINANCE_CONFIG.md`
  (14 значений, период, обязательный источник, шаблон ответа). Тот же текст доступен в интерфейсе,
  раздел «Промпты» → «Финансовая конфигурация студии».
- Выручка, расходы и их разбивка задаются **за 30 дней** и приводятся к окну наблюдения пропорционально
  дням (`CONFIG_PERIOD_DAYS` в `server/economy/metrics.js`). Такие метрики помечаются `quality=partial`
  и указывают период в `source`: расчётная величина не выдаётся за измеренную за окно.
- Остальные факты (supply, казна, ликвидность, капитализация) — на дату, без масштабирования.
- 8 метрик из этих фактов видны даже при пустом потоке событий (помечены `partial` и примечанием).
- Проверка после подстановки:

```bash
curl -s -H "Authorization: Bearer $WATCHTOWER_READ_TOKEN" "$BASE/api/economy/overview?window=30d" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);for(const m of j.metrics.filter(x=>x.quality!=='unavailable'))console.log(m.id,m.value,m.quality)})"
```

На окне 30 дней числа совпадают с присланными; если расхождение — источник цифр или период указаны неверно.

## 5. Приватность игроков и удаление по запросу

Политика — `GET /api/pii/policy`. Коротко: кошельки и идентификаторы наружу уходят только
псевдонимами `anon:<12 hex>` от `sha256(WATCHTOWER_PII_SALT + id)`; открытые значения не
попадают ни в ответы, ни в журнал аудита (query-значения маскируются).

Право на удаление (GDPR-запрос):

```bash
curl -s -X POST localhost:8787/api/pii/erasure \
  -H "Authorization: Bearer $WATCHTOWER_INGEST_TOKEN" -H 'content-type: application/json' \
  -d '{"identifier":"<кошелёк или игровой id>","confirm":"erase-player"}'
# → {"ok":true,"alias":"anon:…","removed":N,"remaining":M}
```

Проверить, что игрока больше нет: `GET /api/pii/player?identifier=…` вернёт `eventCount: 0`.
Если запрос на удаление приходит от игрока — фиксируйте у себя дату и результат: хаб хранит
источник (игры), а доказательство удаления — в тикете.

## 6. Инциденты

**События не поступают (`/api/readyz` → 503, `freshness`).**
1. `curl -s localhost:8787/api/ingestion/status` — посмотрите `lastEventAt`, `lastEventAgeSeconds`.
2. Проверьте отправителя: `401` в логах = неверный токен; `422` = событие не проходит валидацию
   (в теле ответа `errors[]` с точной причиной); `503 ingest_disabled_no_secret_configured` = не
   задан секрет приёма.
3. Если потока нет по вине игры — это видно как `ingest-silence` в `/api/alerts`; хаб не подменяет
   данные демо-потоком.

**Шквал 401/429.**
- 401 — проверьте, не отозван ли токен, и не поменялся ли `Authorization` на стороне игры.
- 429 — сработал `WATCHTOWER_RATE_LIMIT` (по умолчанию 120 запросов/мин на IP). Если за
  реверс-прокси все клиенты приходят с одного IP — включите `WATCHTOWER_TRUST_PROXY=1` и
  убедитесь, что прокси сам перезаписывает `X-Forwarded-For` (иначе IP подделывается).

**Сервер не стартует.**
- Сообщения вида `ConfigError: …` печатают имена переменных и подсказку. Секреты в сообщениях не
  выводятся: только имена.
- `EADDRINUSE` — занят `API_PORT`; в новой версии это логируется и процесс завершается с кодом 1.

**Контейнер долго останавливается.**
- `SIGTERM` → сервер перестаёт принимать соединения, ждёт завершения запросов, пишет
  `shutdown_complete` и выходит с кодом 0. Дедлайн — `WATCHTOWER_SHUTDOWN_TIMEOUT_MS`
  (по умолчанию 10 000 мс), после чего пишет `shutdown_forced` и выходит с кодом 1.

## 7. Деплой, обновление, откат

```bash
npm ci && npm run verify          # тесты, мутации, сборка
docker build -t watchtower-os:$GIT_SHA .
docker tag watchtower-os:$GIT_SHA watchtower-os:current
docker stop watchtower && docker run -d --name watchtower ... watchtower-os:$GIT_SHA
```

Один прогон по всей студии (хаб + игры из соседних каталогов): `npm run release:check`
(`scripts/prod-release.mjs`). Он подтягивает репозитории, ставит зависимости с нуля, собирает,
тестит, поднимает сервер и проверяет `writes:false`, собирает docker-образ. Деплой Anchor-программ
из хаба запрещён и блокируется: `--deploy` принимает только репозиторий игры, mainnet требует
`AUDIT_ACK=1` и `--i-understand-mainnet`, а при любом красном шаге в этом репозитории в сеть не идёт.

Откат — предыдущий тег образа (состояние в inbox теряется при рестарте: это осознанное свойство,
источник правды — игры). Данные на диске (`data/*.json`) привязаны к тому же тегу схемы: при
изменении формата снимков сначала разверните версию, которая умеет читать старый файл, или
остановите запись снимков.

## 8. Проверка исправности после выката

```bash
BASE=http://localhost:8787
curl -s $BASE/api/health                                     # ok:true, writes:false
curl -s $BASE/api/readyz                                     # ready:true
curl -s -o /dev/null -w '%{http_code}\n' -X POST $BASE/api/ingest/solana -d '{}'   # 401 (без токена)
curl -s -H "Authorization: Bearer $WATCHTOWER_READ_TOKEN" $BASE/api/read-model | head -c 300
npm run test:smoke                                           # полный контракт на живом сервере
npm run test:ui                                              # интерфейс в jsdom (без браузера)
```

Если `writes: false` стал `true` или `npm run test:readonly` упал — остановите выкат: инвариант
read-only нарушен.

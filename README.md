# Games Watchtower

Центр управления экосистемой из четырёх крипто-игр: метрики, игровая экономика, поведение игроков, безопасность и AI-аналитика.

## Продукт: Watchtower OS (белый iOS-интерфейс)

Основной интерфейс — `ios.html` → собирается в `dist/` и раздаётся тем же сервером, что и API:

```bash
npm install
npm run build          # dist/ios.html + dist/index.html (старый тёмный дашборд остаётся)
node server/index.js   # один порт: API + интерфейс → http://localhost:8787
```

Разделы: Обзор, Игры, Экономика, Аналитика, Безопасность, Контракты, Инвестор, Промпты, Деплой.
У каждой функции — блок разъяснения «что это / как работает / почему важно», а каждое значение
несёт статус `complete | partial | unavailable`. Кнопка **«Приступить»** открывает готовый промпт Arena
для конкретной игры и копирует его в буфер.

**Экономика:** 40 метрик в 8 семействах (снабжение и сжигание, источники и стоки, скорость обращения,
игроки, выручка и казна, справедливость, риски, переплетение игр) и индекс здоровья экономики 0–100.
Считаются из принятых событий; всё, что требует внешних фактов, честно помечается `unavailable` с
причиной. Демо-режим (`?demo=1`) показывает синтетику и всегда помечен DEMO DATA. Формулы и связь с
трендами 2026 — `docs/ECONOMY_METRICS_V1.md`.

Новые read-only маршруты: `GET /api/ecosystem/status` (уровни L0–L4 по tenant'ам, покрытие цели,
суммы findings, список невыполненных сканов), `GET /api/ecosystem/report`, `GET /api/arena/prompts`,
`GET /api/arena/prompts/:id`, `GET /api/economy/overview|health|catalog`.
Подробности — `docs/PRODUCT_GUIDE_RU.md`, деплой — `Dockerfile`.

## Что есть сейчас (тёмный демо-дашборд `index.html`)

Первый вертикальный срез интерфейса администратора:

- обзор всех 4 игр и их текущего состояния;
- KPI: активные игроки, объём экономики, средняя сессия, риски безопасности;
- график динамики игроков и сессий;
- AI-панель с оценкой состояния экосистемы и объяснимыми инсайтами;
- таблица игр с состояниями `Healthy / Watch / Critical`;
- адаптивная тёмная панель управления;
- интерактивные кнопки обновления, переходов и закрытия уведомления; данные приходят из API, при отсутствии значений показывается «—», а не ноль.

## Запуск

Разработка интерфейса (Vite, порт 5173) и API отдельно:

```bash
npm install
npm run dev          # интерфейс
npm run dev:api      # API на 8787 (read-маршруты открыты, пока не задан WATCHTOWER_READ_TOKEN)
```

Локальный запуск с токенами — как в production:

```bash
export WATCHTOWER_INGEST_TOKEN=$(openssl rand -hex 32)   # приём событий (write)
export WATCHTOWER_READ_TOKEN=$(openssl rand -hex 32)     # чтение /api/*
export WATCHTOWER_PII_SALT=$(openssl rand -hex 16)       # псевдонимизация игроков
node server/index.js
```

Production:

```bash
npm ci && npm run build
NODE_ENV=production node server/index.js    # без секретов приёма сервер не стартует: fail-fast
```

Контейнер (сборка интерфейса + API, non-root, healthcheck, graceful shutdown):

```bash
docker build -t watchtower-os .
docker run -p 8787:8787 --env-file .env -v watchtower-data:/app/data watchtower-os
```

Эксплуатация, ротация секретов, алерты и разбор инцидентов — `docs/OPERATIONS.md`.

Независимый аудит — `prompts/audit/`:

| Промпт | Область |
|---|---|
| `PROMPT_AUDIT_INDEPENDENT.md` | только хаб: 18 проверяемых утверждений (C1..C18), экономические метрики, честность данных, тесты |
| `PROMPT_AUDIT_FULL_STACK.md` | вся экосистема (7 репозиториев) перед прод-деплоем: логика, типизация, безопасность, баги, дыры, несостыковки, упущения, битые файлы, экономическая модель, прогон всех тестов + мутационные проверки |
| `PROMPT_AUDIT_PRODUCTION_DEEP.md` | глубокий аудит хаба перед прод-деплоем (v2 к `PROMPT_AUDIT_INDEPENDENT`): уязвимости, баги, несостыковки, фиктивные тесты, эксплуатационные пробелы; вердикт GO / GO-WITH-CONDITIONS / NO-GO |
| `PROMPT_AUDIT_FULL_STACK_V2.md` | вся экосистема (7 репозиториев), актуальная версия: к v1 добавлены домены монетизации (§4.M) и эмитентов ценности, мультисиг/таймлок и mint-власти, честность RNG/гачи, стресс-тест масштаба 1×/10×/100×/1000× |
| `README_AUDIT.md` | протокол запуска (7 сессий + консолидатор) и общие правила для аудитора |

Проверки (все запускаются в CI — `.github/workflows/ci.yml`):

```bash
npm run test                # unit + интеграционные + приватность + read-only + docs + DOM-прогон интерфейса
npm run test:unit           # математика экономических метрик (золотые значения)
npm run test:hardening      # контракт API на живом сервере: auth, лимиты, retention, заголовки
npm run test:privacy        # псевдонимизация игроков и удаление по запросу
npm run test:readonly       # инвариант «хаб не пишет в блокчейн» по коду и зависимостям
npm run test:docs           # числа/ENV в документации против рантайма
npm run test:ui             # интерфейс в jsdom: экраны, карточка покрытия метрик, «—» вместо нулей
npm run test:smoke          # дымовой прогон на запущенном сервере (нужны токены)
npm run test:economy        # синоним test:unit для экономического движка
npm run test:mutation       # мутационная проверка тестов (порог 0.8, гейт G3)
npm run verify              # всё вышеперечисленное + сборка
npm run release:plan         # план прогона по всем репозиториям студии (без side-effects)
npm run release:check        # pull + сборка + тесты по студии, docker-образ; деплой только с --deploy
npm run ecosystem:target    # фактические уровни L0..L4 по tenant'ам
```

## Публичные площадки: сайт и лендинг

- `watchtower-site/` — двуязычный сайт Watchtower OS (продукт, модули, тарифы, путь до 2035, лист ожидания Studio API);
- `token-landing/` — двуязычный лендинг $WTWR: токеномика, три раунда сбора ($350k: NFT $100k + токен $250k), CapsStake, Compute Grid, риски; все числа рендерятся из единого источника `token-data.mjs` с самопроверкой в браузере и в CI;
- `web-shared/` — общий слой: трекер переходов TalkChart (копия патча для игр), параметры запуска в одном `wt-params.js`, честные формы вайтлиста, favicon и OG-обложки.

Быстрый предпросмотр без сборки: `npm run site:preview`; проверки согласованности (числа, паритет RU/EN, стоп-лист хайпа, ссылки): `npm run test:site`. Чек-лист запуска и схема — `WEBSITES.md`.

## Предлагаемая архитектура продукта

### Этап 1 — фундамент данных

- единый контракт событий: `player_session`, `wallet_transaction`, `match_result`, `item_trade`, `security_event`;
- ingestion API и адаптер для каждой игры;
- PostgreSQL для агрегатов и ClickHouse/TimescaleDB для временных рядов;
- Redis для очередей, кэша и realtime-состояний;
- роли и доступы: owner, admin, analyst, support, read-only.

### Этап 2 — рабочие модули

1. **Game Operations** — health checks, релизы, feature flags, конфигурация и кнопки управления.
2. **Players & Growth** — DAU/WAU/MAU, retention D1/D7/D30, cohort analysis, acquisition и churn.
3. **Economy** — mint/burn, sinks/sources, velocity, balances, инфляция, подозрительные кошельки и стоимость активов.
4. **Security** — rate limits, multi-account detection, ботоводство, аномалии транзакций и журнал действий.
5. **AI Analyst** — объяснение изменений, поиск аномалий, прогнозы, рекомендации с уровнем уверенности и ссылками на метрики.
6. **Alerts** — правила, пороги, подтверждение инцидента, Telegram-уведомления и эскалации.

### Интеграционные контракты

- `docs/integrations/ares1.md` — read-only контракт для ARES-1 «Potato Colony on Solana».
- `docs/integrations/aof.md` — read-only контракт для Age of Farming (AOF), с явной маркировкой неполных данных.
- `docs/integrations/neon-relay.md` — read-only контракт для Neon Relay с разделением game server, backend и Solana data planes.
- `docs/integrations/guttercaps.md` — read-only контракт для GUTTERCAPS с on-chain инвариантами, индексатором и антифродом.
- `server/contracts/` — Anchor-программы студии (`cross_game_inventory`, `studio_treasury`, `session_keys`).
  Это **спецификация с проверяемыми инвариантами, а не задеплоенный код**: toolchain в репозитории нет,
  адреса-константы выдаёт деплой, хаб их не вызывает (`writes: false`). Детали — `server/contracts/README.md`.
- `docs/INTERWEAVING_STATUS.md` — честный статус переплетения: что работает (измерение), что нет
  (игровая механика «предмет из другой игры»), три уровня реализации и требования к ним.
- `docs/INTEGRATION_TRAFFICGEN.md` — интеграция off-chain генератора трафика **TalkChart** (адаптер `trafficgen`, event envelope, pull/push ingestion, `/api/analytics/traffic`, UI-раздел «Трафик / Acquisition»); исходный контракт — `PROMPT_TRAFFIC_GENERATOR_INTEGRATION.md`.

### Этап 3 — интеграции и безопасность

- Telegram-бот для алертов и команд `/status`, `/alerts`, `/game`;
- подключение LLM через server-side gateway без передачи секретов в браузер;
- audit log всех действий администратора;
- SSO/2FA, секреты через vault, шифрование, резервное копирование и retention policy;
- sandbox для опасных операций и подтверждение перед массовыми изменениями.

## Следующий шаг

Интерфейс читает живой read-model хаба: значения считаются по событиям event-inbox, а не подставляются на клиенте.
Синтетический поток доступен только по `?demo=1` и помечен `DEMO DATA` (в production выключен флагом `WATCHTOWER_ALLOW_DEMO`).
Для подключения реальных игр нужно зафиксировать для каждой игры источники данных/API, административные действия,
набор токенов и каналы уведомлений — затем передать события на `POST /api/ingest/solana` по контракту `docs/GAME_ADAPTERS.md`.

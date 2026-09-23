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
- интерактивные кнопки обновления, переходов и закрытия уведомления (пока mock-режим).

## Запуск

```bash
npm install
npm run dev
```

Сборка production:

```bash
npm run build
```

Проверки:

```bash
npm run test:smoke                 # контракт API и safety-гейты
npm run test:economy               # 13 тестов экономических метрик
npm run ecosystem:target           # фактические уровни L0..L4 по tenant'ам
npm run ecosystem:target:strict    # гейт: покрытие L3+ не ниже цели (сейчас падает — это честно)
```

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
- `docs/INTEGRATION_TRAFFICGEN.md` — интеграция off-chain генератора трафика **TalkChart** (адаптер `trafficgen`, event envelope, pull/push ingestion, `/api/analytics/traffic`, UI-раздел «Трафик / Acquisition»); исходный контракт — `PROMPT_TRAFFIC_GENERATOR_INTEGRATION.md`.

### Этап 3 — интеграции и безопасность

- Telegram-бот для алертов и команд `/status`, `/alerts`, `/game`;
- подключение LLM через server-side gateway без передачи секретов в браузер;
- audit log всех действий администратора;
- SSO/2FA, секреты через vault, шифрование, резервное копирование и retention policy;
- sandbox для опасных операций и подтверждение перед массовыми изменениями.

## Следующий шаг

Текущий UI использует демонстрационные данные. Для подключения реальных игр нужно зафиксировать для каждой из 4 игр список источников данных/API, доступные административные действия, набор токенов/активов и желаемые каналы уведомлений. После этого можно реализовать backend-контракт и заменить mock-слой без переделки панели.

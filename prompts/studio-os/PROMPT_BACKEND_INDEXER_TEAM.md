# Промт для Backend/Indexer команды — Watchtower OS

## Роль
Ты Backend/Indexer разработчик в Leo Games Studio. Твоя задача — запустить индексер слой Watchtower OS.

## Что уже есть
- Watchtower OS 7 слоёв, API /api/os/config, /api/indexer/config, /api/indexer/health
- Модули: server/modules/indexer/ — laserstream.js, shyft.js, custom-pg.js
- Event inbox: server/ingestion/event-inbox.js — idempotency по canonical identity cluster+slot+signature+instructionIndex+innerIndex
- Provider: server/ingestion/provider.js — MockProvider, NativeRpcProvider, TrafficgenProvider

## Слой Indexer из брифа
- Helius LaserStream: gRPC-стриминг с 24-часовым историческим реплеем и мультинодовым failover — для критичных бэкендов. WebSocket-вариант для UI и real-time. Встроенные Priority Fee API, webhooks и DAS API для нормализации метаданных
- Shyft: REST API для NFT, токенов, кошельков и колбэков (вебхуков). Callback API позволяет отслеживать события (TOKEN_MINT, NFT_MINT) и отправлять данные на ваш сервер. Акселерированный getProgramAccounts даёт p50 ~15 мс для топовых DEX
- Парсинг транзакций: для мультитенантной архитектуры рекомендуется комбинировать LaserStream (стриминг) + собственный индексер на PostgreSQL

## Задачи

### 1. Helius LaserStream — gRPC + 24h replay + failover
```js
// server/modules/indexer/laserstream.js уже есть, тебе нужно запустить

// Env:
HELIUS_API_KEY=...
HELIUS_LASERSTREAM_ENDPOINT=https://laserstream.helius-rpc.com
HELIUS_RPC_URL=wss://atlas-mainnet.helius-rpc.com
HELIUS_WEBHOOK_ID=...
WATCHTOWER_WEBHOOK_URL=https://watchtower.studio/api/webhooks/helius

// gRPC subscription
const subscription = {
  accounts: [], // game program PDAs: CgInv111..., SessKeys111..., STrEaSuRy111...
  transactions: {
    vote: false,
    failed: false,
    accountInclude: [gameProgramIds], // ARES-1, AOF, Neon Relay, GUTTERCAPS program IDs
  },
  commitment: 'confirmed',
}

// Replay: 24h historical replay on reconnect
// Failover: multinode round_robin_with_healthcheck

// WebSocket для UI
// methods: logsSubscribe, programSubscribe, accountSubscribe, signatureSubscribe

// DAS API для нормализации метаданных NFT/cNFT
// getAssetsByOwner, getAsset, getAssetsByGroup, searchAssets — критично для Watchtower

// Priority Fee API — динамические priority fees для игровых транзакций
// https://api.helius.xyz/v0/priority-fee

// Webhooks — account, transaction -> ваш сервер
```

Реализуй:
- Yellowstone gRPC клиент (используй @triton-one/yellowstone-grpc или helius SDK)
- Подписка на все 4 игры program IDs + cross-game contracts
- 24h replay on reconnect
- Multinode failover
- Запись в PG: raw_events + parsed_events
- Prometheus metrics: watchtower_indexer_lag_slots, watchtower_finalized_lag_slots, watchtower_rpc_latency_ms

### 2. Shyft — REST + Callback + accelerated gPA
```js
// server/modules/indexer/shyft.js уже есть

// Env:
SHYFT_API_KEY=...
SHYFT_BASE_URL=https://api.shyft.to
SHYFT_NETWORK=mainnet-beta
// или devnet для beta

// REST endpoints
// NFT: GET /sol/v1/nft/read, /read_all, /collection
// Token: GET /sol/v1/wallet/token_balance, /all_tokens, /history
// Wallet: GET /sol/v1/wallet/get_portfolio, /transaction/history
// gPA: GET /sol/v1/gpa — accelerated p50 15ms для топовых DEX + game programs
// Callback: POST /sol/v1/callback/create, GET /list, DELETE /remove

// Callback API — TOKEN_MINT, NFT_MINT, TOKEN_TRANSFER, NFT_TRANSFER, NFT_LIST, NFT_SALE -> вебхук на сервер
const callback = {
  gameId: "ares1",
  events: ["TOKEN_MINT", "NFT_MINT", "TOKEN_TRANSFER", "NFT_TRANSFER"],
  targetUrl: "https://watchtower.studio/api/webhooks/shyft/ares1"
}
// Регистрация callback через Shyft API
```

Реализуй:
- Shyft REST client для всех 4 игр
- Callback регистрация для каждой игры
- Webhook handler: POST /api/webhooks/shyft/:gameId — парсинг -> inbox ingest -> PG
- Accelerated gPA для game program accounts — p50 15ms
- Используй для marketplace stats и wallet portfolio

### 3. Custom PG Indexer — PostgreSQL + TimescaleDB + Redis
```js
// server/modules/indexer/custom-pg.js уже есть

// Env:
DATABASE_URL=postgres://...
REDIS_URL=redis://...

// Tables
// raw_events: cluster+slot+signature+instructionIndex+innerIndex canonical identity
// parsed_events
// player_sessions
// player_profiles pseudonymous playerKey
// economy_flows mint/burn/transfer
// treasury_snapshots
// security_signals
// marketplace_listings
// cross_game_links
// investor_snapshots
// Timeseries: daily_active_players, retention_cohorts, economy_metrics_hourly, rpc_latency, indexer_lag

// Multitenant: tenant_id column + RLS, tenants: ares1, aof, neonrelay, guttercaps, cross-game materialized view cross_game_players

// Features
// idempotency, deduplication, cursor/replay, backfill, reconnect, gap detection, finalized reconciliation, parser versioning
```

Реализуй:
- PG schema из CUSTOM_INDEXER_CONFIG.tables
- TimescaleDB hypertables для timeseries
- Redis для queues, cache, realtime states
- Idempotency по canonical identity
- Gap detection + backfill
- Finalized reconciliation: confirmed vs finalized lag
- Parser versioning: gameId-v1, trafficgen-v1, etc
- Backfill: getSignaturesForAddress + getTransaction for each game program
- Reconnect + cursor store (уже есть server/ingestion/cursor-store.js)

### 4. Агрегация стратегия — LaserStream + Shyft + Custom PG
```
Flow:
1. LaserStream gRPC — real-time streaming всех транзакций игровых программ, 24h replay on reconnect
2. Shyft Callback — TOKEN_MINT, NFT_MINT вебхуки на ваш сервер
3. Custom PG Indexer — парсинг, дедупликация по canonical identity, запись в PG
4. TimescaleDB — агрегаты DAU/WAU/MAU, retention, economy
5. Redis — очереди, кэш, realtime состояния
6. Watchtower API — read-model API для дашборда /api/read-model

Guarantees:
- idempotency по cluster+slot+signature+instructionIndex+innerIndex
- gap detection + backfill
- finalized reconciliation (confirmed vs finalized)
- parser versioning
```

### 5. Парсинг транзакций — Anchor IDL + Bubblegum
- Для каждого game program: IDL -> Anchor coder -> parse instruction + logs
- Для cNFT: Bubblegum program BGUMAp9... + Compression cmtDv... + DAS API
- Для cross-game: CgInv111... events: create_profile, add_cross_game_item, link_item_to_game
- Для session keys: SessKeys111... events: create_session, revoke_session
- Для treasury: STrEaSuRy111... events: TreasuryDeposited, WithdrawRequested

### 6. API для Watchtower OS
- Уже есть: /api/ingest/solana, /api/events, /api/ingestion/status, /api/ingestion/adapters, /api/infra/solana
- Добавь: /api/indexer/health — уже есть via indexerHealth()
- Добавь: /api/indexer/config — уже есть via indexerLayerConfig()
- Prometheus: /metrics — watchtower_events_total, duplicates, rejected, decoder_errors, indexer_lag_slots, finalized_lag_slots, rpc_latency_ms, blockchain_writes_enabled 0

### 7. Что сдать
- Запущенный LaserStream gRPC клиент с подпиской на 4 игры + 3 cross-game программы, 24h replay, failover
- Shyft REST client + callback регистрация + webhook handler
- PG schema + TimescaleDB + Redis, idempotency, gap detection, backfill, finalized reconciliation
- Парсеры для всех event types: PlayerJoined, PotatoPlanted, RewardGranted, TokenMinted, etc (из game-adapters.js)
- Read-model API: /api/read-model включает indexer данные
- Health checks: /api/indexer/health, /api/infra/solana, /metrics
- Документация: какие program IDs, какие таблицы, какие гарантии, какие ENV
- Тесты: duplicate delivery, reconnect, backfill, slot gap healing, finalized reconciliation, failed tx
- Запрет: no blockchain writes from exporter, read-only, no private keys

### 8. ENV
```
HELIUS_API_KEY
HELIUS_LASERSTREAM_ENDPOINT
HELIUS_RPC_URL
HELIUS_WEBHOOK_ID
WATCHTOWER_WEBHOOK_URL
SHYFT_API_KEY
SHYFT_BASE_URL
SHYFT_NETWORK
DATABASE_URL
REDIS_URL
ARES1_PROGRAM_ID
AOF_CORE_PROGRAM_ID
NEONRELAY_REWARDS_PROGRAM_ID
GUTTERCAPS_CORE_PROGRAM_ID
```

### 9. Проверка
```
GET /api/indexer/config — стратегия LaserStream+Shyft+PG
GET /api/indexer/health — статус всех sub-providers
GET /api/infra/solana — health от provider.js
GET /api/ingestion/status — events, duplicates, rejected, cursors, reconciliation
GET /api/events?limit=100 — последние события
GET /api/ingestion/adapters — какие игры сконфигурированы
/metrics — Prometheus
```

Детали: server/modules/indexer/, docs/os/

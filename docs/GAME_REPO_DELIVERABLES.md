# Что должен добавить каждый игровой репозиторий

Этот список является практическим дополнением к `MASTER_WATCHTOWER_INTEGRATION_PROMPT.md`.

## Обязательные файлы

```text
watchtower/
├── README.md
├── config.example.env
├── integration-manifest.json
├── events/
│   ├── schema.json
│   ├── event-types.json
│   └── fixtures/
│       ├── player-joined.json
│       ├── reward-granted.json
│       ├── token-minted.json
│       └── transaction-failed.json
├── src/
│   ├── watchtower-exporter.
│   ├── event-normalizer.
│   ├── event-decoder.
│   ├── health.
│   └── metrics.
├── migrations/
│   └── watchtower-read-model.sql
└── tests/
    ├── watchtower-events.test.
    ├── watchtower-decoder.test.
    ├── watchtower-replay.test.
    └── watchtower-readonly.test.
```

Расширение файлов зависит от стека проекта:

```text
.ts для TypeScript
.rs для Rust
.py для Python
.go для Go
```

## `integration-manifest.json`

```json
{
  "gameId": "ares1",
  "name": "ARES-1",
  "network": "devnet",
  "programIds": [],
  "mintAddresses": [],
  "treasuryAddresses": [],
  "pdaAccounts": [],
  "idlVersion": "",
  "parserVersion": "ares1-v1",
  "dataQuality": "partial",
  "writes": false,
  "lastVerifiedAt": null
}
```

## `config.example.env`

```env
WATCHTOWER_EXPORTER_PORT=8790
WATCHTOWER_EXPORTER_TOKEN=
WATCHTOWER_CLUSTER=devnet
WATCHTOWER_RPC_URL=
WATCHTOWER_RPC_FALLBACK_URL=
WATCHTOWER_DATABASE_URL=
WATCHTOWER_EVENT_PROVIDER=mock
WATCHTOWER_ENABLE_WRITES=false
WATCHTOWER_PLAYER_HASH_SALT=
```

Нельзя коммитить реальные токены, RPC keys, private keys или signer credentials.

## Обязательные endpoints exporter-а

```text
GET /watchtower/health
GET /watchtower/readyz
GET /watchtower/config
GET /watchtower/events
GET /watchtower/metrics/daily
GET /watchtower/players/cohorts
GET /watchtower/players/retention
GET /watchtower/players/cross-game
GET /watchtower/economy
GET /watchtower/treasury
GET /watchtower/security
GET /watchtower/alerts
GET /watchtower/funnels
```

Все endpoints должны быть read-only.

## Обязательные библиотеки и программы

### Если проект на Anchor/Rust

- Rust toolchain, закреплённый через `rust-toolchain.toml`;
- Anchor CLI фиксированной версии;
- Solana CLI фиксированной версии;
- serde/serde_json;
- event decoder или IDL parser;
- PostgreSQL client для read-model, если данные хранятся в БД;
- Prometheus exporter;
- tracing/OpenTelemetry;
- cargo-nextest или эквивалент для тестов;
- gitleaks в CI.

### Если backend на TypeScript/Node.js

- Node.js LTS, зафиксированный в `.nvmrc` или `engines`;
- `@solana/web3.js`;
- IDL/Anchor decoder;
- `pg` или Prisma/Drizzle для read-model;
- `zod` или JSON Schema validator;
- `prom-client`;
- OpenTelemetry SDK;
- Sentry SDK;
- Redis client для rate limits/queues;
- gitleaks в CI.

### Для integration tests

- Surfpool для forked Solana tests;
- Solana localnet как минимальный fallback;
- fixtures реальных транзакций;
- RPC mock для timeout/429/5xx;
- PostgreSQL test database;
- Redis test instance;
- load test tool.

## Что должен делать exporter

1. Читать события из собственного indexer или RPC.
2. Нормализовать события в Watchtower envelope.
3. Уметь отдавать historical backfill.
4. Уметь отдавать новые события.
5. Хранить cursor.
6. Поддерживать deduplication.
7. Сообщать commitment.
8. Показывать finalized lag.
9. Отдавать data quality и confidence.
10. Не иметь signer capability.

## Что не нужно добавлять в игровой репозиторий

Не нужно копировать в игру:

- весь Watchtower dashboard;
- Watchtower API server;
- private keys Watchtower;
- investor UI;
- прямые write endpoints;
- автоматическую выдачу rewards;
- автоматическую блокировку игроков;
- автоматическую рассылку кампаний.

Игра должна предоставить только безопасный read-only exporter и контракт данных.

# Age of Farming (AOF) integration contract

Status: **read-only integration design / mock adapter**
Audit source: `Leo88q/aof-`, base commit `d61963eb65565a0bd093bb790e7df4d266911ac9`, branch `arena/01a0c0b5-aof`.

## Integration verdict

AOF is a large Solana prototype, not a live production service. Watchtower must treat every AOF metric as one of:

- `complete` — derived from verified source data;
- `partial` — derived from Prisma/cache or incomplete chain data;
- `unavailable` — no reliable source exists.

The first Watchtower integration is strictly read-only. No AOF admin endpoint, arbitrary transaction relay, minting operation or economic parameter change may be exposed by Watchtower.

## Game registry entry

```ts
export const aofGame = {
  id: 'aof',
  name: 'Age of Farming',
  network: 'solana',
  stage: 'prototype',
  environment: 'unknown',
  dataQuality: 'partial',
  readOnly: true,
  programs: {
    core: 'HtJg3R3Ki938QeSD98djwMgWESboDVEykuyKGtvRamEq',
    market: '4BhD6spJHdvHQ9mgyaU6AUSLU37oJbTMCDcAXyWhMRVo',
    quests: '4fNKhVw2nErWZBBw9hgWD3Metu1UKbDLdhFGWbCewdLU',
    rebirth: '4rMWC1h9mt6JTfBsUPYLMCydPED4e31cffmix5nZyuRb',
    liquidity: 'Gvbo9wDEW6kCzzhjk3stEcZoVtcScbN8mGv9SNwTUJLv',
    sessionKeys: '6ZnnyKkv1kUE4AJqi5uwdh5ZX6VFGfbQiwhGSkfqZ9K5',
  },
} as const
```

## Security boundary

The AOF adapter must run as a separate read-only exporter or service. It must not receive:

- `ADMIN_TOKEN`;
- `AUTHORITY_SECRET_KEY`;
- session-key store contents;
- wallet keypairs;
- commit-reveal secrets;
- full audit metadata, IP addresses, user agents or device fingerprints.

The adapter receives only a dedicated `X-Watchtower-Token` and has read access to an analytics replica/export. It must not call `/admin/send-tx`, `/admin/mint-resource`, `/admin/test-grant*`, `/admin/set-resource-mints`, `/gastank/sweep` or any other write route.

Until AOF has RBAC, 2FA, approval flow, on-chain issuance caps and a production deployment, Watchtower must expose no AOF write controls.

## Data quality rules

| Domain | Initial quality | Reason |
|---|---|---|
| Service health | partial | production URL and deployment are unknown |
| Config / program IDs | partial | repository declarations are available, RPC state is unverified |
| Player growth | unavailable | no session events or reliable player-day fact table |
| Economy | unavailable | chain event indexer is absent; current monitor returns empty mint/burn arrays |
| Market prices | partial | price tracker exists but is hardcoded to local RPC and is absent from production compose |
| Rewards pipeline | partial | Prisma state machine exists, live DB is unavailable |
| Security alerts | partial | AuditLog exists but actor/action attribution is defective |
| Admin actions | partial | audit records exist, but one ADMIN_TOKEN and mutable SQLite are unsafe |

Every AOF response to Watchtower must include:

```json
{
  "gameId": "aof",
  "dataQuality": "partial",
  "periodStartUtc": "2026-09-20T00:00:00Z",
  "periodEndUtc": "2026-09-21T00:00:00Z",
  "source": "prisma | solana | derived | unavailable",
  "observedAt": "2026-09-21T00:00:00Z"
}
```

All aggregation periods are UTC. Token and lamport amounts are decimal strings, never JavaScript numbers.

## Canonical read models

```ts
export type AofHealth = {
  gameId: 'aof'
  ok: boolean
  environment: 'localnet' | 'devnet' | 'staging' | 'production' | 'unknown'
  dataQuality: 'complete' | 'partial' | 'unavailable'
  dbLatencyMs?: number
  rpcSlot?: number
  rpcLatencyMs?: number
  configPaused?: boolean
  marketPaused?: boolean
  circuitState?: 'CLOSED' | 'OPEN' | 'UNKNOWN'
  observedAt: string
}

export type AofGrowthDaily = {
  gameId: 'aof'
  dayUtc: string
  dau: number | null
  wau: number | null
  mau: number | null
  newPlayers: number | null
  activatedPlayers: number | null
  onboarding: Array<{ step: string; reached: number; completed: number }>
  dataQuality: 'complete' | 'partial' | 'unavailable'
}

export type AofEconomyDaily = {
  gameId: 'aof'
  dayUtc: string
  resourceMint: string
  totalMinted: string | null
  totalBurned: string | null
  netIssuance: string | null
  circulatingSupply: string | null
  treasuryBalance: string | null
  marketVolumeLamports: string | null
  uniqueTransactingWallets: number | null
  sinkSourceRatio: number | null
  dataQuality: 'complete' | 'partial' | 'unavailable'
}

export type AofRewardsPipeline = {
  gameId: 'aof'
  byState: Record<'unclaimed' | 'reserved' | 'submitted' | 'confirmed' | 'quarantined', number>
  oldestSubmittedAgeSec: number | null
  quarantinedCount: number
  dataQuality: 'complete' | 'partial' | 'unavailable'
}

export type AofAlert = {
  id: string
  gameId: 'aof'
  severity: 'critical' | 'high' | 'medium' | 'low'
  type:
    | 'AdminTransactionRelay'
    | 'UnboundedMint'
    | 'ResourceMintChanged'
    | 'ConfigPaused'
    | 'CircuitChanged'
    | 'EmissionSpike'
    | 'RewardQuarantined'
    | 'RewardStuck'
    | 'RpcDegraded'
    | 'AuditAttributionDegraded'
  detectedAt: string
  signature?: string
  payload: Record<string, unknown>
  acknowledged: boolean
}
```

## Watchtower-owned endpoints

These are read-only AOF adapter endpoints. `POST /alerts/:id/acknowledge` changes only Watchtower's local alert state and never submits a blockchain transaction.

```text
GET  /api/games/aof/health
GET  /api/games/aof/config
GET  /api/games/aof/growth?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /api/games/aof/retention?from=YYYY-MM-DD&to=YYYY-MM-DD&days=1,3,7,14,30
GET  /api/games/aof/economy?from=YYYY-MM-DD&to=YYYY-MM-DD&mint=<address>
GET  /api/games/aof/treasury
GET  /api/games/aof/rewards/pipeline
GET  /api/games/aof/security/state
GET  /api/games/aof/admin-actions?from=...&to=...
GET  /api/games/aof/alerts?status=open
POST /api/games/aof/alerts/:id/acknowledge
```

## First data sources

### Available now, but partial

- `GET /query/config`;
- `GET /query/craft-economy`;
- `GET /query/rarity-counter/:idx`;
- `GET /query/weather-state`;
- `GET /public/prices` and `/public/candles/:rarity` with API key;
- `GET /public/stats` and `/public/leaderboard/...` with API key;
- Prisma `EconomySnapshot` and `EconomyAlert`;
- Prisma `InboxItem` reward states;
- Prisma `AuditLog` and `AuditRecord`;
- Prisma `OnboardingState` and `PlayerProfile`.

### Required before complete economy analytics

- Solana log indexer for 37 `aof_core`, 7 `aof_market` and 8 `aof_quests` events;
- idempotent storage by `signature + logIndex/eventType`;
- resource mint/burn flow facts;
- market trade facts;
- treasury snapshots;
- player-day aggregates;
- UTC-defined session events;
- verified production RPC and deployed program bytecode.

## Initial alert rules

| Alert | Severity | Trigger |
|---|---:|---|
| `AdminTransactionRelay` | critical | any `/admin/send-tx` call |
| `UnboundedMint` | critical | `/admin/mint-resource` or `/admin/test-grant*` in production |
| `ResourceMintChanged` | critical | `set-resource-mints` or on-chain config mint mutation |
| `ConfigPaused` | high | `Config.paused` or `MarketConfig.paused` changes |
| `CircuitChanged` | high | circuit breaker enters `OPEN` or state diverges from chain pause |
| `EmissionSpike` | high | mint amount above approved baseline/limit |
| `RewardQuarantined` | high | any reward enters `quarantined` |
| `RewardStuck` | high | reward remains `submitted` beyond 30 minutes |
| `AuditAttributionDegraded` | medium | `unknown` actor rate exceeds 5% |
| `RpcDegraded` | medium | RPC latency/5xx/429 exceeds threshold |
| `EconomyDataPartial` | medium | economy monitor returns partial/empty source data |

Telegram delivery is not implemented in AOF. Watchtower may deliver these alerts to its own bot, but write actions from Telegram are prohibited.

## Analytics schema to prepare

```sql
create table if not exists aof_fact_chain_tx (
  signature text not null,
  log_index integer not null,
  slot bigint not null,
  block_time timestamptz,
  program_id text not null,
  instruction text,
  event_type text,
  wallet_hash text,
  mint text,
  amount_decimal text,
  success boolean,
  payload jsonb not null,
  observed_at timestamptz not null default now(),
  primary key (signature, log_index)
);

create table if not exists aof_fact_player_day (
  player_hash text not null,
  day_utc date not null,
  sessions integer,
  minutes integer,
  actions integer,
  resources_in jsonb,
  resources_out jsonb,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  primary key (player_hash, day_utc)
);

create table if not exists aof_economy_daily (
  day_utc date not null,
  mint text not null,
  total_minted_decimal text,
  total_burned_decimal text,
  net_issuance_decimal text,
  circulating_supply_decimal text,
  treasury_balance_decimal text,
  market_volume_lamports text,
  unique_transacting_wallets integer,
  data_quality text not null,
  primary key (day_utc, mint)
);

create table if not exists aof_admin_actions (
  occurred_at timestamptz not null,
  admin_ref text not null,
  endpoint text not null,
  params_hash text not null,
  tx_signature text,
  role text,
  approved_by text,
  payload jsonb not null
);
```

Wallets, fingerprints, IPs and usernames must not be sent to the LLM. Store only keyed hashes or aggregated values in the AI context. Use k-anonymity threshold >= 20 for player segments.

## Implementation order

1. Add AOF to the Watchtower registry with `prototype`, `partial`, `readOnly: true`.
2. Add mock AOF health, economy and security cards to the dashboard.
3. Implement an adapter interface that never calls the browser directly into AOF or Solana RPC.
4. Add AOF-specific alert types and explicit `dataQuality` rendering.
5. Wait for a verified AOF deployment and read-only exporter before replacing mocks.
6. Build the event indexer and player-day facts.
7. Add sessions, DAU/WAU/MAU, retention and economy flows.
8. Only after RBAC, 2FA, approval and on-chain caps exist, reconsider exposing any operational controls.

## External blockers

- Verify whether any of the six programs are actually deployed and whether bytecode matches the audited commit.
- Rotate/revoke any authority key that may exist in Git history.
- Remove or isolate legacy Firebase/Ronin deployment paths.
- Fix the hardcoded local RPC in the price tracker.
- Decide on production/staging environments and an on-call owner.
- Resolve the tracked historical SQLite database containing IP and user-agent records.
- Define UTC aggregation and the product definition of an active player/session.
- Introduce RBAC, 2FA, approval and immutable admin audit before any operational dashboard controls.

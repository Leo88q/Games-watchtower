# ARES-1 integration contract

Status: **read-only integration design / mock adapter**
Source audit: `Leo88q/ares1`, commit `a271984`, branch `arena/01a0c0b5-ares1`.

## Scope

ARES-1 is a Solana devnet game. Watchtower must initially observe the project without exposing write operations. The first production integration is built around:

- the program id `DUUBiVvpbw5BbFLpryisvLGmBWmhVYC8tdf5xCUyEadf`;
- the existing read-only `GET /health`, `GET /ready`, `GET /api/config` endpoints;
- on-chain program events collected by an indexer;
- daily UTC aggregates stored in PostgreSQL;
- Telegram alerts for critical security events.

## Security boundary

Until Squads multisig, a timelock, 2FA and an external smart-contract audit are in place:

- Watchtower exposes **no ARES-1 write endpoint**;
- Watchtower must never store `PAYER_KEYPAIR_JSON`, authority keys, reward signer keys or RPC API keys;
- dashboard actions for `withdraw_treasury*`, authority transfer, `update_config`, `update_skr_mint` and `grant_reward` are read-only recommendations or alert acknowledgement;
- all external RPC calls happen server-side through environment configuration;
- wallet addresses may be retained as public on-chain identifiers, but daily aggregates are preferred for LLM context.

## Source mapping

| Watchtower concept | ARES-1 source | Current state |
|---|---|---|
| Game health | `/health`, `/ready` | available |
| Config snapshot | `/api/config`, `GameConfig` PDA | available |
| Epoch | `Epoch` PDA, `EpochRolled` | on-chain, needs indexer |
| Supply | POTATO mint account | RPC read |
| Burned | `GameConfig.total_burned_micro` | RPC read, cumulative only |
| Market activity | `MarketStats` PDA | on-chain 24h UTC window |
| Active wallets | event stream | needs indexer |
| Retention | first `FieldCreated` + future events | unavailable until indexer/history |
| Security events | treasury/authority/config/pause events | needs realtime subscription |

## Canonical read model

```ts
export type Ares1Health = {
  status: 'healthy' | 'degraded' | 'down'
  slot?: number
  epochId?: number
  paused?: boolean
  payerSol?: number
  uptimeSeconds?: number
  lastRollSuccess?: string
  consecutiveRollFailures?: number
}

export type Ares1EconomyDaily = {
  gameId: 'ares1'
  dayUtc: string
  mintedMicro: number
  burnedMicro: number
  burnMintRatio: number | null
  supplyMicro: number
  treasuryPotatoMicro: number
  treasurySolLamports: number
  treasurySkrBaseUnits: number
  marketVolumePotatoMicro: number
  marketVolumeSolLamports: number
  tradeCount: number
  uniqueActiveWallets: number
  newWallets: number
  presaleSold: number
}

export type Ares1Alert = {
  id: string
  gameId: 'ares1'
  severity: 'critical' | 'high' | 'medium' | 'low'
  eventType:
    | 'TreasuryWithdrawn'
    | 'TreasurySolWithdrawn'
    | 'TreasurySkrWithdrawn'
    | 'AuthorityProposed'
    | 'AuthorityAccepted'
    | 'ConfigUpdated'
    | 'PausedToggled'
    | 'RewardGranted'
    | 'RollFailure'
    | 'RpcDegraded'
  signature?: string
  slot?: number
  detectedAt: string
  payload: Record<string, unknown>
  acknowledged: boolean
}
```

## Required backend endpoints

These are the Watchtower-owned endpoints. They are intentionally not the ARES-1 write API.

```text
GET /api/games/ares1/health
GET /api/games/ares1/config
GET /api/games/ares1/metrics/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/games/ares1/alerts?status=open
POST /api/games/ares1/alerts/:id/acknowledge
```

`POST .../acknowledge` changes only the Watchtower alert state. It does not submit a blockchain transaction.

## Indexer tables

```sql
create table if not exists ares1_events (
  signature text not null,
  instruction_index integer not null default 0,
  slot bigint not null,
  block_time timestamptz,
  event_type text not null,
  wallet text,
  payload jsonb not null,
  observed_at timestamptz not null default now(),
  primary key (signature, instruction_index, event_type)
);

create index if not exists ares1_events_type_time
  on ares1_events (event_type, block_time desc);

create table if not exists ares1_economy_daily (
  day_utc date primary key,
  minted_micro numeric not null default 0,
  burned_micro numeric not null default 0,
  supply_micro numeric,
  market_volume_potato_micro numeric not null default 0,
  market_volume_sol_lamports numeric not null default 0,
  trade_count integer not null default 0,
  unique_active_wallets integer not null default 0,
  new_wallets integer not null default 0,
  presale_sold integer not null default 0,
  treasury_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

All date aggregation uses UTC. Event ingestion must be idempotent by transaction signature plus event identity.

## Alert rules v1

| Event/rule | Severity | Delivery |
|---|---:|---|
| Any treasury withdrawal | critical | immediate Telegram + dashboard |
| Authority proposed/accepted | critical | immediate Telegram + dashboard |
| `PausedToggled` | high | immediate Telegram + dashboard |
| `ConfigUpdated` affecting `base_yield`, `cap` or multipliers | high | immediate Telegram + dashboard |
| `RewardGranted` outside approved maintenance window | high | immediate Telegram + dashboard |
| 3 consecutive epoch roll failures | high | immediate Telegram + dashboard |
| `payerSol < 0.05` | medium | Telegram digest + dashboard |
| RPC 429/5xx rate above threshold | medium | dashboard + digest |
| burn/mint ratio below 0.4 | medium | daily economy digest |
| cap utilisation above 90% | medium | daily economy digest |

## First implementation slice

1. Add an ARES-1 game definition to the Watchtower game registry.
2. Add read-only mock data matching `Ares1Health` and `Ares1EconomyDaily`.
3. Add ARES-1 to the overview with devnet badge and `data source: mock` label.
4. Create a server-side adapter interface; do not call RPC from browser code.
5. Add alert rendering for treasury, pause and config events.
6. Replace mock adapter with the real indexer once the ARES-1 project exposes a deployed backend and an RPC secret through deployment configuration.

## Blockers outside Watchtower

- rotate and remove the committed Helius key in ARES-1;
- repair the failing ARES-1 CI run;
- deploy ARES-1 backend;
- use paid RPC capacity;
- install event indexer and PostgreSQL;
- migrate authority to Squads 2/3 and add timelock;
- conduct external smart-contract audit before mainnet.

# GUTTERCAPS integration contract

Status: **read-only integration design / mock adapter**
Audit source: `Leo88q/caps`, commit `b4383e1`, branch `arena/01a0c0b6-caps`.

## Integration verdict

GUTTERCAPS is an alpha/pre-launch Solana game. The project has the most integration-ready backend of the audited games: an event indexer, projections, service health endpoints, Prometheus metrics, KPI endpoint, Redis event bus and an admin audit table already exist. However, no programs are deployed, localnet coverage is not yet green, external audit is not complete and no production environment exists.

Watchtower should register it as:

```ts
{
  id: 'guttercaps',
  name: 'GUTTERCAPS',
  network: 'solana',
  stage: 'alpha',
  environment: 'unknown',
  dataQuality: 'partial',
  readOnly: true,
}
```

The Watchtower adapter should consume the existing read-side interfaces rather than receive an admin SIWS session. No GUTTERCAPS private keys are held by the backend; parameter and pause routes only encode payloads for an external Squads/operator flow.

## Security boundary

The adapter must use a dedicated token or mTLS and must not receive:

- `SESSION_SECRET`, SIWS cookies, CSRF tokens or admin wallet secrets;
- Squads members, upgrade authorities, pauser/keeper private keys;
- Turnstile secrets, Pyth/Hermes credentials or RPC credentials;
- raw IPs, device fingerprints, fraud evidence payloads or unredacted admin audit records.

The adapter must not execute:

- `set_params` or `set_split`;
- pause/unpause;
- `sweep_vault` or `withdraw_skr`;
- reward-root revoke/publish;
- `ban`, `rewards_pause` or mass trust changes;
- any keeper or Squads transaction.

## Data quality model

| Domain | Initial quality | Reason |
|---|---|---|
| Service health | partial | no live environment is documented |
| Product KPI | partial | `/admin/kpi` exists, but no real user population is verified |
| On-chain economy | unavailable until deployment | program IDs are placeholders and programs are not deployed |
| Indexer projections | partial | indexer code exists, but no live stream/backfill is verified |
| Anti-fraud | partial | detectors exist; live alerts and operator response are unverified |
| Treasury | partial | models/readers exist; treasury addresses and multisigs are not finalized |
| Client behavior | unavailable | session/crash telemetry is absent |
| Economic formulas | high confidence as specification | `packages/economy` has golden vectors, but runtime deployment is unverified |

Every adapter response includes `dataQuality`, `periodStartUtc`, `periodEndUtc`, `source` and `observedAt`. All metrics are aggregated in UTC. Amounts are returned as decimal strings.

## Game registry entry

```ts
export const guttercapsGame = {
  id: 'guttercaps',
  name: 'GUTTERCAPS',
  network: 'solana',
  stage: 'alpha',
  readOnly: true,
  dataQuality: 'partial',
  programs: ['chip_core', 'market', 'staking', 'arena'],
  capabilities: {
    indexer: true,
    health: true,
    kpi: true,
    eventBus: true,
    mutations: false,
  },
} as const
```

## Existing sources to consume

### Read-only HTTP

- `/readyz`;
- `/v1/health*` including crank, burn oracle, reward oracle, antifraud and finality;
- `/metrics` Prometheus text (must be network-restricted or token-gated);
- `/stats`, `/leaderboard/{board}`;
- `/rewards/skr-pool` and funding view;
- `/market/floor`, `/market/history`;
- `/staking/overview`;
- `/v1/admin/kpi` through a new sanitized `/watchtower/kpi` duplicate, not by storing an admin SIWS session;
- `/admin/audit` and `/admin/fraud` through a dedicated sanitized read role.

### Event/data plane

- `events_raw` as the canonical indexer source;
- projections for packs, opens, fusions, sales, listings, stakes, matches, quests, rewards, SKR pool, service payments and fraud;
- Redis `EVENT_BUS_CHANNEL` in `EVENT_BUS=redis` mode for near-real-time push;
- on-chain PDA reads for `EmissionState`, `SkrPool`, `VaultLedger`, `GameConfig` and program pause state.

Watchtower should prefer `finalized` data for financial metrics and may display confirmed data only with an explicit `confirmed` badge.

## Canonical read models

```ts
export type GuttercapsHealth = {
  gameId: 'guttercaps'
  environment: 'localnet' | 'devnet' | 'staging' | 'production' | 'unknown'
  apiOk: boolean
  databaseOk: boolean
  indexerLagSeconds: number | null
  crankHeadAgeSeconds: number | null
  abandonedCranks: number | null
  finalityLagSlots: number | null
  pythAgeSeconds: number | null
  rewardOracleOk: boolean | null
  burnOracleOk: boolean | null
  antifraudOk: boolean | null
  dataQuality: 'complete' | 'partial' | 'unavailable'
  observedAt: string
}

export type GuttercapsDaily = {
  gameId: 'guttercaps'
  dayUtc: string
  dau: number | null
  newWallets: number | null
  payingWallets: number | null
  revenueUsd: string | null
  mintedCg: string | null
  burnedCg: string | null
  netIssuanceCg: string | null
  sinkSourceRatio: number | null
  packVolumeUsd: string | null
  marketVolumeUsd: string | null
  wagerVolumeCg: string | null
  activeMatches: number | null
  crankP95Seconds: number | null
  dataQuality: 'complete' | 'partial' | 'unavailable'
}

export type GuttercapsEconomy = {
  gameId: 'guttercaps'
  cgSupply: string | null
  cgMintedTotal: string | null
  cgBurnedTotal: string | null
  emissionCapToday: string | null
  mintedToday: string | null
  vaultBalances: Record<string, string>
  vaultLiabilities: Record<string, string>
  skrBudget: string | null
  skrReserved: string | null
  skrAvailable: string | null
  floorIndex: number | null
  pausedPrograms: string[]
  dataQuality: 'complete' | 'partial' | 'unavailable'
}

export type GuttercapsAlert = {
  id: string
  gameId: 'guttercaps'
  severity: 'critical' | 'high' | 'medium' | 'low'
  type:
    | 'ProgramUndeployed'
    | 'InvariantViolation'
    | 'ProgramPaused'
    | 'CrankAbandoned'
    | 'FinalityLag'
    | 'OracleStale'
    | 'EmissionCapExceeded'
    | 'VaultLiabilityViolation'
    | 'SkrPoolViolation'
    | 'FraudSpike'
    | 'ParamsChanged'
    | 'KeeperBalanceLow'
    | 'IndexerStalled'
  detectedAt: string
  payload: Record<string, unknown>
  acknowledged: boolean
}
```

## Watchtower-owned endpoints

```text
GET  /api/games/guttercaps/status
GET  /api/games/guttercaps/kpi
GET  /api/games/guttercaps/daily?day=YYYY-MM-DD
GET  /api/games/guttercaps/economy/live
GET  /api/games/guttercaps/invariants
GET  /api/games/guttercaps/fraud
GET  /api/games/guttercaps/alerts?status=open
GET  /api/games/guttercaps/events?from=...&to=...&cursor=...
POST /api/games/guttercaps/alerts/:id/acknowledge
```

The POST endpoint only updates Watchtower's acknowledgement state. It never calls a GUTTERCAPS mutation endpoint.

## Required daily projections

Build or expose these UTC aggregates:

- DAU/WAU/MAU and new/paying wallets;
- activation funnel: connect → free chip → tutorial match → first paid pack;
- D1/D7/D30 retention;
- pack purchases/openings and USD revenue by payment currency;
- market volume, floor and spread;
- fusion attempts/failures and material burns;
- PvP matches, wager volume, win rates and queue p50/p95;
- $CG minted/burned/net issuance and sink/source ratio;
- staking TVL, withdrawals and penalties;
- SKR pool funded/paid/reserved/surplus;
- vault liabilities and available balances;
- reward-root published/claimed/revoked;
- crank queue age/p95, abandoned jobs and oracle freshness;
- fraud signal counts and operator resolutions;
- admin parameter and pause changes.

`velocity` and average wallet balances are not currently available and must remain `unavailable`, not be approximated from unrelated tables.

## Invariant and alert rules

| Rule | Severity | Trigger |
|---|---:|---|
| Any required program not deployed/verified | critical | program ID is placeholder or RPC mismatch |
| Vault balance below recorded liabilities | critical | I1 failure |
| Pending obligations differ from liabilities | critical | I2 failure |
| Published odds/split do not sum to required total | high | I3 failure |
| Minted amount exceeds guarded cap | critical | I4 failure |
| VRF expansion does not replay | critical | I5 failure |
| Claimed amount exceeds root budget | critical | I6 failure |
| Pending crank/root older than 20 minutes | high | I7 failure |
| Anti-farm/device/risk caps spike | high | I8 anomaly |
| Any program paused | critical | pause transition |
| Crank abandoned or head age over 60 seconds | high | operational alert |
| Pyth age over 45 seconds | high | stale oracle |
| Keeper balance below configured floor | high | funding alert |
| `vault < budget + reserved` for SKR pool | critical | impossible invariant |
| Sink/source ratio below 0.3 for 3 days | high | economy warning |
| Fraud score >= 80 spike | high | anti-fraud alert |
| Params/split changed outside approved window | critical | governance alert |
| Indexer stopped or gap-healer cannot close a gap | high | data freshness alert |

## Admin boundary

These actions are recommendations/drafts only in Watchtower:

- parameter and split changes;
- kill-switch/unpause;
- `sweep_vault` and `withdraw_skr`;
- reward-root revoke/publish;
- mass `ban` or `rewards_pause`;
- keeper operations;
- any Squads transaction.

Off-chain fraud resolutions currently lack dual approval even though on-chain governance is planned around Squads/timelock. Watchtower must require dual control for `ban`, `rewards_pause`, mass `trusted` changes and unpause.

## AI and privacy contract

LLM context may use `events_raw`, sanitized projections, `admin_audit`, `fraud_signals`, economic formulas and aggregate on-chain PDA snapshots. It must not receive:

- IP addresses;
- device hashes as raw identifiers;
- unredacted fraud evidence JSON;
- session/CSRF secrets;
- environment secrets or RPC credentials;
- raw wallet-level histories unless keyed and required for an approved investigation.

Use keyed wallet hashes and aggregates with k-anonymity >= 20. AI can automatically refresh aggregates, run invariant/freshness checks, produce reports and open incidents. It may prepare fraud triage, `ParamsProposal` and economic simulations after approval. It may only recommend parameter changes, bans, rewards pauses, treasury movements, odds changes and marketing actions.

Recommended AI analyses:

1. invariant I1–I8 monitoring;
2. mint/burn/sink ratio report;
3. fraud-signal triage;
4. churn and retention risk;
5. wash-trading graph detection;
6. VRF drop-distribution deviation;
7. pack revenue forecast;
8. marketplace floor/spread health;
9. PvP balance by league/chip archetype;
10. SKR budget versus due obligations;
11. crank/Switchboard capacity forecast;
12. referral cohort quality.

Each detector stores rule version, threshold, window, minimum sample, source snapshot and human outcome. Validate in shadow mode for 2–4 weeks using economy golden vectors and replay data before enabling any automated response.

## Telegram contract

GUTTERCAPS has no Telegram bot or Alertmanager receiver in the repository. Watchtower may provide its own notification service:

- P0: pause, invariant violation, crank abandoned, keeper balance low, SKR pool violation;
- P1: sink ratio degradation, fraud score spike, stale Pyth, parameter change, indexer stalled;
- P2: daily economy digest and capacity reports.

Allowed commands: `/status`, `/crank`, `/fraud_queue`, `/kpi today`, `/pause_status`, `/ack`, `/snooze`, `/skr_pool`. All are read-only or acknowledgement actions. Treasury, pause, unpause, parameter changes, fraud resolution and data export remain Web-panel operations with 2FA/dual control.

## First implementation order

1. Add GUTTERCAPS to the Watchtower registry with `alpha`, `unknown environment`, `partial` and `readOnly`.
2. Add a mock GUTTERCAPS card showing deployment, indexer, crank, oracle and invariant states.
3. Implement token-gated `/watchtower/*` read-only endpoints in the GUTTERCAPS backend, not an admin-session integration.
4. Add the single status aggregator from `/readyz` and health sub-endpoints.
5. Add UTC daily snapshots with documented formulas.
6. Consume Redis `EVENT_BUS_CHANNEL` in a durable Watchtower consumer with backpressure and deduplication.
7. Add invariant service and P0/P1 alerts.
8. Add failed transaction accounting and event freshness metrics.
9. Add client session/error telemetry and expose D1/D7/D30 retention.
10. Add Alertmanager/Telegram delivery only after notification ownership and on-call are defined.

## External blockers

- deploy and verify all four programs;
- make localnet suite green and run end-to-end on-chain scenarios;
- complete external smart-contract audit;
- regenerate mainnet IDs and complete Squads ceremonies;
- migrate treasury SKR wallet from single signer;
- choose SQLite replication versus PostgreSQL and run restore drills;
- configure Redis event bus in production;
- define on-call/SLA and notification receivers;
- add sanctions/compliance screening if the paid product requires it;
- add client crash and session telemetry.

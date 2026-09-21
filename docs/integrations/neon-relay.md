# Neon Relay integration contract

Status: **read-only integration design / mock adapter**
Audit source: `Leo88q/neon-relay`, audited branch `arena/01a0c0b6-neon-relay`, commit `bff5f8d9c273b90aa83e5946edef30fc10850b4d`.

## Integration verdict

Neon Relay is a prototype/alpha pre-release. No production or devnet deployment is verified, four Anchor program IDs are placeholders, and there is no event indexer. Watchtower must register it as:

```ts
{
  id: 'neonrelay',
  name: 'Neon Relay',
  network: 'solana',
  stage: 'prototype',
  environment: 'unknown',
  dataQuality: 'partial',
  readOnly: true,
}
```

The game has three distinct data planes:

1. authoritative C++ game server: races, Neon DM, joins, disconnects and server actions;
2. Node backend: reward ledger, wallet identity, epoch roots and claim intents;
3. Solana programs: reward claims, entry tickets, prize epochs and achievement assets.

Watchtower must not treat a player nickname as a stable identity. Prefer `game_accounts.player_id`, then a pseudonymous wallet binding.

## Security boundary

The Neon Relay adapter must be a separate read-only process. It must not receive:

- `NEONRELAY_ADMIN_TOKEN`;
- game-server RCON/econ passwords;
- Ed25519 event signing keys;
- wallet/keypair files;
- session tokens;
- full wallet addresses, raw player names, chat, IPs or Teehistorian streams in LLM context.

No Watchtower write control is allowed while the following remain unresolved:

- arbitrary `/admin`-style transaction paths or operator routes;
- one shared operator token without RBAC/2FA;
- no verified deployment/program IDs;
- no immutable operator audit;
- no event indexer;
- no production backup/restore procedure.

## Data quality model

| Domain | Quality | Reason |
|---|---|---|
| Game server health | unavailable | no deployed server endpoint is documented |
| Backend health | partial | local backend API exists, production host is unknown |
| Player growth | unavailable | no sessions or player-day facts |
| Race results | partial | game-server SQL and signed JSONL exist, but no shipper |
| Rewards | partial | SQLite ledger is available, but no live DB access |
| Economy | unavailable | on-chain events are not indexed |
| Treasury | partial | RPC reader exists, but treasury is not returned by the current API |
| Security | partial | operations exist, but no centralized event stream/alerting |

Every metric response must carry `dataQuality`, UTC period boundaries, source and observation time.

## Canonical read models

```ts
export type NeonRelayHealth = {
  gameId: 'neonrelay'
  environment: 'localnet' | 'devnet' | 'staging' | 'production' | 'unknown'
  backendOk: boolean
  gameServerOk: boolean | null
  rpcOk: boolean | null
  dataQuality: 'complete' | 'partial' | 'unavailable'
  observedAt: string
}

export type NeonRelayGrowthDaily = {
  gameId: 'neonrelay'
  dayUtc: string
  dau: number | null
  wau: number | null
  mau: number | null
  walletBindings: number | null
  activatedPlayers: number | null
  finishes: number | null
  sessions: number | null
  retention: Record<'d1' | 'd3' | 'd7' | 'd14' | 'd30', number | null>
  dataQuality: 'complete' | 'partial' | 'unavailable'
}

export type NeonRelayEconomyDaily = {
  gameId: 'neonrelay'
  dayUtc: string
  mint: string
  entryFeesLamports: string | null
  rakeLamports: string | null
  rewardsAcceptedMicro: string | null
  rewardsClaimedMicro: string | null
  prizeReservedMicro: string | null
  prizeClaimedMicro: string | null
  vaultBalance: string | null
  treasuryBalance: string | null
  failedTransactions: number | null
  dataQuality: 'complete' | 'partial' | 'unavailable'
}

export type NeonRelayAlert = {
  id: string
  gameId: 'neonrelay'
  severity: 'critical' | 'high' | 'medium' | 'low'
  type:
    | 'ProgramIdsUnverified'
    | 'EpochSealed'
    | 'PrizeEpochClosed'
    | 'RewardIngestSpike'
    | 'AdminTokenAction'
    | 'TreasuryMovement'
    | 'AuthorityChanged'
    | 'Paused'
    | 'RewardStuck'
    | 'RpcDegraded'
    | 'GameServerDegraded'
  detectedAt: string
  payload: Record<string, unknown>
  acknowledged: boolean
}
```

All amounts are decimal strings. Aggregation is UTC. Wallets and player IDs are pseudonymized before leaving the adapter.

## Watchtower endpoints

These endpoints belong to Watchtower's adapter and are read-only. Alert acknowledgement changes only Watchtower's local state.

```text
GET  /api/games/neonrelay/health
GET  /api/games/neonrelay/programs
GET  /api/games/neonrelay/growth?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /api/games/neonrelay/retention?from=YYYY-MM-DD&to=YYYY-MM-DD&days=1,3,7,14,30
GET  /api/games/neonrelay/rewards?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /api/games/neonrelay/economy?from=YYYY-MM-DD&to=YYYY-MM-DD&mint=<address>
GET  /api/games/neonrelay/treasury
GET  /api/games/neonrelay/rewards/pipeline
GET  /api/games/neonrelay/server-metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
GET  /api/games/neonrelay/admin-actions?from=...&to=...
GET  /api/games/neonrelay/alerts?status=open
POST /api/games/neonrelay/alerts/:id/acknowledge
```

## Initial data sources

### Backend SQLite, read-only

- `reward_events`;
- `reward_epochs` and `reward_leaves`;
- `claim_intents`;
- `economy_epochs`, `economy_matches`, `economy_v2_epochs`, `economy_v2_intents`;
- `wallet_bindings`, `sessions`, `auth_nonces`;
- `game_accounts`, `game_identity_grants`, `game_pairings`.

The adapter should read a backup or replica of SQLite rather than attach a second writer to the live ledger.

### Game server data

- read-only copy of race/teamrace/maps/saves/points tables;
- signed JSONL reward events after a file shipper is installed;
- Teehistorian only after explicit retention and privacy policy are defined.

`sv_neonrelay_signing` and `sv_tee_historian` are disabled by default, so game analytics are unavailable until operators enable and ship those streams.

### Solana data

- finalized RPC only;
- two independent RPC endpoints for event backfill and confirmation;
- `logsSubscribe`/`getSignaturesForAddress` for all four programs;
- verify deployed addresses using `solana program show`; do not trust placeholder IDs in `Anchor.toml` or stale docs.

Required event families:

- rewards: `Claimed`, `EpochPublished`, `PauseChanged`, `AuthorityChanged`;
- economy: `PayEntry`, `ClaimPrize`, epoch publication/close events;
- assets/features: `BadgeMinted*`, `TreeCreated`, `CollectionCreated`.

## Alert rules v1

| Rule | Severity | Trigger |
|---|---:|---|
| Program IDs not verified | critical | any configured program remains a placeholder or differs from RPC |
| Reward epoch sealed | high | operator seals an epoch |
| Prize epoch closed | critical | prize distribution is fixed |
| Reward ingest spike | high | signed reward events exceed configured cap/baseline |
| Any admin-token mutation | critical | any operator endpoint affecting ledger/economy |
| Authority changed | critical | authority/pending authority changes |
| Program paused | high | reward/features/economy/assets pause changes |
| Treasury movement | critical | vault/treasury balance changes without matching indexed event |
| Reward stuck | high | claim intent stays pending beyond SLA |
| RPC degraded | medium | finalized RPC errors, slot lag or latency threshold |
| Game server degraded | high | no signed event heartbeat or server health timeout |
| Missing event stream | high | no indexer heartbeat / backfill gap |

Telegram is not implemented in Neon Relay. Watchtower may send alerts through its own notification service; no Telegram command may submit claims, epoch seals or transactions.

## Analytics requirements

### Growth

Before DAU/retention can be considered complete, Neon Relay needs normalized events:

- `session_start`;
- `session_end` with reason;
- `match_start` and `match_end` with mode;
- `wallet_linked`;
- `first_paid_entry`;
- `first_finish`;
- `first_claim`;
- platform, app version and build.

A nickname must never be used as the primary player key. Use a stable operator-approved game account or pseudonymous wallet binding.

### Economy

The adapter must distinguish:

- external SKR/POTATO supply, which Neon Relay does not control;
- reward mint supply;
- entry fees and rake;
- vault balance;
- treasury balance;
- accepted versus claimed rewards;
- reserved versus claimed prizes;
- achievement badge minting.

There is no burn path, no oracle, no token conversion and no project-owned fungible token. Watchtower must not display a fictitious `burn/mint ratio` for Neon Relay.

## Minimal analytics tables

```sql
create table if not exists neonrelay_chain_events (
  signature text not null,
  log_index integer not null,
  slot bigint not null,
  block_time timestamptz,
  program_id text not null,
  event_type text not null,
  wallet_hash text,
  amount_decimal text,
  payload jsonb not null,
  observed_at timestamptz not null default now(),
  primary key (signature, log_index)
);

create table if not exists neonrelay_player_day (
  player_hash text not null,
  day_utc date not null,
  sessions integer,
  minutes integer,
  matches integer,
  finishes integer,
  rewards_micro text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  primary key (player_hash, day_utc)
);

create table if not exists neonrelay_economy_daily (
  day_utc date not null,
  mint text not null,
  entry_fees_lamports text,
  rake_lamports text,
  rewards_accepted_micro text,
  rewards_claimed_micro text,
  prizes_reserved_micro text,
  prizes_claimed_micro text,
  vault_balance text,
  treasury_balance text,
  data_quality text not null,
  primary key (day_utc, mint)
);

create table if not exists neonrelay_admin_actions (
  occurred_at timestamptz not null,
  operation text not null,
  operator_ref text,
  params_hash text not null,
  signature text,
  approval_ref text,
  payload jsonb not null
);
```

## First implementation order

1. Add Neon Relay to the Watchtower game registry as `prototype`, `unknown environment`, `readOnly`.
2. Add a mock card with explicit statuses: `No verified deployment`, `No event indexer`, `Rewards partial`.
3. Build a separate adapter interface; never call Solana RPC from browser code.
4. Verify all four deployed program IDs before accepting any on-chain metric.
5. Create a read-only SQLite snapshot/exporter for the backend ledger.
6. Enable signed JSONL event shipping from the game server with rotation and retention.
7. Implement the Solana event indexer with idempotency by `signature + logIndex`.
8. Add normalized sessions and match events for DAU, retention and Neon DM/race activity.
9. Add treasury/vault readers and reward-pipeline alerts.
10. Add RBAC, 2FA, immutable admin audit and operator approval before any operational controls.

## External blockers

- verify whether any Anchor programs are deployed and whether IDs match the audited code;
- replace placeholder program IDs before deployment;
- define production/staging hosts and backup/restore;
- enable and ship signed game events;
- decide stable player identity and wallet rotation policy;
- add event indexer and Telegram/notification transport;
- add approval flow for epoch seal, prize close and authority actions;
- confirm how treasury movements performed outside programs will be audited;
- resolve payout leftover semantics in prize epoch close;
- decide retention/privacy for Teehistorian and player names.

## Behavioral analytics and anti-fraud additions

The current data is not sufficient for DAU, retention, session duration or churn. The adapter must not infer these metrics from reward events alone. Required normalized events are:

- `session_start` / `session_end` with reason;
- `match_start` / `match_end` with mode (`race`, `neon_dm`);
- `wallet_linked` and `game_identity_verified`;
- `first_paid_entry`, `first_finish`, `first_claim`;
- `client_crash` and `disconnect`;
- `install_attribution` and platform/build metadata.

The first signals that can be calculated from existing data are:

1. speedrun anomaly against a per-map median and standard deviation;
2. checkpoint skip pattern from race checkpoint fields;
3. reward-farm velocity;
4. cap-rejection burst;
5. wallet hopping for one stable player ID;
6. pay-without-play;
7. play-without-pay;
8. unclaimed-prize cluster;
9. available vault pressure;
10. missing signed-event heartbeat.

Anti-fraud is currently limited to upstream DDNet antibot checks, reward caps and signature validation. There is no wallet risk score, Sybil detector, sanctions screen or behavioral transaction monitor. Watchtower should therefore label fraud signals as `heuristic` and require human review; it must not auto-ban or auto-freeze a wallet.

## Security and administrative boundary

The following events must be captured by the Watchtower adapter as immutable alert records:

- failed reward signature validation and cap rejection;
- replay/duplicate reward events;
- session revoke and wallet unlink;
- identity/pairing challenge failures;
- `publish_epoch` and `publish_prizes`;
- `PauseChanged`;
- authority proposal/acceptance;
- fee/rake parameter changes;
- treasury balance changes;
- calls to reward epoch seal and prize epoch close;
- RCON `ban`, `kick`, `mute`, `change_map`, `reload` and `shutdown` when Teehistorian is enabled.

The most dangerous Neon Relay operations are:

- `POST /v1/rewards/epochs/seal`;
- `POST /v1/economy/epoch-close`;
- any authority parameter update;
- program pause/unpause;
- authority change;
- treasury SPL transfers outside the program;
- provisioning or disabling `game_accounts`;
- manual reward ingestion through a server signing key.

These operations must never be direct dashboard buttons in the first version. The Watchtower UI may display a diff, calculate an expected result, request approval and acknowledge an incident, but the actual mutation must happen through a separate operator flow with RBAC, 2FA, dual approval and an append-only administrative ledger.

## Neon Relay alert matrix v2

| Event | Severity | Recommended action |
|---|---:|---|
| Admin token used for epoch seal/close | critical | page operator; freeze further automated closes |
| `poolMicro` differs from vault delta | critical | block close; reconcile chain and backend |
| Root published differs from expected audit root | critical | page operator; do not enable claims |
| Authority changed/proposed | critical | verify 48h timelock and multisig |
| Program pause changed | critical | record affected program and reason |
| Treasury moves without indexed instruction | critical | page finance/security; reconcile external SPL transfer |
| `rejected_signature` spike | high | inspect signing key and game server |
| `rejected_caps` spike | high | inspect farm/multibox behavior |
| Ticket without play / play without ticket spike | high | inspect identity and economy integration |
| Prize claims remain unclaimed above threshold | high | inspect wallet UX and claim RPC |
| Vault `availableBase` below forecast horizon | high | stop new prize commitments; human review |
| RCON moderation spike | high | inspect server incident and operator identity |
| Missing Teehistorian/event heartbeat | medium | mark behavioral metrics unavailable |
| Backend RPC errors or rate-limit surge | medium | fail over RPC / adapter polling |

## Additional implementation blockers

1. The audit reports 97/97 backend tests and 39/39 on-chain tests passing, but no deployment state is verified. Tests must not be treated as evidence that program IDs are live.
2. `publish_epoch` currently writes `leaf_count = 0`; Watchtower must expose proof-depth validation as an unresolved security gate, not as a completed control.
3. Prize distribution semantics are unresolved when fewer than ten winners exist. The dashboard must show `unallocated_prize_micro` instead of silently counting the whole pool as paid.
4. Tournament registration is currently free and has no verified ticket/stake requirement. Do not use tournament registration as a paid-player or Sybil-safe metric.
5. The public reward proof endpoint is read-only by design, but responses must be rate-limited and paginated before high-volume dashboard polling.
6. Admin token comparison should be constant-time; until fixed, Watchtower must not proxy or store that token.
7. `NEONRELAY_AUTH_DOMAIN` must fail fast if it still has the placeholder value `neonrelay.leo88q.example`.

## AI analytics and privacy contract

### Trusted sources

The adapter may use `reward_events` as the backend reward ledger, `reward_epochs`/leaves, `claim_intents`, `economy_epochs`, `economy_v2_intents`, read-only race tables, signed JSONL events, Teehistorian after explicit enablement, and finalized Solana accounts/events. Repository documents are context only and must not override executable code.

The LLM context must never contain:

- raw wallet bindings, labels, player nicknames, IPs or Teehistorian identity data;
- session or pairing token hashes, auth nonces, key material or admin tokens;
- complete Merkle proofs, leaf hashes or wallet-level financial histories unless pseudonymized for a specific review;
- RPC URLs containing provider credentials.

The adapter should emit keyed wallet/player hashes and aggregates with k-anonymity >= 20. Transaction-level data remains in the secure evidence store and is referenced by an opaque incident ID.

### Precomputed facts

Build UTC aggregates for:

- daily active players, sessions and finishes by map;
- reward amounts by status and cap rejections;
- entry tickets by tier;
- claims and vault snapshots;
- wallet link/unlink counts;
- hourly ingestion health, RPC latency/errors and active sessions;
- epoch root, total, leaf count and claimed ratio;
- weekly retention cohorts.

### AI autonomy

AI may autonomously refresh aggregates, run health/freshness checks, produce retention reports and create informational alerts. After human approval it may create tickets, send notifications, prepare a draft epoch report/root payload and produce pseudonymized exports.

AI may only recommend changes to rake/tariffs/caps, program pause, root publication, claims, account bans, treasury withdrawals and authority changes. It must never execute these operations.

Every detector stores rule ID/version, threshold, observation window, minimum sample size, input snapshot reference and human outcome. Evaluate precision, recall, false-positive rate, time-to-acknowledge and human-first detection monthly.

## Notification contract

Neon Relay has no native Telegram/webhook integration. Watchtower notifications should use a separate bot/service:

| Event | Severity | Channel |
|---|---:|---|
| pause, authority change, root mismatch, signature rejection spike | P0 | critical/on-call, never muted |
| vault pressure, RPC failure spike, reward pipeline failure | P1 | finance/ops |
| unclaimed-prize growth, 429/5xx growth | P2 | ops, quiet hours allowed |
| daily rewards/claims/economy digest | P3 | reports |

Allowed Telegram actions: read-only status, alert acknowledgement, report generation and rule muting. Forbidden: root publication, epoch closing, treasury movement, pause, fee changes, caps, account operations and personal-data export. The bot must use its own restricted scope, never the admin token.

## First 10 implementation tasks

1. Create the isolated read-only database snapshot/replica for the adapter.
2. Split operator access into roles, add 2FA/step-up approval and append-only admin audit; remove client-supplied `poolMicro` from prize close.
3. Implement finalized Solana event indexing for all four programs.
4. Reconcile documentation with code and mark stale security claims as historical.
5. Add automated ledger backup and restore verification.
6. Decide and test prize-pool behavior when fewer than ten winners exist.
7. Add backend-root versus on-chain-root reconciliation after every seal/publish.
8. Add pagination and filters to read APIs.
9. Add session and match events for growth analytics.
10. Add P0/P1 notification channels with no mutating Telegram commands.

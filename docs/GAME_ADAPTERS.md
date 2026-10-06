# Game adapters

`server/ingestion/game-adapters.js` defines the provider-independent contract for all four games.

Each adapter contains:

- game ID and display name;
- environment variable for the verified program ID;
- supported event names;
- resource IDs;
- current data-quality expectation;
- explicit `writes: false` policy.

## Configuration

Program IDs are intentionally empty until verified deployments are supplied:

```env
ARES1_PROGRAM_ID=
AOF_CORE_PROGRAM_ID=
NEONRELAY_REWARDS_PROGRAM_ID=
GUTTERCAPS_CORE_PROGRAM_ID=
```

## Endpoints

```text
GET /api/ingestion/adapters
GET /api/games/:gameId/ingestion
```

Unknown events are retained as raw events with a `raw-v1` parser version. They are never silently treated as decoded business facts.

## Location analytics

For a Cosmos region/location slice, the game must attach an explicit location tag to each applicable event. Accepted forms are top-level `regionId` / `locationId`, or `payload.regionId`, `payload.locationId`, `payload.region` or `payload.location`. Use stable IDs that match the Cosmos region IDs where possible (for example, `telemetry`), not player-controlled labels.

```text
GET /api/games/:gameId/telemetry?windowDays=7[&regionId=telemetry]
GET /api/economy/overview?gameId=:gameId&window=7d[&regionId=telemetry]
GET /api/funnels?gameId=:gameId&windowDays=7[&regionId=telemetry]
```

Telemetry is aggregate-only; it does not return player keys or event payloads. Untagged events remain in the game-level totals, but are never copied into every region. If a region has no tagged events, its economy is `unavailable`, not a measured zero. The optional `WATCHTOWER_ECONOMY_*` values describe the studio and are not applied to a game/location slice until per-game configuration exists.

The adapter layer does not submit transactions and cannot open blockchain writes.

## Handoff from game teams

Before changing a game or claiming an adapter is production-ready, use [`PROMPT_GAME_TEAM_WATCHTOWER_HANDOFF_RU.md`](./PROMPT_GAME_TEAM_WATCHTOWER_HANDOFF_RU.md) to request a verified, privacy-safe packet: canonical IDs, deployments, real event maps, replay/idempotency facts, fixtures, and test evidence. The prompt describes the current hub boundary and distinguishes implemented intake from roadmap-only exporter requirements.

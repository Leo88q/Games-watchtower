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

The adapter layer does not submit transactions and cannot open blockchain writes.

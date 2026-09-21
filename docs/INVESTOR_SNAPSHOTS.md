# Investor snapshots

Investor numbers need a stable historical record. The API provides versioned immutable snapshots:

```text
GET  /api/investors/snapshots
POST /api/investors/snapshots
```

Example request:

```json
{
  "period": "30d UTC",
  "createdBy": "operator"
}
```

Snapshots include:

- snapshot ID;
- calculation version;
- period;
- creator;
- timestamp;
- full aggregated report;
- privacy policy;
- confidence and data quality.

The local adapter uses `data/investor-snapshots.json`. Production should store snapshots in PostgreSQL or object storage with retention, access control and export signing.

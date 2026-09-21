# Production control surface

The API exposes one read-only control surface for the dashboard and future integrations.

```text
GET  /api/investors/report
GET  /api/control/policy
GET  /api/control/requests
POST /api/control/requests
GET  /metrics
```

Control requests are proposals only. Every request has:

- request ID;
- game ID;
- operator;
- reason;
- pending review status;
- required approval count;
- `blockchainWrite: false`.

Investor reports contain aggregated metrics only and explicitly carry `privacy` and `confidence` fields.

Prometheus currently exports ingestion counters and a hard `watchtower_blockchain_writes_enabled 0` gauge.

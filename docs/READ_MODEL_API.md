# Unified read model API

The dashboard can hydrate from one endpoint:

```text
GET /api/read-model
```

It returns the current consistent snapshot of:

- overview;
- adjacent analytics;
- investor report;
- funnels;
- cross-game segments;
- campaign recommendations;
- ingestion status and adapter readiness;
- control policy.

Operational endpoints:

```text
GET /api/health
GET /api/readyz
GET /metrics
```

The unified endpoint is read-only and does not submit blockchain transactions. In production it should be served from a versioned read-model cache so all dashboard cards refer to the same snapshot timestamp.

# Production hardening

The API now supports optional read-only authentication and basic operational protection.

## Environment

```env
WATCHTOWER_READ_TOKEN=long-random-read-only-token
WATCHTOWER_RATE_LIMIT=120
```

When `WATCHTOWER_READ_TOKEN` is set, protected API calls must include:

```text
Authorization: Bearer <token>
```

Health, readiness and Prometheus endpoints remain public for orchestration. Dashboard access should be routed through an authenticated gateway in production.

The API also adds:

- CORS preflight handling;
- rate limiting per forwarded IP;
- audit records for every request;
- `nosniff` and `frame-ancestors`-compatible response headers;
- explicit `blockchainWrite: false` on audit entries.

The in-memory rate limiter and audit log are local safety nets. Production should replace them with Redis and PostgreSQL/OpenTelemetry export.

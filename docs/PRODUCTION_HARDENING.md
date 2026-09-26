# Production hardening

The API requires read-only authentication in production and provides operational protection. In development/test, read auth may be omitted for local use only.

## Environment

```env
WATCHTOWER_READ_TOKEN=long-random-read-only-token
WATCHTOWER_RATE_LIMIT=120
```

Protected API calls must include `WATCHTOWER_READ_TOKEN`; production startup fails if it is missing. The HMAC ingest path rejects a repeated signed request inside its freshness window in a single process. This replay cache is process-local; use a shared atomic nonce store before running multiple replicas.

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

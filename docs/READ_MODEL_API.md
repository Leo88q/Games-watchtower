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

## Актуальный контракт (после аудита 2026-09-23)

Доступ:

| Тип | Маршруты | Требования |
|---|---|---|
| public | `GET /api/health`, `GET /api/readyz`, `GET /metrics`, статика `dist/` | без токена; секретов и идентификаторов игроков в ответах нет |
| read | все остальные `GET /api/*` | `Authorization: Bearer $WATCHTOWER_READ_TOKEN` (если токен задан; в production обязателен) |
| write | `POST /api/ingest/*`, `POST /api/feedback`, `POST /api/control/requests`, `POST /api/campaigns/proposals`, `POST /api/investors/snapshots`, `POST /api/pii/erasure` | Bearer ingest-токен **или** HMAC-подпись тела (`X-Watchtower-Timestamp`, `X-Watchtower-Signature`, окно ±5 мин). Без настроенного секрета — `503 ingest_disabled_no_secret_configured` |

Что ещё важно знать про ответы:

- `GET /api/read-model` содержит `economy` (те же метрики, что и `/api/economy/overview`), `alerts`, `demo` и `source`.
- `GET /api/events` отдаёт события только с псевдонимами игроков: `privacy: "anonymized-player-keys"`,
  поле `anonymizedFields` перечисляет заменённые ключи. Открытые кошельки не покидают хаб.
- `GET /api/pii/policy` — что хранится и что никогда не хранится; `GET /api/pii/player?identifier=…` —
  агрегаты по игроку без идентификатора; `POST /api/pii/erasure` — удаление всех событий игрока.
- Недоступные значения — `null` плюс `quality: "unavailable"` и `reason`. Ноль в ответе означает
  измеренный ноль, а не отсутствие данных.
- Синтетика: `?demo=1` (только при `WATCHTOWER_ALLOW_DEMO=1`), ответ содержит `demo: true`,
  `warning: "DEMO DATA…"` и `source: "demo://…"`.
- Ограничения: тело ≤ `WATCHTOWER_MAX_BODY_BYTES` (413 при превышении), невалидное событие — 422 с `errors[]`,
  неверный JSON — 400, превышение частоты — 429 с `Retry-After`.

## Cross-game endpoints

```text
GET /api/players/cross-game        # сегменты: игроки в 1 / 2 / 3+ играх (общий псевдоним кошелька)
GET /api/cross-game/projection     # переносы предметов между играми — только по реальным событиям
GET /api/campaigns/recommendations # черновики кампаний для сегментов «одна игра»
```

`/api/cross-game/projection` при отсутствии событий переноса возвращает `dataQuality: "unavailable"`,
`totalLinks: 0` и `reason` со списком нужных событий. Захардкоженных предметов и пар игр в ответе нет:
раньше они были (заглушка), теперь каждая связка — факт из inbox. Статус переплетения целиком —
`docs/INTERWEAVING_STATUS.md`.

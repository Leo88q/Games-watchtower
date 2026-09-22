# Интеграция: TalkChart Traffic Generator (`trafficgen`) — ОБНОВЛЕНО 2026-09-22 по финальному отчету

Games Watchtower знает об off-chain приложении **TalkChart Traffic Generator & Audience Layer** как об источнике `trafficgen`. Исходный контракт — `PROMPT_TRAFFIC_GENERATOR_INTEGRATION.md`; финальный отчет получен и исполнен в том же репозитории генератора.

## Финальный отчет — Статус Готово (2026-09-22)

**Промт исполнен в этом же репозитории генератора:** аудит 17 gap'ов → реализация → 17 unit тестов → 45 e2e smoke → скан секретов → живой прогон сервера с curl.

- **Статус:** Готово
- **Тесты:** `UNIT: 17/17 OK`, `SMOKE: 45/45 CHECKS PASSED`, `LIVE: 12/12 GET 200`
- **Секреты:** 415 файлов, 279 текстовых, 0 кандидатов (скрипт `scripts/scan_secrets.py`)
- **Паспорт:** переписан под шаблон §3.1, `stage: live`, `traffic_type: hybrid`, `implemented_events: 17`, `unavailable_events: 12`, `last_synced_at: 2026-09-22T18:00Z`, `data_quality: partial` честно

## Подтверждённые параметры (из нового паспорта WATCHTOWER_INTEGRATION.md)

| Параметр | Значение |
|---|---|
| app_id / name | `trafficgen` / TalkChart Traffic Generator & Audience Layer |
| Тип | off-chain генератор аудитории, `traffic_type: hybrid` (bot `factory_pipeline`) |
| Стек | python3, vanilla-js, github-actions, sqlite3, FastAPI Uvicorn, WAL |
| Deployment | `https://leo88q.github.io/content-` (exporter `0.0.0.0:8000`) + Docker `watchtower_exporter.py` |
| API | 12 GET `/watchtower/*` в каноническом конверте, Prometheus `/watchtower/metrics` text/plain |
| Аутентификация | `WATCHTOWER_READ_TOKEN` + `WATCHTOWER_READ_TOKEN_PREVIOUS` ротация, constant-time `hmac.compare_digest`, Bearer |
| Хранилище | SQLite WAL `UNIQUE(event_id)` + `UNIQUE(identity)`, retention 30d + прайнинг, `metrics_state` write-through для переживания рестарта |
| Cursor/Replay | `base64(cursor:<lastId>)`, replay 1200 событий детерминирован, retry-валидация, невалидный cursor → `400 invalid_cursor` (тихий сброс убран) |
| Gap detection | монотонный `seq` по сессиям, `DataGapDetected{expectedSeq,receivedSeq,missingCount}` active, частичный backfill seq 3 остается active, полный seq 4 → `DataGapHealed{healedSeq}` resolved |
| PII | `strip_pii()` рекурсивно: ключи ip/email/fingerprint/device_id/user_agent/cookie/token/wallet/signer/..., IPv4+IPv6 fe80::1 + email + 64-hex в значениях, чувствительные query-параметры URL (utm_* целы), живой grep PII clean, `sessionId` детерминированная sha256 псевдонимизация `sess_<hash>` |
| Read-only | `POST/PUT/DELETE/PATCH /watchtower/*` → `405 + Allow: GET, OPTIONS` включая legacy `/watchtower/ingest`, единственный пишущий шлюз `POST /api/track` 200/202(DNT)/422(schema)/429/413 |
| Consent | `?notrack`/DNT:1/Sec-GPC → `202 opted_out` в БД не пишется, `PRIVACY.md` написан |
| Rate limit | `/api/track` 30 rps → `429 + Retry-After` + событие `RateLimited` |
| Auth | constant-time + `_PREVIOUS` ротация, 405 гарантии на каждый маршрут |

## Канонические события — 17 implemented, 12 unavailable (честно)

**Implemented (есть реальный эмиттер + тест):**
- Клиент `site/app.js` → `/api/track`: `SessionStarted, PageView, Click, CTAClicked, SessionEnded` via pagehide, referrer-class
- Gap-детектор: `DataGapDetected, DataGapHealed`
- Rate-лимитер: `RateLimited`
- Новый реконсилёр config store при старте экспортера (реальный сигнал из config, не выдумка): `CampaignCreated, CampaignStarted, CampaignStopped, CampaignUpdated, SourceConnected, SourceDisconnected, SourceHealthChanged, PageAssigned, PageRemoved` — 3 фазы, детерминированные identity, идемпотентно: первый запуск 24 события, повтор 0

**Unavailable (12, без выдумывания, с причинами в паспорте):**
- `LandingReached` — нет механизма подтверждения перехода
- `SessionAbandoned, NavigationCompleted, DeliveryFailed, RetryScheduled, TrafficError, ExporterHealth, BotFlagged, AnomalyDetected, AbuseBlocked, ConfigUpdated, EmergencyPause` — у каждого причина

Поля `campaignId, sourceId, sourceType, pageId, sessionId, seq` в корне события (не только payload) — нормализация в `server/ingestion/provider.js` учитывает оба места. Canonical identity: `offchain:trafficgen:<campaignId>:<pageId>:<sessionId>:<seq>`.

`/watchtower/forecast` намеренно `dataQuality: unavailable, confidence: 0.0` — модель не выдумывает цифры.

**Gap-фиксы из аудита (17 штук):**
1. R3 честная воронка: `max(count, len(CAMPAIGNS_DEF))` удален — нарушение R3
2. `DataGapHealed` lifecycle реализован (была заглушка pass)
3. Невалидный cursor → 400 `invalid_cursor` (был тихий сброс на 0)
4. PUT/DELETE/PATCH → 405 + Allow (было 501 без Allow)
5. schema-rejected seq<1, не-UTC, плохой sourceType — добавлена валидация
6. metrics/daily: days-серия, p50/p95, byPage, bot/real — добавлено (были плоские totals)
7. Счетчики Prometheus переживают рестарт — write-through в `metrics_state` + пересчет из events
8. `strip_pii` рекурсия, значения IP/email/wallet, URL query — расширено
9. `factory_pipeline` → принудительно `bot` — нормализация добавлена
10. Синтетика `payload.synthetic` исключена из агрегатов
11. consent/opt-out DNT/GPC + PRIVACY.md — добавлено
12. Rate limit /api/track → 429 — добавлено
13. Auth constant-time + _PREVIOUS ротация — `hmac.compare_digest`
14. Retention 30d + прайнинг — реализовано
15. Паспорт по шаблону 3.1 + implemented/unavailable — переписан
16. Каталог событий по реальности — CampaignStarted теперь реальный эмиттер (reconciler), LandingReached unavailable честно
17. Secret-scan + тесты 16 групп + смоук 11.2 — 17 тестов, 45 смоук, сканер 12 сигнатур

Осознанные отклонения R7: голое name и публичные on-chain адреса пулов не чистятся (не PII), персональные firstName/lastName/username/login — чистятся; счетчики ошибок процесс-глобальны и в days[] показывают 0 (помечено в unavailableMetrics).

## Кампании и источники (справочно)

- Кампании: `talkchart_seo, talkchart_social_x, talkchart_video_reels, talkchart_interactive_radar, tiplink_welcome_drop`
- Источники: `x_twitter, perplexity_ai, chatgpt_search, google_search, short_video, tiplink_referral, direct_web, factory_pipeline` (bot)
- Страницы: `target_terminal, target_sixsec` (SixSec), `target_duel` (CandleDuel), `target_crash` (MemeCrash), `target_quest` (WhaleQuest), `target_tiplink_claim`

## Что уже есть в Watchtower — ОБНОВЛЕНО

- Адаптер `trafficgen` в `server/ingestion/game-adapters.js` — 17 eventTypes implemented, 12 unavailable с причинами, quality `partial` (было unavailable), stage live, trafficType hybrid, campaigns/sources/pages, lastSyncedAt 2026-09-22T18:00Z
- Off-chain envelope, dedup, cursor base64, replay 1200 deterministic, invalid_cursor 400, 405 Allow, schema-rejected seq<1 non_utc bad sourceType, synthetic exclusion
- Pull-провайдер `TrafficgenProvider`: `GET /watchtower/health`, `GET /watchtower/events?cursor&limit&eventType&campaignId&sourceType&since` + Bearer + _PREVIOUS rotation constant-time, backfill/stream
- Аналитика `server/analytics/traffic.js` — totals daily continuous 7 days series avg/p50/p95 bounce/CTA/landing rate breakdowns byCampaign/bySource/byPage trafficType real/bot/hybrid visitorsByType bot не смешивается, integrity duplicates/rejected/dataGaps/dataGapsHealed/rateLimited buffer_depth 0, unavailableMetrics, честная воронка без max(), LandingReached stageUnavailable true, syntheticExcluded
- `GET /api/analytics/traffic` + `traffic` в `GET /api/read-model` + `POST /api/ingest/trafficgen` + `GET /api/infra/trafficgen`
- UI: раздел «Трафик / Acquisition» на дашборде, гидратация из read-model
- Smoke: 45 checks + 17 unit + live 12/12 GET 200, PII clean, metrics real=1 bot=24

## Подключение

1. Запустить exporter: `python3 site/factory/watchtower_exporter.py` порт 8000 или Docker
2. Установить в Watchtower: `TRAFFICGEN_API_BASE_URL=https://<host>:8000` + `WATCHTOWER_READ_TOKEN` (значение только через env)
3. Проверить: `curl $TRAFFICGEN_API_BASE_URL/watchtower/health` и `GET /api/infra/trafficgen` → `ok: true`
4. Вычитать: `TrafficgenProvider.backfill()/stream()` cursor + replay, события в inbox source trafficgen
5. Quality уже `partial` по отчету, поднимется до `complete` когда 12 unavailable получат эмиттеры

## Измененные файлы в генераторе (из отчета)

`site/factory/watchtower_exporter.py` (переписан, fix SQLITE_BUSY, IPv6 fe80::1, bump_metric вне транзакции), `site/app.js` (opt-out, target_terminal, SessionEnded, referrer-class), `WATCHTOWER_INTEGRATION.md`, `PRIVACY.md`+, `.env.example`+, `scripts/scan_secrets.py`+, `PROMPT_TRAFFIC_GENERATOR_INTEGRATION.md`+, `scripts/test_watchtower.py` (17), `scripts/smoke_watchtower.py` (45), `package.json` (npm run scan), `.github/workflows/factory.yml` (watchtower-contract), `.gitignore` (WAL-сайдкары), `PROGRESS.md`

## Ограничения

- Watchtower не управляет трафиком: только read-only
- Bot-трафик factory_pipeline sourceType bot отображается отдельно, не смешивается с real
- PII отсутствует по контракту + живой grep PII clean
- LandingReached остается unavailable — нет механизма подтверждения перехода, честно
- Счетчики ошибок процесс-глобальны в days[] 0 — помечено в unavailableMetrics

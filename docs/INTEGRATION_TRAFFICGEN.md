# Интеграция: TalkChart Traffic Generator (`trafficgen`)

Games Watchtower знает об off-chain приложении **TalkChart Traffic Generator & Audience Layer** как об источнике `trafficgen`. Исходный контракт для репозитория генератора — `PROMPT_TRAFFIC_GENERATOR_INTEGRATION.md`; полученный паспорт приложения подтверждает контракт.

## Подтверждённые параметры (из паспорта `WATCHTOWER_INTEGRATION.md`)

| Параметр | Значение |
|---|---|
| app_id / name | `trafficgen` / TalkChart Traffic Generator & Audience Layer |
| Тип | off-chain генератор аудитории, `traffic_type: hybrid` (есть bot-источник `factory_pipeline`) |
| Стек | python3, vanilla-js, github-actions, sqlite3 |
| Deployment | `https://leo88q.github.io/content-` (exporter поднимается на `0.0.0.0:8000`) |
| API | `GET /watchtower/*`, все ответы в каноническом конверте Watchtower |
| Аутентификация | опциональный Bearer через `WATCHTOWER_READ_TOKEN` |
| Хранилище событий | SQLite (ACID, `UNIQUE(event_id)`, `UNIQUE(identity)`), retention 30d |
| Cursor/Replay | base64 `cursor:<lastId>` по автоинкрементному `id`, replay с нуля поддерживается |
| Gap detection | монотонный `seq` по сессиям, события `DataGapDetected` |
| PII | `strip_pii()` удаляет ip/email/fingerprint/device_id/user_agent/cookie/secret; сессии — `sess_<random>` |
| Read-only | `POST/PUT/DELETE/PATCH /watchtower/*` → `405 Method Not Allowed` |

## Канонические события (раздел 5 паспорта)

```text
CampaignStarted, SessionStarted, PageView, CTAClicked, LandingReached, DataGapDetected
```

Поля `campaignId`, `sourceId`, `sourceType`, `pageId`, `sessionId`, `seq` несутся **в корне события** (не только в `payload`) — нормализация в `server/ingestion/provider.js` учитывает оба места. Canonical identity: `offchain:trafficgen:<campaignId>:<pageId>:<sessionId>:<seq>`.

`/watchtower/forecast` намеренно `dataQuality: unavailable, confidence: 0.0` — модель прогноза не выдумывает цифры.

## Кампании и источники (справочно для аналитики)

- Кампании: `talkchart_seo`, `talkchart_social_x`, `talkchart_video_reels`, `talkchart_interactive_radar`, `tiplink_welcome_drop`.
- Источники: `x_twitter`, `perplexity_ai`, `chatgpt_search`, `google_search`, `short_video`, `tiplink_referral`, `direct_web`, `factory_pipeline` (bot).
- Целевые страницы: `target_terminal`, `target_sixsec` (SixSec), `target_duel` (CandleDuel), `target_crash` (MemeCrash), `target_quest` (WhaleQuest), `target_tiplink_claim`.

## Что уже есть в Watchtower

- Адаптер `trafficgen` в `server/ingestion/game-adapters.js` (eventTypes совпадают с паспортом; `quality` поднимется после runtime-проверки).
- Off-chain event envelope, dedup, cursor; push: `POST /api/ingest/trafficgen`.
- Pull-провайдер `TrafficgenProvider`: `GET /watchtower/health`, `GET /watchtower/events` с фильтрами `cursor/limit/eventType/campaignId/sourceType/since`, опциональный Bearer.
- Аналитика: `GET /api/analytics/traffic` + секция `traffic` в `GET /api/read-model` (totals, daily, воронка, кампании/источники/страницы, real vs bot, `DataGapDetected`).
- UI: раздел «Трафик / Acquisition» на дашборде (навигация → секция), гидратация из read-model.
- Smoke-тесты: off-chain ingest по схеме TalkChart, извлечение top-level полей, dedup, read-only контракт.

## Подключение (когда exporter доступен из сети)

1. Запустить exporter в TalkChart-репозитории: `python3 site/factory/watchtower_exporter.py` (порт 8000).
2. Установить в Watchtower: `TRAFFICGEN_API_BASE_URL=https://<host>:8000` и при необходимости `WATCHTOWER_READ_TOKEN` (значение — только через env, не в git).
3. Проверить: `curl $TRAFFICGEN_API_BASE_URL/watchtower/health` и `GET /api/infra/trafficgen` → `ok: true`.
4. Вычитать события: `TrafficgenProvider.backfill()/stream()` (cursor + replay), события попадают в inbox с `source: trafficgen`.
5. Поднять `quality` адаптера (`unavailable → partial/complete`) по результатам проверки; дашборд и read-model обновятся автоматически.

## Ограничения

- Watchtower не управляет трафиком: только read-only чтение `/watchtower/*`.
- Публичный endpoint из песочницы Arena не верифицирован (нет исходящего интернета) — `quality` остаётся `unavailable` до шага 3.
- Bot-трафик (`factory_pipeline`, `sourceType: bot`) отображается отдельно от реального.
- PII в events отсутствует по контракту; Watchtower дополнительно не требует персональные данные.

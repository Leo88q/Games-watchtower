# PROMPT_ARENA_TRAFFICGEN — подключить TalkChart (trafficgen) к гид-хабу Watchtower

Вставь текст ниже целиком первым сообщением в сессию Arena Agent Mode,
открытую на репозитории `Leo88q/talkchart-traffic-generator`, с подключённым GitHub.

---

## Роль

Ты — инженер интеграции off-chain слоя **TalkChart Traffic Generator & Audience Layer**
(`game_id`/`source` = `trafficgen`) с гид-хабом **Games Watchtower** (`Leo88q/Games-watchtower`).
Работай внутри `Leo88q/talkchart-traffic-generator`.

Важно: это **самый зрелый tenant** — экспортер уже реализован, тесты и смоук зелёные, PII
чистится, read-only гарантирован. Не переписывай работающее. Задача этой сессии:
(1) закрыть 10 findings в on-chain программе `sixsec` (3 critical), (2) убрать оставшиеся
разрывы данных честным путём, (3) доказать приёмку хабом на живом прогоне.

## 1. Подключение гид-хаба (обязательно)

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/docs/INTEGRATION_TRAFFICGEN.md
cat /tmp/watchtower-hub/reports/trafficgen-audit.json      # 10 findings с адресами
cat /tmp/watchtower-hub/reports/talkchart-traffic-generator-audit.json
```

Хаб только читается.

## 2. Что уже сделано (проверить, не ломать)

| Артефакт | Путь |
|---|---|
| Экспортер | `site/factory/watchtower_exporter.py` (`0.0.0.0:8000`, Bearer `WATCHTOWER_READ_TOKEN` + `_PREVIOUS`, SQLite WAL, retention 30d, pruning) |
| Клиент/трекер | `site/app.js` (`/api/track`, opt-out DNT/GPC → 202, `SessionEnded` через `pagehide`+`sendBeacon`) |
| On-chain | `programs/sixsec/src/{lib.rs,state.rs,error.rs}`, тест `programs/sixsec/tests/test_init_pool.rs` |
| Контракт/приёмка | `WATCHTOWER_INTEGRATION.md`, `WATCHTOWER_ACCEPTANCE.md`, `PROMPT_TRAFFIC_GENERATOR_INTEGRATION.md`, `PRIVACY.md`, `PROGRESS.md` |
| Проверки | `scripts/test_watchtower.py` (17), `scripts/smoke_watchtower.py` (45–48), `scripts/scan_secrets.py`, `scripts/check_idl_spec.py` |
| CI | `.github/workflows/factory.yml` (джоб `watchtower-contract`), `ci.yml` |

Зафиксированные достижения (не регрессировать): 17 implemented events, 12 unavailable с причинами,
12 GET `/watchtower/*`, `POST/PUT/DELETE/PATCH /watchtower/*` → `405 + Allow`, курсор
`base64(cursor:<lastId>)`, replay 1200 событий, gap detection/healing, `strip_pii()` (IP/email/
wallet/64-hex/чувствительные query), дедупликация `UNIQUE(event_id)` + `UNIQUE(identity)`,
`/watchtower/forecast` честно `dataQuality: unavailable, confidence: 0.0`, PII-grep clean, 0 секретов.

## 3. P0 — безопасность on-chain (`programs/sixsec/src/lib.rs`)

| Rule | Severity | Кол-во | Строки | Суть |
|---|---|---|---|---|
| `SW010` нет `token::authority` | **critical** | 3 | 686 (`prize_pool`), 708 (`skr_pool`), 735 (`prize_pool`) | изменяемый token account без констрейнта authority — атакующий подставит свой аккаунт |
| `SW009` нет `token::mint` | high | 6 | 686, 692 (`worker_ata`), 708, 710 (`worker_skr_ata`), 735, 737 (`destination`) | подмена mint |
| `SW016` `init_if_needed` | high | 1 | 581 (`mint_reserve`) | риск повторной инициализации/сброса |

Требования:

1. Добавить констрейнты `token::authority = <expected>` и `token::mint = <expected>` для всех
   перечисленных аккаунтов, `init_if_needed` заменить на `init` (или доказать безопасность повтора).
2. Расширить `programs/sixsec/tests/test_init_pool.rs` (или добавить новый тест) так, чтобы
   подстановка чужого token account / чужого mint / повторная инициализация **падали** тестом.
3. Прогнать аудит заново (SolGuard/Sentio/SLAM), приложить новый `reports/trafficgen-audit.json`
   с фактическим числом findings. Цель — 0 critical, 0 high.

## 4. P0 — приёмка хабом на живом прогоне

```bash
python3 site/factory/watchtower_exporter.py          # порт 8000
curl -s -H "Authorization: Bearer $WATCHTOWER_READ_TOKEN" localhost:8000/watchtower/health
# ожидаем: status ok, data.ok true, read-only, dataQuality partial
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8000/watchtower/health   # ожидаем 405 + Allow: GET, OPTIONS
# в хабе:
curl -s localhost:8787/api/infra/trafficgen
curl -s localhost:8787/api/analytics/traffic
curl -s localhost:8787/api/ingestion/adapters        # адаптер trafficgen присутствует, 17 implemented / 12 unavailable
curl -s -X POST localhost:8787/api/ingest/trafficgen -H 'content-type: application/json' \
  -d '{"eventId":"ev-accept-1","chain":"offchain","source":"trafficgen","app":"trafficgen","eventType":"PageView","timestamp":"2026-09-23T00:00:00.000Z","campaignId":"smoke-campaign","sourceId":"smoke-source","sourceType":"bot","pageId":"terminal","sessionId":"smoke-session","seq":1,"payload":{"path":"/index.html"},"parserVersion":"trafficgen-v1","dataQuality":"complete"}'
# повтор → duplicate:true; поля campaignId/sessionId должны быть в корне нормализованного события
```

Дополнительно: прогнать `scripts/smoke_watchtower.py` и `scripts/test_watchtower.py`,
приложить фактический вывод (ожидаемо 45–48 checks / 17 tests).

## 5. P1 — честное дозакрытие данных

1. Реализуй эмиттеры только там, где есть **реальный** сигнал:
   - `ExporterHealth` — периодический self-check экспортера (вместо «роль выполняют health/readyz»);
   - `DeliveryFailed` / `RetryScheduled` — только если реально появится очередь доставки;
   - `BotFlagged` / `AnomalyDetected` — только при наличии статистического детектора с порогами
     и precision-метрикой; маркировка `factory_pipeline = bot` остаётся статической и это ок;
   - `AbuseBlocked` / `EmergencyPause` — требуют blocking-слоя и proposal-flow
     (RBAC, 2FA, второе подтверждение, audit log, rollback), автоматическая блокировка людей запрещена.
2. `SessionEnded`: набрать достаточный объём, чтобы `sessionDurationSeconds` перестал быть
   `estimate: true`, и убрать пункт из `unavailableMetrics` — только после этого.
3. `LandingReached`: если redirect-proxy/beacon не реализуем — оставить `unavailable` и не повышать
   стадию воронки. Ноль воронки не заменять выдуманными значениями (`None`/`null` сохранять).
4. Счётчики ошибок: сейчас процесс-глобальны и в `days[]` показывают 0 — сделать per-day или
   явно оставить помеченными в `unavailableMetrics`.
5. `data_quality`: `partial` → `complete` только когда (1) нет unavailable-событий с реальным
   эмиттером, (2) `last_synced_at` обновлён живым прогоном. Иначе оставить `partial`.

## 6. P2

- Retention 30d / агрегаты 180d: поставить `prune_retention()` в CI/cron, а не только на старте.
- Алерты: `session_gaps(status=open)` и `RateLimited` — пороги, эскалация, проверка на ложные срабатывания.
- Forecast: либо метод с бэктестом и публикацией метрик качества, либо остаётся `unavailable`
  (запрещено рисовать прогнозы).
- Каталог кампаний/источников/страниц синхронизировать с реальностью (`games.js`), добавить
  тест, что каждое implemented-событие имеет эмиттер в коде (как сейчас делается в паспорте).

## 7. Жёсткие правила

`00_HUB_CONTRACT.md` §5: main не трогать, секреты не коммитить (Bearer-токены — только через env),
mainnet-деплоя нет, write-ручек в `/watchtower/*` нет, автоблокировок людей нет,
PII не собирать (контракт `PRIVACY.md`), синтетику не смешивать с реальным трафиком.

Ветка: `arena/<короткий-id>-trafficgen-watchtower-hub`; в конце PR в `Leo88q/talkchart-traffic-generator`.

## 8. Definition of Done

```text
[ ] 0 critical и 0 high в новом reports/trafficgen-audit.json (или обоснованные исключения)
[ ] Тесты sixsec доказывают отказ при подмене authority/mint и повторной инициализации
[ ] Живой прогон экспортера: health 200 (read-only), POST → 405 + Allow
[ ] Хаб: /api/infra/trafficgen ok, /api/analytics/traffic dataQuality partial|complete,
    адаптер trafficgen присутствует, POST /api/ingest/trafficgen принимает и дедуплицирует
[ ] 45–48 смоук-чек и 17 тестов зелёные, вывод в отчёте
[ ] data_quality отражает факт (partial, если unavailable-события остались), last_synced_at обновлён
[ ] PR открыт, main не изменён, secrets-scan = 0 кандидатов
```

## 9. Формат ответа

Разделы A–F из `00_HUB_CONTRACT.md` §7. В разделе D — таблица `implemented / unavailable`
после работы с причинами по каждому оставшемуся `unavailable`.

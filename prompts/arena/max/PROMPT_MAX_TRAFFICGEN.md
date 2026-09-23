# PROMPT_MAX_TRAFFICGEN — приложение TalkChart (trafficgen) до уровня L4

Вставь целиком первым сообщением в сессию Arena Agent Mode на репозитории
`Leo88q/talkchart-traffic-generator`. Это MAX-промпт для **приложения** (off-chain движок),
а не игры: цель — стать полноценным acquisition-контуром студии, к которому подключены
лендинг и игры.

---

## 0. Подключение хаба

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/docs/ECOSYSTEM_MAXIMUM_TARGET.md
cat /tmp/watchtower-hub/docs/INTEGRATION_TRAFFICGEN.md
cat /tmp/watchtower-hub/reports/trafficgen-audit.json    # 10 findings в programs/sixsec
node /tmp/watchtower-hub/scripts/check-ecosystem-target.mjs
```

Работаешь в `Leo88q/talkchart-traffic-generator`. Хаб только читается.

## 1. Что уже сделано (не регрессировать)

- Экспортер `site/factory/watchtower_exporter.py` (`0.0.0.0:8000`, Bearer `WATCHTOWER_READ_TOKEN`
  + `_PREVIOUS`, constant-time, SQLite WAL, `UNIQUE(event_id)`/`UNIQUE(identity)`, retention 30d, прайнинг,
  write-through `metrics_state`).
- 12 GET `/watchtower/*`; `POST/PUT/DELETE/PATCH` → `405 + Allow: GET, OPTIONS`; курсор
  `base64(cursor:<lastId>)`; replay 1200 событий; gap detect/heal (только полный backfill);
  `strip_pii()`; псевдонимизация `sess_<sha256>`; opt-out `?notrack`/DNT/GPC → `202`; rate limit `/api/track`
  30 rps → `429` + `Retry-After` + событие `RateLimited`.
- 17 implemented events с эмиттерами и тестами; 12 `unavailable` с причинами; `/watchtower/forecast`
  честно `dataQuality: unavailable, confidence: 0.0`.
- Тесты: `scripts/test_watchtower.py` (17), `scripts/smoke_watchtower.py` (45–48),
  `scripts/scan_secrets.py` (0 кандидатов), CI-джоб `watchtower-contract`.
- Хаб видит `L1` только потому, что не задан `TRAFFICGEN_API_BASE_URL`.

## 2. W1 — ноль critical в on-chain (`programs/sixsec/src/lib.rs`)

| Rule | Severity | Строки | Действие |
|---|---|---|---|
| `SW010` нет `token::authority` | **critical** ×3 | 686 (`prize_pool`), 708 (`skr_pool`), 735 (`prize_pool`) | добавить `token::authority = …` |
| `SW009` нет `token::mint` | high ×6 | 686, 692 (`worker_ata`), 708, 710 (`worker_skr_ata`), 735, 737 (`destination`) | добавить `token::mint = …` |
| `SW016` `init_if_needed` | high ×1 | 581 (`mint_reserve`) | `init` или доказательство безопасности |

Расширить `programs/sixsec/tests/test_init_pool.rs`: подстановка чужого token account/чужого mint и
повторная инициализация **обязаны падать**. Property-тесты инвариантов (`c-07`): призовой пул не может
быть опустошён чужой authority, выплата не может превысить пул, absence of double payout воркеру.
Повторный аудит → `reports/trafficgen-audit.json` с 0 critical/high.

## 3. W1 — приёмка и включение в хаб

```bash
python3 site/factory/watchtower_exporter.py
curl -s -H "Authorization: Bearer $WATCHTOWER_READ_TOKEN" localhost:8000/watchtower/health
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8000/watchtower/health   # 405 + Allow
# в хабе:
TRAFFICGEN_API_BASE_URL=http://127.0.0.1:8000 WATCHTOWER_READ_TOKEN=… npm run dev:api
curl -s localhost:8787/api/infra/trafficgen
curl -s localhost:8787/api/analytics/traffic
curl -s localhost:8787/api/ingestion/adapters | grep -A3 trafficgen
```

Плюс push-путь: `POST /api/ingest/trafficgen` → `accepted:true`, повтор → `duplicate:true`,
`campaignId`/`sessionId` в корне нормализованного события, `decoder.knownEvent: true`.
`last_synced_at` обновляется живым прогоном.

## 4. W2 — закрыть 12 `unavailable` честным путём (по одному, с эмиттером и тестом)

| Событие | Что реализовать |
|---|---|
`ExporterHealth` | периодический self-check экспортера (интервал, состояние, лаг), отдельный от health/readyz |
`DeliveryFailed` / `RetryScheduled` | только если появится реальная очередь доставки; иначе остаётся `unavailable` |
`BotFlagged` | классификатор ботов (правила + порог), precision на исторических данных, маркировка `factory_pipeline=bot` остаётся статической |
`AnomalyDetected` | статистический детектор аномалий (z-score/IQR по страницам и сессиям) с порогом и метрикой ложных срабатываний |
`AbuseBlocked` | blocking-слой + **proposal-flow** (RBAC+2FA+approval+audit+rollback); автоматическая блокировка людей запрещена |
`EmergencyPause` | механизм аварийной паузы кампании с подтверждением оператора и аудитом |
`LandingReached` | redirect-proxy/beacon из игры; если не реализуем — остаётся `unavailable`, воронку не «дорисовывать» (нулевые знаменатели остаются `null`) |
`SessionAbandoned` | планировщик таймаутов сессий (интервал + условие закрытия) |
`NavigationCompleted` | однозначный маппинг внутренней навигации терминала |
`TrafficError` | инструментирование эмиссии ошибок конвейера фабрики |
`ConfigUpdated` | покрывается гранулярными lifecycle-событиями; зафиксировать это решение явно |

`sessionDurationSeconds`: набрать достаточный объём `SessionEnded`, чтобы убрать `estimate: true`
и соответствующий пункт из `unavailableMetrics`. Счётчики ошибок сделать per-day (или явно оставить
помеченными). `data_quality` повышать до `complete` только при выполнении обоих условий.

`prune_retention()` вынести из «на старте» в CI/cron (`o-05`-стиль: расписание + отчёт о прайнинге).

## 5. W2 — качество данных и аналитика студии

- `d-08`: схема события с валидацией, карантин битых, журнал rejected с причиной (частично есть —
  довести до отчёта).
- `d-06`: Late ID Binding: `session → wallet → external_id → first_action`, чтобы acquisition
  связывался с игроками (это то, ради чего существует приложение).
- `d-01`: канонический словарь совпадает с хабом (`docs/ecosystem-target.spec.json`), маппинг
  в `data/*-event-map.json` и тест покрытия.
- `d-02`: определения метрик (визиты, сессии, bounce, CTA, конверсия) совпадают с определениями игр;
  иначе цифры студии несравнимы.
- `f-13`-совместимость: раздел «Трафик / Acquisition» в хабе показывает `dataQuality` каждого значения
  и явный список `unavailableMetrics` (сейчас это уже заявлено — проверить фактом).

## 6. W3 — переплетение (trafficgen как вход экосистемы)

```text
i-02 согласия       opt-out синхронно с consent-сервисом студии и лендингом
i-06 события        кампании привязаны к общему сезонному календарю и кросс-игровым событиям
i-08 кампании       кампании из хаба: анонимные сегменты, consent/frequency/budget, attribution, rollback
i-09 аналитика      acquisition-часть общего funnel ad_click → wallet → first_action → retention
i-10 алерты         DataGapDetected/RateLimited/AnomalyDetected → severity-словарь хаба + runbook
i-11 контроль       emergency pause кампании и блокировка источника — proposal, не авто
```

## 7. W4 — hot

- **SLO** (`o-02`): availability экспортера ≥ 99.9%, ingest p99 ≤ 2 с, свежесть ≤ 5 мин,
  p95 ответа ≤ 300 мс; публикация в SLO-дашборде хаба.
- **Надёжность** (`b-16`, `b-18`): нагрузочный тест на всплеск трафика (кампания), backpressure,
  защита от шторма, DLQ для отклонённых событий.
- **DR** (`o-05`): бэкап SQLite/Postgres и проверенный restore, RPO ≤ 15 мин.
- **Ops** (`o-06`, `o-08`): SBOM/зависимости, юнит-экономика (стоимость на 1k визитов), регламент релиза.
- **Forensics** (`o-07`): журнал решений детекторов и блокировок, реестр принятых рисков.

## 8. Definition of Done

```text
[ ] 0 critical/high в новом reports/trafficgen-audit.json (или formal accepted-risk)
[ ] Негативные тесты sixsec: чужая authority/mint и повторная инициализация падают
[ ] Живой прогон: health 200 read-only, POST → 405 + Allow, смоук 45–48 и 17 тестов зелёные
[ ] Хаб: /api/infra/trafficgen ok, /api/analytics/traffic честный, push+dedup, TRAFFICGEN_API_BASE_URL задан
[ ] Закрытые unavailable-события имеют эмиттер + тест; остальные остались честно unavailable с причиной
[ ] LandingReached и нулевые знаменатели по-прежнему null (ничего не дорисовано)
[ ] retention cron + отчёт; error-счётчики per-day; data_quality отражает факт
[ ] Контуры i-02, i-08, i-09, i-10, i-11 с тестом и доказательством
[ ] SLO-отчёт, нагрузочный тест, DR-restore
[ ] PR в arena/*, main не изменён, secrets-scan = 0
```

## 9. Формат ответа

A–F из `00_HUB_CONTRACT.md` §7. В разделе D — таблица `implemented / unavailable` после работы
с причиной по каждому оставшемуся `unavailable`.

# PROMPT_MAX_HUB — гид-хаб Watchtower до уровня L4 (платформа студии)

Вставь целиком первым сообщением в сессию Arena Agent Mode на репозитории
`Leo88q/Games-watchtower`. Это MAX-промпт: цель — не «работающий дашборд», а платформа,
на которой видно правду по всей студии и через которую игры переплетены.

---

## 0. Что читать до первой правки

```bash
cat prompts/arena/00_HUB_CONTRACT.md
cat docs/ECOSYSTEM_MAXIMUM_TARGET.md
cat docs/ecosystem-target.spec.json | head -60
cat docs/ECOSYSTEM_MINIMUM_REQUIREMENTS.md
cat docs/FINAL_ECOSYSTEM_REPORT.md
```

## 1. Цель сессии

Перевести хаб с текущего состояния (**L1: `GET /api/ingestion/adapters` → `configured: 0 из 5`,
провайдер `mock`, `/api/ecosystem/status` → 404, реестр расходится с паспортами игр,
аудиты ares1/neon-relay не выполнялись**) на **L3 по данным и UI + L4 по контрольному контуру**:

| Плоскость | Целевые требования (из спека) |
|---|---|
| contracts | `c-12` реестр адресов как единый источник; `c-09/c-10` отображение custody/pause статусов игр |
| backend | `b-01`, `b-04`, `b-05`, `b-06`, `b-07`, `b-07`, `b-12`, `b-13`, `b-14`, `b-15`, `b-16`, `b-18` |
| frontend | `f-01`, `f-02`, `f-03`…`f-13` (все 13 — это про хаб и игры) |
| data | `d-01`…`d-08` (канонический словарь, определения метрик, feature store, late binding, честные отчёты) |
| ops | `o-01`…`o-10` |
| interweaving | `i-01`…`i-12` — хаб владелец всех 12 контуров |

## 2. P0 — целостность (без этого всё остальное бессмысленно)

1. `reports/ares1-audit.json` и `reports/neon-relay-audit.json` имеют `files_scanned: 0` —
   скан **не выполнялся**, при этом в `reports/DETAILED_6_GAMES.md` опубликованы 43 и 24 findings,
   а `FINAL_OS3_REPORT.md` — «282 findings / 108 critical». Перегенерируй все пять аудитов
   (Sentio CLI / SolGuard / SLAM) по актуальным клонам игр. `files_scanned == 0` — это дефект
   конфигурации сканера, а не «нет проблем».
2. `scripts/build-audit-summary.mjs` — генерация `reports/DETAILED_6_GAMES.md` из JSON.
3. `scripts/check-report-integrity.mjs` — падает, если (а) сумма по файлам ≠ summary,
   (б) `files_scanned == 0`, (в) сводка расходится с JSON. Подключить в `npm run test:smoke` и CI.
4. Убрать дубль отчётов `trafficgen-audit.*` vs `talkchart-traffic-generator-audit.*`.
5. `FINAL_OS3_REPORT.md` — только воспроизводимые числа, иначе пометка `не подтверждено`.
6. Прогнать аудит по **собственным контрактам** хаба: `server/contracts/{cross_game_inventory,session_keys,studio_treasury}/lib.rs`
   → `reports/hub-contracts-audit.json`. Студия, требующая нулевых critical от игр, обязана
   показать свои.

## 3. P0 — реестр и уровень зрелости tenant'ов

1. `src/data/registry.js` и `GET /api/games` строятся из паспортов игр
   (`WATCHTOWER_INTEGRATION.md` + `integration-manifest.json` каждого репозитория); убрать
   ручные `stage`, `dataQuality`, `source: 'mock'`. Сейчас расхождения: guttercaps `alpha` vs `beta`,
   ares1 `beta` vs `prototype`, aof `unavailable` vs `partial`.
2. Новый endpoint `GET /api/ecosystem/status` (сейчас 404):

```json
{
  "generatedAt": "…",
  "writes": false,
  "gates": { "requiredRoutes": 14, "maxOpenCriticalFindings": 0, "writesFromHub": false },
  "coverage": { "l3plusPercent": 0, "target": 80 },
  "tenants": [
    { "gameId": "ares1", "level": "L1", "stage": "prototype", "dataQuality": "partial",
      "lastVerifiedAt": null, "configured": false, "reason": "programId не задан (ARES1_PROGRAM_ID)",
      "findings": { "critical": 0, "high": 0, "source": "reports/ares1-audit.json" },
      "exporterRoutes": { "ok": 0, "required": 14 }, "repo": "Leo88q/ares1" }
  ]
}
```

Уровень считается теми же правилами, что в `scripts/check-ecosystem-target.mjs`
(L0 нет адаптера → L1 не сконфигурирован/`unavailable` → L2 подключён и честный quality →
L3 при выполнении требований спеков по данным/инвариантам → L4 при SLO и proposal-flow).
Тест: расхождение endpoint'а и скрипта — ошибка CI.

3. `GET /api/ecosystem/report` — машинный свод для отчётов и лендинга (см. `PROMPT_MAX_INVESTOR.md`):
   только реальные значения + `source` и `dataQuality` по каждому полю.

## 4. P0 — приём данных от пяти tenant'ов вместо mock

1. `server/ingestion/game-adapters.js`: пять адаптеров; `configured` вычисляется строго из ENV
   (`ARES1_PROGRAM_ID`, `AOF_CORE_PROGRAM_ID`, `NEONRELAY_REWARDS_PROGRAM_ID`,
   `GUTTERCAPS_CORE_PROGRAM_ID`, `TRAFFICGEN_API_BASE_URL`). Пустой ENV → `configured:false`,
   `quality: unavailable`, никогда «ок».
2. Provider-путь вместо `WATCHTOWER_PROVIDER=mock` для продакшена: pull (`/watchtower/*` игр) +
   push (`POST /api/ingest/solana|trafficgen`), курсор-стор, реконсиляция, gap backfill.
   `GET /api/ingestion/status` обязан отдавать `lastCursor, duplicates, rejected, gaps,
   finalizedLag, providerHealth`.
3. Инвентаризация маршрутов: тест, который собирает все `/api/*` из `server/index.js` и проверяет,
   что ни один не пишет состояние, каждый отвечает JSON, а `/api/health.writes === false`.
4. Приёмка на живых событиях всех пяти tenant'ов, повтор → `duplicate:true`.

## 5. P1 — бэкенд-плоскость (L3)

- **Read-model**: PostgreSQL RLS по `tenant_id` + TimescaleDB гипертэйблы + Redis; материализованные
  представления (включая кросс-игровые материалы); команда `rebuild` и сверка проекций с первичными
  событиями (`b-07`, `b-08`).
- **Консолидированная экономика студии**: studio treasury, per-game budgets, запрет автономной
  эмиссии из игры, сводный ledger с отчётом сверки (`b-09`, `i-05`).
- **Reward pipeline**: caps, эпохи, Merkle, claims без двойной выплаты (`b-10`).
- **Anti-fraud studio-уровня**: сквозной risk scoring кошелька, Sybil, аномалии reward-паттернов,
  общий whale radar (`b-11`, `i-09`).
- **API как продукт**: OpenAPI, версионирование, пагинация, ETag, единый контракт ошибок, request-id,
  read-токены с ротацией и constant-time (`b-12`, `b-13`).
- **Наблюдаемость и надёжность**: OTel-трейсы ingest→проекция, Prometheus, SLO-дашборд, retry/backoff,
  circuit breaker, dead-letter, DR RPO ≤ 15 мин / RTO ≤ 4 ч (`b-15`, `b-16`).
- **Нагрузка**: дедупликация на входе, приоритеты, лимиты, защита от штормов событий, нагрузочный
  тест (`b-18`).

## 6. P1 — фронтенд-плоскость (L3)

1. Все **19 панелей** (`src/os/control-panels-v3.js`, `docs/os/v3/CONTROL_PANELS_V3.md`) обязаны
   читать реальные API-поля и показывать `dataQuality` каждого значения (`f-01`, `f-09`).
   Сейчас это карта стека — должно стать рабочим control surface.
2. **Трассируемость метрик** (`f-02`): по клику — формула, источник, период агрегации, часовой пояс,
   `lastVerifiedAt`.
3. **Экосистемный экран** (`f-13`) на `/api/ecosystem/status`: уровень каждого tenant'а, покрытие
   цели, findings, свежесть, кто не подключён и почему.
4. **Proposal-flow UI** (`f-07`): 2FA, второе подтверждение, таймер, дифф эффекта, audit trail,
   кнопка отката. Опасное действие невозможно одним кликом.
5. **Realtime** (`f-08`): WebSocket/SSE для алертов и live-метрик с деградацией до polling.
6. **Честные состояния** (`f-12`): skeleton, retry, error boundary, пустые состояния с причиной.
7. **A11y/i18n/performance** (`f-10`, `f-11`): ru/en, клавиатура, aria, LCP < 2.5 c, bundle < 200 kB gzip.
8. **Игровые сценарии в хабе** (`f-03`…`f-06`): если хаб показывает игровые экраны (инвентарь,
   профиль, cross-game), они обязаны иметь те же честные состояния и те же e2e-гейты.

## 7. P1 — переплетение (хаб владелец всех 12 контуров)

Реализовать и доказать сквозными тестами:

```text
i-01 идентичность     один studio_profile PDA и playerKey во всех играх → игрок найден в 2+ играх
i-02 согласия          единый consent/opt-out, действующий немедленно во всех играх и каналах
i-03 инвентарь         cross-game перенос активов с лимитами и nullifier от дублей
i-04 provenance        source_game, asset_id, история переходов между играми
i-05 экономика         studio treasury + per-game budgets, отсутствие автономной эмиссии
i-06 сезоны/события    общий календарь, кросс-игровые квесты, единые награды
i-07 профиль           уровень/достижения/статус трактуются одинаково во всех играх
i-08 кампании          анонимные сегменты, consent/frequency/budget, attribution, rollback
i-09 аналитика         единые определения метрик, общий funnel, cross-game retention, whale radar
i-10 алерты            один severity-словарь, SLA, эскалация, единый audit log
i-11 контроль          подписанный proposal → подтверждение в игре → два журнала
i-12 кросс-чейн        RACE/idosgames с лимитами, антифродом и KYT-скринингом
```

Для каждого контура: endpoint(ы), таблицы, тест, критерий «готово» из
`docs/ecosystem-target.spec.json` → `interweaving[].evidence`.

## 8. P2 — ops и стоимость

`o-01`…`o-10`: CI-гейты на каждый PR (сборка, тесты, secret-scan = 0, doc-drift, аудит, integrity
отчётов), SLO на игру, каталог алертов с runbook'ами и тестом доставки, учебный инцидент с postmortem,
SBOM и сканер зависимостей, юнит-экономика инфраструктуры (стоимость RPC/провайдеров на 1k игроков),
регламент релиза и откат.

## 9. SLO, которые хаб обязан измерять и публиковать

p95 API ≤ 300 мс · ingest p99 ≤ 2 с · finalized lag p95 ≤ 30 с · свежесть данных ≤ 5 мин ·
uptime ≥ 99.9%/мес · exporter availability ≥ 99.9% · алерты p1 ≤ 5 мин, p2 ≤ 30 мин ·
DR RPO ≤ 15 мин, RTO ≤ 4 ч.

## 10. Definition of Done

```text
[ ] 5/5 audit JSON заполнены реальным сканом; check-report-integrity проходит; сводка генерируется
[ ] reports/hub-contracts-audit.json создан (свои контракты проверены)
[ ] registry из паспортов игр + тест расхождения
[ ] GET /api/ecosystem/status и /api/ecosystem/report отвечают; совпадают со скриптом покрытия
[ ] все 5 tenant'ов принимаются (push/pull), повтор → duplicate:true; роут-инвентарь без write
[ ] 19 панелей читают живые данные и показывают dataQuality; экосистемный экран работает
[ ] proposal-flow протестирован сквозным тестом (proposal → approval → apply → rollback)
[ ] 12 контуров переплетения имеют endpoint+тест+доказательство
[ ] SLO-дашборд, каталог алертов с runbook, DR-restore отчёт
[ ] npm run build и npm run test:smoke зелёные; coverage L3+ ≥ 80% при --strict
[ ] PR в ветке arena/*, main не изменён, секретов в диффе нет
```

## 11. Формат ответа

Разделы A–F из `prompts/arena/00_HUB_CONTRACT.md` §7. В разделе C перечисли, какие заявления
прежних отчётов оказались невоспроизводимыми и что с ними сделано. В разделе E — таблица
`tenant | level до | level после | почему`.

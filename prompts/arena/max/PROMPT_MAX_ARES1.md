# PROMPT_MAX_ARES1 — ARES-1 до уровня L3/L4 (farming, cNFT, session keys)

Вставь целиком первым сообщением в сессию Arena Agent Mode на репозитории `Leo88q/ares1`.

---

## 0. Подключение хаба

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/docs/ECOSYSTEM_MAXIMUM_TARGET.md
cat /tmp/watchtower-hub/reports/ares1-audit.json      # сейчас пусто: files_scanned 0 (дефект скана)
node /tmp/watchtower-hub/scripts/check-ecosystem-target.mjs
```

Работаешь в `Leo88q/ares1`. Хаб только читается.

## 1. Текущее состояние

- Хаб видит `L1`: `ARES1_PROGRAM_ID` не задан; в хабе `reports/ares1-audit.json` → `files_scanned: 0`,
  при этом заявлено 43 finding (12 critical) — числа невоспроизводимы.
- Паспорт: v1/v2 program `DUUBiVvpbw5BbFLpryisvLGmBWmhVYC8tdf5xCUyEadf`, devnet, idl `0.2.0`,
  parser `ares1-v1`, `deploymentVerified=false`, `lastVerifiedAt=null`, `data_quality: partial`,
  `address_provenance: repository_only_not_network_verified`.
- v3-сплит ENV (`ARES1_CGINV_PROGRAM_ID`, `ARES1_SESSION_KEYS_PROGRAM_ID`, `ARES1_TREASURY_PROGRAM_ID`,
  `ARES1_CORE_PROGRAM_ID`) — значения не закоммичены; `CgInv111…`/`SessKeys111…`/`STrEaSuRy111…` — placeholder'ы.
- Готовая база: `watchtower/src/*` (exporter, decoder, normalizer, health, ingestion, metrics, rpc, store,
  verification), `watchtower/events/*` (schema, event-types, event-map, idl, фикстуры),
  `watchtower/scripts/{migrate,replay,sync-idl,verify-devnet}`, тесты `watchtower/tests/*`,
  `watchtower/src/os/{stack-v3,control-panels-v3,handoff-v3,server}.js`,
  `game/apps/backend/src/{anchorRaw,epochRoller,routes/config,security,solana}.ts`,
  `game/apps/web/{check-devnet,migrate-devnet}.*`.

## 2. W1 — факты и ноль critical (P0)

1. **Реальный аудит**: прогнать Sentio CLI / SolGuard / SLAM по `programs/` и получить
   `reports/ares1-audit.json` (`rule_id, severity, location{path,line,column}, message, help`) +
   `.md`. Если findings нет — это доказывается выводом команды, а не утверждением.
2. **Классы проверок, обязательные независимо от скана** (`c-03`…`c-06`):
   owner-констрейнты (SW002), валидация PDA seeds (SW013), `token::authority`/`token::mint` (SW009/010),
   защита от деления (SW024), `init` вместо `init_if_needed` (SW016), `reload()` после CPI (SW008),
   `emit!()` на каждое изменение состояния (SW027). Каждое — с негативным тестом.
3. **Верификация сети**: `watchtower/scripts/verify-devnet.ts` + `sync-idl.mjs` против devnet RPC:
   существование программы, владелец, версия IDL, свежесть. Заполнить `watchtower/integration-manifest.json`
   (`programIds`, `idlVersion`, `deploymentVerified`, `lastVerifiedAt`), перегенерировать
   `WATCHTOWER_INTEGRATION.md` через `npm run os:handoff` (вручную не редактировать).
4. **Property-тесты инвариантов** (`c-07`): экономика POTATO (mint − burn = net, caps эмиссии),
   добыча/урожай не могут быть начислены дважды, escrow/staking solvency, отсутствие отрицательных
   балансов, staleness оракула цен.
5. **Session keys как продукт** (`c-08`): scope deny `withdraw_treasury`, лимит 0.01 SOL, expiry 60 мин,
   revoke, allowlist программ — тест, падающий при запрещённой операции.
6. **Custody** (`c-09`, `c-10`): upgrade authority = мультисиг + timelock (адрес в паспорте и в RPC-проверке),
   регламент emergency pause, план миграции состояния и версионирование программ (`c-11`).
7. **Реестр адресов** (`c-12`): единый файл/endpoint с программами, mint, treasury, PDA, мультисигом;
   хаб читает его, а не парсит прозу. Тест консистентности.

## 3. W1 — экспортер и приёмка

1. Поднять `watchtower-exporter` и снять фактический вывод по 14 маршрутам `/watchtower/*`;
   `health.writes=false` обязателен. Ни одной write-ручки.
2. Приёмка хабом: devnet-событие (`PlayerJoined`, `PotatoPlanted`, `PotatoHarvested`, `RewardGranted`)
   → `accepted:true`, повтор → `duplicate:true`; `GET /api/games/ares1/ingestion` отвечает;
   `ARES1_PROGRAM_ID` появляется в `.env.example` хаба (без значения).
3. Матрица `data_quality` по доменам (players/economy/security/assets) с указанием, что не собирается
   и какие события для этого нужны.

## 4. W2 — бэкенд и фронтенд до L3

- **Read-model** (`b-07`, `b-08`): PostgreSQL RLS по tenant'у, TimescaleDB для временных рядов, Redis;
  `watchtower/migrations/watchtower-read-model.sql` расширить проекциями (игроки, сессии, экономика,
  активы) с пересборкой и сверкой с первичными событиями.
- **Indexer** (`b-04`, `b-05`, `b-06`): LaserStream gRPC + Shyft gPA/webhooks + DAS; commitment и
  finalized lag; обработка реоргов с компенсацией; gap healing только полным backfill.
- **Экономика** (`b-09`): двойная запись: harvest/награды/комиссии/mint/burn, treasury;
  отчёт «события ↔ проводки ↔ балансы»; `sink/source ratio`, velocity, net issuance.
- **Anti-fraud** (`b-11`): мультиаккаунты, Sybil в наградах, аномальные урожаи, ботоводство
  в session-key действиях; precision/recall + журнал решений.
- **API** (`b-12`, `b-13`): OpenAPI, пагинация, ETag, единые ошибки, request-id, read-токены с ротацией
  и constant-time.
- **Proposal-flow** (`b-14`): предложение из хаба → локальное подтверждение (RBAC + 2FA + approval) →
  apply → два журнала → rollback. Тест сквозной.
- **Наблюдаемость/надёжность** (`b-15`, `b-16`): OTel, Prometheus, Sentry, SLO-дашборд; retry, circuit
  breaker, DLQ, DR RPO ≤ 15 мин / RTO ≤ 4 ч и проверенный restore.
- **Фронтенд** (`f-01`…`f-12`): `game/apps/web` — онбординг guest → embedded → native → linked без
  потери прогресса; session keys без попапов; инвентарь cNFT/Standard с provenance и Core Attributes;
  marketplace с честными статусами; бейджи `dataQuality`; skeleton/retry/error boundary;
  ru/en, клавиатура, aria, LCP < 2.5 c, bundle < 200 kB gzip.

## 5. W3 — переплетение (вклад ares1)

```text
i-01 идентичность   studio_profile PDA + playerKey, одинаковый с другими играми
i-03/i-04 инвентарь POTATO/предметы переносимы картой cross-game inventory; provenance source_game/asset_id
i-05 экономика      эмиссия POTATO ограничена студийным бюджетом; treasury сверяется со studio treasury
i-06 события        сезонные турниры и квесты по общему календарю, кросс-игровые награды
i-07 профиль        уровень/достижения/статистика читаются в общий профиль
i-09 аналитика      DAU/retention/воронка в общих определениях, whale radar
i-10 алерты         severity-словарь хаба, runbook на каждый алерт
i-11 контроль       proposal: reward rate, пауза marketplace, заморозка наград, компенсации
i-12 кросс-чейн     RACE/idosgames перенос с лимитами и KYT
```

## 6. W4 — hot

SLO (finalized lag p95 ≤ 30 с, свежесть ≤ 5 мин, uptime ≥ 99.9%, API p95 ≤ 300 мс), DR-учения,
внешний аудит, юнит-экономика инфраструктуры, регламент релиза и отката. Только после этого —
кросс-чейн и ML-прогнозы с бэктестом.

## 7. Definition of Done

```text
[ ] Реальный аудит: reports/ares1-audit.{json,md}, 0 critical/high или formal accepted-risk
[ ] Все классы SW002/SW013/SW009/SW010/SW024/SW016/SW027 проверены с негативными тестами
[ ] integration-manifest заполнен по факту; WATCHTOWER_INTEGRATION.md перегенерирован
[ ] Property-тесты экономики зелёные и в CI
[ ] Session keys: тест отказа withdraw_treasury; custody = мультисиг + timelock
[ ] 14/14 /watchtower/*, health.writes=false, приёмка хабом с duplicate; ARES1_PROGRAM_ID в ENV
[ ] Реестр адресов как единый источник + тест консистентности
[ ] Контуры i-01, i-03/i-04, i-05, i-11 с endpoint + тестом + доказательством
[ ] SLO-отчёт, DR-restore, каталог алертов, proposal-flow сквозной тест
[ ] PR в arena/*, main не изменён, 0 секретов
```

## 8. Формат ответа

A–F из `00_HUB_CONTRACT.md` §7. В разделе C — что не удалось проверить (например, деплой-транзакции)
с командой и текстом ошибки.

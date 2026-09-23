# FINAL ECOSYSTEM REPORT — Games Watchtower, состояние на 2026-09-23

> **Провенанс.** На момент анализа файла с этим именем не существовало ни в одном репозитории
> аккаунта `Leo88q` (`Games-watchtower`, `ares1`, `aof`, `neon-relay`, `guttercaps`,
> `talkchart-traffic-generator`, `investor`, `tank`): проверено `git log --all --diff-filter=A`
> и рекурсивными деревьями через GitHub API. Этот документ — **восстановленная сводка**:
> он собран из фактических артефактов репозиториев (отчёты, паспорта, JSON-аудиты, код),
> а не из пересказа. Всё, что не подтверждено файлом или командой, помечено как
> `не подтверждено`.

## 1. Экосистема

| Репозиторий | Роль | tenant / game_id | Арена-ветка |
|---|---|---|---|
| `Games-watchtower` | гид-хаб: контракт, read-model, API, промпты | все tenant'ы | `arena/*` |
| `ares1` | ARES-1 — strategy/farming на Solana | `ares1` | — |
| `aof` | Age of Farming — farming, crafting, market | `aof` | — |
| `neon-relay` | Neon Relay — fork DDNet для Solana Mobile (Seeker) | `neonrelay` | `arena/01a0a751-neon-relay` |
| `guttercaps` | Gutter Caps — casual pop-n-shoot, gasless ECS | `guttercaps` | — |
| `talkchart-traffic-generator` | TalkChart Traffic Generator & Audience Layer (off-chain) | `trafficgen` | — |

Гид-хаб в терминах репозитория — **Watchtower OS v3**: `studio.config.json` (`version 3.0.0`,
`totalComponents 33`, `v1Layers 8`, `v2Products 12`, `v3BestFree 13`, 3 деприкированных дубля),
19 панелей управления (`src/os/control-panels-v3.js`, `docs/os/v3/CONTROL_PANELS_V3.md`),
API-сервер `server/index.js` (порт `API_PORT`, по умолчанию 8787) с **121 уникальным путём `/api/*`**.

## 2. Что локально сделал ИИ — по репозиториям

### 2.1 Хаб (`Games-watchtower`)

| Артефакт | Путь |
|---|---|
| API read-only, 121 путь | `server/index.js` |
| Ingestion, адаптеры, курсоры, реконсиляция | `server/ingestion/{game-adapters,event-inbox,cursor-store,provider,reconciliation,campaigns,player-projections}.js` |
| Аналитика | `server/analytics/{traffic,adjacent,investor-report,snapshots}.js` |
| Модули OS v3 | `server/modules/*` (identity, session-keys, assets, indexer, l2, analytics, marketplace, engines, payments, cross-chain, infra, security, storage, monetization, testing, privacy, ai, utils) |
| Контракты | `server/contracts/{cross_game_inventory,session_keys,studio_treasury}/lib.rs` |
| Смоук | `scripts/smoke-test.mjs` (`npm run test:smoke`) |
| UI | `src/main.js`, `src/os/*`, `src/data/registry.js` |
| Отчёты | `FINAL_OS3_REPORT.md`, `reports/*` |

Проверено по файлам: `GET /api/health` отдаёт `writes:false`; `POST /api/ingest/solana` и
`POST /api/ingest/trafficgen` дедуплицируют повтор; `/api/read-model` содержит 10 ключей;
провайдер по умолчанию `mock`, Program ID игр в `.env.example` **пустые**.

Живая проверка 2026-09-23 (хаб запущен как `node server/index.js`, порт 8787):

```text
GET  /api/health              → {ok:true, writes:false, provider:"mock", mode:"mock-read-model"}
GET  /api/ingestion/adapters  → {total:5, configured:0, ready:0, writes:false}
GET  /api/games/ares1/ingestion → 200, паспорт адаптера игры
GET  /api/ingestion/status    → {events:2, duplicates:2, rejected:0, immutable:true}
GET  /api/os/config           → version 3.0.0
GET  /api/ecosystem/status    → 404 (ещё не реализован — задача P1 промпта хаба)
npm run test:smoke            → PASSED (health, read-model, дедупликация solana+trafficgen,
                                 trafficgen adapter/analytics/infra, control safety, metrics)
```

Вывод: `configured: 0 из 5` — то есть **ни одна игра пока не подключена по-настоящему**,
хаб работает на mock-провайдере и пустых ENV Program ID. Это и есть главный разрыв между
«отчётами о внедрении» и фактическим состоянием.

### 2.2 ARES-1 (`ares1`)

- Полноценный экспортер: `watchtower/src/{watchtower-exporter,api,event-decoder,event-normalizer,health,ingestion,metrics,model,rpc,store,verification,artifacts,config}.ts`.
- Схема событий и фикстуры: `watchtower/events/{schema.json,event-types.json,ares1-event-map.json,ares1-idl.json,fixtures/*}`.
- Миграция read-model, скрипты `migrate`, `replay`, `sync-idl`, `verify-devnet`; 8 наборов тестов.
- Стек OS v3 в репозитории: `watchtower/src/os/{stack-v3,control-panels-v3,handoff-v3,server}.js`, `watchtower/docs/watchtower-os-v3.md`.
- Отчёты: `WATCHTOWER_OS_V3_FINAL_REPORT.md` (20 пунктов: v1 7 слоёв + v2 7 + v3 6, 33 компонента,
  19 панелей, 45 GET-маршрутов), `WATCHTOWER_INTEGRATION.md` (генерируется `handoff-v3.js`, `npm run os:handoff` / `os:handoff:check`).
- Паспорт: v1/v2 program `DUUBiVvpbw5BbFLpryisvLGmBWmhVYC8tdf5xCUyEadf`, devnet, idl `0.2.0`,
  parser `ares1-v1`, `deploymentVerified=false`, `lastVerifiedAt=null`, `data_quality: partial`,
  `address_provenance: repository_only_not_network_verified`, `blockchain_writes_enabled=false`.
- v3-сплит (`ARES1_CGINV_PROGRAM_ID`, `ARES1_SESSION_KEYS_PROGRAM_ID`, `ARES1_TREASURY_PROGRAM_ID`,
  `ARES1_CORE_PROGRAM_ID`) — значения **не закоммичены**.

### 2.3 AOF (`aof`)

- `FINAL_REPORT_V3.md` (20 пунктов), `docs/WATCHTOWER_OS_V3.md`, `WATCHTOWER_INTEGRATION.md`.
- Каркас экспортера `watchtower/` (README, `Dockerfile`, `config.example.env`, `events/*`, фикстуры).
- Godot-автозагрузка `game/godot/autoload/watchtower_os.gd`, смоук `scripts/smoke-watchtower-os-v3.sh`,
  стек v3 в коде `src/os/{stack-v3,handoff-v3}.js`, SQL `src/os/sql/cross_game_materials.sql` (RLS `tenant_id='aof'`).
- Подтверждённые адреса: `AOF_CORE_PROGRAM_ID = HtJg3R3Ki938QeSD98djwMgWESboDVEykuyKGtvRamEq`
  (devnet reference), session keys `6ZnnyKkv1kUE4AJqi5uwdh5ZX6VFGfbQiwhGSkfqZ9K5`; `CgInv111…`
  и `STrEaSuRy111…` — placeholder'ы.

### 2.4 Neon Relay (`neon-relay`)

- Standalone-форк DDNet `a853d33` без fork-связи, провенанс в `UPSTREAM_BASE.md`.
- Rebrand (идентичность, 39 языковых файлов, процедурные неоновые скины + CI-гейт генератора).
- Android/Solana Mobile модуль с MWA-кошельком и JNI-мостом (`android/.../wallet/*`).
- Wallet auth (challenge/verify, single-use nonce, Ed25519, hashed session tokens, rate limit) — `backend/`.
- Reward ledger: серверная подпись событий, идемпотентность, caps, epochs, Merkle, claim intents/confirmations.
- Game-server подпись (vendored ed25519-donna, `src/neonrelay/match_signer.*`, JSONL/`sv_neonrelay_*`), по умолчанию **выключена**.
- On-chain: `onchain/programs/{neonrelay-rewards,neonrelay-economy,neonrelay-features,neonrelay-assets}`,
  скрипты `deploy_prod.sh`, `verify_deployment.sh`, `create_test_mint.sh`, `test_local_validator.sh`.
- Watchtower-адаптер: `backend/src/watchtower.ts`, миграция `backend/migrations/0009_beta_operations.sql`,
  Godot-клиент `integrations/godot/neonrelay_client.gd`.
- **Честный список блокеров BL-01…BL-14** в `docs/FINAL_REPORT.md` + `docs/KNOWN_LIMITATIONS.md`:
  нет тулчейна Rust/Solana/Anchor (программы **не компилировались**), нет Android SDK, CI никогда
  не исполнялся (биллинг GitHub, BL-12), 698 ассетов `block-release` (BL-05, юридический гейт),
  `declare_id` и `PROGRAM_ID_PLACEHOLDER` — заглушки.

### 2.5 Gutter Caps (`guttercaps`)

- 5 on-chain программ: `programs/{arena,chip_core,market,sb_mock,staking}` (+ `chip_core/tests/golden.rs`).
- Backend 50+ модулей: `backend/src/{ingest,metrics,health,projections,antifraud,reward-oracle,
  burn-oracle,finality,admin,arena,staking,quests,referrals,geo,human,ratelimit,merkle,bubblegum,das,ws}.ts`.
- Godot ECS: `godot/scripts/{ecs_world,solana_client,wallet_adapter,anchor_program,session_key_manager}.gd`.
- Watchtower: `scripts/watchtower_v3_registry.py`, `scripts/watchtower_v3_server.py`,
  `tests/watchtower/watchtower-v3.test.ts`, `scripts/handoff-v3.{js,py}`.
- Тесты: `tests/localnet/*.spec.ts` (admin, packs, compressed-packs, fusion, market, arena, staking,
  cross, compressed), `tests/e2e/*`, `tests/godot/test_gutter_caps_v3.gd`.
- Паспорт: program `GCRhrg6mc7zH1VdXG5rX3tQEpgu8Gptf27vdsJGV7G8q`, idl `0.31.1`,
  parser `guttercaps-v3.0.0`, `data_quality: complete`, `last_verified_at: 2026-09-22T17:54:00Z`,
  upgrade authority `SquadsV4Multisig1111…`, treasury `HPMr5r9sS5ApWsPNJytZRLbm2jz1veFxTn1wepjAhtho`.
- Заявление об устранении утечки memref (ECS 8–12 сущностей, «было 30% → 0%») — **проверяемого
  измерения в отчёте нет**, только текст и ссылка на тест.

### 2.6 TalkChart / trafficgen (`talkchart-traffic-generator`)

- Экспортер `site/factory/watchtower_exporter.py`: `0.0.0.0:8000`, Bearer `WATCHTOWER_READ_TOKEN`
  (+ `_PREVIOUS`, `hmac.compare_digest`), SQLite WAL, `UNIQUE(event_id)` + `UNIQUE(identity)`,
  retention 30d + прайнинг, write-through `metrics_state`.
- 12 GET `/watchtower/*`; `POST/PUT/DELETE/PATCH /watchtower/*` → `405 + Allow: GET, OPTIONS`.
- Курсор `base64(cursor:<lastId>)`, replay 1200 событий, gap detection/healing
  (`DataGapDetected` → `DataGapHealed` только полным backfill'ом), `strip_pii()` (IP/email/wallet/64-hex/query),
  deterministic `sess_<sha256>`, opt-out `?notrack`/DNT/GPC → `202`.
- События: **17 implemented** с реальными эмиттерами, **12 unavailable** с причинами;
  `/watchtower/forecast` намеренно `dataQuality: unavailable, confidence: 0.0`.
- Проверки: `scripts/test_watchtower.py` (17), `scripts/smoke_watchtower.py` (45–48),
  `scripts/scan_secrets.py` (0 кандидатов), CI-джоб `watchtower-contract`.
- Паспорт: `stage: live`, `data_quality: partial`, `last_synced_at: 2026-09-22T18:00Z`.

## 3. Аудиты: фактические числа и расхождения

Файлы в хабе (проверены программно):

| Игра | `files_scanned` | findings | critical | high | medium | low |
|---|---|---|---|---|---|---|
| ares1 | **0** | **0** | 0 | 0 | 0 | 0 |
| aof | 52 | 17 | 1 | 11 | 0 | 5 |
| neon-relay | **0** | **0** | 0 | 0 | 0 | 0 |
| guttercaps | 27 | 188 | 86 | 89 | 3 | 10 |
| trafficgen | 3 | 10 | 3 | 7 | 0 | 0 |

При этом в тех же репозиториях-хаба:

- `reports/DETAILED_6_GAMES.md` заявляет ares1 = 43 (12 critical, 30 high), neon-relay = 24 (6/14);
- `FINAL_OS3_REPORT.md` заявляет суммарно **282 findings / 108 critical**;
- `reports/ares1-audit.md` и `reports/neon-relay-audit.md` при этом содержат буквально
  «Files scanned / parsed: 0 / 0. No findings.»

**Вывод:** по ares1 и neon-relay аудит в хабе не выполнялся (`files_scanned: 0`), а числа
43/24 и 282/108 воспроизвести нельзя. Хаб публикует метрики, которых нет в его собственных
файлах — это критическая проблема доверия и первое задание для промпта хаба.

Распределение findings по правилам (из JSON):

| Игра | Правила |
|---|---|
| aof | `SW016` ×5 (init_if_needed), `SW027` ×5 (нет emit!), `SW013` ×3 (PDA seed), `SW024` ×2 (div0), `SW008` ×1 (нет reload после CPI), `SW001` ×1 **critical** (`programs/aof-session-keys/src/lib.rs:173` — authority без signer) |
| guttercaps | `SW002` ×70 **critical** (нет owner-констрейнта), `SW013` ×54, `SW024` ×20, `SW023` ×13, `SW016` ×12, `SW027` ×10, `SW025` ×3, `SW010` ×2, `SW003` ×1, `SW022` ×1. Топ файлов: `programs/arena/src/lib.rs` 28, `programs/market/src/lib.rs` 27, `programs/staking/.../stake.rs` 22, `programs/sb_mock/src/lib.rs` 19, `programs/chip_core/.../packs.rs` 18, `programs/chip_core/.../rng.rs` 15 |
| trafficgen | `SW009` ×6 (нет `token::mint`), `SW010` ×3 **critical** (нет `token::authority`), `SW016` ×1 — все в `programs/sixsec/src/lib.rs` (строки 581, 686, 692, 708, 710, 735, 737) |

## 4. Критические риски и открытые вопросы

| # | Риск | Severity | Где | Что делать |
|---|---|---|---|---|
| 1 | Аудиты ares1/neon-relay не выполнялись, но числа опубликованы | **critical** | `reports/*`, `FINAL_OS3_REPORT.md` | перегенерировать, добавить тест целостности |
| 2 | 86 critical в Gutter Caps, включая `SW002` в экономических программах (arena/market/staking/chip_core) | **critical** | `programs/*` | owner-констрейнты + тесты, повторный аудит |
| 3 | Neon Relay: код ни разу не собран (Anchor/Android), program id — заглушки, CI не запускался | **critical** | `onchain/*`, `.github/workflows/ci.yml` | тулчейн, build, keys, честный статус |
| 4 | ARES-1: `last_verified_at = null`, адреса «repository_only», v3-split id отсутствуют | high | `watchtower/integration-manifest.json` | `verify-devnet` + `sync-idl`, заполнить манифест |
| 5 | AOF: 1 critical (missing signer в session-keys) + 5 `init_if_needed` | **critical/high** | `programs/aof-session-keys`, `aof-rebirth` | фиксы + тесты |
| 6 | trafficgen: 3 critical `SW010` и 6 high `SW009` в `programs/sixsec` (пулы призов) | **critical** | `programs/sixsec/src/lib.rs` | констрейнты `token::authority`/`token::mint` |
| 7 | Gutter Caps: заявление «memref leak 0%» без измерения | high | `WATCHTOWER_INTEGRATION.md`, `godot/scripts/ecs_world.gd` | измерение или понижение до `partial` |
| 8 | Расхождение реестра хаба и паспортов игр: `guttercaps` в хабе `alpha` vs `beta` в паспорте; `ares1` в хабе `beta` vs `prototype` в паспорте; `aof` `unavailable` vs `partial`; у всех `source: mock` | high | `src/data/registry.js`, `GET /api/games` | генерировать реестр из паспортов + тест на расхождение |
| 9 | Program ID игр в хабе пустые → адаптеры не `configured`, отчёты инвесторам опираются на mock | high | `.env.example`, `server/ingestion/game-adapters.js` | подключить реальные id после верификации игр |
| 10 | Заявления о внедрении v3-компонентов (Xandeum, PST, Arcium, RitArena, relayzero, StealthSDK, Access, idosgames, DePIN) без подтверждения в коде игр | high | отчёты v3 всех игр | статусы `planned`/`unavailable`, не «внедрено» |

Отдельно: юридический гейт ассетов Neon Relay (BL-05, 698 файлов `block-release`) и биллинг
GitHub (BL-12) — **вне зоны AI**, это решения оператора.

## 5. Что делаем дальше — промпты Arena по играм

Готовый набор: `prompts/arena/` (индекс — `prompts/arena/README_ARENA.md`).

**Минимум** (подключение к экосистеме):

| Промпт | Игра | Главная цель сессии |
|---|---|---|
| `PROMPT_ARENA_WATCHTOWER_HUB.md` | хаб | целостность отчётов, реестр из паспортов, приём 5 tenant'ов, `/api/ecosystem/status` |
| `PROMPT_ARENA_GUTTERCAPS.md` | guttercaps | закрыть 86 critical, доказать/понизить заявление про memref, приёмка хабом |
| `PROMPT_ARENA_NEONRELAY.md` | neonrelay | снять BL-01…BL-03 (сборка), реальные program id, честный аудит, телеметрия |
| `PROMPT_ARENA_ARES1.md` | ares1 | реальный аудит (0 → факт), `verify-devnet`, exporter runtime, ingest в хаб |
| `PROMPT_ARENA_AOF.md` | aof | 17 findings → 0 critical/high, события + emit!, `/watchtower/*` |
| `PROMPT_ARENA_TRAFFICGEN.md` | trafficgen | 10 findings в `sixsec`, честное дозакрытие unavailable, живая приёмка |

**Максимум** (доведение до L3/L4, тёплый продукт и переплетение): `prompts/arena/max/`
(индекс — `prompts/arena/max/README_MAX.md`).

| Промпт MAX | Объект | Цель |
|---|---|---|
| `max/PROMPT_MAX_HUB.md` | хаб | целостность отчётов, `/api/ecosystem/status`, панели на живых данных, proposal-flow, 12 контуров |
| `max/PROMPT_MAX_GUTTERCAPS.md` | guttercaps | 86 critical → 0, property-инварианты, ledger, газлесс ECS до L4 |
| `max/PROMPT_MAX_NEONRELAY.md` | neonrelay | сборка 4 программ, reward-контур без двойного claim, SLO/DR |
| `max/PROMPT_MAX_ARES1.md` | ares1 | реальный аудит, session keys как продукт, custody, cross-game активы |
| `max/PROMPT_MAX_AOF.md` | aof | 1 critical + 5 `init_if_needed`, ledger крафта/маркета, RLS-переплетение |
| `max/PROMPT_MAX_TRAFFICGEN.md` | приложение TalkChart | `sixsec` → 0 critical, 12 unavailable честно закрыть, acquisition-контур L4 |
| `max/PROMPT_MAX_INVESTOR.md` | приложение `investor` | ноль выдуманных чисел, бейджи dataQuality, снапшоты дивидендов с provenance |

Общий контракт для всех — `prompts/arena/00_HUB_CONTRACT.md`: envelope событий, обязательные
`/watchtower/*` endpoints, правила `complete|partial|unavailable`, запреты (main, секреты,
mainnet, signer'ы, автоблокировки, выдуманные метрики), врата приёмки и формат отчёта A–F.

## 6. Как перепроверить этот документ

```bash
# 1. Состояние аудитов хаба
python3 - <<'PY'
import json, glob
for f in sorted(glob.glob('reports/*-audit.json')):
    d = json.load(open(f))
    print(f, d['files_scanned'], len(d['findings']))
PY
# 2. Реестр vs паспорта
sed -n '1,20p' src/data/registry.js
# 3. Адаптеры и program id
curl -s localhost:8787/api/ingestion/adapters | head -c 600
grep -n "PROGRAM_ID=" .env.example
# 4. Смоук
npm install && npm run test:smoke
# 5. Паспорта игр
gh api repos/Leo88q/ares1/contents/WATCHTOWER_INTEGRATION.md --jq .content | base64 -d | head -40
gh api repos/Leo88q/guttercaps/contents/WATCHTOWER_INTEGRATION.md --jq .content | base64 -d | head -40
gh api repos/Leo88q/neon-relay/contents/docs/FINAL_REPORT.md --jq .content | base64 -d | sed -n '60,90p'
gh api repos/Leo88q/talkchart-traffic-generator/contents/WATCHTOWER_ACCEPTANCE.md --jq .content | base64 -d | tail -40
```

## 7. Гейты экосистемы (не менять без решения оператора)

1. Хаб и игры — **read-only**: ни один сервис не подписывает и не отправляет блокчейн-транзакции.
2. Опасные операции — только proposal-flow: RBAC + 2FA + второе подтверждение + multisig/timelock + audit log + rollback.
3. `mainnet` не трогается без явного подтверждения; devnet-деплой — operator decision.
4. Секреты: только имена ENV; `gitleaks`/`scan_secrets` в CI.
5. Данные: `complete | partial | unavailable`, без нулей вместо отсутствующих значений и без mock-as-production.
6. Приёмка — PR в ветке `arena/*` с фактическим выводом команд и отчётом A–F.

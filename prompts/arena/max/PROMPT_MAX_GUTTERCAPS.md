# PROMPT_MAX_GUTTERCAPS — Gutter Caps до уровня L3/L4 (gasless ECS, chip-экономика)

Вставь целиком первым сообщением в сессию Arena Agent Mode на репозитории `Leo88q/guttercaps`.

---

## 0. Подключение хаба (до первой правки)

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/docs/ECOSYSTEM_MAXIMUM_TARGET.md
cat /tmp/watchtower-hub/docs/ecosystem-target.spec.json
cat /tmp/watchtower-hub/reports/guttercaps-audit.json
node /tmp/watchtower-hub/scripts/check-ecosystem-target.mjs   # увидишь свой текущий уровень: L1
```

Ты работаешь в `Leo88q/guttercaps`. Хаб только читается.

## 1. Текущее состояние (факты, не пересказ)

- **188 findings, 86 critical, 89 high** в 18 файлах 27 просканированных: `SW002` ×70 (нет
  owner-констрейнта), `SW013` ×54, `SW024` ×20, `SW023` ×13, `SW016` ×12, `SW027` ×10, `SW025` ×3,
  `SW010` ×2, `SW003`/`SW022` ×1. Топ: `programs/arena/src/lib.rs` 28, `programs/market/src/lib.rs` 27,
  `programs/staking/src/instructions/stake.rs` 22, `programs/sb_mock/src/lib.rs` 19,
  `programs/chip_core/.../packs.rs` 18, `programs/chip_core/.../rng.rs` 15.
- Хаб видит тебя как `L1`: `GUTTERCAPS_CORE_PROGRAM_ID` не задан → адаптер `configured:false`.
- Паспорт заявляет `data_quality: complete` и `last_verified_at: 2026-09-22T17:54:00Z`, при этом
  адреса `Tree111…`, `TreasuryVault111…`, `CgTok111…` — placeholder'ы. `stage` в репозитории `beta`,
  в реестре хаба `alpha`.
- Заявление «утечка memref 30% → 0%» в `WATCHTOWER_INTEGRATION.md` не подкреплено измерением.
- Инфраструктура для максимума уже есть: 5 программ (`arena`, `chip_core`, `market`, `sb_mock`, `staking`),
  50+ backend-модулей (`antifraud.ts`, `reward-oracle.ts`, `burn-oracle.ts`, `finality.ts`,
  `projections.ts`, `human.ts`, `geo.ts`, `ratelimit.ts`, `bubblegum.ts`, `das.ts`, `ws.ts`),
  Godot ECS (`godot/scripts/ecs_world.gd`), тесты `tests/localnet/*.spec.ts`, `tests/e2e/*`,
  `tests/godot/test_gutter_caps_v3.gd`, `tests/watchtower/watchtower-v3.test.ts`,
  `scripts/watchtower_v3_{server,registry}.py`.

## 2. Волна W1 — контракты до нуля critical (обязательна полностью)

1. `programs/sb_mock`: докажи, что он не деплоится ни в один контур (`Anchor.toml`, CI, deploy-скрипты,
   `scripts/anchor-build-localnet.sh`), — ссылкой на файл и строку; иначе чини как боевой.
2. Для `arena`, `market`, `staking`, `chip_core`:
   - `SW002`: `#[account(owner = …)]` или явная проверка `account.owner` для каждого program-owned аккаунта;
   - `SW013`: валидация PDA seeds (`bump`, `seeds`, связь с проверенным аккаунтом);
   - `SW010`/`SW009`: `token::authority` и `token::mint` на всех изменяемых token-аккаунтах;
   - `SW024`: защита от деления на ноль;
   - `SW016`: `init` вместо `init_if_needed`, либо доказательство невозможности сброса состояния;
   - `SW027`: `emit!()` на каждое изменение состояния (без этого хаб слеп — см. `c-06`).
3. Каждое исправление — с негативным тестом на подмену/повтор в `tests/localnet/*.spec.ts`.
4. Повторный аудит → новый `reports/guttercaps-audit.json`: цель **0 critical, 0 high**. Принятые риски —
   таблица с обоснованием и владельцем, не молчаливое удаление.
5. **Property-тесты инвариантов** (`c-07`): сохранение ценности в packs/fusion/market/staking,
   невозможность двойной награды арены, solvency escrow, отсутствие отрицательных балансов,
   соблюдение caps, `rng` без предсказуемости (проверка источника энтропии и `chroma`-полей).
6. **Адреса**: `GUTTERCAPS_CORE_PROGRAM_ID` подтвердить RPC и опубликовать в `.env.example` хаба;
   placeholder'ы (tree/treasury/mint) заменить реальными или явно помечать `placeholder` в паспорте;
   `data_quality` понизить до `partial`, пока хоть один адрес не подтверждён.

## 3. Волна W1 — экспортер и приёмка

1. Приведи `scripts/watchtower_v3_server.py` (+ `backend/src/{ingest,metrics,health,projections}.ts`)
   к контракту `/watchtower/*` из `00_HUB_CONTRACT.md` §4: 14 маршрутов, `health.writes=false`,
   `dataQuality` на каждом домене.
2. `tests/watchtower/watchtower-v3.test.ts` должен падать при расхождении реестра
   (`scripts/watchtower_v3_registry.py`) и фактических компонентов/адресов.
3. Приёмка хабом: событие `CapShot`/`ChipMinted` из devnet `POST /api/ingest/solana` → `accepted:true`,
   повтор → `duplicate:true`, `GET /api/games/guttercaps/ingestion` → паспорт адаптера.
4. `stage`, `data_quality`, `last_verified_at`, `parser_version` — привести к фактам и синхронизировать
   с хабом.

## 4. Волна W2 — бэкенд и фронтенд до L3

- **Read-model**: проекции раундов/игроков/экономики пересобираемы (`rebuild.ts`,
  `projections.ts`), RLS по tenant'у, сверка сумм с первичными событиями; TimescaleDB/Redis — по
  возможностям окружения, иначе честно `partial` (`b-07`, `b-08`).
- **Экономика** (`b-09`): ledger двойной записи по чипам/скинам/SKR: packs, fusion, market,
  staking, arena призы, burn; отчёт «события ↔ проводки ↔ балансы»; `pyth-cache.ts`/`pyth.ts` —
  staleness и confidence оракула в инвариантах.
- **Reward pipeline** (`b-10`): caps по дням/матчам, эпохи, Merkle (`merkle.ts`), claims без двойной
  выплаты — тест двойного claim.
- **Anti-fraud** (`b-11`): `antifraud.ts` + `human.ts` + `geo.ts` + `ratelimit.ts` → risk scoring
  кошелька, Sybil/multi-account, аномальные reward-паттерны; precision/recall на исторических метках
  и журнал решений. Автоблокировка запрещена — только proposal.
- **API** (`b-12`, `b-13`): OpenAPI, пагинация, ETag, единые ошибки, request-id, read-токены с
  ротацией и constant-time.
- **Наблюдаемость** (`b-15`): OTel ingest→проекция, Prometheus (`metrics.ts` уже есть), SLO-дашборд.
- **Фронтенд игровых сценариев** (`f-01`…`f-06`): инвентарь чипов с provenance и Core Attributes,
  marketplace с честными статусами финализации, session keys без попапов (лимит 0.01 SOL,
  deny `withdraw_treasury`, expiry), онбординг guest → embedded → native → linked.
- **Измеримая память**: заменить заявление про memref на измеренный отчёт (живые ссылки/объекты до и
  после 100 раундов × 8–12 сущностей, вывод `tests/godot/test_gutter_caps_v3.gd`), иначе понизить до
  `partial`.

## 5. Волна W3 — переплетение (вклад guttercaps)

```text
i-01 идентичность     playerKey одинаков с другими играми; studio_profile PDA в онбординге
i-03/i-04 инвентарь   чипы/скины переносимы по cross-game контракту; source_game, asset_id, история
i-05 экономика        бюджет игры не может эмитить автономно; ставки сверяются со studio treasury
i-06 события          кросс-игровые квесты через arena/квесты; награды по общему календарю
i-07 профиль          уровень/достижения читаются из общего профиля
i-09 аналитика        сегменты и retention в общих определениях, whale radar
i-10 алерты           severity-словарь хаба, runbook на каждый алерт
i-11 контроль         proposal из хаба: pause marketplace/arena, изменение reward rate, freeze rewards
i-12 кросс-чейн       RACE/idosgames перенос с лимитами и KYT
```

## 6. Волна W4 — hot

- **SLO**: finalized lag p95 ≤ 30 с, свежесть ≤ 5 мин, uptime ≥ 99.9%, API p95 ≤ 300 мс (`o-02`).
- **DR**: RPO ≤ 15 мин / RTO ≤ 4 ч + проверенный restore (`o-05`).
- **Нагрузка**: газлесс-раунды при пиковой нагрузке, тест на X events/sec без потери событий (`b-18`).
- **Аудит**: внешний/внутренний аудит программ и backend, реестр принятых рисков (`o-07`).
- **Кросс-чейн и монетизация**: Access Protocol stake-to-access для VIP-турниров, idosgames bridge
  с лимитами и антифродом — после стабилизации ядра.

## 7. Definition of Done

```text
[ ] 0 critical, 0 high в новом reports/guttercaps-audit.json (или formal accepted-risk с владельцем)
[ ] Каждый класс (SW002/SW013/SW010/SW024/SW016) закрыт негативным тестом
[ ] Property-тесты экономических инвариантов зелёные и в CI
[ ] sb_mock: доказан как не-боевой либо исправлен
[ ] 14/14 /watchtower/*, health.writes=false, приёмка событиями хабом (повтор → duplicate)
[ ] Все адреса проверены RPC; placeholder'ы помечены; data_quality честный
[ ] Измерение памяти вместо заявления; stage согласован с хабом
[ ] Контуры i-01, i-03, i-04, i-05, i-11 имеют endpoint + тест + доказательство
[ ] SLO-отчёт, DR-restore, каталог алертов с runbook
[ ] PR в arena/*, main не изменён, секретов нет
```

## 8. Формат ответа

A–F из `00_HUB_CONTRACT.md` §7. В разделе C — по каждому непринятому вызову: файл, строка,
почему не исправлено, оценка severity и последствие на экономику.

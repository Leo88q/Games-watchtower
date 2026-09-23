# PROMPT_MAX_AOF — Age of Farming до уровня L3/L4 (farming, crafting, market)

Вставь целиком первым сообщением в сессию Arena Agent Mode на репозитории `Leo88q/aof`.

---

## 0. Подключение хаба

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/docs/ECOSYSTEM_MAXIMUM_TARGET.md
cat /tmp/watchtower-hub/reports/aof-audit.json     # 17 findings с точными адресами
node /tmp/watchtower-hub/scripts/check-ecosystem-target.mjs
```

Работаешь в `Leo88q/aof`. Хаб только читается.

## 1. Текущее состояние

- **17 findings**: `SW001` ×1 **critical** (`programs/aof-session-keys/src/lib.rs:173` — `authority`
  без signer), `SW008` ×1 (`aof-market/src/lib.rs:415` — нет `reload()` после CPI),
  `SW013` ×3 (`aof-session-keys/src/lib.rs:127,145,176`; `aof-quests/.../drum_reveal.rs:27`),
  `SW016` ×5 (`aof-rebirth/.../do_rebirth.rs:16` и др.), `SW024` ×2 (`aof-liquidity/src/state/lp_pool.rs:27:22,36:9`),
  `SW027` ×5 (`aof-market/src/lib.rs:291,297,407`; `aof-session-keys/src/lib.rs:245,250`),
  прочее high (`aof-liquidity/src/instructions/lp_deposit.rs:18,27`).
- Хаб видит `L1`: `AOF_CORE_PROGRAM_ID` не задан; реестр хаба показывает `dataQuality: unavailable`
  (в паспорте `partial`) — расхождение.
- Адреса: `AOF_CORE_PROGRAM_ID = HtJg3R3Ki938QeSD98djwMgWESboDVEykuyKGtvRamEq` (devnet reference),
  session keys `6ZnnyKkv1kUE4AJqi5uwdh5ZX6VFGfbQiwhGSkfqZ9K5`, `CgInv111…`/`STrEaSuRy111…` — placeholder'ы.
- Готовая база: `aof-core/` (много инструкций: harvest, craft, forge, market, auction, lottery,
  issuance_cap, collector_stake, exploration), `aof-market`, `aof-liquidity`, `aof-quests`, `aof-rebirth`,
  `aof-session-keys`; `watchtower/` (каркас exporter, events, фикстуры), `src/os/{stack-v3,handoff-v3}.js`,
  `src/os/sql/cross_game_materials.sql` (RLS `tenant_id='aof'` + `mv_cross_game_materials_aof`),
  `game/godot/autoload/watchtower_os.gd`, `scripts/smoke-watchtower-os-v3.sh`,
  тесты `tests/` (node:test), `docs/WATCHTOWER_OS_V3.md`, `FINAL_REPORT_V3.md`.

## 2. W1 — ноль critical и факты (P0)

1. `SW001`: добавить signer-констрейнт на authority в `aof-session-keys` + негативный тест
   (без подписи → отказ).
2. `SW008`: `account.reload()?` после CPI `token::transfer` в `cancel_limit_order` + тест на stale-данные.
3. `SW013`: валидация PDA seeds в перечисленных инструкциях (связь seed'ов с проверенными аккаунтами).
4. `SW016`: `init` вместо `init_if_needed` (`do_rebirth` и др.) либо доказательство невозможности
   сброса состояния повторной инициализацией.
5. `SW024`: защита от деления на ноль в `lp_pool.rs` + property-тест на нулевые/экстремальные значения.
6. `SW027`: `emit!()` на изменения состояния (`set_fees`, `set_paused`, миграции, rebirth) — без событий
   хаб и Game Signals не видят переходов.
7. Повторный аудит (Sentio/SolGuard/SLAM) → `reports/aof-audit.json` с **0 critical/high** либо
   formal accepted-risk с обоснованием.
8. **Property-тесты инвариантов** (`c-07`): сохранение ценности в craft/forge/market/auction/lottery,
   `issuance_cap` не превышается, LP-пул solvency, отсутствие отрицательных балансов, отсутствие
   двойного розыгрыша lottery/quest.
9. **Адреса и IDL** (`c-01`, `c-02`, `c-12`): подтвердить RPC, `CgInv`/`STrEaSuRy` либо заменить, либо
   пометить как placeholder; IDL синхронизировать; единый реестр адресов для хаба.
10. **Custody** (`c-09`…`c-11`): мультисиг + timelock на upgrade authority, emergency pause,
    план миграции состояния, версионирование программ.

## 3. W1 — экспортер и приёмка

1. Довести `watchtower/` до 14 маршрутов `/watchtower/*` со `writes:false` и `dataQuality` по доменам
   (`players`, `economy`, `craft`, `market`, `security`).
2. События: `PlayerJoined`, `WalletConnected`, `PlotCreated/PlotPlanted`, `CropHarvested`,
   `ResourceMinted/Burned`, `CraftCompleted`, `MarketOrderPlaced/Cancelled`, `RewardGranted`,
   `TransactionFailed`, `SecurityEvent` (сверить с `watchtower/events/event-types.json` и
   `docs/GAME_ADAPTERS.md`). Каждое — с реальным эмиттером и тестом; иначе `unavailable` с причиной.
3. Проверить, что RLS `tenant_id='aof'` применяется и `mv_cross_game_materials_aof` не ломает
   мульти-тенантность (тест изоляции).
4. Приёмка хабом: devnet-событие → `accepted:true`, повтор → `duplicate:true`,
   `GET /api/games/aof/ingestion` отвечает.

## 4. W2 — бэкенд и фронтенд до L3

- **Read-model** (`b-07`, `b-08`): PostgreSQL RLS, TimescaleDB, Redis; проекции игроков/сессий/экономики/
   крафта с пересборкой и сверкой с первичными событиями.
- **Indexer** (`b-04`…`b-06`): LaserStream по программам (core + `CgInv` + `SessKeys` + `STrEaSuRy`),
  Shyft gPA/callbacks, commitment и finalized lag, gap healing полным backfill.
- **Экономика** (`b-09`): двойная запись по ресурсам/инструментам/земли: harvest, craft cost, fees,
  burn, treasury, lottery, auction; отчёт «события ↔ проводки ↔ балансы»; sink/source ratio, velocity.
- **Reward pipeline** (`b-10`): caps, эпохи, Merkle, claims без двойной выплаты.
- **Anti-fraud** (`b-11`): Sybil в наградах, мультиаккаунты, аномальный крафт/арбитраж в маркете,
  wash-trading в аукционах; precision/recall + журнал решений.
- **API** (`b-12`, `b-13`): OpenAPI, пагинация, ETag, единый контракт ошибок, request-id, read-токены
  с ротацией/constant-time; подпись для write-proposal.
- **Proposal-flow** (`b-14`): proposal из хаба → подтверждение в игре (RBAC + 2FA + approval) → apply →
  два журнала → rollback; тест сквозной. Применить к `set_fees`, `set_paused`, `issuance_cap`, маркетплейсу.
- **Наблюдаемость/надёжность** (`b-15`, `b-16`, `b-18`): OTel, Prometheus, Sentry, SLO-дашборд,
  retry/backoff, circuit breaker, DLQ, нагрузочный тест, DR RPO ≤ 15 мин / RTO ≤ 4 ч.
- **Фронтенд** (`f-01`…`f-12`): в Godot-клиенте — честные состояния, инвентарь с provenance,
  marketplace со статусами финализации, session keys без попапов (0.01 SOL, expiry, deny `withdraw_treasury`),
  онбординг guest → embedded → native → linked, бейджи `dataQuality` на любых метриках в UI,
  локализация ru/en, доступность.

## 5. W3 — переплетение (вклад aof)

```text
i-01 идентичность   studio_profile и playerKey общие с другими играми
i-03/i-04 инвентарь материалы/семена/инструменты переносятся по cross-game контракту (mv_cross_game_materials_aof
                    — часть этого), provenance source_game/asset_id
i-05 экономика      крафт/аукционы в рамках per-game budget; запрет автономной эмиссии
i-06 события        кросс-игровые квесты (aof-quests) по общему календарю, единые награды
i-07 профиль        достижения фермы/крафта читаются в общий профиль
i-09 аналитика      retention/craft funnel в общих определениях; whale radar
i-10 алерты         severity-словарь хаба; runbook на каждый алерт (issuance cap, аномалии маркета)
i-11 контроль       proposal: fees, pause, issuance cap, компенсации, заморозка наград
i-12 кросс-чейн     RACE/idosgames перенос ресурсов с лимитами и KYT
```

## 6. W4 — hot

SLO, DR-учения, внешний аудит, SBOM и обновления по CVE, юнит-экономика инфраструктуры, регламент
релиза и откат. Кросс-чейн и ML — после стабилизации ядра.

## 7. Definition of Done

```text
[ ] 0 critical/high в новом reports/aof-audit.json (или formal accepted-risk с владельцем)
[ ] Каждый из SW001/SW008/SW013/SW016/SW024/SW027 закрыт негативным тестом
[ ] Property-тесты craft/market/lottery/issuance зелёные и в CI
[ ] Адреса подтверждены RPC или помечены placeholder; IDL синхронизирован; реестр адресов есть
[ ] 14/14 /watchtower/*, health.writes=false, приёмка хабом с duplicate
[ ] RLS + cross-game materials view проверены тестом изоляции тенантов
[ ] Ledger двойной записи + отчёт сверки; reward pipeline без двойного claim
[ ] Контуры i-01, i-03/i-04, i-05, i-11 с endpoint + тестом + доказательством
[ ] SLO-отчёт, DR-restore, каталог алертов, сквозной proposal-тест
[ ] PR в arena/*, main не изменён, 0 секретов
```

## 8. Формат ответа

A–F из `00_HUB_CONTRACT.md` §7. В разделе C — по каждому непринятому вызову: файл, строка, причина,
severity, последствие для экономики.

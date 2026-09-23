# Минимум каждой игры для единой экосистемы Watchtower

Что обязана реализовать у себя **каждая** игра, чтобы экосистема была единой, а не набором
отдельных проектов. Документ дополняет `prompts/arena/00_HUB_CONTRACT.md` (формальный контракт)
и `docs/FINAL_ECOSYSTEM_REPORT.md` (фактическое состояние).

## Часть I. Базовый слой — у каждой игры, без исключений

1. **Паспорт игры** — `WATCHTOWER_INTEGRATION.md` + `integration-manifest.json`:
   `game_id, network, stage, program_ids[], mint_addresses[], treasury_addresses[], upgrade_authority,
   idl_version, parser_version, data_quality, last_verified_at, writes: false`. Адреса — подтверждённые
   сетью (RPC-команда), а не скопированные из документации.
2. **Read-only экспортер** `/watchtower/*` — health, readyz, config, events, metrics/daily,
   players/cohorts, players/retention, players/cross-game, economy, treasury, security, alerts,
   funnels, forecast. Ни одного маршрута, меняющего состояние; ни одного signer'а в процессе;
   `health.writes = false`.
3. **Единый envelope событий + идемпотентность** — on-chain: `cluster + slot + signature +
   instructionIndex + innerIndex`; off-chain: `eventId`. Плюс `commitment` (finalized для бизнес-фактов),
   `parserVersion`, `dataQuality`. Повтор события не создаёт дубль и возвращает `duplicate: true`.
4. **Курсор, бэкфилл и finalized lag** — экспортер отдаёт историю, продолжает с курсора,
   сообщает лаг финализации. Тихого сброса курсора быть не должно.
5. **Канонический словарь событий** — общие имена (`PlayerJoined`, `WalletConnected`, `RewardGranted`,
   `TokenMinted`, `TokenBurned`, `TransactionFailed`, `SecurityEvent`, `DataGapDetected`) + игровые
   (`PotatoHarvested`, `CropHarvested`, `RaceStarted`, `CapShot`, `PageView`…). У каждого события —
   реальный эмиттер в коде и тест. Нет эмиттера → `unavailable` с причиной, а не «событие есть».
6. **Единая идентичность игрока** — псевдонимный `playerKey` (хеш + соль), поток
   guest → embedded wallet → native wallet → linked cross-game PDA `studio_profile`,
   consent/opt-out. Наружу — никаких PII, seed-фраз, полных кошельков.
7. **Честность данных** — по каждому домену (players / economy / security / …) статус
   `complete | partial | unavailable`; у каждой метрики формула, источник, период агрегации и часовой
   пояс. Отсутствующее значение — `unavailable`, никогда `0` и никогда «нарисованная» цифра.
8. **Метрики игрока и роста в одном стандарте** — DAU/WAU/MAU, новые регистрации, retention
   D1/D3/D7/D14/D30, длительность и число сессий, churn, воронка, источники трафика и attribution,
   регионы/платформы. Одинаковые определения во всех играх, иначе цифры несравнимы.
9. **Экономика** — off-chain и on-chain балансы, источники (sources) и стоки (sinks), mint/burn,
   treasury, volume, уникальные кошельки, velocity, sink/source ratio, net issuance,
   failed transactions. Список операций, способных создавать/уничтожать ценность, — отдельно.
10. **Безопасность** — anti-bot, anti-cheat, rate limiting, wallet risk scoring, Sybil/multi-account,
    аномальные транзакции и reward patterns, account takeover, права админов, audit log, backup/DR.
    Findings аудита закрыты или явно приняты с обоснованием; секретов в репозитории нет.
11. **Proposal-flow вместо автономии** — любое опасное действие (изменение экономики, блокировка,
    выплата, пауза маркетплейса) проходит RBAC + 2FA + второе подтверждение + multisig/timelock +
    audit log + rollback. AI ничего не выполняет автоматически.
12. **Алерты** — правила, пороги, severity, quiet hours, каналы, кнопка подтверждения; действия
    уровня «опасно» недоступны без web + 2FA.
13. **Тесты и CI** — unit/contract/e2e, смоук экспортера, secret-scan (gitleaks/scan_secrets),
    doc-drift guard (паспорт vs код), повторный аудит. CI зелёный либо честно «не запускается, причина».
14. **Приёмка** — события игры принимаются хабом (`POST /api/ingest/solana|trafficgen`), хаб видит
    игру в `/api/ingestion/adapters` и `/api/games/<game_id>/ingestion`, PR в ветке `arena/*`,
    `main` не тронут, отчёт по форме A–F с фактическим выводом команд.

## Часть II. Кросс-экосистемный слой — то, что склеивает игры

1. **Единый event contract и маппинг** — игровые названия мапятся в канонические (`*-event-map.json`),
   хаб не должен знать особенностей каждой игры.
2. **Cross-game identity** — один `studio_profile` PDA, связанные кошельки (RACE/linked wallets),
   Late ID Binding `solana_wallet ↔ external_id` для сквозной аналитики.
3. **Cross-game assets/inventory** — единые ARC Entity/Components (`Position`, `GrowthStage`, `Owner`,
   `Item`, `source_game`, `is_cnft`, `asset_id`) + Core Attributes; правила переноса предметов между
   играми (что можно, лимиты, антифрод, аудит).
4. **Единая экономика студии** — общая treasury-политика и лимиты, запрет автономной эмиссии из
   отдельной игры, общий reward/anti-fraud контур.
5. **Cross-game кампании** — рекомендации только по анонимным группам, consent/opt-out,
   fraud exclusion, frequency cap, budget, operator approval, attribution, rollback.
6. **Сквозная аналитика** — один funnel `ad_click → wallet → first_action → mint → retention`,
   общие признаки для churn/LTV, единые определения метрик.
7. **Единые alert rules и incident flow** — severity, SLA, эскалация, единый audit log.
8. **Единый read-model в хабе** — `/api/ecosystem/status`: `stage, dataQuality, lastVerifiedAt,
   findings{critical,high}, connected, exporterConfigured` по каждому tenant'у + `writes: false`.
9. **Единый security baseline** — одинаковый минимальный набор инвариантов и общий CI-гейт;
   ни одна игра не может быть «слабее» остальных незаметно.
10. **Единый протокол приёмки** — Definition of Done, отчёт A–F, доказательства командами,
   публикация findings в общий `reports/*`.

## Часть III. Что уникально даёт каждая игра

| Игра | Обязательный уникальный вклад |
|---|---|
| **ares1** | С/х события (`PotatoPlanted/Harvested`), cNFT для common + Standard NFT для rare, session keys с запретом `withdraw_treasury` и лимитом 0.01 SOL, подтверждение v3-split program id, реальный аудит (сейчас `files_scanned: 0`) |
| **aof** | Farming/crafting/market события (`PlotCreated`, `CropHarvested`, `CraftCompleted`, ордера), RLS `tenant_id='aof'` + cross-game materials view, закрытие 1 critical (missing signer) и 5 `init_if_needed`, `emit!` на изменение состояния |
| **neonrelay** | Server-authoritative контур: wallet auth (challenge/verify/Ed25519, single-use nonce), подпись матчей, reward ledger (caps, epochs, Merkle, claims без двойной выплаты), телеметрия disconnect/client_crash/anti-cheat, 4 программы собраны и протестированы, реальные program id |
| **guttercaps** | Round-based ECS: жизненный цикл раунда, gasless delegation, экономика чипов (packs/fusion/market/staking/arena), antifraud, измеряемые метрики памяти, закрытие 86 critical (`SW002`/`SW013`/`SW010`/`SW024`) |
| **trafficgen** | Off-chain контур: `/api/track` со схемой, дедупликация identity, курсор/replay, gap detect/heal, `strip_pii`, consent/DNT, retention, честные `implemented/unavailable`, метки bot вместо смешивания |

## Часть IV. Порядок внедрения (одинаковый для всех)

- **P0 (без этого игра не в экосистеме):** паспорт + read-only экспортер + envelope с дедупликацией +
  честные `data_quality`/`unavailable` + закрытые critical уязвимости + приёмка хабом.
- **P1:** полный набор метрик, экономика, идентичность и cross-game связки, alert rules, аудит и CI.
- **P2:** ML-прогнозы и автоматизация — только с approval, backtest-метриками и audit log.

## Часть V. Гейты, которые нельзя нарушать

`main` не трогается · секреты только именами ENV · mainnet-операции запрещены ·
signer'ов в экспортере нет · авто-выплат и автоблокировок нет · mock не выдаётся за production ·
метрики без источника не публикуются · любые write-действия — только proposal-flow с человеком.

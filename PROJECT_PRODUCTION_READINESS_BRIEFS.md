# Production readiness briefs для четырёх проектов

Эти четыре задания нужно передать в отдельные чаты соответствующих проектов. Каждый AI должен работать внутри своего репозитория, проверить фактическое состояние кода и реализовывать задачи, а не только составлять рекомендации.

Общее правило для всех проектов:

> Не считать документацию доказательством готовности. Для каждого пункта сначала проверь код, тесты, конфигурацию и runtime. Не раскрывай секреты. Если deployment, RPC, БД или ключи недоступны, пометь результат `UNKNOWN` и создай безопасный adapter/health-check вместо выдуманных данных. Опасные write-операции не автоматизируй без RBAC, 2FA, approval, audit log и rollback-плана.

---

# 1. ARES-1 — Potato Colony on Solana

## Цель

Довести ARES-1 от beta/devnet-прототипа до безопасной закрытой беты, а затем подготовить mainnet release. Параллельно подготовить read-only интеграцию с Games Watchtower.

## Критические задачи до любого реального запуска

### P0 — безопасность и доступы

1. Удалить RPC API key из git и всей истории, если он когда-либо попадал в репозиторий.
2. Отозвать и выпустить новый RPC key.
3. Проверить все `.env`, keypair-файлы, CI logs и GitHub Actions artifacts через gitleaks.
4. Перевести authority программы на Squads multisig 2/3 или 3/5.
5. Добавить timelock для вывода POTATO, SOL и SKR из treasury.
6. Разделить authority и reward signer.
7. Проверить и документировать хранение payer keypair и recovery-процедуру.
8. Провести внешний аудит Solana-программы до mainnet.

### P0 — CI и воспроизводимость

1. Починить красный CI.
2. Зафиксировать версии Anchor, Solana CLI, Rust и Node.
3. Сделать воспроизводимые команды:

```bash
anchor build
anchor test
npm test
npm run build
```

4. Удалить мёртвый `apps/bot` из `docker-compose.yml` либо вернуть рабочий сервис.
5. Обновить устаревший `docs/API.md`.
6. Добавить CI-проверку, что IDL, program IDs и код соответствуют друг другу.
7. Добавить smoke-тест деплоя на чистый localnet.

### P0 — deployment

1. Создать отдельные localnet, devnet, staging и production конфигурации.
2. Деплоить backend в отказоустойчивое окружение.
3. Подключить платный RPC с резервным RPC provider.
4. Настроить `/health` и `/ready` для uptime-monitoring.
5. Настроить автоматический restart backend и алерт на `roll_epoch` failure.
6. Добавить backup-процедуру для всех off-chain данных.
7. Зафиксировать upgrade authority, deploy wallet и владельца каждого ключа.

## P0 — экономика

1. Ввести on-chain caps на `mint_resource`.
2. Ограничить частоту и суточный объём `grant_reward`.
3. Ограничить и защитить `withdraw_treasury*`.
4. Добавить multisig + timelock для treasury.
5. Проверить cap эпохи при 1, 1k, 5k, 50k активных игроках.
6. Пересмотреть burn/mint balance.
7. Зафиксировать сценарии инфляции и дефляции.
8. Провести симуляции экономики с реальными параметрами.
9. Сделать отдельный emergency pause runbook.

## P1 — данные и аналитика

1. Запустить Solana event indexer.
2. Индексировать минимум:
   - `FieldCreated`;
   - `Harvested`;
   - `BatchHarvested`;
   - `OrderCreated`;
   - `OrderFilled`;
   - `PresalePurchase`;
   - `AchievementClaimed`;
   - `TreasuryWithdrawn`;
   - `PausedToggled`;
   - `ConfigUpdated`.
3. Добавить PostgreSQL/TimescaleDB вместо хранения истории только через RPC.
4. Ввести idempotency по `signature + event index`.
5. Реализовать daily aggregates:
   - DAU/WAU/MAU;
   - new wallets;
   - retention D1/D7/D30;
   - mint/burn;
   - treasury balances;
   - market volume;
   - unique transacting wallets.
6. Добавить session/funnel/error telemetry во frontend.
7. Добавить GDPR-friendly data policy.

## P1 — продукт и UX

1. Реализовать понятный onboarding.
2. Добавить обработку RPC 429/5xx.
3. Добавить понятные состояния pending/confirmed/failed transaction.
4. Сделать graceful degradation при недоступности RPC.
5. Добавить поддержку ошибок кошелька.
6. Отдельно обозначить в UI devnet/mainnet.
7. Запустить закрытую бету на 20–50 игроков.
8. Собрать обратную связь и метрики экономики.

## P1 — Watchtower

Создать read-only endpoint или отдельный exporter:

```text
GET /watchtower/health
GET /watchtower/config
GET /watchtower/metrics/daily
GET /watchtower/treasury
GET /watchtower/alerts
```

Exporter не должен иметь authority key, reward signer или admin token.

## Критерии готовности ARES-1

- CI зелёный.
- Внешний аудит без critical/high проблем.
- Authority на multisig.
- Treasury защищён timelock.
- RPC keys ротированы.
- Backend задеплоен и мониторится.
- Indexer работает минимум 7 дней без пропусков.
- Закрытая бета завершена.
- DAU/retention/mint/burn считаются из реальных данных.
- Devnet soak test пройден.
- Есть rollback и incident runbook.

---

# 2. Age of Farming — AOF

## Цель

Довести AOF от большого prototype-кода до проверяемого production MVP. Главный приоритет — закрыть критические security gaps и прекратить использование неполных экономических данных как источника истины.

## P0 — критические security fixes

1. Полностью закрыть или удалить `POST /admin/send-tx`.
2. Запретить произвольный relay пред-подписанных транзакций.
3. Отключить в production:
   - `/admin/test-grant`;
   - `/admin/test-grant-potato`;
   - `/admin/mint-resource`.
4. Ввести on-chain issuance caps для `mint_resource`.
5. Разделить единый `ADMIN_TOKEN` на роли:
   - viewer;
   - analyst;
   - operator;
   - finance;
   - superadmin.
6. Добавить 2FA для опасных действий.
7. Добавить dual approval для:
   - minting;
   - resource mint changes;
   - fee changes;
   - pause;
   - treasury actions.
8. Настроить `trust proxy` корректно для production reverse proxy.
9. Подключить `readLimiter` к `/query/*`.
10. Закрыть `GET /whale-alerts/feed` авторизацией или безопасной агрегацией.
11. Убрать IP, User-Agent и секреты из длинной истории Git.
12. Провести полноценный gitleaks scan по полной истории.

## P0 — backend и deployment

1. Убрать SQLite single-writer как production bottleneck.
2. Мигрировать production на PostgreSQL.
3. Подключить Redis для:
   - rate limits;
   - очередей;
   - locks;
   - distributed jobs.
4. Деплоить backend отдельно от worker-процессов.
5. Запустить и контролировать:
   - price tracker;
   - price cranker;
   - trust worker;
   - farm trader;
   - push worker;
   - commit expirer.
6. Исправить hardcoded `127.0.0.1:8899` в price tracker.
7. Добавить staging окружение.
8. Настроить health/readiness/liveness.
9. Добавить автоматический backup и restore drill.
10. Настроить Prometheus/OpenTelemetry и error tracking.

## P0 — on-chain и экономическая модель

1. Проверить все 6 program IDs через RPC.
2. Подтвердить, что deployed bytecode соответствует audited commit.
3. Перевести authority на Squads multisig.
4. Ограничить treasury operations.
5. Проверить все операции `mint_resource`.
6. Определить source of truth для off-chain/on-chain dual state.
7. Не показывать экономические метрики как полные, пока indexer не заработал.
8. Проверить bonding curve и зависимость от `minted_count`.
9. Определить поведение burns в расчёте цены.
10. Внешний audit всех программ до mainnet.

## P0 — данные

1. Реализовать on-chain event indexer.
2. Индексировать события `aof_core`, `aof_market`, `aof_quests`.
3. Записывать:
   - signature;
   - slot;
   - block time;
   - program ID;
   - event type;
   - wallet hash;
   - mint;
   - amount;
   - success.
4. Добавить deduplication.
5. Сделать backfill.
6. Ввести data quality:
   - complete;
   - partial;
   - unavailable.
7. Добавить daily player facts.
8. Исправить `AuditLog.user` на `req.authenticatedWallet`.
9. Заменить `AuditLog.action` на реальный business event type.
10. Синхронизировать Prisma и chain data.

## P1 — продуктовые метрики

Реализовать:

- DAU/WAU/MAU;
- D1/D7/D30 retention;
- session_start/session_end;
- onboarding funnel;
- churn;
- market volume;
- reward latency;
- wallet activity;
- economy source/sink;
- failed transaction rate;
- client crash/error tracking;
- platform/device breakdown.

## P1 — anti-fraud

1. Убрать wallet prefix из device fingerprint.
2. Добавить signals:
   - shared funding source;
   - wallet age;
   - IP cluster;
   - device cluster;
   - reward velocity;
   - multi-account graph.
3. Исправить Trust Index:
   - убрать fake age calculation;
   - убрать rebirth placeholder;
   - считать staking из on-chain stake.
4. Ввести fraud review queue.
5. Добавить audit каждой резолюции.
6. Не банить автоматически без human review.

## P1 — Telegram и операции

1. Создать отдельный notification service.
2. Настроить P0/P1/P2 каналы.
3. Запретить write actions из Telegram.
4. Добавить incident runbook.
5. Добавить owner/on-call/SLA.

## Критерии готовности AOF

- `send-tx` удалён или полностью изолирован.
- Test grants выключены в production.
- Есть on-chain caps.
- Есть RBAC и 2FA.
- PostgreSQL и Redis работают.
- Все workers запущены и мониторятся.
- On-chain indexer работает.
- Экономический монитор перестал возвращать фиктивные нули.
- Метрики имеют data quality.
- Внешний audit завершён.
- Есть backup/restore.
- Есть staging и production.

---

# 3. Neon Relay

## Цель

Довести Neon Relay от prototype/alpha до безопасной beta: стабилизировать server-authoritative game, identity, reward ledger и Solana economy.

## P0 — deployment и идентичность

1. Проверить, какие Anchor-программы реально задеплоены.
2. Проверить deployed bytecode через `solana program show`.
3. Заменить все placeholder program IDs.
4. Создать devnet environment.
5. Создать staging environment.
6. Определить production deployment policy.
7. Перевести upgrade authority на Squads multisig.
8. Оставить 48-hour authority timelock.
9. Проверить `NEONRELAY_AUTH_DOMAIN` и удалить placeholder domain.
10. Настроить dual RPC provider.

## P0 — backend security

1. Убрать единый admin token.
2. Добавить роли:
   - read-only analyst;
   - game operator;
   - reward operator;
   - finance;
   - superadmin.
3. Добавить 2FA/step-up confirmation.
4. Добавить append-only admin audit.
5. Логировать:
   - epoch seal;
   - prize epoch close;
   - root publication;
   - parameter changes;
   - pause;
   - authority change;
   - treasury operations.
6. Убрать `poolMicro` из тела запроса и вычислять его из vault state.
7. Перейти на constant-time сравнение admin secret.
8. Добавить approval workflow для epoch seal/close.

## P0 — reward economy

1. Исправить `publish_epoch`, чтобы `leaf_count` не был всегда `0`.
2. Добавить proof-depth validation.
3. Исправить prize distribution при количестве победителей меньше 10.
4. Зафиксировать политику leftover:
   - carry over;
   - refund;
   - redistribution.
5. Добавить тесты на каждый вариант.
6. Проверять backend root против on-chain root.
7. Проверять `poolMicro` против фактического vault delta.
8. Проверить claim accounting.
9. Добавить reward stuck detection.
10. Утвердить условия tournament registration.

## P0 — treasury и on-chain

1. Перевести treasury в Squads.
2. Добавить treasury movement indexer.
3. Вести журнал внешних SPL transfers.
4. Добавить vault/reserved/available reconciliation.
5. Не считать внешние SKR/POTATO supply проектной эмиссией.
6. Не показывать burn/mint ratio, так как burn-механики нет.
7. Провести внешний audit всех программ.

## P1 — game server

1. Включить подписанные JSONL event stream.
2. Создать надёжный event shipper.
3. Добавить deduplication и retry.
4. Включить retention/rotation для JSONL.
5. Определить privacy policy для Teehistorian.
6. Добавить события:
   - session_start/end;
   - match_start/end;
   - mode;
   - result;
   - disconnect;
   - first finish;
   - first claim;
   - client crash.
7. Добавить race anti-cheat metrics.
8. Добавить Neon DM behavioral metrics.
9. Добавить server heartbeat.
10. Настроить game server monitoring.

## P1 — аналитика

Реализовать:

- DAU/WAU/MAU;
- D1/D3/D7/D14/D30 retention;
- sessions;
- session duration;
- race finish metrics;
- map speedrun anomalies;
- checkpoint anomalies;
- reward velocity;
- pay-without-play;
- play-without-pay;
- ticket/claim conversion;
- vault forecast;
- reward pipeline age;
- failed transaction rate.

## P1 — backup и operations

1. Сделать SQLite backup API.
2. Хранить backup off-site.
3. Запустить restore drill.
4. Добавить monitoring ledger size.
5. Добавить pagination в API.
6. Разделить rate limits для Watchtower, game server и players.
7. Настроить `TRUST_PROXY`.
8. Добавить Telegram/Alertmanager.
9. Описать SLA/on-call.
10. Определить incident response.

## Критерии готовности Neon Relay

- Все program IDs подтверждены RPC.
- Есть devnet/staging deployment.
- Authority на multisig.
- Proof depth исправлена.
- Prize leftover policy покрыта тестами.
- Admin actions имеют 2FA и audit.
- Game events доставляются без потерь.
- DAU/retention считаются по session events.
- Backend SQLite резервируется и восстанавливается.
- Treasury движения индексируются.
- Внешний audit завершён.
- Платный контур включается только после legal/security gates.

---

# 4. GUTTERCAPS

## Цель

Довести GUTTERCAPS от alpha/pre-launch до проверяемой devnet beta, затем staging и mainnet. Проект уже имеет самый сильный фундамент для Watchtower, но пока не имеет подтверждённого deployment.

## P0 — on-chain deployment

1. Исправить localnet failures.
2. Добиться зелёного end-to-end on-chain CI.
3. Протестировать все сценарии:
   - initialize;
   - pack buy/open;
   - VRF reveal;
   - fusion;
   - marketplace;
   - staking;
   - PvP wager;
   - rewards;
   - SKR pool;
   - pause;
   - treasury.
4. Задеплоить программы на devnet.
5. Проверить deployed bytecode.
6. Сгенерировать отдельные mainnet program IDs.
7. Провести key ceremony.
8. Перевести authorities в Squads.
9. Зафиксировать список всех keeper/pauser/oracle addresses.
10. Провести внешний smart-contract audit.

## P0 — treasury и ключи

1. Перевести SKR treasury single-signer на Squads.
2. Добавить timelock на `sweep_vault`.
3. Проверить floor по всем liabilities.
4. Добавить независимый treasury reconciliation.
5. Ротировать и документировать keeper keys.
6. Настроить keeper balance alerts.
7. Не запускать mainnet с devnet keys.
8. Утвердить legal/compliance модель платного продукта.

## P0 — тесты и экономика

1. Исправить `.so`/LiteSVM harness.
2. Запустить 100% localnet suite.
3. Запустить devnet soak test.
4. Проверить VRF replay.
5. Проверить Pyth staleness.
6. Проверить odds/split invariants.
7. Проверить emission cap.
8. Проверить vault liabilities.
9. Проверить `SkrPool: vault >= budget + reserved`.
10. Проверить reward root budgets.
11. Проверить pause semantics.
12. Проверить pack refund window.
13. Провести экономическую симуляцию на разных DAU.

## P0 — инфраструктура

1. Выбрать SQLite или PostgreSQL.
2. Для production рекомендуется PostgreSQL.
3. Подключить Redis в обязательном режиме.
4. Настроить event bus `EVENT_BUS=redis`.
5. Отдельно запустить:
   - API;
   - indexer;
   - crank;
   - burn oracle;
   - reward oracle;
   - battle resolver;
   - Pyth cache;
   - backup worker.
6. Настроить Prometheus + Alertmanager.
7. Настроить backup/restore drill.
8. Настроить staging.
9. Настроить production readiness checks.
10. Ограничить внешнюю доступность `/metrics` и `/health*`.

## P1 — продукт

1. Добавить session telemetry.
2. Добавить client crash tracking.
3. Добавить activation funnel:
   - wallet connect;
   - free chip;
   - tutorial match;
   - first paid pack.
4. Реализовать UI для pending/confirmed/failed transactions.
5. Проверить mobile Seeker build.
6. Провести closed alpha.
7. Проверить marketplace liquidity.
8. Проверить pack odds на реальных данных.
9. Проверить fusion behavior.
10. Проверить PvP matchmaking p50/p95.
11. Провести responsible gaming review.
12. Добавить sanctions/compliance screening при необходимости.

## P1 — антифрод

1. Проверить device dedupe на нескольких устройствах.
2. Провести тесты `device_ring`.
3. Провести тесты `multi_account`.
4. Настроить antifraud review queue.
5. Добавить dual-control для:
   - ban;
   - rewards_pause;
   - trust changes;
   - unpause.
6. Добавить graph-based wash trading analysis.
7. Добавить responsible-gaming signals для wager behavior.
8. Добавить audit каждой fraud resolution.

## P1 — AI и Watchtower

1. Сделать `/watchtower/status`.
2. Сделать `/watchtower/kpi`.
3. Сделать `/watchtower/daily`.
4. Сделать `/watchtower/economy/live`.
5. Сделать `/watchtower/invariants`.
6. Сделать `/watchtower/fraud`.
7. Экспортировать события через Redis event bus.
8. Добавить daily metrics:
   - DAU;
   - payers;
   - revenue;
   - mint/burn/net;
   - sink ratio;
   - floor;
   - market volume;
   - PvP volume;
   - staking TVL;
   - SKR pool;
   - vault liabilities.
9. Добавить AI invariant monitor.
10. Добавить Telegram Alertmanager sink.

## Критерии готовности GUTTERCAPS

- Localnet suite зелёный.
- Все 4 программы задеплоены и проверены.
- Devnet soak test завершён.
- Внешний audit завершён.
- Program IDs и key ceremony зафиксированы.
- SKR treasury на multisig.
- Keeper keys защищены и мониторятся.
- Redis/event bus работает в production config.
- PostgreSQL либо проверенная SQLite replication стратегия.
- Backup restore drill пройден.
- Invariants I1–I8 мониторятся.
- Client crash/session analytics работают.
- Closed alpha завершена.
- Legal/compliance gate пройден.
- Mainnet rollout имеет rollback и pause plan.

---

# Общий формат ответа от каждого AI после реализации

Каждый проект должен вернуть следующий отчёт:

1. Что реализовано.
2. Какие файлы изменены.
3. Какие команды тестирования выполнены.
4. Какие тесты прошли и какие не прошли.
5. Какие runtime-проверки выполнены.
6. Какие secrets/deployment variables нужны.
7. Какие migration steps требуются.
8. Какие риски остались.
9. Что ещё блокирует devnet.
10. Что ещё блокирует mainnet.
11. Как выполнить rollback.
12. Как Watchtower будет получать read-only данные.

Запрещённый формат ответа:

- «готово» без тестов;
- «задеплоено» без transaction signature/program show;
- «безопасно» без внешнего или хотя бы воспроизводимого security evidence;
- использование mock-данных как production-метрик;
- передача секретов в чат или в LLM.

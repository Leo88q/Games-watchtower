# Задание для проекта

Работай внутри репозитория этого проекта. Цель — не подготовить рекомендации, а реализовать production-readiness задачи. Перед изменениями проверь фактический код и состояние ветки. Не раскрывай секреты. Не считай документацию доказательством без подтверждения тестом, RPC или runtime. Для каждого пункта после работы укажи изменённые файлы, команды, результаты тестов, неизвестные места, зависимости deployment и rollback-план. Не включай опасные write-операции без RBAC, 2FA, approval, audit log и rollback.

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


## Финальный отчёт

Верни: реализованные задачи, файлы, тесты, runtime-проверки, deployment variables, migrations, оставшиеся риски, devnet/mainnet blockers, rollback и Watchtower read-only contract.

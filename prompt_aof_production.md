# Задание для проекта

Работай внутри репозитория этого проекта. Цель — не подготовить рекомендации, а реализовать production-readiness задачи. Перед изменениями проверь фактический код и состояние ветки. Не раскрывай секреты. Не считай документацию доказательством без подтверждения тестом, RPC или runtime. Для каждого пункта после работы укажи изменённые файлы, команды, результаты тестов, неизвестные места, зависимости deployment и rollback-план. Не включай опасные write-операции без RBAC, 2FA, approval, audit log и rollback.

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


## Финальный отчёт

Верни: реализованные задачи, файлы, тесты, runtime-проверки, deployment variables, migrations, оставшиеся риски, devnet/mainnet blockers, rollback и Watchtower read-only contract.

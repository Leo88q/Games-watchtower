# Задание для проекта

Работай внутри репозитория этого проекта. Цель — не подготовить рекомендации, а реализовать production-readiness задачи. Перед изменениями проверь фактический код и состояние ветки. Не раскрывай секреты. Не считай документацию доказательством без подтверждения тестом, RPC или runtime. Для каждого пункта после работы укажи изменённые файлы, команды, результаты тестов, неизвестные места, зависимости deployment и rollback-план. Не включай опасные write-операции без RBAC, 2FA, approval, audit log и rollback.

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


## Финальный отчёт

Верни: реализованные задачи, файлы, тесты, runtime-проверки, deployment variables, migrations, оставшиеся риски, devnet/mainnet blockers, rollback и Watchtower read-only contract.

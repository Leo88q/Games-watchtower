# Задание для проекта

Работай внутри репозитория этого проекта. Цель — не подготовить рекомендации, а реализовать production-readiness задачи. Перед изменениями проверь фактический код и состояние ветки. Не раскрывай секреты. Не считай документацию доказательством без подтверждения тестом, RPC или runtime. Для каждого пункта после работы укажи изменённые файлы, команды, результаты тестов, неизвестные места, зависимости deployment и rollback-план. Не включай опасные write-операции без RBAC, 2FA, approval, audit log и rollback.

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


## Финальный отчёт

Верни: реализованные задачи, файлы, тесты, runtime-проверки, deployment variables, migrations, оставшиеся риски, devnet/mainnet blockers, rollback и Watchtower read-only contract.

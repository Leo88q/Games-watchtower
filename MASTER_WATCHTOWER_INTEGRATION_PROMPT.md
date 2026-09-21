# Мастер-промт для интеграции проекта с Games Watchtower

## Роль и цель

Ты работаешь внутри репозитория проекта, который подключается к Games Watchtower. Не готовь общие рекомендации вместо реализации: сначала изучи фактический код, затем внедри интеграционный контракт, тесты и runtime-проверки.

Цель — предоставить Watchtower актуальные read-only данные о продукте, игроках, событиях, экономике, безопасности и надёжности. Watchtower не должен получать private keys, upgrade authority, reward signer или возможность самостоятельно отправлять blockchain-транзакции.

Все неизвестные, неподтверждённые и недоступные данные должны возвращаться явно:

```text
unavailable
partial
unknown
```

Нельзя заменять отсутствующие runtime-данные выдуманными значениями.

---

# 1. Обязательные условия безопасности

До передачи интеграции:

1. Удалить секреты из git, истории, `.env`, CI logs и artifacts.
2. Ротировать все ключи, которые могли попасть в репозиторий.
3. Не передавать Watchtower:
   - private keys;
   - payer keypair;
   - upgrade authority key;
   - treasury signer;
   - reward signer;
   - admin token;
   - seed phrase.
4. Создать отдельный read-only exporter/API.
5. Для опасных действий использовать только proposal flow:
   - RBAC;
   - 2FA;
   - второе подтверждение;
   - multisig;
   - timelock;
   - audit log;
   - rollback.
6. Явно подтвердить, что Watchtower-интеграция не может выполнять blockchain writes.
7. Скрыть персональные данные и полные wallet addresses.
8. Добавить consent/opt-out для коммуникаций и cross-game предложений.

---

# 2. Паспорт проекта

Добавь и поддерживай документ:

```text
WATCHTOWER_INTEGRATION.md
```

Он должен содержать:

```yaml
game_id: ares1 | aof | neonrelay | guttercaps
display_name:
network: localnet | devnet | testnet | mainnet
stage: prototype | alpha | beta | live
program_ids: []
mint_addresses: []
treasury_addresses: []
upgrade_authority:
deployment_commit:
idl_version:
parser_version:
data_quality: complete | partial | unavailable
last_verified_at:
```

Все program IDs и addresses должны быть подтверждены командой проекта через deployment/runtime check, а не только документацией.

---

# 3. Watchtower read-only API

Реализуй или предоставь совместимые endpoints:

```text
GET /watchtower/health
GET /watchtower/readyz
GET /watchtower/config
GET /watchtower/events
GET /watchtower/events/:signature
GET /watchtower/metrics/daily
GET /watchtower/players/cohorts
GET /watchtower/players/retention
GET /watchtower/players/cross-game
GET /watchtower/economy
GET /watchtower/treasury
GET /watchtower/security
GET /watchtower/alerts
GET /watchtower/funnels
GET /watchtower/forecast
```

Если проект использует другой путь, добавь mapping в документацию.

Ответы должны содержать:

```json
{
  "data": {},
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "period": "7d UTC",
  "source": "project-indexer",
  "dataQuality": "complete|partial|unavailable",
  "confidence": 0.0,
  "parserVersion": "project-v1"
}
```

---

# 4. Нормализованный event envelope

Каждое событие должно быть доступно в формате:

```json
{
  "chain": "solana",
  "cluster": "devnet",
  "slot": 123,
  "blockTime": "2026-01-01T00:00:00.000Z",
  "signature": "...",
  "programId": "...",
  "instructionIndex": 0,
  "innerIndex": 0,
  "eventType": "RewardGranted",
  "commitment": "confirmed",
  "success": true,
  "accounts": [],
  "payload": {},
  "source": "native-rpc|helius|yellowstone|mock",
  "parserVersion": "project-v1",
  "observedAt": "2026-01-01T00:00:00.000Z",
  "dataQuality": "complete|partial|unavailable"
}
```

Canonical identity:

```text
cluster + slot + signature + instructionIndex + innerIndex
```

Обязательно реализовать:

- idempotency;
- deduplication;
- cursor/replay;
- backfill;
- reconnect;
- gap detection;
- finalized reconciliation;
- unknown event retention;
- parser versioning.

---

# 5. Обязательные события

## Игроки и сессии

```text
WalletConnected
PlayerJoined
SessionStarted
SessionEnded
FirstAction
TutorialStarted
TutorialCompleted
PlayerReturned
RetentionDay1
RetentionDay3
RetentionDay7
RetentionDay14
RetentionDay30
```

## Игровой процесс

```text
MatchStarted
MatchFinished
RaceStarted
RaceFinished
QuestStarted
QuestCompleted
CraftStarted
CraftCompleted
AssetCreated
AssetTransferred
PackOpened
FusionCompleted
StakeStarted
StakeEnded
```

## Экономика

```text
PurchaseStarted
PurchaseCompleted
PaymentSettled
RewardGranted
RewardClaimed
RewardQuarantined
TokenMinted
TokenBurned
TreasuryDeposited
TreasuryWithdrawn
LiabilityCreated
LiabilitySettled
```

## Безопасность и администрирование

```text
AuthorityChanged
ConfigUpdated
PausedToggled
EmergencyPause
AdminProposalCreated
AdminProposalApproved
AdminProposalExecuted
AdminProposalRejected
FraudSignalCreated
PlayerQuarantined
PlayerUnquarantined
```

## Надёжность

```text
TransactionSubmitted
TransactionConfirmed
TransactionFinalized
TransactionFailed
TransactionExpired
RpcError
IndexerGapDetected
IndexerGapHealed
```

---

# 6. Игроки, retention и воронки

Передавай только обезличенные player keys:

```text
playerKey = stable pseudonymous identifier
```

Нельзя передавать полные wallet addresses в публичный dashboard.

Обязательные расчёты:

- DAU;
- WAU;
- MAU;
- новые игроки;
- возвращающиеся игроки;
- D1/D3/D7/D14/D30 retention;
- средняя длительность сессии;
- количество сессий;
- churn;
- payer conversion;
- repeat purchase;
- ARPDAU;
- LTV proxy;
- cohorts;
- funnel conversion;
- drop-off по каждому этапу;
- игроки одной, двух и нескольких игр.

Минимальная воронка:

```text
Первый вход
→ Первое действие
→ Возвращение D1
→ Возвращение D7
→ Покупка
→ Переход во вторую игру
```

---

# 7. Экономика и казна

Передавай:

- total supply;
- circulating supply;
- minted;
- burned;
- net issuance;
- inflation rate;
- deflation rate;
- sink/source ratio;
- velocity;
- holders;
- active holders;
- top 10/top 50 concentration;
- treasury balance;
- liabilities;
- pending rewards;
- reward budget;
- emission cap;
- cap utilization;
- liquidity;
- volume;
- price;
- price confidence;
- treasury runway;
- stale oracle status.

Обязательные инварианты:

```text
vault >= liabilities
minted <= issuance cap
claimed <= reward budget
pending rewards имеют возраст
burn/mint totals сходятся
supply snapshot воспроизводим
```

При нарушении инварианта создавай alert с:

```text
ruleId
severity
observedValue
expectedValue
evidenceRef
confidence
```

---

# 8. Безопасность и fraud

Передавай агрегированные и обезличенные показатели:

- suspicious players;
- multi-account clusters;
- device clusters;
- IP clusters;
- wash trading;
- win trading;
- reward farming;
- bot signals;
- failed signature checks;
- admin attempts;
- API attack attempts;
- rate-limit violations;
- blocked actions;
- mean time to detect;
- mean time to resolve.

Автоматические bans, reward pauses и trust changes должны идти только через review/approval.

---

# 9. Cross-game предложения

Предоставь:

- обезличенную группу игрока;
- список уже посещённых игр;
- возможную следующую игру;
- интерес или affinity score;
- consent status;
- opt-out status;
- frequency cap;
- fraud check status;
- campaign attribution.

Recommendation не должна автоматически:

- отправлять сообщение;
- выдавать награду;
- раскрывать личность;
- менять блокчейн-состояние.

Статусы:

```text
draft
pending_review
approved
scheduled
sent
rejected
cancelled
```

---

# 10. Investor reporting

Поддерживай агрегированные отчёты:

- active players;
- new players;
- retention;
- payer conversion;
- ARPDAU;
- volume;
- treasury;
- liabilities;
- minted/burned;
- runway;
- critical incidents;
- data coverage;
- confidence;
- поигровой breakdown.

Каждый отчёт должен иметь:

```text
reportId
period
createdAt
calculationVersion
sourceVersion
dataQuality
confidence
privacy
```

Сохраняй immutable snapshots для сравнения периодов.

---

# 11. Наблюдаемость

Добавь:

- `/health`;
- `/readyz`;
- Prometheus metrics;
- RPC latency;
- indexer lag;
- finalized lag;
- queue depth;
- event throughput;
- duplicate count;
- rejected count;
- decoder errors;
- backfill progress;
- alert count;
- Sentry/OpenTelemetry;
- backup and restore check.

Минимальные Prometheus metrics:

```text
watchtower_events_total
watchtower_events_duplicate_total
watchtower_events_rejected_total
watchtower_decoder_errors_total
watchtower_indexer_lag_slots
watchtower_finalized_lag_slots
watchtower_rpc_latency_ms
watchtower_blockchain_writes_enabled 0
```

---

# 12. Тесты и runtime-проверки

Обязательные команды проекта:

```bash
npm test
npm run build
npm run lint
npm run typecheck
npm run smoke
```

Обязательные проверки:

1. clean localnet deployment;
2. real event emission;
3. event decoding;
4. duplicate delivery;
5. reconnect;
6. backfill;
7. slot gap and healing;
8. finalized reconciliation;
9. failed transaction;
10. treasury invariant;
11. reward cap;
12. fraud review;
13. campaign consent/opt-out;
14. read-only API without signer;
15. no blockchain writes from exporter.

---

# 13. Definition of Done

Интеграция считается готовой только если:

- program IDs подтверждены runtime-проверкой;
- deployment network зафиксирован;
- event decoder тестируется на реальных transaction fixtures;
- backfill работает;
- streaming работает;
- deduplication работает;
- finalized reconciliation работает;
- daily projections считаются;
- retention считается из реальных событий;
- economy invariants проверяются;
- treasury и liabilities доступны read-only;
- fraud signals доступны;
- cross-game player keys обезличены;
- consent/opt-out реализованы;
- investor snapshots сохраняются;
- health/ready/metrics работают;
- CI зелёный;
- есть rollback и incident runbook;
- нет blockchain write path в Watchtower exporter.

---

# 14. Обязательный финальный отчёт

После работы верни:

1. изменённые файлы;
2. реализованные endpoints;
3. event list и decoder version;
4. program IDs и network;
5. миграции;
6. environment variables без секретных значений;
7. команды тестов;
8. результаты runtime smoke test;
9. data-quality gaps;
10. deployment blockers;
11. rollback plan;
12. список того, что Watchtower теперь может считать актуальным;
13. список того, что пока остаётся `partial` или `unavailable`.

Не утверждай production readiness, если проверки выше не выполнены фактически.

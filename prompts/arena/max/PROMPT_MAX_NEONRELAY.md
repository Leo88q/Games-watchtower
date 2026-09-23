# PROMPT_MAX_NEONRELAY — Neon Relay до уровня L3/L4 (server-authoritative reward-контур)

Вставь целиком первым сообщением в сессию Arena Agent Mode на репозитории `Leo88q/neon-relay`.

---

## 0. Подключение хаба

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/docs/ECOSYSTEM_MAXIMUM_TARGET.md
cat /tmp/watchtower-hub/reports/neon-relay-audit.json      # сейчас пусто (files_scanned: 0) — это дефект скана
node /tmp/watchtower-hub/scripts/check-ecosystem-target.mjs
```

Работаешь в `Leo88q/neon-relay`. Хаб только читается.

## 1. Текущее состояние (честные факты из `docs/FINAL_REPORT.md`)

- **14 блокеров BL-01…BL-14**: нет тулчейна Rust/Solana/Anchor → 4 программы **никогда не компилировались**;
  нет Android SDK → модуль не собирался; CI не исполнялся (биллинг GitHub, BL-12); 698 ассетов
  `block-release` (BL-05, юридический гейт); `declare_id` и `PROGRAM_ID_PLACEHOLDER` — заглушки;
  `sv_neonrelay_signing 0` — подпись наград выключена.
- Хаб видит `L1`: `NEONRELAY_REWARDS_PROGRAM_ID` не задан; аудит в хабе пуст.
- Инфраструктура для максимума есть: `backend/` с 9 миграциями (wallet auth, reward ledger, economy v1/v2,
  game identity/pairing, admin workflow, beta operations), `backend/src/{watchtower,merkle,alerts,metrics,
  reconcile,rewards,economy_v2_*}.ts`, тесты `backend/test/*.test.ts`, 4 Anchor-программы + валидаторные
  тесты, Android MWA-модуль, Godot-клиент, документы `docs/{REWARD_SECURITY,SOLANA_ARCHITECTURE,
  ECONOMY_V2_*.md,PRIVACY_GAME_EVENTS.md}`.

## 2. W1 — снять блокеры, получить факты (P0)

1. Тулкит: Rust (закрепить `rust-toolchain.toml`), Solana CLI, Anchor CLI фиксированных версий →
   `anchor build` для `neonrelay-{rewards,economy,features,assets}`; `anchor test` + валидаторные тесты
   (`onchain/programs/neonrelay-economy/tests/v2_*.rs`, `neonrelay-rewards/tests/golden_leaf.txt`).
   Verifiable build и фиксация хешей программ.
2. **Program IDs**: `anchor keys list` → реальные id в `declare_id`, `Anchor.toml`,
   `onchain/deployment.example.json`, `.env.example`. Devnet-деплой — только с отдельным deploy-keypair
   оператора; mainnet запрещён. Тестовый mint помечать «no value, not official».
3. Реальный аудит on-chain: SolGuard/Sentio/SLAM → `reports/neon-relay-audit.json` со структурой
   `rule_id, severity, location{path,line,column}, message, help`. Проверить инварианты: один claim на
   лист, отсутствие двойной выплаты, pause-гварды, отсутствие хардкод-mint/SKR, signer-проверки
   в economy/features/assets, отсутствие owner-дыр (SW002) и подмены token-аккаунтов (SW009/010).
4. CI: локально воспроизвести все гейты (`local_syntax_probe.sh`, `neonrelay_signer_test.sh`,
   `backend npm test`, `onchain npm test`, `check_secrets.py`, `check_branding.sh`, `check_assets.sh`,
   `build_neon_skins.py --check`), зафиксировать вывод. Если GitHub Actions недоступен — честно писать
   «CI не запускался, причина», а не «зелёный».
5. Property-тесты инвариантов (`c-07`): reward ledger (caps/эпохи/Merkle — нет двойного claim,
   нет превышения cap, нет награды без подписанного матча), economy v2 (сохранение ценности,
   отсутствие отрицательных балансов), assets (уникальность supply-1 бейджей).

## 3. W1 — экспортер и приёмка

1. Привести backend к контракту `/watchtower/*` (14 маршрутов, `writes:false`) **или** оформить
   задокументированный mapping `/api/* → /watchtower/*` с доказательством полноты и read-only.
2. Телеметрия сессий: `match_start`, `match_end`, `mode`, `result`, `disconnect`, `first_finish`,
   `first_claim`, `client_crash` + anti-cheat/checkpoint/payment/reward-сигналы; `RaceStarted` из
   envelope мапится в `match_start` (как заявлено в `WATCHTOWER_INTEGRATION.md`).
3. Приёмка хабом: devnet-событие → `accepted:true`, повтор → `duplicate:true`,
   `GET /api/games/neonrelay/ingestion` отвечает; клиенты не хардкодят `localhost` (только deployment URL
   или same-origin proxy).
4. `data_quality`, `last_verified_at`, `parser_version`, `network`, `stage` — по факту; синхронизировать
   с хабом. Матрица «что собрано / что unavailable и почему».

## 4. W2 — бэкенд и фронтенд до L3

- **Read-model** (`b-07`, `b-08`): PostgreSQL RLS по tenant'у, TimescaleDB для временных рядов,
  Redis для лимитов/очередей; проекции пересобираемы, сверка с первичными событиями; `reconcile.ts`
  довести до регулярного отчёта.
- **Экономика** (`b-09`): двойная запись по SKR/наградам: mint/burn, fees, treasury, призовые пулы;
  отчёт «события ↔ проводки ↔ балансы»; `docs/ECONOMY_V2_LEDGER.md` — привести к фактической реализации.
- **Reward pipeline** (`b-10`): caps, эпохи, Merkle-запечатывание, claim intents/confirmations,
  доказуемое отсутствие двойной выплаты; включение подписи матчей — отдельный operator decision
  с key ceremony и runbook (`docs/REWARD_SECURITY.md`).
- **Anti-fraud** (`b-11`): некорректные рекорды, буст-паттерны в гонках, multi-account, аномальные
  reward-паттерны; precision/recall и журнал решений.
- **API** (`b-12`, `b-13`): OpenAPI, пагинация, ETag, единые ошибки, request-id; read-токены с
  ротацией/constant-time; для write-proposal — подпись запроса.
- **Observability/надёжность** (`b-15`, `b-16`): OTel по цепочке матч → подпись → ledger → claim,
  Prometheus (`metrics.ts`), SLO-дашборд, retry/backoff, circuit breaker, DLQ, DR RPO ≤ 15 мин / RTO ≤ 4 ч.
- **Нагрузка** (`b-18`): высокочастотный режим (гонки) — дедупликация и лимиты на входе, защита от шторма
  событий, нагрузочный тест на X events/sec.
- **Фронтенд** (`f-01`…`f-12`): in-game Wallet UI с честными состояниями (без обещаний заработка),
  session keys для действий без попапов (0.01 SOL, expiry, deny `withdraw_treasury`), экраны ревардов
  с трассируемыми метриками, realtime-лидерборды, честные ошибки при недоступном кошельке.
- **Android/Seeker** (BL-02, BL-06): собрать модуль, проверить резолв MWA-координаты; если SDK
  недоступен — внешний блокер с точной командой и ошибкой.

## 5. W3 — переплетение (вклад neonrelay)

```text
i-01 идентичность   wallet auth → studio_profile; playerKey совместим с другими играми
i-02 согласия       PRIVACY_GAME_EVENTS.md → единый consent/opt-out studio
i-05 экономика      призовые пулы и caps согласованы со studio treasury и per-game budget
i-06 события        сезонные гонки/турниры синхронны с общим календарём студии
i-07 профиль        достижения/бейджи/лидерборды читаются в общий профиль
i-09 аналитика      retention/DAU в общих определениях; cross-game воронка
i-10 алерты         severity-словарь хаба + runbook на каждый алерт (награды, аномалии, лаг)
i-11 контроль       proposal из хаба: пауза экономики, изменение caps/prize table, freeze rewards
i-12 кросс-чейн     RACE/idosgames перенос наградных активов с лимитами и KYT
```

## 6. W4 — hot

SLO (finalized lag ≤ 30 с p95, свежесть ≤ 5 мин, uptime ≥ 99.9%), DR-учения, внешний аудит
программ и backend, реестр принятых рисков, юнит-экономика (стоимость RPC/провайдеров на 1k игроков),
регламент релиза и отката. Кросс-чейн и ML — только после стабильного ядра.

## 7. Definition of Done

```text
[ ] anchor build + все тесты (backend, onchain, validator) исполнены; вывод в отчёте
[ ] Program IDs реальные; деплой-статус указан честно; test mint помечен как throwaway
[ ] reports/neon-relay-audit.{json,md}: 0 critical/high или formal accepted-risk
[ ] Property-тесты ledger/economy/assets зелёные и в CI
[ ] 14/14 /watchtower/* (или mapping), health.writes=false, приёмка хабом с duplicate
[ ] Read-model с RLS, ledger двойной записи, reward pipeline без двойного claim
[ ] Anti-fraud с precision/recall; SLO-дашборд; DR-restore
[ ] Контуры i-01, i-05, i-11 (минимум) с endpoint + тестом + доказательством
[ ] PR в arena/*, main не изменён, 0 секретов
```

## 8. Формат ответа

A–F из `00_HUB_CONTRACT.md` §7. В разделе C — блокеры, которые не снимаются силами AI (юридический
гейт ассетов BL-05, биллинг GitHub BL-12, отсутствие deploy-keypair), с командой и текстом ошибки.

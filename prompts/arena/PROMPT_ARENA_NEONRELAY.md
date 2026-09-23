# PROMPT_ARENA_NEONRELAY — подключить Neon Relay к гид-хабу Watchtower

Вставь текст ниже целиком первым сообщением в сессию Arena Agent Mode,
открытую на репозитории `Leo88q/neon-relay`, с подключённым GitHub.

---

## Роль

Ты — инженер интеграции Neon Relay (tenant/game `neonrelay`, fork DDNet для Solana Mobile)
с гид-хабом **Games Watchtower** (`Leo88q/Games-watchtower`). Работай внутри `Leo88q/neon-relay`.

Ключевой факт: предыдущий отчёт (`docs/FINAL_REPORT.md`) честно фиксирует **14 блокеров (BL-01…BL-14)**,
то есть часть кода **никогда не компилировалась и не исполнялась**. Задача этой сессии —
снять блокеры, которые снимаются кодом и тулчейном, и довести интеграцию до проверяемой приёмки.

## 1. Подключение гид-хаба (обязательно)

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/docs/GAME_REPO_DELIVERABLES.md
cat /tmp/watchtower-hub/reports/neon-relay-audit.json
cat /tmp/watchtower-hub/reports/DETAILED_6_GAMES.md
```

Хаб только читается. В самом хабе `reports/neon-relay-audit.json` сейчас содержит **0 findings**,
хотя хаба-отчёт заявляет **24 (6 critical, 14 high)** — это расхождение должен закрывать хаб,
но ты обязан дать фактический аудит со своей стороны (см. §3.4).

## 2. Что уже есть в репозитории (проверить, не переписывать)

| Область | Путь |
|---|---|
| Watchtower-адаптер | `backend/src/watchtower.ts`, миграция `backend/migrations/0009_beta_operations.sql` |
| Backend (zero-deps, Node 22) | `backend/src/server.ts`, `http.ts`, `routes.ts`, `watchtower.ts`, `economy*.ts`, `rewards.ts`, `merkle.ts`, `alerts.ts`, `metrics.ts`, `reconcile.ts`, `sessions.ts`, `wallets.ts` |
| Тесты backend | `backend/test/*.test.ts` (по отчёту 30/30 pass), запуск `cd backend && npm test` |
| On-chain | `onchain/programs/neonrelay-rewards`, `-economy`, `-features`, `-assets`; тесты `onchain/programs/neonrelay-economy/tests/v2_{unit,runtime,validator}.rs`, `neonrelay-rewards/tests/golden_leaf.txt`; скрипты `onchain/scripts/{deploy_prod.sh,verify_deployment.sh,create_test_mint.sh,test_local_validator.sh}` |
| Godot-клиент | `integrations/godot/neonrelay_client.gd`, `neonrelay_demo.tscn` |
| Документы | `docs/FINAL_REPORT.md`, `docs/KNOWN_LIMITATIONS.md`, `docs/DEVNET_RUNBOOK.md`, `docs/REWARD_SECURITY.md`, `docs/API.md`, `docs/SOLANA_ARCHITECTURE.md`, `docs/ECONOMY_V2_PROGRAM.md`, `docs/ANDROID_SEEKER.md`, `WATCHTOWER_INTEGRATION.md` |

Проверка контракта, заявленного для haбa:

```bash
cd backend && npm start          # порт 8787
curl -s 'http://127.0.0.1:8787/api/os/config' | head -c 400
curl -s 'http://127.0.0.1:8787/api/l2/router?gameId=neonrelay&tps=high&ux=gasless'
curl -s 'http://127.0.0.1:8787/api/game-signals/config?gameId=neonrelay'
```

Маршрут `tps=high&ux=gasless` обязан вернуть HyperGrid + gasless путь (MagicBlock ER), с Arcium/PST/Xandeum в связке.

## 3. P0 — снять блокеры и доказать фактами

### 3.1 Toolchain и компиляция (BL-01…BL-03)
1. Установи Rust (закреплён через `rust-toolchain`/`Cargo.toml`), Solana CLI и Anchor CLI фиксированных версий; зафиксируй установленные версии в отчёте.
2. `cd onchain && anchor build` — для **всех четырёх** программ. Если билд падает: починить, либо зафиксировать точную ошибку и минимальный репро. «Не проверялось» из отчёта превратить в «проверено: результат».
3. `cd onchain && npm test` (или `anchor test`) — тесты должны реально исполниться.
4. `cargo test` в рабочей области; включить `rust-toolchain.toml`, если его нет.

### 3.2 Program IDs (placeholder → реальность)
`declare_id` и `PROGRAM_ID_PLACEHOLDER` — заглушки. Требуется:

```bash
cd onchain && anchor keys list         # получить реальные id для 4 программ
```

- Заменить заглушки фактическими id, синхронизировать `Anchor.toml`, `onchain/deployment.example.json` и `NEONRELAY_REWARDS_PROGRAM_ID` в `.env.example`.
- **Деплой в mainnet запрещён.** Devnet-деплой — только если у оператора есть отдельный deploy-keypair; иначе подготовить runbook-скрипт и явно написать, что деплой не выполнялся.
- Тестовый mint из `onchain/scripts/create_test_mint.sh` остаётся throwaway и обязан быть помечен «no value, not official» (как и сейчас).

### 3.3 CI (BL-12)
`.github/workflows/ci.yml` никогда не исполнялся (биллинг аккаунта). Проверь:
- workflow синтаксически валиден и повторяет локальные гейты (probe-скрипты, тесты backend/onchain, secret-scan);
- локально все гейты зелёные — это доказательство готовности CI даже без запуска;
- в отчёте разделить: «CI-конфиг валиден и гейты воспроизведены локально» vs «CI в GitHub не запускался (причина: …)».

### 3.4 Аудит безопасности
Требуется фактический прогон, а не пересказ:
- SolGuard / Sentio CLI / SLAM по `onchain/programs/*/src/**`;
- результат сохранить в `reports/neon-relay-audit.json` (структура: `rule_id, severity, location{path,line,column}, message, help`) и `reports/neon-relay-audit.md`;
- отдельно проверить инварианты: один claim на лист, отсутствие двойной выплаты, pause-гварды, отсутствие хардкод-mint, отсутствие `SKR`, signer-проверки в economy/features/assets.

### 3.5 Экспортер read-only и телеметрия
- Приведи backend к контракту `/watchtower/*` (`00_HUB_CONTRACT.md` §4) **или** оформи явный mapping «`/api/*` → `/watchtower/*`» с доказательством, что все поля есть и ни одна ручка не пишет.
- `GET /watchtower/health` обязан возвращать `writes:false` и `dataQuality`.
- Телеметрия сессий: `match_start`, `match_end`, `mode`, `result`, `disconnect`, `first_finish`, `first_claim`, `client_crash` + anti-cheat/checkpoint/payment/reward-сигналы. Проверь, что `RaceStarted` из envelope мапится в `match_start` (как заявлено в `WATCHTOWER_INTEGRATION.md`).
- Награды: подписывающий контур (`src/neonrelay/match_signer.*`, `sv_neonrelay_*`) по умолчанию выключен — не включать в рамках этой задачи; зафиксировать в отчёте как operator decision.

### 3.6 Приёмка хабом

```bash
curl -s -X POST localhost:8787/api/ingest/solana -H 'content-type: application/json' \
  -d '{"cluster":"devnet","slot":1,"signature":"neon-real-1","programId":"NEONRELAY_REWARDS_PROGRAM_ID","eventType":"RaceStarted","commitment":"finalized","payload":{"gameId":"neonrelay","playerKey":"<hash>"}}'
# повтор → duplicate:true
curl -s localhost:8787/api/ingestion/adapters
curl -s localhost:8787/api/games/neonrelay/ingestion
```

Клиент не должен хардкодить `localhost` для удалённых сервисов — только deployment URL или same-origin proxy.

## 4. P1

1. Экономика: `docs/ECONOMY_V2_LEDGER.md` → метрики `total minted`, `burned`, `net issuance`, `treasury balance`, caps/epochs/Merkle — через `/watchtower/economy` с формулами и периодом агрегации.
2. Игроки: DAU/WAU/MAU, retention D1/D7/D30, очереди матчмейкинга, disconnect/crash rate — с явной пометкой `partial`, если источник неполный.
3. Lightning: сборки Android/Seeker (BL-02, BL-06) — Maven-координата MWA не резолвилась офлайн; проверить резолв, собрать `android/`; если SDK недоступен — зафиксировать как внешний блокер с командой.
4. Ассеты: BL-05 (698 ассетов `block-release`) — юридический гейт, AI не решает; отметить как открытый вопрос оператору, release-гейт не ослаблять.

## 5. P2

- Godot-клиент: проверь, что `integrations/godot/neonrelay_client.gd` не содержит секретов и write-вызовов, и что телеметрия идёт только через exporter.
- Прогнозы: `forecast` — либо метод с бэктестом, либо честный `unavailable` (без «нарисованных» кривых).
- Proposal-flow для админ-операций (`backend/src/admin.ts`): RBAC, 2FA, второе подтверждение, audit log, rollback — с тестом на отказ без подтверждения.

## 6. Жёсткие правила

`00_HUB_CONTRACT.md` §5: main не трогать, force-push запрещён, секреты и keypair'ы не коммитить,
mainnet-деплоя нет, signer'ов в exporter нет, авто-выплат и автоблокировок нет, моки не выдавать
за production.

Ветка: `arena/<короткий-id>-neonrelay-watchtower-hub`; в конце PR в `Leo88q/neon-relay`.

## 7. Definition of Done

```text
[ ] anchor build + тесты всех 4 программ исполнены, вывод в отчёте
[ ] Program IDs: реальные значения (или явный runbook с указанием, что деплой не выполнялся)
[ ] CI-конфиг валиден, локальные гейты воспроизведены (список команд + вывод)
[ ] reports/neon-relay-audit.{json,md} — фактический аудит с rule_id/severity/location
[ ] /watchtower/* (или mapping) отвечают, health.writes = false
[ ] События neonrelay принимаются хабом, повтор даёт duplicate:true
[ ] data_quality и last_verified_at в WATCHTOWER_INTEGRATION.md соответствуют фактам
[ ] PR открыт, main не изменён, секретов в диффе нет
```

## 8. Формат ответа

Разделы A–F из `00_HUB_CONTRACT.md` §7. В разделе C обязательно перечислить блокеры,
которые **не снимаются** силами AI (юридический гейт ассетов, биллинг GitHub, отсутствие
deploy-keypair), с точной командой и причиной.

# PROMPT_ARENA_GUTTERCAPS — подключить Gutter Caps к гид-хабу Watchtower

Вставь текст ниже целиком первым сообщением в сессию Arena Agent Mode,
открытую на репозитории `Leo88q/guttercaps`, с подключённым GitHub.

---

## Роль

Ты — инженер безопасности и интеграции Gutter Caps (tenant/game `guttercaps`) с гид-хабом
**Games Watchtower** (`Leo88q/Games-watchtower`). Работай внутри `Leo88q/guttercaps`.

Это **самый проблемный tenant экосистемы**: фактический аудит содержит **188 findings
(86 critical, 89 high)**, из них подавляющая часть — в реальных программах экономики,
а не в тестовых заглушках. Приоритет этой сессии: **критические дыры on-chain → приёмка хабом**.

## 1. Подключение гид-хаба (обязательно)

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/reports/guttercaps-audit.json     # полный список 188 findings
cat /tmp/watchtower-hub/reports/guttercaps-audit.md
cat /tmp/watchtower-hub/docs/GAME_ADAPTERS.md
```

Хаб только читается.

## 2. Заявленный паспорт (проверить каждый пункт фактом)

```
game_id: guttercaps      network: devnet        stage: beta (в хабе registry — alpha, расхождение)
program_ids:
  GUTTERCAPS_CORE_PROGRAM_ID: GCRhrg6mc7zH1VdXG5rX3tQEpgu8Gptf27vdsJGV7G8q
  CgInv / SessKeys / STrEaSuRy — placeholder'ы
mint: SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3 (skr), bubblegum tree Tree111… (placeholder)
treasury: HPMr5r9sS5ApWsPNJytZRLbm2jz1veFxTn1wepjAhtho ; TreasuryVault111… (placeholder)
upgrade_authority: SquadsV4Multisig1111111111111111111111111111 (placeholder?)
idl_version: 0.31.1    parser_version: guttercaps-v3.0.0
data_quality: complete  last_verified_at: 2026-09-22T17:54:00Z
```

Задача 2.1 (P0): для каждого адреса — проверка через devnet RPC:

```bash
solana program show GCRhrg6mc7zH1VdXG5rX3tQEpgu8Gptf27vdsJGV7G8q --url devnet
solana account HPMr5r9sS5ApWsPNJytZRLbm2jz1veFxTn1wepjAhtho --url devnet -o json
solana program show SquadsV4Multisig1111111111111111111111111111 --url devnet
```

`data_quality: complete` запрещено оставлять, если хотя бы один адрес или метрика не подтверждены;
понижай до `partial`/`unavailable` с указанием причины. `last_verified_at` обновляется только
по факту успешной проверки.

## 3. P0 — безопасность on-chain (главное задание)

Фактическое распределение findings (из `reports/guttercaps-audit.json`, 27 файлов просканировано):

| Rule | Severity | Кол-во | Смысл |
|---|---|---|---|
| `SW002` | critical | 70 | аккаунт без owner-констрейнта и без проверки `account.owner` — можно подсунуть чужой program-owned аккаунт |
| `SW013` | critical/high | 54 | PDA seed ссылается на непроверенный аккаунт |
| `SW024` | high | 20 | деление на ноль |
| `SW023` | high | 13 | проверь описание в JSON |
| `SW016` | high | 12 | `init_if_needed` — риск повторной инициализации/сброса состояния |
| `SW027` | low | 10 | нет `emit!()` на изменение состояния (хаб не видит переходов) |
| `SW025` | — | 3 | из JSON |
| `SW010` | critical | 2 | token account без `token::authority` |
| `SW003` / `SW022` | — | 1 / 1 | из JSON |

Топ файлов по находкам:

```
28  ./programs/arena/src/lib.rs
27  ./programs/market/src/lib.rs
22  ./programs/staking/src/instructions/stake.rs
19  ./programs/sb_mock/src/lib.rs
18  ./programs/chip_core/src/instructions/packs.rs
15  ./programs/chip_core/src/instructions/rng.rs
```

Требования:

1. `programs/sb_mock` — это, судя по названию, mock/стенд. Проанализируй назначение файла и
   **либо** докажи, что он не деплоится ни в один из контуров (ссылка на `Anchor.toml`,
   CI, deployment-скрипты), **либо** чини. «Это mock» без доказательства — не принимается.
2. Для оставшихся 4 программ (`arena`, `market`, `staking`, `chip_core`) критические findings
   (SW002, SW013, SW010) обязаны быть исправлены: owner-констрейнты, валидация seed'ов,
   `token::authority`/`token::mint`, защита от div0.
3. Каждое исправление — с тестом на регресс. В `tests/localnet/*.spec.ts` уже есть спеки
   (admin, packs, compressed-packs, fusion, market, arena, staking, cross, compressed) — расширяй их.
4. После правок прогнать аудит заново и приложить новый JSON: цель — 0 critical. Если что-то
   сознательно принято как риск — отдельная таблица с обоснованием, а не молчаливое удаление.

## 4. P0 — доказать заявление про утечку памяти

В `WATCHTOWER_INTEGRATION.md` заявлено: «утечка ссылок ECS 8-12 сущностей (`1m memref`, 30%)
устранена, 0% leak ratio». Это заявление **без доказательства**.

Требуется:

1. Показать `EcsWorld.cleanup_round_entities()` и место вызова в конце раунда (`godot/scripts/ecs_world.gd`).
2. Прогнать `tests/godot/test_gutter_caps_v3.gd` и приложить вывод (команда + результат).
3. Дать **измеримое** доказательство: число живых ссылок/объектов до и после N раундов
   (например, 100 раундов × 8–12 сущностей), либо честно понизить заявление до `partial`
   и описать, что именно измерено, а что нет.

## 5. P0 — приёмка хабом

```bash
# exporter / сервер
python3 scripts/watchtower_v3_server.py          # или npm-эквивалент; порт из config
curl -s localhost:<port>/watchtower/health       # writes:false обязательно
curl -s localhost:<port>/watchtower/config
curl -s localhost:<port>/watchtower/metrics/daily
curl -s localhost:<port>/watchtower/economy
curl -s localhost:<port>/watchtower/security
# события
curl -s -X POST localhost:8787/api/ingest/solana -H 'content-type: application/json' \
  -d '{"cluster":"devnet","slot":1,"signature":"gc-real-1","programId":"GCRhrg6mc7zH1VdXG5rX3tQEpgu8Gptf27vdsJGV7G8q","eventType":"CapShot","commitment":"finalized","payload":{"gameId":"guttercaps","playerKey":"<hash>"}}'
# повтор → duplicate:true
curl -s localhost:8787/api/ingestion/adapters
curl -s localhost:8787/api/games/guttercaps/ingestion
```

Также проверь `scripts/watchtower_v3_registry.py` и `tests/watchtower/watchtower-v3.test.ts`:
в реестре не должно быть выдуманных статусов внедрения, а тест обязан ловить расхождение
между заявленными и фактическими компонентами.

## 6. P1

1. `backend/src/{ingest.ts,metrics.ts,health.ts,projections.ts,antifraud.ts,reward-oracle.ts,finality.ts}`
   — привести к read-only контракту `/watchtower/*`; ни одного signer'а, ни одной write-ручки.
2. Антифрод: `backend/src/antifraud.ts` — multi-account, аномальные reward patterns,
   подозрительные PvP-паттерны; оформить как alert rules с порогами и confidence.
3. Экономика: sinks/sources, mint/burn SKR и чипов, staking, arena-призы — метрики с формулами,
   периодом и часовым поясом; `sink/source ratio`, `velocity`, `net issuance`.
4. Роли: `admin.ts` — proposal-flow (RBAC, 2FA, второе подтверждение, multisig, timelock, audit log, rollback).
5. Стадия: сверить `stage: beta` (репозиторий) vs `alpha` (registry хаба) — прислать корректное значение.

## 7. P2

- Честные статусы v3-компонентов (MagicBlock ER, Bolt, Arcium, PST, Xandeum, Core Attributes,
  DePIN, RitArena, Access, idosgames): в отчётах `planned`/`unavailable` вместо «внедрено».
- Godot: session keys (0.01 SOL, deny withdraw_treasury, expiry 60 мин) — тест на запрет операции.
- `docs/09-production-readiness.md` и `docs/10-handoff-prompt.md` — синхронизировать с фактическим состоянием.

## 8. Жёсткие правила

`00_HUB_CONTRACT.md` §5: main не трогать, секреты не коммитить, mainnet-деплоя нет,
signer'ов в exporter нет, авто-блокировок и авто-наград нет, моки не выдавать за production.

Ветка: `arena/<короткий-id>-guttercaps-watchtower-hub`; в конце PR в `Leo88q/guttercaps`.

## 9. Definition of Done

```text
[ ] 0 critical findings в новом reports/guttercaps-audit.json (или обоснованная таблица исключений)
[ ] Каждый критический класс (SW002, SW013, SW010, SW024) закрыт тестом на регресс
[ ] Заявление про memref-утечку подтверждено измерением либо понижено до partial
[ ] Все адреса паспорта проверены RPC-командой (вывод в отчёте)
[ ] /watchtower/* отвечают, health.writes = false
[ ] События guttercaps принимаются хабом, повтор даёт duplicate:true
[ ] data_quality и last_verified_at соответствуют фактам; stage согласован с хабом
[ ] PR открыт, main не изменён
```

## 10. Формат ответа

Разделы A–F из `00_HUB_CONTRACT.md` §7. В разделе C — по каждому непринятому вызову:
файл, строка, почему не исправлено, чем это грозит (с оценкой severity).

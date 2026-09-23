# PROMPT_ARENA_AOF — подключить Age of Farming к гид-хабу Watchtower

Вставь текст ниже целиком первым сообщением в сессию Arena Agent Mode,
открытую на репозитории `Leo88q/aof`, с подключённым GitHub.

---

## Роль

Ты — инженер интеграции Age of Farming (tenant/game `aof`) с центральным гид-хабом
**Games Watchtower** (`Leo88q/Games-watchtower`). Работай внутри `Leo88q/aof`.
Интеграция частично сделана локально — сначала проверь её, потом закрывай разрывы.
Главная задача этой сессии: **закрыть 17 findings аудита (1 critical) и довести exporter до
приёмки хабом**.

## 1. Подключение гид-хаба (обязательно)

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md
cat /tmp/watchtower-hub/reports/aof-audit.json     # 17 findings с точными адресами
cat /tmp/watchtower-hub/reports/aof-audit.md
cat /tmp/watchtower-hub/docs/GAME_REPO_DELIVERABLES.md
```

Хаб только читается. Изменения хаба — отдельная задача в самом хабе.

## 2. Что уже сделано по AOF (проверить, не переделывать)

| Артефакт | Путь |
|---|---|
| Экспортер-каркас | `watchtower/` (`README.md`, `Dockerfile`, `config.example.env`, `events/event-types.json`, `events/schema.json`, `events/fixtures/*`) |
| Документация стека v3 | `docs/WATCHTOWER_OS_V3.md`, `FINAL_REPORT_V3.md` (20 пунктов) |
| Godot-интеграция | `game/godot/autoload/watchtower_os.gd` |
| Config API/stack | `src/os/stack-v3.js`, `src/os/handoff-v3.js`, `src/os/sql/cross_game_materials.sql` |
| Смоук v3 | `scripts/smoke-watchtower-os-v3.sh` |
| Паспорт | `WATCHTOWER_INTEGRATION.md` |

Подтверждённые адреса (devnet-референс, проверить через RPC):

| Символ | Значение | Статус |
|---|---|---|
| `AOF_CORE_PROGRAM_ID` | `HtJg3R3Ki938QeSD98djwMgWESboDVEykuyKGtvRamEq` | deployed (devnet reference) |
| session keys | `6ZnnyKkv1kUE4AJqi5uwdh5ZX6VFGfbQiwhGSkfqZ9K5` | deployed |
| `CgInv111…` | `CgInv1111111111111111111111111111111111111` | placeholder |
| `STrEaSuRy111…` | `STrEaSuRy1111111111111111111111111111111111` | placeholder |

## 3. P0 — безопасность (исправить и доказать)

Фактический список из `reports/aof-audit.json` хаба (17 findings, 52/52 файла распарсены):

| Rule | Severity | Кол-во | Где |
|---|---|---|---|
| `SW001` Missing signer check | **critical** | 1 | `programs/aof-session-keys/src/lib.rs:173` (`authority` — authority без signer-констрейнта) |
| `SW008` Missing post-CPI account reload | high | 1 | `programs/aof-market/src/lib.rs:415` (`cancel_limit_order` после CPI `token::transfer`) |
| `SW013` PDA seed references unvalidated account | high | 3 | `programs/aof-session-keys/src/lib.rs:127,145,176`; `programs/aof-quests/src/instructions/drum/drum_reveal.rs:27` |
| `SW016` `init_if_needed` usage | high | 5 | `programs/aof-rebirth/src/instructions/do_rebirth.rs:16` и др. |
| `SW024` Division by zero | high | 2 | `programs/aof-liquidity/src/state/lp_pool.rs:27:22`, `:36:9` |
| `SW027` Missing event emission | low | 5 | `programs/aof-market/src/lib.rs:291` (`set_fees`), `:297` (`set_paused`), `:407`, `programs/aof-session-keys/src/lib.rs:245,250` |
| прочее | high | 4 | `programs/aof-liquidity/src/instructions/lp_deposit.rs:18,27` и др. |

Требования:

1. Для **каждого** finding: либо исправление (минимальный диф, тест на регресс),
   либо письменное обоснование, почему это false positive — с цитатой кода.
   Отбрасывать без обоснования запрещено.
2. После правок прогнать аудит заново (Sentio CLI / SolGuard / SLAM) и приложить
   новый `reports/aof-audit.json` с фактическим числом findings (цель: 0 critical, 0 high).
3. `SW016` — заменить на `#[account(init, ...)]` там, где это возможно, иначе доказать,
   что состояние нельзя сбросить повторной инициализацией.
4. `SW027` — добавить `emit!()` на изменение состояния: без событий хаб и Game Signals
   не видят переходов (`set_fees`, `set_paused`, миграции, rebirth).

## 4. P0 — приёмка exporter'а и хаба

```bash
# экспортер
curl -s localhost:${WATCHTOWER_EXPORTER_PORT:-8790}/watchtower/health   # writes:false обязательно
curl -s localhost:8790/watchtower/config
curl -s localhost:8790/watchtower/metrics/daily
curl -s localhost:8790/watchtower/economy
curl -s localhost:8790/watchtower/players/retention
curl -s localhost:8790/watchtower/funnels
# хаб
curl -s -X POST localhost:8787/api/ingest/solana -H 'content-type: application/json' \
  -d '{"cluster":"devnet","slot":1,"signature":"aof-real-1","programId":"HtJg3R3Ki938QeSD98djwMgWESboDVEykuyKGtvRamEq","eventType":"PlantPlanted","commitment":"finalized","payload":{"gameId":"aof","playerKey":"<hash>"}}'
# повтор → duplicate:true
curl -s localhost:8787/api/ingestion/adapters
curl -s localhost:8787/api/games/aof/ingestion
```

Если `/watchtower/*` в репозитории ещё не реализованы (есть только `/api/*`), реализуй их
как тонкий read-only слой над существующим API и БД — без дублирования бизнес-логики.
Полный список маршрутов — `00_HUB_CONTRACT.md` §4.

## 5. P1

1. Игровые события должны покрывать контракт хаба: `PlayerJoined`, `WalletConnected`,
   `PlotPlanted`, `CropHarvested`, `ResourceMinted`, `ResourceBurned`, `CraftCompleted`,
   `MarketOrderPlaced/Cancelled`, `RewardGranted`, `TransactionFailed`, `SecurityEvent`
   (сверить с `watchtower/events/event-types.json` и `docs/GAME_ADAPTERS.md`).
2. RLS `tenant_id = 'aof'` + materialized view `mv_cross_game_materials_aof` — проверить,
   что SQL из `src/os/sql/cross_game_materials.sql` применяется и не ломает мульти-тенантность.
3. Экономика AOF: источники (harvest/craft/reward) и стоки (craft cost/fees/burn) с формулами,
   периодом агрегации и часовым поясом; `sink/source ratio`, `velocity`, `net issuance`.
4. `data_quality`: выставить по доменам честно (`players`, `economy`, `security`, `craft`),
   с указанием, чего не хватает.
5. Godot-клиент: `watchtower_os.gd` не должен содержать секретов и write-вызовов;
   телеметрия — только через exporter.

## 6. P2

- Честные статусы не внедрённых v3-компонентов (Xandeum, PST, Arcium, Access, idosgames,
  RitArena, DePIN): в `WATCHTOWER_INTEGRATION.md` и `FINAL_REPORT_V3.md` должно быть
  `planned`/`unavailable`, а не «внедрено».
- Proposal-flow (RBAC, 2FA, второе подтверждение, multisig, timelock, audit log, rollback)
  для админ-действий: `set_fees`, `set_paused`, `issuance_cap`, маркетплейс.
- Anti-fraud: мультиаккаунты, аномальные reward patterns, Sybil в кланах/аукционах —
  как alert rules с порогами и уровнем уверенности.

## 7. Жёсткие правила

См. `00_HUB_CONTRACT.md` §5: main не трогать, секреты не коммитить, mainnet нет,
signer'ов в exporter нет, автоблокировок и автонаград нет, выдуманных метрик нет.

Ветка: `arena/<короткий-id>-aof-watchtower-hub`; в конце PR в `Leo88q/aof`.

## 8. Definition of Done

```text
[ ] 0 critical и 0 high findings в новом reports/aof-audit.json (или обоснованные исключения)
[ ] Повторный аудит приложен выводом команды
[ ] /watchtower/* endpoints отвечают, writes:false
[ ] integration-manifest / WATCHTOWER_INTEGRATION.md без placeholder-адресов,
    либо placeholder явно помечен как placeholder с причиной
[ ] События aof принимаются хабом, повтор даёт duplicate:true
[ ] Тесты AOF зелёные, вывод в отчёте
[ ] PR открыт, main не изменён
```

## 9. Формат ответа

Разделы A–F из `00_HUB_CONTRACT.md` §7. В разделе C перечислить всё, что не удалось
проверить (например, деплой-транзакции), с точной командой и текстом ошибки.

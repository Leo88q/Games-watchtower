# Промпты для работы игр в Arena с подключённым гид-хабом Watchtower

Набор готовых промптов: один промпт на одну игру + один на сам хаб.
Каждый игровой промпт вставляется целиком как первое сообщение в сессию Arena
Agent Mode, открытую на репозитории соответствующей игры, с подключённым GitHub.

## Файлы

| Файл | Для кого | Репозиторий Arena | game_id |
|---|---|---|---|
| `00_HUB_CONTRACT.md` | все | `Leo88q/Games-watchtower` (только чтение) | — |
| `PROMPT_ARENA_ARES1.md` | ARES-1 | `Leo88q/ares1` | `ares1` |
| `PROMPT_ARENA_AOF.md` | Age of Farming | `Leo88q/aof` | `aof` |
| `PROMPT_ARENA_NEONRELAY.md` | Neon Relay | `Leo88q/neon-relay` | `neonrelay` |
| `PROMPT_ARENA_GUTTERCAPS.md` | Gutter Caps | `Leo88q/guttercaps` | `guttercaps` |
| `PROMPT_ARENA_TRAFFICGEN.md` | TalkChart / Traffic Generator | `Leo88q/talkchart-traffic-generator` | `trafficgen` |
| `PROMPT_ARENA_WATCHTOWER_HUB.md` | хаб | `Leo88q/Games-watchtower` | все tenant'ы |

## Как запускать (порядок)

1. **Сначала хаб.** Сессия Arena на `Games-watchtower` + `PROMPT_ARENA_WATCHTOWER_HUB.md`:
   чинится расхождение аудитов, подтягиваются program IDs и registry, публикуется
   экосистемный отчёт. Без этого игры будут подключаться к mock-хабу.
2. **Потом игры, в порядке риска:**
   1. `guttercaps` — 188 findings, 86 critical, битое ядро экономики;
   2. `neon-relay` — 14 блокеров, код ни разу не собран, program id — placeholder;
   3. `ares1` — аудит-файл в хабе пуст (0 findings при заявленных 43), verification не проводилась;
   4. `aof` — 17 findings (1 critical) + подключение exporter'а;
   5. `trafficgen` — 10 findings, off-chain метрики и оставшиеся события;
3. **Финал:** повторный прогон `PROMPT_ARENA_WATCHTOWER_HUB.md` — сводка «какие игры реально подключены».

Параллельно игры запускать можно: они не пишут друг другу в репозитории. Единственная
общая точка — read-model хаба (`POST /api/ingest/solana`), конфликтов нет.

## Что вставлять в Arena

- Промпт игры целиком (он самодостаточен).
- Если в сессии Arena видно файлы хаба — ничего дополнительно не нужно; промпт сам
  подтянет `00_HUB_CONTRACT.md` через `gh api` или клон.
- Если GitHub в сессии не подключён — заменить команды получения хаба на заранее
  склонированный локальный путь и явно указать это в отчёте (раздел B).

## Что считается результатом

Для каждой игры — **PR** в её репозиторий в ветке `arena/*` (main не трогается) со
следующим содержимым:

- рабочий read-only exporter (`/watchtower/*`) и/или дописанные события;
- `integration-manifest.json` + `config.example.env` (имена переменных без значений);
- исправленные или явно принятые findings аудита с обоснованием;
- прогнанные тесты и фактические выводы команд;
- отчёт по форме A–F (см. `00_HUB_CONTRACT.md` §7) прямо в описании PR.

## Текущее фактическое состояние экосистемы

Сводный анализ — `docs/FINAL_ECOSYSTEM_REPORT.md` (в корне хаба). Кратко:

| Игра | Стадия | data_quality (заявлено) | Findings (по файлам отчётов хаба) | Главный блокер |
|---|---|---|---|---|
| ares1 | prototype | `partial` | **0 в JSON хаба** при заявленных 43 (12 critical) | `last_verified_at = null`, адреса не подтверждены сетью |
| aof | prototype | `partial` | 17 (1 critical, 11 high) — с точными адресами | 5×`init_if_needed`, missing signer, div0 |
| neonrelay | prototype | `partial` | **0 в JSON хаба** при заявленных 24 (6 critical) | BL-01…BL-14: Anchor/Android не компилировались, program id placeholder |
| guttercaps | beta (в хабе `alpha`) | `complete` (заявлено) | 188 (86 critical, 89 high) в реальных программах | SW002 70 / SW013 54 / SW024 20, заявление «утечка memref = 0%» без проверяемого доказательства |
| trafficgen | live | `partial` | 10 (3 critical, 7 high) в `programs/sixsec` | SW009 6 (token::mint) / SW010 3 (token::authority), 12 событий `unavailable`, forecast не реализован |

Эти расхождения — прямое задание для промпта хаба: пока хаб публикует «282 findings / 108 critical»,
а его собственные JSON-файлы по ares1 и neon-relay пустые, ни одна игра не может проверить свой прогресс.

## Дисциплина данных (действует во всех промптах)

- `complete | partial | unavailable` — единственные допустимые значения статуса;
- отсутствующие метрики не заменяются нулями и не додумываются;
- секреты — только именами ENV, значения не коммитятся и не передаются хабу;
- любое действие, меняющее состояние блокчейна, — только proposal-flow (RBAC, 2FA, второе
  подтверждение, audit log, rollback) и никогда из автоматики AI-агента.

# PROMPT_ARENA_ARES1 — подключить ARES-1 к гид-хабу Watchtower

Вставь текст ниже целиком первым сообщением в сессию Arena Agent Mode,
открытую на репозитории `Leo88q/ares1`, с подключённым GitHub.

---

## Роль

Ты — инженер интеграции ARES-1 (tenant/game `ares1`) с центральным гид-хабом
**Games Watchtower** (`Leo88q/Games-watchtower`). Работай **внутри этого репозитория**
(`Leo88q/ares1`), а не в хабе. Не переписывай проект с нуля: большая часть интеграции уже
сделана локально предыдущим агентом — сначала найди и проверь её, затем закрой разрывы.

## 1. Подключение гид-хаба (обязательно, до любых правок)

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
cat /tmp/watchtower-hub/prompts/arena/00_HUB_CONTRACT.md   # единый контракт, читать целиком
cat /tmp/watchtower-hub/docs/GAME_REPO_DELIVERABLES.md
cat /tmp/watchtower-hub/docs/GAME_ADAPTERS.md
cat /tmp/watchtower-hub/reports/ares1-audit.json
cat /tmp/watchtower-hub/reports/DETAILED_6_GAMES.md
```

Если GitHub в сессии недоступен — зафиксируй это в разделе C отчёта и работай по правилам,
перечисленным в этом промпте (они самодостаточны).

Хаб — источник истины по контракту. Модифицировать хаб из этого репозитория **запрещено**.

## 2. Что уже сделано по ARES-1 (не переделывать, проверить)

| Артефакт | Путь |
|---|---|
| Exporter (TypeScript) | `watchtower/src/watchtower-exporter.ts`, `api.ts`, `event-decoder.ts`, `event-normalizer.ts`, `health.ts`, `ingestion.ts`, `metrics.ts`, `model.ts`, `rpc.ts`, `store.ts`, `verification.ts`, `artifacts.ts`, `config.ts` |
| Шаблон контракта событий | `watchtower/events/schema.json`, `event-types.json`, `ares1-event-map.json`, `ares1-idl.json`, `fixtures/real-devnet/`, `fixtures/synthetic/` |
| Манифест | `watchtower/integration-manifest.json` |
| Read-model SQL | `watchtower/migrations/watchtower-read-model.sql` |
| Скрипты | `watchtower/scripts/migrate.ts`, `replay.ts`, `sync-idl.mjs`, `verify-devnet.ts` |
| Тесты | `watchtower/tests/watchtower-{events,decoder,replay,readonly,rpc,verification,postgres}.test.ts`, `tests/os/watchtower-os-v3.test.mjs` |
| Стек v3 в репозитории | `watchtower/src/os/stack-v3.js`, `control-panels-v3.js`, `handoff-v3.js`, `server.js`; `watchtower/docs/watchtower-os-v3.md` |
| Отчёт | `WATCHTOWER_OS_V3_FINAL_REPORT.md` (20 пунктов, 33 компонента, 19 панелей), `WATCHTOWER_INTEGRATION.md` (генерируется `handoff-v3.js`) |

Заявленные факты, которые нужно **подтвердить или опровергнуть фактами**:

- v1/v2 program id: `DUUBiVvpbw5BbFLpryisvLGmBWmhVYC8tdf5xCUyEadf`, devnet, idl `0.2.0`, parser `ares1-v1`;
- `deploymentVerified=false`, `lastVerifiedAt=null`, `data_quality: partial`;
- v3-сплит program id (`ARES1_CGINV_PROGRAM_ID`, `ARES1_SESSION_KEYS_PROGRAM_ID`,
  `ARES1_TREASURY_PROGRAM_ID`, `ARES1_CORE_PROGRAM_ID`) — **значения в репозитории отсутствуют**;
- `GET /api/os/final-report`, `npm run test:os`, `npm run os:handoff:check`.

## 3. Разрыв, который обязательно нужно закрыть (P0)

1. **Расхождение аудита.** В хабе `reports/ares1-audit.json` содержит **0 findings** и
   `files_scanned: 0`, при этом `reports/DETAILED_6_GAMES.md` и `FINAL_OS3_REPORT.md`
   заявляют **43 finding (12 critical, 30 high, 1 medium)** с топ-дырами
   `SW013 PDA seed unvalidated`, `SW024 div0`, `SW001 missing signer`.
   Прогони аудит заново на актуальном коде ARES-1 доступными инструментами
   (Sentio CLI static AST, SolGuard 130+, SLAM), сохрани результат в
   `reports/ares1-audit.json` **внутри репозитория ARES-1** и в `reports/ares1-audit.md`.
   Каждый finding должен иметь `rule_id`, `severity`, `location{path,line,column}`, `message`, `help`.
   Если finding'ов нет — докажи это выводом команды, а не утверждением.
2. **Верификация сети.** `last_verified_at` пуст, `address_provenance = repository_only_not_network_verified`.
   Выполни `watchtower/scripts/verify-devnet.ts` и `watchtower/scripts/sync-idl.mjs` против devnet RPC:
   проверь существование программы, владельца, версию IDL, свери свежесть. Заполни
   `watchtower/integration-manifest.json` (`programIds`, `idlVersion`, `deploymentVerified`,
   `lastVerifiedAt`) и перегенерируй `WATCHTOWER_INTEGRATION.md` через `npm run os:handoff`
   (вручную не редактировать). Если проверка невозможна — так и напиши, с точной командой и ошибкой.
3. **Runtime-доказательство exporter'а.** Подними exporter, снимай и приложи фактический вывод:

```bash
curl -s localhost:${WATCHTOWER_EXPORTER_PORT:-8790}/watchtower/health   # обязателен writes:false
curl -s localhost:8790/watchtower/config
curl -s localhost:8790/watchtower/events?limit=5
curl -s localhost:8790/watchtower/metrics/daily
curl -s localhost:8790/watchtower/players/retention
curl -s localhost:8790/watchtower/economy
curl -s localhost:8790/watchtower/security
```

Все перечисленные в `00_HUB_CONTRACT.md` §4 endpoints должны отвечать. Ни одной write-ручки.
4. **Приёмка хабом.** Отправь реальные devnet-события ARES-1 в хаб и докажи идемпотентность:

```bash
curl -s -X POST localhost:8787/api/ingest/solana -H 'content-type: application/json' \
  -d '{"cluster":"devnet","slot":1,"signature":"ares1-real-1","programId":"DUUBiVvpbw5BbFLpryisvLGmBWmhVYC8tdf5xCUyEadf","eventType":"PlayerJoined","commitment":"finalized","payload":{"gameId":"ares1","playerKey":"<hash>"}}'
# повтор того же запроса обязан вернуть duplicate: true
curl -s localhost:8787/api/ingestion/adapters
curl -s localhost:8787/api/games/ares1/ingestion
```

(В сессии Arena хаб поднимается как `node server/index.js` из клона `/tmp/watchtower-hub`,
порт 8787.)

## 4. Задачи P1 (после P0)

1. Курсор, бэкфилл и `finalized lag`: экспорт исторических событий и продолжение с курсора,
   идемпотентность по `cluster+slot+signature+instructionIndex+innerIndex`.
2. Экономика: sources/sinks, mint/burn, treasury, velocity, sink/source ratio — с формулой,
   периодом агрегации и часовым поясом в `GET /watchtower/economy`.
3. Игроки: DAU/WAU/MAU, retention D1/D3/D7/D14/D30, воронка `ad_click → wallet → mint → first_harvest`,
   связка `solana_wallet ↔ external_id` (Late ID Binding, GameSight).
4. Матрица `data_quality` по каждому домену (players/economy/security): `complete|partial|unavailable`
   и обоснование, что именно не собирается и какие события нужны.
5. Секреты: `gitleaks` прогон, `.env` не в индексе, `config.example.env` — только имена ENV.

## 5. Задачи P2

- Честные статусы v3-компонентов, реально не внедрённых (Xandeum, PST, Core Attributes, Arcium,
  RitArena, relayzero, StealthSDK, Access Protocol, idosgames): в отчётах должно быть
  `unavailable`/`planned`, а не «внедрено».
- Proposal-flow для опасных действий: RBAC, 2FA, второе подтверждение, multisig, timelock,
  audit log, rollback — как контракт, а не как текст.
- Session keys: scope deny `withdraw_treasury`, лимит 0.01 SOL, expiry 60 мин — с тестом на запрет.

## 6. Жёсткие правила

См. `00_HUB_CONTRACT.md` §5. Кратко: main не трогать, force-push запрещён, секреты не коммитить,
mainnet-операций нет, signer'ов в exporter нет, авто-блокировок и авто-наград нет,
выдуманные метрики запрещены.

Ветка: `arena/<короткий-id>-ares1-watchtower-hub`, коммиты по одной задаче, в конце — PR
в `Leo88q/ares1` с отчётом в описании.

## 7. Definition of Done

```text
[ ] Аудит ARES-1 прогнан заново, reports/ares1-audit.{json,md} содержат фактические findings
[ ] watchtower/integration-manifest.json заполнен; lastVerifiedAt — реальная проверка
[ ] WATCHTOWER_INTEGRATION.md перегенерирован (npm run os:handoff), data_quality честный
[ ] Все /watchtower/* endpoints отвечают, health содержит writes:false
[ ] POST /api/ingest/solana принимает события ares1, повтор даёт duplicate:true
[ ] Хаб видит игру: /api/ingestion/adapters и /api/games/ares1/ingestion
[ ] watchtower/tests/* зелёные; вывод команд в отчёте
[ ] PR открыт, main не изменён, секретов в диффе нет
```

## 8. Формат ответа

Разделы A–F из `00_HUB_CONTRACT.md` §7. В разделе B — фактические выводы команд
(`npm test`, `curl`, повторная отправка события). В разделе C — все блокеры с формулировкой
вида: «команда X → ошибка Y → следствие Z»; не сглаживать.

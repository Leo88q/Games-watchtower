# 00_HUB_CONTRACT — Гид-хаб Watchtower: единый контракт подключения игры

Этот файл — общий блок для всех промптов `prompts/arena/PROMPT_ARENA_*.md`.
Он описывает, что такое гид-хаб, как игра к нему подключается, что запрещено и как
доказать приёмку. Каждый игровой промпт либо требует прочитать этот файл из хаба,
либо вставляет его ключевые правила инлайном.

## 0. Термины

| Термин | Значение |
|---|---|
| **Хаб (гид-хаб)** | Центральный репозиторий экосистемы `Leo88q/Games-watchtower` — Watchtower OS v3: гид-документы (промпты, архитектура, контракты) + read-model + API. |
| **Игра (tenant)** | Один из репозиториев: `ares1`, `aof`, `neon-relay`, `guttercaps`, `talkchart-traffic-generator` (`game_id=trafficgen`). |
| **Exporter** | Read-only HTTP-сервис внутри репозитория игры, отдающий нормализованные данные по контракту `/watchtower/*`. |
| **Envelope** | Единый формат события, который хаб принимает через `POST /api/ingest/solana` или `POST /api/ingest/trafficgen`. |
| **data_quality** | Честный статус данных: `complete` \| `partial` \| `unavailable`. Никогда не выдумывается. |
| **Врата (gate)** | Проверка, без которой работа не считается сданной (тест, curl, отчёт, отсутствие секретов). |

## 1. Хаб: что читать перед работой

Обязательный минимум для любой игры:

```text
MASTER_WATCHTOWER_INTEGRATION_PROMPT.md   — мастер-контракт интеграции
docs/GAME_REPO_DELIVERABLES.md            — какие файлы/endpoints обязана иметь игра
docs/GAME_ADAPTERS.md                     — контракт адаптеров (program id, events, writes:false)
docs/os/v3/STUDIO_OS_V3.md                — архитектура стека v3 (33 компонента, 20 шагов)
docs/os/v3/CONTROL_PANELS_V3.md           — 19 панелей управления: что умеет SDK и что внедряем
docs/os/v3/HANDOFF_PER_GAME_V3.md         — что отдавать в работу каждой игре
studio.config.json                        — машиночитаемый стек v3.0.0 (33 компонента, duplicates)
.env.example                              — только имена ENV, без значений
prompts/arena/README_ARENA.md             — этот набор промптов и порядок работы
```

Команды получения хаба (в окружении Arena с подключённым GitHub):

```bash
git clone --depth 1 https://github.com/Leo88q/Games-watchtower.git /tmp/watchtower-hub
# или без клона, точечно:
gh api repos/Leo88q/Games-watchtower/contents/docs/GAME_REPO_DELIVERABLES.md --jq .content | base64 -d
```

Правило: **хаб читается, но не модифицируется** из репозитория игры. Изменения хаба
делаются отдельной задачей в самом хабе (см. `PROMPT_ARENA_WATCHTOWER_HUB.md`).

## 2. Что хаб умеет сейчас (фактическое состояние, проверено по коду)

- `server/index.js` — read-only HTTP API, порт `API_PORT` (по умолчанию `8787`), **>120 путей `/api/*`**.
- `/api/health` возвращает `{ ok: true, writes: false, provider }` — врата безопасности.
- `/api/read-model` — агрегат: `overview, adjacent, investor, funnel, crossGame, campaigns, traffic, investorTrend, ingestion, controls`.
- `/api/os/config`, `/api/os/health` — стек v3.0.0, 33 компонента.
- `/api/ingestion/adapters`, `/api/games/:gameId/ingestion`, `/api/ingestion/status` — готовность адаптеров игр.
- `POST /api/ingest/solana` — приём Solana-событий (идемпотентность по `cluster+signature`).
- `POST /api/ingest/trafficgen` — приём off-chain событий трафика.
- `/api/funnels`, `/api/players/cross-game`, `/api/campaigns/*`, `/api/investors/*`, `/api/alerts`, `/api/ai/report`, `/api/control/*`, `/api/audit`, `/metrics`.
- Провайдер по умолчанию — `WATCHTOWER_PROVIDER=mock`; боевые provider'ы подключаются ENV-переменными.
- Program ID игр в хабе задаются ENV и **пустые** до подтверждения деплоя:
  `ARES1_PROGRAM_ID`, `AOF_CORE_PROGRAM_ID`, `NEONRELAY_REWARDS_PROGRAM_ID`, `GUTTERCAPS_CORE_PROGRAM_ID`.

Локальный запуск хаба для проверки приёмки:

```bash
cd /tmp/watchtower-hub && npm install
npm run dev:api                      # node server/index.js, порт 8787
curl -s localhost:8787/api/health    # writes должен быть false
curl -s localhost:8787/api/ingestion/adapters
WATCHTOWER_API_URL=http://127.0.0.1:8787 npm run test:smoke
```

## 3. Envelope: формат события от игры к хабу

### 3.1 Solana/игровые события — `POST /api/ingest/solana`

```json
{
  "cluster": "devnet",
  "slot": 1,
  "signature": "<tx signature, уникален>",
  "programId": "<program id или ENV-alias>",
  "eventType": "PlayerJoined",
  "commitment": "finalized",
  "payload": { "gameId": "ares1", "playerKey": "<псевдонимный id>" }
}
```

Требования:

- `commitment` = `finalized` для бизнес-фактов; `processed/confirmed` — только как telemetry;
- детерминированный первичный ключ события: `cluster + slot + signature + instructionIndex + innerIndex`;
- повторная отправка того же события обязана вернуть `duplicate: true` и не создавать новую запись;
- полностью запрещены приватные данные: seed-фразы, приватные ключи, полные кошельки без хеширования (соль — `WATCHTOWER_PLAYER_HASH_SALT`).

### 3.2 Off-chain/трафик — `POST /api/ingest/trafficgen`

```json
{
  "eventId": "ev-1",
  "chain": "offchain",
  "source": "trafficgen",
  "app": "trafficgen",
  "eventType": "PageView",
  "timestamp": "2026-09-23T00:00:00.000Z",
  "campaignId": "...", "sourceId": "...", "sourceType": "bot",
  "pageId": "terminal", "sessionId": "...", "seq": 1,
  "payload": { "path": "/index.html" },
  "parserVersion": "trafficgen-v1",
  "dataQuality": "complete"
}
```

Обязательна дедупликация по `eventId`, сохранение `campaignId`/`sessionId` в верхнем уровне
нормализованного события и признак `decoder.knownEvent`.

## 4. Обязательные endpoints exporter-а (read-only)

```text
GET /watchtower/health
GET /watchtower/readyz
GET /watchtower/config
GET /watchtower/events
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

Правила exporter-а:

1. Только чтение. Ни одного маршрута, меняющего состояние, и ни одного signer'а в процессе.
2. `GET /watchtower/health` содержит `writes: false` и `dataQuality`.
3. Каждая метрика помечена `complete | partial | unavailable`; отсутствующие данные возвращаются как `unavailable`, а не как `0`.
4. `GET /watchtower/config` возвращает паспорт игры в JSON (`game_id, network, stage, program_ids, parser_version, data_quality, last_verified_at`).
5. Курсор/бэкфилл: экспорт умеет отдать исторические события и продолжить с курсора, с идемпотентностью.
6. Латентность финализации (`finalized lag`) и commit-level отдаются явно.
7. Никаких admin-токенов, payer keypair, upgrade authority, treasury/reward signer'ов в сервисе или в репозитории.

## 5. Жёсткие запреты (нарушение = провал задачи)

- Пуш в `main` / force-push в любую ветку.
- Коммит секретов, `.env`, keypair-файлов, RPC-ключей; значения только через `.env.example` (имена без значений).
- Любые `mainnet` операции: деплой, минт, выплаты. Только `devnet` и только по явному подтверждению оператора.
- Автоматические блокировки игроков, авто-выдача наград, авто-рассылки (только proposal-flow: RBAC + 2FA + второе подтверждение + audit log + rollback).
- Выдуманные метрики, «нарисованные» графики, заглушки, поданые как production-данные.
- Приватные ключи хабa, доступа к treasury, upgrade authority — в хабе и в играх они не передаются никогда.

## 6. Врата приёмки (одинаковые для всех игр)

```text
[ ] Экспортер поднимается локально и отдаёт все /watchtower/* endpoints (read-only)
[ ] Есть integration-manifest.json с game_id, network, program_ids, parser_version, data_quality, writes:false
[ ] Есть config.example.env только с именами переменных
[ ] События игры успешно принимаются хабом: POST /api/ingest/solana → accepted:true, повтор → duplicate:true
[ ] Хаб видит игру: GET /api/ingestion/adapters и GET /api/games/<gameId>/ingestion
[ ] Аудит безопасности прогнан заново; findings либо исправлены, либо явно приняты с обоснованием
[ ] Все тесты игры зелёные (команды указаны в промпте игры)
[ ] data_quality и last_verified_at отражают фактическую проверку, а не намерение
[ ] Отчёт по форме из раздела 7
[ ] Ветка Arena + PR в репозиторий игры, main не тронут
```

## 7. Формат отчёта после работы (обязательный)

```text
A. Факты        — что сделано, с путями к файлам и выводом команд
B. Проверки     — команды и их фактический вывод (не пересказ)
C. Не сделано   — что осталось, почему, какой блокер
D. Метрики/качество данных — какие значения data_quality выставлены и на каком основании
E. Риски        — severity critical/high/medium/low + рекомендация
F. Вопросы оператору — только те, на которые нельзя ответить по репозиторию
```

Запрещено писать «всё готово» без вывода команд. Если проверка не выполнялась — так и писать.

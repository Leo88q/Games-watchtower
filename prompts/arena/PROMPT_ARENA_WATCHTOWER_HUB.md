# PROMPT_ARENA_WATCHTOWER_HUB — сделать хаб источником правды по экосистеме

Вставь текст ниже целиком первым сообщением в сессию Arena Agent Mode,
открытую на репозитории `Leo88q/Games-watchtower`, с подключённым GitHub.
Этот промпт — «нулевой»: его надо выполнить до (или параллельно) подключением игр.

---

## Роль

Ты — инженер хаба **Games Watchtower** (Watchtower OS v3). Работай внутри
`Leo88q/Games-watchtower`. Твоя задача — сделать так, чтобы хаб **сам не врал** и корректно
принимал все пять tenant'ов: `ares1`, `aof`, `neonrelay`, `guttercaps`, `trafficgen`.

Контекст: игры уже подключены частично (adapters, read-model, экспортеры), но в самом хабе
есть три критических расхождения, которые делают приёмку невозможной:

1. `reports/ares1-audit.json` и `reports/neon-relay-audit.json` содержат `files_scanned: 0`,
   `findings: []` — аудит **не выполнялся**, при этом `reports/DETAILED_6_GAMES.md` и
   `FINAL_OS3_REPORT.md` заявляют 43 (12 critical) и 24 (6 critical) finding соответственно.
2. Суммарное заявление «282 findings / 108 critical» не воспроизводится из файлов отчётов
   (по файлам: guttercaps 188 / aof 17 / trafficgen 10 / ares1 0 / neon-relay 0).
3. `src/data/registry.js` расходится с паспортами игр: `guttercaps` в хабе `alpha`, в
   репозитории игры `beta`; `aof` в хабе `dataQuality: unavailable`, в паспорте игры `partial`;
   во всех четырёх записях `source: 'mock'`.

Плюс: репозиторий игры `ares1` уже содержит полноценный экспортер и OS v3
(`watchtower/src/*`, `watchtower/src/os/*`), `aof` — свой стек v3, `neon-relay` — backend-адаптер,
`guttercaps` — `scripts/watchtower_v3_{server,registry}.py`, `trafficgen` — Python-экспортер.
Хаб должен уметь это принимать, а не показывать мок.

## 1. Что читать в первую очередь

```text
prompts/arena/00_HUB_CONTRACT.md        — контракт подключения и приёмки
docs/GAME_REPO_DELIVERABLES.md          — что обязан отдать каждый игровой репозиторий
docs/GAME_ADAPTERS.md                   — контракт адаптеров
docs/os/v3/STUDIO_OS_V3.md              — архитектура v3 (33 компонента)
docs/os/v3/HANDOFF_PER_GAME_V3.md       — handoff по играм
docs/FINAL_ECOSYSTEM_REPORT.md          — сводный отчёт по экосистеме (актуализировать)
reports/*.json, reports/DETAILED_6_GAMES.md
server/ingestion/game-adapters.js, server/index.js, scripts/smoke-test.mjs
.env.example, studio.config.json, src/data/registry.js
```

## 2. P0 — целостность отчётов

1. Перегенерируй аудиты по всем пяти репозиториям (Sentio CLI / SolGuard / SLAM) из хаба или
   из клонов игр: `reports/{ares1,aof,neon-relay,guttercaps,trafficgen}-audit.json` +
   одноимённые `.md`. Каждый finding: `rule_id, severity, location{path,line,column}, message, help`.
   Если `files_scanned == 0` — это ошибка конфигурации сканера, а не «нет проблем».
2. Устрани дубли отчётов: сейчас есть и `trafficgen-audit.*`, и
   `talkchart-traffic-generator-audit.*` — оставь один источник, второй удали или сделай ссылкой.
3. `reports/DETAILED_6_GAMES.md` должен **генерироваться** из JSON-файлов, а не писаться руками.
   Добавь `scripts/build-audit-summary.mjs` (или аналог) и npm-скрипт.
4. Добавь тест целостности: `scripts/check-report-integrity.mjs`, падающий, если
   (а) сумма по файлам не совпадает с summary-блоками, (б) у отчёта `files_scanned == 0`,
   (в) `DETAILED_6_GAMES.md` расходится с JSON. Подключи в `npm run test:smoke`/CI.
5. Обнови `FINAL_OS3_REPORT.md` фактическими числами (или удали заявления, которые нельзя
   воспроизвести) — хаб не имеет права публиковать метрики, которых нет в файлах.

## 3. P0 — единый источник правды по играм

1. `src/data/registry.js` (и любые копии реестра) должны строиться из паспортов игр
   (`WATCHTOWER_INTEGRATION.md` + `integration-manifest.json` каждого репозитория) либо из
   серверного реестра. Ручные значения `stage`, `dataQuality`, `source: 'mock'` — удалить
   или помечать как `mock` только там, где данных действительно нет.
2. Обязательные поля записи: `gameId, name, network, stage, dataQuality, lastVerifiedAt,
   programIds, parserVersion, repo, findings{critical,high,medium,low}, source`.
3. Отдельный тест: расхождение хаба и паспорта игры (stage/data_quality/program id) — ошибка.
4. Проговорить `docs/FINAL_ECOSYSTEM_REPORT.md` как единственный сводный документ и обновлять
   его тем же генератором (см. P2).

## 4. P0 — приём данных от игр (вместо мока)

1. `server/ingestion/game-adapters.js`: пять адаптеров с реальными `programId` из ENV
   (`ARES1_PROGRAM_ID`, `AOF_CORE_PROGRAM_ID`, `NEONRELAY_REWARDS_PROGRAM_ID`,
   `GUTTERCAPS_CORE_PROGRAM_ID`) + `trafficgen` (off-chain). Пока ENV пустые — API обязан
   возвращать `configured: false` и `dataQuality: unavailable`, а не «ок».
2. Заменить/дополнить `WATCHTOWER_PROVIDER=mock` рабочим provider-путём: курсор-стор,
   reconciliation, gap backfill, `GET /api/ingestion/status` с фактическими полями
   (`finalizedLag`, `lastCursor`, `duplicates`, `gaps`).
3. Проверить на живых событиях всех пяти игры: `POST /api/ingest/solana` (4 игры) и
   `POST /api/ingest/trafficgen` — `accepted:true`, повтор → `duplicate:true`,
   `GET /api/games/<gameId>/ingestion` и `GET /api/ingestion/adapters` показывают игру.
4. Гарантия read-only: `/api/health.writes === false`, не существует маршрута, меняющего
   блокчейн-состояние; любые админ-действия — только `POST /api/control/requests`
   с `blockchainWrite: false` и последующим human-approval.

## 5. P0 — расширенная смоук-приёмка

`scripts/smoke-test.mjs` сейчас проверяет health, read-model, дедупликацию двух ingest-путей,
адаптеры, аналитику трафика и safety-контракт контролов. Расширить:

```text
[ ] цикл по 5 tenant'ам: adapter существует, configured-статус честный, /api/games/<id>/ingestion отвечает
[ ] POST события с gameId каждого tenant'а → accepted, повтор → duplicate
[ ] /api/read-model содержит все ключи и не содержит NaN/null вместо данных там, где заявлен complete
[ ] инвентаризация маршрутов: собрать список /api/* из server/index.js и проверить, что каждый
    отдаёт JSON и ни один не пишет состояние (тест на роут-инвентарь)
[ ] /api/os/config: version 3.0.0, componentsTotal 33, duplicates 3
[ ] /metrics в формате Prometheus
```

Приёмка PR — только с фактическим выводом `npm run test:smoke` и `npm run build`.

## 6. P1

1. `GET /api/ecosystem/status` — агрегат: по каждому tenant'у `stage, dataQuality,
   lastVerifiedAt, findings{critical,high}, connected: true|false, exporterUrlConfigured`,
   плюс общий `writes: false`. UI-панель «Экосистема» на дашборде.
2. Инвесторские снимки (`/api/investors/*`) и adjacent-аналитика должны явно помечать,
   какие tenant'ы не подключены (иначе инвесторский отчёт врёт).
3. Кампании/cross-game (`/api/campaigns/*`, `/api/players/cross-game`): сохранить гейты
   consent/opt-out, fraud exclusion, frequency cap, budget, operator approval, attribution, rollback.
4. Программы из `server/contracts/*` — прогнать аудит и зафиксировать findings
   (сейчас в хабе нет отчёта по собственным контрактам).
5. Секреты: gitleaks в CI, `.env` не в индексе, в `docs` — только имена переменных.

## 7. P2

- Генератор `docs/FINAL_ECOSYSTEM_REPORT.md` из JSON-отчётов + паспортов игр (единый свод).
- Экспорт метрик качества данных в Prometheus (`watchtower_data_quality{game="…"}`).
- Telegram-уведомления: правила, пороги, quiet hours, подтверждение опасных действий только в web с 2FA.

## 8. Жёсткие правила

`prompts/arena/00_HUB_CONTRACT.md` §5. Кратко: main не трогать, force-push запрещён,
секретов в репозитории нет, блокчейн-write из хаба невозможен ни при каких условиях,
mock не выдаётся за production, метрики без источника не публикуются.

Ветка: `arena/<короткий-id>-hub-integrity`; PR в `Leo88q/Games-watchtower`.

## 9. Definition of Done

```text
[ ] Все 5 audit JSON заполнены реальным сканом (files_scanned > 0), summary сходится
[ ] scripts/check-report-integrity.mjs существует и падает на рассогласовании
[ ] registry строится из паспортов игр; тест на расхождение есть
[ ] /api/ingestion/adapters честно показывает configured/dataQuality по 5 tenant'ам
[ ] smoke покрывает 5 tenant'ов + роут-инвентарь; вывод приложен
[ ] /api/ecosystem/status отвечает и отражает фактические данные
[ ] docs/FINAL_ECOSYSTEM_REPORT.md актуален и совпадает с JSON-отчётами
[ ] npm run build и npm run test:smoke зелёные; PR открыт, main не изменён
```

## 10. Формат ответа

Разделы A–F из `00_HUB_CONTRACT.md` §7. В разделе C обязательно перечислить, какие
заявления старых отчётов оказались невоспроизводимыми и что с ними сделано.

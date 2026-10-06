# Промт для игровых команд: пакет фактов для подключения к Watchtower

> **Как использовать:** отправлять этот промт отдельно каждой игровой команде/агенту, открывшему репозиторий игры. Перед отправкой заполнить только три поля в начале блока. Это запрос на проверяемый handoff, а не поручение переписать игру или развернуть новый сервис.

## Заполнить перед отправкой

```text
Игра: <название>
Репозиторий: <URL или локальный путь>
Предполагаемый gameId: <значение из таблицы ниже>
```

| Игра | Текущий канонический `gameId` в Watchtower | ENV программы в хабе |
|---|---|---|
| ARES-1 | `ares1` | `ARES1_PROGRAM_ID` |
| NeuroForge | `aof` | `AOF_CORE_PROGRAM_ID` |
| Neon Relay | `neonrelay` | `NEONRELAY_REWARDS_PROGRAM_ID` |
| GUTTERCAPS | `guttercaps` | `GUTTERCAPS_CORE_PROGRAM_ID` |

Для NeuroForge текущий адаптер хаба использует ID `aof`. Если в репозитории игры или у владельца продукта зафиксировано другое имя/ID, **не переименовывай и не подменяй его сам**: опиши расхождение и дождись согласования. `trafficgen` — отдельный tenant TalkChart, не одна из четырёх игр.

---

# ТЕКСТ ДЛЯ ИГРОВОЙ КОМАНДЫ — СКОПИРОВАТЬ ЦЕЛИКОМ

## Роль и цель

Ты — ответственный инженер <ИГРА> за передачу проверяемых данных в Games Watchtower. Работаешь в репозитории <РЕПОЗИТОРИЙ>. Подготовь фактический пакет handoff, чтобы команда Watchtower могла подключить **только чтение** игровых событий и агрегатов.

Сначала изучи текущий код, IDL/схемы, тесты и доступные dev/test окружения. Источник истины — работающий код и проверяемые данные, а не старые планы, маркетинговые материалы или список событий в другом документе.

**На этом этапе не нужно** переписывать игру, изобретать события, менять production-протокол, выпускать программу, отправлять mainnet-транзакции или строить весь Watchtower exporter. Если факта нет или проверить его нельзя — укажи `unavailable` и точную причину. Если он только в roadmap — укажи `planned`, не называй его реализованным.

## Важные факты о текущем хабе — не предполагай больше, чем здесь написано

Проверь актуальный код хаба, если он доступен. На момент подготовки этого запроса:

- `server/ingestion/game-adapters.js` задаёт канонические ID, ожидаемые имена событий и ENV программы. Это **реестр/allowlist**, а не доказательство работающего индексатора, декодера IDL или поступления production-событий. `decodeGameEvent()` сейчас в основном проверяет, есть ли имя события в списке.
- Игровые события принимаются хабом через `POST /api/ingest/solana`. Код нормализатора также умеет принять off-chain envelope с `chain: "offchain"` по этому маршруту. `POST /api/ingest/trafficgen` — отдельный маршрут TalkChart; не направляй туда обычную телеметрию игры.
- Для on-chain события ключ дедупликации строится из `cluster + slot + signature + instructionIndex + innerIndex`. Для бизнес-фактов предпочтительна фактическая финализация `finalized`; `processed`/`confirmed` нельзя выдавать за финализированные факты.
- **Известная особенность off-chain дедупликации:** текущий `offchainIdentity()` строит identity из provider и `campaignId/pageId/sessionId/seq`; одного `eventId` недостаточно. Не создавай фиктивные campaign/page IDs в обход этой особенности. Передай реальные правила `eventId`, `sessionId`, последовательности и replay; интегратор согласует/исправит контракт в хабе.
- Текущий inbox хаба — ограниченное оперативное хранилище в памяти (по умолчанию максимум 250 000 событий), не долговременный архив. Источник истины и возможность replay/backfill должны оставаться на стороне игры или её индексатора.
- Для location-срезов хаб читает явные `regionId`/`locationId` в корне события или `payload.regionId`, `payload.locationId`, `payload.region`, `payload.location`. Сам он географию игрока не угадывает.
- В текущей воронке распознаются `PlayerJoined`/`WalletConnected`/`SessionStarted`, игровые первые действия (`MatchStarted`, `RaceStarted`, `PlotCreated`, `PotatoPlanted`, `PackOpened`), `RetentionDay1`, `RetentionDay7`, покупки (`PurchaseCompleted`, `PackPurchased`, `PaymentSettled`) и `CrossGameEntry`. Наличие имени в этой логике не доказывает, что игра реально его эмитит. Не создавай искусственные retention/purchase события ради зелёного отчёта.
- Cross-game переносы проецируются только из реальных `BridgeIn`, `BridgeOut`, `CrossGameLinked`, `CrossGameAssetGranted` с различимыми source/target game и asset. Если такой механики в игре нет — так и напиши; мост и переносы не требуются для базового подключения.
- `POST /api/games/progress` — отдельный протокол Operator Game для фактических `wallet`, `hours`, `rank`, `updatedAt`. Это **не** общий ingest телеметрии; см. optional-раздел ниже.
- В production ingest защищён Bearer-токеном или HMAC. Оператор Watchtower выдаёт реквизиты по согласованному защищённому каналу. В этот handoff, репозиторий, тикет и чат значения секретов не включать.

Не считай broad roadmap-списки exporter endpoints, ML/security метрик, финансовых прогнозов, cross-game PDA или интеграций будущих SDK уже работающими функциями хаба. Для этого handoff не реализуй `GET /watchtower/*`, если такой exporter уже не существует и интегратор отдельно его не запросил.

## Обязательные результаты

Если соответствующие файлы уже существуют, дополни их, не создавай вторую конкурирующую версию. Подготовь:

1. `WATCHTOWER_HANDOFF.md` — человекочитаемый отчёт по разделам ниже.
2. `watchtower/integration-manifest.json` — паспорт игры и доказательства текущего deployment/runtime статуса. Если каталог `watchtower/` не принят в этом репозитории, используй существующий принятый путь и укажи его в отчёте.
3. `watchtower/events/event-catalog.json` — реестр **реально существующих** событий и их маппинг в Watchtower. Не добавляй event type без реального эмиттера.
4. `watchtower/events/fixtures/` — отдельные fixtures для подтверждённых событий. Синтетические примеры должны находиться в `synthetic/` и быть явно подписаны `synthetic`; реальные данные игроков не включать.
5. Результаты проверок и список блокеров в итоговом ответе. Если файлы создать нельзя, верни те же сведения структурированным текстом.

Предпочтительно оставить только документацию/fixtures и минимальные безопасные изменения. Не добавляй новую production-зависимость или endpoint без необходимости и согласования.

## 1. Паспорт игры и deployment — факты, не предположения

Для каждого реально используемого окружения отдельно укажи:

- точное название игры и канонический `gameId` (из таблицы выше); git remote и commit SHA, который проверялся;
- стадию продукта и статус каждой среды: local/devnet/testnet/mainnet-beta; какие среды реально запущены и где доступны данные;
- все program IDs, их роль (core/rewards/market/etc.), cluster и способ проверки. Для каждой программы укажи: IDL/схему, версию или hash, Anchor/toolchain version (если применимо), путь к исходному коду, deployment transaction/slot или проверяемый RPC/explorer evidence;
- mint/resource/treasury/vault/PDA addresses **только если они действительно существуют и нужны для интерпретации событий**; подпиши тип и источник каждого адреса. Не вставляй placeholder-адреса как будто они задеплоены;
- timestamp последней реальной проверки и команду/ссылку, которой она выполнена. Если сети/RPC нет, укажи `code_only` или `unavailable`, дату не выдумывай;
- что запускает event producer/indexer/parser, где он читает данные и может ли работать без signer/admin/write-доступа.

Публичный Program ID сам по себе — не доказательство правильной сети или актуального deployment. Не передавай upgrade authority, приватные ключи или signer credentials; для хаба достаточно факта, что они остаются только у владельца игры и не нужны read-only контуру.

## 2. Реальный словарь событий и mapping

Для каждой записи в `event-catalog.json` укажи:

```text
sourceEventName        точное имя из IDL/log/server event
watchtowerEventType    имя, которое предлагаешь передавать хабу (или null, если mapping не согласован)
sourceKind             onchain | offchain | both
emitter                путь:строка/функция либо реальный сервис/модуль
meaning                что именно произошло и в какой момент; success vs attempt
payloadFields          имя, тип, nullable, единица измерения, чувствительность
playerIdentity         какое поле связывает событие с игроком и покрытие, если известно
sessionId              откуда берётся, что означает, срок жизни
asset/amount           актив, поле суммы, raw units/decimals, что включено/исключено
location               реальные region/location IDs или not_applicable
finality/time           commitment и источник timestamp/blockTime
idempotency             on-chain coordinates или off-chain event ID/sequence/cursor
verificationStatus     verified_runtime | code_only | planned | unavailable | not_applicable
coverage/limitations   как доказана полнота, известные пропуски/дубликаты/задержки
proof                   путь к тесту/fixture/команде/публичному evidence
```

Перечисленные ниже имена — только текущий список ожиданий адаптера хаба. Сверь каждое с реальным эмиттером, IDL, тестом и доступным deployment. Для неподтверждённого события поставь `unavailable` с причиной — не добавляй событие в игру ради соответствия списку.

| Игра | Имена событий в текущем адаптере хаба |
|---|---|
| `ares1` | `PlayerJoined`, `PotatoPlanted`, `PotatoHarvested`, `RewardGranted`, `TokenMinted`, `TokenBurned`, `TreasuryChanged` |
| `aof` (NeuroForge в текущем коде хаба) | `PlayerJoined`, `PlotCreated`, `CropHarvested`, `CraftCompleted`, `RewardGranted`, `TokenMinted`, `TokenBurned` |
| `neonrelay` | `PlayerJoined`, `RaceStarted`, `RaceFinished`, `RewardGranted`, `TokenMinted`, `TokenBurned`, `MatchSettled` |
| `guttercaps` | `PlayerJoined`, `PackOpened`, `AssetMinted`, `AssetTransferred`, `WagerCreated`, `WagerSettled`, `RewardGranted`, `TokenBurned` |

Также проверь общие события, если игра реально их эмитит: `WalletConnected`, `SessionStarted`, `SessionEnded`, `PurchaseCompleted`, `PackPurchased`, `PaymentSettled`, `RetentionDay1`, `RetentionDay7`, `CrossGameEntry`. Для первых действий можно предложить фактический тип игры из кода. Укажи точную семантику и не считай завершённую покупку по одному лишь клику/открытию экрана.

В event map сохраняй исходное имя и отдельно предлагай нормализованное. Не переименовывай on-chain события в программе без отдельного согласования. Неизвестные и неподдержанные типы помечай как `raw/unmapped`, а не приписывай им бизнес-смысл.

## 3. Источник, доставка, backfill и качество потока

Опиши, какой путь реально возможен для событий:

- on-chain: RPC/indexer/provider, версия парсера, извлечение Anchor logs/IDL или инструкций, правила inner instructions, порядок и финализация;
- off-chain: серверный event emitter/API/log store, схема и версия, auth-модель (только название механизма; без credential values);
- кто будет отправителем и откуда запускается доставка: push, существующий pull/exporter или пока ручной тест;
- формат курсора, сортировка, page size, `nextCursor`, возможность повторного replay с прошлого курсора и длительность доступной истории;
- как обнаруживаются и исправляются data gaps, rate limits/RPC errors, reorg/failed transaction, parser upgrade и повторные события;
- измеренная задержка между событием игры и доступностью у источника, отдельно от обещанного SLA;
- какой период истории реально можно backfill и чем подтверждена полнота.

Для on-chain envelope подготовь fixture с полями `gameId`, `cluster`, `slot`, `signature`, `programId`, `instructionIndex`, `innerIndex`, `commitment`, `blockTime`, `eventType`, `payload` и parser/source version — заполни только фактические поля. Детерминированная идентичность строится по chain coordinates; повтор тех же coordinates не должен превратиться в другое событие.

Для off-chain envelope приложи `eventId`, UTC `timestamp`, `gameId`, `eventType`, producer/source, `sessionId`/`seq`/cursor, если они существуют, и payload. Зафиксируй текущую особенность хаба из раздела выше: передай **реальные** семантики event ID, session и sequence; не заявляй, что повтор защищён, пока поведение не проверено контрактным тестом.

Покажи отдельно:

- тестовые/синтетические события;
- события, действительно считанные из dev/test deployment;
- production-статус, если он проверен без раскрытия данных игроков.

Не называй «нет событий за тестовое окно» доказанным нулём активности, если источник/временной интервал/полнота чтения не подтверждены.

## 4. Игроки, сессии, воронки и приватность

Укажи, какие поля уже доступны в событии для игрока, сессии и первого входа. Для текущих проекций наиболее совместимое поле — примитив `payload.playerKey`; другие встречающиеся варианты (`playerId`, `wallet`, `walletHash`, `owner`) перечисли с их фактической семантикой и покрытием. Не присылай реальные значения идентификаторов.

Для каждого идентификатора ответь:

- стабилен ли он между сессиями и между играми;
- является ли он случайным псевдонимом, внутренним account ID или публичным on-chain wallet;
- есть ли consent/opt-out и правила retention/deletion;
- можно ли его связать между играми законным и технически согласованным способом.

**Не выбирай сам cross-game identity и не присылай необратимый хеш с неизвестной солью.** Наружу API хаба возвращает идентификаторы в псевдонимизированном виде, но входное событие сначала поступает в ingest/inbox. Поэтому передавать raw wallet или другой стабильный ID в production можно только после явного согласования поля, privacy-основания и срока хранения с владельцем интеграции.

Если игра считает retention, активного игрока или сессии — приведи формулу, часовой пояс, окно, источник и код расчёта. Если нет — укажи, какие raw session/entry events доступны, чтобы хаб мог спроектировать расчёт. Не создавай `RetentionDay1/7` искусственно. Не присылай имена, email, телефон, логины, auth tokens, IP, device fingerprint, содержимое чата, cookies или платёжные данные.

## 5. Экономика и активы — только фактические поля

Для каждого фактического economy event опиши направление потока (source/reward/sink/mint/burn/trade/fee/deposit/withdrawal/treasury), игровую семантику, asset/mint и доказательство. Если поле суммы есть, укажи:

- точное исходное имя поля и точность;
- raw integer units и decimals актива; является ли значение gross/net, до/после комиссии, попыткой/финальным settlement;
- максимальный диапазон и возможны ли значения выше `Number.MAX_SAFE_INTEGER`;
- адрес mint/asset и источник подтверждения; fiat value/price только если источник цены реально существует.

Текущая валидация хаба принимает для ряда полей неотрицательные safe integers, а economy parser извлекает `amount/value/qty/quantity/reward/burned`; он пока не является универсальным конвертером token decimals и USD. Поэтому не округляй сырые on-chain значения во float и не выдавай raw units за USD/токены. Если диапазон может превышать safe integer, приложи исходное целое как строку в документированном поле/fixture и отметь, что перед расчётом требуется изменение парсера хаба.

Укажи supply cap/circulating supply, treasury balance, revenue/costs и период только если они существуют в проверяемом источнике; приложи источник и дату среза. Roadmap или оценка не являются измеренными экономическими фактами. Если данных нет — `unavailable`, не ноль.

## 6. Location и cross-game — условные разделы

**Location:** если игра действительно имеет игровую карту/регионы, приложи список стабильных machine IDs, их иерархию и mapping из состояния игры в tag `regionId`/`locationId`. Покажи, к каким событиям тег применяется и coverage. Не выводи регион из IP, языка или внешней геолокации. Если локаций нет — `not_applicable`.

**Cross-game items:** только если в реальности есть перенос/линковка между играми, укажи подтверждённый event flow, `sourceGame`, `targetGame`, `assetId`/mint/itemType, связь игрока и идентификатор операции. Если transfer feature/program не запущен — `unavailable`/`not_applicable`; не создавай примеры переходов и не внедряй asset bridge ради отчёта.

## 7. Отдельно: Operator Game progress (не обязателен для telemetry)

Укажи `supported | unavailable` для каждого поля, если игра **уже** хранит достоверные `hours`, `rank`, `updatedAt` игрока. Для `rank` дай определение/диапазон, для `hours` — метод измерения (foreground/background, AFK, reconnect) и источник. Укажи, можете ли вы безопасно делать push или read-only pull и как часто обновляется запись.

Хаб отдельно принимает `POST /api/games/progress` с отчётами `wallet/hours/rank/updatedAt`, проверяемыми HMAC; pull API задаётся отдельно для каждой игры. Это опциональная интеграция, не подмена event telemetry. Секретное значение вам не нужно присылать: укажите только необходимые **имена** ENV и готовность передать секрет через согласованный vault/secret manager. Если часы/ранг в игре не измеряются — так и скажи, не симулируй прогресс.

## 8. Безопасность, тесты и доказательства

Не раскрывай и не коммить:

- приватные/seed-фразы, signer/admin/treasury/reward keys;
- `WATCHTOWER_INGEST_TOKEN`, HMAC secrets/подписи, bearer tokens, RPC/API keys, cookies, auth headers;
- реальные строки игроков, wallet lists или production payloads с идентифицирующими аккаунтами.

В handoff можно указывать только имена требуемых ENV, например `WATCHTOWER_INGEST_TOKEN` **или** `WATCHTOWER_INGEST_HMAC_SECRET`, название RPC провайдера и место безопасной выдачи секрета. Не вставляй даже «временное» значение токена в fixture или команду.

Для каждого важного утверждения приложи проверяемое доказательство: `path:line`, тест/IDL, commit SHA, read-only RPC/explorer факт или безопасный runtime response. В конце укажи реально существующие команды из `package.json`/README/CI и их фактический exit code. Не запускай команды, которые совершают deployment, mint, transfer или иные writes. Если runtime/RPC проверки нет — напиши команду, которую не удалось выполнить, и точную причину.

Не прикладывай транзакции mainnet с реальными игроками в качестве fixture. Предпочитай devnet/testnet и синтетические player/session IDs. Любой fixture пометь `synthetic` или `redacted`; никогда не выдавай синтетический пример за событие, взятое из production.

## 9. Обязательная структура handoff-отчёта

Создай `WATCHTOWER_HANDOFF.md` со следующими разделами:

### A. Краткий статус
`gameId`, проверенный commit SHA, окружения, общий статус и 3 главных блокера.

### B. Паспорт и deployments
Таблица program IDs/IDL/mints/treasury, network, verificationStatus, proof, дата проверки. Все неизвестные — `unavailable`.

### C. Источники событий
On-chain/off-chain sources, emitter/parser paths, версия, push/pull, retention источника и read-only ограничения.

### D. Event map
Таблица реальных event types → Watchtower mapping, семантика, payload fields/units, identity/session/location coverage, статус и доказательства.

### E. Replay, gaps и качество
Idempotency inputs, cursor/backfill, finalized lag, gap/reorg/error behavior и доступная глубина истории. Отдельно укажи, что не проверено.

### F. Privacy, economy и optional capabilities
Player identity/consent, event amounts/assets, location, cross-game и Operator Game progress. Неприменимое отметить явно.

### G. Проверки и блокеры
Команды и exit codes; какие fixtures синтетические; что осталось; точная причина каждого блокера; какой минимальный вопрос/решение нужно от владельца Watchtower.

В `integration-manifest.json` отдельно выставь качество по доменам, где применимо: `complete | partial | unavailable`, с причиной для `partial`/`unavailable`. Статусы доказательности (`verified_runtime | code_only | planned | unavailable | not_applicable`) не смешивай с `dataQuality`. `complete` ставь только при доказанной полноте источника и replay/coverage, а не потому, что тесты прошли.

## Критерии готовности handoff

- [ ] Канонический `gameId` подтверждён; расхождения вынесены отдельно.
- [ ] Каждый заявленный Program ID привязан к сети и имеет конкретное доказательство либо честный `unavailable`.
- [ ] Event catalog опирается на реальные emitters/IDL/server code; неподдержанные события не выдуманы.
- [ ] Для каждого mapping есть fixture и тестовое/кодовое доказательство; синтетические данные помечены.
- [ ] Описаны player/session IDs, privacy-ограничения, суммы/единицы, таймстемпы и region tags, если применимо.
- [ ] Есть честный статус replay/backfill, дедупликации и качества; in-memory inbox хаба не назван архивом.
- [ ] Ни одного секрета, реальной записи игрока или неподтверждённого production-статуса в файлах/ответе.
- [ ] В конце переданы пути к файлам handoff и краткий список вопросов/блокеров.

Если для любого пункта факт отсутствует, не пытайся «закрыть» его моками: запиши `unavailable`, причину, владельца следующего шага и какое конкретное подтверждение снимет блокер.

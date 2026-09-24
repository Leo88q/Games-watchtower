# Инвентарь метрик: что снимаем с игр и что считаем

Документ отвечает на вопрос «сколько метрик мы снимаем с игр и какие». Все числа получены из кода:
`server/ingestion/game-adapters.js` (события), `server/economy/metrics.js` (каталог метрик),
`src/ios/main.js` (что показывает интерфейс). Проверяются `npm run test:docs` и `npm run test:unit`.

## 1. Сколько данных снимаем с игр

Пять тенантов, **47 типов событий** в адаптерах (**36 уникальных имён** — часть событий повторяется в разных играх),
плюс 11 типов, которые trafficgen объявил недоступными (перечислены с причиной, а не спрятаны).

| Игра | Типов | События | Как подключена |
|---|---|---|---|
| ares1 (ARES-1) | 7 | PlayerJoined, PotatoPlanted, PotatoHarvested, RewardGranted, TokenMinted, TokenBurned, TreasuryChanged | `ARES1_PROGRAM_ID` |
| aof (Age of Farming) | 7 | PlayerJoined, PlotCreated, CropHarvested, CraftCompleted, RewardGranted, TokenMinted, TokenBurned | `AOF_CORE_PROGRAM_ID` |
| neonrelay (Neon Relay) | 7 | PlayerJoined, RaceStarted, RaceFinished, RewardGranted, TokenMinted, TokenBurned, MatchSettled | `NEONRELAY_REWARDS_PROGRAM_ID` |
| guttercaps (GUTTERCAPS) | 8 | PlayerJoined, PackOpened, AssetMinted, AssetTransferred, WagerCreated, WagerSettled, RewardGranted, TokenBurned | `GUTTERCAPS_CORE_PROGRAM_ID` |
| trafficgen (TalkChart) | 18 | CampaignCreated, CampaignStarted, CampaignStopped, CampaignUpdated, SourceConnected, SourceDisconnected, SourceHealthChanged, PageAssigned, PageRemoved, SessionStarted, PageView, Click, CTAClicked, SessionEnded, DataGapDetected, DataGapHealed, RateLimited, LandingReached | off-chain, `TRAFFICGEN_API_BASE_URL` |
| trafficgen — объявлено недоступным | 11 | SessionAbandoned, NavigationCompleted, DeliveryFailed, RetryScheduled, TrafficError, ExporterHealth, BotFlagged, AnomalyDetected, AbuseBlocked, ConfigUpdated, EmergencyPause | причины в `/api/ingestion/adapters` |

Событие принимается в конверте из 25 полей: `eventId`, `identity`, `chain`, `cluster`, `slot`, `blockTime`,
`signature`, `programId`, `instructionIndex`, `innerIndex`, `eventType`, `commitment`, `success`, `payload`,
`gameId`, `source`, `app`, `campaignId`, `pageId`, `sessionId`, `sourceId`, `sourceType`, `seq`, `timestamp`,
`observedAt` (+ `parserVersion`, `dataQuality`, `warnings`). Семь идентификаторов игрока
(`playerKey`, `playerId`, `wallet`, `walletAddress`, `owner`, `deviceId`, `userId`) в хранилище попадают
только псевдонимами `anon:<12 hex>`.

## 2. Сколько метрик считаем

### 2.1 Экономика: 40 метрик, 8 семейств, 4 окна (24 ч / 7 / 30 / 90 дней)

Каталог: `/api/economy/catalog` — у каждой метрики `label`, `unit`, `formula`, `source`, `needs`, окно и статус.

| Семейство | Метрики |
|---|---|
| supply (8) | total_minted, total_burned, net_issuance, burn_ratio, inflation_daily, inflation_annualized, cap_utilization, burn_cadence_compliance |
| flows (5) | sources_total, sinks_total, sink_source_ratio, sink_diversity, consumption_share |
| velocity (4) | velocity, turnover_annualized, dormant_supply_share, holding_time_days |
| players (6) | active_wallets, sessions, new_wallets_share, paying_conversion, earn_per_hour, time_to_first_earn_hours |
| revenue (7) | arpdau, cost_of_emission_share, gross_revenue, stablecoin_share, cosmetic_share, treasury_runway_days, dividend_pool_coverage |
| fairness (3) | gini_earnings, top10_share, whale_dependency |
| risk (5) | bot_activity_share, extractive_pattern_index, liquidity_to_mcap, price_impact_1k, sybil_flagged_share |
| cross (2) | cross_game_player_share, net_bridge_flow |

Дополнительно к метрикам: индекс здоровья экономики (до 6 компонентов: сила стоков, сжигание,
распределение, игра против извлечения, запас казны, органичность) и 4 правила-вето
(Gini ≥ 0.75, боты ≥ 50 %, извлечение ≥ 0.7, стоков почти нет).

### 2.2 Покрытие каталога: почему часть метрик пустая

`/api/economy/catalog` отдаёт разбивку `coverage` — она считается по фактическому списку принимаемых событий:

| Категория | Метрик | Что нужно |
|---|---|---|
| Считаются из событий | 18 | ничего, кроме потока событий: total_minted, total_burned, net_issuance, burn_ratio, sources_total, sinks_total, sink_source_ratio, consumption_share, holding_time_days, active_wallets, sessions, earn_per_hour, time_to_first_earn_hours, gini_earnings, top10_share, whale_dependency, bot_activity_share, cross_game_player_share |
| Ждут новых событий от игр | 9 | FeeCharged (sink_diversity, paying_conversion, arpdau, gross_revenue), MarketOrderCompleted (velocity), WalletConnected (new_wallets_share), Withdrawal (extractive_pattern_index), SecurityEvent (sybil_flagged_share), BridgeIn/BridgeOut (net_bridge_flow) |
| Ждут конфигурации студии | 13 | circulating (5 метрик), maxSupply, burnCadenceDays, revenueUsd, costsUsd, stablecoinRevenueUsd, cosmeticRevenueUsd, treasuryBalance, dailyBurn, liquidityUsd |

8 метрик из этого списка (валовая выручка, дивидендный пул, доли стейблкоинов и косметики,
использование лимита выпуска, запас казны, ликвидность к капитализации, проскальзывание) считаются
целиком из финансовых фактов и показывают числа даже без потока событий — с пометкой
`quality: partial` и примечанием «из подтверждённых финансовых фактов студии».

Форма сбора этих цифр у финансовой команды (14 значений, период, источник, шаблон ответа):
`prompts/studio-os/PROMPT_STUDIO_FINANCE_CONFIG.md`. Выручка и расходы задаются за 30 дней и приводятся
к окну наблюдения; такие метрики помечены `quality: partial`.

Это и есть честный ответ на «почему во фронте мало метрик»: интерфейс показывает все 40, но
18 из них заполнятся после первого потока событий, 9 требуют новых эмиттеров в играх,
13 — данных, которые есть только у студии (supply, выручка, казна). Ни одно значение не подставляется.

### 2.3 Производные наборы (не входят в 40)

| Набор | Объём | Источник |
|---|---|---|
| Воронка игрока | 6 ступеней: Первый вход → Первое действие → Возврат на 1-й день → Возврат на 7-й день → Покупка → Вторая игра. 4 ступени ждут эмиттеров (RetentionDay1/7, Purchase*, CrossGameEntry) | `/api/funnels` |
| Трафик (trafficgen) | 21 счётчик (в т.ч. pageViews, sessions, uniquePseudoVisitors, ctaClicks, bots/real, p50/p95, dataGaps, rateLimited, duplicates, syntheticExcluded) + воронка 5 шагов + 3 разбивки (канал, источник, страница) + 2 честно недоступные метрики | `/api/analytics/traffic` |
| Кросс-игровые сегменты | игроки в 2+ играх по общему псевдониму кошелька | `/api/players/cross-game` |
| Инвесторский отчёт | 10 метрик: activePlayers, newPlayers, retentionD7, payerConversion, volume, treasury, minted, burned, criticalIncidents, dataQuality | `/api/investors/report` |
| Сигналы игры | 10 полей на игру × 5 игр: players, newPlayers, retention, minted, burned, volume, treasury, health, score, alerts | `/api/games`, `/api/games/:id/signals` |
| Смежные срезы (adjacent) | 5 разделов × 3 метрики: engagement, monetization, sustainability, reliability, risk | `/api/read-model` |
| Алерты | правила-детекторы: тишина приёма, пустое окно, концентрация заработка, доля ботов, ненастроенные адаптеры, … | `/api/alerts` |

Итого на витринах: **40 экономических метрик + 21 счётчик трафика + 6 ступеней воронки + 10 инвесторских
+ 50 игровых полей + 15 смежных + алерты**.

## 3. Что видит пользователь в интерфейсе

| Экран | Что показывает |
|---|---|
| Экономика | все 40 метрик в 8 карточках-семействах, с формулой, источником, окном, списком нужных событий и причиной отсутствия; индекс и вето |
| Аналитика | трафик (11 плиток по реальным счётчикам из 21), воронка (до 5 ступеней), кросс-игровые сегменты (до 4), **карточка покрытия метрик** (18/9/13 с перечислением, каких событий и настроек не хватает), AI-отчёт (до 5 выводов) |
| Игры | по каждой игре: искатели активности, эмиссия, сжигание, объём, казна, health, score, алерты |
| Инвестор | 10 метрик + тренд по снимкам |
| Обзор | 4 KPI: подключено игр, уровень L3+, critical в аудитах, режим провайдера |

Было иначе: до исправления аудита часть плиток заполнялась захардкоженными числами, поэтому экран выглядел
плотнее. Сейчас пустое значение показывает «—» и статус «Нет данных» — это требование честности (F-012),
а не потеря функциональности. Что действительно можно добавить — это новые события от игр
(FeeCharged, WalletConnected, Withdrawal и др.) и финансовую конфигурацию студии; после этого метрики
заполняются без изменений в коде.

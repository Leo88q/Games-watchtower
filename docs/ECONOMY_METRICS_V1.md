# Экономические метрики Watchtower (Economy Engine v1)

Движок: `server/economy/metrics.js` · API: `GET /api/economy/overview|health|catalog` ·
Интерфейс: раздел **«Экономика»** · Тесты: `npm run test:economy` (13 тестов).

**40 метрик в 8 семействах.** У каждой есть формула, источник, окно агрегации (UTC) и статус
`complete | partial | unavailable`. Если данных нет — метрика **не показывает ноль**, а возвращает
`unavailable` с причиной и списком нужных событий. Если в окне не было ни одного события, не
считается ни одна метрика.

## Почему именно эти метрики: тренды 2026

| Тренд рынка (2026) | Что это значит для метрик | Реализовано |
|---|---|---|
| Спекулятивная эра закончилась: игровые токены −95% от пиков 2022, более 300 блокчейн-игр закрылись, выжили «более скучные и устойчивые» экономики [1](https://crypt0snews.netlify.app/research/state-of-web3-gaming-2026.html) | Оценка не по объёму эмиссии, а по **лимиту supply, сжиганию по факту использования и доле потребления** | `cap_utilization`, `burn_ratio`, `burn_cadence_compliance`, `consumption_share` |
| Монетизация смещается в стейблкоины: ожидается рост stablecoin-транзакций в топ-играх в 2–3 раза, ставка на косметику вместо спекулятивного токена [2](https://blockmanity.com/news/web3-gaming-predictions-for-2026/amp/) | Выручка должна быть **диверсифицирована**: доля USDC и косметики, а не только токен | `stablecoin_share`, `cosmetic_share`, `gross_revenue`, `arpdau` |
| Метрики «настоящей игры»: игроки проводят 90 минут в сессии, retention 35–45% против <5% у прежних проектов; транзакции смещены в крафт/торговлю/PvP, а не в claim → продажа [3](https://www.bydfi.com/en/cointalk/web3-gaming-tokens-2026-gamefi-second-wind-analysis) | Нужен **индекс извлечения** и доля потребления: отличать игру от фермы | `extractive_pattern_index`, `sink_source_ratio`, `sink_diversity`, `velocity` |
| Низкая конверсия платящих в мобильных F2P (~2%) и 30% комиссия стор [4](https://solanacompass.com/learn/Lightspeed/how-ephemeral-rollups-impact-solana-gaming-andrea-magicblock) | Считать конверсию в платящих и выручку на игрока, а не только «транзакции» | `paying_conversion`, `arpdau`, `revenue_per_payer` (через `gross_revenue`) |
| Эфемерные роллапы: задержка ~50 мс, действия газлесс, плата не в SOL [4](https://solanacompass.com/learn/Lightspeed/how-ephemeral-rollups-impact-solana-gaming-andrea-magicblock) | Экономика считается по событиям и compute-стоимости, а не по комиссиям L1 | `eventsHuman`, оценка стоимости действий — через `config` (см. «Включение») |
| Публичные сжигания и дефляционные модели как доказательство спроса (пример: 38 недельных сжиганий, 570 млн токенов) [5](https://solanacompass.com/projects/category/gaming/play-to-earn) | Регулярность сжиганий измеряется, а не декларируется | `burn_cadence_compliance` |
| Points-программы и сибил-фарм требуют защиты | Доля помеченных кошельков и доля ботов видимы, но действия — только через proposal | `sybil_flagged_share`, `bot_activity_share` |
| Доход направляется холдерам NFT (revenue-share модель) | Считать **покрытие дивидендного пула** по фактической прибыли | `dividend_pool_coverage` |
| Инфраструктура стабильнее отдельных токенов; следят за кошельками команды и вестингом | Прозрачность казны и расхода | `treasury_runway_days`, `liquidity_to_mcap`, `price_impact_1k` |

## Семейства и метрики

### 1. Снабжение и эмиссия (`supply`, 8)
| Метрика | Формула |
|---|---|
`total_minted` | Σ amount по событиям класса mint |
`total_burned` | Σ amount по классу burn |
`net_issuance` | mint − burn |
`burn_ratio` | burn / mint |
`inflation_daily` | ((mint − burn) / circulating) / дни × 100 |
`inflation_annualized` | (1 + daily_rate)^365 − 1 |
`cap_utilization` | circulating / maxSupply × 100 (лимит supply) |
`burn_cadence_compliance` | доля ожидаемых циклов, где был хотя бы один burn (90 дней) |

### 2. Источники и стоки (`flows`, 5)
`sources_total` = source + reward + inject · `sinks_total` = sink + fee + burn ·
`sink_source_ratio` = sinks / sources (≥0.8 устойчиво, <0.5 риск инфляции) ·
`sink_diversity` = 1 − HHI(доли типов стоков) · `consumption_share` = sinks / (sinks + extract).

### 3. Скорость обращения (`velocity`, 4)
`velocity` = (объём торгов / стоимость circulating) / дни · `turnover_annualized` = velocity × 365/дни ·
`dormant_supply_share` = (1 − активное/circulating) × 100 · `holding_time_days` (по связке earn→spend).

### 4. Игроки и монетизация (`players`, 6)
`active_wallets` (только human) · `sessions` · `new_wallets_share` · `paying_conversion` ·
`earn_per_hour` (сигнал бот-ферм) · `time_to_first_earn_hours`.

### 5. Выручка и казна (`revenue`, 7)
`gross_revenue` · `arpdau` · `cost_of_emission_share` · `stablecoin_share` · `cosmetic_share` ·
`treasury_runway_days` = казна / дневной расход · `dividend_pool_coverage` = (выручка − расходы) × 25%.

### 6. Справедливость (`fairness`, 3)
`gini_earnings` (Джини по заработку) · `top10_share` · `whale_dependency` (доля крупнейшего кошелька).

### 7. Риски и ликвидность (`risk`, 5)
`bot_activity_share` · `extractive_pattern_index` = extract / (sink + extract) ·
`liquidity_to_mcap` = глубина пула / капитализация × 100 · `price_impact_1k` ≈ (1000 / глубина) × 100 ·
`sybil_flagged_share`.

### 8. Переплетение (`cross`, 2)
`cross_game_player_share` — доля игроков с событиями в 2+ играх · `net_bridge_flow` = bridge_in − bridge_out.

## Индекс здоровья экономики

Композитная оценка 0–100 из шести компонентов с весами:
сила стоков 0.25 · сжигание 0.15 · распределение (1 − Gini) 0.20 · игра против извлечения 0.20 ·
запас казны 0.10 · органичность (1 − доля ботов) 0.10.
Статус: ≥70 `healthy`, 45–69 `watch`, <45 `critical`. **Если доступно меньше четырёх компонентов,
индекс не выдаётся** — вместо числа показывается причина (`unavailable`).

## Включение метрик для игры

Метрики типа сумм (mint/burn/стоки/источники/торговля) начинают считаться сразу после подключения
игры и её событий — конфигурация не нужна. Для метрик, требующих внешних фактов, значения задаёт
оператор переменными окружения (имена без значений — в `.env.example`):

```text
WATCHTOWER_ECONOMY_CIRCULATING            # circulating supply
WATCHTOWER_ECONOMY_MAX_SUPPLY             # лимит supply (2026: capped supply)
WATCHTOWER_ECONOMY_MAIN_ASSET             # основной актив (например POTATO)
WATCHTOWER_ECONOMY_PRICES                 # POTATO:0.042,USDC:1
WATCHTOWER_ECONOMY_TREASURY_BALANCE       # баланс казны
WATCHTOWER_ECONOMY_DAILY_BURN             # средний дневной расход казны
WATCHTOWER_ECONOMY_BURN_CADENCE_DAYS      # интервал циклов сжигания (например 7)
WATCHTOWER_ECONOMY_REVENUE_USD            # подтверждённая выручка за окно
WATCHTOWER_ECONOMY_COSTS_USD              # подтверждённые расходы за окно
WATCHTOWER_ECONOMY_STABLECOIN_REVENUE_USD # выручка в USDC
WATCHTOWER_ECONOMY_COSMETIC_REVENUE_USD   # выручка от косметики
WATCHTOWER_ECONOMY_LIQUIDITY_USD          # глубина пула
WATCHTOWER_ECONOMY_MARKETCAP_USD          # капитализация
WATCHTOWER_ECONOMY_SYBIL_FLAGGED          # кошельки, помеченные антифродом
```

## Демо-режим

Пока игры не подключены, метрики можно посмотреть на синтетике: кнопка **«Показать на демо-данных»**
в разделе «Экономика» (`?demo=1` в API). Демо-поток: 90 дней, 420 кошельков, степенное распределение
заработка, недельные сжигания, редкие выводы, отдельно помеченные боты. Ответ API содержит
`demo: true` и `warning: DEMO DATA`; демо не попадает в event-inbox и не смешивается с боевыми данными.

## Как проверять

```bash
npm run test:economy    # 13 тестов: Джини, потоки, инфляция, боты, честность unavailable, демо, каталог
curl -s 'localhost:8787/api/economy/overview?window=7d'        # боевой режим
curl -s 'localhost:8787/api/economy/overview?window=7d&demo=1' # демо (DEMO DATA)
curl -s 'localhost:8787/api/economy/catalog'                    # список метрик с формулами
```

Тесты ловят конкретные инварианты: равенство доходов → Gini = 0; пустой поток → все метрики
`unavailable` и индекс не выдаётся; боты исключаются из экономики, но видны в их доле;
фарм-экономика (высокий вывод, низкое потребление) даёт индекс ниже здоровой; события старше окна
не влияют на расчёт.

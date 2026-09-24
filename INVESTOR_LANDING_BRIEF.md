# BRIEF: Инвесторский лендинг Games Watchtower × Ecosystem Share NFT

> **Обновление 2026-09-24:** сбор Ecosystem Share NFT ($100k) объединён с пресейлом $WTWR в общую цель $250 000
> как «Раунд 0». Актуальные цифры — `token-landing/` (лендинг RU/EN, white paper, Часть K). Use of funds этого
> брифа заменён общей таблицей $250k; распределение прибыли: 25% NFT, 30% выкуп $WTWR, 15% разработчики, 30% казна.


> Документ самодостаточен: его можно целиком передать чату/разработчику, который строит лендинг.
> Внутри: контекст по продуктам, вся бизнес-модель с формулами, полная двуязычная копия (RU/EN) для каждого блока, дизайн-токены, технические требования и чек-лист параметров перед запуском.
> Принцип, действующий на всём лендинге: **никаких выдуманных цифр**. Демо-скриншоты помечаются бейджем «DEMO DATA». Всё, чего нет сегодня, подписывается «в работе» / «planned».

---

## 0. Контекст (что строит лендинг и для кого)

Студия **Leo Games Studio** имеет:

1. **4 игры на Solana** в разных стадиях:
   - **ARES-1 «Potato Colony on Solana»** — стадия `beta`, farming-экономика, игровой ресурс POTATO;
   - **Age of Farming (AOF)** — стадия `prototype`, farming и крафт;
   - **Neon Relay** — стадия `prototype`, гонки + «Neon DM»;
   - **GUTTERCAPS** — стадия `alpha`, коллекционные предметы + PvP, токен $CG.
2. **Games Watchtower** — операционная система студии (уже написана и работает):
   - единый ingestion-слой событий (on-chain и off-chain) с дедупликацией, курсорами, backfill, gap detection;
   - read-only API: overview, смежная аналитика, инвесторские отчёты и snapshots, воронки, cross-game сегменты, алерты, AI-аналитик, read-only control surface (без прямых записей в блокчейн);
   - каждый показатель помечен качеством данных: `complete / partial / unavailable` и confidence — выдуманных чисел в системе нет по дизайну;
   - тёмный дашборд (токены в разделе 7).
3. **TalkChart** — собственный off-chain движок трафика (без рекламного бюджета):
   - программный SEO и GEO-оптимизация под AI-поисковики (Perplexity, ChatGPT Search, Google);
   - X/Twitter: дайджесты и интерактивные карточки Solana Blinks;
   - 15-секундные вертикальные видео (Shorts/TikTok/Reels);
   - интерактивный «китовый радар» (терминал с прогнозами 1ч) как retention-петля;
   - **TipLink-онбординг**: вход в Web3 без кошелька и без сид-фразы через Google (казуальная Web2-аудитория);
   - 5 кампаний, 8 источников, 6 целевых страниц; read-only exporter для Watchtower.

**Цель лендинга:** собрать **$100,000** через однократный дроп **100 NFT «Ecosystem Share»**, которые вместе дают право на **25% чистой прибыли студии**. Аудитория: крипто-инвесторы, ангелы, холдеры Solana-экосистемы. Языки: **RU + EN** (переключатель).

---

## 1. Бизнес-модель сделки (логика — важно для всех формулировок)

| Параметр | Значение (рабочее, менять через чек-лист раздела 9) |
|---|---|
| Целевой сбор | $100,000 |
| Класс NFT | один: «Ecosystem Share» |
| Цена NFT | $1,000 |
| Supply | 100 (одноразовый дроп, после закрытия mint отключается) |
| Право на NFT | **0.25% чистой прибыли студии** (100 × 0.25% = 25%) + read-only доступ к инвестор-дашборду Watchtower |
| Дивиденды | ежеквартально |
| Snapshot | первый рабочий день месяца (1 января, 1 апреля, 1 июля, 1 октября — при фактическом рабочем дне) |
| Получатель | актуальный владелец NFT на момент снапшота |
| Способ выплаты | on-chain, USDC (Solana), смарт-контрактом — не «руками студии» |

**Формула дивиденда:**

```text
Дивиденд на NFT за квартал = (Чистая прибыль студии за квартал × 25%) / 100
```

- «Чистая прибыль» = подтверждённая выручка студии (on-chain комиссии игр, TipLink-выручка, secondary-royalty, подтверждённые оффлайн-доходы) минус задокументированные расходы. Пул дивидендов не вычитается из прибыли повторно (25% от прибыли до распределения).
- Квартал без прибыли = дивиденд 0. Это надо сказать прямо на лендинге (блок FAQ).
- При продаже NFT права переходят покупателю со следующего снапшота.
- Лимит на кошелёк: 10 NFT (рекомендация, чтобы не было концентрации; параметр).

**Иллюстрация для лендинга (помечать «не обещание»):**
при чистой прибыли $200,000/год → пул $50,000/год → **$500 на NFT в год** ($125 в квартал) при цене $1,000.

**Почему это сильная сделка (аргумент для инвестора, использовать в блоке «Математика»):**
инвестор платит $100k не за «долю в компании с неизвестной оценкой», а за **поток прибыли с прозрачным расчётом**: 1.0× ожидаемого годового пула при профите $400k/год, а главное — каждый платёж проверяется в блокчейне.

**Вариант с тирами (если решим вместо одного класса):** Scout $500 × 100 ($50k, вес 1) + Partner $1,000 × 40 ($40k, вес 2) + Anchor $2,000 × 5 ($10k, вес 3) = $100k, 145 NFT; распределение пула по весам. Формула: Дивиденд = (Прибыль × 25% × вес NFT) / сумма всех весов (195). По умолчанию — один класс, тирный вариант — запасной.

**Юридическая пометка (обязательно в лендинге, блок 12 + раздел 9):**
выбранная форма — явное «право на долю прибыли». Это право будет зафиксировано отдельным документом Terms (предоставляется покупателю до оплаты). Финальные формулировки утверждаются юристом студии перед открытием продажи. Лендинг должен содержать disclaimer (текст в блоке 12) и ссылку/блок «Terms of the Share».

---

## 2. Use of funds ($100,000)

| Направление | Сумма | % | Что конкретно |
|---|---|---|---|
| Интеграция реальных данных | $25,000 | 25% | адаптеры 4 игр, индексаторы, реальный поток событий в Watchtower вместо demo |
| Разработка | $30,000 | 30% | production-версии игр, токеномика, **смарт-контракт дивидендов** (+аудит), reward-системы |
| Команда | $25,000 | 25% | разработчики и дизайнер на 3–6 месяцев |
| Масштабирование TalkChart | $15,000 | 15% | новые каналы, контент, Blinks, видеопроизводство |
| Юрист и комплаенс | $5,000 | 5% | структура profit share, Terms, disclaimers |

**Milestone-выплата (рекомендация, повышает доверие):**
50% при запуске дропа → 30% при mainnet-деплое игры #1 и подключении реальных данных → 20% при первой выплате дивиденда.

---

## 3. Roadmap

| Квартал | События |
|---|---|
| **Q4 2026** | mainnet-деплой ARES-1 (самая зрелая игра, beta); реальные данные ARES-1 в Watchtower; аудит и деплой дивидендного контракта; **открытие продажи NFT** |
| **Q1 2027** | Neon Relay и GUTTERCAPS в production; **первый дивиденд** (снапшот 1 января 2027); публичный инвестор-дашборд для холдеров |
| **Q2 2027** | Age of Farming в production; 4/4 игр с реальными данными в OS; квартальный отчёт v2 с полной P&L-раскладкой |

---

## 4. Структура лендинга и полная двуязычная копия

Одна страница, scroll-секции с якорями. Порядок: 1 Hero → 2 Честные счётчики → 3 Проблема → 4 Решение (Watchtower) → 5 Игры → 6 TalkChart → 7 Оффер NFT → 8 Математика и доход → 9 Use of funds → 10 Roadmap → 11 Блок честности → 12 FAQ + CTA + Disclaimer.

Стиль тона: спокойный, инженерный, без «to the moon». Ровно. Мы продаём прозрачность, а не хайп.

---

### Блок 1 — Hero

**RU:**
- H1: `Games Watchtower — прозрачная Web3-игровая экосистема`
- Подзаголовок: `4 игры на Solana. 1 операционная система. 0 скрытых цифр.`
- Текст: `Мы выпускаем 100 NFT «Ecosystem Share»: вместе они = 25% чистой прибыли студии. Каждый владелец получает доступ к тому же инвестор-дашборду, что и основатель, и ежеквартальный on-chain дивиденд — платит смарт-контракт, проверяется в блокчейне.`
- CTA primary: `Купить долю — $1,000` (якорь #offer)
- CTA secondary: `Смотреть дашборд (demo)` (якорь #watchtower)
- Badge: `Presale · Q4 2026 · 100/100`

**EN:**
- H1: `Games Watchtower — a transparent Web3 gaming ecosystem`
- Sub: `4 games on Solana. 1 operating system. 0 hidden numbers.`
- Body: `We are minting 100 «Ecosystem Share» NFTs. Together they represent 25% of the studio's net profit. Every holder gets access to the same investor dashboard as the founder and receives quarterly on-chain dividends — paid by smart contract, verifiable on-chain.`
- CTA primary: `Get your share — $1,000`
- CTA secondary: `See the dashboard (demo)`
- Badge: `Presale · Q4 2026 · 100/100`

---

### Блок 2 — Честные счётчики (strip из 4 чисел)

| Число | RU подпись | EN подпись |
|---|---|---|
| 4 | игры в экосистеме (beta / alpha / prototype) | games in the ecosystem (beta / alpha / prototype) |
| 6 | каналов органического трафика | organic traffic channels |
| 1 | операционная система с read-only API | operating system with read-only API |
| 100 | NFT = 25% чистой прибыли | NFTs = 25% of net profit |

Под strip мелко: `Ни одно число на этой странице не выдумано. Скриншоты дашборда — demo-режим и помечены как таковой.` / EN: `No number on this page is invented. Dashboard screenshots are demo mode and labeled as such.`

---

### Блок 3 — Проблема

**RU:**
H2: `Инвесторам в Web3-игры нечего проверить`
Текст: `Студии показывают скриншоты, обещают рост и закрывают доступ к цифрам. Rugpulls, vanity-метрики, «поверьте на слово». В результате честные проекты не могут получить деньги, потому что их никто не может отличить от скама.`

**EN:**
H2: `Web3 game investors have nothing to verify`
Body: `Studios post screenshots, promise growth, and hide the books. Rug pulls, vanity metrics, «trust us, captain». As a result, honest projects can't raise money because nobody can tell them apart from a scam.`

---

### Блок 4 — Решение (Watchtower)

**RU:**
H2: `Наш ответ — операционная система, открытая инвестору`
Текст: `Games Watchtower — ядро студии: единый слой событий (on-chain и off-chain) с дедупликацией, курсорами и обнаружением разрывов; read-only API; AI-аналитик; алерты; воронки; инвестиционные отчёты и снимки.`
Ключевая фраза (выделена): `Каждый показатель помечен качеством данных: complete / partial / unavailable. Вы видите те же цифры, что и основатель — и можете проверить их on-chain. «Никаких выдуманных чисел» — это принцип системы, а не маркетинговый лозунг.`
Подпись под скриншотом: `Дашборд Watchtower (демо-данные, реальный интерфейс)` + бейдж `DEMO DATA`.

**EN:**
H2: `Our answer — an operating system, open to the investor`
Body: `Games Watchtower is the studio's core: a single event layer (on-chain and off-chain) with deduplication, cursors and gap detection; read-only APIs; an AI analyst; alerts; funnels; investor reports and snapshots.`
Key line (highlighted): `Every metric is labeled by data quality: complete / partial / unavailable. You see the same numbers as the founder — and you can verify them on-chain. «No invented numbers» is a system principle, not a marketing slogan.`
Screenshot caption: `Watchtower dashboard (demo data, real interface)` + badge `DEMO DATA`.

Скриншоты блока (4 штуки, см. раздел 8): Обзор/KPI, Воронки, Страница для инвесторов, Трафик/Acquisition.

---

### Блок 5 — 4 игры (карточки)

Каждая карточка: название, однострочник, бейдж стадии (честно), бейдж статуса данных.

| Игра | RU описание | EN description | Стадия |
|---|---|---|---|
| ARES-1 «Potato Colony» | Farming-экономика на Solana: плантации, ресурсы POTATO, награды. Самая зрелая игра — первая на mainnet (Q4 2026). | A Solana farming economy: plots, the POTATO resource, rewards. The most mature game — first to mainnet (Q4 2026). | beta |
| Age of Farming | Farming и крафт: поля, урожай, crafting-цепочки. Экономика с sink/source балансом. | Farming and crafting: plots, harvests, crafting chains. An economy with sink/source balance. | prototype |
| Neon Relay | Гонки и «Neon DM» — быстрая соревновательная петля с наградными расчётами on-chain. | Races and «Neon DM» — a fast competitive loop with on-chain reward settlement. | prototype |
| GUTTERCAPS | Коллекционные предметы, PvP-ставки, токен $CG. On-chain инварианты и антифрод в индексаторе. | Collectibles, PvP wagers, $CG token. On-chain invariants and anti-fraud built into the indexer. | alpha |

Подпись под сеткой RU: `Стадии — фактические, из реестра студии. Данные каждой игры в OS помечены своим quality-статусом — без маскировки.`
EN: `Stages are actual, from the studio registry. Each game's data in the OS carries its own quality status — no masking.`

---

### Блок 6 — TalkChart (движок трафика)

**RU:**
H2: `Трафик без рекламного бюджета`
Текст: `TalkChart — собственный движок привлечения студии. Мы не покупаем аудиторию — мы её находим.`
Список каналов (иконки + строки):
- `SEO/GEO — программные страницы терминала, оптимизированные под Perplexity, ChatGPT Search и Google`
- `X/Twitter — дайджесты и интерактивные Solana Blinks прямо в ленте`
- `Короткие видео — 15-секундные вертикали (Shorts/TikTok/Reels)`
- `Китовый радар — интерактивный терминал с прогнозами 1ч как retention-петля для трейдеров`
- `TipLink — онбординг в Web3 без кошелька и без сид-фразы, вход через Google`
Числа (честные, из контракта интеграции): `5 кампаний · 8 источников · 6 целевых страниц · $0 на рекламу`
Важная пометка RU (мелким текстом): `Каналы активны в live-режиме. Историческая статистика TalkChart подключается к Watchtower; на скриншотах демо-режима она помечена.`

**EN:**
H2: `Traffic without an ad budget`
Body: `TalkChart is the studio's in-house acquisition engine. We don't buy audiences — we find them.`
Channels:
- `SEO/GEO — programmatic terminal pages optimized for Perplexity, ChatGPT Search and Google`
- `X/Twitter — digests and interactive Solana Blinks straight in the feed`
- `Short video — 15-second verticals (Shorts/TikTok/Reels)`
- `Whale radar — an interactive terminal with 1h forecasts as a retention loop for traders`
- `TipLink — Web3 onboarding without a wallet and without seed phrases, sign-in via Google`
Numbers: `5 campaigns · 8 sources · 6 target pages · $0 ad spend`
Note (small): `Channels are live. TalkChart's historical stats are being connected to Watchtower; in demo-mode screenshots they are labeled as demo.`

---

### Блок 7 — Оффер: Ecosystem Share NFT

**RU:**
H2: `100 NFT. 25% чистой прибыли. Один класс.`
Строка-суть: `Каждый NFT = 0.25% чистой прибыли студии + read-only доступ к инвестор-дашборду.`
Карточки прав (3 шт):
1. `Доля прибыли — 0.25% от квартальной чистой прибыли, дивиденд ежеквартально`
2. `On-chain выплаты — USDC на Solana, платит смарт-контракт, снапшот 1-го рабочего дня месяца, платит актуальному владельцу`
3. `Доступ к Watchtower — тот же дашборд, что у основателя: статистика 4 игр, трафик, P&L, snapshots`
Блок «Как проходит выплата» (4 шага):
`1. Квартальная отчётность студии → 2. Снапшот владельцев (первый рабочий день месяца) → 3. Смарт-контракт считает: Прибыль × 25% ÷ 100 → 4. USDC приходит на кошелёк каждого холдера. Каждая выплата — публичная транзакция.`
CTA: `Забрать свой из 100`

**EN:**
H2: `100 NFTs. 25% of net profit. One class.`
Core line: `Each NFT = 0.25% of studio net profit + read-only access to the investor dashboard.`
Rights cards:
1. `Profit share — 0.25% of quarterly net profit, paid every quarter`
2. `On-chain payouts — USDC on Solana, paid by smart contract, snapshot on the first business day of the month, paid to the holder of record`
3. `Watchtower access — the same dashboard as the founder: 4-game stats, traffic, P&L, snapshots`
Payout flow (4 steps):
`1. Studio's quarterly report → 2. Holder snapshot (first business day of the month) → 3. Smart contract computes: Profit × 25% ÷ 100 → 4. USDC lands in every holder's wallet. Every payout is a public transaction.`
CTA: `Claim yours (1 of 100)`

---

### Блок 8 — Математика и доход

**RU:**
H2: `Простая математика, которую можно пересчитать`
Формула (моно-шрифт): `Дивиденд = (Чистая прибыль квартала × 25%) ÷ 100`
Таблица иллюстраций (3 сценария, пометка «иллюстрация, не обещание»):

| Чистая прибыль/год | Пул (25%) | На NFT в год | На NFT в квартал | % от цены $1,000/год |
|---|---|---|---|---|
| $100,000 | $25,000 | $250 | $62.5 | 25% |
| $200,000 | $50,000 | $500 | $125 | 50% |
| $400,000 | $100,000 | $1,000 | $250 | 100% |

Текст под таблицей: `Квартал без прибыли — дивиденд 0. Мы показываем сценарии, потому что честность — единственная валюта, которая тут работает. Все входные данные (выручка и расходы) публикуются в квартальном отчёте, чтобы любой холдер пересчитал выплату сам.`
Блок «Где видно мой доход»: `В инвестор-дашборде — раздел вашего NFT: снапшоты, ваши выплаты, история. Дублируется on-chain: сверяется в любом Solana-эксплорере.`

**EN:**
H2: `Simple math you can re-check`
Formula (mono): `Dividend = (Quarterly net profit × 25%) ÷ 100`
Illustration table (3 scenarios, labeled «illustration, not a promise»):

| Net profit / yr | Pool (25%) | Per NFT / yr | Per NFT / qtr | % of $1,000 price / yr |
|---|---|---|---|---|
| $100,000 | $25,000 | $250 | $62.5 | 25% |
| $200,000 | $50,000 | $500 | $125 | 50% |
| $400,000 | $100,000 | $1,000 | $250 | 100% |

Note: `A quarter with no profit — dividend is 0. We show scenarios because honesty is the only currency that works here. All inputs (revenue and expenses) are published in the quarterly report so any holder can recompute the payout.`
«Where I see my income»: `In the investor dashboard — your NFT section: snapshots, your payouts, history. Mirrored on-chain: verifiable in any Solana explorer.`

---

### Блок 9 — Use of funds

**RU:** H2: `Куда идут $100,000`
(таблица раздела 2 этого брифа, 5 строк + строка milestone)
Дополнительно: `50% при запуске · 30% при mainnet игры #1 и реальных данных · 20% при первом дивиденде`

**EN:** H2: `Where the $100,000 goes`
(same table translated)
Extra: `50% at launch · 30% at game #1 mainnet + live data · 20% at the first dividend`

---

### Блок 10 — Roadmap

**RU:** H2: `План до первого дивиденда`
(таблица раздела 3: Q4 2026 / Q1 2027 / Q2 2027)

**EN:** H2: `The path to the first dividend`
(same table translated)

---

### Блок 11 — Блок честности

**RU:**
H2: `Что есть сегодня, что в работе, что в планах`
Три колонки:
- `Есть` — `Watchtower: код, read-only API, аналитика, инвестор-отчёты, snapshots. 4 игры в prototype/alpha/beta. TalkChart: live-каналы (SEO/GEO, X, видео, радар, TipLink).`
- `В работе` — `Mainnet-деплой ARES-1. Интеграция реальных событий 4 игр в OS (сейчас в демо-режиме).`
- `Планы` — `Смарт-контракт дивидендов и первый платёж. 4/4 игр в production. Мобильные клиенты.`
Финальная строка (выделена): `Скриншоты на этой странице — реальный интерфейс в демо-режиме и помечены бейджем. Мы не подменяем демо реальные цифры — это та же политика, что в Watchtower.`

**EN:**
H2: `What exists today, what's in progress, what's planned`
Three columns:
- `Exists` — `Watchtower: code, read-only API, analytics, investor reports, snapshots. 4 games at prototype/alpha/beta. TalkChart: live channels (SEO/GEO, X, video, radar, TipLink).`
- `In progress` — `ARES-1 mainnet deployment. Real event integration for the 4 games into the OS (currently demo mode).`
- `Planned` — `Dividend smart contract and first payout. 4/4 games in production. Mobile clients.`
Final line (highlighted): `Screenshots on this page are the real interface in demo mode, labeled as such. We don't swap demo for real numbers — that's the same policy as in Watchtower.`

---

### Блок 12 — FAQ, CTA, Disclaimer

**FAQ (RU / EN):**

1. RU: `Что именно я покупаю?` — `Право на 0.25% чистой прибыли студии (оно закрепляется документом Terms, который вы получаете до оплаты) и read-only доступ к инвестор-дашборду Watchtower.`
   EN: `What exactly am I buying?` — `A contractual right to 0.25% of the studio's net profit (fixed in a Terms document you receive before payment) and read-only access to the Watchtower investor dashboard.`
2. RU: `Когда и как я получаю деньги?` — `Ежеквартально. Снапшот — первый рабочий день месяца; получает актуальный владелец NFT. Выплата — USDC on-chain, считает и переводит смарт-контракт.`
   EN: `When and how do I get paid?` — `Quarterly. Snapshot — the first business day of the month; the holder of record receives it. Payout is USDC on-chain, computed and transferred by a smart contract.`
3. RU: `Что происходит, когда я продаю NFT?` — `Права переходят покупателю со следующего снапшота.`
   EN: `What happens when I sell the NFT?` — `The rights transfer to the buyer from the next snapshot.`
4. RU: `А если у студии нет прибыли?` — `Тогда дивиденд 0. Вы остаётесь с доступом к дашборду и долей, которая начинает приносить деньги, когда студия заработает.`
   EN: `What if the studio makes no profit?` — `Then the dividend is 0. You keep dashboard access and a share that starts paying once the studio earns.`
5. RU: `Почему вам можно верить?` — `Код Watchtower и контракты публичны; все метрики помечены качеством данных; каждый дивиденд — публичная on-chain транзакция; $100,000 выплачиваются командами по вехам (50/30/20).`
   EN: `Why should I trust you?` — `Watchtower code and contracts are public; every metric is labeled by data quality; every dividend is a public on-chain transaction; the $100,000 is released in milestones (50/30/20).`

**CTA-блок (финальный):**
RU: H2: `100 долей. Одноразовый дроп. После закрытия mint отключается.` / `Забрать свой NFT` + `Задать вопрос основателю` (email/Telegram — параметр)
EN: H2: `100 shares. One-time drop. Mint disables after close.` / `Claim your NFT` + `Ask the founder a question`

**Disclaimer (обязателен, мелким шрифтом, оба языка; финальная версия — после юриста):**
RU: `Ecosystem Share NFT представляет собой договорное право на долю в чистой прибыли студии и доступ к инвестор-дашборду. Это не игровой токен и не корпоративная ценная бумага зарегистрированной компании; оно не даёт доли в капитале студии и не является индивидуальной инвестиционной рекомендацией. Прошлые результаты не гарантируют будущий доход; квартал без прибыли означает нулевой дивиденд. Перед покупкой проконсультируйтесь с квалифицированным юристом и налоговым советником. Полный текст прав (Terms) предоставляется до открытия продажи. Финальные формулировки утверждаются юристом студии.`
EN: `An Ecosystem Share NFT is a contractual right to a share of the studio's net profit and access to the investor dashboard. It is not an in-game token and not a registered corporate security; it grants no equity in the studio and is not individual investment advice. Past performance does not guarantee future income; a quarter with no profit means a zero dividend. Consult a qualified legal and tax professional before purchasing. The full Terms document is provided before the sale opens. Final wording is approved by the studio's counsel.`

---

## 5. Команда (блок-заглушка)

В репозитории данных о команде, кроме основателя, нет — добавить компактный блок после Roadmap:
- RU: `Команда` / `Леонид К. — основатель. (био 2–3 строки: опыт, проекты, почему экосистема, а не одна игра — ВСТАВИТЬ)` + места под 1–3 человек, которые войдут за привлечённые деньги.
- EN: `Team` / `Leonid K. — founder. (2–3 line bio: experience, projects, why an ecosystem and not a single game — TO FILL)` + slots for 1–3 people hired from the raise.
До получения био блок не показывать (убрать, а не оставлять placeholder на production).

---

## 6. Что НЕ делать (анти-паттерны для реализации)

1. Не показывать DAU/MAU/выручку как фактические — их нет. Только «4 игры», «6 каналов» и подобные счётчики-факты.
2. Не убирать бейджи `DEMO DATA` со скриншотов.
3. Не писать «гарантированный доход», «passive income guaranteed», «token will go up» — в любой из версий.
4. Не смешивать ботовый и реальный трафик в цифрах (TalkChart маркирует `sourceType: bot|real` — в лендинге трафик подаём как канал, без цифр посещаемости).
5. Не использовать цену NFT как «оценку компании».
6. Не врать про стадии игр: ARES-1 = beta, GUTTERCAPS = alpha, остальные prototype.

## 7. Дизайн и технические требования

**Токены (из Watchtower, для визуального родства):**
```css
--bg: #090c12; --panel: #10151e; --panel2: #131923; --line: #222b38;
--muted: #7f8a9c; --text: #ecf2f7;
--green: #37e5a0;   /* primary: CTA, акценты, бейджи стадий beta/alpha */
--purple: #a78bfa;  /* вторичный акцент (AI-аналитика, инсайты) */
--orange: #ffb85c;  /* предупреждения, «в работе» */
--red: #ff6b8a;     /* риски, critical */
Шрифты: Manrope (текст), DM Mono (все числа, формулы, бейджи, счётчики)
```
Тёмная тема, один скролл-экран, секции с якорями; sticky-шапка: логотип `W` (зелёный квадрат, буква W, как в сайдбаре Watchtower) + имя `watchtower` + переключатель языка `RU | EN` (EN по умолчанию? — решение: **RU по умолчанию**, т.к. первичная аудитория российскоязычная; переключение мгновенное, состояние в URL/hash для shareable ссылок).

**i18n:** все тексты — в едином объекте `{ ru: {...}, en: {...} }`; переключатель ререндерит страницу без перезагрузки; числа в таблицах не переводи (USDC всегда в $).

**Скриншоты (4, с бейджем DEMO DATA в углу):**
1. Обзор Watchtower (KPI-карточки + график) — для блока 4;
2. Воронки и динамика — блок 4;
3. Страница для инвесторов — блоки 7–8 («где видно мой доход»);
4. Секция «Трафик / Acquisition» — блок 6.

**Интерактив:**
- CTA `Купить долю` → до пресейла: якорь на форму веблиста (email, параметр FORM_ENDPOINT); после: ссылка на marketplace (параметр MARKETPLACE_URL) + инструкция «кошелёк Solana».
- Блок «100/100» — статический до старта; после старта — параметр проданных/осталось (если будет API).
- SEO: `<title>` на оба языка, OG-изображение (скаффолд: логотип W + «100 NFT = 25% of net profit»), meta description.
- Адаптив: mobile-first, таблицы → карточки на узких экранах.
- Формат: статический сайт (Astro / Next / Vite + React), деплой на Vercel/GitHub Pages; без бэкенда, кроме формы.

## 8. Скриншоты: как снять из Watchtower

```bash
cd Games-watchtower
npm install
npm run dev:api   # API на :8787 (mock-режим)
npm run dev       # Vite-дашборд, открыть в браузере 1440px
```
Снять: (1) вью «Обзор» целиком; (2) секция «Воронки и динамика»; (3) «Страница для инвесторов»; (4) «Трафик / Acquisition». Бейдж `DEMO DATA` — добавлять на пост-продакшне в правый верхний угол каждого скрина (DM Mono, рамка, зелёный).

## 9. Чек-лист параметров перед запуском (решает основатель)

| Параметр | Рабочее значение | Статус |
|---|---|---|
| Цена NFT | $1,000 | ⏳ подтвердить |
| Supply | 100 | ⏳ подтвердить |
| Лимит на кошелёк | 10 | ⏳ подтвердить |
| Токен дивидендов | USDC (Solana) | ⏳ подтвердить |
| Дата снапшота | 1-й рабочий день месяца | ✅ зафиксировано в оффере |
| Milestone-выплата 50/30/20 | да | ⏳ подтвердить |
| MARKETPLACE_URL | — | ⏳ заполнить |
| FORM_ENDPOINT (веблайн) | — | ⏳ заполнить |
| Канал связи с инвесторами (email/TG) | — | ⏳ заполнить |
| Био основателя для блока Команда | — | ⏳ заполнить |
| Юридический текст Terms (полный документ прав) | — | ⏳ юрист |
| Юридический финал Disclaimer | см. блок 12 | ⏳ юрист |

## 10. Резюме для оффера в одном абзаце (для pitch-deck / X-тредов)

RU: `Мы — студия 4 Solana-игр с собственной операционной системой прозрачности: каждый показатель в Watchtower помечен качеством данных, а дивиденды идут on-chain. Мы выпускаем 100 NFT по $1,000, которые вместе дают 25% чистой прибыли студии: ежеквартальный дивиденд в USDC получает актуальный владелец, а $100,000 работают по вехам — mainnet первой игры, реальные данные 4 игр и первый платёж. Никаких скрытых цифр: вы видите тот же дашборд, что и основатель.`
EN: `We're a studio of 4 Solana games with its own transparency operating system: every Watchtower metric is labeled by data quality, and dividends run on-chain. We're minting 100 NFTs at $1,000 that together equal 25% of studio net profit: the quarterly USDC dividend goes to the holder of record, and the $100,000 is milestone-released — first game on mainnet, live data for all 4 games, and the first payout. No hidden numbers: you see the same dashboard as the founder.`

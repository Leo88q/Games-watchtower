# Промт для Analytics команды — Watchtower OS

## Роль
Ты Analytics/Attribution инженер в Leo Games Studio. Твоя задача — запустить аналитику слой.

## Что уже есть
- Watchtower OS 7 слоёв, API /api/os/config, /api/analytics/config, /api/analytics/health
- Модули: server/modules/analytics/ — helika.js, gamesight.js
- Trafficgen уже есть: server/analytics/traffic.js + /api/analytics/traffic

## Слой Analytics из брифа
- Helika: единый дашборд для Web2, in-game и on-chain данных. Продукты: user acquisition, маркетинговая атрибуция, LiveOps, A/B-тесты, on-chain аналитика по 10+ сетям. Используется Yuga Labs и Treasure. Осторожно: компания публично смещает фокус в сторону AI-продуктов
- GameSight (Solana-интеграция): автоматически подтягивает on-chain события в отчётность. События приходят как Anonymous Events с Wallet ID. Для атрибуции нужно передавать solana_wallet как external_id в игровых событиях (Late ID Binding). Отслеживает mint, buy, sell, transfer, burn
- Рекомендация для мультиигрового ПО: Helika — для кросс-игрового дашборда, GameSight — для сквозной атрибуции от рекламы до ончейн-транзакции

## Задачи

### 1. Helika — cross-game dashboard

```js
// server/modules/analytics/helika.js уже есть

// Env:
HELIKA_API_KEY=...
HELIKA_PROJECT_ID=...
HELIKA_ENDPOINT=https://api.helika.io

// Products: user acquisition, marketing attribution, LiveOps, A/B tests, on-chain analytics 10+ networks
// Clients: Yuga Labs, Treasure
// Warning: публично смещает фокус в AI-продукты — учитывай риск

// Features: web2 ingestion, in-game events, on-chain analytics, cross-game dashboard, ab testing, liveOps

// Event mapping Watchtower -> Helika
const mapping = {
  player: {
    WalletConnected: 'wallet_connected',
    PlayerJoined: 'player_joined',
    SessionStarted: 'session_started',
    SessionEnded: 'session_ended',
  },
  economy: {
    TokenMinted: 'token_minted',
    TokenBurned: 'token_burned',
    PurchaseCompleted: 'purchase_completed',
    RewardClaimed: 'reward_claimed',
  },
  game: {
    MatchStarted: 'match_started',
    MatchFinished: 'match_finished',
    QuestCompleted: 'quest_completed',
  },
  attribution: {
    campaignId: 'campaign_id',
    source: 'utm_source',
    externalId: 'solana_wallet', // for Late ID Binding
  }
}
```

Реализуй:
- Helika client — track events from Watchtower inbox
- Mapping всех Watchtower event types -> Helika
- Web2 ingestion: page views, ad clicks, SEO/GEO, X/Twitter Blinks, short videos, whale radar, TipLink (из trafficgen)
- In-game: PlayerJoined, SessionStarted, MatchFinished, etc
- On-chain: TokenMinted, NFT_MINT, etc via DAS + LaserStream
- Cross-game dashboard: DAU/WAU/MAU per game + cross-game players (studio_profile PDA), retention D1/D7/D30, payer conversion, ARPDAU, LTV
- A/B tests: для каждой игры — onboarding, economy, L2 routing
- LiveOps: events, seasons, campaigns
- Warning: AI focus shift — имей backup план (GameSight + Custom PG)

### 2. GameSight — attribution ad -> on-chain

```js
// server/modules/analytics/gamesight.js уже есть

// Env:
GAMESIGHT_API_KEY=...
GAMESIGHT_PROJECT_ID=...
GAMESIGHT_ENDPOINT=https://api.gamesight.io

// Solana integration: автоматически подтягивает on-chain события как Anonymous Events с Wallet ID
// Late ID Binding: для атрибуции нужно передавать solana_wallet как external_id в игровых событиях
// Tracked on-chain: mint, buy, sell, transfer, burn

// Attribution setup
const lateIdBinding = {
  steps: [
    { step: 1, action: 'Player clicks ad', event: 'ad_click', id: 'gamesight_click_id' },
    { step: 2, action: 'Player joins game', event: 'PlayerJoined', external_id: 'gamesight_click_id' },
    { step: 3, action: 'Player connects wallet', event: 'WalletConnected', external_id: 'solana_wallet', link: 'gamesight_click_id -> solana_wallet' },
    { step: 4, action: 'On-chain event', event: 'NFT_MINT / TOKEN_MINT', wallet_id: 'solana_wallet', anonymous: true },
    { step: 5, action: 'Attribution', result: 'ad_click -> wallet -> mint, full funnel' },
  ],
  implementation: {
    inGameEvent: {
      eventType: 'PlayerJoined',
      payload: {
        solana_wallet: 'wallet_address', // as external_id
        gamesight_click_id: 'click_id_from_url',
      }
    },
    onChainEvent: {
      type: 'Anonymous Event',
      walletId: 'solana_wallet',
      event: 'mint / buy / sell / transfer / burn',
    }
  }
}
```

Реализуй:
- GameSight client — track in-game events with solana_wallet as external_id
- Late ID Binding: gamesight_click_id (from ad URL) -> solana_wallet (from WalletConnected) -> on-chain Anonymous Event (Wallet ID)
- On-chain tracking: mint, buy, sell, transfer, burn — automatically pulled by GameSight Solana integration
- Flow: ad_click (click_id) -> PlayerJoined (external_id: click_id) -> WalletConnected (solana_wallet) -> mint/buy/sell Anonymous Event Wallet ID -> attribution ad_click -> wallet -> mint full funnel
- Для каждого события из Unity/Godot/Unreal/Web: обязательно payload.solana_wallet + gamesight_click_id
- Cross-game attribution: studio_profile PDA links wallets across games

### 3. Интеграция с Watchtower OS

- Watchtower inbox уже собирает события: /api/ingest/solana, /api/events
- Тебе нужно обогатить события solana_wallet + campaign_id + gamesight_click_id
- Unity/Godot/Unreal/Web SDKs уже имеют примеры Helika + GameSight — убедись что они отправляют solana_wallet
- Trafficgen (TalkChart) уже есть: SEO/GEO, X/Twitter Blinks, short videos, whale radar, TipLink -> off-chain events -> /api/ingest/trafficgen -> trafficAnalytics
- Funnels: первый вход -> первое действие -> D1 -> D7 -> покупка -> переход во вторую игру (уже есть buildFunnel)
- Cross-game: crossGameSegments — игроки 1/2/3-4 игр (уже есть)

### 4. Дашборды

- Helika: cross-game dashboard — DAU/WAU/MAU, retention, payer conversion, ARPDAU, volume, treasury, liabilities, minted/burned, runway, critical incidents, data coverage
- GameSight: attribution dashboard — ad campaign -> click -> join -> wallet -> mint/buy/sell full funnel, ROI per campaign, LTV per source
- Watchtower OS: /api/read-model уже включает funnel, crossGame, traffic, investor — добавь туда analytics layer
- Frontend: src/os/index.js уже показывает analytics layer — расширь

### 5. Что сдать

- Helika client с mapping всех Watchtower events, Web2 + in-game + on-chain, cross-game dashboard, A/B, LiveOps
- GameSight client с Late ID Binding solana_wallet as external_id, Anonymous Events Wallet ID, mint buy sell transfer burn tracking, full funnel ad_click -> wallet -> mint
- Обогащение событий: все Unity/Godot/Unreal/Web SDKs отправляют solana_wallet + campaign_id + gamesight_click_id
- Дашборды: Helika cross-game + GameSight attribution + Watchtower OS panel
- Health: /api/analytics/health, /api/analytics/config
- Документация: какие события, какие маппинги, какие дашборды, какие ENV, warning про Helika AI фокус
- Тесты: attribution flow ad_click -> join -> wallet -> mint, cross-game linking, funnel conversion
- Запрет: no PII, pseudonymous playerKey, no full wallet addresses in public dashboard (hash)

### 6. ENV

```
HELIKA_API_KEY
HELIKA_PROJECT_ID
HELIKA_ENDPOINT
GAMESIGHT_API_KEY
GAMESIGHT_PROJECT_ID
GAMESIGHT_ENDPOINT
```

### 7. Проверка

```
GET /api/analytics/config — Helika cross-game dashboard + GameSight attribution + Late ID Binding
GET /api/analytics/health — Helika + GameSight status + event mapping
GET /api/analytics/traffic — TalkChart traffic generator SEO/GEO X/Twitter Blinks short videos whale radar TipLink
GET /api/funnels — первый вход -> ... -> переход во вторую игру
GET /api/players/cross-game — игроки 1/2/3-4 игр
GET /api/os/config — вся OS включая analytics layer
```

Детали: server/modules/analytics/, docs/os/

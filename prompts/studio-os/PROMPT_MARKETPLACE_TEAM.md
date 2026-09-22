# Промт для Marketplace команды — Watchtower OS

## Роль
Ты Marketplace инженер в Leo Games Studio. Твоя задача — запустить маркетплейс слой.

## Что уже есть
- Watchtower OS 7 слоёв, API /api/os/config, /api/marketplace/config, /api/marketplace/health, /api/marketplace/router
- Модули: server/modules/marketplace/ — magiceden.js, shyft-market.js, gameshift.js
- Assets: server/modules/assets/ — cnft.js, standard.js

## Слой Marketplace из брифа
- Magic Eden: REST-эндпоинты и генераторы инструкций для листинга, покупки, ставок, данных о коллекциях и активности. Публичные чтения — 120 QPM бесплатно, инструкции требуют Bearer API key. Для cNFT нужен MCC-адрес и список Merkle Tree addresses
- Shyft Marketplace API: escrow-less модель — NFT остаётся в кошельке пользователя до завершения продажи. Позволяет запустить полноценный in-app маркетплейс за несколько дней, есть stats API для статистики в один вызов
- GameShift (Solana Labs): API-first платформа для управления активами без знания блокчейна. Четыре вертикали: кошелёк (self-custodial), создание активов, торговля (в USD), платежи (170+ стран, 100% защита от чарджбэков). Все газовые сборы и взаимодействие с блокчейном берёт на себя
- cNFT предупреждение: Magic Eden прекращает индексацию новых cNFT-коллекций и постепенно снимает поддержку существующих. Для торговли потребуются альтернативные площадки (Tensor и др.), поддерживающие Bubblegum v2

## Архитектура из брифа
- Активы: cNFT для массовых предметов, стандартные NFT для редких. Маркетплейс — через GameShift или Shyft
- Админка и монетизация: GameShift для платежей и управления активами

## Задачи

### 1. Magic Eden — REST + инструкции

```js
// server/modules/marketplace/magiceden.js уже есть

// Env:
MAGIC_EDEN_API_KEY=...
MAGIC_EDEN_BASE_URL=https://api-mainnet.magiceden.dev

// Rate limit: 120 QPM free public reads, Bearer for instructions
// Features: listing, buying, bidding, collection data, activity, instructions generator
// cNFT: requires MCC-address + Merkle Tree addresses list, warning ME stops indexing new cNFT collections

// Endpoints
// Collections: GET /v2/collections, /collections/{symbol}/stats, /collections/{symbol}/activities
// NFT: GET /v2/tokens/{mint}, /tokens?collection={symbol}
// Marketplace: POST /v2/instructions/sell (листинг), /buy (покупка), /bid (ставки), /sell_cancel
// cNFT: POST /v2/instructions/cnft/sell (нужен MCC + Merkle Trees), /cnft/buy, note Tensor Bubblegum v2

// Instruction builder — Watchtower generates, client signs via Session Key
const meInstruction = {
  action: 'list', // list, buy, bid, cancel
  instruction: { type: 'list_instruction', mint, price, seller, buyer, mccAddress: mcc, merkleTreeAddresses: merkleTrees },
  note: '120 QPM free, Bearer for instructions, MCC + Merkle Trees for cNFT',
  signing: 'client-side via Phantom/MWA/Session Key',
  writes: false
}
```

Реализуй:
- Magic Eden REST client — collections, NFT, activities, stats
- Instruction generator — sell, buy, bid, cancel, cnft/sell, cnft/buy — generate instruction, client signs
- cNFT handling: MCC + Merkle Trees list required, warning about ME deprecation
- Rate limit handling: 120 QPM free, queue + retry
- For standard NFT: full support ME + Tensor
- For cNFT: recommend Tensor Bubblegum v2, ME only legacy

### 2. Shyft Marketplace API — escrow-less in-app за дни

```js
// server/modules/marketplace/shyft-market.js уже есть

// Env:
SHYFT_API_KEY=...
SHYFT_MARKET_BASE_URL=https://api.shyft.to/sol/v1/marketplace

// Model: escrow-less — NFT остаётся в кошельке пользователя до завершения продажи
// Features: in-app marketplace, escrow-less, fast launch за несколько дней, stats API в один вызов

// Endpoints
// Marketplace: POST /sol/v1/marketplace/create (создать маркетплейс для игры), /list (листинг escrow-less), /buy (покупка), /unlist
// NFT: GET /sol/v1/marketplace/list?marketplace_address=..., /active_listings
// Stats: GET /sol/v1/marketplace/stats?marketplace_address=... — статистика в один вызов

// Builder
const shyftListing = {
  gameId: 'ares1',
  marketplaceAddress: '...',
  action: 'list', // create, list, buy, unlist
  nftAddress: '...',
  price: 1.0,
  seller: '...',
  model: 'escrow-less',
  note: 'in-app marketplace за несколько дней'
}
```

Реализуй:
- Shyft marketplace client — create marketplace per game (ares1, aof, neonrelay, guttercaps)
- Escrow-less listing: NFT stays in wallet until sale — no custody risk, instant listing
- Buy, unlist
- Active listings, stats API — stats in one call
- In-app marketplace UI — за несколько дней via Shyft
- For cNFT: Shyft supports cNFT + escrow-less
- For standard: Shyft supports too

### 3. GameShift — API-first без знания блокчейна, USD 170+ стран 100% chargeback газ берёт на себя

```js
// server/modules/marketplace/gameshift.js уже есть

// Env:
GAMESHIFT_API_KEY=...
GAMESHIFT_BASE_URL=https://api.gameshift.dev
GAMESHIFT_ENV=devnet // or mainnet

// Owner: Solana Labs, type: API-first platform
// Verticals: wallet self-custodial, asset creation без знания блокчейна, trading USD, payments 170+ стран 100% chargeback protection
// Gas: все газовые сборы и взаимодействие с блокчейном берёт на себя

// Endpoints
// Users: POST /v1/users (создать self-custodial кошелёк для игрока), GET /users/{userId}, GET /users/{userId}/assets
// Assets: POST /v1/asset-collections (создать коллекцию), POST /v1/asset-collections/{collectionId}/assets (mint без знания блокчейна), GET /assets/{assetId}
// Marketplace: POST /v1/marketplace/listings (листинг в USD), POST /v1/marketplace/purchases (покупка в USD 170+ стран), GET /listings/{listingId}
// Payments: POST /v1/payments/checkout (USD платежи с защитой от чарджбэков), 170+ currencies, 100% protection
// Gas: GameShift pays gas

// Builder
const gsAsset = {
  gameId: 'ares1',
  collectionId: '...',
  asset: { name, description, imageUrl, attributes, ownerId },
  noBlockchainKnowledgeRequired: true,
  gasHandling: 'GameShift pays gas'
}
```

Реализуй:
- GameShift client — users (self-custodial wallet per player), asset-collections, assets (mint without blockchain knowledge), marketplace listings USD, purchases USD, payments checkout
- For non-crypto users: USD checkout 170+ countries, 100% chargeback protection
- Gas abstraction: all gas fees handled by GameShift
- Admin + monetization: use GameShift for payments and asset management
- For each game: create asset collection, mint assets via GameShift API, list in USD, purchase via checkout

### 4. Aggregator — выбор маркетплейса по типу актива

```js
// server/modules/marketplace/index.js marketplaceAggregator()

function marketplaceAggregator({ gameId, assetType }) {
  const isCnft = assetType === 'cnft' || assetType === 'common' || assetType === 'mass'
  return {
    gameId,
    assetType,
    routes: isCnft ? [
      { marketplace: 'tensor', reason: 'Bubblegum v2 support, ME stops indexing', priority: 1 },
      { marketplace: 'shyft', reason: 'escrow-less in-app', priority: 2 },
      { marketplace: 'gameshift', reason: 'USD payments fallback', priority: 3 },
    ] : [
      { marketplace: 'magic-eden', reason: 'standard NFT full support', priority: 1 },
      { marketplace: 'tensor', reason: 'alternative', priority: 2 },
      { marketplace: 'shyft', reason: 'in-app escrow-less', priority: 3 },
      { marketplace: 'gameshift', reason: 'USD + gas abstraction', priority: 4 },
    ]
  }
}

// Strategy from brief:
// cnft: primary Tensor Bubblegum v2, in-app Shyft escrow-less, warning ME stops indexing new cNFT, requires MCC + Merkle Trees for ME
// standardNft: primary ME + Tensor, inApp Shyft escrow-less + GameShift USD
// inAppMarketplace: Shyft fast launch за несколько дней escrow-less + GameShift USD 170+ стран 100% chargeback stats API in one call
```

Реализуй:
- Aggregator API: GET /api/marketplace/router?gameId=ares1&assetType=cnft
- Decision logic: cNFT -> Tensor primary, Shyft in-app, GameShift USD fallback; Standard -> ME + Tensor primary, Shyft + GameShift in-app USD
- Unified list: aggregate listings from ME + Tensor + Shyft + GameShift
- Unified buy: generate instruction via ME or Shyft, client signs via Session Key, or USD checkout via GameShift
- Stats: Shyft stats API in one call + ME stats + GameShift

### 5. Assets — cNFT + Standard strategy

```js
// server/modules/assets/ — cnft.js, standard.js

// cNFT economics: 1M ~ $110, vs standard 1M ~ 12000 SOL ~ $1.8M, savings x10000
// cNFT: off-chain, no token/mint account, Merkle Tree + MCC, Bubblegum v2
// Standard: mint account + token account + metadata + master edition + royalties
// Use cases: cNFT for mass common consumable currency material lootbox_common, Standard for rare legendary mythic founder land unique legendary_weapon founder_badge

function assetStrategy({ gameId, itemType, rarity }) {
  const isMass = ['common', 'consumable', 'currency', 'material', 'lootbox_common'].includes(itemType) || rarity === 'common'
  const isRare = ['legendary', 'mythic', 'founder', 'land', 'unique'].includes(rarity)
  if (isMass) return { recommendation: 'cNFT', reason: 'mass item $110/M', marketplace: 'tensor', cost: '$0.00011 per NFT' }
  if (isRare) return { recommendation: 'standard NFT', reason: 'rare needs mint/token account', marketplace: 'magic-eden + tensor', cost: '~0.012 SOL per NFT' }
  return { recommendation: 'cNFT', reason: 'default scalability' }
}
```

Реализуй:
- cNFT collection config: POST /api/assets/cnft/collection { collectionName, gameId, merkleTreeAddress, mccAddress, maxSupply }
- Mint payload: Bubblegum mintV2 instruction
- Marketplace adapter: Tensor (recommended for cNFT Bubblegum v2 after ME deprecation), ME (legacy, warning), Shyft (escrow-less)
- Strategy API: GET /api/assets/strategy?gameId=ares1&itemType=common&rarity=common

### 6. Интеграция с Watchtower OS

- Watchtower OS marketplace layer: /api/marketplace/config, /api/marketplace/health
- Unity/Godot/Unreal/Web SDKs already have marketplace examples — ensure they use aggregator
- Indexer: parse marketplace events — NFT_LIST, NFT_SALE, TOKEN_MINT via Shyft callbacks + LaserStream
- Analytics: track mint, buy, sell, transfer, burn via GameSight Anonymous Events Wallet ID
- Identity: marketplace purchases via Session Keys + gasless relay (FirstStep/Altude/GameShift)

### 7. Что сдать

- Magic Eden: REST client collections NFT activities stats, instruction generator sell buy bid cancel cnft/sell cnft/buy, rate limit 120 QPM, Bearer auth, MCC+MT for cNFT, warning ME deprecated for new cNFT
- Shyft: marketplace per game create, escrow-less list buy unlist, active listings, stats API one call, in-app marketplace за дни
- GameShift: users self-custodial, asset-collections, assets mint without blockchain knowledge, marketplace listings USD, purchases USD 170+ countries, payments checkout 100% chargeback protection, gas abstraction GameShift pays
- Aggregator: router per assetType cnft vs standard, unified list buy USD checkout, decision logic Tensor primary for cNFT, ME+Tensor for standard, Shyft+GameShift in-app USD
- Assets: cNFT collection config, mint payload, marketplace adapter, strategy cNFT mass $110/M vs standard rare, economics x10000 savings
- In-app marketplace UI: Shyft + GameShift — за несколько дней
- Health: /api/marketplace/health, /api/marketplace/config, /api/assets/health
- Документация: какие маркетплейсы для каких активов, какие ENV, какие команды, какие гарантии, warning ME cNFT deprecation
- Тесты: list buy sell via ME instruction + client signing Session Key, escrow-less Shyft, USD GameShift checkout
- Запрет: no private keys в Watchtower, read-only, writes via client signing + gasless relay + GameShift gas abstraction

### 8. ENV

```
MAGIC_EDEN_API_KEY
MAGIC_EDEN_BASE_URL
SHYFT_API_KEY
SHYFT_MARKET_BASE_URL
GAMESHIFT_API_KEY
GAMESHIFT_BASE_URL
GAMESHIFT_ENV
```

### 9. Проверка

```
GET /api/marketplace/config — cnft primary Tensor, standard ME+Tensor, in-app Shyft escrow-less GameShift USD
GET /api/marketplace/health — ME + Shyft + GameShift status
GET /api/marketplace/router?gameId=ares1&assetType=cnft — выбор маркетплейса
GET /api/assets/config — cNFT $110/M off-chain Merkle Tree MCC Bubblegum v2 vs standard
GET /api/assets/strategy?gameId=ares1&itemType=common&rarity=common — cNFT vs standard
POST /api/assets/cnft/collection — создать cNFT коллекцию
GET /api/os/config — вся OS включая marketplace layer
```

Детали: server/modules/marketplace/, server/modules/assets/, docs/os/

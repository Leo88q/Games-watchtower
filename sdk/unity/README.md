# Unity SDK — Watchtower OS Integration

## Пакет
`com.solana.unity-sdk` + Watchtower OS wrapper

## Установка
```json
// manifest.json
"com.solana.unity-sdk": "https://github.com/michaelhly/Solana.Unity-SDK.git",
"com.watchtower.unity": "https://github.com/Leo88q/Games-watchtower.git?path=/sdk/unity"
```

## Фичи из брифа
- NFT, RPC, Candy Machine, Phantom deep links, WebGL, Mobile Wallet Adapter, Session Keys

## Быстрый старт

### 1. Identity — Privy + Session Keys
```csharp
using Watchtower.Identity;
using Solana.Unity.SDK;

// Privy login -> auto Solana wallet
var identity = new WatchtowerIdentity(gameId: "ares1");
var user = await identity.LoginWithPrivy(email: "player@example.com");
// user.walletAddress — Solana wallet в secure enclave

// Session Keys — для автоматического подтверждения транзакций
var session = await SessionKeys.CreateSession(
  targetProgramPublicKey: new PublicKey("CgInv111..."),
  topUp: 0.01f, // SOL, риск ограничен только этим
  expiryInMinutes: 60
);
```

### 2. cNFT — массовые предметы $110 за 1M
```csharp
using Watchtower.Assets;

var cnftConfig = new CnftCollectionConfig(
  collectionName: "Potato Common Items",
  gameId: "ares1",
  merkleTree: "mt_ares1_...",
  mcc: "mcc_ares1_...",
  maxSupply: 1_000_000
);
// Cost: $110 for 1M, off-chain, no token/mint account, Merkle Tree + MCC
var assetId = await CnftService.MintV2(
  merkleTree: cnftConfig.merkleTree,
  owner: user.walletAddress,
  metadata: new { name = "Common Potato", uri = "https://..." }
);

// Marketplace — Tensor (ME прекращает индексацию новых cNFT)
var tensorAdapter = new TensorMarketplaceAdapter();
await tensorAdapter.List(assetId, price: 0.01f);
```

### 3. Indexer — Helius LaserStream + Shyft
```csharp
// Watchtower уже настроен на LaserStream gRPC + 24h replay + failover
// WebSocket для UI
// В Unity только отправляем события в Watchtower inbox
WatchtowerAnalytics.Track(new {
  chain = "solana",
  eventType = "PlayerJoined",
  gameId = "ares1",
  wallet = user.walletAddress,
  solana_wallet = user.walletAddress // for GameSight Late ID Binding
});
```

### 4. L2 — Sonic HyperGrid / MagicBlock
```csharp
// Sonic HyperGrid — для игр с высокой частотой
var sonicGrid = new SonicHyperGrid(gameId: "ares1", gridId: "grid_ares1");
await sonicGrid.ExecuteHighFrequency(actions);

// MagicBlock Ephemeral Rollup — sub-10ms + gasless
var magicBlock = new MagicBlockER(gameId: "aof");
await magicBlock.DelegateAccount(playerPda);
await magicBlock.ExecuteGasless(moveAction); // <10ms, gasless
// Состояние возвращается на Solana

// Magic Actions — авто-исполнение по триггерам
await magicBlock.CreateMagicAction(
  trigger: new TimeTrigger("*/5 * * * *"), // каждые 5 мин
  instruction: "harvest_all_ready"
);
```

### 5. Analytics — Helika + GameSight
```csharp
// Helika — кросс-игровой дашборд
WatchtowerAnalytics.TrackHelika("session_started", new {
  campaign_id = "summer2024",
  solana_wallet = user.walletAddress
});

// GameSight — атрибуция: ad -> wallet -> mint
// Нужно передавать solana_wallet как external_id
WatchtowerAnalytics.TrackGameSight("PlayerJoined", new {
  solana_wallet = user.walletAddress, // external_id for Late ID Binding
  gamesight_click_id = clickIdFromUrl
});
```

### 6. Marketplace — Magic Eden + Shyft + GameShift
```csharp
// Magic Eden — 120 QPM free, Bearer for instructions, MCC + Merkle Trees for cNFT
var meInstruction = MagicEdenBuilder.List(
  mint: assetId,
  price: 0.5f,
  mcc: mccAddress,
  merkleTrees: merkleTreeList
);
// Client signs via Session Key

// Shyft — escrow-less, in-app marketplace за несколько дней
var shyftMarket = new ShyftMarketplace(gameId: "ares1");
await shyftMarket.ListEscrowLess(nftAddress, price: 1.0f);
// NFT остаётся в кошельке до продажи

// GameShift — USD платежи, 170+ стран, 100% chargeback protection, газ берёт на себя
var gameShift = new GameShiftClient(apiKey: "...");
var usdListing = await gameShift.CreateListing(assetId, priceUsd: 10);
var purchase = await gameShift.PurchaseWithUsd(usdListing.id, userId: user.id);
```

## Интеграция с Watchtower OS
- Watchtower endpoint: `https://watchtower.studio/api/ingest/solana`
- Identity layer: Privy/Phantom/FirstStep/Altude unified
- Session Keys: `createSession(targetProgram, topUp, expiry)` + `signAndSendTransaction`
- Все газовые сборы через Altude/FirstStep/GameShift абстракцию

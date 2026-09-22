# Промт для Unity команды — интеграция с Watchtower OS

## Роль
Ты Unity разработчик в Leo Games Studio. Твоя игра (ares1 / aof / neonrelay / guttercaps) должна подключиться к Watchtower OS — мультитенантной ОС студии.

## Что уже есть в Watchtower OS
- API: `https://watchtower.studio/api/os/config` и `/api/os/health`
- Identity Layer: Privy + Phantom Connect + FirstStep + Altude unified
- Session Keys: `createSession(targetProgram, topUp, expiry)` + `signAndSendTransaction`
- Assets: cNFT $110/M + Standard NFT, MCC, Merkle Tree, Tensor fallback (ME прекращает индексацию новых cNFT)
- Indexer: Helius LaserStream gRPC 24h replay failover + WS + DAS + Shyft callbacks + Custom PG
- L2: Sonic HyperGrid (выделенный грид, тысячи действий) + Sorada (5ms, 30-40x) + Rush ECS + REPLA repla-cli + MagicBlock ER sub-10ms gasless + Magic Actions
- Analytics: Helika cross-game dashboard + GameSight attribution (solana_wallet as external_id Late ID Binding)
- Marketplace: Magic Eden 120 QPM free Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ стран 100% chargeback газ берёт на себя
- Engine SDK: Solana.Unity-SDK — NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys из коробки

## Твоя задача — внедрить в Unity проект

### 1. Установи Solana.Unity-SDK + Watchtower wrapper
```json
// Packages/manifest.json
"com.solana.unity-sdk": "https://github.com/michaelhly/Solana.Unity-SDK.git",
"com.watchtower.unity": "https://github.com/Leo88q/Games-watchtower.git?path=/sdk/unity"
```

### 2. Identity — общий слой
```csharp
using Watchtower.Identity;
using Solana.Unity.SDK;

var identity = new WatchtowerIdentity(gameId: "ares1"); // замени на свой gameId
// Privy: email/social -> auto Solana wallet в enclave, export возможен
var user = await identity.LoginWithPrivy(email: "player@example.com");
// Phantom Connect Kit: OAuth-логин, мгновенное создание кошелька
var phantomUser = await identity.LoginWithPhantom();
// FirstStep: гостевой режим + спонсорство газа — игрок начинает без кошелька
var guest = await identity.CreateGuestWallet();
// Altude: gasless relay fallback
```

Требования:
- При первом входе через email/social автоматически создаётся Solana-кошелёк (Privy useCreateWallet, useSolanaWallets)
- Ключи в защищённом анклаве, экспорт возможен
- Гостевой режим для онбординга без кошелька
- Все кошельки линкуются в cross-game PDA `studio_profile` (Anchor контракт CgInv111...)

### 3. Session Keys — JWT для Web3
```csharp
// Временные ключи с ограниченной областью, как JWT
// Работают как вторичные подписанты для частых действий без подтверждения каждой транзакции
var session = await SessionKeys.CreateSession(
  targetProgramPublicKey: new PublicKey("CgInv111111111111111111111111111111111111111"),
  topUp: 0.01f, // SOL, риск ограничен только этим keypair + средства на нём
  expiryInMinutes: 60
);
// signAndSendTransaction подписывает без раскрытия приватного ключа основного кошелька
var result = await session.SignAndSendTransaction(gameActionTx);
// Доступна в Solana Unity SDK из коробки, поддерживает пользовательские программы
```

Реализуй:
- `createSession(targetProgramPublicKey, topUp, expiryInMinutes)` на клиенте
- `signAndSendTransaction` для всех частых действий (move, harvest, craft, play)
- Запрети через scope: `withdraw_treasury`, `update_authority`, `mint_unlimited`
- Храни session token в `PlayerPrefs`, авто-рефреш за 5 мин до expiry

### 4. Assets — cNFT vs Standard
```csharp
using Watchtower.Assets;

// Массовые предметы — cNFT: до 1M за $110, off-chain, нет token/mint аккаунта, Merkle Tree + MCC, Bubblegum v2
var cnftCollection = new CnftCollectionConfig(
  collectionName: "Common Potatoes",
  gameId: "ares1",
  merkleTree: "mt_ares1_...", // из Watchtower API /api/assets/cnft/collection
  mcc: "mcc_ares1_...", // Metaplex Certified Collection
  maxSupply: 1_000_000
);
var assetId = await CnftService.MintV2(merkleTree, owner: user.walletAddress, metadata);

// Редкие — Standard NFT: отдельный mint/token аккаунт
var rareNft = await StandardNftService.MintStandard(...);

// Стратегия: cNFT для массовых, standard для редких
var strategy = await WatchtowerAssets.GetStrategy(gameId: "ares1", itemType: "common", rarity: "common");
// recommendation: cNFT, reason: x10000 cheaper
```

Важно:
- Magic Eden прекращает индексацию новых cNFT — используй Tensor Bubblegum v2 для торговли
- Для cNFT нужен MCC-адрес и список Merkle Tree addresses для ME
- Shyft escrow-less: NFT остаётся в кошельке до продажи
- GameShift: USD платежи, 170+ стран, 100% защита от чарджбэков, газ берёт на себя

### 5. Indexer — отправка событий в Watchtower
```csharp
// Watchtower уже настроен на LaserStream gRPC + 24h replay + failover + WS + DAS + Shyft + PG
// Тебе нужно только отправлять события в inbox
WatchtowerAnalytics.Track(new {
  chain = "solana",
  cluster = "mainnet-beta",
  eventType = "PlayerJoined", // или SessionStarted, RewardClaimed, AssetTransferred и т.д.
  gameId = "ares1",
  programId = "CgInv111...",
  payload = new {
    solana_wallet = user.walletAddress, // важно для GameSight Late ID Binding!
    sessionId = session.sessionToken,
    // ...
  },
  source = "unity-sdk"
});
// Endpoint: POST /api/ingest/solana
// Canonical identity: cluster+slot+signature+instructionIndex+innerIndex для дедупликации
```

События обязательные:
- WalletConnected, PlayerJoined, SessionStarted, SessionEnded, FirstAction
- MatchStarted, MatchFinished, QuestCompleted, AssetCreated, AssetTransferred
- PurchaseCompleted, RewardGranted, RewardClaimed, TokenMinted, TokenBurned
- Security: FraudSignalCreated, PlayerQuarantined

### 6. L2 — выбор роллапа
```csharp
// High frequency (ARES-1, Neon Relay) — Sonic HyperGrid: выделенный грид, тысячи одновременных действий без конкуренции
var sonicGrid = new SonicHyperGrid(gameId: "ares1", gridId: "grid_ares1");
await sonicGrid.Execute(action);

// Reads — Sorada: 30-40x быстрее RPC, 5ms для лидербордов, инвентаря
var inventory = await sonicGrid.Sorada.GetAssets(owner);

// Declarative — Rush ECS: описываешь мир и сущности в конфигах, SDK генерирует контракты
var worldConfig = new { entities = new[] { new { name = "Player", components = new[] { "Position", "Inventory" } } } };

// Casual (AOF, GUTTERCAPS) — REPLA repla-cli L3 + MagicBlock ER sub-10ms gasless
var magicBlock = new MagicBlockER(gameId: "aof");
await magicBlock.DelegateAccount(playerPda);
await magicBlock.ExecuteGasless(moveTx); // <10ms, gasless, state returns to Solana
await magicBlock.CreateMagicAction(trigger: TimeTrigger("*/5 * * * *"), instruction: "harvest_all_ready");
```

Запроси у Watchtower OS роутер:
```
GET /api/l2/router?gameId=ares1&tps=high&ux=gasless
-> { provider: "sonic-svm", component: "HyperGrid", reason: "high tps need isolation" }
```

### 7. Analytics — Helika + GameSight
```csharp
// Helika — кросс-игровой дашборд: Web2 + in-game + on-chain, acquisition, LiveOps, A/B, 10+ сетей
WatchtowerAnalytics.TrackHelika("session_started", new {
  campaign_id = "summer2024",
  solana_wallet = user.walletAddress
});

// GameSight — сквозная атрибуция ad -> on-chain: ad_click -> player_joined (external_id) -> wallet_connected (solana_wallet) -> mint/buy/sell (Anonymous Event with Wallet ID)
// Для атрибуции нужно передавать solana_wallet как external_id в игровых событиях (Late ID Binding)
WatchtowerAnalytics.TrackGameSight("PlayerJoined", new {
  solana_wallet = user.walletAddress, // external_id!
  gamesight_click_id = clickIdFromUrl
});
// Отслеживает mint, buy, sell, transfer, burn как Anonymous Events
```

### 8. Marketplace — листинг и покупка
```csharp
// Magic Eden — 120 QPM free, Bearer для инструкций, MCC + Merkle Trees для cNFT
var meIx = MagicEdenBuilder.List(mint: assetId, price: 0.5f, mcc: mccAddr, merkleTrees: mtList);
// Client signs via Session Key, Watchtower не пишет в блокчейн

// Shyft — escrow-less, in-app marketplace за несколько дней, stats API в один вызов
var shyftMarket = new ShyftMarketplace(gameId: "ares1");
await shyftMarket.ListEscrowLess(nftAddress, price: 1.0f); // NFT остаётся в кошельке до продажи

// GameShift — USD, 170+ стран, 100% chargeback protection, газ берёт на себя, без знания блокчейна
var gs = new GameShiftClient(apiKey: Env.GAMESHIFT_API_KEY);
var gsUser = await gs.CreateUser(); // self-custodial
var gsAsset = await gs.CreateAsset(collectionId, name, imageUrl); // mint без знания блокчейна
var listing = await gs.ListForUsd(gsAsset.id, priceUsd: 10);
var purchase = await gs.PurchaseWithUsd(listing.id, gsUser.id); // USD checkout
```

### 9. Cross-game inventory — Anchor PDA
```csharp
// Используй контракт CgInv111... — общие PDA для кросс-игрового инвентаря
var profilePda = PublicKey.FindProgramAddress(new[] { Encoding.UTF8.GetBytes("studio_profile"), ownerPubkey }, programId);
await program.Call("create_profile", new { game_id = "ares1" });
await program.Call("add_cross_game_item", new { asset_id = assetId, source_game = "ares1", item_type = "potato", rarity = "common", is_cnft = true });
await program.Call("link_item_to_game", new { asset_id = assetId, target_game = "neonrelay" });
// Теперь предмет из ARES-1 доступен в Neon Relay
```

### 10. Что сдать
- Unity проект с интеграцией всех слоёв
- `WATCHTOWER_INTEGRATION.md` с game_id, program_ids, network, stage, data_quality
- Скриншоты flow: guest -> Privy -> Session Keys -> cNFT mint -> marketplace list
- Тесты: `npm run smoke` аналог для Unity — play mode tests для session keys, cNFT, indexer
- ENV без секретов: `PRIVY_APP_ID`, `HELIUS_API_KEY`, `SHYFT_API_KEY`, `GAMESHIFT_API_KEY`, `SONIC_API_KEY`, `MAGICBLOCK_API_KEY` — только имена переменных
- Доказательство: транзакции в devnet с session key, cNFT assetId, marketplace listing

### 11. Запреты
- Не передавай private keys, payer keypair, upgrade authority, treasury signer в Watchtower
- Watchtower — read-only, не может делать blockchain writes
- Все writes через client-side signing (Phantom, MWA, Session Key) + gasless relay (FirstStep/Altude/GameShift)
- Mainnet только после аудита Godot SDK и внешнего аудита Anchor программ

### 12. API для проверки
```
GET /api/os/config — вся конфигурация OS
GET /api/sdk/unity?gameId=ares1 — Unity SDK setup для твоей игры
GET /api/identity/health — статус Privy/Phantom/FirstStep/Altude
GET /api/session-keys/health — активные сессии
POST /api/session-keys/create — создать сессию (тест)
GET /api/assets/strategy?gameId=ares1&itemType=common&rarity=common — cNFT vs standard
GET /api/l2/router?gameId=ares1&tps=high — выбор роллапа
GET /api/marketplace/router?gameId=ares1&assetType=cnft — выбор маркетплейса
POST /api/ingest/solana — отправка события
```

Удачной интеграции! Все детали в `sdk/unity/README.md` и `docs/os/`.

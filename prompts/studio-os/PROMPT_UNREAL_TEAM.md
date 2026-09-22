# Промт для Unreal команды — интеграция с Watchtower OS

## Роль
Ты Unreal Engine разработчик в Leo Games Studio. Подключи свою игру к Watchtower OS.

## Что уже есть
- Watchtower OS 7 слоёв + 5 движков
- Unreal SDKs: VAR META open SDK (контракты + кошельки в движке) + Bifrost C# (Solnet) C++ Blueprints Metaplex NFT минтинг платежи

## Задачи

### 1. Установка
```
VAR META: Plugins/VARMeta/ clone https://github.com/var-meta
Bifrost: Marketplace or GitHub, requires Solnet C# bridge
```

### 2. Identity — VAR META + Bifrost
```cpp
#include "VarMeta.h"
UVarMetaWallet* Wallet = UVarMetaWallet::CreateWallet();
Wallet->Connect(FVarMetaWalletConnectDelegate::CreateLambda([](FString PubKey){
  WatchtowerIdentity::LinkWallet(PubKey, "guttercaps");
}));
// Privy/Phantom unified via HTTP OAuth
// FirstStep guest mode + gas sponsorship
// Altude gasless relay fallback
// Cross-game PDA studio_profile
```

### 3. Session Keys — временный keypair 0.01 SOL
```cpp
// C++
FKeypair SessionKey = FKeypair::GenerateRandom();
FTransaction Tx = BuildGameActionTx(SessionKey.PublicKey, "move");
Tx.Sign(SessionKey);
RpcClient.SendTransaction(Tx);
// Риск ограничен 0.01 SOL, scope: no withdraw_treasury, update_authority

// C# Bifrost
var sessionKey = new Account();
await rpc.RequestAirdropAsync(sessionKey.PublicKey, 10000000);
var tx = TransactionBuilder.BuildGameAction(sessionKey.PublicKey, "move");
tx.Sign(sessionKey);
```

### 4. Assets — cNFT $110/M + Standard
```cpp
// Bifrost C# Metaplex minting
var metaplex = new MetaplexClient(rpc);
var nft = await metaplex.MintNft(wallet.Account, metadata);

// cNFT — off-chain, Merkle Tree + MCC, Bubblegum v2
var cnftService = new CnftService(rpc);
var cnftId = await cnftService.MintV2(merkleTree: "mt_guttercaps", collection: "mcc_guttercaps", owner: wallet.PublicKey, metadata);
// ME прекращает индексацию новых cNFT — Tensor Bubblegum v2
// Shyft escrow-less, GameShift USD 170+ стран 100% chargeback газ берёт на себя
```

### 5. Indexer — отправка событий в Watchtower
```cpp
FHttpRequestRef Request = FHttpModule::Get().CreateRequest();
Request->SetURL("https://watchtower.studio/api/ingest/solana");
Request->SetVerb("POST");
Request->SetHeader("Content-Type", "application/json");
Request->SetContentAsString(JsonEventWithSolanaWallet); // solana_wallet для GameSight Late ID Binding!
Request->ProcessRequest();
// Events: WalletConnected, PlayerJoined, SessionStarted, MatchStarted, RewardClaimed, etc
// Canonical identity: cluster+slot+signature+instructionIndex+innerIndex
```

### 6. L2 — Sonic HyperGrid + MagicBlock via HTTP
```cpp
// Sonic HyperGrid — dedicated grid, thousands concurrent no contention
FHttpRequestRef SonicReq = FHttpModule::Get().CreateRequest();
SonicReq->SetURL("https://api.mainnet-alpha.sonic.game/execute");
SonicReq->SetContentAsString(JsonGridAction);
SonicReq->ProcessRequest();

// Sorada 5ms reads
// Rush ECS declarative — world config -> SDK generates contracts

// MagicBlock ER sub-10ms gasless
FHttpRequestRef Delegate = FHttpModule::Get().CreateRequest();
Delegate->SetURL("https://api.mainnet.magicblock.app/delegate");
Delegate->SetContentAsString("{\"account\":\"" + PlayerPda + "\"}");
Delegate->ProcessRequest();
FHttpRequestRef Gasless = FHttpModule::Get().CreateRequest();
Gasless->SetURL("https://api.mainnet.magicblock.app/execute_gasless");
Gasless->SetContentAsString(TxBase64);
// Magic Actions auto triggers time/account_change/custom
```

### 7. Analytics — Helika + GameSight
```cpp
WatchtowerAnalytics::Track("session_started", {{"campaign_id", "summer2024"}, {"solana_wallet", WalletPubKey}});
WatchtowerAnalytics::Track("PlayerJoined", {{"solana_wallet", WalletPubKey}, {"gamesight_click_id", ClickId}}); // external_id Late ID Binding
// On-chain mint buy sell transfer burn as Anonymous Events with Wallet ID
```

### 8. Marketplace
```cpp
FMagicEdenInstruction List = MagicEden::BuildListInstruction(Mint, Price, Mcc, MerkleTrees); // 120 QPM free Bearer MCC+MT
FShyftMarketplace Market("guttercaps");
Market.ListEscrowLess(NftAddress, Price); // NFT stays in wallet until sale, in-app за дни, stats API
FGameShiftClient Gs(ApiKey);
auto User = Gs.CreateUser(); // self-custodial
auto Asset = Gs.CreateAsset(CollectionId, Name, ImageUrl); // no blockchain knowledge
auto Listing = Gs.ListForUsd(Asset.Id, 10.0f); // USD 170+ стран 100% chargeback газ берёт на себя
```

### 9. Cross-game PDA
```cpp
auto profilePda = FindPda("studio_profile", ownerPubkey, CgInvProgram);
program.Call("create_profile", {{"game_id", "guttercaps"}});
program.Call("add_cross_game_item", {{"asset_id", assetId}, {"source_game", "guttercaps"}, {"is_cnft", true}});
program.Call("link_item_to_game", {{"asset_id", assetId}, {"target_game", "ares1"}});
```

### 10. Что сдать
- Unreal проект с VAR META или Bifrost
- WATCHTOWER_INTEGRATION.md game_id program_ids network stage data_quality
- Devnet tx: session key, cNFT, marketplace list
- ENV имена без значений
- Запрет: no private keys в Watchtower, read-only, writes via client signing + gasless relay

API: /api/os/config, /api/sdk/unreal?gameId=guttercaps, /api/assets/strategy, /api/l2/router, /api/marketplace/router

Детали: sdk/unreal/README.md

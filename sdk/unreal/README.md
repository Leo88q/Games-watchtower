# Unreal Engine SDK — Watchtower OS

## VAR META + Bifrost
- VAR META — открытый SDK для взаимодействия с контрактами и управления кошельками прямо в движке
- Bifrost — C# (Solnet), C++ и Blueprints, минтинг Metaplex NFT, встроенные игровые платежи

## Установка
### VAR META
```
Plugins/VARMeta/ — clone https://github.com/var-meta
Enable in .uproject
```

### Bifrost
```
Marketplace or GitHub
Requires Solnet C# bridge
```

## Быстрый старт

### VAR META — Blueprints + C++
```cpp
#include "VarMeta.h"

// Wallet management in-engine
UVarMetaWallet* Wallet = UVarMetaWallet::CreateWallet();
Wallet->Connect(FVarMetaWalletConnectDelegate::CreateLambda([](FString PubKey) {
  UE_LOG(LogTemp, Log, TEXT("Connected: %s"), *PubKey);
  // Privy/Phantom unified identity
  WatchtowerIdentity::LinkWallet(PubKey, "ares1");
}));

// Contract interaction
UVarMetaContract* Contract = UVarMetaContract::Create("CgInv111...");
Contract->CallMethod("add_cross_game_item", {
  {"asset_id", AssetId},
  {"source_game", "ares1"},
  {"is_cnft", true}
});
```

### Bifrost — C# + Blueprints
```csharp
using Solnet.Wallet;
using Metaplex;
using Bifrost;

// Wallet
var wallet = new Wallet();
var rpc = ClientFactory.GetClient("https://api.mainnet-beta.solana.com");

// Metaplex NFT minting
var metaplex = new MetaplexClient(rpc);
var nft = await metaplex.MintNft(wallet.Account, new MetaplexMetadata {
  Name = "Legendary Sword",
  Uri = "https://assets.ares1.studio/sword.json"
});

// cNFT — $110 for 1M
var cnftService = new CnftService(rpc);
var cnftId = await cnftService.MintV2(
  merkleTree: "mt_ares1",
  collection: "mcc_ares1",
  owner: wallet.Account.PublicKey,
  metadata: new { name = "Common Potato" }
);

// In-game payments
var payment = await BifrostPayment.ProcessPayment(wallet, amount: 0.1f, treasury: "STrEaSuRy111...");

// Session Keys — временный keypair
var sessionKey = new Account(); // random
await rpc.RequestAirdropAsync(sessionKey.PublicKey, 10000000); // 0.01 SOL
var tx = TransactionBuilder.BuildGameAction(sessionKey.PublicKey, "move");
tx.Sign(sessionKey);
await rpc.SendTransactionAsync(tx); // auto without main wallet confirmation
```

### Identity — общий слой
```cpp
// FirstStep guest mode
FGuestWallet Guest = FirstStep::CreateGuestWallet("neonrelay");
// Guest -> Privy -> Phantom upgrade path
// Gas sponsorship via FirstStep/Altude

// Privy equivalent in Unreal — OAuth via HTTP
FHttpRequestRef Request = FHttpModule::Get().CreateRequest();
Request->SetURL("https://auth.privy.io/api/v1/oauth");
Request->SetVerb("POST");
```

### L2 — Sonic HyperGrid + MagicBlock
```cpp
// Sonic HyperGrid — dedicated grid, thousands concurrent
FHttpRequestRef SonicRequest = FHttpModule::Get().CreateRequest();
SonicRequest->SetURL("https://api.mainnet-alpha.sonic.game/execute");
SonicRequest->SetContentAsString(JsonGridAction);
SonicRequest->ProcessRequest(); // isolated, no contention

// MagicBlock ER — sub-10ms + gasless
FHttpRequestRef Delegate = FHttpModule::Get().CreateRequest();
Delegate->SetURL("https://api.mainnet.magicblock.app/delegate");
Delegate->SetContentAsString("{\"account\":\"" + PlayerPda + "\"}");
Delegate->ProcessRequest();

FHttpRequestRef Gasless = FHttpModule::Get().CreateRequest();
Gasless->SetURL("https://api.mainnet.magicblock.app/execute_gasless");
Gasless->SetContentAsString(TxBase64);
// <10ms, gasless, state returns to Solana

// Magic Actions — auto execution by triggers
FHttpRequestRef Action = FHttpModule::Get().CreateRequest();
Action->SetURL("https://api.mainnet.magicblock.app/actions");
Action->SetContentAsString("{\"trigger\":{\"type\":\"time\",\"cron\":\"*/5 * * * *\"},\"instruction\":\"harvest\"}");
```

### Analytics — Helika + GameSight
```cpp
// Helika cross-game dashboard
WatchtowerAnalytics::Track("session_started", {
  {"campaign_id", "summer2024"},
  {"solana_wallet", WalletPubKey}
});

// GameSight — solana_wallet as external_id for Late ID Binding
WatchtowerAnalytics::Track("PlayerJoined", {
  {"solana_wallet", WalletPubKey}, // external_id
  {"gamesight_click_id", ClickId}
});
// On-chain mint/buy/sell/transfer/burn tracked as Anonymous Events with Wallet ID
```

### Marketplace
```cpp
// Magic Eden — 120 QPM free, Bearer for instructions, MCC + Merkle Trees for cNFT
FMagicEdenInstruction List = MagicEden::BuildListInstruction(Mint, Price, Mcc, MerkleTrees);
// Client signs via Session Key

// Shyft — escrow-less, in-app marketplace за несколько дней
FShyftMarketplace Market("ares1");
Market.ListEscrowLess(NftAddress, Price); // NFT stays in wallet until sale

// GameShift — USD, 170+ countries, 100% chargeback, gas abstraction
FGameShiftClient Gs(ApiKey);
auto User = Gs.CreateUser(); // self-custodial
auto Asset = Gs.CreateAsset(CollectionId, Name, ImageUrl); // no blockchain knowledge
auto Listing = Gs.ListForUsd(Asset.Id, 10.0f);
auto Purchase = Gs.PurchaseWithUsd(Listing.Id, User.Id);
```

## Watchtower OS
- Endpoint: `/api/ingest/solana`
- Identity: Privy/Phantom/FirstStep/Altude unified
- Session Keys: temporary keypair 0.01 SOL limit

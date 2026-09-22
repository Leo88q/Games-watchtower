# Turbo.Computer (Rust) — Watchtower OS

## Лёгкий движок с полной поддержкой RPC и AI-инструментами для генерации игр
http://Turbo.Computer

## Установка
```bash
cargo install turbo-cli
turbo init my-game --template solana
```

## Быстрый старт (Rust)

### Game struct + RPC
```rust
use turbo::prelude::*;
use solana_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;

#[turbo::game]
struct PotatoColony {
    player: Player,
    fields: Vec<Field>,
    wallet: Option<Pubkey>,
}

impl Game for PotatoColony {
    fn init(&mut self) {
        // Full RPC support
        let client = RpcClient::new("https://api.mainnet-beta.solana.com".to_string());
        // AI tools for generation
        let level = turbo::ai::generate_level("potato colony on Solana, 4 player types, farming economy");
        self.fields = level.fields;
    }

    fn update(&mut self) {
        if turbo::input::key_pressed(Key::Space) {
            self.harvest();
        }
    }
}

impl PotatoColony {
    fn harvest(&mut self) {
        // Call Anchor program via RPC
        let client = RpcClient::new("https://api.mainnet-beta.solana.com".to_string());
        // Build instruction for CgInv111... cross_game_inventory
        // Send via session key (0.01 SOL limit)
    }
}
```

### Identity — Privy/FirstStep analog in Rust
```rust
use watchtower_identity::{create_guest_wallet, upgrade_to_privy};

let guest = create_guest_wallet("ares1", device_id);
// Guest mode + gas sponsorship
// Upgrade path to Privy/Phantom

// Session Keys
let session_key = Keypair::new(); // temporary
client.request_airdrop(&session_key.pubkey(), 10_000_000)?; // 0.01 SOL
// Use for frequent actions — risk limited to 0.01 SOL
```

### cNFT — $110 for 1M
```rust
use mpl_bubblegum::instructions::MintV2CpiBuilder;

let mint_ix = MintV2CpiBuilder::new()
    .merkle_tree(merkle_tree_pubkey)
    .tree_authority(tree_authority)
    .leaf_owner(owner)
    .collection(mcc_pubkey)
    .metadata(metadata)
    .build()?;
// Off-chain, no token/mint account, Merkle Tree + MCC
// Tensor for trading — ME stops indexing new cNFT
```

### L2 — Sonic + MagicBlock
```rust
// Sonic HyperGrid — dedicated grid
let sonic_client = sonic_sdk::Client::new("https://api.mainnet-alpha.sonic.game", api_key);
sonic_client.execute_in_grid("ares1", action).await?; // thousands concurrent, no contention

// Sorada — 30-40x faster reads, 5ms
let inventory = sonic_client.sorada().get_assets_by_owner(wallet).await?; // 5ms

// MagicBlock ER — sub-10ms + gasless
let magic_client = magicblock_sdk::Client::new("https://api.mainnet.magicblock.app", api_key);
magic_client.delegate_account(player_pda).await?;
magic_client.execute_gasless(tx).await?; // <10ms, gasless, state returns to Solana
```

### AI Generation
```bash
turbo ai generate --prompt "farming game with Solana economy, 4 player types, cross-game inventory"
turbo ai asset --type "potato" --rarity "common" --format "cNFT" --collection "mcc_ares1"
turbo ai system --name "HarvestSystem" --ecs "Rush"
```

### Analytics
```rust
// Helika + GameSight
watchtower_sdk::track_event("PlayerJoined", json!({
    "solana_wallet": wallet.to_string(), // external_id for GameSight Late ID Binding
    "campaign_id": "summer2024"
}));
```

## Watchtower OS integration
- `cargo add watchtower-sdk`
- Events to `/api/ingest/solana`
- Identity unified
- Marketplace via Shyft/GameShift HTTP

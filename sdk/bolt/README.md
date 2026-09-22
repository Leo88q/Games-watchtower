# Bolt — Watchtower OS v2 Integration

## Source
magicblock-labs/bolt fully on-chain autonomous worlds verifiable

## Install
```bash
cargo install bolt-cli
bolt init --game aof
npm i @magicblock-labs/bolt-sdk
```

## Watchtower Wiring
- server/modules/infra/bolt.js setupBolt FOCG fully on-chain verifiable
- API: GET /api/infra/bolt?gameId=aof
- Indexer: LaserStream gRPC PlotPlanted RaceStarted CapShot RaceFinished FighterSummoned BotCreated + raw_events canonical identity

## Quick Start
```bash
bolt init --game aof
# defines world.toml entities components systems
bolt build
bolt deploy --network devnet
```

```rust
// components
#[component]
struct Position { x: i64, y: i64 }
#[component]
struct Crop { growth_stage: u8, owner: Pubkey }

// systems
#[system]
fn plant_system(ctx: Context<Plant>, position: Position) -> Result<()> {
  // fully on-chain logic verifiable
  emit!(PlotPlanted { entity: ctx.entity, position });
  Ok(())
}
```

```ts
import { BoltClient } from '@magicblock-labs/bolt-sdk'
const bolt = new BoltClient({ gameId: 'aof', worldId: 'world_aof' })
const entity = await bolt.createEntity()
await bolt.addComponent(entity, { type: 'Position', data: {x:0,y:0} })
await bolt.executeSystem('plant_system', entity)
// MagicBlock ER delegate for sub-10ms gasless
await bolt.delegateToER(entity)
await bolt.executeGasless('plant_system', entity) // <10ms
await bolt.commitState(entity) // returns to Solana
```

## MagicBlock ER + Magic Actions
- delegate_account ER execute_in_er <10ms commit_state returns to Solana
- Magic Actions auto execution triggers: time cron every 5 min harvest, account_change level up auto grant reward, custom match ends settle rewards
- Use for casual gasless UX AOF GutterCaps + high frequency NeonRelay auto settle

## Cross-game
- studio_profile PDA stores Bolt entity IDs + ARC Entity IDs
- Position Health Player common Components interoperability via ARC
- cNFT $110/M Bubblegum v2 Tensor primary + Standard NFT + Marketplace ME Shyft GameShift Tensor Gamba Husks Aureus RACE multichain

# ARC Framework — Watchtower OS v2 Integration

## Source
JumpCrypto/sol-arc Entity-Component interoperability standard composability

## Install
```bash
cargo add arc-framework
# Anchor: arc program
npm i @arc-framework/sdk
```

## Watchtower Wiring
- server/modules/infra/arc.js setupArcFocg Entity Component System interoperability
- API: GET /api/infra/arc?gameId=ares1
- Indexer: LaserStream gRPC ComponentAdded ComponentUpdated EntityCreated + raw_events canonical identity

## Concept
Entity — game object (crop, race, cap, player, fighter)
Component — data: Position, GrowthStage, Health, Owner, Item source_game aof|neonrelay|guttercaps|ares1 is_cnft asset_id
System — logic: harvest, craft, MovementSystem, RaceSystem, shooting, combat

## Quick Start
```rust
use arc_framework::{Entity, Component, System};

#[derive(Component)]
struct Position { x: f32, y: f32 }
#[derive(Component)]
struct Owner { wallet: Pubkey, source_game: String, is_cnft: bool }

#[derive(System)]
struct HarvestSystem;
impl System for HarvestSystem { fn execute(&self, entities: Vec<Entity>) {...} }
```

```ts
// JS SDK
import { ArcClient } from '@arc-framework/sdk'
const arc = new ArcClient({ gameId: 'aof' })
const entity = await arc.createEntity({ components: [{ type: 'Position', data: {x:0,y:0} }, { type: 'Owner', data: {wallet, source_game:'aof', is_cnft:true, asset_id }}] })
await arc.addComponent(entity, { type: 'GrowthStage', data: { stage: 0 } })
await arc.executeSystem('HarvestSystem', entity)
```

## Cross-game Interoperability
- Same Components across games via studio_profile PDA stores ARC Entity IDs
- Position Health Owner Item common across aof neonrelay guttercaps ares1
- Materialized view cross-game inventory PostgreSQL TimescaleDB Redis tenant_id RLS

## L2
- MagicBlock ER sub-10ms gasless delegate executeGasless + Sonic HyperGrid high frequency + Sorada 5ms reads + Rush ECS declarative world config generates Anchor contracts + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router

## Marketplace & Assets
- cNFT $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated + Standard NFT + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea

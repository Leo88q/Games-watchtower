/**
 * Bolt (magicblock-labs/bolt) — высокопроизводительный фреймворк для полностью ончейн-игр (Fully On Chain Games) и автономных миров, работающий на Solana SVM
 * Подходит для игр где вся логика должна быть прозрачной и проверяемой, без доверия к серверу
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'

export const BOLT_CONFIG = {
  framework: 'Bolt',
  repo: 'https://github.com/magicblock-labs/bolt',
  owner: 'magicblock-labs',
  purpose: 'high-performance framework for Fully On Chain Games (FOCG) and autonomous worlds on Solana SVM',
  keyIdea: 'Вся логика прозрачная и проверяемая, без доверия к серверу — Fully On Chain',
  features: {
    fullyOnChain: true,
    autonomousWorlds: true,
    highPerformance: true,
    svm: true,
    ecs: true, // Entity Component System similar to ARC
    magicBlockIntegration: true, // Works with MagicBlock ER sub-10ms gasless
  },
  comparison: {
    vsArc: 'ARC — standard for data representation Entity-Component separation. Bolt — full framework for FOCG execution + world, includes ARC-like ECS + systems + on-chain execution',
    vsRush: 'Rush ECS (Sonic) — declarative config generates contracts, Sonic-specific. Bolt — general FOCG framework, works on Solana mainnet + MagicBlock ER + Sonic',
  }
}

export function boltFrameworkSetup({ gameId } = {}) {
  return {
    framework: BOLT_CONFIG.framework,
    gameId,
    repo: BOLT_CONFIG.repo,
    purpose: BOLT_CONFIG.purpose,
    keyIdea: BOLT_CONFIG.keyIdea,
    features: BOLT_CONFIG.features,
    install: {
      cargo: 'cargo add bolt',
      cli: 'cargo install bolt-cli',
      init: `bolt init ${gameId}`,
      clone: `git clone https://github.com/magicblock-labs/bolt`,
    },
    concepts: {
      world: 'World — autonomous world container, on-chain program that holds all entities',
      entity: 'Entity — ID for object in world',
      component: 'Component — data attached to entity, stored on-chain, transparent verifiable',
      system: 'System — on-chain logic that operates on components, fully on-chain no server trust',
      fullyOnChain: 'All logic on-chain — no off-chain server, verifiable, transparent',
    },
    codeExamples: {
      cli: `
bolt init ${gameId} --template farming
# Creates:
# programs/${gameId}/src/lib.rs — Bolt world + components + systems
# app/ — JS client
# tests/

bolt build
bolt deploy --network devnet
bolt world create --network devnet
`,
      rust: `
use bolt::prelude::*;

#[component]
pub struct Position {
    #[max_len(100)]
    pub x: i64,
    pub y: i64,
}

#[component]
pub struct Player {
    pub owner: Pubkey,
    pub score: u64,
}

#[component]
pub struct PotatoField {
    pub growth_stage: u8,
    pub owner: Pubkey,
    pub planted_at: i64,
}

#[system]
pub fn plant_potato(ctx: Context<PlantPotato>, x: i64, y: i64) -> Result<()> {
    // Fully on-chain logic — no server trust, transparent verifiable
    let field = &mut ctx.accounts.field;
    field.x = x;
    field.y = y;
    field.growth_stage = 0;
    field.owner = ctx.accounts.owner.key();
    field.planted_at = Clock::get()?.unix_timestamp;

    // Emit event for Watchtower indexer
    emit!(PotatoPlanted { owner: field.owner, x, y, timestamp: field.planted_at });
    Ok(())
}

#[system]
pub fn harvest_potato(ctx: Context<HarvestPotato>) -> Result<()> {
    let field = &mut ctx.accounts.field;
    require!(field.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);
    require!(Clock::get()?.unix_timestamp - field.planted_at > 60, ErrorCode::NotReady); // 60 sec growth
    field.growth_stage = 2; // harvested

    emit!(PotatoHarvested { owner: field.owner, x: field.x, y: field.y, reward: 10 });
    Ok(())
}

// World — autonomous world
#[world]
pub struct World {
    // Holds all entities
}
`,
      jsClient: `
import { BoltClient } from '@magicblock-labs/bolt'
import { PublicKey } from '@solana/web3.js'

const bolt = new BoltClient(connection, worldId)
const playerEntity = await bolt.createEntity()
await bolt.addComponent(playerEntity, "Player", { owner: wallet.publicKey, score: 0 })
await bolt.addComponent(playerEntity, "Position", { x: 0, y: 0 })

// Call system — fully on-chain
await bolt.executeSystem("plant_potato", { x: 10, y: 20 }, { field: fieldPda, owner: wallet.publicKey })

// Watchtower integration
await fetch('/api/ingest/solana', {
  method: 'POST',
  body: JSON.stringify({
    eventType: 'PotatoPlanted',
    gameId: '${gameId}',
    payload: { x: 10, y: 20, solana_wallet: wallet.publicKey.toString() }
  })
})
`,
      magicBlockER: `
# Bolt + MagicBlock ER — Fully On Chain + sub-10ms gasless
# Bolt world deployed on Solana mainnet
# Entities delegated to MagicBlock ER for <10ms execution gasless
# State committed back to Solana

# 1. Deploy Bolt world on Solana
bolt deploy --network mainnet

# 2. Delegate entities to MagicBlock ER
await magicBlock.delegateAccount(fieldPda) // field entity now in ER

# 3. Execute systems in ER — <10ms gasless
await magicBlock.executeGasless(plantPotatoTx) // plant in ER <10ms

# 4. State committed to Solana — verifiable fully on-chain
# All logic still fully on-chain, just execution in ER for performance + gasless UX

# Magic Actions — auto harvest every 5 min via trigger
await magicBlock.createAction({
  trigger: { type: "time", cron: "*/5 * * * *" },
  system: "harvest_potato",
  world: worldId
})
`,
      crossGame: `
# Bolt + ARC + cross-game — ideal for studio

# ARES-1 Bolt world: Position + PotatoField + Player components
# Neon Relay Bolt world: Position + Player + RaceResult components
# Both use Position component — interoperability!

# ARC standard ensures same Component definitions across games
# Bolt provides execution framework for those Components fully on-chain

# Watchtower studio_profile PDA stores Bolt entity IDs owned by wallet
# Cross-game: potato entity from ARES-1 Position can be used as cosmetic in Neon Relay MovementSystem
`,
    },
    benefits: {
      fullyOnChain: 'Вся логика прозрачная проверяемая без доверия серверу — FOCG',
      highPerformance: 'High-performance on Solana SVM + MagicBlock ER sub-10ms gasless',
      autonomousWorlds: 'Автономные миры — world container holds all entities, systems operate on-chain',
      verifiable: 'Verifiable — anyone can verify game logic on-chain',
      magicBlock: 'Works with MagicBlock ER for gasless UX + sub-10ms while still fully on-chain',
      arcCompatible: 'Compatible with ARC Framework Entity-Component standard',
    },
    useCases: {
      ares1: 'Potato Colony fully on-chain — plant/harvest as Bolt systems, Position + PotatoField + Player components, verifiable farming, MagicBlock ER for gasless <10ms',
      neonRelay: 'Racing fully on-chain — Position + RaceResult + Player, verifiable race results, no server trust, MagicBlock ER for real-time <10ms',
      aof: 'Farming fully on-chain — Plot + Crop + Player, verifiable crafting, MagicBlock ER gasless',
      guttercaps: 'Collectibles fully on-chain — Pack + Fusion + Wager as Bolt systems, verifiable odds, Gamba provably fair + Bolt verifiable',
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      world: 'Bolt worldId per game',
      indexer: 'LaserStream gRPC parses Component + System events',
      crossGame: 'studio_profile PDA stores Bolt entity IDs',
      analytics: 'Helika cross-game via Entity ID + wallet, GameSight solana_wallet external_id',
      marketplace: 'cNFT asset_id linked to Bolt entity Item component',
      l2: 'Bolt works on Solana mainnet + MagicBlock ER + Sonic HyperGrid — entities delegated to ER for <10ms gasless state committed',
      sessionKeys: 'Session key for frequent system calls — risk 0.01 SOL',
    },
    writes: false,
  }
}

export function boltHealth(env = process.env) {
  return {
    framework: BOLT_CONFIG.framework,
    repo: BOLT_CONFIG.repo,
    purpose: BOLT_CONFIG.purpose,
    keyIdea: BOLT_CONFIG.keyIdea,
    features: BOLT_CONFIG.features,
    benefits: ['fullyOnChain', 'highPerformance', 'autonomousWorlds', 'verifiable', 'magicBlock', 'arcCompatible'],
    configured: false,
    configurationReason: 'Rust-крейт bolt в хаб не входит',
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

/**
 * ARC Framework (JumpCrypto/sol-arc)
 * Фреймворк предлагающий стандарт для представления ончейн-данных с использованием паттерна Entity-Component (как в традиционном геймдеве)
 * Главная цель — разделить данные и их исполнение, бонус к интероперабельности и композабельности между разными играми
 * Если хотите чтобы предметы или персонажи из одной игры легко использовались в другой, ARC — то что стоит изучить в первую очередь
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'

export const ARC_CONFIG = {
  framework: 'ARC',
  repo: 'https://github.com/JumpCrypto/sol-arc',
  owner: 'JumpCrypto',
  pattern: 'Entity-Component (ECS)',
  purpose: 'standard for onchain data representation, separate data and execution, interoperability composability between games',
  keyIdea: 'Разделить данные и их исполнение — как в традиционном геймдеве Entity-Component',
  idealFor: 'cross-game items, characters from one game used in another, studio-wide inventory',
}

export function arcFrameworkSetup({ gameId } = {}) {
  return {
    framework: ARC_CONFIG.framework,
    gameId,
    repo: ARC_CONFIG.repo,
    pattern: ARC_CONFIG.pattern,
    purpose: ARC_CONFIG.purpose,
    keyIdea: ARC_CONFIG.keyIdea,
    idealFor: ARC_CONFIG.idealFor,
    install: {
      cargo: 'cargo add sol-arc',
      clone: 'git clone https://github.com/JumpCrypto/sol-arc',
    },
    concepts: {
      entity: 'Entity — уникальный ID, как в ECS, представляет объект (игрок, предмет, персонаж)',
      component: 'Component — данные прикрепленные к Entity, например Position {x,y}, Health {hp}, Inventory {items}, Owner {pubkey}',
      system: 'System — логика которая работает с Components, например MovementSystem, CombatSystem, HarvestSystem — разделение данных и исполнения',
      world: 'World — контейнер для Entities + Components + Systems',
    },
    codeExamples: {
      rust: `
use sol_arc::prelude::*;

// Define Components — данные
#[derive(Component, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Position { pub x: i64, pub y: i64 }

#[derive(Component, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Health { pub hp: u64, pub max_hp: u64 }

#[derive(Component, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Owner { pub owner: Pubkey }

#[derive(Component, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Item {
    pub item_type: String,
    pub rarity: String,
    pub source_game: String,
    pub is_cnft: bool,
    pub asset_id: Pubkey,
}

// Create Entity with Components
let entity = world.create_entity();
world.add_component(entity, Position { x: 0, y: 0 });
world.add_component(entity, Health { hp: 100, max_hp: 100 });
world.add_component(entity, Owner { owner: wallet_pubkey });
world.add_component(entity, Item { item_type: "potato".to_string(), rarity: "common".to_string(), source_game: "ares1".to_string(), is_cnft: true, asset_id });

// System — логика отделена от данных
pub fn harvest_system(world: &mut World, entity: Entity) -> Result<()> {
    let position = world.get_component::<Position>(entity)?;
    let owner = world.get_component::<Owner>(entity)?;
    // Logic: harvest if position ready, owner matches
    // Execution separated from data — interoperability!
    Ok(())
}

// Cross-game: предмет из ARES-1 (potato) имеет Components Position + Owner + Item
// В Neon Relay система MovementSystem может использовать Position + Owner без знания что это potato
// В AOF система CraftSystem может использовать Item + Owner для крафта
// Интероперабельность и композабельность между разными играми!
`,
      crossGameExample: `
# Cross-game inventory via ARC — ideal for Watchtower OS studio_profile PDA

# ARES-1: create potato entity
entity_potato = world.create_entity()
world.add_component(entity_potato, Position { x: 10, y: 20 })
world.add_component(entity_potato, Item { item_type: "potato", source_game: "ares1", is_cnft: true, asset_id: cnft_asset_id })
world.add_component(entity_potato, Owner { owner: player_wallet })

# Neon Relay: use same entity as cosmetic
# MovementSystem reads Position + Owner — works without knowing it's potato!
# No need to convert — same Components

# AOF: craft with potato
# CraftSystem reads Item (potato) + Owner -> creates new Item (food)
# Composability!

# Watchtower OS cross-game PDA studio_profile stores ARC Entities
# Helika dashboard tracks cross-game usage via common wallet + Entity ID
# GameSight attribution: ad_click -> Entity creation -> cross-game usage
`,
      watchtowerIntegration: `
# ARC + Watchtower OS

# 1. On-chain: ARC Framework stores Entities + Components as PDAs
# 2. Indexer: LaserStream gRPC + custom PG parses Component changes
# 3. Watchtower: /api/ingest/solana events with ARC Entity ID + Component type + gameId + solana_wallet
# 4. Cross-game: studio_profile PDA contains list of ARC Entity IDs owned by wallet
# 5. Analytics: Helika cross-game dashboard tracks Entity usage across games via wallet + Entity ID
# 6. Marketplace: cNFT asset_id linked to ARC Entity Item component — Tensor Bubblegum v2

# Example event:
{
  "eventType": "ComponentAdded",
  "gameId": "ares1",
  "payload": {
    "entity_id": "entity_123",
    "component": "Item",
    "data": { "item_type": "potato", "source_game": "ares1", "is_cnft": true, "asset_id": "asset_123" },
    "solana_wallet": "wallet_123"
  }
}
`,
    },
    benefits: {
      interoperability: 'Предметы/персонажи из одной игры легко используются в другой — same Components',
      composability: 'Системы из разных игр могут работать с одними Components — MovementSystem из Neon Relay + Item из ARES-1',
      separation: 'Данные и исполнение разделены — как в традиционном геймдеве ECS',
      studioWide: 'Единый стандарт для всех 4 игр — кросс-игровой инвентарь из коробки',
    },
    comparison: {
      vsTraditionalAnchor: 'Traditional Anchor: Player { owner, score, level } — монолит, трудно переиспользовать. ARC: Entity + Position + Score + Level Components — легко компонуемо',
      vsRushEcs: 'Rush ECS (Sonic) — declarative world config SDK generates contracts, similar but Sonic-specific. ARC — general standard JumpCrypto, works on any SVM including Sonic HyperGrid, REPLA, MagicBlock ER',
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      crossGamePda: 'studio_profile contains ARC Entity IDs',
      indexer: 'LaserStream gRPC parses Component PDAs',
      analytics: 'Helika cross-game via Entity ID + wallet, GameSight solana_wallet external_id',
      marketplace: 'cNFT asset_id linked to Item component',
      l2: 'ARC works on Sonic HyperGrid, REPLA, MagicBlock ER — Entities stored in L2, committed to Solana',
    },
    writes: false,
  }
}

export function arcHealth(env = process.env) {
  return {
    framework: ARC_CONFIG.framework,
    repo: ARC_CONFIG.repo,
    pattern: ARC_CONFIG.pattern,
    purpose: ARC_CONFIG.purpose,
    idealFor: ARC_CONFIG.idealFor,
    benefits: ['interoperability', 'composability', 'separation data/execution', 'studio-wide standard'],
    configured: false,
    configurationReason: 'Rust-крейт sol-arc в хаб не входит',
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

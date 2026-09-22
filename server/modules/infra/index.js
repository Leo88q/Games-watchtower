/**
 * Infra Layer — ARC + Bolt + DePIN + Arcium + Xandeum + PST + Core Attributes
 * Ideal free stack, deduplicated
 */

import { arcFrameworkSetup, arcHealth, ARC_CONFIG } from './arc.js'
import { boltFrameworkSetup, boltHealth, BOLT_CONFIG } from './bolt.js'
import { depinSetup, depinHealth, DEPIN_CONFIG } from './depin.js'
import { arciumSetup, arciumHealth, ARCIUM_CONFIG } from '../privacy/arcium.js'
import { xandeumSetup, xandeumHealth, XANDEUM_CONFIG } from '../storage/xandeum.js'
import { privateStateToolkitSetup, privateStateToolkitHealth, PST_CONFIG } from '../storage/private-state-toolkit.js'
import { coreAttributesSetup, coreAttributesHealth, CORE_ATTRIBUTES_CONFIG } from '../storage/core-attributes.js'

export function infraLayerConfig(env = process.env) {
  const arc = arcFrameworkSetup({ gameId: 'generic' })
  const bolt = boltFrameworkSetup({ gameId: 'generic' })
  const depin = depinSetup({ gameId: 'generic' })
  const arcium = arciumSetup({ gameId: 'generic' })
  const xandeum = xandeumSetup({ gameId: 'generic' })
  const pst = privateStateToolkitSetup({ gameId: 'generic' })
  const coreAttributes = coreAttributesSetup({ gameId: 'generic' })

  return {
    layer: 'infra',
    frameworks: {
      arc: ARC_CONFIG,
      bolt: BOLT_CONFIG,
      depin: DEPIN_CONFIG,
      arcium: ARCIUM_CONFIG,
      xandeum: XANDEUM_CONFIG,
      pst: PST_CONFIG,
      coreAttributes: CORE_ATTRIBUTES_CONFIG,
    },
    setups: { arc, bolt, depin, arcium, xandeum, pst, coreAttributes },
    idealFreeStack: {
      category: 'infrastructure and rollups + storage state privacy',
      bestFree: [
        { framework: 'ARC', why: 'Free JumpCrypto Entity-Component standard separation data/execution interoperability composability cross-game items characters via same Components', cost: 'free' },
        { framework: 'Bolt', why: 'Free high-performance FOCG autonomous worlds Solana SVM fully on-chain verifiable no server trust', cost: 'free' },
        { framework: 'DePIN Beamable', why: 'Free PoC decentralized physical infra gaming compute license escrow rewards staking workers cost saving', cost: 'free' },
        { framework: 'Arcium Rollups', why: 'Free confidential computing rollups gaming payments architecture privacy, complementary to MagicBlock ER sub-10ms gasless Sonic HyperGrid', cost: 'free', useFor: 'confidential payments privacy rollups' },
        { framework: 'Xandeum', why: 'Free scalable storage layer exabytes game states assets player data decentralized network exabytes, better than Arweave for scalable game state', cost: 'free tier exabyte', useFor: 'scalable storage game states assets player data' },
        { framework: 'Private State Toolkit (PST)', why: 'Free private but verifiable state commitments on-chain encrypted off-chain ideal for hidden logic card games', cost: 'free', useFor: 'private verifiable hidden logic card games' },
        { framework: 'Metaplex Core Attributes Plugin', why: 'Free on-chain key-value in NFT game stats characteristics readable by programs indexable DAS best free on-chain stats', cost: 'free', useFor: 'on-chain stats key-value NFT readable programs DAS' },
      ],
      complementary: 'ARC Entity-Component + Bolt FOCG verifiable + DePIN decentralized compute + Arcium confidential rollups + Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value = full infra storage privacy coverage, not competitive',
    },
    strategy: {
      interoperability: {
        framework: 'ARC',
        reason: 'Стандарт для представления ончейн-данных Entity-Component, разделить данные и исполнение, бонус к интероперабельности и композабельности между разными играми. Если хотите чтобы предметы/персонажи из одной игры легко использовались в другой — ARC первое что изучить',
        useFor: 'cross-game items characters via same Components, studio-wide inventory',
      },
      fullyOnChain: {
        framework: 'Bolt',
        reason: 'Высокопроизводительный фреймворк для полностью ончейн-игр FOCG и автономных миров на Solana SVM, вся логика прозрачная проверяемая без доверия серверу',
        useFor: 'ARES-1 farming fully on-chain, Neon Relay racing verifiable, AOF crafting, GUTTERCAPS collectibles verifiable odds + Gamba provably fair',
        l2: 'Works with MagicBlock ER sub-10ms gasless + Sonic HyperGrid while still fully on-chain + Arcium confidential rollups privacy',
      },
      decentralizedCompute: {
        project: 'DePIN Beamable',
        reason: 'Proof-of-concept децентрализованной физической инфраструктуры для игровых вычислений на Solana, программы лицензии эскроу награды стейкинг воркеров, вынести часть игровых серверов в децентрализованную сеть',
        useFor: 'Matchmaking physics AI market push notifications VRF fusion PvP battle resolver off-chain -> DePIN workers stake escrow rewards slash, cost saving decentralization verifiable',
      },
      confidential: {
        project: 'Arcium Rollups',
        reason: 'Confidential computing and rollups for gaming payments architecture privacy',
        useFor: 'confidential payments privacy rollups + PST private verifiable commitments hidden logic card games',
      },
      scalableStorage: {
        project: 'Xandeum',
        reason: 'Scalable storage layer exabytes game states assets player data decentralized network exabytes better than Arweave for scalable game state',
        useFor: 'game states assets player data scalable exabyte',
      },
      privateState: {
        project: 'PST Private State Toolkit',
        reason: 'Private but verifiable state commitments on-chain encrypted off-chain ideal for hidden logic card games',
        useFor: 'hidden logic card games private verifiable',
      },
      onChainStats: {
        project: 'Core Attributes Plugin',
        reason: 'On-chain key-value in NFT game stats characteristics readable by programs indexable via DAS best free on-chain stats',
        useFor: 'game stats on-chain readable programs DAS',
      },
    },
    comparison: {
      arcVsBolt: 'ARC — standard for data representation Entity-Component separation. Bolt — full framework for FOCG execution + world includes ARC-like ECS + systems + on-chain execution',
      arcVsRush: 'Rush ECS (Sonic) — declarative config generates contracts Sonic-specific. ARC — general standard JumpCrypto works on any SVM including Sonic HyperGrid REPLA MagicBlock ER Arcium',
      boltVsRush: 'Rush ECS — declarative config generates contracts Sonic-specific. Bolt — general FOCG framework works on Solana mainnet + MagicBlock ER + Sonic + Arcium',
      xandeumVsArweave: 'Arweave Shadow Irys for cNFT off-chain metadata $110/M vs Xandeum exabyte scalable storage layer game states assets player data — Xandeum better for scalable game state, Arweave fallback for cNFT metadata, complementary',
      pstVsArcium: 'PST private verifiable commitments hidden logic card games vs Arcium confidential computing rollups payments — PST for private state commitments, Arcium for confidential computing rollups, complementary',
      coreVsCbor: 'cNFT off-chain metadata vs Core Attributes on-chain key-value — cNFT off-chain scalable $110/M, Core on-chain readable programs DAS best free on-chain stats, complementary',
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function infraHealth(env = process.env) {
  return {
    layer: 'infra',
    generatedAt: new Date().toISOString(),
    arc: arcHealth(env),
    bolt: boltHealth(env),
    depin: depinHealth(env),
    arcium: arciumHealth(env),
    xandeum: xandeumHealth(env),
    pst: privateStateToolkitHealth(env),
    coreAttributes: coreAttributesHealth(env),
    summary: infraLayerConfig(env).idealFreeStack,
    writes: false,
  }
}

export { ARC_CONFIG, BOLT_CONFIG, DEPIN_CONFIG, ARCIUM_CONFIG, XANDEUM_CONFIG, PST_CONFIG, CORE_ATTRIBUTES_CONFIG }
export { arcFrameworkSetup, boltFrameworkSetup, depinSetup, arciumSetup, xandeumSetup, privateStateToolkitSetup, coreAttributesSetup }

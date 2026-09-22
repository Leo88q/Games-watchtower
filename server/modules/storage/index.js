/**
 * Storage Layer — Xandeum scalable exabyte + PST private verifiable + Core Attributes on-chain key-value
 * Ideal free stack per category, deduplicated
 */

import { xandeumSetup, xandeumHealth, XANDEUM_CONFIG } from './xandeum.js'
import { privateStateToolkitSetup, privateStateToolkitHealth, PST_CONFIG } from './private-state-toolkit.js'
import { coreAttributesSetup, coreAttributesHealth, CORE_ATTRIBUTES_CONFIG } from './core-attributes.js'

export function storageLayerConfig(env = process.env) {
  const xandeum = xandeumSetup({ gameId: 'generic' })
  const pst = privateStateToolkitSetup({ gameId: 'generic' })
  const coreAttributes = coreAttributesSetup({ gameId: 'generic' })

  return {
    layer: 'storage',
    projects: {
      xandeum: XANDEUM_CONFIG,
      pst: PST_CONFIG,
      coreAttributes: CORE_ATTRIBUTES_CONFIG,
    },
    setups: { xandeum, pst, coreAttributes },
    idealFreeStack: {
      category: 'storage state privacy',
      bestFree: [
        { tool: 'Xandeum', why: 'Free scalable storage layer dApps Solana exabytes game states assets player data, decentralized network grow to exabytes, better than Arweave for scalable game state, free tier', cost: 'free tier exabyte scalable', useFor: 'game states, assets, player data scalable' },
        { tool: 'Private State Toolkit (PST)', why: 'Free infrastructure private but verifiable state, only cryptographic commitments on-chain encrypted off-chain, ideal for games hidden logic card games', cost: 'free', useFor: 'hidden logic card games private verifiable' },
        { tool: 'Metaplex Core Attributes Plugin', why: 'Free on-chain key-value in NFT game stats characteristics readable by Solana programs indexable via DAS, best free for on-chain stats', cost: 'free', useFor: 'game stats characteristics on-chain readable programs DAS' },
      ],
      complementary: 'Xandeum scalable public off-chain exabyte + PST private commitments on-chain encrypted off-chain + Core Attributes public on-chain key-value = full coverage storage privacy, not competitive',
      vsLegacy: 'cNFT off-chain Arweave/Shadow/Irys for metadata $110/M vs Xandeum exabyte scalable for game states — Xandeum better for scalable, Arweave fallback for cNFT metadata',
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function storageHealth(env = process.env) {
  return {
    layer: 'storage',
    generatedAt: new Date().toISOString(),
    xandeum: xandeumHealth(env),
    pst: privateStateToolkitHealth(env),
    coreAttributes: coreAttributesHealth(env),
    summary: storageLayerConfig(env).idealFreeStack,
    writes: false,
  }
}

export { XANDEUM_CONFIG, PST_CONFIG, CORE_ATTRIBUTES_CONFIG }
export { xandeumSetup, privateStateToolkitSetup, coreAttributesSetup }

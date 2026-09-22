/**
 * Privacy Layer — Arcium Rollups confidential computing + PST private verifiable (from storage) complementary
 */

import { arciumSetup, arciumHealth, ARCIUM_CONFIG } from './arcium.js'

export function privacyLayerConfig(env = process.env) {
  const arcium = arciumSetup({ gameId: 'generic' })

  return {
    layer: 'privacy',
    projects: {
      arcium: ARCIUM_CONFIG,
    },
    setups: { arcium },
    idealFreeStack: {
      category: 'infrastructure and rollups privacy',
      bestFree: [
        { tool: 'Arcium Rollups', why: 'Free confidential computing and rollups solutions gaming payments architecture, privacy for payments, complementary to MagicBlock ER sub-10ms gasless and Sonic HyperGrid', cost: 'free', useFor: 'confidential payments privacy rollups' },
      ],
      complementary: 'Sonic HyperGrid high frequency isolation + MagicBlock ER sub-10ms gasless + REPLA L3 CLI + Arcium confidential computing rollups privacy + PST private verifiable commitments + Xandeum scalable exabyte = full L2 privacy storage coverage',
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function privacyHealth(env = process.env) {
  return {
    layer: 'privacy',
    generatedAt: new Date().toISOString(),
    arcium: arciumHealth(env),
    summary: privacyLayerConfig(env).idealFreeStack,
    writes: false,
  }
}

export { ARCIUM_CONFIG }
export { arciumSetup }

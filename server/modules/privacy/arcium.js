/**
 * Arcium Rollups — mentioned in context gaming payments and architecture, offering solutions for confidential computing and rollups
 */
export const ARCIUM_CONFIG = {
  project: 'arcium-rollups',
  type: 'confidential computing and rollups',
  purpose: 'Gaming payments and architecture, confidential computing and rollups solutions',
  features: ['confidential computing', 'rollups', 'gaming payments', 'architecture', 'privacy', 'Solana'],
  install: 'npm i @arcium/sdk',
  repo: 'https://github.com/arcium/arcium-rollups',
  free: true,
  comparison: {
    vsMagicBlock: 'MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions vs Arcium confidential computing rollups — MagicBlock for sub-10ms gasless UX, Arcium for confidential computing privacy payments, complementary',
    vsSonic: 'Sonic HyperGrid dedicated grid thousands no contention vs Arcium confidential rollups — Sonic for high frequency isolation, Arcium for privacy confidential, complementary',
    vsRepla: 'REPLA repla-cli L3 Anchor settle MagicBlock sequencer vs Arcium confidential computing rollups — REPLA for L3 rollup framework CLI, Arcium for confidential privacy, complementary',
    vsPST: 'PST private verifiable state commitments on-chain encrypted off-chain vs Arcium confidential computing rollups — PST for private state commitments hidden logic card games, Arcium for confidential computing rollups payments, complementary',
  }
}

export function arciumSetup({ gameId = 'generic' } = {}) {
  return {
    project: ARCIUM_CONFIG.project,
    gameId,
    install: ARCIUM_CONFIG.install,
    purpose: ARCIUM_CONFIG.purpose,
    usage: {
      confidentialPayment: `arcium.confidentialPayment({ gameId: '${gameId}', amount, private: true }) // confidential computing`,
      rollup: `arcium rollup for gaming payments architecture privacy`,
    },
    bestFree: true,
    category: 'privacy rollup',
  }
}

export function arciumHealth() {
  return { configured: true, project: ARCIUM_CONFIG.project, free: true, bestFree: true, category: 'privacy rollup' }
}

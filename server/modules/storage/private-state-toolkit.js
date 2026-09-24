/**
 * Private State Toolkit (PST) — infrastructure for private but verifiable state of applications. Stores only cryptographic commitments on-chain, encrypted state off-chain. Ideal for games with hidden logic (card games)
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const PST_CONFIG = {
  project: 'private-state-toolkit',
  short: 'PST',
  type: 'private but verifiable state',
  purpose: 'Private verifiable state apps, only cryptographic commitments on-chain, encrypted state off-chain, ideal for games with hidden logic card games',
  features: ['private state', 'verifiable', 'cryptographic commitments on-chain', 'encrypted off-chain', 'hidden logic', 'card games', 'Solana'],
  install: 'npm i @private-state-toolkit/sdk',
  repo: 'https://github.com/private-state-toolkit/pst',
  free: true,
  comparison: {
    vsXandeum: 'Xandeum scalable public storage vs PST private verifiable commitments on-chain encrypted off-chain — Xandeum for scalable public, PST for private hidden logic, complementary',
    vsCoreAttributes: 'Core Attributes on-chain key-value public stats readable programs DAS vs PST private commitments — Core public on-chain, PST private verifiable, complementary',
    vsArcium: 'Arcium Rollups confidential computing rollups vs PST private verifiable state commitments — Arcium for confidential computing rollups payments, PST for private state commitments hidden logic, complementary',
  }
}

export function privateStateToolkitSetup({ gameId = 'generic' } = {}) {
  return {
    project: PST_CONFIG.project,
    gameId,
    install: PST_CONFIG.install,
    purpose: PST_CONFIG.purpose,
    usage: {
      commit: `pst.commit({ gameId: '${gameId}', commitment: hash(hiddenState) }) // only commitment on-chain`,
      storeEncrypted: `pst.storeEncrypted({ commitment, encryptedState }) // encrypted off-chain`,
      verify: `pst.verify({ commitment, proof }) // verifiable`,
      cardGame: `pst for card games hidden logic — commitment on-chain, encrypted hand off-chain, reveal with proof`,
    },
    bestFree: true,
    category: 'privacy',
  }
}

export function privateStateToolkitHealth() {
  return { configured: dependencyInstalled('@private-state-toolkit/sdk'),
    configurationReason: 'Пакет @private-state-toolkit/sdk не установлен', project: PST_CONFIG.project, free: true, bestFree: true, category: 'privacy' }
}

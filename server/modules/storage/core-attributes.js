/**
 * Metaplex Core Attributes Plugin — allows storing game stats and characteristics as key-value directly on-chain in NFT. Data can be read by Solana programs and indexed via DAS
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const CORE_ATTRIBUTES_CONFIG = {
  project: 'metaplex-core-attributes-plugin',
  type: 'on-chain key-value in NFT',
  purpose: 'Store game stats characteristics as key-value directly on-chain in NFT, readable by Solana programs and indexable via DAS',
  features: ['on-chain key-value', 'game stats', 'characteristics', 'NFT', 'readable by programs', 'indexable via DAS', 'Metaplex Core'],
  install: 'npm i @metaplex-foundation/mpl-core',
  repo: 'https://github.com/metaplex-foundation/mpl-core',
  free: true,
  comparison: {
    vsXandeum: 'Xandeum scalable off-chain exabyte vs Core Attributes on-chain key-value in NFT — Xandeum off-chain scalable, Core on-chain readable programs DAS, complementary',
    vsPST: 'PST private verifiable commitments vs Core Attributes public on-chain stats — PST private hidden logic, Core public on-chain stats, complementary',
    vsCbor: 'cNFT off-chain metadata vs Core Attributes on-chain key-value — cNFT off-chain $110/M scalable, Core on-chain for stats readable programs, complementary, best free for on-chain stats',
  }
}

export function coreAttributesSetup({ gameId = 'generic' } = {}) {
  return {
    project: CORE_ATTRIBUTES_CONFIG.project,
    gameId,
    install: CORE_ATTRIBUTES_CONFIG.install,
    purpose: CORE_ATTRIBUTES_CONFIG.purpose,
    usage: {
      addAttribute: `core.addAttribute({ nft: nftAddress, key: 'level', value: '10' }) // on-chain key-value`,
      readProgram: `// In Anchor program: read Core Attributes via CPI, stats readable by programs`,
      indexDAS: `// Index via DAS getAssetsByOwner 5ms vs 150ms`,
    },
    bestFree: true,
    category: 'assets',
  }
}

export function coreAttributesHealth() {
  return { configured: dependencyInstalled('@metaplex-foundation/mpl-core'),
    configurationReason: 'Пакет @metaplex-foundation/mpl-core не установлен', project: CORE_ATTRIBUTES_CONFIG.project, free: true, bestFree: true, category: 'assets' }
}

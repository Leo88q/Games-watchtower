/**
 * Xandeum — scalable storage layer for dApps on Solana, allows saving game states, assets, player data in decentralized storage network that can grow to exabytes
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const XANDEUM_CONFIG = {
  project: 'xandeum',
  type: 'scalable storage layer',
  purpose: 'Save game states, assets, player data in decentralized storage network exabytes',
  features: ['exabyte scalable', 'decentralized storage', 'dApps storage', 'game states', 'assets', 'player data', 'Solana native'],
  install: 'npm i @xandeum/sdk',
  repo: 'https://github.com/xandeum/xandeum',
  free: true,
  freeTier: 'decentralized storage free tier',
  comparison: {
    vsArweave: 'Arweave Shadow Drive Irys for cNFT off-chain metadata vs Xandeum exabyte scalable storage layer for game states assets player data — Xandeum better for scalable game state, Arweave fallback for cNFT metadata, not competitive, complementary',
    vsPST: 'Xandeum scalable storage vs PST private verifiable state — Xandeum for scalable public storage, PST for private but verifiable commitments, complementary',
    vsCoreAttributes: 'Xandeum scalable off-chain storage vs Core Attributes on-chain key-value in NFT readable by programs indexable DAS — Xandeum off-chain exabyte, Core Attributes on-chain stats, complementary',
  }
}

export function xandeumSetup({ gameId = 'generic' } = {}) {
  return {
    project: XANDEUM_CONFIG.project,
    gameId,
    install: XANDEUM_CONFIG.install,
    purpose: XANDEUM_CONFIG.purpose,
    usage: {
      saveGameState: `xandeum.save({ gameId: '${gameId}', key: 'player:${gameId}:state', data: gameState }) // exabyte scalable`,
      saveAssets: `xandeum.saveAssets({ gameId: '${gameId}', assets: [...] }) // decentralized storage`,
      savePlayerData: `xandeum.savePlayerData({ wallet, data }) // exabyte`,
    },
    bestFree: true,
    category: 'storage',
  }
}

export function xandeumHealth() {
  return { configured: dependencyInstalled('@xandeum/sdk'),
    configurationReason: 'Пакет @xandeum/sdk не установлен', project: XANDEUM_CONFIG.project, free: true, bestFree: true, category: 'storage', scalable: 'exabytes' }
}

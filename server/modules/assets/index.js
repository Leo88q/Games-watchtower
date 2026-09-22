/**
 * Assets Layer — cNFT + Standard NFT unified
 */

import { cnftCollectionConfig, cnftMintPayload, cnftMarketplaceAdapter, cnftHealth, CNFT_CONFIG } from './cnft.js'
import { standardNftCollection, assetStrategy, STANDARD_NFT_CONFIG } from './standard.js'

export function assetsConfig(env = process.env) {
  return {
    layer: 'assets',
    strategies: {
      massItems: 'cNFT — до 1M за $110, off-chain, Merkle Tree + MCC, Bubblegum v2',
      rareItems: 'Standard NFT — отдельный mint/token аккаунт, полная поддержка маркетплейсов',
    },
    cnft: CNFT_CONFIG,
    standard: STANDARD_NFT_CONFIG,
    marketplaces: {
      primary: 'tensor (cNFT Bubblegum v2)',
      legacy: 'magic-eden (прекращает индексацию новых cNFT)',
      inApp: 'shyft (escrow-less) + gameshift (USD payments)',
    },
    dataQuality: 'partial',
    writes: false,
  }
}

export function assetsHealth(env = process.env) {
  return {
    layer: 'assets',
    cnft: cnftHealth(env),
    standard: {
      program: STANDARD_NFT_CONFIG.programId,
      configured: true,
      dataQuality: 'partial',
    },
    strategy: {
      rule: 'cNFT для массовых предметов, standard NFT для редких',
      costComparison: {
        cnft_1M: '$110',
        standard_1M: '~12000 SOL (~$1.8M)',
        savings: 'x10000',
      }
    },
    writes: false,
    generatedAt: new Date().toISOString(),
  }
}

export { cnftCollectionConfig, cnftMintPayload, cnftMarketplaceAdapter, standardNftCollection, assetStrategy }

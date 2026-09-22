/**
 * Marketplace Layer — Magic Eden + Shyft + GameShift aggregator
 */

import { magicEdenConfig, magicEdenHealth, magicEdenEndpoints, magicEdenInstructionBuilder, MAGIC_EDEN_CONFIG } from './magiceden.js'
import { shyftMarketplaceConfig, shyftMarketplaceHealth, shyftMarketplaceEndpoints, shyftMarketplaceBuilder, SHYFT_MARKET_CONFIG } from './shyft-market.js'
import { gameShiftConfig, gameShiftHealth, gameShiftEndpoints, gameShiftAssetBuilder, GAMESHIFT_CONFIG } from './gameshift.js'

export function marketplaceLayerConfig(env = process.env) {
  const me = magicEdenConfig(env)
  const shyft = shyftMarketplaceConfig(env)
  const gs = gameShiftConfig(env)

  return {
    layer: 'marketplace',
    providers: { magicEden: me, shyft, gameshift: gs },
    strategy: {
      cnft: {
        primary: 'tensor (Bubblegum v2)',
        inApp: 'shyft escrow-less',
        warning: 'Magic Eden прекращает индексацию новых cNFT — нужен Tensor',
        requires: 'MCC-адрес и список Merkle Tree addresses для ME',
      },
      standardNft: {
        primary: 'magic-eden + tensor',
        inApp: 'shyft escrow-less + gameshift USD',
      },
      inAppMarketplace: {
        fastLaunch: 'Shyft Marketplace API — полноценный in-app маркетплейс за несколько дней, escrow-less модель',
        usdPayments: 'GameShift — торговля в USD, 170+ стран, 100% защита от чарджбэков, газ берёт на себя',
        stats: 'Shyft stats API — статистика в один вызов',
      }
    },
    aggregation: {
      list: 'Unified list across ME + Tensor + Shyft + GameShift',
      buy: 'Generate instruction via ME or Shyft, client signs via Session Key',
      usdCheckout: 'GameShift for non-crypto users',
    },
    configuredCount: [me, shyft, gs].filter(p => p.configured).length,
    writes: false,
    dataQuality: [me, shyft, gs].some(p => p.configured) ? 'partial' : 'unavailable',
  }
}

export function marketplaceHealth(env = process.env) {
  return {
    layer: 'marketplace',
    generatedAt: new Date().toISOString(),
    magicEden: magicEdenHealth(env),
    shyft: shyftMarketplaceHealth(env),
    gameshift: gameShiftHealth(env),
    summary: marketplaceLayerConfig(env),
    writes: false,
  }
}

export function marketplaceAggregator({ gameId, assetType } = {}) {
  // Decision logic from brief: cNFT for mass, standard for rare, GameShift for payments
  const isCnft = assetType === 'cnft' || assetType === 'common' || assetType === 'mass'
  return {
    gameId,
    assetType,
    routes: isCnft ? [
      { marketplace: 'tensor', reason: 'Bubblegum v2 support, ME stops indexing', priority: 1 },
      { marketplace: 'shyft', reason: 'escrow-less in-app', priority: 2 },
      { marketplace: 'gameshift', reason: 'USD payments fallback', priority: 3 },
    ] : [
      { marketplace: 'magic-eden', reason: 'standard NFT full support', priority: 1 },
      { marketplace: 'tensor', reason: 'alternative', priority: 2 },
      { marketplace: 'shyft', reason: 'in-app escrow-less', priority: 3 },
      { marketplace: 'gameshift', reason: 'USD + gas abstraction', priority: 4 },
    ],
    writes: false,
  }
}

export { MAGIC_EDEN_CONFIG, SHYFT_MARKET_CONFIG, GAMESHIFT_CONFIG }
export { magicEdenInstructionBuilder, shyftMarketplaceBuilder, gameShiftAssetBuilder }

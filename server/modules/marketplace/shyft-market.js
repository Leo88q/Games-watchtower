/**
 * Shyft Marketplace API — escrow-less модель
 * NFT остаётся в кошельке пользователя до завершения продажи
 * Позволяет запустить полноценный in-app маркетплейс за несколько дней
 * Есть stats API для статистики в один вызов
 */

export const SHYFT_MARKET_CONFIG = {
  provider: 'shyft-marketplace',
  model: 'escrow-less — NFT остаётся в кошельке пользователя до завершения продажи',
  features: {
    inAppMarketplace: true,
    escrowLess: true,
    fastLaunch: 'за несколько дней',
    statsApi: true,
  },
  baseUrl: 'https://api.shyft.to/sol/v1/marketplace',
}

export function shyftMarketplaceConfig(env = process.env) {
  return {
    provider: 'shyft-marketplace',
    apiKeyConfigured: Boolean(env.SHYFT_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.SHYFT_API_KEY),
    baseUrl: env.SHYFT_MARKET_BASE_URL || SHYFT_MARKET_CONFIG.baseUrl,
    model: SHYFT_MARKET_CONFIG.model,
    features: SHYFT_MARKET_CONFIG.features,
    writes: false,
  }
}

export function shyftMarketplaceEndpoints() {
  return {
    marketplace: {
      create: 'POST /sol/v1/marketplace/create — создать маркетплейс для игры',
      list: 'POST /sol/v1/marketplace/list — листинг NFT (escrow-less)',
      buy: 'POST /sol/v1/marketplace/buy — покупка',
      unlist: 'POST /sol/v1/marketplace/unlist',
    },
    nft: {
      listNft: 'GET /sol/v1/marketplace/list?marketplace_address=...',
      activeListings: 'GET /sol/v1/marketplace/active_listings',
    },
    stats: {
      collectionStats: 'GET /sol/v1/marketplace/stats?marketplace_address=... — статистика в один вызов',
      note: 'Есть stats API для статистики в один вызов',
    },
    escrowLess: {
      description: 'NFT остаётся в кошельке пользователя до завершения продажи, без эскроу',
      benefits: ['no custody risk', 'instant listing', 'user keeps ownership until sale'],
    }
  }
}

export function shyftMarketplaceBuilder({ gameId, marketplaceAddress, action, nftAddress, price, seller } = {}) {
  return {
    provider: 'shyft-marketplace',
    gameId,
    marketplaceAddress,
    action, // create, list, buy, unlist
    nftAddress,
    price,
    seller,
    model: 'escrow-less',
    note: 'Позволяет запустить полноценный in-app маркетплейс за несколько дней',
    writes: false,
  }
}

export function shyftMarketplaceHealth(env = process.env) {
  const cfg = shyftMarketplaceConfig(env)
  return {
    provider: 'shyft-marketplace',
    layer: 'marketplace',
    configured: cfg.configured,
    model: cfg.model,
    endpoints: shyftMarketplaceEndpoints(),
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

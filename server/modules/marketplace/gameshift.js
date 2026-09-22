/**
 * GameShift (Solana Labs) — API-first платформа для управления активами без знания блокчейна
 * Четыре вертикали: кошелёк (self-custodial), создание активов, торговля (в USD), платежи (170+ стран, 100% защита от чарджбэков)
 * Все газовые сборы и взаимодействие с блокчейном берёт на себя
 */

export const GAMESHIFT_CONFIG = {
  provider: 'gameshift',
  owner: 'Solana Labs',
  type: 'API-first platform',
  verticals: {
    wallet: 'self-custodial',
    assetCreation: 'создание активов без знания блокчейна',
    trading: 'торговля в USD',
    payments: '170+ стран, 100% защита от чарджбэков',
  },
  gas: 'Все газовые сборы и взаимодействие с блокчейном берёт на себя',
}

export function gameShiftConfig(env = process.env) {
  return {
    provider: 'gameshift',
    apiKey: env.GAMESHIFT_API_KEY || null,
    configured: Boolean(env.GAMESHIFT_API_KEY),
    baseUrl: env.GAMESHIFT_BASE_URL || 'https://api.gameshift.dev',
    environment: env.GAMESHIFT_ENV || 'devnet',
    verticals: GAMESHIFT_CONFIG.verticals,
    gasAbstraction: GAMESHIFT_CONFIG.gas,
    features: {
      noBlockchainKnowledge: true,
      usdTrading: true,
      globalPayments: true,
      chargebackProtection: '100%',
      gaslessForUser: true,
    },
    writes: false, // GameShift handles blockchain interaction
  }
}

export function gameShiftEndpoints() {
  return {
    users: {
      create: 'POST /v1/users — создать self-custodial кошелёк для игрока',
      get: 'GET /v1/users/{userId}',
      assets: 'GET /v1/users/{userId}/assets',
    },
    assets: {
      createCollection: 'POST /v1/asset-collections — создать коллекцию',
      createAsset: 'POST /v1/asset-collections/{collectionId}/assets — mint без знания блокчейна',
      getAsset: 'GET /v1/assets/{assetId}',
    },
    marketplace: {
      list: 'POST /v1/marketplace/listings — листинг в USD',
      purchase: 'POST /v1/marketplace/purchases — покупка в USD, 170+ стран',
      getListing: 'GET /v1/marketplace/listings/{listingId}',
    },
    payments: {
      checkout: 'POST /v1/payments/checkout — USD платежи с защитой от чарджбэков',
      currencies: '170+ стран',
      protection: '100% защита от чарджбэков',
    },
    gas: {
      note: 'Все газовые сборы и взаимодействие с блокчейном берёт на себя GameShift',
    }
  }
}

export function gameShiftAssetBuilder({ gameId, collectionId, name, description, imageUrl, attributes, ownerId } = {}) {
  return {
    provider: 'gameshift',
    gameId,
    collectionId,
    asset: {
      name,
      description,
      imageUrl,
      attributes, // for game items
      ownerId, // GameShift userId
    },
    noBlockchainKnowledgeRequired: true,
    gasHandling: 'GameShift pays gas',
    writes: false,
  }
}

export function gameShiftHealth(env = process.env) {
  const cfg = gameShiftConfig(env)
  return {
    provider: 'gameshift',
    layer: 'marketplace',
    configured: cfg.configured,
    verticals: cfg.verticals,
    endpoints: gameShiftEndpoints(),
    gasAbstraction: cfg.gasAbstraction,
    recommendation: 'Для админки и монетизации — платежи и управление активами без знания блокчейна',
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

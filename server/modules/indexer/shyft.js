/**
 * Shyft — REST API для NFT, токенов, кошельков и колбэков (вебхуков)
 * Callback API для TOKEN_MINT, NFT_MINT
 * Акселерированный getProgramAccounts p50 ~15 мс для топовых DEX
 */

export const SHYFT_CONFIG = {
  provider: 'shyft',
  baseUrl: 'https://api.shyft.to',
  features: {
    nftApi: true,
    tokenApi: true,
    walletApi: true,
    callbackApi: true, // webhooks
    marketplaceApi: true,
    acceleratedGpa: true, // getProgramAccounts p50 15ms
  },
  callbackEvents: ['TOKEN_MINT', 'NFT_MINT', 'TOKEN_TRANSFER', 'NFT_TRANSFER', 'NFT_LIST', 'NFT_SALE'],
}

export function shyftConfig(env = process.env) {
  return {
    provider: 'shyft',
    apiKeyConfigured: Boolean(env.SHYFT_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.SHYFT_API_KEY),
    baseUrl: env.SHYFT_BASE_URL || SHYFT_CONFIG.baseUrl,
    network: env.SHYFT_NETWORK || env.SOLANA_CLUSTER || 'mainnet-beta',
    features: SHYFT_CONFIG.features,
    acceleratedGpa: {
      enabled: true,
      p50: '15ms',
      for: 'top DEX + game programs',
    },
    writes: false,
  }
}

export function shyftCallbackConfig({ gameId, events = SHYFT_CONFIG.callbackEvents, targetUrl } = {}) {
  return {
    provider: 'shyft-callback',
    gameId,
    events,
    targetUrl: targetUrl || `https://watchtower.studio/api/webhooks/shyft/${gameId}`,
    description: 'Callback API позволяет отслеживать события и отправлять данные на ваш сервер',
    payload: {
      example: {
        type: 'NFT_MINT',
        gameId,
        signature: '...',
        nft_address: '...',
        owner: '...',
        timestamp: new Date().toISOString(),
      }
    },
    writes: false,
  }
}

export function shyftRestEndpoints() {
  return {
    nft: {
      getNft: 'GET /sol/v1/nft/read',
      getNftsByOwner: 'GET /sol/v1/nft/read_all',
      getCollection: 'GET /sol/v1/nft/collection',
    },
    token: {
      getBalance: 'GET /sol/v1/wallet/token_balance',
      getAllTokens: 'GET /sol/v1/wallet/all_tokens',
      getHistory: 'GET /sol/v1/wallet/history',
    },
    wallet: {
      getPortfolio: 'GET /sol/v1/wallet/get_portfolio',
      getTransactions: 'GET /sol/v1/transaction/history',
    },
    gpa: {
      getProgramAccounts: 'GET /sol/v1/gpa',
      note: 'Акселерированный, p50 ~15ms',
    },
    callback: {
      register: 'POST /sol/v1/callback/create',
      list: 'GET /sol/v1/callback/list',
      remove: 'DELETE /sol/v1/callback/remove',
    }
  }
}

export function shyftHealth(env = process.env) {
  const cfg = shyftConfig(env)
  return {
    provider: 'shyft',
    layer: 'indexer',
    configured: cfg.configured,
    baseUrl: cfg.baseUrl,
    network: cfg.network,
    features: cfg.features,
    endpoints: shyftRestEndpoints(),
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

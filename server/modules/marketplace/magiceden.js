/**
 * Magic Eden — REST-эндпоинты и генераторы инструкций для листинга, покупки, ставок
 * Публичные чтения — 120 QPM бесплатно, инструкции требуют Bearer API key
 * Для cNFT нужен MCC-адрес и список Merkle Tree addresses
 */

export const MAGIC_EDEN_CONFIG = {
  provider: 'magic-eden',
  baseUrl: 'https://api-mainnet.magiceden.dev',
  rateLimit: {
    publicRead: '120 QPM бесплатно',
    instructions: 'требуют Bearer API key',
  },
  features: {
    listing: true,
    buying: true,
    bidding: true,
    collectionData: true,
    activity: true,
    instructionsGenerator: true,
  },
  cnft: {
    requires: ['MCC-address', 'Merkle Tree addresses list'],
    warning: 'Прекращает индексацию новых cNFT-коллекций и постепенно снимает поддержку существующих',
    alternative: 'Tensor Bubblegum v2',
  }
}

export function magicEdenConfig(env = process.env) {
  return {
    provider: 'magic-eden',
    apiKeyConfigured: Boolean(env.MAGIC_EDEN_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.MAGIC_EDEN_API_KEY),
    baseUrl: env.MAGIC_EDEN_BASE_URL || MAGIC_EDEN_CONFIG.baseUrl,
    rateLimit: MAGIC_EDEN_CONFIG.rateLimit,
    features: MAGIC_EDEN_CONFIG.features,
    cnft: MAGIC_EDEN_CONFIG.cnft,
    writes: false, // instructions are generated, not executed by Watchtower
  }
}

export function magicEdenEndpoints() {
  return {
    collections: {
      list: 'GET /v2/collections',
      stats: 'GET /v2/collections/{symbol}/stats',
      activities: 'GET /v2/collections/{symbol}/activities',
    },
    nft: {
      get: 'GET /v2/tokens/{mint}',
      list: 'GET /v2/tokens?collection={symbol}',
    },
    marketplace: {
      list: 'POST /v2/instructions/sell — генерация инструкции листинга',
      buy: 'POST /v2/instructions/buy — генерация инструкции покупки',
      bid: 'POST /v2/instructions/bid — ставки',
      cancel: 'POST /v2/instructions/sell_cancel',
    },
    cnft: {
      list: 'POST /v2/instructions/cnft/sell — нужен MCC и Merkle Trees',
      buy: 'POST /v2/instructions/cnft/buy',
      note: 'Для торговли cNFT потребуются альтернативные площадки (Tensor и др.), поддерживающие Bubblegum v2',
    },
    auth: {
      public: '120 QPM бесплатно без ключа',
      private: 'Bearer API key для инструкций',
    }
  }
}

export function magicEdenInstructionBuilder({ action, mint, price, seller, buyer, mcc, merkleTrees } = {}) {
  // Watchtower generates instruction, client signs
  return {
    provider: 'magic-eden',
    action, // list, buy, bid, cancel
    instruction: {
      type: `${action}_instruction`,
      mint,
      price,
      seller,
      buyer,
      // For cNFT:
      mccAddress: mcc || null,
      merkleTreeAddresses: merkleTrees || [],
    },
    note: 'Публичные чтения 120 QPM бесплатно, инструкции требуют Bearer API key. Для cNFT нужен MCC-адрес и список Merkle Tree addresses',
    writes: false,
    signing: 'client-side via Phantom/MWA/Session Key',
  }
}

export function magicEdenHealth(env = process.env) {
  const cfg = magicEdenConfig(env)
  return {
    provider: 'magic-eden',
    layer: 'marketplace',
    configured: cfg.configured,
    baseUrl: cfg.baseUrl,
    rateLimit: cfg.rateLimit,
    endpoints: magicEdenEndpoints(),
    cnftWarning: cfg.cnft.warning,
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

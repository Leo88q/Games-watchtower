/**
 * Helius LaserStream — gRPC-стриминг с 24-часовым историческим реплеем и мультинодовым failover
 * Для критичных бэкендов. WebSocket-вариант для UI.
 * Встроенные Priority Fee API, webhooks и DAS API
 */

export const LASERSTREAM_CONFIG = {
  provider: 'helius',
  product: 'LaserStream',
  protocol: 'gRPC',
  features: {
    historicalReplay24h: true,
    multinodeFailover: true,
    priorityFeeApi: true,
    webhooks: true,
    dasApi: true, // Digital Asset Standard for metadata normalization
    websocketFallback: true,
  },
  endpoints: {
    grpc: 'https://laserstream.helius-rpc.com',
    grpcDevnet: 'https://laserstream-devnet.helius-rpc.com',
    websocket: 'wss://atlas-mainnet.helius-rpc.com',
    das: 'https://api.helius.xyz/v0',
    priorityFee: 'https://api.helius.xyz/v0/priority-fee',
  }
}

export function laserStreamGrpcConfig(env = process.env) {
  return {
    provider: 'helius-laserstream',
    apiKeyConfigured: Boolean(env.HELIUS_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.HELIUS_API_KEY),
    endpoint: env.HELIUS_LASERSTREAM_ENDPOINT || LASERSTREAM_CONFIG.endpoints.grpc,
    websocketEndpoint: env.HELIUS_RPC_URL || LASERSTREAM_CONFIG.endpoints.websocket,
    features: LASERSTREAM_CONFIG.features,
    subscription: {
      // Example Yellowstone gRPC subscription for game programs
      accounts: [], // game program PDAs
      transactions: {
        vote: false,
        failed: false,
        accountInclude: [], // programIds
      },
      blocks: false,
      blocksMeta: false,
      commitment: 'confirmed',
    },
    replay: {
      enabled: true,
      window: '24h',
      description: 'Исторический реплей 24 часа для восстановления после сбоя',
    },
    failover: {
      enabled: true,
      multinode: true,
      strategy: 'round_robin_with_healthcheck',
    },
    writes: false,
  }
}

export function laserStreamWebSocketConfig(env = process.env) {
  return {
    provider: 'helius-websocket',
    apiKeyConfigured: Boolean(env.HELIUS_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.HELIUS_API_KEY),
    endpoint: env.HELIUS_RPC_URL || LASERSTREAM_CONFIG.endpoints.websocket,
    suitableFor: 'UI и real-time приложения',
    methods: ['logsSubscribe', 'programSubscribe', 'accountSubscribe', 'signatureSubscribe'],
    writes: false,
  }
}

export function heliusDasConfig(env = process.env) {
  return {
    provider: 'helius-das',
    // Значение ключа не возвращается наружу ни в каком виде: только факт его наличия.
    apiKeyConfigured: Boolean(env.HELIUS_API_KEY),
    configured: Boolean(env.HELIUS_API_KEY),
    // Ключ никогда не собирается в URL: URL с секретом попадает в логи, ответы и скриншоты.
    endpointTemplate: 'https://mainnet.helius-rpc.com/?api-key=<HELIUS_API_KEY>',
    methods: ['getAssetsByOwner', 'getAsset', 'getAssetsByGroup', 'searchAssets'],
    purpose: 'Нормализация метаданных NFT/cNFT, критично для Watchtower',
    writes: false,
  }
}

export function heliusPriorityFeeConfig(env = process.env) {
  return {
    provider: 'helius-priority-fee',
    apiKeyConfigured: Boolean(env.HELIUS_API_KEY),
    configured: Boolean(env.HELIUS_API_KEY),
    endpoint: LASERSTREAM_CONFIG.endpoints.priorityFee,
    purpose: 'Динамические priority fees для игровых транзакций',
    writes: false,
  }
}

export function heliusWebhookConfig(env = process.env) {
  return {
    provider: 'helius-webhook',
    apiKeyConfigured: Boolean(env.HELIUS_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.HELIUS_API_KEY && env.HELIUS_WEBHOOK_ID),
    webhookId: env.HELIUS_WEBHOOK_ID || null,
    types: ['account', 'transaction'],
    target: env.WATCHTOWER_WEBHOOK_URL || null,
    writes: false,
  }
}

export function laserStreamHealth(env = process.env) {
  const grpc = laserStreamGrpcConfig(env)
  const ws = laserStreamWebSocketConfig(env)
  const das = heliusDasConfig(env)
  return {
    provider: 'helius',
    layer: 'indexer',
    subProviders: {
      laserstreamGrpc: { configured: grpc.configured, endpoint: grpc.endpoint, features: grpc.features },
      websocket: { configured: ws.configured, endpoint: ws.endpoint },
      das: { configured: das.configured },
      priorityFee: { configured: Boolean(env.HELIUS_API_KEY) },
      webhooks: { configured: Boolean(env.HELIUS_WEBHOOK_ID) },
    },
    summary: {
      configured: grpc.configured,
      criticalBackend: grpc.configured ? 'gRPC-стриминг с 24h реплеем и failover' : 'not_configured',
      uiRealtime: ws.configured ? 'WebSocket для UI' : 'not_configured',
      metadata: das.configured ? 'DAS API для нормализации' : 'not_configured',
    },
    writes: false,
    dataQuality: grpc.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

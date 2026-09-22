/**
 * Sonic SVM — первый атомарный SVM L2 для игровых экономик
 * - HyperGrid: каждая игра получает выделенный «грид» — тысячи одновременных действий без конкуренции
 * - Sorada: read-операции в 30-40 раз быстрее стандартных RPC, ответ от 5 мс
 * - Rush (ECS): декларативный фреймворк — описываете мир и сущности в конфигах, SDK генерирует контракты
 */

export const SONIC_CONFIG = {
  provider: 'sonic-svm',
  type: 'Atomic SVM L2',
  settlement: 'Solana mainnet',
  features: {
    hyperGrid: true,
    sorada: true,
    rushEcs: true,
  },
  endpoints: {
    mainnet: 'https://api.mainnet-alpha.sonic.game',
    testnet: 'https://api.testnet.sonic.game',
    rpc: 'https://rpc.mainnet-alpha.sonic.game',
    grpc: 'https://grpc.mainnet-alpha.sonic.game',
  }
}

export function sonicHyperGridConfig({ gameId, env = process.env } = {}) {
  return {
    component: 'HyperGrid',
    provider: 'sonic-svm',
    gameId,
    description: 'Каждая игра получает выделенный «грид» — тысячи одновременных действий без конкуренции за ресурсы',
    gridId: gameId ? `grid_${gameId}_${env.SONIC_GRID_ID || 'auto'}` : null,
    isolation: true,
    concurrency: 'thousands of simultaneous actions',
    resourceContention: 'none — dedicated grid per game',
    configured: Boolean(env.SONIC_API_KEY || env.SONIC_GRID_ID),
    writes: false,
  }
}

export function sonicSoradaConfig(env = process.env) {
  return {
    component: 'Sorada',
    provider: 'sonic-svm',
    description: 'read-операции в 30–40 раз быстрее стандартных RPC, ответ от 5 мс',
    performance: {
      speedup: '30-40x vs standard RPC',
      latency: '5ms',
      type: 'read-optimized index',
    },
    endpoint: env.SONIC_SORADA_ENDPOINT || 'https://sorada.mainnet-alpha.sonic.game',
    configured: Boolean(env.SONIC_API_KEY),
    suitableFor: 'leaderboards, inventory reads, matchmaking queries',
    writes: false,
  }
}

export function sonicRushEcsConfig({ gameId } = {}) {
  return {
    component: 'Rush (ECS)',
    provider: 'sonic-svm',
    gameId,
    description: 'Декларативный фреймворк — описываете мир и сущности в конфигах, SDK генерирует контракты',
    ecs: {
      paradigm: 'Entity Component System',
      declarative: true,
      configExample: {
        world: {
          name: `${gameId} World`,
          entities: [
            { name: 'Player', components: ['Position', 'Health', 'Inventory'] },
            { name: 'PotatoField', components: ['Position', 'GrowthStage', 'Owner'] },
          ],
          systems: ['MovementSystem', 'HarvestSystem', 'EconomySystem'],
        }
      },
      sdkGenerates: 'Anchor contracts from config',
    },
    writes: false,
  }
}

export function sonicConfig(env = process.env) {
  return {
    provider: 'sonic-svm',
    apiKey: env.SONIC_API_KEY || null,
    configured: Boolean(env.SONIC_API_KEY),
    endpoints: SONIC_CONFIG.endpoints,
    components: {
      hyperGrid: sonicHyperGridConfig({ env }),
      sorada: sonicSoradaConfig(env),
      rush: sonicRushEcsConfig({ gameId: 'generic' }),
    },
    useCases: ['high-frequency games', 'MMO', 'real-time PvP'],
    writes: false,
  }
}

export function sonicHealth(env = process.env) {
  const cfg = sonicConfig(env)
  return {
    provider: 'sonic-svm',
    layer: 'l2',
    configured: cfg.configured,
    components: cfg.components,
    performance: {
      hyperGrid: 'dedicated grid per game, thousands concurrent actions',
      sorada: '30-40x faster reads, 5ms response',
    },
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

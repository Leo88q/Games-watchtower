/**
 * Собственный индексер на PostgreSQL для мультитенантной архитектуры
 * Рекомендация: комбинировать LaserStream (стриминг) + собственный индексер на PostgreSQL
 */

export const CUSTOM_INDEXER_CONFIG = {
  provider: 'custom-pg',
  db: 'PostgreSQL + TimescaleDB for time series',
  queue: 'Redis for queues, cache, realtime',
  features: {
    idempotency: true,
    deduplication: true,
    cursorReplay: true,
    backfill: true,
    reconnect: true,
    gapDetection: true,
    finalizedReconciliation: true,
    parserVersioning: true,
  },
  tables: [
    'raw_events', // cluster + slot + signature + instructionIndex + innerIndex canonical identity
    'parsed_events',
    'player_sessions',
    'player_profiles', // pseudonymous playerKey
    'economy_flows', // mint/burn/transfer
    'treasury_snapshots',
    'security_signals',
    'marketplace_listings',
    'cross_game_links',
    'investor_snapshots',
  ],
  timeseries: [
    'daily_active_players',
    'retention_cohorts',
    'economy_metrics_hourly',
    'rpc_latency',
    'indexer_lag',
  ]
}

export function customIndexerConfig(env = process.env) {
  return {
    provider: 'custom-pg',
    configured: Boolean(env.DATABASE_URL),
    databaseUrl: env.DATABASE_URL ? '***' : null, // never expose
    redisUrl: env.REDIS_URL ? '***' : null,
    tables: CUSTOM_INDEXER_CONFIG.tables,
    timeseries: CUSTOM_INDEXER_CONFIG.timeseries,
    features: CUSTOM_INDEXER_CONFIG.features,
    // Multitenant: each game has schema or tenant_id
    multitenant: {
      strategy: 'tenant_id column + row level security',
      tenants: ['ares1', 'aof', 'neonrelay', 'guttercaps'],
      crossGame: 'materialized view cross_game_players',
    },
    writes: false, // indexer is read-only from chain perspective, writes only to PG
    dataQuality: env.DATABASE_URL ? 'partial' : 'unavailable',
  }
}

export function indexerAggregationStrategy() {
  return {
    recommendation: 'LaserStream (стриминг) + Shyft (REST/колбэки) + собственный индексер',
    flow: [
      { step: 1, component: 'LaserStream gRPC', action: 'real-time streaming всех транзакций игровых программ, 24h replay on reconnect' },
      { step: 2, component: 'Shyft Callback', action: 'TOKEN_MINT, NFT_MINT вебхуки на ваш сервер' },
      { step: 3, component: 'Custom PG Indexer', action: 'парсинг, дедупликация по canonical identity, запись в PG' },
      { step: 4, component: 'TimescaleDB', action: 'агрегаты DAU/WAU/MAU, retention, economy' },
      { step: 5, component: 'Redis', action: 'очереди, кэш, realtime состояния' },
      { step: 6, component: 'Watchtower API', action: 'read-model API для дашборда, /api/read-model' },
    ],
    guarantees: [
      'idempotency по cluster+slot+signature+instructionIndex+innerIndex',
      'gap detection + backfill',
      'finalized reconciliation (confirmed vs finalized)',
      'parser versioning',
    ],
    writes: false,
  }
}

export function customIndexerHealth(env = process.env) {
  const cfg = customIndexerConfig(env)
  return {
    provider: 'custom-pg',
    layer: 'indexer',
    configured: cfg.configured,
    strategy: indexerAggregationStrategy(),
    tables: cfg.tables,
    multitenant: cfg.multitenant,
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

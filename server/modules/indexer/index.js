/**
 * Indexer Layer — Helius LaserStream + Shyft + Custom PG
 * Парсинг транзакций для мультитенантной архитектуры
 */

import { laserStreamGrpcConfig, laserStreamWebSocketConfig, heliusDasConfig, heliusPriorityFeeConfig, heliusWebhookConfig, laserStreamHealth, LASERSTREAM_CONFIG } from './laserstream.js'
import { shyftConfig, shyftCallbackConfig, shyftRestEndpoints, shyftHealth, SHYFT_CONFIG } from './shyft.js'
import { customIndexerConfig, indexerAggregationStrategy, customIndexerHealth, CUSTOM_INDEXER_CONFIG } from './custom-pg.js'

export function indexerLayerConfig(env = process.env) {
  const laser = laserStreamGrpcConfig(env)
  const ws = laserStreamWebSocketConfig(env)
  const das = heliusDasConfig(env)
  const shyft = shyftConfig(env)
  const custom = customIndexerConfig(env)

  return {
    layer: 'indexer',
    providers: {
      helius: {
        laserstream: laser,
        websocket: ws,
        das,
        priorityFee: heliusPriorityFeeConfig(env),
        webhook: heliusWebhookConfig(env),
      },
      shyft,
      customPg: custom,
    },
    strategy: indexerAggregationStrategy(),
    configuredCount: [laser, shyft, custom].filter(p => p.configured).length,
    totalProviders: 3,
    recommendation: 'Для мультитенантной архитектуры рекомендуется комбинировать LaserStream (стриминг) + собственный индексер на PostgreSQL',
    writes: false,
    dataQuality: [laser, shyft, custom].some(p => p.configured) ? 'partial' : 'unavailable',
  }
}

export function indexerHealth(env = process.env) {
  return {
    layer: 'indexer',
    generatedAt: new Date().toISOString(),
    helius: laserStreamHealth(env),
    shyft: shyftHealth(env),
    customPg: customIndexerHealth(env),
    summary: indexerLayerConfig(env),
    writes: false,
  }
}

export { LASERSTREAM_CONFIG, SHYFT_CONFIG, CUSTOM_INDEXER_CONFIG }
export { laserStreamGrpcConfig, shyftConfig, shyftCallbackConfig, customIndexerConfig }

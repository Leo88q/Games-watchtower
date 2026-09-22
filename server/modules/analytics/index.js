/**
 * Analytics Layer — Helika + GameSight
 * Рекомендация для мультиигрового ПО:
 * Helika — для кросс-игрового дашборда
 * GameSight — для сквозной атрибуции от рекламы до ончейн-транзакции
 */

import { helikaConfig, helikaHealth, helikaEventMapping, HELIKA_CONFIG } from './helika.js'
import { gameSightConfig, gameSightHealth, gameSightAttributionSetup, GAMESIGHT_CONFIG } from './gamesight.js'

export function analyticsLayerConfig(env = process.env) {
  const helika = helikaConfig(env)
  const gamesight = gameSightConfig(env)

  return {
    layer: 'analytics',
    providers: { helika, gamesight },
    strategy: {
      crossGameDashboard: {
        provider: 'helika',
        reason: 'Единый дашборд для Web2, in-game и on-chain данных, 10+ сетей, используется Yuga Labs',
        warning: helika.warning,
      },
      attribution: {
        provider: 'gamesight',
        reason: 'Автоматически подтягивает on-chain события как Anonymous Events с Wallet ID, Late ID Binding via solana_wallet as external_id',
        flow: 'ad_click -> player_joined (external_id) -> wallet_connected (solana_wallet) -> mint/buy/sell on-chain (Anonymous Event with Wallet ID)',
      }
    },
    eventEnrichment: {
      requiredFields: ['solana_wallet as external_id for GameSight', 'campaign_id for Helika'],
      mapping: helikaEventMapping(),
      attribution: gameSightAttributionSetup(),
    },
    configuredCount: [helika, gamesight].filter(p => p.configured).length,
    writes: false,
    dataQuality: [helika, gamesight].some(p => p.configured) ? 'partial' : 'unavailable',
  }
}

export function analyticsHealth(env = process.env) {
  return {
    layer: 'analytics',
    generatedAt: new Date().toISOString(),
    helika: helikaHealth(env),
    gamesight: gameSightHealth(env),
    summary: analyticsLayerConfig(env),
    writes: false,
  }
}

export { HELIKA_CONFIG, GAMESIGHT_CONFIG }

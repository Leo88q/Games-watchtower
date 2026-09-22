/**
 * GameSight (Solana-интеграция) — автоматически подтягивает on-chain события в отчётность
 * События приходят как Anonymous Events с Wallet ID
 * Для атрибуции нужно передавать solana_wallet как external_id в игровых событиях (Late ID Binding)
 * Отслеживает mint, buy, sell, transfer, burn
 */

export const GAMESIGHT_CONFIG = {
  provider: 'gamesight',
  solanaIntegration: true,
  anonymousEvents: true,
  walletId: true,
  lateIdBinding: true,
  trackedOnChain: ['mint', 'buy', 'sell', 'transfer', 'burn'],
}

export function gameSightConfig(env = process.env) {
  return {
    provider: 'gamesight',
    apiKey: env.GAMESIGHT_API_KEY || null,
    projectId: env.GAMESIGHT_PROJECT_ID || null,
    configured: Boolean(env.GAMESIGHT_API_KEY),
    endpoint: env.GAMESIGHT_ENDPOINT || 'https://api.gamesight.io',
    features: {
      solanaIntegration: true,
      anonymousEvents: true,
      walletIdTracking: true,
      lateIdBinding: true,
      attribution: true,
      crossChannel: true,
    },
    writes: false,
  }
}

export function gameSightAttributionSetup() {
  return {
    // Для атрибуции нужно передавать solana_wallet как external_id в игровых событиях (Late ID Binding)
    lateIdBinding: {
      description: 'Отслеживает от рекламы до ончейн-транзакции',
      steps: [
        { step: 1, action: 'Player clicks ad', event: 'ad_click', id: 'gamesight_click_id' },
        { step: 2, action: 'Player joins game', event: 'PlayerJoined', external_id: 'gamesight_click_id' },
        { step: 3, action: 'Player connects wallet', event: 'WalletConnected', external_id: 'solana_wallet', link: 'gamesight_click_id -> solana_wallet' },
        { step: 4, action: 'On-chain event', event: 'NFT_MINT / TOKEN_MINT', wallet_id: 'solana_wallet', anonymous: true },
        { step: 5, action: 'Attribution', result: 'ad_click -> wallet -> mint, full funnel' },
      ],
      implementation: {
        inGameEvent: {
          eventType: 'PlayerJoined',
          payload: {
            solana_wallet: 'wallet_address', // as external_id
            gamesight_click_id: 'click_id_from_url',
          }
        },
        onChainEvent: {
          type: 'Anonymous Event',
          walletId: 'solana_wallet',
          event: 'mint / buy / sell / transfer / burn',
        }
      }
    },
    trackedEvents: GAMESIGHT_CONFIG.trackedOnChain,
  }
}

export function gameSightHealth(env = process.env) {
  const cfg = gameSightConfig(env)
  return {
    provider: 'gamesight',
    layer: 'analytics',
    configured: cfg.configured,
    features: cfg.features,
    attribution: gameSightAttributionSetup(),
    recommendation: 'Для сквозной атрибуции от рекламы до ончейн-транзакции',
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

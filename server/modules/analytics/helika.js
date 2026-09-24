/**
 * Helika — единый дашборд для Web2, in-game и on-chain данных
 * Продукты: user acquisition, маркетинговая атрибуция, LiveOps, A/B-тесты, on-chain аналитика по 10+ сетям
 * Используется Yuga Labs и Treasure
 * Осторожно: компания публично смещает фокус в сторону AI-продуктов
 */

export const HELIKA_CONFIG = {
  provider: 'helika',
  type: 'cross-game analytics dashboard',
  networks: 10, // on-chain analytics по 10+ сетям
  clients: ['Yuga Labs', 'Treasure'],
  warning: 'Компания публично смещает фокус в сторону AI-продуктов — учитывайте риск',
  products: ['user acquisition', 'marketing attribution', 'LiveOps', 'A/B tests', 'on-chain analytics'],
}

export function helikaConfig(env = process.env) {
  return {
    provider: 'helika',
    apiKeyConfigured: Boolean(env.HELIKA_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    projectId: env.HELIKA_PROJECT_ID || null,
    configured: Boolean(env.HELIKA_API_KEY),
    endpoint: env.HELIKA_ENDPOINT || 'https://api.helika.io',
    products: HELIKA_CONFIG.products,
    features: {
      web2Ingestion: true,
      inGameEvents: true,
      onChainAnalytics: true,
      crossGameDashboard: true,
      abTesting: true,
      liveOps: true,
    },
    warning: HELIKA_CONFIG.warning,
    writes: false,
  }
}

export function helikaEventMapping() {
  return {
    // Mapping Watchtower events -> Helika
    player: {
      WalletConnected: 'wallet_connected',
      PlayerJoined: 'player_joined',
      SessionStarted: 'session_started',
      SessionEnded: 'session_ended',
    },
    economy: {
      TokenMinted: 'token_minted',
      TokenBurned: 'token_burned',
      PurchaseCompleted: 'purchase_completed',
      RewardClaimed: 'reward_claimed',
    },
    game: {
      MatchStarted: 'match_started',
      MatchFinished: 'match_finished',
      QuestCompleted: 'quest_completed',
    },
    attribution: {
      campaignId: 'campaign_id',
      source: 'utm_source',
      externalId: 'solana_wallet', // for Late ID Binding
    }
  }
}

export function helikaHealth(env = process.env) {
  const cfg = helikaConfig(env)
  return {
    provider: 'helika',
    layer: 'analytics',
    configured: cfg.configured,
    products: cfg.products,
    features: cfg.features,
    warning: cfg.warning,
    eventMapping: helikaEventMapping(),
    recommendation: 'Для кросс-игрового дашборда',
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

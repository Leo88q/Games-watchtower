const definitions = {
  ares1: {
    name: 'ARES-1',
    programEnv: 'ARES1_PROGRAM_ID',
    eventTypes: ['PlayerJoined', 'PotatoPlanted', 'PotatoHarvested', 'RewardGranted', 'TokenMinted', 'TokenBurned', 'TreasuryChanged'],
    resources: ['POTATO'],
    quality: 'partial',
  },
  aof: {
    name: 'Age of Farming',
    programEnv: 'AOF_CORE_PROGRAM_ID',
    eventTypes: ['PlayerJoined', 'PlotCreated', 'CropHarvested', 'CraftCompleted', 'RewardGranted', 'TokenMinted', 'TokenBurned'],
    resources: ['AOF_REWARD'],
    quality: 'unavailable',
  },
  neonrelay: {
    name: 'Neon Relay',
    programEnv: 'NEONRELAY_REWARDS_PROGRAM_ID',
    eventTypes: ['PlayerJoined', 'RaceStarted', 'RaceFinished', 'RewardGranted', 'TokenMinted', 'TokenBurned', 'MatchSettled'],
    resources: ['NEON_REWARD'],
    quality: 'partial',
  },
  guttercaps: {
    name: 'GUTTERCAPS',
    programEnv: 'GUTTERCAPS_CORE_PROGRAM_ID',
    eventTypes: ['PlayerJoined', 'PackOpened', 'AssetMinted', 'AssetTransferred', 'WagerCreated', 'WagerSettled', 'RewardGranted', 'TokenBurned'],
    resources: ['$CG'],
    quality: 'partial',
  },
  trafficgen: {
    name: 'Traffic Generator - TalkChart Traffic Generator & Audience Layer',
    kind: 'traffic',
    offchain: true,
    apiBaseUrlEnv: 'TRAFFICGEN_API_BASE_URL',
    // Обновлено по финальному отчету trafficgen 2026-09-22: 17 implemented, 12 unavailable, stage live, hybrid
    // Implemented: SessionStarted, PageView, Click, CTAClicked, SessionEnded, DataGapDetected, DataGapHealed, RateLimited,
    // CampaignCreated/Started/Stopped/Updated, SourceConnected/Disconnected/HealthChanged, PageAssigned/Removed (reconciler config store)
    eventTypes: [
      'CampaignCreated', 'CampaignStarted', 'CampaignStopped', 'CampaignUpdated',
      'SourceConnected', 'SourceDisconnected', 'SourceHealthChanged',
      'PageAssigned', 'PageRemoved',
      'SessionStarted', 'PageView', 'Click', 'CTAClicked', 'SessionEnded',
      'DataGapDetected', 'DataGapHealed', 'RateLimited',
      // 2026-09-24: подтверждение перехода по click-id (/r/<clickId> + beacon игры) — patches/talkchart-traffic-generator
      'LandingReached',
    ],
    unavailableEvents: [
      { type: 'SessionAbandoned', reason: 'не реализовано, нет детектора abandon' },
      { type: 'NavigationCompleted', reason: 'не реализовано' },
      { type: 'DeliveryFailed', reason: 'нет инструментирования фабрики fetch_data.py' },
      { type: 'RetryScheduled', reason: 'не реализовано' },
      { type: 'TrafficError', reason: 'нужна точка эмиссии в factory' },
      { type: 'ExporterHealth', reason: 'через /watchtower/health вместо события' },
      { type: 'BotFlagged', reason: 'пока через sourceType bot' },
      { type: 'AnomalyDetected', reason: 'не реализовано' },
      { type: 'AbuseBlocked', reason: 'не реализовано' },
      { type: 'ConfigUpdated', reason: 'через reconciler, не отдельное событие' },
      { type: 'EmergencyPause', reason: 'не реализовано' },
    ],
    resources: [],
    // По отчету: stage live, traffic_type hybrid, 17 implemented, 12 unavailable, data_quality partial честно
    // 16/16 unit tests OK, 45/45 smoke OK, secret scan 415 files 0 candidates, live 12/12 GET 200
    quality: 'partial',
    stage: 'live',
    trafficType: 'hybrid',
    implementedCount: 18,
    unavailableCount: 11,
    lastSyncedAt: '2026-09-22T18:00Z',
    dataQuality: 'partial',
    // Кампании и источники из отчета
    campaigns: ['talkchart_seo', 'talkchart_social_x', 'talkchart_video_reels', 'talkchart_interactive_radar', 'tiplink_welcome_drop'],
    sources: ['x_twitter', 'perplexity_ai', 'chatgpt_search', 'google_search', 'short_video', 'tiplink_referral', 'direct_web', 'factory_pipeline'],
    pages: ['target_terminal', 'target_sixsec', 'target_duel', 'target_crash', 'target_quest', 'target_tiplink_claim'],
    // Campaign → GameId mapping — какая кампания ведёт в какую игру
    campaignGameMap: {
      target_terminal: 'ares1',
      target_sixsec: 'ares1',
      target_duel: 'neonrelay',
      target_crash: 'guttercaps',
      target_quest: 'aof',
    },
  },
}

export function gameAdapters(env = process.env) {
  return Object.entries(definitions).map(([gameId, definition]) => {
    const programId = definition.programEnv ? env[definition.programEnv] || null : null
    const apiBaseUrl = definition.apiBaseUrlEnv ? env[definition.apiBaseUrlEnv] || null : null
    return {
      gameId, ...definition, programId, apiBaseUrl,
      configured: Boolean(programId || apiBaseUrl),
      writes: false,
    }
  })
}

export function getGameAdapter(gameId, env = process.env) { return gameAdapters(env).find((adapter) => adapter.gameId === gameId) || null }

export function decodeGameEvent(gameId, event, env = process.env) {
  const adapter = getGameAdapter(gameId, env)
  if (!adapter) return { accepted: false, reason: 'game_adapter_not_found' }
  const known = adapter.eventTypes.includes(event.eventType)
  return {
    accepted: true,
    gameId,
    eventType: event.eventType || 'Unknown',
    knownEvent: known,
    parserVersion: known ? `${gameId}-v1` : `${gameId}-raw-v1`,
    dataQuality: adapter.configured && known ? 'partial' : 'unavailable',
    resourceIds: adapter.resources,
    writes: false,
  }
}

export function adapterReadiness(env = process.env) {
  const adapters = gameAdapters(env)
  return { total: adapters.length, configured: adapters.filter((adapter) => adapter.configured).length, ready: adapters.filter((adapter) => adapter.configured && adapter.quality !== 'unavailable').length, writes: false, adapters }
}

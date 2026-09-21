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
}

export function gameAdapters(env = process.env) {
  return Object.entries(definitions).map(([gameId, definition]) => ({
    gameId, ...definition, programId: env[definition.programEnv] || null,
    configured: Boolean(env[definition.programEnv]),
    writes: false,
  }))
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

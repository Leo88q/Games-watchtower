import { aggregateOverview, buildAiReport, securitySummary } from '../../src/engine/analytics.js'

export function investorReport() {
  const overview = aggregateOverview()
  const security = securitySummary()
  const numeric = (key) => overview.games.reduce((sum, game) => sum + (Number(game[key]) || 0), 0)
  const players = numeric('players')
  const volume = numeric('volume')
  return {
    reportId: `investor-${new Date().toISOString().slice(0, 10)}`,
    generatedAt: new Date().toISOString(),
    period: '7d UTC',
    metrics: {
      activePlayers: players,
      newPlayers: numeric('newPlayers'),
      retentionD7: 'partial',
      payerConversion: 'partial',
      volume,
      treasury: numeric('treasury'),
      minted: numeric('minted'),
      burned: numeric('burned'),
      criticalIncidents: security.critical,
      dataQuality: 'partial',
    },
    games: overview.games.map((game) => ({ id: game.id, name: game.name, players: game.players, volume: game.volume, healthScore: game.score, dataQuality: game.health.dataQuality })),
    narrative: buildAiReport().conclusions,
    privacy: 'aggregated-no-personal-data',
    confidence: volume || players ? 'partial' : 'unavailable',
  }
}

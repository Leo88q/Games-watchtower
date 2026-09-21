import { GAME_REGISTRY } from '../data/registry.js'
import { MOCK_GAME_DATA, getAllAlerts } from '../data/mock-events.js'

export const QUALITY_WEIGHT = { complete: 1, partial: .55, unavailable: 0 }

export function aggregateOverview() {
  const rows = GAME_REGISTRY.map((game) => {
    const data = MOCK_GAME_DATA[game.id]
    return { ...game, ...data.metrics, health: data.health, score: healthScore(game, data) }
  })
  const numeric = (key) => rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
  return { games: rows, activePlayers: numeric('players'), newPlayers: numeric('newPlayers'), minted: numeric('minted'), burned: numeric('burned'), alerts: getAllAlerts() }
}

export function healthScore(game, data) {
  const base = QUALITY_WEIGHT[game.dataQuality] * 72
  const health = data.health.ok ? 18 : 0
  const alertPenalty = data.alerts.reduce((total, alert) => total + (alert.severity === 'critical' ? 12 : 5), 0)
  return Math.max(0, Math.round(base + health - alertPenalty))
}

export function forecast(gameId, horizon = 7) {
  const data = MOCK_GAME_DATA[gameId]
  if (!data) return { status: 'unavailable', points: [] }
  const source = data.trends.players
  const usable = source.filter((point) => point.value > 0)
  if (usable.length < 3) return { status: 'unavailable', reason: 'Недостаточно исторических данных', points: [] }
  const first = usable[0].value
  const last = usable[usable.length - 1].value
  const dailyGrowth = (last - first) / Math.max(1, usable.length - 1)
  const points = Array.from({ length: horizon }, (_, index) => ({ day: index + 1, value: Math.max(0, Math.round(last + dailyGrowth * (index + 1))) }))
  return { status: 'forecast', confidence: data.health.dataQuality === 'complete' ? .82 : .48, points, dailyGrowth: Math.round(dailyGrowth) }
}

export function detectAnomalies() {
  return getAllAlerts().map((alert) => ({ ...alert, category: alert.title.toLowerCase().includes('эконом') ? 'economy' : 'security', detector: alert.severity === 'critical' ? 'security-gate' : 'data-quality', confidence: alert.severity === 'critical' ? .96 : .78 }))
}

export function securitySummary() {
  const alerts = detectAnomalies()
  return { generatedAt: new Date().toISOString(), openIncidents: alerts.length, critical: alerts.filter((item) => item.severity === 'critical').length, high: alerts.filter((item) => item.severity === 'high').length, attacks24h: 37, blocked24h: 31, blockRate: .84, suspiciousPlayers: 18, riskClusters: 6, meanTimeToDetectMinutes: 4, dataQuality: 'partial' }
}

export function buildAiReport() {
  const overview = aggregateOverview()
  const reliable = overview.games.filter((game) => game.health.dataQuality !== 'unavailable')
  return { generatedAt: new Date().toISOString(), ecosystemScore: Math.round(reliable.reduce((sum, game) => sum + game.score, 0) / Math.max(1, overview.games.length)), criticalCount: overview.alerts.filter((alert) => alert.severity === 'critical').length, conclusions: [`${reliable.length} из ${overview.games.length} игр имеют хотя бы частичный поток данных.`, 'Экономические write-операции отключены: интеграции находятся в read-only режиме.', 'Главный пробел экосистемы — отсутствие подтверждённых production deployment и исторических player-day данных.'] }
}

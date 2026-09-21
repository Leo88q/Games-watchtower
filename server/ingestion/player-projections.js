import { createHash } from 'node:crypto'
import { list } from './event-inbox.js'

function playerKey(event) {
  const raw = event.payload?.playerKey || event.payload?.walletHash || event.payload?.wallet || event.payload?.playerId
  if (!raw) return null
  return `p-${createHash('sha256').update(String(raw)).digest('hex').slice(0, 10)}`
}

function eventPlayers(events, predicate) {
  return new Set(events.filter(predicate).map(playerKey).filter(Boolean))
}

export function buildFunnel({ gameId, limit = 5000 } = {}) {
  const events = list({ limit }).filter((event) => !gameId || event.payload?.gameId === gameId)
  const stages = [
    ['first_entry', 'Первый вход', (event) => ['PlayerJoined', 'WalletConnected', 'SessionStarted'].includes(event.eventType)],
    ['first_action', 'Первое действие', (event) => ['MatchStarted', 'RaceStarted', 'PlotCreated', 'PotatoPlanted', 'PackOpened'].includes(event.eventType)],
    ['day_one_return', 'Вернулись на 1-й день', (event) => event.eventType === 'RetentionDay1'],
    ['day_seven_return', 'Вернулись на 7-й день', (event) => event.eventType === 'RetentionDay7'],
    ['purchase', 'Сделали покупку', (event) => ['PurchaseCompleted', 'PackPurchased', 'PaymentSettled'].includes(event.eventType)],
    ['cross_game', 'Открыли вторую игру', (event) => event.eventType === 'CrossGameEntry'],
  ]
  const counts = stages.map(([id, label, predicate]) => ({ id, label, players: eventPlayers(events, predicate).size }))
  const base = counts[0]?.players || 0
  return { gameId: gameId || 'all', stages: counts.map((stage) => ({ ...stage, conversionRate: base ? Number((stage.players / base * 100).toFixed(2)) : null })), events: events.length, dataQuality: events.length ? 'partial' : 'unavailable', privacy: 'anonymized-player-keys', generatedAt: new Date().toISOString() }
}

export function crossGameSegments({ limit = 5000 } = {}) {
  const groups = new Map()
  for (const event of list({ limit })) {
    const key = playerKey(event); const gameId = event.payload?.gameId
    if (!key || !gameId) continue
    if (!groups.has(key)) groups.set(key, new Set())
    groups.get(key).add(gameId)
  }
  const segments = { oneGame: [], twoGames: [], threeOrMore: [] }
  for (const [player, gameSet] of groups) {
    const item = { playerGroup: player, games: [...gameSet].sort(), gameCount: gameSet.size }
    if (gameSet.size === 1) segments.oneGame.push(item)
    else if (gameSet.size === 2) segments.twoGames.push(item)
    else segments.threeOrMore.push(item)
  }
  return { counts: { oneGame: segments.oneGame.length, twoGames: segments.twoGames.length, threeOrMore: segments.threeOrMore.length }, segments, privacy: 'anonymized-player-keys', dataQuality: groups.size ? 'partial' : 'unavailable', generatedAt: new Date().toISOString() }
}

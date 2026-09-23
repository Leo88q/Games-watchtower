import { createHash } from 'node:crypto'
import { list } from './event-inbox.js'

// Cross-game inventory items — studio_profile PDA simulation
const CROSS_GAME_ITEMS = [
  { assetId: 'cgi_00001', sourceGame: 'ares1', itemType: 'potato_golden', rarity: 'legendary', isCnft: true, usedInGames: ['ares1'] },
  { assetId: 'cgi_00002', sourceGame: 'ares1', itemType: 'speed_boost_potato', rarity: 'epic', isCnft: true, usedInGames: ['ares1', 'neonrelay'] },
  { assetId: 'cgi_00003', sourceGame: 'aof', itemType: 'golden_plow', rarity: 'legendary', isCnft: true, usedInGames: ['aof'] },
  { assetId: 'cgi_00004', sourceGame: 'aof', itemType: 'growth_elixir', rarity: 'epic', isCnft: true, usedInGames: ['aof', 'ares1'] },
  { assetId: 'cgi_00005', sourceGame: 'neonrelay', itemType: 'nitro_boost', rarity: 'legendary', isCnft: true, usedInGames: ['neonrelay'] },
  { assetId: 'cgi_00006', sourceGame: 'neonrelay', itemType: 'smoke_trail_skin', rarity: 'epic', isCnft: true, usedInGames: ['neonrelay', 'guttercaps'] },
  { assetId: 'cgi_00007', sourceGame: 'guttercaps', itemType: 'golden_cap', rarity: 'legendary', isCnft: true, usedInGames: ['guttercaps'] },
  { assetId: 'cgi_00008', sourceGame: 'guttercaps', itemType: 'laser_sight', rarity: 'epic', isCnft: true, usedInGames: ['guttercaps', 'ares1'] },
]

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

/**
 * Cross-game projection — отслеживает какие предметы из какой игры используются в других играх
 * Эмулирует PDA studio_profile с cross_game_items массивом
 */
export function buildCrossGameProjection({ limit = 5000 } = {}) {
  const events = list({ limit })
  const links = []
  const usedItems = new Map() // gameId -> Set<assetId>

  for (const item of CROSS_GAME_ITEMS) {
    for (const targetGame of item.usedInGames) {
      if (targetGame !== item.sourceGame) {
        // Cross-game usage detected
        links.push({
          eventType: 'CrossGameLinked',
          sourceGame: item.sourceGame,
          targetGame,
          assetId: item.assetId,
          itemType: item.itemType,
          rarity: item.rarity,
          isCnft: item.isCnft,
          linkedAt: new Date().toISOString(),
          programId: 'CgInv111111111111111111111111111111111111111',
          pda: `studio_profile_pda_${item.assetId}`,
        })
      }
    }
    if (!usedItems.has(item.sourceGame)) usedItems.set(item.sourceGame, new Set())
    usedItems.get(item.sourceGame).add(item.assetId)
  }

  return {
    totalItems: CROSS_GAME_ITEMS.length,
    crossGameLinks: links,
    linksCount: links.length,
    crossGamePairs: [
      { from: 'ares1', to: 'neonrelay', items: CROSS_GAME_ITEMS.filter(i => i.sourceGame === 'ares1' && i.usedInGames.includes('neonrelay')).map(i => i.itemType) },
      { from: 'aof', to: 'ares1', items: CROSS_GAME_ITEMS.filter(i => i.sourceGame === 'aof' && i.usedInGames.includes('ares1')).map(i => i.itemType) },
      { from: 'neonrelay', to: 'guttercaps', items: CROSS_GAME_ITEMS.filter(i => i.sourceGame === 'neonrelay' && i.usedInGames.includes('guttercaps')).map(i => i.itemType) },
      { from: 'guttercaps', to: 'ares1', items: CROSS_GAME_ITEMS.filter(i => i.sourceGame === 'guttercaps' && i.usedInGames.includes('ares1')).map(i => i.itemType) },
    ],
    itemsPerGame: Object.fromEntries([...usedItems].map(([game, items]) => [game, [...items]])),
    programId: 'CgInv111111111111111111111111111111111111111',
    pdaSeeds: ['b"studio_profile"', 'owner.key().as_ref()'],
    privacy: 'anonymized-player-keys',
    dataQuality: 'partial',
    writes: false,
    generatedAt: new Date().toISOString(),
  }
}

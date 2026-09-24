import { list } from './event-inbox.js'
import { anonymizeIdentifier } from '../security/pii.js'

/**
 * События, которыми игра сообщает о переносе предмета между играми.
 * Хаб их только читает: он никогда не выдаёт предметы и не пишет в блокчейн (writes: false).
 */
const LINK_EVENTS = ['BridgeIn', 'BridgeOut', 'CrossGameLinked', 'CrossGameAssetGranted']

/** Псевдоним игрока: та же функция и та же соль, что и в /api/events — идентификаторы не «разъезжаются». */
function playerKey(event) {
  const raw = event.payload?.playerKey || event.payload?.walletHash || event.payload?.wallet || event.payload?.playerId
  return anonymizeIdentifier(raw)
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
 * Перенос предметов между играми: только наблюдение по фактам из inbox.
 *
 * Раньше здесь была заглушка: список предметов (`cgi_00001…`) и связки вида «neonrelay → guttercaps»
 * были захардкожены, а ответ помечался `dataQuality: partial`. Теперь каждый перенос — это реальное
 * событие игры (`BridgeIn`, `BridgeOut`, `CrossGameLinked`, `CrossGameAssetGranted`); если событий нет,
 * ответ честно `unavailable` с перечнем нужных событий, а не пример переноса.
 *
 * Хаб остаётся read-only: он не выдаёт предметы и не переводит активы — это делает игра и контракт.
 */
export function buildCrossGameProjection({ limit = 5000 } = {}) {
  const events = list({ limit })
  const links = new Map()
  const players = new Set()

  for (const event of events) {
    if (!LINK_EVENTS.includes(event.eventType)) continue
    const payload = event.payload || {}
    const gameId = event.gameId || payload.gameId || null
    const counterpart = payload.targetGame || payload.toGame || payload.sourceGame || payload.fromGame || null
    let sourceGame = null
    let targetGame = null
    if (event.eventType === 'BridgeIn') { sourceGame = counterpart; targetGame = gameId }
    else if (event.eventType === 'BridgeOut') { sourceGame = gameId; targetGame = counterpart }
    else { sourceGame = payload.sourceGame || payload.fromGame || gameId; targetGame = payload.targetGame || payload.toGame || gameId }
    // Своя игра и контрагент должны различаться: событие внутри одной игры — не переплетение.
    if (!sourceGame || !targetGame || sourceGame === targetGame) continue

    const player = playerKey(event)
    if (player) players.add(player)
    const assetId = payload.assetId || payload.mint || payload.asset || null
    // Один предмет, о котором сообщили два события (BridgeIn и CrossGameLinked), — это одна связка.
    const key = `${sourceGame}→${targetGame}→${assetId || payload.itemType || payload.item || event.eventId}`
    if (!links.has(key)) {
      links.set(key, {
        sourceGame,
        targetGame,
        assetId,
        itemType: payload.itemType || payload.item || null,
        rarity: payload.rarity || null,
        isCnft: payload.isCnft === true,
        eventTypes: [],
        firstSeenAt: null,
        lastSeenAt: null,
      })
    }
    const link = links.get(key)
    if (!link.eventTypes.includes(event.eventType)) link.eventTypes.push(event.eventType)
    const seenAt = event.blockTime || event.observedAt || null
    if (seenAt && (!link.firstSeenAt || seenAt < link.firstSeenAt)) link.firstSeenAt = seenAt
    if (seenAt && (!link.lastSeenAt || seenAt > link.lastSeenAt)) link.lastSeenAt = seenAt
  }

  const linkList = [...links.values()]
  const pairs = new Map()
  for (const link of linkList) {
    const key = `${link.sourceGame}→${link.targetGame}`
    if (!pairs.has(key)) pairs.set(key, { from: link.sourceGame, to: link.targetGame, count: 0, items: new Set() })
    const pair = pairs.get(key)
    pair.count += 1
    if (link.itemType) pair.items.add(link.itemType)
  }

  return {
    totalLinks: linkList.length,
    links: linkList,
    crossGamePairs: [...pairs.values()].map((pair) => ({ ...pair, items: [...pair.items] })),
    playersInvolved: players.size,
    // Контракт кросс-игрового инвентаря в репозитории — спецификация, а не задеплоенная программа.
    contract: {
      programId: 'CgInv111111111111111111111111111111111111111',
      pdaSeeds: ['b"studio_profile"', 'owner.key().as_ref()'],
      status: 'spec-only-not-deployed',
      note: 'Хаб контракт не вызывает: он read-only. Проверка — npm run test:readonly.',
    },
    requiredEvents: LINK_EVENTS,
    privacy: 'anonymized-player-keys',
    dataQuality: linkList.length ? 'partial' : 'unavailable',
    reason: linkList.length
      ? null
      : `Ни одна игра не сообщила о переносе предмета между играми: нужны события ${LINK_EVENTS.join(', ')}. Пустой список означает отсутствие данных, а не отсутствие переплетения.`,
    writes: false,
    generatedAt: new Date().toISOString(),
  }
}

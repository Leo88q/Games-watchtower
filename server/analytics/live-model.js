/**
 * Живая модель чтения: считается ТОЛЬКО по событиям event-inbox и реестру игр.
 *
 * Правило честности (G18): если значение вывести нельзя — возвращается null и
 * dataQuality='unavailable' с причиной. Никаких «похожих» чисел, моков и дефолтов.
 * Демо-данные живут отдельным путём (?demo=1) и всегда помечены demo:true.
 */

import { GAME_REGISTRY } from '../../src/data/registry.js'
import { allEvents, list, windowEvents, inboxStatus, freshness } from '../ingestion/event-inbox.js'
import { classifyEvent, eventAmount, eventGame, eventPlayer, isBot } from '../economy/metrics.js'
import { crossGameSegments } from '../ingestion/player-projections.js'
import { adapterReadiness } from '../ingestion/game-adapters.js'

const DAY_MS = 86_400_000

function firstSeenIndex(events) {
  const first = new Map()
  for (const event of events) {
    const player = eventPlayer(event)
    if (!player) continue
    const time = Date.parse(event.timestamp || event.observedAt || 0) || 0
    const current = first.get(player)
    if (current === undefined || time < current) first.set(player, time)
  }
  return first
}

function emptyGameRow(game) {
  return {
    ...game,
    players: null,
    newPlayers: null,
    retention: null,
    minted: null,
    burned: null,
    volume: null,
    treasury: null,
    health: { ok: false, dataQuality: 'unavailable', rpc: 'unknown', lastEventAt: null, reason: 'В окне наблюдения нет событий этой игры' },
    score: null,
    alerts: [],
  }
}

/**
 * Агрегаты по играм за окно. Возвращает честные null там, где данных нет.
 */
export function liveAggregates({ windowDays = 7, now = Date.now() } = {}) {
  const since = now - windowDays * DAY_MS
  const windowed = windowEvents({ since, until: now })
  const all = allEvents()
  const firstSeen = firstSeenIndex(all)
  const human = windowed.filter((event) => !isBot(event))
  const byGame = new Map()

  for (const game of GAME_REGISTRY) {
    const rows = human.filter((event) => eventGame(event) === game.id)
    const bucket = byGame.get(game.id) || { players: new Set(), newPlayers: new Set(), minted: 0, burned: 0, trade: 0, sink: 0, mintSeen: false, burnSeen: false, tradeSeen: false, sinkSeen: false, lastEventAt: null, alerts: [] }
    for (const event of rows) {
      const player = eventPlayer(event)
      if (player) {
        bucket.players.add(player)
        const seen = firstSeen.get(player)
        if (seen !== undefined && seen >= since) bucket.newPlayers.add(player)
      }
      const amount = eventAmount(event)
      const { class: kind } = classifyEvent(event)
      if (Number.isFinite(amount)) {
        if (kind === 'mint') { bucket.minted += amount; bucket.mintSeen = true }
        if (kind === 'burn') { bucket.burned += amount; bucket.burnSeen = true }
        if (kind === 'trade' || kind === 'fee') { bucket.trade += amount; bucket.tradeSeen = true }
        if (kind === 'sink') { bucket.sink += amount; bucket.sinkSeen = true }
      }
      const time = Date.parse(event.timestamp || event.observedAt || 0)
      if (Number.isFinite(time) && (bucket.lastEventAt === null || time > bucket.lastEventAt)) bucket.lastEventAt = time
    }
    byGame.set(game.id, bucket)
  }

  const games = GAME_REGISTRY.map((game) => {
    const bucket = byGame.get(game.id)
    if (!bucket || (!bucket.players.size && !bucket.minted && !bucket.burned && !bucket.trade && !bucket.sink)) return emptyGameRow(game)
    const hasPlayers = bucket.players.size > 0
    const hasFlows = bucket.mintSeen || bucket.burnSeen || bucket.tradeSeen || bucket.sinkSeen
    const dataQuality = hasPlayers && hasFlows ? 'complete' : 'partial'
    return {
      ...game,
      dataQuality,
      players: hasPlayers ? bucket.players.size : null,
      newPlayers: hasPlayers ? bucket.newPlayers.size : null,
      retention: null,
      minted: bucket.mintSeen ? Number(bucket.minted.toFixed(4)) : null,
      burned: bucket.burnSeen ? Number(bucket.burned.toFixed(4)) : null,
      volume: bucket.tradeSeen || bucket.sinkSeen ? Number((bucket.trade + bucket.sink).toFixed(4)) : null,
      treasury: null,
      health: {
        ok: true,
        dataQuality,
        rpc: 'not-read',
        lastEventAt: bucket.lastEventAt ? new Date(bucket.lastEventAt).toISOString() : null,
        reason: hasPlayers && hasFlows ? null : 'Часть событий отсутствует: показаны только подтверждённые значения',
      },
      score: null,
      alerts: [],
    }
  })

  const numeric = (key) => {
    const values = games.map((game) => game[key]).filter((value) => Number.isFinite(value))
    return values.length ? Number(values.reduce((sum, value) => sum + value, 0).toFixed(4)) : null
  }

  return {
    games,
    activePlayers: numeric('players'),
    newPlayers: numeric('newPlayers'),
    minted: numeric('minted'),
    burned: numeric('burned'),
    volume: numeric('volume'),
    eventsInWindow: windowed.length,
    eventsHumanInWindow: human.length,
    windowDays,
    generatedAt: new Date(now).toISOString(),
  }
}

/** Алерты строятся из фактов окна: тишина, концентрация, боты, отсутствие стоков. */
export function liveAlerts({ windowDays = 7, now = Date.now() } = {}) {
  const aggregates = liveAggregates({ windowDays, now })
  const alerts = []
  const since = now - windowDays * DAY_MS
  const events = windowEvents({ since, until: now })
  const human = events.filter((event) => !isBot(event))
  const status = inboxStatus(now)
  if (!status.events) {
    alerts.push({ id: 'ingest-silence', severity: 'critical', gameId: null, title: 'События не поступают', detail: 'В inbox нет ни одного события: метрики недоступны, а не нулевые.', detector: 'silence-gate', confidence: 1 })
  } else if (!events.length) {
    alerts.push({ id: 'window-empty', severity: 'critical', gameId: null, title: `Нет событий за ${windowDays} дн.`, detail: `Последнее событие: ${status.lastEventAt || 'нет'} (${status.lastEventAgeSeconds ?? '—'} с назад).`, detector: 'silence-gate', confidence: 1 })
  }
  for (const game of aggregates.games) {
    if (!game.health.ok) alerts.push({ id: `game-silent-${game.id}`, severity: 'high', gameId: game.id, title: `${game.name}: нет данных в окне`, detail: game.health.reason, detector: 'data-quality', confidence: 1 })
  }
  const players = (event) => eventPlayer(event)
  const earnings = new Map()
  for (const event of human) {
    const amount = eventAmount(event)
    if (!Number.isFinite(amount)) continue
    const key = players(event) || 'unknown'
    earnings.set(key, (earnings.get(key) || 0) + amount)
  }
  const values = [...earnings.values()].sort((a, b) => b - a)
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total > 0) {
    const top10 = values.slice(0, Math.max(1, Math.ceil(values.length * 0.1))).reduce((sum, value) => sum + value, 0) / total
    if (top10 >= 0.8) alerts.push({ id: 'concentration', severity: 'high', gameId: null, title: 'Высокая концентрация заработка', detail: `Топ-10% кошельков получают ${(top10 * 100).toFixed(1)}% наград.`, detector: 'economy-gate', confidence: 0.9 })
  }
  const bots = events.length ? events.filter(isBot).length / events.length : 0
  if (bots >= 0.3) alerts.push({ id: 'bot-share', severity: 'high', gameId: null, title: 'Высокая доля ботов', detail: `Доля событий с признаком бота: ${(bots * 100).toFixed(1)}%.`, detector: 'economy-gate', confidence: 0.9 })

  const adapters = adapterReadiness()
  if (!adapters.configured) {
    alerts.push({ id: 'adapters-unconfigured', severity: 'medium', gameId: null, title: 'Адаптеры игр не настроены', detail: 'Ни одна игра не передаёт programId/apiBaseUrl — боевые события не могут быть проверены.', detector: 'config-gate', confidence: 1 })
  }
  return alerts
}

/** adjacent-аналитика: только из событий и статуса inbox. */
export function liveAdjacent({ windowDays = 7, now = Date.now() } = {}) {
  const aggregates = liveAggregates({ windowDays, now })
  const status = inboxStatus(now)
  const crossGame = crossGameSegments({ limit: 5000 })
  const human = aggregates.eventsHumanInWindow
  const withData = aggregates.games.filter((game) => game.health.ok).length
  const dataCoverage = aggregates.games.length ? withData / aggregates.games.length : 0
  const burnRatio = aggregates.minted ? Number(((aggregates.burned || 0) / aggregates.minted).toFixed(3)) : null
  return {
    generatedAt: new Date(now).toISOString(),
    source: 'event-inbox',
    demo: false,
    dataQuality: human ? (dataCoverage >= 0.75 ? 'partial' : 'limited') : 'unavailable',
    reason: human ? null : 'В inbox нет событий за окно наблюдения',
    sections: {
      engagement: {
        title: 'Вовлечённость',
        metrics: {
          activePlayers: aggregates.activePlayers,
          newPlayerShare: aggregates.activePlayers ? Number((aggregates.newPlayers / aggregates.activePlayers * 100).toFixed(2)) : null,
          returningPlayerProxy: aggregates.activePlayers ? Number((1 - aggregates.newPlayers / aggregates.activePlayers).toFixed(3)) : null,
          crossGameGroups: crossGame.counts.twoGames + crossGame.counts.threeOrMore,
        },
        interpretation: 'Показывает, растёт ли аудитория и переходит ли она между играми.',
      },
      monetization: {
        title: 'Монетизация',
        metrics: {
          volume: aggregates.volume,
          volumePerActivePlayer: aggregates.volume !== null && aggregates.activePlayers ? Number((aggregates.volume / aggregates.activePlayers).toFixed(2)) : null,
          payerConversion: null,
          repeatPurchase: null,
        },
        interpretation: 'Показывает качество дохода, а не только количество транзакций.',
      },
      sustainability: {
        title: 'Устойчивость экономики',
        metrics: {
          minted: aggregates.minted,
          burned: aggregates.burned,
          netIssuance: aggregates.minted !== null && aggregates.burned !== null ? Number((aggregates.minted - aggregates.burned).toFixed(4)) : null,
          burnToMintRatio: burnRatio,
          treasuryRunwayDays: null,
        },
        interpretation: 'Сравнивает выпуск, сжигание, обязательства и запас казны.',
      },
      reliability: {
        title: 'Надёжность системы',
        metrics: {
          connectedGames: withData,
          totalGames: aggregates.games.length,
          ingestedEvents: status.events,
          duplicateEvents: status.duplicates,
          rejectedEvents: status.rejected,
          lastEventAt: status.lastEventAt,
          lastEventAgeSeconds: status.lastEventAgeSeconds,
        },
        interpretation: 'Помогает отличить плохую игру от проблем со сбором данных.',
      },
      risk: {
        title: 'Риск и доверие',
        metrics: {
          criticalIncidents: liveAlerts({ windowDays, now }).filter((alert) => alert.severity === 'critical').length,
          highIncidents: liveAlerts({ windowDays, now }).filter((alert) => alert.severity === 'high').length,
          suspiciousPlayers: null,
          blockRate: null,
          dataCoverage: Number((dataCoverage * 100).toFixed(1)),
        },
        interpretation: 'Сводит риски игроков, экономики и инфраструктуры в один контур.',
      },
    },
  }
}

/** Инвесторский отчёт: те же правила — null вместо вымысла, источник и качество указаны. */
export function liveInvestorReport({ windowDays = 7, now = Date.now() } = {}) {
  const aggregates = liveAggregates({ windowDays, now })
  return {
    reportId: `investor-${new Date(now).toISOString().slice(0, 10)}`,
    generatedAt: new Date(now).toISOString(),
    period: `${windowDays}d UTC`,
    source: 'event-inbox',
    demo: false,
    metrics: {
      activePlayers: aggregates.activePlayers,
      newPlayers: aggregates.newPlayers,
      retentionD7: null,
      payerConversion: null,
      volume: aggregates.volume,
      treasury: null,
      minted: aggregates.minted,
      burned: aggregates.burned,
      criticalIncidents: liveAlerts({ windowDays, now }).filter((alert) => alert.severity === 'critical').length,
      dataQuality: aggregates.eventsHumanInWindow ? 'partial' : 'unavailable',
    },
    games: aggregates.games.map((game) => ({ id: game.id, name: game.name, players: game.players, volume: game.volume, healthScore: null, dataQuality: game.health.dataQuality })),
    narrative: liveConclusions({ windowDays, now }),
    privacy: 'aggregated-no-personal-data',
    confidence: aggregates.eventsHumanInWindow ? 'partial' : 'unavailable',
  }
}

export function liveConclusions({ windowDays = 7, now = Date.now() } = {}) {
  const aggregates = liveAggregates({ windowDays, now })
  const withData = aggregates.games.filter((game) => game.health.ok)
  const fresh = freshness({ maxAgeSeconds: 0, now })
  const conclusions = [
    withData.length
      ? `${withData.length} из ${aggregates.games.length} игр передали события за ${windowDays} дн.; остальные помечены unavailable.`
      : `За ${windowDays} дн. ни одна игра не передала события — публикуемые числа отсутствуют.`,
    'Write-операции в блокчейн отключены: хаб только принимает события и читает их.',
    fresh.noDataYet ? 'Данные не поступали ни разу: проверьте адаптеры игр и токен приёма.' : `Последнее событие: ${fresh.lastEventAt}.`,
  ]
  return conclusions
}

export function liveAiReport({ windowDays = 7, now = Date.now() } = {}) {
  const aggregates = liveAggregates({ windowDays, now })
  const alerts = liveAlerts({ windowDays, now })
  const scores = aggregates.games.map((game) => game.health.dataQuality)
  const reliability = scores.filter((quality) => quality !== 'unavailable').length / Math.max(1, scores.length)
  return {
    generatedAt: new Date(now).toISOString(),
    source: 'event-inbox',
    demo: false,
    ecosystemScore: null,
    dataReliability: Number(reliability.toFixed(3)),
    criticalCount: alerts.filter((alert) => alert.severity === 'critical').length,
    highCount: alerts.filter((alert) => alert.severity === 'high').length,
    conclusions: liveConclusions({ windowDays, now }),
    alerts,
  }
}

/** Демо-модель: тот же контракт, но явно помечена и выключена в продакшене флагом. */
export function demoModel({ windowDays = 7, now = Date.now() } = {}) {
  const demo = liveAggregates({ windowDays, now })
  return {
    ...demo,
    demo: true,
    source: 'demo://read-model',
    warning: 'DEMO DATA: синтетические числа для проверки интерфейса, не боевые данные студии',
  }
}

export { list }

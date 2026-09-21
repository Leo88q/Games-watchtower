import { aggregateOverview, securitySummary } from '../../src/engine/analytics.js'
import { crossGameSegments } from '../ingestion/player-projections.js'
import { inboxStatus } from '../ingestion/event-inbox.js'

export function adjacentAnalytics() {
  const overview = aggregateOverview()
  const security = securitySummary()
  const ingestion = inboxStatus()
  const players = overview.activePlayers || 0
  const newPlayers = overview.newPlayers || 0
  const minted = overview.minted || 0
  const burned = overview.burned || 0
  const crossGame = crossGameSegments({ limit: 5000 })
  const dataCoverage = overview.games.filter((game) => game.health.dataQuality !== 'unavailable').length / Math.max(1, overview.games.length)
  return {
    generatedAt: new Date().toISOString(),
    dataQuality: dataCoverage >= .75 ? 'partial' : 'limited',
    sections: {
      engagement: {
        title: 'Вовлечённость',
        metrics: {
          activePlayers: players,
          newPlayerShare: players ? Number((newPlayers / players * 100).toFixed(2)) : null,
          returningPlayerProxy: players ? Number((1 - newPlayers / players).toFixed(3)) : null,
          crossGameGroups: crossGame.counts.twoGames + crossGame.counts.threeOrMore,
        },
        interpretation: 'Показывает, растёт ли аудитория и переходит ли она между играми.',
      },
      monetization: {
        title: 'Монетизация',
        metrics: {
          volume: overview.games.reduce((sum, game) => sum + (Number(game.volume) || 0), 0),
          volumePerActivePlayer: players ? Number((overview.games.reduce((sum, game) => sum + (Number(game.volume) || 0), 0) / players).toFixed(2)) : null,
          payerConversion: 'partial',
          repeatPurchase: 'unavailable',
        },
        interpretation: 'Показывает качество дохода, а не только количество транзакций.',
      },
      sustainability: {
        title: 'Устойчивость экономики',
        metrics: {
          minted,
          burned,
          netIssuance: minted - burned,
          burnToMintRatio: minted ? Number((burned / minted).toFixed(3)) : null,
          treasuryRunwayDays: 'partial',
        },
        interpretation: 'Сравнивает выпуск, сжигание, обязательства и запас казны.',
      },
      reliability: {
        title: 'Надёжность системы',
        metrics: {
          connectedGames: overview.games.filter((game) => game.health.ok).length,
          totalGames: overview.games.length,
          ingestedEvents: ingestion.events,
          duplicateEvents: ingestion.duplicates,
          rejectedEvents: ingestion.rejected,
          rpcHealth: overview.games.filter((game) => game.health.rpc && game.health.rpc !== 'unknown').length,
        },
        interpretation: 'Помогает отличить плохую игру от проблем со сбором данных.',
      },
      risk: {
        title: 'Риск и доверие',
        metrics: {
          criticalIncidents: security.critical,
          highIncidents: security.high,
          suspiciousPlayers: security.suspiciousPlayers,
          blockRate: security.blockRate,
          dataCoverage: Number((dataCoverage * 100).toFixed(1)),
        },
        interpretation: 'Сводит риски игроков, экономики и инфраструктуры в один контур.',
      },
    },
  }
}

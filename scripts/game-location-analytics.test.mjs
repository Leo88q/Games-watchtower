import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeGameTelemetry } from '../server/analytics/game-telemetry.js'
import { computeEconomy } from '../server/economy/metrics.js'
import { buildFunnel } from '../server/ingestion/player-projections.js'
import { ingest, resetInboxForTests } from '../server/ingestion/event-inbox.js'
import { normalizeEvent } from '../server/ingestion/provider.js'
import { eventLocationId } from '../server/ingestion/location.js'

const NOW = Date.parse('2026-09-29T12:00:00.000Z')

function row({ gameId = 'ares1', eventType, regionId, daysAgo = 1, player = 'wallet-private', dataQuality = 'complete' }) {
  const event = {
    gameId,
    regionId,
    eventType,
    timestamp: new Date(NOW - daysAgo * 86_400_000).toISOString(),
    observedAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
    dataQuality,
    payload: { gameId, wallet: player, ...(regionId ? {} : {}) },
  }
  return event
}

test('per-game telemetry aggregates event types, freshness, location coverage and time buckets without player IDs', () => {
  const events = [
    row({ eventType: 'PlayerJoined', regionId: 'domes', daysAgo: 1 }),
    row({ eventType: 'PotatoPlanted', regionId: 'domes', daysAgo: 0.25, player: 'wallet-private-2' }),
    row({ eventType: 'TokenMinted', daysAgo: 0.5 }),
    row({ gameId: 'neonrelay', eventType: 'RaceFinished', regionId: 'track', daysAgo: 0.5 }),
  ]
  const telemetry = summarizeGameTelemetry({ events, gameId: 'ares1', locationId: 'domes', windowDays: 7, now: NOW })

  assert.equal(telemetry.totalEvents, 3)
  assert.equal(telemetry.timedEvents, 3)
  assert.equal(telemetry.locationCoverage.taggedEvents, 2)
  assert.equal(telemetry.locationCoverage.untaggedEvents, 1)
  assert.equal(telemetry.locationCoverage.ratio, 2 / 3)
  assert.equal(telemetry.locations.length, 1)
  assert.equal(telemetry.locations[0].id, 'domes')
  assert.equal(telemetry.locations[0].events, 2)
  assert.equal(telemetry.selectedLocation.events, 2)
  assert.equal(telemetry.selectedLocation.eventTypes.items.reduce((sum, item) => sum + item.count, 0), 2)
  assert.equal(telemetry.timeline.reduce((sum, bucket) => sum + bucket.events, 0), 3)
  assert.equal(JSON.stringify(telemetry).includes('wallet-private'), false)
  assert.equal(JSON.stringify(telemetry).includes('playerKey'), false)
})

test('missing location tags are reported as unavailable, not as zero activity in a region', () => {
  const telemetry = summarizeGameTelemetry({
    events: [row({ eventType: 'PlayerJoined' })],
    gameId: 'ares1',
    locationId: 'domes',
    windowDays: 7,
    now: NOW,
  })
  assert.equal(telemetry.locationCoverage.quality, 'unavailable')
  assert.equal(telemetry.locationCoverage.ratio, 0)
  assert.equal(telemetry.selectedLocation.events, 0)
  assert.match(telemetry.locationCoverage.note, /нельзя распределить по районам/)
})

test('normalization preserves explicit root location tags but ignores object-valued tags', () => {
  const normalized = normalizeEvent({
    gameId: 'ares1',
    regionId: 'domes',
    locationId: { unsafe: 'object' },
    signature: 'root-location-test',
    programId: 'program-test',
    eventType: 'PlayerJoined',
  })
  assert.equal(normalized.regionId, 'domes')
  assert.equal(normalized.locationId, null)
})

test('location resolver accepts documented payload aliases and ignores object tags', () => {
  assert.equal(eventLocationId({ payload: { regionId: 'domes' } }), 'domes')
  assert.equal(eventLocationId({ payload: { locationId: 'market' } }), 'market')
  assert.equal(eventLocationId({ payload: { region: 'telemetry' } }), 'telemetry')
  assert.equal(eventLocationId({ payload: { location: 'track' } }), 'track')
  assert.equal(eventLocationId({ payload: { regionId: { name: 'domes' } } }), null)
})

test('location-scoped funnel filters by game, region and selected time window without exposing identifiers', () => {
  resetInboxForTests()
  const add = ({ signature, gameId = 'ares1', regionId, eventType, daysAgo = 1, player }) => ingest({
    signature,
    programId: 'test-program',
    gameId,
    regionId,
    eventType,
    timestamp: new Date(NOW - daysAgo * 86_400_000).toISOString(),
    observedAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
    payload: { gameId, wallet: player },
  }, 'test-provider')

  add({ signature: 'entry-dome', eventType: 'PlayerJoined', regionId: 'domes', player: 'wallet-dome' })
  add({ signature: 'action-dome', eventType: 'PotatoPlanted', regionId: 'domes', player: 'wallet-dome' })
  add({ signature: 'entry-lab', eventType: 'PlayerJoined', regionId: 'lab', player: 'wallet-lab' })
  add({ signature: 'old-entry', eventType: 'PlayerJoined', regionId: 'domes', daysAgo: 12, player: 'wallet-old' })
  add({ signature: 'other-game', gameId: 'neonrelay', eventType: 'RaceFinished', regionId: 'track', player: 'wallet-racer' })

  const funnel = buildFunnel({ gameId: 'ares1', regionId: 'domes', windowDays: 7, now: NOW })
  assert.equal(funnel.scope, 'location')
  assert.equal(funnel.regionId, 'domes')
  assert.equal(funnel.events, 2)
  assert.equal(funnel.stages.find((stage) => stage.id === 'first_entry').players, 1)
  assert.equal(funnel.stages.find((stage) => stage.id === 'first_action').players, 1)
  assert.equal(JSON.stringify(funnel).includes('wallet-dome'), false)
  resetInboxForTests()
})

test('a per-game economy slice does not claim studio-wide cross-game overlap', () => {
  const event = row({ eventType: 'PlayerJoined', regionId: 'domes' })
  const economy = computeEconomy({ events: [event], window: '7d', now: NOW, config: {}, scopeGameId: 'ares1' })
  const crossGame = economy.metrics.find((metric) => metric.id === 'cross_game_player_share')
  assert.equal(crossGame.value, null)
  assert.equal(crossGame.quality, 'unavailable')
  assert.match(crossGame.reason, /общий набор событий всех игр/)
})

/**
 * Живая модель чтения: мемоизация внутри одного состояния inbox (проверка F-021*).
 *
 *   node --test scripts/live-model.test.mjs
 *
 * Контекст: один запрос /api/read-model пересчитывал liveAggregates до десяти раз
 * (overview → adjacent → investor → alerts → conclusions). Добавлена мемоизация
 * по ключу (окно, момент, ревизия inbox). Эти тесты фиксируют главное свойство:
 * кэш не может вернуть устаревшие числа после приёма события.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { configureInbox, ingest, inboxRevision, resetInboxForTests } from '../server/ingestion/event-inbox.js'
import { liveAggregates, liveAlerts, liveAdjacent, resetLiveModelMemoForTests } from '../server/analytics/live-model.js'

function reset() {
  resetInboxForTests()
  resetLiveModelMemoForTests()
  configureInbox({ maxEvents: 10000, allowUnknownGames: false })
}

function event(index, { gameId = 'ares1', eventType = 'PlayerJoined', playerKey = `player-${index}` } = {}) {
  return {
    cluster: 'devnet',
    slot: 100 + index,
    signature: `test-sig-${index}`,
    programId: 'ares1-program',
    eventType,
    payload: { gameId, playerKey, amount: index + 1 },
    observedAt: new Date().toISOString(),
  }
}

test('повторный вызов с тем же моментом и тем же inbox возвращает те же числа', () => {
  reset()
  for (let index = 0; index < 5; index += 1) ingest(event(index))
  const now = Date.now()
  const first = liveAggregates({ windowDays: 7, now })
  const second = liveAggregates({ windowDays: 7, now })
  assert.deepEqual(second, first)
  assert.equal(first.activePlayers, 5)
})

test('приём события инвалидирует кэш: устаревшие числа вернуть невозможно', () => {
  reset()
  ingest(event(1))
  // Момент наблюдения берём чуть впереди: окно считается как [now - window, now],
  // и оба события обязаны в него попадать.
  const now = Date.now() + 5000
  const before = liveAggregates({ windowDays: 7, now })
  assert.equal(before.activePlayers, 1)

  const revisionBefore = inboxRevision()
  ingest(event(2, { playerKey: 'player-second' }))
  assert.ok(inboxRevision() > revisionBefore, 'ревизия inbox обязана меняться при приёме события')

  // Тот же `now` (то есть тот же «момент»), но inbox уже другой: числа обязаны обновиться.
  const after = liveAggregates({ windowDays: 7, now })
  assert.equal(after.activePlayers, 2, 'кэш не должен скрывать только что принятое событие')
})

test('удаление данных игрока также инвалидирует кэш', async () => {
  reset()
  ingest(event(1, { playerKey: 'wallet-erasure-target' }))
  const now = Date.now()
  assert.equal(liveAggregates({ windowDays: 7, now }).activePlayers, 1)
  const { erasePlayer } = await import('../server/ingestion/event-inbox.js')
  const report = erasePlayer('wallet-erasure-target', { salt: 'test-salt-0123456789' })
  assert.equal(report.ok, true)
  assert.equal(report.removed, 1)
  assert.equal(liveAggregates({ windowDays: 7, now }).activePlayers, null, 'после удаления игроков в окне нет')
})

test('алерты и adjacent-аналитика остаются согласованными между вызовами', () => {
  reset()
  for (let index = 0; index < 10; index += 1) ingest(event(index))
  const now = Date.now()
  const alerts = liveAlerts({ windowDays: 7, now })
  const adjacent = liveAdjacent({ windowDays: 7, now })
  assert.deepEqual(liveAlerts({ windowDays: 7, now }), alerts)
  assert.equal(Array.isArray(alerts), true)
  assert.equal(adjacent.sections.reliability.metrics.ingestedEvents, 10)
  assert.equal(adjacent.sections.engagement.metrics.activePlayers, 10)
})

test('мемоизация не делает ответы мутируемыми снаружи', () => {
  reset()
  for (let index = 0; index < 3; index += 1) ingest(event(index))
  const now = Date.now()
  const aggregates = liveAggregates({ windowDays: 7, now })
  assert.throws(() => { aggregates.games = [] }, TypeError)
  const alerts = liveAlerts({ windowDays: 7, now })
  assert.throws(() => { alerts.push({ id: 'fake' }) }, TypeError)
})

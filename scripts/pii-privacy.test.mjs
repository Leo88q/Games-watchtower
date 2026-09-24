/**
 * Проверки приватности игровых идентификаторов (находка F-011):
 *   node --test scripts/pii-privacy.test.mjs
 * Фиксируют: наружу уходят только псевдонимы, хаб не хранит открытые идентификаторы в ответах,
 * удаление по запросу работает и требует write-аутентификации.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, sampleEvent } from './test-server.mjs'
import { anonymizeIdentifier, containsRawIdentifier, isAnonymized, playerSummary } from '../server/security/pii.js'

const RAW_WALLET = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'

test('псевдонимизация: детерминирована, необратима и зависит от соли', () => {
  const first = anonymizeIdentifier(RAW_WALLET, { salt: 'salt-a' })
  const second = anonymizeIdentifier(RAW_WALLET, { salt: 'salt-a' })
  const other = anonymizeIdentifier(RAW_WALLET, { salt: 'salt-b' })
  assert.equal(first, second)
  assert.notEqual(first, other, 'смена соли не должна сохранять прежние псевдонимы')
  assert.ok(isAnonymized(first))
  assert.ok(!first.includes(RAW_WALLET.slice(0, 8)), 'псевдоним не должен содержать исходный идентификатор')
  assert.equal(anonymizeIdentifier('', { salt: 'salt-a' }), null)
})

test('детектор открытых идентификаторов видит вложенность и не путает псевдонимы', () => {
  assert.equal(containsRawIdentifier({ payload: { playerKey: RAW_WALLET } }), true)
  assert.equal(containsRawIdentifier({ payload: { playerKey: anonymizeIdentifier(RAW_WALLET, { salt: 's' }) } }), false)
  assert.equal(containsRawIdentifier({ payload: { walletAddress: { nested: RAW_WALLET } } }), true)
  assert.equal(containsRawIdentifier({ payload: { gameId: 'ares1', amount: 10 } }), false)
})

test('сводка по игроку считает агрегаты, не возвращая исходный идентификатор', () => {
  const events = [
    { eventType: 'PlayerJoined', timestamp: '2026-09-01T00:00:00.000Z', payload: { gameId: 'ares1', playerKey: RAW_WALLET } },
    { eventType: 'TokenMinted', timestamp: '2026-09-02T00:00:00.000Z', payload: { gameId: 'ares1', playerKey: RAW_WALLET, amount: 5 } },
    { eventType: 'PlayerJoined', timestamp: '2026-09-02T00:00:00.000Z', payload: { gameId: 'aof', playerKey: 'someone-else' } },
  ]
  const summary = playerSummary(events, RAW_WALLET, { salt: 'salt-a' })
  assert.equal(summary.eventCount, 2)
  assert.deepEqual(summary.games, ['ares1'])
  assert.equal(summary.firstSeenAt, '2026-09-01T00:00:00.000Z')
  assert.equal(summary.lastSeenAt, '2026-09-02T00:00:00.000Z')
  assert.ok(!JSON.stringify(summary).includes(RAW_WALLET), 'сводка не должна содержать кошелёк')
})

test('политика обработки данных публикуется явно', async () => {
  const server = await startTestServer()
  try {
    const { status, body } = await server.request('/api/pii/policy')
    assert.equal(status, 200)
    assert.equal(body.storedRawIdentifiers, false)
    assert.ok(body.neverStored.includes('приватные ключи'))
    assert.equal(body.erasure.endpoint, 'POST /api/pii/erasure')
  } finally {
    await server.stop()
  }
})

test('/api/events не отдаёт открытые идентификаторы игроков', async () => {
  const server = await startTestServer()
  try {
    await server.request('/api/ingest/solana', { method: 'POST', token: 'test-ingest-token', body: sampleEvent({ signature: 'pii-1', payload: { gameId: 'ares1', playerKey: RAW_WALLET, amount: 3 } }) })
    const events = await server.request('/api/events')
    assert.equal(events.status, 200)
    assert.equal(events.body.privacy, 'anonymized-player-keys')
    assert.ok(!JSON.stringify(events.body).includes(RAW_WALLET), 'кошелёк не должен покидать хаб')
    assert.ok(events.body.events[0].payload.playerKey.startsWith('anon:'))
    assert.deepEqual(events.body.events[0].anonymizedFields, ['playerKey'])

    const readModel = await server.request('/api/read-model')
    assert.ok(!JSON.stringify(readModel.body).includes(RAW_WALLET))

    const funnel = await server.request('/api/funnels')
    assert.ok(!JSON.stringify(funnel.body).includes(RAW_WALLET))
    const projection = await server.request('/api/cross-game/projection')
    assert.ok(!JSON.stringify(projection.body).includes(RAW_WALLET))
  } finally {
    await server.stop()
  }
})

test('удаление данных игрока: требует write-токен и подтверждения, затем действительно удаляет', async () => {
  const server = await startTestServer()
  try {
    for (const [index, type] of ['PlayerJoined', 'TokenMinted'].entries()) {
      await server.request('/api/ingest/solana', { method: 'POST', token: 'test-ingest-token', body: sampleEvent({ signature: `erase-${index}`, eventType: type, payload: { gameId: 'ares1', playerKey: RAW_WALLET, amount: index } }) })
    }
    await server.request('/api/ingest/solana', { method: 'POST', token: 'test-ingest-token', body: sampleEvent({ signature: 'erase-keep', payload: { gameId: 'ares1', playerKey: 'other-player', amount: 1 } }) })

    const unauthorized = await server.request('/api/pii/erasure', { method: 'POST', token: null, body: { identifier: RAW_WALLET, confirm: 'erase-player' } })
    assert.equal(unauthorized.status, 401)

    const unconfirmed = await server.request('/api/pii/erasure', { method: 'POST', token: 'test-ingest-token', body: { identifier: RAW_WALLET } })
    assert.equal(unconfirmed.status, 400)
    assert.equal(unconfirmed.body.error, 'confirmation_required')

    const summaryBefore = await server.request(`/api/pii/player?identifier=${encodeURIComponent(RAW_WALLET)}`)
    assert.equal(summaryBefore.body.eventCount, 2)

    const erased = await server.request('/api/pii/erasure', { method: 'POST', token: 'test-ingest-token', body: { identifier: RAW_WALLET, confirm: 'erase-player' } })
    assert.equal(erased.status, 200)
    assert.equal(erased.body.removed, 2)
    assert.ok(!JSON.stringify(erased.body).includes(RAW_WALLET), 'отчёт не должен повторять кошелёк')

    const summaryAfter = await server.request(`/api/pii/player?identifier=${encodeURIComponent(RAW_WALLET)}`)
    assert.equal(summaryAfter.body.eventCount, 0)

    const events = await server.request('/api/events')
    assert.equal(events.body.events.length, 1, 'должно остаться только событие другого игрока')
    const status = await server.request('/api/ingestion/status')
    assert.equal(status.body.erased, 2, 'счётчик удаления виден в статусе приёма')
  } finally {
    await server.stop()
  }
})

test('аудит доступа не содержит query-значений и токенов', async () => {
  const server = await startTestServer()
  try {
    await server.request('/api/pii/player?identifier=secret-wallet-value', { token: 'test-read-token' })
    const audit = await server.request('/api/audit')
    const raw = JSON.stringify(audit.body)
    assert.ok(audit.body.entries.length > 0, 'журнал аудита обязан содержать записи о запросах')
    assert.ok(!raw.includes('secret-wallet-value'), 'значения query-параметров не сохраняются')
    assert.ok(!raw.includes('test-read-token'))
    assert.ok(audit.body.entries.every((entry) => entry.blockchainWrite === false))
    for (const entry of audit.body.entries) {
      assert.match(String(entry.ipHash), /^[0-9a-f]{8,}$/, `IP обязан храниться хешем, получено: ${entry.ipHash}`)
      assert.ok(!String(entry.ipHash).includes('.') && !String(entry.ipHash).includes(':'), 'открытый IP в аудите недопустим')
      assert.ok(!String(entry.path).includes('='), 'значения query-параметров не сохраняются')
    }
  } finally {
    await server.stop()
  }
})

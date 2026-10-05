/**
 * Вход на вахту подписью кошелька, сессии, отчёты игр о прогрессе и общий кэш.
 *   node --test scripts/operator-auth.test.mjs
 * Интеграция с PostgreSQL и Redis включается переменными TEST_DATABASE_URL и TEST_REDIS_URL.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign as edSign, createHmac, randomBytes } from 'node:crypto'
import { startTestServer } from './test-server.mjs'
import {
  base58Decode, base58Encode, isSolanaAddress, verifySolanaSignature,
  configureSessions, issueSession, verifySession, buildLoginMessage,
} from '../server/operations/wallet-auth.js'
import { createMemoryCache, createSharedCache } from '../server/operations/shared-cache.js'
import { base58Encode as clientBase58 } from '../src/cosmos/wallet.js'

const GAME_SECRET = 'ares-progress-secret-0123456789abcdef'

function solanaKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url')
  return { address: base58Encode(raw), signText: (text) => base58Encode(edSign(null, Buffer.from(text, 'utf8'), privateKey)) }
}

function signReport(body, { secret = GAME_SECRET, ts = Date.now() } = {}) {
  const raw = JSON.stringify(body)
  return { raw, ts: String(ts), sig: `sha256=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}` }
}

test('base58: совпадает в обе стороны, сохраняет ведущие нули, клиент и сервер кодируют одинаково', () => {
  for (const len of [1, 5, 32, 64]) {
    const buf = randomBytes(len)
    buf[0] = 0
    const enc = base58Encode(buf)
    assert.ok(enc.startsWith('1'))
    assert.deepEqual(base58Decode(enc), buf)
    assert.equal(clientBase58(new Uint8Array(buf)), enc)
  }
  assert.equal(base58Decode('0OIl'), null, 'символы вне алфавита отклоняются')
  assert.equal(isSolanaAddress('test_wallet'), false)
  assert.equal(isSolanaAddress(solanaKeypair().address), true)
  assert.equal(isSolanaAddress(base58Encode(randomBytes(31))), false, 'адрес — ровно 32 байта')
})

test('подпись ed25519: принимается только для своего адреса и своего сообщения', () => {
  const a = solanaKeypair()
  const b = solanaKeypair()
  const msg = buildLoginMessage({ wallet: a.address, nonce: 'n1', issuedAt: new Date().toISOString(), domain: 'test' })
  const sig = a.signText(msg)
  assert.equal(verifySolanaSignature(a.address, msg, sig), true)
  assert.equal(verifySolanaSignature(b.address, msg, sig), false, 'чужой адрес')
  assert.equal(verifySolanaSignature(a.address, `${msg} `, sig), false, 'изменённое сообщение')
  assert.equal(verifySolanaSignature(a.address, msg, b.signText(msg)), false, 'чужая подпись')
  assert.equal(verifySolanaSignature(a.address, msg, 'not-base58!'), false)
  assert.equal(verifySolanaSignature(a.address, msg, base58Encode(randomBytes(10))), false, 'неверная длина')
})

test('сессии: подделка и истечение отклоняются, короткий секрет и отсутствие секрета в продакшене — ошибка', () => {
  assert.throws(() => configureSessions({ secret: 'short', isProduction: false }))
  assert.throws(() => configureSessions({ secret: undefined, isProduction: true }))
  configureSessions({ secret: 'x'.repeat(40), isProduction: true })
  const now = Date.now()
  const s = issueSession('Wallet111', { now })
  assert.equal(verifySession(s.token, { now }).wallet, 'Wallet111')
  assert.equal(verifySession(s.token, { now: s.expiresAt + 1 }), null, 'истёкшая')
  const parts = s.token.split('.')
  parts[1] = Buffer.from('Other222').toString('base64url')
  assert.equal(verifySession(parts.join('.'), { now }), null, 'подменённый кошелёк')
  const extended = s.token.split('.')
  extended[2] = String(s.expiresAt + 1e9)
  assert.equal(verifySession(extended.join('.'), { now }), null, 'продлённый срок')
  configureSessions({ secret: 'y'.repeat(40), isProduction: true })
  assert.equal(verifySession(s.token, { now }), null, 'другой секрет')
})

test('общий кэш в памяти: код входа забирается один раз, истекает, лимит считает окно', async () => {
  const cache = createMemoryCache()
  await cache.putOnce('k', { a: 1 }, 50)
  assert.deepEqual(await cache.take('k'), { a: 1 })
  assert.equal(await cache.take('k'), null)
  await cache.putOnce('k2', { a: 2 }, 20)
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(await cache.take('k2'), null)
  for (let i = 0; i < 3; i++) assert.equal((await cache.hit('ip', 3, 1000)).allowed, true)
  const blocked = await cache.hit('ip', 3, 1000)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterMs > 0)
})

test('вход подписью: код одноразовый, действия требуют сессию своего кошелька, отчёты игр подписаны', async () => {
  const server = await startTestServer({ env: { GAME_PROGRESS_SECRET_ARES1: GAME_SECRET, OPERATOR_SESSION_SECRET: 'z'.repeat(40) } })
  try {
    const me = solanaKeypair()
    const post = (p, body, headers = {}) => server.request(p, { method: 'POST', body, headers })

    const state = await server.request('/api/operator/state')
    assert.equal(state.body.auth.signatureRequired, true)
    assert.equal(state.body.auth.demoLogin, true)
    assert.ok(state.body.progressSources.find((s) => s.game === 'ares1').push)

    assert.equal((await post('/api/operator/nonce', { wallet: 'не адрес' })).status, 400)

    // 1. Сообщение с одноразовым кодом и подпись
    const nonce = await post('/api/operator/nonce', { wallet: me.address })
    assert.equal(nonce.status, 200)
    assert.ok(nonce.body.message.includes(me.address))
    assert.equal((await post('/api/operator/auth', { wallet: me.address })).status, 400, 'без подписи')

    const intruder = solanaKeypair()
    const bad = await post('/api/operator/auth', { wallet: me.address, signature: intruder.signText(nonce.body.message) })
    assert.equal(bad.status, 401)
    assert.equal(bad.body.error, 'bad_signature')
    // Неудачная попытка сжигает код: подобрать подпись к тому же коду нельзя
    const burned = await post('/api/operator/auth', { wallet: me.address, signature: me.signText(nonce.body.message) })
    assert.equal(burned.body.error, 'login_code_expired')

    const nonce2 = await post('/api/operator/nonce', { wallet: me.address })
    const signature = me.signText(nonce2.body.message)
    const ok = await post('/api/operator/auth', { wallet: me.address, signature })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.mode, 'signature')
    assert.equal(ok.body.player.wallet, me.address)
    const replay = await post('/api/operator/auth', { wallet: me.address, signature })
    assert.equal(replay.status, 401, 'повтор той же подписи')
    assert.equal(replay.body.error, 'login_code_expired')

    // 2. Без отчётов игр у настоящего кошелька прогресса нет — никакого демо-прогресса
    const fresh = await server.request(`/api/operator/player/${me.address}`)
    assert.equal(fresh.body.progressSource, 'none')
    assert.equal(fresh.body.role.id, 'guest')

    // 3. Действия: только с сессией и только за свой кошелёк
    const session = { 'x-operator-session': ok.body.token }
    const questions = (await server.request('/api/operator/exam')).body.questions
    const answers = Object.fromEntries(questions.map((q) => [q.id, 1]))
    assert.equal((await post('/api/operator/exam', { answers })).status, 401)
    assert.equal((await post('/api/operator/exam', { answers }, { 'x-operator-session': `${ok.body.token}x` })).status, 401)
    assert.equal((await post('/api/operator/exam', { wallet: intruder.address, answers }, session)).status, 403)
    const exam = await post('/api/operator/exam', { answers }, session)
    assert.equal(exam.status, 200)
    assert.equal(exam.body.passed, true)

    // 4. Отчёт игры: подпись, окно времени, устаревшие данные
    const report = { reports: [{ wallet: me.address, hours: 42, rank: 3, updatedAt: Date.now() }] }
    const send = ({ raw, ts, sig }, game = 'ares1') => server.request('/api/games/progress', { method: 'POST', body: raw, headers: { 'x-watchtower-game': game, 'x-watchtower-timestamp': ts, 'x-watchtower-signature': sig } })
    assert.equal((await send(signReport(report, { secret: 'w'.repeat(40) }))).status, 401, 'чужой секрет')
    assert.equal((await send(signReport(report, { ts: Date.now() - 10 * 60 * 1000 }))).status, 401, 'старая метка времени')
    assert.equal((await send(signReport(report), 'guttercaps')).status, 403, 'игра без секрета')
    const forged = signReport(report)
    forged.raw = forged.raw.replace('"hours":42', '"hours":4200')
    assert.equal((await send(forged)).status, 401, 'тело изменено после подписи')
    const accepted = await send(signReport(report))
    assert.equal(accepted.status, 200)
    assert.equal(accepted.body.accepted, 1)
    const stale = await send(signReport({ reports: [{ wallet: me.address, hours: 1, rank: 0, updatedAt: Date.now() - 60000 }] }))
    assert.equal(stale.body.stale, 1, 'более старый отчёт не перетирает новый')

    const after = await server.request(`/api/operator/player/${me.address}`)
    assert.equal(after.body.progressSource, 'game')
    assert.equal(after.body.gameProgress.ares1.hours, 42)
    assert.equal(after.body.gameProgress.ares1.rank, 3)
    assert.equal(after.body.role.id, 'observer', 'реальные 42 часа, ранг 3 и сданная проверка дают ранг наблюдателя')

    // 5. Демо-вход разрешён в разработке, демо-сессия даёт голосовать только за себя
    const demo = await post('/api/operator/auth', { wallet: 'test_wallet' })
    assert.equal(demo.status, 200)
    assert.equal(demo.body.mode, 'demo')
    const vote = await post('/api/operator/vote', { incidentId: 'nope', actionId: 'increase_priority' }, { 'x-operator-session': demo.body.token })
    assert.notEqual(vote.status, 401)
  } finally {
    await server.stop()
  }
})

test('демо-вход выключается вместе с демо-режимом', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_ALLOW_DEMO: '0' } })
  try {
    const state = await server.request('/api/operator/state')
    assert.equal(state.body.auth.demoLogin, false)
    const demo = await server.request('/api/operator/auth', { method: 'POST', body: { wallet: 'test_wallet' } })
    assert.equal(demo.status, 403)
    assert.equal(demo.body.error, 'demo_login_disabled')
  } finally {
    await server.stop()
  }
})

test('лимит запросов кода входа на один кошелёк', async () => {
  const server = await startTestServer()
  try {
    const { address } = solanaKeypair()
    let last
    for (let i = 0; i < 9; i++) last = await server.request('/api/operator/nonce', { method: 'POST', body: { wallet: address } })
    assert.equal(last.status, 429)
    assert.ok(Number(last.headers.get('retry-after')) > 0)
  } finally {
    await server.stop()
  }
})

const PG = process.env.TEST_DATABASE_URL
const REDIS = process.env.TEST_REDIS_URL

test('PostgreSQL + Redis: состояние переживает перезапуск, код входа виден другому экземпляру', { skip: !(PG && REDIS) && 'задайте TEST_DATABASE_URL и TEST_REDIS_URL' }, async () => {
  const pg = (await import('pg')).default
  const db = new pg.Client({ connectionString: PG })
  await db.connect()
  await db.query('DROP TABLE IF EXISTS watchtower_state')
  const env = { DATABASE_URL: PG, REDIS_URL: REDIS, OPERATOR_SESSION_SECRET: 's'.repeat(40), GAME_PROGRESS_SECRET_ARES1: GAME_SECRET }
  const me = solanaKeypair()
  const a = await startTestServer({ env })
  const b = await startTestServer({ env })
  try {
    // Код входа выдан экземпляром A, подпись принята экземпляром B
    const nonce = await a.request('/api/operator/nonce', { method: 'POST', body: { wallet: me.address } })
    const ok = await b.request('/api/operator/auth', { method: 'POST', body: { wallet: me.address, signature: me.signText(nonce.body.message) } })
    assert.equal(ok.status, 200)
    const replay = await a.request('/api/operator/auth', { method: 'POST', body: { wallet: me.address, signature: me.signText(nonce.body.message) } })
    assert.equal(replay.body.error, 'login_code_expired', 'код одноразовый для всех экземпляров')

    const report = signReport({ reports: [{ wallet: me.address, hours: 15, rank: 2, updatedAt: Date.now() }] })
    const sent = await b.request('/api/games/progress', { method: 'POST', body: report.raw, headers: { 'x-watchtower-game': 'ares1', 'x-watchtower-timestamp': report.ts, 'x-watchtower-signature': report.sig } })
    assert.equal(sent.status, 200)
  } finally {
    await a.stop()
    await b.stop()
  }
  const rows = await db.query('SELECT name FROM watchtower_state ORDER BY name')
  assert.ok(rows.rows.some((r) => r.name === 'players'))
  assert.ok(rows.rows.some((r) => r.name === 'game-progress'))

  const c = await startTestServer({ env })
  try {
    const profile = await c.request(`/api/operator/player/${me.address}`)
    assert.equal(profile.body.gameProgress.ares1.hours, 15, 'прогресс прочитан из PostgreSQL после перезапуска')
    assert.equal(profile.body.progressSource, 'game')
  } finally {
    await c.stop()
    await db.query('DROP TABLE IF EXISTS watchtower_state')
    await db.end()
  }
  const redis = await createSharedCache({ redisUrl: REDIS })
  assert.equal(redis.kind, 'redis')
  await redis.putOnce('probe', { v: 1 }, 1000)
  assert.deepEqual(await redis.take('probe'), { v: 1 })
  assert.equal(await redis.take('probe'), null)
  await redis.close()
})

test('опрос игры при входе: прогресс берётся из API игры с токеном, 404 — нет данных', async () => {
  const { createServer } = await import('node:http')
  const me = solanaKeypair()
  const seen = []
  const game = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    seen.push({ auth: req.headers.authorization, wallet: url.searchParams.get('wallet') })
    if (url.searchParams.get('wallet') !== me.address) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ hours: 120.5, rank: 4 }))
  })
  await new Promise((r) => game.listen(0, '127.0.0.1', r))
  const server = await startTestServer({ env: { GAME_PROGRESS_URL_AOF: `http://127.0.0.1:${game.address().port}/progress`, GAME_PROGRESS_TOKEN_AOF: 'pull-token' } })
  try {
    const nonce = await server.request('/api/operator/nonce', { method: 'POST', body: { wallet: me.address } })
    const ok = await server.request('/api/operator/auth', { method: 'POST', body: { wallet: me.address, signature: me.signText(nonce.body.message) } })
    assert.equal(ok.status, 200)
    assert.equal(seen[0].auth, 'Bearer pull-token')
    assert.equal(ok.body.player.gameProgress.aof.hours, 120.5)
    assert.equal(ok.body.player.gameProgress.aof.rank, 4)
    assert.equal(ok.body.player.progressSource, 'game')
  } finally {
    await server.stop()
    game.close()
  }
})

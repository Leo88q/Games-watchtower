/**
 * Исполнение решений вахты: хаб ничего не исполняет сам, а передаёт утверждённое решение
 * подписанным вебхуком исполнителю студии и записывает итог.
 *
 * Проверяется: безопасные действия без сотрудника, отмена в буфер, повторы доставки с одним
 * ключом идемпотентности, подписи в обе стороны, «только ручное исполнение» для действий
 * через мультисиг, репутация только за подтверждённое исполнение, журнал вахты.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHmac, randomBytes } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startTestServer } from './test-server.mjs'
import { configureExecutor } from '../server/operations/action-dispatch.js'

const SECRET = randomBytes(24).toString('hex')
const STAFF = 'demo_staff'
const sign = (raw, ts = Date.now(), secret = SECRET) => ({ ts: String(ts), sig: `sha256=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}` })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Каталог состояния с назначенным сотрудником и заранее заведёнными инцидентами. */
function seedState(extraIncidents = {}) {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), 'watchtower-exec-')), 'operator-game')
  mkdirSync(dir, { recursive: true })
  const now = Date.now()
  writeFileSync(path.join(dir, 'players.json'), JSON.stringify({
    [STAFF]: { wallet: STAFF, joinedAt: now, daysActive: 0, lastActive: now, reputation: 0, correctDecisions: 0, wrongDecisions: 0, passedTest: true, staking: 0, banned: false, forceRole: 'staff' },
  }))
  const incident = (id, extra = {}) => ({
    id, title: `Инцидент ${id}`, description: 'тест', severity: 'warn', game: 'neonrelay', status: 'open', votes: {},
    availableActions: ['mark_false_positive', 'increase_priority', 'notify_status_page', 'pause_bridge'],
    detectedAt: now, publicVisibleAt: now, expiresAt: now + 3600e3, ...extra,
  })
  writeFileSync(path.join(dir, 'incidents.json'), JSON.stringify({
    inc_safe: incident('inc_safe'),
    inc_low: incident('inc_low'),
    inc_fp: incident('inc_fp'),
    ...Object.fromEntries(Object.entries(extraIncidents).map(([id, extra]) => [id, incident(id, extra)])),
  }))
  return dir
}

/** Поддельный исполнитель студии: проверяет подпись и отвечает по сценарию. */
async function startExecutor(script) {
  const calls = []
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      const ts = req.headers['x-watchtower-timestamp']
      const expected = `sha256=${createHmac('sha256', SECRET).update(`${ts}.${raw}`).digest('hex')}`
      const call = { raw, body: JSON.parse(raw), delivery: req.headers['x-watchtower-delivery'], signed: req.headers['x-watchtower-signature'] === expected }
      calls.push(call)
      const [status, reply] = script(call, calls.length)
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(reply === undefined ? '' : JSON.stringify(reply))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${server.address().port}/hook`, calls, stop: () => new Promise((r) => server.close(r)) }
}

async function api(server, route, { body, session, headers = {}, method } = {}) {
  return server.request(route, { method: method || (body !== undefined ? 'POST' : 'GET'), body, headers: { ...(session ? { 'x-operator-session': session } : {}), ...headers } })
}
async function login(server, wallet) {
  const res = await api(server, '/api/operator/auth', { body: { wallet } })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  return res.body.token
}
async function incidentOf(server, id) {
  const res = await api(server, '/api/operator/state')
  return res.body.incidents.find((i) => i.id === id)
}
async function waitFor(fn, label, timeout = 8000) {
  const end = Date.now() + timeout
  while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(80) }
  throw new Error(`не дождались: ${label}`)
}
async function postCallback(server, payload, { secret = SECRET, ts = Date.now() } = {}) {
  const raw = JSON.stringify(payload)
  const { sig } = sign(raw, ts, secret)
  return server.request('/api/operator/executor/result', { method: 'POST', body: raw, headers: { 'x-watchtower-timestamp': String(ts), 'x-watchtower-signature': sig } })
}

test('настройки исполнителя проверяются при старте', () => {
  assert.throws(() => configureExecutor({ env: { OPERATOR_EXECUTOR_URL: 'https://studio.example/hook' } }), /OPERATOR_EXECUTOR_SECRET/)
  assert.throws(() => configureExecutor({ env: { OPERATOR_EXECUTOR_URL: 'https://studio.example/hook', OPERATOR_EXECUTOR_SECRET: 'short' } }), /32/)
  assert.throws(() => configureExecutor({ env: { OPERATOR_EXECUTOR_URL: 'http://studio.example/hook', OPERATOR_EXECUTOR_SECRET: SECRET }, isProduction: true }), /https/)
  assert.throws(() => configureExecutor({ env: { OPERATOR_EXECUTOR_URL: 'ftp://studio.example', OPERATOR_EXECUTOR_SECRET: SECRET } }), /http/)
  assert.throws(() => configureExecutor({ env: { OPERATOR_EXECUTOR_RETRY_MS: 'abc' } }), /RETRY/)
  assert.deepEqual(configureExecutor({ env: {} }), { connected: false, callbacks: false })
  assert.deepEqual(configureExecutor({ env: { OPERATOR_EXECUTOR_URL: 'https://studio.example/hook', OPERATOR_EXECUTOR_SECRET: SECRET }, isProduction: true }), { connected: true, callbacks: true })
})

test('исполнитель подключён: доставка с повтором, подписи, итог колбэком, репутация после исполнения', async () => {
  const executor = await startExecutor((call) => {
    if (call.body.incident.id === 'inc_bridge') return [200, { status: 'executed' }] // высокий риск: должно быть проигнорировано
    return call.body.attempt === 1 ? [500, { error: 'busy' }] : [202, { status: 'accepted' }]
  })
  const dataDir = seedState({
    // Решение по мосту утверждено, буфер истёк, пока сервер стоял: должно уйти сразу после старта
    inc_bridge: { status: 'approved', winningAction: 'pause_bridge', votes: { pause_bridge: [{ wallet: STAFF, weight: 50, at: Date.now() }] }, approvedBy: STAFF, approvedAt: Date.now() - 600e3, scheduledFor: Date.now() - 1000 },
  })
  const server = await startTestServer({ env: { OPERATOR_DATA_DIR: dataDir, OPERATOR_EXECUTOR_URL: executor.url, OPERATOR_EXECUTOR_SECRET: SECRET, OPERATOR_EXECUTOR_RETRY_MS: '150,150,150' } })
  try {
    const staff = await login(server, STAFF)

    // Высокий риск через мультисиг: исполнитель ответил «выполнено», но итог отмечает только человек
    const bridge = await waitFor(async () => { const i = await incidentOf(server, 'inc_bridge'); return i?.dispatch?.state === 'delivered' && i }, 'доставка решения по мосту')
    assert.equal(bridge.status, 'handed_off')
    assert.equal(bridge.dispatch.mode, 'propose')
    const bridgeCall = executor.calls.find((c) => c.body.incident.id === 'inc_bridge')
    assert.equal(bridgeCall.body.mode, 'propose')
    assert.equal(bridgeCall.signed, true)

    // Безопасное действие: голос сотрудника (вес 50) даёт консенсус, подтверждение не нужно
    const vote = await api(server, '/api/operator/vote', { session: staff, body: { incidentId: 'inc_safe', actionId: 'increase_priority' } })
    assert.equal(vote.status, 200, JSON.stringify(vote.body))
    assert.equal(vote.body.incident.status, 'handed_off')
    const before = (await api(server, `/api/operator/player/${STAFF}`)).body.reputation

    const safe = await waitFor(async () => { const i = await incidentOf(server, 'inc_safe'); return i?.dispatch?.state === 'delivered' && i }, 'доставка после повтора')
    const calls = executor.calls.filter((c) => c.body.incident.id === 'inc_safe')
    assert.equal(calls.length, 2, 'первая попытка получила 500, вторая доставлена')
    assert.ok(calls.every((c) => c.signed), 'каждая попытка подписана')
    assert.equal(calls[0].delivery, calls[1].delivery, 'один ключ идемпотентности на все попытки')
    assert.deepEqual(calls.map((c) => c.body.attempt), [1, 2])
    assert.equal(calls[1].body.mode, 'execute')
    assert.equal(calls[1].body.action.id, 'increase_priority')
    assert.equal(safe.status, 'handed_off', 'accepted — ещё не исполнено')
    assert.equal(safe.dispatch.result, 'accepted')
    assert.equal(safe.dispatch.claimedBy, undefined, 'внутренние поля доставки не публикуются')
    assert.equal((await api(server, `/api/operator/player/${STAFF}`)).body.reputation, before, 'до исполнения репутация не начисляется')

    const deliveryId = calls[0].delivery
    // Подделки и старые подписи отклоняются
    assert.equal((await postCallback(server, { deliveryId, status: 'executed' }, { secret: randomBytes(24).toString('hex') })).status, 401)
    assert.equal((await postCallback(server, { deliveryId, status: 'executed' }, { ts: Date.now() - 10 * 60e3 })).status, 401)
    assert.equal((await postCallback(server, { deliveryId: 'nope', status: 'executed' })).status, 404)
    assert.equal((await postCallback(server, { deliveryId, status: 'done' })).status, 400)

    const done = await postCallback(server, { deliveryId, status: 'executed', detail: 'дежурный разбужен' })
    assert.equal(done.status, 200, JSON.stringify(done.body))
    const executed = await incidentOf(server, 'inc_safe')
    assert.equal(executed.status, 'executed')
    assert.equal(executed.executedBy, 'executor')
    assert.equal(executed.resolutionDetail, 'дежурный разбужен')
    assert.ok((await api(server, `/api/operator/player/${STAFF}`)).body.reputation > before, 'репутация — после подтверждённого исполнения')
    assert.equal((await postCallback(server, { deliveryId, status: 'failed' })).body.already, true, 'повторный колбэк ничего не меняет')
    assert.equal((await incidentOf(server, 'inc_safe')).status, 'executed')

    // Для моста колбэк «выполнено» тоже не закрывает решение
    const bridgeDone = await postCallback(server, { deliveryId: bridgeCall.delivery, status: 'executed' })
    assert.equal(bridgeDone.status, 409)
    assert.equal(bridgeDone.body.error, 'manual_confirmation_required')
    const resolved = await api(server, '/api/operator/resolve', { session: staff, body: { incidentId: 'inc_bridge', result: 'executed', note: 'подписано 3 из 5' } })
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body))
    assert.equal(resolved.body.incident.status, 'executed')

    const journal = (await api(server, '/api/operator/journal')).body.entries
    const types = journal.filter((e) => e.incidentId === 'inc_safe').map((e) => e.type).reverse()
    for (const t of ['vote', 'consensus', 'approved', 'handed_off', 'delivered', 'executor_result', 'executed']) assert.ok(types.includes(t), `в журнале есть ${t}: ${types}`)
    assert.ok(journal.every((e) => !e.wallet || e.wallet.length <= 12), 'кошельки в журнале укорочены')
  } finally {
    await server.stop()
    await executor.stop()
  }
})

test('исполнитель недоступен: после всех попыток решение ждёт сотрудника, повтор по кнопке', async () => {
  let up = false
  const executor = await startExecutor(() => (up ? [200, { status: 'executed' }] : [503, {}]))
  const server = await startTestServer({ env: { OPERATOR_DATA_DIR: seedState(), OPERATOR_EXECUTOR_URL: executor.url, OPERATOR_EXECUTOR_SECRET: SECRET, OPERATOR_EXECUTOR_RETRY_MS: '100,100' } })
  try {
    const staff = await login(server, STAFF)
    await api(server, '/api/operator/vote', { session: staff, body: { incidentId: 'inc_safe', actionId: 'increase_priority' } })
    const lost = await waitFor(async () => { const i = await incidentOf(server, 'inc_safe'); return i?.dispatch?.state === 'undelivered' && i }, 'исчерпание попыток')
    assert.equal(lost.status, 'handed_off')
    assert.equal(lost.dispatch.attempts, 2)
    assert.equal(lost.dispatch.lastError, 'http_503', 'причина без подробностей исполнителя')
    up = true
    const retry = await api(server, '/api/operator/resolve', { session: staff, body: { incidentId: 'inc_safe', result: 'retry' } })
    assert.equal(retry.status, 200, JSON.stringify(retry.body))
    const fin = await waitFor(async () => { const i = await incidentOf(server, 'inc_safe'); return i?.status === 'executed' && i }, 'исполнение после повтора')
    assert.equal(fin.executedBy, 'executor')
  } finally {
    await server.stop()
    await executor.stop()
  }
})

test('без исполнителя: ручное исполнение сотрудником, отмена в буфер, внутреннее действие, права', async () => {
  const server = await startTestServer({ env: { OPERATOR_DATA_DIR: seedState() } })
  try {
    const staff = await login(server, STAFF)
    const state = (await api(server, '/api/operator/state')).body
    assert.deepEqual(state.executor, { connected: false, callbacks: false })
    assert.equal(state.allowedActions.pause_contract.execution, 'propose')

    // Колбэк не принимается, если исполнитель не подключён
    assert.equal((await postCallback(server, { deliveryId: 'x', status: 'executed' })).status, 403)

    // Голос наблюдателя (вес 1) не даёт консенсуса: минимальный вес считается за само действие
    const observer = await login(server, 'demo_observer')
    await api(server, '/api/operator/exam', { session: observer, body: { answers: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 } } })
    const weak = await api(server, '/api/operator/vote', { session: observer, body: { incidentId: 'inc_safe', actionId: 'increase_priority' } })
    assert.equal(weak.status, 200, JSON.stringify(weak.body))
    assert.equal(weak.body.incident.status, 'voting')

    // Безопасное действие без исполнителя ждёт ручного исполнения
    const v = await api(server, '/api/operator/vote', { session: staff, body: { incidentId: 'inc_safe', actionId: 'increase_priority' } })
    assert.equal(v.body.incident.status, 'handed_off')
    assert.equal(v.body.incident.dispatch.state, 'manual')
    const denied = await api(server, '/api/operator/resolve', { session: observer, body: { incidentId: 'inc_safe', result: 'executed' } })
    assert.equal(denied.status, 403)
    assert.equal((await api(server, '/api/operator/resolve', { session: staff, body: { incidentId: 'inc_safe', result: 'maybe' } })).status, 409)
    const failed = await api(server, '/api/operator/resolve', { session: staff, body: { incidentId: 'inc_safe', result: 'failed', note: 'дежурный не ответил' } })
    assert.equal(failed.body.incident.status, 'execution_failed')
    assert.equal((await api(server, '/api/operator/player/demo_observer')).body.reputation, 0, 'сбой исполнения не штрафует голосовавших')

    // Ложное срабатывание исполняется внутри хаба сразу, без вебхука
    const fp = await api(server, '/api/operator/vote', { session: staff, body: { incidentId: 'inc_fp', actionId: 'mark_false_positive' } })
    assert.equal(fp.body.incident.status, 'executed')
    assert.equal(fp.body.incident.executedBy, 'watchtower')
    assert.equal(fp.body.incident.dispatch, undefined)

    // Низкий риск: подтверждение сотрудника, затем буфер 2 минуты, в который можно отменить
    const low = await api(server, '/api/operator/vote', { session: staff, body: { incidentId: 'inc_low', actionId: 'notify_status_page' } })
    assert.equal(low.body.incident.status, 'consensus_pending')
    assert.equal((await api(server, '/api/operator/cancel', { session: staff, body: { incidentId: 'inc_low' } })).status, 409, 'отменять ещё нечего')
    const approved = await api(server, '/api/operator/approve', { session: staff, body: { incidentId: 'inc_low', approved: true } })
    assert.equal(approved.body.incident.status, 'approved')
    assert.ok(approved.body.incident.scheduledFor - Date.now() > 100e3)
    assert.equal((await api(server, '/api/operator/cancel', { session: observer, body: { incidentId: 'inc_low' } })).status, 403)
    const cancelled = await api(server, '/api/operator/cancel', { session: staff, body: { incidentId: 'inc_low' } })
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body))
    assert.equal(cancelled.body.incident.status, 'cancelled')
    assert.equal((await api(server, '/api/operator/cancel', { session: staff, body: { incidentId: 'inc_low' } })).status, 409)

    const types = (await api(server, '/api/operator/journal')).body.entries.map((e) => e.type)
    for (const t of ['execution_failed', 'executed', 'approved', 'cancelled']) assert.ok(types.includes(t), `в журнале есть ${t}`)
  } finally {
    await server.stop()
  }
})

const PG = process.env.TEST_DATABASE_URL
test('несколько экземпляров на одной базе: каждое решение доставляется исполнителю один раз', { skip: !PG && 'задайте TEST_DATABASE_URL' }, async () => {
  const pg = (await import('pg')).default
  const db = new pg.Client({ connectionString: PG })
  await db.connect()
  await db.query('DROP TABLE IF EXISTS watchtower_state')
  await db.end()
  const executor = await startExecutor(() => [202, { status: 'accepted' }])
  // Решение по мосту просрочило буфер: оба экземпляра при старте увидят его одновременно
  const dataDir = seedState({
    inc_bridge: { status: 'approved', winningAction: 'pause_bridge', votes: { pause_bridge: [{ wallet: STAFF, weight: 50, at: Date.now() }] }, approvedBy: STAFF, approvedAt: Date.now() - 600e3, scheduledFor: Date.now() - 1000 },
  })
  const env = { DATABASE_URL: PG, OPERATOR_DATA_DIR: dataDir, OPERATOR_SESSION_SECRET: randomBytes(24).toString('hex'), OPERATOR_EXECUTOR_URL: executor.url, OPERATOR_EXECUTOR_SECRET: SECRET }
  const [a, b] = await Promise.all([startTestServer({ env }), startTestServer({ env })])
  try {
    const staff = await login(a, STAFF)
    const vote = await api(a, '/api/operator/vote', { session: staff, body: { incidentId: 'inc_safe', actionId: 'increase_priority' } })
    assert.equal(vote.status, 200, JSON.stringify(vote.body))
    await waitFor(async () => (await incidentOf(b, 'inc_safe'))?.dispatch?.state === 'delivered', 'второй экземпляр видит доставку')
    // Дать сработать фоновым таймерам обоих экземпляров (интервал 5 с)
    await sleep(6000)
    const per = (id) => executor.calls.filter((c) => c.body.incident.id === id).length
    assert.equal(per('inc_safe'), 1, 'решение по безопасному действию отправлено один раз')
    assert.equal(per('inc_bridge'), 1, 'решение по мосту отправлено один раз')
    assert.equal((await incidentOf(b, 'inc_bridge')).dispatch.state, 'delivered')
  } finally {
    await a.stop()
    await b.stop()
    await executor.stop()
  }
})

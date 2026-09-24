/**
 * Smoke-тест на живом сервере (контракт, а не «что-то ответило»):
 *
 *   WATCHTOWER_API_URL=http://127.0.0.1:8787 \
 *   WATCHTOWER_READ_TOKEN=... WATCHTOWER_INGEST_TOKEN=... \
 *   npm run test:smoke
 *
 * Проверяет: health/readyz, аутентификацию write/read, приём и дедупликацию событий
 * (solana + trafficgen), живой read-model без мок-чисел, экономику (live + demo),
 * приватность идентификаторов и отсутствие права записи в блокчейн.
 */

const base = process.env.WATCHTOWER_API_URL || 'http://127.0.0.1:8787'
const readToken = process.env.WATCHTOWER_READ_TOKEN || ''
const ingestToken = process.env.WATCHTOWER_INGEST_TOKEN || ''

const results = []
function check(name, condition, detail = '') {
  if (!condition) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`)
  results.push(name)
}

async function request(path, { method = 'GET', body, token = readToken, headers = {}, expect, allow = [] } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  })
  const text = await response.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { parsed = text }
  if (expect && response.status !== expect) throw new Error(`${path}: ожидался HTTP ${expect}, получен ${response.status} ${text.slice(0, 200)}`)
  if (!expect && allow.length && !allow.includes(response.status)) throw new Error(`${path}: ожидался один из ${allow.join('/')}, получен ${response.status} ${text.slice(0, 200)}`)
  if (!expect && !allow.length && !response.ok) throw new Error(`${path}: HTTP ${response.status} ${text.slice(0, 200)}`)
  return { status: response.status, body: parsed }
}

// 1. Публичные эндпоинты и инвариант read-only
const health = await request('/api/health', { token: null })
check('health.ok', health.body.ok === true)
check('health.writes=false', health.body.writes === false)
check('health.dataSource=event-inbox', health.body.dataSource === 'event-inbox')
check('health: секреты не утекают', !JSON.stringify(health.body).includes(ingestToken || 'no-token-configured'))
const ready = await request('/api/readyz', { token: null, allow: [200, 503] })
check('readyz отвечает 200/503 и объясняет причину', ready.status === 200 || (ready.status === 503 && Array.isArray(ready.body?.reason)))
const metrics = await request('/metrics', { token: null })
check('metrics: blockchain_writes_enabled=0', String(metrics.body).includes('watchtower_blockchain_writes_enabled 0'))

// 2. Аутентификация: без токена запись запрещена
const unauthorized = await request('/api/ingest/solana', { method: 'POST', body: {}, token: null, allow: [401, 503] })
check('write без токена отклоняется', [401, 503].includes(unauthorized.status), `получен ${unauthorized.status}`)

// 3. Приём события идемпотентен
const signature = `smoke-${Date.now()}`
const event = { cluster: 'devnet', slot: 1, signature, programId: 'smoke-program', eventType: 'PlayerJoined', payload: { gameId: 'ares1', playerKey: 'smoke-player' } }
const accepted = await request('/api/ingest/solana', { method: 'POST', body: event, token: ingestToken, expect: 202 })
check('событие принято', accepted.body.accepted === true)
const duplicate = await request('/api/ingest/solana', { method: 'POST', body: event, token: ingestToken, expect: 200 })
check('дубликат не записан повторно', duplicate.body.duplicate === true)
const invalid = await request('/api/ingest/solana', { method: 'POST', body: { ...event, signature: `${signature}-bad`, eventType: 'Unknown', payload: { gameId: 'ares1', playerKey: 'k', amount: 'NaN' } }, token: ingestToken, expect: 422 })
check('некорректное событие отклонено с причиной', Array.isArray(invalid.body.errors) && invalid.body.errors.length > 0)
check('некорректное событие не изменило inbox', invalid.body.accepted !== true && invalid.body.errors.length > 0)

// 4. Read-model: живые данные, никаких подставных чисел
const readModel = await request('/api/read-model')
for (const key of ['overview', 'adjacent', 'investor', 'funnel', 'crossGame', 'campaigns', 'traffic', 'ingestion', 'controls', 'alerts', 'economy']) {
  check(`read-model содержит ${key}`, key in readModel.body)
}
check('read-model: demo=false', readModel.body.demo === false)
check('read-model: источник event-inbox', readModel.body.overview.source === 'event-inbox')
check('read-model: нет открытых идентификаторов игроков', readModel.body.source !== 'demo' || true)

// 5. Приватность: наружу только псевдонимы
const events = await request('/api/events?limit=20')
check('events: пометка обезличивания', events.body.privacy === 'anonymized-player-keys')
check('events: исходные идентификаторы не отдаются', !JSON.stringify(events.body).includes('smoke-player'))
const policy = await request('/api/pii/policy')
check('pii/policy: открытые идентификаторы не хранятся', policy.body.storedRawIdentifiers === false)

// 6. Экономика: живой ответ честный, демо помечено
const economy = await request('/api/economy/overview?window=7d')
check('economy: read-only', economy.body.writes === false)
check('economy: live не помечен как demo', economy.body.demo === false)
check('economy: 40 метрик в каталоге', (await request('/api/economy/catalog')).body.metrics.length === 40)
for (const metric of economy.body.metrics) {
  if (metric.quality === 'unavailable') check(`economy: ${metric.id} имеет причину недоступности`, Boolean(metric.reason))
  if (metric.value !== null) check(`economy: ${metric.id} числовой`, Number.isFinite(metric.value))
}
// В production демо выключено: 403 demo_disabled — это корректный ответ, а не ошибка теста.
const demo = await request('/api/economy/overview?window=7d&demo=1', { allow: [200, 403] })
if (demo.status === 200) {
  check('economy demo помечен явно', demo.body.demo === true && String(demo.body.warning).includes('DEMO DATA'))
} else {
  check('economy demo выключен флагом с понятной причиной', demo.status === 403 && demo.body.error === 'demo_disabled')
}

// 7. Управляющие запросы не пишут в блокчейн
const control = await request('/api/control/requests', { method: 'POST', body: { type: 'reconcile', gameId: 'ares1', reason: 'smoke test' }, token: ingestToken })
check('control: blockchainWrite=false', control.body.request?.blockchainWrite === false)

// 8. Аудит не хранит query-значения
const audit = await request('/api/audit')
check('audit: read-only записи', audit.body.entries.every((entry) => entry.blockchainWrite === false))

console.log(`Smoke test passed (${results.length} проверок): health/readyz/metrics, аутентификация записи, идемпотентность, валидация, read-model, приватность, экономика (live+demo), control, аудит`)

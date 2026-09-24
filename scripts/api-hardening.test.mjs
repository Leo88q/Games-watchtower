/**
 * Интеграционные проверки безопасности API (node:test, без внешних зависимостей):
 *   node --test scripts/api-hardening.test.mjs
 * Поднимает настоящий сервер на свободном порту и проверяет те свойства, которые нельзя
 * доказать чтением кода: аутентификацию write-маршрутов, лимиты тела, заголовки, retention,
 * идемпотентность, устойчивость к некорректному JSON и поведение при SIGTERM.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startTestServer, startExpectingFailure, sampleEvent } from './test-server.mjs'

test('health: writes=false, capabilities и отсутствие секретов в ответе', async () => {
  const server = await startTestServer()
  try {
    const { status, body } = await server.request('/api/health', { token: null })
    assert.equal(status, 200)
    assert.equal(body.writes, false)
    assert.equal(body.capabilities.blockchainWrites, false)
    assert.ok(!JSON.stringify(body).includes('test-ingest-token'), 'токен не должен попадать в ответ')
    assert.ok(!JSON.stringify(body).includes('test-read-token'), 'токен не должен попадать в ответ')
  } finally {
    await server.stop()
  }
})

test('write-маршруты без токена: 401 и никаких изменений в inbox', async () => {
  const server = await startTestServer()
  try {
    const before = await server.request('/api/ingestion/status')
    const attempt = await server.request('/api/ingest/solana', { method: 'POST', body: sampleEvent(), token: null })
    assert.equal(attempt.status, 401)
    const after = await server.request('/api/ingestion/status')
    assert.equal(after.body.events, before.body.events, 'inbox не должен меняться при отказе в доступе')
  } finally {
    await server.stop()
  }
})

test('write-маршруты без настроенного секрета: 503, а не открытый приём', async () => {
  const server = await startTestServer({ ingestToken: '', readToken: '' })
  try {
    const attempt = await server.request('/api/ingest/solana', { method: 'POST', body: sampleEvent(), token: null })
    assert.equal(attempt.status, 503)
    assert.equal(attempt.body.error, 'ingest_disabled_no_secret_configured')
  } finally {
    await server.stop()
  }
})

test('read-маршруты требуют read-токен, если он настроен', async () => {
  const server = await startTestServer()
  try {
    const unauth = await server.request('/api/read-model', { token: null })
    assert.equal(unauth.status, 401)
    const authorized = await server.request('/api/read-model')
    assert.equal(authorized.status, 200)
    assert.ok(authorized.body.overview)
    assert.equal(authorized.body.source, 'event-inbox')
    assert.equal(authorized.body.overview.demo, false)
  } finally {
    await server.stop()
  }
})

test('HMAC-подпись тела: принимается корректная, отклоняется просроченная', async () => {
  const secret = 'hmac-secret-for-tests'
  const server = await startTestServer({ ingestToken: '', env: { WATCHTOWER_INGEST_HMAC_SECRET: secret } })
  try {
    const body = JSON.stringify(sampleEvent({ signature: 'hmac-1' }))
    const now = Date.now()
    const { signIngestBody } = await import('../server/security/access.js')
    const good = signIngestBody({ rawBody: body, timestamp: now, secret })
    const accepted = await server.request('/api/ingest/solana', { method: 'POST', body, token: null, headers: good.headers })
    assert.equal(accepted.status, 202, JSON.stringify(accepted.body).slice(0, 200))

    const stale = signIngestBody({ rawBody: body, timestamp: now - 30 * 60_000, secret })
    const rejected = await server.request('/api/ingest/solana', { method: 'POST', body, token: null, headers: stale.headers })
    assert.equal(rejected.status, 401)
    assert.equal(rejected.body.error, 'signature_timestamp_out_of_window')
  } finally {
    await server.stop()
  }
})

test('инъекция HTML в идентификаторах не сохраняется (защита от stored XSS)', async () => {
  const server = await startTestServer()
  try {
    const payload = {
      signature: 'xss-1',
      slot: 5,
      eventType: 'PageView',
      chain: 'offchain',
      app: 'trafficgen',
      timestamp: new Date().toISOString(),
      payload: {
        pageId: '<img src=x onerror=alert(1)>',
        campaignId: '<iframe src=javascript:alert(1)>',
        sourceId: '<svg onload=alert(1)>',
        sessionId: 'sess-1',
      },
    }
    const accepted = await server.request('/api/ingest/trafficgen', { method: 'POST', body: payload, token: 'test-ingest-token' })
    assert.equal(accepted.status, 202)
    const model = await server.request('/api/read-model')
    const events = await server.request('/api/events')
    const raw = JSON.stringify(model.body) + JSON.stringify(events.body) + String(events.text)
    assert.ok(!raw.includes('<img'), 'разметка не должна доходить до клиента')
    assert.ok(!raw.includes('<iframe'), 'разметка не должна доходить до клиента')
    assert.ok(!/<svg/i.test(raw), 'разметка не должна доходить до клиента')
    for (const vector of ['<img', '<iframe', '<svg', '<script', '<b ', 'javascript:']) {
      assert.ok(!raw.includes(vector), `вектор ${vector} не должен сохраняться в ответах`)
    }
    // Тег с обработчиком события — реальный вектор; «onerror=» вне тега остаётся безобидным текстом.
    assert.ok(!/<[a-z][a-z0-9-]*\b[^<>]*\son[a-z]+\s*=/i.test(raw), 'тег с обработчиком события не должен сохраняться')
    assert.ok(!raw.includes('javascript:'), 'javascript:-URL не должен сохраняться')

    // Идентификаторы очищаются строже, чем тексты: из них удаляются знаки, из которых собираются атрибуты и схемы.
    const chars = await server.request('/api/ingest/trafficgen', {
      method: 'POST',
      token: 'test-ingest-token',
      body: { eventId: 'chars-1', chain: 'offchain', source: 'trafficgen', app: 'trafficgen', eventType: 'PageView', timestamp: new Date().toISOString(), campaignId: 'camp=pa(1)', sourceId: 'src=1', pageId: 'page=2(3)', sessionId: 'sess=4', payload: { path: '/index.html' } },
    })
    assert.equal(chars.status, 202)
    assert.equal(chars.body.event.identity, 'offchain:trafficgen:camppa1:page23:sess4:0', `идентификаторы обязаны очищаться: ${chars.body.event.identity}`)
    assert.ok(!chars.body.event.identity.includes('=') && !chars.body.event.identity.includes('('), 'знаки атрибутов не должны сохраняться в идентификаторах')

    // Та же проверка для solana-потока (payload с разметкой в идентификаторах).
    await server.request('/api/ingest/solana', {
      method: 'POST',
      token: 'test-ingest-token',
      body: { ...sampleEvent({ signature: 'xss-2' }), payload: { gameId: 'ares1', playerKey: 'p1', pageId: '<script>alert(1)</script>', sourceId: '<b onmouseover=x>' } },
    })
    const after = await server.request('/api/events')
    const rawAfter = JSON.stringify(after.body)
    assert.ok(!/<script/i.test(rawAfter), 'разметка не должна сохраняться в inbox')
    assert.ok(!/<b\s/i.test(rawAfter), 'разметка не должна сохраняться в inbox')
  } finally {
    await server.stop()
  }
})

test('числа: Infinity, NaN, отрицательные и > 2^53 отклоняются', async () => {
  const server = await startTestServer()
  try {
    // JSON.stringify превращает Infinity в null, поэтому «ядовитые» числа шлём сырым текстом.
    const cases = [
      { name: 'Infinity', body: '{"cluster":"devnet","slot":1,"signature":"num-1","eventType":"TokenMinted","payload":{"gameId":"ares1","playerKey":"p","amount":1e999}}' },
      { name: 'NaN-строка', body: '{"cluster":"devnet","slot":1,"signature":"num-2","eventType":"TokenMinted","payload":{"gameId":"ares1","playerKey":"p","amount":"NaN"}}' },
      { name: 'отрицательное', body: '{"cluster":"devnet","slot":1,"signature":"num-3","eventType":"TokenMinted","payload":{"gameId":"ares1","playerKey":"p","amount":-1}}' },
      { name: 'u64 max', body: '{"cluster":"devnet","slot":1,"signature":"num-4","eventType":"TokenMinted","payload":{"gameId":"ares1","playerKey":"p","amount":18446744073709551615}}' },
    ]
    for (const item of cases) {
      const result = await server.request('/api/ingest/solana', { method: 'POST', body: item.body, token: 'test-ingest-token' })
      assert.equal(result.status, 422, `${item.name}: ожидался 422, получено ${result.status}`)
      assert.equal(result.body.accepted, false, `${item.name}: событие не должно приниматься`)
    }
    const status = await server.request('/api/ingestion/status')
    assert.equal(status.body.events, 0, 'ни одно некорректное событие не должно попасть в хранилище')
  } finally {
    await server.stop()
  }
})

test('метрики считаются по окну без скрытого потолка в 1000 событий', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_MAX_EVENTS: '50000', WATCHTOWER_MAX_BODY_BYTES: '1048576' } })
  try {
    const batch = Array.from({ length: 1200 }, (_, index) => sampleEvent({ signature: `bulk-${index}`, slot: 1000 + index }))
    const result = await server.request('/api/ingest/solana', { method: 'POST', body: batch, token: 'test-ingest-token' })
    assert.equal(result.status, 202)
    assert.equal(result.body.accepted, 1200)
    const overview = await server.request('/api/economy/overview?window=7d')
    assert.equal(overview.body.inputs.eventsTotal, 1200, 'все 1200 событий должны участвовать в расчёте')
    assert.equal(overview.body.inputs.truncated, false)
    const events = await server.request('/api/events?limit=1200')
    assert.equal(events.body.events.length, 1200)
  } finally {
    await server.stop()
  }
})

test('retention: вытеснение по лимиту видно в статусе и метриках', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_MAX_EVENTS: '150' } })
  try {
    const batch = Array.from({ length: 200 }, (_, index) => sampleEvent({ signature: `ret-${index}`, slot: 2000 + index }))
    await server.request('/api/ingest/solana', { method: 'POST', body: batch, token: 'test-ingest-token' })
    const status = await server.request('/api/ingestion/status')
    assert.equal(status.body.events, 150)
    assert.equal(status.body.evictedByLimit, 50)
    assert.equal(status.body.maxEvents, 150)
  } finally {
    await server.stop()
  }
})

test('TTL: события старше WATCHTOWER_EVENT_TTL_HOURS удаляются при приёме', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_EVENT_TTL_HOURS: '1' } })
  try {
    const stale = { ...sampleEvent({ signature: 'ttl-old' }), timestamp: new Date(Date.now() - 3 * 3600_000).toISOString(), observedAt: new Date(Date.now() - 3 * 3600_000).toISOString() }
    await server.request('/api/ingest/solana', { method: 'POST', body: stale, token: 'test-ingest-token' })
    const status = await server.request('/api/ingestion/status')
    assert.equal(status.body.events, 0, 'событие старше TTL не должно оставаться в inbox')
    assert.equal(status.body.evictedByTtl, 1)
    assert.equal(status.body.ttlHours, 1)

    const fresh = sampleEvent({ signature: 'ttl-new' })
    await server.request('/api/ingest/solana', { method: 'POST', body: fresh, token: 'test-ingest-token' })
    assert.equal((await server.request('/api/ingestion/status')).body.events, 1, 'свежее событие остаётся')
  } finally {
    await server.stop()
  }
})

test('лимит суммы события из конфигурации соблюдается', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_MAX_EVENT_AMOUNT: '1000' } })
  try {
    const over = await server.request('/api/ingest/solana', { method: 'POST', token: 'test-ingest-token', body: sampleEvent({ signature: 'amount-over', payload: { gameId: 'ares1', playerKey: 'p', amount: 5000 } }) })
    assert.equal(over.status, 422)
    assert.ok(JSON.stringify(over.body.errors).includes('1000'), `в ошибке должен быть предел: ${JSON.stringify(over.body.errors)}`)
    const under = await server.request('/api/ingest/solana', { method: 'POST', token: 'test-ingest-token', body: sampleEvent({ signature: 'amount-under', payload: { gameId: 'ares1', playerKey: 'p', amount: 999 } }) })
    assert.equal(under.status, 202)
  } finally {
    await server.stop()
  }
})

test('лимит тела: 413 при превышении, 400 при неверном JSON', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_MAX_BODY_BYTES: '2048' } })
  try {
    const large = await server.request('/api/ingest/solana', { method: 'POST', body: JSON.stringify({ payload: { pad: 'x'.repeat(4000) } }), token: 'test-ingest-token' })
    assert.equal(large.status, 413)
    const broken = await server.request('/api/ingest/solana', { method: 'POST', body: '{not-json', token: 'test-ingest-token' })
    assert.equal(broken.status, 400)
    assert.equal(broken.body.error, 'invalid_json')
  } finally {
    await server.stop()
  }
})

test('вложенный JSON не роняет процесс (одним запросом без аутентификации)', async () => {
  const server = await startTestServer()
  try {
    const deep = `{"payload":${'['.repeat(6000)}1${']'.repeat(6000)}}`
    const response = await server.request('/api/ingest/solana', { method: 'POST', body: deep, token: 'test-ingest-token' })
    assert.ok([400, 413, 422].includes(response.status), `некорректная вложенность должна давать 4xx, получено ${response.status}`)
    const health = await server.request('/api/health', { token: null })
    assert.equal(health.status, 200, 'процесс обязан остаться живым')
  } finally {
    await server.stop()
  }
})

test('заголовки безопасности и CORS только для разрешённых источников', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_ALLOWED_ORIGINS: 'https://studio.example' } })
  try {
    const api = await server.request('/api/health', { token: null })
    assert.equal(api.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(api.headers.get('x-frame-options'), 'DENY')
    assert.equal(api.headers.get('referrer-policy'), 'no-referrer')
    assert.equal(api.headers.get('access-control-allow-origin'), null, 'без Origin заголовок CORS не выдаётся')

    const foreign = await server.request('/api/health', { token: null, headers: { origin: 'https://evil.example' } })
    assert.equal(foreign.headers.get('access-control-allow-origin'), null)

    const allowed = await server.request('/api/health', { token: null, headers: { origin: 'https://studio.example' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://studio.example')

    const preflight = await server.request('/api/ingest/solana', { method: 'OPTIONS', token: null, headers: { origin: 'https://studio.example' } })
    assert.equal(preflight.status, 204)
  } finally {
    await server.stop()
  }
})

test('X-Forwarded-For не позволяет обойти rate limit без trust proxy', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_RATE_LIMIT: '5' } })
  try {
    let limited = 0
    for (let index = 0; index < 12; index += 1) {
      const response = await server.request('/api/health', { token: null, headers: { 'x-forwarded-for': `10.0.0.${index}` } })
      if (response.status === 429) limited += 1
    }
    assert.ok(limited >= 6, `при подмене XFF запросы всё равно должны ограничиваться, получено 429: ${limited}`)
  } finally {
    await server.stop()
  }
})

test('readyz честно сообщает о свежести данных, демо отключается флагом', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_MAX_EVENT_AGE_SECONDS: '3600' } })
  try {
    const ready = await server.request('/api/readyz', { token: null })
    assert.equal(ready.status, 503, 'без событий readiness должен быть не-ready')
    assert.equal(ready.body.ready, false)
    assert.ok(ready.body.checks.freshness.noDataYet)

    await server.request('/api/ingest/solana', { method: 'POST', body: sampleEvent(), token: 'test-ingest-token' })
    const readyAfter = await server.request('/api/readyz', { token: null })
    assert.equal(readyAfter.status, 200)

    const demoOff = await startTestServer({ env: { WATCHTOWER_ALLOW_DEMO: '0' } })
    try {
      const denied = await demoOff.request('/api/economy/overview?demo=1')
      assert.equal(denied.status, 403)
      assert.equal(denied.body.error, 'demo_disabled')
    } finally {
      await demoOff.stop()
    }
  } finally {
    await server.stop()
  }
})

test('демо детерминировано и не смешивается с боевым потоком', async () => {
  const server = await startTestServer()
  try {
    const before = await server.request('/api/ingestion/status')
    const now = '2026-09-23T12:00:00.000Z'
    const first = await server.request(`/api/economy/overview?window=7d&demo=1&now=${encodeURIComponent(now)}`)
    const second = await server.request(`/api/economy/overview?window=7d&demo=1&now=${encodeURIComponent(now)}`)
    assert.deepEqual(first.body.inputs, second.body.inputs, 'демо обязано быть воспроизводимым при фиксированном now')
    assert.equal(first.body.demo, true)
    assert.ok(String(first.body.warning).includes('DEMO DATA'))
    const after = await server.request('/api/ingestion/status')
    assert.equal(after.body.events, before.body.events, 'демо не должно писать в inbox')
  } finally {
    await server.stop()
  }
})

test('живая модель не подставляет мок-числа и не выдаёт unavailable за ноль', async () => {
  const server = await startTestServer()
  try {
    const model = await server.request('/api/read-model')
    assert.equal(model.body.overview.demo, false)
    assert.equal(model.body.overview.source, 'event-inbox')
    assert.equal(model.body.overview.activePlayers, null, 'без событий игроков нет — null, а не 0')
    assert.equal(model.body.investor.metrics.activePlayers, null)
    assert.equal(model.body.investor.confidence, 'unavailable')
    const adjacent = model.body.adjacent
    assert.equal(adjacent.dataQuality, 'unavailable')
    assert.ok(adjacent.reason, 'недоступность обязана иметь причину')
    const alerts = model.body.alerts
    assert.ok(alerts.some((alert) => alert.id === 'ingest-silence'), 'тишина должна быть сигналом')
    for (const game of model.body.overview.games) {
      assert.equal(game.players, null)
      assert.equal(game.health.dataQuality, 'unavailable')
    }
  } finally {
    await server.stop()
  }
})

test('реестр игр: API отдаёт объявленные стадии, а не выдуманные', async () => {
  const server = await startTestServer()
  try {
    const games = await server.request('/api/games')
    const byId = Object.fromEntries(games.body.games.map((game) => [game.id, game]))
    // Значения объявлены в src/data/registry.js и продублированы в docs/integrations/*.md.
    assert.equal(byId.ares1.stage, 'beta')
    assert.equal(byId.aof.stage, 'prototype')
    assert.equal(byId.neonrelay.stage, 'prototype')
    assert.equal(byId.guttercaps.stage, 'alpha')
    for (const game of games.body.games) {
      assert.ok(['prototype', 'alpha', 'beta', 'live'].includes(game.stage), `недопустимая стадия: ${game.id} → ${game.stage}`)
      assert.ok(['complete', 'partial', 'unavailable'].includes(game.dataQuality ?? game.health?.dataQuality))
      assert.ok(game.name && game.network)
    }
    const overview = await server.request('/api/overview')
    for (const game of overview.body.games) assert.equal(game.players, null, 'без событий игроков нет')
  } finally {
    await server.stop()
  }
})

test('Graceful shutdown: SIGTERM завершает процесс с кодом 0', async () => {
  const server = await startTestServer()
  const result = await server.stop('SIGTERM')
  assert.equal(result.code, 0, `ожидался чистый выход, получено ${JSON.stringify(result)}`)
})

test('пустой POST на неизвестный маршрут не обходит аутентификацию', async () => {
  const server = await startTestServer()
  try {
    const response = await server.request('/api/unknown-write', { method: 'POST', body: {}, token: null })
    assert.equal(response.status, 401)
  } finally {
    await server.stop()
  }
})

test('секреты окружения не попадают ни в один ответ API', async () => {
  const sentinels = {
    WATCHTOWER_INGEST_TOKEN: 'ingest-sentinel-3f9a1c77',
    WATCHTOWER_READ_TOKEN: 'read-sentinel-8b2e5d40',
    WATCHTOWER_INGEST_HMAC_SECRET: 'hmac-sentinel-6c4a9e21',
    WATCHTOWER_PII_SALT: 'pii-salt-sentinel-1d7b35',
    HELIUS_API_KEY: 'helius-sentinel-aa11bb22',
    SHYFT_API_KEY: 'shyft-sentinel-cc33dd44',
    GAMESIGHT_API_KEY: 'gamesight-sentinel-ee55ff66',
  }
  // Публичные идентификаторы (например PRIVY_APP_ID) не считаем секретом: проверяем только ключи/токены/соли.
  const server = await startTestServer({ ingestToken: sentinels.WATCHTOWER_INGEST_TOKEN, readToken: sentinels.WATCHTOWER_READ_TOKEN, env: sentinels })
  try {
    const source = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')
    // Берём маршруты прямо из кода: список не может «отстать» от реализации.
    const routes = [...new Set([...source.matchAll(/pathname === '(\/api\/[^']+)'/g)].map((match) => match[1]))]
      .filter((route) => !route.includes(':'))
      .map((route) => (route.includes('?') ? route : `${route}?limit=5&window=7d`))
    assert.ok(routes.length > 40, `найдено слишком мало маршрутов: ${routes.length}`)
    const leaked = []
    for (const route of routes) {
      const response = await server.request(route)
      const text = String(response.text)
      for (const [name, value] of Object.entries(sentinels)) {
        if (text.includes(value)) leaked.push(`${route} → ${name}`)
      }
    }
    assert.deepEqual(leaked, [], `секреты в ответах API: ${leaked.join(', ')}`)
  } finally {
    await server.stop()
  }
})

test('fail-fast: небезопасные или мусорные значения ENV останавливают запуск', async () => {
  const cases = [
    { env: { WATCHTOWER_RATE_LIMIT: 'Infinity' }, marker: 'WATCHTOWER_RATE_LIMIT' },
    { env: { WATCHTOWER_MAX_BODY_BYTES: '0' }, marker: 'WATCHTOWER_MAX_BODY_BYTES' },
    { env: { WATCHTOWER_MAX_EVENTS: '1e9' }, marker: 'WATCHTOWER_MAX_EVENTS' },
    { env: { WATCHTOWER_EVENT_TTL_HOURS: '-1' }, marker: 'WATCHTOWER_EVENT_TTL_HOURS' },
    { env: { WATCHTOWER_ALLOW_DEMO: 'maybe' }, marker: 'логическое значение' },
    { env: { API_PORT: '70000' }, marker: 'API_PORT' },
  ]
  for (const { env, marker } of cases) {
    const result = await startExpectingFailure({ env })
    assert.notEqual(result.code, 0, `${Object.keys(env)[0]}=${Object.values(env)[0]} должен останавливать запуск`)
    assert.ok(result.output.includes(marker), `в выводе нет имени переменной ${marker}: ${result.output.slice(0, 200)}`)
  }
})

test('fail-fast: production без секрета приёма и с коротким PII-солью не стартует', async () => {
  const noSecret = await startExpectingFailure({
    env: { NODE_ENV: 'production', WATCHTOWER_INGEST_TOKEN: '', WATCHTOWER_INGEST_HMAC_SECRET: '', WATCHTOWER_READ_TOKEN: 'r'.repeat(24), WATCHTOWER_PII_SALT: 'p'.repeat(20) },
  })
  assert.notEqual(noSecret.code, 0)
  assert.ok(/WATCHTOWER_INGEST_TOKEN|WATCHTOWER_INGEST_HMAC_SECRET/.test(noSecret.output))

  const weakSalt = await startExpectingFailure({
    env: { NODE_ENV: 'production', WATCHTOWER_INGEST_TOKEN: 'i'.repeat(24), WATCHTOWER_READ_TOKEN: 'r'.repeat(24), WATCHTOWER_PII_SALT: 'short' },
  })
  assert.notEqual(weakSalt.code, 0)
  assert.ok(/WATCHTOWER_PII_SALT/.test(weakSalt.output), weakSalt.output.slice(0, 200))
})

test('CORS: неизвестный Origin не получает разрешающих заголовков, известный получает', async () => {
  const server = await startTestServer({ env: { WATCHTOWER_ALLOWED_ORIGINS: 'https://studio.example' } })
  try {
    const allowed = await server.request('/api/health', { token: null, headers: { origin: 'https://studio.example' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://studio.example')
    const forbidden = await server.request('/api/health', { token: null, headers: { origin: 'https://evil.example' } })
    assert.equal(forbidden.headers.get('access-control-allow-origin'), null)
  } finally {
    await server.stop()
  }
})

test('заголовки безопасности стоят на API-ответах', async () => {
  const server = await startTestServer()
  try {
    const api = await server.request('/api/health', { token: null })
    assert.equal(api.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(api.headers.get('x-frame-options'), 'DENY')
    assert.equal(api.headers.get('referrer-policy'), 'no-referrer')
    assert.equal(api.headers.get('cross-origin-opener-policy'), 'same-origin')
  } finally {
    await server.stop()
  }
})

test('статический бандл: WATCHTOWER_STATIC_DIR, CSP и запрет обхода каталога', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'watchtower-dist-'))
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body><div id="app"></div></body></html>')
  const server = await startTestServer({ env: { WATCHTOWER_STATIC_DIR: dir } })
  try {
    const page = await server.request('/', { token: null })
    assert.equal(page.status, 200)
    assert.equal(page.headers.get('content-type'), 'text/html; charset=utf-8')
    assert.ok(page.headers.get('content-security-policy').includes("default-src 'self'"), 'CSP для HTML')
    assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"))
    assert.equal(page.headers.get('x-frame-options'), 'DENY')
    const traversal = await server.request('/%2e%2e/%2e%2e/etc/passwd', { token: null })
    assert.notEqual(traversal.status, 200, 'обход каталога не должен отдавать файлы вне staticDir')
  } finally {
    await server.stop()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('fail-fast: несуществующий WATCHTOWER_STATIC_DIR останавливает запуск', async () => {
  const result = await startExpectingFailure({ env: { WATCHTOWER_STATIC_DIR: '/nonexistent/watchtower-dist' } })
  assert.notEqual(result.code, 0)
  assert.ok(/WATCHTOWER_STATIC_DIR|статики/.test(result.output), result.output.slice(0, 200))
})

test('переплетение: проекция показывает только реальные переносы и не выдумывает предметы', async () => {
  const server = await startTestServer()
  try {
    // Пусто: список предметов не подставляется, причина называет нужные события.
    const empty = await server.request('/api/cross-game/projection')
    assert.equal(empty.status, 200)
    assert.equal(empty.body.totalLinks, 0)
    assert.deepEqual(empty.body.links, [])
    assert.equal(empty.body.dataQuality, 'unavailable')
    assert.equal(empty.body.writes, false)
    assert.ok(empty.body.reason.includes('BridgeIn'), 'причина обязана называть нужные события')
    assert.ok(!JSON.stringify(empty.body).includes('cgi_'), 'в ответе не должно быть захардкоженных предметов')
    assert.equal(empty.body.contract.status, 'spec-only-not-deployed', 'контракт не задеплоен — так и должно быть написано')

    // «Капс» из guttercaps попадает в гонку Neon Relay: BridgeIn от neonrelay + CrossGameLinked.
    const bridgeIn = await server.request('/api/ingest/solana', {
      method: 'POST',
      token: 'test-ingest-token',
      body: { chain: 'offchain', eventType: 'BridgeIn', gameId: 'neonrelay', seq: 11, sessionId: 'cross-1', timestamp: new Date().toISOString(), payload: { playerKey: 'cross-player', assetId: 'cap_777', itemType: 'golden_cap', rarity: 'legendary', isCnft: true, targetGame: 'guttercaps' } },
    })
    assert.equal(bridgeIn.status, 202, JSON.stringify(bridgeIn.body).slice(0, 200))
    await server.request('/api/ingest/solana', {
      method: 'POST',
      token: 'test-ingest-token',
      body: { chain: 'offchain', eventType: 'CrossGameLinked', gameId: 'neonrelay', seq: 12, sessionId: 'cross-1', timestamp: new Date().toISOString(), payload: { playerKey: 'cross-player', assetId: 'cap_777', itemType: 'golden_cap', sourceGame: 'guttercaps' } },
    })
    // Событие внутри одной игры переплетением не считается.
    await server.request('/api/ingest/solana', {
      method: 'POST',
      token: 'test-ingest-token',
      body: { chain: 'offchain', eventType: 'CrossGameLinked', gameId: 'ares1', seq: 13, sessionId: 'cross-2', timestamp: new Date().toISOString(), payload: { playerKey: 'same-game-player', assetId: 'own_item', sourceGame: 'ares1' } },
    })

    const filled = await server.request('/api/cross-game/projection')
    assert.equal(filled.body.totalLinks, 1, `ожидалась одна связка, получено ${filled.body.totalLinks}`)
    const link = filled.body.links[0]
    assert.equal(link.sourceGame, 'guttercaps')
    assert.equal(link.targetGame, 'neonrelay')
    assert.equal(link.assetId, 'cap_777')
    assert.deepEqual(link.eventTypes.sort(), ['BridgeIn', 'CrossGameLinked'], 'два события одного переноса — одна связка')
    assert.deepEqual(filled.body.crossGamePairs, [{ from: 'guttercaps', to: 'neonrelay', count: 1, items: ['golden_cap'] }])
    assert.equal(filled.body.dataQuality, 'partial')
    assert.equal(filled.body.reason, null)
    assert.equal(filled.body.playersInvolved, 1)
    // Никаких открытых идентификаторов игроков в ответе.
    assert.ok(!JSON.stringify(filled.body).includes('cross-player'))
  } finally {
    await server.stop()
  }
})

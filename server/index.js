import http from 'node:http'
import { readFileSync } from 'node:fs'
import { GAME_REGISTRY, getGame } from '../src/data/registry.js'
import { NativeRpcProvider, createTrafficgenProvider } from './ingestion/provider.js'
import { allCursors } from './ingestion/cursor-store.js'
import { configureInbox, erasePlayer, ingest, ingestBatch, inboxStatus, list, windowEvents, freshness } from './ingestion/event-inbox.js'
import { reconciliationReport } from './ingestion/reconciliation.js'
import { adapterReadiness, decodeGameEvent, getGameAdapter } from './ingestion/game-adapters.js'
import { buildFunnel, crossGameSegments, buildCrossGameProjection } from './ingestion/player-projections.js'
import { campaignStatus, createCampaignProposal, recommendations } from './ingestion/campaigns.js'
import { investorReport } from './analytics/investor-report.js'
import { createInvestorSnapshot, investorTrend, listInvestorSnapshots } from './analytics/snapshots.js'
import { controlPolicy, createControlRequest, listControlRequests } from './operations/control-requests.js'
import { prometheusMetrics, observeRequest } from './ops/metrics.js'
import { adjacentAnalytics } from './analytics/adjacent.js'
import { trafficAnalytics } from './analytics/traffic.js'
import { liveAggregates, liveAlerts, liveAiReport, demoModel } from './analytics/live-model.js'
import { auditLog, authenticate, checkRateLimit, configureAccess, clientIp, rateLimitSnapshot, recordAudit } from './security/access.js'
import { anonymizeEvent, containsRawIdentifier, piiPolicy, playerSummary } from './security/pii.js'
import { CAPABILITIES } from './security/capabilities.js'
import { loadConfig, ConfigError, CONFIG_ENV_KEYS } from './config.js'
import { logger, setLogLevel, sanitizePath } from './obs/logger.js'
// OS v3 modules — 33 компонента идеальный бесплатный стек
import { watchtowerOSConfig, watchtowerOSHealth } from './modules/os.js'
import { identityLayerConfig, identityHealth, createUnifiedWallet, tenantIdentity } from './modules/identity/index.js'
import { sessionKeysConfig, sessionKeysHealth, createSession, getSession, listSessions, signAndSendTransaction, revokeSession } from './modules/session-keys/index.js'
import { assetsConfig, assetsHealth, cnftCollectionConfig, assetStrategy } from './modules/assets/index.js'
import { indexerLayerConfig, indexerHealth } from './modules/indexer/index.js'
import { l2LayerConfig, l2Health, l2Router } from './modules/l2/index.js'
import { analyticsLayerConfig, analyticsHealth } from './modules/analytics/index.js'
import { marketplaceLayerConfig, marketplaceHealth, marketplaceAggregator } from './modules/marketplace/index.js'
import { enginesLayerConfig, enginesHealth } from './modules/engines/index.js'
import { infraLayerConfig, infraHealth } from './modules/infra/index.js'
import { gameSignalsSetup, gameSignalsHealth } from './modules/analytics/game-signals.js'
import { paymentsLayerConfig, paymentsHealth } from './modules/payments/index.js'
import { aiAgentsLayerConfig, aiAgentsHealth } from './modules/ai/index.js'
import { crossChainLayerConfig, crossChainHealth } from './modules/cross-chain/index.js'
import { utilsLayerConfig, utilsHealth } from './modules/utils/index.js'
import { securityLayerConfig, securityHealth } from './modules/security/index.js'
import { storageLayerConfig, storageHealth } from './modules/storage/index.js'
import { buildEcosystemStatus } from './ecosystem/status.js'
import { computeEconomy, metricCatalog } from './economy/metrics.js'
import { demoConfig, demoEvents } from './economy/demo.js'
import { listArenaPrompts, readArenaPrompt } from './ecosystem/prompts.js'
import fs from 'node:fs'
import path from 'node:path'
import { monetizationLayerConfig, monetizationHealth } from './modules/monetization/index.js'
import { testingLayerConfig, testingHealth } from './modules/testing/index.js'
import { privacyLayerConfig, privacyHealth } from './modules/privacy/index.js'

let config
try {
  config = loadConfig(process.env)
} catch (error) {
  if (error instanceof ConfigError) {
    process.stderr.write(`watchtower: конфигурация отклонена — ${error.message}\n`)
    for (const detail of error.details || []) process.stderr.write(`  · ${detail}\n`)
    process.stderr.write('  · см. .env.example и docs/OPERATIONS.md\n')
    process.exit(1)
  }
  throw error
}

setLogLevel(config.logLevel)
configureAccess({ rateLimit: config.rateLimit, auditRingSize: config.auditRingSize })
// Без этого вызова лимиты retention/TTL/сумм оставались бы только в конфиге, но не в работе.
configureInbox({
  maxEvents: config.maxEvents,
  eventTtlHours: config.eventTtlHours,
  maxEventAmount: config.maxEventAmount,
  allowUnknownGames: config.allowUnknownGames,
})

const startedAt = Date.now()
const BOOT_PROBLEMS = []

// studio.config.json — каноничный конфиг OS v3 (totalComponents: 33, tenants, duplicates, layers)
function studioOSConfig() {
  return JSON.parse(readFileSync(new URL('../studio.config.json', import.meta.url), 'utf8'))
}

const SECURITY_HEADERS = Object.freeze({
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'geolocation=(), microphone=(), camera=()',
  'cross-origin-opener-policy': 'same-origin',
})

/** CSP: inline-стили нужны собранному Vite-бандлу, скрипты — только со своего источника. */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"

function corsHeaders(req) {
  const origin = req.headers.origin
  if (!origin) return {}
  if (config.allowedOrigins.includes('*')) return { 'access-control-allow-origin': '*' }
  if (config.allowedOrigins.includes(origin)) return { 'access-control-allow-origin': origin, vary: 'Origin' }
  return {}
}

export function securityHeadersFor(req, { html = false } = {}) {
  const headers = { ...SECURITY_HEADERS, ...corsHeaders(req) }
  if (html) headers['content-security-policy'] = CSP
  if (config.isProduction) headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains'
  return headers
}

function json(res, status, body, extraHeaders = {}) {
  if (res.headersSent) return res.end()
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...securityHeadersFor(res.req, { html: false }),
    ...extraHeaders,
  })
  res.end(payload)
}

class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message || code)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

/** Чтение тела с жёстким лимитом; JSON-ошибки — 400, превышение лимита — 413. */
async function readJson(req, preloaded) {
  const raw = preloaded !== undefined ? preloaded : await readRawBody(req)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'invalid_json', 'Тело запроса не является корректным JSON')
  }
}

async function readRawBody(req, maxBytes = config.maxBodyBytes) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) {
      throw new HttpError(413, 'request_body_too_large', `Тело запроса больше ${maxBytes} байт`)
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Тип маршрута определяет требования аутентификации. Неизвестный POST — всегда write. */
export function classifyRoute(method, pathname) {
  if (['/api/health', '/api/readyz', '/metrics'].includes(pathname)) return 'public'
  // Статика (собранный интерфейс) не содержит данных; данные отдаёт только /api/*.
  if (!pathname.startsWith('/api/')) return 'public'
  if (method === 'POST') return 'write'
  return 'read'
}

/** Единые параметры псевдонимизации: соль задаётся конфигурацией, иначе — только для dev. */
const piiOptions = Object.freeze({ salt: config.piiSalt || 'watchtower-unsalted-development' })

/** Защита от утечки: если в подготовленном ответе остался открытый идентификатор — данные не отдаём. */
function guardPii(payload, route) {
  if (!containsRawIdentifier(payload)) return true
  logger.error('pii_guard_tripped', { route, reason: 'raw_identifier_in_response' })
  return false
}

function resolveNow(url, { demo }) {
  if (!demo) return Date.now()
  const raw = url.searchParams.get('now')
  if (!raw) return Date.now()
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function resolveWindowDays(url, fallback = 7) {
  const value = Number(url.searchParams.get('windowDays') || fallback)
  return Number.isFinite(value) ? Math.min(365, Math.max(1, Math.floor(value))) : fallback
}

function requireDemo(url) {
  const demo = url.searchParams.get('demo') === '1'
  if (demo && !config.allowDemo) throw new HttpError(403, 'demo_disabled', 'Демо-данные отключены конфигурацией (WATCHTOWER_ALLOW_DEMO=0)')
  return demo
}

function economySource({ url, demo, now }) {
  if (!demo) {
    const events = windowEvents({ since: now - 365 * 86_400_000, until: now })
    return { events, source: 'event-inbox', warning: null, retention: { eventsRetained: inboxStatus(now).events, truncated: false } }
  }
  const events = demoEvents({ now })
  return { events, source: 'demo://economy-generator', warning: 'DEMO DATA: синтетический поток событий, не боевые данные студии', retention: { eventsRetained: events.length, truncated: false } }
}

const economyCache = new Map()

function economyPayload({ url, demo, now }) {
  const window = url.searchParams.get('window') || '7d'
  const gameId = url.searchParams.get('gameId') || undefined
  const { events: source, source: sourceName, warning, retention } = economySource({ url, demo, now })
  const events = gameId ? source.filter((event) => (event.payload?.gameId || event.app || event.source) === gameId) : source
  const cacheKey = `${window}|${gameId || '*'}|${demo}|${Math.floor(now / 1000)}`
  const cached = economyCache.get(cacheKey)
  if (cached) return cached
  const economy = computeEconomy({ events, window, now, config: demo ? demoConfig() : config.economy, demo, retention })
  const payload = { ...economy, warning, source: sourceName, demo }
  economyCache.set(cacheKey, payload)
  if (economyCache.size > 64) economyCache.clear()
  return payload
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname
  const method = req.method || 'GET'
  res.req = req

  if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(method)) {
    return json(res, 405, { error: 'method_not_allowed' }, { allow: 'GET, HEAD, POST, OPTIONS' })
  }
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      ...securityHeadersFor(req),
      'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type, x-watchtower-signature, x-watchtower-timestamp',
      'access-control-max-age': '600',
    })
    return res.end()
  }

  const kind = classifyRoute(method, pathname)
  const limit = checkRateLimit(req, config)
  if (!limit.allowed) {
    recordAudit(req, { status: limit.status, reason: limit.reason, path: sanitizePath(req.url), route: kind, ip: limit.ip }, { config, ip: limit.ip })
    return json(res, limit.status, { error: limit.reason }, { 'retry-after': String(limit.retryAfter) })
  }

  let rawBody = ''
  if (kind === 'write') rawBody = await readRawBody(req)
  const auth = authenticate(req, { kind, config, rawBody })
  if (!auth.ok) {
    recordAudit(req, { status: auth.status, reason: auth.reason, path: sanitizePath(req.url), route: kind, ip: limit.ip }, { config, ip: limit.ip })
    return json(res, auth.status, { error: auth.reason })
  }

  const respond = (status, body, extra) => json(res, status, body, extra)
  const body = () => readJson(req, rawBody)

  if (method === 'GET' && pathname === '/api/health') {
    const status = inboxStatus()
    return respond(200, {
      ok: true,
      service: 'watchtower-api',
      version: readVersion(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      mode: 'read-model',
      dataSource: 'event-inbox',
      writes: CAPABILITIES.blockchainWrites,
      capabilities: CAPABILITIES,
      provider: config.provider,
      inbox: { events: status.events, lastEventAt: status.lastEventAt, lastEventAgeSeconds: status.lastEventAgeSeconds, retention: { maxEvents: status.maxEvents, ttlHours: status.ttlHours } },
      bootProblems: BOOT_PROBLEMS,
    })
  }

  if (method === 'GET' && pathname === '/api/readyz') {
    const status = inboxStatus()
    const fresh = freshness({ maxAgeSeconds: config.readyMaxStaleSeconds })
    const checks = {
      api: { ok: true },
      storage: { ok: true, events: status.events, evicted: status.evictedByLimit + status.evictedByTtl },
      freshness: { ok: !fresh.stale, lastEventAt: fresh.lastEventAt, ageSeconds: fresh.ageSeconds, maxAgeSeconds: fresh.maxAgeSeconds, noDataYet: fresh.noDataYet },
      adapters: { ok: true, configured: adapterReadiness().configured, required: false },
      capacity: { ok: status.events < status.maxEvents, usage: status.maxEvents ? Number((status.events / status.maxEvents).toFixed(3)) : null },
    }
    const ready = Object.values(checks).every((check) => check.ok)
    return respond(ready ? 200 : 503, { ready, mode: 'read-model', dataSource: 'event-inbox', checks, writes: CAPABILITIES.blockchainWrites, reason: ready ? null : Object.entries(checks).filter(([, value]) => !value.ok).map(([key]) => key) })
  }

  if (method === 'GET' && pathname === '/api/config') {
    return respond(200, {
      service: 'watchtower-api',
      environment: config.nodeEnv,
      port: config.port,
      provider: config.provider,
      dataSource: 'event-inbox',
      writes: CAPABILITIES,
      security: {
        readTokenConfigured: Boolean(config.readToken),
        ingestTokenConfigured: Boolean(config.ingestToken),
        ingestHmacConfigured: Boolean(config.ingestSecret),
        trustProxy: config.trustProxy,
        allowedOrigins: config.allowedOrigins,
        rateLimitPerMinute: config.rateLimit,
        maxBodyBytes: config.maxBodyBytes,
        demoAllowed: config.allowDemo,
      },
      retention: { maxEvents: config.maxEvents, eventTtlHours: config.eventTtlHours },
      readiness: { maxEventAgeSeconds: config.readyMaxStaleSeconds },
      economyFactsConfigured: economyFacts(),
      envKeys: CONFIG_ENV_KEYS,
      warnings: config.warnings,
      generatedAt: new Date().toISOString(),
    })
  }

  /* ===================== Живая модель чтения ===================== */
  const now = Date.now()
  const windowDays = resolveWindowDays(url)

  if (method === 'GET' && pathname === '/api/overview') {
    return respond(200, { ...liveAggregates({ windowDays, now }), source: 'event-inbox', demo: false })
  }

  if (method === 'GET' && pathname === '/api/read-model') {
    const demo = url.searchParams.get('demo') === '1'
    if (demo && !config.allowDemo) throw new HttpError(403, 'demo_disabled', 'Демо-данные отключены конфигурацией (WATCHTOWER_ALLOW_DEMO=0)')
    const overview = demo ? demoModel({ windowDays, now }) : { ...liveAggregates({ windowDays, now }), source: 'event-inbox', demo: false }
    return respond(200, {
      overview,
      adjacent: adjacentAnalytics({ windowDays, now }),
      investor: investorReport({ windowDays, now }),
      funnel: buildFunnel({ limit: 5000 }),
      crossGame: crossGameSegments({ limit: 5000 }),
      campaigns: recommendations({ limit: 5000 }),
      traffic: trafficAnalytics({ events: list({ source: 'trafficgen', limit: 1000 }) }),
      investorTrend: await investorTrend({ limit: 30 }),
      ingestion: { ...inboxStatus(now), adapters: adapterReadiness() },
      controls: controlPolicy(),
      alerts: liveAlerts({ windowDays, now }),
      // Экономика считается тем же кодом, что и /api/economy/overview: два разных ответа на один вопрос запрещены.
      economy: economyPayload({ url, demo, now }),
      demo,
      source: demo ? 'demo://read-model' : 'event-inbox',
      generatedAt: new Date(now).toISOString(),
    })
  }

  if (method === 'GET' && pathname === '/api/ingestion/status') {
    return respond(200, { ...inboxStatus(now), freshness: freshness({ maxAgeSeconds: config.readyMaxStaleSeconds, now }), provider: config.provider, cursors: await allCursors(), reconciliation: reconciliationReport(list({ limit: 1000 })), rateLimit: rateLimitSnapshot() })
  }
  if (method === 'GET' && pathname === '/api/infra/solana') {
    // Раньше здесь возвращался health мок-провайдера (ok:true без единой проверки).
    if (!config.solanaRpcUrl) {
      return respond(200, { provider: 'native-rpc', configured: false, ok: false, code: 'RPC_NOT_CONFIGURED', reason: 'SOLANA_RPC_URL не задан: RPC-проверка не выполнялась', writes: false, checkedAt: new Date().toISOString() })
    }
    const health = await new NativeRpcProvider({ url: config.solanaRpcUrl }).health()
    return respond(health.ok ? 200 : 502, { ...health, configured: true, writes: false, checkedAt: new Date().toISOString() })
  }
  if (method === 'GET' && pathname === '/api/infra/trafficgen') return respond(200, await createTrafficgenProvider().health())
  if (method === 'GET' && pathname === '/api/analytics/traffic') return respond(200, trafficAnalytics({ events: list({ source: 'trafficgen', limit: 1000 }) }))
  if (method === 'GET' && pathname === '/api/ingestion/adapters') return respond(200, adapterReadiness())
  if (method === 'GET' && pathname === '/api/funnels') return respond(200, buildFunnel({ gameId: url.searchParams.get('gameId') || undefined, limit: Number(url.searchParams.get('limit') || 5000) }))
  if (method === 'GET' && pathname === '/api/players/cross-game') return respond(200, crossGameSegments({ limit: Number(url.searchParams.get('limit') || 5000) }))
  if (method === 'GET' && pathname === '/api/campaigns/recommendations') return respond(200, recommendations({ limit: Number(url.searchParams.get('limit') || 5000) }))
  if (method === 'GET' && pathname === '/api/campaigns/status') return respond(200, campaignStatus())
  if (method === 'POST' && pathname === '/api/campaigns/proposals') return respond(202, createCampaignProposal(await body()))
  if (method === 'GET' && pathname === '/api/investors/report') return respond(200, investorReport({ windowDays, now }))
  if (method === 'GET' && pathname === '/api/investors/snapshots') return respond(200, { snapshots: await listInvestorSnapshots({ limit: Number(url.searchParams.get('limit') || 30) }) })
  if (method === 'GET' && pathname === '/api/investors/trend') return respond(200, await investorTrend({ limit: Number(url.searchParams.get('limit') || 30) }))
  if (method === 'POST' && pathname === '/api/investors/snapshots') return respond(201, await createInvestorSnapshot(await body()))
  if (method === 'GET' && pathname === '/api/analytics/adjacent') return respond(200, adjacentAnalytics({ windowDays, now }))
  if (method === 'GET' && pathname === '/api/control/policy') return respond(200, controlPolicy())
  if (method === 'GET' && pathname === '/api/control/requests') return respond(200, { requests: listControlRequests() })
  if (method === 'POST' && pathname === '/api/control/requests') return respond(202, createControlRequest(await body()))
  if (method === 'GET' && pathname === '/metrics') {
    if (res.headersSent) return res.end()
    res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8', 'cache-control': 'no-store', ...securityHeadersFor(req) })
    return res.end(prometheusMetrics({ config, startedAt, now }))
  }
  if (method === 'GET' && pathname === '/api/audit') return respond(200, { entries: auditLog(), note: 'IP хранится как хеш, query-параметры замаскированы' })
  const parts = pathname.split('/').filter(Boolean)
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2] && parts[3] === 'ingestion') {
    const adapter = getGameAdapter(parts[2])
    return adapter ? respond(200, adapter) : respond(404, { error: 'game_not_found' })
  }
  if (method === 'GET' && pathname === '/api/events') {
    // Наружу идентификаторы игроков уходят только псевдонимами (F-011).
    const events = list({ programId: url.searchParams.get('programId') || undefined, commitment: url.searchParams.get('commitment') || undefined, source: url.searchParams.get('source') || undefined, gameId: url.searchParams.get('gameId') || undefined, limit: Number(url.searchParams.get('limit') || 100) }).map((event) => anonymizeEvent(event, piiOptions))
    if (!guardPii(events, '/api/events')) return respond(500, { error: 'pii_guard_tripped', hint: 'событие содержит идентификатор игрока в открытом виде — запрос заблокирован' })
    return respond(200, { events, privacy: 'anonymized-player-keys', source: 'event-inbox' })
  }
  if (method === 'POST' && pathname === '/api/ingest/solana') {
    const input = await body()
    const source = config.provider === 'http-ingest' ? 'http-ingest' : config.provider
    if (Array.isArray(input)) {
      const result = ingestBatch(input, source)
      return respond(202, { accepted: result.accepted, duplicates: result.duplicates, rejected: result.rejected, total: input.length, events: result.results.map((row) => ({ accepted: row.accepted, duplicate: Boolean(row.duplicate), errors: row.errors || null, eventId: row.event?.eventId })) })
    }
    const result = ingest(input, source)
    const gameId = input.gameId || input.payload?.gameId
    return respond(result.accepted ? 202 : result.duplicate ? 200 : 422, { ...result, decoder: gameId ? decodeGameEvent(gameId, input) : null })
  }
  if (method === 'POST' && pathname === '/api/ingest/trafficgen') {
    const input = await body()
    if (Array.isArray(input)) {
      const result = ingestBatch(input.map((item) => ({ ...item, chain: item.chain || 'offchain', app: item.app || 'trafficgen' })), 'trafficgen')
      return respond(202, { accepted: result.accepted, duplicates: result.duplicates, rejected: result.rejected, total: input.length })
    }
    const result = ingest({ ...input, chain: input.chain || 'offchain', app: input.app || 'trafficgen' }, 'trafficgen')
    return respond(result.accepted ? 202 : result.duplicate ? 200 : 422, { ...result, decoder: decodeGameEvent('trafficgen', result.event || input) })
  }
  if (method === 'GET' && pathname === '/api/pii/policy') return respond(200, piiPolicy(piiOptions))
  if (method === 'GET' && pathname === '/api/pii/player') {
    const identifier = url.searchParams.get('identifier')
    if (!identifier) return respond(400, { error: 'identifier_required' })
    // Отвечаем сводкой по псевдониму: исходный идентификатор не сохраняется в ответе и в логах.
    return respond(200, playerSummary(list({ limit: 100000 }), identifier, piiOptions))
  }
  if (method === 'POST' && pathname === '/api/pii/erasure') {
    const input = await body()
    if (input?.confirm !== 'erase-player') return respond(400, { error: 'confirmation_required', hint: "передайте { identifier, confirm: 'erase-player' }" })
    if (!input?.identifier) return respond(400, { error: 'identifier_required' })
    const report = erasePlayer(input.identifier, piiOptions)
    recordAudit(req, { status: report.ok ? 200 : 400, reason: report.ok ? 'pii_erasure' : report.reason, path: '/api/pii/erasure', route: 'write', ip: limit.ip, bytesOut: 0 })
    return respond(report.ok ? 200 : 400, { ...report, policy: 'идентификатор игрока удалён из inbox; исходные события не восстанавливаются' })
  }
  if (method === 'GET' && pathname === '/api/games') return respond(200, { games: liveAggregates({ windowDays, now }).games, source: 'event-inbox' })
  if (method === 'GET' && pathname === '/api/alerts') return respond(200, { alerts: liveAlerts({ windowDays, now }), source: 'event-inbox', generatedAt: new Date(now).toISOString() })
  if (method === 'GET' && pathname === '/api/ai/report') return respond(200, liveAiReport({ windowDays, now }))
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2] && parts[3] === 'forecast') {
    if (!getGame(parts[2])) return respond(404, { error: 'game_not_found' })
    return respond(200, { game: parts[2], status: 'unavailable', reason: 'Прогноз требует исторических серий; хаб хранит только события окна (см. /api/economy/overview)', points: [], source: 'event-inbox' })
  }
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2]) {
    const game = getGame(parts[2])
    if (!game) return respond(404, { error: 'game_not_found' })
    const row = liveAggregates({ windowDays, now }).games.find((item) => item.id === game.id)
    return respond(200, { game, ...row, source: 'event-inbox' })
  }

  /* ====== OS v3 Routes — 33 компонента, 19 слоёв ====== */
  if (method === 'GET' && pathname === '/api/os/config') {
    const studio = studioOSConfig()
    const osConfig = watchtowerOSConfig(process.env)
    const mergedLayers = {}
    for (const key of new Set([...Object.keys(studio.layers || {}), ...Object.keys(osConfig.layers || {})])) {
      mergedLayers[key] = { ...(studio.layers || {})[key], ...(osConfig.layers || {})[key] }
    }
    return respond(200, { ...studio, ...osConfig, layers: mergedLayers, v2Products: { ...osConfig.v2Products, count: studio.v2Products }, modules: Object.keys(mergedLayers), totalComponents: studio.totalComponents ?? osConfig.totalComponents ?? 33, generatedAt: new Date().toISOString() })
  }
  if (method === 'GET' && pathname === '/api/os/health') return respond(200, watchtowerOSHealth(process.env))
  if (method === 'GET' && pathname === '/api/os/modules') { const layers = Object.keys(watchtowerOSConfig(process.env).layers || {}); return respond(200, { os: 'server/modules/os.js', modules: layers, count: layers.length, totalComponents: studioOSConfig().totalComponents ?? 33 }) }

  // Identity
  if (method === 'GET' && pathname === '/api/identity/config') return respond(200, identityLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/identity/health') return respond(200, identityHealth(process.env))
  if (method === 'GET' && pathname === '/api/identity/wallet') return respond(200, createUnifiedWallet({ provider: url.searchParams.get('provider') || undefined, gameId: url.searchParams.get('gameId') || undefined, authMethod: url.searchParams.get('authMethod') || undefined }))
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'identity' && parts[2] === 'tenant' && parts[3])
    return respond(200, tenantIdentity({ gameId: parts[3], walletAddress: url.searchParams.get('wallet') || undefined }))

  // Session Keys
  if (method === 'GET' && pathname === '/api/session-keys/config') return respond(200, sessionKeysConfig())
  if (method === 'GET' && pathname === '/api/session-keys/health') return respond(200, sessionKeysHealth(process.env))
  if (method === 'GET' && pathname === '/api/session-keys/list') return respond(200, { sessions: listSessions({ gameId: url.searchParams.get('gameId') || undefined }), simulated: true })
  if (method === 'POST' && pathname === '/api/session-keys/create') {
    const body = await body()
    return respond(201, createSession({ targetProgramPublicKey: body.targetProgramPublicKey, topUpLamports: body.topUpLamports, expiryInMinutes: body.expiryInMinutes, walletAddress: body.walletAddress, gameId: body.gameId }))
  }
  if (method === 'POST' && pathname === '/api/session-keys/sign') {
    const body = await body()
    return respond(200, signAndSendTransaction({ sessionToken: body.sessionToken, transaction: body.transaction, targetProgram: body.targetProgram }))
  }
  if (method === 'POST' && pathname === '/api/session-keys/revoke') {
    const body = await body()
    return respond(200, revokeSession(body.sessionToken, { reason: body.reason }))
  }
  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'session-keys' && parts[2] && parts[2] !== 'create' && parts[2] !== 'list' && parts[2] !== 'sign' && parts[2] !== 'revoke')
    return respond(200, getSession(parts[2]) || { error: 'session_not_found' })

  // Assets
  if (method === 'GET' && pathname === '/api/assets/config') return respond(200, assetsConfig(process.env))
  if (method === 'GET' && pathname === '/api/assets/health') return respond(200, assetsHealth(process.env))
  if (method === 'GET' && pathname === '/api/assets/strategy') return respond(200, assetStrategy({ gameId: url.searchParams.get('gameId') || 'generic', itemType: url.searchParams.get('itemType'), rarity: url.searchParams.get('rarity') }))
  if (method === 'GET' && pathname === '/api/assets/cnft/collection') return respond(200, cnftCollectionConfig({ collectionName: url.searchParams.get('collection') || undefined, gameId: url.searchParams.get('gameId') || undefined }))

  // Indexer
  if (method === 'GET' && pathname === '/api/indexer/config') return respond(200, indexerLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/indexer/health') return respond(200, indexerHealth(process.env))

  // L2
  if (method === 'GET' && pathname === '/api/l2/config') return respond(200, l2LayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/l2/health') return respond(200, l2Health(process.env))
  if (method === 'GET' && pathname === '/api/l2/router') return respond(200, l2Router({ gameId: url.searchParams.get('gameId') || 'generic', tpsRequirement: url.searchParams.get('tps') || 'low', uxRequirement: url.searchParams.get('ux') || 'gasless' }))

  // Analytics
  if (method === 'GET' && pathname === '/api/analytics/config') return respond(200, analyticsLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/analytics/health') return respond(200, analyticsHealth(process.env))

  // Marketplace
  if (method === 'GET' && pathname === '/api/marketplace/config') return respond(200, marketplaceLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/marketplace/health') return respond(200, marketplaceHealth(process.env))
  if (method === 'GET' && pathname === '/api/marketplace/router') return respond(200, marketplaceAggregator({ gameId: url.searchParams.get('gameId') || 'generic', assetType: url.searchParams.get('assetType') || 'cnft' }))

  // Engines
  if (method === 'GET' && pathname === '/api/engines/config') return respond(200, enginesLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/engines/health') return respond(200, enginesHealth(process.env))

  // Infra
  if (method === 'GET' && pathname === '/api/infra/config') return respond(200, infraLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/infra/health') return respond(200, infraHealth(process.env))
  if (method === 'GET' && pathname === '/api/infra/arc') return respond(200, { framework: 'ARC Entity-Component', interoperability: true, crossGame: true, configured: false, note: 'Описание стандарта; код интеграции не установлен' })
  if (method === 'GET' && pathname === '/api/infra/bolt') return respond(200, { framework: 'Bolt FOCG', verifiable: true, onChain: true, configured: false, note: 'Описание фреймворка; код интеграции не установлен' })
  if (method === 'GET' && pathname === '/api/infra/depin') return respond(200, { framework: 'DePIN Beamable', workers: true, escrow: true, staking: true, configured: false, note: 'Описание концепта; код интеграции не установлен' })
  if (method === 'GET' && pathname === '/api/infra/arcium') return respond(200, { framework: 'Arcium Rollups', confidential: true, privacy: true, configured: false })
  if (method === 'GET' && pathname === '/api/infra/xandeum') return respond(200, { framework: 'Xandeum Storage', scalable: 'exabytes', decentralized: true, configured: false })
  if (method === 'GET' && pathname === '/api/infra/pst') return respond(200, { framework: 'Private State Toolkit', private: true, verifiable: true, configured: false })
  if (method === 'GET' && pathname === '/api/infra/core-attributes') return respond(200, { framework: 'Core Attributes Plugin', onChainKeyValue: true, dashIndexable: true, configured: false })

  // SDK routes — это описания доступных SDK, а не подтверждение установки
  const sdkRoutes = {
    '/api/sdk/unity': { sdk: 'Solana.Unity-SDK', features: ['NFT', 'RPC', 'CandyMachine', 'Phantom', 'MWA', 'SessionKeys'] },
    '/api/sdk/godot': { sdk: 'godot-solana-sdk GDExtension', features: ['SolanaClient', 'WalletAdapter', 'AnchorProgram'] },
    '/api/sdk/godot-solana': { sdk: 'Godot Solana SDK detailed', nodes: ['SolanaClient', 'WalletAdapter', 'AnchorProgram', 'SPLToken', 'CandyMachine'] },
    '/api/sdk/gamba': { sdk: 'Gamba monorepo', components: ['core', 'reactHooks', 'uiFramework'], provablyFair: true },
    '/api/sdk/preset': { sdk: 'solana-game-preset', source: 'official Solana Foundation scaffold' },
    '/api/sdk/ritarena': { sdk: 'ritarena-sdk', features: ['lifecycle', 'retry', 'events'] },
    '/api/sdk/relayzero': { sdk: 'relayzero', type: 'agent economy network' },
    '/api/sdk/stealthsdk': { sdk: 'StealthSDK', token: 'STEALTH' },
    '/api/sdk/xandeum': { sdk: '@xandeum/sdk', scalable: 'exabytes' },
    '/api/sdk/pst': { sdk: '@private-state-toolkit/sdk', private: true, verifiable: true },
    '/api/sdk/core-attributes': { sdk: '@metaplex-foundation/mpl-core', onChainKeyValue: true, dashIndexable: true },
    '/api/sdk/access-protocol': { sdk: '@access-protocol/sdk', stakeToAccess: true },
    '/api/sdk/idosgames-wallet': { sdk: '@idosgames/wallet', bridge: 'EVM Solana RewardPool' },
    '/api/sdk/security-auditing-skill': { skill: 'solana-security-auditing-skill', systematicAudit: true },
    '/api/sdk/sentio-cli': { cli: 'sentio-cli', astScanner: true },
    '/api/sdk/solguard': { cli: 'solguard', patterns: 130 },
    '/api/sdk/solana-slam': { framework: 'Solana SLAM', stack: ['Solana', 'LiteSVM', 'Anchor', 'Mocha'] },
    '/api/sdk/arcium': { sdk: '@arcium/sdk', confidential: true, rollups: true },
  }
  if (method === 'GET' && sdkRoutes[pathname]) return respond(200, { ...sdkRoutes[pathname], configured: false, gameId: url.searchParams.get('gameId') || null })

  // Game Signals
  if (method === 'GET' && pathname === '/api/game-signals/config') return respond(200, { config: gameSignalsSetup({ gameId: url.searchParams.get('gameId') || 'generic' }), health: gameSignalsHealth(process.env) })
  if (method === 'GET' && pathname === '/api/game-signals/health') return respond(200, gameSignalsHealth(process.env))

  // Payments
  if (method === 'GET' && pathname === '/api/payments/config') return respond(200, paymentsLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/payments/health') return respond(200, paymentsHealth(process.env))
  if (method === 'GET' && pathname === '/api/payments/rust-api') return respond(200, { api: 'Solana Game API Rust Actix', endpoints: ['create', 'join', 'calculate', 'withdraw'], configured: false, note: 'Внешний сервис, хаб его не запускает' })

  // AI Agents
  if (method === 'GET' && pathname === '/api/ai/config') return respond(200, aiAgentsLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/ai/health') return respond(200, aiAgentsHealth(process.env))
  const aiRoutes = {
    '/api/ai/husks': { sdk: 'Husks SDK', features: ['autobattler', 'INT8', 'proceduralPixel', 'autoPvP'] },
    '/api/ai/ritarena': { sdk: 'RitArena SDK', features: ['arena', 'lifecycle', 'retry', 'events'] },
    '/api/ai/relayzero': { sdk: 'relayzero', type: 'agent economy network' },
    '/api/ai/stealthsdk': { sdk: 'StealthSDK', token: 'STEALTH' },
  }
  if (method === 'GET' && aiRoutes[pathname]) return respond(200, { ...aiRoutes[pathname], configured: false, gameId: url.searchParams.get('gameId') || null })
  if (method === 'GET' && pathname === '/api/ai/aureus') return respond(410, { sdk: 'Aureus Arena SDK', deprecated: true, replacedBy: 'RitArena', note: 'Использовать RitArena' })

  // Cross-Chain
  if (method === 'GET' && pathname === '/api/cross-chain/config') return respond(200, crossChainLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/cross-chain/health') return respond(200, crossChainHealth(process.env))
  if (method === 'GET' && pathname === '/api/cross-chain/race') return respond(200, { protocol: 'RACE Protocol', multichain: true, sdk: 'sdk-solana', configured: false, gameId: url.searchParams.get('gameId') || null })

  // Utils
  if (method === 'GET' && pathname === '/api/utils/config') return respond(200, utilsLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/utils/health') return respond(200, utilsHealth(process.env))
  if (method === 'GET' && pathname === '/api/utils/claude-skill') return respond(200, { skill: 'Claude Skill', patterns: ['Unity SDK', 'MWA', 'stateArchitecture', 'testing'], configured: true })

  // Security
  if (method === 'GET' && pathname === '/api/security/config') return respond(200, securityLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/security/health') return respond(200, securityHealth(process.env))
  if (method === 'GET' && pathname === '/api/security/auditing-skill') return respond(200, { skill: 'solana-security-auditing-skill', configured: false })
  if (method === 'GET' && pathname === '/api/security/sentio-cli') return respond(200, { cli: 'sentio-cli', configured: false })
  if (method === 'GET' && pathname === '/api/security/solguard') return respond(200, { cli: 'solguard', patterns: 130, configured: false })

  // Storage
  if (method === 'GET' && pathname === '/api/storage/config') return respond(200, storageLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/storage/health') return respond(200, storageHealth(process.env))
  if (method === 'GET' && pathname === '/api/storage/xandeum') return respond(200, { storage: 'Xandeum', scalable: 'exabytes', configured: false })
  if (method === 'GET' && pathname === '/api/storage/pst') return respond(200, { storage: 'Private State Toolkit', private: true, verifiable: true, configured: false })
  if (method === 'GET' && pathname === '/api/storage/core-attributes') return respond(200, { storage: 'Core Attributes Plugin', onChainKeyValue: true, configured: false })

  // Monetization
  if (method === 'GET' && pathname === '/api/monetization/config') return respond(200, monetizationLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/monetization/health') return respond(200, monetizationHealth(process.env))
  if (method === 'GET' && pathname === '/api/monetization/access-protocol') return respond(200, { protocol: 'Access Protocol', stakeToAccess: true, configured: false })
  if (method === 'GET' && pathname === '/api/monetization/idosgames-wallet') return respond(200, { sdk: '@idosgames/wallet', bridge: 'EVM Solana RewardPool', configured: false })

  // Testing
  if (method === 'GET' && pathname === '/api/testing/config') return respond(200, testingLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/testing/health') return respond(200, testingHealth(process.env))
  if (method === 'GET' && pathname === '/api/testing/solana-slam') return respond(200, { framework: 'Solana SLAM', stack: ['Solana', 'LiteSVM', 'Anchor', 'Mocha'], configured: false })
  if (method === 'GET' && pathname === '/api/testing/create-solana-game') return respond(410, { template: 'create-solana-game', deprecated: true, replacedBy: 'solana-game-preset' })

  // Privacy
  if (method === 'GET' && pathname === '/api/privacy/config') return respond(200, privacyLayerConfig(process.env))
  if (method === 'GET' && pathname === '/api/privacy/health') return respond(200, privacyHealth(process.env))
  if (method === 'GET' && pathname === '/api/privacy/arcium') return respond(200, { rollups: 'Arcium Rollups', confidential: true, privacy: true, configured: false })

  // Cross-game projection
  if (method === 'GET' && pathname === '/api/cross-game/projection') return respond(200, buildCrossGameProjection({ limit: Number(url.searchParams.get('limit') || 5000) }))

  // Ecosystem — статус зрелости всех tenant'ов (L0..L4) и покрытие цели
  if (method === 'GET' && pathname === '/api/ecosystem/status') {
    return respond(200, buildEcosystemStatus({ adapters: adapterReadiness().adapters, registry: GAME_REGISTRY, env: process.env }))
  }
  if (method === 'GET' && pathname === '/api/ecosystem/report') {
    const status = buildEcosystemStatus({ adapters: adapterReadiness().adapters, registry: GAME_REGISTRY, env: process.env })
    return respond(200, {
      generatedAt: status.generatedAt,
      writes: false,
      source: '/api/ecosystem/status',
      connectedTenants: status.tenants.filter((t) => t.configured).map((t) => t.gameId),
      notConnectedTenants: status.tenants.filter((t) => !t.configured).map((t) => ({ gameId: t.gameId, reason: t.reason })),
      coverage: status.coverage,
      findingsTotal: status.findingsTotal,
      dataQuality: status.coverage.configured === status.coverage.tenants ? 'complete' : status.coverage.configured === 0 ? 'unavailable' : 'partial',
      note: 'Отчёт читается напрямую из состояния адаптеров и файлов аудита; mock-данные не подмешиваются.',
    })
  }

  // Экономика: метрики студии по окну наблюдения. demo=1 включает явно помеченные демо-данные.
  if (method === 'GET' && pathname === '/api/economy/catalog') {
    const acceptedEvents = [...new Set(adapterReadiness().adapters.flatMap((a) => a.eventTypes || []))]
    return respond(200, { writes: false, ...metricCatalog({ acceptedEvents }) })
  }
  if (method === 'GET' && pathname === '/api/economy/overview') {
    const demo = requireDemo(url)
    return respond(200, { writes: false, ...economyPayload({ url, demo, now: resolveNow(url, { demo }) }) })
  }
  if (method === 'GET' && pathname === '/api/economy/health') {
    const demo = requireDemo(url)
    const payload = economyPayload({ url, demo, now: resolveNow(url, { demo }) })
    return respond(200, { writes: false, demo, index: payload.index, inputs: payload.inputs, source: payload.source, generatedAt: payload.generatedAt })
  }

  // Arena-промпты: каталог и текст (для кнопки «Приступить» в интерфейсе)
  if (method === 'GET' && pathname === '/api/arena/prompts') return respond(200, listArenaPrompts())
  if (method === 'GET' && pathname.startsWith('/api/arena/prompts/')) {
    const id = decodeURIComponent(pathname.slice('/api/arena/prompts/'.length))
    const prompt = readArenaPrompt(id)
    if (!prompt) return respond(404, { error: 'prompt_not_found', id })
    return respond(200, { writes: false, ...prompt })
  }

  if (!pathname.startsWith('/api/') && method !== 'POST' && config.serveStatic) {
    const served = serveStatic(req, res, url)
    if (served) return undefined
  }

  return respond(404, { error: 'not_found' })
}

// Раздача собранного фронтенда (dist) тем же портом: удобно для деплоя одним сервисом.
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const distDir = config.staticDir
  if (!fs.existsSync(distDir)) return false
  const clean = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(distDir, clean)
  if (!filePath.startsWith(distDir)) return false
  let isFile = false
  try { isFile = fs.statSync(filePath).isFile() } catch { isFile = false }
  if (!isFile) {
    const fallback = url.pathname === '/' || url.pathname === '/index.html'
      ? (fs.existsSync(path.join(distDir, 'ios.html')) ? 'ios.html' : 'index.html')
      : null
    if (!fallback) return false
    filePath = path.join(distDir, fallback)
    if (!fs.existsSync(filePath)) return false
  }
  const ext = path.extname(filePath).toLowerCase()
  const body = fs.readFileSync(filePath)
  if (res.headersSent) return true
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'content-length': body.length,
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    ...securityHeadersFor(req, { html: ext === '.html' }),
  })
  res.end(req.method === 'HEAD' ? undefined : body)
  return true
}

function readVersion() {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  } catch {
    return 'unknown'
  }
}

function economyFacts() {
  const facts = config.economy
  const present = (value) => value !== undefined && value !== '' && Number.isFinite(Number(value))
  return {
    circulating: present(facts.circulating),
    maxSupply: present(facts.maxSupply),
    treasuryBalance: present(facts.treasuryBalance),
    revenueUsd: present(facts.revenueUsd),
    liquidityUsd: present(facts.liquidityUsd),
  }
}

export const app = http.createServer({ maxHeaderSize: 16 * 1024, requestTimeout: 30_000 }, (req, res) => {
  const startedRequest = Date.now()
  res.on('finish', () => {
    const durMs = Date.now() - startedRequest
    observeRequest({ status: res.statusCode, durMs })
    recordAudit(req, { status: res.statusCode, path: sanitizePath(req.url), durMs, bytesOut: Number(res.getHeader('content-length') || 0) }, { config })
  })
  Promise.resolve()
    .then(() => route(req, res))
    .catch((error) => {
      if (res.headersSent) {
        logger.error('response_already_sent', { path: sanitizePath(req.url), message: error?.message })
        return res.end()
      }
      if (error instanceof HttpError) return json(res, error.status, { error: error.code, message: error.message, ...error.extra })
      logger.error('unhandled_route_error', { path: sanitizePath(req.url), message: error?.message, stack: error?.stack?.split('\n').slice(0, 3).join(' | ') })
      return json(res, 500, { error: 'internal_error' })
    })
})

app.headersTimeout = 15_000
app.keepAliveTimeout = 5_000
app.maxRequestsPerSocket = 1000

const sockets = new Set()
app.on('connection', (socket) => {
  sockets.add(socket)
  socket.on('close', () => sockets.delete(socket))
})

let shuttingDown = false
export function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) return
  shuttingDown = true
  logger.info('shutdown_started', { signal, inFlight: sockets.size })
  const forced = setTimeout(() => {
    logger.warn('shutdown_forced', { openSockets: sockets.size })
    for (const socket of sockets) socket.destroy()
    process.exit(1)
  }, config.shutdownTimeoutMs)
  forced.unref()
  app.close(() => {
    logger.info('shutdown_complete', { signal })
    process.exit(0)
  })
  app.closeIdleConnections?.()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { message: error?.message, stack: error?.stack?.split('\n').slice(0, 5).join(' | ') })
  shutdown('uncaughtException')
})
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { message: reason?.message || String(reason) })
})

if (process.env.WATCHTOWER_NO_LISTEN !== '1') {
  app.listen(config.port, '0.0.0.0', () => {
    logger.info('server_listening', {
      url: `http://0.0.0.0:${config.port}`,
      env: config.nodeEnv,
      readTokenConfigured: Boolean(config.readToken),
      ingestTokenConfigured: Boolean(config.ingestToken),
      ingestHmacConfigured: Boolean(config.ingestSecret),
      trustProxy: config.trustProxy,
      demoAllowed: config.allowDemo,
      retention: { maxEvents: config.maxEvents, ttlHours: config.eventTtlHours },
    })
    for (const warning of config.warnings) logger.warn('config_warning', { warning })
    if (BOOT_PROBLEMS.length) logger.warn('boot_problems', { problems: BOOT_PROBLEMS })
  })
}

import http from 'node:http'
import { aggregateOverview, buildAiReport, detectAnomalies, forecast } from '../src/engine/analytics.js'
import { GAME_REGISTRY, getGame } from '../src/data/registry.js'
import { createProvider, MockProvider } from './ingestion/provider.js'
import { allCursors } from './ingestion/cursor-store.js'
import { ingest, inboxStatus, list } from './ingestion/event-inbox.js'
import { reconciliationReport } from './ingestion/reconciliation.js'
import { adapterReadiness, decodeGameEvent, getGameAdapter } from './ingestion/game-adapters.js'
import { buildFunnel, crossGameSegments } from './ingestion/player-projections.js'
import { campaignStatus, createCampaignProposal, recommendations } from './ingestion/campaigns.js'
import { investorReport } from './analytics/investor-report.js'
import { createInvestorSnapshot, investorTrend, listInvestorSnapshots } from './analytics/snapshots.js'
import { controlPolicy, createControlRequest, listControlRequests } from './operations/control-requests.js'
import { prometheusMetrics } from './ops/metrics.js'
import { adjacentAnalytics } from './analytics/adjacent.js'
import { auditLog, checkAccess, recordAudit } from './security/access.js'

const port = Number(process.env.API_PORT || 8787)
const startedAt = Date.now()

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY' })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  let body = ''
  for await (const chunk of req) { body += chunk; if (body.length > 64 * 1024) throw new Error('request_body_too_large') }
  return body ? JSON.parse(body) : {}
}

async function route(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }); return res.end() }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const publicRoute = ['/api/health', '/api/readyz', '/metrics'].includes(url.pathname)
  const access = checkAccess(req, { publicRoute })
  if (!access.allowed) { recordAudit(req, { status: access.status, reason: access.reason }); return json(res, access.status, { error: access.reason }) }
  recordAudit(req, { status: 200 })
  const parts = url.pathname.split('/').filter(Boolean)
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'watchtower-api', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), mode: 'mock-read-model', writes: false, provider: process.env.WATCHTOWER_PROVIDER || 'mock' })
  if (req.method === 'GET' && url.pathname === '/api/readyz') { const adapters = adapterReadiness(); return json(res, adapters.configured ? 200 : 200, { ready: true, mode: process.env.WATCHTOWER_PROVIDER || 'mock', adaptersConfigured: adapters.configured, writes: false, reason: adapters.configured ? 'provider configuration detected' : 'offline mode is explicitly allowed' }) }
  if (req.method === 'GET' && url.pathname === '/api/overview') return json(res, 200, { ...aggregateOverview(), generatedAt: new Date().toISOString() })
  if (req.method === 'GET' && url.pathname === '/api/read-model') return json(res, 200, { overview: aggregateOverview(), adjacent: adjacentAnalytics(), investor: investorReport(), funnel: buildFunnel({ limit: 5000 }), crossGame: crossGameSegments({ limit: 5000 }), campaigns: recommendations({ limit: 5000 }), investorTrend: await investorTrend({ limit: 30 }), ingestion: { ...inboxStatus(), adapters: adapterReadiness() }, controls: controlPolicy(), generatedAt: new Date().toISOString() })
  if (req.method === 'GET' && url.pathname === '/api/ingestion/status') return json(res, 200, { ...inboxStatus(), provider: process.env.WATCHTOWER_PROVIDER || 'mock', cursors: await allCursors(), reconciliation: reconciliationReport(list({ limit: 1000 })) })
  if (req.method === 'GET' && url.pathname === '/api/infra/solana') return json(res, 200, await createProvider().health())
  if (req.method === 'GET' && url.pathname === '/api/ingestion/adapters') return json(res, 200, adapterReadiness())
  if (req.method === 'GET' && url.pathname === '/api/funnels') return json(res, 200, buildFunnel({ gameId: url.searchParams.get('gameId') || undefined, limit: Number(url.searchParams.get('limit') || 5000) }))
  if (req.method === 'GET' && url.pathname === '/api/players/cross-game') return json(res, 200, crossGameSegments({ limit: Number(url.searchParams.get('limit') || 5000) }))
  if (req.method === 'GET' && url.pathname === '/api/campaigns/recommendations') return json(res, 200, recommendations({ limit: Number(url.searchParams.get('limit') || 5000) }))
  if (req.method === 'GET' && url.pathname === '/api/campaigns/status') return json(res, 200, campaignStatus())
  if (req.method === 'POST' && url.pathname === '/api/campaigns/proposals') return json(res, 202, createCampaignProposal(await readJson(req)))
  if (req.method === 'GET' && url.pathname === '/api/investors/report') return json(res, 200, investorReport())
  if (req.method === 'GET' && url.pathname === '/api/investors/snapshots') return json(res, 200, { snapshots: await listInvestorSnapshots({ limit: Number(url.searchParams.get('limit') || 30) }) })
  if (req.method === 'GET' && url.pathname === '/api/investors/trend') return json(res, 200, await investorTrend({ limit: Number(url.searchParams.get('limit') || 30) }))
  if (req.method === 'POST' && url.pathname === '/api/investors/snapshots') return json(res, 201, await createInvestorSnapshot(await readJson(req)))
  if (req.method === 'GET' && url.pathname === '/api/analytics/adjacent') return json(res, 200, adjacentAnalytics())
  if (req.method === 'GET' && url.pathname === '/api/control/policy') return json(res, 200, controlPolicy())
  if (req.method === 'GET' && url.pathname === '/api/control/requests') return json(res, 200, { requests: listControlRequests() })
  if (req.method === 'POST' && url.pathname === '/api/control/requests') return json(res, 202, createControlRequest(await readJson(req)))
  if (req.method === 'GET' && url.pathname === '/metrics') { res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' }); return res.end(prometheusMetrics()) }
  if (req.method === 'GET' && url.pathname === '/api/audit') return json(res, 200, { entries: auditLog() })
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2] && parts[3] === 'ingestion') {
    const adapter = getGameAdapter(parts[2])
    return adapter ? json(res, 200, adapter) : json(res, 404, { error: 'game_not_found' })
  }
  if (req.method === 'GET' && url.pathname === '/api/events') return json(res, 200, { events: list({ programId: url.searchParams.get('programId') || undefined, commitment: url.searchParams.get('commitment') || undefined, limit: Number(url.searchParams.get('limit') || 100) }) })
  if (req.method === 'POST' && url.pathname === '/api/ingest/solana') {
    const input = await readJson(req)
    const result = ingest(input, process.env.WATCHTOWER_PROVIDER || 'mock')
    const gameId = input.gameId || input.payload?.gameId
    return json(res, 202, { ...result, decoder: gameId ? decodeGameEvent(gameId, input) : null })
  }
  if (req.method === 'GET' && url.pathname === '/api/games') return json(res, 200, { games: aggregateOverview().games })
  if (req.method === 'GET' && url.pathname === '/api/alerts') return json(res, 200, { alerts: detectAnomalies() })
  if (req.method === 'GET' && url.pathname === '/api/ai/report') return json(res, 200, buildAiReport())
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2] && parts[3] === 'forecast') {
    if (!getGame(parts[2])) return json(res, 404, { error: 'game_not_found' })
    return json(res, 200, { game: parts[2], ...forecast(parts[2], Number(url.searchParams.get('days') || 7)) })
  }
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2]) {
    const game = getGame(parts[2])
    if (!game) return json(res, 404, { error: 'game_not_found' })
    return json(res, 200, { game, ...aggregateOverview().games.find((row) => row.id === game.id) })
  }
  return json(res, 404, { error: 'not_found' })
}

http.createServer((req, res) => {
  Promise.resolve(route(req, res)).catch((error) => json(res, 500, { error: 'internal_error', message: error.message }))
}).listen(port, '0.0.0.0', () => console.log(`Watchtower API listening on http://0.0.0.0:${port}`))

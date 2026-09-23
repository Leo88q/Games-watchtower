const base = process.env.WATCHTOWER_API_URL || 'http://127.0.0.1:8787'
const token = process.env.WATCHTOWER_READ_TOKEN
const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  const text = await response.text()
  let body; try { body = JSON.parse(text) } catch { body = text }
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${text}`)
  return body
}

const health = await request('/api/health')
if (!health.ok || health.writes !== false) throw new Error('health contract failed')
await request('/api/readyz')
const readModel = await request('/api/read-model')
for (const key of ['overview', 'adjacent', 'investor', 'funnel', 'crossGame', 'campaigns', 'traffic', 'ingestion', 'controls']) if (!(key in readModel)) throw new Error(`read-model missing ${key}`)
const signature = `smoke-${Date.now()}`
const event = { cluster: 'devnet', slot: 1, signature, programId: 'smoke-program', eventType: 'PlayerJoined', payload: { gameId: 'ares1', playerKey: 'smoke-player' } }
const accepted = await request('/api/ingest/solana', { method: 'POST', body: JSON.stringify(event) })
if (!accepted.accepted) throw new Error('event was not accepted')
const duplicate = await request('/api/ingest/solana', { method: 'POST', body: JSON.stringify(event) })
if (!duplicate.duplicate) throw new Error('duplicate was not rejected')
const trafficRunId = Date.now()
const trafficSession = `smoke-session-${trafficRunId}`
const trafficEvent = { eventId: `ev-smoke-${trafficRunId}`, chain: 'offchain', source: 'trafficgen', app: 'trafficgen', eventType: 'PageView', timestamp: new Date().toISOString(), campaignId: 'smoke-campaign', sourceId: 'smoke-source', sourceType: 'bot', pageId: 'terminal', sessionId: trafficSession, seq: 1, payload: { path: '/index.html' }, parserVersion: 'trafficgen-v1', dataQuality: 'complete' }
const trafficAccepted = await request('/api/ingest/trafficgen', { method: 'POST', body: JSON.stringify(trafficEvent) })
if (!trafficAccepted.accepted) throw new Error('trafficgen event was not accepted')
if (trafficAccepted.event?.campaignId !== 'smoke-campaign' || trafficAccepted.event?.sessionId !== trafficSession) throw new Error('trafficgen top-level fields were not normalized')
if (trafficAccepted.decoder?.knownEvent !== true) throw new Error('trafficgen event was not recognized by adapter')
const trafficDuplicate = await request('/api/ingest/trafficgen', { method: 'POST', body: JSON.stringify(trafficEvent) })
if (!trafficDuplicate.duplicate) throw new Error('trafficgen duplicate was not rejected')
const adapters = await request('/api/ingestion/adapters')
if (!adapters.adapters.some((adapter) => adapter.gameId === 'trafficgen')) throw new Error('trafficgen adapter is missing')
const traffic = await request('/api/analytics/traffic')
if (!['partial', 'unavailable'].includes(traffic.dataQuality)) throw new Error('traffic analytics contract failed')
if (traffic.writes !== false) throw new Error('traffic analytics must be read-only')
const trafficInfra = await request('/api/infra/trafficgen')
if (trafficInfra.provider !== 'trafficgen') throw new Error('trafficgen infra contract failed')
const ecosystem = await request('/api/ecosystem/status')
if (ecosystem.writes !== false) throw new Error('ecosystem status must be read-only')
if (!Array.isArray(ecosystem.tenants) || ecosystem.tenants.length < 5) throw new Error('ecosystem status must list all tenants')
if (!ecosystem.coverage || typeof ecosystem.coverage.configured !== 'number') throw new Error('ecosystem coverage contract failed')
if (!ecosystem.findingsTotal || !Array.isArray(ecosystem.findingsTotal.scansMissing)) throw new Error('ecosystem findings contract failed')
for (const tenant of ecosystem.tenants) {
  if (!['L0', 'L1', 'L2', 'L3', 'L4'].includes(tenant.level)) throw new Error(`unknown level for ${tenant.gameId}: ${tenant.level}`)
  if (tenant.configured && !tenant.envKey) throw new Error(`configured tenant without env key: ${tenant.gameId}`)
}
const ecosystemReport = await request('/api/ecosystem/report')
if (ecosystemReport.writes !== false) throw new Error('ecosystem report must be read-only')
if (!Array.isArray(ecosystemReport.notConnectedTenants)) throw new Error('ecosystem report contract failed')
const prompts = await request('/api/arena/prompts')
if (prompts.writes !== false) throw new Error('prompt catalog must be read-only')
if (prompts.count < 10 || !prompts.prompts.every((p) => p.id && p.file)) throw new Error('prompt catalog contract failed')
const maxPrompt = await request('/api/arena/prompts/max-guttercaps')
if (!maxPrompt.text || maxPrompt.text.length < 500) throw new Error('prompt text must be served for the start button')
const control = await request('/api/control/requests', { method: 'POST', body: JSON.stringify({ type: 'reconcile', gameId: 'ares1', reason: 'smoke test' }) })
if (!control.accepted || control.request.blockchainWrite !== false) throw new Error('control safety contract failed')
await request('/metrics')
console.log('Smoke test passed: health, read-model, ingestion deduplication (solana + trafficgen), trafficgen adapter/analytics/infra, ecosystem status/report, arena prompts, control safety, metrics')

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
for (const key of ['overview', 'adjacent', 'investor', 'funnel', 'crossGame', 'campaigns', 'ingestion', 'controls']) if (!(key in readModel)) throw new Error(`read-model missing ${key}`)
const signature = `smoke-${Date.now()}`
const event = { cluster: 'devnet', slot: 1, signature, programId: 'smoke-program', eventType: 'PlayerJoined', payload: { gameId: 'ares1', playerKey: 'smoke-player' } }
const accepted = await request('/api/ingest/solana', { method: 'POST', body: JSON.stringify(event) })
if (!accepted.accepted) throw new Error('event was not accepted')
const duplicate = await request('/api/ingest/solana', { method: 'POST', body: JSON.stringify(event) })
if (!duplicate.duplicate) throw new Error('duplicate was not rejected')
const control = await request('/api/control/requests', { method: 'POST', body: JSON.stringify({ type: 'reconcile', gameId: 'ares1', reason: 'smoke test' }) })
if (!control.accepted || control.request.blockchainWrite !== false) throw new Error('control safety contract failed')
await request('/metrics')
console.log('Smoke test passed: health, read-model, ingestion deduplication, control safety, metrics')

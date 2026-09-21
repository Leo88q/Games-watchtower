import { randomUUID } from 'node:crypto'

export const COMMITMENTS = new Set(['processed', 'confirmed', 'finalized'])

function offchainFields(input, payload) {
  return {
    campaignId: input.campaignId || payload.campaignId || null,
    pageId: input.pageId || payload.pageId || null,
    sessionId: input.sessionId || payload.sessionId || null,
    sourceId: input.sourceId || payload.sourceId || null,
    sourceType: input.sourceType || payload.sourceType || 'unknown',
    seq: input.seq ?? payload.seq ?? null,
  }
}

function offchainIdentity(input, provider, fields) {
  return input.identity || ['offchain', provider, fields.campaignId || 'unknown', fields.pageId || 'unknown', fields.sessionId || 'unknown', fields.seq ?? 0].join(':')
}

export function normalizeEvent(input, { provider = 'unknown', parserVersion = 'raw-v1' } = {}) {
  const offchain = input.chain === 'offchain'
  const payload = input.payload || {}
  const fields = offchain ? offchainFields(input, payload) : {}
  const dataQualityDefault = offchain
    ? (input.eventType && fields.campaignId ? 'partial' : 'unavailable')
    : (input.eventType && input.programId ? 'partial' : 'unavailable')
  return {
    eventId: input.eventId || randomUUID(),
    identity: offchain
      ? offchainIdentity(input, provider, fields)
      : [input.cluster || 'unknown', input.slot ?? 'unknown', input.signature || 'unknown', input.instructionIndex ?? 0, input.innerIndex ?? 0].join(':'),
    chain: offchain ? 'offchain' : 'solana',
    cluster: offchain ? 'web' : (input.cluster || 'unknown'),
    slot: offchain ? null : (input.slot ?? null),
    blockTime: offchain ? null : (input.blockTime || null),
    signature: offchain ? null : (input.signature || null),
    programId: offchain ? null : (input.programId || null),
    instructionIndex: offchain ? 0 : (input.instructionIndex ?? 0),
    innerIndex: offchain ? 0 : (input.innerIndex ?? 0),
    eventType: input.eventType || 'Unknown',
    commitment: offchain ? 'confirmed' : (COMMITMENTS.has(input.commitment) ? input.commitment : 'confirmed'),
    success: input.success !== false,
    payload,
    source: input.app || provider,
    app: input.app || null,
    campaignId: fields.campaignId ?? null,
    pageId: fields.pageId ?? null,
    sessionId: fields.sessionId ?? null,
    sourceId: fields.sourceId ?? null,
    sourceType: fields.sourceType ?? 'unknown',
    seq: fields.seq ?? null,
    timestamp: input.timestamp || null,
    parserVersion,
    observedAt: input.observedAt || new Date().toISOString(),
    dataQuality: input.dataQuality || dataQualityDefault,
  }
}

export function validateEvent(event) {
  const errors = []
  if (event.chain === 'offchain') {
    if (!event.timestamp) errors.push('timestamp is required')
    return { valid: errors.length === 0, errors }
  }
  if (!event.signature) errors.push('signature is required')
  if (!event.programId) errors.push('programId is required')
  if (event.slot !== null && (!Number.isInteger(event.slot) || event.slot < 0)) errors.push('slot must be a non-negative integer')
  return { valid: errors.length === 0, errors }
}

export class MockProvider {
  constructor(events = []) { this.id = 'mock'; this.events = events }
  async health() { return { ok: true, provider: this.id, mode: 'offline' } }
  async *stream() { for (const event of this.events) yield normalizeEvent(event, { provider: this.id }) }
  async backfill() { return { provider: this.id, events: this.events.length, replayable: true } }
}

export class NativeRpcProvider {
  constructor({ url, timeoutMs = 10000 } = {}) { this.id = 'native-rpc'; this.url = url; this.timeoutMs = timeoutMs }
  async call(method, params = []) {
    if (!this.url) return { ok: false, code: 'RPC_NOT_CONFIGURED' }
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(this.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }), signal: controller.signal })
      const body = await response.json(); if (body.error) return { ok: false, code: 'RPC_ERROR', message: body.error.message }
      return { ok: response.ok, value: body.result }
    } catch (error) { return { ok: false, code: error.name === 'AbortError' ? 'RPC_TIMEOUT' : 'RPC_UNAVAILABLE', message: error.message } }
    finally { clearTimeout(timer) }
  }
  async health() { const result = await this.call('getHealth'); return { provider: this.id, ...result, mode: 'rpc' } }
  async backfill({ address, limit = 100 } = {}) { const result = await this.call('getSignaturesForAddress', [address, { limit }]); return { provider: this.id, address, events: result.value?.length || 0, ...result } }
  async *stream() { return undefined }
}

// Pull-провайдер для off-chain приложений (генератор трафика).
// Ожидает read-only API по контракту из PROMPT_TRAFFIC_GENERATOR_INTEGRATION.md
// и паспорту TalkChart: GET /watchtower/health, GET /watchtower/events?cursor=&limit=&eventType=&campaignId=&sourceType=&since=
export class TrafficgenProvider {
  constructor({ baseUrl, readToken, timeoutMs = 10000 } = {}) { this.id = 'trafficgen'; this.baseUrl = (baseUrl || '').replace(/\/+$/, ''); this.readToken = readToken || null; this.timeoutMs = timeoutMs }
  async get(path) {
    if (!this.baseUrl) return { ok: false, code: 'TRAFFICGEN_NOT_CONFIGURED' }
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const headers = this.readToken ? { authorization: `Bearer ${this.readToken}` } : {}
      const response = await fetch(`${this.baseUrl}${path}`, { headers, signal: controller.signal })
      const body = await response.json()
      return { ok: response.ok, value: body }
    } catch (error) { return { ok: false, code: error.name === 'AbortError' ? 'TRAFFICGEN_TIMEOUT' : 'TRAFFICGEN_UNAVAILABLE', message: error.message } }
    finally { clearTimeout(timer) }
  }
  async health() {
    const result = await this.get('/watchtower/health')
    return { provider: this.id, mode: 'trafficgen', configured: Boolean(this.baseUrl), writes: false, ...(result.ok ? result.value : result) }
  }
  async backfill({ limit = 200, cursor, eventType, campaignId, sourceType, since } = {}) {
    const query = new URLSearchParams({ limit: String(Math.min(500, Math.max(1, limit))) })
    if (cursor) query.set('cursor', cursor)
    if (eventType) query.set('eventType', eventType)
    if (campaignId) query.set('campaignId', campaignId)
    if (sourceType) query.set('sourceType', sourceType)
    if (since) query.set('since', since)
    const result = await this.get(`/watchtower/events?${query}`)
    if (!result.ok) return { provider: this.id, ok: false, events: [], nextCursor: null, ...result }
    const body = result.value || {}
    const raw = Array.isArray(body) ? body : (body.data?.events || body.events || [])
    const events = raw.map((event) => normalizeEvent(event, { provider: this.id, parserVersion: event.parserVersion || 'trafficgen-v1' }))
    return { provider: this.id, ok: true, events, nextCursor: body.data?.nextCursor || body.nextCursor || null, hasMore: body.data?.hasMore ?? Boolean(body.data?.nextCursor || body.nextCursor), replayable: true, dataQuality: body.data?.dataQuality || body.dataQuality || 'partial' }
  }
  async *stream({ limit = 200, maxPages = 50, ...filters } = {}) {
    let cursor; let pages = 0
    do {
      const page = await this.backfill({ limit, cursor, ...filters })
      if (!page.ok) return
      for (const event of page.events) yield event
      cursor = page.nextCursor; pages += 1
    } while (cursor && pages < maxPages)
  }
}

export function createTrafficgenProvider(config = process.env) {
  return new TrafficgenProvider({ baseUrl: config.TRAFFICGEN_API_BASE_URL, readToken: config.WATCHTOWER_READ_TOKEN })
}

export function createProvider(config = process.env) {
  const mode = config.WATCHTOWER_PROVIDER || 'mock'
  if (mode === 'native-rpc') return new NativeRpcProvider({ url: config.SOLANA_RPC_URL })
  if (mode === 'trafficgen') return new TrafficgenProvider({ baseUrl: config.TRAFFICGEN_API_BASE_URL })
  return new MockProvider()
}

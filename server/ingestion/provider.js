import { randomUUID } from 'node:crypto'
import { assertSafeAmount, payloadSize, sanitizeIdentifier, sanitizePayload, sanitizeText, LIMITS } from './schema.js'
import { IDENTIFIER_FIELDS } from '../security/pii.js'

export const COMMITMENTS = new Set(['processed', 'confirmed', 'finalized'])

function offchainFields(input, payload) {
  return {
    campaignId: sanitizeIdentifier(input.campaignId || payload.campaignId) || null,
    pageId: sanitizeIdentifier(input.pageId || payload.pageId) || null,
    sessionId: sanitizeIdentifier(input.sessionId || payload.sessionId) || null,
    sourceId: sanitizeIdentifier(input.sourceId || payload.sourceId) || null,
    sourceType: sanitizeIdentifier(input.sourceType || payload.sourceType) || 'unknown',
    seq: input.seq ?? payload.seq ?? null,
  }
}

function offchainIdentity(input, provider, fields) {
  return input.identity || ['offchain', provider, fields.campaignId || 'unknown', fields.pageId || 'unknown', fields.sessionId || 'unknown', fields.seq ?? 0].join(':')
}

const KNOWN_GAMES = new Set(['ares1', 'aof', 'neonrelay', 'guttercaps', 'trafficgen'])

export function normalizeEvent(input, { provider = 'unknown', parserVersion = 'raw-v1' } = {}) {
  const safeInput = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const offchain = safeInput.chain === 'offchain'
  const sanitized = sanitizePayload(safeInput.payload)
  const payload = sanitized.value
  const fields = offchain ? offchainFields(safeInput, payload) : {}
  const gameId = sanitizeIdentifier(safeInput.gameId || payload.gameId) || null
  const dataQualityDefault = offchain
    ? (safeInput.eventType && fields.campaignId ? 'partial' : 'unavailable')
    : (safeInput.eventType && safeInput.programId ? 'partial' : 'unavailable')
  const slot = assertSafeAmount(safeInput.slot, { name: 'slot', max: Number.MAX_SAFE_INTEGER })
  return {
    eventId: typeof safeInput.eventId === 'string' && safeInput.eventId.length <= 128 ? safeInput.eventId : randomUUID(),
    identity: offchain
      ? offchainIdentity(safeInput, provider, fields)
      : [sanitizeIdentifier(safeInput.cluster) || 'unknown', slot.value ?? 'unknown', sanitizeIdentifier(safeInput.signature) || 'unknown', safeInput.instructionIndex ?? 0, safeInput.innerIndex ?? 0].join(':'),
    chain: offchain ? 'offchain' : 'solana',
    cluster: offchain ? 'web' : (sanitizeIdentifier(safeInput.cluster) || 'unknown'),
    slot: offchain ? null : (slot.value ?? null),
    blockTime: offchain ? null : (sanitizeText(safeInput.blockTime, 64) || null),
    signature: offchain ? null : (sanitizeIdentifier(safeInput.signature) || null),
    programId: offchain ? null : (sanitizeIdentifier(safeInput.programId) || null),
    instructionIndex: offchain ? 0 : (Number.isInteger(safeInput.instructionIndex) ? safeInput.instructionIndex : 0),
    innerIndex: offchain ? 0 : (Number.isInteger(safeInput.innerIndex) ? safeInput.innerIndex : 0),
    eventType: sanitizeIdentifier(safeInput.eventType) || 'Unknown',
    commitment: offchain ? 'confirmed' : (COMMITMENTS.has(safeInput.commitment) ? safeInput.commitment : 'confirmed'),
    success: safeInput.success !== false,
    payload,
    gameId,
    sanitizationWarnings: [...sanitized.warnings],
    source: sanitizeIdentifier(safeInput.app) || provider,
    app: sanitizeIdentifier(safeInput.app) || null,
    campaignId: fields.campaignId ?? null,
    pageId: fields.pageId ?? null,
    sessionId: fields.sessionId ?? null,
    sourceId: fields.sourceId ?? null,
    sourceType: fields.sourceType ?? 'unknown',
    seq: fields.seq ?? null,
    timestamp: sanitizeText(safeInput.timestamp, 64) || null,
    parserVersion,
    observedAt: sanitizeText(safeInput.observedAt, 64) || new Date().toISOString(),
    dataQuality: ['complete', 'partial', 'unavailable'].includes(safeInput.dataQuality) ? safeInput.dataQuality : dataQualityDefault,
    warnings: [...sanitized.warnings, ...(sanitized.warnings.length ? ['payload_sanitized'] : [])],
  }
}

/**
 * Строгая валидация перед записью в inbox. Возвращает { valid, errors }.
 * Ошибки — не «на будущее», а условия, при которых событие исказит публикуемые числа.
 */
export function validateEvent(event, { allowUnknownGames = false, maxEventAmount = Number.MAX_SAFE_INTEGER, now = Date.now() } = {}) {
  const errors = []
  if (!event || typeof event !== 'object') return { valid: false, errors: ['event must be an object'] }

  if (event.chain === 'offchain') {
    if (!event.timestamp) errors.push('timestamp is required')
    else if (!Number.isFinite(Date.parse(event.timestamp))) errors.push('timestamp must be an ISO-8601 date or epoch')
  } else {
    if (!event.signature) errors.push('signature is required')
    if (!event.programId) errors.push('programId is required')
    if (event.slot !== null && (!Number.isInteger(event.slot) || event.slot < 0)) errors.push('slot must be a non-negative integer')
  }

  if (!event.eventType || event.eventType === 'Unknown') errors.push('eventType is required')
  if (event.gameId && !allowUnknownGames && !KNOWN_GAMES.has(event.gameId)) errors.push(`unknown gameId: ${event.gameId}`)

  const payloadBytes = payloadSize(event.payload)
  if (!Number.isFinite(payloadBytes)) errors.push('payload is not serializable')
  else if (payloadBytes > LIMITS.payloadJson) errors.push(`payload too large: ${payloadBytes} bytes > ${LIMITS.payloadJson}`)

  // Числовые поля, из которых строятся суммы метрик.
  for (const key of ['amount', 'lamports', 'value', 'price', 'quantity']) {
    if (event.payload && key in event.payload && event.payload[key] !== null && event.payload[key] !== undefined) {
      const check = assertSafeAmount(event.payload[key], { name: `payload.${key}`, max: maxEventAmount })
      if (!check.ok) errors.push(check.error)
    }
  }

  // Идентификаторы игроков: только примитивы. Объект на месте идентификатора нельзя
  // корректно псевдонимизировать — он превратился бы в '[object Object]' и склеил бы игроков.
  if (event.payload && typeof event.payload === 'object') {
    for (const field of IDENTIFIER_FIELDS) {
      const value = event.payload[field]
      if (value === undefined || value === null) continue
      if (typeof value === 'object') errors.push(`payload.${field} must be a string or number`)
      else if (typeof value === 'number' && !Number.isFinite(value)) errors.push(`payload.${field} must be finite`)
    }
  }

  if (event.observedAt && !Number.isFinite(Date.parse(event.observedAt))) errors.push('observedAt must be a valid date')
  if (event.observedAt && Date.parse(event.observedAt) - now > 5 * 60_000) errors.push('observedAt is in the future')

  return { valid: errors.length === 0, errors }
}

/**
 * Тестовый двойник: не выполняет сетевых вызовов, поэтому его health не может быть «ok».
 * Если он нужен в проде — это ошибка конфигурации, и она должна быть видна, а не скрыта.
 */
export class MockProvider {
  constructor(events = []) { this.id = 'mock'; this.events = events; this.simulated = true }
  async health() {
    return { ok: false, provider: this.id, mode: 'offline', simulated: true, configured: false, reason: 'MockProvider не проверяет внешний источник: health не подтверждён' }
  }
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
  const mode = config.WATCHTOWER_PROVIDER || 'http-ingest'
  if (mode === 'native-rpc') return new NativeRpcProvider({ url: config.SOLANA_RPC_URL })
  if (mode === 'trafficgen') return new TrafficgenProvider({ baseUrl: config.TRAFFICGEN_API_BASE_URL })
  return new MockProvider()
}

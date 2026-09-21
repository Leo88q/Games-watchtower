import { randomUUID } from 'node:crypto'

export const COMMITMENTS = new Set(['processed', 'confirmed', 'finalized'])

export function normalizeEvent(input, { provider = 'unknown', parserVersion = 'raw-v1' } = {}) {
  const commitment = COMMITMENTS.has(input.commitment) ? input.commitment : 'confirmed'
  return {
    eventId: input.eventId || randomUUID(),
    identity: [input.cluster || 'unknown', input.slot ?? 'unknown', input.signature || 'unknown', input.instructionIndex ?? 0, input.innerIndex ?? 0].join(':'),
    chain: 'solana', cluster: input.cluster || 'unknown', slot: input.slot ?? null,
    blockTime: input.blockTime || null, signature: input.signature || null,
    programId: input.programId || null, instructionIndex: input.instructionIndex ?? 0,
    innerIndex: input.innerIndex ?? 0, eventType: input.eventType || 'Unknown',
    commitment, success: input.success !== false, payload: input.payload || {},
    source: provider, parserVersion, observedAt: input.observedAt || new Date().toISOString(),
    dataQuality: input.dataQuality || (input.eventType && input.programId ? 'partial' : 'unavailable'),
  }
}

export function validateEvent(event) {
  const errors = []
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

export function createProvider(config = process.env) {
  const mode = config.WATCHTOWER_PROVIDER || 'mock'
  if (mode === 'native-rpc') return new NativeRpcProvider({ url: config.SOLANA_RPC_URL })
  return new MockProvider()
}

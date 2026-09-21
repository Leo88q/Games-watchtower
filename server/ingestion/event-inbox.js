import { normalizeEvent, validateEvent } from './provider.js'

const events = new Map()
let duplicates = 0
let rejected = 0

export function ingest(input, source = 'mock') {
  const event = normalizeEvent(input, { provider: source, parserVersion: input.parserVersion || 'raw-v1' })
  const validation = validateEvent(event)
  if (!validation.valid) { rejected += 1; return { accepted: false, errors: validation.errors, event } }
  if (events.has(event.identity)) { duplicates += 1; return { accepted: false, duplicate: true, event } }
  events.set(event.identity, Object.freeze(event))
  return { accepted: true, duplicate: false, event }
}

export function list({ programId, commitment, limit = 100 } = {}) {
  return [...events.values()].filter((event) => (!programId || event.programId === programId) && (!commitment || event.commitment === commitment)).slice(-Math.min(1000, Math.max(1, limit))).reverse()
}

export function inboxStatus() { return { events: events.size, duplicates, rejected, storage: 'memory-fixture', immutable: true, identity: 'cluster:slot:signature:instructionIndex:innerIndex' } }

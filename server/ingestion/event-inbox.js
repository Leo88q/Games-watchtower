/**
 * Event inbox — хранилище нормализованных событий в памяти с retention.
 *
 * Ключевые свойства для продакшена:
 *  - запись только валидных событий (см. provider.validateEvent);
 *  - идемпотентность по identity (cluster:slot:signature:instructionIndex:innerIndex / offchain);
 *  - ограничение размера (maxEvents) и TTL — без «бесконечного» роста;
 *  - list()/window() отдают столько событий, сколько запрошено (в пределах retention), без скрытых обрезаний;
 *  - freshness() даёт ответ на вопрос «данные перестали поступать?» (тишина как отказ).
 */

import { normalizeEvent, validateEvent } from './provider.js'
import { anonymizeIdentifier, IDENTIFIER_FIELDS } from '../security/pii.js'

const events = new Map()
const counters = { accepted: 0, duplicates: 0, rejected: 0, evictedByLimit: 0, evictedByTtl: 0, erased: 0 }
let lastEventAt = null
let lastSweepAt = 0

const settings = {
  maxEvents: 250000,
  ttlMs: 0,
  allowUnknownGames: false,
  maxEventAmount: Number.MAX_SAFE_INTEGER,
}

export function configureInbox({ maxEvents, eventTtlHours, allowUnknownGames, maxEventAmount } = {}) {
  if (Number.isInteger(maxEvents) && maxEvents > 0) settings.maxEvents = maxEvents
  if (Number.isInteger(eventTtlHours) && eventTtlHours >= 0) settings.ttlMs = eventTtlHours * 3600_000
  if (typeof allowUnknownGames === 'boolean') settings.allowUnknownGames = allowUnknownGames
  if (Number.isInteger(maxEventAmount) && maxEventAmount > 0) settings.maxEventAmount = maxEventAmount
}

function eventTime(event) {
  const raw = event.timestamp || event.observedAt || null
  const parsed = raw ? Date.parse(raw) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

function sweep(now = Date.now()) {
  if (!settings.ttlMs) return
  if (now - lastSweepAt < 60_000) return
  lastSweepAt = now
  const cutoff = now - settings.ttlMs
  for (const [identity, event] of events) {
    const time = eventTime(event)
    if (time !== null && time < cutoff) {
      events.delete(identity)
      counters.evictedByTtl += 1
    }
  }
}

function enforceLimit() {
  while (events.size > settings.maxEvents) {
    const oldest = events.keys().next()
    if (oldest.done) break
    events.delete(oldest.value)
    counters.evictedByLimit += 1
  }
}

export function ingest(input, source = 'mock') {
  const event = normalizeEvent(input, { provider: source, parserVersion: input?.parserVersion || 'raw-v1' })
  const validation = validateEvent(event, {
    allowUnknownGames: settings.allowUnknownGames,
    maxEventAmount: settings.maxEventAmount,
  })
  if (!validation.valid) {
    counters.rejected += 1
    return { accepted: false, errors: validation.errors, event }
  }
  if (events.has(event.identity)) {
    counters.duplicates += 1
    return { accepted: false, duplicate: true, event }
  }
  events.set(event.identity, Object.freeze(event))
  counters.accepted += 1
  const time = eventTime(event)
  if (time !== null && (lastEventAt === null || time > lastEventAt)) lastEventAt = time
  sweep()
  enforceLimit()
  return { accepted: true, duplicate: false, event }
}

/** Пакетная запись: частично невалидный батч не откатывается, но отчёт содержит точную статистику. */
export function ingestBatch(inputs, source = 'mock') {
  if (!Array.isArray(inputs)) return { accepted: 0, duplicates: 0, rejected: 0, results: [] }
  const results = inputs.map((input) => ingest(input, source))
  return {
    accepted: results.filter((r) => r.accepted).length,
    duplicates: results.filter((r) => r.duplicate).length,
    rejected: results.filter((r) => !r.accepted && !r.duplicate).length,
    results,
  }
}

function matches(event, { programId, commitment, source, gameId }) {
  if (programId && event.programId !== programId) return false
  if (commitment && event.commitment !== commitment) return false
  if (source && event.source !== source) return false
  if (gameId && event.gameId !== gameId && event.app !== gameId && event.source !== gameId) return false
  return true
}

function withinWindow(event, since, until) {
  const time = eventTime(event)
  if (since !== undefined && since !== null && time !== null && time < since) return false
  if (until !== undefined && until !== null && time !== null && time > until) return false
  return true
}

/**
 * Новейшие события первыми. `limit` соблюдается вплоть до размера хранилища —
 * скрытого потолка 1000 больше нет (он искажал окна метрик).
 */
export function list({ programId, commitment, source, gameId, since, until, limit = 100 } = {}) {
  const max = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : events.size
  const out = []
  const values = [...events.values()]
  for (let index = values.length - 1; index >= 0 && out.length < max; index -= 1) {
    const event = values[index]
    if (matches(event, { programId, commitment, source, gameId }) && withinWindow(event, since, until)) out.push(event)
  }
  return out
}

/** Все события в окне в порядке поступления (для расчёта метрик). */
export function windowEvents({ since, until, limit } = {}) {
  const matched = []
  for (const event of events.values()) if (withinWindow(event, since, until)) matched.push(event)
  const max = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : matched.length
  return matched.slice(-max)
}

export function allEvents() {
  return [...events.values()]
}

/**
 * Удаление всех событий указанного игрока (право на забвение).
 * Идентификатор сравнивается в псевдонимах, поэтому в отчёте остаётся только хеш.
 */
export function erasePlayer(rawIdentifier, options = {}) {
  const alias = anonymizeIdentifier(rawIdentifier, options)
  if (!alias) return { ok: false, reason: 'identifier_required', removed: 0 }
  let removed = 0
  for (const [identity, event] of [...events]) {
    const payload = event.payload || {}
    const hit = IDENTIFIER_FIELDS.some((field) => anonymizeIdentifier(payload[field], options) === alias)
    if (hit) {
      events.delete(identity)
      removed += 1
    }
  }
  if (removed) {
    counters.erased += removed
    const remaining = [...events.values()].map((event) => eventTime(event)).filter((time) => time !== null)
    lastEventAt = remaining.length ? Math.max(...remaining) : null
  }
  return { ok: true, alias, removed, remaining: events.size }
}

export function inboxStatus(now = Date.now()) {
  const age = lastEventAt === null ? null : Math.max(0, Math.round((now - lastEventAt) / 1000))
  return {
    events: events.size,
    accepted: counters.accepted,
    duplicates: counters.duplicates,
    rejected: counters.rejected,
    evictedByLimit: counters.evictedByLimit,
    evictedByTtl: counters.evictedByTtl,
    erased: counters.erased,
    maxEvents: settings.maxEvents,
    ttlHours: settings.ttlMs ? settings.ttlMs / 3600_000 : 0,
    storage: settings.maxEvents > 0 && settings.ttlMs > 0 ? 'memory-ring-with-ttl' : 'memory-ring',
    immutable: true,
    identity: 'cluster:slot:signature:instructionIndex:innerIndex',
    lastEventAt: lastEventAt === null ? null : new Date(lastEventAt).toISOString(),
    lastEventAgeSeconds: age,
    stale: age !== null && settings.ttlMs > 0 ? age * 1000 > settings.ttlMs : false,
  }
}

/** Свежесть данных: используется readiness-проверкой и алертами «тишина = отказ». */
export function freshness({ maxAgeSeconds = 0, now = Date.now() } = {}) {
  const age = lastEventAt === null ? null : Math.max(0, Math.round((now - lastEventAt) / 1000))
  const stale = maxAgeSeconds > 0 && (age === null || age > maxAgeSeconds)
  return { lastEventAt: lastEventAt === null ? null : new Date(lastEventAt).toISOString(), ageSeconds: age, maxAgeSeconds, stale, noDataYet: lastEventAt === null }
}

export function resetInboxForTests() {
  events.clear()
  lastEventAt = null
  lastSweepAt = 0
  for (const key of Object.keys(counters)) counters[key] = 0
  settings.maxEvents = 250000
  settings.ttlMs = 0
  settings.allowUnknownGames = false
  settings.maxEventAmount = Number.MAX_SAFE_INTEGER
}

export const inboxSettings = settings

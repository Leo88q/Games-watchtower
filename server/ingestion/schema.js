/**
 * Схема и санитайзинг входящих событий.
 *
 * Задача — не «привести к строке», а не пустить в хранилище данные, которые потом:
 *  - искажают числа (Infinity, NaN, суммы за 2^53, отрицательные значения);
 *  - попадают в UI (управляющие символы, HTML/JS-разметка в идентификаторах);
 *  - ломают соединение реестра игр (юникод-двойники gameId, неизвестные игры).
 */

export const LIMITS = Object.freeze({
  identifier: 128,
  eventType: 64,
  signature: 128,
  cluster: 32,
  programId: 64,
  app: 64,
  payloadJson: 4096,
  jsonDepth: 64,
  payloadKeys: 64,
  arrayItems: 256,
  string: 512,
})

// В идентификаторах нет места знакам, из которых собираются атрибуты и схемы: = ( ) { } [ ] ! * $ % ^ & ~ , ; ?
const IDENTIFIER_CHARS = /[^A-Za-z0-9 _.:@/\-+#]/g
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g
const HTML_CHARS = /[<>"'`\\]/g

/** Идентификаторы из payload не должны содержать разметку: это и есть вход для XSS-приёмников. */
export function sanitizeIdentifier(value) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).replace(CONTROL_CHARS, '').replace(HTML_CHARS, '').replace(IDENTIFIER_CHARS, '').replace(ACTIVE_SCHEMES, '').trim()
  if (!cleaned) return null
  return cleaned.slice(0, LIMITS.identifier)
}

export function sanitizeText(value, max = LIMITS.string) {
  if (value === undefined || value === null) return null
  const cleaned = String(value).replace(CONTROL_CHARS, '').trim()
  if (!cleaned) return null
  return cleaned.slice(0, max)
}

/**
 * Строки внутри payload: убираем управляющие символы и HTML-метасимволы.
 * Это вход для UI-приёмников (pageId/sourceId/campaignId и др.), поэтому разметка не сохраняется.
 */
/** Схемы-исполнители в значении: даже как текст это признак попытки инъекции. */
const ACTIVE_SCHEMES = /(javascript|vbscript|data:text\/html)\s*:/gi

export function sanitizePayloadString(value, max = LIMITS.string) {
  if (value === undefined || value === null) return null
  const raw = String(value)
  const cleaned = raw.replace(CONTROL_CHARS, '').replace(HTML_CHARS, '').replace(ACTIVE_SCHEMES, '').trim()
  if (!cleaned) return null
  return cleaned.slice(0, max)
}

/** Глубина JSON — защита от stack-overflow на вложенных структурах до вызова JSON.stringify. */
export function maxJsonDepth(value, depth = 0) {
  if (depth > LIMITS.jsonDepth) return depth
  if (Array.isArray(value)) {
    let max = depth
    for (const item of value) max = Math.max(max, maxJsonDepth(item, depth + 1))
    return max
  }
  if (value && typeof value === 'object') {
    let max = depth
    for (const item of Object.values(value)) max = Math.max(max, maxJsonDepth(item, depth + 1))
    return max
  }
  return depth
}

export function countJsonNodes(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countJsonNodes(item), 1)
  if (value && typeof value === 'object') return Object.values(value).reduce((sum, item) => sum + countJsonNodes(item), 1)
  return 1
}

/**
 * Числовая проверка: только конечные неотрицательные целые в безопасном диапазоне.
 * Строки вида "NaN", "Infinity" и 1e999 (→ Infinity после JSON.parse) отбрасываются.
 */
export function assertSafeAmount(value, { name = 'amount', max = Number.MAX_SAFE_INTEGER, allowFloat = false } = {}) {
  if (value === undefined || value === null) return { ok: true, value: null }
  const num = typeof value === 'string' ? Number(value.trim()) : value
  if (typeof num !== 'number' || !Number.isFinite(num)) return { ok: false, error: `${name} must be a finite number` }
  if (num < 0) return { ok: false, error: `${name} must not be negative` }
  if (!allowFloat && !Number.isInteger(num)) return { ok: false, error: `${name} must be an integer` }
  if (num > max) return { ok: false, error: `${name} exceeds allowed maximum ${max}` }
  if (num > Number.MAX_SAFE_INTEGER) return { ok: false, error: `${name} exceeds Number.MAX_SAFE_INTEGER (2^53-1)` }
  return { ok: true, value: num }
}

export function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { value: {}, warnings: ['payload_not_object'] }
  const warnings = []
  const value = {}
  for (const [key, raw] of Object.entries(payload)) {
    if (Object.keys(value).length >= LIMITS.payloadKeys) { warnings.push('payload_keys_truncated'); break }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') { warnings.push(`dangerous_key_removed:${key}`); continue }
    if (Array.isArray(raw)) {
      value[key] = raw.slice(0, LIMITS.arrayItems).map((item) => (typeof item === 'string' ? sanitizePayloadString(item) : item))
      if (raw.length > LIMITS.arrayItems) warnings.push(`array_truncated:${key}`)
      continue
    }
    if (raw && typeof raw === 'object') {
      if (maxJsonDepth(raw) > 8) { warnings.push(`payload_nested_too_deep:${key}`); continue }
      const nested = sanitizePayload(raw)
      value[key] = nested.value
      warnings.push(...nested.warnings.map((warn) => `${key}.${warn}`))
      continue
    }
    if (typeof raw === 'string') {
      const cleaned = sanitizePayloadString(raw)
      if (cleaned !== raw) warnings.push(`string_sanitized:${key}`)
      value[key] = cleaned
      continue
    }
    value[key] = raw
  }
  return { value, warnings }
}

export function payloadSize(payload) {
  try {
    return JSON.stringify(payload)?.length ?? 0
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export { IDENTIFIER_CHARS }

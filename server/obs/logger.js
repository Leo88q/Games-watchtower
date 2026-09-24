/**
 * Структурированный логгер (JSON в stdout) с уровнями, request-id и редакцией секретов.
 * Никаких персональных данных и токенов в логах: значения чувствительных полей маскируются.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const SECRET_KEY = /(token|secret|authorization|password|api[-_]?key|signature|bearer|cookie)/i
const SECRET_VALUE = /(bearer\s+[a-z0-9._-]+|(?:token|secret|api[-_]?key)=[^&\s]+)/gi

let level = LEVELS.info

export function setLogLevel(name) {
  const normalized = String(name || '').toLowerCase()
  if (normalized in LEVELS) level = LEVELS[normalized]
}

export function maskValue(value) {
  if (value === undefined || value === null) return value
  return '[redacted]'
}

export function sanitizeForLog(value, depth = 0) {
  if (depth > 4) return '[depth-limit]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value.replace(SECRET_VALUE, (match) => `${match.split(/[=:\s]/)[0]}=[redacted]`).slice(0, 2000)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeForLog(item, depth + 1))
  if (typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) out[key] = SECRET_KEY.test(key) && typeof item !== 'boolean' && item !== null ? maskValue(item) : sanitizeForLog(item, depth + 1)
    return out
  }
  return String(value)
}

/** Маскирует значения query-параметров, оставляя только сами ключи. */
export function sanitizePath(rawUrl) {
  if (!rawUrl) return ''
  const [path, query] = String(rawUrl).split('?')
  if (!query) return path
  // Значения query-параметров не сохраняются вообще: там бывают идентификаторы игроков и токены.
  const keys = [...new Set(query.split('&').map((pair) => pair.split('=')[0]).filter(Boolean))]
  return keys.length ? `${path}?${keys.join('&')}` : path
}

function write(levelName, message, fields = {}) {
  if (LEVELS[levelName] > level) return
  const record = { ts: new Date().toISOString(), level: levelName, msg: message, ...sanitizeForLog(fields) }
  try {
    process.stdout.write(`${JSON.stringify(record)}\n`)
  } catch {
    process.stdout.write(`${JSON.stringify({ ts: record.ts, level: 'error', msg: 'log_serialization_failed' })}\n`)
  }
}

export const logger = {
  error: (message, fields) => write('error', message, fields),
  warn: (message, fields) => write('warn', message, fields),
  info: (message, fields) => write('info', message, fields),
  debug: (message, fields) => write('debug', message, fields),
  child(baseFields = {}) {
    return {
      error: (message, fields) => write('error', message, { ...baseFields, ...fields }),
      warn: (message, fields) => write('warn', message, { ...baseFields, ...fields }),
      info: (message, fields) => write('info', message, { ...baseFields, ...fields }),
      debug: (message, fields) => write('debug', message, { ...baseFields, ...fields }),
    }
  },
}

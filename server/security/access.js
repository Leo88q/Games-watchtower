/**
 * Доступ, аутентификация и журнал действий.
 *
 * Правила:
 *  - write-маршруты (ingest / control / campaigns / snapshots / session-keys) требуют токен приёма
 *    или HMAC-подпись тела. Без настроенного секрета они отвечают 503, а не открываются анонимно.
 *  - read-маршруты требуют токен чтения, если он настроен.
 *  - X-Forwarded-For учитывается только при WATCHTOWER_TRUST_PROXY=1.
 *  - в журнал попадают хеш адреса и путь без значений query.
 */

import crypto from 'node:crypto'

const buckets = new Map()
const audit = []
let auditLimit = 1000

export function configureAccess({ rateLimit, auditRingSize }) {
  if (Number.isInteger(rateLimit) && rateLimit > 0) WINDOW_LIMIT = rateLimit
  if (Number.isInteger(auditRingSize) && auditRingSize >= 10) auditLimit = auditRingSize
}

let WINDOW_LIMIT = 120
const WINDOW_MS = 60_000

/** Ключ клиента для лимитов: реальный адрес сокета; XFF — только при явном доверии к прокси. */
export function clientIp(req, { trustProxy = false } = {}) {
  const socketAddress = req.socket?.remoteAddress || 'local'
  if (!trustProxy) return socketAddress
  const forwarded = String(req.headers['x-forwarded-for'] || '')
  const hops = forwarded.split(',').map((item) => item.trim()).filter(Boolean)
  // При trust proxy берём адрес прокси-хопа — последний в цепочке, добавленный нашим прокси.
  return hops.length ? hops[hops.length - 1] : socketAddress
}

export function hashIp(ip, salt) {
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 16)
}

export function checkRateLimit(req, config) {
  const ip = clientIp(req, config)
  const now = Date.now()
  const bucket = buckets.get(ip) || { started: now, count: 0 }
  if (now - bucket.started > WINDOW_MS) {
    bucket.started = now
    bucket.count = 0
  }
  bucket.count += 1
  buckets.set(ip, bucket)
  if (buckets.size > 10_000) {
    for (const [key, value] of buckets) if (now - value.started > WINDOW_MS * 5) buckets.delete(key)
  }
  if (bucket.count > WINDOW_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((bucket.started + WINDOW_MS - now) / 1000))
    return { allowed: false, status: 429, reason: 'rate_limit_exceeded', ip, retryAfter }
  }
  return { allowed: true, ip }
}

function safeEqual(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a)).digest()
  const bufB = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(bufA, bufB)
}

function bearerToken(req) {
  const header = String(req.headers.authorization || '')
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : ''
}

/**
 * Проверка HMAC-подписи тела запроса.
 * Заголовки: X-Watchtower-Timestamp (ISO или unix-ms), X-Watchtower-Signature (hex sha256 HMAC).
 */
export function verifyIngestSignature({ rawBody, headers, secret, now = Date.now(), toleranceMs = 5 * 60_000 }) {
  if (!secret) return { valid: false, reason: 'hmac_not_configured' }
  const timestampRaw = headers['x-watchtower-timestamp']
  const signature = String(headers['x-watchtower-signature'] || '').trim().toLowerCase()
  if (!timestampRaw || !signature) return { valid: false, reason: 'signature_headers_required' }
  const parsedTimestamp = Number.isNaN(Number(timestampRaw)) ? Date.parse(String(timestampRaw)) : Number(timestampRaw)
  if (!Number.isFinite(parsedTimestamp)) return { valid: false, reason: 'signature_timestamp_invalid' }
  if (Math.abs(now - parsedTimestamp) > toleranceMs) return { valid: false, reason: 'signature_timestamp_out_of_window' }
  const expected = crypto.createHmac('sha256', secret).update(`${timestampRaw}.${rawBody ?? ''}`).digest('hex')
  const valid = safeEqual(expected, signature)
  return { valid, reason: valid ? null : 'signature_mismatch' }
}

export function signIngestBody({ rawBody, timestamp = Date.now(), secret }) {
  const body = rawBody ?? ''
  const timestampRaw = String(timestamp)
  const signature = crypto.createHmac('sha256', secret).update(`${timestampRaw}.${body}`).digest('hex')
  return { headers: { 'x-watchtower-timestamp': timestampRaw, 'x-watchtower-signature': signature } }
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {{ kind: 'public'|'read'|'write', config: object, rawBody?: string }} options
 */
export function authenticate(req, { kind = 'read', config, rawBody = '' } = {}) {
  if (kind === 'public') return { ok: true, scheme: 'public' }

  if (kind === 'write') {
    const token = bearerToken(req)
    if (config.ingestToken) {
      if (token && safeEqual(token, config.ingestToken)) return { ok: true, scheme: 'ingest_token' }
      if (!config.ingestSecret) return { ok: false, status: 401, reason: 'ingest_token_required' }
    }
    if (config.ingestSecret) {
      const hmac = verifyIngestSignature({ rawBody, headers: req.headers, secret: config.ingestSecret })
      if (hmac.valid) return { ok: true, scheme: 'hmac' }
      if (!config.ingestToken) return { ok: false, status: 401, reason: hmac.reason || 'signature_required' }
      return { ok: false, status: 401, reason: 'ingest_auth_failed' }
    }
    // Ни токена, ни секрета: запись запрещена (не «тихий открытый режим»).
    return { ok: false, status: 503, reason: 'ingest_disabled_no_secret_configured' }
  }

  if (!config.readToken) return { ok: true, scheme: 'open_read' }
  const token = bearerToken(req)
  if (token && safeEqual(token, config.readToken)) return { ok: true, scheme: 'read_token' }
  return { ok: false, status: 401, reason: 'read_token_required' }
}

export function recordAudit(req, info = {}, { config, ip } = {}) {
  const address = ip || clientIp(req, config || {})
  audit.push({
    at: new Date().toISOString(),
    method: req.method,
    path: info.path ?? req.url,
    ipHash: hashIp(address, config?.ipHashSalt || 'salt'),
    status: info.status,
    reason: info.reason ?? null,
    route: info.route ?? null,
    bytesOut: info.bytesOut ?? null,
    durMs: info.durMs ?? null,
    blockchainWrite: false,
  })
  while (audit.length > auditLimit) audit.shift()
}

export function auditLog() {
  return [...audit].reverse()
}

export function resetAccessStateForTests() {
  buckets.clear()
  audit.length = 0
  WINDOW_LIMIT = 120
}

export function rateLimitSnapshot() {
  return { buckets: buckets.size, limit: WINDOW_LIMIT, windowMs: WINDOW_MS }
}

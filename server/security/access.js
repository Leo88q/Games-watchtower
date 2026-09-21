const buckets = new Map()
const audit = []
const WINDOW_MS = 60_000
const LIMIT = Number(process.env.WATCHTOWER_RATE_LIMIT || 120)

export function checkAccess(req, { publicRoute = false } = {}) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim()
  const now = Date.now()
  const bucket = buckets.get(ip) || { started: now, count: 0 }
  if (now - bucket.started > WINDOW_MS) { bucket.started = now; bucket.count = 0 }
  bucket.count += 1; buckets.set(ip, bucket)
  if (bucket.count > LIMIT) return { allowed: false, status: 429, reason: 'rate_limit_exceeded' }
  const expected = process.env.WATCHTOWER_READ_TOKEN
  if (!publicRoute && expected) {
    const actual = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!actual || actual !== expected) return { allowed: false, status: 401, reason: 'read_token_required' }
  }
  return { allowed: true, ip }
}

export function recordAudit(req, result = {}) {
  audit.push({ at: new Date().toISOString(), method: req.method, path: req.url, ip: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'), ...result, blockchainWrite: false })
  if (audit.length > 1000) audit.shift()
}

export function auditLog() { return [...audit].reverse() }

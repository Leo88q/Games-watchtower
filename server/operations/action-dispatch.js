// ---------------------------------------------------------------------------
// Передача решений вахты исполнителю студии.
//
// Хаб ничего не исполняет сам: у него нет ключей, токенов Cloudflare или доступа к
// мультисигу. Утверждённое решение уходит подписанным вебхуком на сервер студии
// (OPERATOR_EXECUTOR_URL), который и выполняет действие. Итог студия присылает обратно
// подписанным колбэком на /api/operator/executor/result.
//
// Подпись в обе стороны одинаковая (как у отчётов игр):
//   x-watchtower-timestamp: <мс>
//   x-watchtower-signature: sha256=<hex HMAC-SHA256(OPERATOR_EXECUTOR_SECRET, "<ts>.<сырое тело>")>
//   x-watchtower-delivery:  <deliveryId>   (только исходящие; ключ идемпотентности)
// ---------------------------------------------------------------------------
import { createHmac, timingSafeEqual } from 'node:crypto'

export const EXECUTOR_MAX_SKEW_MS = 5 * 60 * 1000
export const DELIVERY_TIMEOUT_MS = 5000
// Пауза перед повтором после неудачной доставки; после последней — решение помечается
// как не доставленное и ждёт сотрудника
export const DEFAULT_RETRY_DELAYS_MS = [15e3, 30e3, 60e3, 120e3, 300e3, 600e3, 1200e3, 1800e3]
export const EXECUTOR_RESULTS = ['accepted', 'proposed', 'executed', 'failed']

let cfg = { url: null, secret: null, fetchImpl: globalThis.fetch, logger: null, retryDelays: DEFAULT_RETRY_DELAYS_MS }

/** Паузы между попытками; число пауз = число попыток до пометки «не доставлено». */
export function retryDelays() { return cfg.retryDelays }

export function configureExecutor({ env = process.env, isProduction = false, fetchImpl, logger } = {}) {
  const url = env.OPERATOR_EXECUTOR_URL || null
  const secret = env.OPERATOR_EXECUTOR_SECRET || null
  if (url) {
    let parsed
    try { parsed = new URL(url) } catch { throw new Error('OPERATOR_EXECUTOR_URL не является адресом') }
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('OPERATOR_EXECUTOR_URL: нужен http(s)')
    if (isProduction && parsed.protocol !== 'https:') throw new Error('OPERATOR_EXECUTOR_URL в продакшене должен быть https')
    if (!secret) throw new Error('Задан OPERATOR_EXECUTOR_URL, но нет OPERATOR_EXECUTOR_SECRET: решения нельзя подписать')
  }
  if (secret && secret.length < 32) throw new Error('OPERATOR_EXECUTOR_SECRET должен быть не короче 32 символов')
  let delays = DEFAULT_RETRY_DELAYS_MS
  if (env.OPERATOR_EXECUTOR_RETRY_MS) {
    delays = String(env.OPERATOR_EXECUTOR_RETRY_MS).split(',').map((x) => Number(x.trim()))
    if (!delays.length || delays.some((x) => !Number.isFinite(x) || x < 0)) throw new Error('OPERATOR_EXECUTOR_RETRY_MS: список пауз в миллисекундах через запятую')
  }
  cfg = { url, secret, fetchImpl: fetchImpl || globalThis.fetch, logger, retryDelays: delays }
  return executorStatus()
}

/** Подключён ли исполнитель. Без него решения ждут ручного исполнения сотрудником. */
export function executorStatus() {
  return { connected: Boolean(cfg.url), callbacks: Boolean(cfg.secret) }
}

export function signBody(rawBody, ts = Date.now(), secret = cfg.secret) {
  return { ts: String(ts), signature: `sha256=${createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex')}` }
}

/** Проверка колбэка студии: подпись секретом исполнителя и окно времени ±5 минут. */
export function verifyExecutorCallback({ rawBody, signature, timestamp, now = Date.now() }) {
  if (!cfg.secret) return { ok: false, status: 403, reason: 'executor_not_connected' }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > EXECUTOR_MAX_SKEW_MS) return { ok: false, status: 401, reason: 'stale_or_missing_timestamp' }
  const m = /^sha256=([0-9a-f]{64})$/i.exec(String(signature || ''))
  if (!m) return { ok: false, status: 401, reason: 'missing_signature' }
  const expected = createHmac('sha256', cfg.secret).update(`${ts}.${rawBody}`).digest()
  const given = Buffer.from(m[1], 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, status: 401, reason: 'bad_signature' }
  return { ok: true }
}

/** Причина сбоя без подробностей: адрес исполнителя и тексты его ошибок наружу не уходят. */
function failureCode(error) {
  if (error?.name === 'AbortError') return 'timeout'
  if (error?.code === 'http') return `http_${error.status}`
  if (error?.code === 'bad_response') return 'bad_response'
  return 'network'
}

/**
 * Одна попытка доставки. Возвращает { ok: true, result } или { ok: false, error }.
 * result — то, что исполнитель сообщил сразу: accepted (итог придёт колбэком), proposed,
 * executed или failed. Пустой ответ 2xx считается accepted.
 */
export async function deliverDecision(payload) {
  if (!cfg.url) return { ok: false, error: 'executor_not_connected' }
  const raw = JSON.stringify(payload)
  const { ts, signature } = signBody(raw)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), DELIVERY_TIMEOUT_MS)
  try {
    const res = await cfg.fetchImpl(cfg.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-watchtower-timestamp': ts,
        'x-watchtower-signature': signature,
        'x-watchtower-delivery': payload.deliveryId,
      },
      body: raw,
      signal: ctrl.signal,
      redirect: 'error',
    })
    if (!res.ok) throw Object.assign(new Error('http'), { code: 'http', status: res.status })
    const text = (await res.text()).slice(0, 4000)
    let reply = {}
    if (text.trim()) {
      try { reply = JSON.parse(text) } catch { throw Object.assign(new Error('bad_response'), { code: 'bad_response' }) }
    }
    const result = reply?.status ?? 'accepted'
    if (!EXECUTOR_RESULTS.includes(result)) throw Object.assign(new Error('bad_response'), { code: 'bad_response' })
    return { ok: true, result, detail: typeof reply.detail === 'string' ? reply.detail.slice(0, 300) : null }
  } catch (error) {
    const code = failureCode(error)
    cfg.logger?.warn('executor_delivery_failed', { deliveryId: payload.deliveryId, reason: code })
    return { ok: false, error: code }
  } finally {
    clearTimeout(timer)
  }
}

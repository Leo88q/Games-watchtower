/**
 * Партнёрская программа Leo Games — часть для бэкенда игры (Node.js 18+).
 *
 * Два направления:
 *  1. Игра → вахта: подписанные отчёты о прогрессе игроков (часы, ранг, код приглашения, страна).
 *     sendProgressReports() / buildProgressRequest().
 *  2. Вахта → игра: выдача наград партнёру (токены, предметы, косметика).
 *     createGrantHandler() проверяет подпись и срок, не выдаёт одну награду дважды и вызывает
 *     вашу функцию applyGrant(grant), которая начисляет награду в игре.
 *     nodeGrantListener() подключает обработчик к http.createServer или Express.
 *
 * Подпись в обе стороны одинаковая: заголовок x-watchtower-signature = "sha256=" +
 * hex(HMAC-SHA256(секрет, "<x-watchtower-timestamp>.<сырое тело запроса>")).
 * Секреты разные: GAME_PROGRESS_SECRET_<ИГРА> для отчётов и PARTNER_GRANT_SECRET_<ИГРА> для выдач.
 *
 * Без зависимостей, только node:crypto.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const KIT_GAMES = Object.freeze(['ares1', 'aof', 'guttercaps', 'neonrelay'])
export const MAX_SKEW_MS = 5 * 60 * 1000
export const MAX_REPORTS_PER_REQUEST = 500
export const MAX_GRANT_BODY_BYTES = 64 * 1024

/** "sha256=<hex>" для тела и метки времени. */
export function signBody(secret, rawBody, timestamp = Date.now()) {
  if (!secret || String(secret).length < 32) throw new Error('Секрет должен быть не короче 32 символов')
  const ts = String(timestamp)
  return { timestamp: ts, signature: `sha256=${createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex')}` }
}

/** Проверка подписи без утечки по времени. */
export function verifySignature(secret, rawBody, { timestamp, signature }, { now = Date.now(), maxSkewMs = MAX_SKEW_MS } = {}) {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > maxSkewMs) return { ok: false, reason: 'stale_or_missing_timestamp' }
  const m = /^sha256=([0-9a-f]{64})$/i.exec(String(signature || ''))
  if (!m) return { ok: false, reason: 'missing_signature' }
  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest()
  const given = Buffer.from(m[1], 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' }
  return { ok: true }
}

const header = (headers, name) => {
  if (!headers) return undefined
  if (typeof headers.get === 'function') return headers.get(name) ?? undefined
  const v = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(v) ? v[0] : v
}

// ---------------------------------------------------------------------------
// 1. Отчёты о прогрессе: игра → вахта
// ---------------------------------------------------------------------------

/**
 * Готовит запрос POST <вахта>/api/games/progress.
 * reports: [{ wallet, hours, rank, updatedAt, ref?, country? }]
 *  - hours — суммарные часы игрока в этой игре; rank — целое 0–100;
 *  - updatedAt — время, к которому относятся данные (мс). По нему вахта считает дни активности,
 *    поэтому это время игры, а не время отправки;
 *  - ref — код приглашения из ?ref= (достаточно в первом отчёте);
 *  - country — страна игрока ISO 3166-1 alpha-2, если известна (например, из заголовка CDN).
 */
export function buildProgressRequest({ game, secret, reports, now = Date.now() }) {
  if (!KIT_GAMES.includes(game)) throw new Error(`Неизвестная игра: ${game}`)
  if (!Array.isArray(reports) || !reports.length) throw new Error('Нужен хотя бы один отчёт')
  if (reports.length > MAX_REPORTS_PER_REQUEST) throw new Error(`Не больше ${MAX_REPORTS_PER_REQUEST} отчётов за запрос`)
  const clean = reports.map((r) => {
    const out = { wallet: r.wallet, hours: r.hours, rank: r.rank, updatedAt: r.updatedAt }
    if (r.ref) out.ref = String(r.ref).toUpperCase()
    if (r.country) out.country = String(r.country).toUpperCase()
    return out
  })
  const body = JSON.stringify({ reports: clean })
  const { timestamp, signature } = signBody(secret, body, now)
  return { body, headers: { 'content-type': 'application/json', 'x-watchtower-game': game, 'x-watchtower-timestamp': timestamp, 'x-watchtower-signature': signature } }
}

/**
 * Отправляет отчёты. Возвращает ответ вахты { accepted, stale, rejected: [{ index, reason }] }.
 * Бросает ошибку с полем status при ответе не 2xx (401 — подпись или часы сервера, 403 — игра
 * не подключена на вахте, 429 — слишком часто, 503 — хранилище вахты недоступно, стоит повторить).
 */
export async function sendProgressReports({ watchtowerUrl, game, secret, reports, fetchImpl = globalThis.fetch, timeoutMs = 5000 }) {
  const { body, headers } = buildProgressRequest({ game, secret, reports })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(new URL('/api/games/progress', watchtowerUrl), { method: 'POST', headers, body, signal: ctrl.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(`Вахта отклонила отчёты: ${data.error || res.status}`)
      err.status = res.status
      err.code = data.error || null
      throw err
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Страна игрока из заголовков CDN (Cloudflare, Vercel, CloudFront). Включайте trustProxy,
 * только если запросы к игре гарантированно идут через этот CDN: иначе заголовок подделывается.
 */
export function countryFromHeaders(headers, { trustProxy = false } = {}) {
  if (!trustProxy) return null
  const raw = header(headers, 'cf-ipcountry') || header(headers, 'x-vercel-ip-country') || header(headers, 'cloudfront-viewer-country')
  const cc = String(raw || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(cc) && !['XX', 'T1'].includes(cc) ? cc : null
}

// ---------------------------------------------------------------------------
// 2. Выдача наград: вахта → игра
// ---------------------------------------------------------------------------

/** Бросьте из applyGrant, если награду выдать нельзя (кошелёк неизвестен игре и т.п.). Повторов не будет. */
export class GrantRejected extends Error {
  constructor(detail = 'rejected') {
    super(detail)
    this.name = 'GrantRejected'
    this.detail = String(detail).slice(0, 200)
  }
}

const ITEM_KINDS = ['item', 'cosmetic', 'title']

/** Проверка формы полезной нагрузки выдачи. Возвращает null или причину. */
export function grantShapeError(g) {
  if (!g || typeof g !== 'object') return 'not_an_object'
  if (typeof g.grantId !== 'string' || !/^[A-Za-z0-9_-]{6,80}$/.test(g.grantId)) return 'bad_grant_id'
  if (!KIT_GAMES.includes(g.game)) return 'bad_game'
  if (typeof g.wallet !== 'string' || g.wallet.length < 3 || g.wallet.length > 64) return 'bad_wallet'
  if (!['partner_referral', 'partner_milestone'].includes(g.reason)) return 'bad_reason'
  if (g.tokens != null && !(typeof g.tokens.symbol === 'string' && Number.isFinite(g.tokens.amount) && g.tokens.amount > 0)) return 'bad_tokens'
  if (!Array.isArray(g.items)) return 'bad_items'
  for (const it of g.items) {
    if (typeof it?.id !== 'string' || !ITEM_KINDS.includes(it.kind) || !Number.isInteger(it.amount) || it.amount < 1) return 'bad_item'
  }
  return null
}

/**
 * Проверка входящей выдачи: подпись, срок, совпадение x-watchtower-grant с grantId, игра, форма.
 * Возвращает { ok: true, grant } или { ok: false, status, reason }.
 */
export function verifyGrantRequest({ secret, rawBody, headers, game = null, now = Date.now(), maxSkewMs = MAX_SKEW_MS }) {
  const sig = verifySignature(secret, rawBody, { timestamp: header(headers, 'x-watchtower-timestamp'), signature: header(headers, 'x-watchtower-signature') }, { now, maxSkewMs })
  if (!sig.ok) return { ok: false, status: 401, reason: sig.reason }
  let grant
  try { grant = JSON.parse(rawBody) } catch { return { ok: false, status: 400, reason: 'invalid_json' } }
  const shape = grantShapeError(grant)
  if (shape) return { ok: false, status: 400, reason: shape }
  if (header(headers, 'x-watchtower-grant') !== grant.grantId) return { ok: false, status: 400, reason: 'grant_header_mismatch' }
  if (game && grant.game !== game) return { ok: false, status: 400, reason: 'wrong_game' }
  return { ok: true, grant }
}

/**
 * Хранилище результатов выдач в памяти — только для разработки и тестов.
 * В продакшене нужно постоянное хранилище, где запись по grantId атомарна (например, таблица
 * с уникальным ключом grant_id), и начисление награды с записью результата — в одной транзакции.
 */
export function memoryGrantStore() {
  const map = new Map()
  return {
    async get(grantId) { return map.get(grantId) ?? null },
    async set(grantId, result) { map.set(grantId, result) },
    size: () => map.size,
  }
}

/**
 * Обработчик выдач, не привязанный к фреймворку: ({ rawBody, headers }) → { status, body }.
 *
 * applyGrant(grant) начисляет награду в игре и возвращает { reference? } (номер операции в игре,
 * его увидит сотрудник). Бросьте GrantRejected(причина), если выдать нельзя. Любая другая ошибка —
 * ответ 500, вахта повторит запрос позже с тем же grantId.
 *
 * Повтор с тем же grantId (после таймаута, перезапуска, двух экземпляров вахты) возвращает
 * сохранённый результат и не начисляет повторно. Одновременные запросы с одним grantId внутри
 * процесса ждут одно начисление; между процессами защищает атомарность вашего store.
 */
export function createGrantHandler({ secret, applyGrant, store = memoryGrantStore(), game = null, logger = null, now = () => Date.now() }) {
  if (!secret || String(secret).length < 32) throw new Error('PARTNER_GRANT_SECRET должен быть не короче 32 символов')
  if (typeof applyGrant !== 'function') throw new Error('Нужна функция applyGrant(grant)')
  const inflight = new Map()

  async function process(grant) {
    const done = await store.get(grant.grantId)
    if (done) return { status: 200, body: done }
    let result
    try {
      const r = await applyGrant(grant)
      result = { status: 'granted', reference: r?.reference != null ? String(r.reference).slice(0, 200) : null }
    } catch (error) {
      if (error instanceof GrantRejected || error?.name === 'GrantRejected') {
        result = { status: 'rejected', detail: String(error.detail ?? error.message).slice(0, 200) }
      } else {
        logger?.error?.('partner_grant_apply_failed', { grantId: grant.grantId, message: error?.message })
        return { status: 500, body: { error: 'apply_failed' } }
      }
    }
    await store.set(grant.grantId, result)
    logger?.info?.('partner_grant', { grantId: grant.grantId, status: result.status })
    return { status: 200, body: result }
  }

  return async function handleGrant({ rawBody, headers }) {
    const check = verifyGrantRequest({ secret, rawBody: String(rawBody ?? ''), headers, game, now: now() })
    if (!check.ok) {
      logger?.warn?.('partner_grant_refused', { reason: check.reason })
      return { status: check.status, body: { error: check.reason } }
    }
    const id = check.grant.grantId
    if (!inflight.has(id)) inflight.set(id, process(check.grant).finally(() => inflight.delete(id)))
    return inflight.get(id)
  }
}

/**
 * Адаптер для Node http / Express: читает сырое тело (подпись считается по нему, поэтому
 * не ставьте перед этим маршрутом express.json()), вызывает обработчик и пишет JSON-ответ.
 */
export function nodeGrantListener(handleGrant, { maxBodyBytes = MAX_GRANT_BODY_BYTES } = {}) {
  return (req, res) => {
    const send = (status, body) => {
      res.statusCode = status
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' })
    const chunks = []
    let size = 0
    let aborted = false
    req.on('data', (chunk) => {
      if (aborted) return
      size += chunk.length
      if (size > maxBodyBytes) { aborted = true; send(413, { error: 'body_too_large' }); req.destroy() }
      else chunks.push(chunk)
    })
    req.on('end', async () => {
      if (aborted) return
      try {
        const out = await handleGrant({ rawBody: Buffer.concat(chunks).toString('utf8'), headers: req.headers })
        send(out.status, out.body)
      } catch {
        send(500, { error: 'internal' })
      }
    })
  }
}

// ---------------------------------------------------------------------------
// Реальный прогресс игроков в играх студии — основа рангов вахты.
//
// Два способа получить данные (можно оба):
//  1. Игра присылает отчёты сама: POST /api/games/progress
//       x-watchtower-game: ares1 | aof | neonrelay | guttercaps
//       x-watchtower-timestamp: unix-время в миллисекундах
//       x-watchtower-signature: sha256=<hex HMAC-SHA256(секрет игры, "<timestamp>.<тело>")>
//     Тело: { "reports": [{ "wallet": "<адрес>", "hours": 12.5, "rank": 2, "updatedAt": 1760000000000 }] }
//     Секрет игры: GAME_PROGRESS_SECRET_<ИГРА>. Отчёт старше 5 минут или из будущего — отклоняется.
//  2. Вахта спрашивает игру при входе игрока: GET <GAME_PROGRESS_URL_<ИГРА>>?wallet=<адрес>
//     (необязательный токен GAME_PROGRESS_TOKEN_<ИГРА> уходит в заголовке Authorization).
//
// Чего здесь нет намеренно: никакой записи в игры. Вахта только читает прогресс.
// Если игра не подключена, её часы и ранг — нули, а не догадки.
// ---------------------------------------------------------------------------
import { createHmac, timingSafeEqual } from 'node:crypto'
import { isDemoWallet, isSolanaAddress, walletKey } from './wallet-auth.js'

export const PROGRESS_GAMES = ['ares1', 'aof', 'neonrelay', 'guttercaps']
export const REPORT_MAX_SKEW_MS = 5 * 60 * 1000
const MAX_REPORTS_PER_REQUEST = 500

let cfg = { secrets: {}, pullUrls: {}, pullTokens: {}, allowDemoWallets: false, fetchImpl: globalThis.fetch, logger: null }
let store = {} // walletKey -> { [game]: { hours, rank, updatedAt, receivedAt, via } }
let persist = () => {}

export function configureGameProgress({ env = process.env, allowDemoWallets = false, fetchImpl, logger, load, save, commit } = {}) {
  const pick = (prefix) => Object.fromEntries(PROGRESS_GAMES.map((g) => [g, env[`${prefix}${g.toUpperCase()}`] || null]).filter(([, v]) => v))
  cfg = {
    secrets: pick('GAME_PROGRESS_SECRET_'),
    pullUrls: pick('GAME_PROGRESS_URL_'),
    pullTokens: pick('GAME_PROGRESS_TOKEN_'),
    allowDemoWallets,
    fetchImpl: fetchImpl || globalThis.fetch,
    logger,
    // Применение данных к хранилищу. В operator-game это operatorWrite: запись под общей блокировкой
    commit: commit || (async (fn) => fn()),
  }
  for (const [g, s] of Object.entries(cfg.secrets)) if (s.length < 32) throw new Error(`GAME_PROGRESS_SECRET_${g.toUpperCase()} должен быть не короче 32 символов`)
  if (load) store = load() || {}
  if (save) persist = save
  return progressSources()
}

export function replaceProgressStore(data) { store = data || {} }

export function progressSources() {
  return PROGRESS_GAMES.map((game) => ({ game, push: Boolean(cfg.secrets[game]), pull: Boolean(cfg.pullUrls[game]) }))
}

export function hasConnectedGames() {
  return PROGRESS_GAMES.some((g) => cfg.secrets[g] || cfg.pullUrls[g])
}

/** Сохранённый прогресс кошелька или null, если ни одна игра о нём не сообщала. */
export function storedProgress(wallet) {
  return store[walletKey(wallet)] || null
}

// ---------------- приём отчётов от игр ----------------
export function verifyGameReport({ game, rawBody, signature, timestamp, now = Date.now() }) {
  if (!PROGRESS_GAMES.includes(game)) return { ok: false, status: 400, reason: 'unknown_game' }
  const secret = cfg.secrets[game]
  if (!secret) return { ok: false, status: 403, reason: 'game_not_connected' }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > REPORT_MAX_SKEW_MS) return { ok: false, status: 401, reason: 'stale_or_missing_timestamp' }
  const m = /^sha256=([0-9a-f]{64})$/i.exec(String(signature || ''))
  if (!m) return { ok: false, status: 401, reason: 'missing_signature' }
  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest()
  const given = Buffer.from(m[1], 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, status: 401, reason: 'bad_signature' }
  return { ok: true }
}

function validWallet(wallet) {
  return isSolanaAddress(wallet) || (cfg.allowDemoWallets && isDemoWallet(wallet))
}

function normalize(report) {
  const hours = Number(report?.hours)
  const rank = Number(report?.rank)
  const updatedAt = Number(report?.updatedAt)
  if (!validWallet(report?.wallet)) return { error: 'bad_wallet' }
  if (!Number.isFinite(hours) || hours < 0 || hours > 100000) return { error: 'bad_hours' }
  if (!Number.isInteger(rank) || rank < 0 || rank > 100) return { error: 'bad_rank' }
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return { error: 'bad_updated_at' }
  return { wallet: report.wallet, hours: Math.round(hours * 10) / 10, rank, updatedAt }
}

function apply(game, r, via, now) {
  const key = walletKey(r.wallet)
  const prev = store[key]?.[game]
  // Отчёты могут прийти не по порядку: более старый не перезаписывает более свежий
  if (prev && prev.updatedAt >= r.updatedAt) return false
  if (r.updatedAt > now + REPORT_MAX_SKEW_MS) return false
  store[key] = { ...(store[key] || {}), [game]: { hours: r.hours, rank: r.rank, updatedAt: r.updatedAt, receivedAt: now, via } }
  return true
}

export function acceptGameReports(game, body, { now = Date.now() } = {}) {
  const list = Array.isArray(body?.reports) ? body.reports : body?.wallet ? [body] : null
  if (!list) return { ok: false, status: 400, reason: 'reports_required' }
  if (list.length > MAX_REPORTS_PER_REQUEST) return { ok: false, status: 413, reason: 'too_many_reports' }
  let accepted = 0; let stale = 0
  const rejected = []
  list.forEach((raw, index) => {
    const r = normalize(raw)
    if (r.error) { rejected.push({ index, reason: r.error }); return }
    if (apply(game, r, 'push', now)) accepted += 1; else stale += 1
  })
  if (accepted) persist(store)
  cfg.logger?.info('game_progress_reports', { game, accepted, stale, rejected: rejected.length })
  return { ok: true, accepted, stale, rejected }
}

// ---------------- опрос игр при входе ----------------
export async function refreshProgress(wallet, { timeoutMs = 3000, now = Date.now() } = {}) {
  const games = Object.keys(cfg.pullUrls)
  if (!games.length || !validWallet(wallet)) return { refreshed: [], failed: [] }
  const refreshed = []; const failed = []; const results = []
  // Сеть — вне блокировки записи: медленная игра не должна задерживать голоса остальных
  await Promise.all(games.map(async (game) => {
    const url = new URL(cfg.pullUrls[game])
    url.searchParams.set('wallet', wallet)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const headers = { accept: 'application/json' }
      if (cfg.pullTokens[game]) headers.authorization = `Bearer ${cfg.pullTokens[game]}`
      const res = await cfg.fetchImpl(url, { headers, signal: ctrl.signal, redirect: 'error' })
      if (res.status === 404) { refreshed.push(game); return } // игра не знает этого игрока — это не ошибка
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const r = normalize({ ...data, wallet, updatedAt: data?.updatedAt ?? now })
      if (r.error) throw new Error(r.error)
      results.push([game, r])
      refreshed.push(game)
    } catch (error) {
      failed.push(game)
      cfg.logger?.warn('game_progress_pull_failed', { game, message: error.name === 'AbortError' ? 'timeout' : error.message })
    } finally {
      clearTimeout(timer)
    }
  }))
  if (results.length) {
    await cfg.commit(() => {
      let changed = false
      for (const [game, r] of results) changed = apply(game, r, 'pull', now) || changed
      if (changed) persist(store)
    })
  }
  return { refreshed, failed }
}

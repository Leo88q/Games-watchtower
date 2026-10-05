// ---------------------------------------------------------------------------
// Живые данные для карты. Только чтение, только относительные адреса /api/...
// Правило честности: если данных нет — планета «без сигнала» с причиной,
// цифры не подставляются и не выдумываются.
// ---------------------------------------------------------------------------
import { BODIES, bodyForGame } from './world.js'

// ---------------- сессия вахты ----------------
// Выдаётся сервером после проверки подписи кошелька. Хранится только в этом браузере.
const SESSION_KEY = 'wt-operator-session'
export const operatorSession = {
  get() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
      return s && s.token && s.expiresAt > Date.now() ? s : null
    } catch { return null }
  },
  set(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* приватный режим */ } },
  clear() { try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem('wt-operator-wallet') } catch { /* приватный режим */ } },
}
const sessionHeaders = () => { const s = operatorSession.get(); return s ? { 'x-operator-session': s.token } : {} }

async function getJson(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { accept: 'application/json', 'content-type': 'application/json', ...(options.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

const settledValue = (r) => (r.status === 'fulfilled' ? r.value : null)
const ACTIVE = ['open', 'voting', 'consensus_pending', 'approved']

export async function loadLiveWorld(wallet) {
  const [health, eco, readModel, alerts, operator] = (await Promise.allSettled([
    getJson('/api/health'),
    getJson('/api/ecosystem/status'),
    getJson('/api/read-model'),
    getJson('/api/alerts'),
    getJson(`/api/operator/state${wallet ? `?wallet=${encodeURIComponent(wallet)}` : ''}`),
  ])).map(settledValue)

  const games = readModel?.overview?.games || []
  const tenants = eco?.tenants || []
  const incidents = (operator?.incidents || []).filter((i) => ACTIVE.includes(i.status))
  const bodies = {}

  for (const body of BODIES) {
    if (body.kind !== 'planet') continue
    const game = games.find((g) => g.id === body.id) || {}
    const tenant = tenants.find((t) => t.gameId === body.id) || {}
    const level = Number(String(tenant.level || 'L0').replace('L', '')) || 0
    const hasEvents = Boolean(game.health?.ok)
    const signal = hasEvents ? (level >= 3 ? 'ok' : 'weak') : 'none'
    const players = numberOrNull(game.players)
    bodies[body.id] = {
      signal,
      signalReason: hasEvents ? null : 'Игра ещё не присылает события в обсерваторию',
      level: tenant.level || 'L0',
      levelMeaning: tenant.levelMeaning || null,
      nextStep: tenant.nextStep || null,
      stage: game.stage || tenant.stage || null,
      network: game.network || tenant.network || null,
      metrics: {
        players,
        newPlayers: numberOrNull(game.newPlayers),
        retention: game.retention ?? null,
        minted: numberOrNull(game.minted),
        burned: numberOrNull(game.burned),
        volume: numberOrNull(game.volume),
        treasury: numberOrNull(game.treasury),
      },
      activity: players ? Math.min(1, Math.log10(players + 1) / 4) : 0,
      anomalies: [],
    }
  }

  const inbox = health?.inbox || {}
  const configured = tenants.filter((t) => t.configured).length
  const hubSignal = inbox.events > 0 ? (inbox.lastEventAgeSeconds != null && inbox.lastEventAgeSeconds < 300 ? 'ok' : 'weak') : 'none'
  bodies.hub = {
    signal: health ? hubSignal : 'none',
    signalReason: !health ? 'API обсерватории недоступно' : inbox.events > 0 ? null : 'В канал приёма ещё не пришло ни одного события',
    metrics: {
      events: readModel?.overview?.eventsInWindow ?? null,
      adapters: tenants.length ? `${configured} из ${tenants.length}` : null,
      alerts: alerts?.alerts?.length ?? null,
    },
    activity: inbox.events > 0 ? 0.5 : 0,
    anomalies: [],
    detectorAlerts: alerts?.alerts || [],
  }

  for (const inc of incidents) {
    const id = bodyForGame(inc.game)
    bodies[id].anomalies.push({ ...inc, live: true })
  }

  const planetIds = BODIES.filter((b) => b.kind === 'planet').map((b) => b.id)
  return {
    mode: 'live',
    fetchedAt: new Date(),
    apiOk: Boolean(health),
    provider: health?.provider || null,
    eventsTotal: inbox.events ?? null,
    bodies,
    routes: {},
    operator: operator ? {
      allowedActions: operator.allowedActions || {},
      roles: operator.roles || {},
      leaderboard: operator.leaderboard || [],
      totalOperators: operator.totalOperators ?? 0,
      auth: operator.auth || null,
      progressSources: operator.progressSources || [],
      shift: operator.shift || null,
      clearanceRule: operator.clearanceRule || { minHours: 10, minRank: 1 },
    } : null,
    kpis: {
      planetsOnline: planetIds.filter((id) => bodies[id].signal !== 'none').length,
      planetsTotal: planetIds.length,
      events: readModel?.overview?.eventsInWindow ?? null,
      anomalies: incidents.length,
      operators: operator?.totalOperators ?? null,
    },
  }
}

async function login(wallet, signature) {
  const res = await getJson('/api/operator/auth', { method: 'POST', body: JSON.stringify(signature ? { wallet, signature } : { wallet }) })
  operatorSession.set({ token: res.token, expiresAt: res.expiresAt, mode: res.mode, wallet: res.player?.wallet || wallet })
  return res
}

export const operatorApi = {
  nonce: (wallet) => getJson('/api/operator/nonce', { method: 'POST', body: JSON.stringify({ wallet }) }),
  auth: login,
  player: (wallet) => getJson(`/api/operator/player/${encodeURIComponent(wallet)}`),
  vote: (incidentId, actionId) => getJson('/api/operator/vote', { method: 'POST', headers: sessionHeaders(), body: JSON.stringify({ incidentId, actionId }) }),
  exam: () => getJson('/api/operator/exam'),
  submitExam: (answers) => getJson('/api/operator/exam', { method: 'POST', headers: sessionHeaders(), body: JSON.stringify({ answers }) }),
  approve: (incidentId, approved) => getJson('/api/operator/approve', { method: 'POST', headers: sessionHeaders(), body: JSON.stringify({ incidentId, approved }) }),
}

function numberOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// ---------------------------------------------------------------------------
// Партнёрская программа: игроки, авторы видео и партнёры по трафику приводят новичков.
//
// Главное правило: награда — не за клики и не за регистрации, а за квалифицированного
// игрока — того, кто реально играет (часы и активные дни по данным самих игр).
// Награда сначала замораживается (holdback), затем выдаётся в игре: игровые токены,
// предметы и косметика (partner-rewards.js). Обсерватория ничего не чеканит и не переводит:
// выдачу выполняет игра по подписанному запросу или сотрудник вручную.
//
// Привязка нового игрока к партнёру — только для новичков (меньше
// PARTNER_NEW_PLAYER_MAX_HOURS часов во всех играх) и только один раз:
//  - игра передаёт код в подписанном отчёте о прогрессе (поле ref);
//  - или игрок вводит код после входа кошельком (портал /partners.html).
//
// Ошибки правил несут машинный код (error.code): портал переводит их на язык игрока.
// ---------------------------------------------------------------------------
import { randomBytes, randomUUID } from 'node:crypto'
import { walletKey } from './wallet-auth.js'
import { REWARD_GAMES, MILESTONES, DEFAULT_CATALOG, loadCatalog, loadRegions, referralBundle, milestoneBundle, grantConnected, grantRetryDelays, grantStatus } from './partner-rewards.js'

export const PARTNER_KINDS = ['player', 'creator', 'traffic']
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // без похожих 0/O и 1/I
export const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/
export const PARTNER_SECTIONS = ['partners', 'referrals', 'partner-grants']
const DAY_MS = 24 * 3600 * 1000
const ACTIVE_DAYS_KEEP = 40
const GRANT_CLAIM_MS = 60 * 1000
const OPEN_GRANT = ['pending', 'manual', 'undelivered', 'rejected']

let cfg = null
let partners = {} // code -> партнёр
let referrals = {} // walletKey приглашённого -> привязка
let grants = {} // grantId -> выдача награды
let persist = () => {}
let totalHoursOf = () => 0
let isBanned = () => false
let logger = null

const num = (env, name, def, { min = 0, max = 1e9 } = {}) => {
  if (env[name] === undefined || env[name] === '') return def
  const v = Number(env[name])
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${name}: ожидается число от ${min} до ${max}`)
  return v
}

export function configurePartners({ env = process.env, load, save, totalHours, banned, log } = {}) {
  cfg = {
    catalog: loadCatalog(env),
    regions: loadRegions(env),
    qualifyHours: num(env, 'PARTNER_QUALIFY_HOURS', 2, { max: 1000 }),
    qualifyDays: num(env, 'PARTNER_QUALIFY_DAYS', 3, { min: 1, max: 30 }),
    windowDays: num(env, 'PARTNER_WINDOW_DAYS', 30, { min: 1, max: 365 }),
    holdbackDays: num(env, 'PARTNER_HOLDBACK_DAYS', 14, { max: 180 }),
    dailyCap: num(env, 'PARTNER_DAILY_CAP', 30, { min: 1, max: 1e6 }),
    newPlayerMaxHours: num(env, 'PARTNER_NEW_PLAYER_MAX_HOURS', 2, { max: 1000 }),
    minReferrerHours: num(env, 'PARTNER_MIN_REFERRER_HOURS', 10, { max: 10000 }),
  }
  if (load) { partners = load('partners') || {}; referrals = load('referrals') || {}; grants = load('partner-grants') || {} }
  if (save) persist = save
  if (totalHours) totalHoursOf = totalHours
  if (banned) isBanned = banned
  logger = log || null
  return partnerRules()
}

/** Перечитанные из хранилища разделы (запись другого экземпляра API). */
export function replacePartnerSection(name, value) {
  if (name === 'partners') partners = value || {}
  if (name === 'referrals') referrals = value || {}
  if (name === 'partner-grants') grants = value || {}
}

function rules() {
  if (!cfg) configurePartners({ env: {} })
  return cfg
}

const publicEntry = (e, amount) => ({ id: e.id, kind: e.kind, name: e.name, ...(amount !== undefined ? { amount } : {}) })

/** Публичные правила — их видят партнёры, и по ним же считает сервер. */
export function partnerRules() {
  const c = rules()
  const connected = grantStatus()
  return {
    kinds: PARTNER_KINDS,
    qualify: { hours: c.qualifyHours, activeDays: c.qualifyDays, withinDays: c.windowDays },
    holdbackDays: c.holdbackDays,
    newPlayerMaxHours: c.newPlayerMaxHours,
    minReferrerHours: c.minReferrerHours,
    dailyCap: c.dailyCap,
    countries: c.regions.pilot,
    tokenCountries: c.regions.tokens,
    milestones: MILESTONES,
    games: Object.fromEntries(REWARD_GAMES.map((id) => {
      const g = c.catalog[id]
      return [id, {
        name: g.name, token: g.token, tokens: g.token ? g.tokens : null,
        item: publicEntry(g.item, g.item.amount), substitute: publicEntry(g.substitute),
        milestones: Object.fromEntries(MILESTONES.map((m) => [m, publicEntry(g.milestones[m])])),
        autoGrant: connected[id],
      }]
    })),
  }
}

const day = (ts) => new Date(ts).toISOString().slice(0, 10)
const short = (w) => (w && w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w)
const save = (...names) => names.forEach((n) => persist(n, n === 'partners' ? partners : n === 'referrals' ? referrals : grants))
const ruleError = (code, message, httpStatus = 409) => Object.assign(new Error(message), { code, httpStatus })
const country = (v) => (typeof v === 'string' && /^[A-Za-z]{2}$/.test(v.trim()) ? v.trim().toUpperCase() : null)

function newCode() {
  for (;;) {
    const bytes = randomBytes(8)
    const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
    if (!partners[code]) return code
  }
}

export function partnerOfWallet(wallet) {
  const key = walletKey(wallet)
  return Object.values(partners).find((p) => p.wallet === key) || null
}

export function partnerByCode(code) {
  const c = String(code || '').toUpperCase()
  return CODE_RE.test(c) ? partners[c] || null : null
}

// ---------------- вступление и настройки ----------------
/**
 * Игрок становится партнёром сразу, если сам наиграл PARTNER_MIN_REFERRER_HOURS —
 * так приглашать могут только настоящие игроки. Авторы и партнёры по трафику подают
 * заявку, её одобряет сотрудник студии. Страна — из списка пилота; seenCountry — страна
 * по данным CDN в момент заявки (для сотрудника, если не совпадает).
 */
export function joinPartners(wallet, { kind, channel, country: declared, rewardGame, seenCountry } = {}, now = Date.now()) {
  const c = rules()
  if (!PARTNER_KINDS.includes(kind)) throw ruleError('bad_kind', 'Выберите, кем вы приводите игроков: игрок, автор видео или партнёр по трафику', 400)
  const cc = country(declared)
  if (!cc || !c.regions.pilot.includes(cc)) throw ruleError('bad_country', 'Программа пока работает только в странах пилота', 400)
  if (!REWARD_GAMES.includes(rewardGame)) throw ruleError('bad_reward_game', 'Выберите игру, в которой получать награды', 400)
  const key = walletKey(wallet)
  if (isBanned(key)) throw ruleError('banned', 'Аккаунт заблокирован', 403)
  if (partnerOfWallet(key)) throw ruleError('already_partner', 'Этот кошелёк уже участвует в программе')
  const text = typeof channel === 'string' ? channel.trim().slice(0, 200) : ''
  if (kind !== 'player' && text.length < 5) throw ruleError('channel_required', 'Укажите канал или источник трафика, чтобы студия могла проверить заявку', 400)
  if (kind === 'player' && totalHoursOf(key) < c.minReferrerHours) {
    throw ruleError('not_enough_hours', `Приглашать могут игроки, наигравшие от ${c.minReferrerHours} часов в играх студии`, 403)
  }
  const code = newCode()
  partners[code] = {
    code, wallet: key, kind, channel: text || null, country: cc, seenCountry: country(seenCountry), rewardGame, createdAt: now,
    status: kind === 'player' ? 'active' : 'pending',
    review: null, decidedBy: null, decidedAt: null, milestones: {},
  }
  save('partners')
  logger?.info('partner_joined', { code, kind, country: cc, wallet: short(key) })
  return partners[code]
}

/** Игру для наград можно сменить; уже рассчитанные награды не меняются. */
export function updatePartner(wallet, { rewardGame } = {}) {
  const p = partnerOfWallet(wallet)
  if (!p) throw ruleError('not_partner', 'Вы ещё не участвуете в программе', 404)
  if (p.status === 'banned') throw ruleError('banned', 'Аккаунт заблокирован', 403)
  if (!REWARD_GAMES.includes(rewardGame)) throw ruleError('bad_reward_game', 'Выберите игру, в которой получать награды', 400)
  p.rewardGame = rewardGame
  save('partners')
  return p
}

// ---------------- привязка нового игрока ----------------
/**
 * Привязывает приглашённого к партнёру. prevHours — сколько часов у игрока было ДО
 * текущего отчёта: старых игроков «переписать» на партнёра нельзя.
 * Возвращает { ok } или { ok: false, reason }.
 */
export function bindReferral(wallet, code, { via, at = Date.now(), prevHours = null, country: cc = null } = {}) {
  const c = rules()
  const key = walletKey(wallet)
  const partner = partnerByCode(code)
  if (!partner) return { ok: false, reason: 'unknown_code' }
  if (partner.status !== 'active') return { ok: false, reason: 'partner_inactive' }
  if (referrals[key]) return { ok: false, reason: 'already_referred' }
  if (partner.wallet === key) return { ok: false, reason: 'self_referral' }
  const hours = prevHours ?? totalHoursOf(key)
  if (hours >= c.newPlayerMaxHours) return { ok: false, reason: 'not_new_player' }
  // Взаимные приглашения: A пригласил B, а B — A
  const back = referrals[partner.wallet]
  const mine = partnerOfWallet(key)
  if (back && mine && back.code === mine.code) return { ok: false, reason: 'cyclic_referral' }
  referrals[key] = {
    wallet: key, code: partner.code, via, boundAt: at, baseHours: hours, country: country(cc),
    activeDays: [], status: 'tracking', qualifiedAt: null, releaseAt: null, reward: null, grantId: null,
  }
  save('referrals')
  logger?.info('referral_bound', { code: partner.code, via, wallet: short(key) })
  return { ok: true, referral: referrals[key] }
}

const CLAIM_TEXT = {
  unknown_code: 'Такого кода приглашения нет',
  partner_inactive: 'Этот код пока не действует',
  already_referred: 'Вы уже привязаны к пригласившему',
  self_referral: 'Свой код ввести нельзя',
  not_new_player: 'Код приглашения можно ввести только новичку',
  cyclic_referral: 'Взаимные приглашения не засчитываются',
}
/** Игрок сам вводит код после входа кошельком. */
export function claimReferral(wallet, code, { now = Date.now(), country: cc = null } = {}) {
  const r = bindReferral(wallet, code, { via: 'claim', at: now, country: cc })
  if (r.ok) return r.referral
  throw ruleError(r.reason, CLAIM_TEXT[r.reason] || 'Код не принят')
}

// ---------------- квалификация по данным игр ----------------
/**
 * Вызывается при каждом изменении прогресса (под общей блокировкой записи).
 * hoursUp — прибавились ли часы; ts — время отчёта, которым его подписала игра.
 */
export function onProgress(wallet, { ts, hoursUp, ref, prevHours, game, country: cc = null }) {
  const key = walletKey(wallet)
  if (ref && !referrals[key]) {
    const res = bindReferral(key, ref, { via: `game:${game}`, at: ts, prevHours, country: cc })
    if (!res.ok) logger?.info('referral_rejected', { reason: res.reason, game })
  }
  const r = referrals[key]
  if (!r) return
  if (cc && !r.country) { r.country = country(cc); save('referrals') }
  if (r.status !== 'tracking' || !hoursUp || ts < r.boundAt) return
  const d = day(ts)
  if (!r.activeDays.includes(d)) {
    r.activeDays.push(d)
    if (r.activeDays.length > ACTIVE_DAYS_KEEP) r.activeDays.shift()
  }
  evaluate(r, ts)
  save('referrals')
}

function evaluate(r, ts) {
  const c = rules()
  if (r.status !== 'tracking') return
  if (ts > r.boundAt + c.windowDays * DAY_MS) return
  const gained = totalHoursOf(r.wallet) - r.baseHours
  if (gained < c.qualifyHours || r.activeDays.length < c.qualifyDays) return
  const partner = partners[r.code]
  r.status = 'holdback'
  r.qualifiedAt = ts
  r.releaseAt = ts + c.holdbackDays * DAY_MS
  // Состав награды фиксируется в момент квалификации: смена каталога или игры его не меняет
  r.reward = partner ? referralBundle(c.catalog, c.regions, { game: partner.rewardGame, kind: partner.kind, partnerCountry: partner.country, refereeCountry: r.country }) : null
  // Слишком много квалификаций за день — на проверку: выдача стоит до решения студии
  const today = day(ts)
  const count = Object.values(referrals).filter((x) => x.code === r.code && x.qualifiedAt && day(x.qualifiedAt) === today).length
  if (partner && count > c.dailyCap && !partner.review) {
    partner.review = { reason: 'daily_cap', at: ts, count }
    save('partners')
    logger?.warn('partner_review', { code: partner.code, reason: 'daily_cap', count })
  }
}

// ---------------- выдача ----------------
function createGrant({ type, partner, bundle, refWallet = null, milestone = null }, now) {
  const id = randomUUID()
  grants[id] = {
    id, type, code: partner.code, wallet: partner.wallet, partnerKind: partner.kind, refWallet, milestone,
    game: bundle.game, tokens: bundle.tokens, items: bundle.items, tokenBlocked: bundle.tokenBlocked,
    state: grantConnected(bundle.game) ? 'pending' : 'manual',
    attempts: 0, nextAttemptAt: now, claimUntil: null, claimedBy: null, lastError: null,
    reference: null, detail: null, createdAt: now, grantedAt: null, grantedBy: null,
  }
  return id
}

/** Достигнутые вехи (5/25/100 игроков, чья награда прошла заморозку) — косметика. */
function checkMilestones(partner, now) {
  const reached = Object.values(referrals).filter((r) => r.code === partner.code && ['payable', 'granted'].includes(r.status)).length
  let added = false
  partner.milestones = partner.milestones || {}
  for (const m of MILESTONES) {
    if (reached < m || partner.milestones[m]) continue
    partner.milestones[m] = createGrant({ type: 'milestone', partner, milestone: m, bundle: milestoneBundle(rules().catalog, { game: partner.rewardGame, milestone: m }) }, now)
    added = true
  }
  return added
}

/** Фоновая задача: истечение окна квалификации, разморозка, создание выдач и вех. */
export function partnerTick(now = Date.now()) {
  const c = rules()
  let changed = false
  const touched = new Set()
  for (const r of Object.values(referrals)) {
    if (r.status === 'tracking' && now > r.boundAt + c.windowDays * DAY_MS) { r.status = 'expired'; changed = true; continue }
    if (r.status !== 'holdback' || now < r.releaseAt) continue
    const partner = partners[r.code]
    if (isBanned(r.wallet)) { Object.assign(r, { status: 'void', voidReason: 'referee_banned', voidedAt: now }); changed = true; continue }
    if (!partner || partner.status !== 'active' || partner.review || !r.reward) continue // ждёт решения студии
    r.status = 'payable'
    r.payableAt = now
    r.grantId = createGrant({ type: 'referral', partner, bundle: r.reward, refWallet: r.wallet }, now)
    touched.add(partner)
    changed = true
  }
  for (const p of touched) checkMilestones(p, now)
  if (changed) save('referrals', 'partner-grants', 'partners')
  return changed
}

export function partnerTickDue(now = Date.now()) {
  const c = rules()
  return Object.values(referrals).some((r) =>
    (r.status === 'tracking' && now > r.boundAt + c.windowDays * DAY_MS) ||
    (r.status === 'holdback' && now >= r.releaseAt && !partners[r.code]?.review && partners[r.code]?.status === 'active'))
}

const dueGrants = (now) => Object.values(grants).filter((g) => g.state === 'pending' && g.nextAttemptAt <= now && !(g.claimUntil > now) && grantConnected(g.game))
export const hasDueGrants = (now = Date.now()) => dueGrants(now).length > 0

const grantPayload = (g) => ({
  grantId: g.id, game: g.game, wallet: g.wallet,
  reason: g.type === 'milestone' ? 'partner_milestone' : 'partner_referral',
  milestone: g.milestone, partnerKind: g.partnerKind,
  tokens: g.tokens, items: g.items.map(({ id, kind, amount }) => ({ id, kind, amount })),
  issuedAt: g.createdAt,
})

/** Под блокировкой: забрать выдачи, у которых подошло время попытки (отправит один экземпляр). */
export function claimDueGrants(instanceId, now = Date.now()) {
  const due = dueGrants(now)
  for (const g of due) { g.claimedBy = instanceId; g.claimUntil = now + GRANT_CLAIM_MS; g.attempts += 1 }
  if (due.length) save('partner-grants')
  return due.map(grantPayload)
}

/** Под блокировкой: итог попытки. Возвращает паузу до следующей попытки или null. */
export function recordGrantOutcome(grantId, outcome, now = Date.now()) {
  const g = grants[grantId]
  if (!g || g.state !== 'pending') return null
  g.claimUntil = null; g.claimedBy = null
  let retryIn = null
  if (outcome.ok && outcome.status === 'granted') markGranted(g, { reference: outcome.reference, by: 'game' }, now)
  else if (outcome.ok && outcome.status === 'rejected') { g.state = 'rejected'; g.detail = outcome.detail || null }
  else {
    g.lastError = outcome.error
    const delays = grantRetryDelays()
    if (g.attempts > delays.length) g.state = 'undelivered'
    else { retryIn = delays[g.attempts - 1]; g.nextAttemptAt = now + retryIn }
  }
  save('partner-grants', 'referrals')
  logger?.info('partner_grant', { grantId, state: g.state })
  return retryIn
}

function markGranted(g, { reference, by }, now) {
  Object.assign(g, { state: 'granted', grantedAt: now, grantedBy: by, reference: reference || g.reference || null })
  if (g.type === 'referral' && referrals[g.refWallet]?.grantId === g.id) Object.assign(referrals[g.refWallet], { status: 'granted', grantedAt: now })
}

function cancelGrant(id, now) {
  const g = grants[id]
  if (g && OPEN_GRANT.includes(g.state)) Object.assign(g, { state: 'cancelled', cancelledAt: now })
}

// ---------------- отчёты ----------------
/** Сумма наград: токены по тикерам и предметы по id. */
function aggregate(bundles) {
  const tokens = {}
  const items = {}
  for (const b of bundles) {
    if (!b) continue
    if (b.tokens) tokens[b.tokens.symbol] = (tokens[b.tokens.symbol] || 0) + b.tokens.amount
    for (const it of b.items || []) {
      items[it.id] = items[it.id] || { id: it.id, kind: it.kind, name: it.name, amount: 0 }
      items[it.id].amount += it.amount
    }
  }
  return { tokens, items: Object.values(items) }
}

function summary(code) {
  const list = Object.values(referrals).filter((r) => r.code === code)
  const by = (...s) => list.filter((r) => s.includes(r.status))
  const own = Object.values(grants).filter((g) => g.code === code)
  return {
    invited: list.length,
    tracking: by('tracking').length,
    qualified: list.filter((r) => r.qualifiedAt).length,
    holdback: by('holdback').length,
    issuing: by('payable').length,
    granted: by('granted').length,
    void: by('void').length,
    expired: by('expired').length,
    pendingRewards: aggregate([...by('holdback', 'payable').map((r) => r.reward), ...own.filter((g) => g.type === 'milestone' && OPEN_GRANT.includes(g.state))]),
    grantedRewards: aggregate(own.filter((g) => g.state === 'granted')),
  }
}

const bundleView = (b) => (b ? { game: b.game, tokens: b.tokens, items: b.items, tokenBlocked: b.tokenBlocked } : null)

function referralView(r) {
  const c = rules()
  const g = r.grantId ? grants[r.grantId] : null
  return {
    wallet: short(r.wallet), via: r.via, boundAt: r.boundAt, status: r.status,
    hours: Math.max(0, Math.round((totalHoursOf(r.wallet) - r.baseHours) * 10) / 10),
    activeDays: r.activeDays.length,
    need: { hours: c.qualifyHours, activeDays: c.qualifyDays, until: r.boundAt + c.windowDays * DAY_MS },
    qualifiedAt: r.qualifiedAt, releaseAt: r.releaseAt,
    reward: bundleView(r.reward),
    grant: g ? { state: g.state, reference: g.reference } : null,
    voidReason: r.voidReason || null,
  }
}

/** Кабинет партнёра: код, правила, сводка, приглашённые и вехи. */
export function partnerCabinet(wallet) {
  const c = rules()
  const key = walletKey(wallet)
  const partner = partnerOfWallet(key)
  const mine = referrals[key]
  return {
    rules: partnerRules(),
    partner: partner ? {
      code: partner.code, kind: partner.kind, status: partner.status, channel: partner.channel, country: partner.country,
      rewardGame: partner.rewardGame, createdAt: partner.createdAt, underReview: Boolean(partner.review),
      tokensAllowed: c.regions.tokens.includes(partner.country),
    } : null,
    summary: partner ? summary(partner.code) : null,
    milestones: partner ? MILESTONES.map((m) => {
      const g = grants[partner.milestones?.[m]]
      return { at: m, reached: Boolean(g), state: g?.state || null, reward: g ? bundleView(g) : bundleView(milestoneBundle(c.catalog, { game: partner.rewardGame, milestone: m })) }
    }) : [],
    referrals: partner
      ? Object.values(referrals).filter((r) => r.code === partner.code).sort((a, b) => b.boundAt - a.boundAt).slice(0, 50).map(referralView)
      : [],
    invitedBy: mine ? { code: mine.code, status: mine.status } : null,
    canJoinAsPlayer: !partner && totalHoursOf(key) >= c.minReferrerHours,
    canClaim: !mine && totalHoursOf(key) < c.newPlayerMaxHours,
  }
}

/** Для сотрудника: заявки, партнёры на проверке и выдачи, которые ждут человека. */
export function partnerReview() {
  const all = Object.values(partners)
  const view = (p) => ({ code: p.code, kind: p.kind, wallet: p.wallet, channel: p.channel, country: p.country, seenCountry: p.seenCountry, rewardGame: p.rewardGame, status: p.status, review: p.review, createdAt: p.createdAt, summary: summary(p.code) })
  const waiting = Object.values(grants).filter((g) => ['manual', 'undelivered', 'rejected'].includes(g.state))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((g) => ({ id: g.id, type: g.type, code: g.code, wallet: g.wallet, game: g.game, tokens: g.tokens, items: g.items, milestone: g.milestone, state: g.state, lastError: g.lastError, detail: g.detail, attempts: g.attempts, createdAt: g.createdAt, autoGrant: grantConnected(g.game) }))
  return {
    rules: partnerRules(),
    applications: all.filter((p) => p.status === 'pending').map(view),
    underReview: all.filter((p) => p.review).map(view),
    grants: waiting,
    totals: {
      partners: all.filter((p) => p.status === 'active').length,
      referrals: Object.keys(referrals).length,
      granted: Object.values(grants).filter((g) => g.state === 'granted').length,
      inFlight: Object.values(grants).filter((g) => g.state === 'pending').length,
    },
  }
}

/**
 * Решения сотрудника:
 *  approve / reject — заявка автора или партнёра по трафику;
 *  clear — снять проверку (выдача продолжится); ban — заблокировать партнёра, отменить
 *  невыданные награды; void — аннулировать одну привязку (wallet приглашённого);
 *  granted — отметить выдачу, сделанную в игре вручную (grantId, reference);
 *  retry — снова отправить игре недоставленную или отклонённую выдачу (grantId).
 */
export function decidePartner(staffWallet, { action, code, wallet, reference, reason, grantId } = {}, now = Date.now()) {
  if (action === 'granted' || action === 'retry') return decideGrant(staffWallet, { action, grantId, reference }, now)
  const p = partnerByCode(code)
  if (!p) throw ruleError('not_found', 'Партнёр не найден', 404)
  const note = typeof reason === 'string' ? reason.trim().slice(0, 200) : null
  if (action === 'approve' || action === 'reject') {
    if (p.status !== 'pending') throw ruleError('already_decided', 'Заявка уже рассмотрена')
    p.status = action === 'approve' ? 'active' : 'rejected'
  } else if (action === 'clear') {
    if (!p.review) throw ruleError('not_under_review', 'Партнёр не на проверке')
    p.review = null
  } else if (action === 'ban') {
    p.status = 'banned'
    p.review = null
    for (const r of Object.values(referrals)) {
      if (r.code !== p.code || !['tracking', 'holdback', 'payable'].includes(r.status)) continue
      Object.assign(r, { status: 'void', voidReason: note || 'partner_banned', voidedAt: now })
    }
    for (const g of Object.values(grants)) if (g.code === p.code) cancelGrant(g.id, now)
    save('referrals', 'partner-grants')
  } else if (action === 'void') {
    const r = referrals[walletKey(wallet || '')]
    if (!r || r.code !== p.code || !['tracking', 'holdback', 'payable'].includes(r.status)) throw ruleError('cannot_void', 'Эту привязку аннулировать нельзя')
    Object.assign(r, { status: 'void', voidReason: note || 'staff', voidedAt: now })
    if (r.grantId) cancelGrant(r.grantId, now)
    save('referrals', 'partner-grants')
  } else {
    throw ruleError('unknown_action', 'Неизвестное решение', 400)
  }
  p.decidedBy = staffWallet
  p.decidedAt = now
  save('partners')
  logger?.info('partner_decision', { code: p.code, action })
  return { partner: { code: p.code, status: p.status, underReview: Boolean(p.review) }, summary: summary(p.code) }
}

function decideGrant(staffWallet, { action, grantId, reference }, now) {
  const g = grants[grantId]
  if (!g) throw ruleError('grant_not_found', 'Выдача не найдена', 404)
  if (action === 'granted') {
    if (!['manual', 'undelivered', 'rejected'].includes(g.state)) throw ruleError('grant_not_open', 'Эта выдача не ждёт сотрудника')
    const ref = typeof reference === 'string' ? reference.trim().slice(0, 140) : ''
    if (ref.length < 4) throw ruleError('reference_required', 'Укажите, где сделана выдача: ссылка на транзакцию или номер операции в игре', 400)
    markGranted(g, { reference: ref, by: staffWallet }, now)
    if (g.type === 'referral') checkMilestones(partners[g.code], now)
  } else {
    if (!grantConnected(g.game)) throw ruleError('grants_not_connected', 'Игра не подключена к автоматической выдаче', 409)
    if (!['undelivered', 'rejected'].includes(g.state)) throw ruleError('grant_not_retryable', 'Повтор нужен только после неудачной выдачи')
    Object.assign(g, { state: 'pending', attempts: 0, nextAttemptAt: now, lastError: null, detail: null, claimUntil: null, claimedBy: null })
  }
  save('partner-grants', 'referrals', 'partners')
  logger?.info('partner_grant_decision', { grantId, action })
  return { grant: { id: g.id, state: g.state, reference: g.reference }, summary: summary(g.code) }
}

export { DEFAULT_CATALOG }

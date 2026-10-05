// ---------------------------------------------------------------------------
// Партнёрская программа: игроки, авторы видео и трафферы приводят новых игроков.
//
// Главное правило: платим не за клики и не за регистрации, а за квалифицированного
// игрока — того, кто реально играет (часы и активные дни по данным самих игр).
// Награда сначала замораживается (holdback) и только потом становится «к выплате».
//
// Чего здесь нет намеренно: обсерватория никому ничего не переводит. Она ведёт учёт;
// выплату делает студия и отмечает её здесь со ссылкой на перевод.
//
// Привязка нового игрока к партнёру — только для новых игроков (меньше
// PARTNER_NEW_PLAYER_MAX_HOURS часов во всех играх) и только один раз:
//  - игра передаёт код в подписанном отчёте о прогрессе (поле ref);
//  - или игрок сам вводит код в обсерватории после входа кошельком.
// ---------------------------------------------------------------------------
import { randomBytes } from 'node:crypto'
import { walletKey } from './wallet-auth.js'

export const PARTNER_KINDS = ['player', 'creator', 'traffic']
export const KIND_TEXT = { player: 'игрок', creator: 'автор видео', traffic: 'траффер' }
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // без похожих 0/O и 1/I
export const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/
const DAY_MS = 24 * 3600 * 1000
const ACTIVE_DAYS_KEEP = 40

let cfg = null
let partners = {} // code -> партнёр
let referrals = {} // walletKey приглашённого -> привязка
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
    asset: env.PARTNER_PAYOUT_ASSET || 'USDC',
    rewardCents: {
      player: num(env, 'PARTNER_REWARD_PLAYER_CENTS', 100, { max: 1e6 }),
      creator: num(env, 'PARTNER_REWARD_CREATOR_CENTS', 300, { max: 1e6 }),
      traffic: num(env, 'PARTNER_REWARD_TRAFFIC_CENTS', 200, { max: 1e6 }),
    },
    qualifyHours: num(env, 'PARTNER_QUALIFY_HOURS', 2, { max: 1000 }),
    qualifyDays: num(env, 'PARTNER_QUALIFY_DAYS', 3, { min: 1, max: 30 }),
    windowDays: num(env, 'PARTNER_WINDOW_DAYS', 30, { min: 1, max: 365 }),
    holdbackDays: num(env, 'PARTNER_HOLDBACK_DAYS', 14, { max: 180 }),
    dailyCap: num(env, 'PARTNER_DAILY_CAP', 30, { min: 1, max: 1e6 }),
    newPlayerMaxHours: num(env, 'PARTNER_NEW_PLAYER_MAX_HOURS', 2, { max: 1000 }),
    minReferrerHours: num(env, 'PARTNER_MIN_REFERRER_HOURS', 10, { max: 10000 }),
  }
  if (!/^[A-Z0-9]{2,10}$/.test(cfg.asset)) throw new Error('PARTNER_PAYOUT_ASSET: короткое имя актива, например USDC')
  if (load) { partners = load('partners') || {}; referrals = load('referrals') || {} }
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
}

function rules() {
  if (!cfg) configurePartners({ env: {} })
  return cfg
}

/** Публичные правила — их видят партнёры, и по ним же считает сервер. */
export function partnerRules() {
  const c = rules()
  return {
    asset: c.asset,
    rewards: Object.fromEntries(PARTNER_KINDS.map((k) => [k, c.rewardCents[k] / 100])),
    qualify: { hours: c.qualifyHours, activeDays: c.qualifyDays, withinDays: c.windowDays },
    holdbackDays: c.holdbackDays,
    newPlayerMaxHours: c.newPlayerMaxHours,
    minReferrerHours: c.minReferrerHours,
    dailyCap: c.dailyCap,
  }
}

const day = (ts) => new Date(ts).toISOString().slice(0, 10)
const short = (w) => (w && w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w)
const save = (...names) => names.forEach((n) => persist(n, n === 'partners' ? partners : referrals))
const ruleError = (message, httpStatus = 409) => Object.assign(new Error(message), { httpStatus })

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

// ---------------- вступление ----------------
/**
 * Игрок становится партнёром сразу, если сам наиграл PARTNER_MIN_REFERRER_HOURS —
 * так приглашать могут только настоящие игроки. Авторы и трафферы подают заявку,
 * её одобряет сотрудник студии.
 */
export function joinPartners(wallet, { kind, channel } = {}, now = Date.now()) {
  const c = rules()
  if (!PARTNER_KINDS.includes(kind)) throw ruleError('Выберите, кем вы приводите игроков: игрок, автор видео или траффер', 400)
  const key = walletKey(wallet)
  if (isBanned(key)) throw ruleError('Аккаунт заблокирован', 403)
  if (partnerOfWallet(key)) throw ruleError('Этот кошелёк уже участвует в программе')
  const text = typeof channel === 'string' ? channel.trim().slice(0, 200) : ''
  if (kind !== 'player' && text.length < 5) throw ruleError('Укажите канал или источник трафика, чтобы студия могла проверить заявку', 400)
  if (kind === 'player' && totalHoursOf(key) < c.minReferrerHours) {
    throw ruleError(`Приглашать могут игроки, наигравшие от ${c.minReferrerHours} часов в играх студии`, 403)
  }
  const code = newCode()
  partners[code] = {
    code, wallet: key, kind, channel: text || null, createdAt: now,
    status: kind === 'player' ? 'active' : 'pending',
    review: null, decidedBy: null, decidedAt: null,
  }
  save('partners')
  logger?.info('partner_joined', { code, kind, wallet: short(key) })
  return partners[code]
}

// ---------------- привязка нового игрока ----------------
/**
 * Привязывает приглашённого к партнёру. prevHours — сколько часов у игрока было ДО
 * текущего отчёта: старых игроков «переписать» на партнёра нельзя.
 * Возвращает { ok } или { ok: false, reason }.
 */
export function bindReferral(wallet, code, { via, at = Date.now(), prevHours = null } = {}) {
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
    wallet: key, code: partner.code, via, boundAt: at, baseHours: hours,
    activeDays: [], status: 'tracking', qualifiedAt: null, releaseAt: null, reward: null,
  }
  save('referrals')
  logger?.info('referral_bound', { code: partner.code, via, wallet: short(key) })
  return { ok: true, referral: referrals[key] }
}

/** Игрок сам вводит код после входа кошельком. */
export function claimReferral(wallet, code, now = Date.now()) {
  const r = bindReferral(wallet, code, { via: 'claim', at: now })
  if (r.ok) return r.referral
  const text = {
    unknown_code: 'Такого кода приглашения нет',
    partner_inactive: 'Этот код пока не действует',
    already_referred: 'Вы уже привязаны к пригласившему',
    self_referral: 'Свой код ввести нельзя',
    not_new_player: 'Код приглашения можно ввести только новичку',
    cyclic_referral: 'Взаимные приглашения не засчитываются',
  }
  throw ruleError(text[r.reason] || 'Код не принят')
}

// ---------------- квалификация по данным игр ----------------
/**
 * Вызывается при каждом изменении прогресса (под общей блокировкой записи).
 * hoursUp — прибавились ли часы; ts — время отчёта, которым его подписала игра.
 */
export function onProgress(wallet, { ts, hoursUp, ref, prevHours, game }) {
  const key = walletKey(wallet)
  if (ref && !referrals[key]) {
    const res = bindReferral(key, ref, { via: `game:${game}`, at: ts, prevHours })
    if (!res.ok) logger?.info('referral_rejected', { reason: res.reason, game })
  }
  const r = referrals[key]
  if (!r || r.status !== 'tracking' || !hoursUp || ts < r.boundAt) return
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
  r.reward = { cents: c.rewardCents[partner?.kind] ?? 0, asset: c.asset }
  // Слишком много квалификаций за день — на проверку: выплаты партнёра стоят до решения студии
  const today = day(ts)
  const count = Object.values(referrals).filter((x) => x.code === r.code && x.qualifiedAt && day(x.qualifiedAt) === today).length
  if (partner && count > c.dailyCap && !partner.review) {
    partner.review = { reason: 'daily_cap', at: ts, count }
    save('partners')
    logger?.warn('partner_review', { code: partner.code, reason: 'daily_cap', count })
  }
}

/** Фоновая задача: истечение окна квалификации и разморозка наград. */
export function partnerTick(now = Date.now()) {
  const c = rules()
  let changed = false
  for (const r of Object.values(referrals)) {
    if (r.status === 'tracking' && now > r.boundAt + c.windowDays * DAY_MS) { r.status = 'expired'; changed = true; continue }
    if (r.status !== 'holdback' || now < r.releaseAt) continue
    const partner = partners[r.code]
    if (isBanned(r.wallet)) { Object.assign(r, { status: 'void', voidReason: 'referee_banned', voidedAt: now }); changed = true; continue }
    if (!partner || partner.status !== 'active' || partner.review) continue // ждёт решения студии
    r.status = 'payable'
    r.payableAt = now
    changed = true
  }
  if (changed) save('referrals')
  return changed
}

export function partnerTickDue(now = Date.now()) {
  const c = rules()
  return Object.values(referrals).some((r) =>
    (r.status === 'tracking' && now > r.boundAt + c.windowDays * DAY_MS) ||
    (r.status === 'holdback' && now >= r.releaseAt && !partners[r.code]?.review && partners[r.code]?.status === 'active'))
}

// ---------------- отчёты ----------------
function summary(code) {
  const list = Object.values(referrals).filter((r) => r.code === code)
  const by = (s) => list.filter((r) => r.status === s)
  const cents = (s) => by(s).reduce((sum, r) => sum + (r.reward?.cents || 0), 0) / 100
  return {
    invited: list.length,
    tracking: by('tracking').length,
    qualified: list.filter((r) => r.qualifiedAt).length,
    holdback: { count: by('holdback').length, amount: cents('holdback') },
    payable: { count: by('payable').length, amount: cents('payable') },
    paid: { count: by('paid').length, amount: cents('paid') },
    void: by('void').length,
    expired: by('expired').length,
  }
}

function referralView(r) {
  const c = rules()
  return {
    wallet: short(r.wallet), via: r.via, boundAt: r.boundAt, status: r.status,
    hours: Math.max(0, Math.round((totalHoursOf(r.wallet) - r.baseHours) * 10) / 10),
    activeDays: r.activeDays.length,
    need: { hours: c.qualifyHours, activeDays: c.qualifyDays, until: r.boundAt + c.windowDays * DAY_MS },
    qualifiedAt: r.qualifiedAt, releaseAt: r.releaseAt,
    reward: r.reward ? { amount: r.reward.cents / 100, asset: r.reward.asset } : null,
    paidRef: r.paidRef || null, voidReason: r.voidReason || null,
  }
}

/** Кабинет партнёра: код, правила, сводка и последние приглашённые. */
export function partnerCabinet(wallet) {
  const key = walletKey(wallet)
  const partner = partnerOfWallet(key)
  const mine = referrals[key]
  return {
    rules: partnerRules(),
    partner: partner ? { code: partner.code, kind: partner.kind, status: partner.status, channel: partner.channel, createdAt: partner.createdAt, underReview: Boolean(partner.review) } : null,
    summary: partner ? summary(partner.code) : null,
    referrals: partner
      ? Object.values(referrals).filter((r) => r.code === partner.code).sort((a, b) => b.boundAt - a.boundAt).slice(0, 50).map(referralView)
      : [],
    invitedBy: mine ? { code: mine.code, status: mine.status } : null,
    canJoinAsPlayer: !partner && totalHoursOf(key) >= rules().minReferrerHours,
    canClaim: !mine && totalHoursOf(key) < rules().newPlayerMaxHours,
  }
}

/** Для сотрудника: заявки, партнёры на проверке и суммы к выплате. */
export function partnerReview() {
  const all = Object.values(partners)
  const view = (p) => ({ code: p.code, kind: p.kind, wallet: p.wallet, channel: p.channel, status: p.status, review: p.review, createdAt: p.createdAt, summary: summary(p.code) })
  return {
    rules: partnerRules(),
    applications: all.filter((p) => p.status === 'pending').map(view),
    underReview: all.filter((p) => p.review).map(view),
    payable: all.map(view).filter((p) => p.summary.payable.count > 0),
    totals: { partners: all.filter((p) => p.status === 'active').length, referrals: Object.keys(referrals).length },
  }
}

/**
 * Решения сотрудника:
 *  approve / reject — заявка автора или траффера;
 *  clear — снять проверку (выплаты продолжатся); ban — заблокировать партнёра и аннулировать
 *  незаплаченные награды; void — аннулировать одну привязку (wallet приглашённого);
 *  paid — отметить, что студия перевела всё «к выплате» этому партнёру (reference — ссылка на перевод).
 */
export function decidePartner(staffWallet, { action, code, wallet, reference, reason } = {}, now = Date.now()) {
  const p = partnerByCode(code)
  if (!p) throw ruleError('Партнёр не найден', 404)
  const note = typeof reason === 'string' ? reason.trim().slice(0, 200) : null
  const unpaid = () => Object.values(referrals).filter((r) => r.code === p.code && ['tracking', 'holdback', 'payable'].includes(r.status))
  if (action === 'approve' || action === 'reject') {
    if (p.status !== 'pending') throw ruleError('Заявка уже рассмотрена')
    p.status = action === 'approve' ? 'active' : 'rejected'
  } else if (action === 'clear') {
    if (!p.review) throw ruleError('Партнёр не на проверке')
    p.review = null
  } else if (action === 'ban') {
    p.status = 'banned'
    p.review = null
    for (const r of unpaid()) Object.assign(r, { status: 'void', voidReason: note || 'partner_banned', voidedAt: now })
    save('referrals')
  } else if (action === 'void') {
    const r = referrals[walletKey(wallet || '')]
    if (!r || r.code !== p.code || !['tracking', 'holdback', 'payable'].includes(r.status)) throw ruleError('Эту привязку аннулировать нельзя')
    Object.assign(r, { status: 'void', voidReason: note || 'staff', voidedAt: now })
    save('referrals')
  } else if (action === 'paid') {
    const ref = typeof reference === 'string' ? reference.trim().slice(0, 140) : ''
    if (ref.length < 4) throw ruleError('Укажите ссылку на перевод или номер платёжки', 400)
    const list = Object.values(referrals).filter((r) => r.code === p.code && r.status === 'payable')
    if (!list.length) throw ruleError('Нечего отмечать: наград к выплате нет')
    for (const r of list) Object.assign(r, { status: 'paid', paidAt: now, paidRef: ref, paidBy: staffWallet })
    save('referrals')
  } else {
    throw ruleError('Неизвестное решение', 400)
  }
  p.decidedBy = staffWallet
  p.decidedAt = now
  save('partners')
  logger?.info('partner_decision', { code: p.code, action })
  return { partner: { code: p.code, status: p.status, underReview: Boolean(p.review) }, summary: summary(p.code) }
}

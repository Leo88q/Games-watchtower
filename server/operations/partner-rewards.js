// ---------------------------------------------------------------------------
// Награды партнёрской программы: игровые токены, предметы и косметика.
//
// Обсерватория ничего не чеканит и не переводит. Награду выдаёт сама игра:
//  - если у игры задан PARTNER_GRANT_URL_<ИГРА>, сервер отправляет ей подписанный запрос
//    на выдачу (ключ идемпотентности — grantId), игра выдаёт и отвечает;
//  - иначе выдача ждёт сотрудника: он выдаёт в игре вручную и отмечает здесь ссылкой.
//
// Токены — не везде. Список стран, где партнёра можно наградить токенами, задаёт
// PARTNER_TOKEN_COUNTRIES. Великобританию туда добавить нельзя: правила FCA (PS23/6)
// запрещают бонусы «приведи друга» в криптоактивах. Там, где токены нельзя, вместо них
// выдаётся косметика (substitute) — без денежной ценности.
//
// Подпись запроса к игре — как у отчётов игр и вебхука исполнителя:
//   x-watchtower-timestamp: <мс>
//   x-watchtower-signature: sha256=<hex HMAC-SHA256(PARTNER_GRANT_SECRET_<ИГРА>, "<ts>.<сырое тело>")>
//   x-watchtower-grant:     <grantId>
// ---------------------------------------------------------------------------
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const REWARD_GAMES = ['ares1', 'aof', 'guttercaps', 'neonrelay']
export const MILESTONES = [5, 25, 100]
export const GRANT_TIMEOUT_MS = 5000
export const GRANT_RETRY_MS = [30e3, 120e3, 600e3, 1800e3, 3600e3]
// Страны, где награда токенами запрещена при любых настройках
export const TOKEN_FORBIDDEN = { GB: 'FCA PS23/6: бонусы «приведи друга» в криптоактивах запрещены' }

const n = (en, ru) => ({ en, ru })
/**
 * Каталог пилота. Количества — заглушки, их утверждает студия (файл PARTNER_REWARD_CATALOG_FILE
 * с той же структурой заменяет каталог целиком). id предметов игра сопоставляет со своими.
 */
export const DEFAULT_CATALOG = {
  ares1: {
    name: 'ARES-1',
    token: 'POTATO',
    tokens: { player: 50, creator: 150, traffic: 100 },
    item: { id: 'ares1.seed_crate', kind: 'item', name: n('Seed crate', 'Ящик семян'), amount: { player: 1, creator: 3, traffic: 2 } },
    substitute: { id: 'ares1.dome_paint_recruiter', kind: 'cosmetic', name: n('Dome paint "Recruiter"', 'Окраска купола «Вербовщик»') },
    milestones: {
      5: { id: 'ares1.pad_beacon', kind: 'cosmetic', name: n('Landing pad beacon', 'Маяк посадочной площадки') },
      25: { id: 'ares1.tuber9_drone', kind: 'cosmetic', name: n('TUBER-9 escort drone', 'Дрон сопровождения TUBER-9') },
      100: { id: 'ares1.title_phobos_pioneer', kind: 'title', name: n('Title: Phobos Pioneer', 'Звание «Первопроходец Фобоса»') },
    },
  },
  aof: {
    name: 'NeuroForge',
    token: 'MIND',
    tokens: { player: 20, creator: 60, traffic: 40 },
    item: { id: 'aof.energy_cell', kind: 'item', name: n('Energy cell', 'Энергоячейка'), amount: { player: 2, creator: 6, traffic: 4 } },
    substitute: { id: 'aof.lab_coat_mentor', kind: 'cosmetic', name: n('Lab coat "Mentor"', 'Халат «Наставник»') },
    milestones: {
      5: { id: 'aof.synapse_lamp', kind: 'cosmetic', name: n('Synapse lamp', 'Лампа «Синапс»') },
      25: { id: 'aof.bench_skin_neuron', kind: 'cosmetic', name: n('Workbench skin "Neuron"', 'Облик верстака «Нейрон»') },
      100: { id: 'aof.title_chief_engineer', kind: 'title', name: n('Title: Chief Neuroengineer', 'Звание «Главный нейроинженер»') },
    },
  },
  guttercaps: {
    name: 'GUTTERCAPS',
    // До аудита игра живёт в devnet: токен $CG там тестовый
    token: 'CG',
    tokens: { player: 30, creator: 90, traffic: 60 },
    item: { id: 'guttercaps.starter_pack_voucher', kind: 'item', name: n('Starter pack voucher', 'Купон на стартовый пак'), amount: { player: 1, creator: 2, traffic: 1 } },
    substitute: { id: 'guttercaps.tag_crew_recruiter', kind: 'cosmetic', name: n('Street tag "Crew Recruiter"', 'Тег «Вербовщик команды»') },
    milestones: {
      5: { id: 'guttercaps.spray_sticker', kind: 'cosmetic', name: n('Spray can sticker', 'Наклейка «Баллончик»') },
      25: { id: 'guttercaps.district_banner', kind: 'cosmetic', name: n('District banner', 'Знамя района') },
      100: { id: 'guttercaps.title_city_legend', kind: 'title', name: n('Title: Gutter City Legend', 'Звание «Легенда Gutter City»') },
    },
  },
  neonrelay: {
    name: 'Neon Relay',
    token: null,
    tokens: { player: 0, creator: 0, traffic: 0 },
    item: { id: 'neonrelay.race_ticket', kind: 'item', name: n('Race entry ticket', 'Билет на заезд'), amount: { player: 2, creator: 6, traffic: 4 } },
    substitute: { id: 'neonrelay.trail_recruiter', kind: 'cosmetic', name: n('Neon trail "Recruiter"', 'Неоновый след «Вербовщик»') },
    milestones: {
      5: { id: 'neonrelay.car_decal', kind: 'cosmetic', name: n('Car decal', 'Наклейка на болид') },
      25: { id: 'neonrelay.neon_rims', kind: 'cosmetic', name: n('Neon rims', 'Неоновые диски') },
      100: { id: 'neonrelay.title_relay_captain', kind: 'title', name: n('Title: Relay Captain', 'Звание «Капитан эстафеты»') },
    },
  },
}

const KINDS = ['player', 'creator', 'traffic']
const ID_RE = /^[a-z0-9_.-]{3,64}$/

function validEntry(e, where) {
  if (!e || !ID_RE.test(e.id) || !['item', 'cosmetic', 'title'].includes(e.kind) || !e.name?.en) throw new Error(`${where}: нужен id, kind (item/cosmetic/title) и name.en`)
}

/** Проверка каталога: ошибка конфигурации должна ронять старт, а не выдачу. */
export function validateCatalog(catalog) {
  for (const game of REWARD_GAMES) {
    const g = catalog[game]
    if (!g) throw new Error(`Каталог наград: нет игры ${game}`)
    if (g.token !== null && !/^[A-Z0-9]{2,10}$/.test(g.token || '')) throw new Error(`Каталог наград ${game}: token — короткий тикер или null`)
    for (const k of KINDS) {
      const t = g.tokens?.[k]
      if (!Number.isFinite(t) || t < 0 || t > 1e9) throw new Error(`Каталог наград ${game}: tokens.${k} — число от 0`)
      const a = g.item?.amount?.[k]
      if (!Number.isInteger(a) || a < 0 || a > 1000) throw new Error(`Каталог наград ${game}: item.amount.${k} — целое от 0 до 1000`)
    }
    validEntry(g.item, `Каталог наград ${game}.item`)
    validEntry(g.substitute, `Каталог наград ${game}.substitute`)
    if (g.substitute.kind === 'item') throw new Error(`Каталог наград ${game}: замена токенов — только косметика или звание`)
    for (const m of MILESTONES) validEntry(g.milestones?.[m], `Каталог наград ${game}.milestones.${m}`)
  }
  return catalog
}

export function loadCatalog(env = process.env) {
  if (!env.PARTNER_REWARD_CATALOG_FILE) return DEFAULT_CATALOG
  let parsed
  try { parsed = JSON.parse(readFileSync(env.PARTNER_REWARD_CATALOG_FILE, 'utf8')) } catch (error) {
    throw new Error(`PARTNER_REWARD_CATALOG_FILE не читается как JSON: ${error.message}`)
  }
  return validateCatalog(parsed)
}

const countries = (value, fallback) => String(value ?? fallback).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)

/** Страны пилота и страны, где допустимы токены. */
export function loadRegions(env = process.env) {
  const pilot = countries(env.PARTNER_COUNTRIES || undefined, 'PH,GB,ES,PT,MY')
  const tokens = countries(env.PARTNER_TOKEN_COUNTRIES ?? undefined, 'ES,PT')
  for (const c of [...pilot, ...tokens]) if (!/^[A-Z]{2}$/.test(c)) throw new Error(`Код страны ${c}: ожидается ISO 3166-1 alpha-2, например PH`)
  for (const c of tokens) {
    if (TOKEN_FORBIDDEN[c]) throw new Error(`PARTNER_TOKEN_COUNTRIES: ${c} указать нельзя — ${TOKEN_FORBIDDEN[c]}`)
  }
  return { pilot, tokens }
}

/**
 * Состав награды за одного квалифицированного игрока. Токены — только если и партнёр, и
 * приглашённый (когда его страна известна) в списке разрешённых; иначе косметика вместо токенов.
 */
export function referralBundle(catalog, regions, { game, kind, partnerCountry, refereeCountry }) {
  const g = catalog[game]
  const items = []
  if (g.item.amount[kind] > 0) items.push({ id: g.item.id, kind: g.item.kind, name: g.item.name, amount: g.item.amount[kind] })
  let tokens = null
  let tokenBlocked = null
  const amount = g.tokens[kind]
  if (g.token && amount > 0) {
    const allowed = regions.tokens.includes(partnerCountry) && (!refereeCountry || regions.tokens.includes(refereeCountry))
    if (allowed) tokens = { symbol: g.token, amount }
    else {
      tokenBlocked = 'region'
      items.push({ id: g.substitute.id, kind: g.substitute.kind, name: g.substitute.name, amount: 1 })
    }
  }
  return { game, tokens, items, tokenBlocked }
}

export function milestoneBundle(catalog, { game, milestone }) {
  const m = catalog[game].milestones[milestone]
  return { game, tokens: null, items: [{ id: m.id, kind: m.kind, name: m.name, amount: 1 }], tokenBlocked: null }
}

// ---------------- выдача через игру ----------------
let grantCfg = { endpoints: {}, fetchImpl: globalThis.fetch, logger: null, retryDelays: GRANT_RETRY_MS }

export function configureGrants({ env = process.env, isProduction = false, fetchImpl, logger } = {}) {
  const endpoints = {}
  for (const game of REWARD_GAMES) {
    const url = env[`PARTNER_GRANT_URL_${game.toUpperCase()}`]
    const secret = env[`PARTNER_GRANT_SECRET_${game.toUpperCase()}`]
    if (!url) continue
    let parsed
    try { parsed = new URL(url) } catch { throw new Error(`PARTNER_GRANT_URL_${game.toUpperCase()} не является адресом`) }
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error(`PARTNER_GRANT_URL_${game.toUpperCase()}: нужен http(s)`)
    if (isProduction && parsed.protocol !== 'https:') throw new Error(`PARTNER_GRANT_URL_${game.toUpperCase()} в продакшене должен быть https`)
    if (!secret || secret.length < 32) throw new Error(`PARTNER_GRANT_SECRET_${game.toUpperCase()}: нужен секрет не короче 32 символов`)
    endpoints[game] = { url, secret }
  }
  let delays = GRANT_RETRY_MS
  if (env.PARTNER_GRANT_RETRY_MS) {
    delays = String(env.PARTNER_GRANT_RETRY_MS).split(',').map((x) => Number(x.trim()))
    if (!delays.length || delays.some((x) => !Number.isFinite(x) || x < 0)) throw new Error('PARTNER_GRANT_RETRY_MS: паузы в миллисекундах через запятую')
  }
  grantCfg = { endpoints, fetchImpl: fetchImpl || globalThis.fetch, logger, retryDelays: delays }
  return grantStatus()
}

export function grantStatus() { return Object.fromEntries(REWARD_GAMES.map((g) => [g, Boolean(grantCfg.endpoints[g])])) }
export function grantConnected(game) { return Boolean(grantCfg.endpoints[game]) }
export function grantRetryDelays() { return grantCfg.retryDelays }

/**
 * Одна попытка выдачи. Игра отвечает 2xx и { status: "granted", reference? } (пустой ответ —
 * тоже granted) или { status: "rejected", detail } — например, кошелёк ей неизвестен.
 * Повтор с тем же grantId игра обязана считать уже выполненным.
 */
export async function deliverGrant(payload) {
  const ep = grantCfg.endpoints[payload.game]
  if (!ep) return { ok: false, error: 'not_connected' }
  const raw = JSON.stringify(payload)
  const ts = String(Date.now())
  const signature = `sha256=${createHmac('sha256', ep.secret).update(`${ts}.${raw}`).digest('hex')}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GRANT_TIMEOUT_MS)
  try {
    const res = await grantCfg.fetchImpl(ep.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-watchtower-timestamp': ts, 'x-watchtower-signature': signature, 'x-watchtower-grant': payload.grantId },
      body: raw,
      signal: ctrl.signal,
      redirect: 'error',
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    const text = (await res.text()).slice(0, 4000)
    let reply = {}
    if (text.trim()) { try { reply = JSON.parse(text) } catch { return { ok: false, error: 'bad_response' } } }
    const status = reply?.status ?? 'granted'
    const clip = (v) => (typeof v === 'string' ? v.slice(0, 200) : null)
    if (status === 'granted') return { ok: true, status, reference: clip(reply.reference) }
    if (status === 'rejected') return { ok: true, status, detail: clip(reply.detail) }
    return { ok: false, error: 'bad_response' }
  } catch (error) {
    const code = error?.name === 'AbortError' ? 'timeout' : 'network'
    grantCfg.logger?.warn('partner_grant_failed', { grantId: payload.grantId, reason: code })
    return { ok: false, error: code }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Партнёрская программа Leo Games — часть для страницы игры (браузер).
 *
 * Игрок приходит на сайт игры по ссылке с портала: https://игра/?lang=es&ref=K7M2Q9XA.
 * Этот модуль запоминает код приглашения (на 30 дней, первый пригласивший остаётся)
 * и выбирает язык. Код потом передаётся бэкенду игры при регистрации игрока, а бэкенд
 * отправляет его вахте в первом подписанном отчёте о прогрессе (см. server.js).
 *
 * Без зависимостей. Ничего не отправляет в сеть.
 */

export const PARTNER_LANGS = Object.freeze(['en', 'pt', 'es', 'vi', 'id', 'fil', 'ru'])
export const REF_STORAGE_KEY = 'wt-partner-ref'
export const REF_TTL_MS = 30 * 24 * 3600 * 1000
/** Тот же формат, который принимает вахта в поле ref отчёта. */
export const REF_PATTERN = /^[A-Z0-9]{4,16}$/

const safeStorage = (storage) => {
  try { return storage ?? globalThis.localStorage ?? null } catch { return null }
}

/** Нормализует код: верхний регистр, только допустимые символы, иначе null. */
export function normalizeRef(value) {
  const code = String(value ?? '').trim().toUpperCase()
  return REF_PATTERN.test(code) ? code : null
}

/** Сохранённый код приглашения, если он ещё не истёк. */
export function storedPartnerRef({ storage, now = Date.now() } = {}) {
  const s = safeStorage(storage)
  if (!s) return null
  try {
    const saved = JSON.parse(s.getItem(REF_STORAGE_KEY) || 'null')
    const code = normalizeRef(saved?.code)
    return code && Number.isFinite(saved.at) && now - saved.at < REF_TTL_MS ? code : null
  } catch { return null }
}

/** Забыть код: после того как бэкенд игры принял его при регистрации. */
export function clearPartnerRef({ storage } = {}) {
  try { safeStorage(storage)?.removeItem(REF_STORAGE_KEY) } catch { /* приватный режим */ }
}

/**
 * Разбирает ?ref= и ?lang= текущего адреса. Код сохраняется, только если другого живого кода нет:
 * награда достаётся тому, кто привёл игрока первым. Возвращает { ref, lang }:
 * ref — код, который надо передать бэкенду (сохранённый или новый), lang — язык из ссылки или null.
 * cleanUrl: убрать параметр ref из адресной строки, чтобы игрок не переслал чужой код дальше.
 */
export function capturePartnerParams({ url = globalThis.location?.href, storage, now = Date.now(), cleanUrl = false, history = globalThis.history } = {}) {
  let parsed = null
  try { parsed = new URL(url) } catch { return { ref: storedPartnerRef({ storage, now }), lang: null } }
  const fromUrl = normalizeRef(parsed.searchParams.get('ref'))
  const existing = storedPartnerRef({ storage, now })
  if (fromUrl && !existing) {
    try { safeStorage(storage)?.setItem(REF_STORAGE_KEY, JSON.stringify({ code: fromUrl, at: now })) } catch { /* приватный режим */ }
  }
  if (cleanUrl && parsed.searchParams.has('ref') && history?.replaceState) {
    parsed.searchParams.delete('ref')
    try { history.replaceState(history.state, '', parsed.pathname + parsed.search + parsed.hash) } catch { /* не критично */ }
  }
  const lang = parsed.searchParams.get('lang')
  return { ref: existing || fromUrl, lang: PARTNER_LANGS.includes(lang) ? lang : null }
}

/**
 * Язык интерфейса игры: ?lang= из ссылки, затем языки браузера, затем fallback.
 * supported — языки, которые есть в игре. Тагальский (tl) считается филиппинским (fil).
 * Малайского (ms) среди языков студии нет: он не совпадёт и уйдёт в fallback.
 */
export function pickLanguage(supported = PARTNER_LANGS, { url = globalThis.location?.href, languages = globalThis.navigator?.languages, fallback = 'en' } = {}) {
  const list = supported.map((l) => String(l).toLowerCase())
  try {
    const fromUrl = new URL(url).searchParams.get('lang')
    if (fromUrl && list.includes(fromUrl.toLowerCase())) return fromUrl.toLowerCase()
  } catch { /* нет адреса */ }
  for (const tag of languages || []) {
    let base = String(tag).toLowerCase().split('-')[0]
    if (base === 'tl') base = 'fil'
    if (base === 'in') base = 'id' // устаревший код индонезийского в старых Android
    if (list.includes(base)) return base
  }
  return list.includes(fallback) ? fallback : list[0]
}

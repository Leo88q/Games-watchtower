// ---------------------------------------------------------------------------
// Вход на вахту по подписи кошелька Solana.
//
// Схема (как «Sign-In with Solana», без сторонних библиотек):
//   1. POST /api/operator/nonce  → сервер выдаёт одноразовое сообщение с nonce (живёт 5 минут).
//   2. Кошелёк игрока подписывает это сообщение (signMessage, Ed25519). Транзакций нет,
//      доступа к средствам подпись не даёт — это сказано прямо в тексте сообщения.
//   3. POST /api/operator/auth   → сервер забирает nonce (одноразово), проверяет подпись
//      публичным ключом из адреса и выдаёт сессионный токен (HMAC, по умолчанию 12 часов).
//   4. Голос, подтверждение и экзамен принимаются только с этим токеном; кошелёк берётся
//      из токена, а не из тела запроса, поэтому проголосовать «за другого» нельзя.
// ---------------------------------------------------------------------------
import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify as cryptoVerify } from 'node:crypto'

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B58_MAP = Object.fromEntries([...B58].map((c, i) => [c, i]))

export function base58Decode(str) {
  if (typeof str !== 'string' || !str.length || str.length > 128) return null
  const bytes = []
  for (const ch of str) {
    const v = B58_MAP[ch]
    if (v === undefined) return null
    let carry = v
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8 }
  }
  for (const ch of str) { if (ch === '1') bytes.push(0); else break }
  return Buffer.from(bytes.reverse())
}

export function base58Encode(buf) {
  const bytes = [...buf]
  const digits = []
  for (const byte of bytes) {
    let carry = byte
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8
      digits[i] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0 }
  }
  let out = ''
  for (const byte of bytes) { if (byte === 0) out += '1'; else break }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]]
  return out
}

/** Публичный ключ Solana — ровно 32 байта в base58. */
export function isSolanaAddress(addr) {
  const raw = base58Decode(addr)
  return Boolean(raw && raw.length === 32)
}

/** Демо-кошельки разрешены только вне продакшена и только когда включён демо-режим. */
export function isDemoWallet(wallet) {
  return typeof wallet === 'string' && (wallet === 'test_wallet' || /^demo[\w-]{0,40}$/.test(wallet))
}

/**
 * Ключ игрока в хранилище. Адреса Solana чувствительны к регистру, поэтому хранятся как есть.
 * Демо-идентификаторы (test_wallet, demo_*) исторически приводятся к нижнему регистру.
 */
export function walletKey(wallet) {
  const w = String(wallet || '').trim()
  return isSolanaAddress(w) ? w : w.toLowerCase()
}

export const NONCE_TTL_MS = 5 * 60 * 1000

export function buildLoginMessage({ wallet, nonce, issuedAt, domain }) {
  return [
    `${domain || 'watchtower'} просит войти на вахту операторов.`,
    '',
    `Кошелёк: ${wallet}`,
    `Код входа: ${nonce}`,
    `Выдан: ${new Date(issuedAt).toISOString()}`,
    '',
    'Эта подпись только подтверждает, что кошелёк ваш.',
    'Она не создаёт транзакций и не даёт доступа к средствам.',
    '',
    // Партнёры студии — из Филиппин, Великобритании, Испании, Португалии и Малайзии
    `${domain || 'watchtower'}: sign in to Leo Games Watchtower.`,
    'This signature only proves the wallet is yours.',
    'It creates no transaction and gives no access to funds.',
  ].join('\n')
}

export function createChallenge(wallet, { domain, now = Date.now() } = {}) {
  const nonce = randomBytes(16).toString('hex')
  const message = buildLoginMessage({ wallet, nonce, issuedAt: now, domain })
  return { wallet, nonce, message, issuedAt: now, expiresAt: now + NONCE_TTL_MS }
}

/** Подпись принимается в base58 (как отдают кошельки Solana) или base64. */
export function decodeSignature(sig) {
  if (typeof sig !== 'string' || !sig) return null
  const b58 = base58Decode(sig)
  if (b58 && b58.length === 64) return b58
  try {
    const b64 = Buffer.from(sig, 'base64')
    if (b64.length === 64) return b64
  } catch { /* не base64 */ }
  return null
}

export function verifySolanaSignature(wallet, message, signature) {
  const pub = base58Decode(wallet)
  const sig = decodeSignature(signature)
  if (!pub || pub.length !== 32 || !sig) return false
  try {
    const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: pub.toString('base64url') }, format: 'jwk' })
    return cryptoVerify(null, Buffer.from(message, 'utf8'), key, sig)
  } catch {
    return false
  }
}

// ---------------- сессии ----------------
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
let sessionSecret = null

export function configureSessions({ secret, isProduction }) {
  if (secret && secret.length < 32) throw new Error('OPERATOR_SESSION_SECRET должен быть не короче 32 символов')
  if (!secret && isProduction) throw new Error('OPERATOR_SESSION_SECRET обязателен в продакшене: без него сессии вахты нельзя проверить')
  sessionSecret = secret || randomBytes(32).toString('hex')
  return { ephemeral: !secret }
}

function sign(payload) {
  if (!sessionSecret) configureSessions({ secret: process.env.OPERATOR_SESSION_SECRET, isProduction: process.env.NODE_ENV === 'production' })
  return createHmac('sha256', sessionSecret).update(payload).digest('base64url')
}

export function issueSession(wallet, { mode = 'signature', now = Date.now(), ttlMs = SESSION_TTL_MS } = {}) {
  const exp = now + ttlMs
  const payload = `v1.${Buffer.from(wallet, 'utf8').toString('base64url')}.${exp}.${mode === 'demo' ? 'd' : 's'}`
  return { token: `${payload}.${sign(payload)}`, expiresAt: exp, mode }
}

export function verifySession(token, { now = Date.now() } = {}) {
  if (typeof token !== 'string' || token.length > 400) return null
  const parts = token.split('.')
  if (parts.length !== 5 || parts[0] !== 'v1') return null
  const payload = parts.slice(0, 4).join('.')
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(parts[4])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  const exp = Number(parts[2])
  if (!Number.isFinite(exp) || exp < now) return null
  let wallet
  try { wallet = Buffer.from(parts[1], 'base64url').toString('utf8') } catch { return null }
  return { wallet, expiresAt: exp, mode: parts[3] === 'd' ? 'demo' : 'signature' }
}

/**
 * Сессия игрока едет в отдельном заголовке: Authorization может быть занят read-токеном API.
 */
export const SESSION_HEADER = 'x-operator-session'
export function sessionToken(req) {
  const v = req.headers?.[SESSION_HEADER]
  return typeof v === 'string' && v ? v.trim() : null
}

/**
 * Session Keys — локальная модель для UI/API Watchtower, НЕ кошелёк и НЕ signing service.
 * Приватные ключи никогда не создаются и не хранятся здесь. Все ответы явно simulated.
 *
 * Защитные свойства:
 *  - bearer-секрет генерируется CSPRNG, в памяти хранится только SHA-256 отпечаток;
 *  - секрет выдаётся только в ответе на create и никогда не возвращается list/get;
 *  - исключены lookup по bearer в URL, чтобы не утекать в access logs/referrer;
 *  - scope закрытый: нужны точные targetProgram + allowlisted instruction;
 *  - предел сессий и чистка expired/revoked записей снижают риск memory DoS.
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { anonymizeIdentifier } from '../../security/pii.js'

export const SESSION_KEYS_CONFIG = Object.freeze({
  defaultTopUpLamports: 10_000_000,
  defaultExpiryMinutes: 60,
  maxExpiryMinutes: 24 * 60,
  minExpiryMinutes: 5,
  maxTopUpLamports: 100_000_000,
  maxSessions: 10_000,
  maxTransactionBytes: 64 * 1024,
})

const sessions = new Map() // sessionId -> public session record
const tokenIndex = new Map() // sha256(bearer) -> sessionId; bearer itself is never retained

function tokenDigest(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

function cleanExpired(now = Date.now()) {
  for (const [sessionId, session] of sessions) {
    if (session.status !== 'active' || Date.parse(session.expiresAt) <= now) {
      sessions.delete(sessionId)
      if (session.tokenDigest) tokenIndex.delete(session.tokenDigest)
    }
  }
}

function publicSession(session) {
  if (!session) return null
  const { tokenDigest: _tokenDigest, ...safe } = session
  return safe
}

export function createSession({ targetProgramPublicKey, topUpLamports, expiryInMinutes, walletAddress, gameId } = {}) {
  if (typeof targetProgramPublicKey !== 'string' || !targetProgramPublicKey.trim() || targetProgramPublicKey.length > 64) {
    throw new Error('targetProgramPublicKey must be a non-empty public-key string')
  }
  if (typeof walletAddress !== 'string' || !walletAddress.trim() || walletAddress.length > 128) {
    throw new Error('walletAddress must be a non-empty identifier')
  }
  const topUp = topUpLamports === undefined ? SESSION_KEYS_CONFIG.defaultTopUpLamports : topUpLamports
  const expiry = expiryInMinutes === undefined ? SESSION_KEYS_CONFIG.defaultExpiryMinutes : expiryInMinutes
  if (!Number.isSafeInteger(topUp) || topUp < 1_000_000 || topUp > SESSION_KEYS_CONFIG.maxTopUpLamports) {
    throw new Error(`topUpLamports must be an integer in [1000000, ${SESSION_KEYS_CONFIG.maxTopUpLamports}]`)
  }
  if (!Number.isSafeInteger(expiry) || expiry < SESSION_KEYS_CONFIG.minExpiryMinutes || expiry > SESSION_KEYS_CONFIG.maxExpiryMinutes) {
    throw new Error(`expiryInMinutes must be an integer in [${SESSION_KEYS_CONFIG.minExpiryMinutes}, ${SESSION_KEYS_CONFIG.maxExpiryMinutes}]`)
  }
  if (gameId !== undefined && (typeof gameId !== 'string' || gameId.length > 64)) throw new Error('gameId is invalid')

  cleanExpired()
  if (sessions.size >= SESSION_KEYS_CONFIG.maxSessions) throw new Error('session_capacity_reached')

  // High-entropy capability, returned once to the caller. Only its hash is stored server-side.
  const sessionToken = randomBytes(32).toString('base64url')
  const digest = tokenDigest(sessionToken)
  const sessionId = randomUUID()
  const now = Date.now()
  const session = {
    sessionId,
    tokenDigest: digest,
    walletAlias: anonymizeIdentifier(walletAddress),
    // This is deliberately not a real Solana key; the client must generate the actual keypair.
    temporaryPublicKey: `simulated:${randomUUID()}`,
    targetProgram: targetProgramPublicKey,
    topUpLamports: topUp,
    topUpSol: topUp / 1_000_000_000,
    expiryInMinutes: expiry,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + expiry * 60_000).toISOString(),
    gameId: gameId || 'unknown',
    status: 'active',
    scope: {
      allowedPrograms: [targetProgramPublicKey],
      maxLamportsPerTx: 1_000_000,
      allowedInstructions: ['game_action', 'move', 'craft', 'harvest', 'play'],
      deniedInstructions: ['withdraw_treasury', 'update_authority', 'mint_unlimited'],
    },
    writes: false,
    simulated: true,
    dataQuality: 'partial',
  }
  sessions.set(sessionId, session)
  tokenIndex.set(digest, sessionId)

  // Do not persist this response or expose the token through list/get endpoints.
  return { ...publicSession(session), sessionToken }
}

function sessionForToken(sessionToken) {
  if (typeof sessionToken !== 'string' || sessionToken.length < 32 || sessionToken.length > 128) return null
  const digest = tokenDigest(sessionToken)
  const sessionId = tokenIndex.get(digest)
  if (!sessionId) return null
  const session = sessions.get(sessionId)
  if (!session) return null
  // Constant-time comparison protects against future changes to the index implementation.
  if (!safeEqual(session.tokenDigest, digest)) return null
  if (Date.parse(session.expiresAt) <= Date.now()) {
    sessions.delete(sessionId)
    tokenIndex.delete(digest)
    return null
  }
  return session
}

export function getSession(sessionId) {
  if (typeof sessionId !== 'string') return null
  cleanExpired()
  return publicSession(sessions.get(sessionId))
}

export function revokeSession(sessionToken, { reason } = {}) {
  const session = sessionForToken(sessionToken)
  if (!session) return { revoked: false, reason: 'not_found_or_expired' }
  session.status = 'revoked'
  session.revokedAt = new Date().toISOString()
  session.revokeReason = typeof reason === 'string' ? reason.slice(0, 120) : 'user_request'
  tokenIndex.delete(session.tokenDigest)
  return { revoked: true, sessionId: session.sessionId }
}

export function listSessions({ walletAddress, gameId, status } = {}) {
  cleanExpired()
  let list = [...sessions.values()]
  if (walletAddress) {
    const alias = anonymizeIdentifier(walletAddress)
    list = list.filter((session) => session.walletAlias === alias)
  }
  if (gameId) list = list.filter((session) => session.gameId === gameId)
  if (status) list = list.filter((session) => session.status === status)
  return list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(publicSession)
}

/**
 * Policy-only simulation. This function does not parse, sign, submit, or echo transaction bytes.
 * Actual authorization must be enforced on-chain by the target program, not by this mock API.
 */
export function signAndSendTransaction({ sessionToken, transaction, targetProgram, instruction, lamports = 0 } = {}) {
  const session = sessionForToken(sessionToken)
  if (!session) return { ok: false, simulated: true, blockchainWrite: false, error: 'session_not_found_or_expired' }
  if (session.status !== 'active') return { ok: false, simulated: true, blockchainWrite: false, error: `session_${session.status}` }
  if (targetProgram !== session.targetProgram) return { ok: false, simulated: true, blockchainWrite: false, error: 'program_not_allowed_in_session_scope' }
  if (!session.scope.allowedInstructions.includes(instruction) || session.scope.deniedInstructions.includes(instruction)) {
    return { ok: false, simulated: true, blockchainWrite: false, error: 'instruction_not_allowed_in_session_scope' }
  }
  if (!Number.isSafeInteger(lamports) || lamports < 0 || lamports > session.scope.maxLamportsPerTx) {
    return { ok: false, simulated: true, blockchainWrite: false, error: 'transaction_amount_out_of_scope' }
  }
  if (transaction !== undefined) {
    if (typeof transaction !== 'string' || transaction.length > SESSION_KEYS_CONFIG.maxTransactionBytes * 2) {
      return { ok: false, simulated: true, blockchainWrite: false, error: 'transaction_payload_invalid' }
    }
  }

  return {
    ok: true,
    simulated: true,
    blockchainWrite: false,
    note: 'Policy simulation only: Watchtower does not sign or send. The target on-chain program must enforce authorization.',
    sessionId: session.sessionId,
    targetProgram: session.targetProgram,
    instruction,
    amountLamports: lamports,
    dataQuality: 'partial',
    writes: false,
  }
}

export function sessionKeysHealth() {
  cleanExpired()
  return {
    layer: 'session-keys',
    configured: false,
    simulated: true,
    activeSessions: [...sessions.values()].filter((session) => session.status === 'active').length,
    totalSessions: sessions.size,
    config: SESSION_KEYS_CONFIG,
    security: {
      signingEnabled: false,
      privateKeysStored: false,
      scopeEnforcedByThisService: false,
      scopeSimulationOnly: true,
      bearerStoredAsHash: true,
    },
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

export function sessionKeysConfig() {
  return {
    layer: 'session-keys',
    mode: 'simulation-only',
    warning: 'Not a wallet, signer, or transaction relay. Never use this API as an authorization oracle.',
    api: {
      createSession: 'POST /api/session-keys/create (returns one-time simulated bearer)',
      simulate: 'POST /api/session-keys/sign (policy check only; requires targetProgram + instruction)',
      revoke: 'POST /api/session-keys/revoke (requires bearer)',
      list: 'GET /api/session-keys/list (redacted; no bearer tokens)',
    },
    bounds: SESSION_KEYS_CONFIG,
    dataQuality: 'partial',
    writes: false,
  }
}

export function resetSessionsForTests() {
  sessions.clear()
  tokenIndex.clear()
}

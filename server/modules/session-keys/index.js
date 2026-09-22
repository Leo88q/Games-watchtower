/**
 * Session Keys — временные ключи как JWT для Web3
 * API: createSession(targetProgramPublicKey, topUp, expiryInMinutes)
 *      signAndSendTransaction
 *
 * Интеграция: доступна в Solana Unity SDK из коробки, поддерживает пользовательские программы
 * Риски ограничены: только временный keypair + 0.01 SOL
 */

import { randomUUID } from 'node:crypto'

export const SESSION_KEYS_CONFIG = {
  defaultTopUpLamports: 10_000_000, // 0.01 SOL
  defaultExpiryMinutes: 60,
  maxExpiryMinutes: 24 * 60, // 24h
  minExpiryMinutes: 5,
  maxTopUpLamports: 100_000_000, // 0.1 SOL max
}

const sessions = new Map() // sessionToken -> session

export function createSession({ targetProgramPublicKey, topUpLamports, expiryInMinutes, walletAddress, gameId } = {}) {
  if (!targetProgramPublicKey) throw new Error('targetProgramPublicKey required')
  if (!walletAddress) throw new Error('walletAddress required')

  const topUp = Math.min(
    Math.max(topUpLamports || SESSION_KEYS_CONFIG.defaultTopUpLamports, 1_000_000),
    SESSION_KEYS_CONFIG.maxTopUpLamports
  )
  const expiry = Math.min(
    Math.max(expiryInMinutes || SESSION_KEYS_CONFIG.defaultExpiryMinutes, SESSION_KEYS_CONFIG.minExpiryMinutes),
    SESSION_KEYS_CONFIG.maxExpiryMinutes
  )

  // Генерируется временная пара ключей на клиенте, здесь только токен-модель (server never sees private key)
  const sessionId = randomUUID()
  const temporaryPublicKey = `sess_${sessionId.slice(0, 8)}_${Date.now().toString(36)}` // placeholder, client generates real keypair
  const now = Date.now()
  const expiresAt = new Date(now + expiry * 60 * 1000).toISOString()

  const session = {
    sessionId,
    sessionToken: `sess_tok_${Buffer.from(`${walletAddress}:${sessionId}:${now}`).toString('base64url')}`,
    walletAddress,
    temporaryPublicKey,
    targetProgram: targetProgramPublicKey,
    topUpLamports: topUp,
    topUpSol: topUp / 1_000_000_000,
    expiryInMinutes: expiry,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    gameId: gameId || 'unknown',
    status: 'active',
    scope: {
      // Ограниченная область действия
      allowedPrograms: [targetProgramPublicKey],
      maxLamportsPerTx: 1000000,
      allowedInstructions: ['game_action', 'move', 'craft', 'harvest', 'play'], // no treasury withdraw
      deniedInstructions: ['withdraw_treasury', 'update_authority', 'mint_unlimited'],
    },
    risk: {
      maxLoss: `${topUp / 1_000_000_000} SOL`,
      note: 'В худшем случае атака затрагивает только временный keypair и средства на нём',
    },
    writes: false, // Watchtower only tracks, client signs
    dataQuality: 'partial',
  }

  sessions.set(session.sessionToken, session)
  return session
}

export function getSession(sessionToken) {
  if (!sessionToken) return null
  const s = sessions.get(sessionToken)
  if (!s) return null
  if (new Date(s.expiresAt).getTime() < Date.now()) {
    s.status = 'expired'
    return s
  }
  return s
}

export function revokeSession(sessionToken, { reason } = {}) {
  const s = sessions.get(sessionToken)
  if (!s) return { revoked: false, reason: 'not_found' }
  s.status = 'revoked'
  s.revokedAt = new Date().toISOString()
  s.revokeReason = reason || 'user_request'
  return { revoked: true, sessionId: s.sessionId }
}

export function listSessions({ walletAddress, gameId, status } = {}) {
  let list = [...sessions.values()]
  if (walletAddress) list = list.filter(s => s.walletAddress === walletAddress)
  if (gameId) list = list.filter(s => s.gameId === gameId)
  if (status) list = list.filter(s => s.status === status)
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function signAndSendTransaction({ sessionToken, transaction, targetProgram } = {}) {
  // This is a mock of what happens client-side in Unity SDK:
  // sessionKeys.signAndSendTransaction подписывает транзакции, не раскрывая приватный ключ основного кошелька
  const session = getSession(sessionToken)
  if (!session) return { ok: false, error: 'session_not_found' }
  if (session.status !== 'active') return { ok: false, error: `session_${session.status}` }
  if (targetProgram && !session.scope.allowedPrograms.includes(targetProgram)) {
    return { ok: false, error: 'program_not_allowed_in_session_scope' }
  }

  return {
    ok: true,
    sessionId: session.sessionId,
    temporaryPublicKey: session.temporaryPublicKey,
    walletAddress: session.walletAddress,
    // Client would actually sign here
    simulation: {
      signedBy: 'session_key',
      mainWalletNotExposed: true,
      gasPaidFrom: 'session_topup',
      topUpRemaining: session.topUpLamports - 5000, // mock fee
    },
    transaction: transaction || 'base64_tx_placeholder',
    dataQuality: 'partial',
    writes: false,
  }
}

export function sessionKeysHealth(env = process.env) {
  const active = [...sessions.values()].filter(s => s.status === 'active').length
  return {
    layer: 'session-keys',
    configured: true, // always available, no external dependency
    activeSessions: active,
    totalSessions: sessions.size,
    config: SESSION_KEYS_CONFIG,
    unitySdk: {
      available: true,
      integration: 'Solana.Unity-SDK из коробки',
      methods: ['createSession', 'signAndSendTransaction', 'revokeSession'],
    },
    security: {
      isolation: 'Временный keypair изолирован, max loss = topUp',
      scopeLimited: true,
      autoExpiry: true,
    },
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

export function sessionKeysConfig() {
  return {
    layer: 'session-keys',
    api: {
      createSession: 'createSession(targetProgramPublicKey, topUp, expiryInMinutes)',
      signAndSend: 'signAndSendTransaction(sessionToken, transaction)',
      revoke: 'revokeSession(sessionToken)',
    },
    unity: {
      package: 'com.solana.unity-sdk',
      example: `
var session = await SessionKeys.CreateSession(
  targetProgramPublicKey: new PublicKey("GameProgram111..."),
  topUp: 0.01f, // SOL
  expiryInMinutes: 60
);
var tx = await session.SignAndSendTransaction(instruction);
`,
    },
    web: {
      package: '@solana/kit + custom session-keys',
      example: `
const session = await createSession({
  targetProgramPublicKey: gameProgramId,
  topUp: 0.01 * LAMPORTS_PER_SOL,
  expiryInMinutes: 60
});
const signed = await signAndSendTransaction(session.sessionToken, tx);
`,
    },
    dataQuality: 'partial',
    writes: false,
  }
}

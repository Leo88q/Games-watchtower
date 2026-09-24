/**
 * Altude — gasless relay, альтернатива FirstStep
 * Используется как fallback relay для транзакций
 */

export const PROVIDER_ID = 'altude'

export function altudeConfig(env = process.env) {
  return {
    provider: PROVIDER_ID,
    apiKeyConfigured: Boolean(env.ALTUDE_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    endpoint: env.ALTUDE_ENDPOINT || 'https://api.altude.io',
    configured: Boolean(env.ALTUDE_API_KEY),
    features: {
      gaslessRelay: true,
      feeAbstraction: true,
      batching: true,
    },
    relay: {
      type: 'gasless',
      feePayer: 'altude-fee-payer',
      sponsorshipPolicy: 'studio-pays',
    }
  }
}

export function buildAltudeRelayRequest({ transaction, userWallet, gameId, sessionKey } = {}) {
  return {
    provider: PROVIDER_ID,
    gameId,
    userWallet,
    sessionKey: sessionKey || null,
    transaction: transaction || null, // base64 encoded
    relay: {
      feePayer: 'studio',
      policy: 'gasless',
      maxFeeLamports: 10000,
    },
    writes: false, // Watchtower never signs, only prepares
    dataQuality: 'partial',
  }
}

export function altudeHealth(env = process.env) {
  const cfg = altudeConfig(env)
  return {
    provider: PROVIDER_ID,
    configured: cfg.configured,
    writes: false,
    capabilities: ['gasless_relay', 'fee_abstraction'],
    requiredEnv: ['ALTUDE_API_KEY'],
    missingEnv: cfg.configured ? [] : ['ALTUDE_API_KEY'],
    sessionKeys: true,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
  }
}

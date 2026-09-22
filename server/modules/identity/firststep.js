/**
 * FirstStep SDK — гостевой режим + спонсорство газа
 * Критично для онбординга: игрок начинает без кошелька, без SOL
 */

export const PROVIDER_ID = 'firststep'

export function firststepConfig(env = process.env) {
  return {
    provider: PROVIDER_ID,
    apiKey: env.FIRSTSTEP_API_KEY || null,
    projectId: env.FIRSTSTEP_PROJECT_ID || null,
    configured: Boolean(env.FIRSTSTEP_API_KEY),
    features: {
      guestMode: true,
      gasSponsorship: true,
      progressiveOnboarding: true,
      sessionKeys: true,
    },
    sponsorship: {
      // Gasless: FirstStep pays fee, studio reimburses via API
      maxLamportsPerUser: 10000000, // 0.01 SOL default session topup
      allowedPrograms: [], // will be filled from studio config
    }
  }
}

export function buildGuestWallet({ gameId, deviceId, ipHash } = {}) {
  return {
    provider: PROVIDER_ID,
    gameId,
    deviceIdHash: deviceId ? `sha256:${deviceId}` : null,
    ipHash: ipHash || null,
    isGuest: true,
    walletType: 'ephemeral-guest',
    // Guest wallet is created client-side, backed by FirstStep
    // Later can be upgraded to Privy/Phantom via linkAccount
    upgradePath: ['privy', 'phantom-connect'],
    sponsorship: {
      enabled: true,
      sponsor: 'firststep-relay',
      limitLamports: 10000000,
    },
    createdAt: new Date().toISOString(),
    dataQuality: 'partial',
  }
}

export function firststepHealth(env = process.env) {
  const cfg = firststepConfig(env)
  return {
    provider: PROVIDER_ID,
    configured: cfg.configured,
    writes: false, // sponsorship is via relay, not direct writes from Watchtower
    capabilities: ['guest_mode', 'gas_sponsorship', 'progressive_upgrade'],
    requiredEnv: ['FIRSTSTEP_API_KEY'],
    missingEnv: cfg.configured ? [] : ['FIRSTSTEP_API_KEY'],
    sessionKeys: true,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
  }
}

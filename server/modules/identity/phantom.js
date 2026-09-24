/**
 * Phantom Connect Kit — OAuth-login, мгновенное создание кошелька
 * Fallback + primary for crypto-native users
 */

export const PROVIDER_ID = 'phantom-connect'

export function phantomConfig(env = process.env) {
  return {
    provider: PROVIDER_ID,
    appId: env.PHANTOM_APP_ID || null,
    apiKeyConfigured: Boolean(env.PHANTOM_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.PHANTOM_APP_ID || env.PHANTOM_API_KEY),
    chainType: 'solana',
    features: {
      oauthLogin: true,
      instantWallet: true,
      deepLinks: true,
      mobileWalletAdapter: true,
      embedded: true,
    },
    connectKit: {
      package: '@phantom/connect-kit',
      methods: ['connect', 'signMessage', 'signTransaction', 'signAndSendTransaction'],
    },
    sessionKeysCompatible: true,
  }
}

export function buildPhantomAuthUrl({ redirectUrl, gameId, scope = 'auth' } = {}) {
  const base = 'https://connect.phantom.app'
  const params = new URLSearchParams({
    app_url: redirectUrl || `https://${gameId}.watchtower.studio`,
    scope,
    cluster: process.env.SOLANA_CLUSTER || 'mainnet-beta',
  })
  return `${base}?${params.toString()}`
}

export function normalizePhantomUser(connectResult) {
  if (!connectResult) return null
  return {
    provider: PROVIDER_ID,
    walletAddress: connectResult.publicKey || connectResult.address,
    phantomUserId: connectResult.userId || null,
    isGuest: false,
    authMethod: 'phantom-oauth',
    createdAt: new Date().toISOString(),
    dataQuality: 'complete',
  }
}

export function phantomHealth(env = process.env) {
  const cfg = phantomConfig(env)
  return {
    provider: PROVIDER_ID,
    configured: cfg.configured,
    writes: false,
    capabilities: ['oauth_login', 'instant_wallet', 'deep_link', 'mwa'],
    requiredEnv: ['PHANTOM_APP_ID'],
    missingEnv: cfg.configured ? [] : ['PHANTOM_APP_ID'],
    sessionKeys: true,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
  }
}

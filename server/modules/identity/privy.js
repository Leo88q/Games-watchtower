/**
 * Privy — React SDK adapter for Watchtower OS
 * Provides: useCreateWallet, useSolanaWallets, email/social login, secure enclave export
 * Docs: https://docs.privy.io
 */
export const PROVIDER_ID = 'privy'

export function privyConfig(env = process.env) {
  return {
    provider: PROVIDER_ID,
    appId: env.PRIVY_APP_ID || null,
    clientId: env.PRIVY_CLIENT_ID || null,
    configured: Boolean(env.PRIVY_APP_ID),
    chainType: 'solana',
    features: {
      embeddedWallets: true,
      socialLogin: ['email', 'google', 'twitter', 'discord', 'apple'],
      secureEnclave: true,
      export: true,
      mfa: true,
    },
    hooks: ['useCreateWallet', 'useSolanaWallets', 'usePrivy', 'useLogin'],
    jwksUrl: 'https://auth.privy.io/api/v1/apps/${appId}/jwks.json',
    // Session Keys compatibility: Privy wallet can sign session token creation
    sessionKeysCompatible: true,
  }
}

export function normalizePrivyUser(privyUser) {
  if (!privyUser) return null
  return {
    provider: PROVIDER_ID,
    privyDid: privyUser.id || null,
    walletAddress: privyUser.wallet?.address || privyUser.linkedAccounts?.find(a => a.type === 'wallet')?.address || null,
    solanaWallets: (privyUser.linkedAccounts || []).filter(a => a.chainType === 'solana').map(a => ({
      address: a.address,
      walletClient: a.walletClient || 'privy',
      imported: a.imported || false,
    })),
    email: privyUser.email?.address || null,
    isGuest: false,
    createdAt: privyUser.createdAt || new Date().toISOString(),
    dataQuality: 'complete',
  }
}

export function buildPrivyCreateWalletPayload({ userId, chain = 'solana' } = {}) {
  return {
    chainType: chain,
    // Privy SDK: useCreateWallet() automatically creates Solana wallet on first login
    // For server-side we store mapping userId -> wallet
    userId,
    additionalChains: [],
    // secure enclave: keys stored in Privy's HSM, export possible via usePrivy().exportWallet()
    storage: 'privy-hsm-enclave',
    exportable: true,
  }
}

export function privyHealth(env = process.env) {
  const cfg = privyConfig(env)
  return {
    provider: PROVIDER_ID,
    configured: cfg.configured,
    writes: false,
    capabilities: ['create_wallet', 'email_login', 'social_login', 'export', 'solana_sign'],
    requiredEnv: ['PRIVY_APP_ID'],
    missingEnv: cfg.configured ? [] : ['PRIVY_APP_ID'],
    sessionKeys: cfg.sessionKeysCompatible,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
  }
}

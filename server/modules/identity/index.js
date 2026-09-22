/**
 * Unified Identity Layer — Watchtower OS
 * Aggregates Privy + Phantom Connect + FirstStep + Altude
 *
 * Architecture from user brief:
 * 1. Общий слой идентификации: Privy или embedded-кошелек + Session Keys для всех 4 игр
 *
 * Flow:
 * Guest (FirstStep) -> Embedded (Privy) -> Native (Phantom) -> Linked (cross-game)
 */

import { privyConfig, privyHealth, buildPrivyCreateWalletPayload, normalizePrivyUser } from './privy.js'
import { phantomConfig, phantomHealth, buildPhantomAuthUrl, normalizePhantomUser } from './phantom.js'
import { firststepConfig, firststepHealth, buildGuestWallet } from './firststep.js'
import { altudeConfig, altudeHealth, buildAltudeRelayRequest } from './altude.js'

export const IDENTITY_PROVIDERS = ['privy', 'phantom-connect', 'firststep', 'altude']

export function identityLayerConfig(env = process.env) {
  const privy = privyConfig(env)
  const phantom = phantomConfig(env)
  const firststep = firststepConfig(env)
  const altude = altudeConfig(env)

  return {
    layer: 'identity',
    providers: { privy, phantom, firststep, altude },
    configuredCount: [privy, phantom, firststep, altude].filter(p => p.configured).length,
    totalProviders: 4,
    // Onboarding strategy: guest -> embedded -> native
    onboardingFlow: [
      { step: 1, provider: 'firststep', action: 'guest_wallet', description: 'Игрок заходит без кошелька, получает gasless гостевой кошелек' },
      { step: 2, provider: 'privy', action: 'create_embedded', description: 'При первом входе через email/social автоматически создается Solana-кошелек в enclave' },
      { step: 3, provider: 'phantom-connect', action: 'oauth_or_connect', description: 'Crypto-native пользователи логинятся через Phantom OAuth' },
      { step: 4, provider: 'altude', action: 'gasless_relay', description: 'Все последующие транзакции идут через gasless relay' },
    ],
    crossGame: {
      enabled: true,
      pda: 'studio_user_profile', // Anchor PDA for cross-game inventory
      linking: 'wallet_link_proof', // proof that guest wallet upgraded
    },
    writes: false,
    dataQuality: [privy, phantom, firststep, altude].some(p => p.configured) ? 'partial' : 'unavailable',
  }
}

export function identityHealth(env = process.env) {
  return {
    layer: 'identity',
    generatedAt: new Date().toISOString(),
    providers: {
      privy: privyHealth(env),
      phantom: phantomHealth(env),
      firststep: firststepHealth(env),
      altude: altudeHealth(env),
    },
    summary: identityLayerConfig(env),
    writes: false,
  }
}

export function createUnifiedWallet({ provider = 'privy', userId, gameId, deviceId, email, authMethod } = {}) {
  switch (provider) {
    case 'privy':
      return buildPrivyCreateWalletPayload({ userId, chain: 'solana' })
    case 'phantom-connect':
      return { provider, authUrl: buildPhantomAuthUrl({ gameId }), userId, gameId }
    case 'firststep':
      return buildGuestWallet({ gameId, deviceId })
    case 'altude':
      return buildAltudeRelayRequest({ userWallet: userId, gameId })
    default:
      return buildGuestWallet({ gameId, deviceId })
  }
}

export function normalizeUser({ provider, rawUser }) {
  switch (provider) {
    case 'privy': return normalizePrivyUser(rawUser)
    case 'phantom-connect': return normalizePhantomUser(rawUser)
    case 'firststep': return rawUser // already normalized
    case 'altude': return rawUser
    default: return rawUser
  }
}

// Multi-tenant: tenant = gameId, but wallet is cross-game
export function tenantIdentity({ gameId, walletAddress, sessionKey } = {}) {
  return {
    tenant: gameId,
    walletAddress,
    sessionKey: sessionKey || null,
    crossGameProfilePda: walletAddress ? `studio_profile_${walletAddress.slice(0, 8)}` : null,
    dataQuality: walletAddress ? 'partial' : 'unavailable',
    writes: false,
  }
}

export const IDENTITY_API_ROUTES = [
  { method: 'GET', path: '/api/identity/config', handler: 'identityLayerConfig' },
  { method: 'GET', path: '/api/identity/health', handler: 'identityHealth' },
  { method: 'POST', path: '/api/identity/wallet', handler: 'createUnifiedWallet' },
  { method: 'GET', path: '/api/identity/tenant/:gameId', handler: 'tenantIdentity' },
]

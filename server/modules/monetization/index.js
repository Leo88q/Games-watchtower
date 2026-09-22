/**
 * Monetization Layer — Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool
 * Ideal free stack, deduplicated
 */

import { accessProtocolSetup, accessProtocolHealth, ACCESS_PROTOCOL_CONFIG } from './access-protocol.js'
import { idosgamesWalletSetup, idosgamesWalletHealth, IDOSGAMES_WALLET_CONFIG } from './idosgames-wallet.js'

export function monetizationLayerConfig(env = process.env) {
  const access = accessProtocolSetup({ gameId: 'generic' })
  const idosgames = idosgamesWalletSetup({ gameId: 'generic' })

  return {
    layer: 'monetization',
    protocols: {
      access: ACCESS_PROTOCOL_CONFIG,
      idosgames: IDOSGAMES_WALLET_CONFIG,
    },
    setups: { access, idosgames },
    idealFreeStack: {
      category: 'monetization and DeFi',
      bestFree: [
        { tool: 'Access Protocol', why: 'Free stake-to-access model Solana sustainable income developers communities, new way generate sustainable income via staking for access', cost: 'free', useFor: 'stake-to-access sustainable income' },
        { tool: '@idosgames/wallet', why: 'Free SDK bridge browser/mobile wallets EVM and Solana move tokens NFTs in/out, custom program RewardPool deposits withdrawals SPL tokens', cost: 'free', useFor: 'bridge EVM Solana RewardPool' },
      ],
      complementary: 'Access Protocol stake-to-access + idosgames bridge EVM Solana RewardPool + GameShift USD 170+ + Gamba betting provably fair = full monetization coverage, not competitive',
      vsExisting: 'GameShift USD 170+ 100% chargeback vs Access stake-to-access vs Gamba betting vs idosgames bridge — each distinct, keep all, best free Access + idosgames',
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function monetizationHealth(env = process.env) {
  return {
    layer: 'monetization',
    generatedAt: new Date().toISOString(),
    access: accessProtocolHealth(env),
    idosgames: idosgamesWalletHealth(env),
    summary: monetizationLayerConfig(env).idealFreeStack,
    writes: false,
  }
}

export { ACCESS_PROTOCOL_CONFIG, IDOSGAMES_WALLET_CONFIG }
export { accessProtocolSetup, idosgamesWalletSetup }

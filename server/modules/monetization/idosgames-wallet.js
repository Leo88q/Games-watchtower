/**
 * @idosgames/wallet — SDK for bridge between browser/mobile wallets (EVM and Solana) with ability to move tokens and NFTs into game and out. Includes custom Solana program RewardPool for deposits and withdrawals SPL tokens
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const IDOSGAMES_WALLET_CONFIG = {
  sdk: '@idosgames/wallet',
  type: 'bridge browser/mobile wallets EVM and Solana',
  purpose: 'Bridge between browser/mobile wallets EVM and Solana with ability to move tokens and NFTs into game and out, custom Solana program RewardPool for deposits and withdrawals SPL tokens',
  features: ['bridge browser/mobile wallets', 'EVM and Solana', 'move tokens NFTs in/out', 'custom program RewardPool', 'deposits withdrawals SPL tokens', 'Solana'],
  install: 'npm i @idosgames/wallet',
  repo: 'https://github.com/idosgames/wallet-sdk',
  program: 'RewardPool',
  free: true,
  comparison: {
    vsRace: 'RACE Protocol multichain infra secure fair game bundles account management vs @idosgames/wallet bridge browser/mobile wallets EVM Solana RewardPool deposits withdrawals SPL — RACE broader multichain abstraction game bundles fairness, idosgames specific bridge wallet RewardPool, complementary, RACE for game bundles, idosgames for wallet bridge RewardPool, both free, keep both but note distinct',
    vsGameShift: 'GameShift USD payments vs idosgames wallet bridge EVM Solana RewardPool — GameShift for USD, idosgames for EVM Solana bridge',
  }
}

export function idosgamesWalletSetup({ gameId = 'generic' } = {}) {
  return {
    sdk: IDOSGAMES_WALLET_CONFIG.sdk,
    gameId,
    install: IDOSGAMES_WALLET_CONFIG.install,
    purpose: IDOSGAMES_WALLET_CONFIG.purpose,
    program: IDOSGAMES_WALLET_CONFIG.program,
    usage: {
      bridgeIn: `idosgames.bridgeIn({ walletEvm, walletSolana, token, amount, gameId: '${gameId}' }) // move tokens NFTs into game`,
      bridgeOut: `idosgames.bridgeOut({ walletSolana, walletEvm, token, amount }) // move out`,
      rewardPool: `RewardPool program deposits withdrawals SPL tokens`,
    },
    bestFree: true,
    category: 'payments bridge',
  }
}

export function idosgamesWalletHealth() {
  return { configured: dependencyInstalled('@idosgames/wallet'),
    configurationReason: 'Пакет @idosgames/wallet не установлен', sdk: IDOSGAMES_WALLET_CONFIG.sdk, free: true, bestFree: true, category: 'payments bridge' }
}

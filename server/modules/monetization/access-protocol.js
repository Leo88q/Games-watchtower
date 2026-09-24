/**
 * Access Protocol — integrates into game ecosystem Solana model stake-to-access (staking for access). Gives developers and communities new way to generate sustainable income
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const ACCESS_PROTOCOL_CONFIG = {
  protocol: 'access-protocol',
  type: 'stake-to-access',
  purpose: 'Integrates into game ecosystem Solana model stake-to-access staking for access, sustainable income for developers communities',
  features: ['stake-to-access', 'staking for access', 'sustainable income', 'Solana', 'community', 'developers'],
  install: 'npm i @access-protocol/sdk',
  repo: 'https://github.com/Access-Protocol/access-protocol',
  free: true,
  comparison: {
    vsGameShift: 'GameShift USD 170+ 100% chargeback gas abstraction vs Access Protocol stake-to-access sustainable income — GameShift for USD payments, Access for stake-to-access, complementary',
    vsGamba: 'Gamba betting casino provably fair vs Access Protocol stake-to-access — Gamba for betting, Access for staking access, complementary',
  }
}

export function accessProtocolSetup({ gameId = 'generic' } = {}) {
  return {
    protocol: ACCESS_PROTOCOL_CONFIG.protocol,
    gameId,
    install: ACCESS_PROTOCOL_CONFIG.install,
    purpose: ACCESS_PROTOCOL_CONFIG.purpose,
    usage: {
      stakeToAccess: `access.stakeToAccess({ gameId: '${gameId}', wallet, amount }) // stake to access game content`,
      sustainableIncome: `access for developers communities sustainable income via staking`,
    },
    bestFree: true,
    category: 'monetization',
  }
}

export function accessProtocolHealth() {
  return { configured: dependencyInstalled('@access-protocol/sdk'),
    configurationReason: 'Пакет @access-protocol/sdk не установлен', protocol: ACCESS_PROTOCOL_CONFIG.protocol, free: true, bestFree: true, category: 'monetization' }
}

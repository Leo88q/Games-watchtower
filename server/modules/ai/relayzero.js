/**
 * relayzero — TypeScript SDK for network agent economy RelayZero, allowing integration of agents into game processes
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const RELAYZERO_CONFIG = {
  sdk: 'relayzero',
  type: 'agent economy network',
  purpose: 'Network agent economy RelayZero, integrating agents into game processes',
  features: ['agent economy', 'RelayZero network', 'integrating agents into game processes', 'TypeScript SDK', 'Solana'],
  install: 'npm i relayzero-sdk',
  repo: 'https://github.com/relayzero/relayzero-sdk',
  free: true,
  comparison: {
    vsRitArena: 'RitArena arena lifecycle retry events vs relayzero agent economy network — RitArena for arena management, relayzero for agent economy integration, complementary',
    vsHusks: 'Husks autobattler vs relayzero agent economy — Husks for autobattler fighters, relayzero for economy network, complementary',
    vsStealthSDK: 'StealthSDK framework AI-games token STEALTH economy vs relayzero agent economy network — StealthSDK framework centralized economy, relayzero decentralized agent economy network, complementary',
  }
}

export function relayzeroSetup({ gameId = 'generic' } = {}) {
  return {
    sdk: RELAYZERO_CONFIG.sdk,
    gameId,
    install: RELAYZERO_CONFIG.install,
    purpose: RELAYZERO_CONFIG.purpose,
    usage: {
      integrateAgent: `relayzero.integrateAgent({ gameId: '${gameId}', agent, process: 'harvest' }) // agent into game process`,
      economy: `relayzero economy network — agents trade, collaborate`,
    },
    bestFree: true,
    category: 'ai-agents',
  }
}

export function relayzeroHealth() {
  return { configured: dependencyInstalled('relayzero'),
    configurationReason: 'Пакет relayzero не установлен', sdk: RELAYZERO_CONFIG.sdk, free: true, bestFree: true, category: 'ai-agents' }
}

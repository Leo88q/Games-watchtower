/**
 * MagicBlock Ephemeral Rollups — суб-10 мс исполнение и gasless UX
 * Аккаунты делегируются в ER, транзакции идут туда, затем состояние возвращается на Solana
 * Есть Magic Actions для автоматического исполнения по триггерам
 */

export const MAGICBLOCK_CONFIG = {
  provider: 'magicblock',
  product: 'Ephemeral Rollups',
  performance: 'sub-10ms execution',
  ux: 'gasless',
  features: {
    ephemeralRollups: true,
    accountDelegation: true,
    stateCommitment: true,
    magicActions: true, // auto execution by triggers
  },
  endpoints: {
    mainnet: 'https://api.mainnet.magicblock.app',
    devnet: 'https://api.devnet.magicblock.app',
    rpc: 'https://rpc.magicblock.app',
  }
}

export function magicBlockErConfig({ gameId, env = process.env } = {}) {
  return {
    component: 'Ephemeral Rollup',
    provider: 'magicblock',
    gameId,
    description: 'Суб-10 мс исполнение и gasless UX. Аккаунты делегируются в ER, транзакции идут туда, затем состояние возвращается на Solana',
    flow: [
      { step: 1, action: 'delegate_account', description: 'Аккаунт делегируется в ER' },
      { step: 2, action: 'execute_in_er', description: 'Транзакции идут в ER, <10ms' },
      { step: 3, action: 'commit_state', description: 'Состояние возвращается на Solana' },
    ],
    performance: {
      latency: 'sub-10ms',
      gasless: true,
      tps: 'high',
    },
    configured: Boolean(env.MAGICBLOCK_API_KEY),
    writes: false,
  }
}

export function magicBlockActionsConfig(env = process.env) {
  return {
    component: 'Magic Actions',
    provider: 'magicblock',
    description: 'Автоматическое исполнение по триггерам',
    triggers: [
      { type: 'time', example: 'every 5 minutes harvest crops' },
      { type: 'account_change', example: 'when player level up, auto grant reward' },
      { type: 'custom', example: 'when match ends, settle rewards' },
    ],
    example: {
      action: {
        name: 'autoHarvest',
        trigger: { type: 'time', cron: '*/5 * * * *' },
        instruction: 'harvest_all_ready_fields',
        targetProgram: 'GameProgram111...',
      }
    },
    configured: Boolean(env.MAGICBLOCK_API_KEY),
    writes: false,
  }
}

export function magicBlockConfig(env = process.env) {
  return {
    provider: 'magicblock',
    apiKeyConfigured: Boolean(env.MAGICBLOCK_API_KEY), // значение ключа наружу не отдаётся: только факт наличия
    configured: Boolean(env.MAGICBLOCK_API_KEY),
    endpoints: MAGICBLOCK_CONFIG.endpoints,
    components: {
      ephemeralRollup: magicBlockErConfig({ env }),
      magicActions: magicBlockActionsConfig(env),
    },
    useCases: ['casual games with gasless UX', 'high-frequency but low-value actions', 'auto-execution'],
    writes: false,
  }
}

export function magicBlockHealth(env = process.env) {
  const cfg = magicBlockConfig(env)
  return {
    provider: 'magicblock',
    layer: 'l2',
    configured: cfg.configured,
    components: cfg.components,
    performance: 'sub-10ms + gasless',
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

/**
 * REPLA — фреймворк L3-роллапов с CLI (repla-cli)
 * Settle-слой — Anchor-программа на Solana mainnet, runtime — MagicBlock sequencer
 * SDK для Unity/Unreal/Godot
 */

export const REPLA_CONFIG = {
  provider: 'repla',
  type: 'L3 rollup framework',
  settlement: 'Anchor program on Solana mainnet',
  runtime: 'MagicBlock sequencer',
  cli: 'repla-cli',
  sdks: ['Unity', 'Unreal', 'Godot'],
}

export function replaCliConfig(env = process.env) {
  return {
    provider: 'repla-cli',
    configured: Boolean(env.REPLA_API_KEY || env.REPLA_ENDPOINT),
    cli: 'repla-cli',
    commands: {
      init: 'repla init --game <gameId>',
      start: 'repla start --grid <gridId>',
      deploy: 'repla deploy --network mainnet',
      logs: 'repla logs --follow',
      status: 'repla status',
    },
    endpoint: env.REPLA_ENDPOINT || 'https://api.repla.io',
    writes: false,
  }
}

export function replaRollupConfig({ gameId, env = process.env } = {}) {
  return {
    provider: 'repla',
    gameId,
    type: 'L3',
    settlementLayer: {
      type: 'Anchor program',
      network: 'Solana mainnet',
      program: env.REPLA_SETTLE_PROGRAM_ID || null,
    },
    runtime: {
      type: 'MagicBlock sequencer',
      latency: '<10ms',
      gasless: true,
    },
    cli: replaCliConfig(env),
    sdks: REPLA_CONFIG.sdks,
    suitableFor: 'casual games, turn-based, low-frequency economy',
    configured: Boolean(env.REPLA_API_KEY),
    writes: false,
  }
}

export function replaHealth(env = process.env) {
  const cfg = replaRollupConfig({ env })
  return {
    provider: 'repla',
    layer: 'l2',
    configured: cfg.configured,
    settlement: cfg.settlementLayer,
    runtime: cfg.runtime,
    cli: cfg.cli,
    writes: false,
    dataQuality: cfg.configured ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
  }
}

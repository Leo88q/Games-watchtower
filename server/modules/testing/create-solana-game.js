/**
 * create-solana-game — template for quick start that immediately sets up Jest, Mocha and Bankrun for testing game programs
 * NOTE: Duplicate of solana-game-preset (official starter Solana Foundation npx preset Anchor JS Unity scaffold)
 * Analysis: solana-game-preset is official starter, includes Anchor JS Unity scaffold rapid prototyping, better free official. create-solana-game is similar template Jest Mocha Bankrun testing.
 * Ideal free stack picks solana-game-preset as scaffold (best free official) + Solana SLAM as testing framework (best free testing LiteSVM Anchor Mocha). Deprecate create-solana-game as duplicate.
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const CREATE_SOLANA_GAME_CONFIG = {
  template: 'create-solana-game',
  type: 'template quick start',
  purpose: 'Quick start template sets up Jest Mocha Bankrun for testing game programs',
  stack: ['Jest', 'Mocha', 'Bankrun'],
  features: ['quick start', 'Jest', 'Mocha', 'Bankrun', 'testing'],
  install: 'npx create-solana-game',
  repo: 'https://github.com/solana-developers/create-solana-game',
  free: true,
  duplicate: true,
  duplicateOf: 'solana-game-preset',
  comparison: {
    vsPreset: 'solana-game-preset official starter Solana Foundation npx preset Anchor JS Unity scaffold rapid prototyping vs create-solana-game template Jest Mocha Bankrun — duplicate, both scaffold, preset is official better free, deprecate create-solana-game',
    vsSlam: 'create-solana-game Jest Mocha Bankrun vs Solana SLAM LiteSVM Anchor Mocha — SLAM more modern LiteSVM better free testing, pick SLAM',
  }
}

export function createSolanaGameSetup({ gameId = 'generic' } = {}) {
  return {
    template: CREATE_SOLANA_GAME_CONFIG.template,
    gameId,
    install: CREATE_SOLANA_GAME_CONFIG.install,
    purpose: CREATE_SOLANA_GAME_CONFIG.purpose,
    stack: CREATE_SOLANA_GAME_CONFIG.stack,
    duplicate: true,
    duplicateOf: 'solana-game-preset',
    recommendation: 'Use solana-game-preset as scaffold (official best free) + Solana SLAM as testing framework (best free LiteSVM)',
    bestFree: false,
    category: 'testing',
    deprecated: true,
  }
}

export function createSolanaGameHealth() {
  return { configured: false,
    configurationReason: 'Пресет заменён на solana-game-preset', template: CREATE_SOLANA_GAME_CONFIG.template, free: true, duplicate: true, deprecated: true, bestFree: false, category: 'testing', recommendation: 'Use solana-game-preset + Solana SLAM instead' }
}

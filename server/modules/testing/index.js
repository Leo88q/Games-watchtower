/**
 * Testing Layer — Solana SLAM + create-solana-game (duplicate analysis)
 * Ideal free stack per category
 */

import { solanaSlamSetup, solanaSlamHealth, SOLANA_SLAM_CONFIG } from './solana-slam.js'
import { createSolanaGameSetup, createSolanaGameHealth, CREATE_SOLANA_GAME_CONFIG } from './create-solana-game.js'

export function testingLayerConfig(env = process.env) {
  const slam = solanaSlamSetup({ gameId: 'generic' })
  const createGame = createSolanaGameSetup({ gameId: 'generic' })

  return {
    layer: 'testing',
    frameworks: {
      slam: SOLANA_SLAM_CONFIG,
      createSolanaGame: CREATE_SOLANA_GAME_CONFIG,
    },
    setups: { slam, createGame },
    idealFreeStack: {
      category: 'testing and simulation',
      bestFree: [
        { tool: 'Solana SLAM', why: 'Free framework simplifying modular tests Solana programs stack Solana LiteSVM Anchor Mocha, more modern LiteSVM, best free testing', cost: 'free', stack: ['Solana','LiteSVM','Anchor','Mocha'] },
      ],
      complementary: 'solana-game-preset (official starter scaffold Anchor JS Unity) for scaffold + Solana SLAM (LiteSVM Anchor Mocha) for testing = ideal free stack, not competitive',
      deprecated: [
        { tool: 'create-solana-game', why: 'Template Jest Mocha Bankrun quick start, duplicate of solana-game-preset official starter, both scaffold, preset official better free, deprecate create-solana-game', duplicateOf: 'solana-game-preset', recommendation: 'Use solana-game-preset as scaffold + Solana SLAM as testing' },
      ],
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function testingHealth(env = process.env) {
  return {
    layer: 'testing',
    generatedAt: new Date().toISOString(),
    slam: solanaSlamHealth(env),
    createSolanaGame: createSolanaGameHealth(env),
    summary: testingLayerConfig(env).idealFreeStack,
    writes: false,
  }
}

export { SOLANA_SLAM_CONFIG, CREATE_SOLANA_GAME_CONFIG }
export { solanaSlamSetup, createSolanaGameSetup }

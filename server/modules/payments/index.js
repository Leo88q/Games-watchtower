/**
 * Payments Layer — Solana Game API Rust + GameShift USD
 */

import { solanaGameApiRustSetup, solanaGameApiRustHealth, SOLANA_GAME_API_RUST_CONFIG } from './solana-game-api-rust.js'

export function paymentsLayerConfig(env = process.env) {
  const rustApi = solanaGameApiRustSetup({ gameId: 'generic' })
  return {
    layer: 'payments',
    providers: {
      rustApi: SOLANA_GAME_API_RUST_CONFIG,
      gameshift: { provider: 'gameshift', usd: true, countries: '170+', chargeback: '100%', gas: 'GameShift pays' },
    },
    strategy: {
      highPerformanceBackend: 'Solana Game API Rust — Rust Actix Web create game join calculate withdraw Swagger — reference for high-performance backend',
      usdPayments: 'GameShift — USD 170+ countries 100% chargeback gas abstraction',
      gasless: 'FirstStep guest gas sponsorship + Altude gasless relay + MagicBlock ER gasless + GameShift gas abstraction',
    },
    setups: { rustApi },
    writes: false,
    dataQuality: 'partial',
  }
}

export function paymentsHealth(env = process.env) {
  return {
    layer: 'payments',
    generatedAt: new Date().toISOString(),
    rustApi: solanaGameApiRustHealth(env),
    summary: paymentsLayerConfig(env),
    writes: false,
  }
}

export { SOLANA_GAME_API_RUST_CONFIG }
export { solanaGameApiRustSetup }

/**
 * Sentio CLI — AST scanner security for Solana/Anchor programs, finds common vulnerability patterns in Rust source
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'
export const SENTIO_CLI_CONFIG = {
  tool: 'sentio-cli',
  type: 'AST scanner security',
  purpose: 'Scan Rust source for common vulnerability patterns',
  features: ['AST scanning', 'Rust source', 'Anchor patterns', 'common vulns', 'CI integration'],
  install: 'cargo install sentio-cli OR npm i -g @sentio/cli',
  repo: 'https://github.com/sentioxyz/sentio-cli',
  free: true,
  comparison: {
    vsSecuritySkill: 'Security Skill AI instructions systematic audit vs Sentio CLI AST scanner static — complementary, Sentio is tool-based static, Skill is AI prompt-based',
    vsSolGuard: 'Sentio CLI AST scanner vs SolGuard AI auto audit 130+ patterns — Sentio static AST, SolGuard AI 130+ patterns, complementary',
  }
}

export function sentioCliSetup({ gameId = 'generic' } = {}) {
  return {
    tool: SENTIO_CLI_CONFIG.tool,
    gameId,
    install: SENTIO_CLI_CONFIG.install,
    purpose: SENTIO_CLI_CONFIG.purpose,
    commands: [
      'sentio scan --program ./programs/cross_game_inventory',
      'sentio scan --program ./programs/session_keys --severity high',
      'sentio audit --anchor --report json',
    ],
    ci: 'sentio scan --ci --fail-on high',
    bestFree: true,
    category: 'security',
  }
}

export function sentioCliHealth() {
  return { configured: false,
    configurationReason: 'CLI sentio не установлен', tool: SENTIO_CLI_CONFIG.tool, free: true, bestFree: true, category: 'security' }
}

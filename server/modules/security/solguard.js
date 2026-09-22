/**
 * SolGuard / SolShield — AI tools for automatic audit Solana smart contracts, checking 130+ vulnerability patterns (signer checks, rights bypass, flash-loan exploits)
 */
export const SOLGUARD_CONFIG = {
  tool: 'solguard',
  alternatives: ['solshield'],
  type: 'AI auto audit',
  purpose: 'Automatic audit Solana smart contracts 130+ vulnerability patterns',
  patterns: 130,
  checks: ['signer checks', 'rights bypass', 'flash-loan exploits', 'PDA validation', 'CPI injection', 'reentrancy', 'overflow', 'access control', 'account confusions'],
  install: 'npm i -g solguard OR cargo install solguard',
  repo: 'https://github.com/solguard/solguard',
  free: true,
  freeTier: '130+ patterns free',
  comparison: {
    vsSentio: 'Sentio CLI AST scanner static patterns vs SolGuard AI auto audit 130+ patterns — SolGuard more comprehensive AI, Sentio more static AST, complementary, SolGuard best free AI audit',
    vsSecuritySkill: 'Security Skill prompt-based AI instructions vs SolGuard tool-based AI auto audit — complementary, Skill for Claude, SolGuard for CLI',
    vsSolShield: 'SolGuard vs SolShield — similar AI audit 130+ patterns, SolGuard more established, pick SolGuard as best free, SolShield alternative',
  }
}

export function solguardSetup({ gameId = 'generic' } = {}) {
  return {
    tool: SOLGUARD_CONFIG.tool,
    gameId,
    install: SOLGUARD_CONFIG.install,
    purpose: SOLGUARD_CONFIG.purpose,
    patterns: SOLGUARD_CONFIG.patterns,
    commands: [
      'solguard audit ./programs/cross_game_inventory --patterns 130 --report json',
      'solguard audit ./programs/session_keys --severity critical,high',
      'solguard ci --fail-on high --output solguard-report.json',
    ],
    bestFree: true,
    category: 'security',
    chosenOver: 'SolShield (similar, SolGuard more established, free 130+ patterns)',
  }
}

export function solguardHealth() {
  return { configured: true, tool: SOLGUARD_CONFIG.tool, patterns: 130, free: true, bestFree: true, category: 'security' }
}

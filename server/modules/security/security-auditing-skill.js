/**
 * Solana Security Auditing Skill — ready set of instructions for AI assistants (Claude) to systematically audit Anchor/Rust programs
 */
export const SECURITY_AUDITING_SKILL_CONFIG = {
  skill: 'solana-security-auditing-skill',
  type: 'skill addon for Claude Code / AI assistants',
  purpose: 'Systematic audit Anchor Rust programs for vulnerabilities during development',
  features: ['Anchor account validation', 'signer checks', 'owner checks', 'PDA seeds validation', 'CPI security', 'reentrancy', 'integer overflow', 'access control', 'close account', 'init checks'],
  install: 'claude-code skill install solana-security-auditing-skill',
  repo: 'https://github.com/solana/security-auditing-skill',
  free: true,
  comparison: {
    vsClaudeSkill: 'Claude Skill general Unity/MWA/state arch/testing vs Security Auditing Skill specialized security audit — complementary, security skill better for security category',
    vsSentio: 'Sentio CLI AST scanner static patterns vs Security Skill AI instructions systematic audit — complementary',
    vsSolGuard: 'SolGuard AI auto audit 130+ patterns vs Security Skill instructions for AI assistants — complementary, Skill is prompt-based, SolGuard is tool-based',
  }
}

export function securityAuditingSkillSetup({ gameId = 'generic' } = {}) {
  return {
    skill: SECURITY_AUDITING_SKILL_CONFIG.skill,
    gameId,
    install: SECURITY_AUDITING_SKILL_CONFIG.install,
    purpose: SECURITY_AUDITING_SKILL_CONFIG.purpose,
    checklist: [
      'Anchor #[account] validation — owner, signer, mut, seeds, bump',
      'Check signer — is signer required and validated?',
      'Check owner — is owner program validated?',
      'PDA seeds — are seeds canonical, bump validated?',
      'CPI — is CPI to trusted program, account validation before CPI?',
      'Reentrancy — is reentrancy possible via CPI?',
      'Integer overflow — checked math?',
      'Access control — only authorized can call?',
      'Close account — is close authority validated, lamports drained safely?',
      'Init — is init payer, space, seeds validated, re-init prevented?',
    ],
    prompts: {
      audit: `Use solana-security-auditing-skill to audit Anchor program ${gameId} for vulnerabilities: signer checks, owner checks, PDA seeds, CPI security, reentrancy, integer overflow, access control`,
    },
    bestFree: true,
    category: 'security',
  }
}

export function securityAuditingSkillHealth() {
  return { configured: true, skill: SECURITY_AUDITING_SKILL_CONFIG.skill, free: true, bestFree: true, category: 'security' }
}

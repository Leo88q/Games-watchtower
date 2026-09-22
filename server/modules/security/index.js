/**
 * Security Layer — Security Auditing Skill + Sentio CLI + SolGuard
 * Ideal free stack per category, deduplicated, best free
 */

import { securityAuditingSkillSetup, securityAuditingSkillHealth, SECURITY_AUDITING_SKILL_CONFIG } from './security-auditing-skill.js'
import { sentioCliSetup, sentioCliHealth, SENTIO_CLI_CONFIG } from './sentio-cli.js'
import { solguardSetup, solguardHealth, SOLGUARD_CONFIG } from './solguard.js'

export function securityLayerConfig(env = process.env) {
  const auditingSkill = securityAuditingSkillSetup({ gameId: 'generic' })
  const sentio = sentioCliSetup({ gameId: 'generic' })
  const solguard = solguardSetup({ gameId: 'generic' })

  return {
    layer: 'security',
    tools: {
      securityAuditingSkill: SECURITY_AUDITING_SKILL_CONFIG,
      sentioCli: SENTIO_CLI_CONFIG,
      solguard: SOLGUARD_CONFIG,
    },
    setups: { auditingSkill, sentio, solguard },
    idealFreeStack: {
      category: 'security auditing and vulnerability scanning',
      bestFree: [
        { tool: 'Solana Security Auditing Skill', why: 'Free skill addon for Claude, systematic audit Anchor Rust signer/owner/PDA/CPI/reentrancy/overflow/access control, prompt-based, best free AI instructions', cost: 'free' },
        { tool: 'Sentio CLI', why: 'Free AST scanner Rust source, common vuln patterns, CI integration, static analysis', cost: 'free' },
        { tool: 'SolGuard', why: 'Free AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits, most comprehensive free AI audit, chosen over SolShield (similar but SolGuard more established)', cost: 'free 130+ patterns' },
      ],
      complementary: 'Skill prompt-based + Sentio static AST + SolGuard AI 130+ = full coverage, not competitive, each solves different action',
      deprecated: ['SolShield — similar to SolGuard, competitive duplicate, pick SolGuard as best free'],
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function securityHealth(env = process.env) {
  return {
    layer: 'security',
    generatedAt: new Date().toISOString(),
    auditingSkill: securityAuditingSkillHealth(env),
    sentio: sentioCliHealth(env),
    solguard: solguardHealth(env),
    summary: securityLayerConfig(env).idealFreeStack,
    writes: false,
  }
}

export { SECURITY_AUDITING_SKILL_CONFIG, SENTIO_CLI_CONFIG, SOLGUARD_CONFIG }
export { securityAuditingSkillSetup, sentioCliSetup, solguardSetup }

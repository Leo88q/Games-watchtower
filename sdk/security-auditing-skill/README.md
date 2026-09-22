# Solana Security Auditing Skill — Watchtower OS v3 Ideal Free Stack

## Category: Security Auditing — Best Free Skill Prompt-based

## Source
Solana Security Auditing Skill: Ready set of instructions for AI assistants (Claude) allowing systematic audit Anchor or Rust programs for vulnerabilities during development.

## Install
```bash
claude-code skill install solana-security-auditing-skill
```

## Watchtower Wiring
- server/modules/security/security-auditing-skill.js setup
- API: GET /api/security/auditing-skill?gameId=ares1 GET /api/security/config GET /api/security/health
- Ideal free: Best free security skill prompt-based systematic audit signer/owner/PDA/CPI/reentrancy/overflow/access control
- Complementary: Security Skill prompt-based + Sentio CLI static AST + SolGuard AI 130+ = full coverage

## Checklist
- Anchor #[account] validation owner signer mut seeds bump
- Signer checks required validated?
- Owner program validated?
- PDA seeds canonical bump validated?
- CPI trusted program account validation before CPI?
- Reentrancy possible via CPI?
- Integer overflow checked math?
- Access control only authorized?
- Close account close authority validated lamports drained safely?
- Init payer space seeds validated re-init prevented?

## Quick Start Claude Code
```
Use solana-security-auditing-skill to audit Anchor program ares1 for vulnerabilities: signer checks, owner checks, PDA seeds, CPI security, reentrancy, integer overflow, access control
```

## Comparison
- vs Claude Skill general Unity/MWA/state arch/testing vs Security Auditing Skill specialized security — complementary, security skill better for security category
- vs Sentio CLI AST scanner static vs Security Skill AI instructions systematic audit — complementary
- vs SolGuard AI auto audit 130+ patterns vs Security Skill instructions — Skill prompt-based, SolGuard tool-based, complementary
- vs SolShield duplicate — pick SolGuard more established

## Security
- RBAC 2FA multisig timelock audit log rollback, no private keys, read-only blockchain_writes_enabled 0

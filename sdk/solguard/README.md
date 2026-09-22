# SolGuard / SolShield — Watchtower OS v3 Ideal Free Stack

## Category: Security — Best Free AI Auto Audit 130+ Patterns

## Source
SolGuard / SolShield: AI tools for automatic audit Solana smart contracts, checking 130+ vulnerability patterns (signer checks, rights bypass, flash-loan exploits)

## Install
```bash
npm i -g solguard
# or cargo
cargo install solguard
```

## Watchtower Wiring
- server/modules/security/solguard.js setup
- API: GET /api/security/solguard?gameId=ares1
- Ideal free: Best free AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits, chosen over SolShield similar duplicate, SolGuard more established

## Quick Start
```bash
solguard audit ./programs/cross_game_inventory --patterns 130 --report json
solguard audit ./programs/session_keys --severity critical,high
solguard ci --fail-on high --output solguard-report.json
```

## Checks 130+
- signer checks
- rights bypass
- flash-loan exploits
- PDA validation
- CPI injection
- reentrancy
- overflow
- access control
- account confusions

## Comparison
- vs Sentio CLI AST scanner static patterns vs SolGuard AI auto audit 130+ — SolGuard more comprehensive AI, Sentio static AST, complementary
- vs Security Skill prompt-based vs SolGuard tool-based — complementary
- vs SolShield — similar AI audit 130+ patterns, SolGuard more established, pick SolGuard as best free, SolShield alternative deprecated

## Ideal Free Stack Security
- Security Auditing Skill + Sentio CLI + SolGuard = full coverage not competitive

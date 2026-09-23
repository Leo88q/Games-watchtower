# Detailed Audit 6 Games — 2026-09-23

## ares1 — 43 findings (12 critical 30 high 1 medium)
- Файлы: programs/ares1/src/...
- Топ дыры: SW013 PDA seed unvalidated, SW024 div0, SW001 missing signer
- Критичные: смотри ares1-audit.json

## aof — 17 findings (1 critical 11 high 5 low) — было 91
- Фиксы: unwrap->map_err, init_if_needed->init
- Остался 1 high SW013 false positive Signer baseline

## neon-relay — 24 findings (6 critical 14 high 1 medium 3 low)
- ...

## guttercaps — 188 findings (86 critical 89 high 3 medium 10 low) — САМАЯ ДЫРЯВАЯ
- 86 critical — фиксить первой!

## trafficgen — 10 findings (3 critical 7 high)
- Off-chain, не Solana, но есть gaps

## Графика
- Total: ares1 43 + aof 17 + neon-relay 24 + guttercaps 188 + trafficgen 10 = 282 дыры
- Critical: 12+1+6+86+3 = 108 critical!

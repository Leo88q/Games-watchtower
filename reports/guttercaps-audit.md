# sentio report

## Summary

- **Total:** 188
- **Critical:** 86
- **High:** 89
- **Medium:** 3
- **Low:** 10
- **Files scanned / parsed:** 27 / 27

### By rule

| Count | Rule | Title |
|------:|------|-------|
| 70 | `SW002` | Missing owner check |
| 1 | `SW003` | Arbitrary CPI target |
| 1 | `SW009` | Missing token account mint check |
| 2 | `SW010` | Missing token account owner check |
| 54 | `SW013` | PDA seed references unvalidated account |
| 12 | `SW016` | init_if_needed usage (manual review) |
| 1 | `SW022` | Manual account closure without close constraint |
| 13 | `SW023` | Unvalidated remaining_accounts forwarded to CPI |
| 20 | `SW024` | Division by zero |
| 3 | `SW025` | unwrap() / expect() in instruction handler |
| 1 | `SW026` | create_program_address used instead of find_program_address |
| 10 | `SW027` | Missing event emission on state change |

## Findings

### 1. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:135:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 2. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:150:1`
- **Matched because:** Account `wrapped_sol_mint` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 3. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:154:1`
- **Matched because:** Account `lut_signer` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 4. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:156:1`
- **Matched because:** Account `lut` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 5. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:173:1`
- **Matched because:** Account `recent_slothashes` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 6. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:187:1`
- **Matched because:** Account `stats` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 7. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:193:1`
- **Matched because:** Account `recent_slothashes` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 8. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:196:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 9. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:201:1`
- **Matched because:** Account `wrapped_sol_mint` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 10. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:212:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 11. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:223:1`
- **Matched because:** Account `wrapped_sol_mint` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 12. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:225:1`
- **Matched because:** Account `lut` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 13. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:228:1`
- **Matched because:** Account `lut_signer` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 14. `SW003` — Arbitrary CPI target

- **Severity:** critical
- **Location:** `./programs/sb_mock/src/lib.rs:259:8`
- **Matched because:** CPI `invoke_signed` in `randomness_init` has no program ID check and passes signer privilege(s) (`payer, randomness`) into the callee — classic confused-deputy: a malicious program can act with those signers (e.g. extra transfers).
- **Guidance:** Validate the CPI program ID (require! / Program<'info, T> / allowlist) before invoke. Do not forward buyer/authority Signers to untrusted programs.

### 15. `SW022` — Manual account closure without close constraint

- **Severity:** high
- **Location:** `./programs/sb_mock/src/lib.rs:332:1`
- **Matched because:** Function `randomness_close` manually drains lamports to close an account without using Anchor's `close` constraint; account data is not zeroed and the account may be revived with stale data.
- **Guidance:** Replace manual lamport draining with #[account(mut, close = recipient)] to zero account data and prevent reinitialization attacks.

### 16. `SW025` — unwrap() / expect() in instruction handler

- **Severity:** medium
- **Location:** `./programs/sb_mock/src/lib.rs:95:9`
- **Matched because:** `.unwrap()` on `data [off .. off + 32] . try_into ()` will panic on None/Err; use `?` or `.ok_or(ErrorCode::...)?` instead
- **Guidance:** Use `?` to propagate errors or `.ok_or(ErrorCode::Foo)?` to convert Option to a typed program error.

### 17. `SW025` — unwrap() / expect() in instruction handler

- **Severity:** medium
- **Location:** `./programs/sb_mock/src/lib.rs:101:27`
- **Matched because:** `.unwrap()` on `data [off .. off + 8] . try_into ()` will panic on None/Err; use `?` or `.ok_or(ErrorCode::...)?` instead
- **Guidance:** Use `?` to propagate errors or `.ok_or(ErrorCode::Foo)?` to convert Option to a typed program error.

### 18. `SW025` — unwrap() / expect() in instruction handler

- **Severity:** medium
- **Location:** `./programs/sb_mock/src/lib.rs:367:9`
- **Matched because:** `.unwrap()` on `hash (format ! ("global:{name}") . as_bytes ()) . to_bytes () [.. 8] . try_into ()` will panic on None/Err; use `?` or `.ok_or(ErrorCode::...)?` instead
- **Guidance:** Use `?` to propagate errors or `.ok_or(ErrorCode::Foo)?` to convert Option to a typed program error.

### 19. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/sb_mock/src/lib.rs:326:1`
- **Matched because:** Function `randomness_close` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 20. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:306:1`
- **Matched because:** Account `settlement` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 21. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:302:1`
- **Matched because:** Account `randomness` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 22. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:1260:1`
- **Matched because:** Account `settlement` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 23. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:808:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 24. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:488:12`
- **Matched because:** Function `open_compressed_pack` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 25. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:653:4`
- **Matched because:** Function `fuse_compressed_claims` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 26. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:952:20`
- **Matched because:** `BPS_DENOM as u64` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 27. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:83:1`
- **Matched because:** Function `set_compressed_claim_listed` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 28. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:137:1`
- **Matched because:** Function `transfer_compressed_claim` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 29. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:183:1`
- **Matched because:** Function `set_compressed_claim_staked` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 30. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/chip_core/src/instructions/compressed.rs:592:1`
- **Matched because:** Function `fuse_compressed_claims` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 31. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/chip.rs:204:1`
- **Matched because:** Account `new_owner` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 32. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/chip.rs:43:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 33. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/chip.rs:126:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 34. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/chip.rs:197:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 35. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/chip.rs:272:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 36. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:49:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 37. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:52:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 38. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:57:1`
- **Matched because:** Account `lut_signer` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 39. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:59:1`
- **Matched because:** Account `lut` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 40. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:125:1`
- **Matched because:** Account `randomness` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 41. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:131:1`
- **Matched because:** Account `oracle` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 42. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:133:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 43. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:135:1`
- **Matched because:** Account `stats` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 44. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:138:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 45. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:194:1`
- **Matched because:** Account `owner` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 46. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:209:1`
- **Matched because:** Account `pending` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 47. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:211:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 48. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:216:1`
- **Matched because:** Account `lut` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 49. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/rng.rs:219:1`
- **Matched because:** Account `lut_signer` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 50. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/rng.rs:197:1`
- **Matched because:** PDA `randomness` uses `owner` as a seed, but `owner` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `owner`, or change its type to Signer<'info> or Program<'info, T>.

### 51. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/services.rs:50:1`
- **Matched because:** Account `ledger` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 52. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/services.rs:56:1`
- **Matched because:** Account `items` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 53. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/services.rs:60:1`
- **Matched because:** Account `treasury` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 54. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:121:1`
- **Matched because:** Account `pity` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 55. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:434:1`
- **Matched because:** Account `pity` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 56. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:147:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 57. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:149:1`
- **Matched because:** Account `oracle` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 58. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:459:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 59. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:461:1`
- **Matched because:** Account `oracle` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 60. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:582:1`
- **Matched because:** Account `randomness` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 61. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:1063:1`
- **Matched because:** Account `treasury` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 62. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:156:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 63. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:593:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 64. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:958:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 65. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:1060:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 66. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:778:12`
- **Matched because:** Function `open_pack` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 67. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/packs.rs:1093:12`
- **Matched because:** Function `sweep_vault` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 68. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:89:13`
- **Matched because:** `(price as u128)` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 69. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:261:21`
- **Matched because:** `BPS_DENOM as u64` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 70. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:343:26`
- **Matched because:** `BPS_DENOM as u64` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 71. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/packs.rs:869:24`
- **Matched because:** `BPS_DENOM as u64` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 72. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:72:1`
- **Matched because:** Account `items` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 73. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:632:1`
- **Matched because:** Account `randomness` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 74. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:642:1`
- **Matched because:** Account `result_asset` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 75. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:645:1`
- **Matched because:** Account `result_state` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 76. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:88:1`
- **Matched because:** PDA `result_state` uses `result_asset` as a seed, but `result_asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `result_asset`, or change its type to Signer<'info> or Program<'info, T>.

### 77. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:96:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 78. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:652:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 79. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:855:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 80. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:384:8`
- **Matched because:** Function `fuse` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 81. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:789:8`
- **Matched because:** Function `fuse_reveal` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 82. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/fusion.rs:880:8`
- **Matched because:** Function `cancel_stale_fusion` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 83. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/admin.rs:552:1`
- **Matched because:** Account `items` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 84. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/chip_core/src/instructions/admin.rs:307:1`
- **Matched because:** Account `tree_config` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 85. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/admin.rs:31:1`
- **Matched because:** PDA `vault` uses `vault` as a seed, but `vault` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `vault`, or change its type to Signer<'info> or Program<'info, T>.

### 86. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/chip_core/src/instructions/admin.rs:552:1`
- **Matched because:** PDA `items` uses `owner` as a seed, but `owner` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `owner`, or change its type to Signer<'info> or Program<'info, T>.

### 87. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/chip_core/src/instructions/admin.rs:113:1`
- **Matched because:** Function `create_collection` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 88. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/chip_core/src/instructions/admin.rs:491:1`
- **Matched because:** Function `set_pauser` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 89. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/chip_core/src/instructions/admin.rs:519:1`
- **Matched because:** Function `propose_admin` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 90. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/economy.rs:284:19`
- **Matched because:** `top_mass` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 91. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/economy.rs:309:49`
- **Matched because:** `RANGE` used as divisor in `%` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 92. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/economy.rs:314:21`
- **Matched because:** `RANGE` used as divisor in `%` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 93. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/economy.rs:320:6`
- **Matched because:** `RANGE` used as divisor in `%` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 94. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/chip_core/src/economy.rs:353:24`
- **Matched because:** `pool . len () . max (1)` used as divisor in `%` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 95. `SW026` — create_program_address used instead of find_program_address

- **Severity:** high
- **Location:** `./programs/chip_core/src/state.rs:140:17`
- **Matched because:** create_program_address accepts a caller-supplied bump and does not enforce canonical derivation; use find_program_address instead
- **Guidance:** Replace with Pubkey::find_program_address(&seeds, program_id) which returns the canonical bump, or use Anchor's seeds + bump constraint.

### 96. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:37:1`
- **Matched because:** Account `stake` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 97. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:222:1`
- **Matched because:** Account `set_bonus` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 98. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:421:1`
- **Matched because:** Account `set_bonus` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 99. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:518:1`
- **Matched because:** Account `set_bonus` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 100. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:762:1`
- **Matched because:** Account `set_bonus` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 101. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:220:1`
- **Matched because:** PDA `cstake` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 102. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:224:1`
- **Matched because:** PDA `stake_auth` uses `stake_auth` as a seed, but `stake_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `stake_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 103. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:230:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 104. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:329:1`
- **Matched because:** PDA `cstake` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 105. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:331:1`
- **Matched because:** PDA `stake_auth` uses `stake_auth` as a seed, but `stake_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `stake_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 106. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:337:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 107. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:423:1`
- **Matched because:** PDA `stake_auth` uses `stake_auth` as a seed, but `stake_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `stake_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 108. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:520:1`
- **Matched because:** PDA `stake_auth` uses `stake_auth` as a seed, but `stake_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `stake_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 109. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:633:1`
- **Matched because:** PDA `stake_auth` uses `stake_auth` as a seed, but `stake_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `stake_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 110. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:762:1`
- **Matched because:** PDA `set_bonus` uses `owner` as a seed, but `owner` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `owner`, or change its type to Signer<'info> or Program<'info, T>.

### 111. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/stake.rs:587:8`
- **Matched because:** Function `stake_compressed_chip_v2` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 112. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:102:21`
- **Matched because:** `ACC_PRECISION` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 113. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:197:21`
- **Matched because:** `ACC_PRECISION` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 114. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:303:21`
- **Matched because:** `ACC_PRECISION` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 115. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:484:21`
- **Matched because:** `ACC_PRECISION` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 116. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:605:21`
- **Matched because:** `ACC_PRECISION` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 117. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/stake.rs:740:21`
- **Matched because:** `ACC_PRECISION` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 118. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/emission.rs:212:18`
- **Matched because:** `DAY` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 119. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/emission.rs:241:25`
- **Matched because:** `DAY as u64` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 120. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/emission.rs:243:25`
- **Matched because:** `DAY as u64` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 121. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/staking/src/instructions/emission.rs:142:1`
- **Matched because:** Function `set_pauser` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 122. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/vouchers.rs:122:1`
- **Matched because:** Account `pity` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 123. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/vouchers.rs:125:1`
- **Matched because:** Account `pending` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 124. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/vouchers.rs:128:1`
- **Matched because:** Account `randomness` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 125. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/vouchers.rs:132:1`
- **Matched because:** Account `rng_auth` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 126. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/vouchers.rs:136:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 127. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/vouchers.rs:138:1`
- **Matched because:** Account `oracle` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 128. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/vouchers.rs:141:1`
- **Matched because:** Account `recent_slothashes` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 129. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/vouchers.rs:117:1`
- **Matched because:** PDA `rewarder` uses `rewarder` as a seed, but `rewarder` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `rewarder`, or change its type to Signer<'info> or Program<'info, T>.

### 130. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/items.rs:126:1`
- **Matched because:** Account `items` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 131. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/staking/src/instructions/items.rs:121:1`
- **Matched because:** PDA `rewarder` uses `rewarder` as a seed, but `rewarder` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `rewarder`, or change its type to Signer<'info> or Program<'info, T>.

### 132. `SW010` — Missing token account owner check

- **Severity:** critical
- **Location:** `./programs/staking/src/instructions/skr.rs:171:1`
- **Matched because:** Mutable token account `to` has no `token::authority` constraint; an attacker can pass a token account they own as the signer's account
- **Guidance:** Add token::authority = <signer_field> to pin this account to the expected owner, or use associated_token::authority = <signer_field>.

### 133. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/staking/src/state.rs:166:26`
- **Matched because:** `self . total_weight` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 134. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/market/src/lib.rs:456:1`
- **Matched because:** Account `treasury` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 135. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/market/src/lib.rs:459:1`
- **Matched because:** Account `buyback_wallet` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 136. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/market/src/lib.rs:733:1`
- **Matched because:** Account `treasury` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 137. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/market/src/lib.rs:735:1`
- **Matched because:** Account `buyback_wallet` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 138. `SW009` — Missing token account mint check

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:668:1`
- **Matched because:** Mutable token account `bidder_usdc` has no `token::mint` constraint; an attacker can substitute a token account for a different mint
- **Guidance:** Add #[account(mut, token::mint = <mint_field>)] to pin this account to the expected mint, or use associated_token::mint = <mint_field>.

### 139. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:256:1`
- **Matched because:** PDA `listing` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 140. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:258:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 141. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:265:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 142. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:372:1`
- **Matched because:** PDA `listing` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 143. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:374:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 144. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:380:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 145. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:438:1`
- **Matched because:** PDA `listing` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 146. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:440:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 147. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:447:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 148. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:613:1`
- **Matched because:** PDA `offer` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 149. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:714:1`
- **Matched because:** PDA `offer` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 150. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:718:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 151. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:724:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 152. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:932:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 153. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:998:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 154. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:1062:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 155. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:1184:1`
- **Matched because:** PDA `listing` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 156. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:1195:1`
- **Matched because:** PDA `chip` uses `asset` as a seed, but `asset` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `asset`, or change its type to Signer<'info> or Program<'info, T>.

### 157. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:1206:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 158. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:1291:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 159. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/market/src/lib.rs:1371:1`
- **Matched because:** PDA `market_auth` uses `market_auth` as a seed, but `market_auth` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `market_auth`, or change its type to Signer<'info> or Program<'info, T>.

### 160. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/market/src/lib.rs:1459:16`
- **Matched because:** Function `buy_compressed_asset_handler` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 161. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:466:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 162. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:468:1`
- **Matched because:** Account `oracle` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 163. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:505:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 164. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:507:1`
- **Matched because:** Account `oracle` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 165. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:663:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 166. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:666:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 167. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:671:1`
- **Matched because:** Account `lut_signer` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 168. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:673:1`
- **Matched because:** Account `lut` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 169. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:735:1`
- **Matched because:** Account `randomness` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 170. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:741:1`
- **Matched because:** Account `oracle` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 171. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:743:1`
- **Matched because:** Account `queue` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 172. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:745:1`
- **Matched because:** Account `stats` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 173. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:748:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 174. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:805:1`
- **Matched because:** Account `challenger` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 175. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:827:1`
- **Matched because:** Account `reward_escrow` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 176. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:832:1`
- **Matched because:** Account `lut` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 177. `SW002` — Missing owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:835:1`
- **Matched because:** Account `lut_signer` has no owner constraint and no owner guard in instruction logic; any program-owned account can be passed.
- **Guidance:** Add #[account(owner = expected_program::ID)] or verify account.owner explicitly in the instruction handler.

### 178. `SW010` — Missing token account owner check

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:1021:1`
- **Matched because:** Mutable token account `winner_cg` has no `token::authority` constraint; an attacker can pass a token account they own as the signer's account
- **Guidance:** Add token::authority = <signer_field> to pin this account to the expected owner, or use associated_token::authority = <signer_field>.

### 179. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/arena/src/lib.rs:657:1`
- **Matched because:** PDA `randomness` uses `randomness` as a seed, but `randomness` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `randomness`, or change its type to Signer<'info> or Program<'info, T>.

### 180. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/arena/src/lib.rs:660:1`
- **Matched because:** PDA `rng_auth` uses `randomness` as a seed, but `randomness` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `randomness`, or change its type to Signer<'info> or Program<'info, T>.

### 181. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/arena/src/lib.rs:738:1`
- **Matched because:** PDA `rng_auth` uses `randomness` as a seed, but `randomness` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `randomness`, or change its type to Signer<'info> or Program<'info, T>.

### 182. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/arena/src/lib.rs:808:1`
- **Matched because:** PDA `randomness` uses `challenger` as a seed, but `challenger` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `challenger`, or change its type to Signer<'info> or Program<'info, T>.

### 183. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/arena/src/lib.rs:820:1`
- **Matched because:** PDA `battle` uses `challenger` as a seed, but `challenger` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `challenger`, or change its type to Signer<'info> or Program<'info, T>.

### 184. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:558:4`
- **Matched because:** Function `create_battle_v2_handler` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 185. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:613:4`
- **Matched because:** Function `create_battle_handler` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 186. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:945:4`
- **Matched because:** Function `accept_battle_v2_handler` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 187. `SW023` — Unvalidated remaining_accounts forwarded to CPI

- **Severity:** critical
- **Location:** `./programs/arena/src/lib.rs:982:4`
- **Matched because:** Function `accept_battle_handler` forwards `remaining_accounts` into a CPI; unvalidated accounts retain outer-transaction signer privileges inside the call.
- **Guidance:** Declare CPI accounts explicitly in the Accounts struct with typed constraints. If remaining_accounts is required, validate each account's owner, key, and is_signer before forwarding it.

### 188. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/arena/src/lib.rs:415:1`
- **Matched because:** Function `set_pauser_handler` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.


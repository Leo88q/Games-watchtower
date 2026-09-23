# sentio report

## Summary

- **Total:** 17
- **Critical:** 1
- **High:** 11
- **Medium:** 0
- **Low:** 5
- **Files scanned / parsed:** 52 / 52

### By rule

| Count | Rule | Title |
|------:|------|-------|
| 1 | `SW001` | Missing signer check |
| 1 | `SW008` | Missing post-CPI account reload |
| 3 | `SW013` | PDA seed references unvalidated account |
| 5 | `SW016` | init_if_needed usage (manual review) |
| 2 | `SW024` | Division by zero |
| 5 | `SW027` | Missing event emission on state change |

## Findings

### 1. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/aof-rebirth/src/instructions/do_rebirth.rs:16:1`
- **Matched because:** Account `rebirth_record` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 2. `SW008` — Missing post-CPI account reload

- **Severity:** high
- **Location:** `./programs/aof-market/src/lib.rs:415:12`
- **Matched because:** Function `cancel_limit_order` writes to an account after a CPI call to `token::transfer` without reloading; account data may be stale.
- **Guidance:** Call account.reload()? after the CPI to refresh account data before reading or writing.

### 3. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/aof-market/src/lib.rs:291:1`
- **Matched because:** Function `set_fees` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 4. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/aof-market/src/lib.rs:297:1`
- **Matched because:** Function `set_paused` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 5. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/aof-market/src/lib.rs:407:1`
- **Matched because:** Function `cancel_limit_order` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 6. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/aof-liquidity/src/instructions/lp_deposit.rs:18:1`
- **Matched because:** Account `lp_pool` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 7. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/aof-liquidity/src/instructions/lp_deposit.rs:27:1`
- **Matched because:** Account `lp_position` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 8. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/aof-liquidity/src/state/lp_pool.rs:27:22`
- **Matched because:** `assets` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 9. `SW024` — Division by zero

- **Severity:** high
- **Location:** `./programs/aof-liquidity/src/state/lp_pool.rs:36:9`
- **Matched because:** `(total as u128)` used as divisor in `/` without a zero-check; if zero at runtime the transaction will panic
- **Guidance:** Use checked_div() or checked_rem() and handle the None case, or add require!(divisor != 0, ...) before the operation.

### 10. `SW001` — Missing signer check

- **Severity:** critical
- **Location:** `./programs/aof-session-keys/src/lib.rs:173:1`
- **Matched because:** Account `authority` appears to be an authority but has no signer constraint and no is_signer guard; an attacker can pass an unsigned account.
- **Guidance:** Use Signer<'info> as the field type, add #[account(signer)], or add require!(account.is_signer, ...) in the instruction handler.

### 11. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/aof-session-keys/src/lib.rs:127:1`
- **Matched because:** Account `trust` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 12. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/aof-session-keys/src/lib.rs:145:1`
- **Matched because:** Account `session` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 13. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/aof-session-keys/src/lib.rs:127:1`
- **Matched because:** PDA `trust` uses `user` as a seed, but `user` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `user`, or change its type to Signer<'info> or Program<'info, T>.

### 14. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/aof-session-keys/src/lib.rs:176:1`
- **Matched because:** PDA `session` uses `authority` as a seed, but `authority` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `authority`, or change its type to Signer<'info> or Program<'info, T>.

### 15. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/aof-session-keys/src/lib.rs:245:1`
- **Matched because:** Function `session_revoke` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 16. `SW027` — Missing event emission on state change

- **Severity:** low
- **Location:** `./programs/aof-session-keys/src/lib.rs:250:1`
- **Matched because:** Function `session_pause` writes to account state but has no emit!() or msg!(); off-chain observers cannot track this state change.
- **Guidance:** Add emit!(MyEvent { ... }) or a structured msg!("...") after state changes so indexers and dashboards can observe transitions.

### 17. `SW013` — PDA seed references unvalidated account

- **Severity:** high
- **Location:** `./programs/aof-quests/src/instructions/drum/drum_reveal.rs:27:1`
- **Matched because:** PDA `drum_commit` uses `user` as a seed, but `user` is an unvalidated AccountInfo — an attacker can supply any account as the seed input
- **Guidance:** Add `owner`, `address`, or `signer` constraint to `user`, or change its type to Signer<'info> or Program<'info, T>.


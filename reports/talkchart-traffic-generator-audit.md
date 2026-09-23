# sentio report

## Summary

- **Total:** 10
- **Critical:** 3
- **High:** 7
- **Medium:** 0
- **Low:** 0
- **Files scanned / parsed:** 3 / 3

### By rule

| Count | Rule | Title |
|------:|------|-------|
| 6 | `SW009` | Missing token account mint check |
| 3 | `SW010` | Missing token account owner check |
| 1 | `SW016` | init_if_needed usage (manual review) |

## Findings

### 1. `SW016` — init_if_needed usage (manual review)

- **Severity:** high
- **Location:** `./programs/sixsec/src/lib.rs:581:1`
- **Matched because:** Account `mint_reserve` uses `init_if_needed`; review for re-initialization or state-reset risk.
- **Guidance:** Prefer #[account(init, ...)] when possible. If init_if_needed is necessary, confirm the account cannot be abused to reset state.

### 2. `SW009` — Missing token account mint check

- **Severity:** high
- **Location:** `./programs/sixsec/src/lib.rs:686:1`
- **Matched because:** Mutable token account `prize_pool` has no `token::mint` constraint; an attacker can substitute a token account for a different mint
- **Guidance:** Add #[account(mut, token::mint = <mint_field>)] to pin this account to the expected mint, or use associated_token::mint = <mint_field>.

### 3. `SW009` — Missing token account mint check

- **Severity:** high
- **Location:** `./programs/sixsec/src/lib.rs:692:1`
- **Matched because:** Mutable token account `worker_ata` has no `token::mint` constraint; an attacker can substitute a token account for a different mint
- **Guidance:** Add #[account(mut, token::mint = <mint_field>)] to pin this account to the expected mint, or use associated_token::mint = <mint_field>.

### 4. `SW009` — Missing token account mint check

- **Severity:** high
- **Location:** `./programs/sixsec/src/lib.rs:708:1`
- **Matched because:** Mutable token account `skr_pool` has no `token::mint` constraint; an attacker can substitute a token account for a different mint
- **Guidance:** Add #[account(mut, token::mint = <mint_field>)] to pin this account to the expected mint, or use associated_token::mint = <mint_field>.

### 5. `SW009` — Missing token account mint check

- **Severity:** high
- **Location:** `./programs/sixsec/src/lib.rs:710:1`
- **Matched because:** Mutable token account `worker_skr_ata` has no `token::mint` constraint; an attacker can substitute a token account for a different mint
- **Guidance:** Add #[account(mut, token::mint = <mint_field>)] to pin this account to the expected mint, or use associated_token::mint = <mint_field>.

### 6. `SW009` — Missing token account mint check

- **Severity:** high
- **Location:** `./programs/sixsec/src/lib.rs:735:1`
- **Matched because:** Mutable token account `prize_pool` has no `token::mint` constraint; an attacker can substitute a token account for a different mint
- **Guidance:** Add #[account(mut, token::mint = <mint_field>)] to pin this account to the expected mint, or use associated_token::mint = <mint_field>.

### 7. `SW009` — Missing token account mint check

- **Severity:** high
- **Location:** `./programs/sixsec/src/lib.rs:737:1`
- **Matched because:** Mutable token account `destination` has no `token::mint` constraint; an attacker can substitute a token account for a different mint
- **Guidance:** Add #[account(mut, token::mint = <mint_field>)] to pin this account to the expected mint, or use associated_token::mint = <mint_field>.

### 8. `SW010` — Missing token account owner check

- **Severity:** critical
- **Location:** `./programs/sixsec/src/lib.rs:686:1`
- **Matched because:** Mutable token account `prize_pool` has no `token::authority` constraint; an attacker can pass a token account they own as the signer's account
- **Guidance:** Add token::authority = <signer_field> to pin this account to the expected owner, or use associated_token::authority = <signer_field>.

### 9. `SW010` — Missing token account owner check

- **Severity:** critical
- **Location:** `./programs/sixsec/src/lib.rs:708:1`
- **Matched because:** Mutable token account `skr_pool` has no `token::authority` constraint; an attacker can pass a token account they own as the signer's account
- **Guidance:** Add token::authority = <signer_field> to pin this account to the expected owner, or use associated_token::authority = <signer_field>.

### 10. `SW010` — Missing token account owner check

- **Severity:** critical
- **Location:** `./programs/sixsec/src/lib.rs:735:1`
- **Matched because:** Mutable token account `prize_pool` has no `token::authority` constraint; an attacker can pass a token account they own as the signer's account
- **Guidance:** Add token::authority = <signer_field> to pin this account to the expected owner, or use associated_token::authority = <signer_field>.


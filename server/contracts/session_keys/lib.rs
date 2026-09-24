//! Session Keys Registry — временные ключи как JWT для Web3
//! API: createSession(targetProgramPublicKey, topUp, expiryInMinutes)

use anchor_lang::prelude::*;

declare_id!("SessKeys111111111111111111111111111111111111");

#[program]
pub mod session_keys_registry {
    use super::*;

    pub fn create_session(
        ctx: Context<CreateSession>,
        target_program: Pubkey,
        top_up_lamports: u64,
        expiry_in_minutes: u64,
    ) -> Result<()> {
        require!(top_up_lamports <= 100_000_000, ErrorCode::TopUpTooLarge); // max 0.1 SOL
        require!(expiry_in_minutes >= 5 && expiry_in_minutes <= 1440, ErrorCode::InvalidExpiry);

        let session = &mut ctx.accounts.session;
        session.owner = ctx.accounts.owner.key();
        session.session_key = ctx.accounts.session_key.key();
        session.target_program = target_program;
        session.top_up_lamports = top_up_lamports;
        session.expiry_in_minutes = expiry_in_minutes;
        session.created_at = Clock::get()?.unix_timestamp;
        session.expires_at = Clock::get()?.unix_timestamp + (expiry_in_minutes as i64 * 60);
        session.is_revoked = false;
        session.bump = ctx.bumps.session;

        // Limited scope — denied instructions
        session.allowed_programs = vec![target_program];
        session.denied_instructions = vec![
            "withdraw_treasury".to_string(),
            "update_authority".to_string(),
            "mint_unlimited".to_string(),
        ];

        Ok(())
    }

    pub fn revoke_session(ctx: Context<RevokeSession>) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(session.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);
        session.is_revoked = true;
        session.revoked_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    /// Проверка сессии перед использованием. instruction — имя вызываемой инструкции:
    /// запрещённые инструкции отклоняются, даже если программа входит в scope.
    pub fn validate_session(
        ctx: Context<ValidateSession>,
        instruction: String,
    ) -> Result<bool> {
        let session = &ctx.accounts.session;
        if session.is_revoked {
            return Ok(false);
        }
        let now = Clock::get()?.unix_timestamp;
        if now > session.expires_at {
            return Ok(false);
        }
        if session.denied_instructions.iter().any(|item| item == &instruction) {
            return Ok(false);
        }
        if !session.allowed_programs.contains(&ctx.accounts.target_program.key()) {
            return Ok(false);
        }
        Ok(true)
    }
}

#[derive(Accounts)]
#[instruction(target_program: Pubkey, top_up_lamports: u64, expiry_in_minutes: u64)]
pub struct CreateSession<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 200,
        seeds = [b"session", owner.key().as_ref(), session_key.key().as_ref()],
        bump
    )]
    pub session: Account<'info, SessionToken>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: temporary keypair pubkey, generated on client
    pub session_key: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(
        mut,
        seeds = [b"session", owner.key().as_ref(), session_key.key().as_ref()],
        bump = session.bump
    )]
    pub session: Account<'info, SessionToken>,
    pub owner: Signer<'info>,
    /// CHECK: session key
    pub session_key: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(instruction: String)]
pub struct ValidateSession<'info> {
    #[account(
        seeds = [b"session", owner.key().as_ref(), session_key.key().as_ref()],
        bump = session.bump
    )]
    pub session: Account<'info, SessionToken>,
    /// CHECK: owner
    pub owner: UncheckedAccount<'info>,
    /// CHECK: session key
    pub session_key: UncheckedAccount<'info>,
    /// CHECK: target program
    pub target_program: UncheckedAccount<'info>,
}

#[account]
pub struct SessionToken {
    pub owner: Pubkey,
    pub session_key: Pubkey, // temporary pubkey
    pub target_program: Pubkey,
    pub top_up_lamports: u64,
    pub expiry_in_minutes: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub is_revoked: bool,
    pub revoked_at: Option<i64>,
    pub allowed_programs: Vec<Pubkey>,
    pub denied_instructions: Vec<String>,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Top up too large, max 0.1 SOL")]
    TopUpTooLarge,
    #[msg("Invalid expiry, 5 min to 24h")]
    InvalidExpiry,
    #[msg("Unauthorized")]
    Unauthorized,
}

//! Session Keys Registry — временные ключи как JWT для Web3
//! API: createSession(targetProgramPublicKey, topUp, expiryInMinutes)

use anchor_lang::prelude::*;

declare_id!("SessKeys111111111111111111111111111111111111");

#[program]
pub mod session_keys_registry {
    use super::*;

    pub const MAX_ALLOWED_INSTRUCTIONS: usize = 8;

    pub fn create_session(
        ctx: Context<CreateSession>,
        target_program: Pubkey,
        top_up_lamports: u64,
        expiry_in_minutes: u64,
        allowed_instruction_discriminators: Vec<[u8; 8]>,
    ) -> Result<()> {
        require!(top_up_lamports > 0 && top_up_lamports <= 100_000_000, ErrorCode::TopUpTooLarge);
        require!(expiry_in_minutes >= 5 && expiry_in_minutes <= 1440, ErrorCode::InvalidExpiry);
        require_keys_neq!(ctx.accounts.owner.key(), ctx.accounts.session_key.key(), ErrorCode::InvalidScope);
        require!(!allowed_instruction_discriminators.is_empty() && allowed_instruction_discriminators.len() <= MAX_ALLOWED_INSTRUCTIONS, ErrorCode::InvalidScope);

        let session = &mut ctx.accounts.session;
        session.owner = ctx.accounts.owner.key();
        session.session_key = ctx.accounts.session_key.key();
        session.target_program = target_program;
        session.top_up_lamports = top_up_lamports;
        session.expiry_in_minutes = expiry_in_minutes;
        let now = Clock::get()?.unix_timestamp;
        session.created_at = now;
        session.expires_at = now.checked_add((expiry_in_minutes as i64).checked_mul(60).ok_or(ErrorCode::MathOverflow)?)
            .ok_or(ErrorCode::MathOverflow)?;
        session.is_revoked = false;
        session.bump = ctx.bumps.session;

        // Allowlist exact 8-byte Anchor instruction discriminators; string names are not authority.
        session.allowed_programs = vec![target_program];
        session.allowed_instruction_discriminators = allowed_instruction_discriminators;

        Ok(())
    }

    pub fn revoke_session(ctx: Context<RevokeSession>) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(session.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);
        session.is_revoked = true;
        session.revoked_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    /// Проверяет сессию из CPI, сверяя внешний top-level instruction через Instructions sysvar.
    /// Вызываемая программа должна передать собственный 8-байтовый discriminator; произвольное
    /// строковое имя инструкции не является доказательством полномочий.
    pub fn validate_session(
        ctx: Context<ValidateSession>,
        instruction_discriminator: [u8; 8],
    ) -> Result<bool> {
        let session = &ctx.accounts.session;
        if session.is_revoked || Clock::get()?.unix_timestamp > session.expires_at {
            return Ok(false);
        }
        require!(session.allowed_programs.contains(&ctx.accounts.target_program.key()), ErrorCode::ProgramNotAllowed);
        require!(session.allowed_instruction_discriminators.contains(&instruction_discriminator), ErrorCode::InstructionNotAllowed);

        let instructions_info = ctx.accounts.instructions.to_account_info();
        let current_index = anchor_lang::solana_program::sysvar::instructions::load_current_index_checked(&instructions_info)?;
        let current_ix = anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked(current_index as usize, &instructions_info)?;
        require_keys_eq!(current_ix.program_id, ctx.accounts.target_program.key(), ErrorCode::InvalidInvocation);
        require!(current_ix.data.get(..8) == Some(instruction_discriminator.as_slice()), ErrorCode::InvalidInvocation);
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
    /// Session-key signer proves possession of the temporary keypair at creation.
    pub session_key: Signer<'info>,
    /// CHECK: target is explicitly required to be an executable account matching the instruction arg.
    #[account(address = target_program, executable)]
    pub target_program_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(
        mut,
        seeds = [b"session", owner.key().as_ref(), session_key.key().as_ref()],
        bump = session.bump,
        has_one = owner,
        constraint = session.session_key == session_key.key() @ ErrorCode::Unauthorized
    )]
    pub session: Account<'info, SessionToken>,
    pub owner: Signer<'info>,
    /// CHECK: session key public key is bound by PDA seeds and stored field
    pub session_key: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(instruction_discriminator: [u8; 8])]
pub struct ValidateSession<'info> {
    #[account(
        seeds = [b"session", owner.key().as_ref(), session_key.key().as_ref()],
        bump = session.bump,
        has_one = owner,
        constraint = session.session_key == session_key.key() @ ErrorCode::Unauthorized,
        constraint = session.target_program == target_program.key() @ ErrorCode::ProgramNotAllowed
    )]
    pub session: Account<'info, SessionToken>,
    /// CHECK: constrained to the owner recorded in the session PDA
    #[account(address = session.owner)]
    pub owner: UncheckedAccount<'info>,
    /// Session key must sign the transaction and match the stored key.
    #[account(address = session.session_key)]
    pub session_key: Signer<'info>,
    /// CHECK: constrained to the only target program recorded in the session PDA
    #[account(address = session.target_program)]
    pub target_program: UncheckedAccount<'info>,
    /// CHECK: must be the canonical Solana Instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
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
    pub allowed_instruction_discriminators: Vec<[u8; 8]>,
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
    #[msg("Session scope must contain 1–8 allowed instruction discriminators")]
    InvalidScope,
    #[msg("Program is outside the session scope")]
    ProgramNotAllowed,
    #[msg("Instruction discriminator is outside the session scope")]
    InstructionNotAllowed,
    #[msg("Validation must be invoked by the expected target program and instruction")]
    InvalidInvocation,
    #[msg("Timestamp arithmetic overflow")]
    MathOverflow,
}

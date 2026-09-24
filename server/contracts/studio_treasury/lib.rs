//! Studio Treasury — казна студии: мультисиг-authority + timelock на вывод средств.
//!
//! Инвариант: доступный остаток казны никогда не меньше обязательств перед игроками.
//! Вывод выполняется в два шага: `queue_withdraw` ставит заявку и время исполнения,
//! `execute_withdraw` переводит средства только после истечения timelock.
//! Отменить заявку до исполнения может только authority.
//!
//! Хаб Watchtower этот контракт не вызывает: он read-only (writes: false).

use anchor_lang::prelude::*;

declare_id!("STrEaSuRy11111111111111111111111111111111111");

/// Минимальная задержка вывода: сутки. Меньше — timelock перестаёт защищать от мгновенного вывода.
pub const MIN_TIMELOCK_SECONDS: i64 = 24 * 60 * 60;

#[program]
pub mod studio_treasury {
    use super::*;

    /// Инициализация казны.
    /// Authority берётся из подписи создателя (не из аргумента) — иначе первый вызвавший
    /// мог бы назначить себя мультисигом до легитимного запуска (init front-run).
    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        multisig: Pubkey,
        timelock_seconds: i64,
    ) -> Result<()> {
        require_keys_eq!(multisig, ctx.accounts.payer.key(), ErrorCode::AuthorityMustBeSigner);
        require!(timelock_seconds >= MIN_TIMELOCK_SECONDS, ErrorCode::TimelockTooShort);
        let treasury = &mut ctx.accounts.treasury;
        treasury.authority = multisig;
        treasury.total_deposited = 0;
        treasury.total_withdrawn = 0;
        treasury.liabilities = 0;
        treasury.timelock_seconds = timelock_seconds;
        treasury.pending_amount = 0;
        treasury.pending_recipient = Pubkey::default();
        treasury.pending_release_at = 0;
        treasury.bump = ctx.bumps.treasury;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, game_id: String) -> Result<()> {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &ctx.accounts.treasury.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.depositor.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        let treasury = &mut ctx.accounts.treasury;
        treasury.total_deposited = treasury.total_deposited.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

        emit!(TreasuryDeposited {
            game_id,
            amount,
            depositor: ctx.accounts.depositor.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Постановка заявки на вывод. Средства не переводятся: только фиксируется намерение и срок.
    pub fn queue_withdraw(ctx: Context<QueueWithdraw>, amount: u64, game_id: String) -> Result<()> {
        require_keys_eq!(ctx.accounts.requester.key(), ctx.accounts.treasury.authority, ErrorCode::Unauthorized);
        require!(amount > 0, ErrorCode::AmountMustBePositive);
        require!(ctx.accounts.treasury.pending_release_at == 0, ErrorCode::PendingWithdrawalExists);

        let treasury = &ctx.accounts.treasury;
        let reserved = treasury.total_withdrawn
            .checked_add(amount)
            .and_then(|value| value.checked_add(treasury.liabilities))
            .ok_or(ErrorCode::MathOverflow)?;
        require!(treasury.total_deposited >= reserved, ErrorCode::InsufficientFunds);

        let now = Clock::get()?.unix_timestamp;
        let release_at = now.checked_add(treasury.timelock_seconds).ok_or(ErrorCode::MathOverflow)?;
        let treasury = &mut ctx.accounts.treasury;
        treasury.pending_amount = amount;
        treasury.pending_recipient = ctx.accounts.recipient.key();
        treasury.pending_release_at = release_at;

        emit!(WithdrawQueued {
            game_id,
            amount,
            recipient: ctx.accounts.recipient.key(),
            requester: ctx.accounts.requester.key(),
            release_at,
            timestamp: now,
        });

        Ok(())
    }

    /// Исполнение заявки после истечения timelock. Инвариант перепроверяется:
    /// за время ожидания обязательства могли вырасти.
    pub fn execute_withdraw(ctx: Context<ExecuteWithdraw>) -> Result<()> {
        require_keys_eq!(ctx.accounts.requester.key(), ctx.accounts.treasury.authority, ErrorCode::Unauthorized);
        let now = Clock::get()?.unix_timestamp;
        let treasury = &ctx.accounts.treasury;
        require!(treasury.pending_release_at != 0, ErrorCode::NoPendingWithdrawal);
        require!(now >= treasury.pending_release_at, ErrorCode::TimelockNotElapsed);
        require_keys_eq!(ctx.accounts.recipient.key(), treasury.pending_recipient, ErrorCode::RecipientMismatch);

        let amount = treasury.pending_amount;
        let reserved = treasury.total_withdrawn
            .checked_add(amount)
            .and_then(|value| value.checked_add(treasury.liabilities))
            .ok_or(ErrorCode::MathOverflow)?;
        require!(treasury.total_deposited >= reserved, ErrorCode::InsufficientFunds);

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.treasury.key(),
            &ctx.accounts.recipient.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"studio_treasury", &[ctx.accounts.treasury.bump]]],
        )?;

        let treasury = &mut ctx.accounts.treasury;
        treasury.total_withdrawn = reserved - treasury.liabilities;
        treasury.pending_amount = 0;
        treasury.pending_recipient = Pubkey::default();
        treasury.pending_release_at = 0;

        emit!(WithdrawExecuted {
            amount,
            recipient: ctx.accounts.recipient.key(),
            timestamp: now,
        });

        Ok(())
    }

    /// Отмена заявки до исполнения (например, обнаружена ошибка в расчёте).
    pub fn cancel_withdraw(ctx: Context<CancelWithdraw>) -> Result<()> {
        require_keys_eq!(ctx.accounts.requester.key(), ctx.accounts.treasury.authority, ErrorCode::Unauthorized);
        let treasury = &mut ctx.accounts.treasury;
        require!(treasury.pending_release_at != 0, ErrorCode::NoPendingWithdrawal);
        let amount = treasury.pending_amount;
        treasury.pending_amount = 0;
        treasury.pending_recipient = Pubkey::default();
        treasury.pending_release_at = 0;
        emit!(WithdrawCancelled {
            amount,
            requester: ctx.accounts.requester.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Обязательства перед игроками. Их меняет только authority, и они участвуют в инварианте вывода.
    pub fn set_liabilities(ctx: Context<SetLiabilities>, liabilities: u64) -> Result<()> {
        require_keys_eq!(ctx.accounts.requester.key(), ctx.accounts.treasury.authority, ErrorCode::Unauthorized);
        let treasury = &mut ctx.accounts.treasury;
        treasury.liabilities = liabilities;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 32 + 8 + 1,
        seeds = [b"studio_treasury"],
        bump
    )]
    pub treasury: Account<'info, StudioTreasury>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"studio_treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, StudioTreasury>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct QueueWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"studio_treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, StudioTreasury>,
    pub requester: Signer<'info>,
    /// CHECK: получатель средств; адрес фиксируется в заявке и проверяется при исполнении
    pub recipient: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ExecuteWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"studio_treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, StudioTreasury>,
    pub requester: Signer<'info>,
    /// CHECK: адрес обязан совпадать с pending_recipient — проверяется в инструкции
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"studio_treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, StudioTreasury>,
    pub requester: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetLiabilities<'info> {
    #[account(
        mut,
        seeds = [b"studio_treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, StudioTreasury>,
    pub requester: Signer<'info>,
}

#[account]
pub struct StudioTreasury {
    pub authority: Pubkey, // Squads multisig
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub liabilities: u64,
    pub timelock_seconds: i64,
    pub pending_amount: u64,
    pub pending_recipient: Pubkey,
    /// 0 — заявки нет. Иначе — unix-время, после которого вывод разрешён.
    pub pending_release_at: i64,
    pub bump: u8,
}

#[event]
pub struct TreasuryDeposited {
    pub game_id: String,
    pub amount: u64,
    pub depositor: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawQueued {
    pub game_id: String,
    pub amount: u64,
    pub recipient: Pubkey,
    pub requester: Pubkey,
    pub release_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawExecuted {
    pub amount: u64,
    pub recipient: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawCancelled {
    pub amount: u64,
    pub requester: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds: vault >= liabilities invariant")]
    InsufficientFunds,
    #[msg("Authority must be the signer that initializes the treasury")]
    AuthorityMustBeSigner,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Timelock must be at least 24 hours")]
    TimelockTooShort,
    #[msg("Timelock has not elapsed yet")]
    TimelockNotElapsed,
    #[msg("There is no pending withdrawal")]
    NoPendingWithdrawal,
    #[msg("A pending withdrawal already exists")]
    PendingWithdrawalExists,
    #[msg("Recipient does not match the queued withdrawal")]
    RecipientMismatch,
    #[msg("Amount must be positive")]
    AmountMustBePositive,
}

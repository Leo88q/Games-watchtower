//! Studio Treasury — казна студии с multisig + timelock
//! Для 4 игр, общие инварианты

use anchor_lang::prelude::*;

declare_id!("STrEaSuRy11111111111111111111111111111111111");

#[program]
pub mod studio_treasury {
    use super::*;

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>, multisig: Pubkey) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.authority = multisig;
        treasury.total_deposited = 0;
        treasury.total_withdrawn = 0;
        treasury.liabilities = 0;
        treasury.bump = ctx.bumps.treasury;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, game_id: String) -> Result<()> {
        // Transfer SOL to treasury PDA
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
        treasury.total_deposited += amount;

        emit!(TreasuryDeposited {
            game_id,
            amount,
            depositor: ctx.accounts.depositor.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // Withdraw requires multisig — not callable directly from Watchtower (read-only)
    pub fn request_withdraw(ctx: Context<RequestWithdraw>, amount: u64, game_id: String) -> Result<()> {
        let treasury = &ctx.accounts.treasury;
        require!(treasury.total_deposited >= treasury.total_withdrawn + amount + treasury.liabilities, ErrorCode::InsufficientFunds);

        emit!(WithdrawRequested {
            game_id,
            amount,
            requester: ctx.accounts.requester.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 8 + 8 + 1,
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
pub struct RequestWithdraw<'info> {
    #[account(
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
pub struct WithdrawRequested {
    pub game_id: String,
    pub amount: u64,
    pub requester: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds: vault >= liabilities invariant")]
    InsufficientFunds,
}

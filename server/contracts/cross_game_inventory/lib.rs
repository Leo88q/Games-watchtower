//! Cross-Game Inventory — общие PDA для кросс-игрового инвентаря
//! Мультитенантное ПО: единый профиль игрока для всех 4 игр
//! Anchor контракт для игровой логики, общие PDA для кросс-игрового инвентаря

use anchor_lang::prelude::*;

declare_id!("CgInv111111111111111111111111111111111111111");

#[program]
pub mod cross_game_inventory {
    use super::*;

    /// Создать кросс-игровой профиль — привязан к wallet, не к игре
    /// Используется Privy/Phantom/FirstStep unified identity
    pub fn create_profile(ctx: Context<CreateProfile>, game_id: String) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.owner.key();
        profile.game_id = game_id;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.total_games_played = 1;
        profile.cross_game_items = Vec::new();
        profile.bump = ctx.bumps.profile;
        Ok(())
    }

    /// Добавить предмет из одной игры, доступный в других (cross-game inventory)
    /// cNFT для массовых, standard NFT для редких — ссылка через asset_id
    pub fn add_cross_game_item(
        ctx: Context<AddCrossGameItem>,
        asset_id: Pubkey,
        source_game: String,
        item_type: String,
        rarity: String,
        is_cnft: bool,
    ) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(profile.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);

        let item = CrossGameItem {
            asset_id,
            source_game,
            item_type,
            rarity,
            is_cnft,
            added_at: Clock::get()?.unix_timestamp,
            used_in_games: Vec::new(),
        };
        profile.cross_game_items.push(item);
        Ok(())
    }

    /// Линк предмета для использования во второй игре
    pub fn link_item_to_game(
        ctx: Context<LinkItemToGame>,
        asset_id: Pubkey,
        target_game: String,
    ) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(profile.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);

        for item in &mut profile.cross_game_items {
            if item.asset_id == asset_id {
                if !item.used_in_games.contains(&target_game) {
                    item.used_in_games.push(target_game);
                }
                return Ok(());
            }
        }
        Err(ErrorCode::ItemNotFound.into())
    }

    /// Обновить количество игр — для аналитики Helika/GameSight
    pub fn increment_games_played(ctx: Context<UpdateProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.total_games_played += 1;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 4 + (4 + 100 * 10) + 1 + 8,
        seeds = [b"studio_profile", owner.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, StudioProfile>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCrossGameItem<'info> {
    #[account(
        mut,
        seeds = [b"studio_profile", owner.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, StudioProfile>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct LinkItemToGame<'info> {
    #[account(
        mut,
        seeds = [b"studio_profile", owner.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, StudioProfile>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"studio_profile", owner.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, StudioProfile>,
    pub owner: Signer<'info>,
}

#[account]
pub struct StudioProfile {
    pub owner: Pubkey, // wallet address — Privy/Phantom/FirstStep unified
    pub game_id: String, // first game
    pub created_at: i64,
    pub total_games_played: u64,
    pub cross_game_items: Vec<CrossGameItem>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CrossGameItem {
    pub asset_id: Pubkey, // cNFT assetId or standard NFT mint
    pub source_game: String,
    pub item_type: String,
    pub rarity: String,
    pub is_cnft: bool, // true = cNFT (mass), false = standard (rare)
    pub added_at: i64,
    pub used_in_games: Vec<String>, // games where item was used
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Item not found in profile")]
    ItemNotFound,
}

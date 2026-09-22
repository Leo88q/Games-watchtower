/**
 * Solana Game Preset (solana-developers/solana-game-preset)
 * Официальный стартовый набор от Solana Foundation
 * npx-пресет с готовой Anchor-программой и клиентами на JS и Unity, каркас для быстрого прототипирования
 */

export const SOLANA_GAME_PRESET_CONFIG = {
  sdk: 'solana-game-preset',
  repo: 'https://github.com/solana-developers/solana-game-preset',
  owner: 'Solana Foundation',
  type: 'npx preset',
  purpose: 'rapid prototyping scaffold',
  includes: {
    anchorProgram: 'готовая Anchor-программа — game state, player, score, reward',
    jsClient: 'JS client — web3.js / @solana/kit based',
    unityClient: 'Unity client — Solana.Unity-SDK based',
    tests: 'Anchor tests + JS tests',
  },
  command: 'npx create-solana-game --preset game-preset',
}

export function solanaGamePresetSetup({ gameId, template = 'action' } = {}) {
  return {
    sdk: SOLANA_GAME_PRESET_CONFIG.sdk,
    gameId,
    template, // action, farming, racing, card, etc
    install: {
      npx: `npx create-solana-game ${gameId} --preset ${SOLANA_GAME_PRESET_CONFIG.command}`,
      clone: `git clone ${SOLANA_GAME_PRESET_CONFIG.repo}`,
    },
    includes: SOLANA_GAME_PRESET_CONFIG.includes,
    scaffold: {
      structure: `
${gameId}/
├── programs/${gameId}/src/lib.rs — Anchor program: game state, player, score, reward, session keys
├── app/ — JS client: @solana/web3.js + @solana/kit + Privy + Phantom + wallet-adapter
├── unity/ — Unity client: Solana.Unity-SDK + Phantom deep links + MWA + Session Keys
├── tests/ — Anchor + JS tests
├── idl/ — IDL for Watchtower parser
└── watchtower.json — Watchtower integration config
`,
      anchorProgramExample: `
use anchor_lang::prelude::*;

#[program]
pub mod ${gameId} {
    use super::*;
    pub fn create_player(ctx: Context<CreatePlayer>, game_id: String) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.owner = ctx.accounts.owner.key();
        player.game_id = game_id;
        player.score = 0;
        player.level = 1;
        player.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    pub fn update_score(ctx: Context<UpdateScore>, new_score: u64) -> Result<()> {
        let player = &mut ctx.accounts.player;
        require!(player.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);
        player.score = new_score;
        emit!(ScoreUpdated { player: player.owner, game_id: player.game_id.clone(), score: new_score });
        Ok(())
    }
    pub fn claim_reward(ctx: Context<ClaimReward>, amount: u64) -> Result<()> {
        // Reward logic + treasury
        Ok(())
    }
}

#[account]
pub struct Player {
    pub owner: Pubkey,
    pub game_id: String,
    pub score: u64,
    pub level: u64,
    pub created_at: i64,
}

#[event]
pub struct ScoreUpdated {
    pub player: Pubkey,
    pub game_id: String,
    pub score: u64,
}
`,
      jsClientExample: `
import { Connection, PublicKey } from '@solana/web3.js'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import idl from './idl/${gameId}.json'

const program = new Program(idl, programId, provider)
const [playerPda] = PublicKey.findProgramAddressSync([Buffer.from("player"), owner.toBuffer()], programId)
await program.methods.createPlayer("${gameId}").accounts({ player: playerPda, owner }).rpc()
await program.methods.updateScore(100).accounts({ player: playerPda }).rpc()

// Watchtower integration
await fetch('/api/ingest/solana', {
  method: 'POST',
  body: JSON.stringify({
    eventType: 'PlayerJoined',
    gameId: '${gameId}',
    programId: programId.toString(),
    payload: { solana_wallet: owner.toString(), score: 100 }
  })
})
`,
      unityClientExample: `
var program = new AnchorProgram(client, programId, idl)
var playerPda = await program.FindPda(new[] { "player", walletPubkey }, programId)
await program.Call("create_player", new[] { "${gameId}" }, new { player = playerPda, owner = walletPubkey }, keypair)
`,
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      idl: 'idl/ for parser — Watchtower decodes events via Anchor coder',
      events: ['PlayerCreated', 'ScoreUpdated', 'RewardClaimed'],
      crossGame: 'Add studio_profile PDA for cross-game inventory — extend preset',
      sessionKeys: 'Add session_keys program SessKeys111... for frequent actions',
      cNFT: 'Add bubblegum mintV2 for mass items $110/M',
      l2: 'Add Sonic HyperGrid / MagicBlock ER for scaling',
      analytics: 'Add solana_wallet as external_id for GameSight Late ID Binding + Helika',
    },
    useFor: 'rapid prototyping for new games or new features in existing 4 games',
    writes: false,
  }
}

export function solanaGamePresetHealth(env = process.env) {
  return {
    sdk: SOLANA_GAME_PRESET_CONFIG.sdk,
    type: SOLANA_GAME_PRESET_CONFIG.type,
    owner: SOLANA_GAME_PRESET_CONFIG.owner,
    includes: Object.keys(SOLANA_GAME_PRESET_CONFIG.includes),
    command: SOLANA_GAME_PRESET_CONFIG.command,
    configured: true,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Solana Game Skill для Claude Code (solanabr/solana-game-skill)
 * Не библиотека а набор навыков (skill addon) для AI-ассистента Claude который добавляет в его контекст специфические паттерны для Solana-геймдева
 * Работа с Unity SDK, Mobile Wallet Adapter, архитектура состояний (ончейн vs оффчейн) и тестирование
 * Если используете AI в разработке это может ускорить генерацию корректного кода
 */

export const CLAUDE_SKILL_CONFIG = {
  skill: 'Solana Game Skill for Claude Code',
  repo: 'https://github.com/solanabr/solana-game-skill',
  owner: 'solanabr',
  type: 'skill addon for AI assistant Claude',
  purpose: 'добавляет в контекст Claude специфические паттерны для Solana-геймдева',
  patterns: {
    unitySdk: 'работа с Unity SDK — Solana.Unity-SDK NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys',
    mwa: 'Mobile Wallet Adapter — Android wallet connect',
    stateArchitecture: 'архитектура состояний ончейн vs оффчейн — что хранить on-chain (verifiable) vs off-chain (cost)',
    testing: 'тестирование — Anchor tests, JS tests, Unity play mode tests, smoke tests',
  },
  benefit: 'Если используете AI в разработке это может ускорить генерацию корректного кода',
}

export function claudeSkillSetup({ gameId } = {}) {
  return {
    skill: CLAUDE_SKILL_CONFIG.skill,
    gameId,
    repo: CLAUDE_SKILL_CONFIG.repo,
    type: CLAUDE_SKILL_CONFIG.type,
    purpose: CLAUDE_SKILL_CONFIG.purpose,
    patterns: CLAUDE_SKILL_CONFIG.patterns,
    benefit: CLAUDE_SKILL_CONFIG.benefit,
    install: {
      claudeCode: 'Claude Code extension — install skill addon solana-game-skill',
      manual: `git clone ${CLAUDE_SKILL_CONFIG.repo} && cp -r solana-game-skill ~/.claude/skills/`,
      config: `~/.claude/config.json: { "skills": ["solana-game-skill"] }`,
    },
    patternsDetail: {
      unitySdk: `
# Unity SDK pattern for Claude

# Claude with solana-game-skill knows:
# - Solana.Unity-SDK package com.solana.unity-sdk
# - PhantomDeepLink.Connect() for mobile
# - SessionKeys.CreateSession(targetProgram, topUp, expiry) for auto confirm
# - Nft.TryGetNftData, cNftService.GetCompressedNft via DAS
# - CandyMachineV3.GetCandyMachine MintNft
# - MobileWalletAdapterWallet Connect for Android

# Prompt to Claude: "Create Unity script for ARES-1 potato planting with Solana.Unity-SDK + Session Keys"
# Claude generates correct code with Session Keys + Phantom deep links + MWA

# Without skill: Claude might generate outdated web3.js or wrong Unity SDK usage
# With skill: Claude generates correct Solana.Unity-SDK patterns
`,
      mwa: `
# Mobile Wallet Adapter pattern for Claude

# Claude knows MWA for Android:
# - Mobile Wallet Adapter is for Android native wallet connect
# - Different from Phantom deep links (deep links for iOS/Android, MWA for Android native)
# - MWA: user selects wallet app, approves via wallet app, returns to game
# - Code: MobileWalletAdapterWallet new + Connect + SignTransaction

# Prompt: "Add MWA support for Android in Unity"
# Claude generates MWA code correctly
`,
      stateArchitecture: `
# State architecture onchain vs offchain pattern for Claude

# Claude knows what to store on-chain vs off-chain:

# On-chain (verifiable, transparent, cost):
# - Player profile: owner, score, level, cross-game items — StudioProfile PDA CgInv111...
# - Game state: Position, Health, Inventory, PotatoField growth_stage — ARC Component or Bolt component
# - Economy: TokenMinted, TokenBurned, TreasuryDeposited — vault >= liabilities invariant
# - Marketplace: listings, sales — verifiable
# - Session Keys: SessionToken owner session_key target_program top_up expiry allowed_programs denied_instructions
# - cNFT: Merkle Tree + MCC, assetId off-chain metadata

# Off-chain (cost saving, performance, not verifiable):
# - Session data: SessionStarted, SessionEnded, FirstAction — in PG + TimescaleDB + Redis
# - Analytics: DAU/WAU/MAU, retention, funnel, cross-game segments — TimescaleDB aggregates
# - Chat, social, notifications — off-chain
# - AI inference: Husks INT8 training, Aureus bot competition — off-chain via DePIN or MagicBlock ER then commit proof on-chain
# - L2: Sonic HyperGrid thousands actions, Sorada 5ms reads, MagicBlock ER sub-10ms gasless — execution off-chain L2, state committed to Solana

# Decision: on-chain if needs verifiability transparency + economy + ownership, off-chain if cost performance + not critical

# Prompt: "Design state architecture for ARES-1 potato colony onchain vs offchain"
# Claude generates correct separation: Player, PotatoField, Score on-chain via Bolt/ARC + SessionStarted, analytics off-chain PG + farming execution in MagicBlock ER gasless
`,
      testing: `
# Testing pattern for Claude

# Claude knows testing for Solana gamedev:

# Anchor tests:
# anchor test — localnet deployment, real event emission, decoding, duplicate delivery, reconnect, backfill, slot gap healing, finalized reconciliation, failed tx, treasury invariant, reward cap, fraud review, campaign consent/opt-out, read-only API without signer, no blockchain writes exporter

# JS tests:
# npm test — unit tests for parsers, event envelope, idempotency canonical identity cluster+slot+signature+instructionIndex+innerIndex

# Unity play mode tests:
# Play mode tests for Session Keys, cNFT mint, marketplace list, L2 HyperGrid

# Godot tests:
# GdUnit4 for SolanaClient, WalletAdapter, AnchorProgram

# Smoke tests:
# npm run smoke — health, read-model, ingestion deduplication solana + trafficgen, trafficgen adapter/analytics/infra, control safety, metrics — already implemented scripts/smoke-test.mjs

# Prompt: "Create Anchor tests for cross_game_inventory program"
# Claude generates tests for create_profile, add_cross_game_item, link_item_to_game, increment_games_played with real fixtures

# Prompt: "Create smoke test for Watchtower OS 7 layers"
# Claude generates test for /api/os/config health + identity + session-keys + assets + indexer + l2 + analytics + marketplace + engines + sdk
`,
    },
    codeExamples: {
      claudePromptUnity: `
# Prompt to Claude with solana-game-skill for Unity

"Create Unity C# script for ARES-1 potato colony with Solana.Unity-SDK:
- Connect wallet via Phantom deep links + Mobile Wallet Adapter for Android
- Create session key 0.01 SOL 60min expiry for frequent harvest actions
- Mint cNFT common potato via Bubblegum v2 Merkle Tree MCC $110/M
- Call Anchor program CgInv111... add_cross_game_item
- Track event to Watchtower /api/ingest/solana with solana_wallet for GameSight
- Use Sonic HyperGrid for high frequency harvest + Sorada 5ms reads for inventory
- List cNFT via Tensor + Shyft escrow-less + GameShift USD"

Claude with skill generates correct code with all patterns — PhantomDeepLink, SessionKeys.CreateSession, CnftService.MintV2, AnchorProgram, WatchtowerAnalytics.Track, SonicHyperGrid, etc
`,
      claudePromptState: `
# Prompt to Claude for state architecture

"Design onchain vs offchain state architecture for GUTTERCAPS collectibles + wagering:
- On-chain: Player, Pack, Fusion, Wager, SKR pool, Session Keys, cNFT Merkle Tree MCC, marketplace listings
- Off-chain: SessionStarted, analytics DAU retention, chat, AI inference Husks Aureus via DePIN
- L2: MagicBlock ER sub-10ms gasless for pack open/fusion/wager + Sonic HyperGrid for high frequency
- DePIN: VRF, fusion, PvP matchmaking, burn oracle, reward oracle, battle resolver off-chain -> DePIN workers stake escrow rewards
- Fully on-chain via Bolt verifiable + Gamba provably fair
- Watchtower indexer LaserStream + Shyft + PG"

Claude generates correct separation with Bolt + ARC + DePIN + MagicBlock ER + Session Keys + cNFT + marketplace
`,
      claudePromptTesting: `
# Prompt to Claude for testing

"Create Anchor tests for cross_game_inventory program CgInv111...:
- Test create_profile game_id
- Test add_cross_game_item asset_id source_game item_type rarity is_cnft
- Test link_item_to_game asset_id target_game
- Test increment_games_played
- Test with real transaction fixtures
- Test idempotency canonical identity
- Test no blockchain writes from exporter"

Claude generates anchor tests with fixtures
`,
    },
    watchtowerIntegration: {
      skill: 'Solana Game Skill for Claude Code — skill addon for Claude',
      patterns: 'Unity SDK, Mobile Wallet Adapter, state architecture onchain vs offchain, testing',
      benefit: 'ускоряет генерацию корректного кода если используете AI в разработке',
      useFor: 'All teams using AI (Claude) for code generation — Unity, Godot, Unreal, Web, Backend, L2, Analytics, Marketplace',
      prompts: [
        'Create Unity script for ARES-1 with Solana.Unity-SDK + Session Keys + cNFT + Sonic HyperGrid',
        'Design state architecture onchain vs offchain for GUTTERCAPS',
        'Create Anchor tests for cross_game_inventory',
        'Create smoke test for Watchtower OS 7 layers + 12 new products',
      ],
      claudeCode: 'Claude Code extension with skill addon solana-game-skill',
    },
    writes: false,
  }
}

export function claudeSkillHealth(env = process.env) {
  return {
    skill: CLAUDE_SKILL_CONFIG.skill,
    repo: CLAUDE_SKILL_CONFIG.repo,
    type: CLAUDE_SKILL_CONFIG.type,
    purpose: CLAUDE_SKILL_CONFIG.purpose,
    patterns: Object.keys(CLAUDE_SKILL_CONFIG.patterns),
    benefit: CLAUDE_SKILL_CONFIG.benefit,
    configured: true,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

import { esc, escJson } from './escape.js'
/**
 * Watchtower OS v3 — Панель управления для каждой функции
 * Что умеет наше SDK и что внедряем в игры (ares1, aof, neonrelay, guttercaps)
 * Идеальный бесплатный стек v3 — 33 компонента, дедуплицированный, без мусорки
 */

export const CONTROL_PANELS = [
  {
    id: 'identity',
    title: '👛 Identity Layer — best free',
    icon: '👛',
    color: '#37e5a0',
    sdk: {
      name: 'Privy + Phantom Connect Kit + FirstStep + Altude',
      capabilities: [
        'Privy useCreateWallet, useSolanaWallets — auto Solana wallet при первом входе, email/social login, secure enclave, export',
        'Phantom Connect Kit OAuth-login, instant wallet, deep links, MWA Mobile Wallet Adapter',
        'FirstStep SDK — guest mode, gas sponsorship, progressive onboarding — игрок начинает без кошелька',
        'Altude — gasless relay fallback, fee abstraction, batching',
        'Cross-game PDA studio_profile Anchor CgInv111... для кросс-игрового инвентаря',
        'Onboarding flow: firststep guest → privy embedded → phantom native → linked cross-game PDA',
      ],
      api: ['/api/identity/config', '/api/identity/health', '/api/identity/wallet', '/api/identity/tenant/:gameId'],
      npm: ['@privy-io/react-auth', '@phantom/connect-kit', '@solana/wallet-adapter'],
    },
    games: {
      ares1: 'Guest входит без кошелька (FirstStep) → farm первые картофелины → Privy email/social создаёт Solana wallet в enclave → Phantom native link → studio_profile PDA хранит cross-game inventory Position GrowthStage',
      aof: 'Farming & crafting — guest gas sponsorship, embedded wallet auto, cross-game материалы, RLS tenant_id aof, materialized view cross-game',
      neonrelay: 'Race & Neon DM — Phantom OAuth instant wallet, MWA deep links, session telemetry match_start/end, reward ledger Solana economy, cross-game skins tracks',
      guttercaps: 'Pop-n-shoot casual — FirstStep guest → embedded → native linked, cross-game caps skins, ECS 8-12 memory leak fix via new SDK',
    },
    control: {
      actions: ['Создать unified wallet', 'Линк Solana + EVM via RACE + idosgames', 'Проверить tenant identity', 'Экспорт wallet из enclave'],
      metrics: ['4 провайдера configured', 'cross-game PDA studio_profile', 'onboardingFlow guest→embedded→native→linked'],
    }
  },
  {
    id: 'sessionKeys',
    title: '🔑 Session Keys — JWT для Web3, риск 0.01 SOL',
    icon: '🔑',
    color: '#a78bfa',
    sdk: {
      name: 'Session Keys — временные ключи',
      capabilities: [
        'createSession(targetProgramPublicKey, topUp 0.01 SOL, expiry 60min) — временная пара на клиенте, session token',
        'signAndSendTransaction(sessionToken, transaction) без раскрытия приватного ключа основного кошелька',
        'revokeSession(sessionToken) — отзыв',
        'Риск ограничен только topUp (0.01 SOL default, max 0.1 SOL), temporary keypair isolated',
        'Scope: allowedPrograms [targetProgram], deniedInstructions [withdraw_treasury, update_authority, mint_unlimited]',
        'Unity из коробки Solana.Unity-SDK, Web custom, Godot/Unreal аналог temporary keypair 0.01 SOL',
        'Godot detailed: SolanaClient WalletAdapter AnchorProgram session keys analog',
      ],
      api: ['/api/session-keys/config', '/api/session-keys/health', '/api/session-keys/create', '/api/session-keys/list', '/api/session-keys/:token', '/api/session-keys/sign', '/api/session-keys/revoke'],
      npm: ['@solana/web3.js session keys custom'],
    },
    games: {
      ares1: 'Frequent farming actions — plant, harvest, craft — без подтверждения каждый раз, topUp 0.01 SOL, expiry 60min, scope denied withdraw_treasury',
      aof: 'Crafting gamble Gamba provably fair — wager via session key, risk 0.01 SOL only',
      neonrelay: 'High frequency racing — move, boost, finish race — session key для автоматического подтверждения, frequent race actions без UX friction',
      guttercaps: 'Pop-n-shoot — shoot, pop — session key для gasless UX via MagicBlock ER delegate executeGasless <10ms',
    },
    control: {
      actions: ['Создать session для CgInv111...', 'Список активных sessions', 'Подписать tx via session key', 'Revoke session'],
      metrics: ['topUp 0.01 SOL default', 'expiry 60min', 'max loss topUp only', 'scope denied withdraw_treasury'],
    }
  },
  {
    id: 'assets',
    title: '🗜️ Assets — cNFT $110/M + Core Attributes + Xandeum — best free ideal stack',
    icon: '🗜️',
    color: '#ffb85c',
    sdk: {
      name: 'cNFT + Standard + Core Attributes + Xandeum + Gamba + Husks + RitArena + RACE',
      capabilities: [
        'cNFT Bubblegum v2 Merkle Tree MCC BGUMAp9... cmtDv... — 1M ~ $110 off-chain no token/mint account, savings x10000 vs standard $1.8M',
        'Standard NFT Metaplex Token Metadata metaqbxx... Tokenkeg... — rare legendary founder badge land',
        'Metaplex Core Attributes Plugin — on-chain key-value in NFT game stats level/wins/harvests readable by Solana programs indexable via DAS getAssetsByOwner 5ms vs 150ms — best free on-chain stats',
        'Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes npm i @xandeum/sdk — best free scalable storage better than Arweave for game state',
        'Strategy: mass common consumable material -> cNFT $110/M, rare legendary -> Standard, wager fighter bot -> cNFT, on-chain stats -> Core Attributes, game states -> Xandeum',
        'Marketplace: Tensor primary Bubblegum v2, ME deprecated for new cNFT, Shyft escrow-less, GameShift USD',
        'Gamba wager NFT provably fair house edge 5% jackpot, Husks fighter procedural pixel INT8, RitArena bot lifecycle retry events best free arena, RACE multichain cNFT Solana Tensor NFT EVM OpenSea',
      ],
      api: ['/api/assets/config', '/api/assets/health', '/api/assets/cnft/collection', '/api/assets/strategy?gameId=ares1&itemType=common&rarity=common', '/api/sdk/core-attributes', '/api/sdk/xandeum', '/api/storage/core-attributes', '/api/storage/xandeum'],
      npm: ['@metaplex-foundation/mpl-core', '@xandeum/sdk', 'gamba', '@bytez3/husks-sdk', 'ritarena-sdk'],
    },
    games: {
      ares1: 'Mass common potato harvest items → cNFT $110/M Bubblegum v2 Merkle Tree MCC Tensor primary, rare legendary → Standard NFT, stats level/wins → Core Attributes on-chain key-value readable programs DAS, game states → Xandeum exabyte scalable',
      aof: 'Common seeds crops materials → cNFT $110/M, golden tools land → Standard, GrowthStage Position → Core Attributes on-chain, farming states → Xandeum exabyte, crafting gamble → Gamba wager NFT',
      neonrelay: 'Common skins tracks emotes → cNFT $110/M, rare skins founder badge → Standard, race results fastest lap → Core Attributes on-chain key-value, race states → Xandeum exabyte, ticket wager → Gamba, race AI bots → Husks + RitArena bot NFT',
      guttercaps: 'Common caps skins consumables → cNFT $110/M, golden cap founder → Standard, score death rate → Core Attributes on-chain, cap states → Xandeum exabyte, cap shooting gamble → Gamba, cap fighters → Husks + RitArena',
    },
    control: {
      actions: ['Создать cNFT коллекцию Bubblegum v2', 'Добавить Core Attribute level/wins', 'Сохранить game state в Xandeum exabyte', 'Проверить asset strategy', 'Mint wager fighter bot NFT'],
      metrics: ['cNFT $110/M costPerMillionUsd 110 costPerNftUsd 0.00011 savings x10000', 'Core Attributes on-chain key-value readable programs DAS 5ms', 'Xandeum exabyte scalable decentralized'],
    }
  },
  {
    id: 'storage',
    title: '💾 Storage — Xandeum exabyte + PST private + Core Attributes — best free ideal stack',
    icon: '💾',
    color: '#37e5a0',
    sdk: {
      name: 'Xandeum + Private State Toolkit + Core Attributes Plugin',
      capabilities: [
        'Xandeum scalable storage layer dApps Solana exabytes game states assets player data decentralized network grow to exabytes npm i @xandeum/sdk save({gameId, key, data}) exabyte scalable — best free scalable storage better than Arweave for game state, free tier exabyte',
        'Private State Toolkit PST private but verifiable state commitments on-chain encrypted off-chain ideal for hidden logic card games npm i @private-state-toolkit/sdk commit({gameId, commitment: hash(hiddenState)}) only commitment on-chain storeEncrypted commitment encryptedState encrypted off-chain verify commitment proof verifiable commitCardHand revealWithProof — best free private verifiable',
        'Core Attributes Plugin on-chain key-value in NFT game stats characteristics readable by Solana programs indexable via DAS npm i @metaplex-foundation/mpl-core addAttribute nftAddress key level value 10 on-chain key-value readProgram In Anchor program via CPI stats readable — best free on-chain stats',
        'Ideal free: Xandeum scalable public off-chain exabyte + PST private commitments on-chain encrypted off-chain + Core Attributes public on-chain key-value = full coverage storage privacy not competitive',
        'vs legacy: cNFT off-chain Arweave/Shadow/Irys for metadata $110/M vs Xandeum exabyte scalable for game states — Xandeum better for scalable, Arweave fallback for cNFT metadata',
      ],
      api: ['/api/storage/config', '/api/storage/health', '/api/storage/xandeum', '/api/storage/pst', '/api/storage/core-attributes', '/api/infra/xandeum', '/api/infra/pst', '/api/infra/core-attributes', '/api/sdk/xandeum', '/api/sdk/pst', '/api/sdk/core-attributes'],
      npm: ['@xandeum/sdk', '@private-state-toolkit/sdk', '@metaplex-foundation/mpl-core'],
    },
    games: {
      ares1: 'Game states potato plots → Xandeum exabyte scalable, hidden logic card games? → PST private commitments, stats level/wins → Core Attributes on-chain key-value readable programs DAS',
      aof: 'Farming states crop plots GrowthStage → Xandeum exabyte + Core Attributes on-chain key-value Position GrowthStage Owner, hidden crafting recipes → PST private commitments',
      neonrelay: 'Race states Position Velocity RaceResult → Xandeum exabyte + Core Attributes on-chain fastest lap, hidden map logic? → PST private verifiable',
      guttercaps: 'Cap states Position Health → Xandeum exabyte + Core Attributes on-chain score death rate, hidden enemy logic → PST private',
    },
    control: {
      actions: ['Сохранить game state в Xandeum exabyte', 'Commit private state PST hash(hiddenState)', 'Store encrypted off-chain PST', 'Verify commitment proof', 'Add Core Attribute on-chain key-value', 'Index via DAS getAssetsByOwner 5ms'],
      metrics: ['Xandeum exabyte scalable decentralized free tier', 'PST private verifiable commitments on-chain encrypted off-chain', 'Core Attributes on-chain key-value readable programs DAS 5ms'],
    }
  },
  {
    id: 'security',
    title: '🔒 Security — Auditing Skill + Sentio CLI + SolGuard 130+ — best free ideal stack',
    icon: '🔒',
    color: '#ff6b8a',
    sdk: {
      name: 'Solana Security Auditing Skill + Sentio CLI + SolGuard 130+ patterns',
      capabilities: [
        'Solana Security Auditing Skill ready set instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities signer checks owner checks PDA seeds validation CPI security reentrancy integer overflow access control close account init checks claude-code skill install solana-security-auditing-skill — best free security skill prompt-based systematic audit',
        'Sentio CLI AST scanner security Solana Anchor Rust common vuln patterns Rust source Anchor patterns common vulns CI integration cargo install sentio-cli npm i -g @sentio/cli scan --program ./programs/cross_game_inventory scan --severity high audit --anchor --report json scan --ci --fail-on high — best free static AST scanner',
        'SolGuard / SolShield AI tools automatic audit Solana smart contracts checking 130+ vulnerability patterns signer checks rights bypass flash-loan exploits PDA validation CPI injection reentrancy overflow access control account confusions npm i -g solguard cargo install solguard audit ./programs/cross_game_inventory --patterns 130 --report json audit --severity critical,high ci --fail-on high — best free AI auto audit 130+ patterns chosen over SolShield similar duplicate SolGuard more established',
        'Ideal free: Skill prompt-based systematic audit + Sentio static AST + SolGuard AI 130+ = full coverage not competitive each distinct action, SolShield duplicate deprecated pick SolGuard',
      ],
      api: ['/api/security/config', '/api/security/health', '/api/security/auditing-skill', '/api/security/sentio-cli', '/api/security/solguard', '/api/sdk/security-auditing-skill', '/api/sdk/sentio-cli', '/api/sdk/solguard'],
      npm: ['solana-security-auditing-skill', '@sentio/cli', 'solguard'],
    },
    games: {
      ares1: 'Audit cross_game_inventory CgInv111... session_keys SessKeys111... studio_treasury STrEaSuRy111... + ARES1_CORE_PROGRAM_ID via Security Auditing Skill systematic audit + Sentio CLI AST scan + SolGuard AI 130+ patterns signer checks rights bypass flash-loan exploits — best free security full coverage',
      aof: 'Audit AOF_CORE_PROGRAM_ID farming crafting trading marketplace cross-game inventory via Security Auditing Skill + Sentio + SolGuard 130+',
      neonrelay: 'Audit NEONRELAY_REWARDS_PROGRAM_ID race Neon DM server-authoritative identity reward ledger via Security Auditing Skill + Sentio + SolGuard 130+',
      guttercaps: 'Audit GUTTERCAPS_CORE_PROGRAM_ID pop-n-shoot casual ECS 8-12 memory leaked via Security Auditing Skill + Sentio + SolGuard 130+',
    },
    control: {
      actions: ['Audit via Security Auditing Skill systematic', 'Scan via Sentio CLI AST', 'Audit via SolGuard 130+ patterns', 'CI fail-on high', 'Generate JSON report'],
      metrics: ['Security Auditing Skill free systematic audit signer/owner/PDA/CPI/reentrancy/overflow', 'Sentio CLI free AST scanner Rust common vulns CI', 'SolGuard free AI auto audit 130+ patterns chosen over SolShield duplicate'],
    }
  },
  {
    id: 'indexer',
    title: '📡 Indexer — LaserStream gRPC 24h replay + Shyft gPA 15ms + PG — best free',
    icon: '📡',
    color: '#a78bfa',
    sdk: {
      name: 'Helius LaserStream gRPC + WS + DAS + Shyft REST callbacks + Custom PG TimescaleDB Redis',
      capabilities: [
        'LaserStream gRPC subscription accounts game program PDAs transactions accountInclude program IDs vote false failed false commitment confirmed 24h historical replay multinode failover priority fee API webhooks DAS API — critical backend',
        'WebSocket logsSubscribe programSubscribe accountSubscribe signatureSubscribe — UI real-time',
        'DAS getAssetsByOwner getAsset getAssetsByGroup searchAssets — metadata normalization cNFT/standard + Core Attributes on-chain key-value indexable via DAS 5ms vs 150ms',
        'Priority Fee API api.helius.xyz/v0/priority-fee dynamic priority fees',
        'Shyft base api.shyft.to NFT API Token API Wallet API Callback API Marketplace API accelerated gPA p50 15ms callbackEvents TOKEN_MINT NFT_MINT TOKEN_TRANSFER NFT_TRANSFER NFT_LIST NFT_SALE REST /sol/v1/nft/read read_all collection wallet/token_balance all_tokens history get_portfolio transaction/history gpa accelerated callback/create list remove',
        'Custom PG PostgreSQL TimescaleDB Redis tables raw_events canonical identity cluster+slot+signature+instructionIndex+innerIndex parsed_events player_sessions player_profiles pseudonymous playerKey economy_flows treasury_snapshots security_signals marketplace_listings cross_game_links investor_snapshots arc_entities bolt_worlds depin_workers gamba_wagers husks_fighters ritarena_bots race_links timeseries daily_active_players retention_cohorts economy_metrics_hourly rpc_latency indexer_lag churn_risk cross_game_overlap multitenant tenant_id RLS tenants ares1 aof neonrelay guttercaps cross-game materialized view features idempotency deduplication cursor/replay backfill reconnect gap detection finalized reconciliation parser versioning + Xandeum exabyte scalable storage for game states',
        'Flow: LaserStream gRPC real-time streaming -> Shyft Callback TOKEN_MINT NFT_MINT webhooks -> Custom PG parsing dedup -> TimescaleDB aggregates DAU/WAU/MAU retention economy -> Redis queues cache realtime -> Watchtower API read-model + ARC ComponentAdded Bolt PlotPlanted RaceStarted CapShot DePIN WorkerStaked Gamba WagerCreated Husks FighterSummoned RitArena BotCreated RACE CrossChainLinked Arcium confidential Xandeum scalable PST private Core Attributes on-chain key-value',
      ],
      api: ['/api/indexer/config', '/api/indexer/health', '/api/infra/arc', '/api/infra/bolt', '/api/infra/depin', '/api/infra/arcium', '/api/infra/xandeum', '/api/infra/pst', '/api/infra/core-attributes'],
      npm: ['@helius-labs/laserstream', '@shyft-to/sdk'],
    },
    games: {
      ares1: 'LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + ARES1_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt PlotPlanted + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium confidential + Xandeum scalable + PST private + Core Attributes on-chain key-value + raw_events canonical identity + Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/ares1 + gPA 15ms + PG TimescaleDB Redis',
      aof: 'LaserStream gRPC AOF_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt PlotPlanted + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks + PG',
      neonrelay: 'LaserStream gRPC NEONRELAY_REWARDS_PROGRAM_ID + ARC ComponentAdded + Bolt RaceStarted RaceFinished + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks + PG + session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat',
      guttercaps: 'LaserStream gRPC GUTTERCAPS_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt CapShot + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks + PG + quality issues retained 20% churn retained replays startup crash score death rate',
    },
    control: {
      actions: ['Subscribe LaserStream gRPC CgInv SessKeys STrEaSuRy + game program', 'Create Shyft callback TOKEN_MINT NFT_MINT', 'Query gPA accelerated p50 15ms', 'Backfill gap detection finalized reconciliation', 'Save to Xandeum exabyte scalable'],
      metrics: ['LaserStream gRPC 24h replay failover', 'Shyft gPA p50 15ms accelerated', 'PG TimescaleDB Redis idempotency gap backfill finalized reconciliation', 'ARC Bolt DePIN Gamba Husks RitArena RACE Arcium Xandeum PST Core Attributes events'],
    }
  },
  {
    id: 'l2',
    title: '⚡ L2 — Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA + Arcium confidential — best free ideal stack',
    icon: '⚡',
    color: '#ffb85c',
    sdk: {
      name: 'Sonic SVM HyperGrid Sorada Rush + REPLA repla-cli + MagicBlock ER sub-10ms gasless Magic Actions + Arcium Rollups confidential + PST private + Xandeum exabyte',
      capabilities: [
        'Sonic Atomic SVM L2 settlement Solana mainnet endpoints api.mainnet-alpha.sonic.game rpc.mainnet-alpha.sonic.game grpc.mainnet-alpha.sonic.game HyperGrid each game gets dedicated grid thousands simultaneous actions without contention isolation true concurrency thousands useFor high frequency ARES-1 Neon Relay real-time PvP',
        'Sorada read-ops 30-40x faster RPC response from 5ms useFor leaderboards inventory reads matchmaking getAssetsByOwner 5ms vs 150ms',
        'Rush ECS declarative framework describe world entities configs SDK generates contracts entities Player components Position Inventory systems MovementSystem',
        'REPLA L3 rollup framework cli repla-cli settlement Anchor program on Solana mainnet runtime MagicBlock sequencer commands repla init --game start --grid deploy --network mainnet logs --follow status sdks Unity Unreal Godot useFor casual AOF GUTTERCAPS',
        'MagicBlock Ephemeral Rollups sub-10ms + gasless flow delegate_account ER execute_in_er <10ms commit_state returns to Solana Magic Actions auto execution triggers time cron every 5 min harvest account_change level up auto grant reward custom match ends settle rewards auto battle cron Husks auto tournament cron RitArena useFor casual gasless UX + auto execution + AI agents auto PvP auto tournament',
        'Arcium Rollups confidential computing rollups gaming payments architecture privacy npm i @arcium/sdk confidentialPayment gameId amount private true createRollup gameId type confidential — best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA',
        'PST Private State Toolkit private verifiable commitments on-chain encrypted off-chain hidden logic card games best free private',
        'Xandeum scalable storage layer exabytes game states assets player data best free scalable',
        'Router l2Router gameId tpsRequirement uxRequirement decision tree tps>100 isolation -> HyperGrid need 5ms reads -> Sorada declarative world -> Rush ECS L3 CLI -> REPLA gasless auto triggers -> MagicBlock ER AI auto PvP auto tournament -> MagicBlock ER + Magic Actions + confidential payments -> Arcium',
      ],
      api: ['/api/l2/config', '/api/l2/health', '/api/l2/router?gameId=ares1&tps=high|low&ux=gasless + Arcium privacy + PST private + Xandeum scalable ideal free', '/api/infra/arcium', '/api/infra/xandeum', '/api/infra/pst', '/api/sdk/arcium', '/api/sdk/xandeum', '/api/sdk/pst'],
      npm: ['@sonic/game-sdk', '@magicblock-labs/bolt-sdk', '@magicblock-labs/ephemeral-rollups-sdk', '@arcium/sdk', '@xandeum/sdk', '@private-state-toolkit/sdk'],
    },
    games: {
      ares1: 'Casual farming gasless — MagicBlock ER sub-10ms gasless delegate executeGasless commit state + Magic Actions auto harvest every 5 min + REPLA L3 Anchor settle MagicBlock sequencer + Arcium confidential rollups privacy payments best free + PST private verifiable commitments + Xandeum exabyte scalable + Sorada 5ms leaderboards inventory + Rush ECS declarative world config',
      aof: 'Casual farming gasless — MagicBlock ER sub-10ms gasless + Magic Actions auto harvest + REPLA + Arcium confidential + PST private + Xandeum exabyte ideal free L2 privacy storage',
      neonrelay: 'High frequency Neon Relay real-time PvP racing — Sonic HyperGrid dedicated grid thousands no contention thousands simultaneous actions without resource contention Sonic API client create grid per game execute high frequency isolated monitoring tps latency grid health fallback Solana mainnet + Sorada 5ms reads leaderboards inventory matchmaking getAssetsByOwner 5ms vs 150ms + Rush ECS declarative world config + MagicBlock ER sub-10ms gasless + Magic Actions auto settle race + REPLA + Arcium confidential privacy best free + PST private + Xandeum exabyte ideal free L2 privacy storage — Router tps=high -> HyperGrid + Arcium privacy',
      guttercaps: 'Casual pop-n-shoot gasless — MagicBlock ER sub-10ms gasless delegate executeGasless commit state + Magic Actions auto respawn every round + REPLA L3 Anchor settle MagicBlock sequencer + Arcium confidential + PST private + Xandeum exabyte ideal free',
    },
    control: {
      actions: ['Route via l2Router gameId tps ux', 'Create Sonic HyperGrid dedicated grid', 'Delegate account to MagicBlock ER', 'Execute gasless <10ms', 'Create Magic Action cron time', 'Create Arcium confidential rollup privacy', 'Commit private state PST', 'Save to Xandeum exabyte'],
      metrics: ['Sonic HyperGrid thousands no contention best free high frequency', 'Sorada 5ms 30-40x reads best free', 'MagicBlock ER sub-10ms gasless best free', 'Magic Actions auto battle tournament best free', 'Arcium confidential privacy best free', 'PST private verifiable best free', 'Xandeum exabyte scalable best free'],
    }
  },
  {
    id: 'analytics',
    title: '📊 Analytics — Helika + GameSight + Game Signals ML 60M+ — best free',
    icon: '📊',
    color: '#37e5a0',
    sdk: {
      name: 'Helika cross-game dashboard + GameSight ad->on-chain attribution + Game Signals 60M+ tx 12 games ML churn 14d >85%',
      capabilities: [
        'Helika unified dashboard Web2 in-game on-chain products user acquisition marketing attribution LiveOps A/B tests on-chain analytics 10+ networks clients Yuga Labs Treasure warning AI focus shift backup needed features web2 ingestion in-game events on-chain analytics cross-game dashboard ab testing liveOps useFor cross-game dashboard mapping WalletConnected->wallet_connected PlayerJoined->player_joined TokenMinted->token_minted etc attribution campaign_id utm_source solana_wallet as external_id',
        'GameSight Solana integration automatically pulls on-chain events into reporting events come as Anonymous Events with Wallet ID for attribution need to pass solana_wallet as external_id in game events Late ID Binding trackedOnChain mint buy sell transfer burn API api.gamesight.io features solanaIntegration anonymousEvents walletIdTracking lateIdBinding attribution crossChannel lateIdBinding steps ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected external_id solana_wallet link click_id->solana_wallet -> on-chain Anonymous Event wallet_id solana_wallet mint/buy/sell/transfer/burn -> attribution ad_click->wallet->mint full funnel useFor ad->on-chain attribution from advertising to on-chain transaction',
        'Game Signals 60M+ onchain tx 12 games ML churn 14d >85% common players via wallets cross-game retention + which funnel brings most valuable features churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7 data 60M+ tx 12 games dataset ML features transactions per wallet retention funnel Python GameSignalsClient load_dataset games=12 tx_count=60M RandomForestClassifier fit churn_14d_label accuracy >85% predict_proba churn risk >0.7 propose_campaign common_wallets funnel_ltv calculate_ltv cross_game True JS SDK @game-signals/sdk predictChurn wallet horizonDays 14 >85% accuracy commonWallets funnelLTV',
        'Trafficgen TalkChart Traffic Generator off-chain SEO/GEO X/Twitter Blinks short videos whale radar TipLink events CampaignStarted SessionStarted PageView CTAClicked LandingReached DataGapDetected api GET /watchtower/health GET /watchtower/events?cursor=&limit=&eventType=&campaignId=&sourceType=&since=',
        'Events: PlayerJoined WalletConnected session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats PotatoHarvested RaceStarted RaceFinished CapShot WagerCreated FighterSummoned RitArena BotCreated CrossChainLinked ComponentAdded WorkerStaked',
      ],
      api: ['/api/analytics/config', '/api/analytics/health', '/api/game-signals/config?gameId=ares1 best free ML 60M+ churn >85%', '/api/game-signals/health', '/api/ingest/solana solana_wallet external_id Late ID Binding', '/watchtower/events'],
      npm: ['@helika/sdk', '@gamesight/sdk', '@game-signals/sdk', 'sklearn pandas'],
    },
    games: {
      ares1: 'Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet + GameSight ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal churn risk >0.7 + session telemetry match_start/end',
      aof: 'Helika cross-game dashboard + GameSight attribution solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention + farming crafting trading marketplace analytics',
      neonrelay: 'Helika cross-game dashboard + GameSight ad->on-chain attribution + Game Signals ML 60M+ tx 12 games churn 14d >85% + session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate + race analytics',
      guttercaps: 'Helika cross-game dashboard + GameSight attribution + Game Signals ML 60M+ tx 12 games churn 14d >85% + quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats ECS 8-12 30% memory leaked 1m memref',
    },
    control: {
      actions: ['Track Helika session_started campaign_id solana_wallet', 'Track GameSight PlayerJoined solana_wallet external_id gamesight_click_id', 'Ingest POST /api/ingest/solana solana_wallet external_id Late ID Binding', 'Predict churn 14d >85% via Game Signals', 'Common wallets funnel LTV', 'Propose campaign churn risk >0.7'],
      metrics: ['Helika cross-game dashboard best free', 'GameSight ad->on-chain attribution best free', 'Game Signals 60M+ tx 12 games ML churn 14d >85% best free', 'Common wallets funnel LTV best free', 'sklearn RandomForest best free'],
    }
  },
  {
    id: 'marketplace',
    title: '🛒 Marketplace — ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor + Access + idosgames — best free ideal stack',
    icon: '🛒',
    color: '#ffb85c',
    sdk: {
      name: 'Magic Eden REST 120 QPM + Shyft Marketplace escrow-less + GameShift USD 170+ + Tensor Bubblegum v2 + Gamba + Husks + RitArena + RACE + Access Protocol + idosgames wallet',
      capabilities: [
        'Magic Eden REST endpoints generators instructions listing buying bidding collection data activity public reads 120 QPM free Bearer for instructions cNFT requires MCC-address Merkle Tree addresses list warning stops indexing new cNFT collections alternative Tensor Bubblegum v2 base api-mainnet.magiceden.dev endpoints /v2/collections /collections/{symbol}/stats /activities /v2/tokens/{mint} /tokens?collection /v2/instructions/sell /buy /bid /sell_cancel /cnft/sell /cnft/buy',
        'Shyft Marketplace API escrow-less NFT stays in wallet until sale in-app marketplace за несколько дней stats API one call base api.shyft.to/sol/v1/marketplace endpoints /marketplace/create per game /list escrow-less /buy /unlist /list?marketplace_address /active_listings /stats?marketplace_address one call',
        'GameShift API-first without blockchain knowledge Solana Labs four verticals wallet self-custodial asset creation trading USD payments 170+ countries 100% chargeback gas abstraction all gas fees blockchain interaction takes over base api.gameshift.dev endpoints /v1/users self-custodial /users/{userId} /users/{userId}/assets /v1/asset-collections /asset-collections/{collectionId}/assets mint without blockchain knowledge /assets/{assetId} /v1/marketplace/listings USD /marketplace/purchases USD 170+ /listings/{listingId} /v1/payments/checkout USD 100% chargeback protection',
        'Tensor cNFT primary Bubblegum v2 base api.tensor.so useFor cNFT $110/M Bubblegum v2 Merkle Tree MCC primary ME deprecated for new cNFT',
        'Gamba wager NFT provably fair house edge 5% jackpot WagerCreated WagerSettled JackpotWon',
        'Husks fighter NFT procedural pixel INT8 auto PvP FighterSummoned FighterTrained BattleFinished',
        'RitArena bot NFT autonomous lifecycle retry logic event emission BotCreated ArenaCreated BotCompeted ArenaFinished best free arena chosen over Aureus',
        'RACE multichain cNFT Solana Tensor NFT EVM OpenSea CrossChainLinked AccountLinked BundlePublished',
        'Access Protocol stake-to-access model sustainable income developers communities npm i @access-protocol/sdk stakeToAccess gameId wallet amount sustainableIncome — best free monetization stake-to-access',
        '@idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL npm i @idosgames/wallet bridgeIn bridgeOut depositToRewardPool withdrawFromRewardPool — best free bridge EVM Solana RewardPool',
        'Aggregator marketplaceAggregator gameId assetType routes magic-eden reason standard NFT full support priority 1 tensor reason alternative priority 2 marketplace_address etc GET /api/marketplace/router?gameId=ares1&assetType=cnft -> Tensor primary + Access stake-to-access best free + idosgames bridge best free',
      ],
      api: ['/api/marketplace/config', '/api/marketplace/health', '/api/marketplace/router?gameId=ares1&assetType=cnft + Access best free + idosgames best free', '/api/monetization/access-protocol', '/api/monetization/idosgames-wallet', '/api/sdk/access-protocol', '/api/sdk/idosgames-wallet'],
      npm: ['@magic-eden/sdk', '@shyft-to/marketplace', '@gameshift/sdk', '@tensor-foundation/sdk', 'gamba', '@bytez3/husks-sdk', 'ritarena-sdk', '@race-foundation/sdk-solana', '@access-protocol/sdk', '@idosgames/wallet'],
    },
    games: {
      ares1: 'ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks fighter + RitArena bot best free + RACE multichain cNFT Solana Tensor NFT EVM OpenSea + Access Protocol stake-to-access sustainable income best free + @idosgames/wallet bridge EVM Solana RewardPool best free bridge — aggregator Tensor primary',
      aof: 'ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks fighter + RitArena bot best free + RACE multichain + Access Protocol stake-to-access best free + idosgames bridge best free',
      neonrelay: 'ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT Bubblegum v2 + Gamba wager NFT ticket wager prize epoch jackpot + Husks race AI bots + RitArena racing tournament bot best free + RACE multichain + Access stake-to-access + idosgames bridge best free',
      guttercaps: 'ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT Bubblegum v2 + Gamba wager NFT cap shooting gamble + Husks cap fighters + RitArena cap tournament best free + RACE multichain + Access stake-to-access + idosgames bridge best free',
    },
    control: {
      actions: ['List via Magic Eden MCC+MT', 'List escrow-less via Shyft in-app за дни', 'Create USD listing via GameShift 170+ countries 100% chargeback', 'List cNFT via Tensor Bubblegum v2 primary', 'Create wager NFT via Gamba provably fair', 'Create fighter bot NFT via Husks RitArena best free', 'Publish multichain cNFT Solana Tensor NFT EVM OpenSea via RACE + idosgames bridge', 'Stake-to-access via Access Protocol', 'Bridge EVM Solana via idosgames RewardPool'],
      metrics: ['ME 120 QPM free public reads Bearer for instructions', 'Shyft escrow-less fast launch за дни stats API one call', 'GameShift USD 170+ 100% chargeback gas abstraction', 'Tensor cNFT Bubblegum v2 primary best free', 'Gamba wager NFT provably fair house edge 5% jackpot', 'Husks fighter procedural pixel INT8 best free', 'RitArena bot lifecycle retry events best free chosen over Aureus', 'RACE multichain cNFT Solana Tensor NFT EVM OpenSea', 'Access Protocol stake-to-access best free', 'idosgames bridge EVM Solana RewardPool best free bridge'],
    }
  },
  {
    id: 'engines',
    title: '🎮 Engines — Unity Godot Unreal Turbo Web + 13 SDKs best free ideal stack deduplicated',
    icon: '🎮',
    color: '#a78bfa',
    sdk: {
      name: 'Unity Solana.Unity-SDK + Godot godot-solana-sdk GDExtension + Unreal VAR META Bifrost + Turbo.Computer Rust + Web @solana/web3.js/@solana/kit + Godot detailed SolanaClient WalletAdapter AnchorProgram + Gamba monorepo betting + Preset official + RitArena best free arena + relayzero agent economy + StealthSDK framework token STEALTH + Xandeum + PST + Core Attributes + Access + idosgames + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium',
      capabilities: [
        'Unity Solana.Unity-SDK com.solana.unity-sdk NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys из коробки + Preset Unity client scaffold + Core Attributes on-chain key-value readable programs — best free Unity',
        'Godot godot-solana-sdk GDExtension 4.3+ nodes SolanaClient Keypair SPLToken CandyMachine AnchorProgram WalletAdapter Candy Machine SPL builders session keys analog temporary keypair 0.01 SOL warning no audit mainnet caution repo Virus-Axel/godot-solana-sdk — best free Godot detailed',
        'Unreal VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex NFT minting in-game payments platforms Windows macOS iOS Android — best free Unreal',
        'Turbo Turbo.Computer Rust lightweight full RPC AI tools generation Solana native — публичного эндпоинта нет, адрес задаёт оператор',
        'Web @solana/web3.js @solana/kit @solana/wallet-adapter @privy-io/react-auth @phantom/connect-kit + Gamba @gamba-labs/gamba-react UI provably fair + Husks @bytez3/husks-sdk AI autobattler + RitArena ritarena-sdk AI arena lifecycle retry events best free arena + relayzero relayzero-sdk agent economy + StealthSDK stealthsdk framework token STEALTH + RACE @race-foundation/sdk-solana multichain + @idosgames/wallet bridge EVM Solana RewardPool + Xandeum @xandeum/sdk scalable storage + PST @private-state-toolkit/sdk private verifiable + Core Attributes @metaplex-foundation/mpl-core on-chain key-value + Access Protocol @access-protocol/sdk stake-to-access + Security Auditing Skill + Sentio @sentio/cli + SolGuard solguard + SLAM solana-slam + Arcium @arcium/sdk confidential rollups — best free Web ideal stack',
        'Gamba SDK gamba-labs/gamba monorepo betting casino core React hooks UI framework provably fair house edge 5% jackpot server seed client seed nonce verifiable random hooks useGamba usePlay useWager UI GambaUi WagerInput GameResult Jackpot repo gamba-labs/gamba useFor GUTTERCAPS wager PvP Neon Relay prize pools AOF crafting gamble ARES-1 betting — best free betting',
        'Preset solana-developers/solana-game-preset npx create-solana-game templates farming racing casual strategy autobattler arena includes Anchor program Player score JS client Unity client IDL for Watchtower parser repo solana-developers/solana-game-preset useFor rapid prototyping scaffold Anchor Player score + JS Unity clients IDL for Watchtower parser extend studio_profile PDA session_keys cNFT L2 analytics solana_wallet — best free official scaffold, create-solana-game duplicate deprecated use preset + Solana SLAM LiteSVM Anchor Mocha best free testing',
        'RitArena SDK TypeScript AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission npm i ritarena-sdk createArena addBot compete retry logic event emission on BotCompeted ArenaFinished — best free arena chosen over Aureus duplicate',
        'relayzero TypeScript SDK agent economy network RelayZero integrating agents into game processes npm i relayzero-sdk integrateAgent gameId agent process harvest createEconomy — best free agent economy',
        'StealthSDK framework AI-games Solana token STEALTH centralized economy npm i stealthsdk init gameId token STEALTH createEconomy — best free AI-games framework',
        'Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes npm i @xandeum/sdk save gameId key player:state data gameState — best free scalable storage',
        'PST Private State Toolkit private verifiable commitments on-chain encrypted off-chain hidden logic card games npm i @private-state-toolkit/sdk commit gameId commitment hash(hiddenState) only commitment on-chain storeEncrypted — best free private',
        'Core Attributes Plugin on-chain key-value NFT stats readable programs DAS npm i @metaplex-foundation/mpl-core addAttribute nftAddress key level value 10 — best free on-chain stats',
        'Access Protocol stake-to-access sustainable income npm i @access-protocol/sdk stakeToAccess — best free monetization',
        '@idosgames/wallet bridge EVM Solana RewardPool npm i @idosgames/wallet bridgeIn bridgeOut depositToRewardPool — best free bridge',
        'Security Auditing Skill systematic audit vulnerabilities claude-code skill install solana-security-auditing-skill — best free security skill',
        'Sentio CLI AST scanner cargo install sentio-cli scan --program — best free static scanner',
        'SolGuard AI auto audit 130+ patterns npm i -g solguard audit --patterns 130 — best free AI audit chosen over SolShield duplicate',
        'Solana SLAM LiteSVM Anchor Mocha npm i solana-slam slam test --program — best free testing',
        'Arcium Rollups confidential computing rollups npm i @arcium/sdk confidentialPayment — best free privacy rollup',
        'Ideal free engines: Unity + Godot detailed + Gamba + Preset official + RitArena best free arena + relayzero + StealthSDK + Xandeum + PST + Core Attributes + Access + idosgames + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium = ideal free full stack not garbage deduplicated',
      ],
      api: ['/api/engines/config', '/api/engines/health', '/api/sdk/unity', '/api/sdk/godot', '/api/sdk/godot-solana', '/api/sdk/gamba', '/api/sdk/preset best free official', '/api/sdk/ritarena best free arena', '/api/sdk/relayzero', '/api/sdk/stealthsdk', '/api/sdk/xandeum best free scalable', '/api/sdk/pst best free private', '/api/sdk/core-attributes best free on-chain stats', '/api/sdk/access-protocol best free stake-to-access', '/api/sdk/idosgames-wallet best free bridge', '/api/sdk/security-auditing-skill best free security skill', '/api/sdk/sentio-cli best free static', '/api/sdk/solguard best free AI audit 130+', '/api/sdk/solana-slam best free testing', '/api/sdk/arcium best free privacy'],
      npm: ['com.solana.unity-sdk', 'godot-solana-sdk', 'gamba', '@gamba-labs/gamba-react', 'solana-game-preset', 'ritarena-sdk', 'relayzero-sdk', 'stealthsdk', '@xandeum/sdk', '@private-state-toolkit/sdk', '@metaplex-foundation/mpl-core', '@access-protocol/sdk', '@idosgames/wallet', 'solguard', 'solana-slam', '@arcium/sdk'],
    },
    games: {
      ares1: 'Unity Solana.Unity-SDK NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys + Godot detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders + Gamba betting potato harvest gamble provably fair + Preset official scaffold farming Anchor Player score + JS Unity clients IDL + RitArena harvest tournament lifecycle retry events best free + relayzero agent economy + StealthSDK framework token STEALTH + Xandeum scalable storage + PST private verifiable + Core Attributes on-chain key-value + Access Protocol stake-to-access + idosgames bridge + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium confidential rollups — ideal free engines full stack',
      aof: 'Unity Godot Unreal Turbo Web + Godot detailed + Gamba crafting gamble + Preset official scaffold farming + RitArena crop tournament + Xandeum + PST + Core Attributes + Access + idosgames + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium',
      neonrelay: 'Unity Godot Unreal Turbo Web + Godot detailed + Gamba ticket wager prize epoch jackpot + Preset official scaffold racing + RitArena racing tournament lifecycle retry events best free + Xandeum + PST + Core Attributes + Access + idosgames + Security + SLAM + Arcium — high frequency racing via Sonic HyperGrid + MagicBlock ER sub-10ms',
      guttercaps: 'Unity Godot Unreal Turbo Web + Godot detailed + Gamba cap shooting gamble + Preset official scaffold casual + RitArena cap tournament + Xandeum + PST + Core Attributes + Access + idosgames + Security + SLAM + Arcium — casual gasless via MagicBlock ER sub-10ms',
    },
    control: {
      actions: ['Scaffold via Preset official npx create-solana-game ares1 --preset farming best free official', 'Test via Solana SLAM LiteSVM Anchor Mocha best free testing', 'Audit via Security Auditing Skill systematic audit best free skill', 'Scan via Sentio CLI AST best free static', 'Audit via SolGuard AI 130+ best free chosen over SolShield', 'Create Unity SDK integration Privy Phantom FirstStep Altude Session Keys 0.01 SOL', 'Create Godot detailed SolanaClient WalletAdapter AnchorProgram', 'Create Gamba betting provably fair', 'Create RitArena arena lifecycle retry events best free chosen over Aureus', 'Integrate Xandeum scalable storage exabyte', 'Commit private state PST', 'Add Core Attribute on-chain key-value', 'Stake-to-access via Access Protocol', 'Bridge EVM Solana via idosgames RewardPool', 'Create Arcium confidential rollup privacy'],
      metrics: ['13 SDKs v3 ideal free deduplicated', 'Unity Godot Unreal Turbo Web + Godot detailed + Gamba + Preset official best free + RitArena best free + relayzero + StealthSDK + Xandeum + PST + Core Attributes + Access + idosgames + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium', 'Duplicates deprecated: create-solana-game duplicate of preset, Aureus duplicate of RitArena, SolShield duplicate of SolGuard'],
    }
  },
  {
    id: 'infra',
    title: '🏗️ Infra — ARC + Bolt + DePIN + Arcium + Xandeum + PST + Core Attributes — best free ideal stack',
    icon: '🏗️',
    color: '#37e5a0',
    sdk: {
      name: 'ARC Framework + Bolt FOCG + DePIN Beamable + Arcium Rollups confidential + Xandeum scalable exabyte + PST private verifiable + Core Attributes on-chain key-value',
      capabilities: [
        'ARC Framework JumpCrypto/sol-arc Entity-Component standard separation data/execution interoperability composability entities crop plot race track cap enemy player fighter bot tournament components Position GrowthStage Health Owner Item source_game aof|neonrelay|guttercaps|ares1 is_cnft asset_id Velocity Score systems harvest craft MovementSystem RaceSystem shooting combat tournament cross-game via same Components studio_profile PDA stores ARC Entity IDs materialized view PostgreSQL TimescaleDB Redis tenant_id RLS cargo add arc-framework npm i @arc-framework/sdk createEntity addComponent executeSystem — best free interoperability',
        'Bolt magicblock-labs/bolt FOCG autonomous worlds fully on-chain verifiable no server trust components Position Health Player Crop RaceResult Fighter Bot Tournament systems plant harvest start_race finish_race shoot pop battle create_tournament enter_tournament finish_tournament fully on-chain emit events PlotPlanted RaceStarted CapShot RaceFinished FighterSummoned BotCreated cli bolt init --game build deploy --network devnet client BoltClient createEntity addComponent executeSystem delegateToER executeGasless commitState Magic Actions cron time cron every 5 min harvest account_change level up auto grant reward custom match ends settle rewards auto battle cron Husks auto tournament cron RitArena — best free FOCG',
        'DePIN Beamable-Network/depin decentralized physical infra gaming compute license escrow rewards staking workers stake 10 SOL escrow 0.1 SOL per 100 players tasks push notifications matchmaking physics AI inference leaderboard flow createLicense game pays stakeWorker 10 SOL createEscrow 0.1 SOL per 100 players executeTask worker reward 0.09 SOL worker 0.01 SOL protocol slash if timeout cost saving vs centralized servers L2 DePIN workers + MagicBlock ER sub-10ms gasless real-time via MagicBlock ER + Sonic HyperGrid high frequency + Sorada 5ms + Rush ECS + REPLA — best free decentralized compute',
        'Arcium Rollups confidential computing rollups gaming payments architecture privacy npm i @arcium/sdk confidentialPayment gameId amount private true createRollup gameId type confidential — best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA',
        'Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes npm i @xandeum/sdk save gameId key player:state data gameState — best free scalable storage better than Arweave for game state',
        'PST Private State Toolkit private verifiable commitments on-chain encrypted off-chain hidden logic card games npm i @private-state-toolkit/sdk commit gameId commitment hash(hiddenState) only commitment on-chain storeEncrypted — best free private',
        'Core Attributes Plugin on-chain key-value NFT stats readable programs DAS npm i @metaplex-foundation/mpl-core addAttribute nftAddress key level value 10 — best free on-chain stats',
        'Ideal free infra storage privacy: ARC + Bolt + DePIN + Arcium + Xandeum + PST + Core Attributes = full coverage not competitive not garbage',
      ],
      api: ['/api/infra/config', '/api/infra/health', '/api/infra/arc', '/api/infra/bolt', '/api/infra/depin', '/api/infra/arcium best free privacy', '/api/infra/xandeum best free scalable', '/api/infra/pst best free private', '/api/infra/core-attributes best free on-chain stats', '/api/sdk/xandeum', '/api/sdk/pst', '/api/sdk/core-attributes', '/api/sdk/arcium'],
      npm: ['@arc-framework/sdk', '@magicblock-labs/bolt-sdk', '@beamable-network/depin-sdk', '@arcium/sdk', '@xandeum/sdk', '@private-state-toolkit/sdk', '@metaplex-foundation/mpl-core'],
    },
    games: {
      ares1: 'ARC Entity potato plot Components Position GrowthStage Owner Item source_game ares1 is_cnft asset_id System harvest + Bolt FOCG farming fully on-chain verifiable Position Crop Player systems plant harvest + DePIN matchmaking leaderboard push notifications workers stake escrow reward + Arcium confidential rollups privacy payments best free + Xandeum scalable storage exabytes game states assets player data best free + PST private verifiable commitments hidden logic card games best free + Core Attributes on-chain key-value NFT stats readable programs DAS best free on-chain stats + Preset official scaffold farming + Rust Actix high-performance',
      aof: 'ARC Entity crop plot + Bolt FOCG farming + DePIN crafting market + Arcium confidential + Xandeum scalable + PST private + Core Attributes on-chain + Preset official scaffold farming + Rust Actix',
      neonrelay: 'ARC Entity race track + Bolt FOCG racing verifiable + DePIN race physics matchmaking leaderboard + Arcium confidential privacy + Xandeum scalable + PST private + Core Attributes on-chain + Preset official scaffold racing + Rust Actix high-performance real-time',
      guttercaps: 'ARC Entity cap enemy + Bolt FOCG pop-n-shoot verifiable + DePIN matchmaking leaderboard push notifications + Arcium confidential + Xandeum scalable + PST private + Core Attributes on-chain + Preset official scaffold casual + Rust Actix',
    },
    control: {
      actions: ['Create ARC Entity with Components Position GrowthStage Owner', 'Execute ARC System harvest craft', 'Init Bolt world bolt init --game', 'Create Bolt entity addComponent executeSystem', 'Delegate to MagicBlock ER executeGasless <10ms', 'Create Magic Action cron time', 'Create DePIN license stakeWorker 10 SOL escrow 0.1 SOL per 100 players', 'Execute DePIN task matchmaking physics AI inference', 'Create Arcium confidential rollup privacy', 'Save to Xandeum exabyte scalable', 'Commit private state PST', 'Add Core Attribute on-chain key-value'],
      metrics: ['ARC Entity-Component interoperability best free', 'Bolt FOCG verifiable no server trust best free', 'DePIN license escrow rewards staking best free', 'Arcium confidential privacy best free', 'Xandeum exabyte scalable best free', 'PST private verifiable best free', 'Core Attributes on-chain key-value best free', 'Ideal free infra storage privacy full coverage'],
    }
  },
  {
    id: 'monetization',
    title: '💰 Monetization — Access Protocol stake-to-access + idosgames bridge — best free ideal stack',
    icon: '💰',
    color: '#ffb85c',
    sdk: {
      name: 'Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + GameShift USD 170+ + Gamba betting',
      capabilities: [
        'Access Protocol integrates into game ecosystem Solana model stake-to-access staking for access sustainable income developers communities npm i @access-protocol/sdk stakeToAccess gameId wallet amount stake to access game content sustainableIncome createStakePool checkAccess — best free monetization stake-to-access sustainable income',
        '@idosgames/wallet SDK bridge browser/mobile wallets EVM Solana move tokens NFTs in/out custom Solana program RewardPool deposits withdrawals SPL tokens npm i @idosgames/wallet bridgeIn walletEvm walletSolana token amount gameId bridgeOut depositToRewardPool withdrawFromRewardPool RewardPool program deposits withdrawals SPL — best free bridge EVM Solana RewardPool complementary to RACE multichain RACE broader multichain abstraction game bundles fairness idosgames specific bridge wallet RewardPool both free keep distinct',
        'GameShift API-first without blockchain knowledge Solana Labs wallet self-custodial asset creation trading USD payments 170+ countries 100% chargeback gas abstraction all gas fees blockchain interaction takes over — best free USD payments',
        'Gamba monorepo betting casino core React hooks UI framework provably fair house edge 5% jackpot server seed client seed nonce verifiable random hooks useGamba usePlay useWager UI GambaUi WagerInput GameResult Jackpot — best free betting',
        'Ideal free monetization bridge: Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + GameShift USD + Gamba = full monetization coverage not competitive not garbage',
      ],
      api: ['/api/monetization/config', '/api/monetization/health', '/api/monetization/access-protocol best free stake-to-access', '/api/monetization/idosgames-wallet best free bridge', '/api/sdk/access-protocol', '/api/sdk/idosgames-wallet', '/api/marketplace/router + Access best free + idosgames best free'],
      npm: ['@access-protocol/sdk', '@idosgames/wallet', '@gameshift/sdk', 'gamba'],
    },
    games: {
      ares1: 'Access Protocol stake-to-access sustainable income — stake to access premium potato plots, harvest tournaments — + @idosgames/wallet bridge EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL + GameShift USD 170+ 100% chargeback + Gamba betting potato harvest gamble provably fair',
      aof: 'Access Protocol stake-to-access — stake to access rare crops golden tools land — + idosgames bridge EVM Solana + GameShift USD + Gamba crafting gamble',
      neonrelay: 'Access Protocol stake-to-access — stake to access premium tracks skins — + idosgames bridge EVM Solana + GameShift USD + Gamba ticket wager prize epoch jackpot provably fair',
      guttercaps: 'Access Protocol stake-to-access — stake to access golden cap founder — + idosgames bridge EVM Solana + GameShift USD + Gamba cap shooting gamble',
    },
    control: {
      actions: ['Stake-to-access via Access Protocol', 'Create stake pool premium access', 'Check access via stake', 'Bridge in EVM Solana via idosgames', 'Bridge out', 'Deposit to RewardPool SPL', 'Withdraw from RewardPool', 'Create USD listing via GameShift', 'Create wager via Gamba provably fair'],
      metrics: ['Access Protocol stake-to-access sustainable income best free', 'idosgames bridge EVM Solana RewardPool best free bridge', 'GameShift USD 170+ 100% chargeback best free', 'Gamba betting provably fair house edge 5% jackpot best free'],
    }
  },
  {
    id: 'aiAgents',
    title: '🤖 AI Agents — Husks INT8 + RitArena lifecycle retry events best free + relayzero + StealthSDK — best free ideal stack not garbage',
    icon: '🤖',
    color: '#a78bfa',
    sdk: {
      name: 'Husks SDK autobattler INT8 + RitArena SDK arena lifecycle retry events best free chosen over Aureus + relayzero agent economy + StealthSDK framework token STEALTH',
      capabilities: [
        'Husks SDK Bytez3 onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP market dominance cNFT npm i @bytez3/husks-sdk summonFighter owner wallet traits crop potato rarity common procedural true pixel art generated on-chain assetType cnft $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated trainFighter method crafting data potato harvest INT8 quantized model auto PvP market dominance cNFT enableAutoPvP interval */5 * * * * er true Magic Actions cron every 5 min battle fighter opponentId winRate delegateToER executeGasless <10ms commitState — best free autobattler unique category',
        'RitArena SDK TypeScript AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission npm i ritarena-sdk createArena gameId name arena_ares1 prize 10 SOL addBot arenaId bot compete arenaId bots compete prizes retry logic event emission robust on BotCompeted ArenaFinished prize — best free arena chosen over Aureus competitive duplicate Aureus deprecated',
        'relayzero TypeScript SDK agent economy network RelayZero integrating agents into game processes npm i relayzero-sdk integrateAgent gameId agent process harvest createEconomy gameId agents trade collaborate — best free agent economy distinct',
        'StealthSDK framework AI-games Solana token STEALTH centralized economy npm i stealthsdk init gameId token STEALTH createEconomy gameId token STEALTH supply 1000000 — best free AI-games framework distinct',
        'Aureus Arena SDK deprecated competitive duplicate with RitArena both AI arena bots compete prizes RitArena better free full lifecycle retry logic event emission pick RitArena as best free',
        'Ideal free AI agents: Husks autobattler + RitArena arena lifecycle retry events best free + relayzero agent economy + StealthSDK framework token STEALTH = full AI coverage not garbage each distinct action',
        'L2: MagicBlock ER sub-10ms gasless + Sonic HyperGrid + Sorada 5ms + Rush ECS + REPLA + Arcium confidential + PST private + Xandeum exabyte ideal free L2 privacy storage',
        'Storage: Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value best free storage privacy',
      ],
      api: ['/api/ai/config', '/api/ai/health', '/api/ai/husks best free autobattler', '/api/ai/aureus deprecated duplicate RitArena better free', '/api/ai/ritarena best free arena lifecycle retry events', '/api/ai/relayzero best free agent economy', '/api/ai/stealthsdk best free framework token STEALTH', '/api/sdk/ritarena', '/api/sdk/relayzero', '/api/sdk/stealthsdk', '/api/sdk/xandeum', '/api/sdk/pst', '/api/sdk/core-attributes', '/api/sdk/arcium'],
      npm: ['@bytez3/husks-sdk', 'ritarena-sdk', 'relayzero-sdk', 'stealthsdk', '@xandeum/sdk', '@private-state-toolkit/sdk', '@metaplex-foundation/mpl-core', '@arcium/sdk'],
    },
    games: {
      ares1: 'Husks potato fighters summon NFT fighters procedural pixel train INT8 via harvesting battles auto PvP market dominance cNFT + RitArena harvest tournament autonomous bots lifecycle retry logic event emission best free arena chosen over Aureus + relayzero agent economy harvest process + StealthSDK framework token STEALTH centralized economy + Xandeum scalable storage + PST private verifiable + Core Attributes on-chain key-value + Arcium confidential',
      aof: 'Husks crop fighters + RitArena crop tournament lifecycle retry events best free + relayzero + StealthSDK + Xandeum + PST + Core Attributes + Arcium',
      neonrelay: 'Husks race AI bots summon race bots procedural train via racing auto PvP races AI no manual driving MagicBlock ER sub-10ms cNFT + RitArena racing tournament autonomous race bots fastest lap lifecycle retry events best free arena + relayzero + StealthSDK',
      guttercaps: 'Husks cap fighters summon NFT cap fighters procedural pixel train INT8 via shooting battles auto PvP market dominance cNFT + RitArena cap tournament lifecycle retry events best free + relayzero + StealthSDK',
    },
    control: {
      actions: ['Summon Husks fighter procedural pixel INT8 best free autobattler', 'Train fighter via crafting battles INT8 quantized', 'Enable auto PvP Magic Actions cron every 5 min', 'Create RitArena arena lifecycle retry events best free arena', 'Add bot to arena', 'Compete bots for prizes', 'Listen BotCompeted ArenaFinished events', 'Integrate agent via relayzero agent economy', 'Init StealthSDK framework token STEALTH economy', 'Save to Xandeum exabyte', 'Commit private state PST', 'Add Core Attribute on-chain key-value', 'Create Arcium confidential rollup privacy'],
      metrics: ['Husks autobattler INT8 procedural pixel best free autobattler', 'RitArena lifecycle retry events best free arena chosen over Aureus duplicate', 'relayzero agent economy network best free', 'StealthSDK framework token STEALTH centralized economy best free', 'Aureus deprecated duplicate RitArena better free', 'Ideal free AI agents full coverage not garbage'],
    }
  },
  {
    id: 'testing',
    title: '🧪 Testing — Solana SLAM LiteSVM Anchor Mocha best free + Preset official — ideal free testing duplicate deprecated',
    icon: '🧪',
    color: '#37e5a0',
    sdk: {
      name: 'Solana SLAM LiteSVM Anchor Mocha best free testing + solana-game-preset official best free scaffold',
      capabilities: [
        'Solana SLAM framework simplifying modular tests Solana programs stack Solana LiteSVM Anchor Mocha npm i solana-slam slam test --program ./programs/cross_game_inventory modular tests Solana LiteSVM Anchor Mocha simplified testing — best free testing LiteSVM more modern',
        'solana-game-preset official starter Solana Foundation npx create-solana-game templates farming racing casual strategy autobattler arena includes Anchor program Player score JS client Unity client IDL for Watchtower parser repo solana-developers/solana-game-preset useFor rapid prototyping scaffold Anchor Player score + JS Unity clients IDL for Watchtower parser extend studio_profile PDA session_keys cNFT L2 analytics solana_wallet — best free official scaffold',
        'create-solana-game template Jest Mocha Bankrun quick start duplicate of solana-game-preset official starter both scaffold preset official better free deprecate create-solana-game',
        'Ideal free testing: Preset official scaffold + SLAM LiteSVM Anchor Mocha best free testing, create-solana-game duplicate deprecated — ideal free testing full coverage not competitive',
        'Security: Security Auditing Skill systematic audit + Sentio CLI AST scanner + SolGuard AI 130+ patterns — best free security ideal stack full coverage',
      ],
      api: ['/api/testing/config', '/api/testing/health', '/api/testing/solana-slam best free testing LiteSVM', '/api/testing/create-solana-game duplicate deprecated preset better free official', '/api/sdk/solana-slam', '/api/sdk/preset best free official'],
      npm: ['solana-slam', 'solana-game-preset'],
    },
    games: {
      ares1: 'Test cross_game_inventory CgInv111... session_keys SessKeys111... studio_treasury STrEaSuRy111... + ARES1_CORE_PROGRAM_ID via Solana SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold farming — anchor test npm test smoke Unity play mode GdUnit4 high TPS gasless state commitment Magic Actions churn >85% cross-game funnel list buy sell ME instruction Session Key escrow-less Shyft USD GameShift security audit 130+ patterns',
      aof: 'Test AOF_CORE_PROGRAM_ID farming crafting trading marketplace via SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold farming',
      neonrelay: 'Test NEONRELAY_REWARDS_PROGRAM_ID race Neon DM server-authoritative identity reward ledger via SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold racing',
      guttercaps: 'Test GUTTERCAPS_CORE_PROGRAM_ID pop-n-shoot casual ECS 8-12 memory leaked via SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold casual',
    },
    control: {
      actions: ['Scaffold via Preset official npx create-solana-game ares1 --preset farming best free official', 'Test via Solana SLAM LiteSVM Anchor Mocha best free testing slam test --program ./programs/cross_game_inventory', 'Audit via Security Auditing Skill systematic audit best free skill', 'Scan via Sentio CLI AST best free static', 'Audit via SolGuard AI 130+ best free chosen over SolShield'],
      metrics: ['Solana SLAM LiteSVM Anchor Mocha best free testing more modern', 'Preset official scaffold Anchor JS Unity best free official scaffold', 'create-solana-game duplicate deprecated preset better free official', 'Ideal free testing Preset + SLAM full coverage'],
    }
  },
  {
    id: 'privacy',
    title: '🕵️ Privacy — Arcium confidential + PST private verifiable — best free ideal stack',
    icon: '🕵️',
    color: '#a78bfa',
    sdk: {
      name: 'Arcium Rollups confidential computing rollups + Private State Toolkit PST private verifiable commitments',
      capabilities: [
        'Arcium Rollups mentioned in context gaming payments and architecture offering solutions for confidential computing and rollups npm i @arcium/sdk confidentialPayment gameId amount private true createRollup gameId type confidential rollup for gaming payments architecture privacy — best free privacy rollup complementary to MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions Sonic HyperGrid dedicated grid thousands no contention REPLA repla-cli L3 Anchor settle MagicBlock sequencer',
        'PST Private State Toolkit private but verifiable state commitments on-chain encrypted off-chain hidden logic card games npm i @private-state-toolkit/sdk commit gameId commitment hash(hiddenState) only commitment on-chain storeEncrypted commitment encryptedState encrypted off-chain verify commitment proof verifiable commitCardHand revealWithProof — best free private verifiable commitments hidden logic card games',
        'Xandeum scalable storage layer exabytes game states assets player data best free scalable',
        'Core Attributes Plugin on-chain key-value NFT stats readable programs DAS best free on-chain stats',
        'Ideal free privacy: PST private verifiable commitments hidden logic card games + Arcium confidential computing rollups payments = full privacy coverage not competitive not garbage',
        'Ideal free L2 privacy storage: Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA L3 + Arcium confidential privacy + PST private verifiable + Xandeum exabyte = full coverage',
      ],
      api: ['/api/privacy/config', '/api/privacy/health', '/api/privacy/arcium best free confidential rollups privacy', '/api/infra/arcium', '/api/infra/pst', '/api/infra/xandeum', '/api/infra/core-attributes', '/api/sdk/arcium', '/api/sdk/pst', '/api/sdk/xandeum', '/api/sdk/core-attributes', '/api/storage/pst', '/api/storage/xandeum', '/api/storage/core-attributes'],
      npm: ['@arcium/sdk', '@private-state-toolkit/sdk', '@xandeum/sdk', '@metaplex-foundation/mpl-core'],
    },
    games: {
      ares1: 'Confidential payments potato harvest via Arcium confidential computing rollups privacy best free + hidden logic card games? via PST private verifiable commitments + game states via Xandeum exabyte scalable + stats via Core Attributes on-chain key-value readable programs DAS best free',
      aof: 'Confidential payments crafting trading marketplace via Arcium confidential privacy best free + hidden crafting recipes via PST private verifiable + farming states via Xandeum exabyte + stats via Core Attributes on-chain',
      neonrelay: 'Confidential payments race tickets prize pools via Arcium confidential privacy best free + hidden map logic via PST private + race states via Xandeum exabyte + race results via Core Attributes on-chain',
      guttercaps: 'Confidential payments cap shooting via Arcium confidential privacy + hidden enemy logic via PST private + cap states via Xandeum exabyte + score via Core Attributes on-chain',
    },
    control: {
      actions: ['Create Arcium confidential rollup privacy', 'Confidential payment via Arcium private true', 'Commit private state PST hash(hiddenState)', 'Store encrypted off-chain PST', 'Verify commitment proof PST', 'Save to Xandeum exabyte scalable', 'Add Core Attribute on-chain key-value'],
      metrics: ['Arcium confidential computing rollups privacy best free privacy rollup', 'PST private verifiable commitments hidden logic card games best free private', 'Xandeum exabyte scalable best free', 'Core Attributes on-chain key-value readable programs DAS best free on-chain stats', 'Ideal free privacy full coverage PST + Arcium'],
    }
  },
  {
    id: 'crossChain',
    title: '🌉 Cross-Chain — RACE multichain + idosgames bridge RewardPool — best free ideal stack',
    icon: '🌉',
    color: '#ffb85c',
    sdk: {
      name: 'RACE Protocol multichain SDK sdk-solana CLI race-cli + @idosgames/wallet bridge EVM Solana RewardPool',
      capabilities: [
        'RACE Protocol multichain infra secure fair web3 games TypeScript SDK sdk-solana CLI race-cli game bundles account management npm i @race-foundation/sdk-solana cargo install race-cli race-cli --help bundle create --game ares1 --network solana --output bundle.json bundle publish --bundle bundle.json --networks solana,evm --rpc solana=https://api.mainnet-beta.solana.com evm=https://eth.llamarpc.com accounts link --solana-wallet <SOLANA_PUBKEY> --evm-wallet <EVM_ADDRESS> --game ares1 creates cross-chain linked wallets studio_profile PDA cross_chain true RaceClient linkWallets publishBundle verifyFairness mintCrossChain ownerSolana ownerEvm metadata assetType cnft $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated + Standard EVM OpenSea secure fair SDK game bundles publish networks Solana EVM account management link Solana EVM wallets fairness provably fair verifiable',
        '@idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL npm i @idosgames/wallet bridgeIn walletEvm walletSolana token amount gameId bridgeOut depositToRewardPool withdrawFromRewardPool RewardPool program deposits withdrawals SPL — best free bridge EVM Solana RewardPool complementary to RACE RACE broader multichain abstraction game bundles fairness idosgames specific bridge wallet RewardPool both free keep distinct',
        'Game bundles publish Solana EVM networks cNFT Solana Tensor NFT EVM OpenSea fighter bot cNFT cross-chain + Cross-chain linked wallets studio_profile PDA cross_chain true via race-cli accounts link + idosgames bridge EVM Solana RewardPool + L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER + Arcium confidential + PST private + Xandeum exabyte + Core Attributes on-chain + ARC Bolt DePIN Preset Rust API Gamba Husks RitArena relayzero StealthSDK + Assets cNFT $110/M vs standard + Marketplace ME Shyft GameShift Tensor Gamba Husks RitArena RACE + Access Protocol stake-to-access + idosgames bridge + Analytics Helika GameSight solana_wallet external_id Late ID Binding + Game Signals ML cross-chain linked wallets funnel + Identity Session Keys Privy Phantom FirstStep Altude guest->embedded->native->linked session key 0.01 SOL cross-chain linked wallets + Security Auditing Skill Sentio SolGuard best free security + Solana SLAM best free testing',
        'Ideal free cross-chain bridge: RACE multichain + @idosgames/wallet bridge = ideal free cross-chain bridge full coverage not competitive',
      ],
      api: ['/api/cross-chain/config', '/api/cross-chain/health', '/api/cross-chain/race best free multichain', '/api/monetization/idosgames-wallet best free bridge', '/api/sdk/idosgames-wallet', '/api/sdk/ritarena', '/api/sdk/xandeum', '/api/sdk/pst', '/api/sdk/core-attributes'],
      npm: ['@race-foundation/sdk-solana', '@idosgames/wallet', 'ritarena-sdk', '@xandeum/sdk', '@private-state-toolkit/sdk', '@metaplex-foundation/mpl-core'],
    },
    games: {
      ares1: 'RACE multichain Solana + EVM bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets via race-cli accounts link + studio_profile PDA cross_chain true + @idosgames/wallet bridge EVM Solana RewardPool deposits withdrawals SPL best free bridge + cross-game items Core Attributes Xandeum + common wallets via Game Signals ML 60M+ tx churn >85%',
      aof: 'RACE multichain Solana + EVM bundles + idosgames bridge EVM Solana RewardPool + cross-game materials via ARC Entity-Component + Core Attributes Xandeum',
      neonrelay: 'RACE multichain Solana + EVM bundles + idosgames bridge EVM Solana RewardPool + cross-game skins tracks via ARC + Core Attributes + Xandeum',
      guttercaps: 'RACE multichain Solana + EVM bundles + idosgames bridge EVM Solana RewardPool + cross-game caps skins via ARC + Core Attributes + Xandeum',
    },
    control: {
      actions: ['Create RACE game bundle solana', 'Publish bundle Solana + EVM', 'Link Solana + EVM wallets via race-cli accounts link', 'Verify fairness provably fair verifiable', 'Mint cross-chain cNFT Solana Tensor NFT EVM OpenSea', 'Bridge in EVM Solana via idosgames', 'Bridge out', 'Deposit to RewardPool SPL', 'Withdraw from RewardPool'],
      metrics: ['RACE SDK sdk-solana CLI race-cli best free multichain', 'Bundles publish Solana EVM best free', 'Link Solana EVM wallets best free', 'Fairness provably fair verifiable best free', 'cNFT Solana Tensor NFT EVM OpenSea best free', 'idosgames bridge EVM Solana RewardPool best free bridge', 'Ideal free cross-chain bridge full coverage'],
    }
  },
  {
    id: 'gameSignals',
    title: '📈 Game Signals ML — 60M+ tx 12 games churn 14d >85% — best free',
    icon: '📈',
    color: '#37e5a0',
    sdk: {
      name: 'Solana Game Signals 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV',
      capabilities: [
        '60M+ onchain tx 12 games dataset ML features transactions per wallet retention funnel',
        'Churn 14d prediction >85% accuracy Python sklearn RandomForest',
        'Common wallets funnel LTV cross-game retention which funnel brings most valuable',
        'SEO/GEO Blinks short videos whale radar TipLink vs payer LTV',
        'Campaign proposal POST /api/campaigns/proposals churn risk >0.7',
        'Python GameSignalsClient load_dataset games=12 tx_count=60M RandomForestClassifier fit churn_14d_label accuracy >85% predict_proba churn risk >0.7 propose_campaign common_wallets funnel_ltv calculate_ltv cross_game True',
        'JS SDK @game-signals/sdk predictChurn wallet horizonDays 14 >85% accuracy commonWallets funnelLTV',
        'Analytics Integration Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + events PotatoHarvested RaceStarted RaceFinished CapShot WagerCreated FighterSummoned RitArena BotCreated CrossChainLinked',
        'Best free analytics ML ideal stack',
      ],
      api: ['/api/game-signals/config?gameId=ares1 best free ML 60M+ churn >85%', '/api/game-signals/health', '/api/campaigns/proposals churn risk >0.7'],
      npm: ['@game-signals/sdk', 'sklearn pandas'],
    },
    games: {
      ares1: 'Churn 14d >85% prediction for potato farmers, common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal churn risk >0.7',
      aof: 'Churn 14d >85% for farming crafting trading marketplace, common wallets funnel LTV, campaign proposal retention',
      neonrelay: 'Churn 14d >85% for racing, common wallets funnel LTV, which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV, race retention',
      guttercaps: 'Churn 14d >85% for pop-n-shoot casual, quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats',
    },
    control: {
      actions: ['Load dataset 60M+ tx 12 games', 'Train churn 14d RandomForest >85% accuracy', 'Predict churn wallet horizon 14d', 'Common wallets ares1 aof neonrelay guttercaps', 'Funnel LTV SEO/GEO Blinks short videos whale radar TipLink vs payer', 'Propose campaign churn risk >0.7', 'Calculate LTV cross-game'],
      metrics: ['60M+ tx 12 games dataset', 'Churn 14d >85% accuracy sklearn RandomForest', 'Common wallets funnel LTV cross-game retention', 'Which funnel brings most valuable SEO/GEO Blinks', 'Campaign proposal churn risk >0.7'],
    }
  },
  {
    id: 'payments',
    title: '💳 Payments — Rust API Actix + Access Protocol + idosgames — best free ideal stack',
    icon: '💳',
    color: '#ffb85c',
    sdk: {
      name: 'Solana Game API Rust Actix + Access Protocol stake-to-access + @idosgames/wallet bridge RewardPool + GameShift USD 170+ + Gamba',
      capabilities: [
        'Solana Game API Rust dariusjvc Actix Web backend API create game join calculate withdraw Swagger high-performance reference vs Node.js Fastify for ARES-1 high frequency NeonRelay real-time PvP racing Track Watchtower events PlayerJoined WalletConnected RaceStarted RaceFinished PotatoHarvested CapShot WagerCreated FighterSummoned RitArena BotCreated CrossChainLinked solana_wallet endpoints POST /api/game/create join calculate withdraw GET /swagger GET /api-docs/openapi.json OpenAPI spec cargo add actix-web solana-sdk anchor-client utoipa swagger-ui git clone dariusjvc/solana-game-api-rust cargo run --release high-performance backend reference',
        'Access Protocol stake-to-access model sustainable income developers communities npm i @access-protocol/sdk stakeToAccess sustainableIncome createStakePool checkAccess — best free monetization stake-to-access',
        '@idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL npm i @idosgames/wallet bridgeIn bridgeOut depositToRewardPool withdrawFromRewardPool — best free bridge EVM Solana RewardPool complementary to RACE',
        'GameShift API-first without blockchain knowledge Solana Labs wallet self-custodial asset creation trading USD payments 170+ countries 100% chargeback gas abstraction all gas fees blockchain interaction takes over — best free USD payments',
        'Gamba betting casino provably fair house edge 5% jackpot — best free betting',
        'Ideal free payments monetization bridge: Rust Actix high-performance + Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + GameShift USD + Gamba = full coverage',
      ],
      api: ['/api/payments/config', '/api/payments/health', '/api/payments/rust-api Actix create join calculate withdraw Swagger high-performance', '/api/monetization/access-protocol best free stake-to-access', '/api/monetization/idosgames-wallet best free bridge', '/api/sdk/access-protocol', '/api/sdk/idosgames-wallet'],
      npm: ['actix-web', 'solana-sdk', 'anchor-client', 'utoipa', '@access-protocol/sdk', '@idosgames/wallet', '@gameshift/sdk', 'gamba'],
    },
    games: {
      ares1: 'Rust Actix high-performance create game join calculate harvest withdraw Swagger Track Watchtower PotatoHarvested solana_wallet + Access Protocol stake-to-access premium plots + idosgames bridge EVM Solana RewardPool + GameShift USD 170+ + Gamba betting potato harvest gamble',
      aof: 'Rust Actix high-performance create join calculate craft withdraw + Access Protocol stake-to-access rare crops + idosgames bridge + GameShift USD + Gamba crafting gamble',
      neonrelay: 'Rust Actix high-performance create race join calculate finish withdraw Swagger Track Watchtower RaceStarted RaceFinished + Access Protocol stake-to-access premium tracks + idosgames bridge + GameShift USD + Gamba ticket wager prize epoch jackpot',
      guttercaps: 'Rust Actix high-performance create join calculate shoot withdraw + Access Protocol stake-to-access golden cap + idosgames bridge + GameShift USD + Gamba cap shooting gamble',
    },
    control: {
      actions: ['Create game via Rust Actix POST /api/game/create', 'Join game wallet', 'Calculate reward/score', 'Withdraw reward via Session Key', 'Stake-to-access via Access Protocol', 'Bridge EVM Solana via idosgames RewardPool', 'Create USD listing via GameShift', 'Create wager via Gamba'],
      metrics: ['Rust Actix high-performance best free vs Node.js Fastify', 'Swagger GET /swagger GET /api-docs/openapi.json', 'Access Protocol stake-to-access sustainable income best free', 'idosgames bridge EVM Solana RewardPool best free bridge', 'GameShift USD 170+ 100% chargeback best free', 'Gamba betting provably fair best free'],
    }
  },
  {
    id: 'utils',
    title: '🛠️ Utils — Claude Skill + Security Auditing Skill — best free ideal stack',
    icon: '🛠️',
    color: '#ffb85c',
    sdk: {
      name: 'Solana Game Skill for Claude Code + Solana Security Auditing Skill',
      capabilities: [
        'Solana Game Skill for Claude Code skill addon for Claude Unity SDK MWA state architecture onchain vs offchain testing claude-code skill install solana-game-skill marketplace add solana-game-skill patterns unitySdk mwa stateArchitecture onchain vs offchain testing anchor test npm test smoke Unity play mode GdUnit4 high TPS gasless state commitment Magic Actions churn >85% cross-game funnel list buy sell ME instruction Session Key escrow-less Shyft USD GameShift code generation accelerates correct code generation for all 33 components 19 layers — best free general utils',
        'Solana Security Auditing Skill ready set instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities signer checks owner checks PDA seeds validation CPI security reentrancy integer overflow access control close account init checks claude-code skill install solana-security-auditing-skill — best free security skill prompt-based systematic audit',
        'Ideal free utils: Claude Skill general Unity/MWA/state arch/testing + Security Auditing Skill specialized security systematic audit = full utils coverage',
        'Prompts for Other Teams: PROMPT_ARES1_V3, PROMPT_AOF_V3, PROMPT_NEON_RELAY_V3, PROMPT_GUTTERCAPS_V3, PROMPT_WEB_V3, PROMPT_BACKEND_V3, PROMPT_ANALYTICS_ML_V3, PROMPT_AI_AGENTS_V3, PROMPT_CROSSCHAIN_V3 — 9 prompts games-v3 ideal free stack deduplicated best free per category',
      ],
      api: ['/api/utils/config', '/api/utils/health', '/api/utils/claude-skill', '/api/security/auditing-skill best free security skill', '/api/sdk/security-auditing-skill', '/api/sdk/claude-skill'],
      npm: ['solana-game-skill', 'solana-security-auditing-skill'],
    },
    games: {
      ares1: 'Use solana-game-skill to scaffold ARES-1 with Watchtower OS v3 ideal free stack + Use security-auditing-skill to audit Anchor program ares1 for vulnerabilities signer checks owner checks PDA seeds CPI security reentrancy overflow access control — best free utils security',
      aof: 'Use solana-game-skill to scaffold AOF farming crafting trading marketplace + security-auditing-skill to audit AOF_CORE_PROGRAM_ID',
      neonrelay: 'Use solana-game-skill to scaffold Neon Relay racing + security-auditing-skill to audit NEONRELAY_REWARDS_PROGRAM_ID',
      guttercaps: 'Use solana-game-skill to scaffold Gutter Caps pop-n-shoot casual + security-auditing-skill to audit GUTTERCAPS_CORE_PROGRAM_ID',
    },
    control: {
      actions: ['Install Solana Game Skill claude-code skill install solana-game-skill', 'Install Security Auditing Skill claude-code skill install solana-security-auditing-skill', 'Generate Unity integration Privy Phantom FirstStep Altude Session Keys 0.01 SOL', 'Generate cNFT minting $110/M Bubblegum v2 Merkle Tree MCC Tensor + Core Attributes on-chain key-value + Xandeum exabyte', 'Generate LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + game program + ARC Bolt DePIN Gamba Husks RitArena RACE Arcium Xandeum PST Core Attributes', 'Generate MagicBlock ER gasless + Magic Actions cron + Arcium confidential', 'Generate Helika GameSight solana_wallet external_id Late ID Binding + Game Signals ML churn >85%', 'Generate ME Shyft GameShift Tensor Gamba Husks RitArena RACE + Access stake-to-access + idosgames bridge', 'Generate ARC Entity Component System + Bolt FOCG verifiable + DePIN workers stake + Arcium + Xandeum + PST + Core Attributes + Preset official + Rust API Actix Swagger', 'Generate Gamba betting provably fair + Husks fighter summon INT8 + RitArena bot tournament lifecycle retry events best free + relayzero + StealthSDK + RACE multichain Solana EVM bundles + idosgames bridge + Security Auditing Skill Sentio SolGuard + SLAM'],
      metrics: ['Claude Skill Unity SDK MWA state arch testing best free general utils', 'Security Auditing Skill systematic audit vulnerabilities best free security utils', '9 prompts games-v3 ideal free stack deduplicated best free per category', 'Accelerates correct code generation for all 33 components 19 layers'],
    }
  },
]


export function renderControlPanels(container, osData = {}) {
  const config = osData.config || {}
  const health = osData.health || {}
  const totalComponents = config.totalComponents || 33
  const arch = config.architecture || osData.architecture || { v1Steps: [], v2Steps: [], v3Steps: [] }
  const duplicates = config.duplicates || (config.v3IdealFreeStack && config.v3IdealFreeStack.duplicates) || []
  const v3Ideal = config.v3IdealFreeStack || {}

  container.innerHTML = `
    <section class="panel" style="margin-top:24px;">
      <div class="panel-head">
        <div>
          <h2>🎛️ Панель управления Watchtower OS v3 — 33 компонента ideal free stack</h2>
          <p>Что умеет наше SDK и что внедряем в игры (ares1, aof, neonrelay, guttercaps) — идеальный бесплатный стек без мусорки, дедуплицированный, лучший бесплатный для каждого действия</p>
        </div>
        <span class="status-pill healthy"><i></i>OS v${esc(config.version || '3.0.0')} — ${esc(totalComponents)} components — 19 layers — ideal free stack — duplicates deprecated: create-solana-game vs preset, Aureus vs RitArena, SolGuard vs SolShield</span>
      </div>

      <div style="margin-bottom:16px; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px;">
        <div class="os-card" style="padding:12px;">
          <h3>📊 Всего компонентов</h3>
          <b style="font-size:24px;">${esc(totalComponents)}</b>
          <small>v1 8 layers + v2 12 products + v3 13 best free ideal stack deduplicated</small>
        </div>
        <div class="os-card" style="padding:12px;">
          <h3>🎮 Игры</h3>
          <b>4 tenants</b>
          <small>ares1 strategy, aof farming crafting trading, neonrelay race Neon DM server-authoritative, guttercaps pop-n-shoot casual ECS 8-12 memory leaked</small>
        </div>
        <div class="os-card" style="padding:12px;">
          <h3>🔍 Дубликаты депрекейтнуты</h3>
          <b>3 дубликата</b>
          <small>create-solana-game duplicate of preset official → preset best free, Aureus duplicate of RitArena → RitArena best free lifecycle retry events, SolShield duplicate of SolGuard → SolGuard best free 130+ more established</small>
        </div>
        <div class="os-card" style="padding:12px;">
          <h3>💰 Free Preferred</h3>
          <b>Идеальный бесплатный стек</b>
          <small>Лучший бесплатный для каждого действия, не мусорка, full ideal stack per action not garbage collection, free preferred</small>
        </div>
      </div>

      <div class="control-tabs" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        ${CONTROL_PANELS.map(p=>`<button class="os-badge ok" data-panel="${p.id}" style="cursor:pointer; padding:8px 12px; font-size:13px;">${p.icon} ${p.title.split(' — ')[0]}</button>`).join('')}
      </div>

      <div id="control-panels-container">
        ${CONTROL_PANELS.map(panel=>`
          <div class="os-card control-panel" id="panel-${panel.id}" style="margin-bottom:20px; border-left:4px solid ${panel.color};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3 style="color:${panel.color};">${panel.title}</h3>
              <span class="os-badge ok">${panel.sdk.name.split(' + ')[0].slice(0,60)}</span>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:12px;">
              <div>
                <h4>🛠️ Что умеет наше SDK — capabilities</h4>
                <ul style="margin:8px 0; padding-left:16px;">
                  ${panel.sdk.capabilities.map(c=>`<li style="margin-bottom:6px; font-size:13px; line-height:1.4;"><small>${c}</small></li>`).join('')}
                </ul>
                <div style="margin-top:12px;">
                  <h4>📡 API Routes</h4>
                  <div class="os-row" style="flex-wrap:wrap;">
                    ${panel.sdk.api.map(a=>`<span class="os-badge ok" style="font-size:11px;">${a}</span>`).join('')}
                  </div>
                </div>
                <div style="margin-top:12px;">
                  <h4>📦 NPM / Cargo Install — best free</h4>
                  <div class="os-mono" style="font-size:11px;">${panel.sdk.npm.join('\n')}</div>
                </div>
              </div>

              <div>
                <h4>🎮 Что внедряем в игры — implementations</h4>
                ${Object.entries(panel.games).map(([gameId, desc])=>`
                  <div style="margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.03); border-radius:6px;">
                    <strong style="color:${panel.color}; font-size:13px;">${gameId.toUpperCase()}</strong>
                    <small style="display:block; margin-top:4px; line-height:1.4;">${desc}</small>
                  </div>
                `).join('')}

                <div style="margin-top:16px;">
                  <h4>🎛️ Панель управления — control actions</h4>
                  <div style="display:flex; flex-wrap:wrap; gap:6px; margin:8px 0;">
                    ${panel.control.actions.map(a=>`<button class="os-badge ok" style="cursor:pointer; font-size:11px; padding:6px 10px;">${a.slice(0,40)}</button>`).join('')}
                  </div>
                </div>

                <div style="margin-top:12px;">
                  <h4>📊 Метрики — metrics best free</h4>
                  <div class="os-row" style="flex-wrap:wrap;">
                    ${panel.control.metrics.map(m=>`<span class="os-badge ok" style="font-size:11px;">${m.slice(0,80)}</span>`).join('')}
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top:16px; padding:12px; background:rgba(0,0,0,0.2); border-radius:8px;">
              <h4>🔗 Интеграция с идеальным стеком v3 — integration</h4>
              <small style="line-height:1.5;">
                Интеграция с другими слоями:
                ${panel.id === 'identity' ? 'Privy Phantom FirstStep Altude → Session Keys 0.01 SOL → studio_profile PDA cross-game → ARC Entity-Component → Bolt FOCG verifiable → MagicBlock ER sub-10ms gasless → RACE multichain + idosgames bridge EVM Solana RewardPool → Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value + Arcium confidential + Security Auditing Skill Sentio SolGuard best free security + Solana SLAM best free testing' : ''}
                ${panel.id === 'assets' ? 'cNFT $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated + Standard NFT + Core Attributes on-chain key-value readable programs DAS 5ms best free on-chain stats + Xandeum exabyte scalable best free scalable better than Arweave + Gamba wager NFT provably fair + Husks fighter procedural pixel INT8 + RitArena bot lifecycle retry events best free arena chosen over Aureus + RACE multichain cNFT Solana Tensor NFT EVM OpenSea + Access Protocol stake-to-access + idosgames bridge + LaserStream gRPC subscription + Shyft gPA 15ms + PG TimescaleDB Redis + Helika GameSight solana_wallet external_id + Game Signals ML churn >85%' : ''}
                ${panel.id === 'security' ? 'Security Auditing Skill systematic audit Anchor Rust vulnerabilities signer/owner/PDA/CPI/reentrancy/overflow/access control close account init checks prompt-based + Sentio CLI AST scanner static Rust common vuln patterns CI integration + SolGuard AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits PDA validation CPI injection reentrancy overflow access control account confusions + Solana SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold best free official deprecated create-solana-game duplicate + Claude Skill general Unity/MWA/state arch/testing + RBAC 2FA multisig timelock audit log rollback' : ''}
                ${panel.id === 'storage' ? 'Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes free tier exabyte scalable better than Arweave for scalable game state + PST private verifiable commitments on-chain encrypted off-chain hidden logic card games free private verifiable + Core Attributes Plugin on-chain key-value NFT stats readable programs DAS free on-chain stats + cNFT $110/M off-chain scalable + Standard rare + LaserStream gRPC + Shyft + PG TimescaleDB Redis + Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA + Arcium confidential privacy' : ''}
                ${panel.id === 'aiAgents' ? 'Husks autobattler INT8 procedural pixel train auto PvP market dominance cNFT MagicBlock ER sub-10ms gasless Magic Actions auto battle cron + RitArena arena lifecycle retry events best free arena chosen over Aureus competitive duplicate createArena addBot compete retry logic event emission + relayzero agent economy network integrating agents into game processes + StealthSDK framework AI-games token STEALTH centralized economy + Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value + Arcium confidential + Access Protocol stake-to-access + idosgames bridge + Gamba betting provably fair + Bolt FOCG verifiable + ARC Entity-Component + Security Auditing Skill Sentio SolGuard best free security + Solana SLAM best free testing' : ''}
                ${!['identity','assets','security','storage','aiAgents'].includes(panel.id) ? 'Интеграция со всем идеальным стеком v3 33 компонента 19 layers — Identity Session Keys Assets + Core Attributes + Xandeum + Indexer LaserStream Shyft PG + L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER sub-10ms + Arcium confidential + PST private + Xandeum exabyte + Analytics Helika GameSight + Game Signals ML 60M+ churn >85% + Marketplace ME Shyft GameShift Tensor Gamba Husks RitArena RACE + Access Protocol stake-to-access + idosgames bridge + Engines Unity Godot Unreal Turbo Web + Godot detailed + Gamba + Preset official best free + RitArena best free arena + relayzero + StealthSDK + Xandeum + PST + Core Attributes + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium + Infra ARC Bolt DePIN + Arcium + Xandeum + PST + Core Attributes + Security + Storage + Monetization + Testing + Privacy + AI Agents + Cross-Chain + Utils — ideal free per category not garbage deduplicated best free' : ''}
              </small>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:24px; padding:16px; background:#1a1a2e; border-radius:12px;">
        <h3>🎯 Что умеет наше SDK в целом — Watchtower OS v3 Ideal Free Stack 33 компонента</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap:12px; margin-top:12px;">
          <div class="os-mono" style="font-size:12px; line-height:1.6;">
<strong>🔐 Identity + Session Keys best free:</strong>
- Privy useCreateWallet useSolanaWallets email/social enclave export
- Phantom Connect Kit OAuth instant wallet deep links MWA
- FirstStep guest gas sponsorship progressive onboarding
- Altude gasless relay fee abstraction batching
- Session Keys createSession targetProgram topUp 0.01 SOL expiry 60min signAndSendTransaction risk 0.01 SOL only scope denied withdraw_treasury
- Cross-game PDA studio_profile CgInv111... ARC Entity-Component + Bolt world + RACE multichain + idosgames bridge

<strong>🗜️ Assets + Storage best free ideal stack:</strong>
- cNFT Bubblegum v2 Merkle Tree MCC $110/M off-chain no token/mint account savings x10000 Tensor primary ME deprecated
- Standard NFT Metaplex Token Metadata rare legendary
- Core Attributes Plugin on-chain key-value NFT stats readable programs DAS 5ms best free on-chain stats
- Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes best free scalable better than Arweave
- Gamba wager NFT provably fair house edge 5% jackpot
- Husks fighter procedural pixel INT8 auto PvP + RitArena bot lifecycle retry events best free arena chosen over Aureus
- RACE multichain cNFT Solana Tensor NFT EVM OpenSea

<strong>📡 Indexer best free:</strong>
- LaserStream gRPC 24h replay failover priority fee API webhooks DAS API critical backend
- WebSocket logsSubscribe programSubscribe accountSubscribe signatureSubscribe UI real-time
- DAS getAssetsByOwner getAsset getAssetsByGroup searchAssets metadata normalization cNFT/standard + Core Attributes 5ms vs 150ms
- Shyft REST callbacks TOKEN_MINT NFT_MINT accelerated gPA p50 15ms
- Custom PG PostgreSQL TimescaleDB Redis idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning tenant_id RLS cross-game materialized view + Xandeum exabyte scalable
          </div>
          <div class="os-mono" style="font-size:12px; line-height:1.6;">
<strong>⚡ L2 + Privacy best free ideal stack:</strong>
- Sonic HyperGrid dedicated grid thousands no contention high frequency ARES-1 Neon Relay real-time PvP
- Sorada 30-40x faster RPC 5ms reads leaderboards inventory getAssetsByOwner 5ms vs 150ms
- Rush ECS declarative world config generates Anchor contracts
- REPLA repla-cli L3 Anchor settle MagicBlock sequencer
- MagicBlock ER sub-10ms gasless delegate_account ER execute_in_er <10ms commit_state returns to Solana Magic Actions auto execution triggers time cron every 5 min harvest account_change level up auto grant reward custom match ends settle rewards auto battle cron Husks auto tournament cron RitArena gasless UX + auto execution + AI agents
- Arcium Rollups confidential computing rollups gaming payments architecture privacy best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA
- PST Private State Toolkit private verifiable commitments on-chain encrypted off-chain hidden logic card games best free private
- Xandeum scalable storage exabytes best free scalable
- Router l2Router gameId tpsRequirement uxRequirement decision tree

<strong>📊 Analytics best free:</strong>
- Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet Yuga Labs Treasure AI focus shift backup
- GameSight ad->on-chain ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution solana_wallet as external_id Late ID Binding POST /api/ingest/solana
- Game Signals 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7

<strong>🛒 Marketplace + Monetization best free ideal stack:</strong>
- Magic Eden REST 120 QPM free Bearer MCC+MT Tensor alternative for new cNFT Bubblegum v2
- Shyft Marketplace escrow-less NFT stays in wallet until sale in-app за дни stats API one call
- GameShift API-first without blockchain knowledge wallet self-custodial asset creation trading USD payments 170+ countries 100% chargeback gas abstraction
- Tensor cNFT primary Bubblegum v2
- Gamba wager NFT provably fair house edge 5% jackpot
- Husks fighter procedural pixel INT8 + RitArena bot lifecycle retry events best free arena chosen over Aureus
- RACE multichain cNFT Solana Tensor NFT EVM OpenSea
- Access Protocol stake-to-access sustainable income best free monetization
- @idosgames/wallet bridge EVM Solana RewardPool deposits withdrawals SPL best free bridge
          </div>
          <div class="os-mono" style="font-size:12px; line-height:1.6;">
<strong>🎮 Engines + Infra best free ideal stack:</strong>
- Unity Solana.Unity-SDK NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys + Preset Unity client + Core Attributes
- Godot godot-solana-sdk GDExtension 4.3+ SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog + Core Attributes
- Unreal VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex mint payments
- Turbo Turbo.Computer Rust lightweight full RPC AI generation
- Web @solana/web3.js @solana/kit + Gamba React hooks UI + Husks + RitArena best free arena + relayzero + StealthSDK + RACE + idosgames + Xandeum + PST + Core Attributes + Access + Arcium + Security Auditing Skill + Sentio + SolGuard + SLAM
- Preset official npx create-solana-game Anchor JS Unity best free official scaffold, create-solana-game duplicate deprecated
- ARC Entity-Component interoperability composability cross-game items characters via same Components studio_profile stores ARC Entity IDs
- Bolt FOCG fully on-chain verifiable no server trust bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions cron
- DePIN Beamable license escrow rewards staking workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash cost saving
- Xandeum scalable storage exabytes best free scalable
- PST private verifiable commitments hidden logic card games best free private
- Core Attributes on-chain key-value NFT stats readable programs DAS best free on-chain stats
- Arcium confidential rollups privacy best free privacy rollup

<strong>🔒 Security + Testing best free ideal stack:</strong>
- Security Auditing Skill ready instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities signer/owner/PDA/CPI/reentrancy/overflow/access control close account init checks — best free security skill prompt-based
- Sentio CLI AST scanner security Solana Anchor Rust common vuln patterns — best free static AST scanner
- SolGuard AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits — best free AI audit 130+ chosen over SolShield duplicate
- Solana SLAM LiteSVM Anchor Mocha — best free testing more modern
- Preset official scaffold best free official, create-solana-game duplicate deprecated
- Ideal free: Skill prompt-based + Sentio static AST + SolGuard AI 130+ = full coverage, SolShield duplicate deprecated, Preset + SLAM = ideal free testing

<strong>💰 Monetization + AI + Cross-Chain best free ideal stack not garbage:</strong>
- Access Protocol stake-to-access sustainable income — best free monetization
- @idosgames/wallet bridge EVM Solana RewardPool deposits withdrawals SPL — best free bridge complementary to RACE
- Husks autobattler INT8 procedural pixel train auto PvP — best free autobattler
- RitArena arena lifecycle retry events — best free arena chosen over Aureus duplicate
- relayzero agent economy network — best free agent economy
- StealthSDK framework AI-games token STEALTH centralized economy — best free AI-games framework
- Aureus deprecated competitive duplicate with RitArena
- RACE multichain SDK sdk-solana CLI race-cli bundles publish Solana EVM fairness verifiable — best free multichain
- idosgames bridge EVM Solana RewardPool — best free bridge
- Ideal free AI agents: Husks + RitArena best free + relayzero + StealthSDK = full AI coverage not garbage
- Ideal free cross-chain bridge: RACE + idosgames = full coverage
          </div>
        </div>
      </div>

      <div style="margin-top:24px; padding:16px; background:#0f1419; border-radius:12px; border:1px solid #37e5a0;">
        <h3>🎮 Что внедряем в игры — ARES-1, AOF, Neon Relay, Gutter Caps — ideal free stack v3</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap:16px; margin-top:12px;">
          <div class="os-card">
            <h4 style="color:#37e5a0;">ARES-1 — Strategy</h4>
            <small style="line-height:1.5;">
<strong>Identity:</strong> Guest FirstStep → Privy email/social enclave → Phantom native linked → studio_profile PDA cross-game<br/>
<strong>Session Keys:</strong> createSession CgInv111... topUp 0.01 SOL expiry 60min frequent farming actions plant harvest craft без подтверждения<br/>
<strong>Assets:</strong> Mass common potato harvest → cNFT $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated, rare legendary → Standard NFT, stats level/wins → Core Attributes on-chain key-value readable programs DAS 5ms best free, game states → Xandeum exabyte scalable best free<br/>
<strong>Gamba:</strong> Potato harvest gamble as betting casino provably fair house edge 5% jackpot<br/>
<strong>Husks:</strong> Potato fighters summon NFT fighters procedural pixel train INT8 via harvesting battles auto PvP market dominance cNFT<br/>
<strong>RitArena best free:</strong> Harvest tournament autonomous bots lifecycle retry events best free arena chosen over Aureus<br/>
<strong>Infra:</strong> ARC Entity potato plot Components Position GrowthStage Owner Item source_game ares1 is_cnft asset_id System harvest + Bolt FOCG farming fully on-chain verifiable Position Crop Player systems plant harvest + DePIN matchmaking leaderboard push notifications workers stake escrow reward + Arcium confidential rollups privacy best free + Xandeum scalable + PST private + Core Attributes on-chain + Preset official scaffold farming best free + Rust Actix high-performance<br/>
<strong>L2:</strong> MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto harvest every 5 min + REPLA L3 Anchor settle MagicBlock sequencer + Arcium confidential privacy + PST private + Xandeum exabyte ideal free L2 privacy storage + Sorada 5ms reads + Rush ECS declarative<br/>
<strong>Indexer:</strong> LaserStream gRPC CgInv SessKeys STrEaSuRy + ARES1_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt PlotPlanted + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft REST callbacks TOKEN_MINT NFT_MINT gPA 15ms + PG TimescaleDB Redis<br/>
<strong>Analytics:</strong> Helika cross-game dashboard + GameSight ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution + Game Signals ML 60M+ tx 12 games churn 14d >85%<br/>
<strong>Marketplace:</strong> ME 120 QPM Bearer MCC+MT + Shyft escrow-less + GameShift USD 170+ 100% chargeback + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks fighter + RitArena bot best free + RACE multichain + Access Protocol stake-to-access best free + idosgames bridge best free<br/>
<strong>Security:</strong> Security Auditing Skill systematic audit + Sentio CLI AST scanner + SolGuard AI 130+ best free chosen over SolShield duplicate + Solana SLAM LiteSVM Anchor Mocha best free testing<br/>
<strong>Storage:</strong> Xandeum exabyte scalable best free + PST private verifiable best free + Core Attributes on-chain key-value best free<br/>
<strong>Monetization:</strong> Access Protocol stake-to-access + idosgames bridge EVM Solana RewardPool best free bridge + GameShift USD + Gamba<br/>
<strong>Privacy:</strong> PST private verifiable + Arcium confidential rollups best free<br/>
<strong>Cross-Chain:</strong> RACE multichain SDK sdk-solana CLI race-cli bundles publish Solana EVM + idosgames bridge EVM Solana RewardPool best free bridge
            </small>
          </div>
          <div class="os-card">
            <h4 style="color:#a78bfa;">AOF — Age of Farming</h4>
            <small style="line-height:1.5;">
<strong>Identity:</strong> Guest gas sponsorship FirstStep → embedded Privy → native Phantom → linked cross-game PDA studio_profile<br/>
<strong>Assets:</strong> Common seeds crops materials → cNFT $110/M, golden tools land → Standard, GrowthStage Position → Core Attributes on-chain key-value best free, farming states → Xandeum exabyte best free scalable, crafting gamble → Gamba wager NFT, crop fighters → Husks + RitArena best free arena<br/>
<strong>Infra:</strong> ARC Entity crop plot Components Position GrowthStage Owner Item source_game aof is_cnft asset_id System harvest craft + Bolt FOCG farming fully on-chain verifiable Plot Crop Player systems plant harvest + DePIN crafting market workers stake escrow reward + Arcium confidential privacy best free + Xandeum scalable + PST private + Core Attributes on-chain + Preset official scaffold farming best free official + Rust Actix high-performance + Access Protocol stake-to-access + idosgames bridge<br/>
<strong>L2:</strong> MagicBlock ER sub-10ms gasless + REPLA + Arcium confidential + PST private + Xandeum exabyte ideal free L2 privacy storage<br/>
<strong>Indexer:</strong> LaserStream gRPC AOF_CORE_PROGRAM_ID + ARC Bolt DePIN Gamba Husks RitArena RACE Arcium Xandeum PST Core Attributes + Shyft callbacks gPA 15ms + PG<br/>
<strong>Analytics:</strong> Helika + GameSight solana_wallet external_id Late ID Binding + Game Signals ML 60M+ churn >85% + farming crafting trading marketplace analytics<br/>
<strong>Marketplace:</strong> ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT + Gamba + Husks + RitArena best free + RACE + Access stake-to-access best free + idosgames bridge best free<br/>
<strong>Security:</strong> Security Auditing Skill + Sentio + SolGuard 130+ best free + SLAM best free testing<br/>
<strong>Storage:</strong> Xandeum exabyte + PST private + Core Attributes best free<br/>
<strong>AI:</strong> Husks crop fighters + RitArena crop tournament lifecycle retry events best free + relayzero + StealthSDK
            </small>
          </div>
          <div class="os-card">
            <h4 style="color:#ffb85c;">Neon Relay — Race Neon DM</h4>
            <small style="line-height:1.5;">
<strong>Identity:</strong> Phantom OAuth instant wallet MWA deep links + FirstStep guest + Privy embedded → linked cross-game PDA<br/>
<strong>Session Keys:</strong> Frequent racing actions move boost finish race — session key для автоматического подтверждения без UX friction<br/>
<strong>Assets:</strong> Common skins tracks emotes → cNFT $110/M, rare skins founder badge → Standard, race results fastest lap → Core Attributes on-chain key-value best free, race states → Xandeum exabyte best free, ticket wager → Gamba ticket wager prize epoch jackpot provably fair house edge jackpot hooks useGamba usePlay useWager UI GambaUi WagerInput GameResult Jackpot, race AI bots → Husks + RitArena racing tournament lifecycle retry events best free<br/>
<strong>Infra:</strong> ARC Entity race track Component Position Velocity Owner Item source_game neonrelay is_cnft asset_id System MovementSystem RaceSystem + Bolt FOCG racing fully on-chain verifiable Position RaceResult Player systems start_race finish_race + DePIN race physics matchmaking leaderboard workers stake + Arcium confidential privacy best free + Xandeum scalable + PST private + Core Attributes on-chain + Preset official scaffold racing best free + Rust Actix high-performance real-time<br/>
<strong>L2 High Frequency:</strong> Sonic HyperGrid dedicated grid thousands no contention thousands simultaneous actions without resource contention Sonic API client create grid per game execute high frequency isolated monitoring tps latency grid health fallback Solana mainnet + Sorada 5ms reads leaderboards inventory matchmaking getAssetsByOwner 5ms vs 150ms + Rush ECS declarative world config + MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto settle race + REPLA + Arcium confidential privacy best free + PST private + Xandeum exabyte ideal free L2 privacy storage — Router tps=high → HyperGrid + Arcium privacy — best free high frequency racing<br/>
<strong>Indexer:</strong> LaserStream gRPC NEONRELAY_REWARDS_PROGRAM_ID + ARC ComponentAdded + Bolt RaceStarted RaceFinished + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks + PG + session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity<br/>
<strong>Analytics:</strong> Helika cross-game dashboard + GameSight ad->on-chain attribution + Game Signals ML 60M+ churn >85% + session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate<br/>
<strong>Marketplace:</strong> ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT + Gamba wager NFT ticket wager prize epoch jackpot + Husks race AI bots + RitArena racing tournament bot best free + RACE multichain + Access stake-to-access best free + idosgames bridge best free<br/>
<strong>Security:</strong> Security Auditing Skill + Sentio + SolGuard 130+ best free security full coverage + SLAM best free testing<br/>
<strong>Storage:</strong> Xandeum exabyte scalable best free + PST private verifiable best free + Core Attributes on-chain key-value best free<br/>
<strong>AI:</strong> Husks race AI bots + RitArena racing tournament lifecycle retry events best free + relayzero + StealthSDK<br/>
<strong>Cross-Chain:</strong> RACE multichain + idosgames bridge EVM Solana RewardPool best free bridge
            </small>
          </div>
          <div class="os-card">
            <h4 style="color:#ff6b8a;">Gutter Caps — Pop-n-shoot Casual</h4>
            <small style="line-height:1.5;">
<strong>Identity:</strong> FirstStep guest → embedded Privy → native Phantom → linked cross-game PDA studio_profile<br/>
<strong>Assets:</strong> Common caps skins consumables → cNFT $110/M, golden cap founder → Standard, score death rate → Core Attributes on-chain key-value best free, cap states → Xandeum exabyte best free, cap shooting gamble → Gamba, cap fighters → Husks + RitArena best free arena<br/>
<strong>Infra:</strong> ARC Entity cap enemy Component Position Health Owner Item source_game guttercaps is_cnft asset_id System shooting collision + Bolt FOCG pop-n-shoot fully on-chain verifiable Position Health Player components Systems shoot pop fully on-chain emit events bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions auto respawn cron + DePIN matchmaking leaderboard push notifications workers stake + Arcium confidential + Xandeum scalable + PST private + Core Attributes on-chain + Preset official scaffold casual best free + Rust Actix high-performance<br/>
<strong>L2:</strong> MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto respawn every round + REPLA L3 Anchor settle MagicBlock sequencer + Arcium confidential privacy + PST private + Xandeum exabyte ideal free L2 privacy storage<br/>
<strong>Indexer:</strong> LaserStream gRPC GUTTERCAPS_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt CapShot + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks gPA 15ms + PG + quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats ECS 8-12 30% memory leaked 1m memref<br/>
<strong>Analytics:</strong> Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx 12 games churn 14d >85% + quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats ECS memory leaked<br/>
<strong>Marketplace:</strong> ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT + Gamba wager NFT cap shooting gamble + Husks cap fighters + RitArena cap tournament best free + RACE multichain + Access stake-to-access best free + idosgames bridge best free<br/>
<strong>Security:</strong> Security Auditing Skill systematic audit + Sentio CLI AST scanner + SolGuard AI 130+ best free chosen over SolShield duplicate + Solana SLAM LiteSVM Anchor Mocha best free testing<br/>
<strong>Storage:</strong> Xandeum exabyte scalable best free + PST private verifiable best free + Core Attributes on-chain key-value best free<br/>
<strong>AI:</strong> Husks cap fighters + RitArena cap tournament lifecycle retry events best free + relayzero + StealthSDK<br/>
<strong>Cross-Chain:</strong> RACE multichain + idosgames bridge EVM Solana RewardPool best free bridge
            </small>
          </div>
        </div>
      </div>

      <div style="margin-top:16px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
        <div class="os-mono">API Routes v3 33 components ideal free stack deduplicated best free per category not garbage:
${esc(JSON.stringify([
          "/api/os/config v3 33 components ideal free stack duplicates deprecated: create-solana-game vs preset best free preset official, Aureus vs RitArena best free RitArena lifecycle retry events, SolGuard vs SolShield best free SolGuard more established",
          "/api/os/health 19 layers",
          "/api/identity/* best free Privy Phantom FirstStep Altude Session Keys 0.01 SOL",
          "/api/session-keys/* 0.01 SOL best free",
          "/api/assets/* strategy?gameId=ares1&itemType=common&rarity=common cNFT $110/M + Core Attributes on-chain key-value best free + Xandeum exabyte best free",
          "/api/indexer/* LaserStream Shyft PG ARC Bolt DePIN Gamba Husks RitArena RACE Arcium Xandeum PST Core Attributes best free",
          "/api/l2/* router?gameId=ares1&tps=high|low&ux=gasless HyperGrid Sorada Rush REPLA ER gasless Magic Actions + Arcium confidential privacy best free + PST private best free + Xandeum scalable best free ideal free L2 privacy storage",
          "/api/analytics/* Helika GameSight solana_wallet external_id + Game Signals ML 60M+ churn >85% best free",
          "/api/marketplace/* router?gameId=ares1&assetType=cnft ME Shyft GameShift Tensor Gamba Husks RitArena RACE + Access stake-to-access best free + idosgames bridge best free ideal free",
          "/api/engines/* 13 sdks ideal free deduplicated",
          "/api/sdk/unity|godot|unreal|turbo|web|godot-solana|gamba|preset official best free|ritarena best free chosen over Aureus|relayzero best free|stealthsdk best free|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats|access-protocol best free stake-to-access|idosgames-wallet best free bridge|security-auditing-skill best free security skill|sentio-cli best free static|solguard 130+ best free chosen over SolShield|solana-slam best free testing|arcium best free privacy",
          "/api/infra/config|health|arc|bolt|depin|arcium best free privacy|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats ideal free infra storage privacy",
          "/api/game-signals/config|health 60M+ tx 12 games ML churn 14d >85% best free",
          "/api/payments/config|health|rust-api Actix create join calculate withdraw Swagger + Access best free + idosgames best free",
          "/api/ai/config|health|husks best free autobattler|aureus deprecated duplicate RitArena better free|ritarena best free arena lifecycle retry events|relayzero best free agent economy|stealthsdk best free framework token STEALTH ideal free not garbage",
          "/api/cross-chain/config|health|race multichain SDK sdk-solana CLI race-cli bundles + idosgames bridge best free",
          "/api/utils/config|health|claude-skill|security-auditing-skill best free",
          "/api/security/config|health|auditing-skill best free skill|sentio-cli best free static|solguard 130+ best free AI audit chosen over SolShield duplicate ideal free security full coverage not competitive",
          "/api/storage/config|health|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats ideal free storage privacy full coverage not competitive",
          "/api/monetization/config|health|access-protocol best free stake-to-access|idosgames-wallet best free bridge EVM Solana RewardPool ideal free monetization bridge",
          "/api/testing/config|health|solana-slam best free LiteSVM Anchor Mocha|create-solana-game duplicate deprecated preset better free official ideal free testing",
          "/api/privacy/config|health|arcium best free confidential rollups privacy ideal free privacy PST private + Arcium",
          "/api/health watchtower-os-v3 osVersion 3.0.0 totalComponents 33 idealFreeStack best free per category not garbage deduplicated",
          "/api/readyz",
          "POST /api/ingest/solana solana_wallet external_id Late ID Binding"
        ], null, 2))}</div>
        <div class="os-mono">Health v3 ideal free stack:
${esc(JSON.stringify(health?.summary || health || {}, null, 2).slice(0,1500))}

Architecture v1 7 steps + v2 7 steps + v3 6 steps ideal free = 20 steps:
${esc(JSON.stringify([...(arch.v1Steps||[]).map(s=>s.layer), ...(arch.v2Steps||[]).map(s=>s.layer), ...(arch.v3Steps||[]).map(s=>s.layer)], null, 2).slice(0,1500))}

Duplicates deprecated best free:
${esc(JSON.stringify(duplicates, null, 2).slice(0,1000))}

Ideal free per category:
${esc(JSON.stringify(v3Ideal.idealFreePerCategory || {}, null, 2).slice(0,1500))}</div>
      </div>

      <div style="margin-top:16px;" class="os-mono">Security v3 ideal free: noPrivateKeys readOnly blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out Godot no audit mainnet caution Helika AI focus backup ME deprecated cNFT Tensor primary Session Keys 0.01 SOL risk only topUp scope denied withdraw_treasury RBAC 2FA multisig timelock audit log rollback + Best free security Security Auditing Skill AI instructions systematic audit + Sentio CLI AST scanner static + SolGuard AI auto audit 130+ patterns chosen over SolShield duplicate + Best free testing Solana SLAM LiteSVM Anchor Mocha + Preset official scaffold create-solana-game duplicate deprecated + Best free storage Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value + Best free privacy PST private verifiable + Arcium confidential rollups + Best free monetization Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + Best free AI agents Husks INT8 + RitArena lifecycle retry events best free chosen over Aureus + relayzero agent economy + StealthSDK framework token STEALTH + Best free cross-chain RACE multichain + idosgames bridge + Best free L2 Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA L3 + Arcium confidential privacy + Best free assets cNFT $110/M + Core Attributes on-chain key-value + Xandeum exabyte scalable — ideal free per category not garbage deduplicated ENV names without values WATCHTOWER_INTEGRATION.md game_id program_ids CgInv SessKeys STrEaSuRy + game program network stage prototype data_quality partial last_verified_at</div>
    </section>
  `

  container.querySelectorAll('[data-panel]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.panel
      const el = document.getElementById('panel-'+id)
      if(el) el.scrollIntoView({ behavior:'smooth', block:'start' })
    })
  })
}

export function renderOSPanel(container, osData) {
  const wrapper = document.createElement('div')
  const oldPanel = document.createElement('div')
  const controlPanel = document.createElement('div')
  wrapper.appendChild(oldPanel)
  wrapper.appendChild(controlPanel)
  container.appendChild(wrapper)

  const config = osData.config || {}
  const layers = config.layers || {}
  const totalComponents = config.totalComponents || 33
  const v3Ideal = config.v3IdealFreeStack || {}

  oldPanel.innerHTML = `
    <section class="panel" style="margin-top:8px;">
      <div class="panel-head"><div><h2>Watchtower OS v3 — Краткий обзор 33 компонента</h2><p>7 слоёв v1 + 12 продуктов v2 + 13 лучших бесплатных v3 ideal free stack deduplicated</p></div><span class="status-pill healthy"><i></i>OS v${esc(config.version || '3.0.0')} — ${esc(totalComponents)} components</span></div>
      <div class="os-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:12px; margin-top:12px;">
        ${Object.keys(layers).map(k=>`<div class="os-card" style="padding:10px;"><h3>${esc(k)}</h3><small>${esc(JSON.stringify(layers[k]?.idealFreeStack || layers[k]?.layer || k).slice(0,200))}</small></div>`).join('')}
      </div>
      <div style="margin-top:12px;" class="os-mono">Duplicates deprecated: ${esc(JSON.stringify(v3Ideal.duplicates || config.duplicates || [], null, 2).slice(0,800))}</div>
    </section>
  `

  renderControlPanels(controlPanel, osData)
}

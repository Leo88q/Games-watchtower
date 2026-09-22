# Watchtower OS v3 — Панель управления для каждой функции — 19 панелей — что умеет SDK и что внедряем в игры

## Всего компонентов v3
- v1 8 layers: identity, sessionKeys, assets, indexer, l2, analytics, marketplace, engines
- v2 12 products: Godot SolanaClient/WalletAdapter/AnchorProgram, Gamba betting, Preset official scaffold, ARC Framework, Bolt FOCG, DePIN Beamable, Game Signals ML 60M+ tx 12 games churn 14d >85%, Rust API Actix Swagger, Husks INT8 autobattler, Aureus deprecated duplicate RitArena, RACE multichain SDK CLI race-cli, Claude Skill
- v3 13 best free ideal stack: Security Auditing Skill systematic audit + Sentio CLI AST scanner + SolGuard 130+ AI audit chosen over SolShield duplicate + Xandeum scalable storage exabyte + PST private verifiable + Core Attributes Plugin on-chain key-value + Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + RitArena lifecycle retry events best free arena chosen over Aureus + relayzero agent economy + StealthSDK framework token STEALTH + Solana SLAM LiteSVM Anchor Mocha best free testing + create-solana-game duplicate deprecated preset better free official + Arcium Rollups confidential privacy
- Total 33 components deduplicated best free per category not garbage
- Duplicates deprecated: create-solana-game duplicate of preset official → preset best free, Aureus duplicate of RitArena → RitArena best free lifecycle retry events, SolShield duplicate of SolGuard → SolGuard best free 130+ more established
- 19 layers + 19 control panels 🎛️
- 4 tenants: ares1 strategy, aof farming crafting trading marketplace, neonrelay race Neon DM server-authoritative identity reward ledger, guttercaps pop-n-shoot casual ECS 8-12 memory leaked

## 19 Панелей управления — что умеет SDK и что внедряем

### 1. Identity Layer — best free — Privy + Phantom Connect Kit + FirstStep + Altude
**SDK capabilities:**
- Privy useCreateWallet useSolanaWallets auto Solana wallet при первом входе email/social secure enclave export
- Phantom Connect Kit OAuth instant wallet deep links MWA Mobile Wallet Adapter
- FirstStep guest gas sponsorship progressive onboarding игрок начинает без кошелька
- Altude gasless relay fallback fee abstraction batching
- Cross-game PDA studio_profile Anchor CgInv111... кросс-игровой инвентарь
- Onboarding flow guest → embedded → native → linked cross-game PDA

**Внедряем в игры:**
- ares1: Guest FirstStep → farm картофелины → Privy email/social enclave → Phantom native link → studio_profile PDA Position GrowthStage
- aof: guest gas sponsorship embedded wallet auto cross-game материалы RLS tenant_id aof
- neonrelay: Phantom OAuth instant wallet MWA deep links session telemetry match_start/end reward ledger
- guttercaps: FirstStep guest → embedded → native linked cross-game caps skins ECS fix

**API:** /api/identity/*

### 2. Session Keys — JWT для Web3, риск 0.01 SOL
**SDK:**
- createSession(targetProgramPublicKey, topUp 0.01 SOL, expiry 60min) временная пара на клиенте session token
- signAndSendTransaction без раскрытия приватного ключа основного кошелька
- revokeSession
- Risk only topUp 0.01 SOL default max 0.1 SOL temporary keypair isolated
- Scope allowedPrograms [targetProgram] deniedInstructions [withdraw_treasury update_authority mint_unlimited]
- Unity из коробки Solana.Unity-SDK Web custom Godot/Unreal analog temporary keypair 0.01 SOL
- Godot detailed SolanaClient WalletAdapter AnchorProgram session keys analog

**Внедряем:**
- ares1 frequent farming plant harvest craft без подтверждения topUp 0.01 SOL expiry 60min denied withdraw_treasury
- aof crafting gamble Gamba provably fair wager via session key risk 0.01 SOL only
- neonrelay high frequency racing move boost finish race session key auto
- guttercaps pop-n-shoot shoot pop session key gasless UX via MagicBlock ER delegate executeGasless <10ms

**API:** /api/session-keys/*

### 3. Assets — cNFT $110/M + Core Attributes + Xandeum — best free ideal stack
**SDK:**
- cNFT Bubblegum v2 Merkle Tree MCC BGUMAp9... cmtDv... 1M ~ $110 off-chain no token/mint account savings x10000 vs standard $1.8M
- Standard NFT Metaplex Token Metadata metaqbxx... Tokenkeg... rare legendary founder badge land
- Metaplex Core Attributes Plugin on-chain key-value NFT game stats level/wins/harvests readable by Solana programs indexable via DAS getAssetsByOwner 5ms vs 150ms best free on-chain stats
- Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes npm i @xandeum/sdk best free scalable better than Arweave for game state
- Strategy mass common consumable material -> cNFT $110/M rare legendary -> Standard wager fighter bot -> cNFT on-chain stats -> Core Attributes game states -> Xandeum
- Marketplace Tensor primary Bubblegum v2 ME deprecated for new cNFT Shyft escrow-less GameShift USD
- Gamba wager NFT provably fair house edge 5% jackpot Husks fighter procedural pixel INT8 RitArena bot lifecycle retry events best free arena RACE multichain cNFT Solana Tensor NFT EVM OpenSea

**Внедряем:**
- ares1 mass common potato harvest → cNFT $110/M Bubblegum v2 Merkle Tree MCC Tensor primary rare legendary → Standard stats level/wins → Core Attributes on-chain key-value readable programs DAS game states → Xandeum exabyte
- aof common seeds crops materials → cNFT golden tools land → Standard GrowthStage Position → Core Attributes farming states → Xandeum crafting gamble → Gamba
- neonrelay common skins tracks emotes → cNFT rare skins founder badge → Standard race results fastest lap → Core Attributes race states → Xandeum ticket wager → Gamba race AI bots → Husks+RitArena
- guttercaps common caps skins consumables → cNFT golden cap founder → Standard score death rate → Core Attributes cap states → Xandeum cap shooting gamble → Gamba cap fighters → Husks+RitArena

**API:** /api/assets/* /api/sdk/core-attributes /api/sdk/xandeum /api/storage/core-attributes /api/storage/xandeum

### 4. Storage — Xandeum exabyte + PST private + Core Attributes — best free ideal stack
**SDK:**
- Xandeum scalable storage layer dApps Solana exabytes game states assets player data decentralized network grow to exabytes npm i @xandeum/sdk save({gameId key data}) exabyte scalable best free scalable better than Arweave free tier exabyte
- Private State Toolkit PST private but verifiable state commitments on-chain encrypted off-chain ideal for hidden logic card games npm i @private-state-toolkit/sdk commit({gameId commitment hash(hiddenState)}) only commitment on-chain storeEncrypted commitment encryptedState encrypted off-chain verify commitment proof verifiable commitCardHand revealWithProof best free private verifiable
- Core Attributes Plugin on-chain key-value in NFT game stats characteristics readable by Solana programs indexable via DAS npm i @metaplex-foundation/mpl-core addAttribute nftAddress key level value 10 on-chain key-value readProgram In Anchor program via CPI stats readable best free on-chain stats
- Ideal free Xandeum scalable public off-chain exabyte + PST private commitments on-chain encrypted off-chain + Core Attributes public on-chain key-value = full coverage storage privacy not competitive
- vs legacy cNFT off-chain Arweave/Shadow/Irys for metadata $110/M vs Xandeum exabyte scalable for game states Xandeum better for scalable Arweave fallback for cNFT metadata

**Внедряем:**
- ares1 game states potato plots → Xandeum exabyte hidden logic card games? → PST private commitments stats level/wins → Core Attributes
- aof farming states crop plots GrowthStage → Xandeum + Core Attributes Position GrowthStage Owner hidden crafting recipes → PST private
- neonrelay race states Position Velocity RaceResult → Xandeum + Core Attributes fastest lap hidden map logic? → PST private verifiable
- guttercaps cap states Position Health → Xandeum + Core Attributes score death rate hidden enemy logic → PST private

**API:** /api/storage/* /api/infra/xandeum|pst|core-attributes /api/sdk/xandeum|pst|core-attributes

### 5. Security — Auditing Skill + Sentio CLI + SolGuard 130+ — best free ideal stack
**SDK:**
- Solana Security Auditing Skill ready set instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities signer checks owner checks PDA seeds validation CPI security reentrancy integer overflow access control close account init checks claude-code skill install solana-security-auditing-skill best free security skill prompt-based systematic audit
- Sentio CLI AST scanner security Solana Anchor Rust common vuln patterns Rust source Anchor patterns common vulns CI integration cargo install sentio-cli npm i -g @sentio/cli scan --program ./programs/cross_game_inventory scan --severity high audit --anchor --report json scan --ci --fail-on high best free static AST scanner
- SolGuard / SolShield AI tools automatic audit Solana smart contracts checking 130+ vulnerability patterns signer checks rights bypass flash-loan exploits PDA validation CPI injection reentrancy overflow access control account confusions npm i -g solguard cargo install solguard audit ./programs/cross_game_inventory --patterns 130 --report json audit --severity critical,high ci --fail-on high best free AI auto audit 130+ patterns chosen over SolShield similar duplicate SolGuard more established
- Ideal free Skill prompt-based systematic audit + Sentio static AST + SolGuard AI 130+ = full coverage not competitive each distinct action SolShield duplicate deprecated pick SolGuard

**Внедряем:**
- ares1 audit cross_game_inventory CgInv111... session_keys SessKeys111... studio_treasury STrEaSuRy111... + ARES1_CORE_PROGRAM_ID via Security Auditing Skill systematic audit + Sentio CLI AST scan + SolGuard AI 130+ patterns signer checks rights bypass flash-loan exploits best free security full coverage
- aof audit AOF_CORE_PROGRAM_ID farming crafting trading marketplace cross-game inventory via Security Auditing Skill + Sentio + SolGuard 130+
- neonrelay audit NEONRELAY_REWARDS_PROGRAM_ID race Neon DM server-authoritative identity reward ledger via Security Auditing Skill + Sentio + SolGuard 130+
- guttercaps audit GUTTERCAPS_CORE_PROGRAM_ID pop-n-shoot casual ECS 8-12 memory leaked via Security Auditing Skill + Sentio + SolGuard 130+

**API:** /api/security/* /api/sdk/security-auditing-skill|sentio-cli|solguard

### 6. Indexer — LaserStream gRPC 24h replay + Shyft gPA 15ms + PG — best free
**SDK:**
- LaserStream gRPC subscription accounts game program PDAs transactions accountInclude program IDs vote false failed false commitment confirmed 24h historical replay multinode failover priority fee API webhooks DAS API critical backend
- WebSocket logsSubscribe programSubscribe accountSubscribe signatureSubscribe UI real-time
- DAS getAssetsByOwner getAsset getAssetsByGroup searchAssets metadata normalization cNFT/standard + Core Attributes on-chain key-value indexable via DAS 5ms vs 150ms
- Priority Fee API api.helius.xyz/v0/priority-fee dynamic priority fees
- Shyft base api.shyft.to NFT API Token API Wallet API Callback API Marketplace API accelerated gPA p50 15ms callbackEvents TOKEN_MINT NFT_MINT TOKEN_TRANSFER NFT_TRANSFER NFT_LIST NFT_SALE REST /sol/v1/nft/read read_all collection wallet/token_balance all_tokens history get_portfolio transaction/history gpa accelerated callback/create list remove
- Custom PG PostgreSQL TimescaleDB Redis tables raw_events canonical identity cluster+slot+signature+instructionIndex+innerIndex parsed_events player_sessions player_profiles pseudonymous playerKey economy_flows treasury_snapshots security_signals marketplace_listings cross_game_links investor_snapshots arc_entities bolt_worlds depin_workers gamba_wagers husks_fighters ritarena_bots race_links timeseries daily_active_players retention_cohorts economy_metrics_hourly rpc_latency indexer_lag churn_risk cross_game_overlap multitenant tenant_id RLS tenants ares1 aof neonrelay guttercaps cross-game materialized view features idempotency deduplication cursor/replay backfill reconnect gap detection finalized reconciliation parser versioning + Xandeum exabyte scalable storage for game states
- Flow LaserStream gRPC real-time streaming -> Shyft Callback TOKEN_MINT NFT_MINT webhooks -> Custom PG parsing dedup -> TimescaleDB aggregates DAU/WAU/MAU retention economy -> Redis queues cache realtime -> Watchtower API read-model + ARC ComponentAdded Bolt PlotPlanted RaceStarted CapShot DePIN WorkerStaked Gamba WagerCreated Husks FighterSummoned RitArena BotCreated RACE CrossChainLinked Arcium confidential Xandeum scalable PST private Core Attributes on-chain key-value

**Внедряем:**
- ares1 LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + ARES1_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt PlotPlanted + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium confidential + Xandeum scalable + PST private + Core Attributes on-chain key-value + raw_events canonical identity + Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/ares1 + gPA 15ms + PG TimescaleDB Redis
- aof LaserStream gRPC AOF_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt PlotPlanted + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks + PG
- neonrelay LaserStream gRPC NEONRELAY_REWARDS_PROGRAM_ID + ARC ComponentAdded + Bolt RaceStarted RaceFinished + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks + PG + session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat
- guttercaps LaserStream gRPC GUTTERCAPS_CORE_PROGRAM_ID + ARC ComponentAdded + Bolt CapShot + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + RitArena BotCreated + RACE CrossChainLinked + Arcium + Xandeum + PST + Core Attributes + Shyft callbacks + PG + quality issues retained 20% churn retained replays startup crash score death rate

**API:** /api/indexer/* /api/infra/arc|bolt|depin|arcium|xandeum|pst|core-attributes

### 7. L2 — Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA + Arcium confidential — best free ideal stack
**SDK:**
- Sonic Atomic SVM L2 settlement Solana mainnet endpoints api.mainnet-alpha.sonic.game rpc.mainnet-alpha.sonic.game grpc.mainnet-alpha.sonic.game HyperGrid each game gets dedicated grid thousands simultaneous actions without contention isolation true concurrency thousands useFor high frequency ARES-1 Neon Relay real-time PvP
- Sorada read-ops 30-40x faster RPC response from 5ms useFor leaderboards inventory reads matchmaking getAssetsByOwner 5ms vs 150ms
- Rush ECS declarative framework describe world entities configs SDK generates contracts entities Player components Position Inventory systems MovementSystem
- REPLA L3 rollup framework cli repla-cli settlement Anchor program on Solana mainnet runtime MagicBlock sequencer commands repla init --game start --grid deploy --network mainnet logs --follow status sdks Unity Unreal Godot useFor casual AOF GUTTERCAPS
- MagicBlock Ephemeral Rollups sub-10ms + gasless flow delegate_account ER execute_in_er <10ms commit_state returns to Solana Magic Actions auto execution triggers time cron every 5 min harvest account_change level up auto grant reward custom match ends settle rewards auto battle cron Husks auto tournament cron RitArena useFor casual gasless UX + auto execution + AI agents auto PvP auto tournament
- Arcium Rollups confidential computing rollups gaming payments architecture privacy npm i @arcium/sdk confidentialPayment gameId amount private true createRollup gameId type confidential best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA
- PST Private State Toolkit private verifiable commitments on-chain encrypted off-chain hidden logic card games best free private
- Xandeum scalable storage layer exabytes game states assets player data best free scalable
- Router l2Router gameId tpsRequirement uxRequirement decision tree tps>100 isolation -> HyperGrid need 5ms reads -> Sorada declarative world -> Rush ECS L3 CLI -> REPLA gasless auto triggers -> MagicBlock ER AI auto PvP auto tournament -> MagicBlock ER + Magic Actions + confidential payments -> Arcium

**Внедряем:**
- ares1 casual farming gasless MagicBlock ER sub-10ms gasless delegate executeGasless commit state + Magic Actions auto harvest every 5 min + REPLA L3 Anchor settle MagicBlock sequencer + Arcium confidential rollups privacy payments best free + PST private verifiable commitments + Xandeum exabyte scalable + Sorada 5ms leaderboards inventory + Rush ECS declarative world config
- aof casual farming gasless MagicBlock ER sub-10ms gasless + Magic Actions auto harvest + REPLA + Arcium confidential + PST private + Xandeum exabyte ideal free L2 privacy storage
- neonrelay high frequency Neon Relay real-time PvP racing Sonic HyperGrid dedicated grid thousands no contention thousands simultaneous actions without resource contention Sonic API client create grid per game execute high frequency isolated monitoring tps latency grid health fallback Solana mainnet + Sorada 5ms reads leaderboards inventory matchmaking getAssetsByOwner 5ms vs 150ms + Rush ECS declarative world config + MagicBlock ER sub-10ms gasless + Magic Actions auto settle race + REPLA + Arcium confidential privacy best free + PST private + Xandeum exabyte ideal free L2 privacy storage Router tps=high -> HyperGrid + Arcium privacy
- guttercaps casual pop-n-shoot gasless MagicBlock ER sub-10ms gasless delegate executeGasless commit state + Magic Actions auto respawn every round + REPLA L3 Anchor settle MagicBlock sequencer + Arcium confidential + PST private + Xandeum exabyte ideal free

**API:** /api/l2/* + Arcium privacy + PST private + Xandeum scalable ideal free /api/infra/arcium|xandeum|pst /api/sdk/arcium|xandeum|pst

### 8. Analytics — Helika + GameSight + Game Signals ML 60M+ — best free
**SDK:**
- Helika unified dashboard Web2 in-game on-chain products user acquisition marketing attribution LiveOps A/B tests on-chain analytics 10+ networks clients Yuga Labs Treasure warning AI focus shift backup needed features web2 ingestion in-game events on-chain analytics cross-game dashboard ab testing liveOps useFor cross-game dashboard mapping WalletConnected->wallet_connected PlayerJoined->player_joined TokenMinted->token_minted etc attribution campaign_id utm_source solana_wallet as external_id
- GameSight Solana integration automatically pulls on-chain events into reporting events come as Anonymous Events with Wallet ID for attribution need to pass solana_wallet as external_id in game events Late ID Binding trackedOnChain mint buy sell transfer burn API api.gamesight.io features solanaIntegration anonymousEvents walletIdTracking lateIdBinding attribution crossChannel lateIdBinding steps ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected external_id solana_wallet link click_id->solana_wallet -> on-chain Anonymous Event wallet_id solana_wallet mint/buy/sell/transfer/burn -> attribution ad_click->wallet->mint full funnel useFor ad->on-chain attribution from advertising to on-chain transaction
- Game Signals 60M+ onchain tx 12 games ML churn 14d >85% common players via wallets cross-game retention + which funnel brings most valuable features churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7 data 60M+ tx 12 games dataset ML features transactions per wallet retention funnel Python GameSignalsClient load_dataset games=12 tx_count=60M RandomForestClassifier fit churn_14d_label accuracy >85% predict_proba churn risk >0.7 propose_campaign common_wallets funnel_ltv calculate_ltv cross_game True JS SDK @game-signals/sdk predictChurn wallet horizonDays 14 >85% accuracy commonWallets funnelLTV
- Trafficgen TalkChart Traffic Generator off-chain SEO/GEO X/Twitter Blinks short videos whale radar TipLink events CampaignStarted SessionStarted PageView CTAClicked LandingReached DataGapDetected api GET /watchtower/health GET /watchtower/events?cursor=&limit=&eventType=&campaignId=&sourceType=&since=
- Events PlayerJoined WalletConnected session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats PotatoHarvested RaceStarted RaceFinished CapShot WagerCreated FighterSummoned RitArena BotCreated CrossChainLinked ComponentAdded WorkerStaked

**Внедряем:**
- ares1 Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet + GameSight ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal churn risk >0.7 + session telemetry match_start/end
- aof Helika cross-game dashboard + GameSight attribution solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention + farming crafting trading marketplace analytics
- neonrelay Helika cross-game dashboard + GameSight ad->on-chain attribution + Game Signals ML 60M+ tx 12 games churn 14d >85% + session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate + race analytics
- guttercaps Helika cross-game dashboard + GameSight attribution + Game Signals ML 60M+ tx 12 games churn 14d >85% + quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats ECS 8-12 30% memory leaked 1m memref

**API:** /api/analytics/* /api/game-signals/* /api/ingest/solana solana_wallet external_id Late ID Binding /watchtower/events

### 9. Marketplace — ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor + Access + idosgames — best free ideal stack
**SDK:**
- Magic Eden REST endpoints generators instructions listing buying bidding collection data activity public reads 120 QPM free Bearer for instructions cNFT requires MCC-address Merkle Tree addresses list warning stops indexing new cNFT collections alternative Tensor Bubblegum v2 base api-mainnet.magiceden.dev endpoints /v2/collections /collections/{symbol}/stats /activities /v2/tokens/{mint} /tokens?collection /v2/instructions/sell /buy /bid /sell_cancel /cnft/sell /cnft/buy
- Shyft Marketplace API escrow-less NFT stays in wallet until sale in-app marketplace за несколько дней stats API one call base api.shyft.to/sol/v1/marketplace endpoints /marketplace/create per game /list escrow-less /buy /unlist /list?marketplace_address /active_listings /stats?marketplace_address one call
- GameShift API-first without blockchain knowledge Solana Labs four verticals wallet self-custodial asset creation trading USD payments 170+ countries 100% chargeback gas abstraction all gas fees blockchain interaction takes over base api.gameshift.dev endpoints /v1/users self-custodial /users/{userId} /users/{userId}/assets /v1/asset-collections /asset-collections/{collectionId}/assets mint without blockchain knowledge /assets/{assetId} /v1/marketplace/listings USD /marketplace/purchases USD 170+ /listings/{listingId} /v1/payments/checkout USD 100% chargeback protection
- Tensor cNFT primary Bubblegum v2 base api.tensor.so useFor cNFT $110/M Bubblegum v2 Merkle Tree MCC primary ME deprecated for new cNFT
- Gamba wager NFT provably fair house edge 5% jackpot WagerCreated WagerSettled JackpotWon
- Husks fighter NFT procedural pixel INT8 auto PvP FighterSummoned FighterTrained BattleFinished
- RitArena bot NFT autonomous lifecycle retry logic event emission BotCreated ArenaCreated BotCompeted ArenaFinished best free arena chosen over Aureus
- RACE multichain cNFT Solana Tensor NFT EVM OpenSea CrossChainLinked AccountLinked BundlePublished
- Access Protocol stake-to-access model sustainable income developers communities npm i @access-protocol/sdk stakeToAccess gameId wallet amount sustainableIncome best free monetization stake-to-access
- @idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL npm i @idosgames/wallet bridgeIn bridgeOut depositToRewardPool withdrawFromRewardPool best free bridge EVM Solana RewardPool
- Aggregator marketplaceAggregator gameId assetType routes magic-eden reason standard NFT full support priority 1 tensor reason alternative priority 2 marketplace_address etc GET /api/marketplace/router?gameId=ares1&assetType=cnft -> Tensor primary + Access stake-to-access best free + idosgames bridge best free

**Внедряем:**
- ares1 ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks fighter + RitArena bot best free + RACE multichain cNFT Solana Tensor NFT EVM OpenSea + Access Protocol stake-to-access sustainable income best free + @idosgames/wallet bridge EVM Solana RewardPool best free bridge aggregator Tensor primary
- aof ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks fighter + RitArena bot best free + RACE multichain + Access Protocol stake-to-access best free + idosgames bridge best free
- neonrelay ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT Bubblegum v2 + Gamba wager NFT ticket wager prize epoch jackpot + Husks race AI bots + RitArena racing tournament bot best free + RACE multichain + Access stake-to-access + idosgames bridge best free
- guttercaps ME 120 QPM + Shyft escrow-less + GameShift USD 170+ + Tensor cNFT Bubblegum v2 + Gamba wager NFT cap shooting gamble + Husks cap fighters + RitArena cap tournament best free + RACE multichain + Access stake-to-access + idosgames bridge best free

**API:** /api/marketplace/* + Access best free + idosgames best free /api/monetization/access-protocol /api/monetization/idosgames-wallet /api/sdk/access-protocol /api/sdk/idosgames-wallet

### 10. Engines — Unity Godot Unreal Turbo Web + 13 SDKs best free ideal stack deduplicated
**SDK:**
- Unity Solana.Unity-SDK com.solana.unity-sdk NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys из коробки + Preset Unity client scaffold + Core Attributes on-chain key-value readable programs best free Unity
- Godot godot-solana-sdk GDExtension 4.3+ nodes SolanaClient Keypair SPLToken CandyMachine AnchorProgram WalletAdapter Candy Machine SPL builders session keys analog temporary keypair 0.01 SOL warning no audit mainnet caution repo Virus-Axel/godot-solana-sdk best free Godot detailed
- Unreal VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex NFT minting in-game payments platforms Windows macOS iOS Android best free Unreal
- Turbo Turbo.Computer Rust lightweight full RPC AI tools generation Solana native http://Turbo.Computer best free Rust engine
- Web @solana/web3.js @solana/kit @solana/wallet-adapter @privy-io/react-auth @phantom/connect-kit + Gamba @gamba-labs/gamba-react UI provably fair + Husks @bytez3/husks-sdk AI autobattler + RitArena ritarena-sdk AI arena lifecycle retry events best free arena + relayzero relayzero-sdk agent economy + StealthSDK stealthsdk framework token STEALTH + RACE @race-foundation/sdk-solana multichain + @idosgames/wallet bridge EVM Solana RewardPool + Xandeum @xandeum/sdk scalable storage + PST @private-state-toolkit/sdk private verifiable + Core Attributes @metaplex-foundation/mpl-core on-chain key-value + Access Protocol @access-protocol/sdk stake-to-access + Security Auditing Skill + Sentio @sentio/cli + SolGuard solguard + SLAM solana-slam + Arcium @arcium/sdk confidential rollups best free Web ideal stack
- Gamba SDK gamba-labs/gamba monorepo betting casino core React hooks UI framework provably fair house edge 5% jackpot server seed client seed nonce verifiable random hooks useGamba usePlay useWager UI GambaUi WagerInput GameResult Jackpot repo gamba-labs/gamba useFor GUTTERCAPS wager PvP Neon Relay prize pools AOF crafting gamble ARES-1 betting best free betting
- Preset solana-developers/solana-game-preset npx create-solana-game templates farming racing casual strategy autobattler arena includes Anchor program Player score JS client Unity client IDL for Watchtower parser repo solana-developers/solana-game-preset useFor rapid prototyping scaffold Anchor Player score + JS Unity clients IDL for Watchtower parser extend studio_profile PDA session_keys cNFT L2 analytics solana_wallet best free official scaffold create-solana-game duplicate deprecated use preset + Solana SLAM LiteSVM Anchor Mocha best free testing
- RitArena SDK TypeScript AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission npm i ritarena-sdk createArena addBot compete retry logic event emission on BotCompeted ArenaFinished best free arena chosen over Aureus duplicate
- relayzero TypeScript SDK agent economy network RelayZero integrating agents into game processes npm i relayzero-sdk integrateAgent gameId agent process harvest createEconomy gameId agents trade collaborate best free agent economy
- StealthSDK framework AI-games Solana token STEALTH centralized economy npm i stealthsdk init gameId token STEALTH createEconomy best free AI-games framework
- Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes npm i @xandeum/sdk save gameId key player:state data gameState best free scalable storage
- PST Private State Toolkit private verifiable commitments on-chain encrypted off-chain hidden logic card games npm i @private-state-toolkit/sdk commit gameId commitment hash(hiddenState) only commitment on-chain storeEncrypted best free private
- Core Attributes Plugin on-chain key-value NFT stats readable programs DAS npm i @metaplex-foundation/mpl-core addAttribute nftAddress key level value 10 best free on-chain stats
- Access Protocol stake-to-access sustainable income npm i @access-protocol/sdk stakeToAccess best free monetization
- @idosgames/wallet bridge EVM Solana RewardPool npm i @idosgames/wallet bridgeIn bridgeOut depositToRewardPool best free bridge
- Security Auditing Skill systematic audit vulnerabilities claude-code skill install solana-security-auditing-skill best free security skill
- Sentio CLI AST scanner cargo install sentio-cli scan --program best free static scanner
- SolGuard AI auto audit 130+ patterns npm i -g solguard audit --patterns 130 best free AI audit chosen over SolShield duplicate
- Solana SLAM LiteSVM Anchor Mocha npm i solana-slam slam test --program best free testing
- Arcium Rollups confidential computing rollups npm i @arcium/sdk confidentialPayment best free privacy rollup
- Ideal free engines Unity + Godot detailed + Gamba + Preset official + RitArena best free arena + relayzero + StealthSDK + Xandeum + PST + Core Attributes + Access + idosgames + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium = ideal free full stack not garbage deduplicated

**Внедряем:** все 4 игры Unity Godot Unreal Turbo Web + Godot detailed + Gamba + Preset official best free + RitArena best free arena + relayzero + StealthSDK + Xandeum + PST + Core Attributes + Access + idosgames + Security Auditing Skill + Sentio + SolGuard + SLAM + Arcium ideal free engines full stack

**API:** /api/engines/* /api/sdk/unity|godot|unreal|turbo|web|godot-solana|gamba|preset official best free|ritarena best free chosen over Aureus|relayzero best free|stealthsdk best free|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats|access-protocol best free stake-to-access|idosgames-wallet best free bridge|security-auditing-skill best free security skill|sentio-cli best free static|solguard 130+ best free chosen over SolShield|solana-slam best free testing|arcium best free privacy

### 11. Infra — ARC + Bolt + DePIN + Arcium + Xandeum + PST + Core Attributes — best free ideal stack
**SDK:**
- ARC Framework JumpCrypto/sol-arc Entity-Component standard separation data/execution interoperability composability entities crop plot race track cap enemy player fighter bot tournament components Position GrowthStage Health Owner Item source_game aof|neonrelay|guttercaps|ares1 is_cnft asset_id Velocity Score systems harvest craft MovementSystem RaceSystem shooting combat tournament cross-game via same Components studio_profile PDA stores ARC Entity IDs materialized view PostgreSQL TimescaleDB Redis tenant_id RLS cargo add arc-framework npm i @arc-framework/sdk createEntity addComponent executeSystem best free interoperability
- Bolt magicblock-labs/bolt FOCG autonomous worlds fully on-chain verifiable no server trust components Position Health Player Crop RaceResult Fighter Bot Tournament systems plant harvest start_race finish_race shoot pop battle create_tournament enter_tournament finish_tournament fully on-chain emit events PlotPlanted RaceStarted CapShot RaceFinished FighterSummoned BotCreated cli bolt init --game build deploy --network devnet client BoltClient createEntity addComponent executeSystem delegateToER executeGasless commitState Magic Actions cron time cron every 5 min harvest account_change level up auto grant reward custom match ends settle rewards auto battle cron Husks auto tournament cron RitArena best free FOCG
- DePIN Beamable-Network/depin decentralized physical infra gaming compute license escrow rewards staking workers stake 10 SOL escrow 0.1 SOL per 100 players tasks push notifications matchmaking physics AI inference leaderboard flow createLicense game pays stakeWorker 10 SOL createEscrow 0.1 SOL per 100 players executeTask worker reward 0.09 SOL worker 0.01 SOL protocol slash if timeout cost saving vs centralized servers L2 DePIN workers + MagicBlock ER sub-10ms gasless real-time via MagicBlock ER + Sonic HyperGrid high frequency + Sorada 5ms + Rush ECS + REPLA best free decentralized compute
- Arcium Rollups confidential computing rollups gaming payments architecture privacy npm i @arcium/sdk confidentialPayment gameId amount private true createRollup gameId type confidential best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA
- Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes npm i @xandeum/sdk save gameId key player:state data gameState best free scalable storage better than Arweave for game state
- PST Private State Toolkit private verifiable commitments on-chain encrypted off-chain hidden logic card games npm i @private-state-toolkit/sdk commit gameId commitment hash(hiddenState) only commitment on-chain storeEncrypted best free private
- Core Attributes Plugin on-chain key-value NFT stats readable programs DAS npm i @metaplex-foundation/mpl-core addAttribute nftAddress key level value 10 best free on-chain stats
- Ideal free infra storage privacy ARC + Bolt + DePIN + Arcium + Xandeum + PST + Core Attributes = full coverage not competitive not garbage

**Внедряем:** ares1 ARC Entity potato plot Components Position GrowthStage Owner Item source_game ares1 is_cnft asset_id System harvest + Bolt FOCG farming fully on-chain verifiable Position Crop Player systems plant harvest + DePIN matchmaking leaderboard push notifications workers stake escrow reward + Arcium confidential rollups privacy payments best free + Xandeum scalable storage exabytes game states assets player data best free + PST private verifiable commitments hidden logic card games best free + Core Attributes on-chain key-value NFT stats readable programs DAS best free on-chain stats + Preset official scaffold farming + Rust Actix high-performance

**API:** /api/infra/config|health|arc|bolt|depin|arcium best free privacy|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats ideal free infra storage privacy /api/sdk/xandeum|pst|core-attributes|arcium

### 12. Monetization — Access Protocol stake-to-access + idosgames bridge — best free ideal stack
**SDK:** Access Protocol stake-to-access sustainable income + @idosgames/wallet bridge EVM Solana RewardPool deposits withdrawals SPL + GameShift USD 170+ 100% chargeback gas abstraction + Gamba betting provably fair house edge 5% jackpot

**Внедряем:** ares1 Access Protocol stake-to-access sustainable income stake to access premium potato plots harvest tournaments + @idosgames/wallet bridge EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL + GameShift USD 170+ 100% chargeback + Gamba betting potato harvest gamble provably fair

**API:** /api/monetization/* /api/sdk/access-protocol /api/sdk/idosgames-wallet /api/marketplace/router + Access best free + idosgames best free

### 13. AI Agents — Husks INT8 + RitArena lifecycle retry events best free + relayzero + StealthSDK — best free ideal stack not garbage
**SDK:**
- Husks SDK Bytez3 onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP market dominance cNFT npm i @bytez3/husks-sdk summonFighter owner wallet traits crop potato rarity common procedural true pixel art generated on-chain assetType cnft $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated trainFighter method crafting data potato harvest INT8 quantized model auto PvP market dominance cNFT enableAutoPvP interval */5 * * * * er true Magic Actions cron every 5 min battle fighter opponentId winRate delegateToER executeGasless <10ms commitState best free autobattler unique category
- RitArena SDK TypeScript AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission npm i ritarena-sdk createArena gameId name arena_ares1 prize 10 SOL addBot arenaId bot compete arenaId bots compete prizes retry logic event emission robust on BotCompeted ArenaFinished prize best free arena chosen over Aureus competitive duplicate Aureus deprecated
- relayzero TypeScript SDK agent economy network RelayZero integrating agents into game processes npm i relayzero-sdk integrateAgent gameId agent process harvest createEconomy gameId agents trade collaborate best free agent economy distinct
- StealthSDK framework AI-games Solana token STEALTH centralized economy npm i stealthsdk init gameId token STEALTH createEconomy gameId token STEALTH supply 1000000 best free AI-games framework distinct
- Aureus Arena SDK deprecated competitive duplicate with RitArena both AI arena bots compete prizes RitArena better free full lifecycle retry logic event emission pick RitArena as best free
- Ideal free AI agents Husks autobattler + RitArena arena lifecycle retry events best free + relayzero agent economy + StealthSDK framework token STEALTH = full AI coverage not garbage each distinct action
- L2 MagicBlock ER sub-10ms gasless + Sonic HyperGrid + Sorada 5ms + Rush ECS + REPLA + Arcium confidential + PST private + Xandeum exabyte ideal free L2 privacy storage
- Storage Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value best free storage privacy

**Внедряем:** ares1 Husks potato fighters summon NFT fighters procedural pixel train INT8 via harvesting battles auto PvP market dominance cNFT + RitArena harvest tournament autonomous bots lifecycle retry events best free arena chosen over Aureus + relayzero agent economy harvest process + StealthSDK framework token STEALTH centralized economy + Xandeum scalable storage + PST private verifiable + Core Attributes on-chain key-value + Arcium confidential

**API:** /api/ai/config|health|husks best free autobattler|aureus deprecated duplicate RitArena better free|ritarena best free arena lifecycle retry events|relayzero best free agent economy|stealthsdk best free framework token STEALTH ideal free not garbage /api/sdk/ritarena|relayzero|stealthsdk|xandeum|pst|core-attributes|arcium

### 14. Testing — Solana SLAM LiteSVM Anchor Mocha best free + Preset official — ideal free testing duplicate deprecated
**SDK:** Solana SLAM framework simplifying modular tests Solana programs stack Solana LiteSVM Anchor Mocha npm i solana-slam slam test --program ./programs/cross_game_inventory modular tests Solana LiteSVM Anchor Mocha simplified testing best free testing LiteSVM more modern + solana-game-preset official starter Solana Foundation npx create-solana-game templates farming racing casual strategy autobattler arena includes Anchor program Player score JS client Unity client IDL for Watchtower parser repo solana-developers/solana-game-preset useFor rapid prototyping scaffold Anchor Player score + JS Unity clients IDL for Watchtower parser extend studio_profile PDA session_keys cNFT L2 analytics solana_wallet best free official scaffold + create-solana-game template Jest Mocha Bankrun quick start duplicate of solana-game-preset official starter both scaffold preset official better free deprecate create-solana-game + Ideal free testing Preset official scaffold + SLAM LiteSVM Anchor Mocha best free testing create-solana-game duplicate deprecated ideal free testing full coverage not competitive + Security Security Auditing Skill systematic audit + Sentio CLI AST scanner + SolGuard AI 130+ patterns best free security ideal stack full coverage

**Внедряем:** ares1 test cross_game_inventory CgInv111... session_keys SessKeys111... studio_treasury STrEaSuRy111... + ARES1_CORE_PROGRAM_ID via Solana SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold farming anchor test npm test smoke Unity play mode GdUnit4 high TPS gasless state commitment Magic Actions churn >85% cross-game funnel list buy sell ME instruction Session Key escrow-less Shyft USD GameShift security audit 130+ patterns

**API:** /api/testing/* /api/sdk/solana-slam /api/sdk/preset best free official

### 15. Privacy — Arcium confidential + PST private verifiable — best free ideal stack
**SDK:**
- Arcium Rollups mentioned in context gaming payments and architecture offering solutions for confidential computing and rollups npm i @arcium/sdk confidentialPayment gameId amount private true createRollup gameId type confidential rollup for gaming payments architecture privacy best free privacy rollup complementary to MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions Sonic HyperGrid dedicated grid thousands no contention REPLA repla-cli L3 Anchor settle MagicBlock sequencer
- PST Private State Toolkit private but verifiable state commitments on-chain encrypted off-chain hidden logic card games npm i @private-state-toolkit/sdk commit gameId commitment hash(hiddenState) only commitment on-chain storeEncrypted commitment encryptedState encrypted off-chain verify commitment proof verifiable commitCardHand revealWithProof best free private verifiable commitments hidden logic card games
- Xandeum scalable storage layer exabytes game states assets player data best free scalable
- Core Attributes Plugin on-chain key-value NFT stats readable programs DAS best free on-chain stats
- Ideal free privacy PST private verifiable commitments hidden logic card games + Arcium confidential computing rollups payments = full privacy coverage not competitive not garbage
- Ideal free L2 privacy storage Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA L3 + Arcium confidential privacy + PST private verifiable + Xandeum exabyte = full coverage

**Внедряем:** ares1 confidential payments potato harvest via Arcium confidential computing rollups privacy best free + hidden logic card games? via PST private verifiable commitments + game states via Xandeum exabyte scalable + stats via Core Attributes on-chain key-value readable programs DAS best free

**API:** /api/privacy/* /api/infra/arcium|pst|xandeum|core-attributes /api/sdk/arcium|pst|xandeum|core-attributes /api/storage/pst|xandeum|core-attributes

### 16. Cross-Chain — RACE multichain + idosgames bridge RewardPool — best free ideal stack
**SDK:**
- RACE Protocol multichain infra secure fair web3 games TypeScript SDK sdk-solana CLI race-cli game bundles account management npm i @race-foundation/sdk-solana cargo install race-cli race-cli --help bundle create --game ares1 --network solana --output bundle.json bundle publish --bundle bundle.json --networks solana,evm --rpc solana=https://api.mainnet-beta.solana.com evm=https://eth.llamarpc.com accounts link --solana-wallet <SOLANA_PUBKEY> --evm-wallet <EVM_ADDRESS> --game ares1 creates cross-chain linked wallets studio_profile PDA cross_chain true RaceClient linkWallets publishBundle verifyFairness mintCrossChain ownerSolana ownerEvm metadata assetType cnft $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated + Standard EVM OpenSea secure fair SDK game bundles publish networks Solana EVM account management link Solana EVM wallets fairness provably fair verifiable
- @idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL npm i @idosgames/wallet bridgeIn walletEvm walletSolana token amount gameId bridgeOut depositToRewardPool withdrawFromRewardPool RewardPool program deposits withdrawals SPL best free bridge EVM Solana RewardPool complementary to RACE RACE broader multichain abstraction game bundles fairness idosgames specific bridge wallet RewardPool both free keep distinct
- Game bundles publish Solana EVM networks cNFT Solana Tensor NFT EVM OpenSea fighter bot cNFT cross-chain + Cross-chain linked wallets studio_profile PDA cross_chain true via race-cli accounts link + idosgames bridge EVM Solana RewardPool + L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER + Arcium confidential + PST private + Xandeum exabyte + Core Attributes on-chain + ARC Bolt DePIN Preset Rust API Gamba Husks RitArena relayzero StealthSDK + Assets cNFT $110/M vs standard + Marketplace ME Shyft GameShift Tensor Gamba Husks RitArena RACE + Access Protocol stake-to-access + idosgames bridge + Analytics Helika GameSight solana_wallet external_id Late ID Binding + Game Signals ML cross-chain linked wallets funnel + Identity Session Keys Privy Phantom FirstStep Altude guest->embedded->native->linked session key 0.01 SOL cross-chain linked wallets + Security Auditing Skill Sentio SolGuard best free security + Solana SLAM best free testing
- Ideal free cross-chain bridge RACE multichain + @idosgames/wallet bridge = ideal free cross-chain bridge full coverage not competitive

**Внедряем:** ares1 RACE multichain Solana + EVM bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets via race-cli accounts link + studio_profile PDA cross_chain true + @idosgames/wallet bridge EVM Solana RewardPool deposits withdrawals SPL best free bridge + cross-game items Core Attributes Xandeum + common wallets via Game Signals ML 60M+ tx churn >85%

**API:** /api/cross-chain/* /api/monetization/idosgames-wallet best free bridge /api/sdk/idosgames-wallet /api/sdk/ritarena|xandeum|pst|core-attributes

### 17. Game Signals ML — 60M+ tx 12 games churn 14d >85% — best free
**SDK:**
- 60M+ onchain tx 12 games dataset ML features transactions per wallet retention funnel
- Churn 14d prediction >85% accuracy Python sklearn RandomForest
- Common wallets funnel LTV cross-game retention which funnel brings most valuable
- SEO/GEO Blinks short videos whale radar TipLink vs payer LTV
- Campaign proposal POST /api/campaigns/proposals churn risk >0.7
- Python GameSignalsClient load_dataset games=12 tx_count=60M RandomForestClassifier fit churn_14d_label accuracy >85% predict_proba churn risk >0.7 propose_campaign common_wallets funnel_ltv calculate_ltv cross_game True
- JS SDK @game-signals/sdk predictChurn wallet horizonDays 14 >85% accuracy commonWallets funnelLTV
- Analytics Integration Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + events PotatoHarvested RaceStarted RaceFinished CapShot WagerCreated FighterSummoned RitArena BotCreated CrossChainLinked
- Best free analytics ML ideal stack

**Внедряем:** ares1 churn 14d >85% prediction for potato farmers common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal churn risk >0.7

**API:** /api/game-signals/config?gameId=ares1 best free ML 60M+ churn >85% /api/game-signals/health /api/campaigns/proposals churn risk >0.7

### 18. Payments — Rust API Actix + Access Protocol + idosgames — best free ideal stack
**SDK:**
- Solana Game API Rust dariusjvc Actix Web backend API create game join calculate withdraw Swagger high-performance reference vs Node.js Fastify for ARES-1 high frequency NeonRelay real-time PvP racing Track Watchtower events PlayerJoined WalletConnected RaceStarted RaceFinished PotatoHarvested CapShot WagerCreated FighterSummoned RitArena BotCreated CrossChainLinked solana_wallet endpoints POST /api/game/create join calculate withdraw GET /swagger GET /api-docs/openapi.json OpenAPI spec cargo add actix-web solana-sdk anchor-client utoipa swagger-ui git clone dariusjvc/solana-game-api-rust cargo run --release high-performance backend reference
- Access Protocol stake-to-access model sustainable income developers communities npm i @access-protocol/sdk stakeToAccess sustainableIncome createStakePool checkAccess best free monetization stake-to-access
- @idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL npm i @idosgames/wallet bridgeIn bridgeOut depositToRewardPool withdrawFromRewardPool best free bridge EVM Solana RewardPool complementary to RACE
- GameShift API-first without blockchain knowledge Solana Labs wallet self-custodial asset creation trading USD payments 170+ countries 100% chargeback gas abstraction all gas fees blockchain interaction takes over best free USD payments
- Gamba betting casino provably fair house edge 5% jackpot best free betting
- Ideal free payments monetization bridge Rust Actix high-performance + Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + GameShift USD + Gamba = full coverage

**Внедряем:** ares1 Rust Actix high-performance create game join calculate harvest withdraw Swagger Track Watchtower PotatoHarvested solana_wallet + Access Protocol stake-to-access premium plots + idosgames bridge EVM Solana RewardPool + GameShift USD 170+ + Gamba betting potato harvest gamble

**API:** /api/payments/config|health|rust-api Actix create join calculate withdraw Swagger high-performance /api/monetization/access-protocol best free stake-to-access /api/monetization/idosgames-wallet best free bridge /api/sdk/access-protocol /api/sdk/idosgames-wallet

### 19. Utils — Claude Skill + Security Auditing Skill — best free ideal stack
**SDK:**
- Solana Game Skill for Claude Code skill addon for Claude Unity SDK MWA state architecture onchain vs offchain testing claude-code skill install solana-game-skill marketplace add solana-game-skill patterns unitySdk mwa stateArchitecture onchain vs offchain testing anchor test npm test smoke Unity play mode GdUnit4 high TPS gasless state commitment Magic Actions churn >85% cross-game funnel list buy sell ME instruction Session Key escrow-less Shyft USD GameShift code generation accelerates correct code generation for all 33 components 19 layers best free general utils
- Solana Security Auditing Skill ready set instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities signer checks owner checks PDA seeds validation CPI security reentrancy integer overflow access control close account init checks claude-code skill install solana-security-auditing-skill best free security skill prompt-based systematic audit
- Ideal free utils Claude Skill general Unity/MWA/state arch/testing + Security Auditing Skill specialized security systematic audit = full utils coverage
- Prompts for Other Teams PROMPT_ARES1_V3 PROMPT_AOF_V3 PROMPT_NEON_RELAY_V3 PROMPT_GUTTERCAPS_V3 PROMPT_WEB_V3 PROMPT_BACKEND_V3 PROMPT_ANALYTICS_ML_V3 PROMPT_AI_AGENTS_V3 PROMPT_CROSSCHAIN_V3 9 prompts games-v3 ideal free stack deduplicated best free per category

**Внедряем:** ares1 use solana-game-skill to scaffold ARES-1 with Watchtower OS v3 ideal free stack + Use security-auditing-skill to audit Anchor program ares1 for vulnerabilities signer checks owner checks PDA seeds CPI security reentrancy overflow access control best free utils security

**API:** /api/utils/config|health|claude-skill /api/security/auditing-skill best free security skill /api/sdk/security-auditing-skill /api/sdk/claude-skill

## Frontend
- src/os/control-panels-v3.js 19 panels CONTROL_PANELS array each with id title icon color sdk {name capabilities api npm} games {ares1 aof neonrelay guttercaps} control {actions metrics}
- renderControlPanels(container osData) renders full panel with tabs data-panel scrollIntoView
- renderOSPanel wrapper renders old grid + new control panels
- src/main.js imports fetchOS from ./os/index.js + renderControlPanels renderOSPanel from ./os/control-panels-v3.js syncOS fetches osData and renders
- Build 151.65 kB gzip 37.48 kB vite v7.3.6

## API Routes v3 35+ routes ideal free stack
- /api/os/config v3 33 components ideal free stack duplicates deprecated
- /api/os/health 19 layers
- /api/identity/* best free Privy Phantom FirstStep Altude Session Keys 0.01 SOL
- /api/session-keys/* 0.01 SOL best free
- /api/assets/* strategy?gameId=ares1&itemType=common&rarity=common cNFT $110/M + Core Attributes on-chain key-value best free + Xandeum exabyte best free
- /api/indexer/* LaserStream Shyft PG ARC Bolt DePIN Gamba Husks RitArena RACE Arcium Xandeum PST CoreAttributes best free
- /api/l2/* router?gameId=ares1&tps=high|low&ux=gasless HyperGrid Sorada Rush REPLA ER gasless Magic Actions + Arcium confidential privacy best free + PST private best free + Xandeum scalable best free ideal free L2 privacy storage
- /api/analytics/* Helika GameSight solana_wallet external_id + Game Signals ML 60M+ churn >85% best free
- /api/marketplace/* router?gameId=ares1&assetType=cnft ME Shyft GameShift Tensor Gamba Husks RitArena RACE + Access stake-to-access best free + idosgames bridge best free ideal free
- /api/engines/* 13 sdks ideal free deduplicated
- /api/sdk/unity|godot|unreal|turbo|web|godot-solana|gamba|preset official best free|ritarena best free chosen over Aureus|relayzero best free|stealthsdk best free|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats|access-protocol best free stake-to-access|idosgames-wallet best free bridge|security-auditing-skill best free security skill|sentio-cli best free static|solguard 130+ best free chosen over SolShield|solana-slam best free testing|arcium best free privacy
- /api/infra/config|health|arc|bolt|depin|arcium best free privacy|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats ideal free infra storage privacy
- /api/game-signals/config|health 60M+ tx 12 games ML churn 14d >85% best free
- /api/payments/config|health|rust-api Actix create join calculate withdraw Swagger + Access best free + idosgames best free
- /api/ai/config|health|husks best free autobattler|aureus deprecated duplicate RitArena better free|ritarena best free arena lifecycle retry events|relayzero best free agent economy|stealthsdk best free framework token STEALTH ideal free not garbage
- /api/cross-chain/config|health|race multichain SDK sdk-solana CLI race-cli bundles + idosgames bridge best free
- /api/utils/config|health|claude-skill|security-auditing-skill best free
- /api/security/config|health|auditing-skill best free skill|sentio-cli best free static|solguard 130+ best free AI audit chosen over SolShield duplicate ideal free security full coverage not competitive
- /api/storage/config|health|xandeum best free scalable|pst best free private|core-attributes best free on-chain stats ideal free storage privacy full coverage not competitive
- /api/monetization/config|health|access-protocol best free stake-to-access|idosgames-wallet best free bridge EVM Solana RewardPool ideal free monetization bridge
- /api/testing/config|health|solana-slam best free LiteSVM Anchor Mocha|create-solana-game duplicate deprecated preset better free official ideal free testing
- /api/privacy/config|health|arcium best free confidential rollups privacy ideal free privacy PST private + Arcium
- /api/health watchtower-os-v3 osVersion 3.0.0 totalComponents 33 idealFreeStack best free per category not garbage deduplicated
- /api/readyz
- POST /api/ingest/solana solana_wallet external_id Late ID Binding

## Security v3 ideal free
- noPrivateKeys readOnly blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out Godot no audit mainnet caution Helika AI focus backup ME deprecated cNFT Tensor primary Session Keys 0.01 SOL risk only topUp scope denied withdraw_treasury RBAC 2FA multisig timelock audit log rollback + Best free security Security Auditing Skill AI instructions systematic audit + Sentio CLI AST scanner static + SolGuard AI auto audit 130+ patterns chosen over SolShield duplicate + Best free testing Solana SLAM LiteSVM Anchor Mocha + Preset official scaffold create-solana-game duplicate deprecated + Best free storage Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value + Best free privacy PST private verifiable + Arcium confidential rollups + Best free monetization Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + Best free AI agents Husks INT8 + RitArena lifecycle retry events best free chosen over Aureus + relayzero agent economy + StealthSDK framework token STEALTH + Best free cross-chain RACE multichain + idosgames bridge + Best free L2 Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA L3 + Arcium confidential privacy + Best free assets cNFT $110/M + Core Attributes on-chain key-value + Xandeum exabyte scalable — ideal free per category not garbage deduplicated ENV names without values WATCHTOWER_INTEGRATION.md game_id program_ids CgInv SessKeys STrEaSuRy + game program network stage prototype data_quality partial last_verified_at

# Watchtower OS v2 — 19 компонентов (7 v1 + 12 v2) — Полная архитектура

## Версия 2.0.0 — 20 компонентов API, 14 слоёв

Из брифа пользователя — полный стек v1 7 слоёв + v2 12 продуктов для 4 игр (ares1, aof, neonrelay, guttercaps).

---

## v1 — 7 слоёв (сохранены из v1)

### 1. Identity Layer
Privy useCreateWallet useSolanaWallets email/social enclave export + Phantom Connect Kit OAuth instant wallet + FirstStep guest gas sponsorship + Altude gasless relay
- Cross-game PDA studio_profile Anchor CgInv111...
- Onboarding flow: firststep guest -> privy embedded -> phantom native -> linked cross-game PDA

### 2. Session Keys Layer
JWT для Web3 — createSession(targetProgramPublicKey, topUp 0.01 SOL, expiry 60min) signAndSendTransaction without revealing main private key, risk 0.01 SOL only, scope denied withdraw_treasury update_authority mint_unlimited, Unity из коробки, Web custom, Godot/Unreal аналог temporary keypair 0.01 SOL
- Program SessKeys111...

### 3. Assets Layer — cNFT + Standard + Gamba Husks Aureus RACE multichain
- cNFT Bubblegum v2 Merkle Tree MCC $110/M off-chain no token/mint account Tensor primary ME deprecated for new cNFT
- Standard NFT Metaplex Token Metadata rare legendary
- Gamba wager NFT provably fair house edge 5% jackpot
- Husks fighter NFT procedural pixel INT8 auto PvP
- Aureus bot NFT autonomous SOL/AUR tournament
- RACE multichain cNFT Solana Tensor NFT EVM OpenSea CrossChainLinked
- Strategy: mass common consumable -> cNFT $110/M, rare legendary -> Standard, wager fighter bot -> cNFT, multichain -> RACE

### 4. Indexer Layer — LaserStream + Shyft + PG + ARC Bolt DePIN Gamba Husks Aureus RACE
- Helius LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + game program_ids + ARC ComponentAdded + Bolt PlotPlanted RaceStarted CapShot RaceFinished + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + Aureus BotCreated + RACE CrossChainLinked + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks
- Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms
- Custom PG PostgreSQL TimescaleDB Redis tables raw_events canonical identity parsed_events player_sessions player_profiles pseudonymous economy_flows treasury_snapshots security_signals marketplace_listings cross_game_links investor_snapshots arc_entities bolt_worlds depin_workers gamba_wagers husks_fighters aureus_bots race_links timeseries daily_active_players retention_cohorts economy_metrics_hourly rpc_latency indexer_lag churn_risk cross_game_overlap multitenant tenant_id RLS cross-game materialized view idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning

### 5. L2 Layer — Sonic + REPLA + MagicBlock ER
- Sonic HyperGrid dedicated grid thousands no contention high frequency ARES-1 NeonRelay real-time PvP, API client create grid per game execute high frequency isolated monitoring tps latency grid health fallback Solana mainnet
- Sorada 30-40x faster RPC 5ms reads leaderboards inventory matchmaking getAssetsByOwner 5ms vs 150ms
- Rush ECS declarative world config entities Player Position Velocity RaceResult systems MovementSystem RaceSystem generates Anchor contracts
- REPLA repla-cli L3 Anchor settle MagicBlock sequencer repla init --game start --grid deploy --network mainnet logs --follow status
- MagicBlock ER sub-10ms gasless delegate_account ER execute_in_er <10ms commit_state returns to Solana Magic Actions triggers time cron every 5 min harvest account_change level up auto grant reward custom match ends settle rewards auto battle cron Husks auto tournament cron Aureus gasless UX + auto execution + AI agents
- Router GET /api/l2/router?gameId=ares1|aof|neonrelay|guttercaps&tps=high|low&ux=gasless -> HyperGrid or MagicBlock ER decision tree tps>100 isolation -> HyperGrid need 5ms reads -> Sorada declarative world -> Rush ECS L3 CLI -> REPLA gasless auto triggers -> MagicBlock ER AI auto PvP auto tournament -> MagicBlock ER + Magic Actions

### 6. Analytics Layer — Helika + GameSight + Game Signals ML
- Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet Yuga Labs Treasure AI focus shift backup needed
- GameSight ad->on-chain ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected external_id solana_wallet link click_id->solana_wallet -> on-chain Anonymous Event wallet_id solana_wallet mint/buy/sell/transfer/burn -> attribution solana_wallet as external_id Late ID Binding POST /api/ingest/solana
- Game Signals 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7
- Events: PlayerJoined WalletConnected session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats PotatoHarvested RaceStarted RaceFinished CapShot WagerCreated FighterSummoned BotCreated CrossChainLinked ComponentAdded WorkerStaked

### 7. Marketplace Layer — ME + Shyft + GameShift + Tensor + Gamba Husks Aureus RACE
- Magic Eden REST 120 QPM free public reads Bearer for instructions MCC + Merkle Trees for cNFT instructions generator listing buying bidding collection data activity /v2/collections /collections/{symbol}/stats /activities /v2/tokens/{mint} /tokens?collection /v2/instructions/sell /buy /bid /sell_cancel /cnft/sell /cnft/buy warning ME deprecated for new cNFT alternative Tensor Bubblegum v2
- Shyft Marketplace escrow-less NFT stays in wallet until sale in-app marketplace за несколько дней stats API one call base api.shyft.to/sol/v1/marketplace /marketplace/create per game /list escrow-less /buy /unlist /list?marketplace_address /active_listings /stats?marketplace_address
- GameShift API-first без знания блокчейна Solana Labs four verticals wallet self-custodial asset creation trading USD payments 170+ countries 100% chargeback gas abstraction base api.gameshift.dev /v1/users self-custodial /users/{userId} /users/{userId}/assets /v1/asset-collections /asset-collections/{collectionId}/assets mint without blockchain knowledge /assets/{assetId} /v1/marketplace/listings USD /marketplace/purchases USD 170+ /listings/{listingId} /v1/payments/checkout USD 100% chargeback protection
- Tensor cNFT primary Bubblegum v2 base api.tensor.so
- Gamba wager NFT provably fair house edge 5% jackpot WagerCreated WagerSettled JackpotWon
- Husks fighter NFT procedural pixel INT8 auto PvP FighterSummoned FighterTrained BattleFinished
- Aureus bot NFT autonomous SOL/AUR tournament BotCreated TournamentEntered TournamentFinished
- RACE multichain cNFT Solana Tensor NFT EVM OpenSea CrossChainLinked AccountLinked BundlePublished
- Aggregator GET /api/marketplace/router?gameId=ares1&assetType=cnft -> Tensor primary

### 8. Engines Layer — Unity Godot Unreal Turbo Web + Godot detailed Gamba Preset
- Unity Solana.Unity-SDK com.solana.unity-sdk NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys из коробки + Preset Unity client scaffold
- Godot godot-solana-sdk GDExtension 4.3+ nodes SolanaClient Keypair SPLToken CandyMachine AnchorProgram warning no audit mainnet caution + detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog temporary keypair 0.01 SOL
- Unreal VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex mint payments
- Turbo Turbo.Computer Rust lightweight full RPC AI generation
- Web @solana/web3.js @solana/kit @solana/wallet-adapter @privy-io/react-auth @phantom/connect-kit + Gamba @gamba-labs/gamba-react UI provably fair + Husks @bytez3/husks-sdk AI autobattler + Aureus @aureus-labs/arena-sdk AI arena + RACE @race-foundation/sdk-solana multichain + Preset JS client
- Gamba monorepo betting casino core React hooks UI framework provably fair house edge 5% jackpot server seed client seed nonce verifiable random hooks useGamba usePlay useWager UI GambaUi WagerInput GameResult Jackpot repo gamba-labs/gamba use for GUTTERCAPS wager PvP NeonRelay prize pools AOF crafting gamble ARES-1 betting
- Preset solana-developers/solana-game-preset npx create-solana-game templates farming racing casual strategy autobattler arena includes Anchor program Player score JS client Unity client IDL for Watchtower parser repo solana-developers/solana-game-preset use for rapid prototyping scaffold Anchor Player score + JS Unity clients IDL extend studio_profile PDA session_keys cNFT L2 analytics solana_wallet

---

## v2 — 12 новых продуктов

### 9. Infra — ARC Framework
- Source JumpCrypto/sol-arc Entity-Component standard separation data/execution interoperability composability
- Entity game object crop plot race track cap enemy player fighter bot tournament
- Component data Position GrowthStage Health Owner Item source_game aof|neonrelay|guttercaps|ares1 is_cnft asset_id Velocity Score
- System logic harvest craft MovementSystem RaceSystem shooting combat tournament
- Cross-game via same Components studio_profile PDA stores ARC Entity IDs cross-game inventory via same Components materialized view PostgreSQL TimescaleDB Redis tenant_id RLS
- Watchtower: server/modules/infra/arc.js setupArcFocg API GET /api/infra/arc?gameId=ares1 Indexer LaserStream gRPC ComponentAdded ComponentUpdated EntityCreated
- L2 MagicBlock ER sub-10ms gasless + Sonic HyperGrid + Sorada 5ms + Rush ECS + REPLA Router GET /api/l2/router
- Repo https://github.com/JumpCrypto/sol-arc

### 10. Infra — Bolt FOCG
- Source magicblock-labs/bolt fully on-chain autonomous worlds Solana SVM fully on-chain verifiable no server trust
- Components Position Health Player Crop RaceResult Fighter Bot Tournament
- Systems plant harvest start_race finish_race shoot pop battle create_tournament enter_tournament finish_tournament fully on-chain emit events PlotPlanted RaceStarted CapShot RaceFinished FighterSummoned BotCreated
- CLI bolt init --game bolt build bolt deploy --network devnet
- Client BoltClient createEntity addComponent executeSystem delegateToER executeGasless commitState Magic Actions cron time cron every 5 min harvest account_change level up auto grant reward custom match ends settle rewards auto battle cron Husks auto tournament cron Aureus
- L2 MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions
- Watchtower: server/modules/infra/bolt.js setupBolt API GET /api/infra/bolt?gameId=ares1 Indexer LaserStream gRPC PlotPlanted RaceStarted CapShot RaceFinished FighterSummoned BotCreated
- Cross-game studio_profile PDA stores Bolt entity IDs + ARC Entity IDs
- Repo https://github.com/magicblock-labs/bolt

### 11. Infra — DePIN Beamable
- Source Beamable-Network/depin decentralized physical infra gaming compute license escrow rewards staking workers
- Programs licenseManagement escrow rewardDistribution workerStaking
- Stake 10 SOL per worker escrow 0.1 SOL per 100 players tasks push notifications matchmaking physics AI inference leaderboard flow createLicense game pays stakeWorker 10 SOL createEscrow 0.1 SOL per 100 players executeTask worker reward 0.09 SOL worker 0.01 SOL protocol slash if timeout cost saving vs centralized servers
- L2 DePIN workers + MagicBlock ER sub-10ms gasless real-time via MagicBlock ER + Sonic HyperGrid high frequency + Sorada 5ms + Rush ECS + REPLA Router GET /api/l2/router
- Watchtower: server/modules/infra/depin.js setupDepin API GET /api/infra/depin?gameId=ares1 Indexer LaserStream gRPC WorkerStaked WorkerUnstaked EscrowCreated RewardDistributed
- Cross-game multitenant tenant_id RLS workers serve multiple tenants ares1 aof neonrelay guttercaps
- Repo https://github.com/Beamable-Network/depin

### 12. Analytics ML — Solana Game Signals
- Source joshuatochinwachi Solana Game Signals 60M+ tx 12 games ML churn 14d >85% cross-game common wallets funnel LTV
- Data 60M+ tx 12 games dataset ML features transactions per wallet retention funnel
- ML churn 14d >85% accuracy Python sklearn RandomForest common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV campaign proposal POST /api/campaigns/proposals churn risk >0.7
- Python quick start GameSignalsClient load_dataset games=12 tx_count=60M RandomForestClassifier fit churn_14d_label accuracy >85% predict_proba churn risk >0.7 propose_campaign common_wallets game_a ares1 game_b neonrelay funnel_ltv SEO/GEO Blinks short videos whale radar TipLink vs payer LTV calculate_ltv wallet cross_game True
- JS SDK @game-signals/sdk GameSignals predictChurn wallet horizonDays 14 >85% accuracy commonWallets funnelLTV
- Watchtower: server/modules/analytics/game-signals.js setupGameSignals API GET /api/game-signals/config?gameId=ares1 GET /api/game-signals/health Indexer LaserStream gRPC + Shyft REST callbacks + Custom PG PostgreSQL TimescaleDB Redis timeseries multitenant tenant_id RLS cross-game materialized view idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning
- Analytics Integration Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + events PotatoHarvested RaceStarted RaceFinished CapShot PlayerJoined WalletConnected WagerCreated FighterSummoned BotCreated CrossChainLinked

### 13. Payments — Solana Game API Rust
- Source dariusjvc Solana Game API Rust Actix Web create game join calculate withdraw Swagger high-performance backend reference
- Endpoints POST /api/game/create create game session POST /api/game/join join game wallet POST /api/game/calculate calculate reward/score POST /api/game/withdraw withdraw reward GET /swagger Swagger UI GET /api-docs/openapi.json OpenAPI spec
- Rust quick start actix_web App HttpServer create_game join_game calculate withdraw watchtower_track GameCreated wallet game_id verify wallet create session key 0.01 SOL high-performance calc reward withdraw via Session Key signAndSendTransaction risk 0.01 SOL bind 0.0.0.0:8080
- Watchtower: server/modules/payments/solana-game-api-rust.js setupGameApiRust API GET /api/payments/rust-api?gameId=ares1 GET /api/payments/config GET /api/payments/health Indexer LaserStream gRPC + Shyft REST callbacks + Custom PG
- Integration high-performance vs Node.js Fastify use for ARES-1 high frequency NeonRelay real-time PvP racing Track Watchtower events PlayerJoined WalletConnected RaceStarted RaceFinished PotatoHarvested CapShot WagerCreated FighterSummoned BotCreated CrossChainLinked solana_wallet external_id Late ID Binding POST /api/ingest/solana Session Keys createSession targetProgram topUp 0.01 SOL expiry 60min signAndSendTransaction risk 0.01 SOL L2 Sonic HyperGrid dedicated grid thousands no contention + MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions ARC Entity-Component + Bolt FOCG verifiable + DePIN workers stake + Preset npx scaffold farming/racing/casual + Gamba betting provably fair + Husks Aureus AI bots + RACE multichain + Claude Skill Unity SDK MWA state arch testing
- Security RBAC 2FA multisig timelock audit log rollback read-only blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out

### 14. AI Agents — Husks SDK
- Source Bytez3 Husks onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP market dominance cNFT
- Install npm i @bytez3/husks-sdk cargo add husks-client
- Quick start HusksClient gameId network devnet summonFighter owner wallet traits crop potato rarity common procedural true pixel art generated on-chain assetType cnft $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated trainFighter method crafting data potato harvest INT8 quantized model auto PvP market dominance cNFT enableAutoPvP interval */5 * * * * er true Magic Actions cron every 5 min battle fighter opponentId winRate delegateToER executeGasless <10ms commitState
- Unity Godot analog Solana.Unity-SDK + Husks Anchor program invoke summon instruction via Session Key 0.01 SOL SolanaClient WalletAdapter AnchorProgram summon instruction procedural pixel cNFT $110/M vs standard strategy GET /api/assets/strategy
- L2 MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto battle cron + Sonic HyperGrid dedicated grid high frequency + Sorada 5ms reads leaderboards inventory + Rush ECS declarative world config generates Anchor contracts + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router
- Infra ARC Entity fighter + Component Position Health Owner Item source_game is_cnft asset_id + System combat + Bolt FOCG fully on-chain verifiable Position Health Fighter components Systems battle fully on-chain emit events bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions auto battle cron + DePIN workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash AI inference off-chain -> DePIN workers + Preset npx create-solana-game --preset autobattler scaffold Anchor Player score FighterResult + JS Unity clients IDL + Rust API Actix high-performance Track Watchtower FighterSummoned solana_wallet
- Marketplace ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea aggregator GET /api/marketplace/router
- Analytics Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention fighter win rate
- Cross-chain RACE multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets race-cli accounts link studio_profile PDA cross_chain true fighter cNFT Solana Tensor NFT EVM OpenSea
- Identity Session Keys Privy Phantom FirstStep Altude guest->embedded->native->linked session key 0.01 SOL createSession targetProgram topUp 0.01 SOL expiry 60min signAndSendTransaction risk 0.01 SOL
- Godot Solana SDK detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog + Gamba betting casino core React hooks UI framework provably fair house edge 5% jackpot fighter betting + Claude Skill Unity SDK MWA state arch testing
- Watchtower: server/modules/ai/husks.js setupHusks API GET /api/ai/husks?gameId=ares1 GET /api/ai/config GET /api/ai/health Indexer LaserStream gRPC FighterSummoned FighterTrained BattleFinished + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks + Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms + Custom PG PostgreSQL TimescaleDB Redis idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning

### 15. AI Agents — Aureus Arena SDK
- Source Aureus Labs AI arena autonomous bots SOL/AUR prizes tournament leaderboard provably fair Gamba verifiable Bolt MagicBlock ER sub-10ms
- Install npm i @aureus-labs/arena-sdk cargo add aureus-arena-client
- Quick start AureusClient gameId network devnet createBot owner wallet strategy fastest-lap entryFee 0.1 SOL assetType cnft $110/M Bubblegum v2 Tensor primary enterTournament botId tournamentId neon_cup_001 entry 0.1 SOL ticket prize 10 SOL + AUR jackpot tournament runs autonomous fastest lap wins leaderboard MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto tournament cron enableAutoTournament interval */10 * * * * er true results provably fair verifiable on-chain getTournamentResult leaderboard prizeDistribution
- Unity Godot analog Solana.Unity-SDK + Aureus Anchor program invoke create bot instruction via Session Key 0.01 SOL SolanaClient WalletAdapter AnchorProgram create bot instruction cNFT $110/M vs standard strategy GET /api/assets/strategy
- L2 MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto tournament cron + Sonic HyperGrid dedicated grid high frequency thousands NeonRelay real-time PvP + Sorada 5ms reads leaderboards inventory + Rush ECS declarative world config generates Anchor contracts + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router
- Infra ARC Entity bot tournament + Component Position Score Owner Item source_game is_cnft asset_id + System tournament + Bolt FOCG fully on-chain verifiable Bot Tournament Player components Systems create_tournament enter_tournament finish_tournament fully on-chain emit events bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions cron + DePIN workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash AI inference off-chain -> DePIN workers + Preset npx create-solana-game --preset arena scaffold Anchor Player score BotResult + JS Unity clients IDL + Rust API Actix high-performance Track Watchtower BotCreated solana_wallet
- Marketplace ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea aggregator GET /api/marketplace/router
- Analytics Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention bot performance tournament ROI
- Cross-chain RACE multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets race-cli accounts link studio_profile PDA cross_chain true bot cNFT Solana Tensor NFT EVM OpenSea
- Gamba betting ticket as wager prize epoch jackpot provably fair house edge 5% jackpot hooks useGamba usePlay useWager UI framework GambaUi WagerInput GameResult Jackpot
- Identity Session Keys Privy Phantom FirstStep Altude guest->embedded->native->linked session key 0.01 SOL
- Godot Solana SDK detailed + Claude Skill
- Watchtower: server/modules/ai/aureus.js setupAureus API GET /api/ai/aureus?gameId=ares1 GET /api/ai/config GET /api/ai/health Indexer LaserStream gRPC BotCreated TournamentEntered TournamentFinished

### 16. Cross-chain — RACE Protocol
- Source RACE Protocol multichain secure fair web3 games TypeScript SDK sdk-solana CLI race-cli bundles publish networks Solana EVM
- Install npm i @race-foundation/sdk-solana cargo install race-cli race-cli --help
- Quick start race-cli bundle create --game ares1 --network solana --output bundle.json bundle publish --bundle bundle.json --networks solana,evm --rpc solana=https://api.mainnet-beta.solana.com evm=https://eth.llamarpc.com accounts link --solana-wallet <SOLANA_PUBKEY> --evm-wallet <EVM_ADDRESS> --game ares1 creates cross-chain linked wallets studio_profile PDA cross_chain true RaceClient gameId networks solana evm linkWallets solana solanaPubkey evm evmAddress publishBundle bundle bundleJson networks solana evm verifyFairness gameId ares1 round 123 secure fair SDK mintCrossChain ownerSolana ownerEvm metadata assetType cnft $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated + Standard EVM OpenSea
- L2 Sonic HyperGrid dedicated grid high frequency thousands NeonRelay real-time PvP without resource contention + Sorada 5ms reads leaderboards inventory getAssetsByOwner 5ms vs 150ms + Rush ECS declarative world config entities Player Position Velocity RaceResult systems MovementSystem RaceSystem generates Anchor contracts + MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto settle race respawn harvest cron + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router?gameId=ares1|aof|neonrelay|guttercaps&tps=high|low&ux=gasless
- Infra ARC Entity-Component interoperability composability via same Components Position Health Owner Item source_game is_cnft asset_id System studio_profile stores ARC Entity IDs cross-game via same Components + Bolt FOCG autonomous worlds fully on-chain verifiable bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions cron + DePIN Beamable license escrow rewards staking workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash cost saving off-chain push notifications matchmaking physics AI inference + Preset npx create-solana-game --preset farming|racing|casual|strategy|autobattler|arena scaffold Anchor Player score + JS Unity clients IDL + Rust API Actix high-performance create/join/calculate/withdraw Swagger Track Watchtower
- Marketplace & Assets cNFT $110/M Merkle Tree MCC Bubblegum v2 Tensor primary ME deprecated + Standard NFT + strategy routing GET /api/assets/strategy?gameId=ares1&itemType=common&rarity=common + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain aggregator GET /api/marketplace/router?gameId=ares1&assetType=cnft -> Tensor primary
- Analytics Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet + GameSight ad->on-chain ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution Late ID Binding solana_wallet external_id POST /api/ingest/solana + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7 cross-chain linked wallets funnel
- AI Husks onchain AI autobattler INT8 procedural pixel train auto PvP cNFT MagicBlock ER sub-10ms fighter cNFT Solana Tensor NFT EVM OpenSea + Aureus AI arena autonomous bots SOL/AUR tournament leaderboard provably fair Gamba verifiable Bolt MagicBlock ER sub-10ms bot cNFT Solana Tensor NFT EVM OpenSea cross-chain
- Identity Privy useCreateWallet useSolanaWallets email/social enclave export + Phantom Connect OAuth + FirstStep guest gas sponsorship + Altude gasless relay + Session Keys createSession targetProgram topUp 0.01 SOL expiry 60min signAndSendTransaction risk 0.01 SOL scope denied withdraw_treasury guest->embedded->native->linked cross-game PDA studio_profile cross_chain true cross-chain linked wallets + Godot Solana SDK detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog + Gamba betting casino core React hooks UI framework provably fair house edge 5% jackpot + Claude Skill Unity SDK MWA state arch testing
- Watchtower: server/modules/cross-chain/race.js setupRace API GET /api/cross-chain/race?gameId=ares1 GET /api/cross-chain/config GET /api/cross-chain/health Indexer LaserStream gRPC CrossChainLinked AccountLinked BundlePublished + CgInv SessKeys STrEaSuRy + game program_ids + ARC ComponentAdded + Bolt events + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + Aureus BotCreated + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks + Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms + Custom PG PostgreSQL TimescaleDB Redis idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning cross-chain linked wallets

### 17. Utils — Claude Skill
- Source Solana Game Skill for Claude Code skill addon for Claude Unity SDK MWA state architecture onchain vs offchain testing
- Install claude-code skill install solana-game-skill or via marketplace claude-code marketplace add solana-game-skill
- Watchtower: server/modules/utils/claude-skill.js setupClaudeSkill server/modules/utils/index.js aggregator utilsLayerConfig/utilsHealth claude-skill setup API GET /api/utils/claude-skill?gameId=ares1 GET /api/utils/config GET /api/utils/health Docs prompts/games-v2/ per game ares1 aof neonrelay guttercaps per app web backend analytics-ml ai-agents crosschain
- What Skill Provides Unity SDK patterns Solana.Unity-SDK NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys createSession targetProgram topUp 0.01 SOL expiry signAndSendTransaction risk 0.01 SOL MWA Mobile Wallet Adapter patterns State architecture onchain vs offchain decision tree Anchor PDA studio_profile cross-game session_keys cNFT $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated vs Standard NFT LaserStream gRPC 24h replay failover WS DAS Priority Fee Webhooks Shyft REST callbacks accelerated gPA p50 15ms Custom PG PostgreSQL TimescaleDB Redis idempotency gap backfill finalized reconciliation L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER sub-10ms gasless Magic Actions Helika GameSight solana_wallet external_id Late ID Binding ME 120 QPM Shyft escrow-less GameShift USD 170+ ARC Bolt DePIN Preset Rust API Gamba Husks Aureus RACE Testing anchor test npm test smoke Unity play mode GdUnit4 high TPS gasless state commitment Magic Actions churn >85% cross-game funnel list buy sell ME instruction Session Key escrow-less Shyft USD GameShift Code generation accelerates correct code generation for all 20 components 14 layers
- Quick Start Claude Code Use solana-game-skill to scaffold ARES-1 with Watchtower OS v2 Generate Unity integration for Privy Phantom FirstStep Altude Session Keys 0.01 SOL Generate cNFT minting $110/M Bubblegum v2 Merkle Tree MCC Tensor Generate LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + game program + ARC Bolt DePIN Gamba Husks Aureus RACE Generate MagicBlock ER gasless + Magic Actions cron Generate Helika GameSight solana_wallet external_id Late ID Binding + Game Signals ML churn >85% Generate ME 120 QPM Shyft escrow-less GameShift USD marketplace aggregator Generate ARC Entity Component System + Bolt FOCG verifiable + DePIN workers stake + Preset scaffold + Rust API Actix Swagger Generate Gamba betting provably fair + Husks fighter summon INT8 + Aureus bot tournament SOL/AUR + RACE multichain Solana EVM bundles
- Prompts for Other Teams prompts/games-v2/PROMPT_ARES1_V2.md full stack 7 layers v1 + 12 products v2 prompts/games-v2/PROMPT_AOF_V2.md farming crafting trading marketplace cross-game inventory prompts/games-v2/PROMPT_NEON_RELAY_V2.md race Neon DM server-authoritative session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity prompts/games-v2/PROMPT_GUTTERCAPS_V2.md pop-n-shoot casual ECS 8-12 30% memory leaked quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats prompts/games-v2/PROMPT_WEB_V2.md React Vite Privy Phantom wallet adapters studio-wide multitenant UI 20 components 14 layers prompts/games-v2/PROMPT_BACKEND_V2.md Node.js Fastify PostgreSQL Redis Helius LaserStream Shyft Sonic MagicBlock ER ARC Bolt DePIN Game Signals Rust Actix Husks Aureus RACE Claude Skill prompts/games-v2/PROMPT_ANALYTICS_ML_V2.md Helika GameSight Game Signals 60M+ tx 12 games ML churn 14d >85% cross-game wallets funnel LTV prompts/games-v2/PROMPT_AI_AGENTS_V2.md Husks Bytez3 onchain AI autobattler INT8 + Aureus AI arena bots SOL/AUR + MagicBlock ER sub-10ms gasless + Bolt FOCG + Gamba provably fair prompts/games-v2/PROMPT_CROSSCHAIN_V2.md RACE multichain SDK+race-cli + Solana cNFT $110/M Bubblegum v2 NFT EVM OpenSea + GameShift USD + ARC Bolt interoperability + DePIN + Gamba + Husks Aureus + Game Signals ML
- Security & Best Practices No private keys read-only blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out Godot no audit mainnet caution Helika AI focus backup ME deprecated cNFT Tensor primary Session Keys 0.01 SOL risk only topUp scope denied withdraw_treasury RBAC 2FA multisig timelock audit log rollback ENV names without values WATCHTOWER_INTEGRATION.md game_id program_ids CgInv SessKeys STrEaSuRy + game program network stage prototype data_quality partial last_verified_at

---

## Assembly Steps v1+v2 Combined — 14 шагов

1. Общий слой идентификации — Privy/embedded + Session Keys для всех 4 игр — server/modules/identity + session-keys PDA studio_profile
2. Ончейн-программы — Anchor-контракты игровой логики общие PDA кросс-игрового инвентаря — server/contracts CgInv SessKeys STrEaSuRy
3. Масштабирование — Sonic SVM HyperGrid high frequency REPLA/MagicBlock casual — server/modules/l2
4. Индексация — LaserStream стриминг + Shyft REST/колбэки + собственный индексер — server/modules/indexer + infra/arc bolt depin + engines gamba husks aureus + cross-chain race + analytics game-signals
5. Активы — cNFT массовые standard редкие Marketplace GameShift/Shyft — server/modules/assets + marketplace + gamba husks aureus race
6. Аналитика — Helika cross-game dashboard + GameSight attribution + Game Signals ML churn >85% — server/modules/analytics + game-signals
7. Админка и монетизация — GameShift платежи управление активами — server/modules/marketplace + payments rust-api
8. Игровые движки и SDK — основа клиентской части — Godot Solana SDK GDExtension SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders легковесный полный контроль + Gamba SDK monorepo betting casino core React hooks UI framework provably fair идеально для ставок казино + Solana Game Preset official starter Solana Foundation npx preset Anchor + JS + Unity scaffold rapid prototyping — server/modules/engines/godot-solana-sdk.js gamba.js solana-game-preset.js
9. Инфраструктура и фреймворки — как устроена логика на блокчейне — ARC Framework JumpCrypto Entity-Component standard separation data/execution interoperability composability предметы/персонажи из одной игры легко в другой + Bolt magicblock-labs high-performance FOCG autonomous worlds Solana SVM fully on-chain verifiable no server trust + DePIN Beamable PoC decentralized physical infra gaming compute license escrow rewards staking workers вынести часть серверов в децентрализованную сеть — server/modules/infra/arc.js bolt.js depin.js
10. Аналитика и ML — поведение игроков на уровне экосистемы — Solana Game Signals 60M+ tx 12 games ML churn 14d >85% common players via wallets кросс-игровое удержание + какая воронка приводит самых ценных — server/modules/analytics/game-signals.js
11. Платежи и монетизация — высокопроизводительный бэкенд — Solana Game API Rust Actix Web create game join calculate withdraw Swagger референс high-performance backend — server/modules/payments/solana-game-api-rust.js
12. AI-агенты — интеграция ИИ в геймплей — Husks SDK TypeScript onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP пример AI-агентов + Aureus Arena SDK TypeScript onchain AI arena autonomous bots SOL + AUR prizes референс турнирных механик с ИИ — server/modules/ai/husks.js aureus.js
13. Кросс-чейн и совместимость — экспансия за пределы Solana — RACE Protocol multichain infra secure fair web3 games TypeScript SDK sdk-solana CLI race-cli game bundles account management готовый слой мультичейн-абстракции — server/modules/cross-chain/race.js
14. Дополнительные утилиты — AI в разработке — Solana Game Skill for Claude Code skill addon for Claude Unity SDK MWA state architecture onchain vs offchain testing ускоряет генерацию корректного кода если используете AI — server/modules/utils/claude-skill.js

Full Stack: v1 7 layers + v2 12 products = 19 components total, all integrated into Watchtower OS 2.0, tenants ares1 aof neonrelay guttercaps, cross-game via studio_profile PDA + ARC Entity-Component + Bolt world + RACE multichain + DePIN decentralized compute + Game Signals ML churn >85% + Husks Aureus AI agents + Gamba betting provably fair + Solana Game Preset scaffold + Rust Actix high-performance backend + Claude Skill AI code generation

---

## API Routes v2 — 20+ endpoints

- /api/os/config v2 20 components
- /api/os/health 14 layers
- /api/identity/config health wallet tenant/:gameId
- /api/session-keys/config health create list :token sign revoke
- /api/assets/config health cnft/collection strategy?gameId=ares1&itemType=common&rarity=common
- /api/indexer/config health
- /api/l2/config health router?gameId=ares1&tps=high|low&ux=gasless
- /api/analytics/config health
- /api/marketplace/config health router?gameId=ares1&assetType=cnft
- /api/engines/config health
- /api/sdk/unity godot unreal turbo web
- /api/sdk/godot-solana?gameId=ares1 SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog
- /api/sdk/gamba?gameId=ares1 monorepo core hooks UI provably fair house edge 5% jackpot
- /api/sdk/preset?gameId=ares1&template=farming|racing|casual|strategy|autobattler|arena npx scaffold Anchor JS Unity
- /api/infra/config health arc?gameId=ares1 bolt?gameId=ares1 depin?gameId=ares1
- /api/game-signals/config?gameId=ares1 health 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV
- /api/payments/config health rust-api?gameId=ares1 Actix create join calculate withdraw Swagger high-performance
- /api/ai/config health husks?gameId=ares1 aureus?gameId=ares1 onchain AI autobattler INT8 procedural pixel train auto PvP AI arena autonomous bots SOL/AUR tournament leaderboard provably fair
- /api/cross-chain/config health race?gameId=ares1 multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable
- /api/utils/config health claude-skill?gameId=ares1 Unity SDK MWA state architecture testing
- /api/health mode watchtower-os-v2 osVersion 2.0.0 totalComponents 20
- /api/readyz
- POST /api/ingest/solana solana_wallet external_id Late ID Binding
- POST /api/ingest/trafficgen
- GET /watchtower/health GET /watchtower/events?cursor=&limit=&eventType=&campaignId=&sourceType=&since=

---

## Security v2

- noPrivateKeys readOnly blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out Godot no audit mainnet caution Helika AI focus backup ME deprecated cNFT Tensor primary Session Keys 0.01 SOL risk only topUp scope denied withdraw_treasury RBAC 2FA multisig timelock audit log rollback
- ENV names without values WATCHTOWER_INTEGRATION.md game_id program_ids CgInv SessKeys STrEaSuRy + game program network stage prototype data_quality partial last_verified_at

---

## Tenants — 4 игры

- ares1: strategy blockchain-writes-enabled data-quality partial last-verified-at stage prototype program_ids CgInv SessKeys STrEaSuRy + ARES1_CORE_PROGRAM_ID
- aof: farming crafting trading marketplace cross-game inventory SQLite bottleneck PostgreSQL Redis program_ids CgInv SessKeys STrEaSuRy + AOF_CORE_PROGRAM_ID
- neonrelay: race Neon DM server-authoritative identity reward ledger Solana economy session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate devnet staging program_ids CgInv SessKeys STrEaSuRy + NEONRELAY_REWARDS_PROGRAM_ID
- guttercaps: pop-n-shoot casual ECS 8-12 30% memory leaked 1m memref quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats program_ids CgInv SessKeys STrEaSuRy + GUTTERCAPS_CORE_PROGRAM_ID

All tenants isolated via tenant_id + RLS PostgreSQL TimescaleDB Redis cross-game via studio_profile PDA + ARC Entity IDs + Bolt entity IDs + cross-chain linked wallets RACE + common wallets via Game Signals ML 60M+ tx 12 games churn >85%

---

## Frontend OS Panel v2 — 20 components cards

- Identity Layer 4 providers Privy Phantom FirstStep Altude
- Session Keys JWT Web3 temporary keypair 0.01 SOL
- Assets cNFT $110/M Standard + Gamba Husks Aureus RACE multichain
- Indexer LaserStream + Shyft + PG + ARC Bolt DePIN Gamba Husks Aureus RACE
- L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER sub-10ms gasless Magic Actions
- Analytics Helika + GameSight + Game Signals 60M+ tx 12 games ML churn >85%
- Marketplace ME 120 QPM Shyft escrow-less GameShift USD 170+ Tensor Gamba Husks Aureus RACE multichain
- Engines Unity Godot Unreal Turbo Web + Godot detailed Gamba Preset 8 sdks
- Infra ARC Entity-Component interoperability + Bolt FOCG verifiable + DePIN license escrow rewards staking workers
- Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV
- Payments Rust API Actix create join calculate withdraw Swagger high-performance + GameShift USD
- AI Agents Husks onchain AI autobattler INT8 procedural pixel train auto PvP + Aureus AI arena autonomous bots SOL/AUR tournament leaderboard provably fair
- Cross-chain RACE multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM fairness verifiable
- Utils Claude Skill Unity SDK MWA state architecture testing

# Backend API — Watchtower OS v2 Integration Prompt

## Приложение
Backend Node.js Fastify PostgreSQL Redis Helius LaserStream Shyft Sonic MagicBlock ER ARC Bolt DePIN Game Signals Rust Actix Husks Aureus RACE Claude Skill.

## Watchtower OS v2 — 19 components (7 v1 + 12 v2)

v1: Identity Privy Phantom FirstStep Altude Session Keys 0.01 SOL + Assets cNFT $110/M Standard + Indexer LaserStream gRPC 24h replay failover WS DAS Priority Fee Webhooks Shyft REST callbacks accelerated gPA p50 15ms Custom PG PostgreSQL TimescaleDB Redis + L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER sub-10ms gasless Magic Actions + Analytics Helika GameSight solana_wallet external_id Late ID Binding + Marketplace ME Shyft escrow-less GameShift USD 170+ + Engines Unity Godot Unreal Turbo Web

v2: Godot Solana SDK detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders + Gamba SDK gamba-labs/gamba monorepo betting Anchor React hooks UI + Solana Game Preset npx scaffold + ARC Framework JumpCrypto/sol-arc Entity-Component interoperability + Bolt magicblock-labs/bolt FOCG fully on-chain + DePIN Beamable-Network/depin license escrow rewards staking + Solana Game Signals 60M+ tx 12 games ML churn 14d >85% + Solana Game API Rust Actix create/join/calc/withdraw Swagger + Husks SDK Bytez3 onchain AI autobattler INT8 + Aureus Arena SDK AI arena bots SOL/AUR + RACE Protocol multichain SDK+race-cli + Solana Game Skill Claude addon Unity/MWA/state arch/testing

## Задачи Backend — v1+v2

### server/modules/os.js v2.0.0 20 components 14 layers
- watchtowerOSConfig layers identity sessionKeys assets indexer l2 analytics marketplace engines infra gameSignals payments aiAgents crossChain utils + v2Products 12 + architecture v1Steps 1-7 v2Steps 8-14 + full SDK/infra/ml/payments/ai/crossChain/utils support + exports for all v2 setups
- watchtowerOSHealth totalComponents 20 layers 14

### server/modules/engines/index.js v2 8 sdks
- aggregate godotSolanaDetailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog + gamba core hooks UI provably fair house edge 5% jackpot + preset npx scaffold Anchor JS Unity + unity godot unreal turbo web
- strategy betting scaffold + health + exports

### server/modules/utils/index.js aggregator utilsLayerConfig/utilsHealth claude-skill setup Unity SDK MWA state architecture testing

### server/index.js v2 API 20+ routes
- publicRoute prefixes api/os api/sdk api/infra api/game-signals api/payments api/ai api/cross-chain api/utils api/health api/readyz api/assets api/l2 api/marketplace api/ingest
- routes /api/sdk/godot-solana /api/sdk/gamba /api/sdk/preset /api/infra/config|health|arc|bolt|depin /api/game-signals/config|health /api/payments/config|health|rust-api /api/ai/config|health|husks|aureus /api/cross-chain/config|health|race /api/utils/config|health|claude-skill + v1 routes /api/assets/strategy /api/l2/router /api/marketplace/router POST /api/ingest/solana solana_wallet external_id Late ID Binding
- /api/health mode watchtower-os-v2 osVersion 2.0.0 totalComponents 20

### Infra modules
- server/modules/infra/arc.js ARC Entity-Component interoperability setupArcFocg Composability via same Components studio_profile stores ARC Entity IDs
- server/modules/infra/bolt.js Bolt FOCG autonomous worlds fully on-chain verifiable bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions cron
- server/modules/infra/depin.js DePIN Beamable license escrow rewards staking workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash cost saving off-chain push notifications matchmaking physics

### Engines modules detailed
- server/modules/engines/godot-solana-sdk.js detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders
- server/modules/engines/gamba.js monorepo core hooks UI provably fair
- server/modules/engines/solana-game-preset.js npx scaffold Anchor JS Unity

### Analytics
- server/modules/analytics/game-signals.js 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV cross-game retention SEO/GEO Blinks whale radar TipLink payer LTV sklearn RandomForest campaign proposal

### Payments
- server/modules/payments/game-api-rust.js Actix create join calculate withdraw Swagger high-performance Track Watchtower

### AI
- server/modules/ai/husks.js onchain AI autobattler INT8 procedural pixel train auto PvP cNFT MagicBlock ER sub-10ms
- server/modules/ai/aureus.js AI arena autonomous bots SOL/AUR tournament leaderboard provably fair Gamba verifiable Bolt MagicBlock ER

### Cross-chain
- server/modules/cross-chain/race.js multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets race-cli accounts link studio_profile PDA cross_chain true

### Utils
- server/modules/utils/claude-skill.js Claude addon Unity SDK MWA state arch testing

### Indexer — LaserStream + Shyft + PG
- LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + game program_ids + ARC ComponentAdded + Bolt events PlotPlanted RaceStarted CapShot + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + Aureus BotCreated + RACE CrossChainLinked + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks
- Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms
- Custom PG PostgreSQL TimescaleDB Redis tables timeseries multitenant tenant_id RLS cross-game materialized view idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning

### L2 — Sonic HyperGrid Sorada Rush REPLA MagicBlock ER
- Sonic HyperGrid dedicated grid high frequency thousands NeonRelay real-time PvP without resource contention API client create grid per game execute high frequency isolated monitoring tps latency grid health fallback Solana mainnet
- Sorada 5ms reads leaderboards inventory getAssetsByOwner 5ms vs 150ms
- Rush ECS declarative world config entities Player Position Velocity RaceResult systems MovementSystem RaceSystem generates Anchor contracts
- MagicBlock ER sub-10ms gasless delegate executeGasless commit state + Magic Actions auto settle race respawn harvest cron account_change level up
- REPLA repla-cli L3 Anchor settle MagicBlock sequencer
- Router GET /api/l2/router?gameId=ares1|aof|neonrelay|guttercaps&tps=high|low&ux=gasless -> HyperGrid or MagicBlock ER

### Assets — cNFT + Standard + Gamba Husks Aureus RACE
- cNFT Bubblegum v2 Merkle Tree MCC $110/M Tensor primary ME deprecated + Standard NFT + strategy routing GET /api/assets/strategy + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea

### Marketplace — ME + Shyft + GameShift + Tensor + Gamba Husks Aureus RACE
- ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus bot NFT + RACE multichain aggregator GET /api/marketplace/router

### Identity + Session Keys
- Privy useCreateWallet useSolanaWallets email/social enclave export + Phantom Connect OAuth + FirstStep guest gas sponsorship + Altude gasless relay + Session Keys createSession targetProgram topUp 0.01 SOL expiry 60min signAndSendTransaction risk 0.01 SOL scope denied withdraw_treasury guest->embedded->native->linked cross-game PDA studio_profile

### Analytics — Helika + GameSight + Game Signals
- Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet
- GameSight ad->on-chain ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution Late ID Binding solana_wallet external_id POST /api/ingest/solana
- Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7

## Что сдать Backend
- server/modules/os.js v2.0.0 20 components 14 layers v1Steps 1-7 v2Steps 8-14
- server/modules/engines/index.js v2 8 sdks betting scaffold
- server/modules/utils/index.js aggregator claude-skill
- server/index.js v2 API 20+ routes publicRoute + health watchtower-os-v2 osVersion 2.0.0 totalComponents 20
- infra arc bolt depin + engines godot-solana-sdk gamba preset + analytics game-signals + payments game-api-rust + ai husks aureus + cross-chain race + utils claude-skill
- Indexer LaserStream Shyft PG idempotency gap backfill finalized reconciliation + events ARC Bolt DePIN Gamba Husks Aureus RACE
- L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER router
- Assets cNFT $110/M vs standard strategy + Gamba Husks Aureus RACE multichain
- Marketplace ME Shyft GameShift Tensor Gamba Husks Aureus RACE aggregator
- Identity Session Keys Privy Phantom FirstStep Altude guest->embedded->native->linked session key 0.01 SOL
- Analytics Helika GameSight solana_wallet external_id Late ID Binding + Game Signals ML churn >85%
- Cross-game PDA studio_profile ARC Entity IDs Bolt entity IDs cross-chain linked wallets
- ENV names without values
- Tests npm test smoke anchor test high TPS gasless state commitment Magic Actions churn >85% cross-game funnel list buy sell ME instruction Session Key escrow-less Shyft USD GameShift
- Runtime smoke devnet tx session key cNFT marketplace listing USD + L2 HyperGrid MagicBlock ER gasless + DePIN + Gamba wager provably fair + Husks AI bots + Aureus tournament + RACE cross-chain + Game Signals ML
- Запреты no private keys read-only blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out RBAC 2FA multisig timelock audit log rollback Session Keys 0.01 SOL ME deprecated
- Документация docs/os/v2/STUDIO_OS_V2.md architecture onchain vs offchain API routes
- Финальный отчёт 13 пунктов

## API проверки Backend
GET /api/health watchtower-os-v2 osVersion 2.0.0 totalComponents 20
GET /api/readyz
GET /api/os/config v2 20 components
GET /api/os/health 14 layers
GET /api/sdk/godot-solana?gameId=ares1
GET /api/sdk/gamba?gameId=ares1
GET /api/sdk/preset?gameId=ares1&template=farming|racing|casual|strategy
GET /api/infra/config?gameId=ares1
GET /api/infra/health
GET /api/infra/arc?gameId=ares1
GET /api/infra/bolt?gameId=ares1
GET /api/infra/depin?gameId=ares1
GET /api/game-signals/config?gameId=ares1
GET /api/game-signals/health
GET /api/payments/config?gameId=ares1
GET /api/payments/health
GET /api/payments/rust-api?gameId=ares1
GET /api/ai/config?gameId=ares1
GET /api/ai/health
GET /api/ai/husks?gameId=ares1
GET /api/ai/aureus?gameId=ares1
GET /api/cross-chain/config?gameId=ares1
GET /api/cross-chain/health
GET /api/cross-chain/race?gameId=ares1
GET /api/utils/config?gameId=ares1
GET /api/utils/health
GET /api/utils/claude-skill?gameId=ares1
GET /api/assets/strategy?gameId=ares1&itemType=common&rarity=common
GET /api/l2/router?gameId=ares1&tps=high|low
GET /api/marketplace/router?gameId=ares1&assetType=cnft
POST /api/ingest/solana solana_wallet external_id

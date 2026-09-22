# Analytics & ML — Watchtower OS v2 Integration Prompt

## Приложение
Analytics ML pipeline Helika GameSight Game Signals 60M+ tx 12 games churn 14d >85% cross-game wallets funnel LTV, PostgreSQL TimescaleDB Redis LaserStream Shyft.

## Watchtower OS v2 — 19 components
v1: Identity Session Keys Assets Indexer L2 Analytics Marketplace Engines
v2: Godot Solana SDK detailed + Gamba betting + Solana Game Preset + ARC + Bolt + DePIN + Game Signals ML + Rust API + Husks AI autobattler + Aureus AI arena + RACE multichain + Claude Skill

## Задачи Analytics ML — v1+v2

### Helika cross-game dashboard
- Web2 in-game on-chain acquisition LiveOps A/B + mapping + campaign_id solana_wallet
- Cross-game dashboard tenant_id RLS materialized view
- Late ID Binding solana_wallet external_id POST /api/ingest/solana
- Events PlayerJoined WalletConnected session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats

### GameSight ad->on-chain attribution
- ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution
- solana_wallet field external_id Late ID Binding POST /api/ingest/solana
- Mapping campaign_id solana_wallet

### Game Signals — 60M+ tx 12 games ML churn 14d >85%
- Python sklearn RandomForest churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV
- 60M+ tx 12 games dataset ML features transactions per wallet retention funnel
- Campaign proposal POST /api/campaigns/proposals churn risk >0.7
- Endpoints GET /api/game-signals/config?gameId=ares1|aof|neonrelay|guttercaps GET /api/game-signals/health
- server/modules/analytics/game-signals.js setupGameSignals

### Indexer for analytics — LaserStream + Shyft + PG
- LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + game program_ids + ARC ComponentAdded + Bolt events PlotPlanted RaceStarted CapShot RaceFinished + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + Aureus BotCreated + RACE CrossChainLinked + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks
- Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms
- Custom PG PostgreSQL TimescaleDB Redis tables timeseries multitenant tenant_id RLS cross-game materialized view idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning
- Events for analytics: PotatoHarvested RaceStarted RaceFinished CapShot PlayerJoined WalletConnected WagerCreated FighterSummoned BotCreated CrossChainLinked ComponentAdded WorkerStaked

### L2 analytics — Sonic HyperGrid Sorada Rush REPLA MagicBlock ER
- Sonic HyperGrid dedicated grid high frequency thousands NeonRelay real-time PvP without resource contention monitoring tps latency grid health fallback Solana mainnet
- Sorada 5ms reads leaderboards inventory getAssetsByOwner 5ms vs 150ms
- Rush ECS declarative world config entities Player Position Velocity RaceResult systems MovementSystem RaceSystem generates Anchor contracts
- MagicBlock ER sub-10ms gasless delegate executeGasless commit state + Magic Actions auto settle race respawn harvest cron
- REPLA repla-cli L3 Anchor settle MagicBlock sequencer
- Router GET /api/l2/router?gameId=ares1|aof|neonrelay|guttercaps&tps=high|low&ux=gasless

### Assets & Marketplace analytics — ME Shyft GameShift Tensor Gamba Husks Aureus RACE
- ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea aggregator GET /api/marketplace/router stats for analytics funnel list buy sell ME instruction
- Assets strategy GET /api/assets/strategy?gameId=ares1&itemType=common&rarity=common cNFT $110/M vs standard

### AI analytics — Husks Aureus
- Husks onchain AI autobattler INT8 procedural pixel train auto PvP cNFT MagicBlock ER sub-10ms analytics fighter win rate
- Aureus AI arena autonomous bots SOL/AUR tournament leaderboard provably fair Gamba verifiable Bolt MagicBlock ER analytics bot performance tournament ROI

### Cross-chain analytics — RACE
- RACE multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets race-cli accounts link studio_profile PDA cross_chain true analytics cross-chain linked wallets funnel

### Infra analytics — ARC Bolt DePIN Preset Rust API
- ARC Entity-Component interoperability Composability via same Components studio_profile stores ARC Entity IDs analytics cross-game via same Components
- Bolt FOCG fully on-chain verifiable bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions cron analytics verifiable events
- DePIN license escrow rewards staking workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash cost saving analytics worker performance
- Preset npx create-solana-game --preset farming/racing/casual scaffold Anchor Player score + JS Unity clients IDL analytics
- Rust API Actix high-performance create/join/calculate/withdraw Swagger Track Watchtower analytics high-performance

### Utils — Claude Skill
- Solana Game Skill for Claude Code skill addon Unity SDK MWA state arch testing accelerates correct code generation analytics patterns

## Что сдать Analytics ML
- server/modules/analytics/game-signals.js 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV cross-game retention SEO/GEO Blinks whale radar TipLink vs payer LTV sklearn RandomForest campaign proposal
- Helika cross-game dashboard mapping campaign_id solana_wallet Late ID Binding POST /api/ingest/solana
- GameSight ad->on-chain attribution solana_wallet external_id
- Indexer LaserStream Shyft PG idempotency gap backfill finalized reconciliation + events ARC Bolt DePIN Gamba Husks Aureus RACE analytics
- L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER router analytics high TPS gasless
- Assets Marketplace analytics ME Shyft GameShift Tensor Gamba Husks Aureus RACE aggregator stats funnel list buy sell
- AI analytics Husks Aureus fighter win rate tournament ROI
- Cross-chain analytics RACE multichain linked wallets funnel
- Infra analytics ARC Bolt DePIN Preset Rust API
- API checks GET /api/os/config v2 20 components GET /api/os/health 14 layers GET /api/game-signals/config GET /api/game-signals/health GET /api/infra/arc GET /api/infra/bolt GET /api/infra/depin GET /api/ai/husks GET /api/ai/aureus GET /api/cross-chain/race GET /api/assets/strategy GET /api/l2/router GET /api/marketplace/router POST /api/ingest/solana
- ENV names without values
- Tests npm test smoke churn >85% cross-game funnel list buy sell ME instruction Session Key escrow-less Shyft USD GameShift high TPS gasless state commitment Magic Actions
- Runtime smoke devnet tx session key cNFT marketplace listing USD + L2 HyperGrid MagicBlock ER gasless + DePIN + Gamba + Husks + Aureus + RACE cross-chain + Game Signals ML churn >85%
- Запреты no private keys read-only blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out RBAC 2FA multisig timelock audit log rollback
- Документация docs/os/v2/STUDIO_OS_V2.md architecture onchain vs offchain API routes analytics ML
- Финальный отчёт 13 пунктов

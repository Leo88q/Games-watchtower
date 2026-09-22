# Web Frontend — Watchtower OS v2 Integration Prompt

## Приложение
Web frontend React Vite Privy Phantom Solana wallet adapters, needs studio-wide multitenant UI for 7 layers v1 + 12 products v2.

## Watchtower OS v2 — 19 components
v1: Identity Session Keys Assets Indexer L2 Analytics Marketplace Engines (Unity Solana.Unity-SDK Godot godot-solana-sdk Unreal VAR META/Bifrost Turbo Web @solana/web3.js/@solana/kit)
v2: Godot Solana SDK detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders + Gamba SDK gamba-labs/gamba monorepo betting Anchor React hooks UI + Solana Game Preset npx scaffold + ARC Framework JumpCrypto/sol-arc Entity-Component interoperability + Bolt magicblock-labs/bolt FOCG fully on-chain + DePIN Beamable-Network/depin license escrow rewards staking + Solana Game Signals 60M+ tx 12 games ML churn 14d >85% + Solana Game API Rust Actix create/join/calc/withdraw Swagger + Husks SDK Bytez3 onchain AI autobattler INT8 + Aureus Arena SDK AI arena bots SOL/AUR + RACE Protocol multichain SDK+race-cli + Solana Game Skill Claude addon Unity/MWA/state arch/testing

## Задачи Web — v1+v2

### Identity + Session Keys + Godot Solana SDK + Claude Skill + Wallets
- Privy useCreateWallet useSolanaWallets email/social enclave export + Phantom Connect Kit OAuth + FirstStep guest+gas sponsorship + Altude gasless relay + Session Keys createSession(targetProgram,topUp 0.01 SOL,expiry 60min) signAndSendTransaction risk 0.01 SOL
- Godot detailed UI bridge SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog
- Claude Skill patterns Unity SDK MWA state architecture onchain vs offchain testing

### Assets + Gamba + Husks Aureus + RACE multichain marketplace
- cNFT $110/M Merkle Tree MCC Tensor primary ME deprecated + Standard NFT + strategy routing GET /api/assets/strategy
- Gamba UI framework GambaUi WagerInput GameResult Jackpot hooks useGamba usePlay useWager provably fair house edge
- Husks fighter summon UI procedural pixel train INT8 auto PvP + Aureus bot create tournament UI SOL/AUR
- RACE multichain cNFT Solana Tensor NFT EVM OpenSea cross-chain link UI

### Infra — ARC + Bolt + DePIN + Preset + Rust API + L2 Sonic MagicBlock ER
- ARC Entity-Component interoperability UI display Entity crop race cap Components Position GrowthStage Owner Item source_game is_cnft asset_id System harvest craft Movement Race shooting
- Bolt FOCG fully on-chain verifiable UI world create entity addComponent executeSystem bolt init build deploy world create BoltClient + events PlotPlanted RaceStarted CapShot
- DePIN license escrow rewards staking workers UI stake 10 SOL escrow 0.1 SOL per 100 players reward slash
- Preset npx create-solana-game --preset farming/racing/casual scaffold Anchor Player score + JS Unity clients IDL UI
- Rust API Actix high-performance create/join/calculate/withdraw Swagger UI POST /api/game/create
- L2 Sonic HyperGrid dedicated grid high frequency tps high NeonRelay + MagicBlock ER gasless sub-10ms delegate executeGasless commit state Magic Actions cron + Sorada 5ms reads + Rush ECS declarative world config + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router

### Indexer — LaserStream + Shyft + PG + ARC Bolt DePIN Gamba Husks Aureus RACE
- LaserStream gRPC subscription CgInv SessKeys STrEaSuRy + game program_ids + ARC ComponentAdded + Bolt events + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + Aureus BotCreated + RACE CrossChainLinked + raw_events canonical identity + 24h replay failover WS DAS Priority Fee Webhooks
- Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms
- Custom PG PostgreSQL TimescaleDB Redis tables timeseries multitenant tenant_id RLS cross-game materialized view idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning UI

### Analytics — Helika + GameSight + Game Signals ML
- Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet UI
- GameSight ad->on-chain ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution UI
- Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7 UI dashboard

### Marketplace — ME + Shyft + GameShift + Tensor + Gamba Husks Aureus RACE
- ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea aggregator GET /api/marketplace/router UI

### Cross-chain — RACE multichain abstraction UI
- RACE SDK sdk-solana CLI race-cli game bundles publish networks Solana EVM account management fairness provably fair verifiable cross-chain identity link Solana EVM wallets via race-cli accounts link + studio_profile PDA cross_chain true UI link wallets

### Utils — Claude Skill UI
- Solana Game Skill for Claude Code skill addon Unity SDK MWA state architecture onchain vs offchain testing accelerates correct code generation UI docs

## Что сдать Web
- React Vite app with OS panel 20 components cards + 14 layers health + v2Products 12 cards + engine SDKs 8
- Identity UI Privy Phantom FirstStep Altude Session Keys 0.01 SOL guest->embedded->native->linked
- Assets UI cNFT $110/M vs standard strategy + Gamba betting UI + Husks Aureus fighter bot UI
- Infra UI ARC Entity Component System interoperability + Bolt FOCG world + DePIN workers stake + Preset scaffold + Rust API Swagger
- L2 UI Sonic HyperGrid + MagicBlock ER gasless + Sorada 5ms + Rush ECS + REPLA router
- Indexer UI LaserStream Shyft PG idempotency gap backfill finalized reconciliation + events ARC Bolt DePIN Gamba Husks Aureus RACE
- Analytics UI Helika GameSight solana_wallet external_id Late ID Binding + Game Signals ML churn >85% dashboard
- Marketplace UI ME Shyft GameShift Tensor Gamba Husks Aureus RACE multichain aggregator
- Cross-chain UI RACE multichain Solana + EVM bundles + link wallets
- Utils UI Claude Skill docs
- API checks all GET /api/os/config /api/os/health /api/sdk/godot-solana /api/sdk/gamba /api/sdk/preset /api/infra/arc /api/infra/bolt /api/infra/depin /api/game-signals/config /api/payments/rust-api /api/ai/husks /api/ai/aureus /api/cross-chain/race /api/utils/claude-skill /api/assets/strategy /api/l2/router /api/marketplace/router POST /api/ingest/solana
- ENV names without values
- Tests npm test smoke high TPS gasless churn >85% cross-game marketplace ME instruction Session Key escrow-less Shyft USD GameShift
- Runtime smoke devnet tx session key cNFT marketplace listing USD + L2 HyperGrid MagicBlock ER gasless + DePIN + Gamba + Husks + Aureus + RACE cross-chain
- Запреты no private keys read-only blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out RBAC 2FA multisig timelock audit log rollback
- Документация architecture onchain vs offchain API routes
- Финальный отчёт 13 пунктов

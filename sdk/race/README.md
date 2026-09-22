# RACE Protocol — Watchtower OS v2 Integration

## Source
RACE Protocol multichain secure fair SDK sdk-solana CLI race-cli bundles publish networks Solana EVM

## Install
```bash
npm i @race-foundation/sdk-solana
cargo install race-cli
race-cli --help
```

## Watchtower Wiring
- server/modules/cross-chain/race.js setupRace multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link
- API: GET /api/cross-chain/race?gameId=ares1 GET /api/cross-chain/config GET /api/cross-chain/health
- Indexer: LaserStream gRPC CrossChainLinked AccountLinked BundlePublished + CgInv SessKeys STrEaSuRy + game program_ids + ARC ComponentAdded + Bolt events + DePIN WorkerStaked + Gamba WagerCreated + Husks FighterSummoned + Aureus BotCreated + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks + Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms + Custom PG PostgreSQL TimescaleDB Redis idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning cross-chain linked wallets

## Quick Start
```bash
# Create game bundle
race-cli bundle create --game ares1 --network solana --output bundle.json

# Publish bundle to networks Solana + EVM
race-cli bundle publish --bundle bundle.json --networks solana,evm --rpc solana=https://api.mainnet-beta.solana.com evm=https://eth.llamarpc.com

# Account management link Solana EVM wallets
race-cli accounts link --solana-wallet <SOLANA_PUBKEY> --evm-wallet <EVM_ADDRESS> --game ares1
# Creates cross-chain linked wallets studio_profile PDA cross_chain true
```

```ts
import { RaceClient } from '@race-foundation/sdk-solana'

const race = new RaceClient({ gameId: 'ares1', networks: ['solana','evm'] })

// Link wallets
await race.linkWallets({ solana: solanaPubkey, evm: evmAddress })

// Publish game bundle
await race.publishBundle({ bundle: bundleJson, networks: ['solana','evm'] })

// Verify fairness provably fair verifiable
const fairness = await race.verifyFairness({ gameId: 'ares1', round: 123 })
// secure fair SDK

// Cross-chain cNFT Solana Tensor NFT EVM OpenSea
const asset = await race.mintCrossChain({ ownerSolana, ownerEvm, metadata, assetType: 'cnft' }) // $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated + Standard EVM OpenSea
```

## L2 & Infra
- Sonic HyperGrid dedicated grid high frequency thousands NeonRelay real-time PvP without resource contention + Sorada 5ms reads leaderboards inventory getAssetsByOwner 5ms vs 150ms + Rush ECS declarative world config entities Player Position Velocity RaceResult systems MovementSystem RaceSystem generates Anchor contracts + MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto settle race respawn harvest cron + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router?gameId=ares1|aof|neonrelay|guttercaps&tps=high|low&ux=gasless
- ARC Entity-Component interoperability composability via same Components Position Health Owner Item source_game is_cnft asset_id System studio_profile stores ARC Entity IDs cross-game via same Components + Bolt FOCG autonomous worlds fully on-chain verifiable bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions cron + DePIN Beamable license escrow rewards staking workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash cost saving off-chain push notifications matchmaking physics AI inference + Preset npx create-solana-game --preset farming|racing|casual|strategy|autobattler|arena scaffold Anchor Player score + JS Unity clients IDL + Rust API Actix high-performance create/join/calculate/withdraw Swagger Track Watchtower

## Marketplace & Assets
- cNFT $110/M Merkle Tree MCC Bubblegum v2 Tensor primary ME deprecated + Standard NFT + strategy routing GET /api/assets/strategy?gameId=ares1&itemType=common&rarity=common + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea
- ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain aggregator GET /api/marketplace/router?gameId=ares1&assetType=cnft -> Tensor primary

## Analytics
- Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet + GameSight ad->on-chain ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution Late ID Binding solana_wallet external_id POST /api/ingest/solana + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7 cross-chain linked wallets funnel

## Identity & Security
- Privy useCreateWallet useSolanaWallets email/social enclave export + Phantom Connect OAuth + FirstStep guest gas sponsorship + Altude gasless relay + Session Keys createSession targetProgram topUp 0.01 SOL expiry 60min signAndSendTransaction risk 0.01 SOL scope denied withdraw_treasury guest->embedded->native->linked cross-game PDA studio_profile cross_chain true cross-chain linked wallets
- RBAC 2FA multisig timelock audit log rollback read-only blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out

# Husks SDK — Watchtower OS v2 Integration

## Source
Bytez3 Husks onchain AI autobattler NFT fighters procedural pixel INT8 auto PvP

## Install
```bash
npm i @bytez3/husks-sdk
cargo add husks-client
```

## Watchtower Wiring
- server/modules/ai/husks.js setupHusks onchain AI autobattler INT8 procedural pixel train auto PvP cNFT MagicBlock ER sub-10ms
- API: GET /api/ai/husks?gameId=ares1 GET /api/ai/config GET /api/ai/health
- Indexer: LaserStream gRPC FighterSummoned FighterTrained BattleFinished + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks + Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms + Custom PG PostgreSQL TimescaleDB Redis idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning

## Quick Start
```ts
import { HusksClient } from '@bytez3/husks-sdk'

const husks = new HusksClient({ gameId: 'ares1', network: 'devnet' })

// Summon NFT fighter procedural pixel
const fighter = await husks.summonFighter({
  owner: wallet,
  traits: { crop: 'potato', rarity: 'common' },
  procedural: true, // pixel art generated on-chain
  assetType: 'cnft', // $110/M Bubblegum v2 Merkle Tree MCC Tensor primary ME deprecated
})

// Train INT8 quantized via crafting/battles
await husks.trainFighter(fighter.id, { method: 'crafting', data: 'potato harvest' })
// INT8 quantized model auto PvP market dominance cNFT

// Auto PvP — MagicBlock ER sub-10ms gasless + Magic Actions auto battle cron
await husks.enableAutoPvP(fighter.id, { interval: '*/5 * * * *', er: true }) // Magic Actions cron every 5 min

// Battle
const battle = await husks.battle(fighter.id, opponentId)
console.log(battle.result, battle.winRate)

// L2: delegate to ER for sub-10ms gasless
await husks.delegateToER(fighter.id)
await husks.executeGasless('battle', fighter.id) // <10ms
await husks.commitState(fighter.id)
```

## Unity / Godot Analog
- Unity: Solana.Unity-SDK + Husks Anchor program invoke summon instruction via Session Key 0.01 SOL
- Godot: SolanaClient WalletAdapter AnchorProgram summon instruction procedural pixel
- cNFT $110/M vs standard strategy GET /api/assets/strategy

## L2 & Infra
- MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto battle cron + Sonic HyperGrid dedicated grid high frequency + Sorada 5ms reads leaderboards inventory + Rush ECS declarative world config generates Anchor contracts + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router
- ARC Entity fighter + Component Position Health Owner Item source_game is_cnft asset_id + System combat + Bolt FOCG fully on-chain verifiable Position Health Fighter components Systems battle fully on-chain emit events bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions auto battle cron + DePIN workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash AI inference off-chain -> DePIN workers + Preset npx create-solana-game --preset autobattler scaffold Anchor Player score FighterResult + JS Unity clients IDL + Rust API Actix high-performance Track Watchtower FighterSummoned solana_wallet

## Marketplace & Analytics
- ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea aggregator GET /api/marketplace/router
- Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention fighter win rate

## Cross-chain
- RACE multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets race-cli accounts link studio_profile PDA cross_chain true fighter cNFT Solana Tensor NFT EVM OpenSea

## Security
- Session Keys 0.01 SOL risk only topUp, scope denied withdraw_treasury, RBAC 2FA multisig timelock audit log rollback

# Aureus Arena SDK — Watchtower OS v2 Integration

## Source
Aureus Labs AI arena autonomous bots SOL/AUR prizes tournament leaderboard provably fair Gamba verifiable Bolt MagicBlock ER sub-10ms

## Install
```bash
npm i @aureus-labs/arena-sdk
cargo add aureus-arena-client
```

## Watchtower Wiring
- server/modules/ai/aureus.js setupAureus AI arena autonomous bots SOL/AUR tournament leaderboard provably fair
- API: GET /api/ai/aureus?gameId=ares1 GET /api/ai/config GET /api/ai/health
- Indexer: LaserStream gRPC BotCreated TournamentEntered TournamentFinished + raw_events canonical identity 24h replay failover WS DAS Priority Fee Webhooks + Shyft REST callbacks TOKEN_MINT NFT_MINT webhook POST /api/webhooks/shyft/{gameId} + gPA accelerated p50 15ms + Custom PG PostgreSQL TimescaleDB Redis idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning

## Quick Start
```ts
import { AureusClient } from '@aureus-labs/arena-sdk'

const aureus = new AureusClient({ gameId: 'neonrelay', network: 'devnet' })

// Create autonomous bot
const bot = await aureus.createBot({
  owner: wallet,
  strategy: 'fastest-lap',
  entryFee: 0.1, // SOL
  assetType: 'cnft', // $110/M Bubblegum v2 Tensor primary
})

// Enter tournament — entry as ticket, prize epoch jackpot provably fair Gamba verifiable Bolt MagicBlock ER sub-10ms
const tournament = await aureus.enterTournament(bot.id, {
  tournamentId: 'neon_cup_001',
  entry: 0.1, // SOL ticket
  prize: 10, // SOL + AUR jackpot
})

// Tournament runs autonomous, fastest lap wins, leaderboard
// MagicBlock ER sub-10ms gasless delegate executeGasless commit state + Magic Actions auto tournament cron
await aureus.enableAutoTournament(bot.id, { interval: '*/10 * * * *', er: true })

// Results provably fair verifiable on-chain
const result = await aureus.getTournamentResult(tournament.id)
console.log(result.leaderboard, result.prizeDistribution)
```

## Unity / Godot Analog
- Unity: Solana.Unity-SDK + Aureus Anchor program invoke create bot instruction via Session Key 0.01 SOL
- Godot: SolanaClient WalletAdapter AnchorProgram create bot instruction
- cNFT $110/M vs standard strategy GET /api/assets/strategy

## L2 & Infra
- MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto tournament cron + Sonic HyperGrid dedicated grid high frequency thousands NeonRelay real-time PvP + Sorada 5ms reads leaderboards inventory + Rush ECS declarative world config generates Anchor contracts + REPLA repla-cli L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router
- ARC Entity bot tournament + Component Position Score Owner Item source_game is_cnft asset_id + System tournament + Bolt FOCG fully on-chain verifiable Bot Tournament Player components Systems create_tournament enter_tournament finish_tournament fully on-chain emit events bolt init build deploy world create BoltClient createEntity addComponent executeSystem MagicBlock ER delegate executeGasless <10ms Magic Actions cron + DePIN workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash AI inference off-chain -> DePIN workers + Preset npx create-solana-game --preset arena scaffold Anchor Player score BotResult + JS Unity clients IDL + Rust API Actix high-performance Track Watchtower BotCreated solana_wallet

## Marketplace & Analytics
- ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks Aureus fighter bot NFT + RACE multichain cNFT Solana Tensor NFT EVM OpenSea aggregator GET /api/marketplace/router
- Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV cross-game retention bot performance tournament ROI

## Cross-chain & Gamba
- RACE multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM account management fairness verifiable cross-chain identity link Solana EVM wallets race-cli accounts link studio_profile PDA cross_chain true bot cNFT Solana Tensor NFT EVM OpenSea
- Gamba betting ticket as wager prize epoch jackpot provably fair house edge 5% jackpot hooks useGamba usePlay useWager UI framework GambaUi WagerInput GameResult Jackpot

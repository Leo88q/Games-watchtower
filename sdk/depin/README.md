# DePIN — Watchtower OS v2 Integration

## Source
Beamable-Network/depin license escrow rewards staking workers

## Install
```bash
npm i @beamable-network/depin-sdk
cargo add depin-client
```

## Watchtower Wiring
- server/modules/infra/depin.js setupDepin license escrow rewards staking
- API: GET /api/infra/depin?gameId=ares1
- Indexer: LaserStream gRPC WorkerStaked WorkerUnstaked EscrowCreated RewardDistributed + raw_events canonical identity

## Concept
Off-chain work (push notifications, matchmaking, physics, AI inference, leaderboard) -> DePIN workers stake 10 SOL escrow 0.1 SOL per 100 players reward slash cost saving vs centralized servers.

## Quick Start
```ts
import { DepinClient } from '@beamable-network/depin-sdk'
const depin = new DepinClient({ gameId: 'aof' })

// License: game pays to use DePIN network
await depin.createLicense({ gameId: 'aof', type: 'push-notifications', maxPlayers: 10000 })

// Worker stakes 10 SOL to join
await depin.stakeWorker({ workerId: 'worker_1', stake: 10 })

// Escrow 0.1 SOL per 100 players for task
await depin.createEscrow({ task: 'matchmaking', amount: 0.1, players: 100 })

// Worker executes task, reward distributed, slash if fails
await depin.executeTask({ task: 'matchmaking', workerId: 'worker_1' })
// reward 0.09 SOL to worker, 0.01 SOL to protocol, slash if timeout
```

## L2 Integration
- MagicBlock ER sub-10ms gasless for real-time via DePIN workers physics + Sonic HyperGrid high frequency + Sorada 5ms reads + Rush ECS declarative + REPLA L3 Anchor settle MagicBlock sequencer Router GET /api/l2/router
- DePIN workers + MagicBlock ER: workers run physics matchmaking leaderboard, commit state via MagicBlock ER gasless

## Cross-game & Marketplace
- Workers can serve multiple tenants ares1 aof neonrelay guttercaps multitenant tenant_id RLS
- cNFT $110/M Bubblegum v2 Tensor primary ME deprecated + Standard NFT
- Analytics Helika GameSight solana_wallet external_id Late ID Binding + Game Signals ML churn >85% worker performance

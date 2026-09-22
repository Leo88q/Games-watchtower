# Gamba SDK — Watchtower OS v2 Integration

## Source
gamba-labs/gamba monorepo — provably fair betting Anchor + React hooks + UI framework

## Install
```bash
npm i gamba @gamba-labs/gamba-react @gamba-labs/gamba-react-ui-v2
# Anchor program: Gamba program ID from monorepo
```

## Watchtower Wiring
- server/modules/engines/gamba.js — setupGamba SDK initialization provably fair house edge 5% jackpot
- API: GET /api/sdk/gamba?gameId=ares1 returns config
- Indexer: LaserStream gRPC subscription WagerCreated WagerSettled JackpotWon + raw_events canonical identity + Shyft REST callbacks
- L2: MagicBlock ER sub-10ms gasless delegate executeGasless + Sonic HyperGrid for high-frequency NeonRelay

## Quick Start React
```tsx
import { GambaProvider, useGamba, usePlay, useWager } from 'gamba'
import { GambaUi, WagerInput, GameResult, Jackpot } from '@gamba-labs/gamba-react-ui-v2'

function Game() {
  const gamba = useGamba()
  const play = usePlay({ game: 'potato-mining', wager: 0.1 })
  const wager = useWager()
  // provably fair: server seed + client seed + nonce => verifiable random
  return <GambaUi><WagerInput /><GameResult /></GambaUi>
}
```

## Unity / Godot Analog
- Unity: Solana.Unity-SDK + Gamba Anchor program invoke wager instruction via Session Key 0.01 SOL
- Godot: SolanaClient WalletAdapter AnchorProgram wager instruction
- Provably fair: house edge 5%, jackpot pooled, verifiable on-chain

## Cross-game
- Wager NFT + fighter bot NFT cNFT $110/M Bubblegum v2 Tensor primary ME deprecated
- Marketplace: ME 120 QPM Bearer MCC+MT + Shyft escrow-less + GameShift USD 170+ 100% chargeback + Tensor cNFT + RACE multichain Solana Tensor NFT EVM OpenSea
- studio_profile PDA cross-game via same wagering history

## Analytics
- Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals ML 60M+ tx churn 14d >85% common wallets funnel LTV

## Security
- Session Keys 0.01 SOL risk only topUp, scope denied withdraw_treasury
- RBAC 2FA multisig timelock audit log rollback

# @idosgames/wallet — Watchtower OS v3 Ideal Free Stack

## Category: Payments Bridge — Best Free EVM+Solana Bridge RewardPool

## Source
@idosgames/wallet: SDK for bridge between browser/mobile wallets (EVM and Solana) with ability to move tokens and NFTs into game and out. Includes custom Solana program RewardPool for deposits and withdrawals SPL tokens

## Install
```bash
npm i @idosgames/wallet
```

## Watchtower Wiring
- server/modules/monetization/idosgames-wallet.js
- API: GET /api/monetization/idosgames-wallet?gameId=ares1 GET /api/sdk/idosgames-wallet
- Ideal free: Best free bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL

## Quick Start
```ts
import { IdosgamesWallet } from '@idosgames/wallet'

const idos = new IdosgamesWallet({ gameId: 'ares1' })

await idos.bridgeIn({ walletEvm, walletSolana, token, amount, gameId: 'ares1' }) // move tokens NFTs into game
await idos.bridgeOut({ walletSolana, walletEvm, token, amount }) // move out
// RewardPool program deposits withdrawals SPL tokens
await idos.depositToRewardPool({ walletSolana, token: 'USDC', amount: 10 })
await idos.withdrawFromRewardPool({ walletSolana, amount: 5 })
```

## Comparison
- vs RACE Protocol multichain infra secure fair game bundles account management vs @idosgames/wallet bridge browser/mobile wallets EVM Solana RewardPool deposits withdrawals SPL — RACE broader multichain abstraction game bundles fairness, idosgames specific bridge wallet RewardPool, complementary, RACE for game bundles, idosgames for wallet bridge RewardPool, both free keep both but distinct
- vs GameShift USD payments vs idosgames bridge — GameShift for USD, idosgames for EVM Solana bridge

## Ideal Free Stack Cross-Chain Bridge
- RACE multichain SDK sdk-solana CLI race-cli bundles publish Solana EVM fairness verifiable + @idosgames/wallet bridge EVM Solana RewardPool = ideal free cross-chain bridge

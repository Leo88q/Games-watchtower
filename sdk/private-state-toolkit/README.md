# Private State Toolkit (PST) — Watchtower OS v3 Ideal Free Stack

## Category: Privacy — Best Free Private Verifiable State

## Source
Private State Toolkit (PST): Infrastructure for private but verifiable state of applications. Stores only cryptographic commitments on-chain, encrypted state off-chain. Ideal for games with hidden logic (card games)

## Install
```bash
npm i @private-state-toolkit/sdk
```

## Watchtower Wiring
- server/modules/storage/private-state-toolkit.js + infra/pst
- API: GET /api/storage/pst?gameId=ares1 GET /api/infra/pst
- Ideal free: Best free private but verifiable state commitments on-chain encrypted off-chain hidden logic card games

## Quick Start
```ts
import { PSTClient } from '@private-state-toolkit/sdk'
const pst = new PSTClient({ gameId: 'ares1' })

await pst.commit({ gameId: 'ares1', commitment: hash(hiddenState) }) // only commitment on-chain
await pst.storeEncrypted({ commitment, encryptedState }) // encrypted off-chain
await pst.verify({ commitment, proof }) // verifiable

// Card game hidden logic
// commitment on-chain, encrypted hand off-chain, reveal with proof
await pst.commitCardHand({ player, commitment: hash(hand) })
await pst.revealWithProof({ player, hand, proof })
```

## Comparison
- vs Xandeum scalable public storage vs PST private verifiable commitments — Xandeum for scalable public, PST for private hidden logic, complementary
- vs Core Attributes public on-chain key-value stats vs PST private commitments — Core public on-chain stats, PST private verifiable, complementary
- vs Arcium confidential computing rollups vs PST private verifiable commitments — Arcium for confidential computing rollups payments, PST for private state commitments hidden logic card games, complementary

## Ideal Free Stack Privacy
- PST private verifiable commitments hidden logic + Arcium confidential computing rollups privacy + Xandeum scalable + Core Attributes on-chain key-value = full privacy storage coverage

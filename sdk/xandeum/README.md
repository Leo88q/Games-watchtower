# Xandeum — Watchtower OS v3 Ideal Free Stack

## Category: Storage — Best Free Scalable Exabyte Storage Layer

## Source
Xandeum: Scalable storage layer for dApps on Solana, allows saving game states, assets, player data in decentralized storage network that can grow to exabytes

## Install
```bash
npm i @xandeum/sdk
```

## Watchtower Wiring
- server/modules/storage/xandeum.js + infra/xandeum
- API: GET /api/storage/xandeum?gameId=ares1 GET /api/infra/xandeum
- Ideal free: Best free scalable storage layer exabytes game states assets player data decentralized network exabytes, better than Arweave for scalable game state

## Quick Start
```ts
import { XandeumClient } from '@xandeum/sdk'
const xandeum = new XandeumClient({ gameId: 'ares1' })

await xandeum.save({ gameId: 'ares1', key: 'player:state', data: gameState }) // exabyte scalable
await xandeum.saveAssets({ gameId: 'ares1', assets: [...] }) // decentralized storage
await xandeum.savePlayerData({ wallet, data }) // exabyte
```

## Comparison
- vs Arweave Shadow Drive Irys for cNFT off-chain metadata $110/M vs Xandeum exabyte scalable storage layer game states assets player data — Xandeum better for scalable game state, Arweave fallback for cNFT metadata, complementary not competitive
- vs PST private verifiable commitments on-chain encrypted off-chain — Xandeum for scalable public storage, PST for private hidden logic, complementary
- vs Core Attributes on-chain key-value in NFT readable programs DAS — Xandeum off-chain exabyte, Core Attributes on-chain stats, complementary

## Ideal Free Stack Storage
- Xandeum scalable public off-chain exabyte + PST private commitments on-chain encrypted off-chain + Core Attributes public on-chain key-value = full coverage storage privacy not competitive

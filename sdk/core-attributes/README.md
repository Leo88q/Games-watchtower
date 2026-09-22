# Metaplex Core Attributes Plugin — Watchtower OS v3 Ideal Free Stack

## Category: Assets — Best Free On-Chain Key-Value Stats

## Source
Metaplex Core Attributes Plugin: Allows storing game stats and characteristics as key-value directly on-chain in NFT. Data can be read by Solana programs and indexed via DAS

## Install
```bash
npm i @metaplex-foundation/mpl-core
```

## Watchtower Wiring
- server/modules/storage/core-attributes.js + infra/core-attributes
- API: GET /api/storage/core-attributes?gameId=ares1 GET /api/infra/core-attributes GET /api/sdk/core-attributes
- Ideal free: Best free on-chain key-value in NFT game stats characteristics readable by programs indexable via DAS

## Quick Start
```ts
import { CoreClient } from '@metaplex-foundation/mpl-core'

const core = new CoreClient({ gameId: 'ares1' })

await core.addAttribute({ nft: nftAddress, key: 'level', value: '10' }) // on-chain key-value
await core.addAttribute({ nft: nftAddress, key: 'wins', value: '42' })
await core.addAttribute({ nft: nftAddress, key: 'harvests', value: '100' })

// In Anchor program: read Core Attributes via CPI, stats readable by programs
// Index via DAS getAssetsByOwner 5ms vs 150ms
const assets = await das.getAssetsByOwner({ owner: wallet, attributes: { level: { gte: 10 } } })
```

## Comparison
- vs Xandeum scalable off-chain exabyte vs Core Attributes on-chain key-value — Xandeum off-chain scalable, Core on-chain readable programs DAS, complementary
- vs PST private commitments vs Core public on-chain stats — PST private hidden logic, Core public on-chain stats, complementary
- vs cNFT off-chain metadata $110/M vs Core on-chain key-value — cNFT off-chain scalable, Core on-chain for stats readable programs best free on-chain stats, complementary

## Ideal Free Stack Assets Storage
- cNFT $110/M off-chain scalable + Core Attributes on-chain key-value readable programs DAS best free on-chain stats + Xandeum exabyte scalable best free scalable = ideal free assets storage

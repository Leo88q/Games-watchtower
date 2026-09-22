# Solana Game Signals — Watchtower OS v2 Integration

## Source
joshuatochinwachi Solana Game Signals 60M+ tx 12 games ML churn 14d >85% cross-game wallets funnel LTV

## Install
```bash
pip install solana-game-signals sklearn pandas
npm i @game-signals/sdk
```

## Watchtower Wiring
- server/modules/analytics/game-signals.js setupGameSignals ML churn 14d >85%
- API: GET /api/game-signals/config?gameId=ares1 GET /api/game-signals/health
- Indexer: LaserStream gRPC + Shyft REST callbacks + Custom PG PostgreSQL TimescaleDB Redis timeseries multitenant tenant_id RLS cross-game materialized view idempotency dedup cursor replay backfill gap finalized reconciliation parser versioning

## Features
- 60M+ tx 12 games dataset ML features transactions per wallet retention funnel
- Churn 14d prediction >85% accuracy Python sklearn RandomForest
- Common wallets funnel LTV cross-game retention which funnel brings most valuable
- SEO/GEO Blinks short videos whale radar TipLink vs payer LTV
- Campaign proposal POST /api/campaigns/proposals churn risk >0.7

## Quick Start Python
```python
from game_signals import GameSignalsClient
import sklearn.ensemble

client = GameSignalsClient(api_key="...")

# Load 60M+ tx dataset
dataset = client.load_dataset(games=12, tx_count=60_000_000)

# Train churn 14d model >85%
model = sklearn.ensemble.RandomForestClassifier()
model.fit(dataset.features, dataset.churn_14d_label)
# accuracy >85%

# Predict churn for wallet
risk = model.predict_proba(wallet_features) # churn risk >0.7 -> campaign proposal
if risk > 0.7:
  client.propose_campaign(wallet, campaign_type='retention', reward='0.1 SOL')

# Cross-game overlap
common_wallets = client.common_wallets(game_a='ares1', game_b='neonrelay')
funnel_ltv = client.funnel_ltv(funnel='SEO/GEO Blinks short videos whale radar TipLink vs payer')

# LTV cross-game retention
ltv = client.calculate_ltv(wallet, cross_game=True)
```

## JS SDK
```ts
import { GameSignals } from '@game-signals/sdk'
const gs = new GameSignals({ gameId: 'ares1' })
const churnRisk = await gs.predictChurn(wallet, horizonDays: 14) // >85% accuracy
const commonWallets = await gs.commonWallets(['ares1','aof','neonrelay','guttercaps'])
const funnelLTV = await gs.funnelLTV()
```

## Analytics Integration
- Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B mapping campaign_id solana_wallet
- GameSight ad->on-chain ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet link -> on-chain Anonymous Event wallet_id mint/buy/sell -> attribution Late ID Binding solana_wallet external_id POST /api/ingest/solana
- Events: PotatoHarvested RaceStarted RaceFinished CapShot PlayerJoined WalletConnected WagerCreated FighterSummoned BotCreated CrossChainLinked

## L2 & Infra
- Sonic HyperGrid high frequency + Sorada 5ms reads + Rush ECS declarative + REPLA + MagicBlock ER sub-10ms gasless Magic Actions
- ARC Entity-Component interoperability + Bolt FOCG verifiable + DePIN workers stake + Preset npx scaffold + Rust API Actix high-performance Track Watchtower

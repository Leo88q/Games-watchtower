# relayzero — Watchtower OS v3 Ideal Free Stack

## Category: AI Agents — Best Free Agent Economy Network

## Source
relayzero: TypeScript SDK for network agent economy RelayZero, allowing integration of agents into game processes

## Install
```bash
npm i relayzero-sdk
```

## Watchtower Wiring
- server/modules/ai/relayzero.js
- API: GET /api/ai/relayzero?gameId=ares1 GET /api/sdk/relayzero
- Ideal free: Best free agent economy network RelayZero integrating agents into game processes

## Quick Start
```ts
import { RelayZeroClient } from 'relayzero-sdk'

const relayzero = new RelayZeroClient({ gameId: 'ares1' })

await relayzero.integrateAgent({ gameId: 'ares1', agent: { id: 'harvest_bot' }, process: 'harvest' }) // agent into game process
// economy network agents trade collaborate
await relayzero.createEconomy({ gameId: 'ares1', agents: [agent1, agent2] })
```

## Comparison
- vs RitArena arena lifecycle retry events vs relayzero agent economy network — RitArena for arena management, relayzero for agent economy integration, complementary
- vs Husks autobattler vs relayzero — Husks for autobattler fighters, relayzero for economy network, complementary
- vs StealthSDK framework AI-games token STEALTH centralized economy vs relayzero decentralized agent economy network — StealthSDK centralized token economy, relayzero decentralized agent economy, complementary but distinct

## Ideal Free Stack AI Agents
- Husks + RitArena best free arena + relayzero agent economy + StealthSDK framework = ideal free AI agents

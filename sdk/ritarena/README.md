# RitArena SDK — Watchtower OS v3 Ideal Free Stack — Best Free Arena

## Category: AI Agents — Best Free Arena Lifecycle Retry Events (Replaces Aureus)

## Source
RitArena SDK: TypeScript SDK for creating arenas AI agents on Solana, where autonomous bots compete for prizes. Supports full lifecycle management arena with retry logic and event emission

## Install
```bash
npm i ritarena-sdk
```

## Watchtower Wiring
- server/modules/ai/ritarena.js
- API: GET /api/ai/ritarena?gameId=ares1 GET /api/sdk/ritarena
- Ideal free: Best free TypeScript SDK AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission, chosen over Aureus competitive duplicate

## Quick Start
```ts
import { RitArenaClient } from 'ritarena-sdk'

const ritarena = new RitArenaClient({ gameId: 'ares1' })

const arena = await ritarena.createArena({ gameId: 'ares1', name: 'arena_ares1', prize: '10 SOL' }) // full lifecycle
const bot = await ritarena.addBot({ arenaId: arena.id, bot: { strategy: 'harvest' } }) // autonomous bot
await ritarena.compete({ arenaId: arena.id }) // bots compete for prizes
// retry logic and event emission robust
ritarena.on('BotCompeted', (event) => console.log(event))
ritarena.on('ArenaFinished', (event) => console.log('prize', event.prize))
```

## Comparison — Competitive Duplicate Analysis
- vs Aureus Arena SDK AI arena autonomous bots SOL/AUR prizes tournament vs RitArena SDK AI agents arena autonomous bots compete prizes full lifecycle retry logic event emission — competitive duplicate, both AI arena, RitArena better free more complete lifecycle retry events, pick RitArena as best free, Aureus deprecated alternative
- vs Husks SDK AI autobattler NFT fighters procedural pixel INT8 — Husks autobattler, RitArena arena lifecycle, complementary not competitive
- vs relayzero agent economy network — relayzero for agent economy integration, RitArena for arena lifecycle, complementary
- vs StealthSDK framework AI-games token STEALTH centralized economy — StealthSDK framework economy, RitArena arena lifecycle, complementary

## Ideal Free Stack AI Agents
- Husks autobattler INT8 best free autobattler + RitArena arena lifecycle retry events best free arena chosen over Aureus + relayzero agent economy best free + StealthSDK framework token STEALTH best free framework = ideal free AI agents not garbage

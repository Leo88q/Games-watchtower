# Solana SLAM — Watchtower OS v3 Ideal Free Stack — Best Free Testing

## Category: Testing — Best Free Modular Tests LiteSVM Anchor Mocha

## Source
Solana SLAM: Framework for simplifying writing modular tests for Solana programs. Stack: Solana, LiteSVM, Anchor, Mocha

## Install
```bash
npm i solana-slam
```

## Watchtower Wiring
- server/modules/testing/solana-slam.js
- API: GET /api/testing/solana-slam?gameId=ares1 GET /api/sdk/solana-slam
- Ideal free: Best free framework simplifying modular tests Solana programs stack Solana LiteSVM Anchor Mocha, more modern LiteSVM better free testing

## Quick Start
```bash
slam test --program ./programs/cross_game_inventory
slam test --program ./programs/session_keys
```

```js
import { slam } from 'solana-slam'

describe('cross_game_inventory', () => {
  it('create_profile', async () => {
    const result = await slam.test({ program: 'cross_game_inventory', instruction: 'create_profile', accounts: {...} })
    expect(result).to.be.ok
  })
})
```

## Comparison
- vs create-solana-game template Jest Mocha Bankrun vs Solana SLAM LiteSVM Anchor Mocha — SLAM more modern LiteSVM better free testing framework, create-solana-game duplicate of solana-game-preset scaffold
- vs solana-game-preset official starter npx scaffold Anchor JS Unity vs SLAM testing framework — preset for scaffold, SLAM for testing, complementary not competitive

## Ideal Free Stack Testing
- solana-game-preset official starter scaffold Anchor JS Unity best free scaffold + Solana SLAM LiteSVM Anchor Mocha best free testing = ideal free stack testing, create-solana-game duplicate deprecated

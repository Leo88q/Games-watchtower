# Web/JS SDK — Watchtower OS

## Пакеты
```bash
npm install @solana/web3.js @solana/kit @solana/wallet-adapter-base @privy-io/react-auth @phantom/connect-kit @metaplex-foundation/mpl-bubblegum @metaplex-foundation/umi-bundle-defaults
```

## Identity — общий слой

### Privy — React SDK
```tsx
import { usePrivy, useCreateWallet, useSolanaWallets } from '@privy-io/react-auth';

function Login() {
  const { login, authenticated } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { wallets } = useSolanaWallets();

  useEffect(() => {
    if (authenticated && wallets.length === 0) {
      createWallet(); // автоматически создаёт Solana-кошелёк при первом входе, ключи в enclave, экспорт возможен
    }
  }, [authenticated, wallets]);

  return <button onClick={login}>Login email/social -> auto Solana wallet</button>;
}
```

### Phantom Connect Kit — OAuth + instant wallet
```ts
import { PhantomConnect } from '@phantom/connect-kit';
const phantom = new PhantomConnect({ appId: '...' });
const { publicKey } = await phantom.connect(); // OAuth-логин, мгновенное создание кошелька
```

### FirstStep — guest + gas sponsorship
```ts
import { FirstStep } from '@firststep/sdk';
const guestWallet = await FirstStep.createGuestWallet({ gameId: 'ares1' });
// Гостевой режим, спонсорство газа, потом upgrade to Privy/Phantom
```

### Altude — gasless relay
```ts
import { Altude } from '@altude/sdk';
const relayed = await Altude.relayTransaction({ transaction: txBase64, userWallet });
```

## Session Keys — JWT для Web3
```ts
import { createSession, signAndSendTransaction } from './watchtower-session-keys';

const session = await createSession({
  targetProgramPublicKey: gameProgramId,
  topUp: 0.01 * LAMPORTS_PER_SOL,
  expiryInMinutes: 60
});
// signAndSendTransaction подписывает без раскрытия приватного ключа основного кошелька
// Риск ограничен только временным keypair и средствами на нём (0.01 SOL)
const result = await signAndSendTransaction(session.sessionToken, tx);
```

## cNFT — $110 за 1M
```ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, mintV2 } from '@metaplex-foundation/mpl-bubblegum';

const umi = createUmi(rpc).use(mplBubblegum());
const assetId = await mintV2(umi, {
  merkleTree: merkleTreeAddress, // Merkle Tree
  collection: mccAddress, // MCC — Metaplex Certified Collection
  owner: wallet.publicKey,
  metadata: { name: 'Common Potato', uri: 'https://...' }
}).sendAndConfirm(umi);
// Данные off-chain, нет token/mint-аккаунта
// Magic Eden прекращает индексацию новых cNFT — используй Tensor Bubblegum v2
```

## Indexer — Helius LaserStream + Shyft
```ts
// Watchtower backend уже использует LaserStream gRPC + 24h replay + failover
// WebSocket для UI
// Helius DAS для нормализации метаданных
// Shyft Callback API для TOKEN_MINT, NFT_MINT -> вебхук на сервер
// Custom PG indexer для мультитенантной архитектуры

// Отправка события в Watchtower
await fetch('/api/ingest/solana', {
  method: 'POST',
  body: JSON.stringify({
    chain: 'solana',
    cluster: 'mainnet-beta',
    eventType: 'PlayerJoined',
    gameId: 'ares1',
    programId: 'CgInv111...',
    payload: { solana_wallet: walletAddress }, // for GameSight
    source: 'unity-sdk'
  })
});
```

## L2 — Sonic + REPLA + MagicBlock
```ts
// Sonic HyperGrid — выделенный грид, тысячи одновременных действий
import { SonicGrid } from '@sonic/sdk';
const grid = new SonicGrid({ gameId: 'ares1', apiKey: '...' });
await grid.execute(action); // isolated, no resource contention

// Sorada — 30-40x быстрее RPC, 5ms
const inventory = await sonic.sorada.getAssetsByOwner(wallet); // 5ms

// Rush ECS — декларативный
// описываете мир в конфигах, SDK генерирует контракты
const worldConfig = {
  entities: [{ name: 'Player', components: ['Position', 'Inventory'] }],
  systems: ['MovementSystem']
};

// REPLA — L3 с CLI
// repla-cli для запуска: repla init --game ares1, repla start --grid ...

// MagicBlock Ephemeral Rollups — sub-10ms + gasless
import { MagicBlock } from '@magicblock/sdk';
await magicBlock.delegateAccount(playerPda);
await magicBlock.executeGasless(tx); // <10ms, gasless, state returns to Solana
// Magic Actions — auto execution by triggers
await magicBlock.createAction({ trigger: { type: 'time', cron: '*/5 * * * *' }, instruction: 'harvest' });
```

## Analytics — Helika + GameSight
```ts
// Helika — кросс-игровой дашборд, Web2 + in-game + on-chain, 10+ сетей
// Осторожно: смещает фокус в AI-продукты
await helika.track('session_started', { campaign_id, solana_wallet });

// GameSight — сквозная атрибуция ad -> on-chain
// Нужно передавать solana_wallet как external_id (Late ID Binding)
// On-chain события приходят как Anonymous Events с Wallet ID
await fetch('/api/ingest/solana', {
  body: JSON.stringify({
    eventType: 'PlayerJoined',
    payload: {
      solana_wallet: walletAddress, // external_id for GameSight
      gamesight_click_id: clickId
    }
  })
});
// Отслеживает mint, buy, sell, transfer, burn
```

## Marketplace — ME + Shyft + GameShift
```ts
// Magic Eden — 120 QPM free, Bearer for instructions, MCC + Merkle Trees for cNFT
const meInstruction = await fetch('https://api-mainnet.magiceden.dev/v2/instructions/sell', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ mint, price, seller, mccAddress, merkleTreeAddresses })
});

// Shyft — escrow-less, NFT остаётся в кошельке до продажи, in-app marketplace за несколько дней, stats API
await fetch('https://api.shyft.to/sol/v1/marketplace/list', {
  method: 'POST',
  headers: { 'x-api-key': shyftKey },
  body: JSON.stringify({ marketplace_address, nft_address, price, seller })
});

// GameShift — API-first, без знания блокчейна, 4 вертикали: self-custodial wallet, asset creation, trading USD, payments 170+ стран 100% chargeback protection, газ берёт на себя
import { GameShift } from '@gameshift/sdk';
const gs = new GameShift({ apiKey: '...' });
const user = await gs.users.create(); // self-custodial
const asset = await gs.assets.create({ collectionId, name, imageUrl }); // без знания блокчейна
const listing = await gs.marketplace.list({ assetId, priceUsd: 10 }); // USD
const purchase = await gs.payments.checkout({ listingId, userId }); // 170+ стран
```

## Watchtower OS Config
```ts
// studio.config.json
{
  "tenants": ["ares1", "aof", "neonrelay", "guttercaps"],
  "identity": { "providers": ["privy", "phantom-connect", "firststep", "altude"], "crossGamePda": "studio_profile" },
  "sessionKeys": { "defaultTopUp": 0.01, "defaultExpiry": 60 },
  "assets": { "mass": "cNFT $110/M", "rare": "standard NFT", "marketplaces": ["tensor", "shyft", "gameshift"] },
  "indexer": { "laserstream": "gRPC 24h replay failover", "websocket": "UI realtime", "shyft": "REST callbacks", "customPg": "PostgreSQL" },
  "l2": { "highFreq": "Sonic HyperGrid", "casual": "REPLA/MagicBlock", "reads": "Sorada 5ms" },
  "analytics": { "dashboard": "Helika", "attribution": "GameSight Late ID Binding" },
  "marketplace": { "cnft": "Tensor Bubblegum v2", "standard": "ME+Tensor", "inApp": "Shyft escrow-less", "usd": "GameShift" }
}
```

# Промт для Web/Frontend команды — интеграция с Watchtower OS

## Роль
Ты Web разработчик (React/Next.js) в Leo Games Studio. Делаешь лендинги, браузерные игры, in-app маркетплейс, админку.

## Что уже есть
- Watchtower OS 7 слоёв
- Web SDK: @solana/web3.js, @solana/kit — база для браузерных игр и лендингов
- Identity: Privy React SDK (useCreateWallet, useSolanaWallets, email/social, enclave export) + Phantom Connect Kit OAuth + FirstStep guest gas sponsorship + Altude gasless relay
- Session Keys: createSession(targetProgram, topUp, expiry) + signAndSendTransaction
- Assets: cNFT $110/M off-chain Merkle Tree MCC Bubblegum v2 Tensor fallback ME deprecated + Standard
- Indexer: Helius LaserStream gRPC 24h replay failover WS DAS Priority Fee Webhooks + Shyft REST callbacks accelerated gPA p50 15ms + Custom PG
- L2: Sonic HyperGrid dedicated grid thousands actions Sorada 5ms 30-40x Rush ECS declarative REPLA repla-cli L3 Anchor settle MagicBlock sequencer MagicBlock ER sub-10ms gasless Magic Actions triggers
- Analytics: Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B 10+ сетей Yuga Labs Treasure осторожно AI фокус + GameSight Anonymous Events Wallet ID solana_wallet as external_id Late ID Binding mint buy sell transfer burn
- Marketplace: Magic Eden REST инструкции листинг покупка ставки 120 QPM free Bearer MCC+MT cNFT + Shyft escrow-less NFT в кошельке до продажи in-app за дни stats API + GameShift API-first без знания блокчейна self-custodial wallet asset creation trading USD payments 170+ стран 100% chargeback газ берёт на себя

## Задачи

### 1. Установка
```bash
npm install @solana/web3.js @solana/kit @solana/wallet-adapter-base @privy-io/react-auth @phantom/connect-kit @metaplex-foundation/mpl-bubblegum @metaplex-foundation/umi-bundle-defaults @gameshift/sdk @shyft/sdk
```

### 2. Identity — Privy + Phantom + FirstStep + Altude unified
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
  }, [authenticated]);

  return <button onClick={login}>Login email/social -> auto Solana wallet</button>;
}

// Phantom Connect Kit — OAuth, instant wallet
import { PhantomConnect } from '@phantom/connect-kit';
const { publicKey } = await new PhantomConnect({ appId: '...' }).connect();

// FirstStep — guest mode + gas sponsorship
import { FirstStep } from '@firststep/sdk';
const guestWallet = await FirstStep.createGuestWallet({ gameId: 'neonrelay' });

// Altude — gasless relay
import { Altude } from '@altude/sdk';
await Altude.relayTransaction({ transaction: txBase64, userWallet });
```

Требования:
- Onboarding flow: guest (FirstStep) -> embedded (Privy) -> native (Phantom) -> linked cross-game PDA studio_profile
- Все кошельки линкуются в cross-game профиль

### 3. Session Keys — JWT для Web3
```ts
import { createSession, signAndSendTransaction } from './watchtower-session-keys';

const session = await createSession({
  targetProgramPublicKey: gameProgramId, // CgInv111...
  topUp: 0.01 * LAMPORTS_PER_SOL, // риск ограничен только этим
  expiryInMinutes: 60
});
// signAndSendTransaction без раскрытия приватного ключа основного кошелька
const result = await signAndSendTransaction(session.sessionToken, gameActionTx);
// API: POST /api/session-keys/create, POST /api/session-keys/sign, POST /api/session-keys/revoke
```

### 4. Assets — cNFT $110/M
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
// Off-chain, нет token/mint аккаунта
// Magic Eden прекращает индексацию новых cNFT — Tensor Bubblegum v2
// Shyft escrow-less, GameShift USD

// Strategy
const strategy = await fetch('/api/assets/strategy?gameId=neonrelay&itemType=common&rarity=common').then(r=>r.json());
// recommendation: cNFT $110/M x10000 cheaper
```

### 5. Indexer — отправка событий в Watchtower
```ts
await fetch('/api/ingest/solana', {
  method: 'POST',
  body: JSON.stringify({
    chain: 'solana',
    cluster: 'mainnet-beta',
    eventType: 'PlayerJoined', // WalletConnected, SessionStarted, etc
    gameId: 'neonrelay',
    programId: 'CgInv111...',
    payload: {
      solana_wallet: walletAddress, // важно для GameSight Late ID Binding!
      sessionId: session.sessionToken,
    },
    source: 'web-sdk'
  })
});
// Canonical identity: cluster+slot+signature+instructionIndex+innerIndex
// Watchtower backend: LaserStream gRPC 24h replay failover + WS + DAS + Shyft callbacks + PG
```

### 6. L2 — Sonic + REPLA + MagicBlock
```ts
// Sonic HyperGrid — dedicated grid, thousands concurrent no contention
import { SonicGrid } from '@sonic/sdk';
const grid = new SonicGrid({ gameId: 'neonrelay', apiKey: '...' });
await grid.execute(action);

// Sorada — 30-40x faster reads, 5ms
const inventory = await sonic.sorada.getAssetsByOwner(wallet); // 5ms leaderboard inventory

// Rush ECS — declarative world config -> SDK generates contracts
const worldConfig = { entities: [{ name: 'Player', components: ['Position', 'Inventory'] }], systems: ['MovementSystem'] };

// REPLA — L3 with CLI repla-cli
// repla init --game neonrelay, repla start --grid ...

// MagicBlock ER — sub-10ms gasless + Magic Actions triggers
import { MagicBlock } from '@magicblock/sdk';
await magicBlock.delegateAccount(playerPda);
await magicBlock.executeGasless(tx); // <10ms gasless state returns to Solana
await magicBlock.createAction({ trigger: { type: 'time', cron: '*/5 * * * *' }, instruction: 'harvest' });

// Router
const route = await fetch('/api/l2/router?gameId=neonrelay&tps=high').then(r=>r.json());
// { provider: "sonic-svm", component: "HyperGrid", reason: "high tps need isolation" }
```

### 7. Analytics — Helika + GameSight
```ts
// Helika — cross-game dashboard Web2 in-game on-chain
await helika.track('session_started', { campaign_id, solana_wallet });

// GameSight — сквозная атрибуция ad -> on-chain
// Для атрибуции нужно передавать solana_wallet как external_id (Late ID Binding)
// On-chain события как Anonymous Events с Wallet ID, отслеживает mint buy sell transfer burn
await fetch('/api/ingest/solana', {
  body: JSON.stringify({
    eventType: 'PlayerJoined',
    payload: {
      solana_wallet: walletAddress, // external_id!
      gamesight_click_id: clickIdFromUrl // from ad URL
    }
  })
});
// Flow: ad_click (gamesight_click_id) -> PlayerJoined (external_id: gamesight_click_id) -> WalletConnected (solana_wallet) -> mint/buy/sell Anonymous Event Wallet ID -> attribution ad_click -> wallet -> mint
```

### 8. Marketplace — ME + Shyft + GameShift
```ts
// Magic Eden — 120 QPM free public reads, Bearer for instructions, MCC + Merkle Trees for cNFT
const meIx = await fetch('https://api-mainnet.magiceden.dev/v2/instructions/sell', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ mint, price, seller, mccAddress, merkleTreeAddresses })
}).then(r=>r.json());
// Client signs via Session Key

// Shyft — escrow-less NFT остаётся в кошельке до продажи, in-app marketplace за несколько дней, stats API в один вызов
await fetch('https://api.shyft.to/sol/v1/marketplace/list', {
  method: 'POST',
  headers: { 'x-api-key': shyftKey },
  body: JSON.stringify({ marketplace_address, nft_address, price, seller })
});

// GameShift — API-first без знания блокчейна, self-custodial wallet asset creation trading USD payments 170+ стран 100% chargeback газ берёт на себя
import { GameShift } from '@gameshift/sdk';
const gs = new GameShift({ apiKey: '...' });
const user = await gs.users.create(); // self-custodial
const asset = await gs.assets.create({ collectionId, name, imageUrl }); // без знания блокчейна
const listing = await gs.marketplace.list({ assetId, priceUsd: 10 }); // USD
const purchase = await gs.payments.checkout({ listingId, userId }); // 170+ стран

// Router
const mpRoute = await fetch('/api/marketplace/router?gameId=neonrelay&assetType=cnft').then(r=>r.json());
// { routes: [{ marketplace: "tensor", reason: "Bubblegum v2", priority: 1 }, { marketplace: "shyft", reason: "escrow-less" }, ...] }
```

### 9. In-app Marketplace UI — за несколько дней via Shyft + GameShift
- Shyft: создай marketplace для каждой игры POST /sol/v1/marketplace/create, потом list/buy/unlist escrow-less
- GameShift: для USD checkout — не крипто пользователи покупают в USD, 170+ стран
- Magic Eden: для публичных листингов стандартных NFT, 120 QPM free
- Tensor: для cNFT Bubblegum v2 (ME deprecated для новых cNFT)

### 10. Cross-game PDA
```ts
// Anchor контракт CgInv111... — общие PDA для кросс-игрового инвентаря
const [profilePda] = PublicKey.findProgramAddressSync([Buffer.from("studio_profile"), ownerPubkey.toBuffer()], programId);
await program.methods.createProfile("neonrelay").accounts({ profile: profilePda, owner }).rpc();
await program.methods.addCrossGameItem(assetId, "neonrelay", "skin", "common", true).accounts({ profile: profilePda, owner }).rpc();
await program.methods.linkItemToGame(assetId, "ares1").accounts({ profile: profilePda, owner }).rpc();
```

### 11. Что сдать
- Web app (Next.js/React) с Privy login + Session Keys + cNFT mint + marketplace UI
- WATCHTOWER_INTEGRATION.md game_id program_ids network stage data_quality
- Devnet tx: session key, cNFT assetId, marketplace listing, USD purchase via GameShift
- ENV имена без значений
- Запрет: no private keys в Watchtower, read-only, writes via client signing + gasless relay

API: /api/os/config, /api/sdk/web?gameId=neonrelay, /api/identity/health, /api/assets/strategy, /api/l2/router, /api/marketplace/router, /api/ingest/solana

Детали: sdk/web/README.md, docs/os/

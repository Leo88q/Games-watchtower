/**
 * Web/JS — @solana/web3.js, @solana/kit — база для браузерных игр и лендингов
 */

export const WEB_SDK_CONFIG = {
  engine: 'web',
  packages: ['@solana/web3.js', '@solana/kit', '@solana/wallet-adapter', '@privy-io/react-auth', '@phantom/connect-kit'],
  features: {
    web3js: true,
    kit: true, // new @solana/kit
    walletAdapter: true,
    privy: true,
    phantom: true,
    sessionKeys: true,
    cnft: true,
  },
}

export function webSdkSetup({ gameId, framework = 'react' } = {}) {
  return {
    engine: 'web',
    framework,
    gameId,
    packages: WEB_SDK_CONFIG.packages,
    install: {
      npm: `npm install ${WEB_SDK_CONFIG.packages.join(' ')}`,
      yarn: `yarn add ${WEB_SDK_CONFIG.packages.join(' ')}`,
    },
    codeExamples: {
      kit: `
// @solana/kit — new base for browser games
import { createSolanaRpc, createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';

const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
const { value: balance } = await rpc.getBalance(walletAddress).send();
`,
      web3js: `
import { Connection, PublicKey } from '@solana/web3.js';
const connection = new Connection('https://api.mainnet-beta.solana.com');
const balance = await connection.getBalance(publicKey);
`,
      privy: `
import { usePrivy, useCreateWallet, useSolanaWallets } from '@privy-io/react-auth';

function GameLogin() {
  const { login, authenticated } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { wallets } = useSolanaWallets();

  useEffect(() => {
    if (authenticated && wallets.length === 0) {
      createWallet(); // автоматически создаёт Solana-кошелёк при первом входе
    }
  }, [authenticated]);

  return <button onClick={login}>Login via email/social -> auto Solana wallet</button>;
}
`,
      sessionKeys: `
import { createSession, signAndSendTransaction } from '@watchtower/session-keys';

const session = await createSession({
  targetProgramPublicKey: gameProgramId,
  topUp: 0.01 * LAMPORTS_PER_SOL,
  expiryInMinutes: 60
});

// Теперь без подтверждения каждой транзакции
const tx = await signAndSendTransaction(session.sessionToken, gameActionTx);
`,
      cnft: `
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';

const umi = createUmi(rpc).use(mplBubblegum());
const assetId = await mintV2(umi, {
  merkleTree: merkleTreeAddress,
  collection: mccAddress,
  owner: wallet.publicKey,
  metadata: { name: 'Common Potato', uri: 'https://...' }
}).sendAndConfirm(umi);
`,
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      identity: 'Privy + Phantom + FirstStep unified',
      analytics: 'Helika + GameSight via solana_wallet as external_id',
      marketplace: 'Magic Eden + Shyft + GameShift',
    },
    writes: false,
  }
}

export function webHealth(env = process.env) {
  return {
    engine: 'web',
    packages: WEB_SDK_CONFIG.packages,
    configured: true,
    features: WEB_SDK_CONFIG.features,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

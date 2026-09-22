/**
 * Unity (Solana.Unity-SDK) — ключевой инструмент для мобильных и мультиплатформенных игр
 * Поддерживает NFT, RPC, Candy Machine, Phantom deep links, WebGL, Mobile Wallet Adapter и сессионные ключи
 */

export const UNITY_SDK_CONFIG = {
  engine: 'unity',
  sdk: 'Solana.Unity-SDK',
  package: 'com.solana.unity-sdk',
  platforms: ['iOS', 'Android', 'WebGL', 'Windows', 'macOS'],
  features: {
    nft: true,
    rpc: true,
    candyMachine: true,
    phantomDeepLinks: true,
    webGl: true,
    mobileWalletAdapter: true,
    sessionKeys: true, // для автоматического подтверждения транзакций
  },
  repo: 'https://github.com/michaelhly/Solana.Unity-SDK',
}

export function unitySdkSetup({ gameId, cluster = 'mainnet-beta' } = {}) {
  return {
    engine: 'unity',
    sdk: UNITY_SDK_CONFIG.sdk,
    gameId,
    cluster,
    install: {
      upm: `Add package via UPM: ${UNITY_SDK_CONFIG.package}`,
      git: `https://github.com/michaelhly/Solana.Unity-SDK.git`,
    },
    configuration: {
      rpcUrl: `https://api.${cluster}.solana.com`,
      wsUrl: `wss://api.${cluster}.solana.com`,
      commitment: 'confirmed',
    },
    features: UNITY_SDK_CONFIG.features,
    codeExamples: {
      connectPhantomDeepLink: `
using Solana.Unity.SDK;
using Solana.Unity.Wallet;

var wallet = await PhantomDeepLink.Connect();
Debug.Log($"Connected: {wallet.Account.PublicKey}");
`,
      sessionKeys: `
// Сессионные ключи для автоматического подтверждения транзакций
var session = await SessionKeys.CreateSession(
  targetProgramPublicKey: new PublicKey("${gameId}Program..."),
  topUp: 0.01f,
  expiryInMinutes: 60
);
// Теперь транзакции подписываются автоматически без подтверждения каждой
var result = await session.SignAndSendTransaction(transaction);
`,
      nftFetch: `
var nft = await Nft.TryGetNftData(mintAddress, rpcClient);
var cNft = await cNftService.GetCompressedNft(assetId); // cNFT via DAS
`,
      candyMachine: `
var cm = await CandyMachineV3.GetCandyMachine(candyMachineId, rpcClient);
var mintResult = await cm.MintNft(wallet.Account);
`,
      mwa: `
// Mobile Wallet Adapter для Android
var mwaWallet = new MobileWalletAdapterWallet();
await mwaWallet.Connect();
`,
    },
    watchtowerIntegration: {
      endpoint: 'https://watchtower.studio/api/ingest/solana',
      identity: 'Privy + Session Keys unified',
      events: ['PlayerJoined', 'SessionStarted', 'RewardClaimed', 'AssetTransferred'],
    },
    writes: false,
  }
}

export function unityHealth(env = process.env) {
  return {
    engine: 'unity',
    sdk: UNITY_SDK_CONFIG.sdk,
    configured: true, // SDK itself is always available, config depends on game
    platforms: UNITY_SDK_CONFIG.platforms,
    features: UNITY_SDK_CONFIG.features,
    integration: {
      sessionKeys: 'из коробки',
      mwa: true,
      phantomDeepLinks: true,
      watchtower: 'via WebGL bridge + RPC',
    },
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

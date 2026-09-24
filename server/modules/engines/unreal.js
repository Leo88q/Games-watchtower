/**
 * Unreal Engine — VAR META и Bifrost
 * VAR META — открытый SDK для взаимодействия с контрактами и управления кошельками прямо в движке
 * Bifrost использует C# (Solnet), C++ и Blueprints, поддерживает минтинг Metaplex NFT и встроенные игровые платежи
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'

export const UNREAL_SDK_CONFIG = {
  engine: 'unreal',
  sdks: [
    {
      name: 'VAR META',
      type: 'open SDK',
      features: ['contract interaction', 'wallet management in-engine'],
      repo: 'https://github.com/var-meta',
    },
    {
      name: 'Bifrost',
      type: 'C# (Solnet) + C++ + Blueprints',
      features: ['Metaplex NFT minting', 'in-game payments', 'wallet connect'],
      stack: ['Solnet C#', 'C++', 'Blueprints'],
    }
  ],
  platforms: ['Windows', 'macOS', 'iOS', 'Android'],
}

export function unrealSdkSetup({ gameId, sdkChoice = 'var-meta' } = {}) {
  const sdk = UNREAL_SDK_CONFIG.sdks.find(s => s.name.toLowerCase().includes(sdkChoice)) || UNREAL_SDK_CONFIG.sdks[0]
  return {
    engine: 'unreal',
    sdk: sdk.name,
    gameId,
    install: {
      varMeta: 'Clone VAR META SDK into Plugins/, enable in .uproject',
      bifrost: 'Import Bifrost via Marketplace or GitHub, requires Solnet C# bridge',
    },
    features: sdk.features,
    codeExamples: {
      varMetaBlueprint: `
// VAR META — Blueprints
// 1. Create Wallet Node -> Connect Wallet
// 2. Call Contract Node: Program ID + Instruction + Accounts
// 3. On Success -> Update UI

// C++ example
#include "VarMeta.h"
UVarMetaWallet* Wallet = UVarMetaWallet::CreateWallet();
Wallet->Connect(FVarMetaWalletConnectDelegate::CreateLambda([](FString PubKey) {
  UE_LOG(LogTemp, Log, TEXT("Connected: %s"), *PubKey);
}));
`,
      bifrostCSharp: `
// Bifrost — C# (Solnet) + Blueprints
using Solnet.Wallet;
using Metaplex;

var wallet = new Wallet();
var metaplex = new MetaplexClient(rpcClient);
var nft = await metaplex.MintNft(wallet.Account, metadata);

// In-game payments
var paymentResult = await BifrostPayment.ProcessPayment(wallet, amount, gameTreasury);
`,
      sessionKeysUnreal: `
// Session Keys в Unreal — временный keypair для частых действий
FKeypair SessionKey = FKeypair::GenerateRandom();
FTransaction Tx = BuildGameActionTx(SessionKey.PublicKey, "move");
Tx.Sign(SessionKey);
RpcClient.SendTransaction(Tx);
`,
    },
    watchtowerIntegration: {
      endpoint: 'https://watchtower.studio/api/ingest/solana',
      method: 'HTTP from C++ or Blueprint HTTP request node',
      events: ['MatchStarted', 'MatchFinished', 'RewardClaimed'],
    },
    writes: false,
  }
}

export function unrealHealth(env = process.env) {
  return {
    engine: 'unreal',
    sdks: UNREAL_SDK_CONFIG.sdks,
    configured: false,
    configurationReason: 'Плагин Unreal устанавливается в проект игры, а не в хаб',
    platforms: UNREAL_SDK_CONFIG.platforms,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

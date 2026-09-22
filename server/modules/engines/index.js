/**
 * Engine SDKs Layer — Unity + Godot + Unreal + Turbo + Web + Godot Solana SDK detailed + Gamba + Solana Game Preset
 */

import { unitySdkSetup, unityHealth, UNITY_SDK_CONFIG } from './unity.js'
import { godotSdkSetup, godotHealth, GODOT_SDK_CONFIG } from './godot.js'
import { unrealSdkSetup, unrealHealth, UNREAL_SDK_CONFIG } from './unreal.js'
import { turboSdkSetup, turboHealth, TURBO_SDK_CONFIG } from './turbo.js'
import { webSdkSetup, webHealth, WEB_SDK_CONFIG } from './web.js'
import { godotSolanaSdkSetup, godotSolanaSdkHealth, GODOT_SOLANA_SDK_DETAILED } from './godot-solana-sdk.js'
import { gambaSdkSetup, gambaHealth, GAMBA_SDK_CONFIG } from './gamba.js'
import { solanaGamePresetSetup, solanaGamePresetHealth, SOLANA_GAME_PRESET_CONFIG } from './solana-game-preset.js'

export function enginesLayerConfig(env = process.env) {
  return {
    layer: 'engines',
    sdks: {
      unity: { ...UNITY_SDK_CONFIG, setup: unitySdkSetup({ gameId: 'generic' }) },
      godot: { ...GODOT_SDK_CONFIG, setup: godotSdkSetup({ gameId: 'generic' }) },
      unreal: { ...UNREAL_SDK_CONFIG, setup: unrealSdkSetup({ gameId: 'generic' }) },
      turbo: { ...TURBO_SDK_CONFIG, setup: turboSdkSetup({ gameId: 'generic' }) },
      web: { ...WEB_SDK_CONFIG, setup: webSdkSetup({ gameId: 'generic' }) },
      // v2
      godotSolanaDetailed: { ...GODOT_SOLANA_SDK_DETAILED, setup: godotSolanaSdkSetup({ gameId: 'generic' }) },
      gamba: { ...GAMBA_SDK_CONFIG, setup: gambaSdkSetup({ gameId: 'generic' }) },
      preset: { ...SOLANA_GAME_PRESET_CONFIG, setup: solanaGamePresetSetup({ gameId: 'generic' }) },
    },
    strategy: {
      mobileMultiplatform: 'Unity (Solana.Unity-SDK) — ключевой инструмент, NFT, RPC, Candy Machine, Phantom deep links, WebGL, MWA, Session Keys + Solana Game Preset Unity client scaffold',
      godot: 'GDExtension для Godot 4.3+, узлы Solana/SPL/Candy Machine/Anchor, осторожно на mainnet — нет аудита + Godot Solana SDK detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders легковесный полный контроль',
      godotDetailed: 'Godot Solana SDK Virus-Axel — GDExtension SolanaClient WalletAdapter AnchorProgram SPL Candy Machine builders — легковесный движок полный контроль ончейн-логики',
      unreal: 'VAR META открытый SDK + Bifrost C# Solnet C++ Blueprints, Metaplex NFT минтинг, встроенные платежи',
      rust: 'Turbo.Computer — лёгкий движок, полная RPC поддержка, AI-инструменты генерации игр',
      web: '@solana/web3.js, @solana/kit — база для браузерных игр и лендингов + Gamba SDK betting casino React hooks UI framework provably fair + Husks AI autobattler + Aureus AI arena + RACE multichain',
      betting: 'Gamba SDK monorepo betting casino core React hooks UI framework provably fair — идеально для ставок казино механик GUTTERCAPS wager PvP Neon Relay prize pools',
      scaffold: 'Solana Game Preset official starter Solana Foundation npx preset Anchor + JS + Unity scaffold rapid prototyping',
    },
    sessionKeysSupport: {
      unity: 'из коробки',
      godot: 'аналог через временный keypair + WalletAdapter',
      unreal: 'временный keypair',
      turbo: 'Rust keypair',
      web: 'custom @watchtower/session-keys',
      gamba: 'session key for frequent wagers 0.01 SOL',
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function enginesHealth(env = process.env) {
  return {
    layer: 'engines',
    generatedAt: new Date().toISOString(),
    unity: unityHealth(env),
    godot: godotHealth(env),
    unreal: unrealHealth(env),
    turbo: turboHealth(env),
    web: webHealth(env),
    // v2
    godotSolanaDetailed: godotSolanaSdkHealth(env),
    gamba: gambaHealth(env),
    preset: solanaGamePresetHealth(env),
    summary: enginesLayerConfig(env),
    writes: false,
  }
}

export { UNITY_SDK_CONFIG, GODOT_SDK_CONFIG, UNREAL_SDK_CONFIG, TURBO_SDK_CONFIG, WEB_SDK_CONFIG, GODOT_SOLANA_SDK_DETAILED, GAMBA_SDK_CONFIG, SOLANA_GAME_PRESET_CONFIG }
export { unitySdkSetup, godotSdkSetup, unrealSdkSetup, turboSdkSetup, webSdkSetup, godotSolanaSdkSetup, gambaSdkSetup, solanaGamePresetSetup }

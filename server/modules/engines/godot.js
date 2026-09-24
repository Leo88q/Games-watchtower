/**
 * Godot (godot-solana-sdk) — GDExtension для Godot 4.3+
 * Добавляет узлы для работы с Solana, SPL-токенами, Candy Machine и Anchor-программами
 * Требует осторожности при работе с mainnet из-за отсутствия аудита безопасности
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'

export const GODOT_SDK_CONFIG = {
  engine: 'godot',
  sdk: 'godot-solana-sdk',
  type: 'GDExtension',
  minVersion: '4.3+',
  nodes: ['SolanaClient', 'Keypair', 'SPLToken', 'CandyMachine', 'AnchorProgram'],
  features: {
    solanaNodes: true,
    splTokens: true,
    candyMachine: true,
    anchorPrograms: true,
  },
  warning: 'Требует осторожности при работе с mainnet из-за отсутствия аудита безопасности',
  repo: 'https://github.com/Virus-Axel/godot-solana-sdk',
}

export function godotSdkSetup({ gameId, cluster = 'devnet' } = {}) {
  return {
    engine: 'godot',
    sdk: GODOT_SDK_CONFIG.sdk,
    gameId,
    cluster,
    install: {
      godotAssetLib: 'godot-solana-sdk GDExtension',
      manual: 'Copy addons/solana-sdk to project',
    },
    nodes: GODOT_SDK_CONFIG.nodes,
    warning: GODOT_SDK_CONFIG.warning,
    codeExamples: {
      gdscriptClient: `
# Godot 4.3+ GDScript
var client = SolanaClient.new("https://api.devnet.solana.com")
var keypair = Keypair.new_random()
var balance = await client.get_balance(keypair.get_pubkey())

# SPL Token
var token = SplToken.new(client, mint_address)
var token_balance = await token.get_balance(keypair.get_pubkey())

# Anchor program
var anchor_program = AnchorProgram.new(client, program_id, idl)
var result = await anchor_program.call("harvest_potato", [field_pda], keypair)
`,
      candyMachine: `
var cm = CandyMachine.new(client, candy_machine_id)
var nft = await cm.mint(keypair)
`,
      sessionKeysEquivalent: `
# Session Keys аналог в Godot — создаем временный keypair с ограниченным балансом
var session_keypair = Keypair.new_random()
# Airdrop 0.01 SOL для сессии
await client.request_airdrop(session_keypair.get_pubkey(), 10000000)
# Используем для частых действий
var tx = await anchor_program.call("move_player", [session_keypair.get_pubkey()], session_keypair)
`,
    },
    security: {
      audit: 'отсутствует аудит безопасности — mainnet с осторожностью',
      recommendation: 'Использовать только для devnet/beta, для mainnet — дополнительный аудит + multisig + session keys с лимитом 0.01 SOL',
    },
    watchtowerIntegration: {
      endpoint: 'https://watchtower.studio/api/ingest/solana',
      events: ['PlayerJoined', 'SessionStarted', 'AssetTransferred'],
      adapter: 'godot -> HTTP -> Watchtower inbox',
    },
    writes: false,
  }
}

export function godotHealth(env = process.env) {
  return {
    engine: 'godot',
    sdk: GODOT_SDK_CONFIG.sdk,
    type: GODOT_SDK_CONFIG.type,
    minVersion: GODOT_SDK_CONFIG.minVersion,
    configured: false,
    configurationReason: 'GDExtension для Godot устанавливается в проект игры, а не в хаб',
    nodes: GODOT_SDK_CONFIG.nodes,
    warning: GODOT_SDK_CONFIG.warning,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

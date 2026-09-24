/**
 * Godot Solana SDK (Virus-Axel/godot-solana-sdk) — детальная версия
 * GDExtension для Godot с нативными нодами: SolanaClient, WalletAdapter, AnchorProgram, Candy Machine + SPL builders
 * Легковесный движок с полным контролем над ончейн-логикой
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'

export const GODOT_SOLANA_SDK_DETAILED = {
  engine: 'godot',
  sdk: 'godot-solana-sdk',
  repo: 'https://github.com/Virus-Axel/godot-solana-sdk',
  author: 'Virus-Axel',
  type: 'GDExtension',
  minVersion: '4.3+',
  nodes: {
    SolanaClient: 'RPC client — getBalance, getAccountInfo, sendTransaction, confirm',
    WalletAdapter: 'Phantom, Solflare, Backpack adapter via WalletAdapter standard',
    AnchorProgram: 'IDL-based program caller — call methods, fetch accounts, events',
    Keypair: 'Generate random, from seed, from private key, pubkey derivation',
    SPLToken: 'SPL Token builder — create mint, transfer, approve, burn',
    CandyMachine: 'Candy Machine v2/v3 builder — mint NFT, fetch config',
    SystemProgram: 'System instructions — createAccount, transfer',
  },
  builders: {
    candyMachine: ['createCandyMachine', 'mintNft', 'updateCandyMachine', 'fetchCandyMachine'],
    spl: ['createMint', 'createTokenAccount', 'mintTo', 'transfer', 'burn', 'approve'],
    system: ['transfer', 'createAccount', 'assign'],
    anchor: ['call method via IDL', 'fetch account via IDL', 'subscribe events'],
  },
  features: {
    lightweight: true,
    fullControl: true,
    nativeNodes: true,
    walletAdapter: true,
    anchor: true,
    candyMachine: true,
    spl: true,
  },
  warning: 'Требует осторожности на mainnet — нет аудита безопасности',
}

export function godotSolanaSdkSetup({ gameId, cluster = 'devnet' } = {}) {
  return {
    engine: 'godot',
    sdk: GODOT_SOLANA_SDK_DETAILED.sdk,
    gameId,
    cluster,
    install: {
      assetLib: 'godot-solana-sdk from AssetLib or GitHub',
      manual: 'Copy addons/solana-sdk/ to project, enable GDExtension in ProjectSettings',
      gdextension: '[gdextension]\nentry_symbol=\"gdexample_library_init\"\ncompatibility_minimum=4.3',
    },
    nodes: GODOT_SOLANA_SDK_DETAILED.nodes,
    builders: GODOT_SOLANA_SDK_DETAILED.builders,
    codeExamples: {
      client: `
var client = SolanaClient.new("https://api.devnet.solana.com")
var keypair = Keypair.new_random()
var pubkey = keypair.get_pubkey()
var balance = await client.get_balance(pubkey)
print("Balance: ", balance)
`,
      walletAdapter: `
var wallet_adapter = WalletAdapter.new()
wallet_adapter.set_adapter("phantom") # phantom, solflare, backpack
var connected = await wallet_adapter.connect()
var wallet_pubkey = wallet_adapter.get_pubkey()
# Теперь можно подписывать через адаптер
var signed_tx = await wallet_adapter.sign_transaction(tx)
`,
      anchor: `
var idl = load_idl("res://idl/cross_game_inventory.json")
var program_id = "CgInv111111111111111111111111111111111111111"
var anchor_program = AnchorProgram.new(client, program_id, idl)

# Call create_profile
var profile_pda = await anchor_program.find_pda(["studio_profile", wallet_pubkey], program_id)
var result = await anchor_program.call("create_profile", ["aof"], { "profile": profile_pda, "owner": wallet_pubkey }, keypair)

# Fetch account
var profile = await anchor_program.fetch_account("StudioProfile", profile_pda)
print(profile.total_games_played)

# Subscribe events
anchor_program.subscribe_event("ProfileCreated", func(event): print(event))
`,
      candyMachine: `
var cm_id = "CANDY_M123..."
var cm = CandyMachine.new(client, cm_id)
var config = await cm.fetch_config()
print("Items available: ", config.items_available)
var nft_mint = await cm.mint(keypair) # mint via Candy Machine v3
`,
      spl: `
var mint = "MINT123..."
var token = SplToken.new(client, mint)
var ata = await token.get_associated_token_address(wallet_pubkey)
var bal = await token.get_balance(wallet_pubkey)
print("Token balance: ", bal)
var transfer_result = await token.transfer(wallet_pubkey, dest_pubkey, 100, keypair)
`,
      sessionKeysGodot: `
# Session Keys аналог — временный keypair 0.01 SOL для частых действий
var session_keypair = Keypair.new_random()
await client.request_airdrop(session_keypair.get_pubkey(), 10000000) # 0.01 SOL
# Scope: только game actions, no treasury
var tx = await anchor_program.call("harvest_potato", [field_pda], session_keypair)
# Риск только 0.01 SOL, как JWT для Web3
`,
      watchtower: `
var http = HTTPRequest.new()
add_child(http)
var event = {
  "chain": "solana",
  "cluster": "devnet",
  "eventType": "PlayerJoined",
  "gameId": "aof",
  "programId": "CgInv111...",
  "payload": { "solana_wallet": wallet_pubkey, "session_key": session_keypair.get_pubkey() },
  "source": "godot-solana-sdk"
}
http.request("https://watchtower.studio/api/ingest/solana", ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify(event))
`,
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      nodes: 'SolanaClient + WalletAdapter + AnchorProgram → HTTP → Watchtower inbox',
      events: ['PlayerJoined', 'AssetCreated', 'RewardClaimed', 'SessionStarted'],
      crossGame: 'studio_profile PDA via AnchorProgram node',
      sessionKeys: 'temporary keypair 0.01 SOL analog',
      cNFT: 'via AnchorProgram call to Bubblegum mintV2 + DAS',
      l2: 'HTTP to Sonic HyperGrid / MagicBlock ER',
      analytics: 'solana_wallet as external_id for GameSight Late ID Binding',
    },
    security: {
      audit: 'отсутствует — mainnet с осторожностью',
      recommendation: 'devnet/beta only, mainnet needs extra audit + multisig + session keys 0.01 SOL + timelock Squads',
      noPrivateKeysInWatchtower: true,
    },
    writes: false,
  }
}

export function godotSolanaSdkHealth(env = process.env) {
  return {
    engine: 'godot',
    sdk: GODOT_SOLANA_SDK_DETAILED.sdk,
    type: GODOT_SOLANA_SDK_DETAILED.type,
    minVersion: GODOT_SOLANA_SDK_DETAILED.minVersion,
    nodes: Object.keys(GODOT_SOLANA_SDK_DETAILED.nodes),
    builders: GODOT_SOLANA_SDK_DETAILED.builders,
    configured: false,
    configurationReason: 'GDExtension для Godot устанавливается в проект игры, а не в хаб',
    warning: GODOT_SOLANA_SDK_DETAILED.warning,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

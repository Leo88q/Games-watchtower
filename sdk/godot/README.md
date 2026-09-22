# Godot SDK — Watchtower OS

## GDExtension для Godot 4.3+
godot-solana-sdk — узлы Solana, SPL-токены, Candy Machine, Anchor-программы
⚠️ Требует осторожности на mainnet — нет аудита безопасности

## Установка
```
addons/solana-sdk/ — скопировать в проект
Включить GDExtension в Project Settings
```

## Быстрый старт (GDScript)

### Client + Keypair
```gdscript
var client = SolanaClient.new("https://api.devnet.solana.com")
var keypair = Keypair.new_random()
var balance = await client.get_balance(keypair.get_pubkey())
```

### Identity — гостевой режим (FirstStep аналог)
```gdscript
# Гостевой кошелёк без SOL, gasless
var guest_keypair = Keypair.new_random()
# В реальности — FirstStep API создаёт и спонсирует
var guest_wallet = {
  "is_guest": true,
  "pubkey": guest_keypair.get_pubkey(),
  "sponsored": true,
  "upgrade_path": ["privy", "phantom"]
}
# Отправляем в Watchtower
var http = HTTPRequest.new()
http.request("https://watchtower.studio/api/identity/wallet", ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify(guest_wallet))
```

### Session Keys аналог
```gdscript
# В Godot нет из коробки, делаем временный keypair с 0.01 SOL
var session_keypair = Keypair.new_random()
await client.request_airdrop(session_keypair.get_pubkey(), 10000000) # 0.01 SOL
# Используем для частых действий — риск только 0.01 SOL
var tx = await anchor_program.call("move_player", [session_keypair.get_pubkey()], session_keypair)
# Логика как в Unity SDK: createSession(targetProgram, topUp, expiry)
```

### cNFT — массовые предметы
```gdscript
# Через AnchorProgram ноду — вызываем Bubblegum mintV2
var bubblegum_program = AnchorProgram.new(client, "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY", idl)
var result = await bubblegum_program.call("mintV2", [
  merkle_tree,
  mcc_address,
  owner_pubkey,
  metadata_uri
], keypair)
# $110 за 1M, off-chain, Merkle Tree + MCC
# Tensor для торговли — ME прекращает индексацию
```

### L2 — Sonic / MagicBlock
```gdscript
# Sonic HyperGrid — для high frequency
# В Godot — HTTP к Sonic RPC
var http = HTTPRequest.new()
http.request("https://api.mainnet-alpha.sonic.game/execute", [], HTTPClient.METHOD_POST, JSON.stringify({ "grid": "ares1", "action": "move" }))

# MagicBlock — gasless
http.request("https://api.mainnet.magicblock.app/delegate", [], HTTPClient.METHOD_POST, JSON.stringify({ "account": player_pda }))
http.request("https://api.mainnet.magicblock.app/execute_gasless", [], HTTPClient.METHOD_POST, JSON.stringify({ "tx": tx_base64 }))
# sub-10ms, state returns to Solana
```

### Analytics — solana_wallet as external_id
```gdscript
# Для GameSight Late ID Binding
var event = {
  "eventType": "PlayerJoined",
  "gameId": "aof",
  "payload": {
    "solana_wallet": keypair.get_pubkey(), # external_id
    "gamesight_click_id": click_id
  }
}
http.request("https://watchtower.studio/api/ingest/solana", ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify(event))
```

## Watchtower OS интеграция
- Отправка событий в `/api/ingest/solana`
- Identity через FirstStep guest -> Privy upgrade
- Marketplace через Shyft escrow-less HTTP
- Все через HTTPRequest ноду

## Безопасность mainnet
- Нет аудита — используйте только devnet/beta
- Для mainnet: дополнительный аудит + multisig + session keys лимит 0.01 SOL + timelock

# Промт для Godot команды — интеграция с Watchtower OS

## Роль
Ты Godot разработчик (4.3+) в Leo Games Studio. Твоя игра должна подключиться к Watchtower OS.

## Что уже есть
- Watchtower OS: 7 слоёв + 5 движков, API `/api/os/config`
- SDK: godot-solana-sdk — GDExtension, узлы Solana, SPL, Candy Machine, Anchor
- ⚠️ Требует осторожности на mainnet — нет аудита безопасности

## Задачи

### 1. Установка godot-solana-sdk
```
addons/solana-sdk/ в проект
Включить GDExtension
Min Godot 4.3+
```

### 2. Identity — гостевой режим (FirstStep аналог)
```gdscript
var guest_keypair = Keypair.new_random()
var guest_wallet = {
  "is_guest": true,
  "pubkey": guest_keypair.get_pubkey(),
  "sponsored": true,
  "upgrade_path": ["privy", "phantom"]
}
# Отправка в Watchtower
# POST /api/identity/wallet { provider: "firststep", gameId: "aof", deviceId: "..." }
# Потом upgrade to Privy/Phantom via linkAccount
```

### 3. Session Keys аналог — временный keypair 0.01 SOL
```gdscript
var session_keypair = Keypair.new_random()
await client.request_airdrop(session_keypair.get_pubkey(), 10000000) # 0.01 SOL
# Используем для частых действий — риск только 0.01 SOL
# Логика как в Unity: createSession(targetProgram, topUp, expiry)
var tx = await anchor_program.call("move_player", [session_keypair.get_pubkey()], session_keypair)
# Scope: запрети withdraw_treasury, update_authority, mint_unlimited
```

### 4. cNFT — $110 за 1M, off-chain, Merkle Tree + MCC
```gdscript
var bubblegum_program = AnchorProgram.new(client, "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY", idl)
var result = await bubblegum_program.call("mintV2", [merkle_tree, mcc_address, owner_pubkey, metadata_uri], keypair)
# Tensor для торговли — ME прекращает индексацию новых cNFT
# Для ME нужен MCC + Merkle Trees list
```

### 5. Indexer — отправка в Watchtower inbox
```gdscript
var http = HTTPRequest.new()
add_child(http)
var event = {
  "chain": "solana",
  "eventType": "PlayerJoined",
  "gameId": "aof",
  "programId": "CgInv111...",
  "payload": { "solana_wallet": keypair.get_pubkey() }, # для GameSight Late ID Binding!
  "source": "godot-sdk"
}
http.request("https://watchtower.studio/api/ingest/solana", ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify(event))
# Canonical identity: cluster+slot+signature+instructionIndex+innerIndex
```

### 6. L2 — Sonic / MagicBlock via HTTP
```gdscript
# Sonic HyperGrid — dedicated grid, thousands concurrent
http.request("https://api.mainnet-alpha.sonic.game/execute", [], HTTPClient.METHOD_POST, JSON.stringify({ "grid": "aof", "action": "move" }))
# Sorada 5ms reads
http.request("https://sorada.mainnet-alpha.sonic.game/getAssets", [], HTTPClient.METHOD_POST, JSON.stringify({ "owner": wallet }))
# MagicBlock ER — sub-10ms gasless
http.request("https://api.mainnet.magicblock.app/delegate", [], HTTPClient.METHOD_POST, JSON.stringify({ "account": player_pda }))
http.request("https://api.mainnet.magicblock.app/execute_gasless", [], HTTPClient.METHOD_POST, JSON.stringify({ "tx": tx_base64 }))
# Magic Actions auto triggers
```

### 7. Analytics — solana_wallet as external_id
```gdscript
# GameSight Late ID Binding
var analytics_event = {
  "eventType": "PlayerJoined",
  "payload": {
    "solana_wallet": keypair.get_pubkey(), # external_id
    "gamesight_click_id": click_id
  }
}
# Helika — campaign_id + solana_wallet
```

### 8. Marketplace — Shyft escrow-less via HTTP
```gdscript
# Shyft — NFT остаётся в кошельке до продажи, in-app за дни
http.request("https://api.shyft.to/sol/v1/marketplace/list", ["x-api-key: SHYFT_KEY"], HTTPClient.METHOD_POST, JSON.stringify({ "marketplace_address": mp_addr, "nft_address": nft, "price": 1.0, "seller": wallet }))
# GameShift — USD 170+ стран, 100% chargeback, газ берёт на себя
```

### 9. Безопасность mainnet
- Нет аудита godot-solana-sdk — только devnet/beta
- Для mainnet: дополнительный аудит + multisig + session keys лимит 0.01 SOL + timelock + Squads
- Не передавай private keys в Watchtower

### 10. Что сдать
- Godot проект 4.3+ с GDExtension
- WATCHTOWER_INTEGRATION.md
- Devnet транзакции: session key, cNFT mint, marketplace list
- ENV имена: HELIUS_API_KEY, SHYFT_API_KEY и т.д. без значений

API проверки: /api/os/config, /api/sdk/godot?gameId=aof, /api/assets/strategy, /api/l2/router

Детали: sdk/godot/README.md

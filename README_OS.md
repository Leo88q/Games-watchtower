# Watchtower OS — Студийная ОС

## Что внедрено из брифа

### 🎮 SDK для игровых движков
- **Unity (Solana.Unity-SDK):** NFT, RPC, Candy Machine, Phantom deep links, WebGL, Mobile Wallet Adapter, Session Keys из коробки
- **Godot (godot-solana-sdk):** GDExtension 4.3+, узлы Solana SPL Candy Machine Anchor, осторожно mainnet нет аудита
- **Unreal Engine:** VAR META open SDK контракты кошельки в движке + Bifrost C# Solnet C++ Blueprints Metaplex NFT минтинг платежи
- **Turbo.Computer (Rust):** лёгкий движок полная RPC поддержка AI-инструменты генерации
- **Web/JS:** @solana/web3.js @solana/kit база браузерных игр лендингов

### 👛 Встраиваемые кошельки и онбординг
- **Privy:** React SDK useCreateWallet useSolanaWallets auto Solana wallet при первом входе email/соцсети ключи в enclave экспорт возможен
- **Phantom Connect Kit:** OAuth-логин мгновенное создание кошелька
- **FirstStep SDK:** режим гостя спонсорство газа
- **Altude:** gasless-релей

### 🗜️ Сжатые NFT (cNFT)
- Экономика: 1M ~ $110 критично для массовых предметов
- Технические: off-chain нет token/mint аккаунта Merkle Tree + MCC
- Предупреждение: Magic Eden прекращает индексацию новых cNFT — Tensor Bubblegum v2

### 📡 Индексеры и RPC
- **Helius LaserStream:** gRPC 24h replay failover критичные бэкенды WebSocket UI real-time Priority Fee Webhooks DAS
- **Shyft:** REST NFT токенов кошельков колбэков Callback API TOKEN_MINT NFT_MINT accelerated gPA p50 15ms
- **Custom PG:** LaserStream + собственный индексер PostgreSQL TimescaleDB Redis idempotency deduplication cursor replay backfill reconnect gap detection finalized reconciliation parser versioning

### ⚡ L2 и роллапы
- **Sonic SVM:** атомарный SVM L2 HyperGrid выделенный грид тысячи действий без конкуренции Sorada 30-40x быстрее RPC 5ms Rush ECS декларативный мир сущности конфиги SDK генерирует контракты
- **REPLA:** L3 роллапов CLI repla-cli Settle Anchor mainnet runtime MagicBlock sequencer SDK Unity/Unreal/Godot
- **MagicBlock Ephemeral Rollups:** sub-10ms gasless UX аккаунты делегируются в ER транзакции туда состояние возвращается на Solana Magic Actions auto triggers

### 📊 Аналитика и атрибуция
- **Helika:** единый дашборд Web2 in-game on-chain user acquisition атрибуция LiveOps A/B on-chain 10+ сетей Yuga Labs Treasure осторожно AI фокус
- **GameSight:** Solana-интеграция Anonymous Events Wallet ID solana_wallet как external_id Late ID Binding mint buy sell transfer burn
- **Рекомендация:** Helika кросс-игровой дашборд GameSight сквозная атрибуция ad->on-chain

### 🔑 Session Keys
- Временные ключи как JWT для Web3 вторичные подписанты частых действий без подтверждения каждой
- API createSession(targetProgramPublicKey, topUp, expiryInMinutes) временная пара на клиенте session token signAndSendTransaction без раскрытия приватного ключа основного кошелька
- Риск ограничен временным keypair + 0.01 SOL
- Unity SDK из коробки

### 🛒 Маркетплейсы и API
- **Magic Eden:** REST инструкции листинг покупка ставки коллекции активность 120 QPM free Bearer MCC+MT для cNFT
- **Shyft Marketplace:** escrow-less NFT в кошельке до продажи in-app за дни stats API один вызов
- **GameShift (Solana Labs):** API-first без знания блокчейна self-custodial wallet создание активов торговля USD платежи 170+ стран 100% chargeback газ берёт на себя

### 🏗️ Как всё собрать в мультитенантное ПО
1. Общий слой идентификации: Privy + Session Keys для всех 4 игр
2. Ончейн-программы: Anchor-контракты кросс-игровой инвентарь общие PDA
3. Масштабирование: Sonic HyperGrid high frequency REPLA/MagicBlock casual
4. Индексация: LaserStream + Shyft + собственный индексер
5. Активы: cNFT массовые standard редкие Marketplace GameShift/Shyft
6. Аналитика: Helika кросс-игровой дашборд GameSight атрибуция
7. Админка и монетизация: GameShift платежи управление активами

---

## Запуск

```bash
npm install
npm run dev:api # 0.0.0.0:8787 Watchtower OS API 7 layers
npm run dev # 0.0.0.0:5173 Vite proxy /api to 8787
```

API:
- /api/os/config — вся OS
- /api/os/health — health 7 слоёв
- /api/identity/*, /api/session-keys/*, /api/assets/*, /api/indexer/*, /api/l2/*, /api/analytics/*, /api/marketplace/*, /api/engines/*, /api/sdk/*
- /api/health, /api/read-model, /api/overview, etc — original Watchtower

Frontend: http://localhost:5173 — OS панель 8 карточек

---

## Промты для команд

В `prompts/studio-os/`:
- PROMPT_UNITY_TEAM.md
- PROMPT_GODOT_TEAM.md
- PROMPT_UNREAL_TEAM.md
- PROMPT_WEB_TEAM.md
- PROMPT_BACKEND_INDEXER_TEAM.md
- PROMPT_L2_TEAM.md
- PROMPT_ANALYTICS_TEAM.md
- PROMPT_MARKETPLACE_TEAM.md

Каждый промт: роль, что уже есть, задачи по слоям с кодом, что сдать, запреты, ENV без значений, API проверки

---

## SDKs

В `sdk/`:
- unity/README.md
- web/README.md
- godot/README.md
- unreal/README.md
- turbo/README.md

---

## Контракты

В `server/contracts/`:
- cross_game_inventory/lib.rs CgInv111...
- session_keys/lib.rs SessKeys111...
- studio_treasury/lib.rs STrEaSuRy111...

---

## Документация

- docs/os/STUDIO_OS_ARCHITECTURE.md — полная архитектура 7 слоёв + 5 движков + API + Frontend + SDKs + Промты + ENV + Security + Definition of Done
- studio.config.json — вся конфигурация OS в JSON
- README_OS.md — этот файл

---

## ENV

См. docs/os/STUDIO_OS_ARCHITECTURE.md раздел ENV — все ключи без значений

---

## Безопасность

- No private keys в Watchtower
- Read-only, blockchain_writes_enabled 0
- Session Keys риск 0.01 SOL only
- Godot no audit mainnet caution
- Helika AI focus shift backup plan
- Magic Eden stops indexing new cNFT Tensor Bubblegum v2
- RBAC 2FA multisig timelock audit log rollback
- Pseudonymous playerKey hash no full wallet addresses public dashboard
- Consent/opt-out cross-game

---

*Watchtower OS v1.0 — 7 слоёв + 5 движков — внедрена*
*Leo Games Studio — ares1, aof, neonrelay, guttercaps*
*Gasless UX via FirstStep/Altude/GameShift/MagicBlock*

# Watchtower OS — Мультитенантная ОС игровой студии

## Версия 1.0 — 7 слоёв + 5 движков

Из брифа пользователя — полный стек для 4 игр (ares1, aof, neonrelay, guttercaps).

---

## Архитектура — как всё это собрать в мультитенантное ПО

Из брифа, 7 шагов:

### 1. Общий слой идентификации
**Реализация:** Privy или embedded-кошелёк + Session Keys для всех 4 игр
**Модули:** `server/modules/identity/` + `server/modules/session-keys/`
- **Privy:** React SDK с хуками `useCreateWallet` и `useSolanaWallets` — автоматически создаёт Solana-кошелёк при первом входе. Вход через email/соцсети, ключи в защищённом анклаве, экспорт возможен
- **Phantom Connect Kit:** OAuth-логин, мгновенное создание кошелька
- **FirstStep SDK:** режим гостя, спонсорство газа — игрок начинает без кошелька
- **Altude:** gasless-релей fallback
- **Session Keys:** временные ключи как JWT для Web3, `createSession(targetProgramPublicKey, topUp, expiryInMinutes)`, `signAndSendTransaction` без раскрытия приватного ключа основного кошелька, риск ограничен 0.01 SOL, в Unity SDK из коробки
- **Cross-game PDA:** `studio_profile` — Anchor контракт `CgInv111...` для кросс-игрового инвентаря, общие PDA

### 2. Ончейн-программы
**Реализация:** Anchor-контракты для игровой логики, общие PDA для кросс-игрового инвентаря
**Модули:** `server/contracts/`
- `cross_game_inventory/lib.rs` — `CgInv111...` — `create_profile`, `add_cross_game_item`, `link_item_to_game`, `increment_games_played`, `StudioProfile` + `CrossGameItem` (asset_id, source_game, item_type, rarity, is_cnft, used_in_games)
- `session_keys/lib.rs` — `SessKeys111...` — `create_session(target_program, top_up_lamports, expiry_in_minutes)`, `revoke_session`, `validate_session`, `SessionToken` с allowed_programs, denied_instructions (withdraw_treasury, update_authority, mint_unlimited), max 0.1 SOL topUp, 5min-24h expiry
- `studio_treasury/lib.rs` — `STrEaSuRy111...` — `initialize_treasury(multisig)`, `deposit(amount, game_id)`, `request_withdraw(amount, game_id)`, invariant `vault >= liabilities`, multisig + timelock, events `TreasuryDeposited`, `WithdrawRequested`

### 3. Масштабирование
**Реализация:** Sonic SVM (HyperGrid) для игр с высокой частотой действий, REPLA/MagicBlock — для казуальных
**Модули:** `server/modules/l2/`
- **Sonic SVM:** первый атомарный SVM L2 для игровых экономик
  - **HyperGrid:** каждая игра получает выделенный «грид» — тысячи одновременных действий без конкуренции за ресурсы
  - **Sorada:** read-операции в 30–40 раз быстрее стандартных RPC, ответ от 5 мс — для лидербордов, инвентаря
  - **Rush (ECS):** декларативный фреймворк — описываете мир и сущности в конфигах, SDK генерирует контракты
- **REPLA:** фреймворк L3-роллапов с CLI `repla-cli` для запуска и управления из терминала. Settle-слой — Anchor-программа на Solana mainnet, runtime — MagicBlock sequencer. SDK для Unity/Unreal/Godot. Команды: `repla init --game`, `repla start --grid`, `repla deploy --network mainnet`, `repla logs --follow`, `repla status`
- **MagicBlock Ephemeral Rollups:** суб-10 мс исполнение и gasless UX. Аккаунты делегируются в ER, транзакции идут туда, затем состояние возвращается на Solana. Есть Magic Actions для автоматического исполнения по триггерам (time cron, account_change, custom — auto harvest, auto grant reward, auto settle)
- **Роутер:** `l2Router({ gameId, tpsRequirement, uxRequirement })` — decision tree: tps>100 isolation -> HyperGrid, need 5ms reads -> Sorada, declarative world -> Rush ECS, L3 CLI -> REPLA, gasless + auto triggers -> MagicBlock ER

### 4. Индексация
**Реализация:** LaserStream (стриминг) + Shyft (REST/колбэки) + собственный индексер
**Модули:** `server/modules/indexer/`
- **Helius LaserStream:** gRPC-стриминг с 24-часовым историческим реплеем и мультинодовым failover — для критичных бэкендов. WebSocket-вариант для UI и real-time. Встроенные Priority Fee API, webhooks и DAS API для нормализации метаданных. Endpoints: `laserstream.helius-rpc.com`, `atlas-mainnet.helius-rpc.com`, `api.helius.xyz/v0`. Subscription: accounts (game PDAs), transactions (accountInclude programIds), commitment confirmed, replay 24h, failover round_robin_with_healthcheck
- **Shyft:** REST API для NFT, токенов, кошельков и колбэков (вебхуков). Callback API позволяет отслеживать события (TOKEN_MINT, NFT_MINT) и отправлять данные на ваш сервер. Акселерированный getProgramAccounts даёт p50 ~15 мс для топовых DEX. Base `api.shyft.to`, endpoints: `/sol/v1/nft/read`, `/read_all`, `/wallet/token_balance`, `/all_tokens`, `/get_portfolio`, `/transaction/history`, `/gpa` accelerated, `/callback/create|list|remove`, events TOKEN_MINT NFT_MINT TOKEN_TRANSFER NFT_TRANSFER NFT_LIST NFT_SALE
- **Custom PG:** PostgreSQL + TimescaleDB + Redis, tables: raw_events (canonical identity cluster+slot+signature+instructionIndex+innerIndex), parsed_events, player_sessions, player_profiles pseudonymous playerKey, economy_flows, treasury_snapshots, security_signals, marketplace_listings, cross_game_links, investor_snapshots, timeseries: daily_active_players, retention_cohorts, economy_metrics_hourly, rpc_latency, indexer_lag, features: idempotency, deduplication, cursor/replay, backfill, reconnect, gap detection, finalized reconciliation, parser versioning, multitenant tenant_id + RLS tenants ares1 aof neonrelay guttercaps cross-game materialized view
- **Flow:** LaserStream gRPC real-time streaming -> Shyft Callback TOKEN_MINT NFT_MINT webhooks -> Custom PG parsing dedup -> TimescaleDB aggregates DAU/WAU/MAU retention economy -> Redis queues cache realtime -> Watchtower API read-model

### 5. Активы
**Реализация:** cNFT для массовых предметов, стандартные NFT для редких. Маркетплейс — через GameShift или Shyft
**Модули:** `server/modules/assets/` + `server/modules/marketplace/`
- **cNFT:** экономика минтинг до 1 млн NFT примерно за $110 — критично для массовых игровых предметов. Технические отличия: данные хранятся off-chain, нет отдельного token/mint-аккаунта, связь через Merkle Tree и MCC (Metaplex Certified Collection). Program Bubblegum `BGUMAp9...`, Compression `cmtDv...`, Bubblegum v2. Cost $110/M vs standard ~12000 SOL ~$1.8M savings x10000. Важное предупреждение: Magic Eden прекращает индексацию новых cNFT-коллекций и постепенно снимает поддержку существующих. Для торговли потребуются альтернативные площадки (Tensor и др.), поддерживающие Bubblegum v2. Marketplaces: Tensor Bubblegum v2 recommended, ME legacy deprecated for new, Shyft escrow-less, GameShift USD
- **Standard NFT:** Metaplex Token Metadata `metaqbxx...`, Token Program `Tokenkeg...`, features mint account token account metadata master edition royalties, use cases rare_items legendary_weapons founder_badges land
- **Strategy:** `assetStrategy({ gameId, itemType, rarity })` — mass common consumable currency material lootbox_common -> cNFT, rare legendary mythic founder land unique legendary_weapon founder_badge -> standard NFT, default cNFT scalability

### 6. Аналитика
**Реализация:** Helika (кросс-игровой дашборд) + GameSight (атрибуция)
**Модули:** `server/modules/analytics/`
- **Helika:** единый дашборд для Web2, in-game и on-chain данных. Продукты: user acquisition, маркетинговая атрибуция, LiveOps, A/B-тесты, on-chain аналитика по 10+ сетям. Используется Yuga Labs и Treasure. Осторожно: компания публично смещает фокус в сторону AI-продуктов — backup план нужен. API `api.helika.io`, features web2 ingestion in-game events on-chain analytics cross-game dashboard ab testing liveOps, mapping WalletConnected->wallet_connected, PlayerJoined->player_joined, TokenMinted->token_minted, etc, attribution campaign_id utm_source solana_wallet as external_id
- **GameSight:** Solana-интеграция автоматически подтягивает on-chain события в отчётность. События приходят как Anonymous Events с Wallet ID. Для атрибуции нужно передавать solana_wallet как external_id в игровых событиях (Late ID Binding). Отслеживает mint, buy, sell, transfer, burn. API `api.gamesight.io`, features solanaIntegration anonymousEvents walletIdTracking lateIdBinding attribution crossChannel, lateIdBinding steps: ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected external_id solana_wallet link click_id->solana_wallet -> on-chain Anonymous Event wallet_id solana_wallet mint/buy/sell/transfer/burn -> attribution ad_click->wallet->mint full funnel
- **Рекомендация:** Helika для кросс-игрового дашборда, GameSight для сквозной атрибуции от рекламы до ончейн-транзакции
- **Trafficgen:** TalkChart Traffic Generator off-chain SEO/GEO X/Twitter Blinks short videos whale radar TipLink -> events CampaignStarted SessionStarted PageView CTAClicked LandingReached DataGapDetected -> /api/ingest/trafficgen -> trafficAnalytics

### 7. Админка и монетизация
**Реализация:** GameShift для платежей и управления активами
**Модули:** `server/modules/marketplace/`
- **Magic Eden:** REST-эндпоинты и генераторы инструкций для листинга, покупки, ставок, данных о коллекциях и активности. Публичные чтения — 120 QPM бесплатно, инструкции требуют Bearer API key. Для cNFT нужен MCC-адрес и список Merkle Tree addresses. Base `api-mainnet.magiceden.dev`, endpoints `/v2/collections`, `/collections/{symbol}/stats`, `/activities`, `/tokens/{mint}`, `/tokens?collection`, `/instructions/sell`, `/buy`, `/bid`, `/sell_cancel`, `/cnft/sell`, `/cnft/buy`
- **Shyft Marketplace API:** escrow-less модель — NFT остаётся в кошельке пользователя до завершения продажи. Позволяет запустить полноценный in-app маркетплейс за несколько дней, есть stats API для статистики в один вызов. Base `api.shyft.to/sol/v1/marketplace`, endpoints `/marketplace/create`, `/list`, `/buy`, `/unlist`, `/list?marketplace_address`, `/active_listings`, `/stats?marketplace_address`
- **GameShift:** API-first платформа для управления активами без знания блокчейна. Четыре вертикали: кошелёк (self-custodial), создание активов, торговля (в USD), платежи (170+ стран, 100% защита от чарджбэков). Все газовые сборы и взаимодействие с блокчейном берёт на себя. Base `api.gameshift.dev`, endpoints `/v1/users` create self-custodial, `/users/{userId}`, `/users/{userId}/assets`, `/asset-collections` create, `/asset-collections/{collectionId}/assets` mint without blockchain knowledge, `/assets/{assetId}`, `/marketplace/listings` USD, `/marketplace/purchases` USD 170+ countries, `/marketplace/listings/{listingId}`, `/payments/checkout` USD 100% chargeback protection

---

## SDK для игровых движков — 5 движков

### Unity (Solana.Unity-SDK)
- Ключевой инструмент для мобильных и мультиплатформенных игр
- Поддерживает NFT, RPC, Candy Machine, Phantom deep links, WebGL, Mobile Wallet Adapter и сессионные ключи для автоматического подтверждения транзакций
- Package `com.solana.unity-sdk`, repo `michaelhly/Solana.Unity-SDK`, platforms iOS Android WebGL Windows macOS
- Setup: UPM + Watchtower wrapper `com.watchtower.unity`
- Code: PhantomDeepLink.Connect(), SessionKeys.CreateSession(targetProgram, topUp, expiry), Nft.TryGetNftData, cNftService.GetCompressedNft, CandyMachineV3.GetCandyMachine MintNft, MobileWalletAdapterWallet Connect
- Watchtower: endpoint `/api/ingest/solana`, identity Privy + Session Keys unified, events PlayerJoined SessionStarted RewardClaimed AssetTransferred
- Модуль: `server/modules/engines/unity.js` + `sdk/unity/README.md`

### Godot (godot-solana-sdk)
- GDExtension для Godot 4.3+, добавляет узлы для работы с Solana, SPL-токенами, Candy Machine и Anchor-программами
- Требует осторожности при работе с mainnet из-за отсутствия аудита безопасности
- Type GDExtension min 4.3+, nodes SolanaClient Keypair SPLToken CandyMachine AnchorProgram, repo `Virus-Axel/godot-solana-sdk`
- GDScript: SolanaClient.new(rpc), Keypair.new_random(), get_balance, SplToken.new get_balance, AnchorProgram.new call harvest_potato, CandyMachine.new mint, session keypair analog airdrop 0.01 SOL
- Security: no audit mainnet caution, use devnet/beta, mainnet needs extra audit + multisig + session keys 0.01 SOL limit + timelock
- Watchtower: HTTPRequest node -> /api/ingest/solana
- Модуль: `server/modules/engines/godot.js` + `sdk/godot/README.md`

### Unreal Engine
- VAR META — открытый SDK для взаимодействия с контрактами и управления кошельками прямо в движке
- Bifrost использует C# (Solnet), C++ и Blueprints, поддерживает минтинг Metaplex NFT и встроенные игровые платежи
- SDKs: VAR META open SDK contract interaction wallet management in-engine repo var-meta, Bifrost C# Solnet C++ Blueprints Metaplex minting in-game payments
- VAR META Blueprints: Create Wallet Node -> Connect Wallet -> Call Contract Node Program ID + Instruction + Accounts
- C++: VarMetaWallet CreateWallet Connect, VarMetaContract Create CallMethod
- Bifrost C#: Solnet Wallet, MetaplexClient MintNft, CnftService MintV2, BifrostPayment ProcessPayment, session key Account random airdrop 0.01 SOL TransactionBuilder BuildGameAction Sign Send
- Watchtower: HTTP from C++ or Blueprint HTTP request node
- Модуль: `server/modules/engines/unreal.js` + `sdk/unreal/README.md`

### Turbo.Computer (Rust)
- Лёгкий движок с полной поддержкой RPC и AI-инструментами для генерации игр
- Language Rust, URL Turbo.Computer, features lightweight fullRpcSupport aiTools solanaNative, stack Rust WASM Solana RPC
- Install cargo install turbo-cli, turbo init game --template solana
- Rust: #[turbo::game] struct Player fields wallet, Game trait init update, RpcClient new, ai generate_level, harvest call Anchor program via RPC session key 0.01 SOL
- cNFT: mpl_bubblegum MintV2CpiBuilder merkle_tree tree_authority leaf_owner collection metadata off-chain no token/mint account Merkle Tree MCC Tensor trading ME stops indexing
- L2: sonic_sdk Client execute_in_grid thousands concurrent no contention, sorada get_assets_by_owner 5ms, magicblock_sdk Client delegate_account execute_gasless <10ms gasless state returns
- AI: turbo ai generate --prompt "farming game with Solana economy", turbo ai asset --type potato --rarity common --format cNFT, turbo ai system --name HarvestSystem --ecs Rush
- Watchtower: cargo add watchtower-sdk events to /api/ingest/solana
- Модуль: `server/modules/engines/turbo.js` + `sdk/turbo/README.md`

### Web/JS
- @solana/web3.js, @solana/kit — база для браузерных игр и лендингов
- Packages @solana/web3.js @solana/kit @solana/wallet-adapter @privy-io/react-auth @phantom/connect-kit @metaplex-foundation/mpl-bubblegum @metaplex-foundation/umi-bundle-defaults
- Kit: createSolanaRpc createKeyPairSignerFromPrivateKeyBytes rpc.getBalance
- web3js: Connection PublicKey getBalance
- Privy React: usePrivy useCreateWallet useSolanaWallets login authenticated createWallet auto Solana wallet enclave export
- Phantom Connect Kit: PhantomConnect appId connect OAuth instant wallet
- FirstStep: FirstStep.createGuestWallet gameId guest mode gas sponsorship upgrade path
- Altude: Altude.relayTransaction txBase64 userWallet gasless relay
- Session Keys: createSession targetProgramPublicKey topUp expiry signAndSendTransaction sessionToken tx risk limited 0.01 SOL
- cNFT: createUmi umi-bundle-defaults mplBubblegum mintV2 merkleTree collection owner metadata off-chain no token/mint account Merkle Tree MCC ME stops indexing Tensor Bubblegum v2
- Indexer: LaserStream gRPC 24h replay failover WS DAS Priority Fee Webhooks Shyft REST callbacks accelerated gPA p50 15ms Custom PG
- L2: Sonic HyperGrid dedicated grid thousands actions Sorada 30-40x 5ms Rush ECS declarative REPLA repla-cli L3 Anchor settle MagicBlock sequencer MagicBlock ER sub-10ms gasless Magic Actions triggers
- Analytics: Helika cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B 10+ networks Yuga Labs Treasure AI focus warning GameSight Anonymous Events Wallet ID solana_wallet as external_id Late ID Binding mint buy sell transfer burn
- Marketplace: ME 120 QPM free Bearer MCC+MT Shyft escrow-less in-app за дни stats API GameShift API-first без знания блокчейна self-custodial wallet asset creation trading USD payments 170+ стран 100% chargeback газ берёт на себя
- Watchtower: studio.config.json tenants identity sessionKeys assets indexer l2 analytics marketplace
- Модуль: `server/modules/engines/web.js` + `sdk/web/README.md`

---

## API — Watchtower OS

### Core
- `GET /api/os/config` — вся OS 7 слоёв + 5 движков + architecture steps
- `GET /api/os/health` — health всех слоёв

### Identity
- `GET /api/identity/config` — Privy Phantom FirstStep Altude onboarding flow cross-game PDA
- `GET /api/identity/health` — статус провайдеров
- `POST /api/identity/wallet` — create unified wallet { provider, userId, gameId, deviceId, email, authMethod }
- `GET /api/identity/tenant/:gameId?wallet=&session=` — tenant identity

### Session Keys
- `GET /api/session-keys/config` — API createSession signAndSend revoke Unity Web examples
- `GET /api/session-keys/health` — active sessions, Unity SDK из коробки, security isolation
- `POST /api/session-keys/create` — { targetProgramPublicKey, topUpLamports, expiryInMinutes, walletAddress, gameId } -> sessionToken temporaryPublicKey scope allowedPrograms deniedInstructions risk maxLoss topUp SOL
- `GET /api/session-keys/list?wallet=&gameId=&status=` — list sessions
- `GET /api/session-keys/:token` — get session
- `POST /api/session-keys/sign` — { sessionToken, transaction, targetProgram } -> simulation signedBy session_key mainWalletNotExposed gasPaidFrom session_topup
- `POST /api/session-keys/revoke` — { sessionToken, reason }

### Assets
- `GET /api/assets/config` — strategies mass cNFT rare standard marketplaces Tensor ME Shyft GameShift
- `GET /api/assets/health` — cnft program compression bubblegum v2 economics warnings marketplaces
- `POST /api/assets/cnft/collection` — { collectionName, gameId, merkleTreeAddress, mccAddress, maxSupply } -> estimatedCostUsd storage off-chain uriStorage arweave shadow drive irys proof merkle_proof metadata example uses single remaining total marketplaces Tensor ME deprecated Shyft GameShift
- `GET /api/assets/strategy?gameId=&itemType=&rarity=` — recommendation cNFT vs standard reason cost marketplace

### Indexer
- `GET /api/indexer/config` — Helius LaserStream gRPC 24h replay failover WS DAS Priority Fee Webhooks + Shyft REST callbacks accelerated gPA + Custom PG strategy
- `GET /api/indexer/health` — helius subProviders laserstreamGrpc websocket das priorityFee webhooks + shyft + customPg

### L2
- `GET /api/l2/config` — Sonic HyperGrid Sorada Rush + REPLA + MagicBlock routing highFrequency casual readHeavy declarative decisionTree
- `GET /api/l2/health` — Sonic HyperGrid Sorada Rush + REPLA + MagicBlock ER Magic Actions status
- `GET /api/l2/router?gameId=&tps=&ux=` — { provider, component, reason } — tps high -> HyperGrid, ux gasless -> MagicBlock ER, ux declarative -> Rush ECS, default casual -> REPLA

### Analytics
- `GET /api/analytics/config` — Helika cross-game dashboard + GameSight attribution Late ID Binding eventEnrichment requiredFields solana_wallet campaign_id mapping attribution
- `GET /api/analytics/health` — Helika + GameSight status products features warning eventMapping attribution

### Marketplace
- `GET /api/marketplace/config` — cnft primary Tensor in-app Shyft warning ME stops indexing requires MCC+MT standard ME+Tensor in-app Shyft GameShift USD aggregation list buy usdCheckout
- `GET /api/marketplace/health` — ME + Shyft + GameShift status
- `GET /api/marketplace/router?gameId=&assetType=` — routes priority per assetType cnft mass -> Tensor Shyft GameShift, standard rare -> ME Tensor Shyft GameShift

### Engines
- `GET /api/engines/config` — Unity Godot Unreal Turbo Web sdks setups strategy mobileMultiplatform godot unreal rust web sessionKeysSupport
- `GET /api/engines/health` — Unity Godot Unreal Turbo Web health
- `GET /api/sdk/unity?gameId=&cluster=` — Unity SDK setup install config features codeExamples connectPhantomDeepLink sessionKeys nftFetch candyMachine mwa watchtowerIntegration
- `GET /api/sdk/godot?gameId=&cluster=` — Godot SDK setup nodes warning codeExamples gdscriptClient candyMachine sessionKeysEquivalent security audit recommendation watchtowerIntegration
- `GET /api/sdk/unreal?gameId=&sdkChoice=` — Unreal SDK setup features codeExamples varMetaBlueprint bifrostCSharp sessionKeysUnreal watchtowerIntegration
- `GET /api/sdk/turbo?gameId=` — Turbo SDK setup features codeExamples rust aiGeneration watchtowerIntegration
- `GET /api/sdk/web?gameId=&framework=` — Web SDK setup packages install codeExamples kit web3js privy sessionKeys cnft watchtowerIntegration

### Original Watchtower
- `GET /api/health` — ok service watchtower-api uptime mode watchtower-os writes false provider osVersion 1.0.0
- `GET /api/readyz` — ready mode adaptersConfigured os health
- `GET /api/read-model` — overview adjacent investor funnel crossGame campaigns traffic investorTrend ingestion adapters controls os config
- `GET /api/overview`, `/api/games`, `/api/alerts`, `/api/ai/report`, etc — original

---

## Frontend — Watchtower OS Panel

- `src/os/styles.css` — os-grid os-card os-badge ok warn crit os-row os-layers os-layer os-mono
- `src/os/index.js` — fetchOS() config+health, renderOSPanel(container, {config, health}) — 8 cards Identity Session Keys Assets cNFT Indexer LaserStream L2 Sonic REPLA MagicBlock Analytics Helika GameSight Marketplace ME Shyft GameShift Engines Unity Godot Unreal Turbo Web + tenants layers mono API routes health
- `src/main.js` — updated: imports os/styles.css + fetchOS renderOSPanel, sidebar WORKSPACE + WATCHTOWER OS 7 LAYERS Identity Privy/Phantom Session Keys JWT Web3 Assets cNFT $110/M Indexer LaserStream L2 Sonic/REPLA/MB Analytics Helika/GS Marketplace ME/Shyft/GS Engines SDKs + INTELLIGENCE + ДЛЯ КОМАНДЫ, metrics OS Layers 8 active SDKs 5 engines, #os-panel div, syncOS() fetchOS + renderOSPanel, refresh-btn syncOS + syncFromApi, nav click scroll to #os-panel for OS: labels

---

## SDKs — папка sdk/

- `sdk/unity/README.md` — install manifest com.solana.unity-sdk com.watchtower.unity, Identity Privy Session Keys, cNFT mass $110/M Merkle Tree MCC Bubblegum v2 Tensor ME deprecated, Indexer LaserStream Shyft, L2 Sonic HyperGrid MagicBlock ER sub-10ms gasless Magic Actions, Analytics Helika GameSight solana_wallet external_id Late ID Binding, Marketplace ME 120 QPM Bearer MCC+MT Shyft escrow-less GameShift USD 170+ 100% chargeback gas abstraction, cross-game inventory Anchor PDA, Watchtower endpoint
- `sdk/web/README.md` — npm install packages, Identity Privy React useCreateWallet useSolanaWallets email/social enclave export Phantom Connect OAuth FirstStep guest gas sponsorship Altude gasless relay, Session Keys createSession signAndSendTransaction risk 0.01 SOL, cNFT createUmi mplBubblegum mintV2 Merkle Tree MCC off-chain no token/mint account ME deprecated Tensor, Indexer LaserStream gRPC 24h replay failover WS DAS Shyft Callback TOKEN_MINT NFT_MINT PG, L2 Sonic HyperGrid dedicated grid thousands Sorada 30-40x 5ms Rush ECS declarative REPLA repla-cli L3 Anchor MagicBlock sequencer MagicBlock ER sub-10ms gasless Magic Actions, Analytics Helika cross-game Web2 in-game on-chain acquisition LiveOps A/B 10+ Yuga Labs Treasure AI warning GameSight Anonymous Events Wallet ID solana_wallet external_id Late ID Binding mint buy sell transfer burn, Marketplace ME 120 QPM Bearer MCC+MT Shyft escrow-less in-app за дни stats API GameShift API-first без знания блокчейна self-custodial asset creation trading USD payments 170+ 100% chargeback газ, studio.config.json
- `sdk/godot/README.md` — GDExtension 4.3+ Solana SPL Candy Machine Anchor no audit mainnet caution, install addons, GDScript SolanaClient Keypair SPLToken AnchorProgram CandyMachine, Identity guest FirstStep analog, Session Keys analog temporary keypair 0.01 SOL, cNFT Bubblegum mintV2 Merkle Tree MCC $110/M Tensor ME deprecated, L2 Sonic HyperGrid HTTP MagicBlock ER gasless sub-10ms, Analytics solana_wallet external_id Late ID Binding, Marketplace Shyft escrow-less HTTP GameShift USD, Watchtower HTTPRequest, security mainnet no audit devnet/beta extra audit multisig session keys 0.01 SOL timelock
- `sdk/unreal/README.md` — VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex mint payments, install Plugins VARMeta Bifrost Marketplace Solnet C# bridge, VAR META Blueprints Create Wallet Connect Call Contract Program ID Instruction Accounts C++ VarMetaWallet CreateWallet Connect VarMetaContract Create CallMethod, Bifrost C# Wallet Rpc MetaplexClient MintNft CnftService MintV2 BifrostPayment ProcessPayment session key Account random airdrop 0.01 SOL TransactionBuilder BuildGameAction Sign, Identity FirstStep guest Privy OAuth HTTP, L2 Sonic HyperGrid dedicated grid thousands no contention HTTP MagicBlock ER delegate execute_gasless <10ms gasless state returns Magic Actions auto triggers, Analytics Helika GameSight solana_wallet external_id, Marketplace ME 120 QPM Bearer MCC+MT Shyft escrow-less in-app за дни stats API GameShift USD 170+ 100% chargeback gas abstraction, Watchtower endpoint Identity Session Keys temporary keypair 0.01 SOL limit
- `sdk/turbo/README.md` — Turbo.Computer Rust lightweight full RPC AI, cargo install turbo-cli turbo init, Rust turbo::game struct Player fields wallet Game trait init update RpcClient ai generate_level harvest Anchor program RPC session key 0.01 SOL, cNFT mpl_bubblegum MintV2CpiBuilder merkle_tree tree_authority leaf_owner collection metadata off-chain no token/mint account Merkle Tree MCC Tensor ME stops indexing, L2 sonic_sdk Client execute_in_grid thousands concurrent no contention sorada get_assets_by_owner 5ms magicblock_sdk Client delegate_account execute_gasless <10ms gasless state returns, AI turbo ai generate asset system, Analytics track_event solana_wallet external_id Late ID Binding, Watchtower cargo add watchtower-sdk events /api/ingest/solana

---

## Промты для команд — prompts/studio-os/

- `PROMPT_UNITY_TEAM.md` — роль Unity dev, что уже есть OS 7 layers + 5 engines API, задачи: install Solana.Unity-SDK + Watchtower wrapper, Identity Privy useCreateWallet useSolanaWallets email/social enclave export Phantom Connect OAuth FirstStep guest gas sponsorship Altude gasless relay cross-game PDA studio_profile CgInv111..., Session Keys createSession targetProgram topUp expiry signAndSendTransaction risk 0.01 SOL scope no withdraw_treasury update_authority mint_unlimited PlayerPrefs auto-refresh, Assets cNFT mass $110/M off-chain no token/mint Merkle Tree MCC Bubblegum v2 ME deprecated Tensor Shyft escrow-less GameShift USD 170+ 100% chargeback gas abstraction, Indexer events to inbox POST /api/ingest/solana canonical identity cluster+slot+signature+instructionIndex+innerIndex, L2 Sonic HyperGrid thousands no contention Sorada 5ms Rush ECS declarative REPLA repla-cli L3 MagicBlock ER sub-10ms gasless Magic Actions triggers router GET /api/l2/router, Analytics Helika cross-game Web2 in-game on-chain GameSight solana_wallet external_id Late ID Binding mint buy sell transfer burn, Marketplace ME 120 QPM Bearer MCC+MT Shyft escrow-less in-app за дни stats API GameShift USD, cross-game inventory Anchor PDA create_profile add_cross_game_item link_item_to_game, что сдать Unity project WATCHTOWER_INTEGRATION.md screenshots tests ENV names proof devnet tx, запреты no private keys Watchtower read-only writes client signing MWA Session Key gasless relay FirstStep Altude GameShift mainnet after audit, API проверки /api/os/config /api/sdk/unity /api/identity/health /api/session-keys/health /api/assets/strategy /api/l2/router /api/marketplace/router /api/ingest/solana

- `PROMPT_GODOT_TEAM.md` — роль Godot 4.3+ dev, GDExtension Solana SPL Candy Machine Anchor no audit mainnet caution, install addons, Identity guest FirstStep analog, Session Keys analog temporary keypair 0.01 SOL, cNFT Bubblegum mintV2 Merkle Tree MCC $110/M Tensor ME deprecated, Indexer HTTPRequest /api/ingest/solana canonical identity, L2 Sonic HyperGrid HTTP MagicBlock ER gasless sub-10ms, Analytics solana_wallet external_id Late ID Binding, Marketplace Shyft escrow-less HTTP GameShift USD, security mainnet no audit devnet/beta extra audit multisig session keys 0.01 SOL timelock, что сдать Godot project WATCHTOWER_INTEGRATION.md devnet tx ENV names, API /api/os/config /api/sdk/godot /api/assets/strategy /api/l2/router

- `PROMPT_UNREAL_TEAM.md` — роль Unreal dev, VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex mint payments, install Plugins VARMeta Bifrost Marketplace Solnet C# bridge, Identity VAR META + Bifrost FirstStep guest Privy OAuth HTTP cross-game PDA, Session Keys temporary keypair 0.01 SOL C++ FKeypair GenerateRandom FTransaction BuildGameAction Sign C# Account random airdrop 0.01 SOL TransactionBuilder BuildGameAction Sign, Assets cNFT $110/M off-chain Merkle Tree MCC Bubblegum v2 ME deprecated Tensor Shyft escrow-less GameShift USD, Indexer HTTP /api/ingest/solana canonical identity, L2 Sonic HyperGrid dedicated grid thousands no contention HTTP MagicBlock ER delegate execute_gasless <10ms gasless state returns Magic Actions auto triggers, Analytics Helika GameSight solana_wallet external_id, Marketplace ME 120 QPM Bearer MCC+MT Shyft escrow-less in-app за дни stats API GameShift USD 170+ 100% chargeback gas abstraction, cross-game PDA FindPda studio_profile CgInv111..., что сдать Unreal project VAR META/Bifrost WATCHTOWER_INTEGRATION.md devnet tx ENV names запреты no private keys read-only writes client signing gasless relay, API /api/os/config /api/sdk/unreal /api/assets/strategy /api/l2/router /api/marketplace/router

- `PROMPT_WEB_TEAM.md` — роль Web React/Next.js dev, Web SDK @solana/web3.js @solana/kit base, Identity Privy React useCreateWallet useSolanaWallets email/social enclave export Phantom Connect OAuth FirstStep guest gas sponsorship Altude gasless relay onboarding guest->embedded->native->linked cross-game PDA studio_profile, Session Keys createSession targetProgram topUp expiry signAndSendTransaction risk 0.01 SOL POST /api/session-keys/create sign revoke, Assets cNFT $110/M off-chain Merkle Tree MCC Bubblegum v2 Tensor ME deprecated Shyft escrow-less GameShift USD createUmi mplBubblegum mintV2 strategy GET /api/assets/strategy cNFT $110/M x10000 cheaper, Indexer POST /api/ingest/solana chain cluster eventType gameId programId payload solana_wallet sessionId source web-sdk canonical identity LaserStream gRPC 24h replay failover WS DAS Shyft Callback TOKEN_MINT NFT_MINT PG, L2 Sonic HyperGrid dedicated grid thousands no contention Sorada 30-40x 5ms Rush ECS declarative REPLA repla-cli L3 Anchor settle MagicBlock sequencer MagicBlock ER sub-10ms gasless Magic Actions triggers router GET /api/l2/router, Analytics Helika cross-game Web2 in-game on-chain acquisition LiveOps A/B 10+ Yuga Labs Treasure AI warning GameSight Anonymous Events Wallet ID solana_wallet external_id Late ID Binding mint buy sell transfer burn flow ad_click click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet -> mint Anonymous Event Wallet ID -> attribution, Marketplace ME 120 QPM Bearer MCC+MT Shyft escrow-less in-app за дни stats API GameShift API-first без знания блокчейна self-custodial asset creation trading USD payments 170+ 100% chargeback газ, in-app marketplace UI за дни via Shyft+GameShift ME public listings standard Tensor cNFT Bubblegum v2 ME deprecated, cross-game PDA Anchor CgInv111... create_profile add_cross_game_item link_item_to_game, что сдать Web app Next.js React Privy login Session Keys cNFT mint marketplace UI WATCHTOWER_INTEGRATION.md devnet tx session key cNFT assetId marketplace listing USD purchase GameShift ENV names запреты no private keys read-only writes client signing gasless relay, API /api/os/config /api/sdk/web /api/identity/health /api/assets/strategy /api/l2/router /api/marketplace/router /api/ingest/solana

- `PROMPT_BACKEND_INDEXER_TEAM.md` — роль Backend/Indexer dev, что уже есть OS 7 layers API /api/os/config /api/indexer/config health modules indexer laserstream shyft custom-pg event-inbox idempotency canonical identity provider MockProvider NativeRpcProvider TrafficgenProvider, слой Indexer Helius LaserStream gRPC 24h replay failover critical backend WebSocket UI real-time Priority Fee Webhooks DAS + Shyft REST NFT token wallet callbacks accelerated gPA p50 15ms + Custom PG, задачи LaserStream gRPC Yellowstone @triton-one/yellowstone-grpc helius SDK subscription accounts game PDAs CgInv SessKeys STrEaSuRy transactions accountInclude game programIds commitment confirmed replay 24h failover round_robin_with_healthcheck PG raw_events parsed_events Prometheus metrics indexer_lag_slots finalized_lag_slots rpc_latency_ms, Shyft REST NFT read read_all collection token token_balance all_tokens history wallet get_portfolio transaction history gPA accelerated p50 15ms callback create list remove TOKEN_MINT NFT_MINT TOKEN_TRANSFER NFT_TRANSFER NFT_LIST NFT_SALE targetUrl webhook handler POST /api/webhooks/shyft/:gameId parsing inbox ingest PG accelerated gPA game program accounts marketplace stats wallet portfolio, Custom PG PostgreSQL TimescaleDB Redis tables raw_events canonical identity parsed_events player_sessions player_profiles pseudonymous playerKey economy_flows treasury_snapshots security_signals marketplace_listings cross_game_links investor_snapshots timeseries daily_active_players retention_cohorts economy_metrics_hourly rpc_latency indexer_lag multitenant tenant_id RLS tenants ares1 aof neonrelay guttercaps cross-game materialized view features idempotency deduplication cursor/replay backfill reconnect gap detection finalized reconciliation parser versioning PG schema TimescaleDB hypertables Redis queues cache realtime idempotency canonical identity gap detection backfill getSignaturesForAddress getTransaction reconnect cursor store, aggregation strategy flow LaserStream gRPC real-time -> Shyft Callback webhooks -> Custom PG parsing dedup -> TimescaleDB aggregates DAU/WAU/MAU retention economy -> Redis queues cache realtime -> Watchtower API read-model guarantees idempotency gap detection backfill finalized reconciliation parser versioning, parsing Anchor IDL Bubblegum BGUMAp9 Compression cmtDv DAS cross-game CgInv events create_profile add_cross_game_item link_item_to_game session keys SessKeys events create_session revoke_session treasury STrEaSuRy events TreasuryDeposited WithdrawRequested, API /api/ingest/solana /api/events /api/ingestion/status /api/ingestion/adapters /api/infra/solana /api/indexer/health /api/indexer/config /metrics events_total duplicates rejected decoder_errors indexer_lag_slots finalized_lag_slots rpc_latency_ms blockchain_writes_enabled 0, что сдать LaserStream gRPC subscription 4 games + 3 cross-game programs 24h replay failover Shyft REST callback webhook handler PG schema TimescaleDB Redis idempotency gap backfill finalized reconciliation parsers event types PlayerJoined PotatoPlanted RewardGranted TokenMinted etc read-model /api/read-model health checks metrics документация program IDs tables guarantees ENV tests duplicate reconnect backfill slot gap healing finalized reconciliation failed tx запрет no blockchain writes exporter read-only no private keys, ENV HELIUS_API_KEY HELIUS_LASERSTREAM_ENDPOINT HELIUS_RPC_URL HELIUS_WEBHOOK_ID WATCHTOWER_WEBHOOK_URL SHYFT_API_KEY SHYFT_BASE_URL SHYFT_NETWORK DATABASE_URL REDIS_URL ARES1_PROGRAM_ID AOF_CORE_PROGRAM_ID NEONRELAY_REWARDS_PROGRAM_ID GUTTERCAPS_CORE_PROGRAM_ID, проверка GET /api/indexer/config health /api/infra/solana /api/ingestion/status /api/events /api/ingestion/adapters /metrics

- `PROMPT_L2_TEAM.md` — роль L2/Rollups eng, что уже есть OS 7 layers API /api/os/config /api/l2/config health router modules l2 sonic HyperGrid Sorada Rush repla repla-cli magicblock ER Magic Actions, слой L2 Sonic SVM atomic SVM L2 HyperGrid dedicated grid thousands no contention Sorada 30-40x 5ms Rush ECS declarative world config SDK generates contracts REPLA L3 repla-cli Anchor settle mainnet MagicBlock sequencer SDK Unity Unreal Godot MagicBlock ER sub-10ms gasless UX accounts delegated ER tx there state returns Solana Magic Actions auto triggers, архитектура Sonic HyperGrid high frequency REPLA/MagicBlock casual, задачи Sonic HyperGrid high frequency ARES-1 potato planting/harvesting Neon Relay races real-time PvP high frequency AOF GUTTERCAPS casual REPLA/MagicBlock Sonic API client create grid per game execute high frequency isolated no contention monitoring tps latency grid health fallback Solana mainnet, Sorada 30-40x 5ms reads leaderboards inventory reads matchmaking queries marketplace listings getAssetsByOwner 5ms vs 150ms standard caching fallback DAS/Helius, Rush ECS declarative world config entities Player Position Health Inventory PotatoField Position GrowthStage Owner systems MovementSystem HarvestSystem EconomySystem SDK generates Anchor contracts deploy via Sonic, REPLA L3 repla-cli Env REPLA_API_KEY REPLA_ENDPOINT REPLA_SETTLE_PROGRAM_ID CLI init --game start --grid deploy --network mainnet logs --follow status L3 config gameId type L3 settlement Anchor mainnet program runtime MagicBlock sequencer latency <10ms gasless suitableFor casual turn-based low-frequency economy repla-cli install init casual AOF GUTTERCAPS deploy settle program mainnet start L3 grid via repla start monitoring repla status logs SDK Unity Unreal Godot, MagicBlock ER sub-10ms gasless UX accounts delegated ER tx there state returns Solana flow delegate_account execute_in_er commit_state performance latency sub-10ms gasless tps high Env MAGICBLOCK_API_KEY client delegate account execute gasless commit state casual AOF farming GUTTERCAPS collectibles gasless UX Magic Actions auto triggers time cron account_change custom autoHarvest every 5 min auto grant reward level up auto settle match end examples monitoring ER health delegation status action execution, роутер l2Router gameId tpsRequirement uxRequirement decision tree tps>100 isolation -> HyperGrid need 5ms reads -> Sorada declarative world -> Rush ECS L3 CLI -> REPLA gasless auto triggers -> MagicBlock ER routing table highFrequency Sonic HyperGrid ARES-1 potato colony Neon Relay races real-time PvP casual REPLA/MagicBlock AOF farming GUTTERCAPS collectibles readHeavy Sonic Sorada leaderboards inventory reads declarative Sonic Rush ECS world config generates contracts router API GET /api/l2/router?gameId=ares1&tps=high&ux=gasless ARES-1 high tps high frequency -> HyperGrid+Sorada+Rush ECS Neon Relay high tps real-time PvP -> HyperGrid AOF casual farming gasless auto harvest -> MagicBlock ER+Magic Actions+REPLA GUTTERCAPS casual collectibles gasless -> MagicBlock ER+REPLA, интеграция Watchtower OS L2 layer config health Unity Godot Unreal SDKs examples Indexer parse L2 tx LaserStream include L2 Analytics Helika GameSight track L2 tx Anonymous Events, что сдать Sonic HyperGrid per game Sorada client 5ms reads Rush ECS config per game Anchor contracts generated REPLA repla-cli init/start/deploy/logs/status casual settle program mainnet MagicBlock sequencer runtime SDK Unity Unreal Godot MagicBlock ER delegate/execute_gasless/commit_state casual Magic Actions auto triggers time/account_change/custom examples autoHarvest Router decision tree routing table per game API /api/l2/router monitoring tps latency grid health delegation status action execution Prometheus metrics health /api/l2/health config документация какие игры на каком L2 почему ENV команды CLI гарантии тесты high tps simulation gasless execution state commitment Magic Actions triggers запрет no private keys Watchtower read-only indexer writes via client+L2, ENV SONIC_API_KEY SONIC_GRID_ID SONIC_SORADA_ENDPOINT REPLA_API_KEY REPLA_ENDPOINT REPLA_SETTLE_PROGRAM_ID MAGICBLOCK_API_KEY, проверка GET /api/l2/config routing highFreq casual readHeavy declarative decisionTree health router gameId tps high os config

- `PROMPT_ANALYTICS_TEAM.md` — роль Analytics/Attribution eng, что уже есть OS 7 layers API /api/os/config /api/analytics/config health modules analytics helika gamesight trafficgen traffic.js /api/analytics/traffic, слой Analytics Helika unified dashboard Web2 in-game on-chain user acquisition attribution LiveOps A/B on-chain 10+ networks Yuga Labs Treasure warning AI focus shift + GameSight Solana integration Anonymous Events Wallet ID solana_wallet as external_id Late ID Binding mint buy sell transfer burn recommendation Helika cross-game dashboard GameSight ad->on-chain attribution, задачи Helika cross-game dashboard Env HELIKA_API_KEY PROJECT_ID ENDPOINT products user acquisition attribution LiveOps A/B on-chain 10+ networks clients Yuga Labs Treasure warning AI focus backup plan features web2 ingestion in-game events on-chain analytics cross-game dashboard ab testing liveOps mapping WalletConnected wallet_connected PlayerJoined player_joined SessionStarted session_started TokenMinted token_minted etc attribution campaign_id utm_source solana_wallet external_id client track events Watchtower inbox mapping all Watchtower event types Web2 page views ad clicks SEO/GEO X/Twitter Blinks short videos whale radar TipLink trafficgen in-game PlayerJoined SessionStarted MatchFinished on-chain TokenMinted NFT_MINT via DAS LaserStream cross-game DAU/WAU/MAU per game cross-game players studio_profile PDA retention D1/D7/D30 payer conversion ARPDAU LTV A/B onboarding economy L2 routing LiveOps events seasons campaigns warning AI focus shift backup GameSight+Custom PG, GameSight attribution ad->on-chain Env GAMESIGHT_API_KEY PROJECT_ID ENDPOINT Solana integration Anonymous Events Wallet ID Late ID Binding solana_wallet external_id tracked on-chain mint buy sell transfer burn attribution setup steps ad_click gamesight_click_id -> PlayerJoined external_id click_id -> WalletConnected external_id solana_wallet link click_id->solana_wallet -> on-chain Anonymous Event wallet_id solana_wallet mint/buy/sell/transfer/burn -> attribution ad_click->wallet->mint full funnel implementation inGameEvent PlayerJoined payload solana_wallet wallet_address gamesight_click_id click_id_from_url onChainEvent type Anonymous Event walletId solana_wallet event mint/buy/sell/transfer/burn client track in-game events solana_wallet external_id Late ID Binding gamesight_click_id from ad URL -> solana_wallet from WalletConnected -> on-chain Anonymous Event Wallet ID flow ad_click click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet -> mint/buy/sell Anonymous Event Wallet ID -> attribution ad_click->wallet->mint cross-game studio_profile PDA links wallets, интеграция Watchtower inbox /api/ingest/solana /api/events обогащение solana_wallet campaign_id gamesight_click_id Unity Godot Unreal Web SDKs examples Helika GameSight ensure send solana_wallet trafficgen TalkChart off-chain SEO/GEO X/Twitter Blinks short videos whale radar TipLink events CampaignStarted SessionStarted PageView CTAClicked LandingReached DataGapDetected /api/ingest/trafficgen trafficAnalytics funnels первый вход->первое действие->D1->D7->покупка->переход во вторую игру buildFunnel cross-game crossGameSegments игроки 1/2/3-4 игр, дашборды Helika cross-game DAU/WAU/MAU retention payer conversion ARPDAU volume treasury liabilities minted/burned runway critical incidents data coverage GameSight attribution ad campaign -> click -> join -> wallet -> mint/buy/sell full funnel ROI per campaign LTV per source Watchtower /api/read-model includes funnel crossGame traffic investor + analytics layer Frontend src/os/index.js shows analytics layer, что сдать Helika client mapping Web2 in-game on-chain cross-game dashboard A/B LiveOps GameSight client Late ID Binding solana_wallet external_id Anonymous Events Wallet ID mint buy sell transfer burn full funnel ad_click->wallet->mint обогащение events all SDKs send solana_wallet campaign_id gamesight_click_id дашборды Helika cross-game GameSight attribution Watchtower OS panel health /api/analytics/health config документация какие события маппинги дашборды ENV warning Helika AI фокус тесты attribution flow ad_click->join->wallet->mint cross-game linking funnel conversion запрет no PII pseudonymous playerKey no full wallet addresses public dashboard hash, ENV HELIKA_API_KEY PROJECT_ID ENDPOINT GAMESIGHT_API_KEY PROJECT_ID ENDPOINT, проверка GET /api/analytics/config Helika cross-game dashboard GameSight attribution Late ID Binding health mapping traffic funnels players cross-game os config

- `PROMPT_MARKETPLACE_TEAM.md` — роль Marketplace eng, что уже есть OS 7 layers API /api/os/config /api/marketplace/config health router modules marketplace magiceden shyft-market gameshift assets cnft standard, слой Marketplace Magic Eden REST инструкции листинг покупка ставки коллекции активность 120 QPM free Bearer MCC+MT cNFT + Shyft escrow-less NFT в кошельке до продажи in-app за дни stats API + GameShift API-first без знания блокчейна self-custodial wallet asset creation trading USD payments 170+ стран 100% chargeback газ берёт на себя cNFT warning ME прекращает индексацию новых cNFT Tensor Bubblegum v2, архитектура cNFT mass standard rare marketplace GameShift Shyft admin monetization GameShift payments asset management, задачи Magic Eden REST instructions Env MAGIC_EDEN_API_KEY BASE_URL rate limit 120 QPM free Bearer features listing buying bidding collection data activity instructions generator cNFT requires MCC+MT warning ME stops indexing new cNFT endpoints collections /v2/collections /collections/{symbol}/stats /activities NFT /v2/tokens/{mint} /tokens?collection marketplace /v2/instructions/sell buy bid sell_cancel cnft/sell cnft/buy instruction builder Watchtower generates client signs via Session Key writes false REST client collections NFT activities stats instruction generator sell buy bid cancel cnft/sell cnft/buy generate instruction client signs cNFT MCC+MT required warning ME deprecation rate limit 120 QPM queue retry standard NFT full support ME+Tensor cNFT recommend Tensor Bubblegum v2 ME only legacy, Shyft Marketplace escrow-less in-app за дни Env SHYFT_API_KEY MARKET_BASE_URL model escrow-less NFT в кошельке до продажи features in-app marketplace escrow-less fast launch за дни stats API endpoints marketplace create list buy unlist NFT list?marketplace_address active_listings stats stats?marketplace_address builder gameId marketplaceAddress action create list buy unlist nftAddress price seller model escrow-less note in-app за дни client create marketplace per game ares1 aof neonrelay guttercaps escrow-less listing NFT stays wallet until sale no custody risk instant listing buy unlist active listings stats API one call in-app UI за дни cNFT supports escrow-less standard supports, GameShift API-first без знания блокчейна USD 170+ 100% chargeback газ берёт на себя Env GAMESHIFT_API_KEY BASE_URL ENV devnet mainnet owner Solana Labs type API-first verticals wallet self-custodial asset creation без знания блокчейна trading USD payments 170+ 100% chargeback gas all gas fees handles itself endpoints users POST /v1/users self-custodial wallet player GET /users/{userId} /users/{userId}/assets assets POST /v1/asset-collections create collection POST /asset-collections/{collectionId}/assets mint without blockchain knowledge GET /assets/{assetId} marketplace POST /v1/marketplace/listings USD POST /purchases USD 170+ GET /listings/{listingId} payments POST /v1/payments/checkout USD 100% chargeback protection 170+ currencies gas GameShift pays builder gameId collectionId asset name description imageUrl attributes ownerId noBlockchainKnowledgeRequired gasHandling GameShift pays client users self-custodial wallet per player asset-collections assets mint without blockchain knowledge marketplace listings USD purchases USD payments checkout 170+ countries 100% chargeback protection gas abstraction all gas handled GameShift admin monetization use GameShift for payments asset management per game create asset collection mint assets via GameShift API list USD purchase via checkout, aggregator marketplaceAggregator gameId assetType isCnft cnft common mass -> routes Tensor Bubblegum v2 ME stops indexing priority1 Shyft escrow-less priority2 GameShift USD fallback priority3 standard rare -> ME standard NFT full support priority1 Tensor alternative priority2 Shyft in-app escrow-less priority3 GameShift USD+gas abstraction priority4 strategy cnft primary Tensor in-app Shyft warning ME stops indexing requires MCC+MT standard primary ME+Tensor inApp Shyft escrow-less GameShift USD aggregation list buy usdCheckout aggregator API GET /api/marketplace/router?gameId=ares1&assetType=cnft decision logic cNFT->Tensor primary Shyft in-app GameShift USD fallback Standard->ME+Tensor primary Shyft+GameShift in-app USD unified list aggregate ME+Tensor+Shyft+GameShift unified buy generate instruction ME/Shyft client signs Session Key or USD checkout GameShift stats Shyft stats API one call+ME stats+GameShift, assets cNFT Standard economics 1M $110 vs standard 1M ~12000 SOL ~$1.8M savings x10000 cNFT off-chain no token/mint Merkle Tree MCC Bubblegum v2 Standard mint token metadata master edition royalties use cases mass common consumable currency material lootbox_common rare legendary mythic founder land unique legendary_weapon founder_badge assetStrategy gameId itemType rarity isMass common consumable currency material lootbox_common common -> cNFT mass $110/M Tensor $0.00011 per NFT isRare legendary mythic founder land unique -> standard NFT rare needs mint/token account ME+Tensor ~0.012 SOL per NFT default cNFT scalability cNFT collection config POST /api/assets/cnft/collection collectionName gameId merkleTreeAddress mccAddress maxSupply estimatedCostUsd storage off-chain uriStorage arweave shadow drive irys proof merkle_proof metadata example uses single remaining total marketplaces Tensor ME deprecated Shyft GameShift mint payload Bubblegum mintV2 instruction marketplace adapter Tensor recommended Bubblegum v2 after ME deprecation ME legacy warning Shyft escrow-less strategy cNFT mass $110/M vs standard rare economics x10000 savings, интеграция Watchtower OS marketplace layer /api/marketplace/config health Unity Godot Unreal Web SDKs marketplace examples aggregator Indexer parse marketplace events NFT_LIST NFT_SALE TOKEN_MINT via Shyft callbacks LaserStream Analytics track mint buy sell transfer burn via GameSight Anonymous Events Wallet ID Identity marketplace purchases via Session Keys gasless relay FirstStep Altude GameShift, что сдать Magic Eden REST client collections NFT activities stats instruction generator sell buy bid cancel cnft/sell cnft/buy rate limit 120 QPM Bearer MCC+MT warning ME deprecated Shyft marketplace per game create escrow-less list buy unlist active listings stats API one call in-app за дни GameShift users self-custodial asset-collections assets mint without blockchain knowledge marketplace listings USD purchases USD 170+ payments checkout 100% chargeback gas abstraction GameShift pays aggregator router assetType cnft vs standard unified list buy USD checkout decision Tensor primary cNFT ME+Tensor standard Shyft+GameShift in-app USD assets cNFT collection config mint payload marketplace adapter strategy cNFT mass $110/M vs standard rare economics x10000 savings in-app marketplace UI Shyft+GameShift за дни health /api/marketplace/health config assets/health документация какие маркетплейсы для каких активов ENV команды гарантии warning ME cNFT deprecation тесты list buy sell via ME instruction+client signing Session Key escrow-less Shyft USD GameShift checkout запрет no private keys Watchtower read-only writes via client signing gasless relay GameShift gas abstraction, ENV MAGIC_EDEN_API_KEY BASE_URL SHYFT_API_KEY MARKET_BASE_URL GAMESHIFT_API_KEY BASE_URL ENV, проверка GET /api/marketplace/config cnft primary Tensor standard ME+Tensor in-app Shyft escrow-less GameShift USD health router gameId assetType cnft assets config cNFT $110/M off-chain Merkle Tree MCC Bubblegum v2 vs standard strategy gameId itemType common rarity common cNFT vs standard POST /api/assets/cnft/collection GET /api/os/config

---

## ENV — все ключи

```
# Identity
PRIVY_APP_ID
PRIVY_CLIENT_ID
PHANTOM_APP_ID
PHANTOM_API_KEY
FIRSTSTEP_API_KEY
FIRSTSTEP_PROJECT_ID
ALTUDE_API_KEY
ALTUDE_ENDPOINT

# Assets cNFT
# Bubblegum program BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY
# Compression cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L4ryFTWh
# Merkle Trees + MCC per collection — via /api/assets/cnft/collection

# Indexer
HELIUS_API_KEY
HELIUS_LASERSTREAM_ENDPOINT
HELIUS_RPC_URL
HELIUS_WEBHOOK_ID
WATCHTOWER_WEBHOOK_URL
SHYFT_API_KEY
SHYFT_BASE_URL
SHYFT_NETWORK
DATABASE_URL
REDIS_URL
SOLANA_RPC_URL
WATCHTOWER_PROVIDER
TRAFFICGEN_API_BASE_URL
WATCHTOWER_READ_TOKEN

# L2
SONIC_API_KEY
SONIC_GRID_ID
SONIC_SORADA_ENDPOINT
REPLA_API_KEY
REPLA_ENDPOINT
REPLA_SETTLE_PROGRAM_ID
MAGICBLOCK_API_KEY

# Analytics
HELIKA_API_KEY
HELIKA_PROJECT_ID
HELIKA_ENDPOINT
GAMESIGHT_API_KEY
GAMESIGHT_PROJECT_ID
GAMESIGHT_ENDPOINT

# Marketplace
MAGIC_EDEN_API_KEY
MAGIC_EDEN_BASE_URL
SHYFT_MARKET_BASE_URL
GAMESHIFT_API_KEY
GAMESHIFT_BASE_URL
GAMESHIFT_ENV

# Games program IDs
ARES1_PROGRAM_ID
AOF_CORE_PROGRAM_ID
NEONRELAY_REWARDS_PROGRAM_ID
GUTTERCAPS_CORE_PROGRAM_ID

# Cross-game
CROSS_GAME_INVENTORY_PROGRAM_ID=CgInv111111111111111111111111111111111111111
SESSION_KEYS_PROGRAM_ID=SessKeys111111111111111111111111111111111111
STUDIO_TREASURY_PROGRAM_ID=STrEaSuRy11111111111111111111111111111111111
```

---

## Безопасность — обязательно

- Удалить секреты из git истории .env CI logs artifacts via gitleaks
- Ротировать все ключи которые могли попасть в репозиторий
- Не передавать Watchtower: private keys, payer keypair, upgrade authority key, treasury signer, reward signer, admin token, seed phrase
- Создать отдельный read-only exporter/API — Watchtower не может делать blockchain writes
- Для опасных действий proposal flow: RBAC 2FA второе подтверждение multisig timelock audit log rollback
- Явно подтвердить что Watchtower интеграция не может выполнять blockchain writes — `watchtower_blockchain_writes_enabled 0` Prometheus metric
- Скрыть персональные данные и полные wallet addresses — pseudonymous playerKey hash
- Добавить consent/opt-out для коммуникаций и cross-game предложений
- Godot SDK — нет аудита, mainnet с осторожностью
- Helika — публично смещает фокус в AI-продукты — backup план
- Magic Eden — прекращает индексацию новых cNFT — Tensor Bubblegum v2
- Session Keys — риск ограничен только временным keypair + 0.01 SOL

---

## Definition of Done — интеграция готова если

- program IDs подтверждены runtime-проверкой solana program show
- deployment network зафиксирован localnet devnet staging production
- event decoder тестируется на реальных transaction fixtures
- backfill работает
- streaming LaserStream gRPC 24h replay failover работает
- deduplication по canonical identity cluster+slot+signature+instructionIndex+innerIndex работает
- finalized reconciliation работает confirmed vs finalized
- daily projections DAU/WAU/MAU retention считаются из реальных событий
- economy invariants vault >= liabilities minted <= issuance cap проверяются
- treasury и liabilities доступны read-only
- fraud signals доступны
- cross-game player keys обезличены pseudonymous
- consent/opt-out реализованы
- investor snapshots сохраняются immutable
- health/ready/metrics работают
- CI зелёный npm test build lint typecheck smoke
- есть rollback и incident runbook
- нет blockchain write path в Watchtower exporter — `blockchain_writes_enabled 0`

---

## Финальный отчёт — каждая команда должна вернуть

1. изменённые файлы
2. реализованные endpoints
3. event list и decoder version
4. program IDs и network
5. миграции
6. environment variables без секретных значений
7. команды тестов
8. результаты runtime smoke test
9. data-quality gaps
10. deployment blockers
11. rollback plan
12. список того что Watchtower теперь может считать актуальным
13. список того что пока остаётся partial или unavailable

---

## Watchtower OS — что уже внедрено в этом репо

- server/modules/identity/ — privy.js phantom.js firststep.js altude.js index.js unified onboardingFlow guest->embedded->native->linked cross-game PDA
- server/modules/session-keys/index.js — createSession getSession listSessions signAndSendTransaction revokeSession sessionKeysHealth sessionKeysConfig defaultTopUp 0.01 SOL defaultExpiry 60min max 0.1 SOL maxExpiry 24h scope allowedPrograms deniedInstructions risk maxLoss
- server/modules/assets/ — cnft.js CNFT_CONFIG Bubblegum Compression economics $110/M vs standard $1.8M savings x10000 warnings ME deprecated Tensor alternative cnftCollectionConfig cnftMintPayload cnftMarketplaceAdapter cnftHealth standard.js STANDARD_NFT_CONFIG standardNftCollection assetStrategy assetsConfig assetsHealth index.js
- server/modules/indexer/ — laserstream.js LASERSTREAM_CONFIG gRPC 24h replay failover WS DAS Priority Fee Webhooks laserStreamGrpcConfig WebSocket Das Priority Fee Webhook Health, shyft.js SHYFT_CONFIG REST NFT token wallet callback accelerated gPA p50 15ms shyftConfig CallbackConfig RestEndpoints Health, custom-pg.js CUSTOM_INDEXER_CONFIG PG TimescaleDB Redis tables timeseries multitenant tenant_id RLS cross-game materialized view features idempotency dedup cursor replay backfill reconnect gap detection finalized reconciliation parser versioning customIndexerConfig indexerAggregationStrategy customIndexerHealth, index.js indexerLayerConfig indexerHealth
- server/modules/l2/ — sonic.js SONIC_CONFIG HyperGrid dedicated grid thousands no contention Sorada 30-40x 5ms Rush ECS declarative world config SDK generates contracts sonicHyperGridConfig SoradaConfig RushEcsConfig sonicConfig Health, repla.js REPLA_CONFIG L3 repla-cli Anchor settle MagicBlock sequencer SDK Unity Unreal Godot replaCliConfig RollupConfig Health, magicblock.js MAGICBLOCK_CONFIG ER sub-10ms gasless Magic Actions auto triggers time account_change custom magicBlockErConfig ActionsConfig magicBlockConfig Health, index.js l2LayerConfig l2Health l2Router decisionTree routing highFreq casual readHeavy declarative
- server/modules/analytics/ — helika.js HELIKA_CONFIG cross-game dashboard Web2 in-game on-chain acquisition LiveOps A/B 10+ networks Yuga Labs Treasure warning AI focus helikaConfig EventMapping Health, gamesight.js GAMESIGHT_CONFIG Solana integration Anonymous Events Wallet ID Late ID Binding solana_wallet external_id mint buy sell transfer burn gameSightConfig AttributionSetup Health, index.js analyticsLayerConfig Health
- server/modules/marketplace/ — magiceden.js MAGIC_EDEN_CONFIG 120 QPM free Bearer MCC+MT cnft warning ME deprecated magicEdenConfig Endpoints InstructionBuilder Health, shyft-market.js SHYFT_MARKET_CONFIG escrow-less NFT in wallet until sale in-app за дни stats API shyftMarketplaceConfig Endpoints Builder Health, gameshift.js GAMESHIFT_CONFIG Solana Labs API-first no blockchain knowledge self-custodial wallet asset creation trading USD payments 170+ 100% chargeback gas abstraction gameShiftConfig Endpoints AssetBuilder Health, index.js marketplaceLayerConfig Health Aggregator decision Tensor primary cNFT ME+Tensor standard Shyft GameShift in-app USD
- server/modules/engines/ — unity.js UNITY_SDK_CONFIG Solana.Unity-SDK NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys unitySdkSetup Health, godot.js GODOT_SDK_CONFIG GDExtension 4.3+ nodes SolanaClient Keypair SPLToken CandyMachine AnchorProgram warning no audit godotSdkSetup Health, unreal.js UNREAL_SDK_CONFIG VAR META open SDK Bifrost C# Solnet C++ Blueprints Metaplex mint payments unrealSdkSetup Health, turbo.js TURBO_SDK_CONFIG Rust Turbo.Computer lightweight full RPC AI turboSdkSetup Health, web.js WEB_SDK_CONFIG @solana/web3.js @solana/kit wallet-adapter Privy Phantom sessionKeys cnft webSdkSetup Health, index.js enginesLayerConfig Health
- server/modules/os.js — watchtowerOSConfig watchtowerOSHealth architecture 7 steps SDK support tenants layers identity sessionKeys assets indexer l2 analytics marketplace engines writes false dataQuality partial
- server/contracts/ — cross_game_inventory lib.rs anchor.toml CgInv111... create_profile add_cross_game_item link_item_to_game increment_games_played StudioProfile CrossGameItem, session_keys lib.rs SessKeys111... create_session revoke_session validate_session SessionToken allowed_programs denied_instructions, studio_treasury lib.rs STrEaSuRy111... initialize_treasury deposit request_withdraw TreasuryDeposited WithdrawRequested invariant vault>=liabilities
- sdk/ — unity README.md web README.md godot README.md unreal README.md turbo README.md — install codeExamples Identity Session Keys cNFT Indexer L2 Analytics Marketplace cross-game PDA Watchtower endpoint
- src/os/ — styles.css os-grid os-card os-badge ok warn crit os-row os-layers os-layer os-mono, index.js fetchOS renderOSPanel 8 cards Identity Session Keys Assets cNFT Indexer LaserStream L2 Sonic REPLA MagicBlock Analytics Helika GameSight Marketplace ME Shyft GameShift Engines Unity Godot Unreal Turbo Web tenants layers mono API routes health
- src/main.js — updated OS v1.0 sidebar WORKSPACE WATCHTOWER OS 7 LAYERS Identity Privy/Phantom Session Keys JWT Web3 Assets cNFT $110/M Indexer LaserStream L2 Sonic/REPLA/MB Analytics Helika/GS Marketplace ME/Shyft/GS Engines SDKs INTELLIGENCE ДЛЯ КОМАНДЫ metrics OS Layers 8 active SDKs 5 engines #os-panel syncOS fetchOS renderOSPanel refresh-btn syncOS+syncFromApi nav click scroll OS: labels
- server/index.js — updated OS API routes /api/os/config health /api/identity/* /api/session-keys/* /api/assets/* /api/indexer/* /api/l2/* /api/analytics/* /api/marketplace/* /api/engines/* /api/sdk/unity godot unreal turbo web + original Watchtower routes health readyz overview read-model ingestion infra analytics funnels players cross-game campaigns investors snapshots adjacent control metrics audit games ingestion events ingest solana trafficgen games alerts ai report games forecast
- prompts/studio-os/ — 6 промтов для команд Unity Godot Unreal Web Backend Indexer L2 Analytics Marketplace

---

## Как запустить

```bash
npm install
npm run dev:api # API on 0.0.0.0:8787 — Watchtower OS API listening 7 layers
npm run dev # Vite on 0.0.0.0:5173 — proxy /api to 8787
```

Проверка:
```
GET http://localhost:8787/api/os/config
GET http://localhost:8787/api/os/health
GET http://localhost:8787/api/identity/health
GET http://localhost:8787/api/session-keys/health
GET http://localhost:8787/api/assets/health
GET http://localhost:8787/api/indexer/health
GET http://localhost:8787/api/l2/health
GET http://localhost:8787/api/analytics/health
GET http://localhost:8787/api/marketplace/health
GET http://localhost:8787/api/engines/health
GET http://localhost:8787/api/sdk/unity?gameId=ares1
```

Frontend: http://localhost:5173 — Watchtower OS панель с 8 карточками слоёв

---

## Промты для остальных — как взаимодействовать с тобой и экосистемой

Все промты в `prompts/studio-os/`:
- `PROMPT_UNITY_TEAM.md` — Unity команда: Solana.Unity-SDK + Privy + Session Keys + cNFT $110/M + LaserStream + Sonic HyperGrid + MagicBlock ER + Helika + GameSight Late ID Binding + ME 120 QPM + Shyft escrow-less + GameShift USD
- `PROMPT_GODOT_TEAM.md` — Godot 4.3+ GDExtension + guest FirstStep analog + session keypair 0.01 SOL + cNFT Bubblegum + LaserStream HTTP + Sonic HyperGrid + MagicBlock + Analytics + Shyft escrow-less, caution mainnet no audit
- `PROMPT_UNREAL_TEAM.md` — Unreal VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex mint payments + Identity + Session Keys 0.01 SOL + cNFT + Indexer HTTP + L2 Sonic HyperGrid MagicBlock + Analytics + Marketplace ME Shyft GameShift + cross-game PDA
- `PROMPT_WEB_TEAM.md` — Web React Next.js @solana/web3.js @solana/kit + Privy React useCreateWallet useSolanaWallets + Phantom Connect + FirstStep guest + Altude gasless + Session Keys createSession signAndSend + cNFT createUmi mplBubblegum mintV2 + Indexer /api/ingest/solana + L2 Sonic HyperGrid Sorada Rush REPLA repla-cli MagicBlock ER Magic Actions + Analytics Helika GameSight solana_wallet external_id Late ID Binding + Marketplace ME 120 QPM Shyft escrow-less GameShift USD + in-app marketplace за дни + cross-game PDA
- `PROMPT_BACKEND_INDEXER_TEAM.md` — Backend Indexer Helius LaserStream gRPC 24h replay failover Yellowstone @triton-one/yellowstone-grpc helius SDK subscription game PDAs CgInv SessKeys STrEaSuRy commitment confirmed PG raw_events parsed_events Prometheus indexer_lag_slots finalized_lag_slots rpc_latency_ms + Shyft REST NFT token wallet gPA accelerated p50 15ms callback TOKEN_MINT NFT_MINT webhook handler /api/webhooks/shyft/:gameId + Custom PG PostgreSQL TimescaleDB Redis tables timeseries multitenant tenant_id RLS cross-game materialized view idempotency deduplication cursor replay backfill reconnect gap detection finalized reconciliation parser versioning PG schema TimescaleDB hypertables Redis queues cache realtime gap detection backfill getSignaturesForAddress getTransaction cursor store aggregation flow LaserStream gRPC -> Shyft Callback -> Custom PG -> TimescaleDB -> Redis -> Watchtower API read-model guarantees idempotency gap backfill finalized reconciliation parser versioning parsing Anchor IDL Bubblegum DAS cross-game CgInv session keys SessKeys treasury STrEaSuRy API /api/ingest/solana /api/events /api/ingestion/status /api/ingestion/adapters /api/infra/solana /api/indexer/health config /metrics
- `PROMPT_L2_TEAM.md` — L2 Rollups Sonic HyperGrid dedicated grid thousands no contention Sorada 30-40x 5ms Rush ECS declarative REPLA L3 repla-cli Anchor settle mainnet MagicBlock sequencer SDK Unity Unreal Godot MagicBlock ER sub-10ms gasless accounts delegated ER tx there state returns Solana Magic Actions auto triggers time cron account_change custom autoHarvest auto grant reward auto settle router decision tree routing highFrequency Sonic HyperGrid ARES-1 Neon Relay casual REPLA/MagicBlock AOF GUTTERCAPS readHeavy Sorada leaderboards inventory reads declarative Rush ECS world config generates contracts router API GET /api/l2/router monitoring tps latency grid health delegation status action execution Prometheus health config
- `PROMPT_ANALYTICS_TEAM.md` — Analytics Helika cross-game dashboard Web2 in-game on-chain acquisition attribution LiveOps A/B 10+ Yuga Labs Treasure warning AI focus + GameSight Solana integration Anonymous Events Wallet ID solana_wallet external_id Late ID Binding mint buy sell transfer burn Helika client mapping Web2 page views ad clicks SEO/GEO X/Twitter Blinks short videos whale radar TipLink trafficgen in-game PlayerJoined SessionStarted MatchFinished on-chain TokenMinted NFT_MINT via DAS LaserStream cross-game DAU/WAU/MAU cross-game players studio_profile PDA retention D1/D7/D30 payer conversion ARPDAU LTV A/B LiveOps warning AI focus backup GameSight+Custom PG GameSight client Late ID Binding gamesight_click_id -> solana_wallet -> on-chain Anonymous Event Wallet ID flow ad_click click_id -> PlayerJoined external_id click_id -> WalletConnected solana_wallet -> mint Anonymous Event Wallet ID -> attribution cross-game studio_profile PDA links wallets enrichment solana_wallet campaign_id gamesight_click_id Unity Godot Unreal Web SDKs trafficgen TalkChart SEO/GEO X/Twitter Blinks short videos whale radar TipLink CampaignStarted SessionStarted PageView CTAClicked LandingReached DataGapDetected /api/ingest/trafficgen trafficAnalytics funnels crossGameSegments дашборды Helika cross-game GameSight attribution Watchtower read-model Frontend os panel health config
- `PROMPT_MARKETPLACE_TEAM.md` — Marketplace Magic Eden REST instructions 120 QPM free Bearer MCC+MT cNFT warning ME stops indexing new cNFT Tensor Bubblegum v2 + Shyft escrow-less NFT in wallet until sale in-app за дни stats API + GameShift API-first без знания блокчейна self-custodial wallet asset creation trading USD payments 170+ 100% chargeback газ берёт на себя cNFT warning ME deprecated Tensor + Assets cNFT $110/M vs standard $1.8M x10000 off-chain no token/mint Merkle Tree MCC Bubblegum v2 Standard mint token metadata master edition royalties use cases mass common consumable currency material lootbox_common rare legendary mythic founder land unique legendary_weapon founder_badge assetStrategy cNFT mass $110/M vs standard rare economics x10000 savings cNFT collection config mint payload marketplace adapter strategy aggregator router assetType cnft mass -> Tensor Shyft GameShift standard rare -> ME Tensor Shyft GameShift unified list buy USD checkout stats Shyft stats API one call+ME stats+GameShift in-app marketplace UI Shyft+GameShift за дни health config assets health strategy router

Каждый промт содержит: роль, что уже есть OS 7 layers, задачи по каждому слою с кодом примерами, что сдать, запреты, ENV без значений, API проверки, детали sdk/README.md docs/os/

---

## Следующие шаги для студии

1. Заполните ENV в `.env` — все ключи из раздела ENV
2. Запустите `npm run dev:api` + `npm run dev` — проверьте /api/os/health
3. Раздайте промты командам — каждая команда работает в своём репозитории, реализует интеграцию, возвращает финальный отчёт 13 пунктов
4. Backend команда запускает LaserStream gRPC + Shyft callbacks + PG
5. L2 команда запускает Sonic HyperGrid per game + MagicBlock ER + REPLA
6. Unity/Godot/Unreal/Web команды внедряют Identity + Session Keys + cNFT + L2 + Analytics + Marketplace
7. Analytics команда запускает Helika + GameSight + обогащение solana_wallet external_id Late ID Binding
8. Marketplace команда запускает ME + Shyft + GameShift + aggregator + in-app UI за дни
9. Проверьте Definition of Done — program IDs runtime, decoder fixtures, backfill, streaming 24h replay failover, deduplication canonical identity, finalized reconciliation, daily projections real events, economy invariants vault>=liabilities, treasury read-only, fraud signals, cross-game pseudonymous, consent/opt-out, investor snapshots immutable, health/ready/metrics, CI green, rollback runbook, no blockchain writes exporter blockchain_writes_enabled 0
10. Закрытая бета 20-50 игроков per game, соберите метрики экономики, retention, L2 latency, marketplace volume

---

## Контакты OS

- API: http://localhost:8787/api/os/config
- Health: http://localhost:8787/api/os/health
- Frontend: http://localhost:5173 — Watchtower OS панель
- Docs: docs/os/STUDIO_OS_ARCHITECTURE.md (этот файл)
- SDKs: sdk/unity|godot|unreal|web|turbo/README.md
- Prompts: prompts/studio-os/*.md
- Contracts: server/contracts/*/lib.rs
- Modules: server/modules/*/

---

*Watchtower OS v1.0 — мультитенантная ОС игровой студии — 7 слоёв + 5 движков — внедрена в этом репо*
*Leo Games Studio — 4 игры: ares1, aof, neonrelay, guttercaps*
*Все газовые сборы и взаимодействие с блокчейном берёт на себя GameShift/FirstStep/Altude/MagicBlock — gasless UX*
*Session Keys — риск ограничен только временным keypair + 0.01 SOL*
*Magic Eden прекращает индексацию новых cNFT — Tensor Bubblegum v2*
*Godot SDK — нет аудита, mainnet с осторожностью*
*Helika — публично смещает фокус в AI — backup план*

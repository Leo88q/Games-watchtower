# Watchtower OS v3 — Идеальный бесплатный стек без мусорки, дедуплицированный

## Версия 3.0.0 — 33 компонента (8 v1 + 12 v2 + 13 v3 best free)

Анализ всех инструментов v1+v2+v3, выбраны лучшие бесплатные без конкурентных дубликатов, идеальный стек для каждого действия а не мусорка.

---

## Анализ дубликатов и конкурентных протоколов — выбор лучшего бесплатного

### 1. create-solana-game vs solana-game-preset — дубликат scaffold

- **Оба:** scaffold Anchor + JS + Unity + Jest/Mocha/Bankrun тестирование
- **solana-game-preset:** Official starter Solana Foundation `npx create-solana-game` Anchor + JS + Unity scaffold rapid prototyping — **best free official**
- **create-solana-game:** Template Jest Mocha Bankrun quick start — дубликат preset
- **Решение:** Депрекейт `create-solana-game`, оставить `solana-game-preset` как scaffold + `Solana SLAM` LiteSVM Anchor Mocha как testing — идеальный бесплатный стек тестирования, не конкурентные
- **Категория:** scaffold testing

### 2. Aureus Arena SDK vs RitArena SDK — конкурентный дубликат AI arena

- **Оба:** TypeScript SDK AI agents arena autonomous bots compete prizes on Solana
- **Aureus:** onchain AI arena autonomous bots SOL + AUR prizes tournament mechanics AI
- **RitArena:** TypeScript SDK AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission — более полный lifecycle retry events
- **Решение:** Выбрать **RitArena SDK** как **best free arena** — full lifecycle retry logic event emission более полный, Aureus депрекейт как competitive duplicate
- **Категория:** AI arena

### 3. SolGuard vs SolShield — конкурентный дубликат AI аудит 130+

- **Оба:** AI tools automatic audit Solana smart contracts 130+ patterns signer checks rights bypass flash-loan exploits
- **SolGuard:** more established free 130+ patterns
- **SolShield:** similar
- **Решение:** Выбрать **SolGuard** как **best free AI audit** more established, SolShield депрекейт как duplicate
- **Категория:** security AI audit

### 4. Другие — не дубликаты, а комплементарные, оставляем все как идеальный стек

- **Security Auditing Skill vs Claude Skill:** Security Auditing Skill specialized security systematic audit Anchor Rust vulnerabilities prompt-based vs Claude Skill general Unity/MWA/state arch/testing — complementary, не дубликат, security skill лучше для security категории
- **Sentio CLI vs SolGuard:** Sentio CLI AST scanner static Rust common vuln patterns vs SolGuard AI auto audit 130+ patterns — Sentio static AST, SolGuard AI 130+ more comprehensive, complementary, не конкурентные
- **Xandeum vs Arweave/Shadow/Irys:** Arweave для cNFT off-chain metadata $110/M vs Xandeum exabyte scalable storage layer game states assets player data decentralized network exabytes — Xandeum лучше для scalable game state, Arweave fallback для cNFT metadata, complementary
- **PST vs Xandeum vs Core Attributes:** Xandeum scalable public off-chain exabyte vs PST private verifiable commitments on-chain encrypted off-chain hidden logic card games vs Core Attributes public on-chain key-value NFT stats readable programs DAS — три разных действия, complementary, идеальный стек хранения приватности
- **Access Protocol vs GameShift vs Gamba:** GameShift USD 170+ 100% chargeback gas abstraction vs Access Protocol stake-to-access sustainable income vs Gamba betting casino provably fair — каждый distinct, complementary
- **@idosgames/wallet vs RACE:** RACE multichain infra secure fair game bundles account management vs @idosgames/wallet bridge browser/mobile wallets EVM Solana RewardPool deposits withdrawals SPL — RACE broader multichain abstraction game bundles fairness, idosgames specific bridge wallet RewardPool, complementary, оба free, keep both distinct
- **Husks vs RitArena vs relayzero vs StealthSDK:** Husks AI autobattler NFT fighters procedural pixel INT8 vs RitArena arena lifecycle retry events vs relayzero agent economy network vs StealthSDK framework AI-games token STEALTH centralized economy — каждый distinct action autobattler vs arena vs economy network vs framework, complementary, идеальный стек AI agents
- **Arcium Rollups vs MagicBlock ER vs Sonic vs REPLA:** MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions vs Sonic HyperGrid dedicated grid thousands no contention vs REPLA repla-cli L3 Anchor settle MagicBlock sequencer vs Arcium confidential computing rollups privacy — MagicBlock для gasless UX, Sonic для high frequency isolation, REPLA для L3 CLI, Arcium для confidential privacy, complementary

---

## Идеальный бесплатный стек по категориям — для каждого действия

### Identity — best free
Privy useCreateWallet useSolanaWallets email/social enclave export + Phantom Connect Kit OAuth instant wallet + FirstStep guest gas sponsorship + Altude gasless relay + Session Keys createSession(targetProgram, topUp 0.01 SOL, expiry 60min) signAndSendTransaction risk 0.01 SOL — best free identity

### Assets — best free
- cNFT Bubblegum v2 Merkle Tree MCC $110/M off-chain no token/mint account Tensor primary ME deprecated for new cNFT — best free mass
- Metaplex Core Attributes Plugin on-chain key-value in NFT game stats characteristics readable by Solana programs indexable via DAS — **best free on-chain stats**
- Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes — **best free scalable storage** better than Arweave for game state
- Standard NFT rare legendary
- Strategy: cNFT $110/M mass + Core Attributes on-chain key-value best free + Xandeum exabyte scalable best free + Standard rare

### Indexer — best free
Helius LaserStream gRPC 24h replay failover + WS + DAS + Priority Fee + Webhooks + Shyft REST callbacks accelerated gPA p50 15ms + Custom PG PostgreSQL TimescaleDB Redis idempotency gap backfill + ARC ComponentAdded Bolt PlotPlanted RaceStarted CapShot DePIN WorkerStaked Gamba WagerCreated Husks FighterSummoned RitArena BotCreated RACE CrossChainLinked — best free indexer

### L2 — best free ideal stack
- Sonic HyperGrid dedicated grid thousands no contention high frequency ARES-1 Neon Relay real-time PvP — best free high frequency
- Sorada 30-40x faster RPC 5ms reads leaderboards inventory — best free reads
- Rush ECS declarative world config generates Anchor contracts — best free declarative
- REPLA repla-cli L3 Anchor settle MagicBlock sequencer — best free L3 CLI
- MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto battle tournament — best free gasless
- Arcium Rollups confidential computing rollups gaming payments architecture privacy — **best free privacy rollup** complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA
- PST private verifiable commitments hidden logic card games — **best free private state**
- Xandeum exabyte scalable — **best free scalable storage**
- Ideal free L2 privacy storage: Sonic HyperGrid + MagicBlock ER sub-10ms + REPLA L3 + Arcium confidential rollups privacy + PST private verifiable + Xandeum exabyte = full coverage

### Analytics — best free
Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV cross-game retention which funnel brings most valuable SEO/GEO Blinks short videos whale radar TipLink vs payer LTV Python sklearn RandomForest campaign proposal POST /api/campaigns/proposals churn risk >0.7 — best free analytics ML

### Marketplace — best free
ME 120 QPM Bearer MCC+MT + Shyft escrow-less in-app за дни stats API + GameShift USD 170+ 100% chargeback gas abstraction + Tensor cNFT Bubblegum v2 + Gamba wager NFT provably fair + Husks fighter + RitArena bot + RACE multichain + Access Protocol stake-to-access sustainable income best free monetization + @idosgames/wallet bridge EVM Solana RewardPool best free bridge — best free marketplace monetization

### Engines — best free
- Unity Solana.Unity-SDK NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys из коробки + Preset Unity client scaffold + Core Attributes on-chain key-value readable programs — best free Unity
- Godot detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog temporary keypair 0.01 SOL + Core Attributes — best free Godot
- Gamba monorepo betting casino core React hooks UI framework provably fair house edge 5% jackpot server seed client seed nonce verifiable random hooks useGamba usePlay useWager UI GambaUi WagerInput GameResult Jackpot — best free betting
- Preset official starter Solana Foundation npx create-solana-game Anchor + JS + Unity scaffold rapid prototyping — **best free official scaffold**, create-solana-game duplicate deprecated
- RitArena SDK AI agents arena full lifecycle retry events — **best free arena** chosen over Aureus duplicate
- relayzero agent economy network — **best free agent economy**
- StealthSDK framework AI-games token STEALTH centralized economy — **best free AI-games framework**
- Xandeum scalable storage — **best free scalable**
- PST private verifiable — **best free private**
- Core Attributes on-chain key-value — **best free on-chain stats**
- Ideal free engines: Unity + Godot detailed + Gamba + Preset official + RitArena best free arena + relayzero + StealthSDK + Xandeum + PST + Core Attributes

### Infra — best free ideal stack
- ARC Entity-Component interoperability composability cross-game items characters via same Components — best free interoperability
- Bolt FOCG fully on-chain verifiable no server trust — best free FOCG
- DePIN Beamable license escrow rewards staking workers cost saving — best free decentralized compute
- Arcium Rollups confidential computing rollups privacy — **best free privacy rollup**
- Xandeum scalable storage exabytes — **best free scalable storage**
- PST private verifiable commitments hidden logic card games — **best free private state**
- Core Attributes on-chain key-value NFT stats readable programs DAS — **best free on-chain stats**
- Ideal free infra storage privacy: ARC + Bolt + DePIN + Arcium + Xandeum + PST + Core Attributes = full coverage not competitive

### Security — best free ideal stack
- Solana Security Auditing Skill ready instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities signer/owner/PDA/CPI/reentrancy/overflow/access control — **best free security skill prompt-based**
- Sentio CLI AST scanner security Solana Anchor Rust common vuln patterns CI integration — **best free static AST scanner**
- SolGuard AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits — **best free AI audit 130+ patterns** chosen over SolShield duplicate
- Ideal free security: Security Auditing Skill prompt-based systematic audit + Sentio CLI static AST + SolGuard AI 130+ = full coverage not competitive, SolShield duplicate deprecated

### Testing — best free ideal stack
- Solana SLAM framework simplifying modular tests Solana programs stack Solana LiteSVM Anchor Mocha — **best free testing LiteSVM** more modern
- solana-game-preset official starter scaffold Anchor JS Unity — **best free official scaffold**
- create-solana-game template Jest Mocha Bankrun quick start duplicate of preset — **deprecated duplicate**
- Ideal free testing: Preset official scaffold + SLAM LiteSVM Anchor Mocha best free testing, create-solana-game duplicate deprecated

### Monetization DeFi — best free ideal stack
- Access Protocol stake-to-access sustainable income developers communities — **best free monetization stake-to-access**
- @idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL — **best free bridge payments**
- GameShift USD 170+ 100% chargeback gas abstraction — best free USD payments
- Gamba betting casino provably fair — best free betting
- Ideal free monetization bridge: Access Protocol stake-to-access + @idosgames/wallet bridge EVM Solana RewardPool + GameShift USD + Gamba = full monetization coverage not competitive

### AI Agents Autonomous Worlds — best free ideal stack
- Husks SDK AI autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP — **best free autobattler** unique category
- RitArena SDK AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission — **best free arena** chosen over Aureus competitive duplicate
- relayzero agent economy network RelayZero integrating agents into game processes — **best free agent economy** distinct
- StealthSDK framework AI-games Solana token STEALTH centralized economy — **best free AI-games framework** distinct
- Aureus Arena SDK deprecated competitive duplicate with RitArena — both AI arena bots compete prizes, RitArena better free full lifecycle retry events
- Ideal free AI agents: Husks autobattler + RitArena arena lifecycle retry events best free + relayzero agent economy + StealthSDK framework token STEALTH = full AI coverage not garbage

### Cross-Chain — best free ideal stack
- RACE Protocol multichain infra secure fair web3 games SDK sdk-solana CLI race-cli game bundles account management — best free multichain abstraction game bundles fairness
- @idosgames/wallet bridge EVM Solana RewardPool deposits withdrawals SPL — **best free bridge** complementary to RACE
- Ideal free cross-chain bridge: RACE multichain + @idosgames/wallet bridge = ideal free cross-chain bridge

### Storage State Privacy — best free ideal stack
- Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes — **best free scalable storage** better than Arweave for game state
- PST Private State Toolkit private but verifiable commitments on-chain encrypted off-chain hidden logic card games — **best free private verifiable**
- Core Attributes Plugin on-chain key-value NFT stats readable programs DAS — **best free on-chain stats**
- Ideal free storage privacy: Xandeum scalable public off-chain exabyte + PST private commitments on-chain encrypted off-chain + Core Attributes public on-chain key-value = full coverage storage privacy not competitive

### Privacy Rollups — best free ideal stack
- PST private verifiable commitments hidden logic card games — **best free private state**
- Arcium Rollups confidential computing rollups gaming payments architecture privacy — **best free privacy rollup** complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA
- Ideal free privacy: PST + Arcium = full privacy coverage

### Utils — best free ideal stack
- Claude Skill Unity SDK MWA state architecture onchain vs offchain testing — best free general utils
- Security Auditing Skill systematic audit vulnerabilities — **best free security utils**
- Ideal free utils: Claude Skill + Security Auditing Skill = full utils coverage

---

## Architecture v3 — 20 шагов (7 v1 + 7 v2 + 6 v3 ideal free)

1. Общий слой идентификации — Privy/embedded + Session Keys для всех 4 игр — server/modules/identity + session-keys PDA studio_profile — best free identity
2. Ончейн-программы — Anchor-контракты игровой логики общие PDA кросс-игрового инвентаря — server/contracts CgInv SessKeys STrEaSuRy
3. Масштабирование — Sonic SVM HyperGrid high frequency REPLA/MagicBlock casual + Arcium confidential rollups privacy + PST private verifiable + Xandeum exabyte scalable — server/modules/l2 + privacy/arcium.js + storage/xandeum.js + storage/private-state-toolkit.js — best free L2 privacy storage ideal stack
4. Индексация — LaserStream стриминг + Shyft REST/колбэки + собственный индексер + ARC Bolt DePIN Gamba Husks RitArena RACE — server/modules/indexer — best free indexer
5. Активы — cNFT массовые standard редкие + Core Attributes on-chain key-value best free on-chain stats + Xandeum exabyte scalable best free scalable Marketplace GameShift/Shyft — server/modules/assets + marketplace + storage — best free assets storage
6. Аналитика — Helika cross-game dashboard + GameSight attribution + Game Signals ML churn >85% — server/modules/analytics — best free analytics ML
7. Админка и монетизация — GameShift платежи + Access Protocol stake-to-access best free monetization + @idosgames/wallet bridge EVM Solana RewardPool best free bridge — server/modules/marketplace + monetization — best free monetization bridge
8. Игровые движки и SDK — основа клиентской части — Godot detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders + Gamba monorepo betting casino core React hooks UI framework provably fair + Preset official starter npx scaffold Anchor JS Unity best free official scaffold create-solana-game duplicate deprecated — server/modules/engines/godot-solana-sdk.js gamba.js solana-game-preset.js — best free engines
9. Инфраструктура и фреймворки — как устроена логика на блокчейне — ARC Entity-Component interoperability + Bolt FOCG verifiable + DePIN decentralized compute + Xandeum scalable exabytes best free scalable + PST private verifiable best free private + Core Attributes on-chain key-value best free on-chain stats + Arcium confidential rollups best free privacy rollup — server/modules/infra/arc.js bolt.js depin.js + privacy/arcium.js + storage/xandeum.js private-state-toolkit.js core-attributes.js — best free infra storage privacy ideal stack
10. Аналитика и ML — поведение игроков на уровне экосистемы — Game Signals 60M+ tx 12 games ML churn 14d >85% — server/modules/analytics/game-signals.js — best free ML
11. Платежи и монетизация — высокопроизводительный бэкенд — Rust API Actix create join calculate withdraw Swagger + Access Protocol stake-to-access best free + @idosgames/wallet bridge EVM Solana RewardPool best free bridge — server/modules/payments/solana-game-api-rust.js + monetization/access-protocol.js idosgames-wallet.js — best free payments monetization bridge
12. AI-агенты — интеграция ИИ в геймплей — Husks autobattler INT8 best free + RitArena arena lifecycle retry events best free chosen over Aureus duplicate + relayzero agent economy best free + StealthSDK framework token STEALTH best free + Aureus deprecated competitive duplicate — server/modules/ai/husks.js ritarena.js relayzero.js stealthsdk.js — best free AI agents ideal stack not garbage
13. Кросс-чейн и совместимость — экспансия за пределы Solana — RACE multichain SDK sdk-solana CLI race-cli bundles + @idosgames/wallet bridge EVM Solana RewardPool best free bridge complementary to RACE — server/modules/cross-chain/race.js + monetization/idosgames-wallet.js — best free cross-chain bridge
14. Дополнительные утилиты — AI в разработке + Security + Testing — Claude Skill Unity SDK MWA state arch testing + Security Auditing Skill systematic audit best free security skill + Sentio CLI AST scanner best free static + SolGuard AI auto audit 130+ best free AI audit chosen over SolShield duplicate + Solana SLAM LiteSVM Anchor Mocha best free testing create-solana-game duplicate of preset deprecated — server/modules/utils/claude-skill.js + security/security-auditing-skill.js sentio-cli.js solguard.js + testing/solana-slam.js — best free utils security testing ideal stack
15. Security — идеальный бесплатный стек аудита — Security Auditing Skill AI instructions systematic audit + Sentio CLI AST scanner static + SolGuard AI auto audit 130+ best free chosen over SolShield duplicate — server/modules/security/ — best free security ideal stack full coverage not competitive
16. Storage State Privacy — идеальный бесплатный стек хранения приватности — Xandeum scalable exabytes best free scalable + PST private verifiable best free private + Core Attributes on-chain key-value best free on-chain stats — server/modules/storage/ — best free storage privacy ideal stack full coverage not competitive
17. Monetization DeFi — идеальный бесплатный стек монетизации — Access Protocol stake-to-access best free + @idosgames/wallet bridge EVM Solana RewardPool best free bridge — server/modules/monetization/ — best free monetization bridge ideal stack
18. AI Agents Autonomous Worlds — идеальный бесплатный стек ИИ — Husks autobattler INT8 best free + RitArena arena lifecycle retry events best free chosen over Aureus duplicate + relayzero agent economy best free + StealthSDK framework token STEALTH best free — server/modules/ai/ — best free AI agents ideal stack not garbage
19. Testing Simulation — идеальный бесплатный стек тестирования — Solana SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold best free scaffold create-solana-game duplicate deprecated — server/modules/testing/ — best free testing ideal stack
20. Infrastructure Rollups Privacy — идеальный бесплатный стек роллапов приватности — Arcium Rollups confidential computing rollups best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA + StealthSDK framework AI-games token STEALTH — server/modules/privacy/ — best free privacy rollup ideal stack

Full Stack v3: v1 7 layers + v2 12 products + v3 13 best free ideal stack deduplicated = 32 components total, tenants ares1 aof neonrelay guttercaps, cross-game via studio_profile PDA + ARC Entity-Component + Bolt world + RACE multichain + DePIN decentralized compute + Game Signals ML churn >85% + Husks RitArena relayzero StealthSDK AI agents + Gamba betting provably fair + Preset official scaffold + Rust Actix high-performance backend + Access Protocol stake-to-access + idosgames bridge EVM Solana RewardPool + Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value + Arcium confidential rollups + Security Auditing Skill Sentio SolGuard best free security + Solana SLAM best free testing + Claude Skill AI code generation, ideal free per category not garbage, duplicates deprecated: create-solana-game duplicate of preset, Aureus duplicate of RitArena, SolShield duplicate of SolGuard

---

## API Routes v3 — 33 components

- /api/os/config v3 33 components ideal free stack
- /api/os/health 19 layers
- /api/identity/config health wallet tenant/:gameId
- /api/session-keys/config health create list :token sign revoke
- /api/assets/config health cnft/collection strategy?gameId=ares1&itemType=common&rarity=common
- /api/indexer/config health
- /api/l2/config health router?gameId=ares1&tps=high|low&ux=gasless
- /api/analytics/config health
- /api/marketplace/config health router?gameId=ares1&assetType=cnft
- /api/engines/config health
- /api/sdk/unity godot unreal turbo web
- /api/sdk/godot-solana SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog
- /api/sdk/gamba monorepo core hooks UI provably fair house edge 5% jackpot
- /api/sdk/preset npx scaffold Anchor JS Unity best free official, create-solana-game duplicate deprecated
- /api/sdk/ritarena TypeScript AI agents arena full lifecycle retry events best free chosen over Aureus
- /api/sdk/relayzero agent economy network best free
- /api/sdk/stealthsdk framework AI-games token STEALTH best free
- /api/sdk/xandeum scalable storage exabytes best free
- /api/sdk/pst private verifiable commitments best free
- /api/sdk/core-attributes on-chain key-value NFT stats readable programs DAS best free
- /api/sdk/access-protocol stake-to-access sustainable income best free
- /api/sdk/idosgames-wallet bridge EVM Solana RewardPool best free bridge
- /api/sdk/security-auditing-skill systematic audit vulnerabilities best free skill
- /api/sdk/sentio-cli AST scanner Rust best free static
- /api/sdk/solguard AI auto audit 130+ patterns best free chosen over SolShield
- /api/sdk/solana-slam LiteSVM Anchor Mocha best free testing
- /api/sdk/arcium confidential computing rollups best free privacy rollup
- /api/infra/config health arc bolt depin arcium xandeum pst core-attributes
- /api/game-signals/config health 60M+ tx 12 games ML churn 14d >85%
- /api/payments/config health rust-api
- /api/ai/config health husks aureus deprecated ritarena best free relayzero stealthsdk
- /api/cross-chain/config health race
- /api/utils/config health claude-skill
- /api/security/config health auditing-skill sentio-cli solguard best free security ideal stack
- /api/storage/config health xandeum pst core-attributes best free storage privacy ideal stack
- /api/monetization/config health access-protocol idosgames-wallet best free monetization bridge
- /api/testing/config health solana-slam create-solana-game duplicate deprecated best free testing
- /api/privacy/config health arcium best free privacy rollup
- /api/health mode watchtower-os-v3 osVersion 3.0.0 totalComponents 33 ideal free stack best free per category not garbage deduplicated
- /api/readyz
- POST /api/ingest/solana solana_wallet external_id Late ID Binding

---

## Security v3 Ideal Free

- noPrivateKeys readOnly blockchain_writes_enabled 0 pseudonymous playerKey consent/opt-out Godot no audit mainnet caution Helika AI focus backup ME deprecated cNFT Tensor primary Session Keys 0.01 SOL risk only topUp scope denied withdraw_treasury RBAC 2FA multisig timelock audit log rollback
- Best free security: Security Auditing Skill AI instructions systematic audit + Sentio CLI AST scanner static + SolGuard AI auto audit 130+ patterns chosen over SolShield duplicate
- Best free testing: Solana SLAM LiteSVM Anchor Mocha + Preset official scaffold, create-solana-game duplicate deprecated
- Best free storage: Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value
- Best free privacy: PST private verifiable + Arcium confidential rollups
- ENV names without values WATCHTOWER_INTEGRATION.md game_id program_ids CgInv SessKeys STrEaSuRy + game program network stage prototype data_quality partial last_verified_at

---

## Tenants — 4 игры ideal free stack v3

- ares1: strategy blockchain-writes-enabled data-quality partial last-verified-at stage prototype program_ids CgInv SessKeys STrEaSuRy + ARES1_CORE_PROGRAM_ID + ideal free stack v3 security storage monetization AI testing privacy
- aof: farming crafting trading marketplace cross-game inventory SQLite bottleneck PostgreSQL Redis program_ids CgInv SessKeys STrEaSuRy + AOF_CORE_PROGRAM_ID + ideal free stack
- neonrelay: race Neon DM server-authoritative identity reward ledger Solana economy session telemetry match_start/end mode result disconnect first finish first claim client crash race anti-cheat map speedrun checkpoint anomalies reward velocity pay-without-play play-without-pay ticket/claim conversion vault forecast reward pipeline age failed tx rate devnet staging program_ids CgInv SessKeys STrEaSuRy + NEONRELAY_REWARDS_PROGRAM_ID + ideal free stack
- guttercaps: pop-n-shoot casual ECS 8-12 30% memory leaked 1m memref quality issues retained 20% churn retained replays startup crash score death rate leaderboard filter cross-game stats program_ids CgInv SessKeys STrEaSuRy + GUTTERCAPS_CORE_PROGRAM_ID + ideal free stack

All tenants isolated via tenant_id + RLS PostgreSQL TimescaleDB Redis cross-game via studio_profile PDA + ARC Entity IDs + Bolt entity IDs + cross-chain linked wallets RACE + idosgames bridge EVM Solana RewardPool + common wallets via Game Signals ML 60M+ tx 12 games churn >85% + Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value + Arcium confidential rollups + Security Auditing Skill Sentio SolGuard best free security + Solana SLAM best free testing

---

## Frontend OS Panel v3 — 33 components cards ideal free stack

- Identity Layer 4 providers Privy Phantom FirstStep Altude best free
- Session Keys JWT Web3 temporary keypair 0.01 SOL best free
- Assets cNFT $110/M Standard + Core Attributes on-chain key-value best free + Xandeum exabyte scalable best free + Gamba Husks RitArena RACE multichain
- Indexer LaserStream + Shyft + PG + ARC Bolt DePIN Gamba Husks RitArena RACE best free
- L2 Sonic HyperGrid Sorada Rush REPLA MagicBlock ER sub-10ms gasless Magic Actions + Arcium confidential rollups privacy best free + PST private verifiable + Xandeum exabyte
- Analytics Helika + GameSight + Game Signals 60M+ tx 12 games ML churn 14d >85% best free
- Marketplace ME 120 QPM Shyft escrow-less GameShift USD 170+ Tensor Gamba Husks RitArena RACE multichain + Access Protocol stake-to-access best free + idosgames bridge best free
- Engines Unity Godot Unreal Turbo Web + Godot detailed Gamba Preset official best free + RitArena best free arena + relayzero agent economy + StealthSDK framework token STEALTH
- Infra ARC Entity-Component interoperability + Bolt FOCG verifiable + DePIN license escrow rewards staking workers + Arcium confidential rollups privacy best free + Xandeum exabyte scalable best free + PST private verifiable best free + Core Attributes on-chain key-value best free
- Game Signals ML 60M+ tx 12 games churn 14d >85% common wallets funnel LTV best free
- Payments Rust API Actix create join calculate withdraw Swagger high-performance + GameShift USD + Access Protocol stake-to-access best free + idosgames bridge best free
- AI Agents Husks autobattler INT8 best free + RitArena arena lifecycle retry events best free chosen over Aureus + relayzero agent economy best free + StealthSDK framework token STEALTH best free
- Cross-chain RACE multichain SDK sdk-solana CLI race-cli bundles publish networks Solana EVM fairness verifiable + @idosgames/wallet bridge EVM Solana RewardPool best free bridge
- Utils Claude Skill Unity SDK MWA state arch testing + Security Auditing Skill systematic audit best free
- Security Security Auditing Skill systematic audit best free skill + Sentio CLI AST scanner best free static + SolGuard AI auto audit 130+ best free chosen over SolShield duplicate ideal free stack
- Storage Xandeum exabyte scalable best free + PST private verifiable best free + Core Attributes on-chain key-value best free ideal free stack storage privacy
- Monetization Access Protocol stake-to-access best free + @idosgames/wallet bridge EVM Solana RewardPool best free bridge ideal free monetization bridge
- Testing Solana SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold best free scaffold create-solana-game duplicate deprecated ideal free testing
- Privacy Arcium confidential rollups best free privacy rollup + PST private verifiable best free private state ideal free privacy

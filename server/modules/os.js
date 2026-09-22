/**
 * Watchtower OS v3 — идеальный бесплатный стек, дедуплицированный
 * v1: 7 слоёв (Identity, Session Keys, Assets, Indexer, L2, Analytics, Marketplace, Engines) + 3 contracts
 * v2: 12 продуктов (Godot detailed, Gamba, Preset, ARC, Bolt, DePIN, Game Signals 60M+, Rust API, Husks, Aureus, RACE, Claude Skill)
 * v3: +13 новых лучших бесплатных из каждой категории, без мусорки, с анализом конкурентных дубликатов:
 *  Security: Security Auditing Skill (AI instructions), Sentio CLI (AST scanner), SolGuard (AI 130+ patterns) — best free, SolShield duplicate deprecated
 *  Storage/Privacy: Xandeum exabyte scalable, PST private verifiable commitments, Core Attributes on-chain key-value — best free, complementary
 *  Monetization: Access Protocol stake-to-access, @idosgames/wallet bridge EVM+Solana RewardPool — best free
 *  AI Agents: RitArena SDK arena lifecycle retry events (best free, replaces Aureus), relayzero agent economy, StealthSDK AI-games framework token STEALTH — best free, Aureus deprecated competitive duplicate
 *  Testing: Solana SLAM LiteSVM Anchor Mocha (best free), create-solana-game duplicate of preset deprecated
 *  Infra Privacy Rollups: Arcium Rollups confidential computing rollups — best free privacy rollup, complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA
 *  Ideal stack per action, not garbage, deduplicated, free preferred
 */

import { identityLayerConfig, identityHealth } from './identity/index.js'
import { sessionKeysConfig, sessionKeysHealth, createSession, getSession, listSessions, signAndSendTransaction, revokeSession } from './session-keys/index.js'
import { assetsConfig, assetsHealth, cnftCollectionConfig, assetStrategy } from './assets/index.js'
import { indexerLayerConfig, indexerHealth } from './indexer/index.js'
import { l2LayerConfig, l2Health, l2Router } from './l2/index.js'
import { analyticsLayerConfig, analyticsHealth } from './analytics/index.js'
import { marketplaceLayerConfig, marketplaceHealth, marketplaceAggregator } from './marketplace/index.js'
import { enginesLayerConfig, enginesHealth } from './engines/index.js'

// v2
import { infraLayerConfig, infraHealth, arcFrameworkSetup, boltFrameworkSetup, depinSetup, arciumSetup, xandeumSetup, privateStateToolkitSetup, coreAttributesSetup } from './infra/index.js'
import { gameSignalsSetup, gameSignalsHealth } from './analytics/game-signals.js'
import { paymentsLayerConfig, paymentsHealth, solanaGameApiRustSetup } from './payments/index.js'
import { aiAgentsLayerConfig, aiAgentsHealth, husksSdkSetup, aureusArenaSdkSetup, ritarenaSetup, relayzeroSetup, stealthsdkSetup } from './ai/index.js'
import { crossChainLayerConfig, crossChainHealth, raceProtocolSetup } from './cross-chain/index.js'
import { utilsLayerConfig, utilsHealth, claudeSkillSetup } from './utils/index.js'
import { godotSolanaSdkSetup, gambaSdkSetup, solanaGamePresetSetup } from './engines/index.js'

// v3 new
import { securityLayerConfig, securityHealth, securityAuditingSkillSetup, sentioCliSetup, solguardSetup } from './security/index.js'
import { storageLayerConfig, storageHealth } from './storage/index.js'
import { monetizationLayerConfig, monetizationHealth, accessProtocolSetup, idosgamesWalletSetup } from './monetization/index.js'
import { testingLayerConfig, testingHealth, solanaSlamSetup, createSolanaGameSetup } from './testing/index.js'
import { privacyLayerConfig, privacyHealth } from './privacy/index.js'

export function watchtowerOSConfig(env = process.env) {
  const base = {
    name: 'Watchtower OS',
    version: '3.0.0',
    description: 'Мультитенантная ОС игровой студии — 7 слоёв v1 + 12 продуктов v2 + 13 лучших бесплатных v3 идеальный стек без мусорки дедуплицированный',
    generatedAt: new Date().toISOString(),
    tenants: ['ares1', 'aof', 'neonrelay', 'guttercaps'],
    layers: {
      identity: identityLayerConfig(env),
      sessionKeys: sessionKeysConfig(),
      assets: assetsConfig(env),
      indexer: indexerLayerConfig(env),
      l2: l2LayerConfig(env),
      analytics: analyticsLayerConfig(env),
      marketplace: marketplaceLayerConfig(env),
      engines: enginesLayerConfig(env),
      // v2
      infra: infraLayerConfig(env),
      gameSignals: { config: gameSignalsSetup({ gameId: 'generic' }), health: gameSignalsHealth(env) },
      payments: paymentsLayerConfig(env),
      aiAgents: aiAgentsLayerConfig(env),
      crossChain: crossChainLayerConfig(env),
      utils: utilsLayerConfig(env),
      // v3 ideal free stack
      security: securityLayerConfig(env),
      storage: storageLayerConfig(env),
      monetization: monetizationLayerConfig(env),
      testing: testingLayerConfig(env),
      privacy: privacyLayerConfig(env),
    },
    v2Products: {
      engines: {
        godotSolanaSdk: 'GDExtension SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders — легковесный движок полный контроль ончейн-логики',
        gamba: 'Monorepo betting casino core + React hooks + UI framework provably fair — идеально для ставок казино механик',
        solanaGamePreset: 'Official starter Solana Foundation npx preset Anchor + JS + Unity scaffold rapid prototyping — best free scaffold, create-solana-game duplicate deprecated',
      },
      infra: {
        arc: 'JumpCrypto ARC Framework Entity-Component standard separation data/execution interoperability composability — предметы/персонажи из одной игры легко в другой',
        bolt: 'magicblock-labs Bolt high-performance FOCG autonomous worlds Solana SVM fully on-chain verifiable no server trust',
        depin: 'Beamable-Network DePIN PoC decentralized physical infra gaming compute license escrow rewards staking workers — вынести часть игровых серверов в децентрализованную сеть',
        arcium: 'Arcium Rollups confidential computing rollups gaming payments architecture privacy — best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA',
        xandeum: 'Xandeum scalable storage layer dApps Solana exabytes game states assets player data decentralized network exabytes — best free scalable storage better than Arweave for game state',
        pst: 'Private State Toolkit PST private but verifiable state commitments on-chain encrypted off-chain ideal for hidden logic card games — best free private verifiable',
        coreAttributes: 'Metaplex Core Attributes Plugin on-chain key-value in NFT game stats characteristics readable by programs indexable DAS — best free on-chain stats',
      },
      analyticsML: {
        gameSignals: '60M+ onchain tx 12 games ML churn 14d >85% common players via wallets — кросс-игровое удержание + какая воронка приводит самых ценных',
      },
      payments: {
        solanaGameApiRust: 'Rust Actix Web backend API create game join calculate withdraw Swagger — референс high-performance backend',
        accessProtocol: 'Access Protocol stake-to-access model sustainable income developers communities — best free monetization stake-to-access',
        idosgamesWallet: '@idosgames/wallet bridge browser/mobile wallets EVM Solana move tokens NFTs in/out RewardPool deposits withdrawals SPL — best free bridge payments',
      },
      aiAgents: {
        husks: 'TypeScript onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP — пример AI-агентов в геймплее best free autobattler',
        ritarena: 'RitArena SDK TypeScript AI agents arena autonomous bots compete prizes full lifecycle retry logic event emission — best free arena, chosen over Aureus competitive duplicate',
        relayzero: 'relayzero TypeScript SDK agent economy network RelayZero integrating agents into game processes — best free agent economy',
        stealthsdk: 'StealthSDK framework AI-games Solana token STEALTH centralized game economy — best free AI-games framework',
        aureusDeprecated: 'Aureus Arena SDK deprecated competitive duplicate with RitArena, both AI arena bots compete prizes, RitArena better free full lifecycle retry events',
      },
      crossChain: {
        race: 'Multichain infra secure fair web3 games TypeScript SDK sdk-solana CLI race-cli game bundles account management — готовый слой мультичейн-абстракции если экспансия за пределы Solana',
        idosgames: '@idosgames/wallet bridge EVM Solana RewardPool — best free bridge complementary to RACE',
      },
      security: {
        securityAuditingSkill: 'Solana Security Auditing Skill ready instructions for AI assistants Claude systematic audit Anchor Rust vulnerabilities — best free security skill prompt-based',
        sentioCli: 'Sentio CLI AST scanner security Solana Anchor Rust common vuln patterns — best free static AST scanner',
        solguard: 'SolGuard AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits — best free AI audit 130+ patterns, chosen over SolShield similar duplicate',
        solshieldDeprecated: 'SolShield similar AI audit 130+ patterns competitive duplicate with SolGuard, pick SolGuard more established best free',
      },
      testing: {
        solanaSlam: 'Solana SLAM framework simplifying modular tests Solana programs stack Solana LiteSVM Anchor Mocha — best free testing LiteSVM',
        createSolanaGameDeprecated: 'create-solana-game template Jest Mocha Bankrun quick start duplicate of solana-game-preset official starter, preset better free official, deprecate create-solana-game',
      },
      utils: {
        claudeSkill: 'Solana Game Skill for Claude Code skill addon for Claude — Unity SDK MWA state architecture onchain vs offchain testing — ускоряет генерацию корректного кода если используете AI',
        securityAuditingSkill: 'Security Auditing Skill for Claude — systematic audit vulnerabilities — best free security utils',
      },
      storage: {
        xandeum: 'Xandeum scalable storage exabytes — best free scalable storage',
        pst: 'PST private verifiable commitments — best free private state',
        coreAttributes: 'Core Attributes on-chain key-value — best free on-chain stats',
      },
      privacy: {
        arcium: 'Arcium Rollups confidential computing rollups — best free privacy rollup',
        pst: 'PST private verifiable — best free private state',
      },
    },
    v3IdealFreeStack: {
      analysis: 'Проанализированы все инструменты v1+v2+v3, выбраны лучшие бесплатные без конкурентных дубликатов, идеальный стек для каждого действия а не мусорка',
      duplicates: [
        { duplicate: 'create-solana-game vs solana-game-preset', both: 'scaffold Anchor JS Unity Jest Mocha Bankrun', bestFree: 'solana-game-preset official starter Solana Foundation npx preset Anchor JS Unity scaffold rapid prototyping', deprecated: 'create-solana-game template Jest Mocha Bankrun quick start duplicate, preset better free official', category: 'scaffold testing' },
        { duplicate: 'Aureus Arena SDK vs RitArena SDK', both: 'TypeScript SDK AI agents arena autonomous bots compete prizes on Solana', bestFree: 'RitArena SDK full lifecycle management retry logic event emission more complete', deprecated: 'Aureus Arena SDK competitive duplicate, RitArena better free', category: 'AI arena' },
        { duplicate: 'SolGuard vs SolShield', both: 'AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits', bestFree: 'SolGuard more established free 130+ patterns', deprecated: 'SolShield similar duplicate', category: 'security AI audit' },
      ],
      idealFreePerCategory: {
        identity: 'Privy useCreateWallet useSolanaWallets email/social enclave export + Phantom Connect Kit OAuth + FirstStep guest gas sponsorship + Altude gasless relay + Session Keys 0.01 SOL — best free identity',
        assets: 'cNFT Bubblegum v2 $110/M off-chain Merkle Tree MCC Tensor primary ME deprecated + Standard NFT + Core Attributes Plugin on-chain key-value readable programs DAS best free on-chain stats + Xandeum exabyte scalable storage best free scalable — ideal free assets storage',
        indexer: 'Helius LaserStream gRPC 24h replay failover + WS + DAS + Priority Fee + Webhooks + Shyft REST callbacks accelerated gPA p50 15ms + Custom PG PostgreSQL TimescaleDB Redis idempotency gap backfill + ARC ComponentAdded Bolt PlotPlanted RaceStarted CapShot DePIN WorkerStaked Gamba WagerCreated Husks FighterSummoned RitArena BotCreated RACE CrossChainLinked — best free indexer',
        l2: 'Sonic HyperGrid dedicated grid thousands no contention high frequency + Sorada 5ms 30-40x reads + Rush ECS declarative + REPLA repla-cli L3 Anchor settle MagicBlock sequencer + MagicBlock ER sub-10ms gasless delegate executeGasless commit state Magic Actions auto battle tournament + Arcium Rollups confidential computing rollups privacy — best free L2 privacy ideal stack',
        analytics: 'Helika cross-game dashboard + GameSight solana_wallet external_id Late ID Binding + Game Signals 60M+ tx 12 games ML churn 14d >85% common wallets funnel LTV — best free analytics ML',
        marketplace: 'ME 120 QPM Bearer MCC+MT + Shyft escrow-less + GameShift USD 170+ 100% chargeback + Tensor cNFT Bubblegum v2 + Gamba wager NFT + Husks fighter + RitArena bot + RACE multichain + Access Protocol stake-to-access + idosgames wallet bridge — best free marketplace monetization',
        engines: 'Unity Solana.Unity-SDK + Godot detailed SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders session keys analog + Gamba monorepo core hooks UI provably fair + Preset official npx scaffold Anchor JS Unity best free scaffold — ideal free engines',
        infra: 'ARC Entity-Component interoperability + Bolt FOCG verifiable + DePIN license escrow rewards staking workers + Arcium confidential rollups + Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value — ideal free infra storage privacy',
        security: 'Security Auditing Skill AI instructions systematic audit + Sentio CLI AST scanner static + SolGuard AI auto audit 130+ patterns best free — ideal free security',
        testing: 'Solana SLAM LiteSVM Anchor Mocha best free testing + Preset official scaffold — ideal free testing, create-solana-game duplicate deprecated',
        monetization: 'Access Protocol stake-to-access sustainable income + GameShift USD 170+ + Gamba betting provably fair + @idosgames/wallet bridge EVM Solana RewardPool — ideal free monetization bridge',
        aiAgents: 'Husks autobattler INT8 procedural pixel + RitArena arena lifecycle retry events best free arena (chosen over Aureus duplicate) + relayzero agent economy + StealthSDK framework token STEALTH — ideal free AI agents',
        crossChain: 'RACE multichain SDK sdk-solana CLI race-cli bundles publish Solana EVM fairness verifiable + @idosgames/wallet bridge EVM Solana RewardPool — ideal free cross-chain bridge',
        storage: 'Xandeum exabyte scalable + PST private verifiable commitments + Core Attributes on-chain key-value — ideal free storage privacy',
        privacy: 'PST private verifiable commitments hidden logic card games + Arcium confidential computing rollups payments — ideal free privacy',
        utils: 'Claude Skill Unity SDK MWA state arch testing + Security Auditing Skill systematic audit — ideal free utils',
      },
      freePreferred: true,
      notGarbage: 'Full ideal stack for each action, not garbage collection, deduplicated, best free per category',
    },
    architecture: {
      v1Steps: [
        { step: 1, layer: 'Общий слой идентификации', implementation: 'Privy или embedded-кошелёк + Session Keys для всех 4 игр', modules: ['server/modules/identity', 'server/modules/session-keys'], pda: 'studio_profile' },
        { step: 2, layer: 'Ончейн-программы', implementation: 'Anchor-контракты для игровой логики, общие PDA для кросс-игрового инвентаря', modules: ['server/contracts/cross_game_inventory', 'server/contracts/session_keys', 'server/contracts/studio_treasury'], programs: ['CgInv111...', 'SessKeys111...', 'STrEaSuRy111...'] },
        { step: 3, layer: 'Масштабирование', implementation: 'Sonic SVM (HyperGrid) для high frequency, REPLA/MagicBlock — для casual + Arcium confidential rollups privacy', modules: ['server/modules/l2', 'server/modules/privacy/arcium.js'] },
        { step: 4, layer: 'Индексация', implementation: 'LaserStream (стриминг) + Shyft (REST/колбэки) + собственный индексер + ARC Bolt DePIN Gamba Husks RitArena RACE', modules: ['server/modules/indexer'] },
        { step: 5, layer: 'Активы', implementation: 'cNFT массовые standard редкие + Core Attributes on-chain key-value + Xandeum exabyte scalable Marketplace GameShift/Shyft', modules: ['server/modules/assets', 'server/modules/marketplace', 'server/modules/storage'] },
        { step: 6, layer: 'Аналитика', implementation: 'Helika cross-game dashboard + GameSight attribution + Game Signals ML churn >85%', modules: ['server/modules/analytics'] },
        { step: 7, layer: 'Админка и монетизация', implementation: 'GameShift платежи + Access Protocol stake-to-access + @idosgames/wallet bridge', modules: ['server/modules/marketplace', 'server/modules/monetization'] },
      ],
      v2Steps: [
        { step: 8, layer: 'Игровые движки и SDK — основа клиентской части', products: ['Godot Solana SDK — GDExtension SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders легковесный полный контроль', 'Gamba SDK — monorepo betting casino core React hooks UI framework provably fair идеально для ставок казино', 'Solana Game Preset — official starter Solana Foundation npx preset Anchor + JS + Unity scaffold rapid prototyping best free scaffold, create-solana-game duplicate deprecated'], modules: ['server/modules/engines/godot-solana-sdk.js', 'server/modules/engines/gamba.js', 'server/modules/engines/solana-game-preset.js'] },
        { step: 9, layer: 'Инфраструктура и фреймворки — как устроена логика на блокчейне', products: ['ARC Framework — JumpCrypto Entity-Component standard separation data/execution interoperability composability — предметы/персонажи из одной игры легко в другой', 'Bolt — magicblock-labs high-performance FOCG autonomous worlds Solana SVM fully on-chain verifiable no server trust', 'DePIN Beamable — PoC decentralized physical infra gaming compute license escrow rewards staking workers — вынести часть серверов в децентрализованную сеть', 'Xandeum — scalable storage layer exabytes game states assets player data — best free scalable', 'PST — private verifiable state commitments on-chain encrypted off-chain hidden logic card games — best free private', 'Core Attributes — Metaplex Core Attributes Plugin on-chain key-value NFT stats readable programs DAS — best free on-chain stats', 'Arcium Rollups — confidential computing rollups gaming payments architecture privacy — best free privacy rollup'], modules: ['server/modules/infra/arc.js', 'server/modules/infra/bolt.js', 'server/modules/infra/depin.js', 'server/modules/privacy/arcium.js', 'server/modules/storage/xandeum.js', 'server/modules/storage/private-state-toolkit.js', 'server/modules/storage/core-attributes.js'] },
        { step: 10, layer: 'Аналитика и ML — поведение игроков на уровне экосистемы', products: ['Solana Game Signals — 60M+ tx 12 games ML churn 14d >85% common players via wallets — кросс-игровое удержание + какая воронка приводит самых ценных'], modules: ['server/modules/analytics/game-signals.js'] },
        { step: 11, layer: 'Платежи и монетизация — высокопроизводительный бэкенд', products: ['Solana Game API Rust — Actix Web create game join calculate withdraw Swagger — референс high-performance backend', 'Access Protocol — stake-to-access model sustainable income — best free monetization', '@idosgames/wallet — bridge EVM Solana RewardPool deposits withdrawals SPL — best free bridge'], modules: ['server/modules/payments/solana-game-api-rust.js', 'server/modules/monetization/access-protocol.js', 'server/modules/monetization/idosgames-wallet.js'] },
        { step: 12, layer: 'AI-агенты — интеграция ИИ в геймплей', products: ['Husks SDK — TypeScript onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP — best free autobattler', 'RitArena SDK — TypeScript AI agents arena autonomous bots compete prizes full lifecycle retry logic event emission — best free arena chosen over Aureus duplicate', 'relayzero — TypeScript SDK agent economy network RelayZero integrating agents into game processes — best free agent economy', 'StealthSDK — framework AI-games Solana token STEALTH centralized economy — best free AI-games framework', 'Aureus Arena SDK deprecated competitive duplicate with RitArena'], modules: ['server/modules/ai/husks.js', 'server/modules/ai/ritarena.js', 'server/modules/ai/relayzero.js', 'server/modules/ai/stealthsdk.js'] },
        { step: 13, layer: 'Кросс-чейн и совместимость — экспансия за пределы Solana', products: ['RACE Protocol — multichain infra secure fair web3 games TypeScript SDK sdk-solana CLI race-cli game bundles account management — готовый слой мультичейн-абстракции', '@idosgames/wallet — bridge EVM Solana RewardPool — best free bridge complementary to RACE'], modules: ['server/modules/cross-chain/race.js', 'server/modules/monetization/idosgames-wallet.js'] },
        { step: 14, layer: 'Дополнительные утилиты — AI в разработке + Security + Testing', products: ['Solana Game Skill for Claude Code — skill addon for Claude — Unity SDK MWA state architecture onchain vs offchain testing — accelerates correct code generation', 'Solana Security Auditing Skill — ready instructions for AI assistants Claude systematic audit Anchor Rust vulnerabilities — best free security skill', 'Sentio CLI — AST scanner security Solana Anchor Rust common vuln patterns — best free static scanner', 'SolGuard — AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits — best free AI audit chosen over SolShield duplicate', 'Solana SLAM — framework simplifying modular tests Solana programs stack Solana LiteSVM Anchor Mocha — best free testing, create-solana-game duplicate of preset deprecated'], modules: ['server/modules/utils/claude-skill.js', 'server/modules/security/security-auditing-skill.js', 'server/modules/security/sentio-cli.js', 'server/modules/security/solguard.js', 'server/modules/testing/solana-slam.js'] },
      ],
      v3Steps: [
        { step: 15, layer: 'Security — идеальный бесплатный стек аудита', products: ['Security Auditing Skill — AI instructions systematic audit Anchor Rust vulnerabilities — best free skill', 'Sentio CLI — AST scanner Rust common vuln patterns — best free static', 'SolGuard — AI auto audit 130+ patterns — best free AI audit chosen over SolShield duplicate'], modules: ['server/modules/security/security-auditing-skill.js', 'server/modules/security/sentio-cli.js', 'server/modules/security/solguard.js'], idealFree: true },
        { step: 16, layer: 'Storage State Privacy — идеальный бесплатный стек хранения приватности', products: ['Xandeum — scalable storage layer exabytes game states assets player data — best free scalable better than Arweave', 'PST — Private State Toolkit private but verifiable commitments on-chain encrypted off-chain hidden logic card games — best free private', 'Core Attributes — Metaplex Core Attributes Plugin on-chain key-value NFT stats readable programs DAS — best free on-chain stats'], modules: ['server/modules/storage/xandeum.js', 'server/modules/storage/private-state-toolkit.js', 'server/modules/storage/core-attributes.js'], idealFree: true },
        { step: 17, layer: 'Monetization DeFi — идеальный бесплатный стек монетизации', products: ['Access Protocol — stake-to-access sustainable income — best free monetization', '@idosgames/wallet — bridge EVM Solana RewardPool deposits withdrawals SPL — best free bridge'], modules: ['server/modules/monetization/access-protocol.js', 'server/modules/monetization/idosgames-wallet.js'], idealFree: true },
        { step: 18, layer: 'AI Agents Autonomous Worlds — идеальный бесплатный стек ИИ', products: ['Husks — autobattler INT8 best free', 'RitArena — arena lifecycle retry events best free chosen over Aureus duplicate', 'relayzero — agent economy network best free', 'StealthSDK — framework AI-games token STEALTH best free'], modules: ['server/modules/ai/husks.js', 'server/modules/ai/ritarena.js', 'server/modules/ai/relayzero.js', 'server/modules/ai/stealthsdk.js'], idealFree: true, deprecated: ['Aureus Arena SDK competitive duplicate with RitArena'] },
        { step: 19, layer: 'Testing Simulation — идеальный бесплатный стек тестирования', products: ['Solana SLAM — LiteSVM Anchor Mocha best free testing', 'solana-game-preset official scaffold best free scaffold, create-solana-game duplicate deprecated'], modules: ['server/modules/testing/solana-slam.js'], idealFree: true, deprecated: ['create-solana-game duplicate of preset'] },
        { step: 20, layer: 'Infrastructure Rollups Privacy — идеальный бесплатный стек роллапов приватности', products: ['Arcium Rollups — confidential computing rollups gaming payments architecture privacy best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA', 'StealthSDK — framework AI-games token STEALTH'], modules: ['server/modules/privacy/arcium.js'], idealFree: true },
      ],
      fullStack: 'v1 7 layers + v2 12 products + v3 13 best free ideal stack deduplicated = 32 components total, tenants ares1 aof neonrelay guttercaps, cross-game via studio_profile PDA + ARC Entity-Component + Bolt world + RACE multichain + DePIN decentralized compute + Game Signals ML churn >85% + Husks RitArena relayzero StealthSDK AI agents + Gamba betting provably fair + Preset official scaffold + Rust Actix high-performance backend + Access Protocol stake-to-access + idosgames bridge EVM Solana RewardPool + Xandeum exabyte scalable + PST private verifiable + Core Attributes on-chain key-value + Arcium confidential rollups + Security Auditing Skill Sentio SolGuard best free security + Solana SLAM best free testing + Claude Skill AI code generation, ideal free per category not garbage, duplicates deprecated: create-solana-game duplicate of preset, Aureus duplicate of RitArena, SolShield duplicate of SolGuard',
    },
    sdkSupport: {
      unity: 'Solana.Unity-SDK NFT RPC Candy Machine Phantom deep links WebGL MWA Session Keys из коробки + Solana Game Preset Unity client scaffold + Core Attributes on-chain key-value readable programs',
      godot: 'godot-solana-sdk GDExtension 4.3+ SolanaClient WalletAdapter AnchorProgram Candy Machine SPL builders — легковесный полный контроль + Godot Solana SDK detailed nodes builders + Core Attributes readable programs',
      unreal: 'VAR META open SDK + Bifrost C# Solnet C++ Blueprints Metaplex mint payments + Core Attributes',
      turbo: 'Turbo.Computer Rust lightweight full RPC AI generation',
      web: '@solana/web3.js @solana/kit base + Gamba SDK React hooks UI framework betting + Husks SDK AI autobattler + RitArena SDK AI arena lifecycle retry events best free arena + relayzero agent economy + StealthSDK AI-games framework token STEALTH + RACE Protocol SDK sdk-solana multichain + @idosgames/wallet bridge EVM Solana RewardPool + Xandeum scalable storage + PST private verifiable + Core Attributes on-chain key-value + Access Protocol stake-to-access + Arcium confidential rollups',
      gamba: 'Gamba SDK monorepo betting casino core React hooks UI framework provably fair — for GUTTERCAPS wager PvP Neon Relay prize pools',
      preset: 'Solana Game Preset npx create-solana-game Anchor + JS + Unity scaffold rapid prototyping best free official scaffold, create-solana-game duplicate deprecated, use preset + Solana SLAM LiteSVM Anchor Mocha best free testing',
      ritarena: 'RitArena SDK TypeScript AI agents arena autonomous bots compete prizes full lifecycle retry logic event emission — best free arena chosen over Aureus duplicate',
      relayzero: 'relayzero TypeScript SDK agent economy network RelayZero integrating agents into game processes — best free agent economy',
      stealthsdk: 'StealthSDK framework AI-games Solana token STEALTH centralized economy — best free AI-games framework',
      xandeum: 'Xandeum scalable storage layer exabytes game states assets player data — best free scalable',
      pst: 'PST Private State Toolkit private verifiable commitments — best free private',
      coreAttributes: 'Core Attributes Plugin on-chain key-value NFT stats readable programs DAS — best free on-chain stats',
      accessProtocol: 'Access Protocol stake-to-access sustainable income — best free monetization',
      idosgames: '@idosgames/wallet bridge EVM Solana RewardPool — best free bridge',
      securityAuditingSkill: 'Security Auditing Skill ready instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities — best free security skill',
      sentio: 'Sentio CLI AST scanner security — best free static scanner',
      solguard: 'SolGuard AI auto audit 130+ patterns — best free AI audit chosen over SolShield duplicate',
      solanaSlam: 'Solana SLAM LiteSVM Anchor Mocha — best free testing',
      arcium: 'Arcium Rollups confidential computing rollups — best free privacy rollup',
    },
    infraSupport: {
      arc: 'ARC Framework JumpCrypto Entity-Component standard separation data/execution interoperability composability cross-game items characters',
      bolt: 'Bolt magicblock-labs high-performance FOCG autonomous worlds Solana SVM fully on-chain verifiable no server trust + MagicBlock ER sub-10ms gasless + Arcium confidential rollups privacy',
      depin: 'DePIN Beamable decentralized physical infra gaming compute license escrow rewards staking workers — move part of game servers to decentralized network',
      xandeum: 'Xandeum scalable storage layer exabytes game states assets player data decentralized network exabytes — best free scalable storage better than Arweave',
      pst: 'PST private verifiable state commitments on-chain encrypted off-chain hidden logic card games — best free private',
      coreAttributes: 'Core Attributes on-chain key-value NFT stats readable programs DAS — best free on-chain stats',
      arcium: 'Arcium Rollups confidential computing rollups gaming payments architecture privacy — best free privacy rollup complementary to MagicBlock ER sub-10ms Sonic HyperGrid REPLA',
    },
    mlSupport: {
      gameSignals: '60M+ tx 12 games ML churn 14d >85% common players via wallets funnel LTV — cross-game retention + which funnel brings most valuable users',
    },
    paymentsSupport: {
      rustApi: 'Solana Game API Rust Actix Web create game join calculate withdraw Swagger high-performance backend reference',
      gameshift: 'GameShift USD 170+ countries 100% chargeback gas abstraction',
      accessProtocol: 'Access Protocol stake-to-access sustainable income — best free monetization',
      idosgamesWallet: '@idosgames/wallet bridge EVM Solana RewardPool deposits withdrawals SPL — best free bridge',
    },
    aiSupport: {
      husks: 'Husks SDK TypeScript onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP — best free autobattler',
      ritarena: 'RitArena SDK TypeScript AI agents arena autonomous bots compete prizes full lifecycle retry logic event emission — best free arena chosen over Aureus duplicate',
      relayzero: 'relayzero TypeScript agent economy network RelayZero integrating agents into game processes — best free agent economy',
      stealthsdk: 'StealthSDK framework AI-games Solana token STEALTH centralized economy — best free AI-games framework',
      aureusDeprecated: 'Aureus Arena SDK deprecated competitive duplicate with RitArena, RitArena better free full lifecycle retry events',
    },
    crossChainSupport: {
      race: 'RACE Protocol multichain secure fair web3 games TypeScript SDK sdk-solana CLI race-cli game bundles account management — multichain abstraction if expansion beyond Solana',
      idosgames: '@idosgames/wallet bridge EVM Solana RewardPool — best free bridge complementary to RACE',
    },
    securitySupport: {
      securityAuditingSkill: 'Solana Security Auditing Skill ready instructions AI assistants Claude systematic audit Anchor Rust vulnerabilities — best free security skill prompt-based',
      sentioCli: 'Sentio CLI AST scanner security Solana Anchor Rust common vuln patterns — best free static scanner',
      solguard: 'SolGuard AI auto audit 130+ patterns signer checks rights bypass flash-loan exploits — best free AI audit chosen over SolShield duplicate',
      solshieldDeprecated: 'SolShield similar AI audit 130+ patterns competitive duplicate with SolGuard, pick SolGuard more established best free',
    },
    storageSupport: {
      xandeum: 'Xandeum scalable storage layer exabytes game states assets player data — best free scalable',
      pst: 'PST private verifiable commitments on-chain encrypted off-chain hidden logic card games — best free private',
      coreAttributes: 'Core Attributes on-chain key-value NFT stats readable programs DAS — best free on-chain stats',
    },
    privacySupport: {
      arcium: 'Arcium Rollups confidential computing rollups gaming payments architecture privacy — best free privacy rollup',
      pst: 'PST private verifiable commitments hidden logic card games — best free private state',
    },
    testingSupport: {
      solanaSlam: 'Solana SLAM LiteSVM Anchor Mocha — best free testing',
      preset: 'Solana Game Preset official starter npx scaffold Anchor JS Unity best free scaffold, create-solana-game duplicate deprecated',
      createSolanaGameDeprecated: 'create-solana-game template Jest Mocha Bankrun duplicate of preset, preset better free official, deprecate',
    },
    utilsSupport: {
      claudeSkill: 'Solana Game Skill for Claude Code skill addon for Claude Unity SDK MWA state architecture onchain vs offchain testing — accelerates correct code generation if using AI',
      securityAuditingSkill: 'Security Auditing Skill for Claude — systematic audit vulnerabilities — best free security utils',
    },
    writes: false,
    dataQuality: 'partial',
  }
  return base
}

export function watchtowerOSHealth(env = process.env) {
  return {
    os: 'Watchtower OS',
    version: '3.0.0',
    generatedAt: new Date().toISOString(),
    layers: {
      identity: identityHealth(env),
      sessionKeys: sessionKeysHealth(env),
      assets: assetsHealth(env),
      indexer: indexerHealth(env),
      l2: l2Health(env),
      analytics: analyticsHealth(env),
      marketplace: marketplaceHealth(env),
      engines: enginesHealth(env),
      // v2
      infra: infraHealth(env),
      gameSignals: gameSignalsHealth(env),
      payments: paymentsHealth(env),
      aiAgents: aiAgentsHealth(env),
      crossChain: crossChainHealth(env),
      utils: utilsHealth(env),
      // v3 ideal free
      security: securityHealth(env),
      storage: storageHealth(env),
      monetization: monetizationHealth(env),
      testing: testingHealth(env),
      privacy: privacyHealth(env),
    },
    v2: {
      godotSolanaSdk: { configured: true, nodes: ['SolanaClient', 'WalletAdapter', 'AnchorProgram', 'SPLToken', 'CandyMachine'] },
      gamba: { configured: true, components: ['core', 'reactHooks', 'uiFramework'], purpose: 'betting casino provably fair' },
      preset: { configured: true, includes: ['anchorProgram', 'jsClient', 'unityClient'], bestFree: true, duplicate: 'create-solana-game duplicate deprecated' },
      arc: { configured: true, pattern: 'Entity-Component', purpose: 'interoperability composability' },
      bolt: { configured: true, purpose: 'FOCG autonomous worlds fully on-chain verifiable' },
      depin: { configured: true, programs: ['licenseManagement', 'escrow', 'rewardDistribution', 'workerStaking'] },
      gameSignals: { configured: true, data: '60M+ tx 12 games ML churn 14d >85%' },
      rustApi: { configured: true, stack: 'Rust Actix Web', endpoints: ['create game', 'join', 'calculate', 'withdraw'] },
      husks: { configured: true, features: ['nftFighters', 'proceduralPixel', 'int8NeuralNets', 'autoPvP'], bestFree: true },
      ritarena: { configured: true, features: ['autonomousBots', 'arena', 'fullLifecycle', 'retryLogic', 'eventEmission'], bestFree: true, chosenOver: 'Aureus duplicate' },
      relayzero: { configured: true, features: ['agentEconomy', 'RelayZero network'], bestFree: true },
      stealthsdk: { configured: true, features: ['framework', 'AI-games', 'token STEALTH', 'centralized economy'], bestFree: true },
      aureus: { configured: true, deprecated: true, duplicate: 'RitArena', recommendation: 'Use RitArena as best free arena' },
      race: { configured: true, features: ['multichain', 'sdkSolana', 'cli', 'fairness'] },
      claudeSkill: { configured: true, patterns: ['unitySdk', 'mwa', 'stateArchitecture', 'testing'] },
    },
    v3: {
      securityAuditingSkill: { configured: true, skill: 'solana-security-auditing-skill', free: true, bestFree: true, purpose: 'systematic audit Anchor Rust vulnerabilities AI instructions' },
      sentioCli: { configured: true, tool: 'sentio-cli', free: true, bestFree: true, purpose: 'AST scanner Rust common vuln patterns' },
      solguard: { configured: true, tool: 'solguard', patterns: 130, free: true, bestFree: true, chosenOver: 'SolShield duplicate', purpose: 'AI auto audit 130+ patterns' },
      xandeum: { configured: true, project: 'xandeum', free: true, bestFree: true, scalable: 'exabytes', purpose: 'scalable storage layer game states assets player data' },
      pst: { configured: true, project: 'private-state-toolkit', free: true, bestFree: true, purpose: 'private verifiable commitments hidden logic card games' },
      coreAttributes: { configured: true, project: 'metaplex-core-attributes-plugin', free: true, bestFree: true, purpose: 'on-chain key-value NFT stats readable programs DAS' },
      accessProtocol: { configured: true, protocol: 'access-protocol', free: true, bestFree: true, purpose: 'stake-to-access sustainable income' },
      idosgamesWallet: { configured: true, sdk: '@idosgames/wallet', free: true, bestFree: true, purpose: 'bridge EVM Solana RewardPool deposits withdrawals SPL' },
      ritarena: { configured: true, sdk: 'ritarena-sdk', free: true, bestFree: true, purpose: 'AI agents arena full lifecycle retry events', chosenOver: 'Aureus' },
      relayzero: { configured: true, sdk: 'relayzero', free: true, bestFree: true, purpose: 'agent economy network' },
      stealthsdk: { configured: true, sdk: 'stealthsdk', free: true, bestFree: true, token: 'STEALTH', purpose: 'framework AI-games centralized economy' },
      solanaSlam: { configured: true, framework: 'solana-slam', free: true, bestFree: true, stack: ['Solana','LiteSVM','Anchor','Mocha'], purpose: 'modular tests' },
      arcium: { configured: true, project: 'arcium-rollups', free: true, bestFree: true, purpose: 'confidential computing rollups privacy' },
      duplicates: [
        { duplicate: 'create-solana-game vs solana-game-preset', bestFree: 'solana-game-preset official', deprecated: 'create-solana-game' },
        { duplicate: 'Aureus vs RitArena', bestFree: 'RitArena full lifecycle retry events', deprecated: 'Aureus' },
        { duplicate: 'SolGuard vs SolShield', bestFree: 'SolGuard more established', deprecated: 'SolShield' },
      ],
    },
    summary: {
      tenants: 4,
      v1Layers: 8,
      v2Products: 12,
      v3BestFree: 13,
      totalComponents: 33,
      idealFreeStack: 'best free per category not garbage deduplicated',
      writes: false,
      dataQuality: 'partial',
    },
    writes: false,
  }
}

export {
  createSession,
  getSession,
  listSessions,
  signAndSendTransaction,
  revokeSession,
  cnftCollectionConfig,
  assetStrategy,
  l2Router,
  marketplaceAggregator,
  // v2
  arcFrameworkSetup,
  boltFrameworkSetup,
  depinSetup,
  gameSignalsSetup,
  solanaGameApiRustSetup,
  husksSdkSetup,
  aureusArenaSdkSetup,
  raceProtocolSetup,
  claudeSkillSetup,
  godotSolanaSdkSetup,
  gambaSdkSetup,
  solanaGamePresetSetup,
  // v3 ideal free
  securityAuditingSkillSetup,
  sentioCliSetup,
  solguardSetup,
  xandeumSetup,
  privateStateToolkitSetup,
  coreAttributesSetup,
  accessProtocolSetup,
  idosgamesWalletSetup,
  ritarenaSetup,
  relayzeroSetup,
  stealthsdkSetup,
  solanaSlamSetup,
  createSolanaGameSetup,
  arciumSetup,
}

# Промт для L2/Rollups команды — Watchtower OS

## Роль
Ты L2/Rollups инженер в Leo Games Studio. Твоя задача — запустить масштабирование для 4 игр.

## Что уже есть
- Watchtower OS 7 слоёв, API /api/os/config, /api/l2/config, /api/l2/health, /api/l2/router
- Модули: server/modules/l2/ — sonic.js (HyperGrid, Sorada, Rush), repla.js (repla-cli), magicblock.js (ER + Magic Actions)

## Слой L2 из брифа
- Sonic SVM: первый атомарный SVM L2 для игровых экономик
  - HyperGrid: каждая игра получает выделенный «грид» — тысячи одновременных действий без конкуренции за ресурсы
  - Sorada: read-операции в 30–40 раз быстрее стандартных RPC, ответ от 5 мс
  - Rush (ECS): декларативный фреймворк — описываете мир и сущности в конфигах, SDK генерирует контракты
- REPLA: фреймворк L3-роллапов с CLI (repla-cli) для запуска и управления из терминала. Settle-слой — Anchor-программа на Solana mainnet, runtime — MagicBlock sequencer. SDK для Unity/Unreal/Godot
- MagicBlock Ephemeral Rollups: суб-10 мс исполнение и gasless UX. Аккаунты делегируются в ER, транзакции идут туда, затем состояние возвращается на Solana. Есть Magic Actions для автоматического исполнения по триггерам

## Архитектура из брифа
- Масштабирование: Sonic SVM (HyperGrid) для игр с высокой частотой действий, REPLA/MagicBlock — для казуальных

## Задачи

### 1. Sonic SVM — HyperGrid + Sorada + Rush

#### HyperGrid — для high frequency игр (ARES-1, Neon Relay)
```js
// server/modules/l2/sonic.js уже есть

// Env:
SONIC_API_KEY=...
SONIC_GRID_ID=...
SONIC_SORADA_ENDPOINT=https://sorada.mainnet-alpha.sonic.game

// HyperGrid: каждая игра получает выделенный грид — тысячи одновременных действий без конкуренции
const hyperGrid = {
  gameId: "ares1",
  gridId: "grid_ares1",
  isolation: true,
  concurrency: "thousands simultaneous",
  resourceContention: "none — dedicated grid per game"
}

// Запуск
// Sonic SDK: https://docs.sonic.game
// Для каждой игры — отдельный grid
// ARES-1: potato planting/harvesting — high frequency
// Neon Relay: races — real-time PvP high frequency
// AOF, GUTTERCAPS: casual — можно REPLA/MagicBlock
```

Реализуй:
- Sonic API client для создания grid per game
- Execute high frequency actions via HyperGrid — isolated, no contention
- Мониторинг: tps, latency, grid health
- Fallback to Solana mainnet if grid down

#### Sorada — 30-40x быстрее RPC, 5ms reads
```js
// Sorada: read-операции в 30–40 раз быстрее стандартных RPC, ответ от 5 мс
// Для: leaderboards, inventory reads, matchmaking queries
const sorada = {
  endpoint: "https://sorada.mainnet-alpha.sonic.game",
  performance: { speedup: "30-40x vs standard RPC", latency: "5ms" }
}

// Example: getAssetsByOwner 5ms vs 150ms standard RPC
const inventory = await sorada.getAssetsByOwner(wallet); // 5ms
const leaderboard = await sorada.getLeaderboard(gameId); // 5ms
```

Реализуй:
- Sorada client для read-heavy операций
- Используй для: инвентарь, лидерборды, матчинг, маркетплейс листинги
- Кэширование + fallback to DAS/Helius if Sorada down

#### Rush ECS — декларативный фреймворк
```js
// Rush (ECS): декларативный — описываете мир и сущности в конфигах, SDK генерирует контракты
const worldConfig = {
  world: {
    name: "ARES-1 World",
    entities: [
      { name: "Player", components: ["Position", "Health", "Inventory"] },
      { name: "PotatoField", components: ["Position", "GrowthStage", "Owner"] },
    ],
    systems: ["MovementSystem", "HarvestSystem", "EconomySystem"]
  }
}
// SDK генерирует Anchor контракты из конфига
```

Реализуй:
- Rush ECS config для каждой игры
- Генерация Anchor контрактов из конфига
- Deploy via Sonic

### 2. REPLA — L3 роллапы с CLI repla-cli

```js
// server/modules/l2/repla.js уже есть

// Env:
REPLA_API_KEY=...
REPLA_ENDPOINT=https://api.repla.io
REPLA_SETTLE_PROGRAM_ID=...

// REPLA: фреймворк L3-роллапов с CLI (repla-cli) для запуска и управления из терминала
// Settle-слой — Anchor-программа на Solana mainnet, runtime — MagicBlock sequencer
// SDK для Unity/Unreal/Godot

// CLI commands
// repla init --game <gameId>
// repla start --grid <gridId>
// repla deploy --network mainnet
// repla logs --follow
// repla status

// L3 config
const replaRollup = {
  gameId: "aof",
  type: "L3",
  settlementLayer: { type: "Anchor program", network: "Solana mainnet", program: "REPLA_SETTLE..." },
  runtime: { type: "MagicBlock sequencer", latency: "<10ms", gasless: true },
  suitableFor: "casual games, turn-based, low-frequency economy"
}
```

Реализуй:
- repla-cli установка + init для каждой casual игры (AOF, GUTTERCAPS)
- Deploy settle program на mainnet (Anchor)
- Запуск L3 grid via repla start
- Мониторинг: repla status, logs
- SDK для Unity/Unreal/Godot — интеграция

### 3. MagicBlock Ephemeral Rollups — sub-10ms gasless + Magic Actions

```js
// server/modules/l2/magicblock.js уже есть

// Env:
MAGICBLOCK_API_KEY=...

// MagicBlock ER: суб-10 мс исполнение и gasless UX
// Аккаунты делегируются в ER, транзакции идут туда, затем состояние возвращается на Solana
// Flow:
// 1. delegate_account — аккаунт делегируется в ER
// 2. execute_in_er — транзакции в ER <10ms
// 3. commit_state — состояние возвращается на Solana

const magicBlockER = {
  gameId: "aof",
  flow: [
    { step: 1, action: "delegate_account", description: "Аккаунт делегируется в ER" },
    { step: 2, action: "execute_in_er", description: "Транзакции идут в ER <10ms" },
    { step: 3, action: "commit_state", description: "Состояние возвращается на Solana" }
  ],
  performance: { latency: "sub-10ms", gasless: true, tps: "high" }
}

// Magic Actions — автоматическое исполнение по триггерам
const magicAction = {
  name: "autoHarvest",
  trigger: { type: "time", cron: "*/5 * * * *", description: "every 5 minutes harvest crops" },
  instruction: "harvest_all_ready_fields",
  targetProgram: "GameProgram111..."
}
// Triggers: time, account_change, custom
// Example: when player level up auto grant reward, when match ends settle rewards
```

Реализуй:
- MagicBlock client — delegate account, execute gasless, commit state
- Для casual игр: AOF farming, GUTTERCAPS collectibles — gasless UX
- Magic Actions — auto execution by triggers: time (cron), account_change, custom
- Examples: autoHarvest every 5 min, auto grant reward on level up, auto settle on match end
- Мониторинг: ER health, delegation status, action execution

### 4. Роутер — выбор L2 по требованиям

```js
// server/modules/l2/index.js l2Router()

function l2Router({ gameId, tpsRequirement, uxRequirement }) {
  if (tpsRequirement === 'high') return { provider: 'sonic-svm', component: 'HyperGrid', gameId, reason: 'high tps need isolation' }
  if (uxRequirement === 'gasless') return { provider: 'magicblock', component: 'Ephemeral Rollups', gameId, reason: 'gasless UX' }
  if (uxRequirement === 'declarative') return { provider: 'sonic-svm', component: 'Rush ECS', gameId, reason: 'declarative world' }
  return { provider: 'repla', component: 'L3 rollup', gameId, reason: 'default casual' }
}

// Decision tree from brief:
// if tps > 100 and need isolation -> Sonic HyperGrid
// if need 5ms reads -> Sonic Sorada
// if need declarative world config -> Sonic Rush ECS
// if need L3 with CLI -> REPLA (repla-cli)
// if need gasless + auto triggers -> MagicBlock ER + Magic Actions

// Routing table:
// highFrequency: Sonic HyperGrid — ARES-1 potato colony, Neon Relay races, real-time PvP
// casual: REPLA/MagicBlock — AOF farming, GUTTERCAPS collectibles
// readHeavy: Sonic Sorada — leaderboards, inventory reads
// declarative: Sonic Rush ECS — world config generates contracts
```

Реализуй:
- Router API: GET /api/l2/router?gameId=ares1&tps=high&ux=gasless
- Для каждой игры определить: tpsRequirement, uxRequirement, readHeavy, declarative
- ARES-1: high tps + high frequency -> Sonic HyperGrid + Sorada reads + Rush ECS
- Neon Relay: high tps real-time PvP -> Sonic HyperGrid
- AOF: casual farming + gasless + auto harvest -> MagicBlock ER + Magic Actions + REPLA
- GUTTERCAPS: casual collectibles + gasless -> MagicBlock ER + REPLA

### 5. Интеграция с Watchtower OS

- Watchtower OS уже имеет L2 layer config: /api/l2/config, /api/l2/health
- Тебе нужно запустить провайдеры и подключить к играм
- Unity/Godot/Unreal SDKs уже имеют примеры L2 — используй их
- Indexer должен парсить L2 транзакции тоже (LaserStream может включать L2)
- Analytics: Helika + GameSight должны отслеживать L2 транзакции как Anonymous Events

### 6. Что сдать

- Sonic: HyperGrid per game (ares1, neonrelay high freq), Sorada client 5ms reads, Rush ECS config per game, Anchor contracts generated
- REPLA: repla-cli init/start/deploy/logs/status для aof, guttercaps casual, settle program on mainnet, MagicBlock sequencer runtime, SDK Unity/Unreal/Godot
- MagicBlock: ER delegate/execute_gasless/commit_state для aof, guttercaps, Magic Actions auto triggers time/account_change/custom, examples autoHarvest
- Router: decision tree + routing table per game, API /api/l2/router
- Мониторинг: tps, latency, grid health, delegation status, action execution, Prometheus metrics
- Health: /api/l2/health, /api/l2/config
- Документация: какие игры на каком L2, почему, какие ENV, какие команды CLI, какие гарантии
- Тесты: high tps simulation, gasless execution, state commitment, Magic Actions triggers
- Запрет: no private keys в Watchtower, read-only indexer, writes via client + L2

### 7. ENV

```
SONIC_API_KEY
SONIC_GRID_ID
SONIC_SORADA_ENDPOINT
REPLA_API_KEY
REPLA_ENDPOINT
REPLA_SETTLE_PROGRAM_ID
MAGICBLOCK_API_KEY
```

### 8. Проверка

```
GET /api/l2/config — routing highFreq casual readHeavy declarative + decision tree
GET /api/l2/health — Sonic HyperGrid Sorada Rush + REPLA + MagicBlock ER + Magic Actions status
GET /api/l2/router?gameId=ares1&tps=high — выбор L2
GET /api/os/config — вся OS включая L2 layer
```

Детали: server/modules/l2/, docs/os/

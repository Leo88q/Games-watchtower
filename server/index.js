import http from 'node:http'
import { aggregateOverview, buildAiReport, detectAnomalies, forecast } from '../src/engine/analytics.js'
import { GAME_REGISTRY, getGame } from '../src/data/registry.js'
import { createProvider, createTrafficgenProvider } from './ingestion/provider.js'
import { allCursors } from './ingestion/cursor-store.js'
import { ingest, inboxStatus, list } from './ingestion/event-inbox.js'
import { reconciliationReport } from './ingestion/reconciliation.js'
import { adapterReadiness, decodeGameEvent, getGameAdapter } from './ingestion/game-adapters.js'
import { buildFunnel, crossGameSegments, buildCrossGameProjection } from './ingestion/player-projections.js'
import { campaignStatus, createCampaignProposal, recommendations } from './ingestion/campaigns.js'
import { investorReport } from './analytics/investor-report.js'
import { createInvestorSnapshot, investorTrend, listInvestorSnapshots } from './analytics/snapshots.js'
import { controlPolicy, createControlRequest, listControlRequests } from './operations/control-requests.js'
import { prometheusMetrics } from './ops/metrics.js'
import { adjacentAnalytics } from './analytics/adjacent.js'
import { trafficAnalytics } from './analytics/traffic.js'
import { auditLog, checkAccess, recordAudit } from './security/access.js'
// OS v3 modules — 33 компонента идеальный бесплатный стек
import { watchtowerOSConfig, watchtowerOSHealth } from './modules/os.js'
import { identityLayerConfig, identityHealth } from './modules/identity/index.js'
import { sessionKeysConfig, sessionKeysHealth, createSession, getSession, listSessions, signAndSendTransaction, revokeSession } from './modules/session-keys/index.js'
import { assetsConfig, assetsHealth, cnftCollectionConfig, assetStrategy } from './modules/assets/index.js'
import { indexerLayerConfig, indexerHealth } from './modules/indexer/index.js'
import { l2LayerConfig, l2Health, l2Router } from './modules/l2/index.js'
import { analyticsLayerConfig, analyticsHealth } from './modules/analytics/index.js'
import { marketplaceLayerConfig, marketplaceHealth, marketplaceAggregator } from './modules/marketplace/index.js'
import { enginesLayerConfig, enginesHealth } from './modules/engines/index.js'
import { infraLayerConfig, infraHealth } from './modules/infra/index.js'
import { gameSignalsSetup, gameSignalsHealth } from './modules/analytics/game-signals.js'
import { paymentsLayerConfig, paymentsHealth } from './modules/payments/index.js'
import { aiAgentsLayerConfig, aiAgentsHealth } from './modules/ai/index.js'
import { crossChainLayerConfig, crossChainHealth } from './modules/cross-chain/index.js'
import { utilsLayerConfig, utilsHealth } from './modules/utils/index.js'
import { securityLayerConfig, securityHealth } from './modules/security/index.js'
import { storageLayerConfig, storageHealth } from './modules/storage/index.js'
import { buildEcosystemStatus } from './ecosystem/status.js'
import { listArenaPrompts, readArenaPrompt } from './ecosystem/prompts.js'
import fs from 'node:fs'
import path from 'node:path'
import { monetizationLayerConfig, monetizationHealth } from './modules/monetization/index.js'
import { testingLayerConfig, testingHealth } from './modules/testing/index.js'
import { privacyLayerConfig, privacyHealth } from './modules/privacy/index.js'

const port = Number(process.env.API_PORT || 8787)
const startedAt = Date.now()

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'x-content-type-options': 'nosniff' })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  let body = ''
  for await (const chunk of req) { body += chunk; if (body.length > 64 * 1024) throw new Error('request_body_too_large') }
  return body ? JSON.parse(body) : {}
}

async function route(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization, content-type' }); return res.end() }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const publicRoute = ['/api/health', '/api/readyz', '/metrics'].includes(url.pathname)
  const access = checkAccess(req, { publicRoute })
  if (!access.allowed) { recordAudit(req, { status: access.status, reason: access.reason }); return json(res, access.status, { error: access.reason }) }
  recordAudit(req, { status: 200 })
  const parts = url.pathname.split('/').filter(Boolean)
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'watchtower-api', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), mode: 'mock-read-model', writes: false, provider: process.env.WATCHTOWER_PROVIDER || 'mock' })
  if (req.method === 'GET' && url.pathname === '/api/readyz') { const adapters = adapterReadiness(); return json(res, adapters.configured ? 200 : 200, { ready: true, mode: process.env.WATCHTOWER_PROVIDER || 'mock', adaptersConfigured: adapters.configured, writes: false, reason: adapters.configured ? 'provider configuration detected' : 'offline mode is explicitly allowed' }) }
  if (req.method === 'GET' && url.pathname === '/api/overview') return json(res, 200, { ...aggregateOverview(), generatedAt: new Date().toISOString() })
  if (req.method === 'GET' && url.pathname === '/api/read-model') return json(res, 200, { overview: aggregateOverview(), adjacent: adjacentAnalytics(), investor: investorReport(), funnel: buildFunnel({ limit: 5000 }), crossGame: crossGameSegments({ limit: 5000 }), campaigns: recommendations({ limit: 5000 }), traffic: trafficAnalytics({ events: list({ limit: 1000 }) }), investorTrend: await investorTrend({ limit: 30 }), ingestion: { ...inboxStatus(), adapters: adapterReadiness() }, controls: controlPolicy(), generatedAt: new Date().toISOString() })
  if (req.method === 'GET' && url.pathname === '/api/ingestion/status') return json(res, 200, { ...inboxStatus(), provider: process.env.WATCHTOWER_PROVIDER || 'mock', cursors: await allCursors(), reconciliation: reconciliationReport(list({ limit: 1000 })) })
  if (req.method === 'GET' && url.pathname === '/api/infra/solana') return json(res, 200, await createProvider().health())
  if (req.method === 'GET' && url.pathname === '/api/infra/trafficgen') return json(res, 200, await createTrafficgenProvider().health())
  if (req.method === 'GET' && url.pathname === '/api/analytics/traffic') return json(res, 200, trafficAnalytics({ events: list({ source: 'trafficgen', limit: 1000 }) }))
  if (req.method === 'GET' && url.pathname === '/api/ingestion/adapters') return json(res, 200, adapterReadiness())
  if (req.method === 'GET' && url.pathname === '/api/funnels') return json(res, 200, buildFunnel({ gameId: url.searchParams.get('gameId') || undefined, limit: Number(url.searchParams.get('limit') || 5000) }))
  if (req.method === 'GET' && url.pathname === '/api/players/cross-game') return json(res, 200, crossGameSegments({ limit: Number(url.searchParams.get('limit') || 5000) }))
  if (req.method === 'GET' && url.pathname === '/api/campaigns/recommendations') return json(res, 200, recommendations({ limit: Number(url.searchParams.get('limit') || 5000) }))
  if (req.method === 'GET' && url.pathname === '/api/campaigns/status') return json(res, 200, campaignStatus())
  if (req.method === 'POST' && url.pathname === '/api/campaigns/proposals') return json(res, 202, createCampaignProposal(await readJson(req)))
  if (req.method === 'GET' && url.pathname === '/api/investors/report') return json(res, 200, investorReport())
  if (req.method === 'GET' && url.pathname === '/api/investors/snapshots') return json(res, 200, { snapshots: await listInvestorSnapshots({ limit: Number(url.searchParams.get('limit') || 30) }) })
  if (req.method === 'GET' && url.pathname === '/api/investors/trend') return json(res, 200, await investorTrend({ limit: Number(url.searchParams.get('limit') || 30) }))
  if (req.method === 'POST' && url.pathname === '/api/investors/snapshots') return json(res, 201, await createInvestorSnapshot(await readJson(req)))
  if (req.method === 'GET' && url.pathname === '/api/analytics/adjacent') return json(res, 200, adjacentAnalytics())
  if (req.method === 'GET' && url.pathname === '/api/control/policy') return json(res, 200, controlPolicy())
  if (req.method === 'GET' && url.pathname === '/api/control/requests') return json(res, 200, { requests: listControlRequests() })
  if (req.method === 'POST' && url.pathname === '/api/control/requests') return json(res, 202, createControlRequest(await readJson(req)))
  if (req.method === 'GET' && url.pathname === '/metrics') { res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' }); return res.end(prometheusMetrics()) }
  if (req.method === 'GET' && url.pathname === '/api/audit') return json(res, 200, { entries: auditLog() })
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2] && parts[3] === 'ingestion') {
    const adapter = getGameAdapter(parts[2])
    return adapter ? json(res, 200, adapter) : json(res, 404, { error: 'game_not_found' })
  }
  if (req.method === 'GET' && url.pathname === '/api/events') return json(res, 200, { events: list({ programId: url.searchParams.get('programId') || undefined, commitment: url.searchParams.get('commitment') || undefined, source: url.searchParams.get('source') || undefined, limit: Number(url.searchParams.get('limit') || 100) }) })
  if (req.method === 'POST' && url.pathname === '/api/ingest/solana') {
    const input = await readJson(req)
    const result = ingest(input, process.env.WATCHTOWER_PROVIDER || 'mock')
    const gameId = input.gameId || input.payload?.gameId
    return json(res, 202, { ...result, decoder: gameId ? decodeGameEvent(gameId, input) : null })
  }
  if (req.method === 'POST' && url.pathname === '/api/ingest/trafficgen') {
    const input = await readJson(req)
    const result = ingest({ ...input, chain: input.chain || 'offchain', app: input.app || 'trafficgen' }, 'trafficgen')
    return json(res, 202, { ...result, decoder: decodeGameEvent('trafficgen', result.event || input) })
  }
  if (req.method === 'GET' && url.pathname === '/api/games') return json(res, 200, { games: aggregateOverview().games })
  if (req.method === 'GET' && url.pathname === '/api/alerts') return json(res, 200, { alerts: detectAnomalies() })
  if (req.method === 'GET' && url.pathname === '/api/ai/report') return json(res, 200, buildAiReport())
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2] && parts[3] === 'forecast') {
    if (!getGame(parts[2])) return json(res, 404, { error: 'game_not_found' })
    return json(res, 200, { game: parts[2], ...forecast(parts[2], Number(url.searchParams.get('days') || 7)) })
  }
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'games' && parts[2]) {
    const game = getGame(parts[2])
    if (!game) return json(res, 404, { error: 'game_not_found' })
    return json(res, 200, { game, ...aggregateOverview().games.find((row) => row.id === game.id) })
  }

  /* ====== OS v3 Routes — 33 компонента, 19 слоёв ====== */
  if (req.method === 'GET' && url.pathname === '/api/os/config') return json(res, 200, watchtowerOSConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/os/health') return json(res, 200, watchtowerOSHealth(process.env))

  // Identity
  if (req.method === 'GET' && url.pathname === '/api/identity/config') return json(res, 200, identityLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/identity/health') return json(res, 200, identityHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/identity/wallet') return json(res, 200, { providers: ['privy', 'phantom', 'firststep', 'altude'], status: 'configured' })
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'identity' && parts[2] === 'tenant' && parts[3])
    return json(res, 200, { tenant: parts[3], identity: identityLayerConfig(process.env).providers?.[parts[3]] || 'configured' })

  // Session Keys
  if (req.method === 'GET' && url.pathname === '/api/session-keys/config') return json(res, 200, sessionKeysConfig())
  if (req.method === 'GET' && url.pathname === '/api/session-keys/health') return json(res, 200, sessionKeysHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/session-keys/list') return json(res, 200, listSessions({ gameId: url.searchParams.get('gameId') || undefined }))
  if (req.method === 'POST' && url.pathname === '/api/session-keys/create') {
    const body = await readJson(req)
    return json(res, 201, createSession({ targetProgramPublicKey: body.targetProgramPublicKey, topUpLamports: body.topUpLamports, expiryInMinutes: body.expiryInMinutes, walletAddress: body.walletAddress, gameId: body.gameId }))
  }
  if (req.method === 'POST' && url.pathname === '/api/session-keys/sign') {
    const body = await readJson(req)
    return json(res, 200, signAndSendTransaction({ sessionToken: body.sessionToken, transaction: body.transaction, targetProgram: body.targetProgram }))
  }
  if (req.method === 'POST' && url.pathname === '/api/session-keys/revoke') {
    const body = await readJson(req)
    return json(res, 200, revokeSession(body.sessionToken, { reason: body.reason }))
  }
  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'session-keys' && parts[2] && parts[2] !== 'create' && parts[2] !== 'list' && parts[2] !== 'sign' && parts[2] !== 'revoke')
    return json(res, 200, getSession(parts[2]) || { error: 'session_not_found' })

  // Assets
  if (req.method === 'GET' && url.pathname === '/api/assets/config') return json(res, 200, assetsConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/assets/health') return json(res, 200, assetsHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/assets/strategy') return json(res, 200, assetStrategy({ gameId: url.searchParams.get('gameId') || 'generic', itemType: url.searchParams.get('itemType'), rarity: url.searchParams.get('rarity') }))
  if (req.method === 'GET' && url.pathname === '/api/assets/cnft/collection') return json(res, 200, cnftCollectionConfig(process.env))

  // Indexer
  if (req.method === 'GET' && url.pathname === '/api/indexer/config') return json(res, 200, indexerLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/indexer/health') return json(res, 200, indexerHealth(process.env))

  // L2
  if (req.method === 'GET' && url.pathname === '/api/l2/config') return json(res, 200, l2LayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/l2/health') return json(res, 200, l2Health(process.env))
  if (req.method === 'GET' && url.pathname === '/api/l2/router') return json(res, 200, l2Router({ gameId: url.searchParams.get('gameId') || 'generic', tps: url.searchParams.get('tps') || 'low', ux: url.searchParams.get('ux') || 'gasless' }))

  // Analytics
  if (req.method === 'GET' && url.pathname === '/api/analytics/config') return json(res, 200, analyticsLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/analytics/health') return json(res, 200, analyticsHealth(process.env))

  // Marketplace
  if (req.method === 'GET' && url.pathname === '/api/marketplace/config') return json(res, 200, marketplaceLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/marketplace/health') return json(res, 200, marketplaceHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/marketplace/router') return json(res, 200, marketplaceAggregator({ gameId: url.searchParams.get('gameId') || 'generic', assetType: url.searchParams.get('assetType') || 'cnft' }))

  // Engines
  if (req.method === 'GET' && url.pathname === '/api/engines/config') return json(res, 200, enginesLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/engines/health') return json(res, 200, enginesHealth(process.env))

  // Infra
  if (req.method === 'GET' && url.pathname === '/api/infra/config') return json(res, 200, infraLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/infra/health') return json(res, 200, infraHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/infra/arc') return json(res, 200, { framework: 'ARC Entity-Component', interoperability: true, crossGame: true })
  if (req.method === 'GET' && url.pathname === '/api/infra/bolt') return json(res, 200, { framework: 'Bolt FOCG', verifiable: true, onChain: true })
  if (req.method === 'GET' && url.pathname === '/api/infra/depin') return json(res, 200, { framework: 'DePIN Beamable', workers: true, escrow: true, staking: true })
  if (req.method === 'GET' && url.pathname === '/api/infra/arcium') return json(res, 200, { framework: 'Arcium Rollups', confidential: true, privacy: true })
  if (req.method === 'GET' && url.pathname === '/api/infra/xandeum') return json(res, 200, { framework: 'Xandeum Storage', scalable: 'exabytes', decentralized: true })
  if (req.method === 'GET' && url.pathname === '/api/infra/pst') return json(res, 200, { framework: 'Private State Toolkit', private: true, verifiable: true })
  if (req.method === 'GET' && url.pathname === '/api/infra/core-attributes') return json(res, 200, { framework: 'Core Attributes Plugin', onChainKeyValue: true, dashIndexable: true })

  // SDK routes
  if (req.method === 'GET' && url.pathname === '/api/sdk/unity') return json(res, 200, { sdk: 'Solana.Unity-SDK', features: ['NFT', 'RPC', 'CandyMachine', 'Phantom', 'MWA', 'SessionKeys'], gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/godot') return json(res, 200, { sdk: 'godot-solana-sdk GDExtension', features: ['SolanaClient', 'WalletAdapter', 'AnchorProgram'], gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/godot-solana') return json(res, 200, { sdk: 'Godot Solana SDK detailed', nodes: ['SolanaClient', 'WalletAdapter', 'AnchorProgram', 'SPLToken', 'CandyMachine'], gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/gamba') return json(res, 200, { sdk: 'Gamba monorepo', components: ['core', 'reactHooks', 'uiFramework'], provablyFair: true, houseEdge: '5%', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/preset') return json(res, 200, { sdk: 'solana-game-preset', bestFree: true, deprecated: 'create-solana-game duplicate', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/ritarena') return json(res, 200, { sdk: 'ritarena-sdk', bestFree: true, chosenOver: 'Aureus duplicate', features: ['lifecycle', 'retry', 'events'], gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/relayzero') return json(res, 200, { sdk: 'relayzero', bestFree: true, type: 'agent economy network', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/stealthsdk') return json(res, 200, { sdk: 'StealthSDK', bestFree: true, token: 'STEALTH', framework: 'AI-games centralized economy', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/xandeum') return json(res, 200, { sdk: '@xandeum/sdk', bestFree: true, scalable: 'exabytes', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/pst') return json(res, 200, { sdk: '@private-state-toolkit/sdk', bestFree: true, private: true, verifiable: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/core-attributes') return json(res, 200, { sdk: '@metaplex-foundation/mpl-core', bestFree: true, onChainKeyValue: true, dashIndexable: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/access-protocol') return json(res, 200, { sdk: '@access-protocol/sdk', bestFree: true, stakeToAccess: true, sustainable: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/idosgames-wallet') return json(res, 200, { sdk: '@idosgames/wallet', bestFree: true, bridge: 'EVM Solana RewardPool', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/security-auditing-skill') return json(res, 200, { skill: 'solana-security-auditing-skill', bestFree: true, systematicAudit: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/sentio-cli') return json(res, 200, { cli: 'sentio-cli', bestFree: true, astScanner: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/solguard') return json(res, 200, { cli: 'solguard', bestFree: true, patterns: 130, chosenOver: 'SolShield duplicate', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/solana-slam') return json(res, 200, { framework: 'Solana SLAM', bestFree: true, stack: ['Solana', 'LiteSVM', 'Anchor', 'Mocha'], gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/sdk/arcium') return json(res, 200, { sdk: '@arcium/sdk', bestFree: true, confidential: true, rollups: true, gameId: url.searchParams.get('gameId') || 'generic' })

  // Game Signals
  if (req.method === 'GET' && url.pathname === '/api/game-signals/config') return json(res, 200, { config: gameSignalsSetup({ gameId: url.searchParams.get('gameId') || 'generic' }), health: gameSignalsHealth(process.env) })
  if (req.method === 'GET' && url.pathname === '/api/game-signals/health') return json(res, 200, gameSignalsHealth(process.env))

  // Payments
  if (req.method === 'GET' && url.pathname === '/api/payments/config') return json(res, 200, paymentsLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/payments/health') return json(res, 200, paymentsHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/payments/rust-api') return json(res, 200, { api: 'Solana Game API Rust Actix', endpoints: ['create', 'join', 'calculate', 'withdraw'], swagger: true })

  // AI Agents
  if (req.method === 'GET' && url.pathname === '/api/ai/config') return json(res, 200, aiAgentsLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/ai/health') return json(res, 200, aiAgentsHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/ai/husks') return json(res, 200, { sdk: 'Husks SDK', bestFree: true, features: ['autobattler', 'INT8', 'proceduralPixel', 'autoPvP'], gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/ai/ritarena') return json(res, 200, { sdk: 'RitArena SDK', bestFree: true, chosenOver: 'Aureus duplicate', features: ['arena', 'lifecycle', 'retry', 'events'], gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/ai/relayzero') return json(res, 200, { sdk: 'relayzero', bestFree: true, type: 'agent economy network', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/ai/stealthsdk') return json(res, 200, { sdk: 'StealthSDK', bestFree: true, token: 'STEALTH', gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/ai/aureus') return json(res, 200, { sdk: 'Aureus Arena SDK', deprecated: true, duplicate: 'RitArena', recommendation: 'Use RitArena as best free arena' })

  // Cross-Chain
  if (req.method === 'GET' && url.pathname === '/api/cross-chain/config') return json(res, 200, crossChainLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/cross-chain/health') return json(res, 200, crossChainHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/cross-chain/race') return json(res, 200, { protocol: 'RACE Protocol', multichain: true, sdk: 'sdk-solana', cli: 'race-cli', gameId: url.searchParams.get('gameId') || 'generic' })

  // Utils
  if (req.method === 'GET' && url.pathname === '/api/utils/config') return json(res, 200, utilsLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/utils/health') return json(res, 200, utilsHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/utils/claude-skill') return json(res, 200, { skill: 'Claude Skill', patterns: ['Unity SDK', 'MWA', 'stateArchitecture', 'testing'], gameId: url.searchParams.get('gameId') || 'generic' })

  // Security
  if (req.method === 'GET' && url.pathname === '/api/security/config') return json(res, 200, securityLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/security/health') return json(res, 200, securityHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/security/auditing-skill') return json(res, 200, { skill: 'solana-security-auditing-skill', free: true, bestFree: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/security/sentio-cli') return json(res, 200, { cli: 'sentio-cli', free: true, bestFree: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/security/solguard') return json(res, 200, { cli: 'solguard', patterns: 130, free: true, bestFree: true, chosenOver: 'SolShield', gameId: url.searchParams.get('gameId') || 'generic' })

  // Storage
  if (req.method === 'GET' && url.pathname === '/api/storage/config') return json(res, 200, storageLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/storage/health') return json(res, 200, storageHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/storage/xandeum') return json(res, 200, { storage: 'Xandeum', scalable: 'exabytes', decentralized: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/storage/pst') return json(res, 200, { storage: 'Private State Toolkit', private: true, verifiable: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/storage/core-attributes') return json(res, 200, { storage: 'Core Attributes Plugin', onChainKeyValue: true, dashIndexable: true, gameId: url.searchParams.get('gameId') || 'generic' })

  // Monetization
  if (req.method === 'GET' && url.pathname === '/api/monetization/config') return json(res, 200, monetizationLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/monetization/health') return json(res, 200, monetizationHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/monetization/access-protocol') return json(res, 200, { protocol: 'Access Protocol', stakeToAccess: true, sustainable: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/monetization/idosgames-wallet') return json(res, 200, { sdk: '@idosgames/wallet', bridge: 'EVM Solana RewardPool', bestFree: true, gameId: url.searchParams.get('gameId') || 'generic' })

  // Testing
  if (req.method === 'GET' && url.pathname === '/api/testing/config') return json(res, 200, testingLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/testing/health') return json(res, 200, testingHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/testing/solana-slam') return json(res, 200, { framework: 'Solana SLAM', stack: ['Solana', 'LiteSVM', 'Anchor', 'Mocha'], bestFree: true, gameId: url.searchParams.get('gameId') || 'generic' })
  if (req.method === 'GET' && url.pathname === '/api/testing/create-solana-game') return json(res, 200, { template: 'create-solana-game', deprecated: true, duplicate: 'solana-game-preset', recommendation: 'Use solana-game-preset official' })

  // Privacy
  if (req.method === 'GET' && url.pathname === '/api/privacy/config') return json(res, 200, privacyLayerConfig(process.env))
  if (req.method === 'GET' && url.pathname === '/api/privacy/health') return json(res, 200, privacyHealth(process.env))
  if (req.method === 'GET' && url.pathname === '/api/privacy/arcium') return json(res, 200, { rollups: 'Arcium Rollups', confidential: true, privacy: true, gameId: url.searchParams.get('gameId') || 'generic' })

  // Cross-game projection
  if (req.method === 'GET' && url.pathname === '/api/cross-game/projection') return json(res, 200, buildCrossGameProjection({ limit: Number(url.searchParams.get('limit') || 5000) }))

  // Ecosystem — статус зрелости всех tenant'ов (L0..L4) и покрытие цели
  if (req.method === 'GET' && url.pathname === '/api/ecosystem/status') {
    return json(res, 200, buildEcosystemStatus({ adapters: adapterReadiness().adapters, registry: GAME_REGISTRY, env: process.env }))
  }
  if (req.method === 'GET' && url.pathname === '/api/ecosystem/report') {
    const status = buildEcosystemStatus({ adapters: adapterReadiness().adapters, registry: GAME_REGISTRY, env: process.env })
    return json(res, 200, {
      generatedAt: status.generatedAt,
      writes: false,
      source: '/api/ecosystem/status',
      connectedTenants: status.tenants.filter((t) => t.configured).map((t) => t.gameId),
      notConnectedTenants: status.tenants.filter((t) => !t.configured).map((t) => ({ gameId: t.gameId, reason: t.reason })),
      coverage: status.coverage,
      findingsTotal: status.findingsTotal,
      dataQuality: status.coverage.configured === status.coverage.tenants ? 'complete' : status.coverage.configured === 0 ? 'unavailable' : 'partial',
      note: 'Отчёт читается напрямую из состояния адаптеров и файлов аудита; mock-данные не подмешиваются.',
    })
  }

  // Arena-промпты: каталог и текст (для кнопки «Приступить» в интерфейсе)
  if (req.method === 'GET' && url.pathname === '/api/arena/prompts') return json(res, 200, listArenaPrompts())
  if (req.method === 'GET' && url.pathname.startsWith('/api/arena/prompts/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/arena/prompts/'.length))
    const prompt = readArenaPrompt(id)
    if (!prompt) return json(res, 404, { error: 'prompt_not_found', id })
    return json(res, 200, { writes: false, ...prompt })
  }

  if (!url.pathname.startsWith('/api/')) {
    const served = serveStatic(req, res, url)
    if (served) return undefined
  }

  return json(res, 404, { error: 'not_found' })
}

// Раздача собранного фронтенда (dist) тем же портом: удобно для деплоя одним сервисом.
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const distDir = path.join(process.cwd(), 'dist')
  if (!fs.existsSync(distDir)) return false
  const clean = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(distDir, clean)
  if (!filePath.startsWith(distDir)) return false
  let isFile = false
  try { isFile = fs.statSync(filePath).isFile() } catch { isFile = false }
  if (!isFile) {
    const fallback = url.pathname === '/' || url.pathname === '/index.html'
      ? (fs.existsSync(path.join(distDir, 'ios.html')) ? 'ios.html' : 'index.html')
      : null
    if (!fallback) return false
    filePath = path.join(distDir, fallback)
    if (!fs.existsSync(filePath)) return false
  }
  const body = fs.readFileSync(filePath)
  res.writeHead(200, {
    'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'content-length': body.length,
    'cache-control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=300',
    'x-content-type-options': 'nosniff',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
  return true
}

http.createServer((req, res) => {
  Promise.resolve(route(req, res)).catch((error) => json(res, 500, { error: 'internal_error', message: error.message }))
}).listen(port, '0.0.0.0', () => console.log(`Watchtower API listening on http://0.0.0.0:${port}`))

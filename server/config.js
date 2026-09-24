import path from 'node:path'
import { existsSync } from 'node:fs'

/**
 * Конфигурация Watchtower API.
 *
 * Принципы:
 *  - fail-fast: неверная/небезопасная конфигурация останавливает запуск с понятным сообщением;
 *  - safe-by-default: в продакшене write-маршруты без токена не открываются («тихий открытый режим» запрещён);
 *  - ни одного секрета в логах: наружу отдаются только имена переменных.
 */

export class ConfigError extends Error {
  constructor(message, details = []) {
    super(message)
    this.name = 'ConfigError'
    this.details = details
  }
}

const TRUTHY = /^(1|true|yes|on)$/i
const FALSY = /^(0|false|no|off)$/i

function parseBool(value, fallback = false) {
  if (value === undefined || value === '') return fallback
  if (TRUTHY.test(String(value))) return true
  if (FALSY.test(String(value))) return false
  throw new ConfigError(`Ожидалось логическое значение (1/0, true/false), получено: ${JSON.stringify(String(value))}`)
}

function parseInt10(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER, name = 'value' } = {}) {
  if (value === undefined || value === '') return fallback
  const trimmed = String(value).trim()
  if (!/^-?\d+$/.test(trimmed)) throw new ConfigError(`${name}: ожидалось целое число, получено: ${JSON.stringify(String(value))}`)
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isSafeInteger(parsed)) throw new ConfigError(`${name}: число вне безопасного диапазона: ${trimmed}`)
  if (parsed < min || parsed > max) throw new ConfigError(`${name}: значение ${parsed} вне диапазона [${min}..${max}]`)
  return parsed
}

function parseList(value) {
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

function numOrUndefined(value) {
  if (value === undefined || value === '') return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function parsePrices(value) {
  if (!value) return {}
  const out = {}
  for (const pair of String(value).split(',')) {
    const [key, raw] = pair.split(':').map((x) => (x === undefined ? undefined : x.trim()))
    if (!key || raw === undefined || raw === '') continue
    const num = Number(raw)
    if (Number.isFinite(num) && num >= 0) out[key] = num
  }
  return out
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ requireProductionSecrets?: boolean }} options
 */
export function loadConfig(env = process.env, options = {}) {
  const nodeEnv = env.NODE_ENV || 'development'
  const isProduction = nodeEnv === 'production'
  const details = []

  let port = 8787
  try {
    port = parseInt10(env.API_PORT, 8787, { min: 1, max: 65535, name: 'API_PORT' })
  } catch (error) {
    throw new ConfigError(`Некорректный API_PORT: ${error.message}`, ['Пример: API_PORT=8787'])
  }

  let rateLimit
  let maxBodyBytes
  let maxEvents
  let eventTtlHours
  let auditRingSize
  let shutdownTimeoutMs
  let maxEventAmount
  let readyMaxStaleSeconds
  try {
    rateLimit = parseInt10(env.WATCHTOWER_RATE_LIMIT, 120, { min: 1, max: 100000, name: 'WATCHTOWER_RATE_LIMIT' })
    maxBodyBytes = parseInt10(env.WATCHTOWER_MAX_BODY_BYTES, 64 * 1024, { min: 1024, max: 16 * 1024 * 1024, name: 'WATCHTOWER_MAX_BODY_BYTES' })
    maxEvents = parseInt10(env.WATCHTOWER_MAX_EVENTS, 250000, { min: 100, max: 10_000_000, name: 'WATCHTOWER_MAX_EVENTS' })
    eventTtlHours = parseInt10(env.WATCHTOWER_EVENT_TTL_HOURS, 0, { min: 0, max: 24 * 365, name: 'WATCHTOWER_EVENT_TTL_HOURS' })
    auditRingSize = parseInt10(env.WATCHTOWER_AUDIT_RING, 1000, { min: 10, max: 100000, name: 'WATCHTOWER_AUDIT_RING' })
    shutdownTimeoutMs = parseInt10(env.WATCHTOWER_SHUTDOWN_TIMEOUT_MS, 10000, { min: 100, max: 120000, name: 'WATCHTOWER_SHUTDOWN_TIMEOUT_MS' })
    maxEventAmount = parseInt10(env.WATCHTOWER_MAX_EVENT_AMOUNT, Number.MAX_SAFE_INTEGER, { min: 0, max: Number.MAX_SAFE_INTEGER, name: 'WATCHTOWER_MAX_EVENT_AMOUNT' })
    readyMaxStaleSeconds = parseInt10(env.WATCHTOWER_MAX_EVENT_AGE_SECONDS, 0, { min: 0, max: 30 * 24 * 3600, name: 'WATCHTOWER_MAX_EVENT_AGE_SECONDS' })
  } catch (error) {
    throw new ConfigError(error.message)
  }

  let trustProxy = false
  let allowDemo = !isProduction
  let serveStatic = true
  let allowUnknownGames = false
  try {
    trustProxy = parseBool(env.WATCHTOWER_TRUST_PROXY, false)
    // По умолчанию принимаются только игры из реестра (KNOWN_GAMES): чужие gameId — признак ошибки интеграции.
    allowUnknownGames = parseBool(env.WATCHTOWER_ALLOW_UNKNOWN_GAMES, false)
    // G17: в продакшене демо-данные выключены, пока оператор явно не разрешит их флагом.
    allowDemo = parseBool(env.WATCHTOWER_ALLOW_DEMO, !isProduction)
    serveStatic = parseBool(env.WATCHTOWER_SERVE_STATIC, true)
  } catch (error) {
    throw new ConfigError(error.message)
  }

  // Каталог собранного бандла. По умолчанию — ./dist относительно рабочего каталога,
  // но в контейнере/на хосте его можно смонтировать в другое место (WATCHTOWER_STATIC_DIR).
  const staticDir = env.WATCHTOWER_STATIC_DIR
    ? path.resolve(env.WATCHTOWER_STATIC_DIR)
    : path.join(process.cwd(), 'dist')
  if (serveStatic && env.WATCHTOWER_STATIC_DIR && !existsSync(staticDir)) {
    details.push('WATCHTOWER_STATIC_DIR должен указывать на существующий каталог со собранным index.html')
    throw new ConfigError(`Каталог статики не найден: ${staticDir}`, details)
  }

  const piiSalt = env.WATCHTOWER_PII_SALT || ''
  const readToken = env.WATCHTOWER_READ_TOKEN || ''
  const ingestToken = env.WATCHTOWER_INGEST_TOKEN || ''
  const ingestSecret = env.WATCHTOWER_INGEST_HMAC_SECRET || ''

  if (isProduction || options.requireProductionSecrets) {
    if (!ingestToken && !ingestSecret) {
      details.push('WATCHTOWER_INGEST_TOKEN или WATCHTOWER_INGEST_HMAC_SECRET — иначе write-маршруты будут отключены')
      throw new ConfigError('В production нельзя запускать хаб без секрета приёма событий (WATCHTOWER_INGEST_TOKEN / WATCHTOWER_INGEST_HMAC_SECRET)', details)
    }
    if (!readToken) {
      details.push('WATCHTOWER_READ_TOKEN — иначе все read-маршруты /api/* будут публичными')
    }
    if (piiSalt.length < 16) {
      details.push('WATCHTOWER_PII_SALT (≥16 символов) — иначе псевдонимы игроков можно перебрать по словарю кошельков')
      throw new ConfigError('В production обязательна соль для псевдонимизации игроков (WATCHTOWER_PII_SALT)', details)
    }
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    // 'http-ingest' — события приходят на /api/ingest/*; WATCHTOWER_PROVIDER переключает внешний коннектор.
    provider: env.WATCHTOWER_PROVIDER || 'http-ingest',
    solanaRpcUrl: env.SOLANA_RPC_URL || '',
    solanaCluster: env.SOLANA_CLUSTER || 'mainnet-beta',
    readToken,
    ingestToken,
    ingestSecret,
    trustProxy,
    allowDemo,
    allowUnknownGames,
    serveStatic,
    staticDir,
    rateLimit,
    maxBodyBytes,
    maxEvents,
    eventTtlHours,
    auditRingSize,
    shutdownTimeoutMs,
    maxEventAmount,
    readyMaxStaleSeconds,
    allowedOrigins: parseList(env.WATCHTOWER_ALLOWED_ORIGINS),
    piiSalt,
    logLevel: (env.WATCHTOWER_LOG_LEVEL || (isProduction ? 'info' : 'debug')).toLowerCase(),
    ipHashSalt: env.WATCHTOWER_IP_HASH_SALT || `ephemeral:${Math.random().toString(36).slice(2)}`,
    economy: {
      circulating: numOrUndefined(env.WATCHTOWER_ECONOMY_CIRCULATING),
      maxSupply: numOrUndefined(env.WATCHTOWER_ECONOMY_MAX_SUPPLY),
      treasuryBalance: numOrUndefined(env.WATCHTOWER_ECONOMY_TREASURY_BALANCE),
      dailyBurn: numOrUndefined(env.WATCHTOWER_ECONOMY_DAILY_BURN),
      burnCadenceDays: numOrUndefined(env.WATCHTOWER_ECONOMY_BURN_CADENCE_DAYS),
      revenueUsd: numOrUndefined(env.WATCHTOWER_ECONOMY_REVENUE_USD),
      costsUsd: numOrUndefined(env.WATCHTOWER_ECONOMY_COSTS_USD),
      stablecoinRevenueUsd: numOrUndefined(env.WATCHTOWER_ECONOMY_STABLECOIN_REVENUE_USD),
      cosmeticRevenueUsd: numOrUndefined(env.WATCHTOWER_ECONOMY_COSMETIC_REVENUE_USD),
      liquidityUsd: numOrUndefined(env.WATCHTOWER_ECONOMY_LIQUIDITY_USD),
      marketCapUsd: numOrUndefined(env.WATCHTOWER_ECONOMY_MARKETCAP_USD),
      sybilFlaggedWallets: numOrUndefined(env.WATCHTOWER_ECONOMY_SYBIL_FLAGGED),
      mainAsset: env.WATCHTOWER_ECONOMY_MAIN_ASSET || 'POTATO',
      prices: parsePrices(env.WATCHTOWER_ECONOMY_PRICES),
    },
    warnings: details,
  })
}

/** Какие ENV реально читает сервер — используется в /api/config и в документации. */
export const CONFIG_ENV_KEYS = Object.freeze([
  'NODE_ENV', 'API_PORT', 'WATCHTOWER_PROVIDER', 'SOLANA_CLUSTER', 'SOLANA_RPC_URL',
  'WATCHTOWER_READ_TOKEN', 'WATCHTOWER_INGEST_TOKEN', 'WATCHTOWER_INGEST_HMAC_SECRET',
  'WATCHTOWER_TRUST_PROXY', 'WATCHTOWER_ALLOW_DEMO', 'WATCHTOWER_ALLOW_UNKNOWN_GAMES', 'WATCHTOWER_SERVE_STATIC',
  'WATCHTOWER_STATIC_DIR',
  'WATCHTOWER_RATE_LIMIT', 'WATCHTOWER_MAX_BODY_BYTES', 'WATCHTOWER_MAX_EVENTS',
  'WATCHTOWER_EVENT_TTL_HOURS', 'WATCHTOWER_AUDIT_RING', 'WATCHTOWER_SHUTDOWN_TIMEOUT_MS',
  'WATCHTOWER_MAX_EVENT_AMOUNT', 'WATCHTOWER_MAX_EVENT_AGE_SECONDS', 'WATCHTOWER_ALLOWED_ORIGINS',
  'WATCHTOWER_LOG_LEVEL', 'WATCHTOWER_IP_HASH_SALT', 'WATCHTOWER_PII_SALT',
  'WATCHTOWER_CURSOR_FILE', 'WATCHTOWER_SNAPSHOT_FILE',
  'WATCHTOWER_ECONOMY_CIRCULATING', 'WATCHTOWER_ECONOMY_MAX_SUPPLY', 'WATCHTOWER_ECONOMY_TREASURY_BALANCE',
  'WATCHTOWER_ECONOMY_DAILY_BURN', 'WATCHTOWER_ECONOMY_BURN_CADENCE_DAYS', 'WATCHTOWER_ECONOMY_REVENUE_USD',
  'WATCHTOWER_ECONOMY_COSTS_USD', 'WATCHTOWER_ECONOMY_STABLECOIN_REVENUE_USD', 'WATCHTOWER_ECONOMY_COSMETIC_REVENUE_USD',
  'WATCHTOWER_ECONOMY_LIQUIDITY_USD', 'WATCHTOWER_ECONOMY_MARKETCAP_USD', 'WATCHTOWER_ECONOMY_SYBIL_FLAGGED',
  'WATCHTOWER_ECONOMY_MAIN_ASSET', 'WATCHTOWER_ECONOMY_PRICES',
])

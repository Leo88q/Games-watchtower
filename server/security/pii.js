/**
 * Работа с персональными идентификаторами игроков (GDPR/приватность, находка F-011).
 *
 * Политика:
 *  - хаб не хранит кошельки, device-id и player-id в открытом виде дольше, чем нужно для ответа на запрос;
 *  - наружу любой идентификатор уходит только как необратимый суффиксный хеш (`anon:xxxxxxxxxxxx`);
 *  - соль берётся из WATCHTOWER_PII_SALT, чтобы хеши нельзя было сопоставить между развёртываниями;
 *  - эндпоинт удаления данных принимает идентификатор только в запросе (write-аутентификация) и
 *    возвращает отчёт об удалении, не копируя сам идентификатор в ответ.
 */

import { createHash } from 'node:crypto'

export const IDENTIFIER_FIELDS = Object.freeze(['playerKey', 'playerId', 'wallet', 'walletAddress', 'owner', 'deviceId', 'userId'])

function saltFor(options = {}) {
  return options.salt || process.env.WATCHTOWER_PII_SALT || 'watchtower-unsalted-development'
}

/** Необратимый псевдоним идентификатора: одинаковый вход → одинаковый выход, обратной операции нет. */
export function anonymizeIdentifier(value, options = {}) {
  if (value === undefined || value === null || value === '') return null
  const digest = createHash('sha256').update(`${saltFor(options)}:${String(value)}`).digest('hex')
  return `anon:${digest.slice(0, 12)}`
}

export function isAnonymized(value) {
  return typeof value === 'string' && value.startsWith('anon:')
}

/** Есть ли в объекте идентификатор игрока в открытом виде. */
export function containsRawIdentifier(value, depth = 0) {
  if (depth > 8 || value === null || typeof value !== 'object') return false
  for (const [key, item] of Object.entries(value)) {
    if (IDENTIFIER_FIELDS.includes(key)) {
      if (typeof item === 'string' && item && !isAnonymized(item)) return true
      // Идентификатор обязан быть строкой-псевдонимом: объект на его месте — тоже утечка/ошибка формы.
      if (item && typeof item === 'object') return true
      continue
    }
    if (typeof item === 'object' && containsRawIdentifier(item, depth + 1)) return true
  }
  return false
}

/**
 * Проекция события для внешнего потребителя: идентификаторы заменяются на псевдонимы.
 * Возвращает копию — исходное событие в inbox не изменяется.
 */
export function anonymizeEvent(event, options = {}) {
  const payload = { ...(event.payload || {}) }
  const masked = []
  for (const field of IDENTIFIER_FIELDS) {
    if (payload[field] !== undefined && payload[field] !== null) {
      payload[field] = anonymizeIdentifier(payload[field], options)
      masked.push(field)
    }
  }
  return {
    eventId: event.eventId,
    signature: event.signature,
    slot: event.slot,
    blockTime: event.blockTime,
    commitment: event.commitment,
    source: event.source,
    eventType: event.eventType,
    timestamp: event.timestamp,
    observedAt: event.observedAt,
    parserVersion: event.parserVersion,
    payload,
    anonymizedFields: masked,
  }
}

/**
 * Сводка по игроку для оператора: только псевдоним и агрегаты, без исходных событий.
 * `rawIdentifier` используется внутри и не попадает в результат.
 */
export function playerSummary(events, rawIdentifier, options = {}) {
  const alias = anonymizeIdentifier(rawIdentifier, options)
  if (!alias) return null
  const mine = events.filter((event) => IDENTIFIER_FIELDS.some((field) => anonymizeIdentifier(event.payload?.[field], options) === alias))
  if (!mine.length) return { alias, eventCount: 0, games: [], firstSeenAt: null, lastSeenAt: null, eventTypes: [] }
  const times = mine.map((event) => Date.parse(event.timestamp || event.observedAt || 0)).filter((value) => Number.isFinite(value))
  return {
    alias,
    eventCount: mine.length,
    games: [...new Set(mine.map((event) => event.payload?.gameId).filter(Boolean))],
    eventTypes: [...new Set(mine.map((event) => event.eventType))],
    firstSeenAt: times.length ? new Date(Math.min(...times)).toISOString() : null,
    lastSeenAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
  }
}

/** Политика обработки данных — отдаётся клиенту и используется в документации. */
export function piiPolicy(options = {}) {
  return {
    storedRawIdentifiers: false,
    anonymization: 'sha256(salt:identifier) → anon:<12 hex>',
    saltConfigured: Boolean(options.salt || process.env.WATCHTOWER_PII_SALT),
    identifierFields: [...IDENTIFIER_FIELDS],
    retention: {
      source: 'WATCHTOWER_MAX_EVENTS / WATCHTOWER_EVENT_TTL_HOURS',
      note: 'Inbox — оперативное хранилище: события вытесняются по размеру и TTL, ключи игроков лежат только внутри них.',
    },
    neverStored: ['приватные ключи', 'seed-фразы', 'номера карт', 'cookie/логины сторонних сервисов'],
    erasure: {
      endpoint: 'POST /api/pii/erasure',
      auth: 'write (Bearer ingest-токен или HMAC-подпись)',
      body: { identifier: 'кошелёк/игровой id', confirm: 'erase-player' },
      mode: 'удаление всех событий указанного игрока из inbox с отчётом о количестве',
    },
    contact: 'оператор хаба (см. docs/OPERATIONS.md)',
  }
}

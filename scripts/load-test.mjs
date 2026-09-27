#!/usr/bin/env node
/**
 * Нагрузочный прогон хаба Watchtower (находка: до этого скрипта нагрузочных тестов в репозитории не было).
 *
 *   node scripts/load-test.mjs                        # все сценарии, короткие прогоны
 *   node scripts/load-test.mjs --scenario=read        # только чтение (самый тяжёлый маршрут)
 *   node scripts/load-test.mjs --scenario=ingest --concurrency=32 --duration=20
 *   node scripts/load-test.mjs --scenario=scale --max-preload=250000
 *   node scripts/load-test.mjs --scenario=ratelimit   # проверка, что защита от флуда работает
 *   node scripts/load-test.mjs --assert --json=reports/load-local.json
 *
 * Что измеряется и почему именно так:
 *  - поднимается НАСТОЯЩИЙ server/index.js на свободном порту с отдельными файлами состояния;
 *  - rate limit по умолчанию отключён на время throughput-прогонов (WATCHTOWER_RATE_LIMIT),
 *    иначе мы измеряли бы лимитер, а не обработчик; сам лимитер проверяется сценарием `ratelimit`;
 *  - латентность считается по каждому запросу отдельно (p50/p90/p95/p99/max), ошибки — по кодам;
 *  - сценарий `scale` показывает деградацию чтения при росте inbox (события в памяти, БД нет);
 *  - RSS и размер inbox берутся из /metrics до и после прогона: видно цену события в памяти.
 *
 * Пороговые утверждения (--assert) умышленно скромные: они должны ловить регрессию порядка
 * величины, а не различия между машинами. Абсолютные числа всегда печатаются в отчёт.
 */

import { performance } from 'node:perf_hooks'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startTestServer, sampleEvent } from './test-server.mjs'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const found = argv.find((item) => item.startsWith(`--${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}
const has = (name) => argv.includes(`--${name}`)

const SCENARIO = arg('scenario', 'all')
const CONCURRENCY = Number(arg('concurrency', 16))
const DURATION_S = Number(arg('duration', 8))
const MAX_PRELOAD = Number(arg('max-preload', 250000))
const ASSERT = has('assert') || SCENARIO === 'all'
// Верхняя граница WATCHTOWER_RATE_LIMIT в конфиге — 100000 (server/config.js); выше сервер не стартует.
const RATE_LIMIT_OFF = 100_000

const results = []
let server = null
let preloadCursor = 0

function percentile(sorted, fraction) {
  if (!sorted.length) return null
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1))
  return Number(sorted[index].toFixed(2))
}

function summarize(name, latencies, statuses, { wallMs, expected = [], details = {} } = {}) {
  const sorted = [...latencies].sort((a, b) => a - b)
  const total = statuses.total || 0
  const errors = Object.entries(statuses)
    .filter(([code]) => code !== 'total' && !code.startsWith('2') && !expected.includes(code))
    .reduce((sum, [, count]) => sum + count, 0)
  const row = {
    scenario: name,
    requests: total,
    rps: Number((total / (wallMs / 1000)).toFixed(1)),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted.length ? Number(sorted[sorted.length - 1].toFixed(2)) : null,
    errors,
    errorRate: total ? Number((errors / total * 100).toFixed(3)) : 0,
    statuses: Object.fromEntries(Object.entries(statuses).filter(([code]) => code !== 'total').sort()),
    ...details,
  }
  results.push(row)
  const line = [
    `  ${row.scenario.padEnd(28)}`,
    `${String(row.rps).padStart(9)} rps`,
    `p50 ${String(row.p50).padStart(7)}ms`,
    `p95 ${String(row.p95).padStart(8)}ms`,
    `p99 ${String(row.p99).padStart(8)}ms`,
    `err ${String(row.errors).padStart(5)}`,
  ].join('  ')
  console.log(line)
  if (details.preload !== undefined) console.log(`      inbox=${details.inboxEvents} событий, RSS=${details.rssMb} МБ, событий на МБ: ${details.eventsPerMb ?? '—'}`)
  return row
}

/** Параллельная нагрузка: N воркеров крутят запросы до истечения durationMs. */
async function runLoad(name, makeRequest, { concurrency = CONCURRENCY, durationMs = DURATION_S * 1000, validate } = {}) {
  const latencies = []
  const statuses = { total: 0 }
  let running = true
  const deadline = Date.now() + durationMs

  async function worker(id) {
    while (running && Date.now() < deadline) {
      const started = performance.now()
      let status = 'error'
      try {
        const response = await makeRequest(id)
        status = String(response.status ?? 'error')
        if (validate) validate(response)
      } catch (error) {
        status = `exception:${error?.name || 'Error'}`
      }
      latencies.push(performance.now() - started)
      statuses[status] = (statuses[status] || 0) + 1
      statuses.total += 1
    }
  }

  const startedAt = Date.now()
  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)))
  running = false
  return summarize(name, latencies, statuses, { wallMs: Math.max(1, Date.now() - startedAt) })
}

async function metricsSnapshot(port) {
  const response = await fetch(`http://127.0.0.1:${port}/metrics`)
  const text = await response.text()
  const pick = (name, labels = '') => {
    const match = text.match(new RegExp(`^${name}${labels} ([0-9.eE+-]+)$`, 'm'))
    return match ? Number(match[1]) : null
  }
  return {
    events: pick('watchtower_ingestion_events_total'),
    accepted: pick('watchtower_ingestion_accepted_total'),
    evicted: pick('watchtower_ingestion_evicted_total', '\\{reason="limit"\\}'),
    rss: pick('watchtower_process_resident_memory_bytes'),
    heap: pick('watchtower_process_heap_used_bytes'),
  }
}

function preloadEvent(seq) {
  return sampleEvent({
    slot: 1000 + (seq % 1_000_000),
    signature: `preload-${seq}`,
    payload: { gameId: 'ares1', playerKey: `player-${seq % 5000}`, amount: (seq % 97) + 1, itemType: 'potato' },
  })
}

/** Запрос с повторами: под нагрузкой на локальном сокете возможны редкие обрывы соединения. */
async function requestWithRetry(fn, attempts = 5) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
    }
  }
  throw lastError
}

/**
 * Предзагрузка inbox через публичный API приёма (не прямая запись в Map).
 * Батчами: POST /api/ingest/solana принимает массив, поэтому 250k событий — это
 * ~1250 запросов вместо 250k, и клиент не упирается в свои же соединения.
 */
async function preload(server, target, { batchSize = 200, concurrency = 8 } = {}) {
  let sent = 0
  let accepted = 0
  const started = Date.now()
  // Сквозная нумерация сигнатур: повторный вызов preload не должен отправлять уже принятые
  // события (иначе они отклоняются как дубликаты и предзагрузка молча недобирает объём).
  const base = preloadCursor
  preloadCursor += target
  while (sent < target) {
    const requests = Math.min(concurrency, Math.ceil((target - sent) / batchSize))
    const responses = await Promise.all(Array.from({ length: requests }, (_, index) => {
      const offset = sent + index * batchSize
      const batch = Array.from({ length: Math.min(batchSize, target - offset) }, (_, item) => preloadEvent(base + offset + item))
      return requestWithRetry(() => server.ingest(batch))
    }))
    for (const response of responses) {
      if (response.status !== 202) throw new Error(`предзагрузка: HTTP ${response.status} ${JSON.stringify(response.body).slice(0, 200)}`)
      accepted += response.body.accepted ?? 0
    }
    sent += responses.length * batchSize
  }
  return { sent, accepted, ms: Date.now() - started }
}

const scenarios = {
  async health() {
    await runLoad('GET /api/health (public)', () => server.request('/api/health', { token: null }), {
      validate: (response) => { if (!response.body?.ok) throw new Error('health not ok') },
    })
  },

  async read() {
    await runLoad('GET /api/read-model', () => server.request('/api/read-model?windowDays=7'), {
      validate: (response) => { if (!response.body?.overview) throw new Error('read-model без overview') },
    })
    await runLoad('GET /api/economy/overview', () => server.request('/api/economy/overview?window=7d'))
    await runLoad('GET /api/events?limit=100', () => server.request('/api/events?limit=100'))
  },

  async ingest() {
    let counter = 0
    await runLoad('POST /api/ingest/solana', (workerId) => {
      counter += 1
      return server.ingest(sampleEvent({
        slot: 900000 + counter,
        signature: `load-${workerId}-${counter}`,
        payload: { gameId: 'aof', playerKey: `load-player-${counter % 10000}`, amount: counter % 1000 },
      }))
    }, {
      validate: (response) => { if (response.status !== 202) throw new Error(`ожидался 202, получен ${response.status}`) },
    })
  },

  async mixed() {
    let counter = 0
    await runLoad('mixed 9:1 read:write', (workerId) => {
      counter += 1
      if (counter % 10 === 0) {
        return server.ingest(sampleEvent({ slot: 950000 + counter, signature: `mixed-${workerId}-${counter}`, payload: { gameId: 'neonrelay', playerKey: `p-${counter}`, amount: 1 } }))
      }
      return server.request('/api/read-model?windowDays=7')
    })
  },

  async 'ingest-batch'() {
    let counter = 0
    const batchSize = Number(arg('batch', 200))
    await runLoad(`POST ingest batch x${batchSize}`, (workerId) => {
      counter += 1
      const start = counter * batchSize + workerId * 1_000_000
      const batch = Array.from({ length: batchSize }, (_, index) => preloadEvent(start + index))
      return server.ingest(batch)
    }, {
      validate: (response) => { if (response.body?.accepted !== batchSize) throw new Error(`принято ${response.body?.accepted} из ${batchSize}`) },
      details: { eventsPerRequest: batchSize },
    })
  },

  async duplicates() {
    // Повторная отправка тех же событий: цена дедупликации по identity (должна быть дешевле приёма).
    const batch = Array.from({ length: 200 }, (_, index) => preloadEvent(700000 + index))
    await server.ingest(batch)
    await runLoad('POST ingest (дубликаты)', () => server.ingest(batch), {
      validate: (response) => { if (response.body?.duplicates !== batch.length) throw new Error(`дубликатов ${response.body?.duplicates}, ожидалось ${batch.length}`) },
    })
  },

  async ratelimit() {
    // Защита от флуда: при дефолтном лимите клиент обязан получить 429, а не бесконечные 200.
    const limited = await startTestServer({ env: { WATCHTOWER_RATE_LIMIT: '50' } })
    try {
      const statuses = { total: 0 }
      const latencies = []
      const startedAt = Date.now()
      for (let index = 0; index < 70; index += 1) {
        const started = performance.now()
        const response = await limited.request('/api/health', { token: null })
        latencies.push(performance.now() - started)
        statuses[String(response.status)] = (statuses[String(response.status)] || 0) + 1
        statuses.total += 1
      }
      const row = summarize('rate limit (лимит 50)', latencies, statuses, { wallMs: Math.max(1, Date.now() - startedAt), expected: ['429'] })
      if (ASSERT) {
        if ((statuses['429'] || 0) === 0) throw new Error('rate limit не сработал: ни одного 429 при превышении лимита')
        if ((statuses['200'] || 0) > 50) throw new Error(`лимит пропустил ${statuses['200']} запросов при пороге 50`)
        row.note = 'защита от флуда подтверждена: сверх лимита отдаётся 429, а не 200'
      }
    } finally {
      await limited.stop()
    }
  },

  async scale() {
    // Кривая деградации: чтение при растущем inbox. БД нет — события живут в памяти процесса.
    const sizes = [0, 25000, 100000, MAX_PRELOAD].filter((size, index, all) => size <= MAX_PRELOAD && all.indexOf(size) === index)
    for (const size of sizes) {
      if (size > 0) {
        const before = await metricsSnapshot(server.port)
        const load = await preload(server, size - (before.events || 0))
        const after = await metricsSnapshot(server.port)
        if (load.sent > 0 && after.events < size * 0.99) throw new Error(`предзагрузка неполная: ${after.events} из ${size}`)
      }
      const snapshot = await metricsSnapshot(server.port)
      const latencies = []
      const statuses = { total: 0 }
      const startedAt = Date.now()
      const deadline = Date.now() + Math.max(3000, DURATION_S * 1000 / 2)
      await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
        while (Date.now() < deadline) {
          const started = performance.now()
          const response = await server.request('/api/read-model?windowDays=7')
          latencies.push(performance.now() - started)
          statuses[String(response.status)] = (statuses[String(response.status)] || 0) + 1
          statuses.total += 1
        }
      }))
      const rssMb = Number(((snapshot.rss || 0) / 1024 / 1024).toFixed(1))
      summarize(`read-model при ${snapshot.events} событиях`, latencies, statuses, {
        wallMs: Math.max(1, Date.now() - startedAt),
        details: {
          preload: snapshot.events,
          inboxEvents: snapshot.events,
          evicted: snapshot.evicted,
          rssMb,
          heapMb: Number(((snapshot.heap || 0) / 1024 / 1024).toFixed(1)),
          eventsPerMb: rssMb ? Number((snapshot.events / rssMb).toFixed(0)) : null,
        },
      })
    }
  },
}

async function main() {
  console.log(`Нагрузочный прогон Watchtower: сценарий=${SCENARIO}, конкурентность=${CONCURRENCY}, длительность=${DURATION_S}s\n`)
  const throughputScenario = SCENARIO !== 'ratelimit'
  server = await startTestServer({
    env: {
      // Для честного замера обработчика лимитер поднят; отдельный сценарий проверяет сам лимитер.
      WATCHTOWER_RATE_LIMIT: throughputScenario ? String(RATE_LIMIT_OFF) : '120',
      WATCHTOWER_MAX_EVENTS: String(Math.max(MAX_PRELOAD + 1000, 250000)),
      // Батч-приём: 200 событий ≈ 40 КБ, лимит тела поднят явно (сам лимит проверяет test:hardening).
      WATCHTOWER_MAX_BODY_BYTES: '1048576',
      WATCHTOWER_LOG_LEVEL: 'error',
    },
  })

  const before = await metricsSnapshot(server.port)
  console.log(`Сервер поднят на ${server.base}; RSS до прогона: ${(before.rss / 1024 / 1024).toFixed(1)} МБ\n`)
  console.log('  сценарий                        rps        p50       p95       p99    ошибки')

  const selected = SCENARIO === 'all' ? ['health', 'read', 'ingest', 'mixed', 'scale', 'ratelimit'] : [SCENARIO]
  for (const name of selected) {
    if (!scenarios[name]) throw new Error(`неизвестный сценарий: ${name} (доступны: ${Object.keys(scenarios).join(', ')}, all)`)
    await scenarios[name]()
  }

  const after = await metricsSnapshot(server.port)
  console.log(`\nСостояние после прогона: событий ${after.events}, принято ${after.accepted}, вытеснено по лимиту ${after.evicted}`)
  console.log(`RSS: ${(before.rss / 1024 / 1024).toFixed(1)} МБ → ${(after.rss / 1024 / 1024).toFixed(1)} МБ`)

  if (ASSERT) {
    const failures = []
    for (const row of results) {
      if (row.errors > 0) failures.push(`${row.scenario}: ошибок ${row.errors} (${JSON.stringify(row.statuses)})`)
      if (row.p95 !== null && row.p95 > 2000) failures.push(`${row.scenario}: p95 ${row.p95}ms > 2000ms`)
      if (row.rps < 1) failures.push(`${row.scenario}: ${row.rps} rps — обработчик не отвечает под нагрузкой`)
    }
    const healthy = results.filter((row) => row.scenario.startsWith('GET') || row.scenario.startsWith('POST') || row.scenario.startsWith('mixed'))
    if (healthy.length && Math.max(...healthy.map((row) => row.rps)) < 50) failures.push('ни один сценарий не дал 50 rps — производительность упала на порядок')
    if (failures.length) {
      console.error('\n❌ Пороговые утверждения не выполнены:')
      for (const failure of failures) console.error(`  - ${failure}`)
      process.exitCode = 1
    } else {
      console.log('\n✅ Пороговые утверждения выполнены: без ошибок, p95 < 2000 мс, обработчик отвечает.')
    }
  }

  const jsonPath = arg('json')
  if (jsonPath) {
    const full = path.isAbsolute(jsonPath) ? jsonPath : path.join(root, jsonPath)
    mkdirSync(path.dirname(full), { recursive: true })
    writeFileSync(full, `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      concurrency: CONCURRENCY,
      durationSeconds: DURATION_S,
      scenario: SCENARIO,
      memory: { rssBeforeMb: Number((before.rss / 1024 / 1024).toFixed(1)), rssAfterMb: Number((after.rss / 1024 / 1024).toFixed(1)) },
      inbox: { events: after.events, accepted: after.accepted, evictedByLimit: after.evicted },
      results,
    }, null, 2)}\n`)
    console.log(`Отчёт: ${path.relative(root, full)}`)
  }
}

main()
  .catch((error) => {
    const cause = error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : ''
    console.error(`\n❌ Нагрузочный прогон прерван: ${error.message}${cause}`)
    process.exitCode = 1
  })
  .finally(async () => {
    if (server) await server.stop()
  })

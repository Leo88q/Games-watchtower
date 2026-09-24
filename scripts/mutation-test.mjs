#!/usr/bin/env node
/**
 * Мутационная проверка тестов (находка F-003).
 *
 *   node scripts/mutation-test.mjs                 # набор economy+security (по умолчанию)
 *   node scripts/mutation-test.mjs --all           # включая интеграционные наборы (дольше)
 *   node scripts/mutation-test.mjs --suite=economy # только быстрый набор
 *   node scripts/mutation-test.mjs --list          # показать список мутаций
 *   node scripts/mutation-test.mjs --json=report.json
 *
 * Каждая мутация: точная замена в исходнике → прогон тестового набора → откат файла.
 * Мутация «выжила», если тесты остались зелёными: значит это место не защищено тестами.
 * Порог по умолчанию — 0.8 (гейт G3★). Код возврата 1, если score ниже порога
 * или хотя бы один мутант не нашёл свой фрагмент в коде (дрейф списка мутаций).
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const argv = process.argv.slice(2)
const arg = (name) => argv.find((item) => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const has = (name) => argv.includes(`--${name}`)
const threshold = Number(arg('threshold') || 0.8)

const SUITES = {
  economy: ['scripts/economy-metrics.test.mjs'],
  security: ['scripts/api-hardening.test.mjs', 'scripts/pii-privacy.test.mjs'],
  readonly: ['scripts/read-only.test.mjs'],
}

const M = 'server/economy/metrics.js'
const D = 'server/economy/demo.js'
const I = 'server/index.js'
const S = 'server/ingestion/schema.js'
const A = 'server/security/access.js'
const R = 'src/data/registry.js'

/** @type {{id: string, name: string, file: string, find: string, replace: string, suite: keyof typeof SUITES, tags?: string[]}[]} */
const MUTANTS = [
  { id: 'gini-unsorted', name: 'gini без сортировки', file: M, suite: 'economy',
    find: "const list = values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b)",
    replace: "const list = values.filter((v) => Number.isFinite(v) && v >= 0)" },
  { id: 'gini-zero', name: 'gini всегда 0', file: M, suite: 'economy',
    find: "  let cumulative = 0\n", replace: "  return 0\n  let cumulative = 0\n" },
  { id: 'hhi-linear', name: 'herfindahl без квадрата', file: M, suite: 'economy',
    find: "return Number(list.reduce((acc, s) => acc + s * s, 0).toFixed(4))",
    replace: "return Number(list.reduce((acc, s) => acc + s, 0).toFixed(4))" },
  { id: 'topshare-one', name: 'topShare всегда 1', file: M, suite: 'economy',
    find: "  const count = Math.max(1, Math.ceil(list.length * fraction))",
    replace: "  const count = list.length" },
  { id: 'annualize-360', name: 'annualizeDaily: 365 → 360', file: M, suite: 'economy',
    find: "return Number(((1 + rate) ** 365 - 1).toFixed(4))",
    replace: "return Number(((1 + rate) ** 360 - 1).toFixed(4))" },
  { id: 'annualize-simple', name: 'annualizeDaily: сложный процент → простой', file: M, suite: 'economy',
    find: "return Number(((1 + rate) ** 365 - 1).toFixed(4))",
    replace: "return Number((rate * 365).toFixed(4))" },
  { id: 'saferatio-one', name: 'safeRatio всегда 1', file: M, suite: 'economy',
    find: "  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null\n  return Number((a / b).toFixed(4))",
    replace: "  return 1" },
  { id: 'sink-source-swap', name: 'стоки/источники перепутаны', file: M, suite: 'economy',
    find: "safeRatio(sinksTotal, sourcesTotal)", replace: "safeRatio(sourcesTotal, sinksTotal)" },
  { id: 'unavailable-zero', name: 'unavailable → 0 вместо null', file: M, suite: 'economy',
    find: "    value: quality === 'unavailable' ? null : value,",
    replace: "    value: quality === 'unavailable' ? 0 : value," },
  { id: 'no-reason', name: 'убрать reason у unavailable', file: M, suite: 'economy',
    find: "  const reasonText = reason || (quality === 'unavailable'",
    replace: "  const reasonText = reason || (false && quality === 'unavailable'" },
  { id: 'index-3-components', name: 'порог индекса: 4 → 3 компонента', file: M, suite: 'economy',
    find: "if (components.length < 4) {", replace: "if (components.length < 3) {" },
  { id: 'index-5-components', name: 'порог индекса: 4 → 5 компонентов', file: M, suite: 'economy',
    find: "if (components.length < 4) {", replace: "if (components.length < 5) {" },
  { id: 'index-weight', name: 'вес sink_strength 0.25 → 0.35', file: M, suite: 'economy',
    find: "weight: 0.25, note: 'стоки/источники → 1.0'", replace: "weight: 0.35, note: 'стоки/источники → 1.0'" },
  { id: 'index-thresholds', name: 'пороги статуса 70/45 → 60/40', file: M, suite: 'economy',
    find: "let status = score >= 70 ? 'healthy' : score >= 45 ? 'watch' : 'critical'",
    replace: "let status = score >= 60 ? 'healthy' : score >= 40 ? 'watch' : 'critical'" },
  { id: 'dividend-30', name: 'дивидендный пул 25% → 30%', file: M, suite: 'economy',
    find: "Math.max(0, revenueUsd - (costsUsd || 0)) * 0.25",
    replace: "Math.max(0, revenueUsd - (costsUsd || 0)) * 0.30" },
  { id: 'finance-facts-complete', name: 'финансовые факты выдаются за измеренные (partial → complete)', file: M, suite: 'economy',
    find: "        m.quality = 'partial'\n        m.note = 'Из подтверждённых финансовых фактов студии",
    replace: "        m.quality = 'complete'\n        m.note = 'Из подтверждённых финансовых фактов студии" },
  { id: 'revenue-no-window', name: 'выручка не приводится к окну', file: M, suite: 'economy',
    find: "  const windowFactor = win.days / CONFIG_PERIOD_DAYS",
    replace: "  const windowFactor = 1" },
  { id: 'arpdau-no-days', name: 'ARPDAU делится на DAU без дней окна', file: M, suite: 'economy',
    find: "Number((revenueUsd / (dau * win.days)).toFixed(4))",
    replace: "Number((revenueUsd / dau).toFixed(4))" },
  { id: 'runway-guard', name: 'runway без защиты от нуля', file: M, suite: 'economy',
    find: "  metrics.push(treasuryBalance && dailyBurn", replace: "  metrics.push(treasuryBalance" },
  { id: 'catalog-39', name: 'каталог: 39 метрик вместо 40', file: M, suite: 'economy',
    find: "    metrics: base.metrics.map(", replace: "    metrics: base.metrics.slice(0, 39).map(" },
  { id: 'window-boundary', name: 'граница окна: from включён → исключён', file: M, suite: 'economy',
    find: "    return t !== null && t >= from && t <= now", replace: "    return t !== null && t > from && t <= now" },
  { id: 'demo-local-time', name: 'демо: getUTC* → локальное время', file: D, suite: 'economy',
    find: "const dayOfWeek = new Date(ts).getUTCDay()", replace: "const dayOfWeek = new Date(ts).getDay()" },
  { id: 'demo-seed-now', name: 'демо: seed зависит от времени', file: D, suite: 'economy',
    find: "  const rand = seeded(seed)\n", replace: "  const rand = seeded(seed + Math.floor(now / 60000))\n" },
  { id: 'demo-anchor-off', name: 'демо: опорная точка не привязана к суткам', file: D, suite: 'economy',
    find: "const anchor = anchorToDay ? Math.floor(now / DAY) * DAY : now",
    replace: "const anchor = now" },
  { id: 'registry-stage', name: 'реестр: стадия ares1 beta → live', file: R, suite: 'security',
    find: "{ id: 'ares1', name: 'ARES-1', subtitle: 'Potato Colony on Solana', network: 'Solana Devnet', stage: 'beta'",
    replace: "{ id: 'ares1', name: 'ARES-1', subtitle: 'Potato Colony on Solana', network: 'Solana Devnet', stage: 'live'" },
  { id: 'demo-gate-off', name: 'демо включено без флага конфигурации', file: I, suite: 'security',
    find: "if (demo && !config.allowDemo) throw new HttpError(403, 'demo_disabled'",
    replace: "if (demo && !true) throw new HttpError(403, 'demo_disabled'", expectAll: true },
  { id: 'read-open', name: 'read-токен не проверяется', file: I, suite: 'security',
    find: "const auth = authenticate(req, { kind, config, rawBody })", replace: "const auth = { ok: true }" },
  { id: 'body-cap-off', name: 'лимит тела снят', file: I, suite: 'security',
    find: "async function readRawBody(req, maxBytes = config.maxBodyBytes) {",
    replace: "async function readRawBody(req, maxBytes = 64 * 1024 * 1024) {" },
  { id: 'retention-off', name: 'retention: вытеснение отключено', file: 'server/ingestion/event-inbox.js', suite: 'security',
    find: "  while (events.size > settings.maxEvents) {", replace: "  while (false) {" },
  { id: 'xff-trust', name: 'X-Forwarded-For принимается всегда', file: A, suite: 'security',
    find: "  if (!trustProxy) return socketAddress",
    replace: "  if (false) return socketAddress" },
  { id: 'hmac-window', name: 'HMAC: окно подписи снято', file: A, suite: 'security',
    find: "if (Math.abs(now - parsedTimestamp) > toleranceMs) return { valid: false, reason: 'signature_timestamp_out_of_window' }",
    replace: "if (false) return { valid: false, reason: 'signature_timestamp_out_of_window' }" },
  { id: 'amount-check-off', name: 'лимит сумм из конфигурации не применяется', file: 'server/ingestion/provider.js', suite: 'security',
    find: "      const check = assertSafeAmount(event.payload[key], { name: `payload.${key}`, max: maxEventAmount })",
    replace: "      const check = assertSafeAmount(event.payload[key], { name: `payload.${key}`, max: Number.MAX_SAFE_INTEGER })" },
  { id: 'cors-wildcard', name: 'CORS: любой источник', file: I, suite: 'security',
    find: "  if (config.allowedOrigins.includes(origin)) return { 'access-control-allow-origin': origin, vary: 'Origin' }",
    replace: "  if (false) return { 'access-control-allow-origin': origin, vary: 'Origin' }\n  return { 'access-control-allow-origin': origin }" },
  { id: 'ttl-ignored', name: 'TTL событий игнорируется', file: 'server/ingestion/event-inbox.js', suite: 'security',
    find: "  if (Number.isInteger(eventTtlHours) && eventTtlHours >= 0) settings.ttlMs = eventTtlHours * 3600_000",
    replace: "  if (false) settings.ttlMs = eventTtlHours * 3600_000" },
  { id: 'audit-raw-ip', name: 'аудит хранит IP открытым текстом', file: A, suite: 'security',
    find: "    ipHash: hashIp(address, config?.ipHashSalt || 'salt'),", replace: "    ipHash: address," },
  { id: 'pii-raw-events', name: '/api/events отдаёт исходные события', file: I, suite: 'security',
    find: "}).map((event) => anonymizeEvent(event, piiOptions))", replace: "})" },
  { id: 'erasure-noop', name: 'удаление данных игрока ничего не делает', file: 'server/ingestion/event-inbox.js', suite: 'security',
    find: "    if (hit) {\n      events.delete(identity)\n      removed += 1\n    }",
    replace: "    if (hit) {\n      removed += 1\n    }" },
  { id: 'projection-fake-links', name: 'переплетение: выдуманные связки вместо реальных событий', file: 'server/ingestion/player-projections.js', suite: 'security',
    find: "  const linkList = [...links.values()]",
    replace: "  const linkList = links.size ? [...links.values()] : [{ sourceGame: 'guttercaps', targetGame: 'neonrelay', assetId: 'cgi_fake', itemType: 'golden_cap', rarity: 'legendary', isCnft: true, eventTypes: ['CrossGameLinked'], firstSeenAt: null, lastSeenAt: null }]" },
  { id: 'sanitize-off', name: 'санитизация идентификаторов отключена', file: S, suite: 'security',
    find: "  const cleaned = String(value).replace(CONTROL_CHARS, '').replace(HTML_CHARS, '').replace(IDENTIFIER_CHARS, '').replace(ACTIVE_SCHEMES, '').trim()",
    replace: "  const cleaned = String(value).trim()", expectAll: true },
]

const selected = (() => {
  const only = arg('only')
  if (only) return MUTANTS.filter((mutant) => only.split(',').includes(mutant.id))
  const suite = arg('suite')
  if (suite) return MUTANTS.filter((mutant) => mutant.suite === suite)
  if (has('all')) return MUTANTS
  return MUTANTS.filter((mutant) => mutant.suite !== 'readonly')
})()

if (has('list')) {
  for (const mutant of selected) console.log(`${mutant.suite.padEnd(9)} ${mutant.id.padEnd(22)} ${mutant.name} (${mutant.file})`)
  console.log(`\nВсего мутаций: ${selected.length}`)
  process.exit(0)
}

const stateDir = mkdtempSync(path.join(tmpdir(), 'watchtower-mutation-'))
const restoreQueue = new Map()
const results = []

function restoreAll() {
  for (const [file, content] of restoreQueue) writeFileSync(path.join(root, file), content)
  restoreQueue.clear()
  try { rmSync(stateDir, { recursive: true, force: true }) } catch { /* временный каталог */ }
}

process.on('exit', restoreAll)
process.on('SIGINT', () => { restoreAll(); process.exit(130) })

console.log(`Мутационная проверка: ${selected.length} мутаций, порог ${threshold}`)
console.log(`Наборы тестов: ${Object.entries(SUITES).map(([name, files]) => `${name} (${files.length})`).join(', ')}\n`)

for (const mutant of selected) {
  const fullPath = path.join(root, mutant.file)
  const original = restoreQueue.get(mutant.file) ?? readFileSync(fullPath, 'utf8')
  restoreQueue.set(mutant.file, original)
  const occurrences = original.split(mutant.find).length - 1
  const expected = mutant.expectAll ? occurrences > 0 : occurrences === 1
  if (!expected) {
    results.push({ ...mutant, outcome: 'invalid', detail: `фрагмент найден ${occurrences} раз (ожидался 1)` })
    console.log(`✖ ${mutant.id}: мутант устарел — фрагмент найден ${occurrences} раз`)
    continue
  }
  const mutated = mutant.expectAll ? original.split(mutant.find).join(mutant.replace) : original.replace(mutant.find, mutant.replace)
  writeFileSync(fullPath, mutated)
  const started = Date.now()
  const run = spawnSync(process.execPath, ['--test', ...SUITES[mutant.suite]], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', WATCHTOWER_PII_SALT: 'mutation-test-salt-0123456789', WATCHTOWER_ALLOW_DEMO: '1' },
  })
  const killed = run.status !== 0
  writeFileSync(fullPath, original)
  const durationMs = Date.now() - started
  results.push({ ...mutant, outcome: killed ? 'killed' : 'survived', exitCode: run.status, durationMs })
  console.log(`${killed ? '✅ убит  ' : '❌ выжил '} ${mutant.id.padEnd(22)} ${mutant.name} (${durationMs} ms)`)
  if (!killed) {
    const tail = String(run.stdout || '').split('\n').filter((line) => line.startsWith('not ok') || line.includes('# fail')).slice(0, 3)
    for (const line of tail) console.log(`     ${line.trim()}`)
  }
}

// Проверка, что исходники вернулись в исходное состояние.
for (const [file, content] of restoreQueue) {
  const current = readFileSync(path.join(root, file), 'utf8')
  if (createHash('sha256').update(current).digest('hex') !== createHash('sha256').update(content).digest('hex')) {
    console.error(`❌ Файл ${file} не восстановлен после мутаций`)
    process.exit(1)
  }
}

const killed = results.filter((item) => item.outcome === 'killed').length
const survived = results.filter((item) => item.outcome === 'survived')
const invalid = results.filter((item) => item.outcome === 'invalid')
const score = results.length ? killed / results.length : 0

console.log(`\nИтог: убито ${killed}/${results.length}, score ${score.toFixed(3)} (порог ${threshold})`)
if (survived.length) {
  console.log('Выжившие мутанты (эти участки тестами не защищены):')
  for (const item of survived) console.log(`  - ${item.id}: ${item.name} → ${item.file}`)
}
if (invalid.length) {
  console.log('Нерабочие мутанты (список мутаций разошёлся с кодом):')
  for (const item of invalid) console.log(`  - ${item.id}: ${item.detail}`)
}
const jsonPath = arg('json')
if (jsonPath) {
  writeFileSync(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), threshold, score, killed, total: results.length, survived: survived.map((i) => i.id), invalid: invalid.map((i) => i.id), results }, null, 2)}\n`)
  console.log(`Отчёт: ${jsonPath}`)
}

process.exit(score >= threshold && invalid.length === 0 ? 0 : 1)

#!/usr/bin/env node
// Проверка покрытия экосистемы относительно целевого спека docs/ecosystem-target.spec.json.
// Читает read-only API хаба и показывает фактический уровень каждого tenant'а.
//
//   node scripts/check-ecosystem-target.mjs            # информационно
//   node scripts/check-ecosystem-target.mjs --strict   # exit 1 при покрытии L3 ниже цели
//
// Ничего не пишет: только GET-запросы.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const specPath = join(here, '..', 'docs', 'ecosystem-target.spec.json')
const spec = JSON.parse(readFileSync(specPath, 'utf8'))
const base = process.env.WATCHTOWER_API_URL || 'http://127.0.0.1:8787'
const token = process.env.WATCHTOWER_READ_TOKEN
const strict = process.argv.includes('--strict')

const get = async (path) => {
  const res = await fetch(`${base}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

const level = (adapter, ingestion) => {
  if (!adapter) return { level: 'L0', why: 'нет адаптера в хабе' }
  // off-chain tenant'ы (trafficgen) настраиваются URL экспортера, а не program id
  const envKey = adapter.offchain ? adapter.apiBaseUrlEnv : adapter.programEnv
  if (!adapter.configured) {
    return { level: 'L1', why: envKey ? `${adapter.offchain ? 'apiBaseUrl' : 'programId'} не задан (${envKey})` : 'адаптер не сконфигурирован' }
  }
  const quality = ingestion?.quality || adapter.quality || 'unavailable'
  if (quality === 'unavailable') return { level: 'L1', why: 'dataQuality = unavailable' }
  return { level: 'L2', why: `подключён, dataQuality=${quality}` }
}

const main = async () => {
  const health = await get('/api/health')
  if (health.writes !== false) throw new Error('контракт безопасности нарушен: health.writes !== false')
  const { adapters } = await get('/api/ingestion/adapters')
  const byId = new Map(adapters.map((a) => [a.gameId, a]))

  const rows = []
  for (const tenant of spec.tenants) {
    const adapter = byId.get(tenant)
    let ingestion = null
    try { ingestion = await get(`/api/games/${tenant}/ingestion`) } catch { /* адаптера нет */ }
    const state = level(adapter, ingestion)
    rows.push({ tenant, ...state, quality: ingestion?.quality || adapter?.quality || 'unavailable' })
  }

  const printable = rows.map((r) => ({ tenant: r.tenant, level: r.level, quality: r.quality, why: r.why }))
  console.log(`Watchtower ecosystem target — ${spec.spec} v${spec.version}`)
  console.log(`Уровни: L2=${rows.filter((r) => r.level === 'L2').length}/${rows.length}  ` +
    `L1=${rows.filter((r) => r.level === 'L1').length}  L0=${rows.filter((r) => r.level === 'L0').length}`)
  console.table(printable)

  const targetL3 = spec.gates.tenantCoverageL3PercentTarget
  const atL3plus = rows.filter((r) => ['L3', 'L4'].includes(r.level)).length
  const coverage = Math.round((atL3plus / rows.length) * 100)
  console.log(`Покрытие L3+: ${coverage}% (цель ${targetL3}%) — уровни L3/L4 требуют проверки требований из spec: ` +
    `contracts ${spec.planes.contracts.length}, backend ${spec.planes.backend.length}, ` +
    `frontend ${spec.planes.frontend.length}, data ${spec.planes.data.length}, ops ${spec.planes.ops.length}, ` +
    `interweaving ${spec.interweaving.length}`)
  console.log(`SLO-цели: p95 API ${spec.slo.apiReadLatencyP95Ms}ms, finalized lag p95 ${spec.slo.finalizedLagP95Seconds}s, ` +
    `свежесть ${spec.slo.dataFreshnessMinutes}min, uptime ${spec.slo.uptimeMonthlyPercent}%`)

  if (strict && coverage < targetL3) {
    console.error(`FAIL: покрытие L3+ ${coverage}% ниже цели ${targetL3}%`)
    process.exit(1)
  }
}

main().catch((error) => {
  const unreachable = /fetch failed|ECONNREFUSED|ENOTFOUND|socket hang up/i.test(String(error?.message))
  const hint = unreachable
    ? ` — хаб недоступен по ${base}. Запустите API (npm run start) или задайте WATCHTOWER_API_URL и WATCHTOWER_READ_TOKEN.`
    : ''
  console.error(`check-ecosystem-target: ${error.message}${hint}`)
  process.exit(1)
})

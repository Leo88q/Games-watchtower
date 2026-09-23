// ЭКОСИСТЕМА: единый статус всех tenant'ов студии.
// Read-only. Собирает: адаптеры, аудиты (reports/*.json), паспорта/спеку (docs/ecosystem-target.spec.json),
// реестр (src/data/registry.js) — и вычисляет уровень зрелости L0..L4 по каждому tenant'у.
//
// Правила уровней совпадают с scripts/check-ecosystem-target.mjs:
//   L0 — нет адаптера
//   L1 — адаптер есть, но не сконфигурирован (нет program id / apiBaseUrl) или dataQuality = unavailable
//   L2 — подключён и dataQuality честный (complete|partial)
//   L3/L4 — подтверждаются отдельно (требуют доказательств из спека); здесь не присваиваются автоматически
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function readJson(relPath) {
  try { return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8')) } catch { return null }
}

export function ecosystemTarget() {
  return readJson('docs/ecosystem-target.spec.json')
}

function auditSummary(name) {
  // имена файлов отчётов не всегда совпадают с gameId (neonrelay → neon-relay-audit.json)
  const AUDIT_FILE = { neonrelay: 'neon-relay', ares1: 'ares1', aof: 'aof', guttercaps: 'guttercaps', trafficgen: 'trafficgen', investor: 'investor' }
  const base = AUDIT_FILE[name] || name
  const raw = readJson(`reports/${base}-audit.json`)
  if (!raw) return { present: false, filesScanned: 0, total: 0, critical: 0, high: 0, source: `reports/${base}-audit.json` }
  const findings = Array.isArray(raw.findings) ? raw.findings : []
  const count = (sev) => findings.filter((f) => f && f.severity === sev).length
  return {
    present: true,
    filesScanned: raw.files_scanned ?? 0,
    total: findings.length,
    critical: count('critical'),
    high: count('high'),
    medium: count('medium'),
    low: count('low'),
    scanValid: (raw.files_scanned ?? 0) > 0,
    source: `reports/${base}-audit.json`,
  }
}

const LEVEL_MEANING = {
  L0: 'нет адаптера в хабе',
  L1: 'паспорт/адаптер заявлены, данных нет (programId не задан или dataQuality = unavailable)',
  L2: 'подключён: exporter отдаёт факты, dataQuality честный',
  L3: 'тёплое состояние: полный контур метрик/экономики/идентичности, инварианты и алерты, cross-game связки',
  L4: 'hot: SLO соблюдаются, proposal-flow в бою, DR и дежурство проверены, экономика консолидирована',
}

export function buildEcosystemStatus({ adapters, registry = [], env = process.env } = {}) {
  const target = ecosystemTarget()
  const tenants = target?.tenants || adapters.map((a) => a.gameId)
  const list = []

  for (const gameId of tenants) {
    const adapter = adapters.find((a) => a.gameId === gameId) || null
    const game = registry.find((g) => g.id === gameId) || null
    const audit = auditSummary(gameId)

    let level = 'L0'
    let reason = 'нет адаптера в хабе'
    if (adapter) {
      const envKey = adapter.offchain ? adapter.apiBaseUrlEnv : adapter.programEnv
      const configured = adapter.configured === true
      if (!configured) {
        level = 'L1'
        reason = envKey ? `${adapter.offchain ? 'apiBaseUrl' : 'programId'} не задан (${envKey})` : 'адаптер не сконфигурирован'
      } else if ((adapter.quality || 'unavailable') === 'unavailable') {
        level = 'L1'
        reason = 'dataQuality = unavailable'
      } else {
        level = 'L2'
        reason = `подключён, dataQuality=${adapter.quality}`
      }
    }

    list.push({
      gameId,
      name: adapter?.name || game?.name || gameId,
      kind: adapter?.offchain ? 'application' : 'game',
      level,
      levelMeaning: LEVEL_MEANING[level],
      reason,
      configured: Boolean(adapter?.configured),
      envKey: adapter ? (adapter.offchain ? adapter.apiBaseUrlEnv : adapter.programEnv) : null,
      configuredFromEnv: Boolean(adapter?.offchain ? env[adapter.apiBaseUrlEnv] : env[adapter.programEnv]),
      dataQuality: adapter?.quality || 'unavailable',
      stage: game?.stage || null,
      network: game?.network || null,
      registryDataQuality: game?.dataQuality || null,
      registrySource: game?.source || null,
      findings: audit,
      auditDiscrepancy: audit.present && !audit.scanValid,
      nextStep: level === 'L1'
        ? `Заполнить ${adapter?.offchain ? adapter.apiBaseUrlEnv : adapter.programEnv} после верификации и подключить exporter (промпт prompts/arena/max/PROMPT_MAX_${gameId.toUpperCase()}.md)`
        : level === 'L2'
          ? 'Довести до L3 по docs/ecosystem-target.spec.json (backend/frontend/interweaving)'
          : 'Начать с PROMPT_MAX_HUB.md: адаптер и паспорт',
    })
  }

  const counts = list.reduce((acc, t) => { acc[t.level] = (acc[t.level] || 0) + 1; return acc }, {})
  const l3plus = list.filter((t) => ['L3', 'L4'].includes(t.level)).length
  const gates = target?.gates || {}

  return {
    spec: target?.spec || 'watchtower-ecosystem-target',
    specVersion: target?.version || null,
    generatedAt: new Date().toISOString(),
    writes: false,
    mode: env.WATCHTOWER_PROVIDER || 'mock',
    levels: LEVEL_MEANING,
    counts,
    coverage: {
      tenants: list.length,
      configured: list.filter((t) => t.configured).length,
      l3plus,
      l3plusPercent: list.length ? Math.round((l3plus / list.length) * 100) : 0,
      target: gates.tenantCoverageL3PercentTarget ?? 80,
    },
    findingsTotal: {
      critical: list.reduce((n, t) => n + t.findings.critical, 0),
      high: list.reduce((n, t) => n + t.findings.high, 0),
      total: list.reduce((n, t) => n + t.findings.total, 0),
      scansMissing: list.filter((t) => t.findings.present && !t.findings.scanValid).map((t) => t.gameId),
    },
    requirements: target ? {
      contracts: target.planes.contracts.length,
      backend: target.planes.backend.length,
      frontend: target.planes.frontend.length,
      data: target.planes.data.length,
      ops: target.planes.ops.length,
      interweaving: target.interweaving.length,
      total: Object.values(target.planes).reduce((n, p) => n + p.length, 0) + target.interweaving.length,
    } : null,
    slo: target?.slo || null,
    gates,
    tenants: list,
  }
}

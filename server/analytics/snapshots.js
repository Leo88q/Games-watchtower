/**
 * Снимки инвесторских отчётов.
 *
 * Снимок иммутабелен по смыслу, но файл — общий ресурс: два одновременных POST
 * /api/investors/snapshots (или POST и чтение) не должны терять записи и не должны
 * оставлять обрезанный JSON. Поэтому read-modify-write идёт через очередь и атомарную
 * замену файла (server/state/json-store.js), а не прямым fs.writeFile.
 */

import path from 'node:path'
import { investorReport } from './investor-report.js'
import { readJsonFile, updateJsonFile } from '../state/json-store.js'

const file = path.resolve(process.env.WATCHTOWER_SNAPSHOT_FILE || 'data/investor-snapshots.json')
const MAX_SNAPSHOTS = 365
let cache

async function load() {
  if (cache) return cache
  const stored = await readJsonFile(file, [])
  cache = Array.isArray(stored) ? stored : []
  return cache
}

export async function createInvestorSnapshot({ period = '7d UTC', createdBy = 'system' } = {}) {
  const report = investorReport()
  const snapshot = {
    snapshotId: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    version: 'investor-v1',
    period,
    createdBy,
    createdAt: new Date().toISOString(),
    immutable: true,
    report,
  }
  const next = await updateJsonFile(file, [], (current) => {
    const list = Array.isArray(current) ? [...current, snapshot] : [snapshot]
    while (list.length > MAX_SNAPSHOTS) list.shift()
    return list
  })
  cache = next
  return snapshot
}

export async function listInvestorSnapshots({ limit = 30 } = {}) {
  return (await load()).slice(-Math.min(MAX_SNAPSHOTS, Math.max(1, limit))).reverse()
}

export async function investorTrend({ limit = 30 } = {}) {
  const snapshots = (await listInvestorSnapshots({ limit })).reverse()
  return {
    points: snapshots.map((snapshot) => ({
      snapshotId: snapshot.snapshotId,
      createdAt: snapshot.createdAt,
      period: snapshot.period,
      activePlayers: snapshot.report.metrics.activePlayers,
      volume: snapshot.report.metrics.volume,
      minted: snapshot.report.metrics.minted,
      burned: snapshot.report.metrics.burned,
      criticalIncidents: snapshot.report.metrics.criticalIncidents,
      confidence: snapshot.report.confidence,
    })),
    dataQuality: snapshots.length > 1 ? 'partial' : 'unavailable',
  }
}

/** Только для тестов: сброс кэша, чтобы файл был перечитан после внешней записи. */
export function resetSnapshotCacheForTests() { cache = undefined }

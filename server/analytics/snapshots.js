import fs from 'node:fs/promises'
import path from 'node:path'
import { investorReport } from './investor-report.js'

const file = path.resolve(process.env.WATCHTOWER_SNAPSHOT_FILE || 'data/investor-snapshots.json')
let cache

async function load() {
  if (cache) return cache
  try { cache = JSON.parse(await fs.readFile(file, 'utf8')) } catch { cache = [] }
  return cache
}

export async function createInvestorSnapshot({ period = '7d UTC', createdBy = 'system' } = {}) {
  const snapshots = await load()
  const report = investorReport()
  const snapshot = { snapshotId: `snapshot-${Date.now()}`, version: 'investor-v1', period, createdBy, createdAt: new Date().toISOString(), immutable: true, report }
  snapshots.push(snapshot)
  if (snapshots.length > 365) snapshots.shift()
  await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(snapshots, null, 2))
  return snapshot
}

export async function listInvestorSnapshots({ limit = 30 } = {}) { return (await load()).slice(-Math.min(365, Math.max(1, limit))).reverse() }

export async function investorTrend({ limit = 30 } = {}) {
  const snapshots = (await listInvestorSnapshots({ limit })).reverse()
  return { points: snapshots.map((snapshot) => ({ snapshotId: snapshot.snapshotId, createdAt: snapshot.createdAt, period: snapshot.period, activePlayers: snapshot.report.metrics.activePlayers, volume: snapshot.report.metrics.volume, minted: snapshot.report.metrics.minted, burned: snapshot.report.metrics.burned, criticalIncidents: snapshot.report.metrics.criticalIncidents, confidence: snapshot.report.confidence })), dataQuality: snapshots.length > 1 ? 'partial' : 'unavailable' }
}

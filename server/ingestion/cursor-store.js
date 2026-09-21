import fs from 'node:fs/promises'
import path from 'node:path'

const file = path.resolve(process.env.WATCHTOWER_CURSOR_FILE || 'data/ingestion-cursors.json')
let cache

async function load() {
  if (cache) return cache
  try { cache = JSON.parse(await fs.readFile(file, 'utf8')) } catch { cache = {} }
  return cache
}

export async function getCursor(streamKey) { return (await load())[streamKey] || null }
export async function setCursor(streamKey, cursor) {
  const state = await load(); state[streamKey] = { ...cursor, updatedAt: new Date().toISOString() }
  await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(state, null, 2))
  return state[streamKey]
}
export async function allCursors() { return { ...(await load()) } }

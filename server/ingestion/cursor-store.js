/**
 * Курсоры приёма (продолжение чтения от провайдера после рестарта).
 *
 * Файл — единственное место, где хаб хранит позицию чтения, поэтому запись атомарная
 * и сериализованная: два одновременных обновления не должны потерять чужой курсор,
 * а падение процесса не должно оставить обрезанный JSON (server/state/json-store.js).
 */

import path from 'node:path'
import { readJsonFile, updateJsonFile } from '../state/json-store.js'

const file = path.resolve(process.env.WATCHTOWER_CURSOR_FILE || 'data/ingestion-cursors.json')
let cache

async function load() {
  if (cache) return cache
  cache = await readJsonFile(file, {})
  return cache
}

export async function getCursor(streamKey) { return (await load())[streamKey] || null }

export async function setCursor(streamKey, cursor) {
  const state = await updateJsonFile(file, {}, (current) => ({
    ...current,
    [streamKey]: { ...cursor, updatedAt: new Date().toISOString() },
  }))
  cache = state
  return state[streamKey]
}

export async function allCursors() { return { ...(await load()) } }

/** Только для тестов: сброс кэша, чтобы файл был перечитан (например, после внешней записи). */
export function resetCursorCacheForTests() { cache = undefined }

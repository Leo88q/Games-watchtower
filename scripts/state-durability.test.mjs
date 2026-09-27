/**
 * Долговременное состояние хаба: атомарность и отсутствие потерянных обновлений.
 *
 *   node --test scripts/state-durability.test.mjs
 *
 * Базы данных в проекте нет: единственные файлы состояния — курсоры приёма и снимки
 * инвесторских отчётов. Раньше оба писались прямым `fs.writeFile`, то есть:
 *  - падение процесса посреди записи оставляло обрезанный JSON;
 *  - два одновременных запроса делали read-modify-write поверх одного файла и теряли запись.
 * Эти тесты фиксируют оба свойства (находка F-022).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const stateDir = mkdtempSync(path.join(tmpdir(), 'watchtower-state-'))
process.env.WATCHTOWER_CURSOR_FILE = path.join(stateDir, 'cursors.json')
process.env.WATCHTOWER_SNAPSHOT_FILE = path.join(stateDir, 'snapshots.json')
process.env.WATCHTOWER_PII_SALT = 'state-test-salt-0123456789'

const { writeJsonFileAtomic, readJsonFile, updateJsonFile } = await import('../server/state/json-store.js')
const { setCursor, allCursors } = await import('../server/ingestion/cursor-store.js')
const { createInvestorSnapshot, listInvestorSnapshots } = await import('../server/analytics/snapshots.js')

test.after(() => { rmSync(stateDir, { recursive: true, force: true }) })

test('запись файла состояния атомарна: временных файлов не остаётся', async () => {
  const file = path.join(stateDir, 'atomic.json')
  await writeJsonFileAtomic(file, { value: 1 })
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { value: 1 })
  await writeJsonFileAtomic(file, { value: 2 })
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { value: 2 })
  const leftovers = readdirSync(stateDir).filter((name) => name.includes('.tmp'))
  assert.deepEqual(leftovers, [], `После записи остались временные файлы: ${leftovers.join(', ')}`)
})

test('обрезанный (torn) JSON не роняет чтение: возвращается безопасное значение', async () => {
  const file = path.join(stateDir, 'torn.json')
  writeFileSync(file, '{"stream":{"cursor":"abc"')  // имитация падения посреди записи
  assert.deepEqual(await readJsonFile(file, {}), {})
})

test('одновременные обновления одного файла не теряются (нет lost update)', async () => {
  const file = path.join(stateDir, 'counter.json')
  await writeJsonFileAtomic(file, { count: 0 })
  await Promise.all(Array.from({ length: 50 }, () => updateJsonFile(file, { count: 0 }, (current) => ({ count: (current.count || 0) + 1 }))))
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).count, 50)
})

test('параллельные setCursor сохраняют все курсоры, а не последний', async () => {
  const streams = ['solana:ares1', 'solana:aof', 'solana:neonrelay', 'trafficgen', 'solana:guttercaps']
  await Promise.all(streams.map((stream, index) => setCursor(stream, { cursor: `cursor-${index}`, slot: index })))
  const cursors = await allCursors()
  for (const [index, stream] of streams.entries()) {
    assert.equal(cursors[stream]?.cursor, `cursor-${index}`, `Курсор ${stream} потерян при параллельной записи`)
    assert.ok(cursors[stream].updatedAt, 'Курсор обязан содержать время обновления')
  }
})

test('параллельные снимки инвесторских отчётов сохраняются все', async () => {
  const created = await Promise.all(Array.from({ length: 8 }, (_, index) => createInvestorSnapshot({ createdBy: `test-${index}` })))
  assert.equal(created.length, 8)
  const ids = new Set(created.map((snapshot) => snapshot.snapshotId))
  assert.equal(ids.size, 8, 'Идентификаторы снимков обязаны быть уникальными')
  const stored = JSON.parse(readFileSync(process.env.WATCHTOWER_SNAPSHOT_FILE, 'utf8'))
  assert.equal(stored.length, 8, `В файле ${stored.length} снимков вместо 8 — часть потеряна`)
  const listed = await listInvestorSnapshots({ limit: 30 })
  assert.equal(listed.length, 8)
})

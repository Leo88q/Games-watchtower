/**
 * Единственный вид долговременного состояния хаба — JSON-файлы (курсоры приёма, снимки
 * инвесторских отчётов). Базы данных в проекте нет, поэтому от этих двух файлов зависит
 * воспроизводимость внешних интеграций и отчётов. Здесь собраны два свойства, которых
 * не хватало прямому `fs.writeFile`:
 *
 *  1. Атомарность: запись идёт во временный файл в том же каталоге, затем `rename`.
 *     Падение процесса посреди записи не оставляет обрезанный JSON (раньше оставляло).
 *  2. Сериализация: read-modify-write одного файла выполняется в очереди, поэтому два
 *     одновременных запроса не перетирают изменения друг друга (потеря снимка/курсора).
 *
 * Это не замена СУБД: одна реплика, без репликации и без транзакций между файлами.
 * Границы честно описаны в docs/STORAGE_AND_CAPACITY_RU.md.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const queues = new Map()

/** Последовательное выполнение задач над одним файлом (mutex по пути). */
export function withFileQueue(file, task) {
  const key = path.resolve(file)
  const previous = queues.get(key) || Promise.resolve()
  const next = previous.then(task, task)
  // Хвост очереди не должен «залипать» на ошибке предыдущей задачи.
  queues.set(key, next.then(() => undefined, () => undefined))
  return next
}

export async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    // Отсутствующий файл — нормальное состояние первого запуска; битый JSON — тоже fallback,
    // иначе хаб не поднимется из-за одного обрезанного файла состояния.
    return fallback
  }
}

export async function writeJsonFileAtomic(file, value) {
  const directory = path.dirname(file)
  await fs.mkdir(directory, { recursive: true })
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`)
  const handle = await fs.open(temporary, 'w')
  try {
    await handle.writeFile(JSON.stringify(value, null, 2))
    await handle.sync()
  } finally {
    await handle.close()
  }
  try {
    await fs.rename(temporary, file)
  } catch (error) {
    await fs.rm(temporary, { force: true })
    throw error
  }
  // rename переживает падение процесса, но не обязательно падение машины: фиксируем каталог.
  try {
    const directoryHandle = await fs.open(directory, 'r')
    try { await directoryHandle.sync() } finally { await directoryHandle.close() }
  } catch { /* каталог не открывается на запись/синхронизацию — не повод ломать запись */ }
  return value
}

/** Атомарный read-modify-write под очередью: единственный безопасный способ менять файл состояния. */
export function updateJsonFile(file, fallback, updater) {
  return withFileQueue(file, async () => {
    const current = await readJsonFile(file, fallback)
    const next = await updater(current)
    await writeJsonFileAtomic(file, next)
    return next
  })
}

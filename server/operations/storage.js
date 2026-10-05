// ---------------------------------------------------------------------------
// Хранилище состояния вахты: файлы (по умолчанию) или PostgreSQL (DATABASE_URL).
//
// Рабочий набор (игроки, инциденты, голоса) держится в памяти процесса, а хранилище —
// источник истины. Все изменения идут через exclusive(fn): в PostgreSQL это транзакция
// под общей блокировкой с перечитыванием чужих изменений, поэтому экземпляров API может
// быть несколько. Таблица одна: watchtower_state(name, data jsonb, version, updated_at).
// При первом подключении к пустой базе данные из файлов переносятся автоматически.
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

class FileBackend {
  constructor(dir) {
    this.kind = 'file'
    this.dir = dir
    this.queue = Promise.resolve()
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }
  loadSync(name, fallback) {
    try { return JSON.parse(fs.readFileSync(path.join(this.dir, `${name}.json`), 'utf8')) } catch { return fallback }
  }
  async loadAll(names) {
    const out = {}
    for (const n of names) { const v = this.loadSync(n, undefined); if (v !== undefined) out[n] = v }
    return out
  }
  save(name, data) {
    const file = path.join(this.dir, `${name}.json`)
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
    fs.renameSync(tmp, file)
  }
  /** Один процесс: просто выполняем по очереди, сохранения пишутся сразу. */
  exclusive(fn) {
    const run = this.queue.then(() => fn())
    this.queue = run.catch(() => {})
    return run
  }
  async startSync() {}
  async flush() {}
  async close() {}
  status() { return { kind: this.kind } }
}

// Ключ общей блокировки записи вахты (pg_advisory_xact_lock): одна запись за раз на весь кластер
const WRITE_LOCK_KEY = 0x57415443 // 'WATC'
const NOTIFY_CHANNEL = 'watchtower_state'

export class StorageUnavailableError extends Error {
  constructor(cause) {
    super('storage_unavailable')
    this.status = 503
    this.cause = cause
  }
}

/**
 * PostgreSQL для нескольких экземпляров API.
 *
 * Каждая запись — это exclusive(fn): транзакция под общей advisory-блокировкой. Внутри неё
 * экземпляр сначала перечитывает разделы, которые с прошлого раза поменял кто-то другой
 * (по номеру версии), затем синхронно выполняет fn над свежими данными и пишет изменённые
 * разделы с version + 1. Так два голоса по одному инциденту с разных экземпляров не затирают
 * друг друга. Чтения остаются из памяти; о чужих записях экземпляр узнаёт через LISTEN/NOTIFY
 * и, на всякий случай, опросом версий раз в несколько секунд.
 */
class PostgresBackend {
  constructor(pool, { logger, instanceId, pollMs = 5000, connectListener }) {
    this.kind = 'postgres'
    this.pool = pool
    this.logger = logger
    this.instanceId = instanceId
    this.pollMs = pollMs
    this.connectListener = connectListener
    this.versions = new Map() // раздел -> версия, которую видит этот экземпляр
    this.queue = Promise.resolve()
    this.tx = null // разделы, сохранённые внутри текущей exclusive()
    this.outside = new Map() // сохранения вне exclusive(): перенос из файлов при старте
    this.onReload = null
    this.lastError = null
    this.writes = 0
    this.reloads = 0
    this.listener = null
    this.pollTimer = null
    this.closed = false
  }
  async migrate() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS watchtower_state (
      name text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`)
    await this.pool.query('ALTER TABLE watchtower_state ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0')
  }
  async loadAll(names) {
    const { rows } = await this.pool.query('SELECT name, data, version FROM watchtower_state WHERE name = ANY($1)', [names])
    for (const r of rows) this.versions.set(r.name, Number(r.version))
    return Object.fromEntries(rows.map((r) => [r.name, r.data]))
  }
  async isEmpty() {
    const { rows } = await this.pool.query('SELECT count(*)::int AS n FROM watchtower_state')
    return rows[0].n === 0
  }
  save(name, data) {
    // Снимок сейчас: дальнейшие мутации объекта в памяти не должны «доехать» в базу частично
    const json = JSON.stringify(data)
    if (this.tx) { this.tx.set(name, json); return }
    this.outside.set(name, json)
  }
  /** Выполняет fn под общей блокировкой на свежих данных и атомарно сохраняет то, что fn изменила. */
  exclusive(fn) {
    const run = this.queue.then(() => this.#exclusive(fn))
    this.queue = run.catch(() => {})
    return run
  }
  async #exclusive(fn) {
    let client
    try {
      client = await this.pool.connect()
    } catch (error) {
      this.lastError = error.message
      throw new StorageUnavailableError(error)
    }
    let result
    let fnError = null
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock($1)', [WRITE_LOCK_KEY])
      await this.#refresh(client)
      this.tx = new Map()
      // Ошибка бизнес-логики (например, «уже голосовали») не отменяет то, что успело сохраниться
      // до неё (счётчик лимита и т. п.) — так же вела себя файловая запись.
      try { result = fn() } catch (error) { fnError = error }
      const batch = this.tx
      this.tx = null
      for (const [n, j] of this.outside) if (!batch.has(n)) batch.set(n, j)
      this.outside.clear()
      const written = []
      for (const [name, json] of batch) {
        const { rows } = await client.query(
          `INSERT INTO watchtower_state (name, data, version, updated_at) VALUES ($1, $2::jsonb, 1, now())
           ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, version = watchtower_state.version + 1, updated_at = now()
           RETURNING version`,
          [name, json],
        )
        written.push([name, Number(rows[0].version)])
      }
      if (written.length) await client.query('SELECT pg_notify($1, $2)', [NOTIFY_CHANNEL, JSON.stringify({ from: this.instanceId, sections: written })])
      await client.query('COMMIT')
      for (const [n, v] of written) this.versions.set(n, v)
      this.writes += written.length
      this.lastError = null
    } catch (error) {
      this.tx = null
      await client.query('ROLLBACK').catch(() => {})
      this.lastError = error.message
      this.logger?.error('storage_write_failed', { backend: 'postgres', message: error.message })
      // Память могла уйти вперёд базы: забываем версии, следующий доступ перечитает всё из базы
      this.versions.clear()
      this.#scheduleRefresh()
      throw new StorageUnavailableError(error)
    } finally {
      client.release()
    }
    if (fnError) throw fnError
    return result
  }
  /** Перечитывает разделы, версия которых в базе новее, чем у этого экземпляра. */
  async #refresh(db = this.pool) {
    const { rows } = await db.query('SELECT name, version FROM watchtower_state')
    this.lastError = null
    const stale = rows.filter((r) => Number(r.version) > (this.versions.get(r.name) ?? -1)).map((r) => r.name)
    if (!stale.length) return
    const fresh = await db.query('SELECT name, data, version FROM watchtower_state WHERE name = ANY($1)', [stale])
    for (const r of fresh.rows) {
      this.onReload?.(r.name, r.data)
      this.versions.set(r.name, Number(r.version))
    }
    this.reloads += fresh.rows.length
  }
  #scheduleRefresh() {
    if (this.closed) return
    this.queue = this.queue.then(() => this.#refresh()).catch((error) => {
      this.lastError = error.message
      this.logger?.warn('storage_refresh_failed', { message: error.message })
    })
    return this.queue
  }
  /** Подписка на чужие записи. Без неё экземпляр всё равно увидит их опросом и перед каждой своей записью. */
  async startSync() {
    this.pollTimer = setInterval(() => this.#scheduleRefresh(), this.pollMs)
    this.pollTimer.unref?.()
    if (!this.connectListener) return
    try {
      this.listener = await this.connectListener()
      this.listener.on('notification', (msg) => {
        try { if (JSON.parse(msg.payload).from === this.instanceId) return } catch { /* чужой формат — перечитаем */ }
        this.#scheduleRefresh()
      })
      this.listener.on('error', (error) => {
        this.logger?.warn('storage_listener_error', { message: error.message })
        this.listener = null
      })
      await this.listener.query(`LISTEN ${NOTIFY_CHANNEL}`)
    } catch (error) {
      this.listener = null
      this.logger?.warn('storage_listener_unavailable', { message: error.message })
    }
  }
  async flush() {
    if (this.outside.size) await this.exclusive(() => {})
    await this.queue
  }
  async close() {
    await this.flush()
    this.closed = true
    clearInterval(this.pollTimer)
    await this.listener?.end().catch(() => {})
    await this.pool.end()
  }
  status() { return { kind: this.kind, writes: this.writes, reloads: this.reloads, listening: Boolean(this.listener), lastError: this.lastError } }
}

export function createFileBackend(dir) {
  return new FileBackend(dir)
}

/**
 * Выбирает хранилище по окружению. Без DATABASE_URL — файлы, как раньше.
 * С DATABASE_URL — PostgreSQL; если база пуста, переносит в неё данные из файлов.
 */
export async function createStorage({ databaseUrl, dataDir, names, logger, ssl, instanceId = randomUUID() } = {}) {
  const files = new FileBackend(dataDir)
  if (!databaseUrl) return files
  let pg
  try {
    pg = (await import('pg')).default
  } catch {
    throw new Error('Задан DATABASE_URL, но драйвер PostgreSQL не установлен: выполните npm install pg')
  }
  const sslOption = ssl && !['0', 'false', 'off'].includes(String(ssl).toLowerCase()) ? { rejectUnauthorized: ssl !== 'no-verify' } : undefined
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5, ssl: sslOption })
  pool.on('error', (error) => logger?.error('storage_pool_error', { message: error.message }))
  // Отдельное соединение для LISTEN: из пула его брать нельзя, оно должно жить постоянно
  const connectListener = async () => {
    const client = new pg.Client({ connectionString: databaseUrl, ssl: sslOption })
    await client.connect()
    return client
  }
  const backend = new PostgresBackend(pool, { logger, instanceId, connectListener })
  await backend.migrate()
  if (await backend.isEmpty()) {
    const existing = await files.loadAll(names)
    const moved = Object.keys(existing)
    for (const n of moved) backend.save(n, existing[n])
    await backend.flush()
    if (moved.length) logger?.info('storage_migrated_from_files', { sections: moved })
  }
  return backend
}

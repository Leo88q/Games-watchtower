// ---------------------------------------------------------------------------
// Хранилище состояния вахты: файлы (по умолчанию) или PostgreSQL (DATABASE_URL).
//
// Рабочий набор (игроки, инциденты, голоса) держится в памяти процесса, а хранилище —
// источник истины между перезапусками. Запись в PostgreSQL асинхронная: частые
// сохранения одного раздела сливаются в одну запись, при остановке всё дописывается.
// Таблица одна: watchtower_state(name, data jsonb, updated_at).
// При первом подключении к пустой базе данные из файлов переносятся автоматически.
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'

class FileBackend {
  constructor(dir) {
    this.kind = 'file'
    this.dir = dir
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
  async flush() {}
  async close() {}
  status() { return { kind: this.kind } }
}

class PostgresBackend {
  constructor(pool, { logger, debounceMs = 40 }) {
    this.kind = 'postgres'
    this.pool = pool
    this.logger = logger
    this.debounceMs = debounceMs
    this.pending = new Map() // name -> latest data
    this.timer = null
    this.inflight = Promise.resolve()
    this.lastError = null
    this.writes = 0
  }
  async migrate() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS watchtower_state (
      name text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`)
  }
  async loadAll(names) {
    const { rows } = await this.pool.query('SELECT name, data FROM watchtower_state WHERE name = ANY($1)', [names])
    return Object.fromEntries(rows.map((r) => [r.name, r.data]))
  }
  async isEmpty() {
    const { rows } = await this.pool.query('SELECT count(*)::int AS n FROM watchtower_state')
    return rows[0].n === 0
  }
  save(name, data) {
    // Снимок сейчас: дальнейшие мутации объекта в памяти не должны «доехать» в базу частично
    this.pending.set(name, JSON.stringify(data))
    if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.#drain() }, this.debounceMs)
  }
  #drain() {
    if (!this.pending.size) return this.inflight
    const batch = [...this.pending.entries()]
    this.pending.clear()
    this.inflight = this.inflight.then(async () => {
      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        for (const [name, json] of batch) {
          await client.query(
            `INSERT INTO watchtower_state (name, data, updated_at) VALUES ($1, $2::jsonb, now())
             ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
            [name, json],
          )
        }
        await client.query('COMMIT')
        this.writes += batch.length
        this.lastError = null
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        this.lastError = error.message
        this.logger?.error('storage_write_failed', { backend: 'postgres', message: error.message, sections: batch.map(([n]) => n) })
        // Не теряем данные: возвращаем в очередь, если за это время не пришла более свежая версия
        for (const [name, json] of batch) if (!this.pending.has(name)) this.pending.set(name, json)
        if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.#drain() }, 2000)
      } finally {
        client.release()
      }
    })
    return this.inflight
  }
  async flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    await this.#drain()
    await this.inflight
  }
  async close() {
    await this.flush()
    await this.pool.end()
  }
  status() { return { kind: this.kind, writes: this.writes, pending: this.pending.size, lastError: this.lastError } }
}

export function createFileBackend(dir) {
  return new FileBackend(dir)
}

/**
 * Выбирает хранилище по окружению. Без DATABASE_URL — файлы, как раньше.
 * С DATABASE_URL — PostgreSQL; если база пуста, переносит в неё данные из файлов.
 */
export async function createStorage({ databaseUrl, dataDir, names, logger, ssl } = {}) {
  const files = new FileBackend(dataDir)
  if (!databaseUrl) return files
  let pg
  try {
    pg = (await import('pg')).default
  } catch {
    throw new Error('Задан DATABASE_URL, но драйвер PostgreSQL не установлен: выполните npm install pg')
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5, ssl: ssl && !['0', 'false', 'off'].includes(String(ssl).toLowerCase()) ? { rejectUnauthorized: ssl !== 'no-verify' } : undefined })
  pool.on('error', (error) => logger?.error('storage_pool_error', { message: error.message }))
  const backend = new PostgresBackend(pool, { logger })
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

// ---------------------------------------------------------------------------
// Общий кэш для коротко живущих данных: одноразовые коды входа, лимиты частоты и счётчики
// переходов по партнёрским ссылкам.
// Без REDIS_URL — память процесса (один экземпляр сервера).
// С REDIS_URL — Redis: несколько экземпляров API делят одни коды и лимиты,
// код входа забирается атомарно (GETDEL), поэтому одной подписью нельзя войти дважды.
// ---------------------------------------------------------------------------

class MemoryCache {
  constructor() {
    this.kind = 'memory'
    this.items = new Map() // key -> { value, exp }
    this.counters = new Map() // key -> { count, exp }
  }
  #gc(now) {
    if (this.items.size + this.counters.size < 5000) return
    for (const [k, v] of this.items) if (v.exp <= now) this.items.delete(k)
    for (const [k, v] of this.counters) if (v.exp <= now) this.counters.delete(k)
  }
  async putOnce(key, value, ttlMs) {
    const now = Date.now()
    this.#gc(now)
    this.items.set(key, { value, exp: now + ttlMs })
  }
  async take(key) {
    const item = this.items.get(key)
    this.items.delete(key)
    if (!item || item.exp <= Date.now()) return null
    return item.value
  }
  async hit(key, limit, windowMs) {
    const now = Date.now()
    this.#gc(now)
    let c = this.counters.get(key)
    if (!c || c.exp <= now) { c = { count: 0, exp: now + windowMs }; this.counters.set(key, c) }
    c.count += 1
    return { allowed: c.count <= limit, count: c.count, retryAfterMs: Math.max(0, c.exp - now) }
  }
  /** Текущее значение счётчика hit() без увеличения. */
  async count(key) {
    const c = this.counters.get(key)
    return c && c.exp > Date.now() ? c.count : 0
  }
  async close() {}
  status() { return { kind: this.kind } }
}

class RedisCache {
  constructor(client, prefix) {
    this.kind = 'redis'
    this.client = client
    this.prefix = prefix
  }
  async putOnce(key, value, ttlMs) {
    await this.client.set(this.prefix + key, JSON.stringify(value), { PX: ttlMs })
  }
  async take(key) {
    const raw = await this.client.getDel(this.prefix + key)
    return raw ? JSON.parse(raw) : null
  }
  async hit(key, limit, windowMs) {
    const k = `${this.prefix}rl:${key}`
    const [count, ttl] = await this.client.multi().incr(k).pExpire(k, windowMs, 'NX').pTTL(k).exec()
    return { allowed: Number(count) <= limit, count: Number(count), retryAfterMs: Math.max(0, Number(ttl)) }
  }
  async count(key) {
    return Number(await this.client.get(`${this.prefix}rl:${key}`)) || 0
  }
  async close() { await this.client.quit().catch(() => {}) }
  status() { return { kind: this.kind, ready: this.client.isReady } }
}

export async function createSharedCache({ redisUrl, prefix = 'wt:', logger } = {}) {
  if (!redisUrl) return new MemoryCache()
  let createClient
  try {
    ({ createClient } = await import('redis'))
  } catch {
    throw new Error('Задан REDIS_URL, но клиент Redis не установлен: выполните npm install redis')
  }
  const client = createClient({ url: redisUrl, socket: { connectTimeout: 5000, reconnectStrategy: (n) => Math.min(n * 200, 5000) } })
  client.on('error', (error) => logger?.error('redis_error', { message: error.message }))
  await client.connect()
  // GETDEL появился в Redis 6.2 — проверяем сразу, а не при первом входе игрока
  const info = await client.info('server')
  const version = /redis_version:(\d+)\.(\d+)/.exec(info)
  if (version && (Number(version[1]) < 6 || (Number(version[1]) === 6 && Number(version[2]) < 2))) {
    await client.quit()
    throw new Error(`Нужен Redis 6.2 или новее, подключён ${version[1]}.${version[2]}`)
  }
  return new RedisCache(client, prefix)
}

export function createMemoryCache() {
  return new MemoryCache()
}

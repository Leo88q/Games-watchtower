/**
 * Вспомогательный запуск API для интеграционных тестов.
 * Поднимает server/index.js на свободном порту с отдельными токенами и изолированными файлами состояния,
 * ждёт /api/health и возвращает дескриптор с методами request/stop.
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
    probe.on('error', reject)
  })
}

export async function startTestServer({ env = {}, ingestToken = 'test-ingest-token', readToken = 'test-read-token' } = {}) {
  const port = await freePort()
  const stateDir = mkdtempSync(path.join(tmpdir(), 'watchtower-test-'))
  // Значения undefined нельзя передавать в child_process.env: Node превращает их в строку 'undefined'.
  const extra = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined))
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: path.resolve(new URL('..', import.meta.url).pathname),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      API_PORT: String(port),
      WATCHTOWER_LOG_LEVEL: 'warn',
      WATCHTOWER_INGEST_TOKEN: ingestToken,
      WATCHTOWER_READ_TOKEN: readToken,
      WATCHTOWER_ALLOW_DEMO: '1',
      WATCHTOWER_CURSOR_FILE: path.join(stateDir, 'cursors.json'),
      WATCHTOWER_SNAPSHOT_FILE: path.join(stateDir, 'snapshots.json'),
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const logs = []
  child.stdout.on('data', (chunk) => logs.push(String(chunk)))
  child.stderr.on('data', (chunk) => logs.push(String(chunk)))

  const base = `http://127.0.0.1:${port}`
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
  }

  async function request(requestPath, { method = 'GET', body, token = readToken, headers = {}, raw = false } = {}) {
    const response = await fetch(`${base}${requestPath}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    })
    const text = await response.text()
    let parsed = null
    try { parsed = JSON.parse(text) } catch { parsed = text }
    return { status: response.status, headers: response.headers, body: parsed, text, raw }
  }

  return {
    base,
    port,
    pid: child.pid,
    logs,
    request,
    ingest: (body, { token = ingestToken } = {}) => request('/api/ingest/solana', { method: 'POST', body, token }),
    async stop(signal = 'SIGTERM') {
      if (child.exitCode !== null) return { code: child.exitCode, signal: null }
      const exited = new Promise((resolve) => child.once('exit', (code, sig) => resolve({ code, signal: sig })))
      child.kill(signal)
      const result = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve({ code: null, signal: 'timeout' }), 5000))])
      try { rmSync(stateDir, { recursive: true, force: true }) } catch { /* временный каталог */ }
      return result
    },
  }
}

/**
 * Запуск сервера в режиме «ожидается отказ конфигурации».
 * Возвращает код выхода и объединённый вывод — тесты фиксируют, что fail-fast реально срабатывает.
 */
export async function startExpectingFailure({ env = {}, timeoutMs = 8000 } = {}) {
  const port = await freePort()
  const stateDir = mkdtempSync(path.join(tmpdir(), 'watchtower-refuse-'))
  const extra = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined))
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: path.resolve(new URL('..', import.meta.url).pathname),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      API_PORT: String(port),
      WATCHTOWER_LOG_LEVEL: 'error',
      WATCHTOWER_CURSOR_FILE: path.join(stateDir, 'cursors.json'),
      WATCHTOWER_SNAPSHOT_FILE: path.join(stateDir, 'snapshots.json'),
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const chunks = []
  child.stdout.on('data', (chunk) => chunks.push(String(chunk)))
  child.stderr.on('data', (chunk) => chunks.push(String(chunk)))
  const exit = await Promise.race([
    new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal }))),
    new Promise((resolve) => setTimeout(() => resolve({ code: null, signal: 'timeout' }), timeoutMs)),
  ])
  if (exit.code === null && exit.signal === 'timeout') child.kill('SIGKILL')
  try { rmSync(stateDir, { recursive: true, force: true }) } catch { /* временный каталог */ }
  return { ...exit, output: chunks.join('') }
}

export const sampleEvent = (overrides = {}) => ({
  cluster: 'devnet',
  slot: 100,
  signature: `sig-${Math.random().toString(36).slice(2)}`,
  programId: 'ares1-program',
  eventType: 'TokenMinted',
  payload: { gameId: 'ares1', playerKey: 'player-1', amount: 10 },
  ...overrides,
})

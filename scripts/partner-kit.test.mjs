/**
 * Набор подключения игр к партнёрской программе (sdk/partner-kit).
 *
 * Браузер: код из ?ref= запоминается на 30 дней, первый пригласивший остаётся, язык из ссылки
 * или браузера. Сервер игры: подписи совпадают с тем, что проверяет и ставит вахта; выдача не
 * начисляется дважды (повтор, одновременные запросы); отказ игры сохраняется; сбой начисления
 * даёт 500 и повтор. Сквозной сценарий: вахта + пример сервера игры из набора.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { capturePartnerParams, storedPartnerRef, clearPartnerRef, pickLanguage, REF_TTL_MS } from '../sdk/partner-kit/browser.js'
import {
  signBody, buildProgressRequest, verifyGrantRequest, createGrantHandler, nodeGrantListener, GrantRejected, countryFromHeaders,
} from '../sdk/partner-kit/server.js'
import { verifyGameReport, configureGameProgress } from '../server/operations/game-progress.js'
import { configureGrants, deliverGrant } from '../server/operations/partner-rewards.js'
import { base58Encode } from '../server/operations/wallet-auth.js'
import { startTestServer, freePort } from './test-server.mjs'

const DAY = 24 * 3600 * 1000
const address = () => {
  const { publicKey } = generateKeyPairSync('ed25519')
  return base58Encode(Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url'))
}
const fakeStorage = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
const grant = (over = {}) => ({
  grantId: randomUUID(), game: 'ares1', wallet: address(), reason: 'partner_referral', milestone: null, partnerKind: 'player',
  tokens: { symbol: 'POTATO', amount: 50 }, items: [{ id: 'ares1.seed_crate', kind: 'item', amount: 1 }], issuedAt: Date.now(), ...over,
})
const signedGrant = (secret, g, ts = Date.now()) => {
  const rawBody = JSON.stringify(g)
  const { timestamp, signature } = signBody(secret, rawBody, ts)
  return { rawBody, headers: { 'x-watchtower-timestamp': timestamp, 'x-watchtower-signature': signature, 'x-watchtower-grant': g.grantId } }
}

test('браузер: код запоминается на 30 дней, первый пригласивший остаётся, мусор не сохраняется', () => {
  const storage = fakeStorage()
  const t0 = Date.UTC(2026, 9, 1)
  assert.deepEqual(capturePartnerParams({ url: 'https://ares1.example/?ref=bad code!&lang=xx', storage, now: t0 }), { ref: null, lang: null })
  assert.deepEqual(capturePartnerParams({ url: 'https://ares1.example/?ref=k7m2q9xa&lang=fil', storage, now: t0 }), { ref: 'K7M2Q9XA', lang: 'fil' })
  assert.equal(capturePartnerParams({ url: 'https://ares1.example/?ref=OTHER234', storage, now: t0 + DAY }).ref, 'K7M2Q9XA', 'второй код не перебивает первый')
  assert.equal(storedPartnerRef({ storage, now: t0 + REF_TTL_MS - 1 }), 'K7M2Q9XA')
  assert.equal(storedPartnerRef({ storage, now: t0 + REF_TTL_MS }), null, 'через 30 дней код истекает')
  assert.equal(capturePartnerParams({ url: 'https://ares1.example/?ref=OTHER234', storage, now: t0 + REF_TTL_MS + 1 }).ref, 'OTHER234', 'после истечения — новый код')
  clearPartnerRef({ storage })
  assert.equal(storedPartnerRef({ storage, now: t0 + REF_TTL_MS + 2 }), null)
  // Приватный режим: хранилище бросает исключения — модуль не падает
  const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }, removeItem() { throw new Error('denied') } }
  assert.deepEqual(capturePartnerParams({ url: 'https://g.example/?ref=ABCD2345', storage: broken }), { ref: 'ABCD2345', lang: null })
  // Код убирается из адресной строки, чтобы игрок не переслал его дальше
  let replaced = null
  capturePartnerParams({ url: 'https://g.example/play?ref=ABCD2345&lang=es#top', storage: fakeStorage(), cleanUrl: true, history: { state: null, replaceState: (_s, _t, u) => { replaced = u } } })
  assert.equal(replaced, '/play?lang=es#top')
})

test('браузер: язык из ссылки, затем браузера; тагальский — филиппинский, малайский — запасной', () => {
  const url = 'https://g.example/'
  assert.equal(pickLanguage(undefined, { url: 'https://g.example/?lang=vi', languages: ['ru'] }), 'vi')
  assert.equal(pickLanguage(undefined, { url, languages: ['tl-PH', 'en'] }), 'fil')
  assert.equal(pickLanguage(undefined, { url, languages: ['ms-MY'] }), 'en')
  assert.equal(pickLanguage(undefined, { url, languages: ['in-ID'] }), 'id')
  assert.equal(pickLanguage(['en', 'ru'], { url: 'https://g.example/?lang=es', languages: ['pt-BR'] }), 'en', 'языка нет в игре')
  assert.equal(pickLanguage(['ru', 'en'], { url, languages: [], fallback: 'ru' }), 'ru')
})

test('отчёты: подпись набора принимает вахта; код и страна нормализуются', () => {
  const secret = randomBytes(24).toString('hex')
  configureGameProgress({ env: { GAME_PROGRESS_SECRET_ARES1: secret }, load: () => ({}), save: () => {} })
  const wallet = address()
  const { body, headers } = buildProgressRequest({ game: 'ares1', secret, reports: [{ wallet, hours: 1.5, rank: 1, updatedAt: 1, ref: 'k7m2q9xa', country: 'pt', extra: 'не уходит' }] })
  assert.deepEqual(JSON.parse(body).reports[0], { wallet, hours: 1.5, rank: 1, updatedAt: 1, ref: 'K7M2Q9XA', country: 'PT' })
  assert.equal(headers['x-watchtower-game'], 'ares1')
  assert.deepEqual(verifyGameReport({ game: 'ares1', rawBody: body, signature: headers['x-watchtower-signature'], timestamp: headers['x-watchtower-timestamp'] }), { ok: true })
  assert.throws(() => buildProgressRequest({ game: 'chess', secret, reports: [{}] }), /Неизвестная игра/)
  assert.throws(() => buildProgressRequest({ game: 'ares1', secret: 'short', reports: [{ wallet }] }), /32 символов/)
  assert.throws(() => buildProgressRequest({ game: 'ares1', secret, reports: Array(501).fill({ wallet }) }), /500/)
  assert.equal(countryFromHeaders({ 'cf-ipcountry': 'es' }), null, 'без доверенного прокси заголовок игнорируется')
  assert.equal(countryFromHeaders({ 'cf-ipcountry': 'es' }, { trustProxy: true }), 'ES')
  assert.equal(countryFromHeaders({ 'cf-ipcountry': 'XX' }, { trustProxy: true }), null)
})

test('выдача: запрос вахты проходит проверку набора; подделки отклоняются', async () => {
  const secret = randomBytes(24).toString('hex')
  // Настоящая отправка вахты → проверка набора
  let seen = null
  configureGrants({ env: { PARTNER_GRANT_URL_ARES1: 'https://ares.example/grant', PARTNER_GRANT_SECRET_ARES1: secret }, fetchImpl: async (_u, init) => { seen = init; return new Response('') } })
  const g = grant()
  assert.deepEqual(await deliverGrant(g), { ok: true, status: 'granted', reference: null })
  const ok = verifyGrantRequest({ secret, rawBody: seen.body, headers: seen.headers, game: 'ares1' })
  assert.equal(ok.ok, true)
  assert.equal(ok.grant.grantId, g.grantId)

  const s = signedGrant(secret, g)
  assert.equal(verifyGrantRequest({ secret: 'x'.repeat(48), ...s }).reason, 'bad_signature')
  assert.equal(verifyGrantRequest({ secret, ...signedGrant(secret, g, Date.now() - 10 * 60e3) }).reason, 'stale_or_missing_timestamp')
  assert.equal(verifyGrantRequest({ secret, rawBody: s.rawBody, headers: { ...s.headers, 'x-watchtower-grant': 'other-grant-id' } }).reason, 'grant_header_mismatch')
  assert.equal(verifyGrantRequest({ secret, ...s, game: 'aof' }).reason, 'wrong_game')
  assert.equal(verifyGrantRequest({ secret, ...signedGrant(secret, grant({ items: [{ id: 'x', kind: 'nft', amount: 1 }] })) }).reason, 'bad_item')
  assert.equal(verifyGrantRequest({ secret, ...signedGrant(secret, grant({ tokens: { symbol: 'POTATO', amount: -5 } })) }).reason, 'bad_tokens')
  assert.equal(verifyGrantRequest({ secret, rawBody: s.rawBody, headers: { 'x-watchtower-timestamp': s.headers['x-watchtower-timestamp'] } }).status, 401)
})

test('выдача: один grantId начисляется один раз, отказ сохраняется, сбой даёт повтор', async () => {
  const secret = randomBytes(24).toString('hex')
  const applied = []
  let mode = 'ok'
  const handle = createGrantHandler({
    secret,
    applyGrant: async (g) => {
      await new Promise((r) => setTimeout(r, 20))
      if (mode === 'crash') throw new Error('db down')
      if (mode === 'reject') throw new GrantRejected('wallet unknown')
      applied.push(g.grantId)
      return { reference: `op-${applied.length}` }
    },
  })
  const g = grant()
  const req = () => handle(signedGrant(secret, g))
  const [a, b] = await Promise.all([req(), req()])
  assert.deepEqual(a, { status: 200, body: { status: 'granted', reference: 'op-1' } })
  assert.deepEqual(b, a, 'одновременный повтор получает тот же результат')
  assert.deepEqual(await req(), a, 'повтор после выдачи')
  assert.equal(applied.length, 1)

  mode = 'crash'
  const g2 = grant()
  assert.deepEqual(await handle(signedGrant(secret, g2)), { status: 500, body: { error: 'apply_failed' } })
  mode = 'ok'
  assert.equal((await handle(signedGrant(secret, g2))).body.status, 'granted', 'после сбоя повтор выдаёт')

  mode = 'reject'
  const g3 = grant()
  assert.deepEqual(await handle(signedGrant(secret, g3)), { status: 200, body: { status: 'rejected', detail: 'wallet unknown' } })
  mode = 'ok'
  assert.equal((await handle(signedGrant(secret, g3))).body.status, 'rejected', 'отказ окончательный для этого grantId')
  assert.equal(applied.length, 2)
  assert.throws(() => createGrantHandler({ secret: 'short', applyGrant: () => {} }), /32 символов/)
})

test('выдача через http: тело читается сырым, лишние методы и большие тела отклоняются', async () => {
  const secret = randomBytes(24).toString('hex')
  const handle = createGrantHandler({ secret, applyGrant: async () => ({ reference: 'r1' }) })
  const port = await freePort()
  const server = http.createServer(nodeGrantListener(handle, { maxBodyBytes: 4096 }))
  await new Promise((r) => server.listen(port, '127.0.0.1', r))
  const url = `http://127.0.0.1:${port}/grant`
  try {
    const s = signedGrant(secret, grant())
    const ok = await fetch(url, { method: 'POST', body: s.rawBody, headers: s.headers })
    assert.equal(ok.status, 200)
    assert.deepEqual(await ok.json(), { status: 'granted', reference: 'r1' })
    assert.equal((await fetch(url)).status, 405)
    assert.equal((await fetch(url, { method: 'POST', body: 'x'.repeat(5000) })).status, 413)
    assert.equal((await fetch(url, { method: 'POST', body: s.rawBody })).status, 401)
  } finally {
    await new Promise((r) => server.close(r))
  }
})

test('сквозной сценарий: вахта и пример сервера игры из набора', async () => {
  const GRANT = randomBytes(24).toString('hex')
  const PROGRESS = randomBytes(24).toString('hex')
  const gamePort = await freePort()
  const dir = path.join(mkdtempSync(path.join(tmpdir(), 'watchtower-kit-')), 'operator-game')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'players.json'), '{}')
  const wt = await startTestServer({ env: {
    OPERATOR_DATA_DIR: dir, GAME_PROGRESS_SECRET_ARES1: PROGRESS, PARTNER_HOLDBACK_DAYS: '0',
    PARTNER_GRANT_URL_ARES1: `http://127.0.0.1:${gamePort}/partner/grant`, PARTNER_GRANT_SECRET_ARES1: GRANT,
  } })
  // Стенд ходит к вахте без read-токена: в тестовом сервере он задан, поэтому пускаем через прокси с токеном
  const proxyPort = await freePort()
  const proxy = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', async () => {
      const r = await fetch(`${wt.base}${req.url}`, { method: req.method, headers: { ...req.headers, authorization: 'Bearer test-read-token' }, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined })
      res.writeHead(r.status, { 'content-type': 'application/json' })
      res.end(await r.text())
    })
  })
  await new Promise((r) => proxy.listen(proxyPort, '127.0.0.1', r))
  const game = spawn(process.execPath, ['sdk/partner-kit/example-game-server.mjs'], {
    cwd: path.resolve(new URL('..', import.meta.url).pathname),
    env: { ...process.env, GAME: 'ares1', PORT: String(gamePort), PARTNER_GRANT_SECRET: GRANT, GAME_PROGRESS_SECRET: PROGRESS, WATCHTOWER_URL: `http://127.0.0.1:${proxyPort}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const logs = []
  game.stdout.on('data', (c) => logs.push(String(c)))
  game.stderr.on('data', (c) => logs.push(String(c)))
  const gameUrl = `http://127.0.0.1:${gamePort}`
  const until = async (fn, ms = 25000) => {
    const end = Date.now() + ms
    for (;;) {
      const v = await fn().catch(() => null)
      if (v) return v
      if (Date.now() > end) throw new Error(`не дождались\n${logs.join('')}`)
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  try {
    await until(async () => (await fetch(`${gameUrl}/dev/inventory?wallet=x`)).ok)
    const auth = (await wt.request('/api/operator/auth', { method: 'POST', body: { wallet: 'test_wallet' } })).body.token
    const joined = await wt.request('/api/partners/join', { method: 'POST', body: { kind: 'player', country: 'PT', rewardGame: 'ares1' }, headers: { 'x-operator-session': auth } })
    const code = joined.body.partner.code
    const newbie = address()
    const t = Date.now()
    const report = (body) => fetch(`${gameUrl}/dev/report`, { method: 'POST', body: JSON.stringify({ wallet: newbie, rank: 1, ...body }) }).then((r) => r.json())
    assert.equal((await report({ hours: 0.2, updatedAt: t - 2 * DAY, ref: code.toLowerCase(), country: 'es' })).accepted, 1)
    await report({ hours: 1.3, updatedAt: t - DAY })
    await report({ hours: 2.6, updatedAt: t - 1000 })
    const me = await until(async () => {
      const c = (await wt.request('/api/partners/me', { headers: { 'x-operator-session': auth } })).body
      return c.referrals[0]?.status === 'granted' ? c : null
    })
    assert.equal(me.referrals[0].grant.reference, 'ares1-op-1')
    const inv = await (await fetch(`${gameUrl}/dev/inventory?wallet=test_wallet`)).json()
    assert.deepEqual(inv, { tokens: { POTATO: 50 }, items: { 'ares1.seed_crate': 1 } }, 'партнёр из PT, игрок из ES — токены разрешены')
  } finally {
    game.kill()
    await new Promise((r) => proxy.close(r))
    await wt.stop()
  }
})

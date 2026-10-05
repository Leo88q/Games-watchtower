/**
 * Партнёрская программа: награда за квалифицированных новичков игровыми токенами,
 * предметами и косметикой; выдают игры, не обсерватория.
 *
 * Модуль: самоприглашение, старые игроки, взаимные приглашения, квалификация по часам и
 * активным дням из данных игр, дневной лимит, заморозка, состав награды по странам
 * (в Великобритании токенов нет), вехи 5/25/100, выдача через игру с повторами.
 * Сервер: ссылка /r/<код> → портал, отчёты игры с кодом и страной, заявка автора,
 * решения сотрудника, выдача подписанным запросом к игре.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { generateKeyPairSync, createHmac, randomBytes } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startTestServer, freePort } from './test-server.mjs'
import { base58Encode } from '../server/operations/wallet-auth.js'
import {
  configurePartners, joinPartners, updatePartner, bindReferral, claimReferral, onProgress, partnerTick,
  partnerCabinet, partnerReview, decidePartner, partnerByCode, claimDueGrants, recordGrantOutcome, hasDueGrants,
} from '../server/operations/partners.js'
import { configureGrants, deliverGrant, loadRegions, validateCatalog, DEFAULT_CATALOG } from '../server/operations/partner-rewards.js'
import { createMemoryCache, createSharedCache } from '../server/operations/shared-cache.js'
import { STRINGS, pickLang, translator } from '../src/partners/i18n.js'

const DAY = 24 * 3600 * 1000
const address = () => {
  const { publicKey } = generateKeyPairSync('ed25519')
  return base58Encode(Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url'))
}

/** Модуль в памяти: часы задаются тестом, как будто их прислали игры. */
function setup(env = {}, { grants = {} } = {}) {
  const hours = {}
  const banned = new Set()
  configureGrants({ env: grants, fetchImpl: async () => { throw new Error('сеть в модульных тестах не нужна') } })
  configurePartners({
    env: { PARTNER_HOLDBACK_DAYS: '14', ...env },
    load: () => ({}),
    save: () => {},
    totalHours: (w) => hours[w] || 0,
    banned: (w) => banned.has(w),
  })
  const play = (w, h, ts, ref, country = null) => { const prev = hours[w] || 0; hours[w] = h; onProgress(w, { ts, hoursUp: h > prev, ref, prevHours: prev, game: 'ares1', country }) }
  // Новичок выполняет условия: три разных дня и больше двух часов
  const qualify = (w, code, t0, country = null) => { play(w, 0.2, t0, code, country); play(w, 1.2, t0 + DAY); play(w, 2.5, t0 + 2 * DAY) }
  return { hours, banned, play, qualify }
}
const join = (w, kind = 'player', extra = {}) => joinPartners(w, { kind, country: 'ES', rewardGame: 'ares1', ...(kind === 'player' ? {} : { channel: 'youtube.com/@leo' }), ...extra })

test('конфигурация: Великобританию нельзя включить в токены, каталог проверяется на старте', () => {
  assert.throws(() => loadRegions({ PARTNER_TOKEN_COUNTRIES: 'ES,GB' }), /GB указать нельзя — FCA/)
  assert.deepEqual(loadRegions({}), { pilot: ['PH', 'GB', 'ES', 'PT', 'MY'], tokens: ['ES', 'PT'] })
  assert.deepEqual(loadRegions({ PARTNER_TOKEN_COUNTRIES: '' }).tokens, [], 'пустое значение — токены выключены везде')
  assert.throws(() => loadRegions({ PARTNER_COUNTRIES: 'Philippines' }), /ISO 3166/)
  const broken = structuredClone(DEFAULT_CATALOG)
  broken.aof.substitute.kind = 'item'
  assert.throws(() => validateCatalog(broken), /только косметика/)
  assert.doesNotThrow(() => validateCatalog(structuredClone(DEFAULT_CATALOG)))
  assert.throws(() => configureGrants({ env: { PARTNER_GRANT_URL_ARES1: 'https://ares.example/grant' } }), /секрет не короче 32/)
  assert.throws(() => configureGrants({ env: { PARTNER_GRANT_URL_ARES1: 'http://ares.example/grant', PARTNER_GRANT_SECRET_ARES1: 'x'.repeat(32) }, isProduction: true }), /https/)
})

test('вступление: страна пилота и игра для наград обязательны; игрок — только наигравший сам', () => {
  const { hours } = setup()
  const newbie = address(); const veteran = address(); const blogger = address()
  hours[veteran] = 12
  assert.throws(() => join(newbie), (e) => e.code === 'not_enough_hours')
  assert.throws(() => join(veteran, 'player', { country: 'US' }), (e) => e.code === 'bad_country')
  assert.throws(() => join(veteran, 'player', { rewardGame: 'chess' }), (e) => e.code === 'bad_reward_game')
  const p = join(veteran, 'player', { country: 'ph' })
  assert.equal(p.status, 'active')
  assert.equal(p.country, 'PH')
  assert.match(p.code, /^[A-HJ-NP-Z2-9]{8}$/)
  assert.throws(() => join(veteran, 'creator'), (e) => e.code === 'already_partner')
  assert.throws(() => joinPartners(blogger, { kind: 'creator', country: 'ES', rewardGame: 'aof' }), (e) => e.code === 'channel_required')
  assert.equal(join(blogger, 'creator').status, 'pending')
  assert.equal(updatePartner(blogger, { rewardGame: 'guttercaps' }).rewardGame, 'guttercaps')
  assert.throws(() => updatePartner(newbie, { rewardGame: 'aof' }), (e) => e.code === 'not_partner')
})

test('привязка: только новичок, один раз, не себя и не по кругу; неактивный код не работает', () => {
  const { hours } = setup()
  const a = address(); const b = address(); const old = address(); const fresh = address()
  hours[a] = 20; hours[b] = 20; hours[old] = 5
  const pa = join(a)
  const pb = join(b)
  assert.equal(bindReferral(a, pa.code, { via: 'claim' }).reason, 'self_referral')
  assert.equal(bindReferral(old, pa.code, { via: 'claim' }).reason, 'not_new_player')
  assert.equal(bindReferral(fresh, 'ZZZZZZZZ', { via: 'claim' }).reason, 'unknown_code')
  assert.equal(bindReferral(b, pa.code, { via: 'game:ares1', prevHours: 0 }).ok, true)
  assert.equal(bindReferral(a, pb.code, { via: 'game:ares1', prevHours: 0 }).reason, 'cyclic_referral')
  assert.equal(bindReferral(fresh, pa.code, { via: 'claim' }).ok, true)
  assert.throws(() => claimReferral(fresh, pb.code), (e) => e.code === 'already_referred' && e.httpStatus === 409)
  const pc = join(address(), 'creator')
  assert.equal(bindReferral(address(), pc.code, { via: 'claim' }).reason, 'partner_inactive')
})

test('квалификация: часы и разные дни; награда — токены, предметы; выдача ждёт сотрудника без игры', () => {
  const { hours, play } = setup()
  const ref = address(); const staff = address(); hours[ref] = 30
  const { code } = join(ref)
  const t0 = Date.UTC(2026, 9, 1, 12)
  const p1 = address()
  play(p1, 0.5, t0, code)
  play(p1, 5, t0 + 3600e3) // много часов, но всё в один день
  assert.equal(partnerCabinet(ref).referrals[0].status, 'tracking')
  play(p1, 6, t0 + DAY)
  assert.equal(partnerCabinet(ref).referrals[0].status, 'tracking', 'два дня из трёх')
  play(p1, 7, t0 + 2 * DAY)
  const r = partnerCabinet(ref).referrals[0]
  assert.equal(r.status, 'holdback')
  assert.deepEqual(r.reward.tokens, { symbol: 'POTATO', amount: 50 })
  assert.equal(r.reward.items[0].id, 'ares1.seed_crate')
  assert.equal(r.reward.tokenBlocked, null)
  assert.equal(r.releaseAt, t0 + 2 * DAY + 14 * DAY)

  partnerTick(t0 + 10 * DAY)
  assert.equal(partnerCabinet(ref).referrals[0].status, 'holdback', 'ещё заморожено')
  partnerTick(t0 + 17 * DAY)
  const cab = partnerCabinet(ref)
  assert.equal(cab.referrals[0].status, 'payable')
  assert.equal(cab.referrals[0].grant.state, 'manual', 'игра не подключена — выдаёт сотрудник')
  assert.deepEqual(cab.summary.pendingRewards.tokens, { POTATO: 50 })
  const [grant] = partnerReview().grants
  assert.equal(grant.wallet, ref, 'сотруднику нужен полный кошелёк')
  assert.throws(() => decidePartner(staff, { action: 'granted', grantId: grant.id }), (e) => e.code === 'reference_required')
  decidePartner(staff, { action: 'granted', grantId: grant.id, reference: 'solscan.io/tx/abc123' })
  const after = partnerCabinet(ref)
  assert.equal(after.referrals[0].status, 'granted')
  assert.deepEqual(after.summary.grantedRewards.tokens, { POTATO: 50 })
  assert.equal(after.referrals[0].grant.reference, 'solscan.io/tx/abc123')
  assert.throws(() => decidePartner(staff, { action: 'granted', grantId: grant.id, reference: 'again-1' }), (e) => e.code === 'grant_not_open')
})

test('страны: в Великобритании и за игроков оттуда — косметика вместо токенов; в Neon Relay токенов нет', () => {
  const { hours, qualify } = setup({ PARTNER_HOLDBACK_DAYS: '0' })
  const t0 = Date.UTC(2026, 9, 1, 12)
  const uk = address(); const es = address(); const nr = address()
  hours[uk] = 30; hours[es] = 30; hours[nr] = 30
  const pUk = join(uk, 'player', { country: 'GB' })
  const pEs = join(es, 'player', { country: 'ES', rewardGame: 'aof' })
  const pNr = join(nr, 'player', { country: 'PT', rewardGame: 'neonrelay' })
  qualify(address(), pUk.code, t0)
  qualify(address(), pEs.code, t0, 'PT')
  qualify(address(), pEs.code, t0, 'GB')
  qualify(address(), pNr.code, t0)

  const ukReward = partnerCabinet(uk).referrals[0].reward
  assert.equal(ukReward.tokens, null)
  assert.equal(ukReward.tokenBlocked, 'region')
  assert.ok(ukReward.items.some((i) => i.id === 'ares1.dome_paint_recruiter' && i.kind === 'cosmetic'))
  assert.equal(partnerCabinet(uk).partner.tokensAllowed, false)

  const esRewards = partnerCabinet(es).referrals.map((r) => r.reward)
  assert.ok(esRewards.some((r) => r.tokens?.symbol === 'MIND' && r.tokens.amount === 20), 'партнёр из Испании, игрок из Португалии — токены')
  assert.ok(esRewards.some((r) => r.tokens === null && r.items.some((i) => i.id === 'aof.lab_coat_mentor')), 'игрок из Великобритании — косметика')

  const nrReward = partnerCabinet(nr).referrals[0].reward
  assert.equal(nrReward.tokens, null)
  assert.equal(nrReward.tokenBlocked, null, 'у игры просто нет токена')
  assert.deepEqual(nrReward.items.map((i) => i.id), ['neonrelay.race_ticket'])
})

test('вехи: косметика за 5 игроков, прошедших заморозку; один раз', () => {
  const { hours, qualify } = setup({ PARTNER_HOLDBACK_DAYS: '0', PARTNER_DAILY_CAP: '100' })
  const ref = address(); hours[ref] = 30
  const { code } = join(ref, 'player', { rewardGame: 'guttercaps' })
  const t0 = Date.UTC(2026, 9, 1, 12)
  for (let i = 0; i < 4; i++) qualify(address(), code, t0)
  partnerTick(t0 + 3 * DAY)
  assert.equal(partnerCabinet(ref).milestones[0].reached, false)
  qualify(address(), code, t0)
  partnerTick(t0 + 3 * DAY)
  const m = partnerCabinet(ref).milestones
  assert.equal(m[0].reached, true)
  assert.equal(m[0].reward.items[0].id, 'guttercaps.spray_sticker')
  assert.equal(m[1].reached, false)
  partnerTick(t0 + 4 * DAY)
  assert.equal(partnerReview().grants.filter((g) => g.type === 'milestone').length, 1, 'веха не выдаётся повторно')
})

test('окно квалификации истекает; дневной лимит ставит партнёра на проверку', () => {
  const a = setup({ PARTNER_WINDOW_DAYS: '7' })
  const ref = address(); a.hours[ref] = 30
  const { code } = join(ref)
  const t0 = Date.UTC(2026, 9, 1, 12)
  const p = address()
  a.play(p, 0.5, t0, code)
  a.play(p, 3, t0 + DAY)
  partnerTick(t0 + 8 * DAY)
  assert.equal(partnerCabinet(ref).referrals[0].status, 'expired')
  a.play(p, 9, t0 + 9 * DAY)
  assert.equal(partnerCabinet(ref).referrals[0].status, 'expired', 'после истечения не квалифицируется')

  const b = setup({ PARTNER_DAILY_CAP: '2', PARTNER_HOLDBACK_DAYS: '0' })
  const tr = address(); const staff = address()
  const pt = join(tr, 'traffic', { country: 'PT', channel: 'tiktok ads' })
  decidePartner(staff, { action: 'approve', code: pt.code })
  for (let i = 0; i < 3; i++) b.qualify(address(), pt.code, Date.UTC(2026, 9, 1, 0, 30))
  assert.equal(partnerByCode(pt.code).review.reason, 'daily_cap')
  partnerTick(Date.UTC(2026, 9, 5))
  assert.equal(partnerCabinet(tr).summary.issuing, 0, 'на проверке ничего не выдаётся')
  decidePartner(staff, { action: 'clear', code: pt.code })
  partnerTick(Date.UTC(2026, 9, 5))
  const s = partnerCabinet(tr).summary
  assert.equal(s.issuing, 3)
  assert.deepEqual(s.pendingRewards.tokens, { POTATO: 300 }, 'партнёр по трафику — его ставка')
})

test('блокировка отменяет невыданные награды; заблокированный новичок не засчитывается', () => {
  const { hours, banned, qualify } = setup({ PARTNER_HOLDBACK_DAYS: '1' })
  const ref = address(); const staff = address(); hours[ref] = 30
  const { code } = join(ref)
  const t0 = Date.UTC(2026, 9, 1, 12)
  const good = address(); const bot = address()
  qualify(good, code, t0); qualify(bot, code, t0)
  banned.add(bot)
  partnerTick(t0 + 4 * DAY)
  assert.equal(partnerCabinet(ref).referrals.find((r) => r.voidReason === 'referee_banned').status, 'void')
  assert.equal(partnerCabinet(ref).summary.issuing, 1)
  decidePartner(staff, { action: 'ban', code, reason: 'накрутка' })
  assert.equal(partnerCabinet(ref).summary.issuing, 0)
  assert.equal(partnerReview().grants.length, 0, 'выдачи отменены')
  assert.equal(partnerByCode(code).status, 'banned')
})

test('выдача через игру: подпись, повтор после сбоя, отказ игры, ручной повтор', async () => {
  const secret = randomBytes(24).toString('hex')
  const calls = []
  let mode = 'fail'
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) })
    if (mode === 'fail') return new Response('down', { status: 503 })
    if (mode === 'reject') return Response.json({ status: 'rejected', detail: 'wallet unknown' })
    return Response.json({ status: 'granted', reference: 'ares-op-77' })
  }
  const { hours, qualify } = setup({ PARTNER_HOLDBACK_DAYS: '0' })
  configureGrants({ env: { PARTNER_GRANT_URL_ARES1: 'https://ares.example/grant', PARTNER_GRANT_SECRET_ARES1: secret, PARTNER_GRANT_RETRY_MS: '1000' }, fetchImpl })
  const ref = address(); const staff = address(); hours[ref] = 30
  const { code } = join(ref)
  const t0 = Date.UTC(2026, 9, 1, 12)
  qualify(address(), code, t0)
  partnerTick(t0 + 3 * DAY)
  assert.equal(hasDueGrants(t0 + 3 * DAY), true)

  const send = async (now) => { for (const p of claimDueGrants('test', now)) recordGrantOutcome(p.grantId, await deliverGrant(p), now) }
  await send(t0 + 3 * DAY)
  const first = calls[0]
  assert.equal(first.url, 'https://ares.example/grant')
  const h = first.init.headers
  assert.equal(h['x-watchtower-signature'], `sha256=${createHmac('sha256', secret).update(`${h['x-watchtower-timestamp']}.${first.init.body}`).digest('hex')}`)
  assert.equal(h['x-watchtower-grant'], first.body.grantId)
  assert.deepEqual(first.body.tokens, { symbol: 'POTATO', amount: 50 })
  assert.deepEqual(first.body.items, [{ id: 'ares1.seed_crate', kind: 'item', amount: 1 }], 'игре — только id и количество')
  assert.equal(first.body.wallet, ref)
  assert.equal(first.body.reason, 'partner_referral')
  assert.equal(hasDueGrants(t0 + 3 * DAY + 500), false, 'пауза перед повтором')

  await send(t0 + 3 * DAY + 1500) // второй сбой — попытки кончились
  assert.equal(calls.length, 2)
  assert.equal(calls[1].body.grantId, first.body.grantId, 'тот же ключ идемпотентности')
  const stuck = partnerReview().grants[0]
  assert.equal(stuck.state, 'undelivered')
  assert.equal(stuck.lastError, 'http_503')

  mode = 'reject'
  decidePartner(staff, { action: 'retry', grantId: stuck.id }, t0 + 4 * DAY)
  await send(t0 + 4 * DAY)
  assert.equal(partnerReview().grants[0].state, 'rejected')
  assert.equal(partnerReview().grants[0].detail, 'wallet unknown')

  mode = 'ok'
  decidePartner(staff, { action: 'retry', grantId: stuck.id }, t0 + 4 * DAY)
  await send(t0 + 4 * DAY + 10)
  const cab = partnerCabinet(ref)
  assert.equal(cab.referrals[0].status, 'granted')
  assert.equal(cab.referrals[0].grant.reference, 'ares-op-77')
  assert.equal(partnerReview().grants.length, 0)
  assert.throws(() => decidePartner(staff, { action: 'retry', grantId: stuck.id }), (e) => e.code === 'grant_not_retryable')
})

test('портал: 7 языков с одинаковыми ключами и параметрами; выбор языка по браузеру', () => {
  const keys = Object.keys(STRINGS.en)
  assert.deepEqual(Object.keys(STRINGS).sort(), ['en', 'es', 'fil', 'id', 'pt', 'ru', 'vi'])
  const params = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
  for (const [lang, dict] of Object.entries(STRINGS)) {
    assert.deepEqual(Object.keys(dict).sort(), [...keys].sort(), `${lang}: набор ключей`)
    for (const k of keys) {
      assert.equal(params(dict[k]), params(STRINGS.en[k]), `${lang}.${k}: параметры`)
      assert.ok(!emoji.test(dict[k]), `${lang}.${k}: без эмодзи`)
      assert.ok(!/\[[^\]]+\]/.test(dict[k]), `${lang}.${k}: без псевдотегов в скобках`)
    }
  }
  assert.equal(pickLang(['ms-MY', 'en-MY']), 'en', 'Малайзия: английский')
  assert.equal(pickLang(['tl-PH']), 'fil')
  assert.equal(pickLang(['pt-PT']), 'pt')
  assert.equal(pickLang(['de-DE']), 'en')
  assert.equal(translator('es')('how3', { hours: 2, days: 3, window: 30 }), 'Juega 2 h en al menos 3 días distintos dentro de 30 días.')
  // Каждый код ошибки сервера, который видит партнёр, переведён
  const src = readFileSync(new URL('../server/operations/partners.js', import.meta.url), 'utf8')
  const shown = ['bad_kind', 'bad_country', 'bad_reward_game', 'banned', 'already_partner', 'channel_required', 'not_enough_hours', 'not_partner', 'unknown_code', 'partner_inactive']
  for (const code of shown) {
    assert.ok(src.includes(`'${code}'`), `код ${code} есть на сервере`)
    assert.ok(STRINGS.en[`err_${code}`], `код ${code} переведён`)
  }
})

test('счётчик переходов: count() одинаково работает в памяти и в Redis', async (t) => {
  const caches = [['память', createMemoryCache()]]
  if (process.env.TEST_REDIS_URL) caches.push(['Redis', await createSharedCache({ redisUrl: process.env.TEST_REDIS_URL, prefix: `wt-test-${randomBytes(4).toString('hex')}:` })])
  else t.diagnostic('TEST_REDIS_URL не задан — Redis пропущен')
  for (const [name, cache] of caches) {
    const key = `ref-clicks:TESTCODE:${Date.now()}`
    assert.equal(await cache.count(key), 0, name)
    for (let i = 0; i < 3; i++) assert.equal((await cache.hit(key, Number.MAX_SAFE_INTEGER, 60_000)).allowed, true)
    assert.equal(await cache.count(key), 3, name)
    const uniq = `ref-uniq:TESTCODE:${Date.now()}:visitor`
    assert.equal((await cache.hit(uniq, 1, 60_000)).allowed, true)
    assert.equal((await cache.hit(uniq, 1, 60_000)).allowed, false, `${name}: повторный переход не считается`)
    await cache.close?.()
  }
})

// ---------------------------------------------------------------------------
// Через сервер
// ---------------------------------------------------------------------------
const GAME_SECRET = randomBytes(24).toString('hex')
const GRANT_SECRET = randomBytes(24).toString('hex')
function signed(body, ts = Date.now()) {
  const raw = JSON.stringify(body)
  return { raw, headers: { 'x-watchtower-game': 'ares1', 'x-watchtower-timestamp': String(ts), 'x-watchtower-signature': `sha256=${createHmac('sha256', GAME_SECRET).update(`${ts}.${raw}`).digest('hex')}` } }
}

/** Игра ARES-1 со стороны выдачи наград: проверяет подпись, первый запрос роняет. */
async function fakeGame() {
  const received = []
  let failNext = true
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      const ts = req.headers['x-watchtower-timestamp']
      const ok = req.headers['x-watchtower-signature'] === `sha256=${createHmac('sha256', GRANT_SECRET).update(`${ts}.${raw}`).digest('hex')}`
      received.push({ ok, body: JSON.parse(raw), grant: req.headers['x-watchtower-grant'] })
      if (!ok) { res.writeHead(401); return res.end() }
      if (failNext) { failNext = false; res.writeHead(500); return res.end() }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'granted', reference: `ares-${received.length}` }))
    })
  })
  const port = await freePort()
  await new Promise((r) => server.listen(port, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${port}/grant`, received, close: () => new Promise((r) => server.close(r)) }
}

const waitFor = async (fn, ms = 25000) => {
  const until = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > until) throw new Error('не дождались')
    await new Promise((r) => setTimeout(r, 250))
  }
}

test('сервер: ссылка ведёт на портал, отчёты игры с кодом и страной, заявка, выдача игрой', async () => {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), 'watchtower-partners-')), 'operator-game')
  mkdirSync(dir, { recursive: true })
  const now = Date.now()
  writeFileSync(path.join(dir, 'players.json'), JSON.stringify({ demo_staff: { wallet: 'demo_staff', joinedAt: now, reputation: 0, correctDecisions: 0, wrongDecisions: 0, passedTest: true, staking: 0, banned: false, forceRole: 'staff' } }))
  const game = await fakeGame()
  const server = await startTestServer({ env: {
    OPERATOR_DATA_DIR: dir, GAME_PROGRESS_SECRET_ARES1: GAME_SECRET, WATCHTOWER_TRUST_PROXY: '1',
    PARTNER_HOLDBACK_DAYS: '0', PARTNER_GRANT_URL_ARES1: game.url, PARTNER_GRANT_SECRET_ARES1: GRANT_SECRET, PARTNER_GRANT_RETRY_MS: '300',
  } })
  const call = (route, { body, session, headers = {} } = {}) => server.request(route, { method: body !== undefined ? 'POST' : 'GET', body, headers: { ...(session ? { 'x-operator-session': session } : {}), ...headers } })
  const login = async (wallet) => (await call('/api/operator/auth', { body: { wallet } })).body.token
  const report = (reports, ts) => { const s = signed({ reports }, ts); return server.request('/api/games/progress', { method: 'POST', body: s.raw, headers: s.headers }) }
  try {
    const rules = (await call('/api/partners/rules')).body
    assert.equal(rules.qualify.activeDays, 3)
    assert.deepEqual(rules.tokenCountries, ['ES', 'PT'])
    assert.equal(rules.games.ares1.token, 'POTATO')
    assert.equal(rules.games.ares1.autoGrant, true)
    assert.equal(rules.games.aof.autoGrant, false)

    // test_wallet — демо-игрок с 25 часами в ARES-1: может приглашать сразу
    const veteran = await login('test_wallet')
    assert.equal((await call('/api/partners/me')).status, 401)
    const bad = await call('/api/partners/join', { session: veteran, body: { kind: 'player', country: 'US', rewardGame: 'ares1' } })
    assert.equal(bad.status, 400)
    assert.equal(bad.body.code, 'bad_country', 'код ошибки для перевода на портале')
    const joined = await call('/api/partners/join', { session: veteran, body: { kind: 'player', country: 'ES', rewardGame: 'ares1' }, headers: { 'cf-ipcountry': 'ES' } })
    assert.equal(joined.status, 200, JSON.stringify(joined.body))
    const code = joined.body.partner.code

    // Переход: на портал на языке, уникальный за день, страна из заголовка CDN
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${server.base}/r/${code}?lang=fil`, { redirect: 'manual', headers: { 'cf-ipcountry': 'PH' } })
      assert.equal(res.status, 302)
      assert.equal(res.headers.get('location'), `/partners.html?ref=${code}&lang=fil`)
    }
    assert.equal((await fetch(`${server.base}/r/NOPE2345`, { redirect: 'manual' })).headers.get('location'), '/partners.html')
    assert.equal((await fetch(`${server.base}/r/NOPE2345?lang=vi`, { redirect: 'manual' })).headers.get('location'), '/partners.html?lang=vi', 'язык сохраняется и для неизвестного кода')

    // Новичок из Португалии приходит в ARES-1 по коду; игра присылает его прогресс три разных дня
    const newbie = address()
    const t = Date.now()
    assert.equal((await report([{ wallet: newbie, hours: 0.3, rank: 0, updatedAt: t - 2 * DAY - 60e3, ref: code, country: 'PT' }], t)).status, 200)
    await report([{ wallet: newbie, hours: 1.4, rank: 1, updatedAt: t - DAY }], t)
    const old = address()
    await report([{ wallet: old, hours: 8, rank: 2, updatedAt: t - DAY }], t)
    await report([{ wallet: old, hours: 9, rank: 2, updatedAt: t - 1000, ref: code }], t)
    let me = (await call('/api/partners/me', { session: veteran })).body
    assert.equal(me.clicks.today, 1, 'повторный переход с того же адреса не считается')
    assert.deepEqual(me.clicks.byCountry7d, [{ country: 'PH', clicks: 1 }])
    assert.equal(me.summary.invited, 1, 'старый игрок не засчитан')
    assert.equal(me.referrals[0].activeDays, 2)

    await report([{ wallet: newbie, hours: 3.1, rank: 1, updatedAt: t - 1000 }], t)
    me = (await call('/api/partners/me', { session: veteran })).body
    assert.ok(['holdback', 'payable', 'granted'].includes(me.referrals[0].status))
    assert.deepEqual(me.referrals[0].reward.tokens, { symbol: 'POTATO', amount: 50 })

    // Заморозка 0 дней: фоновая задача создаёт выдачу, игра роняет первый запрос, второй проходит
    me = await waitFor(async () => { const c = (await call('/api/partners/me', { session: veteran })).body; return c.referrals[0].status === 'granted' ? c : null })
    assert.equal(me.referrals[0].grant.reference, 'ares-2')
    assert.ok(game.received.length >= 2 && game.received.every((r) => r.ok), 'игра получила подписанные запросы')
    assert.equal(game.received[0].grant, game.received[1].grant, 'повтор с тем же grantId')
    assert.equal(game.received[1].body.wallet.length > 0, true)

    const badRef = await report([{ wallet: address(), hours: 0.1, rank: 0, updatedAt: t - 1000, ref: 'bad code!' }], t)
    assert.equal(badRef.body.rejected[0].reason, 'bad_ref')
    const badCountry = await report([{ wallet: address(), hours: 0.1, rank: 0, updatedAt: t - 1000, country: 'Spain' }], t)
    assert.equal(badCountry.body.rejected[0].reason, 'bad_country')

    // Автор видео подаёт заявку; одобряет только сотрудник. Сеть говорит «Филиппины» — сотрудник это видит
    const blogger = await login('demo_blogger')
    const app = await call('/api/partners/join', { session: blogger, body: { kind: 'creator', channel: 'youtube.com/@guttercity', country: 'ES', rewardGame: 'aof' }, headers: { 'cf-ipcountry': 'PH' } })
    assert.equal(app.body.partner.status, 'pending')
    const appCode = app.body.partner.code
    assert.equal((await call('/api/partners/settings', { session: blogger, body: { rewardGame: 'guttercaps' } })).body.partner.rewardGame, 'guttercaps')
    assert.equal((await call('/api/partners/decide', { session: blogger, body: { action: 'approve', code: appCode } })).status, 403)
    const staff = await login('demo_staff')
    const review = (await call('/api/partners/review', { session: staff })).body
    assert.equal(review.applications[0].seenCountry, 'PH')
    assert.equal(review.applications[0].country, 'ES')
    assert.equal((await call('/api/partners/decide', { session: staff, body: { action: 'approve', code: appCode } })).status, 200)
    assert.equal((await fetch(`${server.base}/r/${appCode}`, { redirect: 'manual' })).headers.get('location'), `/partners.html?ref=${appCode}`)
    const again = await call('/api/partners/decide', { session: staff, body: { action: 'approve', code: appCode } })
    assert.equal(again.status, 409)
    assert.equal(again.body.code, 'already_decided')
  } finally {
    await server.stop()
    await game.close()
  }
})

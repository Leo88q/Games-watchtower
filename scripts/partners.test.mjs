/**
 * Партнёрская программа: платим за квалифицированных игроков, а не за клики.
 *
 * Модуль: самоприглашение, старые игроки, взаимные приглашения, квалификация по часам и
 * активным дням из данных игр, дневной лимит, заморозка и разморозка, блокировка, выплата.
 * Сервер: ссылка /r/<код>, подписанные отчёты игры с кодом, заявка автора и решения сотрудника.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, createHmac, randomBytes } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startTestServer } from './test-server.mjs'
import { base58Encode } from '../server/operations/wallet-auth.js'
import {
  configurePartners, joinPartners, bindReferral, claimReferral, onProgress, partnerTick,
  partnerCabinet, partnerReview, decidePartner, partnerByCode,
} from '../server/operations/partners.js'
import { createMemoryCache, createSharedCache } from '../server/operations/shared-cache.js'

const DAY = 24 * 3600 * 1000
const address = () => {
  const { publicKey } = generateKeyPairSync('ed25519')
  return base58Encode(Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url'))
}

/** Модуль в памяти: часы задаются тестом, как будто их прислали игры. */
function setup(env = {}) {
  const hours = {}
  const banned = new Set()
  configurePartners({
    env: { PARTNER_HOLDBACK_DAYS: '14', ...env },
    load: () => ({}),
    save: () => {},
    totalHours: (w) => hours[w] || 0,
    banned: (w) => banned.has(w),
  })
  // Игра сообщает о прогрессе: часы растут в день ts
  const play = (w, h, ts, ref) => { const prev = hours[w] || 0; hours[w] = h; onProgress(w, { ts, hoursUp: h > prev, ref, prevHours: prev, game: 'ares1' }) }
  return { hours, banned, play }
}

test('вступление: игрок — только наигравший сам, автор и траффер — по заявке с каналом', () => {
  const { hours } = setup()
  const newbie = address(); const veteran = address(); const blogger = address()
  hours[veteran] = 12
  assert.throws(() => joinPartners(newbie, { kind: 'player' }), /от 10 часов/)
  const p = joinPartners(veteran, { kind: 'player' })
  assert.equal(p.status, 'active')
  assert.match(p.code, /^[A-HJ-NP-Z2-9]{8}$/)
  assert.throws(() => joinPartners(veteran, { kind: 'creator', channel: 'youtube.com/x' }), /уже участвует/)
  assert.throws(() => joinPartners(blogger, { kind: 'creator' }), /канал/)
  assert.throws(() => joinPartners(blogger, { kind: 'admin' }), /Выберите/)
  assert.equal(joinPartners(blogger, { kind: 'creator', channel: 'youtube.com/@gutter' }).status, 'pending')
})

test('привязка: только новичок, один раз, не себя и не по кругу; неактивный код не работает', () => {
  const { hours } = setup()
  const a = address(); const b = address(); const old = address(); const fresh = address()
  hours[a] = 20; hours[b] = 20; hours[old] = 5
  const pa = joinPartners(a, { kind: 'player' })
  const pb = joinPartners(b, { kind: 'player' })
  assert.equal(bindReferral(a, pa.code, { via: 'claim' }).reason, 'self_referral')
  assert.equal(bindReferral(old, pa.code, { via: 'claim' }).reason, 'not_new_player')
  assert.equal(bindReferral(fresh, 'ZZZZZZZZ', { via: 'claim' }).reason, 'unknown_code')
  // a «новичок» относительно b нельзя (часы), поэтому проверяем круг через prevHours
  assert.equal(bindReferral(b, pa.code, { via: 'game:ares1', prevHours: 0 }).ok, true)
  assert.equal(bindReferral(a, pb.code, { via: 'game:ares1', prevHours: 0 }).reason, 'cyclic_referral')
  assert.equal(bindReferral(fresh, pa.code, { via: 'claim' }).ok, true)
  assert.throws(() => claimReferral(fresh, pb.code), /уже привязаны/)
  const blogger = address()
  const pc = joinPartners(blogger, { kind: 'creator', channel: 'tiktok.com/@caps' })
  assert.equal(bindReferral(address(), pc.code, { via: 'claim' }).reason, 'partner_inactive')
})

test('квалификация: нужны и часы, и разные дни; потом заморозка, разморозка и выплата', () => {
  const { hours, play } = setup()
  const ref = address(); const staff = address(); hours[ref] = 30
  const { code } = joinPartners(ref, { kind: 'player' })
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
  assert.deepEqual(r.reward, { amount: 1, asset: 'USDC' })
  assert.equal(r.releaseAt, t0 + 2 * DAY + 14 * DAY)

  partnerTick(t0 + 10 * DAY)
  assert.equal(partnerCabinet(ref).referrals[0].status, 'holdback', 'ещё заморожено')
  partnerTick(t0 + 17 * DAY)
  assert.equal(partnerCabinet(ref).summary.payable.amount, 1)
  assert.throws(() => decidePartner(staff, { action: 'paid', code }), /ссылку на перевод/)
  decidePartner(staff, { action: 'paid', code, reference: 'solscan.io/tx/abc123' })
  const after = partnerCabinet(ref)
  assert.equal(after.summary.paid.amount, 1)
  assert.equal(after.referrals[0].paidRef, 'solscan.io/tx/abc123')
  assert.throws(() => decidePartner(staff, { action: 'paid', code, reference: 'again-1' }), /Нечего/)
})

test('окно квалификации истекает; активность до привязки не считается', () => {
  const { hours, play } = setup({ PARTNER_WINDOW_DAYS: '7' })
  const ref = address(); hours[ref] = 30
  const { code } = joinPartners(ref, { kind: 'player' })
  const t0 = Date.UTC(2026, 9, 1, 12)
  const p = address()
  play(p, 0.5, t0, code)
  play(p, 3, t0 + DAY)
  partnerTick(t0 + 8 * DAY)
  assert.equal(partnerCabinet(ref).referrals[0].status, 'expired')
  play(p, 9, t0 + 9 * DAY)
  assert.equal(partnerCabinet(ref).referrals[0].status, 'expired', 'после истечения не квалифицируется')
})

test('дневной лимит: всплеск квалификаций ставит партнёра на проверку, выплаты ждут решения', () => {
  const { hours, play } = setup({ PARTNER_DAILY_CAP: '2', PARTNER_HOLDBACK_DAYS: '0' })
  const ref = address(); const staff = address(); hours[ref] = 30
  const { code } = joinPartners(ref, { kind: 'traffic', channel: 'arbitrage: tiktok ads' })
  decidePartner(staff, { action: 'approve', code })
  const t0 = Date.UTC(2026, 9, 1, 0, 30)
  const wallets = [address(), address(), address()]
  for (const w of wallets) { play(w, 0.1, t0, code); play(w, 1, t0 + DAY); play(w, 2, t0 + 2 * DAY); play(w, 3, t0 + 2 * DAY + 3600e3) }
  assert.equal(partnerByCode(code).review.reason, 'daily_cap')
  partnerTick(t0 + 3 * DAY)
  assert.equal(partnerCabinet(ref).summary.payable.count, 0, 'на проверке ничего не размораживается')
  assert.equal(partnerReview().underReview.length, 1)
  decidePartner(staff, { action: 'clear', code })
  partnerTick(t0 + 3 * DAY)
  const s = partnerCabinet(ref).summary
  assert.equal(s.payable.count, 3)
  assert.equal(s.payable.amount, 6, 'траффер получает ставку трафферов')
})

test('блокировка партнёра аннулирует незаплаченное; заблокированный новичок не оплачивается', () => {
  const { hours, banned, play } = setup({ PARTNER_HOLDBACK_DAYS: '1' })
  const ref = address(); const staff = address(); hours[ref] = 30
  const { code } = joinPartners(ref, { kind: 'player' })
  const t0 = Date.UTC(2026, 9, 1, 12)
  const good = address(); const bot = address()
  for (const w of [good, bot]) { play(w, 0.1, t0, code); play(w, 1, t0 + DAY); play(w, 3, t0 + 2 * DAY) }
  banned.add(bot)
  partnerTick(t0 + 4 * DAY)
  const list = partnerCabinet(ref).referrals
  assert.equal(list.find((r) => r.voidReason === 'referee_banned').status, 'void')
  assert.equal(partnerCabinet(ref).summary.payable.count, 1)
  decidePartner(staff, { action: 'ban', code, reason: 'накрутка' })
  assert.equal(partnerCabinet(ref).summary.payable.count, 0)
  assert.equal(partnerByCode(code).status, 'banned')
})

// ---------------------------------------------------------------------------
// Через сервер
// ---------------------------------------------------------------------------
const GAME_SECRET = randomBytes(24).toString('hex')
function signed(body, ts = Date.now()) {
  const raw = JSON.stringify(body)
  return { raw, headers: { 'x-watchtower-game': 'ares1', 'x-watchtower-timestamp': String(ts), 'x-watchtower-signature': `sha256=${createHmac('sha256', GAME_SECRET).update(`${ts}.${raw}`).digest('hex')}` } }
}

test('сервер: ссылка, отчёты игры с кодом, заявка автора и решения сотрудника', async () => {
  const dir = path.join(mkdtempSync(path.join(tmpdir(), 'watchtower-partners-')), 'operator-game')
  mkdirSync(dir, { recursive: true })
  const now = Date.now()
  writeFileSync(path.join(dir, 'players.json'), JSON.stringify({ demo_staff: { wallet: 'demo_staff', joinedAt: now, reputation: 0, correctDecisions: 0, wrongDecisions: 0, passedTest: true, staking: 0, banned: false, forceRole: 'staff' } }))
  const server = await startTestServer({ env: { OPERATOR_DATA_DIR: dir, GAME_PROGRESS_SECRET_ARES1: GAME_SECRET } })
  const call = (route, { body, session, headers = {}, method } = {}) => server.request(route, { method: method || (body !== undefined ? 'POST' : 'GET'), body, headers: { ...(session ? { 'x-operator-session': session } : {}), ...headers } })
  const login = async (wallet) => (await call('/api/operator/auth', { body: { wallet } })).body.token
  const report = (reports, ts) => { const s = signed({ reports }, ts); return server.request('/api/games/progress', { method: 'POST', body: s.raw, headers: s.headers }) }
  try {
    const rules = (await call('/api/partners/rules')).body
    assert.equal(rules.qualify.activeDays, 3)
    assert.equal(rules.asset, 'USDC')

    // test_wallet — демо-игрок с 25 часами в ARES-1: может приглашать сразу
    const veteran = await login('test_wallet')
    assert.equal((await call('/api/partners/me')).status, 401)
    const joined = await call('/api/partners/join', { session: veteran, body: { kind: 'player' } })
    assert.equal(joined.status, 200, JSON.stringify(joined.body))
    const code = joined.body.partner.code

    // Переход по ссылке: редирект на карту с кодом, уникальный за день
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${server.base}/r/${code}`, { redirect: 'manual' })
      assert.equal(res.status, 302)
      assert.equal(res.headers.get('location'), `/?ref=${code}`)
    }
    assert.equal((await fetch(`${server.base}/r/NOPE2345`, { redirect: 'manual' })).headers.get('location'), '/')

    // Новичок приходит в ARES-1 по коду; игра присылает его прогресс три разных дня
    const newbie = address()
    const t = Date.now()
    assert.equal((await report([{ wallet: newbie, hours: 0.3, rank: 0, updatedAt: t - 2 * DAY - 60e3, ref: code }], t)).status, 200)
    await report([{ wallet: newbie, hours: 1.4, rank: 1, updatedAt: t - DAY }], t)
    // Старый игрок: часы уже были, позже игра присылает код — привязки нет
    const old = address()
    await report([{ wallet: old, hours: 8, rank: 2, updatedAt: t - DAY }], t)
    await report([{ wallet: old, hours: 9, rank: 2, updatedAt: t - 1000, ref: code }], t)
    let me = (await call('/api/partners/me', { session: veteran })).body
    assert.equal(me.partner.code, code)
    assert.equal(me.clicks.today, 1, 'повторный переход с того же адреса не считается')
    assert.equal(me.summary.invited, 1, 'старый игрок не засчитан')
    assert.equal(me.referrals[0].status, 'tracking')
    assert.equal(me.referrals[0].activeDays, 2)

    await report([{ wallet: newbie, hours: 3.1, rank: 1, updatedAt: t - 1000 }], t)
    me = (await call('/api/partners/me', { session: veteran })).body
    assert.equal(me.referrals[0].status, 'holdback')
    assert.equal(me.summary.holdback.amount, 1)
    assert.ok(me.referrals[0].wallet.length <= 12, 'кошельки приглашённых укорочены')

    // Неправильный код в отчёте отклоняется точечно
    const bad = await report([{ wallet: address(), hours: 0.1, rank: 0, updatedAt: t - 1000, ref: 'bad code!' }], t)
    assert.equal(bad.body.rejected[0].reason, 'bad_ref')

    // Автор видео подаёт заявку; одобряет только сотрудник
    const blogger = await login('demo_blogger')
    assert.equal((await call('/api/partners/join', { session: blogger, body: { kind: 'creator' } })).status, 400)
    const app = await call('/api/partners/join', { session: blogger, body: { kind: 'creator', channel: 'youtube.com/@guttercity' } })
    assert.equal(app.body.partner.status, 'pending')
    const appCode = app.body.partner.code
    assert.equal((await fetch(`${server.base}/r/${appCode}`, { redirect: 'manual' })).headers.get('location'), '/', 'неодобренный код не ведёт на карту')
    assert.equal((await call('/api/partners/decide', { session: blogger, body: { action: 'approve', code: appCode } })).status, 403)
    assert.equal((await call('/api/partners/review', { session: blogger })).status, 403)
    const staff = await login('demo_staff')
    const review = (await call('/api/partners/review', { session: staff })).body
    assert.equal(review.applications.length, 1)
    assert.equal(review.applications[0].channel, 'youtube.com/@guttercity')
    const ok = await call('/api/partners/decide', { session: staff, body: { action: 'approve', code: appCode } })
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    assert.equal((await fetch(`${server.base}/r/${appCode}`, { redirect: 'manual' })).headers.get('location'), `/?ref=${appCode}`)
    assert.equal((await call('/api/partners/decide', { session: staff, body: { action: 'approve', code: appCode } })).status, 409)
  } finally {
    await server.stop()
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

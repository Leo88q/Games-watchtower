// node --test patches/games/wt-landing.test.mjs  (E2E: WT_E2E_BASE=http://127.0.0.1:PORT)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const SRC = readFileSync(new URL('./wt-landing.js', import.meta.url), 'utf8')

function page({ url, metas = {}, dnt, gpc, beacon = true, storage = new Map() }) {
  const u = new URL(url)
  const sent = []
  const loc = { search: u.search, hash: u.hash, pathname: u.pathname }
  const win = {
    location: loc,
    history: { state: null, replaceState(_s, _t, next) { const n = new URL(next, u.origin); loc.search = n.search; loc.hash = n.hash } },
    navigator: {
      doNotTrack: dnt ? '1' : null, globalPrivacyControl: !!gpc,
      sendBeacon: beacon ? (to, blob) => { sent.push({ to, blob }); return true } : undefined,
    },
    sessionStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    crypto: globalThis.crypto, Blob, Date, Math, JSON, Uint8Array, URL,
    fetch: (to, init) => { sent.push({ to, body: init.body }); return Promise.resolve() },
  }
  const doc = { querySelector: (sel) => { const n = /name="([^"]+)"/.exec(sel)[1]; return n in metas ? { getAttribute: () => metas[n] } : null } }
  vm.runInNewContext(SRC, { window: win, document: doc, Blob })
  return { win, sent, loc }
}
const META = { 'wt-trafficgen': 'https://tg.example/', 'wt-page': 'target_sixsec' }

test('отправляет LandingReached с clickId и чистит адрес', async () => {
  const { win, sent, loc } = page({ url: 'https://ares1.example/play?ref=x&wt_click=click-0001#lobby', metas: META })
  assert.equal(win.__wtLandingResult.status, 'sent')
  assert.equal(sent[0].to, 'https://tg.example/api/track')
  const ev = JSON.parse(await sent[0].blob.text())
  assert.equal(ev.eventType, 'LandingReached')
  assert.equal(ev.payload.clickId, 'click-0001')
  assert.equal(ev.pageId, 'target_sixsec')
  assert.match(ev.timestamp, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
  assert.equal(loc.search, '?ref=x'); assert.equal(loc.hash, '#lobby')
})

test('hash-роутинг: clickId в #/play?wt_click=', () => {
  const { win, loc } = page({ url: 'https://g.example/#/play?wt_click=click-0002', metas: META })
  assert.equal(win.__wtLandingResult.clickId, 'click-0002')
  assert.equal(loc.hash, '#/play')
})

test('повторная загрузка вкладки не шлёт второй раз', () => {
  const storage = new Map()
  page({ url: 'https://g.example/?wt_click=click-0003', metas: META, storage })
  const again = page({ url: 'https://g.example/?wt_click=click-0003', metas: META, storage })
  assert.equal(again.win.__wtLandingResult.status, 'already_sent')
  assert.equal(again.sent.length, 0)
})

test('ничего не шлёт: без clickId / без настройки / DNT / GPC / мусорный id', () => {
  assert.equal(page({ url: 'https://g.example/', metas: META }).win.__wtLandingResult.status, 'no_click')
  const nc = page({ url: 'https://g.example/?wt_click=click-0004', metas: {} })
  assert.equal(nc.win.__wtLandingResult.status, 'not_configured'); assert.equal(nc.sent.length, 0)
  assert.equal(nc.loc.search, '', 'wt_click убирается из адреса даже без настройки')
  const unbuilt = page({ url: 'https://g.example/?wt_click=click-0008', metas: { 'wt-trafficgen': '%VITE_WT_TRAFFICGEN%' } })
  assert.equal(unbuilt.win.__wtLandingResult.status, 'not_configured', 'Vite без переменной оставляет заглушку — молчим')
  assert.equal(page({ url: 'https://g.example/?wt_click=click-0005', metas: META, dnt: true }).sent.length, 0)
  assert.equal(page({ url: 'https://g.example/?wt_click=click-0006', metas: META, gpc: true }).sent.length, 0)
  assert.equal(page({ url: 'https://g.example/?wt_click=%3Cscript%3E', metas: META }).win.__wtLandingResult.status, 'no_click')
})

test('нет sendBeacon — fetch keepalive', () => {
  const { sent, win } = page({ url: 'https://g.example/?wt_click=click-0007', metas: META, beacon: false })
  assert.equal(win.__wtLandingResult.via, 'fetch'); assert.equal(sent.length, 1)
})

test('E2E: /r/ → игра → /api/track → /watchtower/landings', { skip: !process.env.WT_E2E_BASE }, async () => {
  const base = process.env.WT_E2E_BASE
  const click = 'e2e-click-' + Date.now()
  const r = await fetch(`${base}/r/${click}?to=target_sixsec`, { redirect: 'manual' })
  assert.equal(r.status, 302)
  const loc = r.headers.get('location')
  assert.ok(loc.startsWith('https://ares1.example/play'), loc)
  const { sent } = page({ url: loc, metas: { 'wt-trafficgen': base, 'wt-page': 'target_sixsec' } })
  const res = await fetch(sent[0].to, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: await sent[0].blob.text() })
  const body = await res.json()
  assert.equal(body.results[0].status, 'accepted', JSON.stringify(body))
  const stats = await (await fetch(`${base}/watchtower/landings`)).json()
  assert.ok(stats.data.confirmed >= 1, JSON.stringify(stats))
})

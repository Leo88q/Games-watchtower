#!/usr/bin/env node
/**
 * Пример бэкенда игры для партнёрской программы: принимает выдачи наград от вахты и
 * отправляет ей отчёты о прогрессе. Это стенд для проверки подключения, а не боевой код:
 * «инвентарь» лежит в памяти и пропадает при перезапуске.
 *
 * Запуск (секреты — те же значения, что заданы на вахте):
 *   GAME=ares1 PARTNER_GRANT_SECRET=<32+ символов> GAME_PROGRESS_SECRET=<32+ символов> \
 *   WATCHTOWER_URL=http://127.0.0.1:8787 PORT=9100 node sdk/partner-kit/example-game-server.mjs
 *
 * На вахте: PARTNER_GRANT_URL_ARES1=http://127.0.0.1:9100/partner/grant
 *           PARTNER_GRANT_SECRET_ARES1=<тот же секрет>, GAME_PROGRESS_SECRET_ARES1=<тот же секрет>
 *
 * Маршруты стенда:
 *   POST /partner/grant          — приём выдачи (подпись вахты)
 *   POST /dev/report             — { wallet, hours, rank?, ref?, country?, updatedAt? } → отчёт вахте
 *   GET  /dev/inventory?wallet=  — что начислено кошельку
 */
import http from 'node:http'
import { createGrantHandler, nodeGrantListener, sendProgressReports, GrantRejected, memoryGrantStore } from './server.js'

const GAME = process.env.GAME || 'ares1'
const PORT = Number(process.env.PORT || 9100)
const HOST = process.env.HOST || '127.0.0.1'
const WATCHTOWER_URL = process.env.WATCHTOWER_URL || 'http://127.0.0.1:8787'
const GRANT_SECRET = process.env.PARTNER_GRANT_SECRET
const PROGRESS_SECRET = process.env.GAME_PROGRESS_SECRET
if (!GRANT_SECRET || GRANT_SECRET.length < 32) {
  console.error('Задайте PARTNER_GRANT_SECRET (не короче 32 символов) — тот же, что PARTNER_GRANT_SECRET_<ИГРА> на вахте')
  process.exit(1)
}

/** Игровой «инвентарь» стенда. В настоящей игре здесь запись в базу игры. */
const inventory = new Map()
/** Кошельки, которые «знает» игра. Пустой список — знает всех (для стенда). */
const known = new Set((process.env.KNOWN_WALLETS || '').split(',').map((w) => w.trim()).filter(Boolean))
let operation = 0

async function applyGrant(grant) {
  if (known.size && !known.has(grant.wallet)) throw new GrantRejected('wallet unknown to the game')
  const inv = inventory.get(grant.wallet) || { tokens: {}, items: {} }
  if (grant.tokens) inv.tokens[grant.tokens.symbol] = (inv.tokens[grant.tokens.symbol] || 0) + grant.tokens.amount
  for (const it of grant.items) inv.items[it.id] = (inv.items[it.id] || 0) + it.amount
  inventory.set(grant.wallet, inv)
  operation += 1
  console.log(`выдано ${grant.grantId}: ${grant.wallet} ${JSON.stringify(grant.tokens)} ${grant.items.map((i) => `${i.amount}×${i.id}`).join(', ')}`)
  return { reference: `${GAME}-op-${operation}` }
}

const handleGrant = createGrantHandler({ secret: GRANT_SECRET, applyGrant, store: memoryGrantStore(), game: GAME, logger: console })
const grantRoute = nodeGrantListener(handleGrant)

const readJson = (req) => new Promise((resolve) => {
  let raw = ''
  req.on('data', (c) => { raw += c; if (raw.length > 16384) req.destroy() })
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch { resolve(null) } })
})
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  if (url.pathname === '/partner/grant') return grantRoute(req, res)
  if (url.pathname === '/dev/inventory' && req.method === 'GET') return json(res, 200, inventory.get(url.searchParams.get('wallet')) || { tokens: {}, items: {} })
  if (url.pathname === '/dev/report' && req.method === 'POST') {
    if (!PROGRESS_SECRET) return json(res, 400, { error: 'GAME_PROGRESS_SECRET не задан' })
    const r = await readJson(req)
    if (!r?.wallet) return json(res, 400, { error: 'wallet required' })
    try {
      const out = await sendProgressReports({ watchtowerUrl: WATCHTOWER_URL, game: GAME, secret: PROGRESS_SECRET, reports: [{ rank: 0, updatedAt: Date.now(), ...r }] })
      return json(res, 200, out)
    } catch (error) {
      return json(res, error.status || 502, { error: error.code || error.message })
    }
  }
  json(res, 404, { error: 'not_found' })
})

server.listen(PORT, HOST, () => console.log(`стенд игры ${GAME}: http://${HOST}:${PORT}/partner/grant, вахта ${WATCHTOWER_URL}`))

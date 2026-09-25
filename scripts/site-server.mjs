#!/usr/bin/env node
/**
 * Минимальный статический сервер для предпросмотра площадок без зависимостей:
 *   npm run site:preview  → http://localhost:4173/watchtower-site/ и /token-landing/
 * Нужен только для разработки: в проде страницы раздаёт любой статический хостинг
 * (GitHub Pages, Vercel, nginx), см. WEBSITES.md.
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const port = Number(process.env.PORT || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  const file = path.resolve(root, `.${url}`)
  if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return }
  let target = file
  if (!existsSync(target) || statSync(target).isDirectory()) target = path.join(file, 'index.html')
  if (!existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 — нет такой страницы. Смотрите /watchtower-site/ или /token-landing/')
    return
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream' })
  createReadStream(target).pipe(res)
}).listen(port, '0.0.0.0', () => {
  console.log(`предпросмотр площадок: http://localhost:${port}/watchtower-site/ · http://localhost:${port}/token-landing/`)
})

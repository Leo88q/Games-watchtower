#!/usr/bin/env node
/**
 * DOM-проверка интерфейса: собирает src/ios/main.js в IIFE-бандл, поднимает настоящий API
 * на свободном порту и прогоняет страницу в jsdom без браузера.
 *
 *   node scripts/ui-smoke.mjs
 *
 * Зачем: экраны падали не в сборке, а в рантайме — например, кросс-игровые сегменты
 * приходили объектом, а интерфейс вызывал у них .slice(). Тесты API такое не ловят.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startTestServer, sampleEvent } from './test-server.mjs'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`)
}

let jsdom
try {
  jsdom = await import('jsdom')
} catch {
  console.error('ui-smoke: нужен jsdom (npm install). Пропустить проверку нельзя: интерфейс остался бы вообще без тестов.')
  process.exit(1)
}

const outDir = path.join(root, 'dist-ui-smoke')
console.log('Сборка интерфейса для DOM-проверки…')
execFileSync('npx', ['vite', 'build', '--config', 'scripts/vite.ui-smoke.config.js'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
const bundle = readFileSync(path.join(outDir, 'ui.js'), 'utf8')

const server = await startTestServer({ env: { WATCHTOWER_ALLOW_DEMO: '1' } })
const base = server.base
// Один и тот же игрок в двух играх: путь кросс-игровых сегментов обязан рендериться из объекта,
// а не падать на .slice() — именно эта ошибка была поймана DOM-прогоном.
await server.ingest(sampleEvent({ signature: 'ui-smoke-1', payload: { gameId: 'ares1', playerKey: 'player-smoke', amount: 5 } }))
await server.ingest(sampleEvent({ signature: 'ui-smoke-2', payload: { gameId: 'guttercaps', playerKey: 'player-smoke', amount: 3 } }))
const { JSDOM } = jsdom
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: `${base}/#analytics`,
  pretendToBeVisual: true,
  runScripts: 'outside-only',
})
const { window } = dom

// В браузере страницу и API обслуживает один источник: здесь так же, только с токеном хаба.
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? new URL(input, base).toString() : input
  const headers = { ...(init.headers || {}) }
  if (!headers.accept) headers.accept = 'application/json'
  if (String(url).includes('/api/')) headers.authorization = 'Bearer test-read-token'
  return fetch(url, { ...init, headers })
}
const windowErrors = []
window.addEventListener('error', (event) => windowErrors.push(String(event.error || event.message)))

const finish = async (code) => {
  dom.window.close()
  await server.stop()
  try { rmSync(outDir, { recursive: true, force: true }) } catch { /* временный каталог */ }
  process.exit(code)
}

try {
  window.eval(bundle)
  await new Promise((resolve) => setTimeout(resolve, 2500))

  const rootEl = window.document.getElementById('app')
  const html = rootEl.innerHTML
  const text = rootEl.textContent.replace(/\s+/g, ' ')
  const cardIndex = html.indexOf('Покрытие метрик')
  const cardText = cardIndex === -1 ? '' : html.slice(cardIndex, cardIndex + 2600).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

  check('шапка интерфейса отрисована', html.includes('Watchtower OS'))
  check('раздел «Аналитика» открыт по прямой ссылке', text.includes('Аналитика'))
  check('карточка покрытия метрик присутствует', cardIndex !== -1)
  check('показан размер каталога метрик из API', /40 метрик в 8 семействах по 4 окнам/.test(cardText), cardText.slice(0, 120))
  check('показано число принимаемых типов событий', /47 типов событий \(36 уникальных\) от 5 игр/.test(cardText))
  check('покрытие: 18 метрик из событий', /Считаются из событий\s*18/.test(cardText))
  check('покрытие: 9 метрик ждут событий', /Ждут новых событий от игр\s*9/.test(cardText))
  check('покрытие: 13 метрик ждут конфигурации', /Ждут конфигурации студии\s*13/.test(cardText))
  check('перечислены недостающие события', cardText.includes('FeeCharged') && cardText.includes('WalletConnected'))
  check('перечислена нужная конфигурация', cardText.includes('config.circulating') && cardText.includes('config.revenueUsd'))
  check('трафик показывает расширенный набор счётчиков', text.includes('Уникальные псевдо-посетители') && text.includes('p50 / p95 времени сессии'))
  check('кросс-игровые сегменты рендерятся из объекта', text.includes('В одной игре'))
  check('игрок, найденный в двух играх, показан отдельной группой', text.includes('В двух играх'))
  check('воронка и AI-отчёт на месте', text.includes('Воронка') && text.includes('AI-отчёт по состоянию'))
  check('ошибок в window нет', windowErrors.length === 0, windowErrors.join(' | '))

  // Переход на раздел «Экономика» по ссылке должен подгрузить метрики, а не показать пустые карточки.
  window.location.hash = '#economy'
  window.dispatchEvent(new window.Event('hashchange'))
  await new Promise((resolve) => setTimeout(resolve, 1500))
  const economyText = window.document.getElementById('app').textContent.replace(/\s+/g, ' ')
  const families = ['Снабжение и эмиссия', 'Источники и стоки', 'Скорость обращения', 'Игроки и монетизация', 'Выручка и казна', 'Справедливость', 'Риски и ликвидность', 'Переплетение']
  const rendered = families.filter((family) => economyText.includes(family)).length
  check('раздел «Экономика» по прямой ссылке показывает все 8 семейств', rendered === 8, `отрисовано ${rendered}`)
  check('у пустых метрик стоит «—», а не ноль', economyText.includes('—'))

  // Раздел «Промпты» обязан показать форму для финансовой команды: её забирают из интерфейса.
  window.location.hash = '#prompts'
  window.dispatchEvent(new window.Event('hashchange'))
  await new Promise((resolve) => setTimeout(resolve, 800))
  const promptsText = window.document.getElementById('app').textContent.replace(/\s+/g, ' ')
  check('в разделе «Промпты» есть финансовая конфигурация студии', /Финансовая конфигурация студии/.test(promptsText))

  const failed = checks.filter((c) => !c.ok)
  console.log(`\nUI-smoke: ${checks.length - failed.length}/${checks.length} проверок пройдено`)
  await finish(failed.length ? 1 : 0)
} catch (error) {
  console.error('ui-smoke: исключение при прогоне интерфейса:', error)
  await finish(1)
}

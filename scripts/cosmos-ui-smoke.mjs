#!/usr/bin/env node
/** DOM smoke test for the Cosmos planet, region and object intelligence tabs. */

import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = path.join(root, 'dist-cosmos-smoke')
const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`)
}

let jsdom
try { jsdom = await import('jsdom') } catch {
  console.error('cosmos-ui-smoke: нужен jsdom (npm ci).')
  process.exit(1)
}

const { JSDOM } = jsdom
const metric = (id, family, value, unit = 'units') => ({
  id,
  family,
  label: id,
  value,
  unit,
  quality: value === null ? 'unavailable' : 'complete',
  formula: `fixture formula for ${id}`,
  source: 'cosmos-ui-smoke fixture',
  needs: [],
  window: '7d',
  timezone: 'UTC',
})
const economy = {
  source: 'event-inbox',
  window: '7d',
  windowDays: 7,
  demo: false,
  inputs: { eventsTotal: 14 },
  index: { score: 76, status: 'healthy', reason: 'fixture', components: ['flows', 'burn', 'activity', 'risk'] },
  metrics: [
    metric('total_minted', 'supply', 70),
    metric('total_burned', 'supply', 14),
    metric('net_issuance', 'supply', 56),
    metric('active_wallets', 'players', 7, 'wallets'),
    metric('new_wallets_share', 'players', 0.25, 'ratio'),
    metric('sources_total', 'flows', 42),
    metric('sinks_total', 'flows', 34),
    metric('sink_source_ratio', 'flows', 0.81, 'ratio'),
  ],
}
const funnel = {
  gameId: 'ares1',
  dataQuality: 'partial',
  privacy: 'anonymized-player-keys',
  events: 14,
  stages: [
    { id: 'first_entry', label: 'Первый вход', players: 7, conversionRate: 100 },
    { id: 'first_action', label: 'Первое действие', players: 4, conversionRate: 57.14 },
  ],
}
const audit = { present: false, filesScanned: 0, total: 0, critical: 0, high: 0, medium: 0, low: 0, scanValid: false, source: 'reports/ares1-audit.json' }

const dom = new JSDOM('<!doctype html><html lang="ru"><body><div id="app"></div></body></html>', {
  url: 'http://cosmos-smoke.local/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
})
const { window } = dom
window.HTMLCanvasElement.prototype.getContext = () => ({})
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 1280, height: 800, top: 0, right: 1280, bottom: 800, left: 0 })
window.ResizeObserver = class { observe() {} disconnect() {} }
window.requestAnimationFrame = () => 1
window.cancelAnimationFrame = () => {}

const requests = []
const requestUrls = []
window.fetch = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input.url, window.location.href)
  requests.push(url.pathname)
  requestUrls.push(`${url.pathname}${url.search}`)
  let payload = {}
  if (url.pathname === '/api/health') payload = { inbox: { events: 0 } }
  else if (url.pathname === '/api/ecosystem/status') payload = { tenants: [{ gameId: 'ares1', configured: true, level: 'L2', dataQuality: 'partial', findings: audit, reason: 'fixture reason', envKey: 'ARES1_PROGRAM_ID', nextStep: 'fixture next step' }] }
  else if (url.pathname === '/api/read-model') payload = { overview: { games: [] } }
  else if (url.pathname === '/api/alerts') payload = { alerts: [] }
  else if (url.pathname === '/api/operator/state') payload = {}
  else if (url.pathname === '/api/economy/overview') payload = economy
  else if (url.pathname === '/api/funnels') payload = funnel
  else if (url.pathname === '/api/games/ares1/telemetry') {
    const locationId = url.searchParams.get('regionId')
    const location = {
      id: locationId || 'telemetry',
      events: 14,
      timedEvents: 14,
      lastEventAt: '2026-09-29T11:30:00.000Z',
      eventTypes: { items: [{ type: 'PlayerJoined', count: 7 }, { type: 'RaceFinished', count: 7 }], typesTotal: 2, omittedTypes: 0 },
      timeline: [{ label: '23.09', startAt: '2026-09-23T00:00:00.000Z', events: 14 }],
      dataQuality: 'partial',
    }
    payload = {
      gameId: 'ares1', windowDays: 7, source: 'event-inbox', scope: 'game', totalEvents: 14, timedEvents: 14, untimedEvents: 0,
      lastEventAt: '2026-09-29T11:30:00.000Z', eventTypes: [{ type: 'PlayerJoined', count: 7 }, { type: 'RaceFinished', count: 7 }],
      eventTypeCoverage: { totalTypes: 2, omittedTypes: 0 }, dataQualityCounts: { complete: 0, partial: 14, unavailable: 0, unspecified: 0 }, dataQuality: 'partial',
      timeline: [{ label: '23.09', startAt: '2026-09-23T00:00:00.000Z', events: 14 }],
      locationCoverage: { taggedEvents: 14, untaggedEvents: 0, totalLocations: 1, omittedLocationEvents: 0, ratio: 1, recognizedFields: ['payload.regionId'], quality: 'partial', note: null },
      locations: [location], selectedLocation: locationId ? location : null,
    }
  }
  else if (url.pathname === '/api/games/ares1/forecast') payload = { game: 'ares1', status: 'unavailable', reason: 'fixture forecast unavailable', points: [], source: 'event-inbox' }
  return { ok: true, status: 200, json: async () => payload }
}

const errors = []
window.addEventListener('error', (event) => errors.push(String(event.error || event.message)))
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason?.message || event.reason)))

const finish = (code) => {
  window.close()
  try { rmSync(outDir, { recursive: true, force: true }) } catch { /* scratch build */ }
  process.exit(code)
}

try {
  console.log('Собираю Cosmos UI для DOM-проверки…')
  execFileSync('npx', ['vite', 'build', '--config', 'scripts/vite.cosmos-smoke.config.js'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
  window.eval(readFileSync(path.join(outDir, 'cosmos.js'), 'utf8'))
  await new Promise((resolve) => setTimeout(resolve, 50))

  const app = window.document.getElementById('app')
  const click = (selector, name) => {
    const element = app.querySelector(selector)
    if (!element) { check(name, false, `не найден элемент: ${selector}`); return false }
    element.click()
    return true
  }
  const waitFor = async (predicate, timeout = 500) => {
    const start = Date.now()
    while (!predicate() && Date.now() - start < timeout) await new Promise((resolve) => setTimeout(resolve, 5))
    return predicate()
  }

  click('[data-act="select"][data-id="ares1"]', 'выбор планеты ARES-1')
  check('в панели планеты доступны ровно пять разделов аналитики', app.querySelectorAll('.cz-intel-tabs [role="tab"]').length === 5)
  click('.cz-intel-tabs [data-tab="economy"]', 'переход на вкладку экономики планеты')
  const economyLoaded = await waitFor(() => app.textContent.includes('Индекс здоровья экономики'))
  check('вкладка экономики получает данные игры и движка', economyLoaded && app.textContent.includes('0,81×'))
  check('запрошены per-game economy, funnel, telemetry и forecast API', ['/api/economy/overview', '/api/funnels', '/api/games/ares1/forecast', '/api/games/ares1/telemetry'].every((path) => requests.includes(path)))
  click('.cz-intel-tabs [data-tab="overview"]', 'возврат к обзору планеты')
  const statisticsLoaded = await waitFor(() => app.textContent.includes('Поток выбранной игры'))
  check('обзор планеты включает статистику потока и таймлайн', statisticsLoaded && app.textContent.includes('Динамика событий') && app.textContent.includes('PlayerJoined'))
  click('.cz-intel-accordion summary[data-disclosure="locations"]', 'раскрытие геосреза в телеметрии')
  check('разбивка по районам раскрывается как отдельная группа', app.querySelector('.cz-intel-accordion summary[data-disclosure="locations"]')?.closest('details')?.open === true)
  click('.cz-intel-tabs [data-tab="economy"]', 'повторное открытие экономики после раскрытия района')
  await waitFor(() => app.textContent.includes('Индекс здоровья экономики'))
  click('.cz-intel-tabs [data-tab="overview"]', 'возврат к обзору с раскрытым геосрезом')
  const retainedLocations = app.querySelector('.cz-intel-accordion summary[data-disclosure="locations"]')?.closest('details')?.open === true
  check('состояние раскрытой группы сохраняется при смене вкладки', retainedLocations)
  click('.cz-intel-location-list [data-act="intel-location"]', 'переход к району из списка телеметрии')
  const directRegionLoaded = await waitFor(() => app.textContent.includes('Подтверждённые данные района'))
  check('переход из геосреза открывает район на вкладке обзора', directRegionLoaded && app.querySelector('.cz-intel-tabs [data-tab="overview"][aria-selected="true"]') !== null && app.textContent.includes('Телеметрия района: Пост телеметрии Watchtower'))
  click('[data-act="leave-surface"]', 'возврат к планете перед ручным переходом')
  click('[data-act="enter"][data-id="ares1"]', 'переход на поверхность планеты')
  click('.cz-hot[data-act="region"][data-id="telemetry"]', 'выбор района телеметрии')
  const locationLoaded = await waitFor(() => app.textContent.includes('Подтверждённые данные района'))
  check('в районе доступны те же пять разделов и его телеметрия', app.querySelectorAll('.cz-intel-tabs [role="tab"]').length === 5 && locationLoaded)
  check('запросы района передают точный gameId и regionId', requestUrls.some((url) => url.startsWith('/api/economy/overview?') && url.includes('gameId=ares1') && url.includes('regionId=telemetry')) && requestUrls.some((url) => url.startsWith('/api/funnels?') && url.includes('regionId=telemetry')))
  const locationStatsLoaded = await waitFor(() => app.textContent.includes('Типы событий'))
  check('обзор района показывает телеметрию только по локально размеченным событиям', locationStatsLoaded && app.textContent.includes('Телеметрия района: Пост телеметрии Watchtower') && app.textContent.includes('События с меткой района') && app.textContent.includes('PlayerJoined'))
  click('.cz-intel-tabs [data-tab="analytics"]', 'открытие аналитики района')
  const locationAnalyticsLoaded = await waitFor(() => app.textContent.includes('Воронка игрока'))
  check('аналитика района отображает прямые показатели и воронку', locationAnalyticsLoaded && app.textContent.includes('Срез наблюдений по району') && app.textContent.includes('Прямые показатели'))

  click('.cz-intel-tabs [data-tab="overview"]', 'возврат к обзору района')
  click('[data-act="closeup"][data-id="telemetry"]', 'вход в тематическую сцену района')
  click('.cz-hot.obj[data-act="object"]', 'осмотр объекта сцены')
  check('панель объекта сохраняет доступ ровно к пяти вкладкам игры', app.querySelectorAll('.cz-intel-tabs [role="tab"]').length === 5)
  click('.cz-intel-tabs [data-tab="analytics"]', 'открытие аналитики выбранного объекта')
  const objectAnalyticsLoaded = await waitFor(() => app.textContent.includes('Активные кошельки'))
  check('панель объекта показывает метрики выбранной игры', objectAnalyticsLoaded && app.textContent.includes('Срез наблюдений по району') && app.textContent.includes('Прямые показатели'))
  click('.cz-intel-tabs [data-tab="security"]', 'открытие вкладки безопасности объекта')
  check('безопасность не трактует отсутствующий аудит как подтверждение чистоты', app.textContent.includes('Отчёт аудита отсутствует') && app.textContent.includes('не означает отсутствие уязвимостей'))
  check('сводка безопасности показывает read-only границы и настройку игры', app.textContent.includes('только чтение') && app.textContent.includes('ARES1_PROGRAM_ID'))
  click('.cz-intel-tabs [data-tab="forecast"]', 'открытие вкладки прогноза объекта')
  const forecastLoaded = await waitFor(() => app.textContent.includes('Игровой прогноз недоступен'))
  check('недоступность игрового прогноза отделена от линейного сценария', forecastLoaded && app.textContent.includes('линейный run-rate сценарий'))
  check('ошибок JavaScript во время переходов нет', errors.length === 0, errors.join(' | '))

  const failed = checks.filter((item) => !item.ok)
  console.log(`\nCosmos UI smoke: ${checks.length - failed.length}/${checks.length} проверок пройдено`)
  finish(failed.length ? 1 : 0)
} catch (error) {
  console.error('cosmos-ui-smoke: исключение при проверке интерфейса:', error)
  finish(1)
}

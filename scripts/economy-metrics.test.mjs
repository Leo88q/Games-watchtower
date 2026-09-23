// Тесты движка экономических метрик (node:test, без внешних зависимостей).
//   node --test scripts/economy-metrics.test.mjs
// Проверяют: математику, честность unavailable, реакцию на боты, индекс здоровья и демо-поток.
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeEconomy, economyIndex, gini, topShare, herfindahl, annualizeDaily, classifyEvent, metricCatalog } from '../server/economy/metrics.js'
import { demoConfig, demoEvents } from '../server/economy/demo.js'

const NOW = Date.parse('2026-09-23T12:00:00.000Z')
const ev = (eventType, amount, player, daysAgo = 1, extra = {}) => ({
  eventType,
  observedAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
  payload: { gameId: 'ares1', playerKey: player, amount, ...extra },
})

test('gini: равенство = 0, предельная концентрация → к единице', () => {
  assert.equal(gini([10, 10, 10, 10]), 0)
  const concentrated = gini([0, 0, 0, 100])
  assert.ok(concentrated > 0.7, `ожидалось высокое значение, получено ${concentrated}`)
  assert.equal(gini([]), null)
})

test('topShare и herfindahl считают доли корректно', () => {
  assert.equal(topShare([100, 0, 0, 0], 0.25), 1)
  assert.equal(topShare([25, 25, 25, 25], 0.5), 0.5)
  assert.equal(herfindahl([0.5, 0.5]), 0.5)
  assert.equal(herfindahl([1]), 1)
})

test('annualizeDaily переводит дневную ставку в годовую', () => {
  assert.equal(annualizeDaily(0), 0)
  const annual = annualizeDaily(0.001)
  assert.ok(annual > 0.4 && annual < 0.45, `получено ${annual}`)
})

test('classifyEvent раскладывает события по экономическим классам', () => {
  assert.equal(classifyEvent({ eventType: 'TokenMinted' }).class, 'mint')
  assert.equal(classifyEvent({ eventType: 'RewardGranted' }).class, 'reward')
  assert.equal(classifyEvent({ eventType: 'CraftCompleted' }).class, 'sink')
  assert.equal(classifyEvent({ eventType: 'Withdrawal' }).class, 'extract')
  assert.equal(classifyEvent({ eventType: 'Unknown' }).class, 'other')
})

test('пустой поток: все метрики unavailable, индекс не выдумывается', () => {
  const result = computeEconomy({ events: [], window: '7d', now: NOW, config: {} })
  assert.equal(result.inputs.eventsHuman, 0)
  assert.ok(result.metrics.every((m) => m.quality === 'unavailable' || m.value === 0), 'нет данных — нет чисел')
  assert.equal(result.index.score, null)
  assert.equal(result.index.status, 'unavailable')
  assert.ok(result.index.reason.includes('Недостаточно компонентов'))
  // у каждой метрики есть формула и источник — иначе проверить нельзя
  assert.ok(result.metrics.every((m) => m.formula && m.source && m.timezone === 'UTC'))
  assert.ok(result.metrics.every((m) => m.quality !== 'unavailable' || m.reason), 'недоступная метрика без причины')
  assert.ok(result.metrics.every((m) => m.window === '7d'), 'метрика без окна агрегации')
})

test('расчёт потоков: источники, стоки, отношение и потребление', () => {
  const events = [
    ev('PotatoHarvested', 100, 'w1'), ev('RewardGranted', 50, 'w1'),
    ev('CraftCompleted', 60, 'w1'), ev('PackOpened', 30, 'w2'), ev('FeeCharged', 10, 'w2'),
    ev('Withdrawal', 20, 'w2'),
  ]
  const r = computeEconomy({ events, window: '7d', now: NOW, config: {} })
  const byId = Object.fromEntries(r.metrics.map((m) => [m.id, m]))
  assert.equal(byId.sources_total.value, 150)
  assert.equal(byId.sinks_total.value, 100)
  assert.equal(byId.sink_source_ratio.value, Number((100 / 150).toFixed(4)))
  assert.equal(byId.consumption_share.value, Number((100 / 120).toFixed(4)))
  assert.equal(byId.active_wallets.value, 2)
  assert.ok(byId.sink_diversity.value > 0)
})

test('инфляция и cap требуют конфигурации, иначе честное unavailable', () => {
  const events = [ev('TokenMinted', 1000, 'w1'), ev('TokenBurned', 400, 'w1')]
  const withoutConfig = computeEconomy({ events, window: '7d', now: NOW, config: {} })
  const inflation = withoutConfig.metrics.find((m) => m.id === 'inflation_daily')
  assert.equal(inflation.quality, 'unavailable')
  assert.ok(inflation.reason.includes('circulating'))

  const withConfig = computeEconomy({ events, window: '7d', now: NOW, config: { circulating: 10_000, maxSupply: 50_000 } })
  const daily = withConfig.metrics.find((m) => m.id === 'inflation_daily')
  const cap = withConfig.metrics.find((m) => m.id === 'cap_utilization')
  assert.equal(daily.quality, 'complete')
  assert.equal(daily.value, Number((((1000 - 400) / 10_000 / 7) * 100).toFixed(4)))
  assert.equal(cap.value, 20)
})

test('боты исключаются из экономики, но видны в доле ботов', () => {
  const events = [
    ev('PotatoHarvested', 100, 'w1'),
    ev('PageView', 1, 'bot1', 1, { bot: true, sourceType: 'bot' }),
    ev('PageView', 1, 'bot2', 1, { synthetic: true }),
  ]
  const r = computeEconomy({ events, window: '7d', now: NOW, config: {} })
  const byId = Object.fromEntries(r.metrics.map((m) => [m.id, m]))
  assert.equal(r.inputs.eventsHuman, 1)
  assert.equal(r.inputs.eventsExcludedAsBot, 2)
  assert.equal(byId.active_wallets.value, 1)
  assert.equal(byId.bot_activity_share.value, Number((2 / 3).toFixed(4)))
})

test('индекс здоровья: считается при достаточных данных и реагирует на извлечение', () => {
  const healthyEvents = []
  for (let i = 0; i < 40; i += 1) {
    const p = `w${i % 20}`
    healthyEvents.push(ev('PotatoHarvested', 50, p), ev('RewardGranted', 20, p), ev('CraftCompleted', 60, p), ev('Withdrawal', 2, p))
  }
  const healthy = computeEconomy({ events: healthyEvents, window: '7d', now: NOW, config: { circulating: 100_000, treasuryBalance: 50_000, dailyBurn: 200, prices: { POTATO: 1 } } })
  assert.ok(healthy.index.score !== null, 'индекс должен считаться')
  assert.ok(['healthy', 'watch', 'critical'].includes(healthy.index.status))

  const extractive = []
  for (let i = 0; i < 40; i += 1) {
    const p = i === 0 ? 'whale' : `w${i % 20}`
    extractive.push(ev('RewardGranted', i === 0 ? 5000 : 10, p), ev('CraftCompleted', 5, p), ev('Withdrawal', 900, p))
  }
  const bad = computeEconomy({ events: extractive, window: '7d', now: NOW, config: { circulating: 100_000 } })
  assert.ok(bad.index.score < healthy.index.score, `фарм-экономика должна быть ниже: ${bad.index.score} < ${healthy.index.score}`)
  assert.ok(Object.fromEntries(bad.metrics.map((m) => [m.id, m])).extractive_pattern_index.value > 0.7)
})

test('economyIndex без компонентов не выдаёт число', () => {
  const index = economyIndex([], { eventsHuman: 0 })
  assert.equal(index.score, null)
  assert.equal(index.status, 'unavailable')
})

test('ретроспектива окна: старые события не влияют на 7d', () => {
  const events = [ev('PotatoHarvested', 500, 'w1', 30), ev('PotatoHarvested', 5, 'w2', 1)]
  const r = computeEconomy({ events, window: '7d', now: NOW, config: {} })
  const sources = r.metrics.find((m) => m.id === 'sources_total')
  assert.equal(sources.value, 5, 'событие 30-дневной давности не должно попадать в окно 7d')
})

test('демо-поток: полный набор метрик, явная пометка demo', () => {
  const events = demoEvents({ days: 30, players: 120, now: NOW })
  assert.ok(events.length > 500)
  const r = computeEconomy({ events, window: '7d', now: NOW, config: demoConfig(), demo: true })
  assert.equal(r.demo, true)
  const available = r.metrics.filter((m) => m.quality !== 'unavailable')
  assert.ok(available.length >= 20, `ожидалось ≥20 доступных метрик, получено ${available.length}`)
  assert.ok(r.index.score !== null)
  const byId = Object.fromEntries(r.metrics.map((m) => [m.id, m]))
  assert.ok(byId.total_minted.value > 0)
  assert.ok(byId.total_burned.value > 0)
  assert.ok(byId.dividend_pool_coverage.value > 0)
})

test('каталог метрик описывает каждую метрику формулой и источником', () => {
  const catalog = metricCatalog()
  assert.ok(catalog.metrics.length >= 30, `ожидалось ≥30 метрик, получено ${catalog.metrics.length}`)
  assert.ok(catalog.metrics.every((m) => m.id && m.label && m.formula && m.source))
  assert.ok(catalog.families.length >= 8)
})

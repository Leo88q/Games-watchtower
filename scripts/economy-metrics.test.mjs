// Тесты движка экономических метрик (node:test, без внешних зависимостей).
//   node --test scripts/economy-metrics.test.mjs
// Проверяют: математику, честность unavailable, реакцию на боты, индекс здоровья и демо-поток.
import test from 'node:test'
import * as createHashModule from 'node:crypto'
import assert from 'node:assert/strict'
import { computeEconomy, economyIndex, gini, topShare, herfindahl, annualizeDaily, safeRatio, classifyEvent, metricCatalog } from '../server/economy/metrics.js'
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

// --- F-003: золотые значения. Тесты ниже намеренно фиксируют точные числа:
// любое изменение математики (сортировки, весов, порогов, границ окна, seed) обязано ломать сборку.

test('gini не зависит от порядка входа (сортировка обязана применяться)', () => {
  assert.equal(gini([100, 1, 2, 3]), 0.7028)
  assert.equal(gini([1, 2, 3, 100]), 0.7028)
  assert.equal(gini([1, 100, 2, 3]), 0.7028)
  assert.equal(gini([5, 5, 5, 5]), 0)
  assert.notEqual(gini([100, 1, 2, 3]), 0, 'нулевой Gini на неравенстве — потеря сортировки/счёта')
})

test('topShare и herfindahl: точные значения, а не «похожие»', () => {
  assert.equal(topShare([100, 1, 1, 1], 0.25), 0.9709)
  assert.equal(topShare([100, 1, 1, 1], 1), 1)
  assert.equal(herfindahl([0.2, 0.8]), 0.68)
  assert.equal(herfindahl([0.5, 0.5]), 0.5)
})

test('annualizeDaily: сложный процент на 365 днях', () => {
  assert.equal(annualizeDaily(0.001), 0.4403)
  assert.equal(annualizeDaily(0), 0)
  assert.equal(annualizeDaily(Number.NaN), null)
})

test('safeRatio: без знаменателя возвращается null, а не 1', () => {
  assert.equal(safeRatio(3, 4), 0.75)
  assert.equal(safeRatio(1, 0), null)
  assert.equal(safeRatio(Number.NaN, 2), null)
})

const GOLDEN_CONFIG = {
  circulating: 1_000_000, maxSupply: 2_000_000, treasuryBalance: 180_000, dailyBurn: 1_000,
  revenueUsd: 1_000, costsUsd: 400, stablecoinRevenueUsd: 600, cosmeticRevenueUsd: 250,
  liquidityUsd: 500_000, marketCapUsd: 5_000_000, sybilFlaggedWallets: 20, mainAsset: 'POTATO',
  burnCadenceDays: 7, prices: { POTATO: 0.05, GAME: 1 },
}

function goldenEvents() {
  const events = []
  for (let i = 0; i < 40; i += 1) {
    const player = `player_${i % 20}`
    events.push(ev('RewardGranted', 20 + i, player, 1))
    events.push(ev('TokenMinted', 100, player, 1))
    events.push(ev('CraftCompleted', 12, player, 2))
    events.push(ev('TokenBurned', 4, player, 3))
    if (i % 3 === 0) events.push(ev('Withdrawal', 6, player, 4))
  }
  return events
}

test('золотой индекс: 6 компонентов, точный score, веса и статус', () => {
  const result = computeEconomy({ events: goldenEvents(), window: '7d', now: NOW, config: GOLDEN_CONFIG })
  assert.equal(result.index.score, 67)
  assert.equal(result.index.status, 'watch')
  assert.deepEqual(result.index.components.map((c) => [c.id, c.score, c.weight]), [
    ['sink_strength', 0.4051, 0.25],
    ['burn_health', 0.08, 0.15],
    ['fairness', 0.9158, 0.2],
    ['play_vs_extract', 0.884, 0.2],
    ['runway', 1, 0.1],
    ['organic', 1, 0.1],
  ])
  assert.deepEqual(result.index.vetoes, [])
  const byId = Object.fromEntries(result.metrics.map((m) => [m.id, m]))
  assert.equal(byId.sink_source_ratio.value, 0.4051)
  assert.equal(byId.net_issuance.value, 3840)
  assert.equal(byId.gini_earnings.value, 0.0842)
  // Финансовые факты задаются за 30 дней и приводятся к окну: 7/30 от (1000 − 400) × 0.25 = 35.
  assert.equal(byId.dividend_pool_coverage.value, 35, 'дивидендный пул — (выручка − расходы) × 0.25 после приведения к окну')
  assert.equal(byId.dividend_pool_coverage.quality, 'partial', 'приведённое значение помечается как partial')
  assert.equal(byId.treasury_runway_days.value, 180)
})

test('индекс: порог 4 компонента — на 3 данных нет, на 4 и 5 считается', () => {
  const compute = (events, config = {}) => computeEconomy({ events, window: '7d', now: NOW, config }).index

  // 3 компонента: только минт + данные казны → индекса быть не должно.
  const three = compute([ev('TokenMinted', 100, 'w1')], { treasuryBalance: 90_000, dailyBurn: 1_000 })
  assert.equal(three.components.length, 3)
  assert.equal(three.score, null)
  assert.equal(three.status, 'unavailable')
  assert.ok(three.reason.includes('3 из 6'))

  // 4 компонента: появляются источники (начисления) → индекс обязан считаться.
  const four = compute([ev('TokenMinted', 100, 'w1'), ev('RewardGranted', 50, 'w1')])
  assert.equal(four.components.length, 4)
  assert.equal(four.score, 43)
  assert.equal(four.status, 'critical')

  // 5 компонентов: добавлены казна и расход → индекс обязан считаться.
  const five = compute([ev('TokenMinted', 100, 'w1'), ev('RewardGranted', 50, 'w1')], { treasuryBalance: 90_000, dailyBurn: 1_000 })
  assert.equal(five.components.length, 5)
  assert.equal(five.score, 44)
  assert.equal(five.status, 'critical')

  // 6 компонентов (золотой фикстур) — полный индекс.
  const six = compute(goldenEvents(), GOLDEN_CONFIG)
  assert.equal(six.components.length, 6)
  assert.equal(six.score, 67)
})

test('граница окна: события ровно на from и ровно на now входят в расчёт', () => {
  const boundary = [
    ev('RewardGranted', 5, 'w1', 7),
    ev('RewardGranted', 7, 'w2', 0),
    { ...ev('RewardGranted', 9, 'w3', 0), timestamp: new Date(NOW + 1).toISOString(), observedAt: new Date(NOW + 1).toISOString() },
  ]
  const result = computeEconomy({ events: boundary, window: '7d', now: NOW, config: {} })
  const byId = Object.fromEntries(result.metrics.map((m) => [m.id, m]))
  assert.equal(byId.sources_total.value, 12, 'событие ровно на границе окна обязано входить')
  assert.equal(result.inputs.eventsHuman, 2, 'событие из будущего (+1 мс) не входит')
})

test('runway недоступен без дневного расхода: деления на ноль нет', () => {
  const result = computeEconomy({ events: goldenEvents(), window: '7d', now: NOW, config: { ...GOLDEN_CONFIG, dailyBurn: undefined } })
  const runway = result.metrics.find((m) => m.id === 'treasury_runway_days')
  assert.equal(runway.quality, 'unavailable')
  assert.equal(runway.value, null)
  assert.ok(runway.reason)
})

test('каталог: ровно 40 метрик, идентификаторы уникальны', () => {
  const catalog = metricCatalog()
  assert.equal(catalog.metrics.length, 40)
  assert.equal(new Set(catalog.metrics.map((m) => m.id)).size, 40)
  assert.ok(catalog.metrics.every((m) => m.formula && m.source && m.family))
})

test('покрытие каталога: 18 метрик из событий, 9 ждут новых событий, 13 — конфигурации', () => {
  const acceptedEvents = ['PlayerJoined', 'PotatoPlanted', 'PotatoHarvested', 'RewardGranted', 'TokenMinted', 'TokenBurned', 'TreasuryChanged', 'PlotCreated', 'CropHarvested', 'CraftCompleted', 'RaceStarted', 'RaceFinished', 'MatchSettled', 'PackOpened', 'AssetMinted', 'AssetTransferred', 'WagerCreated', 'WagerSettled', 'CampaignCreated', 'CampaignStarted', 'CampaignStopped', 'CampaignUpdated', 'SourceConnected', 'SourceDisconnected', 'SourceHealthChanged', 'PageAssigned', 'PageRemoved', 'SessionStarted', 'PageView', 'Click', 'CTAClicked', 'SessionEnded', 'DataGapDetected', 'DataGapHealed', 'RateLimited']
  const { coverage } = metricCatalog({ acceptedEvents })
  assert.equal(coverage.total, 40)
  assert.equal(coverage.fromEvents.length, 18)
  assert.equal(coverage.needEvents.length, 9)
  assert.equal(coverage.needConfig.length, 13)
  assert.equal(coverage.fromEvents.length + coverage.needEvents.length + coverage.needConfig.length, coverage.total)
  const events = [...new Set(coverage.needEvents.flatMap((m) => m.events))].sort()
  assert.deepEqual(events, ['BridgeIn', 'BridgeOut', 'FeeCharged', 'MarketOrderCompleted', 'SecurityEvent', 'WalletConnected', 'Withdrawal'])
  for (const item of coverage.needConfig) {
    for (const key of item.config) assert.match(key, /^config\.(circulating|maxSupply|burnCadenceDays|revenueUsd|costsUsd|stablecoinRevenueUsd|cosmeticRevenueUsd|treasuryBalance|dailyBurn|liquidityUsd|prices|marketCapUsd)$/)
  }
})

test('демо: одинаковый набор в пределах одних UTC-суток, независимо от TZ', async () => {
  const first = demoEvents({ days: 14, players: 50, now: NOW, seed: 7 })
  const sameDay = demoEvents({ days: 14, players: 50, now: NOW + 61_000, seed: 7 })
  assert.equal(first.length, sameDay.length)
  assert.equal(JSON.stringify(first), JSON.stringify(sameDay), 'в пределах одних UTC-суток демо обязано совпадать байт-в-байт')

  const digestScript = `
    import { createHash } from 'node:crypto'
    import { demoEvents } from '${new URL('../server/economy/demo.js', import.meta.url).pathname}'
    const events = demoEvents({ days: 14, players: 50, now: ${NOW}, seed: 7 })
    const counts = {}
    for (const event of events) { const day = event.observedAt.slice(0, 10); counts[day] = (counts[day] || 0) + 1 }
    const sorted = Object.fromEntries(Object.entries(counts).sort())
    console.log(createHash('sha256').update(JSON.stringify(sorted)).digest('hex'))
  `
  const { execFileSync } = await import('node:child_process')
  const hashFor = (tz) => execFileSync(process.execPath, ['--input-type=module', '-e', digestScript], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim()
  const utc = hashFor('UTC')
  assert.equal(hashFor('America/New_York'), utc, 'локальное время не должно менять суточный профиль демо')
  assert.equal(hashFor('Asia/Tokyo'), utc)
  assert.equal(countsDigest(first), utc, 'демо обязано считаться по UTC-суткам')
})

function countsDigest(events) {
  const { createHash } = createHashModule
  const counts = {}
  for (const event of events) { const day = event.observedAt.slice(0, 10); counts[day] = (counts[day] || 0) + 1 }
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(counts).sort()))).digest('hex')
}


test('финансовые факты студии: за 30 дней, приводятся к окну пропорционально дням', () => {
  const events = goldenEvents()
  const value = (window, id) => computeEconomy({ events, window, now: NOW, config: GOLDEN_CONFIG }).metrics.find((m) => m.id === id)
  // На окне 30 дней приведение не меняет число: столько студия и сообщила.
  assert.equal(value('30d', 'gross_revenue').value, 1000)
  assert.equal(value('30d', 'dividend_pool_coverage').value, 150)
  assert.equal(value('7d', 'gross_revenue').value, 233.33)
  assert.equal(value('24h', 'gross_revenue').value, 33.33)
  assert.equal(value('90d', 'gross_revenue').value, 3000)
  assert.equal(value('90d', 'dividend_pool_coverage').value, 450)
  // Пропорции не зависят от окна: приведение не искажает разбивку выручки.
  for (const window of ['24h', '7d', '30d', '90d']) {
    const share = value(window, 'stablecoin_share').value
    assert.ok(Math.abs(share - 60) < 0.05, `доля стейблкоинов не должна зависеть от окна, получено ${share}`)
    assert.ok(Math.abs(value(window, 'cosmetic_share').value - 25) < 0.05)
  }
  // Приведённые метрики не выдаются за измеренные: quality partial и период в источнике.
  for (const id of ['gross_revenue', 'dividend_pool_coverage', 'arpdau']) {
    const metric = value('7d', id)
    assert.equal(metric.quality, 'partial', `${id} должен быть partial`)
    assert.match(metric.source, /30 дней/, `${id}: источник обязан указывать период конфигурации`)
  }
  // ARPDAU: выручка за окно / активные кошельки / дни — не зависит от длины окна.
  const arpdau = ['24h', '7d', '30d', '90d'].map((window) => value(window, 'arpdau').value)
  for (const item of arpdau) assert.ok(Math.abs(item - 1.6667) < 0.01, `ARPDAU должен быть одинаковым по окнам, получено ${item}`)
})

test('финансовые факты: пустые значения не превращаются в ноль', () => {
  const result = computeEconomy({ events: goldenEvents(), window: '30d', now: NOW, config: { ...GOLDEN_CONFIG, revenueUsd: undefined, costsUsd: undefined } })
  const byId = Object.fromEntries(result.metrics.map((m) => [m.id, m]))
  for (const id of ['gross_revenue', 'dividend_pool_coverage', 'arpdau']) {
    assert.equal(byId[id].value, null, `${id} без выручки обязан вернуть null, а не 0`)
    assert.equal(byId[id].quality, 'unavailable')
    assert.ok(byId[id].reason, `${id}: нужна причина`)
  }
})

test('финансовые факты видны без потока событий, но помечены как заявленные, а не измеренные', () => {
  const config = { circulating: 8_400_000, maxSupply: 50_000_000, treasuryBalance: 186_000, dailyBurn: 1_450, revenueUsd: 42_500, costsUsd: 18_900, stablecoinRevenueUsd: 31_000, cosmeticRevenueUsd: 12_800, liquidityUsd: 640_000, marketCapUsd: 12_600_000 }
  const result = computeEconomy({ events: [], window: '30d', now: NOW, config })
  const withValue = result.metrics.filter((m) => m.value !== null)
  assert.deepEqual(withValue.map((m) => m.id).sort(), ['cap_utilization', 'cosmetic_share', 'dividend_pool_coverage', 'gross_revenue', 'liquidity_to_mcap', 'price_impact_1k', 'stablecoin_share', 'treasury_runway_days'])
  const byId = Object.fromEntries(withValue.map((m) => [m.id, m]))
  assert.equal(byId.cap_utilization.value, 16.8)
  assert.equal(byId.treasury_runway_days.value, 128.3)
  assert.equal(byId.gross_revenue.value, 42_500, 'на окне 30 дней число равно присланному')
  assert.equal(byId.dividend_pool_coverage.value, 5_900)
  for (const metric of withValue) {
    assert.equal(metric.quality, 'partial', `${metric.id} не может быть complete без событий`)
    assert.ok(metric.note, `${metric.id}: нужна пометка «из финансовых фактов»`)
  }
  // Ни одна метрика активности не получает число из пустого потока.
  for (const metric of result.metrics.filter((m) => !withValue.includes(m))) {
    assert.equal(metric.value, null, `${metric.id} не должен считать без событий`)
    assert.ok(metric.reason, `${metric.id}: нужна причина недоступности`)
  }
  assert.equal(result.index.score, null, 'индекс здоровья не считается из одних финансовых фактов')
})

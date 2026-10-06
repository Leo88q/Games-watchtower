import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeEconomy, deriveIndirectMetrics, economyScenario, formatMetricValue, metricAvailable } from '../src/cosmos/intelligence.js'

const metric = (id, value, unit = 'units', quality = 'complete') => ({ id, value, unit, quality })
const economy = ({ eventsTotal = 14, window = '7d', minted = 70, burned = 14 } = {}) => ({
  window,
  windowDays: window === '24h' ? 1 : window === '30d' ? 30 : 7,
  inputs: { eventsTotal },
  metrics: [
    metric('active_wallets', 7, 'wallets'),
    metric('new_wallets_share', 0.25, 'ratio'),
    metric('total_minted', minted),
    metric('total_burned', burned),
    metric('net_issuance', minted - burned),
    metric('sources_total', 42),
  ],
})

test('metric formatting preserves units and never turns unavailable values into zero', () => {
  assert.equal(metricAvailable(metric('active_wallets', null, 'wallets', 'unavailable')), false)
  assert.equal(formatMetricValue(metric('active_wallets', null, 'wallets', 'unavailable')), 'нет данных')
  assert.equal(formatMetricValue(metric('active_wallets', 7, 'wallets')), '7 кош.')
  assert.equal(formatMetricValue(metric('new_wallets_share', 0.25, 'ratio')), '25%')
  assert.equal(formatMetricValue(metric('sink_source_ratio', 0.8, 'ratio')), '0,8×')
  assert.equal(formatMetricValue(metric('treasury_runway_days', 3.5, 'days')), '3,5 дн.')
})

test('derived proxies require their actual denominators and label their source', () => {
  const missing = deriveIndirectMetrics({ window: '7d', inputs: { eventsTotal: null }, metrics: [] })
  assert.equal(missing[0].value, null)
  assert.equal(missing[1].value, null)
  assert.equal(missing[0].quality, 'unavailable')

  const result = deriveIndirectMetrics(economy())
  assert.equal(result.find((row) => row.id === 'events_per_day_proxy').value, 2)
  assert.equal(result.find((row) => row.id === 'events_per_wallet_proxy').value, 2)
  assert.equal(result.every((row) => row.formula && row.source), true)
})

test('scenario stays unavailable without observed history and scales a labelled run rate when present', () => {
  assert.equal(economyScenario(economy({ eventsTotal: 0 })).available, false)
  const scenario = economyScenario(economy(), 30)
  assert.equal(scenario.available, true)
  assert.equal(scenario.dailyMint, 10)
  assert.equal(scenario.dailyBurn, 2)
  assert.equal(scenario.projectedNet, 240)
  assert.equal(scenario.method, 'linear run-rate scenario')
  assert.match(scenario.caveat, /не ML-прогноз/)
})

test('interpretation explicitly reports insufficient observations instead of asserting health', () => {
  const [insight] = analyzeEconomy({ inputs: { eventsTotal: 0 }, metrics: [] })
  assert.equal(insight.title, 'Недостаточно наблюдений')
  assert.match(insight.detail, /не подменяются нулями/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { trafficAnalytics, channelAttribution } from '../server/analytics/traffic.js'

const ev = (eventType, sourceId, extra = {}) => ({ source: 'trafficgen', eventType, sourceId, campaignId: 'talkchart_social_x', timestamp: '2026-09-24T12:00:00Z', ...extra })

test('канал X: CTA → подтверждённые переходы, конверсии считаются от своего знаменателя', () => {
  const events = [
    ev('SessionStarted', 'x_twitter'), ev('SessionStarted', 'x_twitter'), ev('SessionStarted', 'x_twitter'), ev('SessionStarted', 'x_twitter'),
    ev('CTAClicked', 'x_twitter'), ev('CTAClicked', 'x_twitter'),
    ev('LandingReached', 'x_twitter'),
    ev('SessionStarted', 'google_search'),
  ]
  const x = channelAttribution(events).find((r) => r.sourceId === 'x_twitter')
  assert.deepEqual([x.sessions, x.ctaClicks, x.landingReached], [4, 2, 1])
  assert.equal(x.ctaRate, 0.5)
  assert.equal(x.landingRate, 0.5)
  assert.equal(x.ltv, null, 'LTV без связки клик→кошелёк не выдумываем')
  const g = channelAttribution(events).find((r) => r.sourceId === 'google_search')
  assert.equal(g.landingRate, null, 'нулевой знаменатель — null, а не 0')
})

test('бот-контур не смешивается и уходит в конец списка', () => {
  const rows = channelAttribution([ev('SessionStarted', 'factory_pipeline', { sourceType: 'bot' }), ev('SessionStarted', 'x_twitter')])
  assert.equal(rows.at(-1).sourceId, 'factory_pipeline')
  assert.equal(rows.at(-1).bot, true)
})

test('LandingReached больше не помечается stageUnavailable, отчёт отдаёт channels', () => {
  const report = trafficAnalytics({ events: [ev('CTAClicked', 'x_twitter'), ev('LandingReached', 'x_twitter')], env: {} })
  const step = report.funnel.find((s) => s.step === 'LandingReached')
  assert.equal(step.stageUnavailable, false)
  assert.equal(step.count, 1)
  assert.equal(step.conversionFromPrevious, 1)
  assert.ok(Array.isArray(report.channels))
  assert.equal(report.writes, false)
})

test('синтетика исключена из разреза каналов', () => {
  const report = trafficAnalytics({ events: [ev('SessionStarted', 'x_twitter', { payload: { synthetic: true } })], env: {} })
  assert.deepEqual(report.channels, [])
})

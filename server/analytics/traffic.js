import { getGameAdapter } from '../ingestion/game-adapters.js'

const FUNNEL_STEPS = ['CampaignStarted', 'SessionStarted', 'PageView', 'CTAClicked', 'LandingReached']
const ERROR_EVENTS = new Set(['DeliveryFailed', 'RateLimited', 'TrafficError'])

function dayKey(event) {
  const raw = event.timestamp || event.observedAt || ''
  return raw.slice(0, 10) || 'unknown'
}

// Аналитика off-chain источника «trafficgen» по событиям из inbox.
// Пока адаптер не сконфигурирован или события не поступали — секция честно
// возвращает dataQuality: 'unavailable' с причиной, без выдуманных чисел.
export function trafficAnalytics({ events = [], env = process.env } = {}) {
  const adapter = getGameAdapter('trafficgen', env)
  const configured = Boolean(adapter?.configured)
  const traffic = events.filter((event) => event.source === 'trafficgen')

  const daily = new Map()
  const campaigns = new Set()
  const sources = new Set()
  const pages = new Set()

  const totals = { events: 0, pageViews: 0, sessions: 0, ctaClicks: 0, landingReached: 0, errors: 0, dataGaps: 0, botEvents: 0, realEvents: 0, visitors: new Set() }

  for (const event of traffic) {
    const key = dayKey(event)
    const row = daily.get(key) || { day: key, pageViews: 0, sessions: 0, ctaClicks: 0, landingReached: 0, errors: 0, dataGaps: 0, botEvents: 0, realEvents: 0, events: 0, visitors: new Set() }
    daily.set(key, row)
    row.events += 1
    if (event.eventType === 'PageView') row.pageViews += 1
    else if (event.eventType === 'SessionStarted') row.sessions += 1
    else if (event.eventType === 'CTAClicked') row.ctaClicks += 1
    else if (event.eventType === 'LandingReached') row.landingReached += 1
    if (ERROR_EVENTS.has(event.eventType)) row.errors += 1
    if (event.eventType === 'DataGapDetected') row.dataGaps += 1
    totals.events += 1
    if (event.eventType === 'PageView') totals.pageViews += 1
    else if (event.eventType === 'SessionStarted') totals.sessions += 1
    else if (event.eventType === 'CTAClicked') totals.ctaClicks += 1
    else if (event.eventType === 'LandingReached') totals.landingReached += 1
    if (ERROR_EVENTS.has(event.eventType)) totals.errors += 1
    if (event.eventType === 'DataGapDetected') totals.dataGaps += 1
    if (event.sessionId) { row.visitors.add(event.sessionId); totals.visitors.add(event.sessionId) }
    if (event.sourceType === 'bot') { row.botEvents += 1; totals.botEvents += 1 }
    if (event.sourceType === 'real') { row.realEvents += 1; totals.realEvents += 1 }
    const campaignId = event.campaignId || event.payload?.campaignId
    if (campaignId) campaigns.add(campaignId)
    const sourceId = event.sourceId || event.payload?.sourceId
    if (sourceId) sources.add(sourceId)
    const pageId = event.pageId || event.payload?.pageId
    if (pageId) pages.add(pageId)
  }

  const counts = Object.fromEntries(FUNNEL_STEPS.map((step) => [step, traffic.filter((event) => event.eventType === step).length]))
  const funnel = FUNNEL_STEPS.map((step, index) => {
    const previous = index === 0 ? null : FUNNEL_STEPS[index - 1]
    const previousCount = previous ? counts[previous] : null
    return {
      step,
      count: counts[step],
      conversionFromPrevious: previousCount === null || previousCount === 0 ? null : Number((counts[step] / previousCount).toFixed(4)),
    }
  })

  const dailyRows = [...daily.values()].map(({ visitors, ...row }) => ({ ...row, uniquePseudoVisitors: visitors.size }))
  const { visitors, ...totalsOut } = totals
  const dataQuality = traffic.length ? 'partial' : 'unavailable'

  return {
    source: 'trafficgen',
    adapter: { gameId: 'trafficgen', configured, offchain: true, quality: adapter?.quality || 'unavailable', apiBaseUrl: adapter?.apiBaseUrl || null },
    dataQuality,
    confidence: traffic.length ? 0.55 : 0,
    period: 'all ingested events, UTC',
    generatedAt: new Date().toISOString(),
    totals: { ...totalsOut, uniquePseudoVisitors: visitors.size },
    daily: dailyRows,
    funnel,
    campaigns: [...campaigns],
    sources: [...sources],
    pages: [...pages],
    reason: traffic.length ? null : (configured ? 'События trafficgen ещё не поступили в inbox' : 'TRAFFICGEN_API_BASE_URL не настроен — данные недоступны'),
    writes: false,
  }
}

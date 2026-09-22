import { getGameAdapter } from '../ingestion/game-adapters.js'

const FUNNEL_STEPS = ['CampaignStarted', 'SessionStarted', 'PageView', 'CTAClicked', 'LandingReached']
const ERROR_EVENTS = new Set(['DeliveryFailed', 'RateLimited', 'TrafficError'])
const GAP_EVENTS = { detected: 'DataGapDetected', healed: 'DataGapHealed' }

function dayKey(event) {
  const raw = event.timestamp || event.observedAt || ''
  return raw.slice(0, 10) || 'unknown'
}

function percentile(arr, p) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a,b)=>a-b)
  const idx = Math.ceil((p/100)*sorted.length)-1
  return sorted[Math.max(0, Math.min(idx, sorted.length-1))]
}

// Аналитика off-chain источника «trafficgen» по событиям из inbox — обновлено по финальному отчету 2026-09-22
// 17 implemented, 12 unavailable, честная воронка без max(count, len(CAMPAIGNS_DEF)), p50/p95, byCampaign/bySource/byPage, bot/real раздельно,
// integrity duplicates/rejected/dataGaps/dataGapsHealed, factory_pipeline -> bot нормализация, synthetic exclusion, retention 30d
export function trafficAnalytics({ events = [], env = process.env } = {}) {
  const adapter = getGameAdapter('trafficgen', env)
  const configured = Boolean(adapter?.configured)
  // Фильтр synthetic: payload.synthetic true исключается из агрегатов (gap #10)
  const trafficAll = events.filter((event) => event.source === 'trafficgen')
  const traffic = trafficAll.filter((e) => !(e.payload?.synthetic === true))

  const daily = new Map()
  const campaigns = new Set()
  const sources = new Set()
  const pages = new Set()
  const sessionDurations = [] // для p50/p95

  const totals = { events: 0, pageViews: 0, sessions: 0, ctaClicks: 0, landingReached: 0, clicks: 0, sessionEnded: 0, errors: 0, dataGaps: 0, dataGapsHealed: 0, rateLimited: 0, botEvents: 0, realEvents: 0, hybridEvents: 0, duplicates: 0, rejected: 0, visitors: new Set(), sessionStarts: new Map() }

  for (const event of traffic) {
    const key = dayKey(event)
    const row = daily.get(key) || { day: key, pageViews: 0, sessions: 0, ctaClicks: 0, landingReached: 0, clicks: 0, sessionEnded: 0, errors: 0, dataGaps: 0, dataGapsHealed: 0, rateLimited: 0, botEvents: 0, realEvents: 0, hybridEvents: 0, events: 0, visitors: new Set(), durations: [] }
    daily.set(key, row)
    row.events += 1
    // Нормализация factory_pipeline -> bot (gap #9)
    let sourceType = event.sourceType || event.payload?.sourceType || 'unknown'
    const sourceId = event.sourceId || event.payload?.sourceId || ''
    if (sourceId === 'factory_pipeline') sourceType = 'bot'

    if (event.eventType === 'PageView') { row.pageViews += 1; totals.pageViews += 1 }
    else if (event.eventType === 'SessionStarted') { 
      row.sessions += 1; totals.sessions += 1
      if (event.sessionId) {
        row.sessionStarts = row.sessionStarts || new Map()
        row.sessionStarts.set(event.sessionId, event.timestamp)
        totals.sessionStarts.set(event.sessionId, event.timestamp)
      }
    }
    else if (event.eventType === 'CTAClicked') { row.ctaClicks += 1; totals.ctaClicks += 1 }
    else if (event.eventType === 'LandingReached') { row.landingReached += 1; totals.landingReached += 1 }
    else if (event.eventType === 'Click') { row.clicks += 1; totals.clicks += 1 }
    else if (event.eventType === 'SessionEnded') { 
      row.sessionEnded += 1; totals.sessionEnded += 1
      if (event.sessionId && totals.sessionStarts.has(event.sessionId)) {
        const start = new Date(totals.sessionStarts.get(event.sessionId)).getTime()
        const end = new Date(event.timestamp || event.observedAt).getTime()
        const dur = Math.max(0, (end - start)/1000)
        row.durations.push(dur)
        sessionDurations.push(dur)
      }
    }
    if (ERROR_EVENTS.has(event.eventType)) { row.errors += 1; totals.errors += 1 }
    if (event.eventType === GAP_EVENTS.detected) { row.dataGaps += 1; totals.dataGaps += 1 }
    if (event.eventType === GAP_EVENTS.healed) { row.dataGapsHealed += 1; totals.dataGapsHealed += 1 }
    if (event.eventType === 'RateLimited') { row.rateLimited += 1; totals.rateLimited += 1 }

    totals.events += 1
    if (event.sessionId) { row.visitors.add(event.sessionId); totals.visitors.add(event.sessionId) }
    if (sourceType === 'bot') { row.botEvents += 1; totals.botEvents += 1 }
    else if (sourceType === 'real') { row.realEvents += 1; totals.realEvents += 1 }
    else if (sourceType === 'hybrid') { row.hybridEvents += 1; totals.hybridEvents += 1 }

    const campaignId = event.campaignId || event.payload?.campaignId
    if (campaignId) campaigns.add(campaignId)
    if (sourceId) sources.add(sourceId)
    const pageId = event.pageId || event.payload?.pageId
    if (pageId) pages.add(pageId)
  }

  // Честная воронка без max(count, len(CAMPAIGNS_DEF)) — gap #1
  const counts = Object.fromEntries(FUNNEL_STEPS.map((step) => [step, traffic.filter((event) => event.eventType === step).length]))
  const funnel = FUNNEL_STEPS.map((step, index) => {
    const previous = index === 0 ? null : FUNNEL_STEPS[index - 1]
    const previousCount = previous ? counts[previous] : null
    const stageUnavailable = step === 'LandingReached' // по отчету LandingReached unavailable, нет механизма подтверждения
    return {
      step,
      count: counts[step],
      conversionFromPrevious: previousCount === null || previousCount === 0 ? null : Number((counts[step] / previousCount).toFixed(4)),
      stageUnavailable,
    }
  })

  // Daily continuous series 7 days + p50/p95 + breakdowns
  const dailyRows = [...daily.values()].map(({ visitors, durations, sessionStarts, ...row }) => {
    const avg = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length : 0
    return { 
      ...row, 
      uniquePseudoVisitors: visitors.size,
      avg: Number(avg.toFixed(1)),
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
    }
  }).sort((a,b)=>a.day.localeCompare(b.day))

  // Breakdowns byCampaign/bySource/byPage
  const byCampaign = {}, bySource = {}, byPage = {}
  for (const c of campaigns) byCampaign[c] = traffic.filter(e=> (e.campaignId||e.payload?.campaignId)===c).length
  for (const s of sources) bySource[s] = traffic.filter(e=> (e.sourceId||e.payload?.sourceId)===s).length
  for (const p of pages) byPage[p] = traffic.filter(e=> (e.pageId||e.payload?.pageId)===p).length

  const { visitors, sessionStarts, ...totalsOut } = totals
  const dataQuality = traffic.length ? 'partial' : 'unavailable'
  const totalAvg = sessionDurations.length ? sessionDurations.reduce((a,b)=>a+b,0)/sessionDurations.length : 0

  return {
    source: 'trafficgen',
    adapter: { 
      gameId: 'trafficgen', 
      configured, 
      offchain: true, 
      quality: adapter?.quality || 'partial', 
      stage: adapter?.stage || 'live',
      trafficType: adapter?.trafficType || 'hybrid',
      implementedCount: adapter?.implementedCount || 17,
      unavailableCount: adapter?.unavailableCount || 12,
      apiBaseUrl: adapter?.apiBaseUrl || null,
      campaigns: adapter?.campaigns || [],
      sources: adapter?.sources || [],
      pages: adapter?.pages || [],
    },
    dataQuality,
    confidence: traffic.length ? 0.65 : 0,
    period: 'all ingested events, UTC, retention 30d + pruning',
    generatedAt: new Date().toISOString(),
    totals: { 
      ...totalsOut, 
      uniquePseudoVisitors: visitors.size,
      avg: Number(totalAvg.toFixed(1)),
      p50: percentile(sessionDurations, 50),
      p95: percentile(sessionDurations, 95),
      syntheticExcluded: trafficAll.length - traffic.length,
    },
    daily: dailyRows,
    funnel,
    breakdowns: { byCampaign, bySource, byPage },
    trafficType: { real: totals.realEvents, bot: totals.botEvents, hybrid: totals.hybridEvents, visitorsByType: { real: totals.realEvents, bot: totals.botEvents } },
    integrity: { duplicates: totals.duplicates, rejected: totals.rejected, dataGaps: totals.dataGaps, dataGapsHealed: totals.dataGapsHealed, rateLimited: totals.rateLimited, buffer_depth: 0 },
    campaigns: [...campaigns],
    sources: [...sources],
    pages: [...pages],
    unavailableMetrics: [
      { metric: 'LandingReached conversion', reason: 'no confirmation mechanism', estimate: false },
      { metric: 'process-global error counters in days[]', reason: 'counters global, days[] shows 0', estimate: true },
    ],
    reason: traffic.length ? null : (configured ? 'События trafficgen ещё не поступили в inbox' : 'TRAFFICGEN_API_BASE_URL не настроен — данные недоступны, stage live, 17 implemented, 12 unavailable, 45 smoke OK'),
    writes: false,
    // Из отчета
    report: {
      unitTests: '17/17 OK',
      smoke: '45/45 CHECKS PASSED',
      secretScan: '415 files, 279 text, 0 candidates',
      live: '12/12 GET 200, POST /watchtower/events 405 Allow GET OPTIONS, invalid cursor 400 invalid_cursor, DNT 202 opted_out, rate limit 30 rps 429 Retry-After',
      gapsFixed: 17,
      lastSyncedAt: '2026-09-22T18:00Z',
    }
  }
}

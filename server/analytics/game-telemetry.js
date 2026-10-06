import { eventGameId, eventLocationId, LOCATION_FIELDS } from '../ingestion/location.js'

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

function eventTime(event) {
  const raw = event?.timestamp || event?.observedAt || event?.blockTime || null
  if (raw === null || raw === undefined || raw === '') return null
  const numeric = typeof raw === 'number' ? raw : (typeof raw === 'string' && /^\d{10,13}$/.test(raw) ? Number(raw) : null)
  const parsed = numeric !== null ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric) : Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function timelineFor(events, { windowDays, now }) {
  const hourly = windowDays <= 1
  const bucketMs = hourly ? HOUR_MS : DAY_MS
  const bucketCount = hourly ? 24 : Math.min(90, windowDays)
  const start = now - bucketCount * bucketMs
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const at = start + index * bucketMs
    const date = new Date(at + bucketMs)
    return {
      startAt: new Date(at).toISOString(),
      label: hourly
        ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
      events: 0,
    }
  })
  for (const event of events) {
    const at = eventTime(event)
    if (at === null || at < start || at > now) continue
    const index = Math.min(bucketCount - 1, Math.floor((at - start) / bucketMs))
    if (index >= 0) buckets[index].events += 1
  }
  return buckets
}

function eventTypeCounts(events) {
  const counts = new Map()
  for (const event of events) {
    const type = typeof event?.eventType === 'string' && event.eventType ? event.eventType : 'Unknown'
    counts.set(type, (counts.get(type) || 0) + 1)
  }
  const ordered = [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
  return {
    items: ordered.slice(0, 20),
    typesTotal: ordered.length,
    omittedTypes: Math.max(0, ordered.length - 20),
  }
}

function dataQualityCounts(events) {
  const counts = { complete: 0, partial: 0, unavailable: 0, unspecified: 0 }
  for (const event of events) {
    const quality = event?.dataQuality
    if (Object.hasOwn(counts, quality)) counts[quality] += 1
    else counts.unspecified += 1
  }
  return counts
}

function summarizeLocation(id, events, options) {
  const times = events.map(eventTime).filter((value) => value !== null)
  const lastTime = times.reduce((latest, value) => Math.max(latest, value), Number.NEGATIVE_INFINITY)
  return {
    id,
    events: events.length,
    timedEvents: times.length,
    lastEventAt: times.length ? new Date(lastTime).toISOString() : null,
    eventTypes: eventTypeCounts(events),
    timeline: timelineFor(events, options),
    dataQuality: events.length ? 'partial' : 'unavailable',
  }
}

/**
 * Return aggregate-only telemetry for a game. Player keys and payloads are never
 * included. Location numbers are emitted only for explicit location tags.
 */
export function summarizeGameTelemetry({ events = [], gameId, locationId = null, windowDays = 7, now = Date.now() } = {}) {
  const days = Number.isFinite(Number(windowDays)) ? Math.min(365, Math.max(1, Math.floor(Number(windowDays)))) : 7
  const from = now - days * DAY_MS
  const inWindow = events.filter((event) => {
    if (gameId && eventGameId(event) !== gameId) return false
    const at = eventTime(event)
    return at === null || (at >= from && at <= now)
  })
  const timed = inWindow.map((event) => ({ event, at: eventTime(event) })).filter((item) => item.at !== null)
  const times = timed.map((item) => item.at)
  const firstTime = times.reduce((earliest, value) => Math.min(earliest, value), Number.POSITIVE_INFINITY)
  const lastTime = times.reduce((latest, value) => Math.max(latest, value), Number.NEGATIVE_INFINITY)
  const locationGroups = new Map()
  for (const event of inWindow) {
    const id = eventLocationId(event)
    if (!id) continue
    if (!locationGroups.has(id)) locationGroups.set(id, [])
    locationGroups.get(id).push(event)
  }
  const allLocations = [...locationGroups.entries()]
    .map(([id, rows]) => summarizeLocation(id, rows, { windowDays: days, now }))
    .sort((a, b) => b.events - a.events || a.id.localeCompare(b.id))
  const locations = allLocations.slice(0, 20)
  const selectedRows = locationId ? locationGroups.get(String(locationId)) || [] : null
  const taggedEvents = [...locationGroups.values()].reduce((sum, rows) => sum + rows.length, 0)
  const taggedCoverage = inWindow.length ? taggedEvents / inWindow.length : null
  const omittedLocationEvents = allLocations.slice(20).reduce((sum, location) => sum + location.events, 0)
  const typeCounts = eventTypeCounts(inWindow)
  const allQuality = dataQualityCounts(inWindow)

  return {
    gameId: gameId || null,
    windowDays: days,
    generatedAt: new Date(now).toISOString(),
    source: 'event-inbox',
    scope: gameId ? 'game' : 'studio',
    totalEvents: inWindow.length,
    timedEvents: timed.length,
    untimedEvents: inWindow.length - timed.length,
    firstEventAt: times.length ? new Date(firstTime).toISOString() : null,
    lastEventAt: times.length ? new Date(lastTime).toISOString() : null,
    eventTypes: typeCounts.items,
    eventTypeCoverage: { totalTypes: typeCounts.typesTotal, omittedTypes: typeCounts.omittedTypes },
    dataQualityCounts: allQuality,
    dataQuality: !inWindow.length ? 'unavailable' : allQuality.complete === inWindow.length ? 'complete' : 'partial',
    timeline: timelineFor(inWindow, { windowDays: days, now }),
    locationCoverage: {
      taggedEvents,
      untaggedEvents: inWindow.length - taggedEvents,
      totalLocations: allLocations.length,
      omittedLocationEvents,
      ratio: taggedCoverage,
      recognizedFields: [...LOCATION_FIELDS].map((field) => `payload.${field}`).concat(['event.regionId', 'event.locationId']),
      quality: taggedEvents ? 'partial' : 'unavailable',
      note: taggedEvents ? null : 'В окне нет событий с явным regionId/locationId; активность нельзя распределить по районам.',
    },
    locations,
    selectedLocation: locationId ? summarizeLocation(String(locationId), selectedRows, { windowDays: days, now }) : null,
  }
}

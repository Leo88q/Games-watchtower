/**
 * Canonical location tags carried by an ingested game event. These tags are
 * descriptive routing metadata, not proof that every event is instrumented.
 */
export const LOCATION_FIELDS = Object.freeze(['regionId', 'locationId', 'region', 'location'])

function tagValue(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const tag = String(value).trim()
  return tag ? tag.slice(0, 128) : null
}

export function eventLocationId(event) {
  const payload = event?.payload || {}
  return tagValue(event?.regionId)
    || tagValue(event?.locationId)
    || LOCATION_FIELDS.map((field) => tagValue(payload[field])).find(Boolean)
    || null
}

export function eventGameId(event) {
  return event?.gameId || event?.payload?.gameId || event?.app || event?.source || null
}

export function matchesEventLocation(event, locationId) {
  return !locationId || eventLocationId(event) === String(locationId)
}

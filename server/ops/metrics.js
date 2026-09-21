import { inboxStatus } from '../ingestion/event-inbox.js'

export function prometheusMetrics() {
  const status = inboxStatus()
  return [
    '# HELP watchtower_ingestion_events_total Number of accepted normalized events',
    '# TYPE watchtower_ingestion_events_total gauge',
    `watchtower_ingestion_events_total ${status.events}`,
    '# HELP watchtower_ingestion_duplicates_total Duplicate events rejected by identity',
    '# TYPE watchtower_ingestion_duplicates_total counter',
    `watchtower_ingestion_duplicates_total ${status.duplicates}`,
    '# HELP watchtower_ingestion_rejected_total Invalid events rejected by schema validation',
    '# TYPE watchtower_ingestion_rejected_total counter',
    `watchtower_ingestion_rejected_total ${status.rejected}`,
    '# HELP watchtower_blockchain_writes_enabled Whether blockchain writes are enabled',
    '# TYPE watchtower_blockchain_writes_enabled gauge',
    'watchtower_blockchain_writes_enabled 0',
  ].join('\n') + '\n'
}

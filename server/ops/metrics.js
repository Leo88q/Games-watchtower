/**
 * Prometheus-метрики процесса: приём событий, свежесть данных, ошибки, лимиты, латентность.
 * Отдельно публикуется метрика «сколько секунд назад пришло последнее событие» —
 * для хаба мониторинга тишина обязана быть видна как отказ, а не как «всё хорошо».
 */

import { inboxStatus, freshness } from '../ingestion/event-inbox.js'
import { auditLog } from '../security/access.js'
import { CAPABILITIES } from '../security/capabilities.js'

const latencyBuckets = [5, 25, 100, 500, 1000, 5000]
const stats = {
  requests: 0,
  responses: new Map(), // status -> count
  rateLimited: 0,
  authRejected: 0,
  latency: new Map(latencyBuckets.map((bucket) => [bucket, 0])),
  latencySumMs: 0,
  latencyMaxMs: 0,
}

export function observeRequest({ status, durMs, rejectedVersion = null }) {
  stats.requests += 1
  stats.responses.set(status, (stats.responses.get(status) || 0) + 1)
  if (status === 429) stats.rateLimited += 1
  if (status === 401 || status === 403 || status === 503) stats.authRejected += 1
  const value = Number.isFinite(durMs) ? durMs : 0
  stats.latencySumMs += value
  stats.latencyMaxMs = Math.max(stats.latencyMaxMs, value)
  for (const bucket of latencyBuckets) if (value <= bucket) stats.latency.set(bucket, stats.latency.get(bucket) + 1)
  return rejectedVersion
}

export function resetMetricsForTests() {
  stats.requests = 0
  stats.responses.clear()
  stats.rateLimited = 0
  stats.authRejected = 0
  stats.latencySumMs = 0
  stats.latencyMaxMs = 0
  for (const bucket of latencyBuckets) stats.latency.set(bucket, 0)
}

function escapeHelp(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n')
}

export function prometheusMetrics({ config = {}, startedAt = Date.now(), now = Date.now() } = {}) {
  const status = inboxStatus(now)
  const fresh = freshness({ maxAgeSeconds: config.readyMaxStaleSeconds || 0, now })
  const processMemory = process.memoryUsage()
  const lines = []

  const gauge = (name, help, value, labels = '') => {
    lines.push(`# HELP ${name} ${escapeHelp(help)}`)
    lines.push(`# TYPE ${name} gauge`)
    lines.push(`${name}${labels} ${value}`)
  }
  const counter = (name, help, value, labels = '') => {
    lines.push(`# HELP ${name} ${escapeHelp(help)}`)
    lines.push(`# TYPE ${name} counter`)
    lines.push(`${name}${labels} ${value}`)
  }

  gauge('watchtower_build_info', 'Версия и режим сборки', 1, `{mode="${config.provider || 'unknown'}",env="${config.nodeEnv || 'unknown'}"}`)
  gauge('watchtower_uptime_seconds', 'Время работы процесса', Math.round((now - startedAt) / 1000))
  gauge('watchtower_ingestion_events_total', 'Событий в inbox', status.events)
  counter('watchtower_ingestion_accepted_total', 'Принятые события', status.accepted)
  counter('watchtower_ingestion_duplicates_total', 'Дубликаты, отклонённые по identity', status.duplicates)
  counter('watchtower_ingestion_rejected_total', 'События, отклонённые валидацией', status.rejected)
  counter('watchtower_ingestion_evicted_total', 'События, вытесненные retention', status.evictedByLimit + status.evictedByTtl, `{reason="limit"}`)
  counter('watchtower_ingestion_evicted_total', 'События, вытесненные retention', status.evictedByTtl, `{reason="ttl"}`)
  gauge('watchtower_inbox_capacity_ratio', 'Заполнение хранилища событий (0..1)', status.maxEvents ? Number((status.events / status.maxEvents).toFixed(4)) : 0)
  gauge('watchtower_last_event_age_seconds', 'Секунд с последнего принятого события (-1 = данных не было)', fresh.ageSeconds === null ? -1 : fresh.ageSeconds)
  gauge('watchtower_data_stale', '1, если данные устарели относительно порога readiness', fresh.stale ? 1 : 0)
  gauge('watchtower_blockchain_writes_enabled', 'Разрешены ли записи в блокчейн', CAPABILITIES.blockchainWrites ? 1 : 0)
  gauge('watchtower_process_resident_memory_bytes', 'RSS процесса', processMemory.rss)
  gauge('watchtower_process_heap_used_bytes', 'Использовано heap', processMemory.heapUsed)

  counter('watchtower_http_requests_total', 'Всего HTTP-запросов', stats.requests)
  for (const [code, count] of [...stats.responses.entries()].sort()) {
    counter('watchtower_http_responses_total', 'Ответы по кодам', count, `{status="${code}"}`)
  }
  counter('watchtower_http_rate_limited_total', 'Запросы, отклонённые лимитом', stats.rateLimited)
  counter('watchtower_http_auth_rejected_total', 'Запросы, отклонённые аутентификацией', stats.authRejected)
  gauge('watchtower_http_request_duration_ms_sum', 'Суммарная длительность обработки запросов (мс)', stats.latencySumMs)
  gauge('watchtower_http_request_duration_ms_max', 'Максимальная длительность запроса (мс)', stats.latencyMaxMs)
  for (const bucket of latencyBuckets) {
    counter('watchtower_http_request_duration_ms_bucket', 'Гистограмма длительности запросов', stats.latency.get(bucket), `{le="${bucket}"}`)
  }
  gauge('watchtower_audit_entries', 'Записей в журнале доступа', auditLog().length)

  return `${lines.join('\n')}\n`
}

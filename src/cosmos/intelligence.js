// Pure helpers for the per-game intelligence views. Values are never inferred from
// missing inputs: every proxy carries its formula and source, and scenario output
// is deliberately labelled as a linear what-if rather than a model forecast.

export const INTEL_WINDOWS = [
  { id: '24h', label: '24 часа', days: 1 },
  { id: '7d', label: '7 дней', days: 7 },
  { id: '30d', label: '30 дней', days: 30 },
  { id: '90d', label: '90 дней', days: 90 },
]

export const ECONOMY_FAMILIES = [
  { id: 'supply', label: 'Снабжение и эмиссия', why: 'Лимит предложения, чистая эмиссия и usage-tied burn.' },
  { id: 'flows', label: 'Источники и стоки', why: 'Показывает, зарабатывают ли игроки ценность и тратят ли её внутри игры.' },
  { id: 'velocity', label: 'Скорость обращения', why: 'Оборот, срок удержания и доля неактивного предложения.' },
  { id: 'players', label: 'Игроки и монетизация', why: 'Активность кошельков, новые игроки, сессии, траты и время до награды.' },
  { id: 'revenue', label: 'Выручка и казна', why: 'Финансовые факты, стабильность выручки и запас казны.' },
  { id: 'fairness', label: 'Справедливость', why: 'Неравенство заработка и зависимость от крупнейших кошельков.' },
  { id: 'risk', label: 'Риски и ликвидность', why: 'Боты, извлечение, ликвидность, проскальзывание и Sybil-сигналы.' },
  { id: 'cross', label: 'Переплетение игр', why: 'Доля общих игроков и фактические потоки между играми.' },
]

const PERCENT_METRICS = new Set([
  'burn_ratio', 'consumption_share', 'new_wallets_share', 'paying_conversion',
  'stablecoin_share', 'cosmetic_share', 'top10_share', 'whale_dependency',
  'bot_activity_share', 'extractive_pattern_index', 'cross_game_player_share',
])

export function metricById(economy, id) {
  return (economy?.metrics || []).find((metric) => metric.id === id) || null
}

export function metricAvailable(metric) {
  return Boolean(metric && metric.quality !== 'unavailable' && metric.value !== null && metric.value !== undefined && Number.isFinite(Number(metric.value)))
}

const numberText = (value, maxFractionDigits = 2) => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: maxFractionDigits })

export function formatMetricValue(metric) {
  if (!metricAvailable(metric)) return 'нет данных'
  const value = Number(metric.value)
  if (PERCENT_METRICS.has(metric.id) || metric.unit === '%') return `${numberText(value * (metric.unit === '%' ? 1 : 100), 2)}%`
  if (metric.id === 'sink_source_ratio' || metric.unit === 'ratio') return `${numberText(value, 3)}×`
  if (metric.unit === 'USD') return `$${numberText(value, 2)}`
  if (metric.unit === 'index') return numberText(value, 4)
  if (metric.unit === 'days') return `${numberText(value, 2)} дн.`
  if (metric.unit === 'hours') return `${numberText(value, 2)} ч`
  if (metric.unit === 'turns/day') return `${numberText(value, 4)} об./день`
  if (metric.unit === 'x/year') return `${numberText(value, 2)}×/год`
  const suffix = metric.unit === 'units' ? ' ед.' : metric.unit === 'wallets' ? ' кош.' : metric.unit === 'sessions' ? ' сесс.' : metric.unit ? ` ${metric.unit}` : ''
  return `${numberText(value, 2)}${suffix}`
}

/**
 * Secondary ratios available from the per-game economy response.
 * These are explicitly called proxies; they do not pretend to be retention, LTV,
 * or player-level forecasts when the required data is absent.
 */
export function deriveIndirectMetrics(economy) {
  const inputs = economy?.inputs || {}
  const windowDays = Number(economy?.windowDays) || INTEL_WINDOWS.find((window) => window.id === economy?.window)?.days || 7
  const eventsValue = inputs.eventsTotal
  const events = eventsValue !== null && eventsValue !== undefined && eventsValue !== '' && Number.isFinite(Number(eventsValue)) ? Number(eventsValue) : null
  const active = metricById(economy, 'active_wallets')
  const minted = metricById(economy, 'total_minted')
  const netIssuance = metricById(economy, 'net_issuance')
  const volume = metricById(economy, 'sources_total')
  const rows = []

  rows.push({
    id: 'events_per_day_proxy',
    label: 'Плотность событий',
    value: events !== null && events > 0 ? events / windowDays : null,
    display: events !== null && events > 0 ? `${numberText(events / windowDays, 2)} / день` : 'нет данных',
    formula: 'принятые события по игре / длина окна',
    source: `event-inbox · ${windowDays} дн.`,
    quality: events !== null && events > 0 ? 'partial' : 'unavailable',
  })

  rows.push({
    id: 'events_per_wallet_proxy',
    label: 'Событий на активный кошелёк',
    value: events > 0 && metricAvailable(active) && Number(active.value) > 0 ? events / Number(active.value) : null,
    display: events > 0 && metricAvailable(active) && Number(active.value) > 0 ? numberText(events / Number(active.value), 2) : 'нет данных',
    formula: 'события в окне / активные кошельки; прокси глубины активности',
    source: 'event-inbox / active_wallets',
    quality: events > 0 && metricAvailable(active) && Number(active.value) > 0 ? 'partial' : 'unavailable',
  })

  rows.push({
    id: 'mint_per_wallet_proxy',
    label: 'Выпуск на активный кошелёк',
    value: metricAvailable(minted) && metricAvailable(active) && Number(active.value) > 0 ? Number(minted.value) / Number(active.value) : null,
    display: metricAvailable(minted) && metricAvailable(active) && Number(active.value) > 0 ? `${numberText(Number(minted.value) / Number(active.value), 3)} ед.` : 'нет данных',
    formula: 'mint / активные кошельки; не равен пользовательской награде без атрибуции действий',
    source: 'TokenMinted / active_wallets',
    quality: metricAvailable(minted) && metricAvailable(active) && Number(active.value) > 0 ? 'partial' : 'unavailable',
  })

  rows.push({
    id: 'net_issuance_per_wallet_proxy',
    label: 'Чистая эмиссия на активный кошелёк',
    value: metricAvailable(netIssuance) && metricAvailable(active) && Number(active.value) > 0 ? Number(netIssuance.value) / Number(active.value) : null,
    display: metricAvailable(netIssuance) && metricAvailable(active) && Number(active.value) > 0 ? `${numberText(Number(netIssuance.value) / Number(active.value), 3)} ед.` : 'нет данных',
    formula: '(mint − burn) / активные кошельки',
    source: 'total_minted, total_burned / active_wallets',
    quality: metricAvailable(netIssuance) && metricAvailable(active) && Number(active.value) > 0 ? 'partial' : 'unavailable',
  })

  rows.push({
    id: 'source_per_wallet_proxy',
    label: 'Источники на активный кошелёк',
    value: metricAvailable(volume) && metricAvailable(active) && Number(active.value) > 0 ? Number(volume.value) / Number(active.value) : null,
    display: metricAvailable(volume) && metricAvailable(active) && Number(active.value) > 0 ? `${numberText(Number(volume.value) / Number(active.value), 3)} ед.` : 'нет данных',
    formula: 'начисления и входящие потоки / активные кошельки',
    source: 'sources_total / active_wallets',
    quality: metricAvailable(volume) && metricAvailable(active) && Number(active.value) > 0 ? 'partial' : 'unavailable',
  })

  return rows
}

/** A conservative, clearly labelled linear what-if based on observed mint/burn. */
export function economyScenario(economy, horizonDays = 30) {
  const minted = metricById(economy, 'total_minted')
  const burned = metricById(economy, 'total_burned')
  const windowDays = Number(economy?.windowDays) || INTEL_WINDOWS.find((window) => window.id === economy?.window)?.days || 0
  const observedEvents = Number(economy?.inputs?.eventsTotal) || 0
  if (!windowDays || observedEvents <= 0 || !metricAvailable(minted) || !metricAvailable(burned)) {
    return {
      available: false,
      reason: 'Для сценария нужны события игры и рассчитанные показатели mint и burn за окно.',
      horizonDays,
    }
  }
  const dailyMint = Number(minted.value) / windowDays
  const dailyBurn = Number(burned.value) / windowDays
  const dailyNet = dailyMint - dailyBurn
  return {
    available: true,
    horizonDays,
    windowDays,
    dailyMint,
    dailyBurn,
    dailyNet,
    projectedMint: dailyMint * horizonDays,
    projectedBurn: dailyBurn * horizonDays,
    projectedNet: dailyNet * horizonDays,
    observedEvents,
    quality: 'partial',
    method: 'linear run-rate scenario',
    caveat: 'Сценарий «если темп окна сохранится», не ML-прогноз и не обещание результата; не учитывает сезонность и внешние изменения.',
  }
}

/** Turn existing economy-engine thresholds into restrained, auditable observations. */
export function analyzeEconomy(economy) {
  if (!economy || !(Number(economy.inputs?.eventsTotal) > 0)) {
    return [{ kind: 'info', title: 'Недостаточно наблюдений', detail: 'За выбранное окно нет событий этой игры. Выводы, здоровье экономики и прогноз не подменяются нулями.' }]
  }
  const insights = []
  const index = economy.index
  if (Number.isFinite(index?.score)) {
    insights.push({ kind: index.status === 'critical' ? 'warn' : 'info', title: `Индекс здоровья экономики: ${index.score}/100`, detail: `Статус «${index.status}», компонентов учтено ${index.components?.length || 0}. Индекс не показывается, если компонентов недостаточно.` })
  }
  const sinkSource = metricById(economy, 'sink_source_ratio')
  if (metricAvailable(sinkSource)) {
    const value = Number(sinkSource.value)
    insights.push({
      kind: value < 0.5 ? 'warn' : 'info',
      title: value < 0.5 ? 'Стоки заметно ниже источников' : value >= 0.8 ? 'Стоки близки к внутреннему ориентиру' : 'Стоки и источники требуют наблюдения',
      detail: `${numberText(value, 3)}× при ориентирах движка: ≥ 0,8 — устойчивее; < 0,5 — риск инфляционного перекоса.`,
    })
  }
  const burn = metricById(economy, 'burn_ratio')
  if (metricAvailable(burn)) {
    const value = Number(burn.value)
    insights.push({ kind: value < 0.5 ? 'warn' : 'info', title: value < 0.5 ? 'Сжигание ниже ориентира движка' : 'Сжигание достигает ориентира движка', detail: `${numberText(value * 100, 1)}% от выпуска; сравнительный ориентир в экономическом индексе — 50%.` })
  }
  const bots = metricById(economy, 'bot_activity_share')
  if (metricAvailable(bots)) {
    const value = Number(bots.value)
    insights.push({ kind: value >= 0.3 ? 'warn' : 'info', title: value >= 0.3 ? 'Повышенная доля событий с бот-маркером' : 'Доля событий с бот-маркером ниже порога тревоги', detail: `${numberText(value * 100, 1)}%; порог live-alert движка — 30%. Это сигнал по разметке событий, не доказательство злоупотребления.` })
  }
  const gini = metricById(economy, 'gini_earnings')
  if (metricAvailable(gini)) {
    const value = Number(gini.value)
    insights.push({ kind: value >= 0.75 ? 'warn' : 'info', title: value >= 0.75 ? 'Высокая концентрация заработка' : 'Распределение заработка измеряется', detail: `Gini ${numberText(value, 3)}; экономический индекс использует veto-порог Gini ≥ 0,75.` })
  }
  const extraction = metricById(economy, 'extractive_pattern_index')
  if (metricAvailable(extraction)) {
    const value = Number(extraction.value)
    insights.push({ kind: value >= 0.7 ? 'warn' : 'info', title: value >= 0.7 ? 'Паттерн извлечения выше порога индекса' : 'Паттерн извлечения измеряется', detail: `${numberText(value * 100, 1)}%; высокий индекс может означать преобладание выводов над внутриигровым потреблением.` })
  }
  return insights.length ? insights : [{ kind: 'info', title: 'Факты собраны, пороговых выводов пока нет', detail: 'Смотрите доступные метрики, их формулы и покрытие; отсутствие тревоги не является доказательством отсутствия риска.' }]
}

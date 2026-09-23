// ЭКОНОМИЧЕСКИЕ МЕТРИКИ ЭКОСИСТЕМЫ (Watchtower Economy Engine v1)
//
// Считает экономику студии из принятых событий и явной конфигурации (supply, caps, prices, treasury).
// Принципы:
//   1. Ни одного «нарисованного» числа: если входных данных нет — метрика unavailable с причиной и списком нужных событий.
//   2. У каждой метрики есть формула, источник, окно агрегации и часовой пояс (UTC).
//   3. Все расчёты — чистые функции: их можно проверить тестами (scripts/economy-metrics.test.mjs).
//   4. Учитываются особенности 2026: capped supply и headroom, usage-tied burns, stablecoin-выручка,
//      cosmetic-led монетизация, доля извлечения (extraction) против потребления, sybil/бот-фильтрация,
//      газлесс-исполнение (плата за действия не в SOL, а в compute units).

export const TIMEZONE = 'UTC'

export const WINDOWS = [
  { id: '24h', days: 1, label: '24 часа' },
  { id: '7d', days: 7, label: '7 дней' },
  { id: '30d', days: 30, label: '30 дней' },
  { id: '90d', days: 90, label: '90 дней' },
]

const DAY_MS = 86_400_000

// ---------------------------------------------------------------------------
// Классификация событий
// ---------------------------------------------------------------------------
const EVENT_CLASS = {
  // эмиссия и сжигание
  TokenMinted: 'mint', ResourceMinted: 'mint', ChipMinted: 'mint', ItemMinted: 'mint',
  TokenBurned: 'burn', ResourceBurned: 'burn', BurnExecuted: 'burn',
  // источники (заработал в игре)
  PotatoHarvested: 'source', CropHarvested: 'source', HarvestCompleted: 'source',
  RewardGranted: 'reward', QuestCompleted: 'source', PositionCollected: 'source',
  // стоки (потратил в игре)
  CraftCompleted: 'sink', ForgeCompleted: 'sink', PackOpened: 'sink', UpgradeCompleted: 'sink',
  StakePlaced: 'sink',
  // сделки и комиссии
  MarketOrderCompleted: 'trade', MarketOrderPlaced: 'trade', ItemTraded: 'trade', TradeSettled: 'trade',
  FeeCharged: 'fee', RoyaltyPaid: 'fee', MarketplaceFee: 'fee',
  // вывод ценности из системы
  Withdrawal: 'extract', ClaimExecuted: 'extract', PayoutSent: 'extract', BridgeOut: 'extract',
  // вход ценности
  Deposit: 'inject', BridgeIn: 'inject',
  // прочее
  TreasuryChanged: 'treasury', Transfer: 'transfer', WalletConnected: 'identity', PlayerJoined: 'identity',
}

export function classifyEvent(event) {
  const type = event?.eventType || event?.event_type || 'Unknown'
  return { type, class: EVENT_CLASS[type] || 'other' }
}

export function eventTime(event) {
  const raw = event?.observedAt || event?.timestamp || (event?.blockTime ? event.blockTime * 1000 : null)
  const parsed = raw ? new Date(raw).getTime() : NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function eventAmount(event) {
  const p = event?.payload || {}
  const direct = [p.amount, p.value, p.qty, p.quantity, p.reward, p.burned]
  for (const candidate of direct) {
    const n = Number(candidate)
    if (Number.isFinite(n) && n !== 0) return Math.abs(n)
  }
  if (Number.isFinite(Number(p.price)) && Number.isFinite(Number(p.qty))) return Math.abs(Number(p.price) * Number(p.qty))
  return 0
}

export function eventPlayer(event) {
  const p = event?.payload || {}
  return p.playerKey || p.wallet || p.owner || event?.playerKey || null
}

export function eventAsset(event) {
  const p = event?.payload || {}
  return p.mint || p.asset || p.currency || p.token || 'GAME'
}

export function eventGame(event) {
  const p = event?.payload || {}
  return p.gameId || event?.app || event?.source || 'unknown'
}

export function isBot(event) {
  const p = event?.payload || {}
  return p.bot === true || p.sourceType === 'bot' || p.synthetic === true
}

// ---------------------------------------------------------------------------
// Математика (чистые функции — покрыты тестами)
// ---------------------------------------------------------------------------
export function gini(values) {
  const list = values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b)
  const n = list.length
  if (n === 0) return null
  const sum = list.reduce((a, b) => a + b, 0)
  if (sum === 0) return 0
  let cumulative = 0
  for (let i = 0; i < n; i += 1) cumulative += (i + 1) * list[i]
  return Number(((2 * cumulative) / (n * sum) - (n + 1) / n).toFixed(4))
}

export function topShare(values, fraction = 0.1) {
  const list = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => b - a)
  const total = list.reduce((a, b) => a + b, 0)
  if (!list.length || total === 0) return null
  const count = Math.max(1, Math.ceil(list.length * fraction))
  return Number((list.slice(0, count).reduce((a, b) => a + b, 0) / total).toFixed(4))
}

export function herfindahl(shares) {
  const list = shares.filter((s) => Number.isFinite(s) && s > 0)
  if (!list.length) return null
  return Number(list.reduce((acc, s) => acc + s * s, 0).toFixed(4))
}

export function annualizeDaily(rate) {
  if (!Number.isFinite(rate)) return null
  return Number(((1 + rate) ** 365 - 1).toFixed(4))
}

export function safeRatio(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null
  return Number((a / b).toFixed(4))
}

// ---------------------------------------------------------------------------
// Сборка метрик
// ---------------------------------------------------------------------------
function metric(def) {
  const { id, label, family, value, unit, quality, reason, formula, source, needs = [], novelties = [], extra = {} } = def
  // Честность: у любой недоступной метрики обязана быть причина, иначе её нельзя проверить.
  const reasonText = reason || (quality === 'unavailable'
    ? (needs.length ? `Нет данных: нужны события ${needs.join(', ')}` : 'Нет данных: события за окно не поступали')
    : null)
  return {
    id, label, family,
    value: quality === 'unavailable' ? null : value,
    unit: unit || null,
    quality,
    reason: reasonText,
    formula,
    source,
    window: def.window,
    timezone: TIMEZONE,
    needs,
    novelties,
    ...extra,
  }
}

const U = (id, label, family, formula, source, needs, extra = {}) =>
  metric({ id, label, family, formula, source, needs, quality: 'unavailable', reason: extra.reason || 'Нет данных: игры не подключены или события не поступали', ...extra })

const ok = (id, label, family, value, unit, formula, source, extra = {}) =>
  metric({ id, label, family, value, unit, formula, source, quality: extra.quality || 'complete', ...extra })

export function computeEconomy({ events = [], window = '7d', now = Date.now(), config = {}, demo = false } = {}) {
  const win = WINDOWS.find((w) => w.id === window) || WINDOWS[1]
  const from = now - win.days * DAY_MS
  const inWindow = events.filter((event) => {
    const t = eventTime(event)
    return t !== null && t >= from && t <= now
  })
  const human = inWindow.filter((event) => !isBot(event))

  // --- агрегаты по классам
  const acc = { mint: 0, burn: 0, source: 0, reward: 0, sink: 0, trade: 0, fee: 0, extract: 0, inject: 0 }
  const sinkMix = new Map()
  const perPlayerEarnings = new Map()
  const perPlayerSpend = new Map()
  const firstSeen = new Map()
  const firstEarn = new Map()
  const activeWallets = new Set()
  const assets = new Set()
  for (const event of human) {
    const { type, class: cls } = classifyEvent(event)
    const amount = eventAmount(event)
    if (cls in acc) acc[cls] += amount
    assets.add(eventAsset(event))
    const player = eventPlayer(event)
    const t = eventTime(event)
    if (player) {
      activeWallets.add(player)
      if (t !== null && (!firstSeen.has(player) || t < firstSeen.get(player))) firstSeen.set(player, t)
      if (t !== null && ['source', 'reward', 'mint'].includes(cls) && (!firstEarn.has(player) || t < firstEarn.get(player))) firstEarn.set(player, t)
      if (['source', 'reward'].includes(cls) && amount) perPlayerEarnings.set(player, (perPlayerEarnings.get(player) || 0) + amount)
      if (['sink', 'fee'].includes(cls) && amount) perPlayerSpend.set(player, (perPlayerSpend.get(player) || 0) + amount)
    }
    if (cls === 'sink' && amount) sinkMix.set(type, (sinkMix.get(type) || 0) + amount)
  }

  const sessions = new Set(human.filter((e) => e.payload?.sessionId).map((e) => e.payload.sessionId))
  const payers = new Set([...perPlayerSpend.entries()].filter(([, v]) => v > 0).map(([k]) => k))
  const wallets = [...perPlayerEarnings.values()]
  const earningsTotal = wallets.reduce((a, b) => a + b, 0)
  const spendTotal = [...perPlayerSpend.values()].reduce((a, b) => a + b, 0)
  const sourcesTotal = acc.source + acc.reward + acc.inject
  const sinksTotal = acc.sink + acc.fee + acc.burn

  const circulating = Number(config.circulating) || null
  const maxSupply = Number(config.maxSupply) || null
  const treasuryBalance = Number(config.treasuryBalance) || null
  const dailyBurn = Number(config.dailyBurn) || null
  const prices = config.prices || {}
  const usd = (amount, asset = 'GAME') => Number((amount * (Number(prices[asset]) || 0)).toFixed(2))
  const tradedUsd = Number(config.tradedVolumeUsd) || usd(acc.trade, config.mainAsset || 'GAME')
  const revenueUsd = Number(config.revenueUsd) || null
  const dau = activeWallets.size

  const metrics = []

  // ---------------------------------------------------------------- Снабжение
  metrics.push(ok('total_minted', 'Всего выпущено (mint)', 'supply', acc.mint, 'units',
    'Σ amount по событиям классов mint', 'TokenMinted / ResourceMinted', { window: win.id }))
  metrics.push(ok('total_burned', 'Всего сожжено (burn)', 'supply', acc.burn, 'units',
    'Σ amount по событиям класса burn', 'TokenBurned / ResourceBurned', { window: win.id }))
  metrics.push(ok('net_issuance', 'Чистая эмиссия', 'supply', Number((acc.mint - acc.burn).toFixed(2)), 'units',
    'mint − burn', 'TokenMinted, TokenBurned', { window: win.id }))
  metrics.push(ok('burn_ratio', 'Доля сжигания от выпуска', 'supply', safeRatio(acc.burn, acc.mint), 'ratio',
    'burn / mint', 'TokenBurned, TokenMinted', { window: win.id, quality: safeRatio(acc.burn, acc.mint) === null ? 'unavailable' : 'complete', novelties: ['usage-tied burn'] }))
  metrics.push(circulating
    ? ok('inflation_daily', 'Инфляция за день', 'supply', Number((((acc.mint - acc.burn) / circulating) / win.days * 100).toFixed(4)), '%',
        '((mint − burn) / circulating) / days × 100', 'TokenMinted/Burned + config.circulating', { window: win.id })
    : U('inflation_daily', 'Инфляция за день', 'supply', '((mint − burn) / circulating) / days × 100', 'нужен config.circulating', ['TokenMinted', 'TokenBurned', 'config.circulating'], { reason: 'Не задан circulating supply (WATCHTOWER_ECONOMY_CIRCULATING)' }))
  metrics.push(circulating
    ? ok('inflation_annualized', 'Инфляция (годовая, приведённая)', 'supply', annualizeDaily(((acc.mint - acc.burn) / circulating) / win.days), 'ratio',
        '(1 + daily_rate)^365 − 1', 'производная от inflation_daily', { window: win.id })
    : U('inflation_annualized', 'Инфляция (годовая, приведённая)', 'supply', '(1 + daily_rate)^365 − 1', 'нужен config.circulating', ['config.circulating']))
  metrics.push(maxSupply
    ? ok('cap_utilization', 'Использовано от лимита supply', 'supply', Number(((circulating || acc.mint) / maxSupply * 100).toFixed(2)), '%',
        '(circulating / maxSupply) × 100', 'config.maxSupply', { window: win.id, novelties: ['capped supply 2026'] })
    : U('cap_utilization', 'Использовано от лимита supply', 'supply', '(circulating / maxSupply) × 100', 'нужен config.maxSupply', ['config.maxSupply'], { reason: 'Не задан лимит supply' }))
  metrics.push(config.burnCadenceDays
    ? ok('burn_cadence_compliance', 'Регулярность сжигания', 'supply', Number((burnCadence(events, now, config.burnCadenceDays) * 100).toFixed(1)), '%',
        'доля ожидаемых циклов сжигания, где был хотя бы один burn', 'TokenBurned + config.burnCadenceDays', { window: '90d', novelties: ['public weekly burn cadence'] })
    : U('burn_cadence_compliance', 'Регулярность сжигания', 'supply', 'доля циклов с burn', 'нужен config.burnCadenceDays', ['TokenBurned', 'config.burnCadenceDays'], { reason: 'Не задан интервал циклов сжигания' }))

  // -------------------------------------------------------------------- Потоки
  metrics.push(ok('sources_total', 'Источники (заработано игроками)', 'flows', Number(sourcesTotal.toFixed(2)), 'units',
    'source + reward + inject', 'PotatoHarvested / CropHarvested / RewardGranted / Deposit', { window: win.id }))
  metrics.push(ok('sinks_total', 'Стоки (потрачено игроками)', 'flows', Number(sinksTotal.toFixed(2)), 'units',
    'sink + fee + burn', 'CraftCompleted / PackOpened / FeeCharged / TokenBurned', { window: win.id }))
  metrics.push(ok('sink_source_ratio', 'Отношение стоков к источникам', 'flows', safeRatio(sinksTotal, sourcesTotal), 'ratio',
    'sinks / sources; ≥ 0.8 — устойчиво, < 0.5 — риск инфляции', 'производная', { window: win.id })
    )
  metrics.push(sinkMix.size
    ? ok('sink_diversity', 'Разнообразие стоков', 'flows', Number((1 - (herfindahl([...sinkMix.values()].map((v) => v / [...sinkMix.values()].reduce((a, b) => a + b, 0))))).toFixed(4)), 'index',
        '1 − HHI(доли типов стоков); выше — меньше зависимости от одного стока', 'группировка sinks по типу', { window: win.id, quality: sinkMix.size > 1 ? 'complete' : 'partial' })
    : U('sink_diversity', 'Разнообразие стоков', 'flows', '1 − HHI(доли стоков)', 'нужны события-стоки', ['CraftCompleted', 'PackOpened', 'FeeCharged']))
  metrics.push(ok('consumption_share', 'Доля потребления (а не вывода)', 'flows', safeRatio(sinksTotal, sinksTotal + acc.extract), 'ratio',
    'sinks / (sinks + extract); 2026-фокус: экономика должна потреблять, а не выводить', 'sinks vs Withdrawal/ClaimExecuted', { window: win.id, novelties: ['consumption > extraction'] }))

  // ------------------------------------------------------------------ Скорость
  metrics.push(circulating && tradedUsd
    ? ok('velocity', 'Скорость обращения (velocity)', 'velocity', Number((tradedUsd / (circulating * (Number(prices[config.mainAsset] || 0) || 1)) / win.days).toFixed(4)), 'turns/day',
        '(объём торгов в USD / стоимость circulating) / дни', 'trade-события + config.prices + circulating', { window: win.id })
    : U('velocity', 'Скорость обращения (velocity)', 'velocity', '(объём торгов / circulating) / дни', 'нужны circulating, prices, trade', ['MarketOrderCompleted', 'config.circulating', 'config.prices']))
  metrics.push(circulating && tradedUsd
    ? ok('turnover_annualized', 'Оборачиваемость (годовая)', 'velocity', Number((tradedUsd / (circulating * (Number(prices[config.mainAsset] || 0) || 1)) * (365 / win.days)).toFixed(2)), 'x/year',
        'velocity × (365 / дни окна)', 'производная', { window: win.id })
    : U('turnover_annualized', 'Оборачиваемость (годовая)', 'velocity', 'velocity × 365/days', 'нужны circulating, prices', ['config.circulating']))
  metrics.push(circulating
    ? ok('dormant_supply_share', 'Доля «спящего» предложения', 'velocity', Number(((1 - Math.min(1, earningsTotal / circulating)) * 100).toFixed(2)), '%',
        '(1 − заработанное/активные в окне) × 100', 'доходы игроков + circulating', { window: win.id, quality: 'partial' })
    : U('dormant_supply_share', 'Доля «спящего» предложения', 'velocity', '(1 − active/circulating) × 100', 'нужен config.circulating', ['config.circulating']))
  metrics.push(U('holding_time_days', 'Среднее время удержания', 'velocity', 'среднее (t_spend − t_earn) по кошелькам', 'нужны связанные события earn→spend', ['RewardGranted', 'CraftCompleted'], { reason: 'Нужна связка earn→spend по одному кошельку с временем' }))

  // -------------------------------------------------------------- Игроки/выручка
  metrics.push(ok('active_wallets', 'Активные кошельки', 'players', dau, 'wallets',
    'уникальные игроки с событиями в окне (без ботов)', 'события human-only', { window: win.id }))
  metrics.push(sessions.size
    ? ok('sessions', 'Сессии', 'players', sessions.size, 'sessions', 'уникальные sessionId в окне', 'payload.sessionId', { window: win.id, quality: 'partial' })
    : U('sessions', 'Сессии', 'players', 'уникальные sessionId', 'нужны события с sessionId', ['SessionStarted', 'PageView', 'RaceStarted']))
  const newShare = activeWallets.size ? Number(([...firstSeen.keys()].filter((p) => (firstSeen.get(p) || 0) >= from).length / activeWallets.size).toFixed(4)) : null
  metrics.push(newShare !== null
    ? ok('new_wallets_share', 'Доля новых кошельков', 'players', newShare, 'ratio', 'новые в окне / все активные', 'первое появление игрока', { window: win.id, quality: 'partial' })
    : U('new_wallets_share', 'Доля новых кошельков', 'players', 'новые / активные', 'нужны события с playerKey', ['PlayerJoined', 'WalletConnected']))
  metrics.push(dau
    ? ok('paying_conversion', 'Конверсия в платящих', 'players', safeRatio(payers.size, dau), 'ratio',
        'платящие / активные; ориентир мобильных F2P ~2%', 'sink/fee события по кошелькам', { window: win.id, novelties: ['mobile F2P benchmark ~2%'] })
    : U('paying_conversion', 'Конверсия в платящих', 'players', 'платящие / активные', 'нужны события трат', ['CraftCompleted', 'PackOpened', 'FeeCharged']))
  const hoursObserved = win.days * 24
  metrics.push(earningsTotal
    ? ok('earn_per_hour', 'Заработок на игрока в час', 'players', Number((earningsTotal / dau / hoursObserved).toFixed(4)), 'units/hour',
        '(Σ заработанного / активные кошельки) / часы окна', 'source+reward события', { window: win.id, quality: 'partial', novelties: ['bot-farm signal'] })
    : U('earn_per_hour', 'Заработок на игрока в час', 'players', '(Σ earn / wallets) / hours', 'нужны события наград', ['RewardGranted', 'PotatoHarvested']))
  const latency = [...firstEarn.entries()].map(([p, t]) => {
    const start = firstSeen.get(p)
    return start !== undefined && t >= start ? (t - start) / 3_600_000 : null
  }).filter((v) => v !== null)
  metrics.push(latency.length
    ? ok('time_to_first_earn_hours', 'Время до первой награды', 'players', Number((latency.reduce((a, b) => a + b, 0) / latency.length).toFixed(2)), 'hours',
        'среднее (t_первая_награда − t_первое_появление)', 'связка identity→reward событий', { window: win.id, quality: 'partial' })
    : U('time_to_first_earn_hours', 'Время до первой награды', 'players', 'среднее t_reward − t_first_seen', 'нужна связка по кошельку', ['PlayerJoined', 'RewardGranted']))
  metrics.push(dau && revenueUsd
    ? ok('arpdau', 'Выручка на активного игрока (ARPDAU)', 'revenue', Number((revenueUsd / dau).toFixed(4)), 'USD',
        'выручка за окно / активные кошельки / дни', 'config.revenueUsd + события', { window: win.id })
    : U('arpdau', 'Выручка на активного игрока (ARPDAU)', 'revenue', 'выручка / DAU', 'нужна выручка', ['config.revenueUsd', 'FeeCharged']))
  metrics.push(circulating && earningsTotal
    ? ok('cost_of_emission_share', 'Доля эмиссии в предложении', 'revenue', Number((earningsTotal / circulating * 100).toFixed(2)), '%',
        'заработанное игроками / circulating × 100', 'награды + circulating', { window: win.id, quality: 'partial' })
    : U('cost_of_emission_share', 'Доля эмиссии в предложении', 'revenue', 'earn / circulating', 'нужен circulating', ['config.circulating']))

  // ------------------------------------------------------------- Казна и выручка
  metrics.push(revenueUsd
    ? ok('gross_revenue', 'Валовая выручка за окно', 'revenue', Number(revenueUsd.toFixed(2)), 'USD', 'сумма подтверждённой выручки', 'config.revenueUsd / FeeCharged', { window: win.id })
    : U('gross_revenue', 'Валовая выручка за окно', 'revenue', 'Σ подтверждённой выручки', 'нужна выручка', ['FeeCharged', 'config.revenueUsd']))
  metrics.push(config.stablecoinRevenueUsd
    ? ok('stablecoin_share', 'Доля выручки в стейблкоинах', 'revenue', Number((config.stablecoinRevenueUsd / (revenueUsd || config.stablecoinRevenueUsd) * 100).toFixed(2)), '%',
        'USDC-выручка / общая выручка × 100', 'config.stablecoinRevenueUsd', { window: win.id, novelties: ['stablecoin-first monetization 2026'] })
    : U('stablecoin_share', 'Доля выручки в стейблкоинах', 'revenue', 'USDC / всего', 'нужна разбивка выручки', ['config.stablecoinRevenueUsd'], { reason: 'Нет данных: не задана выручка в стейблкоинах (USDC)' }))
  metrics.push(config.cosmeticRevenueUsd
    ? ok('cosmetic_share', 'Доля косметики в выручке', 'revenue', Number((config.cosmeticRevenueUsd / (revenueUsd || config.cosmeticRevenueUsd) * 100).toFixed(2)), '%',
        'выручка от косметики / общая × 100; признак устойчивой модели', 'config.cosmeticRevenueUsd', { window: win.id, novelties: ['cosmetic-led economies'] })
    : U('cosmetic_share', 'Доля косметики в выручке', 'revenue', 'косметика / всего', 'нет разбивки выручки', ['config.cosmeticRevenueUsd'], { reason: 'Нет данных: разбивка выручки по типам не задана' }))
  metrics.push(treasuryBalance && dailyBurn
    ? ok('treasury_runway_days', 'Запас казны (дней)', 'revenue', Number((treasuryBalance / dailyBurn).toFixed(1)), 'days',
        'баланс казны / средний дневной расход', 'config.treasuryBalance + config.dailyBurn', { window: win.id, novelties: ['runway discipline'] })
    : U('treasury_runway_days', 'Запас казны (дней)', 'revenue', 'казна / дневной расход', 'нужны баланс и расход казны', ['config.treasuryBalance', 'config.dailyBurn'], { reason: 'Не заданы баланс казны или дневной расход' }))
  metrics.push(revenueUsd
    ? ok('dividend_pool_coverage', 'Покрытие дивидендного пула', 'revenue', Number((Math.max(0, revenueUsd - (Number(config.costsUsd) || 0)) * 0.25).toFixed(2)), 'USD',
        '(выручка − расходы) × 25% — пул Ecosystem Share за окно', 'config.revenueUsd − config.costsUsd, правило 25% из INVESTOR_LANDING_BRIEF', { window: win.id, novelties: ['revenue-share NFT'] })
    : U('dividend_pool_coverage', 'Покрытие дивидендного пула', 'revenue', '(выручка − расходы) × 25%', 'нужны выручка и расходы', ['config.revenueUsd', 'config.costsUsd'], { reason: 'Нет подтверждённой выручки и расходов за окно' }))

  // ------------------------------------------------------------- Справедливость
  metrics.push(wallets.length
    ? ok('gini_earnings', 'Неравенство заработка (Gini)', 'fairness', gini(wallets), 'index',
        'коэффициент Джини по заработанному на кошелёк (0 — равенство, 1 — предельная концентрация)', 'source/reward события по кошелькам', { window: win.id, novelties: ['concentration risk'] })
    : U('gini_earnings', 'Неравенство заработка (Gini)', 'fairness', 'Джини по earnings', 'нужны начисления по кошелькам', ['RewardGranted']))
  metrics.push(wallets.length
    ? ok('top10_share', 'Доля топ-10% кошельков', 'fairness', topShare(wallets, 0.1), 'ratio',
        'заработок топ-10% кошельков / общий заработок', 'распределение earnings', { window: win.id })
    : U('top10_share', 'Доля топ-10% кошельков', 'fairness', 'top10% / total', 'нужны начисления', ['RewardGranted']))
  metrics.push(earningsTotal
    ? ok('whale_dependency', 'Зависимость от крупнейшего кошелька', 'fairness', topShare(wallets, 1 / Math.max(1, wallets.length)), 'ratio',
        'заработок крупнейшего кошелька / общий', 'распределение earnings', { window: win.id })
    : U('whale_dependency', 'Зависимость от крупнейшего кошелька', 'fairness', 'max / total', 'нужны начисления', ['RewardGranted']))

  // ------------------------------------------------------------------- Риски
  const botEvents = inWindow.length - human.length
  metrics.push(inWindow.length
    ? ok('bot_activity_share', 'Доля ботов в событиях', 'risk', Number((botEvents / inWindow.length).toFixed(4)), 'ratio',
        'события с признаком bot/synthetic / все события; учитывается при фильтрации экономики', 'payload.bot / sourceType=bot / synthetic', { window: win.id, quality: 'partial', novelties: ['bot-filtered economy'] })
    : U('bot_activity_share', 'Доля ботов в событиях', 'risk', 'bot / all', 'нужны события', ['любые события']))
  metrics.push(sinksTotal + acc.extract
    ? ok('extractive_pattern_index', 'Индекс извлечения', 'risk', safeRatio(acc.extract, sinksTotal + acc.extract), 'ratio',
        'вывод / (потребление + вывод); рост означает farming вместо игры', 'extract vs sink события', { window: win.id, novelties: ['extraction vs play 2026'] })
    : U('extractive_pattern_index', 'Индекс извлечения', 'risk', 'extract / (sink + extract)', 'нужны sink и extract события', ['CraftCompleted', 'Withdrawal']))
  metrics.push(config.liquidityUsd && config.marketCapUsd
    ? ok('liquidity_to_mcap', 'Ликвидность к капитализации', 'risk', Number((config.liquidityUsd / config.marketCapUsd * 100).toFixed(2)), '%',
        'глубина пула / капитализация × 100; < 2% — риск сильного проскальзывания', 'config.liquidityUsd, config.marketCapUsd', { window: win.id })
    : U('liquidity_to_mcap', 'Ликвидность к капитализации', 'risk', 'liquidity / mcap', 'нужны данные пула', ['config.liquidityUsd'], { reason: 'Нет данных о глубине пула и капитализации' }))
  metrics.push(config.liquidityUsd
    ? ok('price_impact_1k', 'Проскальзывание на сделку $1 000', 'risk', Number(((1000 / config.liquidityUsd) * 100).toFixed(3)), '%',
        '≈ (размер сделки / глубина пула) × 100 (постоянный продукт)', 'config.liquidityUsd', { window: win.id, quality: 'partial' })
    : U('price_impact_1k', 'Проскальзывание на сделку $1 000', 'risk', '(trade / depth) × 100', 'нужна глубина пула', ['config.liquidityUsd']))
  metrics.push(config.sybilFlaggedWallets && dau
    ? ok('sybil_flagged_share', 'Доля кошельков, помеченных как сибилы', 'risk', Number((config.sybilFlaggedWallets / (dau + config.sybilFlaggedWallets)).toFixed(4)), 'ratio',
        'flagged / (active + flagged)', 'antifraud-модуль игры (proposal, без авто-бана)', { window: win.id, novelties: ['points-program sybil defense'] })
    : U('sybil_flagged_share', 'Доля кошельков, помеченных как сибилы', 'risk', 'flagged / all', 'нужны данные антифрода', ['SecurityEvent', 'config.sybilFlaggedWallets'], { reason: 'Нет данных антифрода: игры не передают метки' }))

  // ------------------------------------------------------------------ Кросс-игра
  const gameSet = new Map()
  for (const event of human) {
    const player = eventPlayer(event)
    if (!player) continue
    if (!gameSet.has(player)) gameSet.set(player, new Set())
    gameSet.get(player).add(eventGame(event))
  }
  const multi = [...gameSet.values()].filter((s) => s.size > 1).length
  metrics.push(gameSet.size
    ? ok('cross_game_player_share', 'Доля игроков в 2+ играх', 'cross', Number((multi / gameSet.size).toFixed(4)), 'ratio',
        'игроки с событиями в двух и более tenant\'ах / все игроки', 'события с gameId по playerKey', { window: win.id, quality: 'partial', novelties: ['cross-game interweaving'] })
    : U('cross_game_player_share', 'Доля игроков в 2+ играх', 'cross', 'multi-game / all', 'нужны события с gameId', ['любые события с payload.gameId']))
  metrics.push(U('net_bridge_flow', 'Чистый поток через мост', 'cross', 'Σ bridge_in − Σ bridge_out', 'нужны bridge-события игр', ['BridgeIn', 'BridgeOut'], { novelties: ['cross-chain economy'] }))

  const inputs = {
    window: win.id,
    windowDays: win.days,
    eventsTotal: inWindow.length,
    eventsHuman: human.length,
    eventsExcludedAsBot: botEvents,
    assets: [...assets].slice(0, 20),
    games: [...new Set(human.map(eventGame))].slice(0, 10),
    config: {
      circulating: circulating !== null,
      maxSupply: maxSupply !== null,
      prices: Object.keys(prices).length > 0,
      treasuryBalance: treasuryBalance !== null,
      revenueUsd: revenueUsd !== null,
      liquidityUsd: Boolean(config.liquidityUsd),
    },
    demo,
  }

  // Единый контракт: у каждой метрики обязательны окно и часовой пояс.
  for (const m of metrics) {
    if (!m.window) m.window = win.id
    if (!m.timezone) m.timezone = TIMEZONE
  }

  // Честность: если в окне не было событий, ни одна метрика не считается — ноль не подставляется.
  if (inWindow.length === 0) {
    for (const m of metrics) {
      if (m.quality !== 'unavailable') {
        m.quality = 'unavailable'
        m.value = null
        m.reason = 'Нет событий в окне наблюдения: игры не подключены или события не поступали'
      }
    }
  }

  return {
    engine: 'watchtower-economy-v1',
    window: win.id,
    windowDays: win.days,
    timezone: TIMEZONE,
    generatedAt: new Date(now).toISOString(),
    demo,
    families: ['supply', 'flows', 'velocity', 'players', 'revenue', 'fairness', 'risk', 'cross'],
    metrics,
    index: economyIndex(metrics, inputs),
    inputs,
  }
}

function burnCadence(events, now, cadenceDays) {
  const burns = events.filter((e) => classifyEvent(e).class === 'burn').map(eventTime).filter((t) => t !== null)
  if (!burns.length) return 0
  const cycles = Math.max(1, Math.floor((90 / cadenceDays)))
  let hits = 0
  for (let i = 0; i < cycles; i += 1) {
    const to = now - i * cadenceDays * DAY_MS
    const from = to - cadenceDays * DAY_MS
    if (burns.some((t) => t > from && t <= to)) hits += 1
  }
  return hits / cycles
}

// Индекс здоровья экономики: 0..100, считается только если доступно ≥ 4 компонентов.
export function economyIndex(metrics, inputs) {
  const byId = Object.fromEntries(metrics.map((m) => [m.id, m]))
  const value = (id) => {
    const m = byId[id]
    if (!m || m.quality === 'unavailable' || m.value === null || m.value === undefined) return null
    return Number.isFinite(m.value) ? m.value : null
  }
  const components = []

  const ssr = value('sink_source_ratio')
  if (ssr !== null) components.push({ id: 'sink_strength', label: 'Сила стоков', score: clamp(ssr / 1.0), weight: 0.25, note: 'стоки/источники → 1.0' })

  const burn = value('burn_ratio')
  if (burn !== null) components.push({ id: 'burn_health', label: 'Сжигание', score: clamp(burn / 0.5), weight: 0.15, note: 'burn/mint → 0.5' })

  const giniValue = value('gini_earnings')
  if (giniValue !== null) components.push({ id: 'fairness', label: 'Распределение', score: clamp(1 - giniValue), weight: 0.2, note: '1 − Gini' })

  const extraction = value('extractive_pattern_index')
  if (extraction !== null) components.push({ id: 'play_vs_extract', label: 'Игра против извлечения', score: clamp(1 - extraction), weight: 0.2, note: '1 − индекс извлечения' })

  const runway = value('treasury_runway_days')
  if (runway !== null) components.push({ id: 'runway', label: 'Запас казны', score: clamp(runway / 180), weight: 0.1, note: 'дней → 180' })

  const bots = value('bot_activity_share')
  if (bots !== null) components.push({ id: 'organic', label: 'Органичность', score: clamp(1 - bots), weight: 0.1, note: '1 − доля ботов' })

  if (components.length < 4) {
    return {
      score: null,
      status: 'unavailable',
      reason: `Недостаточно компонентов для индекса: доступно ${components.length} из 6. Нужны данные от подключённых игр.`,
      components,
      missing: inputs?.eventsHuman === 0 ? ['события игр'] : [],
    }
  }
  const weightSum = components.reduce((a, c) => a + c.weight, 0)
  const score = Math.round((components.reduce((a, c) => a + c.score * c.weight, 0) / weightSum) * 100)
  const status = score >= 70 ? 'healthy' : score >= 45 ? 'watch' : 'critical'
  return { score, status, components, missing: [] }
}

const clamp = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0))

// Список семейств и их смысла для интерфейса и документации.
export const FAMILIES = [
  { id: 'supply', label: 'Снабжение и эмиссия', why: '2026: устойчивость строится на лимите supply, сжигании по факту использования и предсказуемой эмиссии.' },
  { id: 'flows', label: 'Источники и стоки', why: 'Экономика живёт, когда игроки потребляют; вывод ценности без потребления — признак farming.' },
  { id: 'velocity', label: 'Скорость обращения', why: 'Ликвидность токена и время удержания показывают, пользуются ли активом или держат ради вывода.' },
  { id: 'players', label: 'Игроки и монетизация', why: 'Ориентиры мобильных F2P: платящих около 2%; заработок в час выявляет бот-фермы.' },
  { id: 'revenue', label: 'Выручка и казна', why: 'Ставка 2026 — stablecoin-выручка и косметика вместо спекулятивного токена; казна должна иметь запас.' },
  { id: 'fairness', label: 'Справедливость', why: 'Высокая концентрация заработка делает экономику зависимой от нескольких кошельков.' },
  { id: 'risk', label: 'Риски и ликвидность', why: 'Проскальзывание, глубина пула, боты и сибилы — источники внезапных обвалов.' },
  { id: 'cross', label: 'Переплетение', why: 'Игроки в нескольких играх и потоки активов между играми — измеримый результат интеграции.' },
]

export function metricCatalog() {
  const base = computeEconomy({ events: [], window: '7d', config: {} })
  return {
    engine: base.engine,
    timezone: TIMEZONE,
    windows: WINDOWS,
    families: FAMILIES,
    metrics: base.metrics.map(({ id, label, family, unit, formula, source, needs }) => ({ id, label, family, unit, formula, source, needs })),
  }
}

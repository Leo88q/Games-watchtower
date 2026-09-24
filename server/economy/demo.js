// ДЕМО-ПОТОК СОБЫТИЙ для экрана «Экономика».
// Назначение: показать, как работают метрики, пока игры не подключены.
// ВАЖНО: это синтетика. API помечает такие данные demo: true и предупреждением DEMO DATA,
// интерфейс показывает оранжевый бейдж — синтетика никогда не смешивается с боевыми данными.

const DAY = 86_400_000

function seeded(seed = 20260923) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const GAMES = ['ares1', 'aof', 'neonrelay', 'guttercaps']

/**
 * Демо-поток детерминирован: одинаковая опорная дата (UTC-сутки) + seed → байт-идентичный набор.
 * Опорная точка — начало UTC-суток, иначе окно метрик «дрожит» на границе суток (±1 мс менял набор событий).
 */
export function demoEvents({ days = 90, players = 420, now = Date.now(), seed = 20260923, anchorToDay = true } = {}) {
  const rand = seeded(seed)
  const anchor = anchorToDay ? Math.floor(now / DAY) * DAY : now
  const events = []
  const wallets = Array.from({ length: players }, (_, i) => `demo_wallet_${(i + 1).toString(36)}`)

  // распределение заработка: степенной закон (несколько «китов», длинный хвост)
  const weights = wallets.map((_, i) => 1 / Math.pow(i + 1, 1.25))
  const weightSum = weights.reduce((a, b) => a + b, 0)

  for (let d = days; d >= 0; d -= 1) {
    const ts = anchor - d * DAY
    const dayOfWeek = new Date(ts).getUTCDay()
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1
    const growth = 1 + (days - d) / days * 0.8
    const sessionsToday = Math.round(180 * weekendBoost * growth * (0.85 + rand() * 0.3))

    for (let s = 0; s < sessionsToday; s += 1) {
      // выбираем кошелька по степенному распределению
      let pick = rand() * weightSum
      let wallet = wallets[0]
      for (let i = 0; i < wallets.length; i += 1) { pick -= weights[i]; if (pick <= 0) { wallet = wallets[i]; break } }
      const game = GAMES[Math.floor(rand() * GAMES.length)]
      const t = new Date(ts + Math.floor(rand() * DAY)).toISOString()
      const base = { chain: 'solana', cluster: 'devnet', slot: 1000 + s, signature: `demo-${d}-${s}`, commitment: 'finalized', observedAt: t, parserVersion: 'demo-v1', payload: { gameId: game, playerKey: wallet, sessionId: `sess_demo_${d}_${Math.floor(s / 12)}` } }

      // источник: урожай/награда
      const harvestType = game === 'ares1' ? 'PotatoHarvested' : game === 'aof' ? 'CropHarvested' : game === 'neonrelay' ? 'RaceStarted' : 'CapShot'
      events.push({ ...base, eventType: harvestType, payload: { ...base.payload, amount: Number((0.4 + rand() * 2.4).toFixed(3)) } })
      // награда
      if (rand() < 0.7) events.push({ ...base, signature: `${base.signature}-r`, eventType: 'RewardGranted', payload: { ...base.payload, amount: Number((0.2 + rand() * 1.1).toFixed(3)) } })
      // сток: крафт/пак/комиссия
      if (rand() < 0.55) events.push({ ...base, signature: `${base.signature}-c`, eventType: 'CraftCompleted', payload: { ...base.payload, amount: Number((0.3 + rand() * 1.6).toFixed(3)) } })
      if (rand() < 0.2) events.push({ ...base, signature: `${base.signature}-p`, eventType: 'PackOpened', payload: { ...base.payload, amount: Number((0.8 + rand() * 2.5).toFixed(3)) } })
      // торговля
      if (rand() < 0.18) events.push({ ...base, signature: `${base.signature}-t`, eventType: 'MarketOrderCompleted', payload: { ...base.payload, amount: Number((1 + rand() * 5).toFixed(3)), price: Number((0.04 + rand() * 0.02).toFixed(4)), mint: 'POTATO' } })
      // вывод (редкий, растёт со временем — «фарм-фаза»)
      if (rand() < 0.06 + (days - d) / days * 0.05) events.push({ ...base, signature: `${base.signature}-w`, eventType: 'Withdrawal', payload: { ...base.payload, amount: Number((1 + rand() * 4).toFixed(3)) } })
      // боты помечены отдельно и исключаются из экономики
      if (rand() < 0.3) events.push({ ...base, signature: `${base.signature}-b`, eventType: 'PageView', payload: { ...base.payload, bot: true, sourceType: 'bot' } })
    }

    // минтинг и сжигание: еженедельные циклы
    events.push({ chain: 'solana', cluster: 'devnet', slot: 2000 + d, signature: `demo-mint-${d}`, commitment: 'finalized', observedAt: new Date(ts).toISOString(), eventType: 'TokenMinted', payload: { gameId: GAMES[Math.floor(rand() * 4)], amount: Number((900 + rand() * 400).toFixed(2)), mint: 'POTATO' } })
    if (d % 7 === 0) events.push({ chain: 'solana', cluster: 'devnet', slot: 3000 + d, signature: `demo-burn-${d}`, commitment: 'finalized', observedAt: new Date(ts).toISOString(), eventType: 'TokenBurned', payload: { gameId: GAMES[Math.floor(rand() * 4)], amount: Number((2200 + rand() * 900).toFixed(2)), mint: 'POTATO' } })
    events.push({ chain: 'solana', cluster: 'devnet', slot: 4000 + d, signature: `demo-fee-${d}`, commitment: 'finalized', observedAt: new Date(ts).toISOString(), eventType: 'FeeCharged', payload: { gameId: GAMES[Math.floor(rand() * 4)], amount: Number((30 + rand() * 25).toFixed(2)), mint: 'USDC' } })
  }

  return events
}

// Конфигурация для демо: лимиты, цены, казна. Явно помечена как демонстрационная.
export function demoConfig() {
  return {
    demo: true,
    circulating: 8_400_000,
    maxSupply: 50_000_000,
    mainAsset: 'POTATO',
    prices: { POTATO: 0.042, USDC: 1 },
    treasuryBalance: 186_000,
    dailyBurn: 1_450,
    burnCadenceDays: 7,
    revenueUsd: 42_500,
    costsUsd: 18_900,
    stablecoinRevenueUsd: 31_000,
    cosmeticRevenueUsd: 12_800,
    liquidityUsd: 640_000,
    marketCapUsd: 12_600_000,
    sybilFlaggedWallets: 96,
  }
}

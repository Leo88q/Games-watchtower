/* token-data — ЕДИНЫЙ источник чисел лендинга $WTWR (RU и EN страницы рендерятся
 * из этого файла — разойтись языковым версиям негде). Тот же модуль проверяется
 * в CI скриптом test:site (scripts/site-consistency.test.mjs) через validateTokenData().
 *
 * Числа — план до старта сбора; совпадают с WHITEPAPER_RU/EN и X_POSTS.md.
 * Принцип страниц: «никаких выдуманных цифр».
 */

export const TOKEN = {
  ticker: 'WTWR',
  supply: 1_000_000_000,
  network: 'Solana SPL',
}

export const RAISE = {
  targetUsd: 350_000,
  // Раунд 0 — Ecosystem Share NFT (иной инструмент, проспект; см. Часть K белой книги).
  nft: {
    count: 100,
    priceUsd: 1_000,
    profitSharePct: 25,   // вместе 100 NFT = 25% чистой прибыли студии
    perNftPct: 0.25,      // доля одного NFT
    limitPerWallet: 10,
    payout: 'USDC quarterly, smart contract, snapshot of holders',
  },
  // Пресейл $WTWR: два раунда.
  round1: {
    name: { ru: 'Раунд 1 · Founders', en: 'Round 1 · Founders' },
    tokens: 60_000_000, price: 0.0025, tgePct: 10, cliffMonths: 1, vestMonths: 9,
  },
  round2: {
    name: { ru: 'Раунд 2 · Builders', en: 'Round 2 · Builders' },
    tokens: 25_000_000, price: 0.004, tgePct: 15, cliffMonths: 0, vestMonths: 6,
  },
}

// Аллокация эмиссии. unlock — двуязычно.
export const ALLOC = [
  { key: { ru: 'Пресейл · раунд 1', en: 'Presale · round 1' }, pct: 6, color: '#37e5a0', unlock: { ru: '10% сразу, 1 мес. пауза, 9 мес. равномерно', en: '10% at TGE, 1-month cliff, 9 months linear' } },
  { key: { ru: 'Пресейл · раунд 2', en: 'Presale · round 2' }, pct: 2.5, color: '#7af0c2', unlock: { ru: '15% сразу, 6 мес. равномерно', en: '15% at TGE, 6 months linear' } },
  { key: { ru: 'Ликвидность DEX', en: 'DEX liquidity' }, pct: 4, color: '#5cc8ff', unlock: { ru: 'пул заблокирован на 12 мес.', en: 'pool locked for 12 months' } },
  { key: { ru: 'Airdrop CapsStake (GutterCaps)', en: 'CapsStake airdrop (GutterCaps)' }, pct: 10, color: '#ffb85c', unlock: { ru: '4 сезона по 25 млн', en: '4 seasons × 25M' } },
  { key: { ru: 'Награды игрокам', en: 'Player rewards' }, pct: 20, color: '#ffd89c', unlock: { ru: 'эмиссия на 4 года, по убывающей', en: 'emitted over 4 years, decaying' } },
  { key: { ru: 'Команда разработчиков', en: 'Development team' }, pct: 15, color: '#a78bfa', unlock: { ru: '12 мес. лок, затем 24 мес. равномерно', en: '12-month lock, then 24 months linear' } },
  { key: { ru: 'Фонд билдеров', en: 'Builders fund' }, pct: 8, color: '#c9b8ff', unlock: { ru: 'гранты за этапы, после приёмки', en: 'milestone grants, on acceptance' } },
  { key: { ru: 'Казна и Compute Grid', en: 'Treasury & Compute Grid' }, pct: 19.5, color: '#8392a8', unlock: { ru: 'мультиподпись, отчёт раз в квартал', en: 'multisig, quarterly report' } },
  { key: { ru: 'Launchpad и партнёры', en: 'Launchpad & partners' }, pct: 8, color: '#ff6b8a', unlock: { ru: 'по сделкам, с локом', en: 'per deal, locked' } },
  { key: { ru: 'Маркетинг и сообщество', en: 'Marketing & community' }, pct: 7, color: '#ff9db3', unlock: { ru: '12 мес. равномерно', en: '12 months linear' } },
]

// На что пойдут $350 000 (все три раунда).
export const FUNDS = [
  { item: { ru: 'Разработка (зарплаты)', en: 'Development (salaries)' }, usd: 125_000, what: { ru: '4 игры и платформа до mainnet, помесячно', en: '4 games and the platform up to mainnet, monthly' } },
  { item: { ru: 'Compute Grid — железо', en: 'Compute Grid — hardware' }, usd: 50_000, what: { ru: 'GPU-узлы, VR-шлемы, тестовые Seeker-устройства', en: 'GPU nodes, VR headsets, Seeker test devices' } },
  { item: { ru: 'Аудиты безопасности', en: 'Security audits' }, usd: 50_000, what: { ru: 'контракты игр, CapsStake и дивидендный контракт NFT', en: 'game contracts, CapsStake and the NFT dividend contract' } },
  { item: { ru: 'Ликвидность DEX', en: 'DEX liquidity' }, usd: 37_500, what: { ru: 'пара $WTWR/USDC по цене раунда 2', en: '$WTWR/USDC pair at round 2 price' } },
  { item: { ru: 'Маркетинг', en: 'Marketing' }, usd: 35_000, what: { ru: 'TalkChart, KOL, конкурсы', en: 'TalkChart, KOLs, contests' } },
  { item: { ru: 'Реальные данные в Watchtower', en: 'Live data into Watchtower' }, usd: 25_000, what: { ru: 'адаптеры 4 игр, индексаторы, поток событий', en: 'adapters for 4 games, indexers, event flow' } },
  { item: { ru: 'Юристы и комплаенс', en: 'Legal & compliance' }, usd: 15_000, what: { ru: 'MiCA для токена, проспект и Terms для NFT', en: 'MiCA for the token, prospectus and Terms for the NFT' } },
  { item: { ru: 'Операционный резерв', en: 'Operating reserve' }, usd: 12_500, what: { ru: 'инфраструктура, непредвиденное', en: 'infrastructure, contingency' } },
]

// Compute Grid: каждую позицию видно отдельно. id нужен для факта сбора
// (window.WT_PARAMS.raised.hardware[id] — только подтверждённые чеком суммы).
export const HW = [
  { id: 'gpu_ai', name: { ru: 'GPU-узел аналитики и ИИ', en: 'Analytics & AI GPU node' }, usd: 18_000, what: { ru: 'сервер с 2 GPU класса RTX 5090: ИИ-аналитик в реальном времени, генерация контента', en: 'server with 2 RTX 5090-class GPUs: real-time AI analyst, content generation' } },
  { id: 'render', name: { ru: 'Узел сборки и рендера', en: 'Build & render node' }, usd: 9_000, what: { ru: 'сборки игр, рендер трейлеров и видео TalkChart', en: 'game builds, trailer renders and TalkChart videos' } },
  { id: 'vr', name: { ru: 'VR-стенд разработки', en: 'VR dev rig' }, usd: 6_000, what: { ru: 'шлемы Quest 3 и Vision Pro для прототипов VR', en: 'Quest 3 and Vision Pro headsets for VR prototypes' } },
  { id: 'backup', name: { ru: 'Хранилище и бэкапы', en: 'Storage & backups' }, usd: 5_000, what: { ru: 'NAS + внешние копии событий Watchtower', en: 'NAS + off-site copies of Watchtower events' } },
  { id: 'seeker', name: { ru: 'Тестовая ферма Seeker', en: 'Seeker test farm' }, usd: 5_000, what: { ru: '10 телефонов Solana Seeker: тесты игр и SKR-сценариев', en: '10 Solana Seeker phones: game and SKR scenario testing' } },
  { id: 'colo', name: { ru: 'Сеть, ИБП, размещение 12 мес.', en: 'Network, UPS, 12-month colocation' }, usd: 7_000, what: { ru: 'колокация и бесперебойное питание', en: 'colocation and uninterruptible power' } },
]

// Распределение каждого доллара ЧИСТОЙ ПРИБЫЛИ (не путать с use of funds сбора).
// Портит и X_POSTS.md, и дерево лендинга.
export const PROFIT_SPLIT = [
  { pct: 25, who: { ru: 'держателям Ecosystem Share (USDC)', en: 'to Ecosystem Share holders (USDC)' }, color: '#a78bfa' },
  { pct: 30, who: { ru: 'выкуп $WTWR', en: '$WTWR buyback' }, color: '#37e5a0', note: { ru: '½ сжигание · ½ стейкерам', en: '½ burned · ½ to stakers' } },
  { pct: 15, who: { ru: 'пул разработчиков', en: 'developer pool' }, color: '#c9b8ff' },
  { pct: 30, who: { ru: 'казна и операционные расходы', en: 'treasury & operations' }, color: '#ffb85c' },
]

// Сценарии дивиденда раунда 0 — иллюстрация, НЕ обещание (дословно на странице).
export const DIVIDEND_SCENARIOS = [100_000, 200_000, 400_000]

export function dividendFor(profitPerYear, nfts = RAISE.nft.count, sharePct = RAISE.nft.profitSharePct) {
  const pool = profitPerYear * (sharePct / 100)
  const perNftYear = pool / nfts
  return { pool, perNftYear, perNftQuarter: perNftYear / 4, pctOfPrice: (perNftYear / RAISE.nft.priceUsd) * 100 }
}

// ─── самопроверки ──────────────────────────────────────────────────────────
// Денежные вычисления с float-ценами — в центах/милликентах, чтобы 0.0025*60M
// не давало 149 999.99999997 и страница всегда печатала ровные плановые числа.
export function validateTokenData() {
  const errors = []
  const eq = (a, b, msg) => { if (Math.abs(a - b) > 1e-6) errors.push(`${msg}: ${a} ≠ ${b}`) }

  // 1. Аллокация = ровно 100%.
  eq(ALLOC.reduce((s, a) => s + a.pct, 0), 100, 'аллокация ≠ 100%')

  // 2. Статьи сбора = цели.
  eq(FUNDS.reduce((s, f) => s + f.usd, 0), RAISE.targetUsd, 'статьи сбора ≠ цели')
  eq(HW.reduce((s, h) => s + h.usd, 0), FUNDS.find((f) => f.item.ru.includes('железо')).usd, 'железо ≠ строке Compute Grid')

  // 3. Три раунда дают цель сбора (цена — в 1e8-ных доллара, итог в долларах).
  const roundUsd = (tokens, price) => Math.round(tokens * Math.round(price * 1e8) / 1e8)
  const nftUsd = RAISE.nft.count * RAISE.nft.priceUsd
  const r1 = roundUsd(RAISE.round1.tokens, RAISE.round1.price)
  const r2 = roundUsd(RAISE.round2.tokens, RAISE.round2.price)
  eq(nftUsd + r1 + r2, RAISE.targetUsd, 'раунды ≠ $350 000')

  // 4. Доля раунда 1 дешевле раунда 2 на 37,5% — KPI на странице.
  eq(Math.round((1 - RAISE.round1.price / RAISE.round2.price) * 1000) / 10, 37.5, 'скидка раунда 1 ≠ −37,5%')

  // 5. Право одного NFT × их число = заявленный пул.
  eq(RAISE.nft.perNftPct * RAISE.nft.count, RAISE.nft.profitSharePct, 'доли NFT ≠ 25% пула')

  // 6. Airdrop: 10% эмиссии = 100 млн, 4 сезона по 25 млн — CapsStake.
  eq(Math.round(TOKEN.supply * 0.1), 100_000_000, 'пул airdrop ≠ 100 млн')

  // 7. Команда 15% = 150 млн — согласуется с текстом лендинга.
  eq(Math.round(TOKEN.supply * 0.15), 150_000_000, 'доля команды ≠ 150 млн')

  // 8. Профит-сплит сходится в 100%.
  eq(PROFIT_SPLIT.reduce((s, p) => s + p.pct, 0), 100, 'распределение прибыли ≠ 100%')

  // 9. Сценарии дивидендов возрастают и делятся без остатка на кварталы.
  for (let i = 1; i < DIVIDEND_SCENARIOS.length; i++) {
    if (!(DIVIDEND_SCENARIOS[i] > DIVIDEND_SCENARIOS[i - 1])) errors.push('сценарии дивидендов не возрастают')
  }
  for (const p of DIVIDEND_SCENARIOS) {
    const d = dividendFor(p)
    if (!Number.isFinite(d.perNftQuarter) || d.perNftQuarter < 0) errors.push(`дивиденд для ${p} не считается`)
  }

  // 10. У железа уникальные id — на них заводится факт сбора.
  const ids = HW.map((h) => h.id)
  if (new Set(ids).size !== ids.length) errors.push('id позиций железа не уникальны')

  return { ok: errors.length === 0, errors }
}

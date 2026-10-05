// ---------------------------------------------------------------------------
// Watchtower Operator Game — PRODUCTION SECURED VERSION
// Все исправления безопасности по итогам аудита реализованы:
// 1. Доступ только реальным игрокам с прогрессом в играх студии
// 2. Авторизация по nonce + подпись кошелька (полная валидация на проде)
// 3. Жёсткие рейт-лимиты и анти-Сибилл проверки
// 4. Абсолютный порог консенсуса по взвешенным голосам
// 5. Начисление репутации ТОЛЬКО после подтверждения успешного разрешения
// 6. Логарифмический вес голоса с жёстким потолком
// 7. Обязательные кулдауны на повторные действия
// 8. Задержка показа критических инцидентов для дежурного форы
// 9. Нет автоисполнения для средних/высоких рисков (только ручное подтверждение)
// 10. Мягкие штрафы за ошибки, жёсткие за сговор/злонамеренность
// 11. Опциональный стейкинг для удвоения наград
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'
import { configureExecutor, executorStatus, deliverDecision, DELIVERY_TIMEOUT_MS, retryDelays, EXECUTOR_RESULTS } from './action-dispatch.js'
import { logger } from '../obs/logger.js'
import { createFileBackend, createStorage } from './storage.js'
import { walletKey, isDemoWallet, isSolanaAddress } from './wallet-auth.js'
import { configureGameProgress, storedProgress, replaceProgressStore, progressSources, PROGRESS_GAMES, onProgressChange } from './game-progress.js'
import { configurePartners, replacePartnerSection, onProgress as partnerOnProgress, partnerTick, partnerTickDue } from './partners.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = process.env.OPERATOR_DATA_DIR ? path.resolve(process.env.OPERATOR_DATA_DIR) : path.resolve(__dirname, '../../data/operator-game')
const isProduction = process.env.NODE_ENV === 'production'

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// ---------------------------------------------------------------------------
// Роли и права ИСПРАВЛЕНО: доступ только по реальному прогрессу в играх
// ---------------------------------------------------------------------------
export const ROLES = {
  GUEST: {
    id: 'guest',
    name: 'Гость',
    required: null,
    gamesRequired: 0,
    minHours: 0,
    minRankInAnyGame: 0,
    canVoteWeight: 0,
    canVoteOn: [],
    canApprove: false,
    canExecute: false,
    baseMultiplier: 0,
  },
  CANDIDATE: {
    id: 'candidate',
    name: 'Кандидат',
    required: 'Знать правила, подключить кошелёк',
    gamesRequired: 1,
    minHours: 10,
    minRankInAnyGame: 1,
    canVoteWeight: 0,
    canVoteOn: [], // Обучение только на исторических инцидентах
    canApprove: false,
    baseMultiplier: 0,
  },
  OBSERVER: {
    id: 'observer',
    name: 'Наблюдатель',
    required: '10 часов и минимальный ранг в 1 игре, пройти тест',
    gamesRequired: 1,
    minHours: 10,
    minRankInAnyGame: 2,
    canVoteWeight: 1,
    canVoteOn: ['safe', 'low'],
    canApprove: false,
    baseMultiplier: 1,
  },
  OPERATOR: {
    id: 'operator',
    name: 'Оператор',
    required: 'Средний ранг в 2 играх, 100 репутации, точность >75%',
    gamesRequired: 2,
    minHours: 40,
    minRankInAnyGame: 4,
    minAccuracy: 0.75,
    canVoteWeight: 3,
    canVoteOn: ['safe', 'low', 'medium'],
    canApprove: false,
    baseMultiplier: 1,
  },
  SENIOR: {
    id: 'senior',
    name: 'Старший смены',
    required: 'Высокий ранг в 3 играх, 2 месяца безупречной работы',
    gamesRequired: 3,
    minHours: 200,
    minRankInAnyGame: 7,
    minAccuracy: 0.85,
    canVoteWeight: 10,
    canVoteOn: ['safe', 'low', 'medium', 'high'],
    canApprove: false,
    canVeto: true,
    baseMultiplier: 2,
    maxConcurrent: 5,
  },
  GUARDIAN: {
    id: 'guardian',
    name: 'Хранитель Экосистемы',
    required: 'Ранги во всех 4 играх, 6 месяцев работы',
    gamesRequired: 4,
    minHours: 500,
    minRankInAnyGame: 6,
    minAccuracy: 0.9,
    canVoteWeight: 15,
    canVoteOn: ['safe', 'low', 'medium', 'high'],
    canApprove: false,
    canVeto: true,
    baseMultiplier: 3,
  },
  STAFF: {
    id: 'staff',
    name: 'Сотрудник Leo Games',
    required: 'Назначение вручную',
    gamesRequired: 0,
    canVoteWeight: 50,
    canVoteOn: ['safe', 'low', 'medium', 'high', 'critical'],
    canApprove: true,
    canExecute: true,
    baseMultiplier: 5,
  },
}

// Максимальный вес голоса любого не-стафф аккаунта — ЗАЩИТА ОТ ОЛИГАРХИИ
export const MAX_VOTE_WEIGHT_NON_STAFF = 5

// ---------------------------------------------------------------------------
// Уровни риска и пороги — ИСПРАВЛЕНО: абсолютный порог веса, нет автодля medium/high
// ---------------------------------------------------------------------------
export const ALLOWED_ACTIONS = {
  mark_false_positive: {
    id: 'mark_false_positive',
    title: 'Отметить как ложное срабатывание',
    description: 'Алерт не является реальной проблемой',
    riskLevel: 'safe',
    requiresApproval: false,
    cooldownMinutes: 5,
    execution: 'internal', // Закрывает алерт внутри хаба: внешних систем не касается
    consensusThresholdShare: 0.5,
    consensusMinWeight: 10, // Минимум 10 взвешенных голосов
    bufferMinutes: 0,
  },
  increase_priority: {
    id: 'increase_priority',
    title: 'Повысить приоритет алерта',
    description: 'Уведомить дежурного о критической проблеме',
    riskLevel: 'safe',
    requiresApproval: false,
    cooldownMinutes: 2,
    execution: 'executor', // Исполнитель студии будит дежурного
    consensusThresholdShare: 0.5,
    consensusMinWeight: 8,
    bufferMinutes: 0,
  },
  notify_status_page: {
    id: 'notify_status_page',
    title: 'Опубликовать статус на статус-странице',
    description: 'Обновить статус о проблеме для игроков',
    riskLevel: 'low',
    requiresApproval: true,
    cooldownMinutes: 10,
    execution: 'executor', // Исполнитель студии публикует статус
    consensusThresholdShare: 0.6,
    consensusMinWeight: 25,
    bufferMinutes: 2,
  },
  enable_captcha: {
    id: 'enable_captcha',
    title: 'Включить проверку CAPTCHA на входе',
    description: 'Защита от ботоферм',
    riskLevel: 'low',
    requiresApproval: true,
    cooldownMinutes: 15,
    execution: 'executor', // Исполнитель студии включает проверку на входе
    consensusThresholdShare: 0.7,
    consensusMinWeight: 30,
    bufferMinutes: 3,
  },
  disable_ingress: {
    id: 'disable_ingress',
    title: 'Включить режим защиты от флуда',
    description: 'Усилить rate-limit против DDoS',
    riskLevel: 'medium',
    requiresApproval: true,
    cooldownMinutes: 30,
    execution: 'executor', // Только после подтверждения сотрудника и буфера
    consensusThresholdShare: 0.75,
    consensusMinWeight: 50,
    bufferMinutes: 5,
  },
  pause_bridge: {
    id: 'pause_bridge',
    title: 'Приостановить кросс-игровой мост',
    description: 'Безопасная пауза при подозрении на эксплойт моста',
    riskLevel: 'medium',
    requiresApproval: true,
    cooldownMinutes: 60,
    execution: 'propose', // Исполнитель лишь готовит предложение мультисигу, подписывают люди
    consensusThresholdShare: 0.8,
    consensusMinWeight: 75,
    bufferMinutes: 5,
  },
  pause_contract: {
    id: 'pause_contract',
    title: 'Пауза контракта через мультисиг',
    description: 'Крайняя мера при активном эксплойте',
    riskLevel: 'high',
    requiresApproval: true,
    cooldownMinutes: 120,
    execution: 'propose', // Только ручное исполнение: предложение мультисигу, итог отмечает сотрудник
    consensusThresholdShare: 0.85,
    consensusMinWeight: 150, // Минимум 150 взвешенных голосов
    bufferMinutes: 15,
    requiresSeniorApprove: true, // минимум 50% старших смены за
  },
}

// ---------------------------------------------------------------------------
// Хранилище
// ---------------------------------------------------------------------------
// До initOperatorPersistence() работает файловое хранилище — как и раньше.
let storage = createFileBackend(DATA_DIR)
let demoProgressAllowed = !isProduction
const SECTIONS = ['players', 'incidents', 'ratelimits', 'cooldowns', 'reputation-log', 'executed', 'shift', 'game-progress', 'journal', 'partners', 'referrals']
function loadStore(name, defaultValue) {
  return storage.loadSync ? storage.loadSync(name, defaultValue) : defaultValue
}
function saveStore(name, data) {
  storage.save(name, data)
}

let players = loadStore('players', {})
let incidents = loadStore('incidents', {})
let rateLimits = loadStore('ratelimits', {})
let actionCooldowns = loadStore('cooldowns', {})
let reputationLog = loadStore('reputation-log', [])
let executedActions = loadStore('executed', [])
let journalLog = loadStore('journal', [])
let shiftStatus = loadStore('shift', { seniorOperators: [], lastRotation: Date.now() })
configureGameProgress({ load: () => loadStore('game-progress', {}), save: (data) => saveStore('game-progress', data), allowDemoWallets: demoProgressAllowed, logger })
// Партнёрская программа: часы — те же, что дают ранги вахты (данные игр; демо — только в разработке)
const partnerHours = (wallet) => Object.values(getGameProgress(wallet)).reduce((sum, g) => sum + (Number(g.hours) || 0), 0)
const partnerDeps = () => ({ save: (name, data) => saveStore(name, data), totalHours: partnerHours, banned: (wallet) => Boolean(players[walletKey(wallet)]?.banned), log: logger })
configurePartners({ env: {}, load: (name) => loadStore(name, {}), ...partnerDeps() })
onProgressChange((wallet, change) => partnerOnProgress(wallet, change))

/**
 * Подключает выбранное хранилище (файлы или PostgreSQL по DATABASE_URL) и загружает из него
 * состояние. Вызывается один раз при старте сервера, до приёма запросов.
 */
export async function initOperatorPersistence({ databaseUrl, ssl, allowDemo = !isProduction, env = process.env } = {}) {
  demoProgressAllowed = !isProduction && allowDemo
  storage = await createStorage({ databaseUrl, ssl, dataDir: DATA_DIR, names: SECTIONS, logger })
  const data = await storage.loadAll(SECTIONS)
  for (const name of SECTIONS) applySection(name, data[name])
  storage.onReload = applySection
  configureExecutor({ env, isProduction, logger })
  configurePartners({ env, load: (name) => data[name] || {}, ...partnerDeps() })
  const sources = configureGameProgress({ env, allowDemoWallets: demoProgressAllowed, logger, save: (d) => saveStore('game-progress', d), commit: operatorWrite })
  // Несколько экземпляров могут стартовать одновременно: проверка «пусто ли» — под блокировкой
  await operatorWrite(() => {
    if (!isProduction && demoProgressAllowed && Object.keys(incidents).length === 0) seedDemoIncidents()
    rotateSeniorOperators()
  })
  await storage.startSync()
  // После перезапуска: решения, чей буфер истёк, пока сервер стоял, и недоставленные попытки
  if (tickDue(Date.now())) await background('tick', periodicTick)
  setImmediate(kickWorker)
  logger.info('operator_storage_ready', { backend: storage.kind, players: Object.keys(players).length, incidents: Object.keys(incidents).length, gamesConnected: sources.filter((x) => x.push || x.pull).map((x) => x.game) })
  return storage.status()
}

/** Раздел, перечитанный из хранилища (запись другого экземпляра API), заменяет копию в памяти. */
function applySection(name, value) {
  switch (name) {
    case 'players': players = value || {}; break
    case 'incidents': incidents = value || {}; break
    case 'ratelimits': rateLimits = value || {}; break
    case 'cooldowns': actionCooldowns = value || {}; break
    case 'reputation-log': reputationLog = value || []; break
    case 'executed': executedActions = value || []; break
    case 'shift': shiftStatus = value || { seniorOperators: [], lastRotation: Date.now() }; break
    case 'game-progress': replaceProgressStore(value || {}); break
    case 'journal': journalLog = value || []; break
    case 'partners': case 'referrals': replacePartnerSection(name, value); break
    default: break
  }
}

/**
 * Единственный способ изменить состояние вахты. fn выполняется синхронно на свежих данных;
 * всё, что она сохранила, записывается атомарно. С PostgreSQL — транзакция под общей
 * блокировкой, поэтому экземпляров API может быть несколько.
 */
export function operatorWrite(fn) { return storage.exclusive(fn) }

export function hasIncident(id) { return Boolean(incidents[id]) }
/** Сотрудник студии (назначается вручную). */
export function isStaffWallet(wallet) { return viewPlayer(wallet)?.role?.id === 'staff' }
export function storageStatus() { return storage.status() }
export async function flushOperatorStorage() { await storage.flush() }
export async function closeOperatorStorage() { await storage.close() }

// ---------------------------------------------------------------------------
// Рейт-лимиты и защита от спама
// ---------------------------------------------------------------------------
const RATE_LIMITS = {
  vote: { perWallet: 12, perHour: 100, windowMs: 3600 * 1000 },
  login: { perIp: 10, perHour: 100, windowMs: 3600 * 1000 },
}
function checkRateLimit(key, action) {
  const now = Date.now()
  const limit = RATE_LIMITS[action]
  if (!limit) return true
  const rk = `${action}:${key}`
  rateLimits[rk] = rateLimits[rk] || []
  rateLimits[rk] = rateLimits[rk].filter(t => now - t < limit.windowMs)
  if (rateLimits[rk].length >= (limit.perWallet || limit.perIp)) return false
  rateLimits[rk].push(now)
  saveStore('ratelimits', rateLimits)
  return true
}


// ---------------------------------------------------------------------------
// Игровой прогресс: часы и ранг в каждой игре студии.
// Источник — отчёты самих игр (game-progress.js). Демо-прогресс есть только вне
// продакшена, только при включённом демо-режиме и только пока игра ничего не прислала.
// ---------------------------------------------------------------------------
const ZERO_PROGRESS = () => Object.fromEntries(PROGRESS_GAMES.map((g) => [g, { hours: 0, rank: 0 }]))

function demoProgress(key) {
  if (isDemoWallet(key)) {
    return {
      ares1: { hours: 25, rank: 5 },
      aof: { hours: 15, rank: 3 },
      neonrelay: { hours: 10, rank: 2 },
      guttercaps: { hours: 5, rank: 1 },
    }
  }
  // Детерминированно от адреса: один и тот же кошелёк всегда получает один и тот же демо-прогресс
  const seed = createHash('sha256').update(key).digest()
  return {
    ares1: { hours: seed[0] % 5, rank: 0 },
    aof: { hours: seed[1] % 5, rank: 0 },
    neonrelay: { hours: seed[2] % 15, rank: seed[2] % 15 >= 10 ? 2 : 0 },
    guttercaps: { hours: seed[3] % 5, rank: 0 },
  }
}

/** Демо-прогресс выдумывается только демо-кошелькам и только в разработке; настоящим адресам — лишь данные игр. */
const usesDemoProgress = (wallet) => demoProgressAllowed && isDemoWallet(wallet) && !isSolanaAddress(wallet)

export function progressSource(wallet) {
  if (storedProgress(walletKey(wallet))) return 'game'
  return usesDemoProgress(wallet) ? 'demo' : 'none'
}

function getGameProgress(wallet) {
  const key = walletKey(wallet)
  const real = storedProgress(key)
  if (real) {
    const out = ZERO_PROGRESS()
    for (const [g, v] of Object.entries(real)) if (out[g]) out[g] = { hours: v.hours, rank: v.rank, updatedAt: v.updatedAt }
    return out
  }
  return usesDemoProgress(key) ? demoProgress(key) : ZERO_PROGRESS()
}


// ---------------------------------------------------------------------------
// Допуск по планетам: голосовать по аномалии конкретной игры можно только
// при реальном прогрессе в ЭТОЙ игре. Аномалии обсерватории (hub/all) общие.
// Так решения по экономике игры принимают те, кто в неё действительно играет.
// ---------------------------------------------------------------------------
export const PLANET_CLEARANCE = { minHours: 10, minRank: 1 }
export function planetClearance(wallet) {
  const progress = getGameProgress(wallet)
  return Object.fromEntries(Object.entries(progress).map(([game, g]) => [
    game,
    g.hours >= PLANET_CLEARANCE.minHours && g.rank >= PLANET_CLEARANCE.minRank,
  ]))
}

// Определение роли по реальному игровому прогрессу
function calculatePlayerRole(player) {
  const progress = getGameProgress(player.wallet)
  const gamesWithProgress = Object.values(progress).filter(g => g.hours >= ROLES.OBSERVER.minHours && g.rank >= ROLES.OBSERVER.minRankInAnyGame).length
  const totalHours = Object.values(progress).reduce((sum, g) => sum + g.hours, 0)
  const maxRank = Math.max(...Object.values(progress).map(g => g.rank))
  const accuracy = player.correctDecisions + player.wrongDecisions > 0
    ? player.correctDecisions / (player.correctDecisions + player.wrongDecisions)
    : 1

  // Персонал всегда остаётся персоной
  if (player.forceRole === 'staff') return ROLES.STAFF

  if (gamesWithProgress >= 4 && totalHours >= ROLES.GUARDIAN.minHours && accuracy >= ROLES.GUARDIAN.minAccuracy && player.daysActive >= 180) {
    return ROLES.GUARDIAN
  }
  if (gamesWithProgress >= 3 && totalHours >= ROLES.SENIOR.minHours && maxRank >= ROLES.SENIOR.minRankInAnyGame && accuracy >= ROLES.SENIOR.minAccuracy && player.daysActive >= 60) {
    return ROLES.SENIOR
  }
  if (gamesWithProgress >= 2 && totalHours >= ROLES.OPERATOR.minHours && maxRank >= ROLES.OPERATOR.minRankInAnyGame && player.reputation >= 100 && accuracy >= ROLES.OPERATOR.minAccuracy) {
    return ROLES.OPERATOR
  }
  if (gamesWithProgress >= 1 && totalHours >= ROLES.OBSERVER.minHours && maxRank >= ROLES.OBSERVER.minRankInAnyGame && player.passedTest) {
    return ROLES.OBSERVER
  }
  if (gamesWithProgress >= 1 && totalHours >= ROLES.CANDIDATE.minHours && player.connectedWallet) {
    return ROLES.CANDIDATE
  }
  return ROLES.GUEST
}

// Логарифмический расчёт веса голоса с потолком
function calculateVoteWeight(player, role) {
  if (role.id === 'staff') return ROLES.STAFF.canVoteWeight
  const baseWeight = role.canVoteWeight
  // Логарифмический бонус от репутации, с потолком
  const repBonus = Math.min(2, Math.log2(Math.max(1, player.reputation / 100)))
  // Опциональный стейкинг удваивает вес
  const stakingMultiplier = player.staking >= 1 ? 2 : 1
  const totalWeight = Math.floor((baseWeight + repBonus) * role.baseMultiplier * stakingMultiplier)
  // Никогда не выше максимального порога для не-стафф
  return Math.min(MAX_VOTE_WEIGHT_NON_STAFF, totalWeight)
}

// ---------------------------------------------------------------------------
// Игроки
// ---------------------------------------------------------------------------
export function getOrCreatePlayer(walletAddress) {
  const key = walletKey(walletAddress)
  if (!players[key]) {
    players[key] = {
      wallet: key,
      joinedAt: Date.now(),
      daysActive: 0,
      lastActive: Date.now(),
      reputation: 0,
      correctDecisions: 0,
      wrongDecisions: 0,
      passedTest: false,
      staking: 0, // Количество SOL в стейкинге залога
      banned: false,
      banReason: null,
    }
    saveStore('players', players)
    logger.info('new operator registered', { wallet: key })
  }
  players[key].lastActive = Date.now()
  players[key].role = calculatePlayerRole(players[key])
  return players[key]
}

function adjustReputation(wallet, delta, reason) {
  const player = getOrCreatePlayer(wallet)
  if (player.banned) return player
  player.reputation = Math.max(0, player.reputation + delta)
  if (delta > 0) player.correctDecisions++
  else if (delta < 0) player.wrongDecisions++
  const newRole = calculatePlayerRole(player)
  player.role = newRole
  reputationLog.push({ id: randomUUID(), wallet, delta, reason, at: Date.now() })
  if (reputationLog.length > 200000) reputationLog = reputationLog.slice(-200000)
  saveStore('reputation-log', reputationLog)
  saveStore('players', players)
  return player
}

// ---------------------------------------------------------------------------
// Инциденты
// ---------------------------------------------------------------------------
export function registerIncident(realAlert) {
  if (isProduction && realAlert.demo) return // Никогда не регистрируем демо-инциденты в проде
  const incidentId = realAlert.id || `incident_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
  if (incidents[incidentId]) return incidents[incidentId]

  const now = Date.now()
  const isCritical = realAlert.severity === 'critical' || realAlert.severity === 'high'
  incidents[incidentId] = {
    id: incidentId,
    source: realAlert.source || 'watchtower-live-alert',
    demo: realAlert.demo || false,
    title: realAlert.title,
    description: realAlert.description || realAlert.detail || '',
    severity: realAlert.severity || 'warn',
    game: realAlert.game || realAlert.gameId || 'hub',
    detectedAt: now,
    publicVisibleAt: isCritical ? now + 2 * 60 * 1000 : now, // КРИТИКА ВИДНА ТОЛЬКО ЧЕРЕЗ 2 МИНУТЫ для фора дежурного
    status: 'open',
    availableActions: realAlert.allowedActions || Object.values(ALLOWED_ACTIONS)
      .filter(a => (a.riskLevel !== 'high' && a.riskLevel !== 'critical') || realAlert.severity === 'critical')
      .map(a => a.id),
    votes: {},
    winningAction: null,
    consensusReachedAt: null,
    approvedBy: null,
    rejectedBy: null,
    executedAt: null,
    executedBy: null,
    expiresAt: now + (realAlert.timerSeconds || 900) * 1000,
    resolutionResult: null,
    rewardDistributed: false,
  }
  saveStore('incidents', incidents)
  logger.info('new incident registered', { incidentId, title: realAlert.title, severity: realAlert.severity })
  return incidents[incidentId]
}

// ---------------------------------------------------------------------------
// Голосование
// ---------------------------------------------------------------------------
export function castVote(wallet, incidentId, actionId) {
  const player = getOrCreatePlayer(wallet)
  if (player.banned) throw new Error('Аккаунт заблокирован')
  const role = player.role
  const incident = incidents[incidentId]

  if (!incident) throw new Error('Инцидент не найден')
  if (Date.now() < incident.publicVisibleAt) throw new Error('Инцидент ещё не доступен для голосования')
  if (!['open', 'voting'].includes(incident.status)) throw new Error('Голосование по этому инциденту закрыто')
  if (!incident.availableActions.includes(actionId)) throw new Error('Действие недоступно для этого инцидента')

  const actionDef = ALLOWED_ACTIONS[actionId]
  if (!role.canVoteOn.includes(actionDef.riskLevel)) throw new Error(`Ваш ранг не позволяет голосовать за действия ${({ safe: 'без риска', low: 'низкого риска', medium: 'среднего риска', high: 'высокого риска' })[actionDef.riskLevel] || 'этого уровня'}`)
  if (role.id !== 'staff' && !['hub', 'all'].includes(incident.game)) {
    const clearance = planetClearance(wallet)
    if (!clearance[incident.game]) throw new Error('Нет допуска к этой планете: нужно от 10 часов и ранг в этой игре')
  }
  if (!checkRateLimit(wallet, 'vote')) throw new Error('Слишком много голосов, подождите немного')

  // Проверка кулдауна на действие в данной игре
  const cooldownKey = `${incident.game}:${actionId}`
  if (actionCooldowns[cooldownKey] && Date.now() < actionCooldowns[cooldownKey]) {
    const wait = Math.ceil((actionCooldowns[cooldownKey] - Date.now()) / 60000)
    throw new Error(`Действие на игре перезаряжается, осталось ${wait} мин`)
  }

  // Удаляем старые голоса этого игрока
  Object.keys(incident.votes).forEach(aid => {
    incident.votes[aid] = incident.votes[aid].filter(v => v.wallet !== wallet)
  })
  const weight = calculateVoteWeight(player, role)
  incident.votes[actionId] = incident.votes[actionId] || []
  incident.votes[actionId].push({ wallet, weight, at: Date.now() })
  incident.status = 'voting'

  // Проверка консенсуса
  const tally = tallyVotes(incident)
  const leading = tally[0]
  if (leading) {
    const actionDef = ALLOWED_ACTIONS[leading.actionId]
    // Нужно и доля голосов, и минимальный абсолютный вес именно за это действие
    if (leading.share >= actionDef.consensusThresholdShare && leading.weight >= actionDef.consensusMinWeight) {
      // Дополнительная проверка для критических: минимум 50% старших смены
      let seniorOk = true
      if (actionDef.requiresSeniorApprove) {
        const seniorVotes = incident.votes[leading.actionId].filter(v => {
          const p = getOrCreatePlayer(v.wallet)
          return p.role.id === 'senior' || p.role.id === 'guardian' || p.role.id === 'staff'
        }).reduce((s, v) => s + v.weight, 0)
        seniorOk = seniorVotes >= 0.5 * ROLES.SENIOR.maxConcurrent * ROLES.SENIOR.canVoteWeight
      }
      if (seniorOk) {
        incident.winningAction = leading.actionId
        incident.consensusReachedAt = Date.now()
        incident.status = 'consensus_pending'
        logger.info('consensus reached', { incidentId, action: leading.actionId, share: leading.share, weight: leading.weight })
        journal('consensus', { incidentId, actionId: leading.actionId, share: Number(leading.share.toFixed(3)), weight: leading.weight })
        // Безопасные действия не требуют подтверждения сотрудника
        if (!actionDef.requiresApproval) scheduleAction(incident, null)
      }
    }
  }

  saveStore('incidents', incidents)
  journal('vote', { wallet, incidentId, actionId, weight })
  return incident
}

export function tallyVotes(incident) {
  const result = []
  const totalWeight = Object.values(incident.votes).flat().reduce((sum, v) => sum + v.weight, 0)
  if (totalWeight === 0) return []
  for (const [actionId, voters] of Object.entries(incident.votes)) {
    const weight = voters.reduce((sum, v) => sum + v.weight, 0)
    result.push({ actionId, weight, totalWeight, share: weight / totalWeight, voters: voters.length })
  }
  return result.sort((a,b) => b.weight - a.weight)
}

// ---------------------------------------------------------------------------
// Подтверждение, буфер, передача исполнителю и итог
//
//   consensus_pending ── сотрудник ──> approved ── буфер ──> handed_off ──> executed
//        │  (безопасные — без сотрудника)  │ отмена в буфер        │      └──> execution_failed
//        └──> rejected                     └──> cancelled          └ итог: колбэк исполнителя
//                                                                    или отметка сотрудника
// Хаб ничего не исполняет сам: решение уходит подписанным вебхуком исполнителю студии
// (action-dispatch.js). Репутация начисляется только за подтверждённое исполнение.
// ---------------------------------------------------------------------------
const INSTANCE_ID = randomUUID()
const CLAIM_MS = DELIVERY_TIMEOUT_MS * 3
const JOURNAL_LIMIT = 1000
const TERMINAL = ['executed', 'execution_failed', 'rejected', 'cancelled', 'expired']

function journal(type, data = {}) {
  journalLog.push({ at: Date.now(), type, ...data })
  if (journalLog.length > JOURNAL_LIMIT) journalLog.splice(0, journalLog.length - JOURNAL_LIMIT)
  saveStore('journal', journalLog)
}

const shortId = (w) => (typeof w === 'string' && w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w ?? null)

function requireStaff(wallet) {
  const player = getOrCreatePlayer(wallet)
  if (!player.role?.canApprove) throw Object.assign(new Error('Только сотрудники студии могут управлять исполнением'), { httpStatus: 403 })
  return player
}

/** Утверждённое решение ставится в буфер; при нулевом буфере сразу передаётся дальше. */
function scheduleAction(incident, approver) {
  const def = ALLOWED_ACTIONS[incident.winningAction]
  const now = Date.now()
  actionCooldowns[`${incident.game}:${incident.winningAction}`] = now + def.cooldownMinutes * 60 * 1000
  saveStore('cooldowns', actionCooldowns)
  incident.status = 'approved'
  incident.approvedBy = approver
  incident.approvedAt = now
  incident.scheduledFor = now + def.bufferMinutes * 60 * 1000
  journal('approved', { incidentId: incident.id, actionId: incident.winningAction, by: approver || 'consensus', scheduledFor: incident.scheduledFor })
  if (def.bufferMinutes === 0) handOff(incident)
}

export function approveAction(wallet, incidentId, approved) {
  requireStaff(wallet)
  const incident = incidents[incidentId]
  if (!incident) throw new Error('Инцидент не найден')
  if (incident.status !== 'consensus_pending') throw new Error('Нет консенсуса для подтверждения')

  if (approved) {
    scheduleAction(incident, wallet)
  } else {
    incident.status = 'rejected'
    incident.rejectedBy = wallet
    incident.rejectedAt = Date.now()
    // Штраф голосовавшим за отклонённое — небольшой
    const losingVoters = incident.votes[incident.winningAction] || []
    losingVoters.forEach(v => adjustReputation(v.wallet, -1, `rejected vote on ${incidentId}`))
    journal('rejected', { incidentId, actionId: incident.winningAction, by: wallet })
  }
  saveStore('incidents', incidents)
  return incident
}

/** Отмена в буфер: пока время ожидания не вышло, сотрудник может остановить решение. */
export function cancelAction(wallet, incidentId) {
  requireStaff(wallet)
  const incident = incidents[incidentId]
  if (!incident) throw new Error('Инцидент не найден')
  if (incident.status !== 'approved' || Date.now() >= incident.scheduledFor) throw new Error('Отменить можно только до конца времени ожидания')
  incident.status = 'cancelled'
  incident.cancelledBy = wallet
  incident.cancelledAt = Date.now()
  // Ничего не исполнено — перезарядка действия снимается, репутация не меняется
  delete actionCooldowns[`${incident.game}:${incident.winningAction}`]
  saveStore('cooldowns', actionCooldowns)
  saveStore('incidents', incidents)
  journal('cancelled', { incidentId, actionId: incident.winningAction, by: wallet })
  return incident
}

/** Буфер истёк: внутреннее действие выполняется сразу, остальное уходит исполнителю студии. */
function handOff(incident) {
  const def = ALLOWED_ACTIONS[incident.winningAction]
  const now = Date.now()
  incident.handedOffAt = now
  if (def.execution === 'internal') {
    finalize(incident, 'executed', { by: 'watchtower', detail: 'Алерт закрыт как ложный, внешние системы не затронуты' })
    return
  }
  const connected = executorStatus().connected
  incident.status = 'handed_off'
  incident.dispatch = {
    id: randomUUID(),
    mode: def.execution === 'propose' ? 'propose' : 'execute',
    state: connected ? 'pending' : 'manual',
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
  }
  journal('handed_off', { incidentId: incident.id, actionId: incident.winningAction, mode: incident.dispatch.mode, deliveryId: incident.dispatch.id, executor: connected })
  if (connected) setImmediate(kickWorker)
}

function finalize(incident, result, { by, detail = null }) {
  const now = Date.now()
  if (result === 'executed') {
    incident.status = 'executed'
    incident.executedAt = now
    incident.executedBy = by
    incident.resolutionResult = 'success'
    incident.resolutionDetail = detail
    // Награждаем правильно проголосовавших — только за подтверждённое исполнение
    const winningVoters = incident.votes[incident.winningAction] || []
    winningVoters.forEach(v => {
      const voter = getOrCreatePlayer(v.wallet)
      const repReward = 5 + Math.floor(voter.role.baseMultiplier * 3)
      adjustReputation(v.wallet, repReward, `correct resolution of ${incident.id}`)
    })
    // Небольшой штраф голосовавшим против, только после успешного исполнения
    Object.keys(incident.votes).forEach(aid => {
      if (aid === incident.winningAction) return
      incident.votes[aid].forEach(v => adjustReputation(v.wallet, -1, `wrong vote on ${incident.id}`))
    })
    executedActions.push({ id: randomUUID(), incidentId: incident.id, actionId: incident.winningAction, executedBy: by, at: now })
    saveStore('executed', executedActions)
    logger.warn('operator action executed', { incidentId: incident.id, action: incident.winningAction, by: shortId(by) })
  } else {
    // Сбой исполнения — не вина голосовавших: репутация не меняется
    incident.status = 'execution_failed'
    incident.failedAt = now
    incident.resolutionResult = 'failed'
    incident.resolutionDetail = detail
    logger.warn('operator action failed', { incidentId: incident.id, action: incident.winningAction })
  }
  journal(result === 'executed' ? 'executed' : 'execution_failed', { incidentId: incident.id, actionId: incident.winningAction, by })
  saveStore('incidents', incidents)
}

/** Что исполнитель сообщил об итоге (ответом на вебхук или колбэком). */
function applyExecutorResult(incident, result, detail) {
  const d = incident.dispatch
  if (result === 'accepted' || result === 'proposed') {
    d.result = result
    if (detail) d.detail = detail
    return { ok: true, status: incident.status }
  }
  // Высокий риск исполняется только людьми: сообщение исполнителя «выполнено» не закрывает решение
  if (result === 'executed' && d.mode === 'propose') {
    journal('executor_result_ignored', { incidentId: incident.id, reason: 'manual_confirmation_required' })
    return { ok: false, status: 409, reason: 'manual_confirmation_required' }
  }
  finalize(incident, result, { by: 'executor', detail })
  return { ok: true, status: incident.status }
}

function decisionPayload(incident) {
  const d = incident.dispatch
  const def = ALLOWED_ACTIONS[incident.winningAction]
  const lead = tallyVotes(incident).find((t) => t.actionId === incident.winningAction)
  return {
    deliveryId: d.id,
    attempt: d.attempts,
    sentAt: Date.now(),
    // execute — выполнить; propose — только подготовить предложение (мультисиг), ничего не исполняя
    mode: d.mode,
    incident: { id: incident.id, game: incident.game, title: incident.title, severity: incident.severity, detectedAt: incident.detectedAt },
    action: { id: def.id, title: def.title, riskLevel: def.riskLevel },
    decision: {
      share: lead ? Number(lead.share.toFixed(3)) : null,
      weight: lead?.weight ?? null,
      voters: lead?.voters ?? 0,
      staffApproved: Boolean(incident.approvedBy),
      approvedAt: incident.approvedAt ?? null,
      scheduledFor: incident.scheduledFor ?? null,
    },
    callbackPath: '/api/operator/executor/result',
  }
}

function recordDelivery(incidentId, deliveryId, outcome) {
  const incident = incidents[incidentId]
  const d = incident?.dispatch
  // Итог мог прийти колбэком раньше, чем закончилась попытка
  if (!d || d.id !== deliveryId || incident.status !== 'handed_off') return
  const now = Date.now()
  d.claimedBy = null
  d.claimUntil = null
  if (outcome.ok) {
    d.state = 'delivered'
    d.deliveredAt = now
    d.lastError = null
    journal('delivered', { incidentId, deliveryId, attempt: d.attempts, result: outcome.result })
    applyExecutorResult(incident, outcome.result, outcome.detail)
  } else {
    d.lastError = outcome.error
    const delays = retryDelays()
    if (d.attempts >= delays.length) {
      d.state = 'undelivered'
      journal('delivery_failed', { incidentId, deliveryId, attempts: d.attempts, reason: outcome.error })
      logger.error('executor_undelivered', { incidentId, deliveryId, attempts: d.attempts })
    } else {
      const wait = delays[d.attempts - 1]
      d.nextAttemptAt = now + wait
      // Повтор по местному таймеру; если этот экземпляр упадёт, решение подберёт другой
      setTimeout(kickWorker, wait + 10).unref?.()
    }
  }
  saveStore('incidents', incidents)
}

function dueDispatches(now) {
  return Object.values(incidents).filter((inc) => {
    const d = inc.dispatch
    return inc.status === 'handed_off' && d?.state === 'pending' && d.nextAttemptAt <= now && !(d.claimUntil > now)
  })
}

let workerBusy = false
function kickWorker() { runDispatchWorker().catch((error) => logger.warn('dispatch_worker_failed', { message: error.message })) }
/**
 * Доставляет решения, у которых подошло время попытки. Решение сначала «забирается» под
 * общей блокировкой (claimUntil), поэтому при нескольких экземплярах API его отправит один.
 * Сама отправка идёт вне блокировки; deliveryId — ключ идемпотентности для исполнителя.
 */
export async function runDispatchWorker() {
  if (workerBusy || !executorStatus().connected || !dueDispatches(Date.now()).length) return 0
  workerBusy = true
  try {
    const claimed = await operatorWrite(() => {
      const now = Date.now()
      const due = dueDispatches(now)
      for (const inc of due) {
        inc.dispatch.claimedBy = INSTANCE_ID
        inc.dispatch.claimUntil = now + CLAIM_MS
        inc.dispatch.attempts += 1
      }
      if (due.length) saveStore('incidents', incidents)
      return due.map(decisionPayload)
    })
    for (const payload of claimed) {
      const outcome = await deliverDecision(payload)
      await operatorWrite(() => recordDelivery(payload.incident.id, payload.deliveryId, outcome))
    }
    return claimed.length
  } finally {
    workerBusy = false
  }
}

/** Колбэк исполнителя студии (подпись проверена в маршруте). */
export function handleExecutorResult({ deliveryId, status, detail } = {}) {
  if (!EXECUTOR_RESULTS.includes(status)) return { ok: false, status: 400, reason: 'bad_status' }
  const incident = Object.values(incidents).find((inc) => inc.dispatch?.id === deliveryId)
  if (!incident) return { ok: false, status: 404, reason: 'unknown_delivery' }
  if (TERMINAL.includes(incident.status)) return { ok: true, already: true, status: incident.status }
  const d = incident.dispatch
  if (d.state === 'pending' || d.state === 'undelivered') {
    // Ответ на вебхук потерялся, но исполнитель решение получил
    d.state = 'delivered'
    d.deliveredAt = Date.now()
    d.claimedBy = null
    d.claimUntil = null
  }
  const out = applyExecutorResult(incident, status, typeof detail === 'string' ? detail.slice(0, 300) : null)
  journal('executor_result', { incidentId: incident.id, deliveryId, result: status })
  saveStore('incidents', incidents)
  return out
}

/**
 * Итог от сотрудника: без исполнителя, для высокого риска (только ручное исполнение) и когда
 * доставка не удалась. retry — снова отправить исполнителю после неудачной доставки.
 */
export function resolveAction(wallet, incidentId, result, note) {
  requireStaff(wallet)
  const incident = incidents[incidentId]
  if (!incident) throw new Error('Инцидент не найден')
  if (incident.status !== 'handed_off') throw new Error('Решение сейчас не ждёт исполнения')
  const detail = typeof note === 'string' && note.trim() ? note.trim().slice(0, 300) : null
  if (result === 'retry') {
    const d = incident.dispatch
    if (!executorStatus().connected) throw new Error('Исполнитель студии не подключён')
    if (d.state !== 'undelivered') throw new Error('Повторная отправка нужна только после неудачной доставки')
    Object.assign(d, { state: 'pending', attempts: 0, nextAttemptAt: Date.now(), lastError: null, claimedBy: null, claimUntil: null })
    journal('redelivery', { incidentId, by: wallet })
    saveStore('incidents', incidents)
    setImmediate(kickWorker)
    return incident
  }
  if (!['executed', 'failed'].includes(result)) throw new Error('Итог: выполнено или не удалось')
  finalize(incident, result, { by: wallet, detail })
  return incident
}

/** Последние записи журнала вахты; кошельки укорочены. */
export function operatorJournal(limit = 100) {
  return journalLog.slice(-Math.min(Math.max(1, limit), JOURNAL_LIMIT)).reverse()
    .map((e) => ({ ...e, ...(e.wallet ? { wallet: shortId(e.wallet) } : {}), ...(e.by ? { by: shortId(e.by) } : {}) }))
}

// ---------------------------------------------------------------------------
// Периодические задачи
// ---------------------------------------------------------------------------
export function rotateSeniorOperators() {
  const sorted = Object.values(players)
    .filter(p => !p.banned && p.role?.id === 'senior')
    .sort((a,b) => b.reputation - a.reputation)
    .slice(0, ROLES.SENIOR.maxConcurrent)
  shiftStatus.seniorOperators = sorted.map(p => p.wallet)
  shiftStatus.lastRotation = Date.now()
  saveStore('shift', shiftStatus)
  logger.info('senior rotation done', { seniors: shiftStatus.seniorOperators.length })
}

/** Есть ли работа для таймера — проверяется без блокировки, чтобы не писать в базу впустую. */
function tickDue(now) {
  if (now - shiftStatus.lastRotation > 60 * 60 * 1000) return true
  if (partnerTickDue(now)) return true
  return Object.values(incidents).some((inc) =>
    (['open', 'voting'].includes(inc.status) && now > inc.expiresAt) ||
    (inc.status === 'approved' && inc.scheduledFor && now >= inc.scheduledFor))
}

export function periodicTick() {
  const now = Date.now()
  // Ротация старших раз в час
  if (now - shiftStatus.lastRotation > 60 * 60 * 1000) rotateSeniorOperators()
  // Коды входа живут в общем кэше (shared-cache.js) и истекают сами
  let changed = false
  Object.values(incidents).forEach(inc => {
    if (['open','voting'].includes(inc.status) && now > inc.expiresAt) { inc.status = 'expired'; changed = true }
    // Буфер истёк — решение передаётся на исполнение
    if (inc.status === 'approved' && inc.scheduledFor && now >= inc.scheduledFor) { handOff(inc); changed = true }
  })
  if (changed) saveStore('incidents', incidents)
  // Партнёры: истечение окна квалификации и разморозка наград
  partnerTick(now)
}
const background = (name, fn) => operatorWrite(fn).catch((error) => logger.warn('operator_background_failed', { task: name, message: error.message }))
setInterval(() => { if (tickDue(Date.now())) background('tick', periodicTick) }, 10 * 1000).unref?.()
setInterval(kickWorker, 5 * 1000).unref?.()
// Очистка рейтлимитов раз в 10 минут
setInterval(() => background('ratelimits', () => { rateLimits = {}; saveStore('ratelimits', rateLimits) }), 10 * 60 * 1000).unref?.()

// ---------------------------------------------------------------------------
// Публичное состояние
// ---------------------------------------------------------------------------
export function operatorGameState(forWallet) {
  const player = forWallet ? players[walletKey(forWallet)] : null
  return {
    roles: ROLES,
    allowedActions: ALLOWED_ACTIONS,
    clearanceRule: PLANET_CLEARANCE,
    incidents: Object.values(incidents)
      .filter(i => Date.now() >= i.publicVisibleAt) // Не показываем критические инциденты раньше времени
      .sort((a,b) => b.detectedAt - a.detectedAt)
      .map(inc => ({
        ...inc,
        approvedBy: shortId(inc.approvedBy),
        rejectedBy: shortId(inc.rejectedBy),
        cancelledBy: shortId(inc.cancelledBy),
        executedBy: shortId(inc.executedBy),
        // Внутренние поля доставки (кто из экземпляров отправляет) наружу не уходят
        dispatch: inc.dispatch ? {
          mode: inc.dispatch.mode, state: inc.dispatch.state, attempts: inc.dispatch.attempts,
          nextAttemptAt: inc.dispatch.state === 'pending' ? inc.dispatch.nextAttemptAt : null,
          deliveredAt: inc.dispatch.deliveredAt ?? null, result: inc.dispatch.result ?? null,
          detail: inc.dispatch.detail ?? null, lastError: inc.dispatch.lastError ?? null,
        } : null,
        // Скрываем детали критических инцидентов до разрешения
        description: inc.severity === 'critical' && inc.status !== 'executed' && inc.status !== 'rejected'
          ? 'Подозрительная активность, детали проверяются командой безопасности'
          : inc.description,
        tally: tallyVotes(inc),
        votes: Object.fromEntries(Object.entries(inc.votes).map(([aid, v]) => [aid, {
          count: v.length,
          totalWeight: v.reduce((s,x)=>s+x.weight,0),
          myVote: forWallet ? v.some(x => x.wallet === walletKey(forWallet)) : false,
        }])),
      })),
    shift: shiftStatus,
    executor: executorStatus(),
    leaderboard: Object.values(players)
      .filter(p => !p.banned)
      .sort((a,b) => b.reputation - a.reputation)
      .slice(0, 100)
      .map(p => ({
        wallet: p.wallet.slice(0,4) + '…' + p.wallet.slice(-4),
        reputation: p.reputation,
        role: p.role?.id,
        correctDecisions: p.correctDecisions,
      })),
    totalOperators: Object.keys(players).filter(k => !players[k].banned).length,
    myProgress: player ? { ...player, role: player.role } : null,
  }
}

// ---------------------------------------------------------------------------
// Проверка правил вахты. Ответы хранятся только на сервере, клиент получает вопросы без ключа.
// Сдача (4 из 5) — обязательный шаг к роли «Наблюдатель» наряду с часами и рангом в игре.
// ---------------------------------------------------------------------------
const EXAM = [
  { id: 'q1', text: 'Игра перестала присылать данные. Что показывает обсерватория?', options: ['Ноль на всех графиках', 'Пометку «нет данных», ничего не подставляя', 'Цифры за прошлую неделю'], answer: 1 },
  { id: 'q2', text: 'Кто исполняет решения вахты среднего и высокого риска?', options: ['Они исполняются автоматически сразу после голосования', 'Только студия, после ручного подтверждения', 'Любой оператор с высоким рангом'], answer: 1 },
  { id: 'q3', text: 'Можно ли получить право голоса, внеся SOL в стейкинг?', options: ['Да, стейкинг открывает доступ', 'Нет: стейкинг только усиливает вес уже заслуженного ранга'], answer: 1 },
  { id: 'q4', text: 'Вы видите всплеск сделок, но не знаете, боты это или турнир. Лучший первый шаг?', options: ['Поставить контракт на паузу', 'Повысить приоритет и сначала разобраться', 'Сразу отметить как ложное срабатывание'], answer: 1 },
  { id: 'q5', text: 'Можно ли голосовать по аномалии игры, в которой у вас нет прогресса?', options: ['Да, голосовать можно везде', 'Нет, нужен допуск этой планеты: часы и ранг в игре'], answer: 1 },
]
const EXAM_PASS = 4
const EXAM_RETRY_MS = 10 * 60 * 1000

export function connectWallet(wallet) {
  const player = getOrCreatePlayer(wallet)
  if (!player.connectedWallet) { player.connectedWallet = true; player.connectedAt = Date.now(); saveStore('players', players) }
  return playerProfile(wallet)
}

export function examQuestions() {
  return { pass: EXAM_PASS, total: EXAM.length, questions: EXAM.map(({ id, text, options }) => ({ id, text, options })) }
}

export function submitExam(wallet, answers = {}) {
  const player = getOrCreatePlayer(wallet)
  if (player.banned) throw new Error('Аккаунт заблокирован')
  if (player.passedTest) return { passed: true, correct: EXAM.length, total: EXAM.length, already: true, player: playerProfile(wallet) }
  const wait = (player.examFailedAt || 0) + EXAM_RETRY_MS - Date.now()
  if (wait > 0) throw new Error(`Повторить проверку можно через ${Math.ceil(wait / 60000)} мин`)
  const correct = EXAM.filter((q) => Number(answers?.[q.id]) === q.answer).length
  const passed = correct >= EXAM_PASS
  if (passed) { player.passedTest = true; player.passedTestAt = Date.now() } else player.examFailedAt = Date.now()
  saveStore('players', players)
  logger.info('operator exam', { wallet: player.wallet, correct, passed })
  return { passed, correct, total: EXAM.length, player: playerProfile(wallet) }
}

/** Профиль для чтения: незнакомый кошелёк не создаётся и не сохраняется. */
function viewPlayer(wallet) {
  const key = walletKey(wallet)
  const stored = players[key]
  const base = stored || { wallet: key, joinedAt: null, daysActive: 0, lastActive: null, reputation: 0, correctDecisions: 0, wrongDecisions: 0, passedTest: false, staking: 0, banned: false, banReason: null, unknown: true }
  return { ...base, role: calculatePlayerRole(base) }
}

export function playerProfile(wallet) {
  const p = viewPlayer(wallet)
  const progress = getGameProgress(wallet)
  return { ...p, role: p.role, gameProgress: progress, progressSource: progressSource(wallet), progressSources: progressSources(), clearance: planetClearance(wallet), clearanceRule: PLANET_CLEARANCE }
}

// Инициализация
function seedDemoIncidents() {
  registerIncident({ id: 'demo_bot_farm_001', title: 'Подозрение на ферму ботов', description: 'Всплеск транзакций в Neon Relay', severity: 'warn', game: 'neonrelay', timerSeconds: 600, demo: true })
  registerIncident({ id: 'demo_ddos_001', title: 'DDoS на хаб', description: 'Повышенный трафик на ingestion', severity: 'bad', game: 'hub', timerSeconds: 300, demo: true })
}
logger.info('Watchtower Operator SECURE module loaded, all protections active', { production: isProduction })

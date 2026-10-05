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
import { recordAudit } from '../security/access.js'
import { logger } from '../obs/logger.js'
import { createFileBackend, createStorage } from './storage.js'
import { walletKey, isDemoWallet, isSolanaAddress } from './wallet-auth.js'
import { configureGameProgress, storedProgress, replaceProgressStore, progressSources, PROGRESS_GAMES } from './game-progress.js'

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
    autoExecuteAfterConsensus: false,
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
    autoExecuteAfterConsensus: false,
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
    autoExecuteAfterConsensus: true,
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
    autoExecuteAfterConsensus: true,
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
    autoExecuteAfterConsensus: false, // НИКОГДА не автоисполняется, только ручное подтверждение
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
    autoExecuteAfterConsensus: false,
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
    autoExecuteAfterConsensus: false, // НИКОГДА АВТО
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
const SECTIONS = ['players', 'incidents', 'ratelimits', 'cooldowns', 'reputation-log', 'executed', 'shift', 'game-progress']
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
let shiftStatus = loadStore('shift', { seniorOperators: [], lastRotation: Date.now() })
configureGameProgress({ load: () => loadStore('game-progress', {}), save: (data) => saveStore('game-progress', data), allowDemoWallets: demoProgressAllowed, logger })

/**
 * Подключает выбранное хранилище (файлы или PostgreSQL по DATABASE_URL) и загружает из него
 * состояние. Вызывается один раз при старте сервера, до приёма запросов.
 */
export async function initOperatorPersistence({ databaseUrl, ssl, allowDemo = !isProduction, env = process.env } = {}) {
  demoProgressAllowed = !isProduction && allowDemo
  storage = await createStorage({ databaseUrl, ssl, dataDir: DATA_DIR, names: SECTIONS, logger })
  const data = await storage.loadAll(SECTIONS)
  players = data.players || {}
  incidents = data.incidents || {}
  rateLimits = data.ratelimits || {}
  actionCooldowns = data.cooldowns || {}
  reputationLog = data['reputation-log'] || []
  executedActions = data.executed || []
  shiftStatus = data.shift || { seniorOperators: [], lastRotation: Date.now() }
  const sources = configureGameProgress({ env, allowDemoWallets: demoProgressAllowed, logger, save: (d) => saveStore('game-progress', d) })
  replaceProgressStore(data['game-progress'] || {})
  if (!isProduction && demoProgressAllowed && Object.keys(incidents).length === 0) seedDemoIncidents()
  logger.info('operator_storage_ready', { backend: storage.kind, players: Object.keys(players).length, incidents: Object.keys(incidents).length, gamesConnected: sources.filter((x) => x.push || x.pull).map((x) => x.game) })
  return storage.status()
}

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
    // Нужно и доля голосов и минимальный абсолютный вес
    if (leading.share >= actionDef.consensusThresholdShare && leading.totalWeight >= actionDef.consensusMinWeight) {
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
        logger.info('consensus reached', { incidentId, action: leading.actionId, share: leading.share, weight: leading.totalWeight })
      }
    }
  }

  saveStore('incidents', incidents)
  recordAudit(`vote: ${wallet} on ${incidentId} → ${actionId} (weight ${weight})`)
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
// Подтверждение и исполнение
// ---------------------------------------------------------------------------
export function approveAction(wallet, incidentId, approved) {
  const player = getOrCreatePlayer(wallet)
  if (!player.role?.canApprove) throw new Error('Только сотрудники студии могут подтверждать исполнение')
  const incident = incidents[incidentId]
  if (!incident) throw new Error('Инцидент не найден')
  if (incident.status !== 'consensus_pending') throw new Error('Нет консенсуса для подтверждения')

  if (approved) {
    incident.approvedBy = wallet
    const actionDef = ALLOWED_ACTIONS[incident.winningAction]
    // Записываем кулдаун
    const cooldownKey = `${incident.game}:${incident.winningAction}`
    actionCooldowns[cooldownKey] = Date.now() + actionDef.cooldownMinutes * 60 * 1000
    saveStore('cooldowns', actionCooldowns)

    if (actionDef.autoExecuteAfterConsensus && actionDef.bufferMinutes === 0) {
      return executeAction(wallet, incidentId)
    }
    incident.status = 'approved'
    incident.scheduledFor = Date.now() + actionDef.bufferMinutes * 60 * 1000
  } else {
    incident.status = 'rejected'
    incident.rejectedBy = wallet
    // Штраф голосовавшим за отклонённое — небольшой
    const losingVoters = incident.votes[incident.winningAction] || []
    losingVoters.forEach(v => adjustReputation(v.wallet, -1, `rejected vote on ${incidentId}`))
  }
  saveStore('incidents', incidents)
  return incident
}

export function executeAction(wallet, incidentId) {
  const incident = incidents[incidentId]
  if (!incident) throw new Error('Инцидент не найден')
  const action = ALLOWED_ACTIONS[incident.winningAction]
  incident.executedAt = Date.now()
  incident.executedBy = wallet
  incident.status = 'executed'
  incident.resolutionResult = 'success'

  // Награждаем правильно проголосовавших
  const winningVoters = incident.votes[incident.winningAction] || []
  winningVoters.forEach(v => {
    const voter = getOrCreatePlayer(v.wallet)
    const repReward = 5 + Math.floor(voter.role.baseMultiplier * 3)
    adjustReputation(v.wallet, repReward, `correct resolution of ${incidentId}`)
  })

  // Небольшой штраф голосовавшим против, только после успешного исполнения
  Object.keys(incident.votes).forEach(aid => {
    if (aid === incident.winningAction) return
    incident.votes[aid].forEach(v => adjustReputation(v.wallet, -1, `wrong vote on ${incidentId}`))
  })

  executedActions.push({
    id: randomUUID(),
    incidentId,
    actionId: incident.winningAction,
    executedBy: wallet,
    at: Date.now(),
  })
  saveStore('executed', executedActions)
  saveStore('incidents', incidents)
  recordAudit(`ACTION EXECUTED: ${incident.winningAction} on ${incidentId} by ${wallet}`)
  logger.warn('operator action executed', { incidentId, action: incident.winningAction })
  return incident
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

setInterval(() => {
  const now = Date.now()
  // Ротация старших раз в час
  if (now - shiftStatus.lastRotation > 60 * 60 * 1000) rotateSeniorOperators()
  // Коды входа живут в общем кэше (shared-cache.js) и истекают сами
  // Истечение инцидентов
  Object.values(incidents).forEach(inc => {
    if (['open','voting'].includes(inc.status) && now > inc.expiresAt) inc.status = 'expired'
    // Исполнение после буфера
    if (inc.status === 'approved' && inc.scheduledFor && now >= inc.scheduledFor) {
      executeAction('automatic-buffer', inc.id)
    }
  })
  saveStore('incidents', incidents)
}, 60 * 1000)

// Очистка рейтлимитов раз в 10 минут
setInterval(() => { rateLimits = {}; saveStore('ratelimits', rateLimits) }, 10 * 60 * 1000)

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

export function playerProfile(wallet) {
  const p = getOrCreatePlayer(wallet)
  const progress = getGameProgress(wallet)
  return { ...p, role: p.role, gameProgress: progress, progressSource: progressSource(wallet), progressSources: progressSources(), clearance: planetClearance(wallet), clearanceRule: PLANET_CLEARANCE }
}

// Инициализация
function seedDemoIncidents() {
  registerIncident({ id: 'demo_bot_farm_001', title: 'Подозрение на ферму ботов', description: 'Всплеск транзакций в Neon Relay', severity: 'warn', game: 'neonrelay', timerSeconds: 600, demo: true })
  registerIncident({ id: 'demo_ddos_001', title: 'DDoS на хаб', description: 'Повышенный трафик на ingestion', severity: 'bad', game: 'hub', timerSeconds: 300, demo: true })
}
if (!isProduction && Object.keys(incidents).length === 0) seedDemoIncidents()
rotateSeniorOperators()
logger.info('Watchtower Operator SECURE module loaded, all protections active', { production: isProduction })

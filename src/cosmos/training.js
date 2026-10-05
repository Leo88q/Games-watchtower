// ---------------------------------------------------------------------------
// Тренажёр оператора. Все данные здесь вымышлены и помечены как тренировочные.
// Ответы — ровно те действия, что доступны операторам в бою, поэтому навык
// переносится на реальную вахту один в один.
// ---------------------------------------------------------------------------
import { BODIES } from './world.js'

export const DIFFICULTIES = [
  { id: 'easy', name: 'Стажёр', about: 'Аномалии редкие, советник никогда не ошибается.', minutes: 4, spawn: [20, 30], maxActive: 3, lie: 0, regen: 3, time: 1.3 },
  { id: 'normal', name: 'Оператор', about: 'Обычная смена. Во второй половине советник иногда ошибается.', minutes: 6, spawn: [14, 22], maxActive: 4, lie: 0.2, regen: 4, time: 1 },
  { id: 'hard', name: 'Старший смены', about: 'Плотный поток, меньше энергии, советнику верить осторожно.', minutes: 8, spawn: [10, 16], maxActive: 5, lie: 0.3, regen: 4.5, time: 0.85 },
  { id: 'nightmare', name: 'Чёрный лебедь', about: 'Всё сразу и везде. Советник ошибается часто.', minutes: 10, spawn: [7, 12], maxActive: 6, lie: 0.4, regen: 5, time: 0.75 },
]

const RISK = { mark_false_positive: 'safe', increase_priority: 'safe', notify_status_page: 'low', enable_captcha: 'low', disable_ingress: 'medium', pause_bridge: 'medium', pause_contract: 'high' }
const COST = { safe: 1, low: 2, medium: 3, high: 5 }
const EFFECT = {
  best: { stability: 14, trust: 4, score: 100 },
  ok: { stability: 7, trust: 1, score: 50 },
  weak: { stability: -4, trust: -2, score: 10 },
  bad: { stability: -16, trust: -8, score: -20 },
}
const DRAIN = { critical: 0.9, warn: 0.5, info: 0.25 }
const TIMER = { critical: 40, warn: 55, info: 70 }

// [качество, объяснение] для каждого допустимого ответа
const CATALOG = [
  // ---------------- ARES-1 ----------------
  { id: 'ares-storm', body: 'ares1', region: 'domes', severity: 'warn', title: 'Пыльная буря над куполами', description: 'Сервер колонии отвечает с задержкой 8–12 секунд, игроки жалуются, что не могут собрать урожай.', hint: 'Телеметрия: программа в блокчейне работает штатно, тормозит только игровой сервер. Деньги игроков в безопасности, но им нужно объяснить, что происходит.', outcomes: {
    notify_status_page: ['best', 'Верно. Средства не под угрозой, а игрокам важно знать, что урожай не пропадёт: он копится до 7 дней.'],
    increase_priority: ['ok', 'Неплохо: команда починит сервер. Но игроки так и не узнали, что происходит, и продолжают паниковать.'],
    pause_contract: ['bad', 'Перебор. Контракт исправен — пауза остановила всю экономику колонии из-за медленного сервера.'],
    mark_false_positive: ['weak', 'Задержка реальная, её чувствуют игроки. Закрыв тревогу, вы оставили их без ответа.'],
  } },
  { id: 'ares-phobos', body: 'ares1', region: 'domes', severity: 'info', title: 'Полнолуние Фобоса: выпуск $POTATO вырос на 15%', description: 'Детектор заметил, что модули капают картофель быстрее обычного, выпуск эпохи близок к потолку.', hint: 'Телеметрия: идёт пик лунного цикла, множитель выпуска 1,15×. Это заложено в правила игры, потолок эпохи соблюдается.', outcomes: {
    mark_false_positive: ['best', 'Верно. Лунный цикл Фобоса меняет выпуск от 0,85× до 1,15× по правилам игры. Паниковать не из-за чего.'],
    notify_status_page: ['weak', 'Лишнее: сообщение о «проблеме», которой нет, только пугает игроков.'],
    increase_priority: ['weak', 'Вы разбудили дежурных из-за штатной механики. В следующий раз проверьте телеметрию.'],
    pause_contract: ['bad', 'Серьёзная ошибка: остановлена исправная экономика из-за запланированного полнолуния.'],
  } },
  { id: 'ares-wave', body: 'ares1', region: 'pad', severity: 'warn', title: 'Волна регистраций с одного источника', description: 'За 10 минут 400 новых колонистов по одной реферальной ссылке, все сразу идут на биржу.', hint: 'Телеметрия: кошельки созданы минуту назад, действуют по одному сценарию. Похоже на ферму ботов, которая ловит реферальные проценты.', outcomes: {
    enable_captcha: ['best', 'Верно. Проверка на входе отсекает ботов и не мешает живым игрокам.'],
    increase_priority: ['ok', 'Команда разберётся, но боты продолжают регистрироваться, пока она просыпается.'],
    mark_false_positive: ['bad', 'Это ферма ботов: она высасывает реферальные проценты из честных игроков.'],
    pause_contract: ['weak', 'Сработает, но заодно остановит всю колонию. Слишком тяжёлое средство против ботов.'],
  } },
  { id: 'ares-treasury', body: 'ares1', region: 'treasury', severity: 'critical', title: 'Необычное списание из казны колонии', description: 'Из казны ушла сумма, втрое больше обычного недельного расхода, на незнакомый адрес.', hint: 'Телеметрия: списание подписано ключом, который раньше не использовался. Повторные попытки продолжаются.', outcomes: {
    increase_priority: ['best', 'Верно. Активная угроза казне — немедленно поднять людей, у которых есть доступ к мультиподписи.'],
    pause_contract: ['ok', 'Остановило утечку, но аварийная пауза — крайняя мера: её всё равно подтверждает студия, а без дежурных никто не расследует причину.'],
    notify_status_page: ['weak', 'Игроков предупредили, но утечка продолжается.'],
    mark_false_positive: ['bad', 'Катастрофа: вы закрыли тревогу при живой утечке из казны.'],
  } },
  // ---------------- NeuroForge ----------------
  { id: 'nf-load', body: 'aof', region: 'lab', severity: 'warn', title: 'Перегрузка сети: обучение моделей зависает', description: 'Транзакции обучения висят по несколько минут, игроки тратят энергию повторно.', hint: 'Телеметрия: сеть Solana перегружена, у игры всё в порядке. Повторные клики не ускоряют рост — энергия просто сгорает.', outcomes: {
    notify_status_page: ['best', 'Верно. Игрокам надо сказать: подождите, не жмите повторно — это прямо есть в правилах NeuroForge.'],
    increase_priority: ['ok', 'Дежурные посмотрят, но починить сеть Solana они не могут. Игроки продолжают жечь энергию.'],
    disable_ingress: ['weak', 'Защита от флуда здесь не поможет — перегружена сама сеть, а не наш вход.'],
    mark_false_positive: ['bad', 'Проблема реальная: игроки теряют энергию на повторных кликах.'],
  } },
  { id: 'nf-support', body: 'aof', region: 'market', severity: 'critical', title: 'Фальшивая «поддержка» просит сид-фразы', description: 'В чате игры аккаунт с логотипом студии предлагает «верифицировать кошелёк» по ссылке.', hint: 'Телеметрия: аккаунт не принадлежит студии, ссылка ведёт на поддельный сайт. Уже есть жалобы.', outcomes: {
    notify_status_page: ['best', 'Верно. Срочное предупреждение всем: поддержка никогда не просит сид-фразу. Каждая минута — новые жертвы.'],
    increase_priority: ['ok', 'Команда займётся удалением аккаунта, но игроки пока не предупреждены.'],
    pause_contract: ['bad', 'Контракт тут ни при чём — мошенники работают вне игры. Пауза только навредила честным игрокам.'],
    mark_false_positive: ['bad', 'Это настоящий фишинг. Закрыв тревогу, вы оставили игроков под ударом.'],
  } },
  { id: 'nf-bridge', body: 'aof', region: 'core', severity: 'critical', title: 'Квантовый мост: подозрительный поток $POTATO', description: 'Через мост из ARES-1 идёт поток в 40 раз больше обычного с горстки новых кошельков.', hint: 'Телеметрия: на стороне ARES-1 токены не сжигаются, а на стороне NeuroForge зачисляются. Похоже на эксплойт моста.', outcomes: {
    pause_bridge: ['best', 'Верно. Точечная пауза моста останавливает эксплойт и не трогает обе игры целиком.'],
    increase_priority: ['ok', 'Нужно, но пока команда просыпается, мост продолжают опустошать.'],
    pause_contract: ['weak', 'Слишком широко: остановлена вся игра, хотя достаточно было закрыть мост.'],
    mark_false_positive: ['bad', 'Это эксплойт: токены создаются из воздуха.'],
  } },
  { id: 'nf-bots', body: 'aof', region: 'lab', severity: 'info', title: 'Слишком ровный ритм сбора урожая', description: '200 кошельков собирают образцы ровно каждые 30 минут, секунда в секунду, круглые сутки.', hint: 'Телеметрия: энергия восстанавливается раз в 30 минут — кошельки ловят её с точностью до секунды. Живые люди так не играют.', outcomes: {
    enable_captcha: ['best', 'Верно. Проверка на входе ломает автоматические скрипты, а живые игроки её почти не заметят.'],
    increase_priority: ['ok', 'Можно, но это не срочно и вполне решается проверкой на входе.'],
    mark_false_positive: ['weak', 'Это боты. Они размывают награды честных игроков.'],
    pause_contract: ['bad', 'Остановить всю игру из-за ботов-фермеров — непропорционально.'],
  } },
  // ---------------- GUTTERCAPS ----------------
  { id: 'gc-oracle', body: 'guttercaps', region: 'wall', severity: 'warn', title: 'Оракул не раскрывает паки', description: 'Уже 20 минут купленные паки не вскрываются, игроки боятся за деньги.', hint: 'Телеметрия: оракул случайности задерживается. По правилам игры через ~72 минуты оплату можно вернуть автоматически, а наш обработчик вскроет пак, когда оракул ответит.', outcomes: {
    notify_status_page: ['best', 'Верно. Деньги защищены самим контрактом — игрокам нужно это объяснить и успокоить их.'],
    increase_priority: ['ok', 'Команда проверит оракул, но игроки пока в панике.'],
    pause_contract: ['bad', 'Пауза не нужна: возвраты уже встроены в контракт.'],
    mark_false_positive: ['weak', 'Задержка реальная — игрокам нужен ответ.'],
  } },
  { id: 'gc-quests', body: 'guttercaps', region: 'market', severity: 'info', title: 'Сотни кошельков упираются в лимит квестов', description: 'Много аккаунтов ежедневно получают ровно 15 $CG — максимум в день.', hint: 'Телеметрия: лимиты квестов срабатывают ровно как задумано — фарм упирается в потолок 15 $CG в день и 120 в неделю.', outcomes: {
    mark_false_positive: ['best', 'Верно. Антифарм-лимиты сработали штатно: больше потолка никто не получил.'],
    enable_captcha: ['ok', 'Допустимо, но лимиты уже защищают экономику.'],
    increase_priority: ['weak', 'Не срочно: защита работает автоматически.'],
    pause_contract: ['bad', 'Остановка игры из-за сработавшей защиты — ошибка.'],
  } },
  { id: 'gc-collusion', body: 'guttercaps', region: 'arena', severity: 'warn', title: 'Подозрительная серия на арене Cap Slam', description: 'Два кошелька сыграли между собой 60 матчей подряд, и один всегда выигрывает.', hint: 'Телеметрия: кошельки пополнены с одного адреса. Похоже на перекачку ставок и фарм сезонного рейтинга.', outcomes: {
    increase_priority: ['best', 'Верно. Сговор — вопрос расследования и решения людей, а не автоматического действия.'],
    enable_captcha: ['weak', 'Не поможет: это не бот, а два аккаунта одного человека.'],
    mark_false_positive: ['bad', 'Это классический сговор, он искажает сезонный рейтинг.'],
    pause_contract: ['bad', 'Остановить всю арену из-за двух кошельков — слишком.'],
  } },
  { id: 'gc-flood', body: 'guttercaps', region: 'drain', severity: 'critical', title: 'Второй потоп: флуд на индексатор', description: 'Индексатор захлёбывается: 30 тысяч запросов в секунду, лидерборды не обновляются.', hint: 'Телеметрия: запросы идут с тысяч адресов по одному шаблону — это DDoS, а не живые игроки.', outcomes: {
    disable_ingress: ['best', 'Верно. Защита от флуда отсекает мусорный трафик, а данные в блокчейне в безопасности.'],
    increase_priority: ['ok', 'Нужно, но атака продолжается, пока команда разбирается.'],
    notify_status_page: ['weak', 'Игроков предупредили, но атаку никто не остановил.'],
    mark_false_positive: ['bad', 'Это атака.'],
  } },
  // ---------------- Neon Relay ----------------
  { id: 'nr-bots', body: 'neonrelay', region: 'garage', severity: 'warn', title: 'Боты в квалификации', description: 'В квалификацию записались 300 гонщиков с одинаковыми именами и одинаковыми временами круга.', hint: 'Телеметрия: аккаунты созданы скриптом и проходят трассу по одной траектории.', outcomes: {
    enable_captcha: ['best', 'Верно. Проверка на входе отсеет скрипты до старта.'],
    increase_priority: ['ok', 'Сработает, но медленнее.'],
    mark_false_positive: ['bad', 'Боты заберут призовые места у живых гонщиков.'],
    pause_contract: ['weak', 'Слишком тяжёлое средство против ботов.'],
  } },
  { id: 'nr-prize', body: 'neonrelay', region: 'prize', severity: 'critical', title: 'Призовой фонд опустошается', description: 'Призовой фонд заезда уменьшился на 70% за минуту, хотя заезд ещё идёт.', hint: 'Телеметрия: функция выплаты вызывается повторно до завершения заезда — активный эксплойт контракта.', outcomes: {
    pause_contract: ['best', 'Верно. Активный эксплойт — тот редкий случай, когда аварийная пауза оправдана. Её подтвердит студия.'],
    increase_priority: ['ok', 'Нужно, но фонд продолжают выводить, пока команда просыпается.'],
    notify_status_page: ['weak', 'Предупредили, но эксплойт не остановлен.'],
    mark_false_positive: ['bad', 'Фонд уходит на глазах.'],
  } },
  { id: 'nr-record', body: 'neonrelay', region: 'track', severity: 'info', title: 'Подозрительно быстрый круг', description: 'Игрок проехал круг на 4% быстрее прежнего рекорда, детектор поднял тревогу.', hint: 'Телеметрия: у игрока 300 часов на трассе, его время улучшалось постепенно, повтор заезда выглядит чисто.', outcomes: {
    mark_false_positive: ['best', 'Верно. Это просто сильный гонщик. Не каждая аномалия — атака.'],
    increase_priority: ['weak', 'Дежурных разбудили из-за честного рекорда.'],
    enable_captcha: ['weak', 'Не поможет — тут нет ботов.'],
    pause_contract: ['bad', 'Остановили гонки из-за чьего-то рекорда.'],
  } },
  // ---------------- Обсерватория ----------------
  { id: 'hub-ddos', body: 'hub', region: 'ingest', severity: 'critical', title: 'DDoS на приём событий', description: 'Канал приёма получает в 50 раз больше запросов, чем обычно, настоящие события тонут.', hint: 'Телеметрия: запросы без подписи, с тысяч адресов. Это атака на обсерваторию, игры не затронуты.', outcomes: {
    disable_ingress: ['best', 'Верно. Защита от флуда сохраняет канал для настоящих событий.'],
    increase_priority: ['ok', 'Нужно, но атака продолжается.'],
    mark_false_positive: ['bad', 'Это атака.'],
    pause_contract: ['bad', 'Контракты игр тут ни при чём — атакована обсерватория.'],
  } },
  { id: 'hub-silence', body: 'hub', region: 'ingest', severity: 'warn', title: 'Тишина в канале: события не поступают', description: 'Уже 15 минут ни одного события ни от одной игры.', hint: 'Телеметрия: игры работают, но экспортёр событий упал. Метрики сейчас «нет данных», а не ноль.', outcomes: {
    increase_priority: ['best', 'Верно. Экспортёр должны поднять люди. Пока его нет, обсерватория честно показывает «нет данных».'],
    notify_status_page: ['weak', 'Игроки этого не замечают: проблема внутренняя.'],
    mark_false_positive: ['bad', 'Тишина — это проблема: без событий операторы слепы.'],
    disable_ingress: ['bad', 'Защита от флуда при тишине только усугубит дело.'],
  } },
  { id: 'hub-noise', body: 'hub', region: 'deck', severity: 'info', title: 'Детектор сработал на плановое обновление', description: 'После обновления хаба детектор отметил «необычный» формат событий.', hint: 'Телеметрия: формат изменился по плану релиза, все события проходят проверку схемы.', outcomes: {
    mark_false_positive: ['best', 'Верно. Плановое изменение, ложная тревога.'],
    increase_priority: ['weak', 'Дежурных разбудили из-за планового релиза.'],
    disable_ingress: ['bad', 'Заблокировали нормальные события.'],
    notify_status_page: ['weak', 'Игрокам незачем знать о внутреннем релизе.'],
  } },
]

// ---------------- прогресс курсанта: опыт, уровни, достижения ----------------
// Всё это только учебное: хранится в браузере и не влияет на ранг на вахте.
export const LEVELS = [[0, 'Курсант'], [120, 'Младший дежурный'], [300, 'Дежурный'], [550, 'Старший дежурный'], [900, 'Аналитик смены'], [1350, 'Мастер вахты'], [1900, 'Легенда обсерватории']]
export function levelFor(xp = 0) {
  let i = 0
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++
  const [from, name] = LEVELS[i]
  const next = LEVELS[i + 1]?.[0] ?? null
  return { level: i + 1, name, xp, from, next, progress: next ? (xp - from) / (next - from) : 1 }
}

export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'Первая смена', about: 'Успешно завершить любую смену', icon: 'time' },
  { id: 'flawless', name: 'Без потерь', about: 'Смена без просроченных аномалий и потерянных планет', icon: 'trust' },
  { id: 'three_stars', name: 'Три звезды', about: 'Выполнить все три цели смены', icon: 'score' },
  { id: 'streak5', name: 'Пять подряд', about: 'Серия из пяти верных решений', icon: 'energy' },
  { id: 'skeptic', name: 'Скептик', about: 'Трижды не поддаться ошибке бортового ИИ', icon: 'anomaly' },
  { id: 'analyst', name: 'Аналитик', about: 'Проверить телеметрию 25 раз', icon: 'events' },
  { id: 'black_swan', name: 'Чёрный лебедь', about: 'Пережить смену на максимальной сложности', icon: 'planets' },
  { id: 'veteran', name: 'Ветеран', about: 'Отстоять 10 смен до конца', icon: 'operators' },
]

// ---------------- задание дня ----------------
// Одинаковое для всех в один календарный день: сложность, условия, цели и поток
// аномалий выводятся из даты. Награда за первую победу дня — один раз в сутки.
export const DAILY_BONUS_XP = 100
export const MODIFIERS = {
  lowEnergy: { name: 'Энергосбережение', about: 'Смена начинается с 6 энергии вместо 12.' },
  liar: { name: 'Сбоящий ИИ', about: 'Бортовой советник ошибается чаще и с самого начала смены.' },
  rush: { name: 'Час пик', about: 'Аномалии появляются на четверть чаще.' },
  fragileTrust: { name: 'Хрупкое доверие', about: 'Доверие игроков в начале смены — 50% вместо 70%.' },
  costlyScan: { name: 'Помехи в телеметрии', about: 'Проверка телеметрии стоит 2 энергии вместо 1.' },
  focus: { name: 'Один фронт', about: 'Все аномалии приходят в один мир.' },
}
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}
function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export function dailyChallenge(date = new Date()) {
  const key = dayKey(date)
  const seed = hashString(`watchtower-daily-${key}`)
  const rnd = mulberry32(seed)
  const difficultyId = rnd() < 0.6 ? 'normal' : 'hard'
  const ids = Object.keys(MODIFIERS)
  const modifiers = []
  while (modifiers.length < 2) {
    const m = ids[Math.floor(rnd() * ids.length)]
    if (!modifiers.includes(m)) modifiers.push(m)
  }
  const worlds = [...new Set(CATALOG.map((c) => c.body))]
  const focusBody = worlds[Math.floor(rnd() * worlds.length)]
  return { key, seed, difficultyId, modifiers, focusBody }
}
export function prevDayKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d - 1))
}

const SAVE_KEY = 'wt-cosmos-training'
const EMPTY_SAVE = () => ({ runs: 0, wins: 0, finished: 0, best: {}, stars: {}, xp: 0, achievements: [], totals: { investigations: 0, beatLies: 0 }, daily: { key: null, best: 0, done: false, lastWon: null, streak: 0 } })
export function loadTrainingSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')
    const base = EMPTY_SAVE()
    return { ...base, ...raw, totals: { ...base.totals, ...(raw.totals || {}) }, stars: raw.stars || {}, achievements: raw.achievements || [], daily: { ...base.daily, ...(raw.daily || {}) } }
  } catch { return EMPTY_SAVE() }
}
function storeSave(save) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch { /* приватный режим */ } }

let uid = 0

export function createTraining(difficultyId, opts = {}) {
  const daily = opts.daily || null
  const mods = new Set(daily?.modifiers || [])
  const rand = daily ? mulberry32(daily.seed) : Math.random
  const baseDiff = DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[1]
  const diff = { ...baseDiff }
  if (mods.has('rush')) diff.spawn = diff.spawn.map((x) => Math.round(x * 0.75))
  if (mods.has('liar')) diff.lie = Math.min(0.6, diff.lie + 0.25)
  const scanCost = mods.has('costlyScan') ? 2 : 1
  const save = loadTrainingSave()
  save.runs += 1
  storeSave(save)

  const bodies = {}
  for (const b of BODIES) {
    bodies[b.id] = { signal: 'ok', stability: 80, lost: false, anomalies: [], basePlayers: 400 + Math.round(rand() * 2600) }
  }

  const s = {
    mode: 'training',
    difficulty: diff,
    elapsed: 0,
    duration: diff.minutes * 60,
    energy: mods.has('lowEnergy') ? 6 : 12,
    maxEnergy: 20,
    regenAcc: 0,
    trust: mods.has('fragileTrust') ? 50 : 70,
    score: 0,
    nextSpawn: 5,
    log: [],
    over: false,
    won: false,
    resolved: 0,
    correct: 0,
    followedBadAdvice: 0,
    history: [],
    streak: 0,
    bestStreak: 0,
    expired: 0,
    investigations: 0,
    beatLies: 0,
    summary: null,
    daily,
  }

  // Три цели смены: «решить верно N» всегда, ещё две случайные
  const need = { easy: 3, normal: 4, hard: 5, nightmare: 6 }[diff.id] || 4
  const GOALS = [
    { id: 'correct', text: `Решить верно ${need} аномалий`, state: () => ({ done: s.correct >= need, note: `${Math.min(s.correct, need)} из ${need}` }) },
    { id: 'noexpire', text: 'Ни одной просроченной аномалии', state: () => ({ done: s.expired === 0 && s.over, failed: s.expired > 0, note: s.expired ? 'провалена' : 'держится' }) },
    { id: 'nolost', text: 'Не потерять ни одной планеты', state: () => { const n = Object.values(bodies).filter((b) => b.lost).length; return { done: !n && s.over, failed: n > 0, note: n ? 'провалена' : 'держится' } } },
    { id: 'investigate', text: 'Проверить телеметрию 3 раза', state: () => ({ done: s.investigations >= 3, note: `${Math.min(s.investigations, 3)} из 3` }) },
    { id: 'trust', text: 'Закончить смену с доверием от 60%', state: () => ({ done: s.over && s.trust >= 60, failed: s.over && s.trust < 60, note: `сейчас ${Math.round(s.trust)}%` }) },
    { id: 'streak', text: 'Серия из 4 верных решений', state: () => ({ done: s.bestStreak >= 4, note: `лучшая серия ${s.bestStreak}` }) },
    ...(diff.lie > 0 ? [{ id: 'beatlie', text: 'Распознать ошибку бортового ИИ', state: () => ({ done: s.beatLies >= 1, note: s.beatLies ? 'есть' : 'пока нет' }) }] : []),
  ]
  const extra = GOALS.slice(1).sort(() => rand() - 0.5).slice(0, 2)
  const goals = [GOALS[0], ...extra]
  const goalStates = () => goals.map((g) => ({ id: g.id, text: g.text, ...g.state() }))
  const multiplier = () => (s.streak >= 6 ? 2 : s.streak >= 3 ? 1.5 : 1)

  const log = (text, kind = 'info') => { s.log.unshift({ at: s.elapsed, text, kind }); s.log = s.log.slice(0, 60) }
  log(`Смена началась: «${diff.name}». Продержитесь ${diff.minutes} мин и сохраните доверие игроков.`)

  function activeAll() { return Object.values(bodies).flatMap((b) => b.anomalies) }

  function spawn() {
    const busy = new Set(activeAll().map((a) => a.templateId))
    const pool = CATALOG.filter((c) => !busy.has(c.id) && !bodies[c.body].lost && (!mods.has('focus') || c.body === daily.focusBody))
    if (!pool.length) return
    const tpl = pool[Math.floor(rand() * pool.length)]
    const progress = s.elapsed / s.duration
    const lieChance = mods.has('liar') ? diff.lie : diff.lie * Math.max(0, Math.min(1, (progress - 0.3) / 0.7))
    const entries = Object.entries(tpl.outcomes)
    const best = entries.find(([, o]) => o[0] === 'best')[0]
    let advice = best; let lying = false
    if (rand() < lieChance) {
      const wrong = entries.filter(([, o]) => o[0] === 'bad' || o[0] === 'weak')
      advice = wrong[Math.floor(rand() * wrong.length)][0]
      lying = true
    }
    const time = Math.round(TIMER[tpl.severity] * diff.time)
    const a = {
      id: `t${++uid}`,
      templateId: tpl.id,
      body: tpl.body,
      region: tpl.region,
      title: tpl.title,
      description: tpl.description,
      hint: tpl.hint,
      severity: tpl.severity,
      options: entries.map(([id]) => id).sort(() => rand() - 0.5),
      timer: time,
      timeLeft: time,
      detectedAt: s.elapsed,
      investigated: false,
      advice: { actionId: advice, confidence: lying ? 0.95 + rand() * 0.04 : 0.68 + rand() * 0.22, lying },
      status: 'open',
    }
    bodies[tpl.body].anomalies.push(a)
    log(`Новая аномалия: ${tpl.title}`, tpl.severity === 'critical' ? 'bad' : 'warn')
  }

  function loseBody(id) {
    const b = bodies[id]
    if (b.lost) return
    b.lost = true
    b.anomalies = []
    s.trust = Math.max(0, s.trust - 15)
    const name = BODIES.find((x) => x.id === id)?.name
    log(`${name}: связь потеряна. Игроки уходят, доверие падает.`, 'bad')
  }

  function finish(won) {
    s.over = true; s.won = won
    const sv = loadTrainingSave()
    if (won) sv.wins += 1
    sv.finished += 1
    sv.best[diff.id] = Math.max(sv.best[diff.id] || 0, Math.round(s.score))
    const gs = goalStates()
    const stars = won ? gs.filter((g) => g.done).length : 0
    sv.stars[diff.id] = Math.max(sv.stars[diff.id] || 0, stars)
    sv.totals.investigations += s.investigations
    sv.totals.beatLies += s.beatLies
    const before = levelFor(sv.xp)
    let xpGain = Math.round(Math.max(0, s.score) / 10) + stars * 25 + (won ? 30 : 5)
    let dailyResult = null
    if (daily) {
      // Результат засчитывается только в тот день, на который выпало задание
      const today = dayKey()
      if (daily.key === today) {
        if (sv.daily.key !== today) sv.daily = { ...sv.daily, key: today, best: 0, done: false }
        sv.daily.best = Math.max(sv.daily.best, Math.round(s.score))
        const first = won && !sv.daily.done
        if (first) {
          sv.daily.done = true
          sv.daily.streak = sv.daily.lastWon === prevDayKey(today) ? sv.daily.streak + 1 : 1
          sv.daily.lastWon = today
          xpGain += DAILY_BONUS_XP
        }
        dailyResult = { first, bonus: first ? DAILY_BONUS_XP : 0, streak: sv.daily.streak, best: sv.daily.best, stale: false }
      } else dailyResult = { first: false, bonus: 0, streak: sv.daily.streak, best: 0, stale: true }
    }
    sv.xp += xpGain
    const lostN = Object.values(bodies).filter((b) => b.lost).length
    const unlocked = {
      first_win: won,
      flawless: won && !s.expired && !lostN,
      three_stars: stars === 3,
      streak5: s.bestStreak >= 5,
      skeptic: sv.totals.beatLies >= 3,
      analyst: sv.totals.investigations >= 25,
      black_swan: won && diff.id === 'nightmare',
      veteran: sv.finished >= 10,
    }
    const newAchievements = ACHIEVEMENTS.filter((a) => unlocked[a.id] && !sv.achievements.includes(a.id))
    sv.achievements.push(...newAchievements.map((a) => a.id))
    storeSave(sv)
    s.summary = { stars, goals: gs, xpGain, before, after: levelFor(sv.xp), newAchievements, daily: dailyResult }
    log(won ? 'Смена завершена успешно.' : 'Смена провалена.', won ? 'good' : 'bad')
  }

  function tick(dt) {
    if (s.over) return
    s.elapsed += dt
    s.regenAcc += dt
    if (s.regenAcc >= diff.regen) { s.regenAcc -= diff.regen; s.energy = Math.min(s.maxEnergy, s.energy + 1) }
    s.nextSpawn -= dt
    if (s.nextSpawn <= 0) {
      if (activeAll().length < diff.maxActive) spawn()
      s.nextSpawn = diff.spawn[0] + rand() * (diff.spawn[1] - diff.spawn[0])
    }
    for (const [id, b] of Object.entries(bodies)) {
      if (b.lost) continue
      for (const a of [...b.anomalies]) {
        a.timeLeft -= dt
        b.stability -= DRAIN[a.severity] * dt
        if (a.timeLeft <= 0) {
          b.anomalies = b.anomalies.filter((x) => x !== a)
          b.stability -= 16
          s.trust = Math.max(0, s.trust - 6)
          s.expired += 1
          s.streak = 0
          s.history.unshift({ title: a.title, quality: 'expired', explain: 'Время вышло: аномалия ударила по игрокам без ответа.' })
          log(`Просрочено: ${a.title}`, 'bad')
        }
      }
      if (!b.anomalies.length) b.stability = Math.min(100, b.stability + 0.6 * dt)
      if (b.stability <= 0) loseBody(id)
    }
    const lost = Object.values(bodies).filter((b) => b.lost).length
    if (s.trust <= 0 || lost >= 2) finish(false)
    else if (s.elapsed >= s.duration) finish(true)
  }

  function find(anomalyId) {
    for (const [bodyId, b] of Object.entries(bodies)) {
      const a = b.anomalies.find((x) => x.id === anomalyId)
      if (a) return { a, b, bodyId }
    }
    return null
  }

  function investigate(anomalyId) {
    const f = find(anomalyId)
    if (!f || f.a.investigated) return { ok: false }
    if (s.energy < scanCost) return { ok: false, reason: 'Не хватает энергии обсерватории' }
    s.energy -= scanCost
    s.investigations += 1
    f.a.investigated = true
    return { ok: true, hint: f.a.hint }
  }

  function resolve(anomalyId, actionId) {
    const f = find(anomalyId)
    if (!f) return { ok: false, reason: 'Аномалия уже закрыта' }
    const tpl = CATALOG.find((c) => c.id === f.a.templateId)
    const cost = COST[RISK[actionId]] || 1
    if (s.energy < cost) return { ok: false, reason: `Не хватает энергии: нужно ${cost}, есть ${Math.floor(s.energy)}` }
    s.energy -= cost
    const [quality, explain] = tpl.outcomes[actionId]
    const e = EFFECT[quality]
    const bonus = quality === 'best' && f.a.investigated ? 20 : 0
    const speedBonus = quality === 'best' ? Math.round(30 * (f.a.timeLeft / f.a.timer)) : 0
    f.b.stability = Math.max(0, Math.min(100, f.b.stability + e.stability))
    s.trust = Math.max(0, Math.min(100, s.trust + e.trust))
    // Серия верных решений даёт множитель только к заработанным очкам, штрафы не умножаются
    if (quality === 'best') { s.streak += 1; s.bestStreak = Math.max(s.bestStreak, s.streak) } else if (quality !== 'ok') s.streak = 0
    const mult = e.score > 0 ? multiplier() : 1
    const gained = Math.round((e.score + bonus + speedBonus) * mult)
    s.score += gained
    s.resolved += 1
    if (quality === 'best') s.correct += 1
    const followedLie = f.a.advice.lying && f.a.advice.actionId === actionId
    if (followedLie) s.followedBadAdvice += 1
    const beatLie = f.a.advice.lying && !followedLie && (quality === 'best' || quality === 'ok')
    if (beatLie) s.beatLies += 1
    f.b.anomalies = f.b.anomalies.filter((x) => x !== f.a)
    const result = { ok: true, quality, explain, bonus, speedBonus, followedLie, advisorWasWrong: f.a.advice.lying, title: f.a.title, gained, mult, streak: s.streak, region: f.a.region, body: f.a.body }
    s.history.unshift(result)
    log(`${quality === 'best' ? 'Верно' : quality === 'ok' ? 'Приемлемо' : quality === 'weak' ? 'Слабо' : 'Ошибка'}: ${f.a.title}`, quality === 'best' || quality === 'ok' ? 'good' : 'bad')
    if (followedLie) log('Советник ошибся, а вы последовали его совету. ИИ — помощник, а не начальник.', 'warn')
    return result
  }

  function world() {
    const out = {}
    for (const [id, b] of Object.entries(bodies)) {
      const health = Math.max(0, b.stability) / 100
      out[id] = {
        signal: b.lost ? 'none' : b.stability < 35 ? 'weak' : 'ok',
        lost: b.lost,
        stability: b.stability,
        label: b.lost ? null : `${Math.round(Math.max(0, b.stability))}%`,
        anomalies: b.anomalies,
        activity: b.lost ? 0 : 0.3 + health * 0.7,
        metrics: { players: b.lost ? 0 : Math.round(b.basePlayers * (0.4 + health * 0.6)) },
      }
    }
    return { mode: 'training', bodies: out, routes: { quantum: { live: !bodies.ares1.lost && !bodies.aof.lost } } }
  }

  return {
    state: s,
    bodies,
    tick,
    investigate,
    resolve,
    world,
    find: (id) => find(id)?.a || null,
    costOf: (actionId) => COST[RISK[actionId]] || 1,
    scanCost,
    goals: goalStates,
    multiplier,
    riskOf: (actionId) => RISK[actionId],
  }
}

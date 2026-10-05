// ---------------------------------------------------------------------------
// Мир Watchtower: звёздная система студии.
// Звезда — сеть Solana, на которой живут все игры. Вокруг неё — обсерватория
// Watchtower (отсюда операторы следят за системой) и четыре планеты-игры.
// Лор каждой планеты взят с официальных сайтов игр, а не придуман заново.
// Координаты районов (x, y) — доля ширины/высоты картинки сцены поверхности.
// ---------------------------------------------------------------------------

const asset = (name) => `${import.meta.env.BASE_URL}cosmos/${name}`

export const STAR = {
  id: 'solana',
  name: 'Solana',
  sprite: asset('star-solana.webp'),
  about: 'Звезда системы — блокчейн Solana. Все игры студии работают на нём, поэтому если «звезда» тускнеет (сеть перегружена или RPC не отвечает), это чувствуют все планеты сразу.',
}

export const METRIC_LABELS = {
  players: 'Активные игроки',
  newPlayers: 'Новые игроки',
  retention: 'Удержание',
  minted: 'Выпущено токенов',
  burned: 'Сожжено токенов',
  volume: 'Объём торгов',
  treasury: 'Казна',
  events: 'События за 7 дней',
  adapters: 'Подключённые игры',
  alerts: 'Открытые тревоги',
}

export const BODIES = [
  {
    id: 'hub',
    kind: 'station',
    name: 'Обсерватория Watchtower',
    short: 'Обсерватория',
    tagline: 'Отсюда операторы следят за всей системой',
    color: '#7cc4ff',
    sprite: asset('station.webp'),
    scene: null,
    orbit: { r: 0.25, period: 420, phase: 3.6 },
    size: 0.085,
    about: 'Обсерватория принимает сигналы со всех планет: события игр, метрики экономики, тревоги детекторов. Она ничего не меняет в играх напрямую — только наблюдает, а решения проходят через голосование операторов и подтверждение студии.',
    regions: [
      { id: 'ingest', name: 'Приём сигналов', x: 0.24, y: 0.62, keywords: ['ingest', 'событ', 'тишин', 'silence', 'inbox', 'ddos', 'трафик', 'флуд'], about: 'Сюда приходят события из всех игр. Если канал замолчал, метрики становятся «нет данных», а не нулём — так обсерватория не выдумывает цифры.', watch: 'Тишина в канале, всплески трафика и флуд на входе.', metrics: ['events'] },
      { id: 'dish', name: 'Главная антенна', x: 0.55, y: 0.3, keywords: ['адаптер', 'adapter', 'programid', 'сигнал'], about: 'Подключения к играм. Планета «на связи», когда её программа в блокчейне указана и события реально приходят.', watch: 'Сколько игр реально подключены, а сколько только заявлены.', metrics: ['adapters'] },
      { id: 'deck', name: 'Пульт операторов', x: 0.78, y: 0.58, keywords: [], about: 'Здесь вахта операторов разбирает аномалии: голосует за безопасные действия, а студия подтверждает исполнение.', watch: 'Открытые тревоги и время реакции.', metrics: ['alerts'] },
    ],
  },
  {
    id: 'ares1',
    kind: 'planet',
    name: 'ARES-1',
    short: 'ARES-1',
    tagline: 'Картофельная колония на Марсе',
    color: '#ff7a45',
    sprite: asset('planet-ares.webp'),
    scene: asset('scene-ares.webp'),
    orbit: { r: 0.42, period: 640, phase: 0.6 },
    size: 0.115,
    moon: { name: 'Фобос', r: 0.95, period: 40 },
    about: 'Колония на Марсе, где игроки выращивают $POTATO в гидропонных куполах. Вся экономика живёт в программе Solana: урожай, биржа, сжигание. Лунный цикл Фобоса (28 эпох) меняет скорость выпуска от 0,85× до 1,15×.',
    site: 'https://ares1-7e1.pages.dev/',
    regions: [
      { id: 'domes', name: 'Купола-теплицы', x: 0.32, y: 0.46, keywords: ['урожай', 'harvest', 'выпуск', 'эмисс', 'mint', 'фобос', 'буря', 'модул'], about: 'Гидропонные модули игроков. Модуль каждую секунду «капает» $POTATO, урожай копится до 7 дней. Выпуск ограничен эластичным потолком эпохи.', watch: 'Резкий рост сборов урожая — признак ботов или ошибки выпуска.', metrics: ['players', 'minted'] },
      { id: 'exchange', name: 'Биржа колонии', x: 0.51, y: 0.18, keywords: ['бирж', 'рынок', 'market', 'сделк', 'цен', 'ордер', 'торг'], about: 'Ордербук $POTATO. Комиссия 9–12%: 60% сжигается навсегда, 40% уходит в казну колонии на инфраструктуру.', watch: 'Манипуляции ценой и подозрительные серии сделок.', metrics: ['volume', 'burned'] },
      { id: 'treasury', name: 'Казна и печь сжигания', x: 0.74, y: 0.4, keywords: ['казн', 'treasury', 'сжиг', 'burn', 'вывод'], about: 'Казна колонии (адрес программы) и сжигание: половина налога на урожай, ремонт, удобрения, улучшения.', watch: 'Необычные списания из казны и перекос выпуска к сжиганию.', metrics: ['treasury', 'burned'] },
      { id: 'pad', name: 'Посадочная площадка', x: 0.62, y: 0.63, keywords: ['бот', 'bot', 'регистрац', 'реферал', 'новы', 'ферм'], about: 'Сюда прибывают новые колонисты. Регистрация по реферальной ссылке сжигает 5 POTATO — это защита от спама.', watch: 'Волны регистраций с одного источника.', metrics: ['newPlayers', 'retention'] },
    ],
  },
  {
    id: 'aof',
    kind: 'planet',
    name: 'NeuroForge',
    short: 'NeuroForge',
    tagline: 'Нейролаборатория: образцы, модели, крафт',
    formerly: 'бывш. Age of Farming',
    color: '#5ee7ff',
    sprite: asset('planet-neuroforge.webp'),
    scene: asset('scene-neuroforge.webp'),
    orbit: { r: 0.58, period: 900, phase: 1.9 },
    size: 0.105,
    about: 'Лабораторная RPG на Solana: игроки выращивают образцы, обучают модели (Нейрон → Синапс → Сигнал → Модель), крафтят инструменты 5 редкостей и торгуют. Энергия от 0 до 20, восстанавливается 1 единица в 30 минут. Главное правило игры: непроверенные данные — повод остановиться, а не угадывать.',
    site: 'https://aof.pages.dev/site/home',
    regions: [
      { id: 'lab', name: 'Лаборатория', x: 0.33, y: 0.26, keywords: ['образ', 'обучен', 'модел', 'энерг', 'нагрузк', 'сеть', 'бот', 'ферм'], about: 'Выращивание образцов и обучение моделей. Выращивание и сбор стоят 1 энергию, разделение и обучение — по 2.', watch: 'Ферма ботов, которая собирает урожай ровно по таймеру восстановления энергии.', metrics: ['players', 'minted'] },
      { id: 'forge', name: 'Мастерская', x: 0.62, y: 0.33, keywords: ['крафт', 'craft', 'инструмент', 'прочност', 'ремонт'], about: 'Крафт и ремонт NFT-инструментов: 5 типов × 5 редкостей, прочность до 20.', watch: 'Крафт по устаревшей цене и аномальные рецепты.', metrics: ['burned'] },
      { id: 'market', name: 'Торговая площадь', x: 0.79, y: 0.54, keywords: ['рынок', 'market', 'торг', 'поддержк', 'мошен', 'фальш', 'сид'], about: 'Маркетплейс и квантовый розыгрыш. Каждая сделка проверяется в блокчейне.', watch: 'Фальшивая «поддержка», выманивающая сид-фразы, и подозрительные сделки.', metrics: ['volume'] },
      { id: 'core', name: 'Энергоядро и мост', x: 0.49, y: 0.7, keywords: ['мост', 'bridge', 'potato', 'квант'], about: 'Сюда по квантовому мосту приходит $POTATO с Марса — он сжигается для ускорения обучения моделей.', watch: 'Подозрительные потоки через мост.', metrics: ['treasury'] },
    ],
  },
  {
    id: 'guttercaps',
    kind: 'planet',
    name: 'GUTTERCAPS',
    short: 'GUTTERCAPS',
    tagline: 'Gutter City — город, который никогда не сохнет',
    color: '#ff4fa3',
    sprite: asset('planet-guttercaps.webp'),
    scene: asset('scene-guttercaps.webp'),
    orbit: { r: 0.76, period: 1200, phase: 4.4 },
    size: 0.11,
    about: 'Затопленный город стрит-арта: 8 районов × 9 уровней заряда = 72 фишки-крышки. Паки вскрываются с доказуемо честной случайностью, три фишки сливаются в одну, на арене Cap Slam идут бои 3 на 3. Ночные охранники товарного двора здесь зовутся Наблюдателями — их журнал теперь хранится в блокчейне.',
    site: 'https://guttercapslending.pages.dev/guttercaps-landing?lang=ru',
    regions: [
      { id: 'wall', name: 'Стена Ночного мотылька', x: 0.26, y: 0.35, keywords: ['пак', 'vrf', 'оракул', 'вскрыт', 'случайн', 'reveal'], about: 'Паки и вскрытие. Случайность приходит от оракула; если он не ответил, через ~72 минуты оплата возвращается автоматически.', watch: 'Зависшие вскрытия и задержки оракула.', metrics: ['players', 'minted'] },
      { id: 'arena', name: 'Арена Cap Slam', x: 0.5, y: 0.28, keywords: ['арен', 'бой', 'матч', 'сговор', 'pvp', 'ставк'], about: 'Бои 3 на 3 на ставки в $CG. Ставки лежат в эскроу, сами фишки никогда не под угрозой.', watch: 'Сговор игроков и подозрительные серии побед.', metrics: ['volume'] },
      { id: 'market', name: 'Рынок под эстакадой', x: 0.71, y: 0.47, keywords: ['рынок', 'market', 'листинг', 'объявлен', 'квест', 'фарм', 'стейк'], about: 'Маркет фишек (комиссия 7,5%, треть выкупает и сжигает $CG), стейкинг и квесты с лимитами от фарма.', watch: 'Пылевые объявления, фарм квестов, перекос стейкинга.', metrics: ['volume', 'burned'] },
      { id: 'drain', name: 'Ливнёвка', x: 0.5, y: 0.8, keywords: ['потоп', 'ddos', 'индексатор', 'флуд', 'тишин'], about: 'Сюда стекается поток событий игры — индексатор, из которого строятся лидерборды.', watch: '«Потоп» запросов на индексатор.', metrics: ['newPlayers', 'retention'] },
    ],
  },
  {
    id: 'neonrelay',
    kind: 'planet',
    name: 'Neon Relay',
    short: 'Neon Relay',
    tagline: 'Неоновая планета-трасса',
    color: '#ffb547',
    sprite: asset('planet-neonrelay.webp'),
    scene: asset('scene-neonrelay.webp'),
    orbit: { r: 0.93, period: 1500, phase: 2.7 },
    size: 0.16,
    spriteAspect: 1.87,
    about: 'Гоночная планета: кольцо вокруг неё — это трасса. Заезды, призовые фонды и неоновые дуэли.',
    regions: [
      { id: 'garage', name: 'Пит-гараж', x: 0.28, y: 0.4, keywords: ['бот', 'bot', 'квалиф', 'регистрац'], about: 'Гонщики готовятся к заезду. Здесь же видно, кто приходит новым.', watch: 'Боты в квалификации.', metrics: ['players', 'newPlayers'] },
      { id: 'track', name: 'Трасса', x: 0.5, y: 0.49, keywords: ['гонк', 'race', 'заезд', 'рекорд', 'круг'], about: 'Заезды и результаты. Каждый финиш — событие в блокчейне.', watch: 'Нереальные времена круга и подставные заезды.', metrics: ['retention'] },
      { id: 'prize', name: 'Призовая башня', x: 0.65, y: 0.21, keywords: ['приз', 'фонд', 'наград', 'reward', 'эксплойт'], about: 'Призовые фонды заездов и награды победителям.', watch: 'Вывод призового фонда в обход правил.', metrics: ['minted', 'volume'] },
    ],
  },
]

// Связи между мирами. Статус честный: мост на сайте ARES-1 прямо помечен как
// «пока не исполняет переводы».
export const ROUTES = [
  { id: 'quantum', from: 'ares1', to: 'aof', name: 'Квантовый мост 17,42 ГГц', color: '#9b8cff', about: '$POTATO с Марса сжигается в лабораториях NeuroForge, а достижения NeuroForge открывают модули в ARES-1. Сейчас мост ещё не исполняет переводы.', live: false },
  { id: 'skr', from: 'ares1', to: 'guttercaps', name: 'Торговый путь SKR', color: '#3ee0b0', about: 'Обе игры принимают SKR — платёжный токен экосистемы Seeker. Сама игра SKR не выпускает и не сжигает.', live: false },
]

export const ACTION_TEXT = {
  mark_false_positive: { title: 'Отметить как ложную тревогу', short: 'Ложная тревога' },
  increase_priority: { title: 'Срочно поднять дежурную команду', short: 'Поднять дежурных' },
  notify_status_page: { title: 'Предупредить игроков на статус-странице', short: 'Предупредить игроков' },
  enable_captcha: { title: 'Включить проверку на входе (CAPTCHA)', short: 'Проверка на входе' },
  disable_ingress: { title: 'Включить защиту от флуда', short: 'Защита от флуда' },
  pause_bridge: { title: 'Временно остановить мост между играми', short: 'Пауза моста' },
  pause_contract: { title: 'Аварийная пауза контракта через мультиподпись', short: 'Аварийная пауза' },
}

export const RISK_TEXT = {
  safe: { label: 'без риска', cls: 'safe' },
  low: { label: 'низкий риск', cls: 'low' },
  medium: { label: 'средний риск', cls: 'medium' },
  high: { label: 'высокий риск', cls: 'high' },
  critical: { label: 'критический риск', cls: 'high' },
}

export const ROLE_TEXT = {
  guest: 'Гость',
  candidate: 'Кандидат',
  observer: 'Наблюдатель',
  operator: 'Оператор',
  senior: 'Старший смены',
  guardian: 'Хранитель системы',
  staff: 'Сотрудник студии',
}

export function bodyById(id) {
  return BODIES.find((b) => b.id === id) || null
}

// Аномалия → район поверхности по ключевым словам в заголовке/описании.
export function regionFor(body, anomaly) {
  if (!body?.regions?.length) return null
  if (anomaly.region) return body.regions.find((r) => r.id === anomaly.region) || body.regions[0]
  const text = `${anomaly.title || ''} ${anomaly.description || ''}`.toLowerCase()
  return body.regions.find((r) => r.keywords.some((k) => text.includes(k))) || body.regions[0]
}

// Игра инцидента → тело системы (hub/all/неизвестное → обсерватория)
export function bodyForGame(game) {
  return BODIES.some((b) => b.id === game && b.kind === 'planet') ? game : 'hub'
}

export function severityClass(severity) {
  if (['critical', 'high', 'bad'].includes(severity)) return 'critical'
  if (['warn', 'medium', 'warning'].includes(severity)) return 'warn'
  return 'info'
}

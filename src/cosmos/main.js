// ---------------------------------------------------------------------------
// Watchtower — звёздная система студии. Главный экран продукта.
// Карта (живые данные) · Вахта (операторы голосуют) · Тренажёр (обучение).
// ---------------------------------------------------------------------------
import './cosmos.css'
import { createEngine } from './engine.js'
import { loadLiveWorld, operatorApi } from './live.js'
import { createTraining, DIFFICULTIES, loadTrainingSave } from './training.js'
import { BODIES, ROUTES, STAR, METRIC_LABELS, ACTION_TEXT, RISK_TEXT, ROLE_TEXT, bodyById, regionFor, severityClass } from './world.js'

const LIVE_REFRESH_MS = 15000
const SEVERITY_TEXT = { critical: 'критично', warn: 'внимание', info: 'наблюдение' }
const LEVEL_TEXT = {
  L0: ['Не подключена', 'Обсерватория пока ничего не знает об этой игре.'],
  L1: ['Только заявлена', 'Игра внесена в реестр, но её программа в блокчейне ещё не указана, поэтому данные не поступают.'],
  L2: ['Подключена', 'Игра присылает настоящие события, цифры на планете берутся из них.'],
  L3: ['Полный контроль', 'Видны экономика, игроки и связи с другими играми, работают автоматические тревоги.'],
  L4: ['Боевой режим', 'Все проверки надёжности пройдены, вахта может предлагать действия в реальном времени.'],
}
const SIGNAL_TEXT = { ok: 'На связи', weak: 'Слабый сигнал', none: 'Нет сигнала' }

const S = {
  mode: 'map',
  live: null,
  liveError: null,
  sim: null,
  difficulty: localStorage.getItem('wt-cosmos-diff') || 'normal',
  selected: null,
  anomalyId: null,
  surface: null,
  region: null,
  lastResult: null,
  hint: {},
  wallet: localStorage.getItem('wt-operator-wallet') || null,
  player: null,
  busy: false,
  query: '',
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmt = (v) => (v === null || v === undefined ? null : typeof v === 'number' ? v.toLocaleString('ru-RU') : String(v))
const mmss = (sec) => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const ago = (ts) => { const d = Math.max(0, (Date.now() - ts) / 1000); return d < 60 ? 'только что' : d < 3600 ? `${Math.floor(d / 60)} мин назад` : `${Math.floor(d / 3600)} ч назад` }

const ICON = {
  search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  ext: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
}

// ---------------------------------------------------------------------------
// Каркас
// ---------------------------------------------------------------------------
const app = document.getElementById('app')
document.documentElement.dataset.theme = 'dark'
document.title = 'Watchtower — система студии Leo Games'
app.innerHTML = `
  <div class="cz" data-mode="map">
    <canvas class="cz-canvas" aria-label="Карта звёздной системы студии"></canvas>
    <header class="cz-top">
      <div class="cz-brand"><span class="cz-logo" aria-hidden="true"></span><div><b>Watchtower</b><small>Система студии Leo Games</small></div></div>
      <nav class="cz-tabs" role="tablist">
        <button data-act="mode" data-mode="map" role="tab">Карта</button>
        <button data-act="mode" data-mode="watch" role="tab">Вахта</button>
        <button data-act="mode" data-mode="training" role="tab">Тренажёр</button>
        <a href="?view=reports" class="cz-tab-link">Отчёты</a>
      </nav>
      <label class="cz-search">${ICON.search}<input type="search" placeholder="Планета, район или аномалия" aria-label="Поиск по системе" data-act="search" /><div class="cz-results" hidden></div></label>
      <div class="cz-status" data-slot="status"></div>
    </header>
    <div class="cz-banner" data-slot="banner" hidden></div>
    <section class="cz-kpis" data-slot="kpis"></section>
    <aside class="cz-watch" data-slot="watch" hidden></aside>
    <aside class="cz-panel" data-slot="panel"></aside>
    <footer class="cz-bottom" data-slot="bottom"></footer>
    <div class="cz-surface" data-slot="surface" hidden></div>
    <div class="cz-tooltip" data-slot="tooltip" hidden></div>
    <div class="cz-modal" data-slot="modal" hidden></div>
    <div class="cz-toast" data-slot="toast"></div>
  </div>`

const root = app.querySelector('.cz')
const slot = (name) => root.querySelector(`[data-slot="${name}"]`)
const setHTML = (el, html) => { if (el._html !== html) { el.innerHTML = html; el._html = html } }

const engine = createEngine(root.querySelector('.cz-canvas'), {
  onHover(target, pt) { showTooltip(target, pt) },
  onSelect(id) { S.selected = id; S.anomalyId = null; S.lastResult = null; render() },
  onEnter(id) { openSurface(id) },
  onRoute(id) { S.selected = `route:${id}`; S.anomalyId = null; render() },
})

const ERROR_TEXT = {
  wallet_required: 'Введите адрес кошелька',
  missing_fields: 'Не хватает данных для запроса',
  rate_limited: 'Слишком много запросов, подождите немного',
  read_token_required: 'Обсерватория закрыта для просмотра без ключа доступа',
  invalid_json: 'Запрос повреждён, обновите страницу',
}
function friendlyError(err) {
  const m = String(err?.message || '')
  if (ERROR_TEXT[m]) return ERROR_TEXT[m]
  if (!m || /^[a-z0-9_ ]+$/i.test(m) || /^HTTP \d+/.test(m) || /fetch/i.test(m)) return 'Сервер не ответил. Попробуйте ещё раз чуть позже.'
  return m
}

function toast(text, kind = '') {
  const el = slot('toast')
  el.textContent = text
  el.className = `cz-toast show ${kind}`
  clearTimeout(el._t)
  el._t = setTimeout(() => { el.className = 'cz-toast' }, 3200)
}

// ---------------------------------------------------------------------------
// Данные мира
// ---------------------------------------------------------------------------
function world() {
  if (S.mode === 'training' && S.sim) return S.sim.world()
  return S.live || { mode: 'live', bodies: {}, routes: {} }
}

function allAnomalies() {
  const w = world()
  return Object.entries(w.bodies || {}).flatMap(([bodyId, b]) => (b.anomalies || []).map((a) => ({ ...a, bodyId })))
}

function findAnomaly(id) { return allAnomalies().find((a) => a.id === id) || null }

async function refreshLive() {
  try {
    S.live = await loadLiveWorld(S.wallet)
    S.liveError = null
    if (S.wallet) S.player = await operatorApi.player(S.wallet).catch(() => S.player)
  } catch (e) {
    S.liveError = e.message
  }
  if (S.mode !== 'training') engine.setWorld(world())
  render()
}

// ---------------------------------------------------------------------------
// Рендер
// ---------------------------------------------------------------------------
function render() {
  root.dataset.mode = S.mode
  root.querySelectorAll('[data-act="mode"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === S.mode)))
  renderStatus()
  renderBanner()
  renderKpis()
  renderPanel()
  renderBottom()
  renderWatch()
  renderSurface()
  updateTimers()
}

function renderStatus() {
  let html
  if (S.mode === 'training') html = '<span class="dot warn"></span>Тренировка: данные вымышлены'
  else if (S.liveError || (S.live && !S.live.apiOk)) html = '<span class="dot bad"></span>Обсерватория недоступна'
  else if (!S.live) html = '<span class="dot"></span>Подключение…'
  else if (!S.live.eventsTotal) html = '<span class="dot idle"></span>Живые данные · событий пока нет'
  else html = `<span class="dot ok"></span>Живые данные · обновлено ${S.live.fetchedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  setHTML(slot('status'), html)
}

function renderBanner() {
  const el = slot('banner')
  let html = ''
  if (S.mode !== 'training' && S.live && !S.live.eventsTotal) {
    html = 'Игры ещё не присылают события в обсерваторию, поэтому планеты показаны «без сигнала», а цифры — «нет данных». Мы не подставляем выдуманные значения. Посмотреть систему в движении можно в Тренажёре.'
  }
  el.hidden = !html || S.bannerClosed
  setHTML(el, html ? `<span>${esc(html)}</span><button class="cz-icon-btn" data-act="close-banner" aria-label="Скрыть">${ICON.close}</button>` : '')
}

function kpiCard(label, value, sub, extra = '') {
  return `<div class="cz-kpi"><span class="cz-kpi-label">${esc(label)}</span><span class="cz-kpi-value ${value == null ? 'na' : ''}">${value == null ? 'нет данных' : value}</span>${extra}<span class="cz-kpi-sub">${esc(sub)}</span></div>`
}

function renderKpis() {
  let html = ''
  if (S.mode === 'training' && S.sim) {
    const s = S.sim.state
    html = [
      kpiCard('Время смены', `<span data-live="clock">${mmss(s.duration - s.elapsed)}</span>`, `осталось из ${s.difficulty.minutes} мин`),
      kpiCard('Энергия обсерватории', `<span data-live="energy">${Math.floor(s.energy)}</span> / ${s.maxEnergy}`, 'тратится на действия', '<div class="cz-meter"><i data-live="energy-bar"></i></div>'),
      kpiCard('Доверие игроков', `<span data-live="trust">${Math.round(s.trust)}</span>%`, 'упадёт до нуля — смена провалена', '<div class="cz-meter trust"><i data-live="trust-bar"></i></div>'),
      kpiCard('Очки', `<span data-live="score">${Math.round(s.score)}</span>`, `верных решений: ${s.correct} из ${s.resolved}`),
    ].join('')
  } else {
    const k = S.live?.kpis || {}
    html = [
      kpiCard('Планеты на связи', k.planetsTotal ? `${k.planetsOnline} из ${k.planetsTotal}` : null, 'присылают события'),
      kpiCard('События за 7 дней', fmt(k.events), 'принято обсерваторией'),
      kpiCard('Открытые аномалии', fmt(k.anomalies), 'ждут решения вахты'),
      kpiCard('Операторы', fmt(k.operators), 'зарегистрировано на вахте'),
    ].join('')
  }
  setHTML(slot('kpis'), html)
}

// ---------------- правая панель ----------------
function renderPanel() {
  let html
  if (S.anomalyId) html = anomalyPanel(S.anomalyId)
  else if (S.surface && S.region) html = regionPanel(S.surface, S.region)
  else if (S.selected === 'solana') html = starPanel()
  else if (S.selected?.startsWith?.('route:')) html = routePanel(S.selected.slice(6))
  else if (S.selected) html = bodyPanel(S.selected)
  else html = welcomePanel()
  setHTML(slot('panel'), html)
}

function panelHead(title, sub, back = true) {
  return `<div class="cz-ph">${back ? `<button class="cz-icon-btn" data-act="panel-back" aria-label="Назад">${ICON.back}</button>` : ''}<div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div>`
}

function welcomePanel() {
  const training = S.mode === 'training'
  return `
    ${panelHead(training ? 'Смена в тренажёре' : 'Система студии', training ? 'Аномалии появляются на планетах — разберите их вовремя' : 'Каждая планета — игра студии', false)}
    <p class="cz-text">${training
      ? 'Нажмите на планету с красным или жёлтым значком, выберите аномалию и решите, что делать. Каждое действие тратит энергию. Перед решением можно проверить телеметрию — это стоит 1 энергию, но даёт подсказку и бонус за верный ответ.'
      : 'В центре — звезда Solana, на ней работают все игры. Вокруг вращаются обсерватория Watchtower и четыре планеты-игры. Нажмите на планету, чтобы увидеть её состояние, нажмите ещё раз — чтобы спуститься на поверхность.'}</p>
    <div class="cz-list">
      ${BODIES.map((b) => {
        const st = world().bodies?.[b.id] || {}
        const n = (st.anomalies || []).length
        return `<button class="cz-row" data-act="select" data-id="${b.id}"><i class="cz-swatch" style="--c:${b.color}"></i><span><b>${esc(b.name)}</b><small>${esc(b.tagline)}</small></span>${n ? `<em class="cz-count ${worstClass(st.anomalies)}">${n}</em>` : ''}</button>`
      }).join('')}
    </div>
    <div class="cz-legend">
      <span><i class="dot ok"></i>на связи</span><span><i class="dot warn"></i>слабый сигнал</span><span><i class="dot idle"></i>нет сигнала</span>
      <span><i class="dot bad"></i>критичная аномалия</span>
    </div>`
}

function starPanel() {
  return `${panelHead(STAR.name, 'Звезда системы')}<p class="cz-text">${esc(STAR.about)}</p>
    <p class="cz-note">Состояние самой сети Solana обсерватория пока не измеряет, поэтому звезда светит ровно и ничего не утверждает.</p>`
}

function routePanel(id) {
  const r = ROUTES.find((x) => x.id === id)
  if (!r) return welcomePanel()
  return `${panelHead(r.name, `${bodyById(r.from).name} и ${bodyById(r.to).name}`)}<p class="cz-text">${esc(r.about)}</p>
    <p class="cz-note">${r.live ? 'По маршруту идёт поток.' : 'Пунктир без движения: поток по маршруту сейчас не наблюдается.'}</p>`
}

function metricsGrid(metrics, keys) {
  return `<div class="cz-metrics">${keys.map((k) => {
    const v = metrics?.[k]
    const val = k === 'retention' && typeof v === 'number' ? `${Math.round(v * 100)}%` : fmt(v)
    return `<div><span>${esc(METRIC_LABELS[k] || k)}</span><b class="${val == null ? 'na' : ''}">${val == null ? 'нет данных' : esc(val)}</b></div>`
  }).join('')}</div>`
}

const DETECTOR_TEXT = {
  'silence-gate': () => ['Канал приёма молчит', 'Ни одна игра пока не прислала событий, поэтому цифры показаны как «нет данных», а не нули.'],
  'data-quality': (b) => [`${b?.name || 'Игра'}: нет свежих данных`, 'За окно наблюдения от игры не пришло ни одного события.'],
  'config-gate': () => ['Игры ещё не подключены', 'Ни у одной игры не указан адрес программы или сервера, поэтому настоящие события пока нельзя проверить.'],
}

function detectorBlock(b) {
  if (S.mode === 'training') return ''
  const all = world().bodies?.hub?.detectorAlerts || []
  const list = b.kind === 'station' ? all : all.filter((a) => a.gameId === b.id)
  if (!list.length) return ''
  const rows = list.map((a) => {
    const [title, text] = DETECTOR_TEXT[a.detector]?.(bodyById(a.gameId)) || [a.title, a.detail]
    return `<div class="cz-row static"><i class="cz-sev ${severityClass(a.severity)}"></i><span><b>${esc(title)}</b><small>${esc(text || '')}</small></span></div>`
  }).join('')
  return `<h3>Тревоги детекторов <em class="cz-count ${worstClass(list)}">${list.length}</em></h3>
    <div class="cz-list">${rows}</div>
    <p class="cz-note">Это автоматические проверки обсерватории. Голосовать по ним не нужно: аномалией для вахты становится только то, что требует решения.</p>`
}

function bodyPanel(id) {
  const b = bodyById(id)
  if (!b) return welcomePanel()
  const st = world().bodies?.[id] || {}
  const signal = st.lost ? 'none' : (st.signal || 'none')
  const keys = b.kind === 'station' ? ['events', 'adapters', 'alerts'] : S.mode === 'training' ? ['players'] : ['players', 'newPlayers', 'retention', 'minted', 'burned', 'volume']
  const anomalies = st.anomalies || []
  return `
    ${panelHead(b.name, b.formerly ? `${b.tagline} · ${b.formerly}` : b.tagline)}
    <div class="cz-signal ${st.lost ? 'lost' : signal}"><i></i><span>${st.lost ? 'Связь потеряна' : SIGNAL_TEXT[signal]}${S.mode === 'training' && !st.lost ? ` · стабильность ${Math.round(Math.max(0, st.stability || 0))}%` : ''}</span></div>
    ${st.signalReason ? `<p class="cz-note">${esc(st.signalReason)}</p>` : ''}
    <p class="cz-text">${esc(b.about)}</p>
    ${metricsGrid(st.metrics, keys)}
    ${S.mode !== 'training' && st.level ? `<div class="cz-kv"><span>Подключение к обсерватории</span><b>${esc(LEVEL_TEXT[st.level]?.[0] || st.level)}</b></div>${LEVEL_TEXT[st.level] ? `<p class="cz-note">${esc(LEVEL_TEXT[st.level][1])}</p>` : ''}` : ''}
    <h3>Аномалии ${anomalies.length ? `<em class="cz-count ${worstClass(anomalies)}">${anomalies.length}</em>` : ''}</h3>
    ${anomalies.length ? `<div class="cz-list">${anomalies.map(anomalyRow).join('')}</div>` : '<p class="cz-empty">Аномалий нет.</p>'}
    ${detectorBlock(b)}
    <div class="cz-actions">
      <button class="cz-btn primary" data-act="enter" data-id="${b.id}">${ICON.down}Спуститься на поверхность</button>
      ${b.site ? `<a class="cz-btn" href="${b.site}" target="_blank" rel="noopener">Сайт игры ${ICON.ext}</a>` : ''}
    </div>`
}

function regionPanel(bodyId, regionId) {
  const b = bodyById(bodyId)
  const r = b?.regions.find((x) => x.id === regionId)
  if (!r) return bodyPanel(bodyId)
  const st = world().bodies?.[bodyId] || {}
  const anomalies = (st.anomalies || []).filter((a) => regionFor(b, a)?.id === r.id)
  return `
    ${panelHead(r.name, b.name)}
    <p class="cz-text">${esc(r.about)}</p>
    <div class="cz-callout"><b>За чем следит вахта</b><span>${esc(r.watch)}</span></div>
    ${metricsGrid(st.metrics, S.mode === 'training' ? ['players'] : r.metrics)}
    <h3>Аномалии в районе ${anomalies.length ? `<em class="cz-count ${worstClass(anomalies)}">${anomalies.length}</em>` : ''}</h3>
    ${anomalies.length ? `<div class="cz-list">${anomalies.map(anomalyRow).join('')}</div>` : '<p class="cz-empty">Здесь спокойно.</p>'}`
}

function anomalyRow(a) {
  const cls = severityClass(a.severity)
  return `<button class="cz-row anomaly ${cls}" data-act="anomaly" data-id="${a.id}"><i class="cz-sev ${cls}"></i><span><b>${esc(a.title)}</b><small>${esc(SEVERITY_TEXT[cls])}${a.demo ? ' · учебная' : ''}${a.timeLeft != null ? ` · <span data-countdown="${a.id}">${mmss(a.timeLeft)}</span>` : a.detectedAt ? ` · ${ago(a.detectedAt)}` : ''}</small></span></button>`
}

function worstClass(list = []) {
  const c = list.map((a) => severityClass(a.severity))
  return c.includes('critical') ? 'critical' : c.includes('warn') ? 'warn' : 'info'
}

function anomalyPanel(id) {
  if (S.lastResult && S.lastResult.id === id) return resultPanel(S.lastResult)
  const a = findAnomaly(id)
  if (!a) { S.anomalyId = null; return S.selected ? bodyPanel(S.selected) : welcomePanel() }
  const b = bodyById(a.bodyId)
  const region = regionFor(b, a)
  const cls = severityClass(a.severity)
  const head = `
    ${panelHead(a.title, `${b.name}${region ? ` · ${region.name}` : ''}`)}
    <div class="cz-chips"><span class="cz-chip ${cls}">${SEVERITY_TEXT[cls]}</span>${a.demo ? '<span class="cz-chip">учебная тревога, только в тестовой среде</span>' : ''}${a.timeLeft != null ? `<span class="cz-chip">осталось <b data-countdown="${a.id}">${mmss(a.timeLeft)}</b></span>` : `<span class="cz-chip">обнаружена ${ago(a.detectedAt)}</span>`}</div>
    <p class="cz-text">${esc(a.description)}</p>`
  return head + (S.mode === 'training' ? trainingDecision(a) : liveDecision(a))
}

function trainingDecision(a) {
  const s = S.sim.state
  const adv = a.advice
  const hint = a.investigated ? a.hint : null
  return `
    ${hint ? `<div class="cz-callout info"><b>Телеметрия</b><span>${esc(hint)}</span></div>`
      : `<button class="cz-btn ghost wide" data-act="investigate" data-id="${a.id}" ${s.energy < 1 ? 'disabled' : ''}>Проверить телеметрию · 1 энергия</button>`}
    <div class="cz-advisor"><span class="cz-advisor-mark" aria-hidden="true"></span><div><b>Бортовой ИИ советует</b><span>${esc(ACTION_TEXT[adv.actionId].title)} · уверенность ${Math.round(adv.confidence * 100)}%</span></div></div>
    <h3>Что делаем?</h3>
    <div class="cz-options">${a.options.map((act) => {
      const cost = S.sim.costOf(act)
      const risk = RISK_TEXT[S.sim.riskOf(act)]
      return `<button class="cz-option" data-act="resolve" data-id="${a.id}" data-action="${act}" ${s.energy < cost ? 'disabled' : ''}>
        <span><b>${esc(ACTION_TEXT[act].title)}</b><small class="risk ${risk.cls}">${risk.label}</small></span><em>${cost} эн.</em></button>`
    }).join('')}</div>`
}

function resultPanel(r) {
  const q = { best: ['Верное решение', 'good'], ok: ['Приемлемо', 'ok'], weak: ['Слабое решение', 'warn'], bad: ['Ошибка', 'bad'] }[r.quality]
  return `
    ${panelHead(r.title, 'Разбор решения')}
    <div class="cz-result ${q[1]}"><b>${q[0]}</b><span>${esc(r.explain)}</span></div>
    ${r.bonus ? '<p class="cz-note">+20 очков за проверку телеметрии перед решением.</p>' : ''}
    ${r.advisorWasWrong ? `<div class="cz-callout warn"><b>Советник ошибся</b><span>${r.followedLie ? 'Вы последовали неверному совету. Советник очень уверен — это ещё не значит, что он прав.' : 'Вы не поддались неверному совету. Так и нужно: ИИ — помощник, а не начальник.'}</span></div>` : ''}
    <div class="cz-actions"><button class="cz-btn primary" data-act="panel-back">Дальше</button></div>`
}

function liveDecision(a) {
  const actions = S.live?.operator?.allowedActions || {}
  const role = S.player?.role
  const bodyId = a.bodyId
  const clearanceOk = bodyId === 'hub' || role?.id === 'staff' || S.player?.clearance?.[bodyId]
  const total = (a.tally || []).reduce((m, t) => Math.max(m, t.totalWeight || 0), 0)
  let gate = ''
  if (!S.wallet) gate = 'Чтобы голосовать, войдите на вахту.'
  else if (role?.id === 'candidate') gate = 'Вы Кандидат. Сдайте проверку правил на вахте, и откроется право голоса.'
  else if (!role || !role.canVoteWeight) gate = `Ваш ранг «${ROLE_TEXT[role?.id] || 'Гость'}» пока не даёт права голоса. Права открываются прогрессом в играх студии.`
  else if (a.publicVisibleAt && a.publicVisibleAt > Date.now()) gate = `Критичная тревога: первые минуты её разбирает дежурный студии. Вахта сможет голосовать через ${mmss((a.publicVisibleAt - Date.now()) / 1000)}.`
  else if (!clearanceOk) gate = `Нет допуска к планете ${bodyById(bodyId).name}: нужно от ${S.live.operator.clearanceRule.minHours} часов и ранг в этой игре.`
  const options = (a.availableActions || []).map((act) => {
    const def = actions[act] || {}
    const t = (a.tally || []).find((x) => x.actionId === act)
    const share = t ? Math.round(t.share * 100) : 0
    const risk = RISK_TEXT[def.riskLevel] || RISK_TEXT.safe
    const allowedRisk = role?.canVoteOn?.includes(def.riskLevel)
    const mine = a.votes?.[act]?.myVote
    const disabled = gate || !allowedRisk || !['open', 'voting'].includes(a.status)
    return `<button class="cz-option ${mine ? 'mine' : ''} ${a.winningAction === act ? 'lead' : ''}" data-act="vote" data-id="${a.id}" data-action="${act}" ${disabled ? 'disabled' : ''} title="${!gate && !allowedRisk ? `Ваш ранг не голосует за действия: ${risk.label}` : ''}">
      <span><b>${esc(ACTION_TEXT[act]?.title || def.title || 'Действие')}</b><small class="risk ${risk.cls}">${risk.label}${mine ? ' · ваш голос' : ''}${a.winningAction === act ? ' · выбрано вахтой' : ''}</small></span>
      <em>${share}%</em><i class="cz-share" style="width:${share}%"></i></button>`
  }).join('')
  const staffBlock = role?.canApprove && a.status === 'consensus_pending' ? `
    <div class="cz-callout"><b>Нужно подтверждение студии</b><span>Вахта выбрала: ${esc(ACTION_TEXT[a.winningAction]?.title || a.winningAction)}.</span></div>
    <div class="cz-actions"><button class="cz-btn primary" data-act="approve" data-id="${a.id}" data-ok="1">Подтвердить</button><button class="cz-btn" data-act="approve" data-id="${a.id}" data-ok="0">Отклонить</button></div>` : ''
  return `
    ${gate ? `<div class="cz-callout warn"><b>Голосование недоступно</b><span>${esc(gate)}</span>${!S.wallet ? '<button class="cz-btn small" data-act="mode" data-mode="watch">Открыть вахту</button>' : ''}</div>` : ''}
    <h3>Голосование вахты ${total ? `<small>общий вес ${total}</small>` : ''}</h3>
    <div class="cz-options">${options || '<p class="cz-empty">Для этой аномалии нет доступных действий.</p>'}</div>
    ${staffBlock}
    <p class="cz-note">Голос — не команда. Решение исполняется только после порога вахты и подтверждения студии. Напрямую в игры отсюда ничего не пишется.</p>`
}

// ---------------- нижняя полоса ----------------
function renderBottom() {
  const a = S.anomalyId ? findAnomaly(S.anomalyId) : null
  let html
  if (a) {
    const stages = S.mode === 'training'
      ? [['Обнаружена', true], ['Телеметрия', a.investigated], ['Решение', false], ['Итог', false]]
      : (() => {
        const idx = { open: 0, voting: 1, consensus_pending: 2, approved: 3, executed: 4 }[a.status] ?? 0
        return [['Обнаружена', true], ['Голосование', idx >= 1], ['Выбор вахты', idx >= 2], ['Подтверждение студии', idx >= 3], ['Выполнено', idx >= 4]]
      })()
    const current = stages.findIndex(([, done]) => !done)
    const b = bodyById(a.bodyId)
    html = `
      <div class="cz-timeline">
        <span class="cz-tl-title">${esc(b.short)} · ${esc(a.title)}</span>
        <ol>${stages.map(([name, done], i) => `<li class="${done ? 'done' : ''} ${i === current ? 'now' : ''}"><i></i><span>${esc(name)}</span></li>`).join('')}</ol>
      </div>`
  } else {
    const list = allAnomalies()
    html = list.length
      ? `<div class="cz-strip"><span class="cz-strip-label">Аномалии</span>${list.map((x) => `<button class="cz-pill ${severityClass(x.severity)}" data-act="anomaly" data-id="${x.id}"><i></i>${esc(bodyById(x.bodyId).short)} · ${esc(x.title)}${x.timeLeft != null ? ` <b data-countdown="${x.id}">${mmss(x.timeLeft)}</b>` : ''}</button>`).join('')}</div>`
      : `<div class="cz-strip calm"><span class="cz-strip-label">Аномалии</span><span>${S.mode === 'training' ? 'Пока тихо. Скоро что-нибудь случится.' : 'Открытых аномалий нет.'}</span></div>`
  }
  setHTML(slot('bottom'), html)
}

// ---------------- поверхность планеты ----------------
function openSurface(id) {
  if (id === 'solana') return
  S.surface = id; S.selected = id; S.region = null; S.anomalyId = null
  engine.select(id)
  render()
}

function renderSurface() {
  const el = slot('surface')
  if (!S.surface) { el.hidden = true; setHTML(el, ''); return }
  el.hidden = false
  const b = bodyById(S.surface)
  const st = world().bodies?.[b.id] || {}
  const byRegion = {}
  for (const a of st.anomalies || []) {
    const r = regionFor(b, a)
    if (r) (byRegion[r.id] ||= []).push(a)
  }
  const hotspots = b.regions.map((r) => {
    const list = byRegion[r.id] || []
    const cls = list.length ? worstClass(list) : ''
    return `<button class="cz-hot ${cls} ${S.region === r.id ? 'active' : ''}" style="left:${r.x * 100}%;top:${r.y * 100}%" data-act="region" data-id="${r.id}">
      <i></i><span>${esc(r.name)}${list.length ? ` <em>${list.length}</em>` : ''}</span></button>`
  }).join('')
  const signal = st.lost ? 'lost' : (st.signal || 'none')
  setHTML(el, `
    <div class="cz-surface-head">
      <button class="cz-btn" data-act="leave-surface">${ICON.back}К системе</button>
      <div><h2>${esc(b.name)}</h2><p>${esc(b.tagline)}</p></div>
      <div class="cz-signal ${signal}"><i></i><span>${st.lost ? 'Связь потеряна' : SIGNAL_TEXT[signal === 'lost' ? 'none' : signal]}</span></div>
    </div>
    <div class="cz-scene ${b.scene ? '' : 'deck'} ${signal === 'none' || signal === 'lost' ? 'dim' : ''}">
      <div class="cz-scene-inner">
        ${b.scene ? `<img src="${b.scene}" alt="Поверхность: ${esc(b.name)}" draggable="false" />` : `<img class="station" src="${b.sprite}" alt="${esc(b.name)}" draggable="false" />`}
        ${hotspots}
      </div>
    </div>
    <p class="cz-surface-hint">Нажмите на район, чтобы узнать, что там происходит и за чем следит вахта.</p>`)
}

// ---------------- вахта ----------------
function renderWatch() {
  const el = slot('watch')
  el.hidden = S.mode !== 'watch'
  if (el.hidden) return
  if (!S.wallet || !S.player) {
    setHTML(el, `
      <div class="cz-ph"><div><h2>Вахта операторов</h2><p>Игроки студии помогают следить за системой</p></div></div>
      <p class="cz-text">Операторы разбирают аномалии и голосуют за безопасные действия. Доступ не покупается: он открывается часами и рангом в играх студии. Голосовать по аномалии планеты можно только при прогрессе в этой игре.</p>
      <form class="cz-login" data-act="login">
        <label>Адрес кошелька Solana<input name="wallet" autocomplete="off" spellcheck="false" placeholder="Адрес кошелька" required /></label>
        <button class="cz-btn primary wide" type="submit" ${S.busy ? 'disabled' : ''}>Войти на вахту</button>
      </form>
      <p class="cz-note">Проверка подписи кошелька будет подключена до запуска. Для пробы подойдёт адрес test_wallet — у него есть прогресс в играх.</p>
      ${rolesBlock()}`)
    return
  }
  const p = S.player
  const role = p.role || {}
  const acc = p.correctDecisions + p.wrongDecisions > 0 ? Math.round((p.correctDecisions / (p.correctDecisions + p.wrongDecisions)) * 100) : null
  const planets = BODIES.filter((b) => b.kind === 'planet')
  const op = S.live?.operator
  setHTML(el, `
    <div class="cz-ph"><div><h2>Вахта операторов</h2><p>${esc(p.wallet.slice(0, 4))}…${esc(p.wallet.slice(-4))}</p></div><button class="cz-btn small" data-act="logout">Выйти</button></div>
    <div class="cz-role ${esc(role.id)}"><span>Ваш ранг</span><b>${esc(ROLE_TEXT[role.id] || role.name || 'Гость')}</b></div>
    <div class="cz-metrics three">
      <div><span>Репутация</span><b>${fmt(p.reputation) ?? 0}</b></div>
      <div><span>Точность</span><b class="${acc == null ? 'na' : ''}">${acc == null ? 'нет решений' : `${acc}%`}</b></div>
      <div><span>Стейкинг</span><b>${p.staking ? `${p.staking} SOL` : 'нет'}</b></div>
    </div>
    ${nextStepBlock(p, role)}
    <h3>Допуск к планетам</h3>
    <div class="cz-list">${planets.map((b) => {
      const g = p.gameProgress?.[b.id] || { hours: 0, rank: 0 }
      const ok = p.clearance?.[b.id] || role.id === 'staff'
      return `<div class="cz-row static"><i class="cz-swatch" style="--c:${b.color}"></i><span><b>${esc(b.name)}</b><small>${g.hours} ч в игре · ${g.rank ? `ранг ${g.rank}` : 'ранга нет'}</small></span><em class="cz-clear ${ok ? 'ok' : ''}">${ok ? 'допуск есть' : 'нет допуска'}</em></div>`
    }).join('')}</div>
    <p class="cz-note">Допуск даётся от ${op?.clearanceRule?.minHours ?? 10} часов и ранга в игре. Обсерваторию могут разбирать все, у кого есть право голоса.</p>
    <h3>Аномалии на вахте</h3>
    ${allAnomalies().length ? `<div class="cz-list">${allAnomalies().map(anomalyRow).join('')}</div>` : '<p class="cz-empty">Открытых аномалий нет.</p>'}
    <h3>Лучшие операторы</h3>
    ${op?.leaderboard?.length ? `<ol class="cz-board">${op.leaderboard.slice(0, 8).map((x) => `<li><span>${esc(x.wallet)}</span><small>${esc(ROLE_TEXT[x.role] || '')}</small><b>${fmt(x.reputation)}</b></li>`).join('')}</ol>` : '<p class="cz-empty">Пока пусто.</p>'}
    ${rolesBlock()}`)
}

function nextStepBlock(p, role) {
  const games = Object.values(p.gameProgress || {})
  const qualifying = games.filter((g) => g.hours >= 10 && g.rank >= 2).length
  const acc = p.correctDecisions + p.wrongDecisions > 0 ? Math.round((p.correctDecisions / (p.correctDecisions + p.wrongDecisions)) * 100) : null
  if (role.id === 'guest' || role.id === 'candidate') {
    if (!qualifying) return `<div class="cz-callout"><b>Следующий шаг</b><span>Наиграйте 10 часов и получите ранг 2 в любой игре студии. После этого откроется роль Кандидата и проверка правил.</span></div>`
    if (!p.passedTest) return `<div class="cz-callout info"><b>Следующий шаг: проверка правил</b><span>Пять вопросов о том, как работает вахта. Нужно ответить верно на четыре. После этого вы станете Наблюдателем и сможете голосовать за безопасные действия.</span><button class="cz-btn primary small" data-act="exam">Пройти проверку</button></div>`
  }
  if (role.id === 'observer') return `<div class="cz-callout"><b>До роли Оператора</b><span>Ранги в двух играх (сейчас ${qualifying}), репутация 100 (сейчас ${p.reputation || 0}) и точность от 75%${acc == null ? '' : ` (сейчас ${acc}%)`}. Репутация растёт только за решения, которые студия действительно исполнила.</span></div>`
  if (role.id === 'operator') return `<div class="cz-callout"><b>До роли Старшего смены</b><span>Ранги в трёх играх (сейчас ${qualifying}), 60 дней на вахте и точность от 85%.</span></div>`
  return ''
}

async function openExam() {
  const el = slot('modal')
  try {
    const exam = await operatorApi.exam()
    S.examOpen = true
    el.hidden = false
    setHTML(el, `<div class="cz-dialog" role="dialog" aria-modal="true" aria-label="Проверка правил вахты">
      <div class="cz-ph"><div><h2>Проверка правил вахты</h2><p>${exam.total} вопросов · нужно ${exam.pass} верных ответа</p></div><button class="cz-icon-btn" data-act="close-modal" aria-label="Закрыть">${ICON.close}</button></div>
      <form class="cz-exam" data-act="exam-form">
        ${exam.questions.map((q, i) => `<fieldset><legend>${i + 1}. ${esc(q.text)}</legend>${q.options.map((o, j) => `<label><input type="radio" name="${esc(q.id)}" value="${j}" required /><span>${esc(o)}</span></label>`).join('')}</fieldset>`).join('')}
        <button class="cz-btn primary wide" type="submit">Отправить ответы</button>
      </form>
      <p class="cz-note">Ответы проверяет сервер. Если не получится, повторить можно через 10 минут.</p>
    </div>`)
  } catch (err) { toast(friendlyError(err), 'bad') }
}

function closeModal() {
  S.examOpen = false
  const el = slot('modal')
  el.hidden = true
  setHTML(el, '')
}

function rolesBlock() {
  return `<details class="cz-details"><summary>Как устроены ранги и защита</summary>
    <ul>
      <li><b>Гость</b> — смотрит карту.</li>
      <li><b>Кандидат</b> — от 10 часов в одной игре, учится в тренажёре.</li>
      <li><b>Наблюдатель</b> — ранг в одной игре: голосует за безопасные действия.</li>
      <li><b>Оператор</b> — ранги в двух играх, репутация 100 и точность от 75%: действия среднего риска, выплаты за верные решения.</li>
      <li><b>Старший смены</b> и <b>Хранитель</b> — ранги в трёх и четырёх играх, месяцы безупречной вахты.</li>
      <li>Вес голоса не больше 5 у любого игрока. Стейкинг лишь усиливает вес уже заслуженного ранга и не открывает доступ.</li>
      <li>Действия среднего и высокого риска исполняет только студия после подтверждения. Критичные аномалии видны вахте через 2 минуты, детали скрыты до разрешения.</li>
    </ul></details>`
}

// ---------------- тренажёр ----------------
function openTrainingMenu() {
  const save = loadTrainingSave()
  const el = slot('modal')
  el.hidden = false
  setHTML(el, `
    <div class="cz-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-title">
      <h2 id="tr-title">Тренажёр оператора</h2>
      <p class="cz-text">Смена на учебной копии системы. Аномалии взяты из механик самих игр, а ответы — ровно те действия, что есть у вахты в бою. После каждого решения разбор: почему верно или нет.</p>
      <ul class="cz-rules">
        <li>Действия тратят энергию обсерватории, она восстанавливается со временем.</li>
        <li>Проверка телеметрии стоит 1 энергию и даёт подсказку. Верное решение после проверки приносит бонус.</li>
        <li>Пока аномалия открыта, стабильность планеты падает. Потеряете две планеты или всё доверие игроков — смена провалена.</li>
        <li>Бортовой ИИ подсказывает, но на сложных сменах иногда ошибается.</li>
      </ul>
      <div class="cz-diffs">${DIFFICULTIES.map((d) => `
        <button class="cz-diff ${S.difficulty === d.id ? 'active' : ''}" data-act="diff" data-id="${d.id}">
          <b>${esc(d.name)}</b><span>${esc(d.about)}</span><small>${d.minutes} мин${save.best[d.id] ? ` · рекорд ${save.best[d.id]}` : ''}</small></button>`).join('')}</div>
      <div class="cz-actions"><button class="cz-btn primary" data-act="start-training">Начать смену</button><button class="cz-btn" data-act="mode" data-mode="map">На карту</button></div>
      <p class="cz-note">Сыграно смен: ${save.runs}, успешных: ${save.wins}. Результаты хранятся только в этом браузере и не влияют на ранг на вахте.</p>
    </div>`)
}

function startTraining() {
  localStorage.setItem('wt-cosmos-diff', S.difficulty)
  S.sim = createTraining(S.difficulty)
  S.selected = null; S.anomalyId = null; S.surface = null; S.region = null; S.lastResult = null
  slot('modal').hidden = true
  setHTML(slot('modal'), '')
  engine.setWorld(S.sim.world())
  render()
}

function trainingOver() {
  const s = S.sim.state
  const el = slot('modal')
  el.hidden = false
  const history = s.history.slice(0, 6)
  const q = { best: 'верно', ok: 'приемлемо', weak: 'слабо', bad: 'ошибка', expired: 'просрочено' }
  setHTML(el, `
    <div class="cz-dialog" role="dialog" aria-modal="true">
      <h2>${s.won ? 'Смена завершена' : 'Смена провалена'}</h2>
      <p class="cz-text">${s.won ? 'Система пережила смену. Посмотрите разбор последних решений.' : 'Слишком много потерь. Разберите ошибки и попробуйте ещё раз.'}</p>
      <div class="cz-metrics three">
        <div><span>Очки</span><b>${Math.round(s.score)}</b></div>
        <div><span>Верных решений</span><b>${s.correct} из ${s.resolved}</b></div>
        <div><span>Неверных советов ИИ принято</span><b>${s.followedBadAdvice}</b></div>
      </div>
      ${history.length ? `<h3>Последние решения</h3><div class="cz-list">${history.map((h) => `<div class="cz-row static"><span><b>${esc(h.title)}</b><small>${esc(q[h.quality])} — ${esc(h.explain)}</small></span></div>`).join('')}</div>` : ''}
      <div class="cz-actions"><button class="cz-btn primary" data-act="start-training">Ещё раз</button><button class="cz-btn" data-act="training-menu">Сменить сложность</button><button class="cz-btn" data-act="mode" data-mode="map">На карту</button></div>
    </div>`)
}

// ---------------- живые таймеры без перерисовки кнопок ----------------
function updateTimers() {
  if (S.mode !== 'training' || !S.sim) return
  const s = S.sim.state
  const set = (key, text) => root.querySelectorAll(`[data-live="${key}"]`).forEach((n) => { n.textContent = text })
  set('clock', mmss(s.duration - s.elapsed))
  set('energy', Math.floor(s.energy))
  set('trust', Math.round(s.trust))
  set('score', Math.round(s.score))
  root.querySelectorAll('[data-live="energy-bar"]').forEach((n) => { n.style.width = `${(s.energy / s.maxEnergy) * 100}%` })
  root.querySelectorAll('[data-live="trust-bar"]').forEach((n) => { n.style.width = `${s.trust}%` })
  root.querySelectorAll('[data-countdown]').forEach((n) => {
    const a = S.sim.find(n.dataset.countdown)
    if (a) n.textContent = mmss(a.timeLeft)
  })
}

// ---------------- подсказка при наведении ----------------
function showTooltip(target, pt) {
  const el = slot('tooltip')
  if (!target) { el.hidden = true; return }
  let html = ''
  if (target.type === 'star') html = `<b>${STAR.name}</b><span>Звезда системы</span>`
  else if (target.type === 'route') { const r = ROUTES.find((x) => x.id === target.id); html = `<b>${esc(r.name)}</b><span>Нажмите, чтобы узнать подробнее</span>` }
  else {
    const b = bodyById(target.id)
    const st = world().bodies?.[b.id] || {}
    const n = (st.anomalies || []).length
    html = `<b>${esc(b.name)}</b><span>${esc(b.tagline)}</span><span>${n ? `аномалий: ${n}` : 'аномалий нет'} · ${engine.selected === b.id ? 'нажмите, чтобы спуститься' : 'нажмите, чтобы выбрать'}</span>`
  }
  setHTML(el, html)
  el.hidden = false
  el.style.left = `${pt.x + 16}px`
  el.style.top = `${pt.y + 16}px`
}

// ---------------- поиск ----------------
function searchResults(q) {
  const t = q.trim().toLowerCase()
  if (!t) return []
  const out = []
  for (const b of BODIES) {
    if (`${b.name} ${b.tagline} ${b.formerly || ''}`.toLowerCase().includes(t)) out.push({ kind: 'body', id: b.id, title: b.name, sub: b.tagline })
    for (const r of b.regions) if (r.name.toLowerCase().includes(t)) out.push({ kind: 'region', id: r.id, body: b.id, title: r.name, sub: b.name })
  }
  for (const a of allAnomalies()) if (a.title.toLowerCase().includes(t)) out.push({ kind: 'anomaly', id: a.id, title: a.title, sub: bodyById(a.bodyId).name })
  return out.slice(0, 8)
}

function renderSearch() {
  const box = root.querySelector('.cz-results')
  const list = searchResults(S.query)
  box.hidden = !S.query
  box.innerHTML = list.length
    ? list.map((r) => `<button data-act="search-pick" data-kind="${r.kind}" data-id="${r.id}" data-body="${r.body || ''}"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></button>`).join('')
    : '<p>Ничего не найдено</p>'
}

// ---------------------------------------------------------------------------
// События
// ---------------------------------------------------------------------------
function setMode(mode) {
  if (mode === S.mode && mode !== 'training') return
  if (S.mode === 'training' && mode !== 'training' && S.sim && !S.sim.state.over) {
    if (!confirm('Смена в тренажёре ещё идёт. Завершить её?')) return
  }
  if (mode !== 'training') { S.sim = null; slot('modal').hidden = true; setHTML(slot('modal'), '') }
  S.mode = mode
  S.anomalyId = null; S.lastResult = null
  if (mode === 'training') { S.surface = null; S.selected = null; openTrainingMenu() }
  engine.setWorld(world())
  render()
}

root.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act]')
  if (!t || t.tagName === 'FORM' || t.tagName === 'INPUT') return
  const act = t.dataset.act
  const id = t.dataset.id
  if (act === 'mode') return setMode(t.dataset.mode)
  if (act === 'select') { S.selected = id; S.anomalyId = null; engine.select(id); return render() }
  if (act === 'enter') return openSurface(id)
  if (act === 'leave-surface') { S.surface = null; S.region = null; return render() }
  if (act === 'region') { S.region = id; S.anomalyId = null; return render() }
  if (act === 'anomaly') {
    const a = findAnomaly(id)
    S.anomalyId = id; S.lastResult = null
    if (a) { S.selected = a.bodyId; engine.select(a.bodyId) }
    return render()
  }
  if (act === 'panel-back') {
    if (S.anomalyId) { S.anomalyId = null; S.lastResult = null }
    else if (S.region) S.region = null
    else { S.selected = null; engine.select(null) }
    return render()
  }
  if (act === 'close-banner') { S.bannerClosed = true; return render() }
  if (act === 'diff') { S.difficulty = id; return openTrainingMenu() }
  if (act === 'start-training') return startTraining()
  if (act === 'training-menu') return openTrainingMenu()
  if (act === 'investigate' && S.sim) {
    const r = S.sim.investigate(id)
    if (!r.ok && r.reason) toast(r.reason, 'bad')
    return render()
  }
  if (act === 'resolve' && S.sim) {
    const r = S.sim.resolve(id, t.dataset.action)
    if (!r.ok) { toast(r.reason, 'bad'); return render() }
    S.lastResult = { ...r, id }
    engine.setWorld(S.sim.world())
    return render()
  }
  if (act === 'vote') {
    try {
      await operatorApi.vote(S.wallet, id, t.dataset.action)
      toast('Голос учтён', 'good')
    } catch (err) { toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'approve') {
    try {
      await operatorApi.approve(S.wallet, id, t.dataset.ok === '1')
      toast(t.dataset.ok === '1' ? 'Решение подтверждено' : 'Решение отклонено', 'good')
    } catch (err) { toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'exam') return openExam()
  if (act === 'close-modal') return closeModal()
  if (act === 'logout') {
    S.wallet = null; S.player = null
    localStorage.removeItem('wt-operator-wallet')
    return refreshLive()
  }
  if (act === 'search-pick') {
    S.query = ''
    root.querySelector('[data-act="search"]').value = ''
    root.querySelector('.cz-results').hidden = true
    if (t.dataset.kind === 'body') { S.selected = id; S.anomalyId = null; engine.select(id) }
    if (t.dataset.kind === 'region') { openSurface(t.dataset.body); S.region = id }
    if (t.dataset.kind === 'anomaly') { const a = findAnomaly(id); S.anomalyId = id; if (a) { S.selected = a.bodyId; engine.select(a.bodyId) } }
    return render()
  }
})

root.addEventListener('submit', async (e) => {
  const exam = e.target.closest('[data-act="exam-form"]')
  if (exam) {
    e.preventDefault()
    const answers = Object.fromEntries(new FormData(exam).entries())
    try {
      const res = await operatorApi.submitExam(S.wallet, answers)
      if (res.player) S.player = res.player
      closeModal()
      toast(res.passed ? `Проверка сдана: ${res.correct} из ${res.total}. Ваш ранг: ${ROLE_TEXT[res.player?.role?.id] || 'Гость'}` : `Верно ${res.correct} из ${res.total}. Повторить можно через 10 минут.`, res.passed ? 'good' : 'bad')
    } catch (err) { toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  const form = e.target.closest('[data-act="login"]')
  if (!form) return
  e.preventDefault()
  const wallet = new FormData(form).get('wallet')?.toString().trim()
  if (!wallet) return
  S.busy = true; render()
  try {
    const res = await operatorApi.auth(wallet)
    S.wallet = wallet.toLowerCase()
    S.player = res.player
    localStorage.setItem('wt-operator-wallet', S.wallet)
    toast(`Вы на вахте: ${ROLE_TEXT[res.player?.role?.id] || 'Гость'}`, 'good')
  } catch (err) { toast(`Не удалось войти: ${friendlyError(err)}`, 'bad') }
  S.busy = false
  refreshLive()
})

root.addEventListener('input', (e) => {
  if (e.target.dataset.act !== 'search') return
  S.query = e.target.value
  renderSearch()
})

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (S.examOpen) return closeModal()
  if (!slot('modal').hidden && S.mode === 'training' && !S.sim) return setMode('map')
  if (S.anomalyId) { S.anomalyId = null; S.lastResult = null }
  else if (S.region) S.region = null
  else if (S.surface) S.surface = null
  else { S.selected = null; engine.select(null) }
  render()
})

// ---------------------------------------------------------------------------
// Старт
// ---------------------------------------------------------------------------
render()
refreshLive()
setInterval(() => { if (S.mode !== 'training' && !document.hidden) refreshLive() }, LIVE_REFRESH_MS)

let lastTick = performance.now()
let structureKey = ''
setInterval(() => {
  const now = performance.now()
  const dt = Math.min(1, (now - lastTick) / 1000)
  lastTick = now
  if (S.mode !== 'training' || !S.sim || document.hidden) return
  const wasOver = S.sim.state.over
  S.sim.tick(dt)
  engine.setWorld(S.sim.world())
  // Перерисовываем структуру только когда меняется состав аномалий/планет
  const key = allAnomalies().map((a) => a.id + (a.investigated ? 'i' : '')).join(',') + Object.values(S.sim.bodies).map((b) => (b.lost ? 1 : 0) + Math.round(b.stability / 5)).join('') + Math.floor(S.sim.state.energy)
  if (key !== structureKey) { structureKey = key; render() } else updateTimers()
  if (!wasOver && S.sim.state.over) trainingOver()
}, 250)

if (new URLSearchParams(location.search).get('mode') === 'training') setMode('training')
if (new URLSearchParams(location.search).get('mode') === 'watch') setMode('watch')

// ---------------------------------------------------------------------------
// Watchtower — звёздная система студии. Главный экран продукта.
// Карта (живые данные) · Вахта (операторы голосуют) · Тренажёр (обучение).
// ---------------------------------------------------------------------------
import '@fontsource/exo-2/latin-600.css'
import '@fontsource/exo-2/cyrillic-600.css'
import '@fontsource/exo-2/latin-800.css'
import '@fontsource/exo-2/cyrillic-800.css'
import './cosmos.css'
import { createEngine } from './engine.js'
import { loadLiveWorld, operatorApi, operatorSession, partnerApi } from './live.js'
import { detectWallets, signInWithWallet } from './wallet.js'
import { createTraining, DIFFICULTIES, loadTrainingSave, levelFor, ACHIEVEMENTS, LEVELS, dailyChallenge, MODIFIERS, DAILY_BONUS_XP, dayKey, prevDayKey } from './training.js'
import { CLOSEUPS, CODEX_TOTAL, closeupFor, loadCodex, discover } from './closeups.js'
import { BODIES, ROUTES, STAR, METRIC_LABELS, ACTION_TEXT, RISK_TEXT, ROLE_TEXT, bodyById, regionFor, severityClass } from './world.js'

const LIVE_REFRESH_MS = 15000
// Сгенерированные иконки (public/cosmos/icons): вырезаны из чёрного фона с сохранением свечения
const ICON_IMG = ['planets', 'events', 'anomaly', 'operators', 'time', 'energy', 'trust', 'score', 'codex']
const icon = (name, cls = '') => (ICON_IMG.includes(name) ? `<img class="cz-ico ${cls}" src="${import.meta.env.BASE_URL}cosmos/icons/${name}.webp" alt="" aria-hidden="true" draggable="false" />` : '')
// Сгенерированные иконки действий вахты
const ACT_IMG = ['mark_false_positive', 'increase_priority', 'notify_status_page', 'enable_captcha', 'disable_ingress', 'pause_bridge', 'pause_contract']
const actIcon = (act) => (ACT_IMG.includes(act) ? `<img class="cz-act-ico" src="${import.meta.env.BASE_URL}cosmos/icons/act-${act}.webp" alt="" aria-hidden="true" draggable="false" />` : '<span class="cz-act-ico" aria-hidden="true"></span>')
const ROLE_IMG = ['guest', 'candidate', 'observer', 'operator', 'senior', 'guardian', 'staff']
const roleBadge = (id, cls = '') => (ROLE_IMG.includes(id) ? `<img class="cz-badge ${cls}" src="${import.meta.env.BASE_URL}cosmos/icons/role-${id}.webp" alt="" aria-hidden="true" draggable="false" />` : `<span class="cz-badge ${cls}" aria-hidden="true"></span>`)
const medal = (id) => `<img class="cz-medal" src="${import.meta.env.BASE_URL}cosmos/icons/medal-${id}.webp" alt="" aria-hidden="true" draggable="false" />`
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
  closeup: null,
  object: null,
  lastResult: null,
  hint: {},
  wallet: operatorSession.get()?.wallet || null,
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
  invalid_wallet_address: 'Это не похоже на адрес кошелька Solana',
  signature_required: 'Нужна подпись кошелька',
  bad_signature: 'Подпись не совпала с адресом кошелька. Попробуйте ещё раз',
  login_code_expired: 'Код входа истёк. Нажмите «Войти» ещё раз',
  too_many_login_attempts: 'Слишком много попыток входа. Подождите несколько минут',
  session_required: 'Сессия вахты закончилась. Войдите заново',
  wallet_mismatch: 'Сессия открыта для другого кошелька. Войдите заново',
  demo_login_disabled: 'Демо-вход отключён на этом сервере',
  staff_only: 'Это действие доступно только сотрудникам студии',
  storage_unavailable: 'Хранилище вахты временно недоступно, голос не записан. Попробуйте через минуту',
}
// ---------------------------------------------------------------------------
// Партнёрская ссылка: /r/<код> ведёт сюда с ?ref=<код>. Код хранится 30 дней,
// передаётся играм в ссылках «Сайт игры» и засчитывается после входа на вахту.
// ---------------------------------------------------------------------------
const REF_RE = /^[A-HJ-NP-Z2-9]{8}$/
const REF_KEY = 'wt-partner-ref'
function storedRef() {
  try {
    const v = JSON.parse(localStorage.getItem(REF_KEY) || 'null')
    if (v && REF_RE.test(v.code) && Date.now() - v.at < 30 * 24 * 3600 * 1000) return v.code
  } catch {}
  return null
}
;(() => {
  const url = new URL(location.href)
  const code = (url.searchParams.get('ref') || '').toUpperCase()
  if (!REF_RE.test(code)) return
  // Первый пригласивший остаётся: чужая ссылка позже не перехватывает приглашение
  if (!storedRef()) localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }))
  S.refLanding = true
  url.searchParams.delete('ref')
  history.replaceState(null, '', url.pathname + url.search + url.hash)
})()
function withRef(href) {
  const code = storedRef()
  if (!code || !href) return href
  try { const u = new URL(href); u.searchParams.set('ref', code); return u.toString() } catch { return href }
}
const CLAIM_SILENT = ['already_referred', 'self_referral', 'not_new_player', 'cyclic_referral']

async function claimStoredRef() {
  const code = storedRef()
  if (!code || !S.wallet || !operatorSession.get()) return
  try {
    await partnerApi.claim(code)
    localStorage.removeItem(REF_KEY)
    toast('Приглашение засчитано. Играйте в удовольствие — партнёр получит награду, если вы останетесь в игре', 'good')
  } catch (err) {
    if (err?.status === 401 || err?.status === 503 || !err?.status) return // попробуем позже
    localStorage.removeItem(REF_KEY)
    if (!CLAIM_SILENT.includes(err.code)) toast(`Приглашение не засчитано: ${friendlyError(err)}`, 'bad')
  }
}

function sessionLost(err) {
  if (err?.status !== 401) return false
  operatorSession.clear()
  S.wallet = null; S.player = null
  return true
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
    if (S.wallet) {
      await claimStoredRef()
      S.partners = await partnerApi.me().catch((err) => (sessionLost(err), null))
      S.partnerReview = S.player?.role?.id === 'staff' ? await partnerApi.review().catch(() => null) : null
    } else { S.partners = null; S.partnerReview = null }
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
  root.querySelector('[data-act="mode"][data-mode="training"]')?.classList.toggle('has-daily', !dailyDoneToday())
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

function kpiCard(ico, label, value, sub, extra = '') {
  return `<div class="cz-kpi">${icon(ico, 'kpi')}<div class="cz-kpi-body"><span class="cz-kpi-label">${esc(label)}</span><span class="cz-kpi-value ${value == null ? 'na' : ''}">${value == null ? 'нет данных' : value}</span>${extra}<span class="cz-kpi-sub">${esc(sub)}</span></div></div>`
}

function renderKpis() {
  let html = ''
  if (S.mode === 'training' && S.sim) {
    const s = S.sim.state
    html = [
      kpiCard('time', 'Время смены', `<span data-live="clock">${mmss(s.duration - s.elapsed)}</span>`, `осталось из ${s.difficulty.minutes} мин`),
      kpiCard('energy', 'Энергия обсерватории', `<span data-live="energy">${Math.floor(s.energy)}</span> / ${s.maxEnergy}`, 'тратится на действия', '<div class="cz-meter"><i data-live="energy-bar"></i></div>'),
      kpiCard('trust', 'Доверие игроков', `<span data-live="trust">${Math.round(s.trust)}</span>%`, 'упадёт до нуля — смена провалена', '<div class="cz-meter trust"><i data-live="trust-bar"></i></div>'),
      kpiCard('score', 'Очки', `<span data-live="score">${Math.round(s.score)}</span>`, S.sim.multiplier() > 1 ? `серия ${s.streak} · множитель ×${S.sim.multiplier()}` : `верных решений: ${s.correct} из ${s.resolved}`),
    ].join('')
  } else {
    const k = S.live?.kpis || {}
    html = [
      kpiCard('planets', 'Планеты на связи', k.planetsTotal ? `${k.planetsOnline} из ${k.planetsTotal}` : null, 'присылают события'),
      kpiCard('events', 'События за 7 дней', fmt(k.events), 'принято обсерваторией'),
      kpiCard('anomaly', 'Открытые аномалии', fmt(k.anomalies), 'ждут решения вахты'),
      kpiCard('operators', 'Операторы', fmt(k.operators), 'зарегистрировано на вахте'),
    ].join('')
  }
  setHTML(slot('kpis'), html)
}

// ---------------- правая панель ----------------
function renderPanel() {
  let html
  if (S.anomalyId) html = anomalyPanel(S.anomalyId)
  else if (S.surface && S.closeup && S.object) html = objectPanel(S.surface, S.closeup, S.object)
  else if (S.surface && S.region) html = regionPanel(S.surface, S.region)
  else if (S.selected === 'solana') html = starPanel()
  else if (S.selected?.startsWith?.('route:')) html = routePanel(S.selected.slice(6))
  else if (S.selected) html = bodyPanel(S.selected)
  else html = welcomePanel()
  setHTML(slot('panel'), html)
}

const thumb = (b, cls = '') => `<img class="cz-thumb ${cls}" src="${b.sprite}" alt="" aria-hidden="true" draggable="false" style="--c:${b.color}" />`

function panelHead(title, sub, back = true, art = '') {
  return `<div class="cz-ph">${back ? `<button class="cz-icon-btn" data-act="panel-back" aria-label="Назад">${ICON.back}</button>` : ''}${art}<div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div>`
}

const codexKey = (bodyId, regionId, objId) => `${bodyId}:${regionId}:${objId}`
const stars = (n, cls = '') => `<span class="cz-stars ${cls}" aria-label="Звёзд: ${n} из 3">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`

function codexBlock() {
  const n = loadCodex().size
  return `<div class="cz-codex">
    <div class="cz-codex-head">${icon('codex')}<b>Кодекс системы</b><span>${n} из ${CODEX_TOTAL}</span></div>
    <div class="cz-meter"><i style="width:${(n / CODEX_TOTAL) * 100}%"></i></div>
    <small>Спускайтесь в районы планет и осматривайте объекты: каждый открывает запись с фактами из самой игры.</small>
    <button class="cz-btn small" data-act="codex">Открыть кодекс</button>
  </div>`
}

function goalsBlock() {
  const s = S.sim.state
  const m = S.sim.multiplier()
  return `<h3>${icon('score')}Цели смены</h3>
    ${goalsList(S.sim.goals())}
    <div class="cz-streak ${m > 1 ? 'hot' : ''}">${icon('energy')}<span>Серия верных решений <b>${s.streak}</b></span>${m > 1 ? `<em>×${m}</em>` : '<small>3 подряд дают ×1.5, 6 подряд — ×2</small>'}</div>`
}

function goalsList(gs) {
  return `<ol class="cz-goals">${gs.map((g) => `<li class="${g.done ? 'done' : g.failed ? 'failed' : ''}"><i></i><span>${esc(g.text)}</span><small>${esc(g.done ? 'выполнено' : g.note)}</small></li>`).join('')}</ol>`
}

function levelCard(lv, gain = 0, up = false) {
  return `<div class="cz-level-card ${up ? 'up' : ''}">
    <div class="cz-level-badge"><img src="${import.meta.env.BASE_URL}cosmos/icons/level-${lv.level}.webp" alt="" aria-hidden="true" draggable="false" /><span>${lv.level}</span></div>
    <div class="cz-level-body">
      <b>${esc(lv.name)}${up ? '<em>Новый уровень</em>' : ''}</b>
      <div class="cz-meter xp"><i style="width:${Math.round(lv.progress * 100)}%"></i></div>
      <small>${gain ? `+${gain} опыта · ` : ''}${lv.next ? `${lv.xp} из ${lv.next} до следующего уровня` : `${lv.xp} опыта · высший уровень`}</small>
    </div>
  </div>`
}

const dailyDoneToday = () => { const d = loadTrainingSave().daily; return d.key === dayKey() && d.done }
const modAbout = (id, ch) => (id === 'focus' ? `Все аномалии приходят в мир ${bodyById(ch.focusBody)?.name || ''}.` : MODIFIERS[id].about)
const DAY_FMT = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

function dailyStrip(ch) {
  return `<div class="cz-daily mini"><div class="cz-daily-head"><b>Задание дня</b><span>${esc(DAY_FMT.format(new Date()))}</span></div>
    <ul class="cz-mods">${ch.modifiers.map((m) => `<li><b>${esc(MODIFIERS[m].name)}</b><small>${esc(modAbout(m, ch))}</small></li>`).join('')}</ul></div>`
}

function dailyCard(save) {
  const ch = dailyChallenge()
  const d = DIFFICULTIES.find((x) => x.id === ch.difficultyId)
  const today = save.daily.key === ch.key ? save.daily : { done: false, best: 0 }
  const alive = save.daily.lastWon === ch.key || save.daily.lastWon === prevDayKey(ch.key)
  const streak = alive ? save.daily.streak : 0
  const now = new Date()
  const left = Math.max(0, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now)
  const h = Math.floor(left / 3600000); const m = Math.floor((left % 3600000) / 60000)
  return `<section class="cz-daily ${today.done ? 'done' : ''}">
    <div class="cz-daily-head"><b>Задание дня</b><span>${esc(DAY_FMT.format(now))}</span><em>${today.done ? 'выполнено' : `+${DAILY_BONUS_XP} опыта`}</em></div>
    <p>Одинаковые условия для всех операторов сегодня. Сложность: <b>${esc(d.name)}</b>, ${d.minutes} мин.</p>
    <ul class="cz-mods">${ch.modifiers.map((m) => `<li><b>${esc(MODIFIERS[m].name)}</b><small>${esc(modAbout(m, ch))}</small></li>`).join('')}</ul>
    <div class="cz-daily-foot">
      <span>Серия дней: <b>${streak}</b></span>
      ${today.best ? `<span>Лучший результат сегодня: <b>${today.best}</b></span>` : ''}
      <span>Новое задание через ${h} ч ${m} мин</span>
    </div>
    <button class="cz-btn ${today.done ? '' : 'primary'}" data-act="start-daily">${today.done ? 'Сыграть ещё раз' : 'Начать задание дня'}</button>
    ${today.done ? '<small class="cz-note">Бонус за сегодня уже получен. Повтор улучшает только лучший результат.</small>' : ''}
  </section>`
}

function dailyResultBlock(r) {
  if (!r) return ''
  const text = r.stale ? 'Пока шла смена, наступил новый день, поэтому результат не засчитан в задание.'
    : r.first ? `Задание дня выполнено: +${r.bonus} опыта. Серия дней: ${r.streak}.`
      : S.sim.state.won ? 'Задание дня уже засчитано сегодня. Бонус выдаётся один раз в сутки.'
        : 'Задание дня не выполнено. Попробовать ещё раз можно до конца дня.'
  return `<div class="cz-callout ${r.first ? 'info' : 'warn'}"><b>Задание дня</b><span>${esc(text)}</span></div>`
}

function levelPath(xp = 0) {
  const cur = levelFor(xp).level
  return `<ol class="cz-path" aria-label="Путь курсанта">${LEVELS.map(([need, name], i) => `<li class="${i + 1 < cur ? 'passed' : ''} ${i + 1 === cur ? 'current' : ''}" title="${esc(name)} · от ${need} опыта"><img src="${import.meta.env.BASE_URL}cosmos/icons/level-${i + 1}.webp" alt="" aria-hidden="true" draggable="false" /><small>${need}</small></li>`).join('')}</ol>`
}

function achGrid(owned, highlight = [], onlyOwned = false) {
  return `<div class="cz-achs">${ACHIEVEMENTS.filter((a) => !onlyOwned || owned.includes(a.id)).map((a) => `<div class="cz-ach ${owned.includes(a.id) ? 'on' : ''} ${highlight.includes(a.id) ? 'new' : ''}" title="${esc(a.about)}">${medal(a.id)}<b>${esc(a.name)}</b><small>${esc(a.about)}</small></div>`).join('')}</div>`
}

function welcomePanel() {
  const training = S.mode === 'training'
  return `
    ${panelHead(training ? 'Смена в тренажёре' : 'Система студии', training ? 'Аномалии появляются на планетах — разберите их вовремя' : 'Каждая планета — игра студии', false)}
    <p class="cz-text">${training
      ? 'Нажмите на планету с красным или жёлтым значком, выберите аномалию и решите, что делать. Каждое действие тратит энергию. Перед решением можно проверить телеметрию — это стоит 1 энергию, но даёт подсказку и бонус за верный ответ.'
      : 'В центре — звезда Solana, на ней работают все игры. Вокруг вращаются обсерватория Watchtower и четыре планеты-игры. Нажмите на планету, чтобы увидеть её состояние, нажмите ещё раз — чтобы спуститься на поверхность.'}</p>
    ${training && S.sim?.state.daily ? dailyStrip(S.sim.state.daily) : ''}
    ${training && S.sim ? goalsBlock() : ''}
    <div class="cz-list">
      ${BODIES.map((b) => {
        const st = world().bodies?.[b.id] || {}
        const n = (st.anomalies || []).length
        return `<button class="cz-row" data-act="select" data-id="${b.id}">${thumb(b)}<span><b>${esc(b.name)}</b><small>${esc(b.tagline)}</small></span>${n ? `<em class="cz-count ${worstClass(st.anomalies)}">${n}</em>` : ''}</button>`
      }).join('')}
    </div>
    ${training && S.sim ? '' : codexBlock()}
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
  return `<h3>${icon('events')}Тревоги детекторов <em class="cz-count ${worstClass(list)}">${list.length}</em></h3>
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
    ${panelHead(b.name, b.formerly ? `${b.tagline} · ${b.formerly}` : b.tagline, true, thumb(b, 'big'))}
    <div class="cz-signal ${st.lost ? 'lost' : signal}"><i></i><span>${st.lost ? 'Связь потеряна' : SIGNAL_TEXT[signal]}${S.mode === 'training' && !st.lost ? ` · стабильность ${Math.round(Math.max(0, st.stability || 0))}%` : ''}</span></div>
    ${st.signalReason ? `<p class="cz-note">${esc(st.signalReason)}</p>` : ''}
    <p class="cz-text">${esc(b.about)}</p>
    ${metricsGrid(st.metrics, keys)}
    ${S.mode !== 'training' && st.level ? `<div class="cz-kv"><span>Подключение к обсерватории</span><b>${esc(LEVEL_TEXT[st.level]?.[0] || st.level)}</b></div>${LEVEL_TEXT[st.level] ? `<p class="cz-note">${esc(LEVEL_TEXT[st.level][1])}</p>` : ''}` : ''}
    <h3>${icon('anomaly')}Аномалии ${anomalies.length ? `<em class="cz-count ${worstClass(anomalies)}">${anomalies.length}</em>` : ''}</h3>
    ${anomalies.length ? `<div class="cz-list">${anomalies.map(anomalyRow).join('')}</div>` : '<p class="cz-empty">Аномалий нет.</p>'}
    ${detectorBlock(b)}
    <div class="cz-actions">
      <button class="cz-btn primary" data-act="enter" data-id="${b.id}">${ICON.down}Спуститься на поверхность</button>
      ${b.site ? `<a class="cz-btn" href="${esc(withRef(b.site))}" target="_blank" rel="noopener">Сайт игры ${ICON.ext}</a>` : ''}
    </div>`
}

function closeupPreview(b, r) {
  const cu = closeupFor(b.id, r.id)
  if (!cu || S.closeup === r.id) return ''
  const codex = loadCodex()
  const seen = cu.objects.filter((o) => codex.has(codexKey(b.id, r.id, o.id))).length
  return `<button class="cz-preview" data-act="closeup" data-id="${r.id}"><img src="${cu.image}" alt="" draggable="false" /><span><b>Войти в район</b><small>Осмотрено ${seen} из ${cu.objects.length}</small></span></button>`
}

function objectPanel(bodyId, regionId, objId) {
  const b = bodyById(bodyId)
  const cu = closeupFor(bodyId, regionId)
  const o = cu?.objects.find((x) => x.id === objId)
  if (!o) return regionPanel(bodyId, regionId)
  const codex = loadCodex()
  const next = cu.objects.find((x) => !codex.has(codexKey(bodyId, regionId, x.id)))
  const n = codex.size
  return `
    ${panelHead(o.name, `${b.name} · ${cu.title}`)}
    <div class="cz-entry"><span class="cz-entry-tag">${icon('codex')}Запись кодекса</span><p>${esc(o.text)}</p></div>
    <div class="cz-codex mini"><div class="cz-codex-head"><b>Кодекс системы</b><span>${n} из ${CODEX_TOTAL}</span></div><div class="cz-meter"><i style="width:${(n / CODEX_TOTAL) * 100}%"></i></div></div>
    <div class="cz-actions">${next ? `<button class="cz-btn primary" data-act="object" data-id="${next.id}">Дальше: ${esc(next.name)}</button>` : '<span class="cz-note">Район осмотрен полностью.</span>'}<button class="cz-btn" data-act="codex">Весь кодекс</button></div>`
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
    ${closeupPreview(b, r)}
    ${metricsGrid(st.metrics, S.mode === 'training' ? ['players'] : r.metrics)}
    <h3>${icon('anomaly')}Аномалии в районе ${anomalies.length ? `<em class="cz-count ${worstClass(anomalies)}">${anomalies.length}</em>` : ''}</h3>
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

function placeBlock(b, region) {
  const cu = region && closeupFor(b.id, region.id)
  if (!cu || (S.surface === b.id && S.closeup === region.id)) return ''
  return `<button class="cz-place" data-act="goto-closeup" data-body="${b.id}" data-region="${region.id}" data-keep="1"><img src="${cu.image}" alt="" draggable="false" /><span>Место происшествия · ${esc(region.name)}</span></button>`
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
    <p class="cz-text">${esc(a.description)}</p>
    ${placeBlock(b, region)}`
  return head + (S.mode === 'training' ? trainingDecision(a) : liveDecision(a))
}

function trainingDecision(a) {
  const s = S.sim.state
  const adv = a.advice
  const hint = a.investigated ? a.hint : null
  return `
    ${hint ? `<div class="cz-callout info"><b>Телеметрия</b><span>${esc(hint)}</span></div>`
      : `<button class="cz-btn ghost wide" data-act="investigate" data-id="${a.id}" ${s.energy < S.sim.scanCost ? 'disabled' : ''}>${icon('events')}Проверить телеметрию<span class="cz-cost">${icon('energy')}${S.sim.scanCost}</span></button>`}
    <div class="cz-advisor"><span class="cz-advisor-mark" aria-hidden="true"></span><div><b>Бортовой ИИ советует</b><span>${esc(ACTION_TEXT[adv.actionId].title)} · уверенность ${Math.round(adv.confidence * 100)}%</span></div></div>
    <h3>Что делаем?</h3>
    <div class="cz-options">${a.options.map((act) => {
      const cost = S.sim.costOf(act)
      const risk = RISK_TEXT[S.sim.riskOf(act)]
      return `<button class="cz-option" data-act="resolve" data-id="${a.id}" data-action="${act}" ${s.energy < cost ? 'disabled' : ''}>${actIcon(act)}
        <span><b>${esc(ACTION_TEXT[act].title)}</b><small class="risk ${risk.cls}">${risk.label}</small></span><em class="cz-cost">${icon('energy')}${cost}</em></button>`
    }).join('')}</div>`
}

function resultPanel(r) {
  const q = { best: ['Верное решение', 'good'], ok: ['Приемлемо', 'ok'], weak: ['Слабое решение', 'warn'], bad: ['Ошибка', 'bad'] }[r.quality]
  return `
    ${panelHead(r.title, 'Разбор решения')}
    <div class="cz-result ${q[1]}"><b>${q[0]}</b><span>${esc(r.explain)}</span></div>
    <div class="cz-gain ${r.gained < 0 ? 'neg' : ''}"><b>${r.gained > 0 ? '+' : ''}${r.gained}</b><span>очков${r.mult > 1 ? ` · множитель серии ×${r.mult}` : ''}</span>${r.streak >= 2 ? `<em>серия ${r.streak}</em>` : ''}</div>
    ${r.bonus ? '<p class="cz-note">Включая +20 за проверку телеметрии перед решением.</p>' : ''}
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
    return `<button class="cz-option ${mine ? 'mine' : ''} ${a.winningAction === act ? 'lead' : ''}" data-act="vote" data-id="${a.id}" data-action="${act}" ${disabled ? 'disabled' : ''} title="${!gate && !allowedRisk ? `Ваш ранг не голосует за действия: ${risk.label}` : ''}">${actIcon(act)}
      <span><b>${esc(ACTION_TEXT[act]?.title || def.title || 'Действие')}</b><small class="risk ${risk.cls}">${risk.label}${mine ? ' · ваш голос' : ''}${a.winningAction === act ? ' · выбрано вахтой' : ''}</small></span>
      <em>${share}%</em><i class="cz-share" style="width:${share}%"></i></button>`
  }).join('')
  const staffBlock = executionBlock(a, role)
  return `
    ${gate && ['open', 'voting'].includes(a.status) ? `<div class="cz-callout warn"><b>Голосование недоступно</b><span>${esc(gate)}</span>${!S.wallet ? '<button class="cz-btn small" data-act="mode" data-mode="watch">Открыть вахту</button>' : ''}</div>` : ''}
    <h3>${icon('operators')}Голосование вахты ${total ? `<small>общий вес ${total}</small>` : ''}</h3>
    <div class="cz-options">${options || '<p class="cz-empty">Для этой аномалии нет доступных действий.</p>'}</div>
    ${staffBlock}
    <p class="cz-note">Голос — не команда. Безопасные действия выполняются после порога вахты, остальные — ещё и после подтверждения студии. Сама обсерватория в играх ничего не меняет: решение передаётся исполнителю студии.</p>`
}

const DISPATCH_TEXT = {
  manual: 'Исполнитель студии не подключён, поэтому действие выполняет сотрудник вручную.',
  pending: 'Решение отправляется исполнителю студии.',
  delivered: 'Исполнитель студии получил решение и выполняет его.',
  undelivered: 'Исполнитель студии не ответил после всех попыток. Нужен сотрудник: выполнить вручную или отправить снова.',
}

/** Что происходит с решением после голосования — простыми словами, и кнопки для сотрудника. */
function executionBlock(a, role) {
  const staff = role?.canApprove
  const title = esc(ACTION_TEXT[a.winningAction]?.title || 'выбранное действие')
  const box = (head, text, cls = '') => `<div class="cz-callout ${cls}"><b>${head}</b><span>${text}</span></div>`
  const buttons = (list) => `<div class="cz-actions">${list.join('')}</div>`
  if (a.status === 'consensus_pending') {
    if (!staff) return box('Ждёт подтверждения студии', `Вахта выбрала: ${title}. Пока сотрудник студии не подтвердит, ничего не происходит.`)
    return box('Нужно подтверждение студии', `Вахта выбрала: ${title}.`) +
      buttons([`<button class="cz-btn primary" data-act="approve" data-id="${a.id}" data-ok="1">Подтвердить</button>`, `<button class="cz-btn" data-act="approve" data-id="${a.id}" data-ok="0">Отклонить</button>`])
  }
  if (a.status === 'approved') {
    const left = Math.max(0, ((a.scheduledFor || 0) - Date.now()) / 1000)
    return box('Подтверждено, идёт время на отмену', `${title}: передача на исполнение через <b data-until="${a.scheduledFor || 0}">${mmss(left)}</b>. До этого сотрудник студии может отменить решение.`) +
      (staff ? buttons([`<button class="cz-btn" data-act="cancel-action" data-id="${a.id}">Отменить решение</button>`]) : '')
  }
  if (a.status !== 'handed_off') return ''
  const d = a.dispatch || {}
  let text = DISPATCH_TEXT[d.state] || ''
  if (d.state === 'delivered' && d.mode === 'propose') text = 'Исполнитель студии получил решение.'
  if (d.state === 'pending' && d.attempts > 0) text = `Исполнитель студии пока не ответил (попыток: ${d.attempts}). Скоро будет ещё одна.`
  if (d.mode === 'propose') text += ' Это действие через мультисиг: исполнитель только готовит предложение, подписывают люди, а итог отмечает сотрудник.'
  if (d.result === 'proposed') text += ' Предложение подготовлено и ждёт подписей.'
  const list = [`<button class="cz-btn primary" data-act="resolve" data-id="${a.id}" data-result="executed">Выполнено</button>`, `<button class="cz-btn" data-act="resolve" data-id="${a.id}" data-result="failed">Не удалось</button>`]
  if (d.state === 'undelivered' && S.live?.operator?.executor?.connected) list.push(`<button class="cz-btn" data-act="resolve" data-id="${a.id}" data-result="retry">Отправить снова</button>`)
  return box(`Передано на исполнение: ${title}`, esc(text), d.state === 'undelivered' ? 'warn' : '') + (staff ? buttons(list) : '')
}

// ---------------- нижняя полоса ----------------
function renderBottom() {
  const a = S.anomalyId ? findAnomaly(S.anomalyId) : null
  let html
  if (a) {
    const stages = S.mode === 'training'
      ? [['Обнаружена', true], ['Телеметрия', a.investigated], ['Решение', false], ['Итог', false]]
      : (() => {
        const idx = { open: 0, voting: 1, consensus_pending: 2, approved: 3, handed_off: 4, executed: 5 }[a.status] ?? 0
        const needsStaff = S.live?.operator?.allowedActions?.[a.winningAction]?.requiresApproval !== false
        return [['Обнаружена', true], ['Голосование', idx >= 1], ['Выбор вахты', idx >= 2], [needsStaff ? 'Подтверждение студии' : 'Подтверждение не нужно', idx >= 3], ['Передано исполнителю', idx >= 4], ['Выполнено', idx >= 5]]
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
      ? `<div class="cz-strip"><span class="cz-strip-label">${icon('anomaly')}Аномалии</span>${list.map((x) => `<button class="cz-pill ${severityClass(x.severity)}" data-act="anomaly" data-id="${x.id}"><i></i>${esc(bodyById(x.bodyId).short)} · ${esc(x.title)}${x.timeLeft != null ? ` <b data-countdown="${x.id}">${mmss(x.timeLeft)}</b>` : ''}</button>`).join('')}</div>`
      : `<div class="cz-strip calm"><span class="cz-strip-label">${icon('anomaly')}Аномалии</span><span>${S.mode === 'training' ? 'Пока тихо. Скоро что-нибудь случится.' : 'Открытых аномалий нет.'}</span></div>`
  }
  setHTML(slot('bottom'), html)
}

// ---------------- поверхность планеты ----------------
function openSurface(id) {
  if (id === 'solana') return
  S.surface = id; S.selected = id; S.region = null; S.anomalyId = null; S.closeup = null; S.object = null
  engine.select(id)
  render()
}

function renderSurface() {
  const el = slot('surface')
  if (!S.surface) { el.hidden = true; setHTML(el, ''); return }
  el.hidden = false
  const b = bodyById(S.surface)
  const st = world().bodies?.[b.id] || {}
  const cu = S.closeup ? closeupFor(b.id, S.closeup) : null
  if (cu) return renderCloseup(el, b, st, cu)
  const byRegion = {}
  for (const a of st.anomalies || []) {
    const r = regionFor(b, a)
    if (r) (byRegion[r.id] ||= []).push(a)
  }
  const codex = loadCodex()
  const hotspots = b.regions.map((r) => {
    const list = byRegion[r.id] || []
    const cu = closeupFor(b.id, r.id)
    const got = cu ? cu.objects.filter((o) => codex.has(codexKey(b.id, r.id, o.id))).length : 0
    const cls = `${list.length ? worstClass(list) : ''} ${cu && got === cu.objects.length ? 'explored' : ''}`
    return `<button class="cz-hot ${cls} ${S.region === r.id ? 'active' : ''}" style="left:${r.x * 100}%;top:${r.y * 100}%" data-act="region" data-id="${r.id}">
      <i></i><span>${esc(r.name)}${list.length ? ` <em>${list.length}</em>` : ''}${cu ? `<small class="cz-explore">${got}/${cu.objects.length}</small>` : ''}</span></button>`
  }).join('')
  const signal = st.lost ? 'lost' : (st.signal || 'none')
  setHTML(el, `
    <div class="cz-surface-head">
      <button class="cz-btn" data-act="leave-surface">${ICON.back}К системе</button>
      <div><h2>${esc(b.name)}</h2><p>${esc(b.tagline)}</p></div>
      <div class="cz-signal ${signal}"><i></i><span>${st.lost ? 'Связь потеряна' : SIGNAL_TEXT[signal === 'lost' ? 'none' : signal]}</span></div>
    </div>
    <div class="cz-scene ${b.scene ? '' : 'deck'} ${signal === 'none' || signal === 'lost' ? 'dim' : ''} ${(st.anomalies || []).length ? `alarm ${worstClass(st.anomalies)}` : ''}">
      <div class="cz-scene-inner">
        ${b.scene ? `<img src="${b.scene}" alt="Поверхность: ${esc(b.name)}" draggable="false" />` : `<img class="station" src="${b.sprite}" alt="${esc(b.name)}" draggable="false" />`}
        ${sceneFx(b.id, signal)}
        ${hotspots}
      </div>
    </div>
    <p class="cz-surface-hint">Нажмите на район, чтобы узнать, что там происходит и за чем следит вахта.${(st.anomalies || []).length ? ` ${ALARM_HINT}` : ''}${quietHint(signal)}</p>`)
}

// ---------------- живые сцены ----------------
// Погода — часть окружения и идёт всегда. Движение техники (дроны, болиды) —
// это признак активности, поэтому оно появляется только когда у мира есть сигнал.
const FX = {
  hub: { weather: 'data', sprites: [['hub-satellite', 'orbit', 7, 34, 0], ['hub-packet', 'packet', 4.4, 5, 0], ['hub-packet', 'packet2', 3.4, 6.5, -2.4]] },
  ares1: { weather: 'dust', sprites: [['ares-drone', 'hover', 8, 20, 0], ['ares-drone', 'hover2', 6, 26, -11], ['ares-rover', 'drive', 10.5, 28, -4]] },
  aof: { weather: 'motes', sprites: [['aof-orb', 'float', 6.5, 22, 0], ['aof-orb', 'float2', 4.5, 30, -14], ['aof-neuron', 'pulse', 11, 14, 0]] },
  guttercaps: { weather: 'rain', sprites: [['gutter-moth', 'flutter', 5.5, 18, 0], ['gutter-cap', 'toss', 6.5, 6, -1.5]] },
  neonrelay: { weather: 'streaks', sprites: [['neon-car', 'dash', 10, 8, 0], ['neon-car', 'dash2', 8, 11, -5], ['neon-bike', 'dash3', 9, 6, -2]] },
}
function sceneFx(bodyId, signal) {
  const fx = FX[bodyId]
  if (!fx) return ''
  const live = signal === 'ok' || signal === 'weak'
  const sprites = live ? fx.sprites.map(([img, path, w, dur, delay]) => `<div class="fx-sprite p-${path}" style="--w:${w}%;--dur:${dur}s;--delay:${delay}s"><img src="${import.meta.env.BASE_URL}cosmos/fx/${img}.webp" alt="" draggable="false" /></div>`).join('') : ''
  return `<div class="cz-fx" aria-hidden="true"><div class="fx-weather w-${fx.weather}"></div><div class="fx-weather w-${fx.weather} far"></div>${sprites}</div>`
}
const ALARM_HINT = 'Красная пульсация по краям — в этом месте открыта тревога.'
const quietHint = (signal) => (signal === 'ok' || signal === 'weak' ? '' : ' Движение техники на сцене появится, когда игра начнёт присылать события.')

function renderCloseup(el, b, st, cu) {
  const r = b.regions.find((x) => x.id === S.closeup)
  const codex = loadCodex()
  const anomalies = (st.anomalies || []).filter((a) => regionFor(b, a)?.id === r.id)
  const objs = cu.objects.map((o) => {
    const seen = codex.has(codexKey(b.id, r.id, o.id))
    return `<button class="cz-hot obj ${seen ? 'seen' : ''} ${S.object === o.id ? 'active' : ''}" style="left:${o.x * 100}%;top:${o.y * 100}%" data-act="object" data-id="${o.id}"><i></i><span>${esc(seen ? o.name : 'Осмотреть')}</span></button>`
  }).join('')
  const alerts = anomalies.map((a, i) => {
    const o = cu.objects[i % cu.objects.length]
    return `<button class="cz-alert ${severityClass(a.severity)}" style="left:${o.x * 100}%;top:${Math.max(6, (o.y - 0.13) * 100)}%" data-act="anomaly" data-id="${a.id}"><i></i><span>${esc(a.title)}</span></button>`
  }).join('')
  const seenN = cu.objects.filter((o) => codex.has(codexKey(b.id, r.id, o.id))).length
  const signal = st.lost ? 'lost' : (st.signal || 'none')
  setHTML(el, `
    <div class="cz-surface-head">
      <button class="cz-btn" data-act="leave-closeup">${ICON.back}${esc(b.short)}</button>
      <div><h2>${esc(cu.title)}</h2><p>${esc(b.name)} · ${esc(r.name)}</p></div>
      <div class="cz-signal ${signal}"><i></i><span>${st.lost ? 'Связь потеряна' : SIGNAL_TEXT[signal === 'lost' ? 'none' : signal]}</span></div>
    </div>
    <div class="cz-scene closeup ${signal === 'none' || signal === 'lost' ? 'dim' : ''} ${anomalies.length ? `alarm ${worstClass(anomalies)}` : ''}">
      <div class="cz-scene-inner"><img src="${cu.image}" alt="${esc(cu.title)}" draggable="false" />${sceneFx(b.id, signal)}${objs}${alerts}</div>
    </div>
    <p class="cz-surface-hint">Осмотрено ${seenN} из ${cu.objects.length}. Каждый объект открывает запись в Кодексе системы.${anomalies.length ? ` ${ALARM_HINT}` : ''}${quietHint(signal)}</p>`)
}

function worldProgress(codex) {
  return BODIES.filter((b) => b.regions?.length).map((b) => {
    let got = 0; let all = 0
    for (const r of b.regions) {
      const c = closeupFor(b.id, r.id)
      if (!c) continue
      all += c.objects.length
      got += c.objects.filter((o) => codex.has(codexKey(b.id, r.id, o.id))).length
    }
    return all ? `<div class="cz-world ${got === all ? 'full' : ''}">${thumb(b)}<b>${esc(b.short)}</b><small>${got} из ${all}</small></div>` : ''
  }).join('')
}

function openCodex() {
  const codex = loadCodex()
  const n = codex.size
  const groups = Object.entries(CLOSEUPS).map(([key, cu]) => {
    const [bodyId, regionId] = key.split(':')
    const b = bodyById(bodyId)
    const r = b.regions.find((x) => x.id === regionId)
    const got = cu.objects.filter((o) => codex.has(`${key}:${o.id}`)).length
    const items = cu.objects.map((o) => (codex.has(`${key}:${o.id}`)
      ? `<li class="open"><b>${esc(o.name)}</b><span>${esc(o.text)}</span></li>`
      : `<li class="locked"><b>Не осмотрено</b><span>Объект ждёт в районе «${esc(r.name)}»</span></li>`)).join('')
    return `<section class="cz-codex-group ${got === cu.objects.length ? 'full' : ''}">
      <header>${thumb(b)}<div><b>${esc(b.short)} · ${esc(cu.title)}</b><small>${got} из ${cu.objects.length}</small></div><button class="cz-btn small" data-act="goto-closeup" data-body="${bodyId}" data-region="${regionId}">Отправиться</button></header>
      <ul>${items}</ul></section>`
  }).join('')
  S.examOpen = true
  const el = slot('modal')
  el.hidden = false
  setHTML(el, `<div class="cz-dialog wide" role="dialog" aria-modal="true" aria-label="Кодекс системы">
    <div class="cz-dialog-hero">${icon('codex', 'hero')}<div><h2>Кодекс системы</h2><p class="cz-note">Собрано ${n} из ${CODEX_TOTAL} записей. Прогресс хранится в этом браузере.</p></div><button class="cz-icon-btn" data-act="close-modal" aria-label="Закрыть">${ICON.close}</button></div>
    <div class="cz-meter xp"><i style="width:${(n / CODEX_TOTAL) * 100}%"></i></div>
    <div class="cz-worlds">${worldProgress(codex)}</div>
    <div class="cz-codex-grid">${groups}</div>
  </div>`)
}

// ---------------- вахта ----------------
function walletLoginBlock() {
  const wallets = detectWallets()
  const demo = S.live?.operator?.auth?.demoLogin
  return `<div class="cz-login-box">
    ${wallets.length
      ? `<div class="cz-wallets">${wallets.map((w) => `<button class="cz-btn primary wide" data-act="wallet-login" data-id="${w.id}" ${S.busy ? 'disabled' : ''}>Войти через ${esc(w.name)}</button>`).join('')}</div>`
      : '<div class="cz-callout info"><b>Нужен кошелёк Solana</b><span>Установите расширение Phantom, Solflare или Backpack и обновите страницу. На телефоне откройте эту страницу во встроенном браузере кошелька.</span></div>'}
    <p class="cz-note">Кошелёк подпишет одно текстовое сообщение с одноразовым кодом. Это не транзакция: она ничего не списывает и не даёт доступа к средствам.</p>
  </div>
  ${demo ? `<details class="cz-details"><summary>Демо-вход для разработки</summary>
    <form class="cz-login" data-act="login">
      <label>Демо-кошелёк<input name="wallet" autocomplete="off" spellcheck="false" value="test_wallet" required /></label>
      <button class="cz-btn wide" type="submit" ${S.busy ? 'disabled' : ''}>Войти без подписи</button>
    </form>
    <p class="cz-note">Работает только на сервере разработки. В продакшене вход возможен лишь подписью кошелька.</p></details>` : ''}`
}

const PROGRESS_SOURCE_TEXT = {
  game: 'Часы и ранги получены из самих игр.',
  demo: 'Демо-прогресс: игры ещё не присылают данные на этот сервер.',
  none: 'Игры пока не прислали ваш прогресс. Ранги откроются, когда придут данные.',
}

function renderWatch() {
  const el = slot('watch')
  el.hidden = S.mode !== 'watch'
  if (el.hidden) return
  if (!S.wallet || !S.player) {
    setHTML(el, `
      <div class="cz-ph"><div><h2>Вахта операторов</h2><p>Игроки студии помогают следить за системой</p></div></div>
      <p class="cz-text">Операторы разбирают аномалии и голосуют за безопасные действия. Доступ не покупается: он открывается часами и рангом в играх студии. Голосовать по аномалии планеты можно только при прогрессе в этой игре.</p>
      ${refLandingBlock()}
      ${walletLoginBlock()}
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
    <div class="cz-role ${esc(role.id)}">${roleBadge(role.id || 'guest', 'big')}<span>Ваш ранг</span><b>${esc(ROLE_TEXT[role.id] || role.name || 'Гость')}</b></div>
    <div class="cz-metrics three">
      <div class="cz-metric-ico">${icon('score')}<span>Репутация</span><b>${fmt(p.reputation) ?? 0}</b></div>
      <div><span>Точность</span><b class="${acc == null ? 'na' : ''}">${acc == null ? 'нет решений' : `${acc}%`}</b></div>
      <div><span>Стейкинг</span><b>${p.staking ? `${p.staking} SOL` : 'нет'}</b></div>
    </div>
    ${nextStepBlock(p, role)}
    <h3>${icon('planets')}Допуск к планетам</h3>
    <div class="cz-list">${planets.map((b) => {
      const g = p.gameProgress?.[b.id] || { hours: 0, rank: 0 }
      const ok = p.clearance?.[b.id] || role.id === 'staff'
      const src = (p.progressSources || []).find((x) => x.game === b.id)
      const linked = src && (src.push || src.pull)
      return `<div class="cz-row static">${thumb(b)}<span><b>${esc(b.name)}</b><small>${g.hours} ч в игре · ${g.rank ? `ранг ${g.rank}` : 'ранга нет'}${p.progressSource !== 'demo' && src && !linked ? ' · игра ещё не подключена к вахте' : ''}</small></span><em class="cz-clear ${ok ? 'ok' : ''}">${ok ? 'допуск есть' : 'нет допуска'}</em></div>`
    }).join('')}</div>
    <p class="cz-note">${esc(PROGRESS_SOURCE_TEXT[p.progressSource] || PROGRESS_SOURCE_TEXT.none)}</p>
    <p class="cz-note">Допуск даётся от ${op?.clearanceRule?.minHours ?? 10} часов и ранга в игре. Обсерваторию могут разбирать все, у кого есть право голоса.</p>
    <h3>${icon('anomaly')}Аномалии на вахте</h3>
    ${allAnomalies().length ? `<div class="cz-list">${allAnomalies().map(anomalyRow).join('')}</div>` : '<p class="cz-empty">Открытых аномалий нет.</p>'}
    ${partnerBlock()}
    ${partnerStaffBlock()}
    <h3>${icon('operators')}Лучшие операторы</h3>
    ${op?.leaderboard?.length ? `<ol class="cz-board">${op.leaderboard.slice(0, 8).map((x) => `<li>${roleBadge(x.role, 'mini')}<span>${esc(x.wallet)}</span><small>${esc(ROLE_TEXT[x.role] || '')}</small><b>${fmt(x.reputation)}</b></li>`).join('')}</ol>` : '<p class="cz-empty">Пока пусто.</p>'}
    ${rolesBlock(role.id || 'guest')}`)
}

function refLandingBlock() {
  if (!storedRef()) return ''
  return `<div class="cz-callout info"><b>Вас пригласили в игры студии</b><span>Выберите планету на карте и откройте сайт игры — приглашение передастся само. Если войдёте на вахту новым кошельком, приглашение засчитается и здесь. Платить ничего не нужно.</span></div>`
}

const PARTNER_KIND_TEXT = { player: 'Игрок', creator: 'Автор видео', traffic: 'Партнёр по трафику' }
const PARTNER_STATUS_TEXT = { pending: 'заявка на рассмотрении', active: 'работает', rejected: 'заявка отклонена', banned: 'заблокирован' }
const GRANT_STATE_TEXT = { manual: 'выдать вручную', undelivered: 'игра не ответила', rejected: 'игра отказала' }
const GAME_NAME = { ares1: 'ARES-1', aof: 'NeuroForge', guttercaps: 'GUTTERCAPS', neonrelay: 'Neon Relay' }
const itemRu = (it) => it?.name?.ru || it?.name?.en || it?.id
function bundleRu(b) {
  const parts = []
  if (b?.tokens) parts.push(`${fmt(b.tokens.amount)} ${b.tokens.symbol}`)
  for (const it of b?.items || []) parts.push(`${it.amount} × ${itemRu(it)}`)
  return parts.join(' + ') || 'ничего'
}

/** Кабинет партнёра живёт на портале (7 языков); здесь — короткая сводка и ссылка. */
function partnerBlock() {
  const c = S.partners
  if (!c) return ''
  const p = c.partner
  const portal = `/partners.html?lang=ru`
  const line = p
    ? `${PARTNER_KIND_TEXT[p.kind]}: ${PARTNER_STATUS_TEXT[p.status]}. Приглашено ${fmt(c.summary.invited)}, награду получили за ${fmt(c.summary.granted)}.`
    : 'Приводите новичков в игры студии и получайте награды в игре: токены, предметы и косметику. Награда — за игроков, которые остались, а не за клики.'
  return `<h3>${icon('operators')}Партнёрам</h3>
    <div class="cz-callout info"><b>Партнёрская программа</b><span>${esc(line)}</span>
    <a class="cz-btn small" href="${portal}">${p ? 'Открыть кабинет партнёра' : 'Узнать условия и вступить'}</a></div>`
}

/** Причина недоставки выдачи — словами, без кодов. */
function grantErrorRu(code) {
  const http = /^http_(\d{3})$/.exec(code)
  if (http) return `игра ответила ошибкой (код ответа ${http[1]})`
  return { timeout: 'игра не ответила за 5 секунд', network: 'нет связи с сервером игры', bad_response: 'игра прислала непонятный ответ', not_connected: 'выдача в этой игре не подключена' }[code] || 'игра не приняла выдачу'
}

function partnerStaffBlock() {
  const v = S.partnerReview
  if (!v) return ''
  const where = (p) => `${p.country}${p.seenCountry && p.seenCountry !== p.country ? ` (по сети: ${p.seenCountry})` : ''}`
  const row = (p, buttons) => `<div class="cz-row static"><span><b>${esc(PARTNER_KIND_TEXT[p.kind])} · ${esc(p.code)} · ${esc(where(p))}</b><small>${esc(p.channel || 'без канала')} · награды в ${esc(GAME_NAME[p.rewardGame] || p.rewardGame)} · ${esc(p.wallet)}${p.review ? ` · на проверке: ${esc(p.review.reason === 'daily_cap' ? 'всплеск квалификаций' : p.review.reason)}` : ''}</small></span>${buttons}</div>`
  const btn = (action, code, label, primary) => `<button class="cz-btn small ${primary ? 'primary' : ''}" data-act="partner-decide" data-action="${action}" data-code="${esc(code)}">${label}</button>`
  const grant = (g) => `<form class="cz-login" data-act="partner-granted" data-grant="${esc(g.id)}">
      <label>${esc(GRANT_STATE_TEXT[g.state] || g.state)} · ${esc(GAME_NAME[g.game] || g.game)} · ${esc(g.type === 'milestone' ? `веха ${g.milestone}` : 'за игрока')} · ${esc(g.code)}
        <small class="cz-note">${esc(bundleRu(g))} на кошелёк ${esc(g.wallet)}${g.lastError ? ` · ${esc(grantErrorRu(g.lastError))}` : ''}${g.detail ? ` · ответ игры: ${esc(g.detail)}` : ''}</small>
        <input name="reference" required minlength="4" maxlength="140" placeholder="где выдано: транзакция или номер операции" /></label>
      <span class="cz-btn-row"><button class="cz-btn small primary" type="submit">Отметить выдачу</button>${g.autoGrant && g.state !== 'manual' ? `<button class="cz-btn small" type="button" data-act="partner-retry" data-grant="${esc(g.id)}">Отправить игре снова</button>` : ''}</span></form>`
  return `<h3>${icon('operators')}Партнёры: решения студии</h3>
    <p class="cz-note">Активных партнёров: ${fmt(v.totals.partners)}, приглашений: ${fmt(v.totals.referrals)}, наград выдано: ${fmt(v.totals.granted)}, в отправке: ${fmt(v.totals.inFlight)}. Вахта ничего не чеканит и не переводит: награды выдают игры.</p>
    ${v.applications.length ? `<div class="cz-list">${v.applications.map((p) => row(p, btn('approve', p.code, 'Одобрить', true) + btn('reject', p.code, 'Отклонить'))).join('')}</div>` : '<p class="cz-empty">Новых заявок нет.</p>'}
    ${v.underReview.length ? `<div class="cz-list">${v.underReview.map((p) => row(p, btn('clear', p.code, 'Снять проверку', true) + btn('ban', p.code, 'Заблокировать'))).join('')}</div>` : ''}
    ${v.grants.length ? `<p class="cz-note">Выдачи, которые ждут человека: ${fmt(v.grants.length)}.</p>${v.grants.slice(0, 20).map(grant).join('')}` : ''}`
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

const LADDER = [
  ['guest', 'смотрит карту'],
  ['candidate', 'от 10 часов в одной игре, учится в тренажёре'],
  ['observer', 'ранг в одной игре и сданная проверка правил: голосует за безопасные действия'],
  ['operator', 'ранги в двух играх, репутация 100, точность от 75%: действия среднего риска'],
  ['senior', 'ранги в трёх играх, 60 дней вахты, точность от 85%: все уровни риска и право вето'],
  ['guardian', 'ранги во всех четырёх играх, 180 дней, точность от 90%'],
]
function rolesBlock(current = 'guest') {
  const idx = LADDER.findIndex(([id]) => id === current)
  return `<h3>${icon('operators')}Лестница рангов</h3>
    <ol class="cz-ladder">${LADDER.map(([id, req], i) => `<li class="${i < idx ? 'passed' : ''} ${i === idx ? 'current' : ''}">${roleBadge(id)}<span><b>${esc(ROLE_TEXT[id])}${i === idx ? '<em>вы здесь</em>' : ''}</b><small>${esc(req)}</small></span></li>`).join('')}</ol>
    <p class="cz-note">Ранги открываются только временем и успехами в играх студии. Купить ранг нельзя.</p>
    <details class="cz-details"><summary>Как устроена защита</summary>
    <ul>
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
      <div class="cz-dialog-hero">${icon('time', 'hero')}<h2 id="tr-title">Тренажёр оператора</h2></div>
      ${levelCard(levelFor(save.xp))}
      ${levelPath(save.xp)}
      ${dailyCard(save)}
      <h3>${icon('time')}Свободная смена</h3>
      <p class="cz-text">Смена на учебной копии системы. Аномалии взяты из механик самих игр, а ответы — ровно те действия, что есть у вахты в бою. После каждого решения разбор: почему верно или нет.</p>
      <ul class="cz-rules">
        <li>Действия тратят энергию обсерватории, она восстанавливается со временем.</li>
        <li>Проверка телеметрии стоит 1 энергию и даёт подсказку. Верное решение после проверки приносит бонус.</li>
        <li>Пока аномалия открыта, стабильность планеты падает. Потеряете две планеты или всё доверие игроков — смена провалена.</li>
        <li>Бортовой ИИ подсказывает, но на сложных сменах иногда ошибается.</li>
      </ul>
      <div class="cz-diffs">${DIFFICULTIES.map((d) => `
        <button class="cz-diff ${S.difficulty === d.id ? 'active' : ''}" data-act="diff" data-id="${d.id}">
          <b>${esc(d.name)}</b><span>${esc(d.about)}</span><small>${d.minutes} мин${save.best[d.id] ? ` · рекорд ${save.best[d.id]}` : ''}</small>${stars(save.stars?.[d.id] || 0)}</button>`).join('')}</div>
      <h3>${icon('trust')}Достижения <small>${save.achievements.length} из ${ACHIEVEMENTS.length}</small></h3>
      ${achGrid(save.achievements)}
      <div class="cz-actions"><button class="cz-btn primary" data-act="start-training">Начать смену</button><button class="cz-btn" data-act="mode" data-mode="map">На карту</button></div>
      <p class="cz-note">Сыграно смен: ${save.runs}, успешных: ${save.wins}. Результаты хранятся только в этом браузере и не влияют на ранг на вахте.</p>
    </div>`)
}

function startDaily() {
  const ch = dailyChallenge()
  return startTraining({ daily: ch, difficultyId: ch.difficultyId })
}

function startTraining(opts = {}) {
  if (!opts.daily) localStorage.setItem('wt-cosmos-diff', S.difficulty)
  S.sim = createTraining(opts.difficultyId || S.difficulty, opts.daily ? { daily: opts.daily } : {})
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
      <div class="cz-dialog-hero ${s.won ? 'won' : 'lost'}">${icon(s.won ? 'score' : 'anomaly', 'hero')}<div><h2>${s.won ? 'Смена завершена' : 'Смена провалена'}</h2>${stars(s.summary?.stars || 0, 'big')}</div></div>
      <p class="cz-text">${s.won ? 'Система пережила смену. Посмотрите разбор последних решений.' : 'Слишком много потерь. Разберите ошибки и попробуйте ещё раз.'}</p>
      <div class="cz-metrics three">
        <div class="cz-metric-ico">${icon('score')}<span>Очки</span><b>${Math.round(s.score)}</b></div>
        <div><span>Верных решений</span><b>${s.correct} из ${s.resolved}</b></div>
        <div><span>Неверных советов ИИ принято</span><b>${s.followedBadAdvice}</b></div>
      </div>
      ${dailyResultBlock(s.summary?.daily)}
      ${s.summary ? `<h3>${icon('score')}Цели смены</h3>${goalsList(s.summary.goals)}${!s.won ? '<p class="cz-note">Звёзды начисляются только за пережитую смену.</p>' : ''}
      <h3>${icon('time')}Опыт курсанта</h3>${levelCard(s.summary.after, s.summary.xpGain, s.summary.after.level > s.summary.before.level)}
      ${s.summary.newAchievements.length ? `<h3>${icon('trust')}Новые достижения</h3>${achGrid(s.summary.newAchievements.map((a) => a.id), s.summary.newAchievements.map((a) => a.id), true)}` : ''}` : ''}
      ${history.length ? `<h3>Последние решения</h3><div class="cz-list">${history.map((h) => `<div class="cz-row static"><span><b>${esc(h.title)}</b><small>${esc(q[h.quality])} — ${esc(h.explain)}</small></span></div>`).join('')}</div>` : ''}
      <div class="cz-actions"><button class="cz-btn primary" data-act="${s.daily ? 'start-daily' : 'start-training'}">Ещё раз</button><button class="cz-btn" data-act="training-menu">${s.daily ? 'В меню тренажёра' : 'Сменить сложность'}</button><button class="cz-btn" data-act="mode" data-mode="map">На карту</button></div>
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
  S.closeup = null; S.object = null
  if (mode === 'training') { S.surface = null; S.region = null; S.selected = null; openTrainingMenu() }
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
  if (act === 'leave-surface') { S.surface = null; S.region = null; S.closeup = null; S.object = null; return render() }
  if (act === 'region') { S.region = id; S.anomalyId = null; S.object = null; return render() }
  if (act === 'closeup') { S.closeup = id; S.region = id; S.object = null; S.anomalyId = null; return render() }
  if (act === 'leave-closeup') { S.closeup = null; S.object = null; return render() }
  if (act === 'object' && S.surface && S.closeup) {
    S.object = id; S.anomalyId = null; S.lastResult = null
    const res = discover(codexKey(S.surface, S.closeup, id))
    if (res.isNew) {
      const codex = loadCodex()
      const b = bodyById(S.surface)
      const cu = closeupFor(S.surface, S.closeup)
      const regionDone = cu.objects.every((o) => codex.has(codexKey(S.surface, S.closeup, o.id)))
      const worldDone = b.regions.every((r) => { const c = closeupFor(b.id, r.id); return !c || c.objects.every((o) => codex.has(codexKey(b.id, r.id, o.id))) })
      if (res.count === res.total) toast(`Кодекс собран полностью: ${res.total} из ${res.total}. Вы знаете систему лучше всех.`, 'good')
      else if (regionDone && worldDone) toast(`${b.name} изучен полностью · кодекс ${res.count} из ${res.total}`, 'good')
      else if (regionDone) toast(`Район «${cu.title}» осмотрен полностью · кодекс ${res.count} из ${res.total}`, 'good')
      else toast(`Новая запись в кодексе · ${res.count} из ${res.total}`, 'good')
    }
    return render()
  }
  if (act === 'codex') return openCodex()
  if (act === 'goto-closeup') {
    const keep = t.dataset.keep === '1'
    if (S.examOpen) closeModal()
    S.surface = t.dataset.body; S.selected = t.dataset.body; S.region = t.dataset.region; S.closeup = t.dataset.region; S.object = null
    if (!keep) { S.anomalyId = null; S.lastResult = null }
    engine.select(S.surface)
    return render()
  }
  if (act === 'anomaly') {
    const a = findAnomaly(id)
    S.anomalyId = id; S.lastResult = null
    if (a) { S.selected = a.bodyId; engine.select(a.bodyId) }
    return render()
  }
  if (act === 'panel-back') {
    if (S.anomalyId) { S.anomalyId = null; S.lastResult = null }
    else if (S.object) S.object = null
    else if (S.closeup) S.closeup = null
    else if (S.region) S.region = null
    else { S.selected = null; engine.select(null) }
    return render()
  }
  if (act === 'close-banner') { S.bannerClosed = true; return render() }
  if (act === 'diff') { S.difficulty = id; return openTrainingMenu() }
  if (act === 'start-training') return startTraining()
  if (act === 'start-daily') return startDaily()
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
    if (r.streak === 3) toast('Серия из трёх верных решений: множитель ×1.5', 'good')
    else if (r.streak === 6) toast('Серия из шести: множитель ×2', 'good')
    engine.setWorld(S.sim.world())
    return render()
  }
  if (act === 'vote') {
    try {
      await operatorApi.vote(id, t.dataset.action)
      toast('Голос учтён', 'good')
    } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'approve') {
    try {
      await operatorApi.approve(id, t.dataset.ok === '1')
      toast(t.dataset.ok === '1' ? 'Решение подтверждено' : 'Решение отклонено', 'good')
    } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'cancel-action') {
    try {
      await operatorApi.cancel(id)
      toast('Решение отменено, ничего не исполнено', 'good')
    } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'resolve') {
    const result = t.dataset.result
    try {
      await operatorApi.resolve(id, result)
      toast({ executed: 'Отмечено: выполнено', failed: 'Отмечено: не удалось', retry: 'Решение отправлено исполнителю снова' }[result] || 'Готово', 'good')
    } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'exam') return openExam()
  if (act === 'partner-retry') {
    try { await partnerApi.decide({ action: 'retry', grantId: t.dataset.grant }); toast('Выдача снова отправлена игре', 'good') } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'partner-decide') {
    const action = t.dataset.action
    if (action === 'ban' && !confirm('Заблокировать партнёра? Все невыданные награды будут отменены.')) return
    try { await partnerApi.decide({ action, code: t.dataset.code, reason: action === 'ban' ? 'решение студии' : undefined }); toast('Решение записано', 'good') } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  if (act === 'close-modal') return closeModal()
  if (act === 'logout') {
    S.wallet = null; S.player = null
    operatorSession.clear()
    return refreshLive()
  }
  if (act === 'wallet-login') {
    const w = detectWallets().find((x) => x.id === id)
    if (!w) return toast('Кошелёк не найден. Обновите страницу', 'bad')
    S.busy = true; render()
    try {
      const res = await signInWithWallet(w.provider, operatorApi)
      S.wallet = res.player?.wallet; S.player = res.player
      toast(`Вы на вахте: ${ROLE_TEXT[res.player?.role?.id] || 'Гость'}`, 'good')
    } catch (err) {
      const rejected = err?.code === 4001 || /reject|denied|отклон/i.test(String(err?.message))
      toast(rejected ? 'Подпись отменена в кошельке' : `Не удалось войти: ${friendlyError(err)}`, 'bad')
    }
    S.busy = false
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
      const res = await operatorApi.submitExam(answers)
      if (res.player) S.player = res.player
      closeModal()
      toast(res.passed ? `Проверка сдана: ${res.correct} из ${res.total}. Ваш ранг: ${ROLE_TEXT[res.player?.role?.id] || 'Гость'}` : `Верно ${res.correct} из ${res.total}. Повторить можно через 10 минут.`, res.passed ? 'good' : 'bad')
    } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
    return refreshLive()
  }
  const granted = e.target.closest('[data-act="partner-granted"]')
  if (granted) {
    e.preventDefault()
    try { await partnerApi.decide({ action: 'granted', grantId: granted.dataset.grant, reference: new FormData(granted).get('reference') }); toast('Выдача отмечена', 'good') } catch (err) { sessionLost(err); toast(friendlyError(err), 'bad') }
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
    S.wallet = res.player?.wallet || wallet.toLowerCase()
    S.player = res.player
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
  else if (S.object) S.object = null
  else if (S.closeup) S.closeup = null
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
// Отсчёт времени на отмену подтверждённого решения
setInterval(() => {
  document.querySelectorAll('[data-until]').forEach((n) => { n.textContent = mmss(Math.max(0, (Number(n.dataset.until) - Date.now()) / 1000)) })
}, 1000)

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

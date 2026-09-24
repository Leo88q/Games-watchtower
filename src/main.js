import './styles.css'
import './metrics.css'
import './investor.css'
import './funnels.css'
import './adjacent.css'
import './investor-history.css'
import './traffic.css'
import './os.css'
import './os/styles.css'
import { fetchOS, renderOSPanel } from './os/index.js'
import { CONTROL_PANELS, renderControlPanels } from './os/control-panels-v3.js'

/**
 * Тёмный дашборд — представление живого read-model.
 *
 * Правила:
 *  - ни одного числа, выдуманного на клиенте: всё приходит из /api/read-model;
 *  - если значения нет — показывается «—» и статус (partial/unavailable), а не ноль и не зелёный;
 *  - данные API экранируются (esc) перед вставкой в DOM.
 */

const DASH = '—'

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
const num = (value) => (value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value))
const fmtInt = (value) => { const n = num(value); return n === null ? DASH : Math.round(n).toLocaleString('ru-RU') }
const fmtUsd = (value) => { const n = num(value); return n === null ? DASH : `$${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}` }
const fmtPct = (value, digits = 1) => { const n = num(value); return n === null ? DASH : `${n.toFixed(digits)}%` }
const qualityLabel = (quality) => ({ complete: 'полные', partial: 'частичные', unavailable: 'нет данных', limited: 'ограниченные' }[quality] || quality || 'нет данных')

const icons = {
  overview: '<svg viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>',
  games: '<svg viewBox="0 0 24 24"><path d="M8.5 7h7l1.5-2h2l2 12h-4l-2-3H9l-2 3H3L5 5h2l1.5 2ZM7 10H5m1-1v2m9 0h.01M18 10h.01"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20m6-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm5-6.5a3 3 0 0 1 0 5.8M18 15a3.5 3.5 0 0 1 2 3.2V20"/></svg>',
  economy: '<svg viewBox="0 0 24 24"><path d="M12 3v18m4-14.5c-.7-.9-1.9-1.5-3.5-1.5h-1a3 3 0 0 0 0 6h1a3 3 0 0 1 0 6h-1c-1.6 0-2.8-.6-3.5-1.5M5 19h14"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="m12 3 7 3v5c0 4.7-3 8.4-7 10-4-1.6-7-5.3-7-10V6l7-3Zm-3 8 2 2 4-4"/></svg>',
  bot: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1-1.8 3.1-.2-.1a3.3 3.3 0 0 0-3.2 0l-.2.1-1.8-3.1.1-.1a3.3 3.3 0 0 0 0-3l-.1-.1 1.8-3.1.2.1a3.3 3.3 0 0 0 3.2 0l.2-.1 1.8 3.1-.1.1a3.3 3.3 0 0 0 0 3ZM4.6 15l-.1.1 1.8 3.1.2-.1a3.3 3.3 0 0 1 3.2 0l.2.1 1.8-3.1-.1-.1a3.3 3.3 0 0 1 0-3l.1-.1-1.8-3.1-.2.1a3.3 3.3 0 0 1-3.2 0l-.2-.1-1.8 3.1.1.1a3.3 3.3 0 0 1 0 3Z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
}

function navItem(icon, label, active = false, badge = '') {
  return `<button class="nav-item ${active ? 'active' : ''}" data-view="${esc(label)}">${icons[icon]}<span>${esc(label)}</span>${badge ? `<b>${esc(badge)}</b>` : ''}</button>`
}

const state = { model: null, error: null }

function app() {
  document.querySelector('#app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-icon">W</span><span>watchtower</span><em>PRO</em></div>
        <div class="workspace"><span class="workspace-avatar">L</span><div><small>Рабочее пространство</small><strong>Leo Games Studio</strong></div><span class="chevron">⌄</span></div>
        <nav class="main-nav">
          <div class="nav-label">WORKSPACE</div>
          ${navItem('overview', 'Обзор', true)}
          ${navItem('games', 'Мои игры')}
          ${navItem('users', 'Игроки')}
          ${navItem('economy', 'Экономика')}
          <div class="nav-label second">INTELLIGENCE</div>
          ${navItem('bot', 'AI аналитик')}
          ${navItem('shield', 'Безопасность')}
          ${navItem('search', 'Трафик')}
          ${navItem('bot', 'OS v3')}
          ${navItem('settings', 'Настройки')}
          <div class="nav-label second">ДЛЯ КОМАНДЫ</div>
          ${navItem('economy', 'Инвесторы')}
          ${navItem('users', 'Связи игроков')}
          ${navItem('games', 'Воронки')}
          ${navItem('bot', 'Смежная аналитика')}
        </nav>
        <div class="sidebar-bottom"><div class="help-card"><span class="help-icon">?</span><div><strong>Нужна помощь?</strong><small>docs/OPERATIONS.md</small></div>${icons.arrow}</div><div class="profile"><span class="profile-avatar">LK</span><div><strong>Леонид К.</strong><small>Владелец</small></div><span class="dots">•••</span></div></div>
      </aside>
      <main class="main-content">
        <header class="topbar"><div class="breadcrumb"><span>Workspace</span><b>/</b><strong>Обзор</strong></div><div class="top-actions"><button class="date-btn" id="data-source-btn">${icons.economy} <span id="data-source">Источник: загрузка…</span></button><button class="circle-btn" aria-label="Уведомления">${icons.bell}<i></i></button><span class="top-avatar">LK</span></div></header>
        <section class="page-heading"><div><p class="eyebrow" id="freshness">СОСТОЯНИЕ ДАННЫХ: ЗАГРУЗКА</p><h1>Экосистема студии</h1><p class="subtitle">Каждое число здесь приходит из API и сопровождается статусом качества данных.</p></div><button class="primary-btn" id="refresh-btn">↻ <span>Обновить данные</span></button></section>
        <div class="alert-banner" id="alert-banner" hidden><span class="alert-symbol">!</span><div><strong id="alert-title">—</strong><span id="alert-detail"></span></div><button class="close-alert" id="close-alert">×</button></div>
        <section class="metrics-grid">
          <article class="metric-card"><div class="metric-head"><span>Активные игроки (окно)</span><span class="metric-icon green">${icons.users}</span></div><div class="metric-value" id="kpi-players">${DASH}</div><small id="kpi-players-note">события event-inbox</small></article>
          <article class="metric-card"><div class="metric-head"><span>Выпущено токенов</span><span class="metric-icon purple">${icons.economy}</span></div><div class="metric-value" id="kpi-minted">${DASH}</div><small id="kpi-minted-note">сумма событий mint</small></article>
          <article class="metric-card"><div class="metric-head"><span>Сожжено токенов</span><span class="metric-icon orange">${icons.games}</span></div><div class="metric-value" id="kpi-burned">${DASH}</div><small id="kpi-burned-note">сумма событий burn</small></article>
          <article class="metric-card"><div class="metric-head"><span>Критические сигналы</span><span class="metric-icon red">${icons.shield}</span></div><div class="metric-value" id="kpi-alerts">${DASH}</div><small id="kpi-alerts-note">из /api/alerts</small></article>
        </section>
        <section class="content-grid">
          <article class="panel performance">
            <div class="panel-head"><div><h2>Состояние игр</h2><p>Данные каждой игры по отдельности, без усреднения отсутствующих</p></div></div>
            <div class="game-table" id="games-table"><div class="table-labels"><span>ИГРА</span><span>ИГРОКИ</span><span>ВЫПУСК</span><span>СТАТУС</span></div><div class="game-row"><div class="game-name"><strong>Загрузка…</strong></div></div></div>
          </article>
          <article class="panel ai-panel">
            <div class="ai-title"><span class="ai-orb">✦</span><div><h2>AI аналитик</h2><p id="ai-updated">Ожидание данных</p></div><span class="live-dot">LIVE</span></div>
            <div class="ai-score"><div class="score-ring"><strong id="ai-score">${DASH}</strong><small>/ 100</small></div><div><strong>Надёжность данных</strong><p id="ai-reliability">—</p></div></div>
            <div class="ai-divider"></div>
            <div id="ai-conclusions"><div class="ai-insight"><span class="insight-icon">!</span><div><strong>Данные ещё не загружены</strong><p>Выводы появятся после ответа /api/ai/report.</p></div></div></div>
            <button class="full-analysis" data-view="AI аналитик">Открыть полный анализ ${icons.arrow}</button>
          </article>
        </section>
        <section class="expanded-grid">
          <article class="panel detail-table"><div class="panel-head"><div><h2>Потоки экономики</h2><p>Источники, стоки, боты и качество данных окна</p></div></div><div class="quick-metrics" id="economy-quick"></div></article>
          <article class="panel detail-table"><div class="panel-head"><div><h2>Сбор данных</h2><p>Сколько событий реально принято и когда</p></div></div><div class="quick-metrics" id="ingestion-quick"></div></article>
        </section>
        <section class="panel control-panel"><div class="panel-head"><div><h2>Центр управления</h2><p>Безопасные запросы без прямой записи в блокчейн</p></div><span class="status-pill watch"><i></i>Записей в блокчейн: нет</span></div><div class="control-grid"><button class="control-btn" data-control="sync">↻ <strong>Запросить обновление</strong><small>Обновить данные игры и индексатора</small></button><button class="control-btn" data-control="reconcile">✓ <strong>Запросить сверку</strong><small>Сравнить подтверждённые и финальные данные</small></button><button class="control-btn" data-control="pause">Ⅱ <strong>Подготовить паузу</strong><small>Только через цепочку согласований</small></button><button class="control-btn" data-control="review">⚑ <strong>Отправить на проверку</strong><small>Создать задачу оператору</small></button></div></section>
        <section id="adjacent-analytics-section" class="panel adjacent-panel"><div class="panel-head"><div><h2>Смежная аналитика</h2><p>Показатели, рассчитанные только по принятым событиям</p></div><button class="select-btn" id="refresh-adjacent">Обновить</button></div><div class="adjacent-grid" id="adjacent-grid">
          <article><span>Вовлечённость</span><b>${DASH}</b><small>активных игроков</small></article>
          <article><span>Монетизация</span><b>${DASH}</b><small>оборот на активного игрока</small></article>
          <article><span>Устойчивость экономики</span><b>${DASH}</b><small>сжигание к выпуску</small></article>
          <article><span>Надёжность</span><b>${DASH}</b><small>игры с данными</small></article>
          <article><span>Риск и доверие</span><b>${DASH}</b><small>критических сигналов</small></article>
          <article><span>Качество данных</span><b>${DASH}</b><small id="adjacent-quality-note">—</small></article>
        </div></section>
        <section id="funnels-section" class="panel funnel-panel"><div class="panel-head"><div><h2>Воронки</h2><p>Этапы из событий; отсутствующие этапы помечены как «нет данных»</p></div></div><div class="funnel-layout"><div class="funnel-steps" id="funnel-steps"><div class="funnel-step"><span>1</span><div><strong>Нет данных</strong><small>ожидание событий</small></div><b>${DASH}</b></div></div></div></section>
        <section id="investors-section" class="panel investor-panel"><div class="panel-head"><div><h2>Страница для инвесторов</h2><p>Только агрегаты из event-inbox; персональных данных нет</p></div><button class="primary-btn" data-snapshot="true">Сохранить снимок отчёта</button></div><div class="investor-grid" id="investor-grid">
          <div><span>Активные игроки</span><b>${DASH}</b><small>за окно</small></div>
          <div><span>Новые игроки</span><b>${DASH}</b><small>первое появление в окне</small></div>
          <div><span>Объём экономики</span><b>${DASH}</b><small>сделки и стоки</small></div>
          <div><span>Выпущено / сожжено</span><b>${DASH}</b><small>mint / burn</small></div>
          <div><span>Критические сигналы</span><b>${DASH}</b><small>из /api/alerts</small></div>
          <div><span>Качество данных</span><b>${DASH}</b><small id="investor-quality-note">—</small></div>
        </div><div class="investor-history"><div class="history-head"><strong>История отчётов</strong><span id="investor-trend-status">Загрузка сохранённых снимков…</span></div><div class="history-bars" id="investor-history-bars"></div><div class="history-labels"><span>старые</span><span>последний отчёт</span></div></div><div class="investor-note"><strong>Принцип отчётности:</strong> инвесторам отправляются только агрегированные показатели без персональных данных игроков; каждое число сопровождается периодом, источником и оценкой достоверности.</div></section>
        <section id="players-network-section" class="panel network-panel"><div class="panel-head"><div><h2>Связи игроков между играми</h2><p>Обезличенные группы по событиям нескольких игр</p></div></div><div class="cross-game-grid" id="cross-game-grid"><div><span>Групп с 1 игрой</span><b>${DASH}</b><small>—</small></div><div><span>Групп с 2 играми</span><b>${DASH}</b><small>—</small></div><div><span>Групп с 3+ играми</span><b>${DASH}</b><small>—</small></div></div></section>
        <section id="traffic-section" class="panel traffic-panel"><div class="panel-head"><div><h2>Трафик / Acquisition</h2><p>События off-chain приложений (trafficgen); хаб не управляет трафиком</p></div><button class="select-btn" id="refresh-traffic">Обновить</button></div><div class="adjacent-grid traffic-grid"><article><span>Просмотры страниц</span><b id="traffic-pageviews">${DASH}</b><small>события PageView</small></article><article><span>Сессии</span><b id="traffic-sessions">${DASH}</b><small>события SessionStarted</small></article><article><span>Уникальные посетители</span><b id="traffic-visitors">${DASH}</b><small>псевдонимные sessionId</small></article><article><span>Клики по CTA</span><b id="traffic-cta">${DASH}</b><small>промо-слоты</small></article><article><span>Дошли до игры</span><b id="traffic-landing">${DASH}</b><small>события LandingReached</small></article><article><span>Качество данных</span><b id="traffic-quality">${DASH}</b><small id="traffic-quality-note">адаптер ожидает событий</small></article></div><div class="funnel-steps traffic-funnel" id="traffic-funnel"></div><div class="traffic-meta"><div><span>Кампании</span><div class="chips" id="traffic-campaigns">${DASH}</div></div><div><span>Источники трафика</span><div class="chips" id="traffic-sources">${DASH}</div></div><div><span>Целевые страницы</span><div class="chips" id="traffic-pages">${DASH}</div></div><div><span>Тип трафика</span><div id="traffic-type">${DASH}</div><small>real / bot по событиям</small></div></div><div class="traffic-channels"><span>Каналы: источник → CTA → игра</span><table><thead><tr><th>Источник</th><th>Сессии</th><th>CTA</th><th>Дошли до игры</th><th>CTA / сессии</th><th>Игра / CTA</th></tr></thead><tbody id="traffic-channels"><tr><td colspan="6">${DASH}</td></tr></tbody></table><small>Переходы — только подтверждённые click-id. LTV по каналу недоступен: хаб не связывает клик с кошельком.</small></div><div class="traffic-status" id="traffic-status">Ожидание событий…</div></section>
        <section id="os-section" class="panel os-panel" style="margin-top:24px;"><div id="os-panel-container"><div class="panel-head"><div><h2>Watchtower OS v3 — панель управления</h2><p>Состав стека из studio.config.json и server/modules/os.js</p></div><span class="status-pill watch"><i></i><span id="os-summary-pill">загрузка…</span></span><button class="select-btn" id="refresh-os">Обновить</button></div><div id="os-panel-content" style="padding:12px; color:#8892b0;">Загрузка панели управления…</div><div id="os-panels-content"></div></div></section>
        <footer><span id="footer-status">Watchtower · read-only API</span><span id="footer-freshness">Данные: —</span></footer>
      </main>
    </div>
  `
  bindEvents()
  refresh()
}

function setText(selector, value) {
  const element = document.querySelector(selector)
  if (element) element.textContent = value === null || value === undefined || value === '' ? DASH : String(value)
}

function setPill(selector, quality) {
  const element = document.querySelector(selector)
  if (element) element.textContent = qualityLabel(quality)
}

async function refresh() {
  try {
    const response = await fetch('/api/read-model')
    if (response.status === 401) throw new Error('нужен токен чтения (WATCHTOWER_READ_TOKEN)')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const model = await response.json()
    state.model = model
    state.error = null
    renderModel(model)
  } catch (error) {
    state.error = error.message
    showBanner(`API недоступен: ${error.message}`, 'Значения не подставляются нулями — разделы помечены как «нет данных».')
    document.querySelector('.eyebrow').textContent = 'ДАННЫЕ НЕ ЗАГРУЖЕНЫ · API НЕДОСТУПЕН'
    setText('#footer-status', `Watchtower · API недоступен: ${error.message}`)
  }
}

function showBanner(title, detail) {
  const banner = document.querySelector('#alert-banner')
  if (!banner) return
  banner.hidden = false
  setText('#alert-title', title)
  setText('#alert-detail', detail)
}

function renderModel(model) {
  const overview = model.overview || {}
  const generatedAt = model.generatedAt ? new Date(model.generatedAt) : null
  const sourceLabel = model.demo ? 'DEMO DATA' : 'event-inbox'
  setText('#data-source', `Источник: ${sourceLabel}`)
  setText('#freshness', `ДАННЫЕ ОТ ${generatedAt ? generatedAt.toLocaleString('ru-RU') : '—'} · ИСТОЧНИК ${sourceLabel.toUpperCase()}`)
  setText('#footer-freshness', `Обновлено: ${generatedAt ? generatedAt.toLocaleTimeString('ru-RU') : '—'}`)
  setText('#footer-status', model.demo ? 'Watchtower · демо-данные (DEMO DATA)' : 'Watchtower · живые данные event-inbox')

  const criticals = (model.funnel?.dataQuality === 'unavailable') ? null : null
  setText('#kpi-players', fmtInt(overview.activePlayers))
  setText('#kpi-players-note', overview.activePlayers === null || overview.activePlayers === undefined ? 'нет данных за окно' : `за ${overview.windowDays || 7} дн. · источник event-inbox`)
  setText('#kpi-minted', fmtInt(overview.minted))
  setText('#kpi-minted-note', overview.minted === null || overview.minted === undefined ? 'событий mint не было' : 'сумма событий mint')
  setText('#kpi-burned', fmtInt(overview.burned))
  setText('#kpi-burned-note', overview.burned === null || overview.burned === undefined ? 'событий burn не было' : 'сумма событий burn')

  renderAlerts(model)
  renderGames(overview.games || [])
  renderAdjacent(model.adjacent)
  renderEconomyQuick(model)
  renderIngestion(model.ingestion, overview)
  renderFunnel(model.funnel)
  renderInvestor(model)
  renderCrossGame(model.crossGame)
  renderTraffic(model.traffic)
  loadAiReport()
  loadOSPanel()
  if (criticals === null) {
    /* критических сигналов из funnel не выводим — источник только /api/alerts */
  }
}

function renderAlerts(model) {
  const alerts = model.alerts || model.overview?.alerts || []
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical')
  setText('#kpi-alerts', fmtInt(alerts.length))
  setText('#kpi-alerts-note', alerts.length ? `${criticalAlerts.length} критических · ${alerts.length - criticalAlerts.length} высоких` : 'сигналов нет')
  if (alerts.length) {
    const first = criticalAlerts[0] || alerts[0]
    showBanner(`${first.title}`, `${first.gameId ? `${String(first.gameId).toUpperCase()} · ` : ''}${first.detail || ''}`)
  }
}

function renderGames(games) {
  const container = document.querySelector('#games-table')
  if (!container) return
  if (!games.length) {
    container.innerHTML = '<div class="table-labels"><span>ИГРА</span><span>ИГРОКИ</span><span>ВЫПУСК</span><span>СТАТУС</span></div><div class="game-row"><div class="game-name"><strong>Игры не подключены</strong><small>нет данных за окно</small></div></div>'
    return
  }
  container.innerHTML = `<div class="table-labels"><span>ИГРА</span><span>ИГРОКИ</span><span>ВЫПУСК</span><span>СТАТУС</span></div>` + games.map((game) => {
    const quality = game.health?.dataQuality || 'unavailable'
    const pillClass = quality === 'complete' ? 'healthy' : quality === 'partial' ? 'watch' : 'critical'
    return `<div class="game-row">
      <div class="game-name"><span class="game-mark" style="--game-color:#37e5a0">◆</span><div><strong>${esc(game.name)}</strong><small>${esc(game.id)} · ${esc(game.stage || '—')}</small></div></div>
      <div class="player-count"><strong>${fmtInt(game.players)}</strong><span>${game.health?.lastEventAt ? `последнее: ${new Date(game.health.lastEventAt).toLocaleString('ru-RU')}` : 'событий нет'}</span></div>
      <div><strong>${fmtInt(game.minted)}</strong> <small>/ ${fmtInt(game.burned)}</small></div>
      <div><span class="status-pill ${pillClass}"><i></i>${esc(qualityLabel(quality))}</span></div>
    </div>`
  }).join('')
}

function renderAdjacent(adjacent) {
  if (!adjacent) return
  const sections = adjacent.sections || {}
  const values = [
    fmtInt(sections.engagement?.metrics?.activePlayers),
    fmtUsd(sections.monetization?.metrics?.volumePerActivePlayer),
    sections.sustainability?.metrics?.burnToMintRatio === null || sections.sustainability?.metrics?.burnToMintRatio === undefined ? DASH : `${Math.round(sections.sustainability.metrics.burnToMintRatio * 100)}%`,
    `${fmtInt(sections.reliability?.metrics?.connectedGames)} / ${fmtInt(sections.reliability?.metrics?.totalGames)}`,
    fmtInt(sections.risk?.metrics?.criticalIncidents),
    qualityLabel(adjacent.dataQuality),
  ]
  document.querySelectorAll('#adjacent-grid article b').forEach((element, index) => { if (values[index] !== undefined) element.textContent = values[index] })
  setText('#adjacent-quality-note', adjacent.reason || `источник: ${adjacent.source || 'event-inbox'}`)
}

function renderEconomyQuick(model) {
  const container = document.querySelector('#economy-quick')
  if (!container) return
  const adjacent = model.adjacent?.sections || {}
  const rows = [
    ['Активные игроки', fmtInt(adjacent.engagement?.metrics?.activePlayers)],
    ['Новые игроки (доля)', adjacent.engagement?.metrics?.newPlayerShare === null ? DASH : fmtPct(adjacent.engagement?.metrics?.newPlayerShare)],
    ['Выпущено', fmtInt(adjacent.sustainability?.metrics?.minted)],
    ['Сожжено', fmtInt(adjacent.sustainability?.metrics?.burned)],
    ['Стоки к источникам', (() => {
      const metric = (model.economy?.metrics || []).find((item) => item.id === 'sink_source_ratio')
      return metric && metric.value !== null && metric.value !== undefined ? metric.value.toFixed(2) : DASH
    })()],
    ['Качество данных', qualityLabel(model.adjacent?.dataQuality)],
  ]
  container.innerHTML = rows.map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(model.adjacent?.source || 'event-inbox')}</small></div>`).join('')
}

function renderIngestion(ingestion, overview) {
  const container = document.querySelector('#ingestion-quick')
  if (!container) return
  const rows = [
    ['Событий в inbox', fmtInt(ingestion?.events)],
    ['Из них дубликатов', fmtInt(ingestion?.duplicates)],
    ['Отклонено валидацией', fmtInt(ingestion?.rejected)],
    ['Вытеснено retention', fmtInt((ingestion?.evictedByLimit || 0) + (ingestion?.evictedByTtl || 0))],
    ['Последнее событие', ingestion?.lastEventAt ? new Date(ingestion.lastEventAt).toLocaleString('ru-RU') : 'данных не было'],
    ['Событий в окне', fmtInt(overview?.eventsInWindow)],
  ]
  container.innerHTML = rows.map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(ingestion?.storage || '—')}</small></div>`).join('')
}

function renderFunnel(funnel) {
  const container = document.querySelector('#funnel-steps')
  if (!container || !funnel) return
  const stages = funnel.stages || []
  if (!stages.length) {
    container.innerHTML = '<div class="funnel-step"><span>1</span><div><strong>Нет данных</strong><small>события воронки не поступали</small></div><b>—</b></div>'
    return
  }
  container.innerHTML = stages.map((stage, index) => `<div class="funnel-step"><span>${index + 1}</span><div><strong>${esc(stage.label || stage.id || `Этап ${index + 1}`)}</strong><small>${fmtInt(stage.players)} игроков</small></div><b>${stage.conversionRate === null || stage.conversionRate === undefined ? DASH : `${(stage.conversionRate).toFixed(1)}%`}</b></div>`).join('')
}

function renderInvestor(model) {
  const investor = model.investor || {}
  const metrics = investor.metrics || {}
  const values = [
    fmtInt(metrics.activePlayers),
    fmtInt(metrics.newPlayers),
    fmtUsd(metrics.volume),
    `${fmtInt(metrics.minted)} / ${fmtInt(metrics.burned)}`,
    fmtInt(metrics.criticalIncidents),
    qualityLabel(metrics.dataQuality),
  ]
  document.querySelectorAll('#investor-grid > div b').forEach((element, index) => { if (values[index] !== undefined) element.textContent = values[index] })
  setText('#investor-quality-note', `источник: ${investor.source || 'event-inbox'} · период ${investor.period || '—'}`)
  const trend = model.investorTrend || { points: [] }
  setText('#investor-trend-status', trend.points?.length ? `${trend.points.length} сохранённых отчётов · качество ${qualityLabel(trend.dataQuality)}` : 'Сохранённых снимков нет')
  const bars = document.querySelector('#investor-history-bars')
  if (bars) {
    const points = trend.points || []
    const max = Math.max(1, ...points.map((point) => Number(point.activePlayers) || 0))
    bars.innerHTML = points.length
      ? points.map((point) => `<i style="height:${Math.max(8, Math.round((Number(point.activePlayers) || 0) / max * 100))}%" title="${esc(point.createdAt || '')}"></i>`).join('')
      : '<i style="height:8%"></i>'
  }
  renderEcosystemQuick()
}

async function renderEcosystemQuick() {
  try {
    const [investorResponse, ingestionResponse] = await Promise.all([fetch('/api/investors/report'), fetch('/api/ingestion/status')])
    if (investorResponse.ok) {
      const report = await investorResponse.json()
      setText('#investor-quality-note', `источник: ${report.source || 'event-inbox'} · период ${report.period || '—'}`)
    }
    if (ingestionResponse.ok) {
      const status = await ingestionResponse.json()
      setText('#ingestion-quick small:last-child', status.storage || '—')
    }
  } catch {
    /* сетевые сбои не превращаются в нули: значения остаются «—» */
  }
}

function renderCrossGame(crossGame) {
  const container = document.querySelector('#cross-game-grid')
  if (!container || !crossGame) return
  const counts = crossGame.counts || {}
  const values = [fmtInt(counts.oneGame), fmtInt(counts.twoGames), fmtInt(counts.threeOrMore)]
  container.querySelectorAll('b').forEach((element, index) => { if (values[index] !== undefined) element.textContent = values[index] })
  const note = container.querySelectorAll('small')
  if (note[0]) note[0].textContent = crossGame.privacy || 'обезличенные ключи'
  if (note[1]) note[1].textContent = `качество: ${qualityLabel(crossGame.dataQuality)}`
  if (note[2]) note[2].textContent = crossGame.generatedAt ? new Date(crossGame.generatedAt).toLocaleTimeString('ru-RU') : ''
}

function renderTraffic(traffic) {
  if (!traffic) return
  const totals = traffic.totals || {}
  const fmt = (value) => (value === null || value === undefined ? DASH : Number(value).toLocaleString('ru-RU'))
  setText('#traffic-pageviews', fmt(totals.pageViews))
  setText('#traffic-sessions', fmt(totals.sessions))
  setText('#traffic-visitors', fmt(totals.uniquePseudoVisitors))
  setText('#traffic-cta', fmt(totals.ctaClicks))
  setText('#traffic-landing', fmt(totals.landingReached))
  setText('#traffic-quality', qualityLabel(traffic.dataQuality))
  setText('#traffic-quality-note', traffic.reason || `dataQuality: ${traffic.dataQuality} · confidence ${traffic.confidence}`)
  const funnel = document.querySelector('#traffic-funnel')
  if (funnel) {
    funnel.innerHTML = (traffic.funnel || []).map((step, index) => `<div class="funnel-step"><span>${index + 1}</span><div><strong>${esc(step.label || step.id || `Этап ${index + 1}`)}</strong><small>${fmt(step.count)} событий</small></div><b>${step.conversionFromPrevious === null || step.conversionFromPrevious === undefined ? (index === 0 ? '100%' : DASH) : `${(step.conversionFromPrevious * 100).toFixed(1)}%`}</b></div>`).join('')
  }
  const chips = (selector, values) => {
    const element = document.querySelector(selector)
    if (!element) return
    element.innerHTML = values && values.length ? values.slice(0, 8).map((value) => `<span class="chip">${esc(value)}</span>`).join('') : DASH
  }
  const pct = (v) => (v === null || v === undefined ? DASH : `${(v * 100).toFixed(1)}%`)
  const channelsBody = document.querySelector('#traffic-channels')
  if (channelsBody) {
    const rows = traffic.channels || []
    channelsBody.innerHTML = rows.length
      ? rows.map((r) => `<tr${r.bot ? ' class="is-bot"' : ''}><td>${esc(r.sourceId)}${r.bot ? ' <small>bot</small>' : ''}</td><td>${fmt(r.sessions)}</td><td>${fmt(r.ctaClicks)}</td><td>${fmt(r.landingReached)}</td><td>${pct(r.ctaRate)}</td><td>${pct(r.landingRate)}</td></tr>`).join('')
      : `<tr><td colspan="6">${DASH}</td></tr>`
  }
  chips('#traffic-campaigns', traffic.campaigns)
  chips('#traffic-sources', traffic.sources)
  chips('#traffic-pages', traffic.pages)
  setText('#traffic-type', (totals.realEvents || totals.botEvents) ? `real ${fmt(totals.realEvents)} · bot ${fmt(totals.botEvents)}` : DASH)
  setText('#traffic-status', traffic.reason || `Событий в inbox: ${fmt(totals.events)} · read-only · ${traffic.generatedAt ? new Date(traffic.generatedAt).toLocaleTimeString('ru-RU') : '—'}`)
}

async function loadAiReport() {
  try {
    const response = await fetch('/api/ai/report')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const report = await response.json()
    setText('#ai-updated', `Обновлено ${report.generatedAt ? new Date(report.generatedAt).toLocaleTimeString('ru-RU') : '—'} · источник ${report.source || 'event-inbox'}`)
    setText('#ai-score', report.dataReliability === null || report.dataReliability === undefined ? DASH : Math.round(report.dataReliability * 100))
    setText('#ai-reliability', `${report.criticalCount} критических, ${report.highCount} высоких сигналов`)
    const container = document.querySelector('#ai-conclusions')
    if (container) {
      container.innerHTML = (report.conclusions || []).map((text, index) => `<div class="ai-insight${index ? ' warning' : ''}"><span class="insight-icon">${index ? '!' : '↗'}</span><div><strong>Вывод ${index + 1}</strong><p>${esc(text)}</p></div></div>`).join('') || '<div class="ai-insight"><span class="insight-icon">!</span><div><strong>Выводов нет</strong><p>События не поступали.</p></div></div>'
    }
  } catch (error) {
    setText('#ai-updated', `Не удалось получить /api/ai/report: ${error.message}`)
  }
}

let osPanelState = 'idle'

async function loadOSPanel({ force = false } = {}) {
  const container = document.querySelector('#os-panel-content')
  const panelsContainer = document.querySelector('#os-panels-content')
  if (!container && !panelsContainer) return
  if (osPanelState === 'loading') return
  if (osPanelState === 'loaded' && !force) return
  osPanelState = 'loading'
  try {
    const osData = await fetchOS()
    if (container && osData.config) {
      renderOSPanel(container, osData)
      setText('#os-summary-pill', `компонентов: ${osData.config.totalComponents ?? '—'}`)
    } else if (container) {
      container.innerHTML = '<p>OS API недоступен — запустите API сервер</p>'
      setText('#os-summary-pill', 'OS API недоступен')
    }
    if (panelsContainer) {
      if (osData.config) renderControlPanels(panelsContainer, osData)
      else panelsContainer.innerHTML = ''
    }
    osPanelState = 'loaded'
  } catch {
    if (container) container.innerHTML = '<p>Ошибка загрузки OS v3 панели</p>'
    osPanelState = 'idle'
  }
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === button.dataset.view))
  }))
  document.querySelectorAll('[data-control]').forEach((button) => button.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/control/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: button.dataset.control, reason: 'оператор из дашборда' }) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      showToast('Запрос создан: прямое изменение отключено до подтверждения.')
    } catch (error) {
      showToast(`Не удалось создать запрос: ${error.message}`)
    }
  }))
  document.querySelectorAll('[data-snapshot]').forEach((button) => button.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/investors/snapshots', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period: '7d UTC', createdBy: 'dashboard-operator' }) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      button.textContent = 'Снимок сохранён'
      showToast('Инвесторский отчёт сохранён')
      refresh()
    } catch (error) {
      showToast(`Не удалось сохранить снимок: ${error.message}`)
    }
  }))
  document.querySelector('#refresh-adjacent')?.addEventListener('click', async () => { await refresh(); showToast('Смежная аналитика обновлена из event-inbox') })
  document.querySelector('#refresh-traffic')?.addEventListener('click', async () => { await refresh(); showToast('Трафик-аналитика обновлена') })
  document.querySelector('#refresh-os')?.addEventListener('click', async (event) => {
    const button = event.currentTarget
    button.textContent = 'Обновляем…'
    await loadOSPanel({ force: true })
    button.textContent = 'Обновить'
    showToast('Панель OS v3 обновлена')
  })
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.view === 'Инвесторы' ? '#investors-section' : button.dataset.view === 'Связи игроков' ? '#players-network-section' : button.dataset.view === 'Воронки' ? '#funnels-section' : button.dataset.view === 'Смежная аналитика' ? '#adjacent-analytics-section' : button.dataset.view === 'Трафик' ? '#traffic-section' : button.dataset.view === 'OS v3' ? '#os-section' : null
    if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))
  document.querySelector('#refresh-btn').addEventListener('click', async (event) => {
    const button = event.currentTarget
    button.classList.add('loading')
    button.querySelector('span').textContent = 'Обновляем...'
    await refresh()
    button.classList.remove('loading')
    button.querySelector('span').textContent = 'Обновить данные'
    showToast('Данные перечитаны из API')
  })
  document.querySelector('#close-alert')?.addEventListener('click', (event) => { event.currentTarget.closest('.alert-banner').hidden = true })
}

function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  document.body.append(toast)
  setTimeout(() => toast.remove(), 2400)
}

app()

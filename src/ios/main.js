import './ios.css'
import { EXPLAIN, SECTIONS, GLOSSARY, DEPLOY_CHECKS } from './content.js'

// ---------------------------------------------------------------------------
// Один экран продукта: белый iOS-стиль, честные данные, интерактив.
// Все запросы — относительные (/api/...), их проксирует dev-сервер или раздаёт
// тот же Node-сервер, поэтому в браузер не попадают ни ключи, ни абсолютные адреса.
// ---------------------------------------------------------------------------

const state = {
  section: location.hash.replace('#', '') || 'overview',
  data: {},
  loading: true,
  query: '',
  theme: localStorage.getItem('wt-theme') || 'light',
  refreshedAt: null,
}

const api = async (path) => {
  const res = await fetch(path, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
}

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild }
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))

function qualityBadge(quality) {
  const map = { complete: ['complete', 'Полные данные'], partial: ['partial', 'Неполные данные'], unavailable: ['unavailable', 'Нет данных'] }
  const [cls, label] = map[quality] || ['neutral', quality || 'неизвестно']
  return `<span class="badge badge-${cls}">${esc(label)}</span>`
}
function levelBadge(level) {
  const cls = { L0: 'bad', L1: 'warn', L2: 'accent', L3: 'ok', L4: 'ok' }[level] || 'neutral'
  return `<span class="badge badge-${cls}">${esc(level)}</span>`
}
function badge(text, cls = 'neutral') { return `<span class="badge badge-${cls}">${esc(text)}</span>` }
function explainBlock(key) {
  const e = EXPLAIN[key]
  if (!e) return ''
  return `<div class="explain"><h4>${esc(e.title)}</h4><p><b>Что это.</b> ${esc(e.what)}</p><p><b>Как работает.</b> ${esc(e.how)}</p><p><b>Почему важно.</b> ${esc(e.why)}</p></div>`
}
function toast(message) {
  let el = document.querySelector('.toast')
  if (!el) { el = h('<div class="toast"></div>'); document.body.appendChild(el) }
  el.textContent = message
  el.classList.add('show')
  clearTimeout(el._timer)
  el._timer = setTimeout(() => el.classList.remove('show'), 2200)
}

// ---------------------------------------------------------------------------
// Данные
// ---------------------------------------------------------------------------
async function loadAll() {
  state.loading = true
  const targets = {
    health: '/api/health',
    ecosystem: '/api/ecosystem/status',
    report: '/api/ecosystem/report',
    adapters: '/api/ingestion/adapters',
    games: '/api/games',
    readModel: '/api/read-model',
    osConfig: '/api/os/config',
    prompts: '/api/arena/prompts',
    alerts: '/api/alerts',
    aiReport: '/api/ai/report',
    traffic: '/api/analytics/traffic',
    funnel: '/api/funnels',
    crossGame: '/api/players/cross-game',
    investor: '/api/investors/report',
    investorTrend: '/api/investors/trend',
    security: '/api/security/config',
    sessionKeys: '/api/session-keys/config',
    audit: '/api/audit',
    controlPolicy: '/api/control/policy',
    ingestion: '/api/ingestion/status',
  }
  const entries = await Promise.all(Object.entries(targets).map(async ([key, path]) => {
    try { return [key, { ok: true, value: await api(path) }] } catch (error) { return [key, { ok: false, error: error.message }] }
  }))
  state.data = Object.fromEntries(entries)
  state.loading = false
  state.refreshedAt = new Date()
}

const d = (key) => (state.data[key]?.ok ? state.data[key].value : null)
const provider = () => d('health')?.provider || 'unknown'
const isMock = () => provider() === 'mock'

// ---------------------------------------------------------------------------
// Секции
// ---------------------------------------------------------------------------
function sectionOverview() {
  const eco = d('ecosystem')
  const games = d('games')?.games || []
  const total = eco?.coverage?.tenants ?? 5
  const configured = eco?.coverage?.configured ?? 0
  const l3 = eco?.coverage?.l3plus ?? 0
  const critical = eco?.findingsTotal?.critical ?? 0
  const scansMissing = eco?.findingsTotal?.scansMissing || []

  const kpis = [
    { label: 'Подключено игр и приложений', value: `${configured} / ${total}`, quality: configured === 0 ? 'unavailable' : configured === total ? 'complete' : 'partial', note: 'Адаптер сконфигурирован (programId или адрес экспортера)' },
    { label: 'Уровень L3+ (тёплое состояние)', value: `${l3} / ${total}`, quality: 'unavailable', note: `Цель — ${eco?.coverage?.target ?? 80}% по спецификации максимума` },
    { label: 'Critical в аудитах', value: String(critical), quality: critical === 0 ? 'complete' : 'unavailable', note: scansMissing.length ? `Скан не выполнен: ${scansMissing.join(', ')}` : 'Все сканы выполнены' },
    { label: 'Режим провайдера', value: provider(), quality: isMock() ? 'partial' : 'complete', note: isMock() ? 'Mock: цифры студии ещё не боевые' : 'Боевой провайдер' },
  ]

  return `
  <div class="hero fade-in">
    <h1>Watchtower OS —<br/>контроль экосистемы студии</h1>
    <p>Один экран для пяти игр и приложений: подключённость, качество данных, безопасность контрактов, аналитика и готовность к деплою. Каждая цифра помечена источником и статусом — mock не выдаётся за реальность.</p>
    <div class="hero-actions">
      <button class="btn btn-primary" data-action="refresh">Обновить данные</button>
      <button class="btn" data-action="start-work">Приступить к работе</button>
      <button class="btn btn-ghost" data-action="open-section" data-section="deploy">Что мешает деплою</button>
    </div>
  </div>

  <div class="grid grid-4">
    ${kpis.map((k) => `
      <div class="card kpi fade-in">
        <div class="row-between"><span class="kpi-label">${esc(k.label)}</span>${qualityBadge(k.quality)}</div>
        <div class="kpi-value">${esc(k.value)}</div>
        <div class="kpi-explain">${esc(k.note)}</div>
      </div>`).join('')}
  </div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card card-static fade-in">
      <div class="row-between"><h3>Уровни зрелости tenant'ов</h3>${badge(`${total} объектов`, 'accent')}</div>
      <div class="list" style="margin-top:6px">
        ${(eco?.tenants || []).map((t) => `
          <div class="list-item">
            <div style="flex:1">
              <div class="list-item-title">${esc(t.name)} <span class="muted tiny">${esc(t.kind === 'application' ? 'приложение' : 'игра')}</span></div>
              <div class="list-item-detail">${esc(t.reason)}</div>
            </div>
            ${levelBadge(t.level)}
          </div>`).join('')}
      </div>
      ${explainBlock('levels')}
    </div>

    <div class="card card-static bg-security fade-in">
      <div class="card-with-bg-inner">
        <div class="row-between"><h3>Состояние студии по событиям</h3>${qualityBadge(d('ingestion') ? 'complete' : 'unavailable')}</div>
        <div class="list" style="margin-top:6px">
          <div class="list-item"><div style="flex:1"><div class="list-item-title">События приняты</div><div class="list-item-detail">Дедупликация по cluster+slot+signature+index</div></div><b>${esc(d('ingestion')?.events ?? '—')}</b></div>
          <div class="list-item"><div style="flex:1"><div class="list-item-title">Дубли отклонены</div><div class="list-item-detail">Повтор не создаёт новую запись</div></div><b>${esc(d('ingestion')?.duplicates ?? '—')}</b></div>
          <div class="list-item"><div style="flex:1"><div class="list-item-title">Алерты</div><div class="list-item-detail">Пороговые срабатывания по метрикам</div></div><b>${esc((d('alerts')?.alerts || []).length)}</b></div>
          <div class="list-item"><div style="flex:1"><div class="list-item-title">Контролы (только предложения)</div><div class="list-item-detail">Блокчейн-write из хаба невозможен</div></div><b>${esc((d('controlPolicy')?.actions || []).length || '—')}</b></div>
        </div>
        ${explainBlock('events')}
      </div>
    </div>
  </div>

  <div class="card card-static" style="margin-top:16px">
    <h3>Игры в реестре</h3>
    <p>Реестр хаба и паспорта игр должны совпадать. Расхождения — риск неверных отчётов.</p>
    <table class="table" style="margin-top:12px">
      <thead><tr><th>Игра</th><th>Сеть</th><th>Стадия (реестр)</th><th>dataQuality (реестр)</th><th>Источник</th></tr></thead>
      <tbody>
        ${games.map((g) => `<tr><td><b>${esc(g.name)}</b><div class="tiny muted">${esc(g.id)}</div></td><td>${esc(g.network)}</td><td>${esc(g.stage)}</td><td>${qualityBadge(g.dataQuality)}</td><td>${g.source === 'mock' ? badge('mock', 'warn') : badge(g.source || 'live', 'ok')}</td></tr>`).join('')}
      </tbody>
    </table>
    ${explainBlock('overview')}
  </div>`
}

function sectionGames() {
  const eco = d('ecosystem')
  const tenants = eco?.tenants || []
  const filtered = tenants.filter((t) => !state.query || (t.name + t.gameId).toLowerCase().includes(state.query.toLowerCase()))
  return `
  <div class="section-head">
    <div>
      <h2>Игры и приложения</h2>
      <p>Пять объектов экосистемы: четыре игры и два приложения (движок трафика и инвесторский лендинг). Для каждого — уровень, причина состояния и следующий шаг.</p>
    </div>
    <div class="spacer"></div>
    <input class="search" placeholder="Поиск по названию…" data-action="search" value="${esc(state.query)}" />
  </div>
  <div class="grid grid-2">
    ${filtered.map((t) => `
      <div class="card tenant-card fade-in">
        <div class="tenant-top">
          <div class="tenant-icon">${t.kind === 'application' ? '◎' : '◉'}</div>
          <div style="flex:1">
            <div class="row-between">
              <h3 class="tenant-name">${esc(t.name)}</h3>
              ${levelBadge(t.level)}
            </div>
            <div class="tenant-sub">${esc(t.gameId)} · ${esc(t.kind === 'application' ? 'приложение' : 'игра')} · ${esc(t.network || 'сеть не указана')} · стадия ${esc(t.stage || '—')}</div>
          </div>
        </div>
        <div class="reason">${esc(t.reason)}</div>
        <div class="findings-row">
          ${badge(`critical ${t.findings.critical}`, t.findings.critical ? 'bad' : 'ok')}
          ${badge(`high ${t.findings.high}`, t.findings.high ? 'warn' : 'ok')}
          ${badge(`всего ${t.findings.total}`)}
          ${t.auditDiscrepancy ? badge('скан не выполнялся', 'bad') : badge('скан выполнен', 'ok')}
          ${t.configured ? badge('подключено', 'ok') : badge('не подключено', 'warn')}
        </div>
        <div class="tiny muted">Переменная окружения: <code>${esc(t.envKey || '—')}</code>${t.configuredFromEnv ? ' (задана)' : ' (не задана)'}</div>
        <div class="hr"></div>
        <div class="tiny muted">${esc(t.nextStep || '')}</div>
        <div class="row" style="margin-top:10px">
          <button class="btn btn-primary btn-small" data-action="prompt-for" data-tenant="${esc(t.gameId)}">Приступить</button>
          <button class="btn btn-small" data-action="details" data-tenant="${esc(t.gameId)}">Детали</button>
        </div>
      </div>`).join('')}
  </div>
  ${explainBlock('games')}`
}

function sectionAnalytics() {
  const traffic = d('traffic')
  const funnel = d('funnel')
  const cross = d('crossGame')
  const ai = d('aiReport')
  const meta = traffic?.dataQuality || 'unavailable'
  return `
  <div class="section-head">
    <div>
      <h2>Аналитика</h2>
      <p>Трафик и acquisition, воронка, кросс-игровые сегменты и AI-отчёт. Данные считаются только из принятых событий: пока игры не подключены, экран показывает структуру и честные статусы.</p>
    </div>
    <div class="spacer"></div>
    ${qualityBadge(meta)}
  </div>
  <div class="grid grid-3">
    <div class="card fade-in">
      <div class="row-between"><h3>Трафик (off-chain)</h3>${qualityBadge(traffic?.dataQuality || 'unavailable')}</div>
      <p>Источник — движок TalkChart: визиты, сессии, боты отделены от реальных пользователей.</p>
      <div class="hr"></div>
      <div class="list">
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Визиты</div><div class="list-item-detail">Page views за окно наблюдения</div></div><b>${esc(traffic?.totals?.pageViews ?? '—')}</b></div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Сессии</div><div class="list-item-detail">Псевдонимные идентификаторы sess_&lt;hash&gt;</div></div><b>${esc(traffic?.totals?.sessions ?? '—')}</b></div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Боты / реальные</div><div class="list-item-detail">Не смешиваются в агрегатах</div></div><b>${esc(traffic?.visitorsByType?.bot ?? '—')} / ${esc(traffic?.visitorsByType?.real ?? '—')}</b></div>
      </div>
    </div>

    <div class="card fade-in">
      <div class="row-between"><h3>Воронка</h3>${qualityBadge(funnel ? 'partial' : 'unavailable')}</div>
      <p>Путь игрока: показ → кошелёк → первое действие → активность. Нулевой знаменатель не превращается в выдуманную конверсию.</p>
      <div class="hr"></div>
      <div class="list">
        ${(funnel?.stages || []).slice(0, 5).map((s) => `
          <div class="list-item"><div style="flex:1"><div class="list-item-title">${esc(s.name || s.id)}</div><div class="list-item-detail">${s.stageUnavailable ? 'нет эмиттера события' : `конверсия ${s.conversionFromPrevious ?? '—'}`}</div></div><b>${esc(s.count ?? 0)}</b></div>`).join('') || '<div class="list-item"><div class="list-item-detail">Ступени появятся после подключения игр</div></div>'}
      </div>
    </div>

    <div class="card fade-in">
      <div class="row-between"><h3>Кросс-игровые сегменты</h3>${qualityBadge(cross ? 'partial' : 'unavailable')}</div>
      <p>Игроки, найденные в двух и более играх по единому идентификатору. Это основа переплетения экосистемы.</p>
      <div class="hr"></div>
      <div class="list">
        ${(cross?.segments || []).slice(0, 4).map((s) => `<div class="list-item"><div style="flex:1"><div class="list-item-title">${esc(s.name || s.id || 'сегмент')}</div><div class="list-item-detail">${esc(s.detail || '')}</div></div><b>${esc(s.players ?? '—')}</b></div>`).join('') || '<div class="list-item"><div class="list-item-detail">Сегментов пока нет — нужны подключённые игры</div></div>'}
      </div>
    </div>
  </div>

  <div class="card card-static" style="margin-top:16px">
    <div class="row-between"><h3>AI-отчёт по состоянию</h3>${badge(isMock() ? 'на mock-данных' : 'на боевых данных', isMock() ? 'warn' : 'ok')}</div>
    <p>${esc(ai?.summary || 'Отчёт формируется из метрик и находок аудита, с указанием уверенности.')}</p>
    <div class="list" style="margin-top:8px">
      ${(ai?.insights || []).slice(0, 5).map((i) => `<div class="list-item"><div style="flex:1"><div class="list-item-title">${esc(i.title || i.metric || 'инсайт')}</div><div class="list-item-detail">${esc(i.detail || i.explanation || '')}</div></div>${badge(i.confidence || 'n/a')}</div>`).join('')}
    </div>
    ${explainBlock('analytics')}
  </div>`
}

function sectionSecurity() {
  const eco = d('ecosystem')
  const tenants = (eco?.tenants || []).filter((t) => t.findings.total || t.auditDiscrepancy)
  const audit = d('audit')
  const policy = d('controlPolicy')
  return `
  <div class="section-head">
    <div>
      <h2>Безопасность</h2>
      <p>Аудит контрактов, политика опасных действий и журнал доступа. Хаб физически не может подписать транзакцию — это заложено в контракте безопасности.</p>
    </div>
  </div>
  <div class="grid grid-2">
    <div class="card card-static fade-in">
      <div class="row-between"><h3>Находки аудита по играм</h3>${badge(`critical ${eco?.findingsTotal?.critical ?? 0}`, (eco?.findingsTotal?.critical ?? 0) ? 'bad' : 'ok')}</div>
      <table class="table" style="margin-top:10px">
        <thead><tr><th>Объект</th><th>Critical</th><th>High</th><th>Всего</th><th>Скан</th></tr></thead>
        <tbody>
          ${tenants.map((t) => `<tr>
            <td><b>${esc(t.name)}</b><div class="tiny muted">${esc(t.gameId)}</div></td>
            <td>${t.findings.critical ? badge(t.findings.critical, 'bad') : t.findings.critical}</td>
            <td>${t.findings.high ? badge(t.findings.high, 'warn') : t.findings.high}</td>
            <td>${t.findings.total}</td>
            <td>${t.auditDiscrepancy ? badge('не выполнялся', 'bad') : badge(`${t.findings.filesScanned} файлов`, 'ok')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="tiny muted" style="margin-top:10px">Пустой файл скана (files_scanned = 0) — это дефект сканера, а не отсутствие проблем. Поэтому он помечен отдельно.</div>
      ${explainBlock('security')}
    </div>

    <div class="card card-static bg-security fade-in">
      <div class="card-with-bg-inner">
        <div class="row-between"><h3>Политика опасных действий</h3>${badge('read-only', 'ok')}</div>
        <p>Любое изменение проходит предложение и подтверждение человеком: RBAC, 2FA, второе подтверждение, multisig/timelock, audit log, откат.</p>
        <div class="hr"></div>
        <div class="list">
          <div class="list-item"><div style="flex:1"><div class="list-item-title">Блокчейн-write из хаба</div><div class="list-item-detail">Запрещён на уровне контракта API</div></div>${badge('нет', 'ok')}</div>
          <div class="list-item"><div style="flex:1"><div class="list-item-title">Подтверждение человека</div><div class="list-item-detail">Обязательно для всех write-действий</div></div>${badge('да', 'ok')}</div>
          <div class="list-item"><div style="flex:1"><div class="list-item-title">Доступ по токену</div><div class="list-item-detail">WATCHTOWER_READ_TOKEN, сравнение constant-time</div></div>${badge(d('health')?.writes === false ? 'активен' : 'проверить', 'ok')}</div>
          <div class="list-item"><div style="flex:1"><div class="list-item-title">Записей в журнале доступа</div><div class="list-item-detail">Изменения журнала также аудируются</div></div><b>${esc((audit?.entries || []).length)}</b></div>
        </div>
        <div class="hr"></div>
        <div class="tiny muted">Действия в политике: ${esc((policy?.actions || ['pause-marketplace', 'freeze-rewards', 'change-fees']).join(', '))}</div>
      </div>
    </div>
  </div>`
}

function sectionContracts() {
  const os = d('osConfig')
  const sk = d('sessionKeys')
  const adapters = d('adapters')?.adapters || []
  const layers = Object.keys(os?.layers || {})
  return `
  <div class="section-head">
    <div>
      <h2>Контракты и стек OS v3</h2>
      <p>Единый технологический стек студии: 33 компонента и слои, которые переиспользуются всеми играми. Ниже — состав и текущая готовность подключения.</p>
    </div>
    <div class="spacer"></div>
    ${badge(`v${esc(os?.version || '—')} · ${esc(os?.totalComponents || '—')} компонентов`, 'accent')}
  </div>
  <div class="grid grid-2">
    <div class="card card-static fade-in">
      <h3>Слои стека</h3>
      <div class="row" style="gap:6px;margin-top:10px">
        ${layers.map((l) => badge(l, 'neutral')).join('')}
      </div>
      <div class="hr"></div>
      <div class="list">
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Session keys</div><div class="list-item-detail">Лимит ${esc(sk?.maxRiskSol ?? '0.01')} SOL, срок ${esc(sk?.expiryMinutes ?? 60)} мин, запрет вывода из treasury</div></div>${badge(sk ? 'настроено' : 'нет данных', sk ? 'ok' : 'warn')}</div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Дубли стека сняты</div><div class="list-item-detail">${esc((os?.duplicates || []).map((x) => x.deprecated).join(', ') || '—')}</div></div>${badge(os?.duplicates?.length || 0, 'neutral')}</div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Требований максимума</div><div class="list-item-detail">contracts / backend / frontend / data / ops / переплетение</div></div><b>${esc(d('ecosystem')?.requirements ? Object.values(d('ecosystem').requirements).slice(0, 6).join(' / ') : '—')}</b></div>
      </div>
      ${explainBlock('contracts')}
    </div>

    <div class="card card-static fade-in">
      <h3>Программы и окружение</h3>
      <p>Подключение игры требует подтверждённого адреса программы (или адреса экспортера для off-chain).</p>
      <table class="table" style="margin-top:10px">
        <thead><tr><th>Объект</th><th>Переменная</th><th>Состояние</th></tr></thead>
        <tbody>
          ${adapters.map((a) => `<tr>
            <td><b>${esc(a.name)}</b><div class="tiny muted">${esc(a.gameId)}</div></td>
            <td><code class="tiny">${esc(a.offchain ? a.apiBaseUrlEnv : a.programEnv)}</code></td>
            <td>${a.configured ? badge('задана', 'ok') : badge('не задана', 'warn')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${explainBlock('adapter')}
    </div>
  </div>`
}

function sectionInvestor() {
  const report = d('investor')
  const trend = d('investorTrend')
  const ecoReport = d('report')
  const quality = ecoReport?.dataQuality || 'unavailable'
  return `
  <div class="section-head">
    <div>
      <h2>Инвесторский контур</h2>
      <p>Только реальные данные: отчёт прямо перечисляет, какие объекты подключены, а какие нет. Mock-режим помечается, а не маскируется.</p>
    </div>
    <div class="spacer"></div>
    ${qualityBadge(quality)}
  </div>
  <div class="grid grid-2">
    <div class="card card-static fade-in">
      <h3>Подключённость к отчёту</h3>
      <div class="list" style="margin-top:8px">
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Подключено</div><div class="list-item-detail">${esc((ecoReport?.connectedTenants || []).join(', ') || 'нет')}</div></div>${badge((ecoReport?.connectedTenants || []).length, (ecoReport?.connectedTenants || []).length ? 'ok' : 'warn')}</div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Не подключено</div><div class="list-item-detail">${esc((ecoReport?.notConnectedTenants || []).map((t) => `${t.gameId}: ${t.reason}`).join('; ') || '—')}</div></div>${badge((ecoReport?.notConnectedTenants || []).length, 'warn')}</div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Источник данных</div><div class="list-item-detail">${esc(ecoReport?.source || '/api/ecosystem/status')}</div></div>${badge('read-only', 'ok')}</div>
      </div>
      <div class="hr"></div>
      <div class="tiny muted">${esc(ecoReport?.note || '')}</div>
      ${explainBlock('investor')}
    </div>

    <div class="card card-static fade-in">
      <div class="row-between"><h3>Финансовый срез</h3>${qualityBadge(report ? 'partial' : 'unavailable')}</div>
      <p>Отчёт и снапшоты формируются из принятых событий и подтверждённых доходов. Кварталы без прибыли показываются как ноль, а не скрываются.</p>
      <div class="hr"></div>
      <div class="list">
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Снапшотов</div><div class="list-item-detail">История расчётов дивидендов</div></div><b>${esc((report?.snapshots || []).length || 0)}</b></div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Тренд</div><div class="list-item-detail">Динамика по последним периодам</div></div><b>${esc((trend?.points || trend?.series || []).length || 0)}</b></div>
        <div class="list-item"><div style="flex:1"><div class="list-item-title">Формула дивиденда</div><div class="list-item-detail">(Чистая прибыль квартала × 25%) / 100 NFT</div></div>${badge('фиксирована', 'accent')}</div>
      </div>
    </div>
  </div>`
}

function sectionPrompts() {
  const catalog = d('prompts')?.prompts || []
  const filtered = catalog.filter((p) => !state.query || (p.title + p.target).toLowerCase().includes(state.query.toLowerCase()))
  return `
  <div class="section-head">
    <div>
      <h2>Промпты Arena</h2>
      <p>Готовые задания для AI-агентов: минимум (подключить объект к экосистеме) и максимум (довести до L3/L4 с переплетением). Кнопка «Приступить» показывает текст и копирует его в буфер.</p>
    </div>
    <div class="spacer"></div>
    <input class="search" placeholder="Поиск промпта…" data-action="search" value="${esc(state.query)}" />
  </div>
  <div class="grid grid-3">
    ${filtered.map((p) => `
      <div class="card fade-in">
        <div class="row-between"><h3 style="font-size:15.5px">${esc(p.title)}</h3>${badge(p.level, p.level === 'L4' ? 'ok' : 'accent')}</div>
        <div class="tiny muted" style="margin-top:6px">Репозиторий: <code>${esc(p.target)}</code></div>
        <div class="tiny muted">Файл: <code>${esc(p.file)}</code>${p.exists ? '' : ' — отсутствует'}</div>
        <div class="row" style="margin-top:12px">
          <button class="btn btn-primary btn-small" data-action="open-prompt" data-prompt="${esc(p.id)}">Приступить</button>
        </div>
      </div>`).join('')}
  </div>
  ${explainBlock('prompts')}`
}

function sectionDeploy() {
  const ready = DEPLOY_CHECKS.filter((c) => c.ready).length
  const total = DEPLOY_CHECKS.length
  const pct = Math.round((ready / total) * 100)
  return `
  <div class="section-head">
    <div>
      <h2>Деплой и готовность продукта</h2>
      <p>Честная картина: что уже работает в коде, а что требует действий оператора. Без этого списка «готово» превращается в риск.</p>
    </div>
    <div class="spacer"></div>
    ${badge(`${ready} из ${total} готово`, pct > 70 ? 'ok' : 'warn')}
  </div>
  <div class="card card-static fade-in">
    <div class="bar ${pct > 70 ? 'ok' : pct > 40 ? 'warn' : 'bad'}"><span style="width:${pct}%"></span></div>
    <div class="tiny muted" style="margin-top:8px">Готовность инфраструктуры: ${pct}%. Остальное — решения и доступы владельца студии.</div>
  </div>
  <div class="grid grid-2" style="margin-top:16px">
    ${DEPLOY_CHECKS.map((c) => `
      <div class="card fade-in">
        <div class="row-between"><h3 style="font-size:15.5px">${esc(c.title)}</h3>${c.ready ? badge('готово', 'ok') : badge('нужен оператор', 'warn')}</div>
        <p style="margin-top:8px">${esc(c.detail)}</p>
      </div>`).join('')}
  </div>

  <div class="card card-static" style="margin-top:16px">
    <h3>Команды запуска</h3>
    <div class="list" style="margin-top:8px">
      <div class="list-item"><div style="flex:1"><div class="list-item-title">Сборка фронтенда</div><code class="tiny">npm run build</code></div><button class="btn btn-small" data-action="copy" data-copy="npm run build">Копировать</button></div>
      <div class="list-item"><div style="flex:1"><div class="list-item-title">Запуск продукта одним портом</div><code class="tiny">node server/index.js</code></div><button class="btn btn-small" data-action="copy" data-copy="node server/index.js">Копировать</button></div>
      <div class="list-item"><div style="flex:1"><div class="list-item-title">Проверка покрытия экосистемы</div><code class="tiny">npm run ecosystem:target</code></div><button class="btn btn-small" data-action="copy" data-copy="npm run ecosystem:target">Копировать</button></div>
      <div class="list-item"><div style="flex:1"><div class="list-item-title">Смоук-тест контракта</div><code class="tiny">npm run test:smoke</code></div><button class="btn btn-small" data-action="copy" data-copy="npm run test:smoke">Копировать</button></div>
    </div>
    ${explainBlock('deploy')}
  </div>

  <div class="card card-static" style="margin-top:16px">
    <h3>Словарь терминов</h3>
    <div class="list" style="margin-top:8px">
      ${GLOSSARY.map(([term, def]) => `<div class="list-item"><div style="flex:1"><div class="list-item-title">${esc(term)}</div><div class="list-item-detail">${esc(def)}</div></div></div>`).join('')}
    </div>
  </div>`
}

const SECTIONS_RENDER = {
  overview: sectionOverview,
  games: sectionGames,
  analytics: sectionAnalytics,
  security: sectionSecurity,
  contracts: sectionContracts,
  investor: sectionInvestor,
  prompts: sectionPrompts,
  deploy: sectionDeploy,
}

// ---------------------------------------------------------------------------
// Рендер и события
// ---------------------------------------------------------------------------
function render() {
  document.documentElement.dataset.theme = state.theme
  const app = document.getElementById('app')
  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-mark">⌘</div>
          <span>Watchtower OS<small>by Leo Games Studio</small></span>
        </div>
        <div class="topbar-spacer"></div>
        <span class="meta-chip"><span class="live-dot"></span>${state.loading ? 'обновление…' : `обновлено ${state.refreshedAt ? state.refreshedAt.toLocaleTimeString('ru-RU') : '—'}`}</span>
        <span class="meta-chip">${isMock() ? 'режим: mock' : `режим: ${provider()}`}</span>
        <button class="btn btn-small" data-action="theme">${state.theme === 'light' ? 'Тёмная' : 'Светлая'}</button>
        <button class="btn btn-small btn-primary" data-action="refresh">Обновить</button>
      </div>
    </header>
    <main class="page">
      <nav class="segmented">
        ${SECTIONS.map((s) => `<button class="seg-btn ${state.section === s.id ? 'active' : ''}" data-action="open-section" data-section="${s.id}">${esc(s.label)}</button>`).join('')}
      </nav>
      <div id="section-root">${(SECTIONS_RENDER[state.section] || sectionOverview)()}</div>
      <div class="footnote">Watchtower OS · данные read-only · ${state.loading ? 'загрузка' : `источник: ${window.location.origin}`}</div>
    </main>`
}

function renderSection() {
  const root = document.getElementById('section-root')
  if (root) root.innerHTML = (SECTIONS_RENDER[state.section] || sectionOverview)()
  document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.section === state.section))
}

async function openPromptModal(id) {
  let prompt = null
  try { prompt = await api(`/api/arena/prompts/${encodeURIComponent(id)}`) } catch { toast('Не удалось загрузить промпт') }
  const backdrop = h('<div class="modal-backdrop"></div>')
  const close = () => backdrop.remove()
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close() })
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>${esc(prompt?.title || 'Промпт')}</h3>
        <div class="spacer"></div>
        <span class="badge badge-neutral">репозиторий: ${esc(prompt?.target || '—')}</span>
      </div>
      <div class="modal-body">
        <p class="tiny muted" style="margin-bottom:10px">Вставьте этот текст первым сообщением в сессию Arena Agent Mode, открытую на репозитории <b>${esc(prompt?.target || '—')}</b>. Промпт самодостаточен: содержит текущие факты, команды проверки, запреты и критерии готовности.</p>
        <pre class="prompt">${esc(prompt?.text || 'Текст промпта недоступен.')}</pre>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-action="close-modal">Закрыть</button>
        <button class="btn" data-action="copy" data-copy="__prompt__">Скопировать промпт</button>
        <a class="btn btn-primary" href="https://github.com/Leo88q/${esc(prompt?.target || '')}" target="_blank" rel="noreferrer">Открыть репозиторий</a>
      </div>
    </div>`
  backdrop._promptText = prompt?.text || ''
  document.body.appendChild(backdrop)
}

function modalPromptText() {
  const modal = document.querySelector('.modal-backdrop')
  return modal?._promptText || ''
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast('Скопировано в буфер')
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand?.('copy')
    area.remove()
    toast(ok ? 'Скопировано в буфер' : 'Скопируйте текст из окна промпта вручную')
    return Boolean(ok)
  }
}

function tenantPromptId(gameId) {
  return `max-${gameId}`
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]')
  if (!target) return
  const action = target.dataset.action

  if (action === 'open-section') {
    state.section = target.dataset.section
    state.query = ''
    history.replaceState(null, '', `#${state.section}`)
    renderSection()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  if (action === 'refresh') {
    toast('Обновляю данные…')
    await loadAll()
    render()
  }
  if (action === 'theme') {
    state.theme = state.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('wt-theme', state.theme)
    render()
  }
  if (action === 'open-prompt') await openPromptModal(target.dataset.prompt)
  if (action === 'prompt-for') await openPromptModal(tenantPromptId(target.dataset.tenant))
  if (action === 'close-modal') document.querySelector('.modal-backdrop')?.remove()
  if (action === 'copy') {
    const text = target.dataset.copy === '__prompt__' ? modalPromptText() : target.dataset.copy
    await copyText(text)
  }
  if (action === 'start-work') {
    state.section = 'prompts'
    history.replaceState(null, '', '#prompts')
    renderSection()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast('Выберите объект и нажмите «Приступить»')
  }
  if (action === 'details') {
    const t = (d('ecosystem')?.tenants || []).find((x) => x.gameId === target.dataset.tenant)
    if (!t) return
    const backdrop = h('<div class="modal-backdrop"></div>')
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove() })
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h3>${esc(t.name)}</h3><div class="spacer"></div>${levelBadge(t.level)}</div>
        <div class="modal-body">
          <table class="table">
            <tbody>
              <tr><td>game_id</td><td><code>${esc(t.gameId)}</code></td></tr>
              <tr><td>Тип</td><td>${esc(t.kind === 'application' ? 'приложение' : 'игра')}</td></tr>
              <tr><td>Причина уровня</td><td>${esc(t.reason)}</td></tr>
              <tr><td>Уровень</td><td>${esc(t.level)} — ${esc(t.levelMeaning)}</td></tr>
              <tr><td>Переменная окружения</td><td><code>${esc(t.envKey || '—')}</code></td></tr>
              <tr><td>dataQuality (адаптер)</td><td>${esc(t.dataQuality)}</td></tr>
              <tr><td>dataQuality (реестр)</td><td>${esc(t.registryDataQuality || '—')} ${t.registrySource ? `(${esc(t.registrySource)})` : ''}</td></tr>
              <tr><td>Аудит</td><td>critical ${t.findings.critical}, high ${t.findings.high}, всего ${t.findings.total}, файлов ${t.findings.filesScanned}</td></tr>
              <tr><td>Источник аудита</td><td><code>${esc(t.findings.source)}</code></td></tr>
              <tr><td>Следующий шаг</td><td>${esc(t.nextStep || '')}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-action="close-modal">Закрыть</button>
          <button class="btn btn-primary" data-action="prompt-for" data-tenant="${esc(t.gameId)}">Приступить к работе</button>
        </div>
      </div>`
    document.body.appendChild(backdrop)
  }
})

document.addEventListener('input', (event) => {
  const target = event.target.closest('[data-action="search"]')
  if (!target) return
  state.query = target.value
  const root = document.getElementById('section-root')
  const active = document.activeElement === target
  if (root) root.innerHTML = (SECTIONS_RENDER[state.section] || sectionOverview)()
  if (active) {
    const next = document.querySelector('[data-action="search"]')
    next?.focus()
    next?.setSelectionRange(next.value.length, next.value.length)
  }
})

window.addEventListener('hashchange', () => {
  const next = location.hash.replace('#', '') || 'overview'
  if (next !== state.section) { state.section = next; renderSection() }
})

// ---------------------------------------------------------------------------
// Старт
// ---------------------------------------------------------------------------
document.getElementById('app').innerHTML = '<div class="page"><div class="card card-static" style="text-align:center;padding:60px 20px"><div class="brand" style="justify-content:center;font-size:18px">Загрузка данных хаба…</div><p class="muted" style="margin-top:10px">Читаю /api/health, /api/ecosystem/status, /api/read-model</p></div></div>'
render()

loadAll().then(() => {
  render()
  toast(`Данные загружены: ${Object.values(state.data).filter((x) => x.ok).length} из ${Object.keys(state.data).length} запросов`)
}).catch((error) => {
  state.loading = false
  render()
  toast(`Ошибка загрузки: ${error.message}`)
})

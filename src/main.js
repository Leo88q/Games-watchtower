import './styles.css'
import './metrics.css'
import './investor.css'
import './funnels.css'
import './adjacent.css'
import './investor-history.css'
import './traffic.css'
import './os.css'
import './os/styles.css'
import { aggregateOverview, buildAiReport } from './engine/analytics'
import { fetchOS, renderOSPanel } from './os/index.js'
import { CONTROL_PANELS, renderControlPanels } from './os/control-panels-v3.js'

const games = [
  { name: 'Neon District', tag: 'NEON', color: '#37e5a0', status: 'Live', players: '12.8K', change: '+18.4%', economy: 'Healthy', icon: '✦' },
  { name: 'Aetheria', tag: 'AETH', color: '#a78bfa', status: 'Live', players: '8.4K', change: '+7.2%', economy: 'Watch', icon: '◈' },
  { name: 'Void Protocol', tag: 'VOID', color: '#ffb85c', status: 'Beta', players: '4.1K', change: '+32.8%', economy: 'Healthy', icon: '⬡' },
  { name: 'Drift Legends', tag: 'DRFT', color: '#ff6b8a', status: 'Live', players: '6.7K', change: '-2.1%', economy: 'Critical', icon: '✧' },
]

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
  return `<button class="nav-item ${active ? 'active' : ''}" data-view="${label}">${icons[icon]}<span>${label}</span>${badge ? `<b>${badge}</b>` : ''}</button>`
}

function gameRow(game) {
  const economyClass = game.economy === 'Healthy' ? 'healthy' : game.economy === 'Watch' ? 'watch' : 'critical'
  return `<div class="game-row">
    <div class="game-name"><span class="game-mark" style="--game-color:${game.color}">${game.icon}</span><div><strong>${game.name}</strong><small>${game.tag} · ${game.status}</small></div></div>
    <div class="player-count"><strong>${game.players}</strong><span class="positive">${game.change}</span></div>
    <div><span class="status-pill ${economyClass}"><i></i>${game.economy}</span></div>
    <div class="row-action"><button class="icon-btn" aria-label="Открыть игру">${icons.arrow}</button></div>
  </div>`
}

function app() {
  document.querySelector('#app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-icon">W</span><span>watchtower</span><em>PRO</em></div>
        <div class="workspace"><span class="workspace-avatar">L</span><div><small>Рабочее пространство</small><strong>Leo Games Studio</strong></div><span class="chevron">⌄</span></div>
        <nav class="main-nav">
          <div class="nav-label">WORKSPACE</div>
          ${navItem('overview', 'Обзор', true)}
          ${navItem('games', 'Мои игры', false, '4')}
          ${navItem('users', 'Игроки')}
          ${navItem('economy', 'Экономика')}
          <div class="nav-label second">INTELLIGENCE</div>
          ${navItem('bot', 'AI аналитик', false, '3')}
          ${navItem('shield', 'Безопасность', false, '2')}
          ${navItem('search', 'Трафик')}
          ${navItem('bot', 'OS v3', false, '33')}
          ${navItem('settings', 'Настройки')}
          <div class="nav-label second">ДЛЯ КОМАНДЫ</div>
          ${navItem('economy', 'Инвесторы')}
          ${navItem('users', 'Связи игроков')}
          ${navItem('games', 'Воронки')}
          ${navItem('bot', 'Смежная аналитика')}
        </nav>
        <div class="sidebar-bottom"><div class="help-card"><span class="help-icon">?</span><div><strong>Нужна помощь?</strong><small>Открыть документацию</small></div>${icons.arrow}</div><div class="profile"><span class="profile-avatar">LK</span><div><strong>Леонид К.</strong><small>Владелец</small></div><span class="dots">•••</span></div></div>
      </aside>
      <main class="main-content">
        <header class="topbar"><div class="breadcrumb"><span>Workspace</span><b>/</b><strong>Обзор</strong></div><div class="top-actions"><button class="date-btn">${icons.economy} 01 — 07 октября 2024 <span>⌄</span></button><button class="circle-btn" aria-label="Уведомления">${icons.bell}<i></i></button><span class="top-avatar">LK</span></div></header>
        <section class="page-heading"><div><p class="eyebrow">ПОНЕДЕЛЬНИК, 07 ОКТЯБРЯ 2024</p><h1>Добрый день, Леонид <span>✦</span></h1><p class="subtitle">Вот что происходит с вашей игровой экосистемой сегодня.</p></div><button class="primary-btn" id="refresh-btn">↻ <span>Обновить данные</span></button></section>
        <div class="alert-banner"><span class="alert-symbol">✦</span><div><strong>AI заметил 3 важных изменения</strong><span>Проверка экономики Drift Legends требует вашего внимания</span></div><button class="alert-link" data-view="AI аналитик">Посмотреть анализ ${icons.arrow}</button><button class="close-alert">×</button></div>
        <section class="metrics-grid">
          <article class="metric-card"><div class="metric-head"><span>Активные игроки</span><span class="metric-icon green">${icons.users}</span></div><div class="metric-value">32,041 <span class="trend up">↗ 12.8%</span></div><div class="sparkline green-line"><span></span><svg viewBox="0 0 220 42" preserveAspectRatio="none"><path d="M0 35 C18 31 19 34 31 28 S50 33 63 25 S84 31 98 18 S111 27 125 17 S142 22 153 11 S171 19 181 10 S198 14 220 2"/></svg></div><small>vs. предыдущая неделя</small></article>
          <article class="metric-card"><div class="metric-head"><span>Объём экономики</span><span class="metric-icon purple">${icons.economy}</span></div><div class="metric-value">$1.24M <span class="trend up">↗ 8.4%</span></div><div class="sparkline purple-line"><svg viewBox="0 0 220 42" preserveAspectRatio="none"><path d="M0 32 C18 28 24 35 37 27 S55 28 68 31 S81 20 96 23 S110 15 126 20 S139 11 152 15 S170 16 185 8 S201 12 220 5"/></svg></div><small>транзакций за 7 дней</small></article>
          <article class="metric-card"><div class="metric-head"><span>Средняя сессия</span><span class="metric-icon orange">${icons.games}</span></div><div class="metric-value">42m 18s <span class="trend up">↗ 4.1%</span></div><div class="sparkline orange-line"><svg viewBox="0 0 220 42" preserveAspectRatio="none"><path d="M0 29 C15 31 23 24 36 28 S48 35 64 27 S80 22 93 25 S108 19 124 22 S138 17 151 21 S168 13 183 18 S198 10 220 4"/></svg></div><small>среднее по всем играм</small></article>
          <article class="metric-card"><div class="metric-head"><span>Риски безопасности</span><span class="metric-icon red">${icons.shield}</span></div><div class="metric-value">2 <span class="trend down">↑ 1</span></div><div class="risk-bar"><span></span><i></i><b></b></div><small>требуют внимания сегодня</small></article>
        </section>
        <section class="content-grid"><article class="panel performance"><div class="panel-head"><div><h2>Производительность игр</h2><p>Ключевые показатели в динамике</p></div><div class="legend"><span><i class="dot green-dot"></i>Игроки</span><span><i class="dot purple-dot"></i>Сессии</span><button class="select-btn">7 дней ⌄</button></div></div><div class="chart"><div class="y-axis"><span>15K</span><span>10K</span><span>5K</span><span>0</span></div><div class="chart-area"><div class="grid-line l1"></div><div class="grid-line l2"></div><div class="grid-line l3"></div><div class="grid-line l4"></div><svg viewBox="0 0 700 220" preserveAspectRatio="none"><defs><linearGradient id="fillGreen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#37e5a0" stop-opacity=".2"/><stop offset="1" stop-color="#37e5a0" stop-opacity="0"/></linearGradient></defs><path class="area-path" d="M0 170 C36 160 50 174 82 145 S125 154 160 129 S202 136 235 106 S274 126 310 100 S351 111 384 80 S424 97 459 69 S503 89 536 54 S573 76 607 41 S652 65 700 18 V220 H0Z"/><path class="chart-path green-path" d="M0 170 C36 160 50 174 82 145 S125 154 160 129 S202 136 235 106 S274 126 310 100 S351 111 384 80 S424 97 459 69 S503 89 536 54 S573 76 607 41 S652 65 700 18"/><path class="chart-path purple-path" d="M0 188 C40 179 60 189 93 168 S131 176 164 158 S201 162 236 140 S274 148 309 130 S351 146 385 117 S425 133 460 108 S495 118 532 91 S570 109 610 80 S660 95 700 61"/></svg><div class="x-axis"><span>01 окт</span><span>02 окт</span><span>03 окт</span><span>04 окт</span><span>05 окт</span><span>06 окт</span><span>07 окт</span></div></div></div></article>
          <article class="panel ai-panel"><div class="ai-title"><span class="ai-orb">✦</span><div><h2>AI аналитик</h2><p>Последнее обновление 8 мин назад</p></div><span class="live-dot">LIVE</span></div><div class="ai-score"><div class="score-ring"><strong>84</strong><small>/ 100</small></div><div><strong>Состояние экосистемы</strong><p>Выше среднего за последние 30 дней</p></div></div><div class="ai-divider"></div><div class="ai-insight"><span class="insight-icon">↗</span><div><strong>Рост удержания в Neon District</strong><p>День 7 вырос на 6.2% после последнего обновления.</p></div></div><div class="ai-insight warning"><span class="insight-icon">!</span><div><strong>Аномалия в экономике Drift Legends</strong><p>Вывод токенов превышает ввод на 18%.</p></div></div><button class="full-analysis" data-view="AI аналитик">Открыть полный анализ ${icons.arrow}</button></article></section>
        <section class="panel games-panel"><div class="panel-head"><div><h2>Состояние игр</h2><p>Обзор по всем вашим проектам</p></div><button class="text-btn" data-view="Мои игры">Все игры ${icons.arrow}</button></div><div class="game-table"><div class="table-labels"><span>ИГРА</span><span>ОНЛАЙН</span><span>ЭКОНОМИКА</span><span></span></div>${games.map(gameRow).join('')}</div></section>
        <section class="expanded-grid"><article class="panel detail-table"><div class="panel-head"><div><h2>Игроки и удержание</h2><p>Показатели поведения по всем доступным источникам</p></div><button class="select-btn">7 дней ⌄</button></div><div class="quick-metrics"><div><span>Игроки сегодня</span><b>32 041</b><small>+12,8%</small></div><div><span>Новые игроки</span><b>374</b><small>+8,1%</small></div><div><span>Удержание D1</span><b>58,4%</b><small>частично</small></div><div><span>Удержание D7</span><b>34,5%</b><small>нужен backfill</small></div><div><span>Средняя сессия</span><b>21 мин</b><small>по событиям</small></div><div><span>Риск нескольких аккаунтов</span><b>17</b><small>на проверке</small></div></div></article><article class="panel detail-table"><div class="panel-head"><div><h2>Экономика и казна</h2><p>Выпуск, расходование и обязательства</p></div><button class="select-btn">Все игры ⌄</button></div><div class="quick-metrics"><div><span>Объём экономики</span><b>$1,24 млн</b><small>за 7 дней</small></div><div><span>Чистый выпуск</span><b>162 тыс.</b><small>выпуск минус сжигание</small></div><div><span>Расходование</span><b>41%</b><small>соотношение расходования и источников</small></div><div><span>Обязательства</span><b>$6 тыс.</b><small>нужна сверка</small></div><div><span>Топ-10 владельцев</span><b>62%</b><small>концентрация</small></div><div><span>Запас казны</span><b>14 дней</b><small>предварительно</small></div></div></article></section><section class="panel control-panel"><div class="panel-head"><div><h2>Центр управления</h2><p>Безопасные запросы без прямой записи в блокчейн</p></div><span class="status-pill healthy"><i></i>Защищено</span></div><div class="control-grid"><button class="control-btn" data-control="sync">↻ <strong>Запросить обновление</strong><small>Обновить данные игры и индексатора</small></button><button class="control-btn" data-control="reconcile">✓ <strong>Запросить сверку</strong><small>Сравнить подтверждённые и финальные данные</small></button><button class="control-btn" data-control="pause">Ⅱ <strong>Подготовить паузу</strong><small>Только через цепочку согласований</small></button><button class="control-btn" data-control="review">⚑ <strong>Отправить на проверку</strong><small>Создать задачу оператору</small></button></div></section><section id="adjacent-analytics-section" class="panel adjacent-panel"><div class="panel-head"><div><h2>Смежная аналитика</h2><p>Показатели, которые помогают понять причины роста, падения и рисков</p></div><button class="select-btn" id="refresh-adjacent">Обновить</button></div><div class="adjacent-grid"><article><span>Вовлечённость</span><b>32 041</b><small>активных игроков · переходы между играми</small></article><article><span>Монетизация</span><b>$38,60</b><small>оборот на активного игрока</small></article><article><span>Устойчивость экономики</span><b>41%</b><small>расходование к выпуску</small></article><article><span>Надёжность</span><b>2 / 4</b><small>игры с рабочим источником данных</small></article><article><span>Риск и доверие</span><b>2</b><small>критических сигнала</small></article><article><span>Качество данных</span><b>Частичное</b><small>часть программ ещё не подключена</small></article></div><div class="adjacent-insights"><div><strong>Что это значит</strong><p>Даже при росте игроков экономика может ухудшаться, если выпуск токенов опережает расходование, а новые игроки не возвращаются на 7-й день.</p></div><div><strong>Что проверить дальше</strong><p>Сравнить стоимость привлечения с удержанием, проверить задержку RPC и отдельно посмотреть игроков, которые перешли во вторую игру.</p></div></div></section><section id="funnels-section" class="panel funnel-panel"><div class="panel-head"><div><h2>Воронки и динамика</h2><p>От первого входа до возвращения, покупки и перехода в другую игру</p></div><div class="funnel-actions"><button class="select-btn" data-funnel-period="7">7 дней</button><button class="select-btn" data-funnel-period="30">30 дней</button><button class="select-btn" data-funnel-period="90">90 дней</button></div></div><div class="funnel-layout"><div class="funnel-steps"><div class="funnel-step"><span>1</span><div><strong>Первый вход</strong><small>100% · 48 200 игроков</small></div><b>100%</b></div><div class="funnel-step"><span>2</span><div><strong>Начали игру</strong><small>73% · 35 186 игроков</small></div><b>73%</b></div><div class="funnel-step"><span>3</span><div><strong>Вернулись на 1-й день</strong><small>58% · 27 956 игроков</small></div><b>58%</b></div><div class="funnel-step"><span>4</span><div><strong>Вернулись на 7-й день</strong><small>34% · 16 388 игроков</small></div><b>34%</b></div><div class="funnel-step"><span>5</span><div><strong>Сделали покупку</strong><small>8,7% · 4 193 игрока</small></div><b>8,7%</b></div><div class="funnel-step"><span>6</span><div><strong>Открыли вторую игру</strong><small>6,2% · 2 990 игроков</small></div><b>6,2%</b></div></div><div class="trend-chart"><div class="chart-legend"><span><i class="dot green-dot"></i>Активные игроки</span><span><i class="dot purple-dot"></i>Новые игроки</span></div><svg viewBox="0 0 620 220" preserveAspectRatio="none"><defs><linearGradient id="funnelFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#37e5a0" stop-opacity=".22"/><stop offset="1" stop-color="#37e5a0" stop-opacity="0"/></linearGradient></defs><path class="funnel-area" d="M0 172 C45 160 68 169 102 143 S160 151 198 126 S244 142 285 105 S334 121 374 95 S425 111 461 74 S510 91 550 47 S585 54 620 24 V220 H0Z"/><path class="funnel-line green-path" d="M0 172 C45 160 68 169 102 143 S160 151 198 126 S244 142 285 105 S334 121 374 95 S425 111 461 74 S510 91 550 47 S585 54 620 24"/><path class="funnel-line purple-path" d="M0 190 C45 183 68 187 102 174 S160 179 198 161 S244 171 285 146 S334 157 374 139 S425 147 461 124 S510 134 550 111 S585 114 620 96"/></svg><div class="chart-labels"><span>01 окт</span><span>07 окт</span><span>14 окт</span><span>21 окт</span><span>30 окт</span></div></div></div><div class="funnel-note"><strong>Главная точка потерь:</strong> между первым входом и возвращением на 7-й день теряется 66% игроков. Следующий тест — персональное предложение после второй сессии, только для согласившихся игроков.</div></section><section id="investors-section" class="panel investor-panel"><div class="panel-head"><div><h2>Страница для инвесторов</h2><p>Понятная сводка о росте, деньгах, рисках и качестве данных</p></div><button class="primary-btn" data-snapshot="true">Сохранить снимок отчёта</button></div><div class="investor-grid"><div><span>Игроки сегодня / месяц</span><b>32 041 / 78 420</b><small>DAU / MAU</small></div><div><span>Удержание на 7-й день</span><b>34,5%</b><small>частичные данные</small></div><div><span>Доля платящих игроков</span><b>8,7%</b><small>по доступным операциям</small></div><div><span>Средний доход с игрока</span><b>$3,84</b><small>оценка за 30 дней</small></div><div><span>Оборот за 30 дней</span><b>$1,24 млн</b><small>без оценки будущего</small></div><div><span>Запас казны</span><b>14 дней</b><small>предварительная оценка</small></div><div><span>Чистый выпуск токенов</span><b>162 тыс.</b><small>выпуск минус сжигание</small></div><div><span>Риски и инциденты</span><b>2 критичных</b><small>есть план проверки</small></div><div><span>Надёжность данных</span><b>Частичная</b><small>не все программы подключены</small></div></div><div class="investor-history"><div class="history-head"><strong>История отчётов</strong><span id="investor-trend-status">Загрузка сохранённых снимков...</span></div><div class="history-bars" id="investor-history-bars"><i style="height:32%"></i><i style="height:45%"></i><i style="height:40%"></i><i style="height:64%"></i><i style="height:58%"></i><i style="height:78%"></i><i style="height:86%"></i></div><div class="history-labels"><span>старые</span><span>последний отчёт</span></div></div><div class="investor-note"><strong>Принцип отчётности:</strong> инвесторам отправляются только агрегированные показатели без персональных данных игроков. Каждая цифра сопровождается периодом, источником и оценкой достоверности.</div></section><section id="players-network-section" class="panel network-panel"><div class="panel-head"><div><h2>Связи игроков между играми</h2><p>Помогаем игрокам открыть другие проекты, не раскрывая их личности</p></div><button class="select-btn">Последние 30 дней ⌄</button></div><div class="cross-game-grid"><div><span>Играют в 1 игру</span><b>68%</b><small>главная аудитория для приглашений</small></div><div><span>Играют в 2 игры</span><b>24%</b><small>лучший сегмент для связующих предложений</small></div><div><span>Играют в 3–4 игры</span><b>8%</b><small>ядро экосистемы</small></div></div><div class="player-segment-table"><div><span>Обезличенная группа</span><span>Игр</span><span>Интерес</span><span>Предложение</span><span>Статус</span></div><div><span>Группа A-1042</span><b>1</b><span>ARES-1</span><span>Стартовый бонус Neon Relay</span><em>готово к проверке</em></div><div><span>Группа N-2088</span><b>2</b><span>Neon Relay · ARES-1</span><span>Приглашение в GUTTERCAPS</span><em>нужно согласие</em></div><div><span>Группа G-4410</span><b>1</b><span>GUTTERCAPS</span><span>Пробный доступ в AOF</span><em>черновик</em></div></div><div class="investor-note"><strong>Правило безопасности:</strong> предложения строятся по обезличенным группам и игровым интересам. Автоматическая рассылка, передача личных данных и выдача наград без согласования запрещены.</div></section><section id="traffic-section" class="panel traffic-panel"><div class="panel-head"><div><h2>Трафик / Acquisition</h2><p>TalkChart Traffic Generator · off-chain: SEO/GEO, X/Twitter и Blinks, короткие видео, китовый радар, TipLink</p></div><button class="select-btn" id="refresh-traffic">Обновить</button></div><div class="adjacent-grid traffic-grid"><article><span>Просмотры страниц</span><b id="traffic-pageviews">—</b><small>события PageView</small></article><article><span>Сессии</span><b id="traffic-sessions">—</b><small>события SessionStarted</small></article><article><span>Уникальные посетители</span><b id="traffic-visitors">—</b><small>псевдонимные sessionId</small></article><article><span>Клики по CTA</span><b id="traffic-cta">—</b><small>промо-слоты, Blinks, TipLink</small></article><article><span>Дошли до игры</span><b id="traffic-landing">—</b><small>события LandingReached</small></article><article><span>Качество данных</span><b id="traffic-quality">—</b><small id="traffic-quality-note">адаптер ожидает событий</small></article></div><div class="funnel-steps traffic-funnel"><div class="funnel-step"><span>1</span><div><strong>Кампания запущена</strong><small id="traffic-step-0">—</small></div><b id="traffic-pct-0">—</b></div><div class="funnel-step"><span>2</span><div><strong>Сессия</strong><small id="traffic-step-1">—</small></div><b id="traffic-pct-1">—</b></div><div class="funnel-step"><span>3</span><div><strong>Просмотр страницы</strong><small id="traffic-step-2">—</small></div><b id="traffic-pct-2">—</b></div><div class="funnel-step"><span>4</span><div><strong>Клик по CTA</strong><small id="traffic-step-3">—</small></div><b id="traffic-pct-3">—</b></div><div class="funnel-step"><span>5</span><div><strong>Дошёл до игры</strong><small id="traffic-step-4">—</small></div><b id="traffic-pct-4">—</b></div></div><div class="traffic-meta"><div><span>Кампании</span><div class="chips" id="traffic-campaigns">—</div></div><div><span>Источники трафика</span><div class="chips" id="traffic-sources">—</div></div><div><span>Целевые страницы</span><div class="chips" id="traffic-pages">—</div></div><div><span>Тип трафика</span><div id="traffic-type">—</div><small>real / bot / hybrid по событиям</small></div></div><div class="traffic-status" id="traffic-status">Ожидание событий от TalkChart… Watchtower не управляет трафиком — только read-only аналитика.</div></section><section id="os-section" class="panel os-panel" style="margin-top:24px;"><div id="os-panel-container"><div class="panel-head"><div><h2>🔧 Watchtower OS v3 — Панель управления</h2><p>33 компонента · 7 слоёв v1 + 12 продуктов v2 + 13 лучших бесплатных v3 идеальный стек</p></div><span class="status-pill healthy"><i></i>OS v3.0.0 — 33 компонента</span><button class="select-btn" id="refresh-os">Обновить OS v3</button></div><div class="os-v3-summary"><article><span>Компонентов</span><b>33</b><small>v1 8 слоёв + v2 12 продуктов + v3 13 best free</small></article><article><span>Панелей управления</span><b>${CONTROL_PANELS.length}</b><small>identity → utils · capabilities, api, npm, games, actions</small></article><article><span>Игры — tenants</span><b>4</b><small>ares1 · aof · neonrelay · guttercaps</small></article><article><span>Дубликаты deprecated</span><b>3</b><small>preset ← create-solana-game · RitArena ← Aureus · SolGuard ← SolShield</small></article></div><div id="os-panel-content" style="padding:12px; color:#8892b0;">Загрузка панели управления OS v3...</div><div id="os-panels-content"></div></div></section><footer><span>Watchtower Pro · Все системы работают</span><span><i class="online-dot"></i> Данные обновлены 2 минуты назад</span></footer>
      </main>
    </div>
  `
  bindEvents()
  hydrateDashboard()
  syncFromApi()
}

function hydrateDashboard() {
  const overview = aggregateOverview()
  const report = buildAiReport()
  const values = document.querySelectorAll('.metric-value')
  if (values[0]) values[0].innerHTML = `${overview.activePlayers.toLocaleString('en-US')} <span class="trend up">↗ live</span>`
  if (values[1]) values[1].innerHTML = `$${(overview.minted / 1000).toFixed(1)}K <span class="trend up">↗ flow</span>`
  if (values[2]) values[2].innerHTML = `${overview.games.filter((game) => game.health.dataQuality !== 'unavailable').length} / 4 <span class="trend up">↗ sources</span>`
  if (values[3]) values[3].innerHTML = `${overview.alerts.filter((alert) => alert.severity === 'critical').length} <span class="trend down">↑ critical</span>`
  const score = document.querySelector('.score-ring strong')
  if (score) score.textContent = report.ecosystemScore
  const aiDescription = document.querySelector('.ai-score p')
  if (aiDescription) aiDescription.textContent = `${report.criticalCount} критических сигналов · ${new Date(report.generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  const alert = overview.alerts.find((item) => item.severity === 'critical')
  const banner = document.querySelector('.alert-banner div')
  if (alert && banner) banner.innerHTML = `<strong>${alert.title}</strong><span>${alert.gameId.toUpperCase()} · ${alert.detail}</span>`

  // Загрузка OS v3 панели
  loadOSPanel()
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
    } else if (container) {
      container.innerHTML = `<p>OS API недоступен — запустите API сервер на порту 8787</p>`
    }
    if (panelsContainer) {
      if (osData.config) renderControlPanels(panelsContainer, osData)
      else panelsContainer.innerHTML = ''
    }
    osPanelState = 'loaded'
  } catch {
    if (container) container.innerHTML = `<p>Ошибка загрузки OS v3 панели</p>`
    osPanelState = 'idle'
  }
}

async function syncFromApi() {
  try {
    const response = await fetch('/api/read-model')
    if (!response.ok) return
    const readModel = await response.json()
    const overview = readModel.overview
    const adjacent = readModel.adjacent
    const source = document.querySelector('.eyebrow')
    if (source) source.textContent = `ЖИВАЯ МОДЕЛЬ ДАННЫХ · ${new Date(readModel.generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    const adjacentValues = [adjacent.sections.engagement.metrics.activePlayers, adjacent.sections.monetization.metrics.volumePerActivePlayer ? `$${adjacent.sections.monetization.metrics.volumePerActivePlayer}` : 'нет данных', adjacent.sections.sustainability.metrics.burnToMintRatio === null ? 'нет данных' : `${Math.round(adjacent.sections.sustainability.metrics.burnToMintRatio * 100)}%`, `${adjacent.sections.reliability.metrics.connectedGames} / ${adjacent.sections.reliability.metrics.totalGames}`, adjacent.sections.risk.metrics.criticalIncidents, `${adjacent.sections.risk.metrics.dataCoverage}%`]
    document.querySelectorAll('.adjacent-grid article b').forEach((value, index) => { if (adjacentValues[index] !== undefined) value.textContent = adjacentValues[index] })
    const trendStatus = document.querySelector('#investor-trend-status')
    if (trendStatus) trendStatus.textContent = readModel.investorTrend.points.length ? `${readModel.investorTrend.points.length} сохранённых отчётов · качество ${readModel.investorTrend.dataQuality}` : 'Пока нет сохранённых снимков'
    const investorMetrics = readModel.investor.metrics
    const investorValues = [investorMetrics.activePlayers, 'частично', investorMetrics.payerConversion === 'partial' ? 'частично' : investorMetrics.payerConversion, investorMetrics.volume ? `$${investorMetrics.volume}` : 'нет данных', investorMetrics.volume ? `$${investorMetrics.volume}` : 'нет данных', 'частично', investorMetrics.minted ? `${investorMetrics.minted}` : 'нет данных', `${investorMetrics.criticalIncidents}`, investorMetrics.dataQuality === 'partial' ? 'частичное' : investorMetrics.dataQuality]
    document.querySelectorAll('.investor-grid > div b').forEach((value, index) => { if (investorValues[index] !== undefined) value.textContent = investorValues[index] })
    const funnelStages = readModel.funnel.stages || []
    document.querySelectorAll('.funnel-step > b').forEach((value, index) => { if (funnelStages[index]?.conversionRate !== null && funnelStages[index]?.conversionRate !== undefined) value.textContent = `${funnelStages[index].conversionRate}%` })
    const bars = document.querySelectorAll('#investor-history-bars i')
    const points = readModel.investorTrend.points
    const maxPlayers = Math.max(1, ...points.map((point) => Number(point.activePlayers) || 0))
    bars.forEach((bar, index) => { const point = points[index]; if (point) bar.style.height = `${Math.max(12, Math.round((Number(point.activePlayers) || 0) / maxPlayers * 100))}%` })
    document.querySelectorAll('.game-row').forEach((row, index) => {
      const game = overview.games[index]
      if (!game) return
      const label = row.querySelector('.game-name small')
      if (label) label.textContent = `${game.id.toUpperCase()} · ${game.stage} · ${game.dataQuality}`
    })
    const traffic = readModel.traffic
    if (traffic) {
      const set = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value === null || value === undefined ? '—' : value }
      const fmt = (value) => Number(value || 0).toLocaleString('en-US')
      const metric = (value) => value ? fmt(value) : '—'
      set('#traffic-pageviews', metric(traffic.totals.pageViews))
      set('#traffic-sessions', metric(traffic.totals.sessions))
      set('#traffic-visitors', metric(traffic.totals.uniquePseudoVisitors))
      set('#traffic-cta', metric(traffic.totals.ctaClicks))
      set('#traffic-landing', metric(traffic.totals.landingReached))
      set('#traffic-quality', { complete: 'Полное', partial: 'Частичное', unavailable: 'Нет данных' }[traffic.dataQuality] || traffic.dataQuality)
      set('#traffic-quality-note', traffic.reason || `dataQuality: ${traffic.dataQuality} · confidence ${traffic.confidence}`)
      ;(traffic.funnel || []).forEach((step, index) => {
        set(`#traffic-step-${index}`, `${fmt(step.count)} событий`)
        set(`#traffic-pct-${index}`, step.conversionFromPrevious === null ? (index === 0 ? '100%' : '—') : `${(step.conversionFromPrevious * 100).toFixed(1)}%`)
      })
      const chips = (selector, values) => { const element = document.querySelector(selector); if (element) element.innerHTML = values.length ? values.slice(0, 8).map((value) => `<span class="chip">${value}</span>`).join('') : '—' }
      chips('#traffic-campaigns', traffic.campaigns)
      chips('#traffic-sources', traffic.sources)
      chips('#traffic-pages', traffic.pages)
      set('#traffic-type', (traffic.totals.realEvents || traffic.totals.botEvents) ? `real ${fmt(traffic.totals.realEvents)} · bot ${fmt(traffic.totals.botEvents)}` : '—')
      set('#traffic-status', traffic.reason || `Событий в inbox: ${fmt(traffic.totals.events)} · read-only · синхронизация ${new Date(traffic.generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`)
    }
  } catch {
    const source = document.querySelector('.eyebrow')
    if (source) source.textContent = 'LOCAL MOCK READ MODEL'
  }
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === button.dataset.view))
    if (!button.classList.contains('nav-item')) showToast(`Раздел «${button.dataset.view}» будет доступен в следующем модуле`)
  }))
  document.querySelectorAll('[data-control]').forEach((button) => button.addEventListener('click', () => showToast('Запрос создан. Прямое изменение отключено до подтверждения безопасности.')))
  document.querySelectorAll('[data-snapshot]').forEach((button) => button.addEventListener('click', async () => { try { const response = await fetch('/api/investors/snapshots', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ period: '7d UTC', createdBy: 'dashboard-operator' }) }); if (!response.ok) throw new Error('snapshot_failed'); button.textContent = 'Снимок сохранён'; showToast('Инвесторский отчёт сохранён') } catch { showToast('Не удалось сохранить снимок') } }))
  document.querySelectorAll('[data-funnel-period]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-funnel-period]').forEach((item) => item.classList.remove('selected')); button.classList.add('selected'); showToast(`Период воронки: ${button.dataset.funnelPeriod} дней`) }))
  document.querySelector('#refresh-adjacent')?.addEventListener('click', async () => { try { await fetch('/api/analytics/adjacent'); showToast('Смежная аналитика обновлена') } catch { showToast('Источник аналитики пока недоступен') } })
  document.querySelector('#refresh-traffic')?.addEventListener('click', async () => { try { const response = await fetch('/api/analytics/traffic'); if (!response.ok) throw new Error('traffic_failed'); await syncFromApi(); showToast('Трафик-аналитика обновлена') } catch { showToast('Источник трафика пока недоступен') } })
  document.querySelector('#refresh-os')?.addEventListener('click', async (event) => {
    const button = event.currentTarget
    button.textContent = 'Обновляем…'
    await loadOSPanel({ force: true })
    button.textContent = 'Обновить OS v3'
    showToast(`OS v3 обновлён: 33 компонента · 19 слоёв · ${CONTROL_PANELS.length} панелей управления`)
  })
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.view === 'Инвесторы' ? '#investors-section' : button.dataset.view === 'Связи игроков' ? '#players-network-section' : button.dataset.view === 'Воронки' ? '#funnels-section' : button.dataset.view === 'Смежная аналитика' ? '#adjacent-analytics-section' : button.dataset.view === 'Трафик' ? '#traffic-section' : button.dataset.view === 'OS v3' ? '#os-section' : null
    if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))
  document.querySelector('#refresh-btn').addEventListener('click', (event) => {
    const button = event.currentTarget
    button.classList.add('loading'); button.querySelector('span').textContent = 'Обновляем...'
    setTimeout(async () => { await syncFromApi(); button.classList.remove('loading'); button.querySelector('span').textContent = 'Данные обновлены'; showToast('Метрики синхронизированы') }, 900)
  })
  document.querySelector('.close-alert').addEventListener('click', (event) => event.currentTarget.closest('.alert-banner').remove())
}
function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; document.body.append(toast); setTimeout(() => toast.remove(), 2400) }
app()

// Точка входа: карта системы по умолчанию, старые отчёты — по ?view=reports
const view = new URLSearchParams(location.search).get('view')
if (view === 'reports') import('./ios/main.js')
else import('./cosmos/main.js')

const day = 86_400_000
const now = Date.now()

const series = (values) => values.map((value, index) => ({ ts: now - (values.length - index) * day, value }))

export const MOCK_GAME_DATA = {
  ares1: {
    health: { ok: true, dataQuality: 'partial', rpc: 'degraded', lastSync: '2 min ago' },
    metrics: { players: 1280, newPlayers: 164, retention: 0, minted: 124000, burned: 51000, volume: 18400, treasury: 4200 },
    trends: { players: series([720, 800, 940, 1010, 1080, 1170, 1280]), economy: series([82, 90, 88, 101, 112, 118, 124]) },
    alerts: [{ severity: 'critical', title: 'Authority не подтверждён', detail: 'Devnet deployment и upgrade authority требуют проверки RPC.' }, { severity: 'high', title: 'Нет indexer событий', detail: 'DAU, retention и экономика недоступны в полном объёме.' }],
  },
  aof: {
    health: { ok: false, dataQuality: 'unavailable', rpc: 'unknown', lastSync: 'never' },
    metrics: { players: null, newPlayers: null, retention: null, minted: null, burned: null, volume: null, treasury: null },
    trends: { players: series([0, 0, 0, 0, 0, 0, 0]), economy: series([0, 0, 0, 0, 0, 0, 0]) },
    alerts: [{ severity: 'critical', title: 'Production deployment не найден', detail: 'AOF подключён в режиме проектного контракта, live-данные отсутствуют.' }, { severity: 'high', title: 'ADMIN_TOKEN без RBAC', detail: 'До появления 2FA и approval write-операции запрещены.' }],
  },
  neonrelay: {
    health: { ok: true, dataQuality: 'partial', rpc: 'unverified', lastSync: '8 min ago' },
    metrics: { players: 3820, newPlayers: 210, retention: 28, minted: 89000, burned: 0, volume: 7100, treasury: 9200 },
    trends: { players: series([2100, 2350, 2510, 2880, 3020, 3440, 3820]), economy: series([60, 66, 64, 71, 76, 81, 89]) },
    alerts: [{ severity: 'critical', title: 'Program IDs не подтверждены', detail: 'Anchor IDs являются placeholders до проверки через solana program show.' }, { severity: 'medium', title: 'Нет session telemetry', detail: 'Retention и длительность сессий ещё не рассчитываются.' }],
  },
  guttercaps: {
    health: { ok: false, dataQuality: 'partial', rpc: 'not deployed', lastSync: 'never' },
    metrics: { players: null, newPlayers: null, retention: null, minted: null, burned: null, volume: null, treasury: null },
    trends: { players: series([0, 0, 0, 0, 0, 0, 0]), economy: series([0, 0, 0, 0, 0, 0, 0]) },
    alerts: [{ severity: 'critical', title: 'On-chain programs не задеплоены', detail: 'Экономические инварианты пока являются проектными, а не runtime-метриками.' }, { severity: 'high', title: 'Localnet suite требует исправления', detail: 'До зелёного end-to-end прогона данные нельзя считать источником истины.' }],
  },
}

export function getAllAlerts() {
  return Object.entries(MOCK_GAME_DATA).flatMap(([gameId, data]) => data.alerts.map((alert, index) => ({ ...alert, id: `${gameId}-${index}`, gameId })))
}

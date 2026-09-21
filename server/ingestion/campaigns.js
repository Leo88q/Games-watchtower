import { randomUUID } from 'node:crypto'
import { crossGameSegments } from './player-projections.js'

const proposals = new Map()
const catalog = {
  ares1: { name: 'ARES-1', offer: 'Стартовый набор ресурсов' },
  aof: { name: 'Age of Farming', offer: 'Пробный набор для фермы' },
  neonrelay: { name: 'Neon Relay', offer: 'Бонус за первую гонку' },
  guttercaps: { name: 'GUTTERCAPS', offer: 'Билет на первый матч' },
}

function recommend(games) {
  const candidates = Object.keys(catalog).filter((gameId) => !games.includes(gameId))
  if (!candidates.length) return null
  const target = candidates[0]
  return { targetGameId: target, targetGame: catalog[target].name, offer: catalog[target].offer, reason: games.length === 1 ? 'игрок активен только в одной игре' : 'игрок уже проявил интерес к нескольким играм' }
}

export function recommendations({ limit = 100 } = {}) {
  const source = crossGameSegments({ limit })
  const rows = [...source.segments.oneGame, ...source.segments.twoGames].map((segment) => ({
    recommendationId: `rec-${segment.playerGroup}`,
    playerGroup: segment.playerGroup,
    currentGames: segment.games.map((id) => catalog[id]?.name || id),
    ...recommend(segment.games),
    consent: 'unknown',
    fraudCheck: 'required',
    status: 'draft',
    autoSend: false,
  })).filter((row) => row.targetGameId)
  return { recommendations: rows, count: rows.length, policy: { anonymized: true, consentRequired: true, fraudCheckRequired: true, autoSend: false }, dataQuality: source.dataQuality, generatedAt: new Date().toISOString() }
}

export function createCampaignProposal(input = {}) {
  if (!input.recommendationId || !input.channel) return { accepted: false, reason: 'recommendationId_and_channel_required' }
  const proposal = { proposalId: randomUUID(), recommendationId: input.recommendationId, channel: input.channel, message: input.message || null, status: 'pending_review', autoSend: false, createdAt: new Date().toISOString() }
  proposals.set(proposal.proposalId, proposal)
  return { accepted: true, proposal }
}

export function campaignStatus() { return { proposals: [...proposals.values()], writes: false, autoSend: false } }

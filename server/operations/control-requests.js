import { randomUUID } from 'node:crypto'

const allowed = new Set(['sync', 'reconcile', 'pause_review', 'fraud_review', 'campaign_review'])
const requests = new Map()

export function createControlRequest(input = {}) {
  if (!allowed.has(input.type)) return { accepted: false, reason: 'unsupported_control_type', allowed: [...allowed] }
  const request = { requestId: randomUUID(), type: input.type, gameId: input.gameId || 'ecosystem', reason: input.reason || null, requestedBy: input.requestedBy || 'dashboard-operator', status: 'pending_review', blockchainWrite: false, requiresApproval: true, createdAt: new Date().toISOString() }
  requests.set(request.requestId, request)
  return { accepted: true, request }
}

export function listControlRequests() { return [...requests.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
export function controlPolicy() { return { blockchainWrite: false, requiresApproval: true, requiredApprovals: 2, supports: [...allowed], audit: true } }

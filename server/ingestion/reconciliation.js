export function reconciliationReport(events = []) {
  const bySignature = new Map()
  for (const event of events) {
    const current = bySignature.get(event.signature) || { signature: event.signature, highestCommitment: 'processed', slots: new Set(), eventCount: 0 }
    current.eventCount += 1; if (event.slot !== null) current.slots.add(event.slot)
    if (event.commitment === 'finalized' || (event.commitment === 'confirmed' && current.highestCommitment === 'processed')) current.highestCommitment = event.commitment
    bySignature.set(event.signature, current)
  }
  const gaps = events.filter((event, index) => index > 0 && event.slot !== null && events[index - 1].slot !== null && Math.abs(events[index - 1].slot - event.slot) > 1)
  return { signatures: [...bySignature.values()].map((row) => ({ ...row, slots: [...row.slots] })), gaps: gaps.length, finalized: [...bySignature.values()].filter((row) => row.highestCommitment === 'finalized').length, dataQuality: events.length ? (gaps.length ? 'partial' : 'complete') : 'unavailable' }
}

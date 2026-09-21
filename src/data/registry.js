export const GAME_REGISTRY = [
  { id: 'ares1', name: 'ARES-1', subtitle: 'Potato Colony on Solana', network: 'Solana Devnet', stage: 'beta', dataQuality: 'partial', accent: '#37e5a0', source: 'mock' },
  { id: 'aof', name: 'Age of Farming', subtitle: 'Farming & crafting economy', network: 'Solana', stage: 'prototype', dataQuality: 'unavailable', accent: '#a78bfa', source: 'mock' },
  { id: 'neonrelay', name: 'Neon Relay', subtitle: 'Race & Neon DM', network: 'Solana Devnet', stage: 'prototype', dataQuality: 'partial', accent: '#ffb85c', source: 'mock' },
  { id: 'guttercaps', name: 'GUTTERCAPS', subtitle: 'Collectibles & PvP', network: 'Solana', stage: 'alpha', dataQuality: 'partial', accent: '#ff6b8a', source: 'mock' },
]

export const getGame = (id) => GAME_REGISTRY.find((game) => game.id === id)

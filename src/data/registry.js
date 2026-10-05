export const GAME_REGISTRY = [
  { id: 'ares1', name: 'ARES-1', subtitle: 'Potato Colony on Solana', network: 'Solana Devnet', stage: 'beta', dataQuality: 'partial', accent: '#37e5a0', source: 'registry-declaration' },
  { id: 'aof', name: 'NeuroForge', subtitle: 'Laboratory RPG: samples, AI models, crafting', network: 'Solana', stage: 'prototype', dataQuality: 'unavailable', accent: '#5ee7ff', source: 'registry-declaration' },
  { id: 'neonrelay', name: 'Neon Relay', subtitle: 'Race & Neon DM', network: 'Solana Devnet', stage: 'prototype', dataQuality: 'partial', accent: '#ffb85c', source: 'registry-declaration' },
  { id: 'guttercaps', name: 'GUTTERCAPS', subtitle: 'Collectibles & PvP', network: 'Solana', stage: 'alpha', dataQuality: 'partial', accent: '#ff6b8a', source: 'registry-declaration' },
]

export const getGame = (id) => GAME_REGISTRY.find((game) => game.id === id)

/**
 * Cross-chain Layer — RACE Protocol
 */

import { raceProtocolSetup, raceHealth, RACE_PROTOCOL_CONFIG } from './race.js'

export function crossChainLayerConfig(env = process.env) {
  const race = raceProtocolSetup({ gameId: 'generic' })
  return {
    layer: 'cross-chain',
    protocols: {
      race: RACE_PROTOCOL_CONFIG,
    },
    setups: { race },
    strategy: {
      multichain: {
        protocol: 'RACE Protocol',
        purpose: 'мультичейн-инфраструктура для безопасных и честных веб3-игр, TypeScript SDK + sdk-solana + CLI race-cli для публикации бандлов и управления аккаунтами, готовый слой для мультичейн-абстракции если экспансия за пределы Solana',
        useFor: 'Expansion beyond Solana — allow EVM players via RACE abstraction, cross-chain identity link Solana + EVM wallets, multichain marketplace cNFT Solana Tensor + NFT EVM OpenSea',
      },
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function crossChainHealth(env = process.env) {
  return {
    layer: 'cross-chain',
    generatedAt: new Date().toISOString(),
    race: raceHealth(env),
    summary: crossChainLayerConfig(env),
    writes: false,
  }
}

export { RACE_PROTOCOL_CONFIG }
export { raceProtocolSetup }

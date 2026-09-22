/**
 * Standard NFTs — для редких предметов
 * В паре с cNFT: cNFT для массовых, standard для редких
 */

export const STANDARD_NFT_CONFIG = {
  standard: 'Metaplex Token Metadata',
  programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  features: {
    mintAccount: true,
    tokenAccount: true,
    metadataAccount: true,
    masterEdition: true,
    royalties: true,
  },
  useCases: ['rare_items', 'legendary_weapons', 'founder_badges', 'land'],
}

export function standardNftCollection({ name, symbol, gameId, royaltyBps = 500 } = {}) {
  return {
    name,
    symbol: symbol || gameId.toUpperCase(),
    gameId,
    standard: STANDARD_NFT_CONFIG.standard,
    royaltyBps,
    isCollection: true,
    verified: false,
    dataQuality: 'partial',
    writes: false,
  }
}

export function assetStrategy({ gameId, itemType, rarity } = {}) {
  // Decision tree: cNFT vs standard
  const isMass = ['common', 'consumable', 'currency', 'material', 'lootbox_common'].includes(itemType) || rarity === 'common'
  const isRare = ['legendary', 'mythic', 'founder', 'land', 'unique'].includes(rarity) || ['legendary_weapon', 'founder_badge'].includes(itemType)

  if (isMass) {
    return {
      recommendation: 'cNFT',
      reason: `Массовый предмет (${itemType}, ${rarity}) — минтинг 1M за $110, off-chain хранение`,
      collectionType: 'bubblegum-v2',
      marketplace: 'tensor',
      cost: '$0.00011 per NFT',
    }
  }
  if (isRare) {
    return {
      recommendation: 'standard NFT',
      reason: `Редкий предмет (${itemType}, ${rarity}) — нужен отдельный mint/token аккаунт, полная индексация ME/Tensor`,
      collectionType: 'metaplex-standard',
      marketplace: 'magic-eden + tensor',
      cost: '~0.012 SOL per NFT',
    }
  }
  return {
    recommendation: 'cNFT',
    reason: 'Default to cNFT for scalability, upgrade to standard if secondary market premium needed',
    collectionType: 'bubblegum-v2',
    marketplace: 'tensor',
  }
}

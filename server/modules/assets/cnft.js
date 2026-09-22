/**
 * Сжатые NFT (cNFT) — экономика массовых предметов
 * - Минтинг до 1 млн NFT примерно за $110
 * - Данные off-chain, нет token/mint-аккаунта, связь через Merkle Tree и MCC
 * - Magic Eden прекращает индексацию новых cNFT — нужен Tensor и Bubblegum v2
 */

export const CNFT_CONFIG = {
  // Bubblegum v2 is current standard
  programId: 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY', // Bubblegum
  compressionProgram: 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L4ryFTWh', // Account Compression
  noTokenAccount: true,
  storage: 'off-chain',
  linkage: 'Merkle Tree + MCC (Metaplex Certified Collection)',
  economics: {
    costPerMillion: 110, // USD
    costPer1k: 0.11,
    vsStandardNft: 'x10000 cheaper',
  },
  warnings: {
    magicEden: 'Magic Eden прекращает индексацию новых cNFT-коллекций и постепенно снимает поддержку существующих',
    alternative: 'Tensor и др., поддерживающие Bubblegum v2',
    marketplace: 'Для торговли требуются альтернативные площадки',
  }
}

export function cnftCollectionConfig({ collectionName, gameId, merkleTreeAddress, mccAddress, maxSupply = 1_000_000 } = {}) {
  return {
    collectionName,
    gameId,
    standard: 'cNFT',
    version: 'bubblegum-v2',
    merkleTree: merkleTreeAddress || `mt_${gameId}_${Date.now()}`,
    mcc: mccAddress || `mcc_${gameId}_${Date.now()}`, // Metaplex Certified Collection
    maxSupply,
    estimatedCostUsd: (maxSupply / 1_000_000) * CNFT_CONFIG.economics.costPerMillion,
    storage: {
      type: 'off-chain',
      uriStorage: 'arweave / shadow drive / irys',
      noMintAccount: true,
      noTokenAccount: true,
      proof: 'merkle_proof',
    },
    metadata: {
      // Example for game items: common, rare, etc
      example: {
        name: `${collectionName} #123`,
        symbol: gameId.toUpperCase(),
        uri: `https://assets.${gameId}.watchtower.studio/metadata/123.json`,
        collection: mccAddress,
        creators: [],
        uses: { useMethod: 'single', remaining: 1, total: 1 }, // for consumables
      }
    },
    marketplaces: {
      supported: ['tensor', 'shyft', 'gameshift'],
      deprecated: ['magic-eden-cnft-new'], // ME stops indexing
      recommendation: 'Use Tensor Bubblegum v2 + Shyft Marketplace API (escrow-less)',
    },
    dataQuality: 'partial',
    writes: false,
  }
}

export function cnftMintPayload({ merkleTree, mcc, owner, metadata, gameId } = {}) {
  // This is what Unity/Godot/Unreal SDK would call
  return {
    instruction: 'mintV2',
    program: CNFT_CONFIG.programId,
    accounts: {
      merkleTree: merkleTree || `mt_${gameId}`,
      treeAuthority: `auth_${merkleTree}`,
      leafOwner: owner,
      leafDelegate: owner,
      collectionAuthority: `col_auth_${mcc}`,
      collection: mcc,
      payer: owner,
      compressionProgram: CNFT_CONFIG.compressionProgram,
    },
    args: {
      metadata: metadata || {
        name: 'Game Item',
        uri: 'https://...',
        sellerFeeBasisPoints: 500,
        collection: { key: mcc, verified: false },
        creators: [{ address: owner, verified: true, share: 100 }],
      }
    },
    offChain: true,
    costOptimized: true,
    writes: false,
  }
}

export function cnftMarketplaceAdapter({ marketplace = 'tensor' } = {}) {
  const adapters = {
    tensor: {
      marketplace: 'tensor',
      supports: ['cNFT', 'bubblegum-v2', 'MCC'],
      indexing: true,
      api: 'https://api.tensor.trade',
      endpoints: {
        list: '/api/v1/cnft/list',
        buy: '/api/v1/cnft/buy',
        collection: '/api/v1/cnft/collection',
      },
      note: 'Рекомендуется для cNFT после ухода Magic Eden',
    },
    'magic-eden': {
      marketplace: 'magic-eden',
      supports: ['cNFT (legacy)', 'MCC required'],
      warning: 'Прекращает индексацию новых cNFT-коллекций',
      indexing: 'deprecated_for_new',
      api: 'https://api-mainnet.magiceden.dev',
      endpoints: {
        list: '/v2/cnft/list',
        buy: '/v2/cnft/buy',
      },
      required: {
        mccAddress: true,
        merkleTreeAddresses: true,
      }
    },
    shyft: {
      marketplace: 'shyft',
      supports: ['cNFT', 'standard NFT', 'escrow-less'],
      model: 'escrow-less — NFT остаётся в кошельке до завершения продажи',
      api: 'https://api.shyft.to/sol/v1/marketplace',
    }
  }
  return adapters[marketplace] || adapters.tensor
}

export function cnftHealth(env = process.env) {
  return {
    layer: 'cnft',
    program: CNFT_CONFIG.programId,
    compression: CNFT_CONFIG.compressionProgram,
    bubblegumVersion: 'v2',
    economics: CNFT_CONFIG.economics,
    warnings: CNFT_CONFIG.warnings,
    configured: true,
    marketplaces: {
      tensor: cnftMarketplaceAdapter({ marketplace: 'tensor' }),
      magicEden: cnftMarketplaceAdapter({ marketplace: 'magic-eden' }),
      shyft: cnftMarketplaceAdapter({ marketplace: 'shyft' }),
    },
    dataQuality: 'partial',
    writes: false,
    generatedAt: new Date().toISOString(),
  }
}

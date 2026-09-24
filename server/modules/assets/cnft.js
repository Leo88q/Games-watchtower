/**
 * Сжатые NFT (cNFT) — экономика массовых предметов
 * - Минтинг до 1 млн NFT примерно за $110
 * - Данные off-chain, нет token/mint-аккаунта, связь через Merkle Tree и MCC
 * - Magic Eden прекращает индексацию новых cNFT — нужен Tensor и Bubblegum v2
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'

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
  if (!collectionName || !gameId) {
    return { ok: false, error: 'missing_required_fields: collectionName, gameId', writes: false, reason: 'Имя коллекции и gameId задаёт игра: хаб не придумывает их за неё' }
  }
  return {
    ok: true,
    collectionName,
    gameId,
    standard: 'cNFT',
    version: 'bubblegum-v2',
    // Адреса можно только объявить явно: Нельзя придумывать «похожий» адрес по времени — это ложный факт.
    merkleTree: merkleTreeAddress || null,
    mcc: mccAddress || null, // Metaplex Certified Collection
    requiresOnChainAddresses: !(merkleTreeAddress && mccAddress),
    reason: merkleTreeAddress && mccAddress ? null : 'Не переданы merkleTreeAddress и mccAddress: адреса выдаёт оператор после создания дерева и коллекции',
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
        symbol: String(gameId).toUpperCase(),
        // URI метаданных выдаёт хранилище игры: у хаба нет «своего» домена ассетов.
        uri: null,
        uriRequiredFrom: 'игра/хранилище метаданных (arweave, shadow drive, irys)',
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
  // Контракт вызова mintV2: адреса обязательны и приходят от оператора, а не «достраиваются» хабом.
  const missing = ['merkleTree', 'mcc', 'owner', 'gameId'].filter((key) => !({ merkleTree, mcc, owner, gameId })[key])
  if (missing.length) return { ok: false, error: `missing_required_fields: ${missing.join(', ')}`, writes: false }
  return {
    ok: true,
    instruction: 'mintV2',
    program: CNFT_CONFIG.programId,
    accounts: {
      merkleTree,
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
    configured: dependencyInstalled('@metaplex-foundation/mpl-bubblegum'),
    configurationReason: 'Пакет @metaplex-foundation/mpl-bubblegum не установлен',
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

/**
 * AI Agents Layer — Husks + Aureus + RitArena (best free) + RelayZero + StealthSDK
 * Ideal free stack analysis, deduplicated
 */

import { husksSdkSetup, husksHealth, HUSKS_SDK_CONFIG } from './husks.js'
import { aureusArenaSdkSetup, aureusHealth, AUREUS_ARENA_SDK_CONFIG } from './aureus.js'
import { ritarenaSetup, ritarenaHealth, RITARENA_CONFIG } from './ritarena.js'
import { relayzeroSetup, relayzeroHealth, RELAYZERO_CONFIG } from './relayzero.js'
import { stealthsdkSetup, stealthsdkHealth, STEALTHSDK_CONFIG } from './stealthsdk.js'

export function aiAgentsLayerConfig(env = process.env) {
  const husks = husksSdkSetup({ gameId: 'generic' })
  const aureus = aureusArenaSdkSetup({ gameId: 'generic' })
  const ritarena = ritarenaSetup({ gameId: 'generic' })
  const relayzero = relayzeroSetup({ gameId: 'generic' })
  const stealthsdk = stealthsdkSetup({ gameId: 'generic' })

  return {
    layer: 'ai-agents',
    sdks: {
      husks: HUSKS_SDK_CONFIG,
      aureus: AUREUS_ARENA_SDK_CONFIG,
      ritarena: RITARENA_CONFIG,
      relayzero: RELAYZERO_CONFIG,
      stealthsdk: STEALTHSDK_CONFIG,
    },
    setups: { husks, aureus, ritarena, relayzero, stealthsdk },
    idealFreeStack: {
      category: 'AI agents and autonomous worlds',
      bestFree: [
        { sdk: 'Husks SDK', why: 'Free onchain AI-autobattler NFT fighters procedural pixel INT8 neural nets training auto PvP, unique autobattler category', cost: 'free', useFor: 'ARES-1 potato fighters, AOF crop fighters, Neon Relay race AI bots, GUTTERCAPS collectible fighters' },
        { sdk: 'RitArena SDK', why: 'Free TypeScript SDK AI agents arena autonomous bots compete prizes full lifecycle management retry logic event emission, better free than Aureus (more complete lifecycle), chosen over Aureus as best free arena', cost: 'free', useFor: 'ARES-1 harvest tournament, AOF crafting tournament, Neon Relay racing tournament, GUTTERCAPS wagering tournament', chosenOver: 'Aureus Arena SDK (competitive duplicate, RitArena better free)' },
        { sdk: 'relayzero', why: 'Free TypeScript SDK agent economy network RelayZero integrating agents into game processes, distinct agent economy category', cost: 'free', useFor: 'agent economy integration game processes' },
        { sdk: 'StealthSDK', why: 'Free framework AI-games Solana ecosystem token STEALTH centralized game economy, distinct framework economy category', cost: 'free', token: 'STEALTH', useFor: 'AI-games framework centralized economy' },
      ],
      deprecated: [
        { sdk: 'Aureus Arena SDK', why: 'AI arena autonomous bots SOL/AUR prizes tournament, competitive duplicate with RitArena, both AI arena bots compete prizes, RitArena better free full lifecycle retry logic event emission, pick RitArena as best free', duplicateOf: 'RitArena SDK', recommendation: 'Use RitArena SDK as primary arena (best free), Aureus as legacy alternative' },
      ],
      complementary: 'Husks autobattler + RitArena arena lifecycle + relayzero agent economy + StealthSDK framework economy = full AI coverage, not competitive, each distinct action',
    },
    strategy: {
      autobattler: {
        sdk: 'Husks SDK',
        purpose: 'onchain AI-autobattler — summon NFT fighters procedural pixel graphics, train INT8 neural nets, automatic PvP',
        example: 'готовый пример интеграции AI-агентов в игровой процесс',
        useFor: 'ARES-1 potato fighters, AOF crop fighters, Neon Relay race AI bots, GUTTERCAPS collectible fighters via Gamba provably fair + Husks auto PvP',
      },
      arenaBestFree: {
        sdk: 'RitArena SDK',
        purpose: 'AI agents arena autonomous bots compete prizes full lifecycle retry logic event emission — best free',
        chosenOver: 'Aureus Arena SDK competitive duplicate, RitArena better free',
        useFor: 'ARES-1 harvest tournament autonomous bots, AOF crafting tournament, Neon Relay racing tournament autonomous race bots, GUTTERCAPS wagering tournament',
      },
      arenaLegacy: {
        sdk: 'Aureus Arena SDK',
        purpose: 'onchain AI arena autonomous bots compete for prizes SOL + AUR tokens — legacy, deprecated in favor of RitArena',
        status: 'deprecated competitive duplicate, use RitArena as best free',
      },
      agentEconomy: {
        sdk: 'relayzero',
        purpose: 'agent economy network RelayZero integrating agents into game processes',
        useFor: 'agent economy integration',
      },
      framework: {
        sdk: 'StealthSDK',
        purpose: 'framework AI-games Solana token STEALTH centralized game economy',
        useFor: 'AI-games framework economy',
      },
      integration: {
        nft: 'cNFT $110/M mass via Bubblegum v2 Tensor or standard rare via ME + Core Attributes on-chain key-value + Xandeum scalable exabyte',
        crossGame: 'ARC Entity-Component — fighter/bot entity same Components across games, studio_profile PDA',
        l2: 'Bolt fully on-chain verifiable + MagicBlock ER sub-10ms gasless + DePIN training/inference compute stake escrow rewards + Arcium confidential rollups',
        sessionKeys: 'Session key for frequent battles/competitions 0.01 SOL risk',
        marketplace: 'ME 120 QPM + Shyft escrow-less + GameShift USD 170+ 100% chargeback + Access Protocol stake-to-access',
        analytics: 'Helika cross-game win rate + GameSight ad->summon->train->battle->wager attribution solana_wallet external_id + Game Signals ML churn >85%',
        gamba: 'Gamba provably fair for wagering — house edge jackpot',
        bolt: 'Bolt fully on-chain verifiable — no server trust',
        privacy: 'PST private verifiable commitments + Arcium confidential computing rollups',
        storage: 'Xandeum exabyte scalable + Core Attributes on-chain key-value',
      }
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function aiAgentsHealth(env = process.env) {
  return {
    layer: 'ai-agents',
    generatedAt: new Date().toISOString(),
    husks: husksHealth(env),
    aureus: aureusHealth(env),
    ritarena: ritarenaHealth(env),
    relayzero: relayzeroHealth(env),
    stealthsdk: stealthsdkHealth(env),
    summary: aiAgentsLayerConfig(env).idealFreeStack,
    writes: false,
  }
}

export { HUSKS_SDK_CONFIG, AUREUS_ARENA_SDK_CONFIG, RITARENA_CONFIG, RELAYZERO_CONFIG, STEALTHSDK_CONFIG }
export { husksSdkSetup, aureusArenaSdkSetup, ritarenaSetup, relayzeroSetup, stealthsdkSetup }

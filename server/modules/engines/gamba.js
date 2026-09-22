/**
 * Gamba SDK (gamba-labs/gamba) — монорепозиторий для создания веб3-игр на ставки
 * Включает ядро для взаимодействия с Anchor-программой, React-хуки и UI-фреймворк для быстрой сборки игровых интерфейсов
 * Идеально если в одной из игр планируются механики ставок или элементы казино
 */

export const GAMBA_SDK_CONFIG = {
  sdk: 'gamba',
  repo: 'https://github.com/gamba-labs/gamba',
  type: 'monorepo',
  purpose: 'web3 betting / casino games',
  components: {
    core: 'ядро для взаимодействия с Anchor-программой Gamba — создание игр, ставки, расчет, вывод',
    reactHooks: 'React-хуки — useGamba, usePlay, useWager, useGame, useUserBalance',
    uiFramework: 'UI-фреймворк для быстрой сборки игровых интерфейсов — компоненты ставок, слотов, дайсов',
  },
  anchorProgram: 'Gamba program — provably fair, house edge, jackpot',
  idealFor: ['GUTTERCAPS wager PvP', 'Neon Relay prize pools', 'casino mini-games in AOF'],
}

export function gambaSdkSetup({ gameId, cluster = 'mainnet-beta' } = {}) {
  return {
    sdk: GAMBA_SDK_CONFIG.sdk,
    gameId,
    cluster,
    install: {
      npm: 'npm install gamba @gamba-labs/gamba-sdk @gamba-labs/react',
      monorepo: 'git clone https://github.com/gamba-labs/gamba',
    },
    anchorProgram: GAMBA_SDK_CONFIG.anchorProgram,
    components: GAMBA_SDK_CONFIG.components,
    codeExamples: {
      core: `
import { GambaClient } from 'gamba'
import { AnchorProvider } from '@coral-xyz/anchor'

const gamba = new GambaClient(provider, gambaProgramId)
// Create game — provably fair
const game = await gamba.createGame({ maxPayout: 100 * LAMPORTS_PER_SOL, houseEdge: 0.05 })
// Play — wager + random result on-chain verifiable
const play = await gamba.play({ wager: 0.1 * LAMPORTS_PER_SOL, gameId: game.id, clientSeed: randomSeed })
console.log("Result:", play.result, "Payout:", play.payout)
`,
      reactHooks: `
import { useGamba, usePlay, useWager } from '@gamba-labs/react'

function BettingGame() {
  const gamba = useGamba()
  const { play, result, payout } = usePlay()
  const { wager, setWager } = useWager()

  const handlePlay = async () => {
    // Wager from user wallet, provably fair via Gamba Anchor program
    await play({ wager: wager * LAMPORTS_PER_SOL, game: "dice" })
    // Track to Watchtower with solana_wallet for GameSight
    fetch('/api/ingest/solana', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'WagerCreated',
        gameId: 'guttercaps',
        payload: { wager, result, payout, solana_wallet: gamba.wallet.publicKey.toString() }
      })
    })
  }

  return <><input value={wager} onChange={e=>setWager(e.target.value)} /><button onClick={handlePlay}>Play provably fair</button><div>Result: {result} Payout: {payout}</div></>
}
`,
      uiFramework: `
import { GambaUi, WagerInput, GameResult, Jackpot } from '@gamba-labs/react-ui'

function CasinoUI() {
  return (
    <GambaUi>
      <WagerInput />
      <GameResult />
      <Jackpot />
    </GambaUi>
  )
}
`,
      provablyFair: `
# Gamba — provably fair mechanics
# Client seed + server seed + nonce -> hash -> result verifiable on-chain
# House edge configurable, jackpot pool
# Ideal for GUTTERCAPS: Pack buy/open as wager, VRF reveal, fusion as gamble, PvP wager
# Neon Relay: prize epoch as jackpot, ticket as wager
`,
      watchtower: `
# Events for Watchtower
# WagerCreated, WagerSettled, JackpotWon, HouseEdgeCollected
# All with solana_wallet for GameSight attribution + Helika dashboard
# Cross-game: wager in GUTTERCAPS -> reward in ARES-1 via studio_profile PDA
`,
    },
    useCases: {
      guttercaps: 'Pack buy/open as wager, VRF reveal, fusion gamble, PvP wager, SKR pool jackpot — use Gamba core for provably fair',
      neonRelay: 'Ticket as wager, prize epoch as jackpot, race finish as random result — Gamba hooks for betting UI',
      aof: 'Crafting gamble, market trading as betting — optional casino mini-game',
      ares1: 'Harvest as wager with risk, order fill as payout — optional',
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      events: ['WagerCreated', 'WagerSettled', 'JackpotWon', 'PackOpened', 'WagerCreated'],
      program: 'Gamba Anchor program + your game program',
      analytics: 'Helika + GameSight — wager conversion, payer LTV, churn prediction via Game Signals',
      sessionKeys: 'Session key for frequent wagers — risk 0.01 SOL',
      marketplace: 'Wager result NFT as cNFT $110/M via Tensor',
    },
    writes: false,
  }
}

export function gambaHealth(env = process.env) {
  return {
    sdk: GAMBA_SDK_CONFIG.sdk,
    type: GAMBA_SDK_CONFIG.type,
    purpose: GAMBA_SDK_CONFIG.purpose,
    components: Object.keys(GAMBA_SDK_CONFIG.components),
    idealFor: GAMBA_SDK_CONFIG.idealFor,
    configured: true,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

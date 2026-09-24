/**
 * Solana Game API (Rust) (dariusjvc/solana-game-api-rust)
 * Бэкенд-приложение на Rust (Actix Web) которое предоставляет API для взаимодействия с Solana-программой
 * Включает эндпоинты для создания игры, присоединения, расчета и вывода средств
 * Поддерживает Swagger для документации и тестирования
 * Хороший референс для построения собственного высокопроизводительного бэкенда
 */

import { dependencyInstalled, anyEnvConfigured } from '../_support/installed.js'

export const SOLANA_GAME_API_RUST_CONFIG = {
  project: 'Solana Game API Rust',
  repo: 'https://github.com/dariusjvc/solana-game-api-rust',
  owner: 'dariusjvc',
  stack: 'Rust + Actix Web',
  purpose: 'backend API for Solana program interaction — create game, join, calculate, withdraw',
  features: {
    actixWeb: true,
    highPerformance: true,
    swagger: true,
    solanaProgram: true,
    endpoints: ['create game', 'join', 'calculate', 'withdraw'],
  },
  reference: 'Хороший референс для построения собственного высокопроизводительного бэкенда',
}

export function solanaGameApiRustSetup({ gameId } = {}) {
  return {
    project: SOLANA_GAME_API_RUST_CONFIG.project,
    gameId,
    repo: SOLANA_GAME_API_RUST_CONFIG.repo,
    stack: SOLANA_GAME_API_RUST_CONFIG.stack,
    purpose: SOLANA_GAME_API_RUST_CONFIG.purpose,
    features: SOLANA_GAME_API_RUST_CONFIG.features,
    install: {
      clone: `git clone ${SOLANA_GAME_API_RUST_CONFIG.repo}`,
      cargo: 'cargo run --release',
      swagger: 'http://localhost:8080/swagger-ui/',
    },
    architecture: {
      overview: `
Rust Actix Web backend:
- High-performance — Rust + Actix Web
- Solana program interaction — Anchor client in Rust
- Endpoints: create game, join, calculate, withdraw
- Swagger docs + testing

For Watchtower OS — reference for building own high-performance backend for 4 games
Replace with: studio backend that handles game logic + Solana + DePIN + L2 + Session Keys + cNFT

Structure:
src/
├── main.rs — Actix Web server
├── api/
│   ├── game.rs — create game, join, calculate, withdraw
│   ├── player.rs — player profile, cross-game
│   ├── economy.rs — mint/burn, treasury
│   └── marketplace.rs — list/buy
├── solana/
│   ├── client.rs — RpcClient + Anchor
│   ├── programs.rs — game program IDs CgInv SessKeys STrEaSuRy + 4 games
│   └── cNFT.rs — Bubblegum mintV2
├── models/
│   ├── game.rs
│   ├── player.rs
│   └── economy.rs
└── swagger.rs — Swagger UI
`,
      endpoints: {
        createGame: `
POST /api/game/create
{
  "game_id": "ares1",
  "max_players": 100,
  "entry_fee": 0.1
}
-> { "game_pda": "GamePDA...", "tx_signature": "..." }

Rust Actix:
#[post("/api/game/create")]
async fn create_game(req: web::Json<CreateGameRequest>, solana_client: web::Data<SolanaClient>) -> impl Responder {
    let game_pda = solana_client.create_game(&req.game_id, req.max_players, req.entry_fee).await;
    HttpResponse::Ok().json(CreateGameResponse { game_pda, tx_signature })
}
`,
        joinGame: `
POST /api/game/join
{
  "game_id": "ares1",
  "player_wallet": "Wallet123...",
  "session_key": "SessionKey123..." // session keys for frequent actions
}
-> { "player_pda": "PlayerPDA...", "session_token": "...", "tx_signature": "..." }

Rust:
#[post("/api/game/join")]
async fn join_game(req: web::Json<JoinGameRequest>, solana_client: web::Data<SolanaClient>) -> impl Responder {
    let player_pda = solana_client.join_game(&req.game_id, &req.player_wallet, &req.session_key).await;
    // Create session key: 0.01 SOL topUp, 60min expiry
    let session = create_session(target_program, 0.01 * LAMPORTS, 60, req.player_wallet);
    HttpResponse::Ok().json(JoinGameResponse { player_pda, session_token: session.token, tx_signature })
}
`,
        calculate: `
POST /api/game/calculate
{
  "game_id": "ares1",
  "player_pda": "PlayerPDA...",
  "action": "harvest_potato",
  "params": { "field_id": "field_123" }
}
-> { "result": "harvested", "reward": 10, "new_score": 100, "tx_signature": "..." }

Rust:
#[post("/api/game/calculate")]
async fn calculate(req: web::Json<CalculateRequest>, solana_client: web::Data<SolanaClient>) -> impl Responder {
    let result = solana_client.calculate(&req.game_id, &req.player_pda, &req.action, &req.params).await;
    // Fully on-chain via Bolt or ARC + session key
    // Track to Watchtower: POST /api/ingest/solana { eventType: "PotatoHarvested", gameId, payload: { solana_wallet, reward } }
    HttpResponse::Ok().json(result)
}
`,
        withdraw: `
POST /api/game/withdraw
{
  "game_id": "ares1",
  "player_wallet": "Wallet123...",
  "amount": 0.5
}
-> { "tx_signature": "...", "new_balance": 1.5 }

Rust:
#[post("/api/game/withdraw")]
async fn withdraw(req: web::Json<WithdrawRequest>, solana_client: web::Data<SolanaClient>) -> impl Responder {
    // Check vault >= liabilities invariant
    // Only via multisig + timelock for treasury, player withdraw via game program
    let tx_sig = solana_client.withdraw(&req.game_id, &req.player_wallet, req.amount).await;
    HttpResponse::Ok().json(WithdrawResponse { tx_signature: tx_sig })
}
`,
        swagger: `
# Swagger UI — http://localhost:8080/swagger-ui/
# Auto docs for all endpoints, testing via UI
# Good for studio — frontend teams can test backend without Solana knowledge
`,
      },
    },
    codeExamples: {
      rustActix: `
use actix_web::{web, App, HttpServer, HttpResponse, Responder, post};
use solana_client::rpc_client::RpcClient;
use anchor_client::{Client, Cluster};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let solana_client = web::Data::new(SolanaClient::new("https://api.mainnet-beta.solana.com"));

    HttpServer::new(move || {
        App::new()
            .app_data(solana_client.clone())
            .service(create_game)
            .service(join_game)
            .service(calculate)
            .service(withdraw)
            .service(swagger_ui)
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}

pub struct SolanaClient {
    rpc: RpcClient,
    // Anchor programs: CgInv111..., SessKeys111..., STrEaSuRy111..., ARES1, AOF, NeonRelay, GUTTERCAPS
}

impl SolanaClient {
    pub fn new(rpc_url: &str) -> Self {
        Self { rpc: RpcClient::new(rpc_url.to_string()) }
    }
    pub async fn create_game(&self, game_id: &str, max_players: u64, entry_fee: u64) -> String {
        // Call Anchor program create_game
        // Return game_pda + tx_signature
        "GamePDA...".to_string()
    }
    // ... join, calculate, withdraw
}
`,
      watchtower: `
# Watchtower integration — Rust backend as reference for high-performance backend

# 1. Rust Actix Web backend for 4 games — create game, join, calculate, withdraw
# 2. Solana program interaction — Anchor client Rust, session keys, cNFT Bubblegum, L2 Sonic MagicBlock
# 3. Swagger UI for docs + testing — frontend teams test without Solana knowledge
# 4. Watchtower: POST /api/ingest/solana for all game events with solana_wallet
# 5. DePIN: offload matchmaking physics to DePIN workers via escrow staking rewards
# 6. High-performance: Rust + Actix Web vs Node.js — for high TPS games ARES-1 Neon Relay

# For studio — build own Rust backend based on this reference:
# - Game logic: Bolt fully on-chain + ARC Entity-Component
# - L2: Sonic HyperGrid + MagicBlock ER
# - Session Keys: 0.01 SOL risk
# - cNFT: $110/M Bubblegum v2
# - Marketplace: ME 120 QPM + Shyft escrow-less + GameShift USD
# - Analytics: Helika + GameSight solana_wallet external_id + Game Signals ML churn >85%
`,
    },
    useCases: {
      ares1: 'Rust backend for potato colony — create game, join with session key, calculate harvest, withdraw reward — high-performance for high TPS',
      neonRelay: 'Rust backend for racing — create race, join, calculate finish, withdraw prize — real-time via MagicBlock ER sub-10ms',
      aof: 'Rust backend for farming — create plot, join, calculate craft, withdraw — casual + gasless via MagicBlock',
      guttercaps: 'Rust backend for collectibles + wagering — create pack, join, calculate open/fusion/wager, withdraw — provably fair via Gamba + Bolt verifiable',
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      backend: 'Rust Actix Web high-performance — create game, join, calculate, withdraw',
      swagger: 'Swagger UI for docs + testing — frontend teams test without Solana knowledge',
      solana: 'Anchor client Rust — CgInv SessKeys STrEaSuRy + 4 games + cNFT Bubblegum + L2 Sonic MagicBlock',
      depin: 'Offload matchmaking physics to DePIN workers stake escrow rewards',
      analytics: 'Track all events with solana_wallet for GameSight Late ID Binding + Helika + Game Signals ML churn',
      reference: 'Good reference for building own high-performance backend',
    },
    writes: false,
  }
}

export function solanaGameApiRustHealth(env = process.env) {
  return {
    project: SOLANA_GAME_API_RUST_CONFIG.project,
    repo: SOLANA_GAME_API_RUST_CONFIG.repo,
    stack: SOLANA_GAME_API_RUST_CONFIG.stack,
    purpose: SOLANA_GAME_API_RUST_CONFIG.purpose,
    features: Object.keys(SOLANA_GAME_API_RUST_CONFIG.features),
    reference: SOLANA_GAME_API_RUST_CONFIG.reference,
    configured: false,
    configurationReason: 'Внешний Rust-сервис, хаб его не запускает',
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

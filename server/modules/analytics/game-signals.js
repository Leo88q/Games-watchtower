/**
 * Solana Game Signals (joshuatochinwachi/Solana-Game-Signals-and-Predictive-Modelling)
 * Платформа агрегирует 60M+ ончейн-транзакций из 12 игр и с помощью ML предсказывает отток игроков за 14 дней с точностью >85%
 * Умеет находить общих игроков между разными играми на основе общих кошельков
 * Для мультитенантного ПО — прямой путь к кросс-игровому удержанию и пониманию какая воронка приводит самых ценных пользователей
 */

export const GAME_SIGNALS_CONFIG = {
  project: 'Solana Game Signals and Predictive Modelling',
  repo: 'https://github.com/joshuatochinwachi/Solana-Game-Signals-and-Predictive-Modelling',
  owner: 'joshuatochinwachi',
  data: {
    transactions: '60M+ onchain transactions',
    games: 12,
    ml: 'ML predicts churn 14 days with >85% accuracy',
    crossGame: 'finds common players between different games based on common wallets',
  },
  purpose: 'кросс-игровое удержание и понимание какая воронка приводит самых ценных пользователей',
}

export function gameSignalsSetup({ gameId } = {}) {
  return {
    project: GAME_SIGNALS_CONFIG.project,
    gameId,
    repo: GAME_SIGNALS_CONFIG.repo,
    data: GAME_SIGNALS_CONFIG.data,
    purpose: GAME_SIGNALS_CONFIG.purpose,
    install: {
      clone: `git clone ${GAME_SIGNALS_CONFIG.repo}`,
      pip: 'pip install -r requirements.txt',
      python: 'python train_churn_model.py --transactions 60M --games 12',
    },
    features: {
      aggregation: '60M+ onchain transactions from 12 games',
      churnPrediction: 'ML predicts churn 14 days >85% accuracy',
      crossGamePlayers: 'finds common players based on common wallets — same as Watchtower crossGameSegments',
      funnelValue: 'understands which funnel brings most valuable users — payer LTV, retention',
      signals: ['wallet activity', 'session frequency', 'economy flows', 'social interactions', 'marketplace activity'],
    },
    mlModels: {
      churn: {
        name: 'Churn Prediction 14 days',
        accuracy: '>85%',
        input: ['last active', 'session count 7d', 'economy volume', 'social connections', 'cross-game count', 'marketplace activity', 'reward claim frequency'],
        output: 'churn probability 0-1 per player',
        useFor: 'proactive retention — offer bonus before churn, cross-game invitation if churn in one game but active in another',
      },
      crossGame: {
        name: 'Common Players Finder',
        method: 'common wallets across games',
        input: ['wallet addresses across 4 games'],
        output: 'cross-game player clusters',
        useFor: 'Watchtower crossGameSegments — players in 1/2/3-4 games, already implemented, enhance with ML',
      },
      funnelValue: {
        name: 'Funnel Value Predictor',
        input: ['first entry source campaign_id, sourceType, pageId', 'conversion steps', 'payer conversion', 'LTV'],
        output: 'predicted LTV per funnel source',
        useFor: 'which funnel brings most valuable users — SEO/GEO vs X/Twitter Blinks vs short videos vs whale radar vs TipLink',
      },
      anomaly: {
        name: 'Anomaly Detection',
        input: ['economy flows mint/burn', 'player behavior', 'marketplace volume'],
        output: 'anomalous wallets, wash trading, bot signals',
        useFor: 'security — multi-account detection, bot, fraud',
      }
    },
    codeExamples: {
      python: `
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Load 60M+ transactions from 12 games — aggregated via LaserStream + custom PG + Shyft
df = pd.read_sql("SELECT * FROM parsed_events WHERE gameId IN ('ares1','aof','neonrelay','guttercaps')", pg_connection)
# Features: wallet activity, session frequency, economy flows, etc
features = df.groupby('playerKey').agg({
    'blockTime': ['count', 'max'], # session count, last active
    'payload_amount': 'sum', # economy volume
    'gameId': 'nunique', # cross-game count
    'eventType': 'count', # total activity
})

# Churn label: inactive 14 days
features['churn_14d'] = (pd.Timestamp.now() - features[('blockTime','max')] > pd.Timedelta(days=14)).astype(int)

X = features.drop('churn_14d', axis=1)
y = features['churn_14d']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)
accuracy = model.score(X_test, y_test) # >85% expected

# Predict churn for current players
current_players = features[features[('blockTime','max')] > pd.Timestamp.now() - pd.Timedelta(days=7)]
churn_probs = model.predict_proba(current_players)[:,1]

# For high churn prob >0.7 — proactive retention via Watchtower campaigns
for player_key, churn_prob in zip(current_players.index, churn_probs):
    if churn_prob > 0.7:
        # Create campaign proposal: bonus, cross-game invitation
        # POST /api/campaigns/proposals { playerGroup, offer, reason: f"churn risk {churn_prob:.2f}" }
        pass
`,
      crossGame: `
# Common players finder — same wallets across games

# Query PG for wallets across games
wallets_per_game = {
    'ares1': set(pd.read_sql("SELECT DISTINCT wallet FROM player_profiles WHERE gameId='ares1'", pg)['wallet']),
    'aof': set(pd.read_sql("SELECT DISTINCT wallet FROM player_profiles WHERE gameId='aof'", pg)['wallet']),
    'neonrelay': set(pd.read_sql("SELECT DISTINCT wallet FROM player_profiles WHERE gameId='neonrelay'", pg)['wallet']),
    'guttercaps': set(pd.read_sql("SELECT DISTINCT wallet FROM player_profiles WHERE gameId='guttercaps'", pg)['wallet']),
}

# Find common
common_ares1_neonrelay = wallets_per_game['ares1'] & wallets_per_game['neonrelay']
common_all_4 = set.intersection(*wallets_per_game.values())

# Cross-game segments for Watchtower: already implemented crossGameSegments
# 1 game 68%, 2 games 24%, 3-4 games 8% — enhance with ML

# For players in 1 game only — cross-game invitation campaign
# For players in 2 games — best segment for offers
# For players in 3-4 games — core ecosystem
`,
      funnelValue: `
# Funnel value predictor — which funnel brings most valuable users

# Join trafficgen events (SEO/GEO, X/Twitter Blinks, short videos, whale radar, TipLink) with on-chain payer conversion LTV
traffic = pd.read_sql("SELECT * FROM raw_events WHERE source='trafficgen'", pg)
payers = pd.read_sql("SELECT * FROM economy_flows WHERE eventType='PurchaseCompleted'", pg)

# Attribution via solana_wallet as external_id Late ID Binding + gamesight_click_id
funnel_ltv = traffic.merge(payers, left_on='sessionId', right_on='playerKey', how='left')
funnel_ltv_per_source = funnel_ltv.groupby('sourceType').agg({ 'amount': ['mean', 'sum', 'count'] })

# Result: which source brings highest LTV — e.g., whale radar > TipLink > SEO
# Use for budget allocation — invest more in high LTV funnels
`,
      watchtower: `
# Watchtower integration

# 1. Data: LaserStream gRPC + Shyft + custom PG already aggregates 60M+ transactions — use for ML
# 2. ML: train churn model >85% accuracy, cross-game finder, funnel value predictor, anomaly detection
# 3. Watchtower API: /api/ingest/solana events with solana_wallet + sessionId + sourceType + campaignId
# 4. Campaigns: POST /api/campaigns/proposals for high churn risk players — bonus, cross-game invitation
# 5. Analytics: Helika cross-game dashboard + GameSight attribution + Game Signals ML churn prediction
# 6. Frontend: OS panel shows churn risk, cross-game players, funnel LTV

# Example: churn risk 0.8 for player in ARES-1 only, but common wallet with Neon Relay active — invite to ARES-1 with bonus
# Example: funnel whale radar brings LTV $50 vs SEO $5 — allocate budget to whale radar
`,
    },
    watchtowerIntegration: {
      endpoint: '/api/ingest/solana',
      data: 'LaserStream + Shyft + PG already aggregates — 60M+ transactions',
      ml: 'Churn 14d >85% accuracy, cross-game common wallets, funnel LTV, anomaly',
      campaigns: 'POST /api/campaigns/proposals for high churn risk — proactive retention',
      analytics: 'Helika cross-game dashboard + GameSight attribution + Game Signals ML',
      crossGame: 'crossGameSegments already — 1 game 68% 2 games 24% 3-4 games 8% — enhance with ML common wallets',
      funnel: 'buildFunnel first entry -> first action -> D1 -> D7 -> purchase -> second game + funnel LTV per sourceType',
      frontend: 'OS panel churn risk, cross-game, funnel LTV',
    },
    writes: false,
  }
}

export function gameSignalsHealth(env = process.env) {
  return {
    project: GAME_SIGNALS_CONFIG.project,
    repo: GAME_SIGNALS_CONFIG.repo,
    data: GAME_SIGNALS_CONFIG.data,
    purpose: GAME_SIGNALS_CONFIG.purpose,
    features: ['aggregation 60M+ 12 games', 'churn 14d >85%', 'cross-game common wallets', 'funnel value LTV', 'anomaly detection'],
    mlModels: ['churn', 'crossGame', 'funnelValue', 'anomaly'],
    configured: true,
    writes: false,
    dataQuality: 'partial',
    generatedAt: new Date().toISOString(),
  }
}

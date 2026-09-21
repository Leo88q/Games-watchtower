# Cross-game campaign flow

Campaign recommendations are created from anonymized player groups only.

## Read endpoints

```text
GET /api/players/cross-game
GET /api/campaigns/recommendations
GET /api/campaigns/status
```

## Proposal endpoint

```text
POST /api/campaigns/proposals
```

Example body:

```json
{
  "recommendationId": "rec-p-a13f42bd81",
  "channel": "in_game",
  "message": "Попробуйте новую игру"
}
```

The proposal only enters `pending_review`. It does not send a message, grant a reward, change a player, or write to a blockchain.

Required production gates:

- consent/opt-out check;
- fraud exclusion;
- frequency cap;
- campaign budget;
- operator approval;
- delivery provider audit;
- attribution and rollback.

# Смежная аналитика

Endpoint:

```text
GET /api/analytics/adjacent
```

Разделы:

- вовлечённость — active players, доля новых, возвращаемость и cross-game groups;
- монетизация — volume, volume per active player, payer conversion, repeat purchase;
- устойчивость экономики — minted, burned, net issuance, burn/mint ratio, treasury runway;
- надёжность — подключённые игры, ingestion events, duplicates, rejected events, RPC health;
- риск и доверие — critical/high incidents, suspicious players, block rate, data coverage.

Все показатели возвращаются вместе с `dataQuality` и интерпретацией. Пока реальные цепочные события не подключены, часть метрик намеренно возвращается как `partial` или `unavailable`.

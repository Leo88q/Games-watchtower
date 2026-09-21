# Быстрый чек-лист для проекта

Перед подключением к Watchtower проект должен передать:

- verified program IDs;
- network и deployment commit;
- IDL и parser version;
- mint/treasury/PDA addresses;
- read-only exporter;
- normalized events;
- player/session events;
- retention events;
- economy flows;
- treasury/liabilities;
- fraud signals;
- health/ready/metrics;
- backfill/replay status;
- data quality и confidence;
- consent/opt-out для cross-game campaigns.

Минимальные команды:

```bash
npm test
npm run build
npm run smoke
```

Приватные ключи, admin tokens и signer credentials в Watchtower не передаются.

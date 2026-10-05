# Набор подключения игры к партнёрской программе

Подключение одной игры (ARES-1, NeuroForge, GUTTERCAPS, Neon Relay) к партнёрской программе Leo Games
состоит из трёх шагов. Правила программы описаны в [docs/PARTNER_PROGRAM_PILOT.md](../../docs/PARTNER_PROGRAM_PILOT.md).

| Шаг | Где | Модуль |
|---|---|---|
| 1. Запомнить код приглашения и язык из ссылки | страница игры | `browser.js` |
| 2. Передавать вахте прогресс игрока с кодом и страной | бэкенд игры | `server.js`: `sendProgressReports` |
| 3. Принимать выдачу наград партнёру | бэкенд игры | `server.js`: `createGrantHandler` |

У набора нет зависимостей. `browser.js` работает в любом браузере, `server.js` требует Node.js 18+ (`node:crypto`).
Файлы можно скопировать в репозиторий игры как есть.

## Секреты

Студия создаёт для игры два секрета (каждый не короче 32 символов, например `openssl rand -hex 32`)
и задаёт их на вахте и в игре:

| Вахта | Игра | Для чего |
|---|---|---|
| `GAME_PROGRESS_SECRET_ARES1` | `GAME_PROGRESS_SECRET` | подпись отчётов игра → вахта |
| `PARTNER_GRANT_SECRET_ARES1` | `PARTNER_GRANT_SECRET` | подпись выдач вахта → игра |
| `PARTNER_GRANT_URL_ARES1` | — | адрес приёма выдач в игре (https в продакшене) |

Секреты хранятся только на серверах и никогда не попадают в браузер.

## 1. Страница игры

Игрок приходит по ссылке с портала: `https://ares1-7e1.pages.dev/?lang=es&ref=K7M2Q9XA`.

```js
import { capturePartnerParams, pickLanguage, clearPartnerRef } from './partner-kit/browser.js'

// Как можно раньше при загрузке страницы
const { ref } = capturePartnerParams({ cleanUrl: true })
const lang = pickLanguage(['en', 'pt', 'es', 'vi', 'id', 'fil', 'ru'])
i18n.setLanguage(lang)

// При регистрации или первом входе кошельком передайте код своему бэкенду
await api.signup({ wallet, ref })
clearPartnerRef()
```

- Код хранится 30 дней. Если игрок раньше пришёл по другой ссылке, остаётся первый код.
- `cleanUrl: true` убирает `ref` из адресной строки, чтобы игрок не переслал чужой код дальше.
- Языки студии: en, pt, es, vi, id, fil, ru. Тагальский (`tl`) считается филиппинским. Малайского нет:
  игроки из Малайзии получат запасной язык (английский).

## 2. Отчёты о прогрессе

```js
import { sendProgressReports, countryFromHeaders } from './partner-kit/server.js'

await sendProgressReports({
  watchtowerUrl: 'https://watchtower.example',
  game: 'ares1',
  secret: process.env.GAME_PROGRESS_SECRET,
  reports: [{
    wallet: player.wallet,          // адрес Solana
    hours: player.totalHours,       // всего часов в этой игре
    rank: player.rank,              // целое 0–100
    updatedAt: player.lastPlayedAt, // мс; время игры, а не время отправки
    ref: player.partnerRef,         // код из шага 1; достаточно в первом отчёте
    country: player.country,        // ISO 3166-1 alpha-2, если известна
  }],
})
// → { accepted, stale, rejected: [{ index, reason }] }
```

- Отправляйте отчёт, когда растут часы игрока: раз в 10–30 минут игры или при выходе. До 500 отчётов за
  запрос, до 600 запросов в минуту на игру.
- Вахта засчитывает день активности по `updatedAt`. Если поставить туда время отправки, при повторной
  отправке появятся лишние дни, поэтому нужно время последней игры.
- Страна влияет на то, можно ли наградить партнёра токенами (в Великобритании нельзя). Если игра стоит
  за Cloudflare, Vercel или CloudFront, используйте `countryFromHeaders(req.headers, { trustProxy: true })`
  при регистрации. Включайте `trustProxy`, только если запросы точно идут через CDN.
- Ошибки: при 401 проверьте секрет и часы сервера (допуск ±5 минут), 403 — игра не подключена на вахте,
  при 429 и 503 повторите позже.

## 3. Приём выдачи наград

После 14 дней заморозки вахта отправляет игре запрос: «выдай партнёру с кошельком X 50 POTATO и 1 ящик
семян». Ваша задача — начислить это в игре.

```js
import express from 'express'
import { createGrantHandler, nodeGrantListener, GrantRejected } from './partner-kit/server.js'

const handleGrant = createGrantHandler({
  secret: process.env.PARTNER_GRANT_SECRET,
  game: 'ares1',
  store: grantStore,                 // постоянное хранилище, см. ниже
  async applyGrant(grant) {
    const player = await db.players.byWallet(grant.wallet)
    if (!player) throw new GrantRejected('wallet unknown to the game')
    const op = await db.inventory.credit(player.id, grant.tokens, grant.items, { source: 'partner', grantId: grant.grantId })
    return { reference: op.id }       // номер операции увидит сотрудник студии
  },
})

const app = express()
app.post('/partner/grant', nodeGrantListener(handleGrant)) // без express.json() перед этим маршрутом
```

Что приходит в `grant`:

```json
{ "grantId": "1f0c…-uuid", "game": "ares1", "wallet": "<адрес партнёра>",
  "reason": "partner_referral", "milestone": null, "partnerKind": "player",
  "tokens": { "symbol": "POTATO", "amount": 50 },
  "items": [ { "id": "ares1.seed_crate", "kind": "item", "amount": 1 } ],
  "issuedAt": 1791216000000 }
```

- `reason: "partner_milestone"` — веха за 5/25/100 игроков, `milestone` — её номер, токенов в вехах нет.
- `tokens` равно `null`, если в стране партнёра или приглашённого токены запрещены; тогда в `items` будет косметика-замена.
- `kind`: `item` (предмет), `cosmetic` (косметика), `title` (звание). Идентификаторы задаёт каталог студии
  (`DEFAULT_CATALOG` в `server/operations/partner-rewards.js` или файл `PARTNER_REWARD_CATALOG_FILE`).
  Названия должны совпадать с теми, что есть в игре.

Что делает набор:

- проверяет подпись, срок (±5 минут), совпадение `x-watchtower-grant` с `grantId`, игру и форму данных;
- не начисляет один `grantId` дважды: повтор после таймаута или перезапуска вахты получает сохранённый ответ;
- отказ (`GrantRejected`) сохраняется навсегда, вахта показывает его сотруднику;
- любая другая ошибка даёт ответ 500, и вахта повторит запрос позже (30 с, 2 мин, 10 мин, 30 мин, 1 ч).

**Хранилище результатов.** `memoryGrantStore()` годится только для проверки. В продакшене `store` — это
`{ get(grantId), set(grantId, result) }` поверх базы игры. Запись должна быть атомарной (уникальный ключ
по `grant_id`), а начисление и запись результата — в одной транзакции. Иначе при двух экземплярах
игры награду можно начислить дважды.

## Проверка без игры

`example-game-server.mjs` — стенд с «инвентарём» в памяти:

```bash
GAME=ares1 PARTNER_GRANT_SECRET=<секрет> GAME_PROGRESS_SECRET=<секрет> \
WATCHTOWER_URL=http://127.0.0.1:8787 PORT=9100 node sdk/partner-kit/example-game-server.mjs
```

На вахте задайте `PARTNER_GRANT_URL_ARES1=http://127.0.0.1:9100/partner/grant` и те же секреты. Стенд
отправляет отчёты через `POST /dev/report` и показывает начисленное через `GET /dev/inventory?wallet=`.
Весь путь (переход по ссылке, три дня игры, заморозка 0 дней, выдача, номер операции у сотрудника)
проверяет `npm run test:partner-kit`.

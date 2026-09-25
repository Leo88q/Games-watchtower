# Публичные площадки: сайт Watchtower OS и лендинг $WTWR

Две статические двуязычные (RU по умолчанию, EN рядом) площадки без бэкенда и без сборки.
Они работают по тем же принципам, что и продукт: **никаких выдуманных цифр**, всё плановое
помечено планом, всё скрытое — скрыто до появления параметра, а не притворяется.

| Площадка | Каталог | Назначение |
|---|---|---|
| Сайт Watchtower OS | `watchtower-site/` (`index.html` = RU, `en.html` = EN) | продукт, модули, полный инвентарь возможностей (#capabilities), цены Studio API, четыре пути развития + линия времени (#roadmap), лист ожидания API |
| Лендинг $WTWR | `token-landing/` | токеномика, три раунда (NFT + пресейл), стейкинг CapsStake, Compute Grid, риски, вайтлист |
| Общий слой | `web-shared/` | трекер переходов, параметры запуска, логика форм, favicon, OG-обложки |

Предпросмотр без зависимостей:

```bash
npm run site:preview      # http://localhost:4173/watchtower-site/ · /token-landing/
```

Проверки (в CI, гейт как у остальных тестов):

```bash
npm run test:site         # 12 проверок: сходимость чисел, паритет RU/EN, анти-хайп стоп-лист,
                          # существование ресурсов, кросс-ссылки, no-drift трекера, безопасные CTA
```

## Как устроены данные и логика

```
watchtower-site/*.html ──► web-shared/wt-params.js   параметры запуска (1 файл на всё)
token-landing/*.html   ──► web-shared/wt-landing.js  подтверждение перехода TalkChart (click-id)
                           web-shared/wt-forms.js    формы вайтлиста + «просыпающиеся» CTA
                           web-shared/favicon.svg · og-watchtower.jpg · og-wtwr.jpg
token-landing только ──► token-data.mjs (числа) ──► token-render.mjs (рендер + самопроверка)
```

- **`token-landing/token-data.mjs`** — единственный источник чисел лендинга (аллокация,
  use of funds, железо, раунды, сценарии дивиденда). RU и EN страницы рендерят таблицы из
  него, поэтому языковые версии численно разойтись не могут. `validateTokenData()` гоняется
  в браузере (плашка «✓ цифры сходятся…» в подвале) и в `test:site`.
- **`web-shared/wt-params.js`** — единственный файл, который правится перед стартом продажи:
  `FORM_ENDPOINT`, `MARKETPLACE_URL`, `NFT_TERMS_URL`, `CONTACT_URL`, `TRAFFICGEN_URL`,
  фактические `raised.*` (только по транзакциям казны).
- **`web-shared/wt-forms.js`** — вайтлисты (`form[data-wt-waitlist]`): валидация e-mail,
  honeypot, POST JSON на `FORM_ENDPOINT`; без endpoint — честное демо-сообщение. Ссылки
  `a[data-wt-buy]` / `a[data-wt-contact]` / `[data-wt-terms]` скрыты в разметке и появляются
  только когда соответствующий параметр задан.
- **`web-shared/wt-landing.js`** — байт-в-байт копия `patches/games/wt-landing.js`
  (тест no-drift падает при расхождении: правится патч, копия синхронизируется).
  Страницы помечены `wt-page`: `target_wtos_ru/en`, `target_wtwr_ru/en` — TalkChart может
  использовать их как 4 целевые страницы. `wt_click` вычищается из адресной строки,
  DNT/GPC уважаются; `clickId` прикладывается к вайтлисту только если событие реально
  ушло генератору (`TRAFFICGEN_URL` задан).

## Чек-лист перед стартом продажи (в дополнение к §9 INVESTOR_LANDING_BRIEF)

1. Заполнить `web-shared/wt-params.js` (все URL из юридического чек-листа).
2. Поднять приёмщик вайтлиста (один POST endpoint на обе формы; payload:
   `email, lang, page, form, clickId, ts`) либо подключить форму к рассылочному сервису.
3. Выставить `TRAFFICGEN_URL`, когда генератор развёрнут в прод — переходы «пост → лендинг»
   начнут подтверждаться событиями `LandingReached`.
4. Добавить домен: sitemap-строка в `robots.txt`, при желании — абсолютный `og:image`.
5. Каналы X-тредов: `token-landing/X_POSTS.md`; карточки — `token-landing/x-cards/render.py`
   (пересборка после любой правки чисел в `token-data.mjs`).
6. Прогнать `npm run test:site` и `npm run verify`.

Деплой — любой статический хостинг с корнем репозитория (GitHub Pages, Vercel, nginx):
каталоги раздаются как есть, сборка не нужна. Кросс-ссылки между площадками относительные
(`../token-landing/…`), поэтому перенос на другой домен/префикс не ломает навигацию.

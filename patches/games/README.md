# Подтверждение перехода «промо → игра» (LandingReached)

Цепочка: кнопка в посте → `GET <генератор>/r/<clickId>?to=<target>` → 302 в игру с
`?wt_click=<clickId>` → `wt-landing.js` в игре шлёт `LandingReached` на
`POST <генератор>/api/track` → генератор засчитывает переход только по известному clickId.

| Игра | Куда встроено | pageId |
|---|---|---|
| ares1 | `game/apps/web/index.html` + `public/wt-landing.js` | `target_sixsec` |
| aof | `frontend/index.html` + `public/wt-landing.js` | `target_quest` |
| guttercaps | `client/index.html` + `public/wt-landing.js` | `target_crash` |
| neon-relay | `other/emscripten/index.html` + `wt-landing.js` рядом | `target_duel` |

## Применить (одна команда)

    bash ~/LeoGamesStudio/Games-watchtower/patches/games/apply.sh          # ветки + push + PR
    bash ~/LeoGamesStudio/Games-watchtower/patches/games/apply.sh --dry-run

Скрипт берёт патчи прямо с ветки хаба на GitHub, для каждого репо создаёт ветку
`watchtower-landing-beacon` от `origin/main`, применяет патч, пушит и открывает PR.
Репо с незакоммиченными изменениями пропускает. Генератор (патч 0004) — с тестами.

## Включить в проде (без этого скрипт молчит — это нормально)

1. **Адрес генератора в играх**
   - Vite-игры: `VITE_WT_TRAFFICGEN=https://<генератор>` в окружении сборки (Netlify/Vercel/CI).
   - neon-relay: вписать адрес в `<meta name="wt-trafficgen" content="">` при деплое.
2. **CSP**: если у игры есть `connect-src`, добавьте туда адрес генератора
   (например `guttercaps/ops/deploy/nginx.conf`), иначе браузер заблокирует отправку.
3. **Цели в генераторе**:
   `TALKCHART_LANDING_TARGETS='{"target_sixsec":"https://<ares1>/","target_quest":"https://<aof>/","target_crash":"https://<guttercaps>/","target_duel":"https://<neon-relay>/"}'`
4. Проверка: `curl -sI "<генератор>/r/test-click-001?to=target_crash"` → `302`, `Location` с `wt_click=`.

## Приватность
Без clickId, без настройки, при DNT / Global Privacy Control — ничего не отправляется.
Кошелёк, cookies и хранилище игры не читаются; `wt_click` убирается из адреса всегда.

## Тесты
`node --test patches/games/wt-landing.test.mjs` — 5 юнит-тестов;
с `WT_E2E_BASE=http://127.0.0.1:<порт>` — плюс сквозной тест против живого экспортёра.

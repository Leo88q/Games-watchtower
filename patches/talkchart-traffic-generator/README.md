# Патч для `Leo88q/talkchart-traffic-generator`

У агента не было прав на push в этот репозиторий, поэтому изменения лежат здесь.
Основа — `e549844` (main на 2026-09-24).

```bash
cd ~/LeoGamesStudio/talkchart-traffic-generator
git switch -c x-tools-landing-posting
git am ../Games-watchtower/patches/talkchart-traffic-generator/*.patch
python3 scripts/test_watchtower.py && python3 scripts/test_watchtower_max.py \
  && python3 scripts/test_landing_ledger.py && python3 scripts/test_post_x.py \
  && python3 scripts/smoke_watchtower.py        # 17 + 20 + 10 + 10 тестов, смоук 82/82
npm run build                                   # раньше падал: generate_all.py не было
git push -u origin x-tools-landing-posting      # дальше PR в main
```

Если `git am` споткнётся (фабрика успела закоммитить новый контент в `site/`):
`git am --3way …`, конфликты возможны только в сгенерированных файлах.

Что внутри:
- `LandingReached` по click-id: `GET /r/<clickId>?to=<target>` → 302 на свою страницу с `?wt_click=`;
  игра шлёт `POST /api/track` с `payload.clickId`. Без зарегистрированного клика → `rejected: landing_unconfirmed`.
  Статистика: `GET /watchtower/landings`.
- `site/factory/generate_all.py` — `npm run build`; `--check`, `--dry-run`, `--only`, `--post-x`.
- `post_x.py` — журнал дублей `site/data/x_posts.json`, `--dry-run`, `--status`, `--force`, ретраи 429/5xx.

**Что должна сделать игра:** прочитать `wt_click` из URL и один раз отправить
`{"eventType":"LandingReached","campaignId":…,"sourceId":…,"pageId":…,"sessionId":…,"seq":1,"payload":{"clickId":"<wt_click>"}}`
на `POST <генератор>/api/track`. Без этого beacon'а переходы останутся нулём — честно.

## 0003 — фикс для macOS (после PR #6)

`0003-sqlite-close-connections-macos.patch`: соединения SQLite теперь закрываются.
Без него на macOS (`ulimit -n 256`) падали 7 тестов с `unable to open database file`
(3 из них падали и на исходном `main`). Применять поверх ветки PR #6:

    git am /tmp/tcg-patches/0003-sqlite-close-connections-macos.patch

## 0004 — /r/ ведёт в игры

`0004-landing-absolute-game-targets.patch`: цель в `TALKCHART_LANDING_TARGETS` может быть
полным https-адресом игры (раньше склеивалась с SITE_URL как `#маршрут`). Применяется
скриптом `patches/games/apply.sh` вместе с патчами игр.

# Исправления по аудиту 2026-09-23

Отчёт аудита: `audit-2026-09-23/AUDIT_REPORT_RU.md` (вердикт NO-GO), доказательства — `audit-2026-09-23/evidence/`.
Здесь — что именно изменено в коде и чем это проверяется. Каждая строка воспроизводима командой из последней колонки.

Проверка целиком: `npm run verify` (тесты + мутационные тесты + сборка).

## Блокеры и high

| ID | Что было | Что сделано | Проверка |
|---|---|---|---|
| F-001 | `POST /api/ingest/*` без токена менял метрики | Bearer ingest-токен или HMAC-подпись тела; без секрета — `503 ingest_disabled_no_secret_configured` | `test:hardening` (write без токена 401, inbox не меняется) |
| F-002 | stored XSS: ingest → read-model → `innerHTML` | сервер вырезает `<`, `>`, кавычки и схемы `javascript:`/`vbscript:`/`data:text/html`; клиент экранирует интерполяции (`src/os/escape.js`) | `test:hardening` (векторы + regex `<tag … on*>`) |
| F-003 | мутационный score 0.50 | 35 мутантов, `expectAll`, точные `find`-строки | `npm run test:mutation` → 21/21 и 14/14, score 1.000 |
| F-004 | «282 findings / 108 critical» против реальных 215/90 | числа приведены к подсчёту по файлам реестра | `test:docs` (docs ↔ `watchtowerOSHealth().summary`) |
| F-005 | метрики `partial` без причины | `quality: unavailable` + `reason` для каждой метрики без данных | `test:unit` (economy 23 теста) |
| F-006 | демо-числа зависели от wall-clock | опорная точка демо привязана к суткам (UTC), seed детерминирован | мутанты `demo-local-time`, `demo-seed-now`, `demo-anchor-off` |
| F-007 | rate-limit обходится `X-Forwarded-For` | XFF учитывается только при `WATCHTOWER_TRUST_PROXY=1` | `test:hardening`, мутант `xff-trust` |
| F-008 | нет лимитов тела/таймаутов и кодов ошибок | тело ≤ `WATCHTOWER_MAX_BODY_BYTES` (413), невалидный JSON 400, невалидное событие 422 `errors[]`, таймаут запроса | `test:hardening` |
| F-009 | нет fail-fast и валидации ENV | `server/config.js`: диапазоны, `Infinity`/`1e9`/`maybe`/порт 70000 отклоняются; production без ingest-секрета и без соли ≥16 символов не стартует | `test:hardening` (5 кейсов fail-fast) |
| F-010 | CORS `*` и нет заголовков безопасности | CORS только для `WATCHTOWER_ALLOWED_ORIGINS`, CSP для HTML, `x-frame-options`, `nosniff`, HSTS | `test:hardening` (CORS + заголовки) |
| F-011 | утечка IP/URL/PII в read-эндпоинтах | псевдонимы `anon:<12 hex>`, `sanitizePath` хранит только имена query-параметров, `ipHash` — hex | `test:privacy` (7 тестов), мутанты `audit-raw-ip`, `pii-raw-events` |
| F-012 | захардкоженные моки в боевых агрегатах | агрегаты считают по событиям inbox; нет данных — `unavailable`, демо только по флагу и помечено `DEMO DATA` | `test:unit`, `test:mutation` (`unavailable-zero`, `no-reason`, `demo-gate-off`) |
| F-013 | индекс здоровья маскировал распределение | индекс строится на 4 компонентах, порог 4 (мутанты 3 и 5 отклоняются), компоненты видны в ответе | мутанты `index-3-components`, `index-5-components`, `index-weight` |

## Medium и low

| ID | Что было | Что сделано | Проверка |
|---|---|---|---|
| F-014 | дефекты в контрактах-заготовках | `studio_treasury`: timelock ≥ 24 ч, заявка/исполнение/отмена, инвариант `deposited ≥ withdrawn + liabilities` перепроверяется, `checked_add`; `cross_game_inventory`: `space = profile_space()`, `#[max_len]`; `session_keys`: ответ только `bool` | `server/contracts/README.md` (статус: спецификация, toolchain нет) |
| F-015 | модули рапортовали `configured: true` без конфигурации | 34 модуля отдают `configured` по факту наличия ключей, `apiKeyConfigured: Boolean(env.…)` | `test:docs`, grep по `apiKey: env.` |
| F-016 | выдуманные команды и адреса в UI/промптах | исправлены рецепт `create-solana-game`, URL в `src/os/control-panels-v3.js`, `cnft.js` | `test:docs` |
| F-017 | session-keys имитировали подпись | `simulated: true`, `blockchainWrite: false`, реальная подпись не заявляется | `test:readonly`, `test:docs` |
| F-018 | рост хранилищ без ротации | `WATCHTOWER_MAX_EVENTS` (вытеснение), `WATCHTOWER_EVENT_TTL_HOURS`, счётчики в `/api/ingestion/status` | `test:hardening` (TTL), мутанты `retention-off`, `ttl-ignored` |
| F-019 | ошибка в сборочном рецепте | рецепт исправлен на `npx create-solana-game <gameId> --preset game-preset` | `test:docs` |
| F-020 | нет `.dockerignore`, в образ копировалось всё | `.dockerignore`, многоступенчатый `Dockerfile`, `USER node`, `HEALTHCHECK`, том `/app/data` | `docker build` (см. `docs/OPERATIONS.md`); `test:docs` |
| F-021 | дубликаты и мёртвые файлы | удалены `src/engine/analytics.js`, `src/data/mock-events.js`; дубликат в `laserstream` убран | grep по репозиторию — ссылок нет |
| F-022 | контракты в репозитории — заготовки, а не задеплоенный код | статус зафиксирован явно: `server/contracts/README.md` + README, адреса-заглушки помечены | `test:docs` |

## Дополнительно к отчёту (найдено при исправлении)

- `WATCHTOWER_STATIC_DIR` — каталог бандла задаётся явно; несуществующий каталог останавливает запуск
  вместо тихой выдачи 404 на главную страницу.
- `npm run test:smoke` — контрактный смоук против живого сервера (72 проверки), работает и в production-режиме.
- CI (`.github/workflows/ci.yml`): тесты, мутационные тесты, сборка, сборка образа.
- Конфигурация: `WATCHTOWER_MAX_EVENT_AMOUNT` действительно применяется (422 при превышении).
- Аудит-лог: `entries > 0`, `ipHash` — hex, значения query-параметров не сохраняются.

## Дополнительно найдено при исправлении

- **Рантайм-баг интерфейса**: `/api/players/cross-game` отдаёт сегменты объектом
  (`oneGame` / `twoGames` / `threeOrMore`), а раздел «Аналитика» вызывал у них `.slice()` — экран падал,
  как только появлялся хотя бы один игрок с общим кошельком. Исправлено, добавлен DOM-прогон
  интерфейса `npm run test:ui` (jsdom, 17 проверок): он ловит именно такие ошибки, которых не видит
  ни сборка, ни тесты API.
- **Прямая ссылка `#economy` не подгружала метрики** — раздел открывался пустым; теперь данные
  подгружаются и по hashchange, и по кнопке «Обновить».
- **Каталог метрик отдаёт покрытие** (`/api/economy/catalog` → `coverage`): интерфейс показывает,
  какие 18 метрик считаются из принимаемых событий, каким 9 нужны новые эмиттеры в играх и каким 13 —
  конфигурация студии. Ответ на вопрос «почему метрика пустая» теперь виден на экране.

## Финансовая конфигурация студии (закрывает 13 метрик из 40)

- Семантика закреплена: выручка, расходы и их разбивка задаются за 30 дней и приводятся к окну
  пропорционально дням (`CONFIG_PERIOD_DAYS`), метрики помечаются `partial` и указывают период в `source`.
  До этого фикса месячная выручка показывалась как выручка за 24 часа, а ARPDAU делился на число дней окна —
  теперь формулы и код совпадают.
- 8 метрик, которые считаются только из финансовых фактов, видны и без потока событий (с примечанием
  «из подтверждённых финансовых фактов студии»); метрики активности без событий по-прежнему `unavailable`.
- Форма сбора цифр: `prompts/studio-os/PROMPT_STUDIO_FINANCE_CONFIG.md`, отдаётся `/api/arena/prompts`
  и доступна в разделе «Промпты». Проверки: `test:unit` (приведение к окну, отсутствие нулей),
  мутанты `revenue-no-window`, `arpdau-no-days`, `finance-facts-complete`, `test:docs` (14 переменных
  и требования формы), `test:ui` (раздел «Промпты» и карточка покрытия).

## Переплетение: снята выдуманная проекция (F-012 в новом месте)

- `/api/cross-game/projection` возвращал 8 захардкоженных предметов (`cgi_00001…cgi_00008`) и 4 пары
  «neonrelay → guttercaps», «guttercaps → ares1» и т. д., помечая ответ `dataQuality: partial`.
  Это были не данные, а заглушка, показывавшая несуществующие переносы активов.
- Теперь проекция читает только реальные события (`BridgeIn`, `BridgeOut`, `CrossGameLinked`,
  `CrossGameAssetGranted`), схлопывает два события одного переноса в одну связку, отбрасывает события
  внутри одной игры и при отсутствии данных отдаёт `unavailable` + причину со списком нужных событий.
  Контракт обозначен как `spec-only-not-deployed` (toolchain в репозитории нет).
- Проверки: `test:hardening` (пустая проекция без `cgi_*`, реальная связка guttercaps→neonrelay из двух
  событий, отсечение same-game, отсутствие открытых идентификаторов), мутант `projection-fake-links`,
  `test:docs` (статус переплетения совпадает с кодом).
- Полный статус переплетения и план работ: `docs/INTERWEAVING_STATUS.md`.

## Что осталось за рамками кода (не заглушки, а внешние зависимости)

- Anchor-программы не собираются: в репозитории нет Rust/Anchor toolchain. Перед деплоем нужен
  отдельный CI с toolchain, `anchor test` и внешний аудит.
- Ключи провайдеров (Solana RPC, Gamesight, Helika и т. д.) не задаются в репозитории: без них
  соответствующие модули честно отдают `configured: false`.
- Публикация в blockchain отсутствует по инварианту продукта: `writes: false`.

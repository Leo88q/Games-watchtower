# Покрытие чек-листа безопасности в Games Watchtower

Это документ о **фактической границе текущего репозитория**, а не сертификат аудита. Исходный threat catalog: [Solana crypto game security checklist](SOLANA_CRYPTO_GAME_SECURITY_CHECKLIST_RU.md).

## Модель угроз текущего ПО

Watchtower — аналитический хаб/read-model. Он не является игровой reward backend, DEX/NFT-маркетплейсом, DAO, кошельком или транзакционным signer. В `server/contracts/` находятся только Anchor-спецификации: они не собираются/не тестируются CI как Rust crate и не задеплоены. Поэтому защита пункта в чек-листе может быть реализована в одном из трёх уровней:

- **Hub** — проверяемая защита в Node API/клиенте Watchtower.
- **Spec** — логика находится в Anchor-спецификации, но без Rust-сборки, теста и деплоя не может считаться работающей защитой.
- **External** — обязанность игры/кошелька/облачной инфраструктуры/оператора; этот хаб не может обеспечить её сам.

«N/A» означает только «функции нет в этом хабе»; это **не** означает, что соответствующая игра защищена.

## Реализованные в этом репозитории меры

- Production startup завершается с ошибкой без ingest-секрета, read-токена и достаточной PII-соли.
- HMAC-ingest подписывает timestamp + HTTP method + pathname + точное исходное тело; допускает только свежее сообщение и блокирует точный повтор подписи в пределах одного процесса. При нескольких репликах требуется общий атомарный replay-store.
- Ingestion валидирует/нормализует события, дедуплицирует идентичность события в памяти одного процесса, ограничивает размер тела/события/retention и псевдонимизирует игрока в ответах.
- Hub остаётся read-only относительно блокчейна: CI проверяет запрещённые вызовы и Solana-зависимости.
- Session-key API — только симулятор: токен CSPRNG выдаётся однократно, в памяти хранится его digest, list/get не отдают bearer; симуляция закрыта по умолчанию и ничего не подписывает/не ретранслирует.
- CI сканирует исходники и AI-аудиторские входы на zero-width/bidi/tag-символы/variation selectors; сканер не переписывает файлы молча, а печатает код символа и место. Это не обнаруживает обычный prompt injection и не является «санитайзером» документов.
- CI проверяет границы агентной безопасности (`npm run test:agent-safety`): отсутствие конфигов агентных инструментов и правил авто-подтверждения, отсутствие агентных/LLM-зависимостей, read-only AI-слой, сохранность анти-инъекционных правил в аудиторских промптах, отсутствие ключей и `.env` в репозитории.
- Инвентарь хранилищ и измеренная ёмкость зафиксированы исполняемыми проверками: `npm run test:load` (нагрузка), `npm run test:state` (атомарность файлов состояния), `npm run test:unit` (инвалидация кэша аналитики). Данные — только в памяти процесса плюс два JSON-файла состояния; БД нет (`docs/STORAGE_AND_CAPACITY_RU.md`).
- Аудиторские промпты явно требуют считать репозиторные/внешние тексты недоверенными данными и отчитываться по применимым пунктам чек-листа.
- Anchor-спецификации усиливаются локальными ограничениями полей/векторов и версией профиля; вывод из program-owned treasury-PDA сохраняет rent reserve и не пытается использовать System Program как владельца PDA. Эти изменения **не проверены Rust toolchain**.
- Production config теперь отказывает при `WATCHTOWER_ALLOW_UNKNOWN_GAMES=true`; неизвестные gameId остаются deny-by-default. Это не allowlist mint/program IDs и не проверка токенов.
- IP-псевдонимный salt по умолчанию и ID snapshot используют Node CSPRNG (`randomBytes`/`randomUUID`), а не `Math.random`; эти значения не являются wallet keys.
- CI устанавливает lockfile без lifecycle scripts (`npm ci --ignore-scripts`), запускает `npm audit --audit-level=high`; Dependabot еженедельно проверяет npm и GitHub Actions. Это не заменяет review обновлений и проверку внешнего SDK.
- Godot/Unreal SDK-примеры помечены devnet-only; рекомендовано внешнее подписание с явным просмотром и подтверждением, но интеграция wallet UI в самом Watchtower отсутствует.
- Добавлен `docs/INCIDENT_RESPONSE_SECURITY_RU.md` как операционная памятка; она не является автоматическим containment, не ротирует внешние ключи и не принимает юридических решений.

## Карта пунктов 1–82

| Пункты | Статус в Watchtower | Что реально означает |
|---|---|---|
| 1–6 | **Spec** | Anchor PDA/init/Signer/System типы есть в спецификациях; это не задеплоенный контроль. |
| 7–10 | **Spec / External** | В приложении нет транзакционных CPI и on-chain RNG; игровые CPI/state-ordering/валидность Clock остаются обязанностью программ игры. |
| 11–16 | **External / N/A** | Hub не управляет mint/token treasury. У treasury-спецификации есть authority/timelock/accounting, но реальную multisig-модель, токены и выпуск она не доказывает. |
| 17–20 | **External** | MEV, ограничения игрового admin и экономическая модель требуют контрактов/операционных прав проекта; хаб только показывает полученные данные. |
| 21–30 | **Spec / External** | Layout, типы аккаунтов и PDA частично отражены в Rust; Anchor-компиляция, IDL upgrade, compute-budget/fork tests и close-account проверка пока отсутствуют. |
| 31–35 | **Spec** | В программах применяются типизированные Anchor-аккаунты/PDA; ручная проверка CPI-target и тесты account substitution не подтверждены сборкой. |
| 36–40 | **External / N/A** | VRF, one-shot игровые гачи, Token-2022 extensions, ATA и конверсия decimals не реализованы в хабе. |
| 41 | **Hub (partial)** | HMAC + timestamp + process-local replay cache; это не серверная подпись payout-результатов и не распределённый claimed-PDA. |
| 42 | **External / N/A** | Хаб не собирает пользовательские транзакции и не исполняет on-chain sandwich-sensitive инструкции. |
| 43 | **Hub boundary** | Hot-wallet нет. Секреты API — только ENV; защита облачного/KMS ключа относится к оператору. |
| 44–49 | **Spec / External** | Treasury timelock только в неразвёрнутой спецификации; authority, NFT authority, Sybil-контроль и supply invariant реальной игры здесь не обеспечиваются. |
| 50 | **Hub (partial)** | Есть CSP, lock-файл, CI install/build/security scans. CSP/верификация пакетов и frontend wallet safety требуют проверки на целевом домене/билде. |
| 51 | **N/A** | В хабе нет пользовательского wallet-connect/sign UX; симуляция сессии не является preview реальной транзакции. |
| 52–54 | **Hub (partial) / Spec** | API/unit/mutation тесты и экономические расчёты присутствуют; Trident/LiteSVM/Anchor fuzz, on-chain инварианты и тысячи симулированных игровых сессий не выполнены. |
| 55–57 | **Hub (partial) / External** | Inbox выполняет синхронную дедупликацию одного процесса, не начисляет AURY/SKR/награды и не решает DB race в игровом backend. Нужны атомарные транзакции и идемпотентность там. |
| 58–61 | **External / N/A** | Хаб не эмитирует игровые токены, не управляет bonding curves и не устанавливает floor price; экономическое моделирование игр требуется отдельно. |
| 62–64 | **External / N/A** | DAO, multisig treasury и кадровый контроль не являются функциями хаба. |
| 65 | **Hub (partial)** | Нет приватных wallet keys в модели хаба, журнал редактирует секретные поля; защита cloud/KMS/лог-провайдера остаётся внешней. |
| 66 | **Hub (partial)** | `package-lock.json`, `npm ci` и CI есть; постоянный аудит advisories/хешей и отзыв скомпрометированных выпусков требует усиления supply-chain pipeline. |
| 67 | **External** | DNSSEC/регистратор/доменные hardware keys — инфраструктура оператора. |
| 68 | **Spec / External** | В профиле добавлена версия; migration path для уже существующих аккаунтов отсутствует, потому что программа не развёрнута. Любой будущий deploy должен добавить миграционные тесты. |
| 69–70 | **External / N/A** | Хаб не выполняет игровые airdrop/mint/craft. Поэлементная авторизация и атомарный craft должны быть в коде игры. |
| 71 | **Hub boundary / CI** | Агента с доступом к кошельку в репозитории нет: `npm run test:agent-safety` падает, если в зависимостях появится LLM/агентный фреймворк, а в `scripts/check-read-only.mjs` — если появится клиент Solana или вызов подписи. То есть «инструмент, который читает внешние тексты, физически не тот же процесс, что подписывает» проверяется сборкой. |
| 72 | **N/A + правило** | В хабе нет аутентификации по владению токеном/NFT: доступ определяется токенами/HMAC (`server/security/access.js`), а не активами. Правило «владение NFT — сигнал, а не аутентификация» зафиксировано в аудиторском промпте (`prompts/audit/PROMPT_AUDIT_FULL_STACK.md`, п. 9). |
| 73 | **N/A** | Межагентного доверия нет: хаб не вызывает агентов и не принимает их вывод как команду; `/api/ai/*` — только GET-описания (`scripts/agent-safety.test.mjs` проверяет отсутствие write-маршрутов в AI-слое). |
| 74 | **N/A (по границе)** | Персистентной памяти ИИ-агента в проекте нет. Единственное долговременное состояние — файлы курсоворов и снимков отчётов, они не исполняются и не влияют на права. |
| 75 | **Hub (partial) + правило** | В самом хабе любое изменение требует заявки: `POST /api/control/requests` создаёт запись со статусом `pending_review`, `requiresApproval: true`, `blockchainWrite: false` и `requiredApprovals: 2` — исполнения нет ни в каком виде. Лимиты и allowlist живут в инфраструктуре/контракте, а не в тексте промпта: **промпт не является контролем доступа**. Чего нет: продуктовой политики для внешних agent-wallet интеграций (их и не должно быть в этом репозитории). |
| 76 | **Hub (CI-enforced) / partial** | Скрытые инструкции: `npm run test:source-safety` сканирует отслеживаемые файлы на zero-width, bidi, tag-символы, variation selectors, interlinear annotation и BOM — `scripts/check-source-safety.mjs`; сканер не «чистит» файлы молча, а печатает код символа и место. Тесты сканера: `scripts/agent-safety.test.mjs` (ловит `U+200B` внутри слова, `U+E0041` tag-строку, `U+202E`, `U+FE0F` в середине слова; не шумит на эмодзи). Аудиторские промпты требуют считать репозиторий недоверенным и проверять «это вне скоупа» как попытку инъекции. Чего нет: защиты от обычного языкового prompt injection — сканер её не заменяет, это внешний процесс. |
| 77 | **Hub (CI-enforced) + External** | Авто-подтверждение операций агентом: `test:agent-safety` падает при появлении конфигов агентных инструментов (`.mcp.json`, `.cursor/mcp.json`, `.claude/settings.json`, `claude_desktop_config.json` и др.) и при ключах `autoApprove/alwaysAllow/dangerouslySkipPermissions` в конфигурации. Права самого IDE/Arena-агента и его auto-approve этим репозиторием не контролируются — это процесс оператора (ручное подтверждение записи кода отдельно от code review). |
| 78 | **External / N/A** | MCP-серверов и tool-роутеров в репозитории нет; их описания не подключаются к агенту. Правило фиксации/сверки хеша описаний инструментов и запрет непроверенных MCP относится к среде оператора. |
| 79 | **External / N/A** | Прослойки между агентом и моделью в проекте нет; исходящих вызовов LLM из кода нет (проверяется тем же `test:agent-safety`: запрет агентных зависимостей и вызовов процессов/моделей из обработчика). |
| 80 | **Hub (partial)** | Аудит как процесс, а не разовая проверка: CI на push/PR прогоняет тесты, мутационную проверку, сканер невидимых Unicode, агентные границы и нагрузочную проверку. Публичных dev/admin-поверхностей у хаба нет (единственная точка входа — API/статика), но размещение внешних админ-панелей за VPN/allowlist — задача оператора. Измеренная причина относиться к этому серьёзно: при большом inbox аналитика блокирует приём и health — `docs/STORAGE_AND_CAPACITY_RU.md` §3. |
| 81 | **External** | Защита игроков от дрейнеров под брендом «ИИ-бот» кодом не решается: это контент-политика (предупреждение, что официальные адреса контрактов публикуются только на сайте, и что студия никогда не просит игроков деплоить контракты «ради заработка»). В репозитории такой контент есть только в виде лендингов (`WEBSITES.md`, `token-landing/`), текстов предупреждений о мошенниках там пока нет. |
| 82 | **Hub boundary / External** | Хаб не создаёт, не хранит и не подписывает durable-nonce-транзакции, не собирает подписи мультисига и не управляет Security Council — проверяется read-only инвариантом. Практическое правило для оператора (в промптах аудита): durable-nonce-транзакция проверяется так же строго, как обычная; таймлок на смену состава мультисига/Security Council не обнуляется «срочно»; заранее созданные nonce-аккаунты — отдельный объект мониторинга. |

## Карта контрольных сценариев 94–130

Номера соответствуют продолжению угроз из [чек-листа](SOLANA_CRYPTO_GAME_SECURITY_CHECKLIST_RU.md); названия нормализованы, а конкретные incident details не верифицировались отдельно. **Hub (partial)** означает только описанный контроль Watchtower, не защиту игровой транзакции. **N/A/External** не закрывает риск внешнего продукта.

| Пункт | Статус | Доказательство / граница |
|---:|---|---|
| 94 | **External / N/A** | Нет DAO/governance voting или управления authority в хабе. |
| 95 | **External / N/A** | Ценовой расчёт здесь не является settlement oracle; DEX/TWAP/ликвидность не контролируются. |
| 96 | **Hub (partial) / External** | Dashboard строит метрики из событий, но не доказывает wash-trade/Sybil filtering и не превращает volume в цену. |
| 97 | **Hub partial / External** | `gameId` — закрытый список и production запрещает `WATCHTOWER_ALLOW_UNKNOWN_GAMES`; mint/program IDs и extensions здесь не allowlist-ятся. |
| 98 | **External / Spec** | Upgrade/authority и ротация игровых ключей вне Watchtower; Anchor-файлы не deployed. |
| 99 | **Hub partial** | `server/config.js` использует `randomBytes(32)` для эфемерной IP соли, snapshots — `randomUUID`; сессии используют `randomBytes`; wallet key generation отсутствует в хабе. |
| 100 | **Hub partial / External** | Secret scanner охватывает рабочее дерево/Git в CI; ротация любых найденных секретов и workstation/secret-manager остаются оператору. Не печатать значения. |
| 101 | **N/A / External** | Signing service, HSM/KMS и payout signer отсутствуют; API credentials не являются signer key. |
| 102 | **External / N/A** | Нет multisig/quorum engine в хабе; одна Rust treasury spec не подтверждает фактический multisig. |
| 103 | **Hub partial / External** | Есть frontend build/CSP и CI secret scan; deployed-origin, DNS, wallet preview и release provenance требуют проверки оператора. |
| 104 | **N/A / External** | Watchtower не просит подпись и не содержит wallet-connect UI; пользователю нужна защита в игре/wallet. |
| 105 | **External** | Управляемые workstation, MFA, кадровый доступ и контрагенты репозиторием не проверяются. |
| 106 | **Hub (partial)** | Lockfile, pinned Action SHAs, `npm ci --ignore-scripts`, npm audit и Dependabot config; внешние SDK/пакеты игр отдельно не проверены. |
| 107 | **Hub (partial) / External** | CI/review/Dependabot дают техническую основу; staged rollout, release approval и rollback — политика оператора. |
| 108 | **N/A / Hub boundary** | Нет реальных delegated on-chain permissions; session-key модуль только симулирует scope и не подписывает. |
| 109 | **Hub boundary / External** | Read-only инвариант проверяется `test:readonly`; on-chain guard и альтернативные instruction paths принадлежат целевой игре. |
| 110 | **Hub partial / External** | Ingest отвергает отрицательные/небезопасные числовые значения, но `0` допускается как значение события; нулевая семантика в payout-контрактах здесь отсутствует. |
| 111 | **Operational partial** | `docs/INCIDENT_RESPONSE_SECURITY_RU.md` содержит триаж/сохранение/ротацию/восстановление; нет автоматического incident response и внешнего on-chain freeze. |
| 112 | **Spec / External** | Anchor specs содержат некоторые PDA/target checks; Rust не собирается/не тестируется, CPI substitution tests отсутствуют. |
| 113 | **Hub simulation / Spec / External** | Mock ограничивает размер/срок/scope для policy-demo, но не обеспечивает on-chain authorization; spec не является deployed enforcement. |
| 114 | **Hub partial / Spec** | Ingest ограничивает значения до safe integer; Rust specs используют checked arithmetic в treasury; real program boundary tests отсутствуют. |
| 115 | **Hub partial / Spec** | Production deny unknown games и profile version в spec; версионирование live IDL/config/deployed program не доказано. |
| 116 | **External / N/A** | Нет oracle с независимыми источниками/freshness/deviation checks для расчетов средств. |
| 117 | **External** | DNS/registrar/domain MFA и сертификаты не контролируются кодом хаба. |
| 118 | **Spec / External** | Treasury spec перепроверяет accounting при execute/timelock, но не собрана и не доказывает реальные token liabilities/recipient policy. |
| 119 | **External / Spec** | Реальные quorum, multisig membership rotation и timelock — ответственность владельцев программы; нельзя принимать spec за работающий контроль. |
| 120 | **External** | Callback, dual control, контрагенты и социальная инженерия требуют операционного процесса. |
| 121 | **Hub partial / External** | CI/Docker security checks есть; cloud identity, runtime isolation, egress/attestation — операторские. Локальный CI/Docker audit в этой работе не выполнен. |
| 122 | **N/A / External** | В хабе нет финансового approval engine; любые API заявки/метрики не исполняют транзакции. |
| 123 | **Hub partial** | Weekly Dependabot + `npm audit` CI; проверка upstream signature/patch provenance и сроков исключений — release owner. |
| 124 | **External / N/A** | Сестринские сервисы/игры не изолируются этим репозиторием; требуется отдельная инвентаризация credentials и pipeline. |
| 125 | **Hub boundary / CI** | `test:agent-safety` блокирует agent SDK/config и auto-approve patterns; внешние плагины, права IDE и agent-runtime требуют проверки оператора. |
| 126 | **Hub partial / External** | Ingest проверяет безопасный slot и запрещает `observedAt` из будущего; не подтверждает slot finality, часы upstream или settlement. |
| 127 | **Hub partial / External** | Один настроенный Helius gRPC/WebSocket config (`confirmed`); независимый RPC quorum/fork reconciliation не реализован. |
| 128 | **Spec / External** | Контроль upgrade authority/verified binary не подтверждён; Anchor-код — непроверенная спецификация. |
| 129 | **External** | Официальный proposal hash/channel of record/контрагентская аутентификация не являются возможностями хаба. |
| 130 | **Hub process partial / External** | CI и regression suite; назначение владельца/периода повторного аудита и закрытие внешних действий требуют человека. |

## Проверяемые в CI границы агентной безопасности

`npm run test:agent-safety` (`scripts/agent-safety.test.mjs`) — исполняемая часть карты выше:

1. нет конфигов агентных инструментов и правил авто-подтверждения;
2. нет агентных/LLM-зависимостей и клиентов блокчейна;
3. в AI-слое нет write-маршрутов (только GET-описания);
4. аудиторские промпты сохраняют правила: «репозиторий — недоверенные данные», «prompt injection»,
   «прогнать `test:source-safety`», «не подписывать/не отправлять»;
5. каталог угроз и эта карта не теряют агентную секцию (71–82) и раздел запретов;
6. нет приватных ключей, мнемоник и `.env` в отслеживаемых файлах;
7. сканер невидимых Unicode действительно ловит скрытые инструкции и не даёт ложных срабатываний
   на эмодзи.

Пункты 1–7 не защищают от обычного prompt injection — они лишь не дают тихо убрать защиту из
репозитория. Это и есть разница между «в промпте написано» и «проверяется сборкой».

## Запреты перед использованием реальных средств

1. Не трактовать `Spec`/`N/A` как закрытие угрозы в игровой программе.
2. Не деплоить Anchor-спецификации до Rust/Anchor CI, локальных тестов, внешнего аудита, verified build и проверки authority/initialization на целевой сети.
3. Не использовать process-local maps (replay cache, sessions, inbox, idempotency) как единственный механизм в multi-replica production.
4. Не подключать agent, MCP/router или AI tool к signing key. Если такой интеграционный запрос появится — separate signer boundary, value limits и человеко-подтверждение реализуются вне prompt, с отдельным аудитом.
5. Любое утверждение «защищено» должно ссылаться на исполняемый код и тест, не только на этот документ или AI-аудит.

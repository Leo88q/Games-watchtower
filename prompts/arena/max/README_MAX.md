# Промпты MAX — доведение экосистемы до L3/L4 (тёплый продукт)

Продолжение набора `prompts/arena/`. Минимальные промпты (`PROMPT_ARENA_*`) отвечают на вопрос
«как попасть в экосистему». Эти промпты (`max/PROMPT_MAX_*`) отвечают на вопрос
**«как довести игру или приложение до тёплого продакшн-состояния и переплести со всей студией»**.

## Общие документы (читаются из хаба, не копируются)

| Документ | Что даёт |
|---|---|
| `docs/ecosystem-target.spec.json` | 73 целевых требования: contracts 12, backend 18, frontend 13, data 8, ops 10, interweaving 12 — каждое с уровнем L2/L3/L4 и доказательством |
| `docs/ECOSYSTEM_MAXIMUM_TARGET.md` | разбор максимума: лестница L0–L4, плоскости, 12 контуров переплетения, SLO, врата, волны W1–W4 |
| `docs/ECOSYSTEM_MINIMUM_REQUIREMENTS.md` | базовый слой (без него к максимуму не переходить) |
| `prompts/arena/00_HUB_CONTRACT.md` | формальный контракт подключения: envelope, `/watchtower/*`, запреты, приёмка |
| `npm run ecosystem:target` | фактическое покрытие по tenant'ам (сейчас: 5/5 на L1, L3+ = 0%) |

## Игры (4) — `prompts/arena/max/`

| Файл | Репозиторий | Текущий уровень | Цель |
|---|---|---|---|
| `PROMPT_MAX_ARES1.md` | `Leo88q/ares1` | L1 (programID не задан, аудит не выполнялся) | L3 + farming/asset-контуры L4 |
| `PROMPT_MAX_AOF.md` | `Leo88q/aof` | L1 (1 critical, 5 `init_if_needed`) | L3 + crafting/market и RLS-контуры L4 |
| `PROMPT_MAX_NEONRELAY.md` | `Leo88q/neon-relay` | L1 (14 блокеров, код не собирался) | L3 + server-authoritative reward-контур L4 |
| `PROMPT_MAX_GUTTERCAPS.md` | `Leo88q/guttercaps` | L1 (188 findings, 86 critical) | L3 + gasless ECS и chip-экономика L4 |

## Приложения (3) — `prompts/arena/max/`

| Файл | Репозиторий | Что это | Цель |
|---|---|---|---|
| `PROMPT_MAX_TRAFFICGEN.md` | `Leo88q/talkchart-traffic-generator` | off-chain движок трафика (TalkChart) | L4 как источник acquisition-данных: 12 unavailable → эмиттеры, cron retention, sixsec → 0 critical |
| `PROMPT_MAX_INVESTOR.md` | `Leo88q/investor` | инвесторский лендинг + дашборд Ecosystem Share | L3/L4: нулевые выдуманные числа, данные только из hub API с бейджами dataQuality, снапшоты и дивиденды с provenance |
| `PROMPT_MAX_HUB.md` | `Leo88q/Games-watchtower` | гид-хаб: контракт + бэкенд + фронтенд 19 панелей | L4 как платформа: целостность отчётов, `/api/ecosystem/status`, панели на живых данных, proposal-flow |

## Порядок запуска

1. **Хаб первым** (`PROMPT_MAX_HUB.md`) — без `/api/ecosystem/status` и честного реестра игры
   не смогут подтвердить свой уровень.
2. **Игры по риску**: `guttercaps` → `neon-relay` → `ares1` → `aof`.
3. **Приложения**: `trafficgen` можно параллельно (независим), `investor` — только после того,
   как хаб начнёт отдавать реальные данные (иначе лендинг снова придётся переписывать с нуля).
4. **Финал** — повторный `PROMPT_MAX_HUB.md`: сводный отчёт покрытия и список оставшихся пробелов.

## Как проверяется результат

```bash
# в хабе
node server/index.js &
node scripts/check-ecosystem-target.mjs            # уровни tenant'ов
node scripts/check-ecosystem-target.mjs --strict   # гейт: покрытие L3+ ≥ 80%
npm run test:smoke                                 # контракт приёма не сломан
```

Плюс для каждого tenant'а: 14/14 `/watchtower/*`, `health.writes=false`, повтор события →
`duplicate:true`, 0 открытых critical/high (или formal accepted-risk), SLO-отчёт,
инварианты экономики в property-тестах, отчёт A–F с фактическим выводом команд.

## Единые запреты (во всех MAX-промптах)

`main` не трогать · секреты только именами ENV · signer'а в экспортере нет · блокчейн-write
из хаба невозможен · авто-выплат/автоблокировок/рассылок нет · mock не выдаётся за production ·
метрики без источника не публикуются · любые write-действия — proposal-flow с человеком
(RBAC + 2FA + второе подтверждение + multisig/timelock + audit log + rollback).

## Как читать пути в промптах

Промпт каждой игры/приложения выполняется **внутри её собственного репозитория**: пути вида
`watchtower/src/*`, `programs/*`, `backend/src/*`, `src/os/*`, `godot/*` относятся к репозиторию игры.
Из хаба (`Leo88q/Games-watchtower`) берутся только документы контракта, спека максимума и отчёты
аудита — хаб в этих сессиях не модифицируется. Пути `scripts/build-audit-summary.mjs`,
`scripts/check-report-integrity.mjs`, `reports/hub-contracts-audit.json` — это файлы, которые
MAX-промпт хаба требует **создать**.


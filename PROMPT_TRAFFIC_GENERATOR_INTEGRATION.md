# Мастер-промт: интеграция приложения генератора трафика с Games Watchtower

> Как использовать: вставь весь текст этого файла в AI, работающий в репозитории генератора трафика.
> После его работы ты получишь финальный отчёт — передай его целиком в Games Watchtower.
> На его основе в Watchtower будет создан адаптер `trafficgen` и аналитический раздел «Traffic / Acquisition».

---

## Роль и цель

Ты работаешь в репозитории приложения, которое генерирует и направляет трафик на страницы в интернете (лендинги игр и другие целевые страницы). Не готовь общие рекомендации вместо реализации: сначала изучи фактический код, затем внедри интеграционный контракт, тесты и runtime-проверки.

Цель — предоставить Games Watchtower актуальные read-only данные о трафике: кампании, источники, целевые страницы, сессии, переходы, конверсии, качество трафика и надёжность доставки.

Watchtower **не должен** получать возможность управлять трафиком:

- запускать/останавливать кампании;
- менять целевые страницы и targeting;
- отправлять или повторять доставку;
- получать API-ключи, токены учетных записей, доступ к базе.

Все неизвестные, неподтверждённые и недоступные данные должны возвращаться явно:

```text
unavailable
partial
unknown
```

Нельзя заменять отсутствующие данные выдуманными значениями.

---

## 1. Обязательные условия безопасности

До передачи интеграции:

1. Удалить секреты из git, истории, `.env`, CI logs и artifacts.
2. Ротировать все ключи, которые могли попасть в репозиторий.
3. Не передавать Watchtower:
   - доступ к базе данных;
   - ключи email/почтовых сервисов;
   - токены рекламных или publisher-аккаунтов;
   - admin token;
   - API-ключи бэкенда.
4. Если API требует аутентификацию — создать **отдельный read-only ключ только для Watchtower-экспортера**. Передавать его значение в отчёте запрещено: в отчёте указываются только имена переменных окружения, ключ отдаётся владельцем отдельно.
5. Скрыть персональные данные: в payload не должно быть IP, cookie, device fingerprint, email, полных идентификаторов пользователей. Использовать устойчивый псевдонимный `sessionId`.
6. Если обрабатываются данные реальных людей — реализовать consent/opt-out и указать это в паспорте.
7. Явно подтвердить, что Watchtower-интеграция не может выполнять никаких действий (writes) над генератором трафика.
8. Если часть трафика синтетическая (скрипты/боты) — задекларировать это в паспорте (`traffic_type`) и маркировать события (`sourceType: real | bot | hybrid`). Watchtower не должен считать ботовый трафик реальными пользователями.

---

## 2. Паспорт приложения

Добавь и поддерживай документ:

```text
WATCHTOWER_INTEGRATION.md
```

Формат:

```yaml
app_id: trafficgen            # уникальный id в Watchtower, замени при необходимости
display_name:
kind: traffic-generator
stage: prototype | alpha | beta | live
deployment_url:
api_base_url:
tech_stack:
database:
traffic_type: real | bot | hybrid
source_systems: []            # откуда приходит трафик
target_pages: []              # куда направляется трафик
campaign_store: config | database | api
event_store: memory | database | logs | none
event_retention:
auth: none | api-key
time_reference: utc
parser_version: trafficgen-v1
data_quality: complete | partial | unavailable
last_verified_at:
```

Все значения должны быть подтверждены фактическим запуском/проверкой приложения, а не только документацией.

---

## 3. Watchtower read-only API

Реализуй или предоставь совместимые endpoints. Если проект использует другие пути — добавь mapping в документацию.

```text
GET /watchtower/health
GET /watchtower/readyz
GET /watchtower/config
GET /watchtower/campaigns
GET /watchtower/campaigns/:id
GET /watchtower/sources
GET /watchtower/pages
GET /watchtower/events?cursor=&limit=
GET /watchtower/metrics/daily?period=
GET /watchtower/funnels
GET /watchtower/alerts
GET /watchtower/forecast
```

Каждый ответ должен содержать единый конверт:

```json
{
  "data": {},
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "period": "7d UTC",
  "source": "trafficgen-exporter",
  "dataQuality": "complete|partial|unavailable",
  "confidence": 0.0,
  "parserVersion": "trafficgen-v1"
}
```

`/watchtower/events` обязан поддерживать курсорную пагинацию и повторную отдачу (replay) от курсора.

---

## 4. Нормализованный event envelope (off-chain)

Трафик — не блокчейн-событие, поэтому каноническая идентичность строится без slot/signature. Каждое событие:

```json
{
  "eventId": "uuid",
  "identity": "offchain:trafficgen:<campaignId>:<pageId>:<sessionId>:<seq>",
  "chain": "offchain",
  "source": "trafficgen",
  "app": "trafficgen",
  "eventType": "PageView",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "observedAt": "2026-01-01T00:00:00.000Z",
  "campaignId": "...",
  "sourceId": "...",
  "sourceType": "real|bot|hybrid",
  "pageId": "нормализованный URL или устойчивый id страницы",
  "sessionId": "псевдонимный id сессии",
  "payload": {},
  "parserVersion": "trafficgen-v1",
  "dataQuality": "complete|partial|unavailable"
}
```

Canonical identity:

```text
chain + campaignId + pageId + sessionId + seq
```

Обязательно реализовать:

- idempotency и deduplication по `eventId` и `identity`;
- cursor/replay;
- backfill;
- reconnect;
- gap detection (`DataGapDetected` / `DataGapHealed`);
- parser versioning.

---

## 5. Обязательные события

## Кампании, источники и страницы

```text
CampaignCreated
CampaignStarted
CampaignStopped
CampaignUpdated
SourceConnected
SourceDisconnected
SourceHealthChanged
PageAssigned
PageRemoved
```

## Сессии и трафик

```text
SessionStarted
PageView
Click
CTAClicked
LandingReached
SessionEnded
SessionAbandoned
NavigationCompleted
```

## Надёжность

```text
DeliveryFailed
RetryScheduled
RateLimited
TrafficError
ExporterHealth
DataGapDetected
DataGapHealed
```

## Качество и безопасность

```text
BotFlagged
AnomalyDetected
AbuseBlocked
ConfigUpdated
EmergencyPause
```

Событие, которое приложение реально не генерирует, не выдумывать: не включать его в `data` и отражать в `data_quality` паспорта как недоступный раздел.

---

## 6. Дневные метрики и воронки

Передавай дневные агрегаты (UTC, произвольный период):

- `pageViews`, `sessions`, `uniquePseudoVisitors`;
- длительность сессии: avg / p50 / p95;
- bounce rate;
- CTA click rate;
- landing reached rate (доля дошедших до целевой страницы игры);
- разбивка по кампаниям, источникам и страницам;
- ошибки и провалы доставки, rate-limit violations;
- счётчики duplicates/rejected;
- доля bot vs real (если `traffic_type != real`).

Минимальная воронка:

```text
CampaignStarted
→ SessionStarted
→ PageView
→ CTAClicked
→ LandingReached
```

Для каждого этапа: conversions и drop-off.

---

## 7. Качество данных

- Каждая метрика возвращается вместе с `dataQuality` и `confidence`.
- Отсутствующий источник — явно `unavailable`, не нули и не «примерные» числа.
- Временна́я зона везде UTC; все `timestamp` и `observedAt` в ISO-8601.
- Сохранять immutable daily-снимки минимум за 30 дней для сравнения периодов.

---

## 8. Наблюдаемость

Добавь:

- `/health`;
- `/readyz`;
- Prometheus-совместимые метрики.

Минимальный набор:

```text
trafficgen_events_total
trafficgen_events_duplicate_total
trafficgen_events_rejected_total
trafficgen_delivery_failures_total
trafficgen_exporter_errors_total
trafficgen_buffer_depth
trafficgen_data_gaps_total
```

Плюс: event throughput, очередь/буфер, лаг экспорта, ошибки декодера, backfill progress.

---

## 9. Тесты и runtime-проверки

Обязательные команды:

```bash
npm test
npm run build
npm run smoke
```

(Если проект использует другие менеджеры — эквивалентные команды, и укажи их в отчёте.)

Обязательные проверки:

1. exporter стартует без секретов в аргументах;
2. события эмитятся в корректном конверте;
3. дублирующая доставка отклоняется (dedup);
4. cursor/replay работает;
5. backfill работает;
6. gap detection работает;
7. недоступные разделы помечены `unavailable`;
8. в payload нет PII;
9. read-only: через exporter невозможно ни запустить, ни остановить кампанию;
10. ботовый трафик помечен `sourceType: bot`.

---

## 10. Definition of Done

Интеграция считается готовой только если:

- паспорт `WATCHTOWER_INTEGRATION.md` существует и подтверждён запуском;
- все endpoints `/watchtower/*` отвечают в едином конверте;
- события имеют canonical identity, dedup, cursor, backfill, gap detection;
- дневные агрегаты считаются из реальных событий (или явно `unavailable`);
- воронка считается;
- нет секретов в репозитории;
- в exporter нет write path;
- ботовый трафик маркирован;
- CI зелёный;
- есть rollback plan (как отключить интеграцию, не сломав приложение).

---

## 11. Обязательный финальный отчёт

После работы верни:

1. список изменённых файлов;
2. реализованные endpoints и фактические пути (с mapping, если отличаются от `/watchtower/*`);
3. список реализованных событий и parser version;
4. `data_quality` по каждому разделу (кампании, источники, страницы, сессии, метрики, воронки, надёжность, качество);
5. переменные окружения — имена без значений;
6. команды тестов и их результаты;
7. результаты runtime smoke test;
8. data-quality gaps;
9. deployment blockers;
10. rollback plan;
11. список того, что Watchtower теперь может считать актуальным;
12. список того, что остаётся `partial` или `unavailable`;
13. полные ответы на все вопросы раздела 12 без сокращений.

Не утверждай production readiness, если проверки раздела 9 не выполнены фактически.

---

## 12. Вопросы к тебе. Ответь на каждый в финальном отчёте

Твои ответы передадут AI, который ведёт Games Watchtower. На их основе он создаст:

1. адаптер `trafficgen` в ingestion-слое Watchtower;
2. раздел «Traffic / Acquisition» на дашборде: кампании, источники, страницы, сессии, воронка, качество трафика;
3. маркировку качества данных по тем же правилам, что и у игр.

Поэтому отвечай фактологично: указывай пути к файлам, маршруты, таблицы БД, имена переменных конфигурации. Если не знаешь — «unknown». Если невозможно сделать — «unavailable» и объясни почему. Запрещено выдумывать ответы.

1. **Стек:** язык, фреймворки, база данных, модель процессов. Укажи файлы, где это описано.
2. **Деплой:** URL в текущей среде, как приложение запускается, как конфигурируется (имена env-переменных без значений).
3. **Генерация трафика:** что именно является источником — реальные пользователи, скрипты/боты, внешний сервис, рекламные кампании? Чем управляется (конфиг, API, БД)?
4. **Целевые страницы:** как хранится список страниц, куда направляется трафик (конфиг/БД/API)? Сколько страниц? Доступен ли список read-only?
5. **Хранилище:** где хранятся события трафика (таблицы/файлы/логи)? Retention? Примерный объём (событий/день)?
6. **События:** какие события из раздела 5 уже фиксируются сегодня, какие можно добавить, какие невозможны и почему?
7. **Метрики:** какие метрики из раздела 6 можно посчитать из реального хранилища прямо сейчас, а какие — нет?
8. **Идентификация:** как идентифицируются сессии и пользователи? Есть ли устойчивый псевдонимный id? Где (если где) хранятся PII?
9. **API:** есть ли у приложения HTTP API сейчас? Какова аутентификация (none/api-key/другое)? Какие пути уже доступны?
10. **Нагрузки:** сколько трафика генерируется (просмотров/день, пиковый RPS)? Какие лимиты есть у экспортера?
11. **Время:** в каком формате и часовом поясе хранятся таймстампы?
12. **Отказоустойчивость:** что происходит, если Watchtower/экспортер недоступен (буфер, retry, потеря)?
13. **Качество:** какая доля трафика реальная, а какая синтетическая? Как их отличить в данных?
14. **Секреты:** какие секреты есть в приложении и где хранятся (имена переменных/файлы, без значений)?
15. **Rollback:** как отключить интеграцию с Watchtower, не сломав работу приложения?

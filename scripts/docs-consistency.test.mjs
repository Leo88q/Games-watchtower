/**
 * Согласованность документации, ENV и рантайма (находки F-004, F-016, X3):
 *   node --test scripts/docs-consistency.test.mjs
 *
 * Проверяет, что опубликованные числа и списки переменных совпадают с тем, что реально
 * читает и отдаёт код. Любое расхождение — падение сборки, а не «небольшая неточность в тексте».
 * Ожидаемые значения НЕ выводятся из самих документов: они фиксируются здесь как контракт.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG_ENV_KEYS } from '../server/config.js'
import { metricCatalog } from '../server/economy/metrics.js'
import { adapterReadiness } from '../server/ingestion/game-adapters.js'
import { listArenaPrompts } from '../server/ecosystem/prompts.js'
import { GAME_REGISTRY } from '../src/data/registry.js'
import { watchtowerOSHealth } from '../server/modules/os.js'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const read = (relative) => readFileSync(path.join(root, relative), 'utf8')

test('ENV: каждая переменная, которую читает сервер, описана в .env.example', () => {
  const example = read('.env.example')
  const listed = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]))
  const missing = CONFIG_ENV_KEYS.filter((key) => !listed.has(key))
  assert.deepEqual(missing, [], `нет в .env.example: ${missing.join(', ')}`)
  for (const required of ['WATCHTOWER_READ_TOKEN', 'WATCHTOWER_INGEST_TOKEN', 'WATCHTOWER_PII_SALT', 'WATCHTOWER_MAX_EVENTS', 'WATCHTOWER_EVENT_TTL_HOURS']) {
    assert.ok(listed.has(required), `${required} обязан быть в шаблоне`)
  }
})

test('ENV: шаблон не обещает секретов и значений по умолчанию для секретов', () => {
  const example = read('.env.example')
  for (const secret of ['WATCHTOWER_READ_TOKEN', 'WATCHTOWER_INGEST_TOKEN', 'WATCHTOWER_INGEST_HMAC_SECRET', 'WATCHTOWER_PII_SALT']) {
    assert.match(example, new RegExp(`^${secret}=$`, 'm'), `${secret} должен быть пустым в шаблоне`)
  }
})

test('ENV: ничего из .env.example не выглядит настоящим секретом', () => {
  const example = read('.env.example')
  const suspicious = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=(.+)$/gm)]
    .filter((match) => /KEY|TOKEN|SECRET|SALT|PASSWORD/.test(match[1]))
    .filter((match) => /[0-9a-f]{24,}|[A-Za-z0-9+/]{32,}={0,2}/.test(match[2]))
  assert.deepEqual(suspicious.map((match) => match[1]), [], 'в шаблоне не должно быть похожих на секреты значений')
})

test('числа в документации совпадают с рантаймом: 40 метрик, 8 семейств', () => {
  const catalog = metricCatalog()
  assert.equal(catalog.metrics.length, 40)
  assert.equal(catalog.families.length, 8)
  for (const file of ['docs/ECONOMY_METRICS_V1.md', 'docs/PRODUCT_GUIDE_RU.md']) {
    assert.match(read(file), /40 метрик в 8 семействах/, `${file} обязан называть актуальное число метрик`)
  }
})

test('числа в документации: 33 компонента и 5 игр/арендаторов', () => {
  assert.equal(watchtowerOSHealth().summary.totalComponents, 33)
  assert.match(read('docs/PRODUCT_GUIDE_RU.md'), /33 компонента/)
  assert.equal(GAME_REGISTRY.length, 4, 'четыре игры в реестре; trafficgen — off-chain тенант')
  assert.match(read('src/ios/main.js'), /Один экран для пяти игр/)
})

test('в интерфейсе и документации нет выдуманных «проверенных» чисел', () => {
  const content = read('src/ios/content.js')
  assert.ok(!/121 маршрут/.test(content), '«121 маршрут» противоречит реальному числу маршрутов')
  const main = read('src/main.js')
  assert.ok(!/>\s*\d[\d\s]{3,}</.test(main.split('<script')[0].slice(0, 20000)), 'в статической разметке не должно быть заглушечных чисел')
  assert.match(main, /const DASH = '—'/)
})

test('src/os: значения из конфигурации экранируются перед вставкой в innerHTML', () => {
  for (const file of ['src/os/index.js', 'src/os/control-panels-v3.js', 'src/os/handoff-v3.js']) {
    const text = read(file)
    const raw = [...text.matchAll(/\$\{[^}]*\}/g)].map((match) => match[0])
      .filter((expression) => /config\.|totalComponents|JSON\.stringify|version/.test(expression))
      .filter((expression) => !/esc\(|escJson\(/.test(expression))
    assert.deepEqual(raw, [], `${file}: неэкранированные интерполяции: ${raw.join(', ')}`)
  }
})

test('требования по контейнеру и CI описаны в документации', () => {
  const ops = read('docs/OPERATIONS.md')
  for (const topic of ['docker run', 'HEALTHCHECK', 'USER node', 'WATCHTOWER_READ_TOKEN']) {
    assert.ok(ops.includes(topic) || read('Dockerfile').includes(topic), `нет описания ${topic}`)
  }
})

test('инвентарь метрик совпадает с кодом: 40 метрик, 8 семейств, 46 типов событий', () => {
  const doc = read('docs/METRICS_INVENTORY.md')
  const catalog = metricCatalog({ acceptedEvents: [...new Set(adapterReadiness().adapters.flatMap((a) => a.eventTypes || []))] })
  const fromAdapters = adapterReadiness().adapters.flatMap((a) => a.eventTypes || [])
  assert.equal(catalog.metrics.length, 40, 'каталог метрик изменился — обновите docs/METRICS_INVENTORY.md')
  assert.equal(catalog.families.length, 8)
  assert.equal(fromAdapters.length, 46, 'число типов событий в адаптерах изменилось — обновите документ')
  for (const marker of ['40 метрик', '8 семейств', '46 типов событий', '35 уникальных имён', '12 типов']) {
    assert.ok(doc.includes(marker), `нет фразы «${marker}»`)
  }
  const coverage = catalog.coverage
  assert.equal(coverage.fromEvents.length, 18)
  assert.equal(coverage.needEvents.length, 9)
  assert.equal(coverage.needConfig.length, 13)
  for (const marker of ['| 18 |', '| 9 |', '| 13 |']) assert.ok(doc.includes(marker), `нет строки покрытия «${marker}»`)
  // Числа производных наборов тоже фиксируем: 6 ступеней воронки, 21 счётчик трафика, 10 инвесторских метрик.
  for (const marker of ['6 ступеней', '21 счётчик', '10 метрик']) assert.ok(doc.includes(marker), `нет числа «${marker}»`)
})

test('README не обещает открытый read-only API без аутентификации', () => {
  const readme = read('README.md')
  assert.ok(!/read-only API, ни одного write|API без токена/i.test(readme), 'README обязан описывать токены чтения и приёма')
  assert.ok(/WATCHTOWER_INGEST_TOKEN/.test(readme), 'README обязан называть токен приёма событий')
  assert.ok(/WATCHTOWER_READ_TOKEN/.test(readme), 'README обязан называть токен чтения')
})

test('документация операций существует и описывает аварийные сценарии', () => {
  assert.ok(existsSync(path.join(root, 'docs/OPERATIONS.md')), 'docs/OPERATIONS.md обязателен: на него ссылаются интерфейс и README')
  const ops = read('docs/OPERATIONS.md')
  for (const topic of ['readyz', 'WATCHTOWER_MAX_EVENTS', 'WATCHTOWER_PII_SALT', 'SIGTERM', '/metrics', 'ротация']) {
    assert.ok(ops.includes(topic), `docs/OPERATIONS.md не описывает ${topic}`)
  }
})

test('Dockerfile и .dockerignore согласованы с требованиями деплоя', () => {
  const dockerfile = read('Dockerfile')
  assert.match(dockerfile, /USER node/, 'контейнер не должен работать от root')
  assert.match(dockerfile, /HEALTHCHECK/, 'нужен healthcheck на /api/health')
  assert.match(dockerfile, /npm ci --omit=dev/, 'runtime-образ без dev-зависимостей')
  const ignore = read('.dockerignore')
  for (const entry of ['node_modules', '.git', '.env']) {
    assert.ok(ignore.split('\n').includes(entry) || ignore.includes(`${entry}*`) || ignore.includes(`${entry}/`), `.dockerignore обязан исключать ${entry}`)
  }
})

test('CI запускает те же проверки, что и локальный скрипт', () => {
  const workflow = read('.github/workflows/ci.yml')
  for (const step of ['npm run test:unit', 'npm run test:hardening', 'npm run test:privacy', 'npm run test:readonly', 'npm run build']) {
    assert.ok(workflow.includes(step), `CI не запускает ${step}`)
  }
  const pkg = JSON.parse(read('package.json'))
  for (const script of ['test:unit', 'test:hardening', 'test:privacy', 'test:readonly', 'test:mutation', 'verify']) {
    assert.ok(pkg.scripts[script], `package.json не содержит скрипт ${script}`)
  }
})

test('промпт для финансовой команды содержит все переменные экономики и отдаётся каталогом', () => {
  const file = 'prompts/studio-os/PROMPT_STUDIO_FINANCE_CONFIG.md'
  assert.ok(existsSync(path.join(root, file)), 'промпт по финансовой конфигурации обязателен')
  const doc = read(file)
  const economyKeys = CONFIG_ENV_KEYS.filter((key) => key.startsWith('WATCHTOWER_ECONOMY_'))
  assert.equal(economyKeys.length, 14, 'изменился список переменных экономики — обновите промпт')
  const missing = economyKeys.filter((key) => !doc.includes(key))
  assert.deepEqual(missing, [], `в промпте нет переменных: ${missing.join(', ')}`)
  // Шаблон ответа должен быть копируемым: каждая переменная встречается строкой `KEY=`.
  const template = doc.slice(doc.indexOf('## 4. Шаблон ответа'), doc.indexOf('## 5.'))
  for (const key of economyKeys) assert.ok(template.includes(`${key}=\n`), `в шаблоне нет строки ${key}=`)
  // Период и правило «пустое лучше выдуманного» — не украшение, а условие приёмки цифр.
  for (const marker of ['30 дней', 'Источник обязателен', 'оставьте поле пустым']) {
    assert.ok(doc.includes(marker), `в промпте нет требования «${marker}»`)
  }
  const listed = listArenaPrompts().prompts.find((item) => item.file === file)
  assert.ok(listed, 'промпт обязан быть в каталоге /api/arena/prompts')
  assert.equal(listed.exists, true)
})

test('статус переплетения в документации совпадает с кодом и не обещает реализованного переноса', () => {
  const doc = read('docs/INTERWEAVING_STATUS.md')
  // Факты, которые документ обязан называть честно.
  for (const marker of ['сейчас нет', 'spec-only-not-deployed', 'заглушкой', 'не реализована нигде']) {
    assert.ok(doc.includes(marker), `нет утверждения «${marker}»`)
  }
  // Контракт по-прежнему спецификация: в репозитории нет Rust/Anchor toolchain.
  assert.ok(!existsSync(path.join(root, 'server/contracts/target')), 'собранных артефактов программ быть не должно')
  assert.ok(read('server/contracts/README.md').includes('спецификация'), 'README контрактов обязан объявлять статус')

  // Код наблюдает ровно те события, которые перечисляет документ.
  const projections = read('server/ingestion/player-projections.js')
  for (const event of ['BridgeIn', 'BridgeOut', 'CrossGameLinked', 'CrossGameAssetGranted']) {
    assert.ok(projections.includes(event), `проекция не читает ${event}`)
    assert.ok(doc.includes(event), `документ не упоминает ${event}`)
  }
  // Метрика потоков действительно ждёт bridge-события, а не берётся из воздуха.
  const catalog = metricCatalog({ acceptedEvents: [] })
  const bridge = catalog.coverage.needEvents.find((item) => item.id === 'net_bridge_flow')
  assert.deepEqual(bridge.events.sort(), ['BridgeIn', 'BridgeOut'])
})

test('Dockerfile копирует всё, что нужно сборке и серверу (регрессия F-020)', () => {
  const dockerfile = read('Dockerfile')

  // 1. Серверные модули импортируют данные из src/<каталог> — каталог обязан попасть в образ.
  const needed = new Set()
  const walk = (dir) => {
    for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (entry.name.endsWith('.js')) {
        for (const match of read(rel).matchAll(/from '[^']*\/src\/([a-z-]+)\//g)) needed.add(match[1])
      }
    }
  }
  walk('server')
  assert.ok(needed.size > 0, 'сервер должен читать данные из src/ (реестр игр)')
  for (const dir of needed) assert.ok(dockerfile.includes(`COPY src/${dir}`), `Dockerfile не копирует src/${dir}: сервер упадёт на старте`)

  // 2. Каждый вход сборки Vite обязан быть скопирован в стадию build.
  const inputs = [...read('vite.config.js').matchAll(/resolve\(process\.cwd\(\), '([^']+\.html)'\)/g)].map((m) => m[1])
  assert.ok(inputs.length >= 2, 'vite собирает два интерфейса: index.html и ios.html')
  for (const input of inputs) assert.ok(dockerfile.includes(input), `сборка требует ${input}, но Dockerfile его не копирует`)

  // 3. Промпты — часть продукта (раздел «Промпты» в интерфейсе), их нельзя выбрасывать из образа.
  assert.ok(dockerfile.includes('COPY prompts ./prompts'), 'промпты должны попадать в образ')
  assert.ok(!read('.dockerignore').split('\n').includes('prompts'), '.dockerignore не должен исключать prompts')
})

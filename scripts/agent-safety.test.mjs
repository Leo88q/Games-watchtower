#!/usr/bin/env node
/**
 * Границы агентной безопасности (пункты 71–82 каталога угроз).
 *
 *   node --test scripts/agent-safety.test.mjs
 *
 * Зачем машинная проверка, а не абзац в документации: угрозы 76–77 и 80 — это не баг в коде,
 * а отравление процесса (аудиторские промпты, инструкции агенту, авто-approve файловых
 * операций). Если такую инструкцию тихо удалить из промптов, отчёт аудита останется «чистым».
 * Поэтому правила «аудитор считает репозиторий недоверенным» и «в хабе нет агента с доступом
 * к ценным операциям» зафиксированы здесь и проверяются в CI на каждом коммите.
 *
 * Проверяются только утверждения, которые можно доказать исполняемо: наличие/отсутствие
 * файлов, зависимостей, маршрутов и формулировок. Всё остальное (политика компании, поведение
 * внешних агентов, MCP-серверы вне репозитория) здесь честно не проверяется и остаётся
 * обязанностью оператора — см. docs/SECURITY_CONTROL_COVERAGE_RU.md.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const tracked = () => execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(Boolean)

/** Конфиги агентных инструментов: подключённый MCP-сервер/плагин может выполнять действия за оператора. */
const AGENT_CONFIG_PATTERNS = [
  /^\.mcp\.json$/,
  /^mcp\.json$/,
  /(^|\/)\.cursor\/mcp\.json$/,
  /(^|\/)\.vscode\/mcp\.json$/,
  /(^|\/)\.claude\/settings(\.local)?\.json$/,
  /(^|\/)claude_desktop_config\.json$/,
  /(^|\/)\.continue\/config\.(json|yaml)$/,
  /(^|\/)\.aider\.conf\.yml$/,
  /(^|\/)\.gemini\/settings\.json$/,
]

const AGENT_SDK_DEPENDENCIES = /^(openai|@anthropic-ai\/sdk|@google\/generative-ai|langchain|langchainjs|@langchain\/core|@modelcontextprotocol\/sdk|@modelcontextprotocol\/server|ai|lobechat|ollama|@huggingface\/inference|agentic|autogen)$/

test('в репозитории нет конфигов агентных инструментов и правил авто-подтверждения', () => {
  const files = tracked()
  const found = files.filter((file) => AGENT_CONFIG_PATTERNS.some((pattern) => pattern.test(file)))
  assert.deepEqual(found, [], `Найдены конфиги агентных инструментов: ${found.join(', ')}. Подключение инструмента к операциям с ценностью требует отдельного review и запрета авто-подтверждения.`)

  // Авто-подтверждение (auto-approve/always allow) не должно появляться ни в одном отслеживаемом файле:
  // именно оно превращает скрытую инструкцию в действие без участия человека.
  const offenders = []
  for (const file of files.filter((name) => /\.(json|ya?ml|toml)$/i.test(name) && !name.startsWith('package-lock.json'))) {
    const content = readFileSync(path.join(root, file), 'utf8')
    if (/"(autoApprove|auto_approve|alwaysAllow|dangerouslySkipPermissions|bypassPermissions)"\s*:\s*(true|\[)/i.test(content)) offenders.push(file)
  }
  assert.deepEqual(offenders, [], `Авто-подтверждение действий агента найдено в: ${offenders.join(', ')}`)
})

test('в зависимостях нет агентных/LLM-фреймворков: у хаба нет агента с доступом к ценным операциям', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const names = Object.keys({ ...(manifest.dependencies || {}), ...(manifest.optionalDependencies || {}), ...(manifest.devDependencies || {}) })
  const agentDeps = names.filter((name) => AGENT_SDK_DEPENDENCIES.test(name))
  assert.deepEqual(agentDeps, [], `Агентные зависимости: ${agentDeps.join(', ')}. Агент, читающий внешний контент, не должен иметь доступа к ценным операциям.`)
  // Клиенты блокчейна запрещены отдельно (scripts/check-read-only.mjs), здесь — тот же инвариант для агентной поверхности.
  const chainDeps = names.filter((name) => /solana|anchor|web3|tweetnacl|spl-token/i.test(name))
  assert.deepEqual(chainDeps, [], `Клиенты блокчейна в зависимостях: ${chainDeps.join(', ')}`)
})

test('AI-слой хаба остаётся read-only: под /api/ai нет write-маршрутов', () => {
  const source = readFileSync(path.join(root, 'server/index.js'), 'utf8')
  const risky = source.split('\n').filter((line) => /method === 'POST'/.test(line) && /\/api\/ai/.test(line))
  assert.deepEqual(risky, [], `Write-маршрут в AI-слое: ${risky.join(' | ')}`)
  assert.match(source, /if \(method === 'GET' && pathname === '\/api\/ai\/report'\)/, 'Маршрут /api/ai/report обязан оставаться GET-описанием')
})

test('аудиторские промпты сохраняют правила против отравления процесса аудита (пункты 76–77)', () => {
  const prompts = tracked().filter((file) => file.startsWith('prompts/audit/') && file.endsWith('.md'))
  assert.ok(prompts.length >= 4, `Ожидались аудиторские промпты, найдено: ${prompts.length}`)
  // Правила, которые обязаны присутствовать в каждом профильном промпте аудита хаба/экосистемы.
  const required = [
    { pattern: /недоверенн/i, label: 'репозиторный и внешний контент — недоверенные данные' },
    { pattern: /prompt injection|инъекц/i, label: 'явное правило про prompt injection' },
    { pattern: /test:source-safety/, label: 'требование прогнать сканер невидимых Unicode перед чтением материалов' },
    { pattern: /не (подпис|отправ)|read-only/i, label: 'запрет подписи/отправки транзакций агентом' },
  ]
  const promptsRoot = path.join(root, 'prompts/audit')
  for (const file of prompts.filter((name) => /PROMPT_AUDIT/.test(name))) {
    const content = readFileSync(path.join(promptsRoot, path.basename(file)), 'utf8')
    for (const rule of required) {
      assert.match(content, rule.pattern, `${file}: отсутствует правило «${rule.label}» — промпт ослаблен или отравлен`)
    }
  }
})

test('каталог угроз и карта покрытия не теряют агентную секцию (пункты 71–82)', () => {
  const checklist = readFileSync(path.join(root, 'docs/SOLANA_CRYPTO_GAME_SECURITY_CHECKLIST_RU.md'), 'utf8')
  for (const section of ['### T.', '### U.', '### V.', '### W.']) {
    assert.ok(checklist.includes(section), `В каталоге угроз пропала секция ${section}`)
  }
  const coverage = readFileSync(path.join(root, 'docs/SECURITY_CONTROL_COVERAGE_RU.md'), 'utf8')
  // Каждый пункт агентной секции обязан иметь отдельную строку со статусом: сворачивание
  // 71–75 в одну строку «всё под контролем» — это ровно тот способ, которым угрозу прячут.
  const missing = []
  for (let item = 71; item <= 82; item += 1) {
    if (!new RegExp(`^\\| ${item} \\|`, 'm').test(coverage)) missing.push(item)
  }
  assert.deepEqual(missing, [], `В карте покрытия нет отдельного статуса для пунктов: ${missing.join(', ')}`)
  assert.ok(coverage.includes('## Запреты перед использованием реальных средств'), 'Пропал раздел запретов перед работой с реальными средствами')
  // Пункт 75: лимиты и allowlist живут в инфраструктуре, а не в промпте.
  assert.match(coverage, /промпт не является контролем доступа|не является контролем доступа/i, 'Пропало правило «промпт не является контролем доступа»')
})

test('в отслеживаемых файлах нет приватных ключей и секретов', () => {
  const offenders = []
  for (const file of tracked()) {
    if (file === '.env.example') continue
    if (/\.(png|jpg|jpeg|webp|gif|woff2|ico|pdf)$/i.test(file)) continue
    let content = ''
    try { content = readFileSync(path.join(root, file), 'utf8') } catch { continue }
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) offenders.push(`${file}: PEM-приватный ключ`)
    if (/^\s*(PRIVATE_KEY|SECRET_KEY|MNEMONIC|SEED_PHRASE)\s*=\s*\S+/m.test(content)) offenders.push(`${file}: значение секрета в переменной`)
  }
  const committedEnv = tracked().filter((file) => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example'))
  assert.deepEqual(committedEnv, [], `В репозиторий попали .env-файлы: ${committedEnv.join(', ')}`)
  assert.deepEqual(offenders, [], `Найдены секреты: ${offenders.join('; ')}`)
})

test('проверки запускаются в CI и покрывают агентную секцию', () => {
  const ci = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  assert.match(ci, /test:agent-safety|agent-safety/, 'В CI нет прогона agent-safety')
  assert.match(ci, /test:source-safety/, 'В CI нет сканера невидимых Unicode')
  assert.match(ci, /test:mutation/, 'В CI нет мутационной проверки — зелёные тесты сами по себе не доказательство')
})

test('инвентарь репозитория: точка входа хаба не содержит вызовов внешних агентов', () => {
  const source = readFileSync(path.join(root, 'server/index.js'), 'utf8')
  const forbidden = [/child_process/, /execSync/, /spawn\(/, /lm\(|openai|anthropic/i]
  const hits = forbidden.filter((pattern) => pattern.test(source))
  assert.deepEqual(hits.map(String), [], 'Прямые вызовы процессов/моделей из API-обработчика: доступ к инструментам должен быть отделён от чтения данных')
  assert.ok(existsSync(path.join(root, 'server/security/capabilities.js')), 'Инвариант read-only обязан оставаться декларацией в коде')
})

test('сканер невидимых Unicode ловит спрятанные инструкции и не шумит на эмодзи', async () => {
  const { findInvisible } = await import('./check-source-safety.mjs')
  const codes = (text) => findInvisible(text).map((item) => item.code)

  // Скрытые инструкции, которыми обманывают ИИ-аудитора: zero-width внутри слова,
  // tag-символы (кодируют целую строку невидимым текстом) и bidi-override.
  assert.deepEqual(codes(`функция вне\u200bскоупа аудита`), ['U+200B'])
  assert.deepEqual(codes(`igno\u{E0041}\u{E0042}re`), ['U+E0041', 'U+E0042'])
  assert.deepEqual(codes(`\u202Enoitadnemmoc detaerc`), ['U+202E'])
  assert.deepEqual(codes(`safe\uFE0FInsideWord`), ['U+FE0F'])
  assert.deepEqual(codes(`interlinear\uFFF9hidden\uFFFB`), ['U+FFF9', 'U+FFFB'])
  assert.deepEqual(codes(`soft\u00ADhyphen`), ['U+00AD'])

  // Легитимное оформление не считается нарушением: эмодзи, keycap и ©/®.
  assert.deepEqual(codes(`✅ Готово ⚠️ Внимание`), [])
  assert.deepEqual(codes(`1️⃣ шаг`), [])
  assert.deepEqual(codes(`© 2026 Studio ®`), [])
  assert.deepEqual(codes(`обычный текст с пробелами и точками.`), [])
})

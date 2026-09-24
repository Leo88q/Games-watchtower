#!/usr/bin/env node
/**
 * Проверка инварианта read-only: хаб не подписывает и не отправляет транзакции.
 *
 *   node scripts/check-read-only.mjs
 *
 * Сканирует серверный код и конфигурацию пакета. Код возврата 1, если запрещённый вызов
 * найден в исполняемом коде — тогда «writes: false» в /api/health становится ложью.
 * Упоминания внутри строк и комментариев не считаются вызовами и выводятся отдельно:
 * это документация и примеры клиентского кода, а не действия хаба.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FORBIDDEN_PATTERNS } from '../server/security/capabilities.js'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const SCAN_DIRS = ['server', 'scripts']
const SCAN_ROOT_FILES = ['package.json', 'vite.config.js']
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'data', 'coverage'])
// Файлы, где запрещённые паттерны перечислены как данные: сам список и эта проверка.
const SKIP_FILES = new Set(['check-read-only.mjs', 'capabilities.js'])

/**
 * Заменяет содержимое строк, шаблонов и комментариев пробелами, сохраняя длину и переводы строк.
 * Так «sendTransaction» внутри примера кода не считается вызовом, а реальный вызов — считается.
 */
export function maskNonCode(source) {
  const chars = source.split('')
  const out = chars.map((ch) => (ch === '\n' ? '\n' : ' '))
  let state = 'code'
  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index]
    const next = chars[index + 1]
    if (state === 'code') {
      if (ch === '/' && next === '/') { state = 'line'; continue }
      if (ch === '/' && next === '*') { state = 'block'; continue }
      if (ch === "'") { state = 'single'; continue }
      if (ch === '"') { state = 'double'; continue }
      if (ch === '`') { state = 'template'; continue }
      out[index] = ch
      continue
    }
    if (state === 'line') { if (ch === '\n') { state = 'code'; out[index] = '\n' } continue }
    if (state === 'block') { if (ch === '*' && next === '/') { state = 'code'; index += 1 } continue }
    if (ch === '\\') { index += 1; continue }
    if (state === 'single' && ch === "'") { state = 'code'; continue }
    if (state === 'double' && ch === '"') { state = 'code'; continue }
    if (state === 'template' && ch === '`') { state = 'code'; continue }
  }
  return out.join('')
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const violations = []
const documentationMentions = []

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = [
    ...SCAN_ROOT_FILES.map((name) => path.join(root, name)).filter((full) => existsSync(full)),
    ...SCAN_DIRS.filter((dir) => existsSync(path.join(root, dir))).flatMap((dir) => walk(path.join(root, dir))),
  ]

  for (const file of files) {
    const relative = path.relative(root, file)
    if (SKIP_FILES.has(path.basename(file))) continue
    const content = readFileSync(file, 'utf8')
    const masked = maskNonCode(content)
    const codeLines = masked.split('\n')
    const rawLines = content.split('\n')
    codeLines.forEach((line, index) => {
      for (const { pattern, label } of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({ file: relative, line: index + 1, label, text: rawLines[index].trim().slice(0, 120) })
          return
        }
        if (pattern.test(rawLines[index] || '')) {
          documentationMentions.push({ file: relative, line: index + 1, label })
          return
        }
      }
    })
  }

  // Зависимости: любой Solana-клиент в серверной части означает потенциальную отправку транзакций.
  const manifestPath = path.join(root, 'package.json')
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    for (const section of ['dependencies', 'optionalDependencies']) {
      for (const name of Object.keys(manifest[section] || {})) {
        if (/solana|anchor|web3\.js|spl-token|tweetnacl/i.test(name)) {
          violations.push({ file: 'package.json', line: 1, label: `зависимость ${section}.${name}`, text: name })
        }
      }
    }
  }

  if (violations.length) {
    console.error('❌ Read-only инвариант нарушен: запрещённые вызовы найдены в исполняемом коде')
    for (const item of violations) console.error(`  ${item.file}:${item.line} — ${item.label} → ${item.text}`)
    console.error('\nПодпись и отправка транзакций — ответственность игровых клиентов, а не хаба.')
    process.exit(1)
  }

  console.log(`✅ Read-only инвариант подтверждён: ${files.length} файлов проверено, в исполняемом коде запрещённых вызовов нет.`)
  console.log(`   Упоминаний в примерах/комментариях (не выполняются хабом): ${documentationMentions.length}`)
  for (const item of documentationMentions.slice(0, 12)) console.log(`     ${item.file}:${item.line} — ${item.label} (документация клиентского кода)`)
  console.log('   Разрешённые записи (не блокчейн): data/ingestion-cursors.json, data/investor-snapshots.json, inbox в памяти.')
}

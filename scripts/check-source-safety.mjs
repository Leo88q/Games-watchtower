#!/usr/bin/env node
/**
 * Pre-audit / CI guardrail against invisible Unicode in code and audit inputs.
 * Detects zero-width, bidi override/isolate, soft-hyphen, BOM and Unicode tag controls.
 * It reports code points and line/column, never silently strips source (stripping can alter strings).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.rs', '.json', '.yml', '.yaml', '.toml', '.md', '.html'])
const skip = /(^|\/)(node_modules|dist|coverage|\.git|\.next|target)(\/|$)/
const isInvisible = (code) => code === 0x00ad || code === 0x034f || code === 0x061c || code === 0x115f || code === 0x1160 || code === 0x17b4 || code === 0x17b5 || code === 0x180e || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2060 && code <= 0x206f) || code === 0x3164 || code === 0xfeff || code === 0xffa0 || (code >= 0xfff0 && code <= 0xfff8) || (code >= 0x1bca0 && code <= 0x1bca3) || (code >= 0x1d173 && code <= 0x1d17a) || (code >= 0xe0000 && code <= 0xe0fff)

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString('utf8').split('\0').filter(Boolean)
const candidates = tracked.filter((file) => extensions.has(path.extname(file).toLowerCase()) && !skip.test(file))
const violations = []

for (const file of candidates) {
  const contents = readFileSync(path.join(root, file), 'utf8')
  let line = 1
  let column = 0
  for (const char of contents) {
    const code = char.codePointAt(0)
    if (isInvisible(code)) violations.push({ file, line, column: column + 1, code: `U+${code.toString(16).toUpperCase().padStart(4, '0')}` })
    if (char === '\n') { line += 1; column = 0 } else column += 1
  }
}

if (violations.length) {
  console.error(`❌ Найдены невидимые/направляющие Unicode-символы: ${violations.length}`)
  for (const item of violations) console.error(`  ${item.file}:${item.line}:${item.column} ${item.code}`)
  console.error('Удалите символ вручную после проверки diff; сканер намеренно не переписывает файлы.')
  process.exitCode = 1
} else {
  console.log(`✅ Source-safety scan: ${candidates.length} исходных/аудиторских файлов проверено, невидимых управляющих Unicode-символов нет.`)
}

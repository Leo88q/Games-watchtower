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
// Диапазоны, которыми прячут текст от человека, но не от ИИ-аудитора:
//  - tag-символы (E0000..E0FFF) — ими кодируют целые скрытые инструкции;
//  - interlinear annotation (FFF9..FFFB) — текст, не отображаемый в большинстве просмотрщиков;
//  - zero-width/bidi/прочие управляющие, включая U+2065 и BOM;
//  - variation selectors (FE00..FE0F, 180B..180D) — но только вне эмодзи-контекста: FE0F после
//    пиктограммы (✅️) или перед keycap (1️⃣) — это обычное оформление, а тот же символ внутри
//    слова или идентификатора — способ спрятать вариант написания. Ложных срабатываний на UI нет.
const isInvisibleCode = (code) => code === 0x00ad || code === 0x034f || code === 0x061c || code === 0x115f || code === 0x1160 || code === 0x17b4 || code === 0x17b5 || code === 0x180e || (code >= 0x180b && code <= 0x180d) || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2060 && code <= 0x206f) || code === 0x3164 || code === 0xfeff || code === 0xffa0 || (code >= 0xfff0 && code <= 0xfff8) || (code >= 0xfff9 && code <= 0xfffb) || (code >= 0x1bca0 && code <= 0x1bca3) || (code >= 0x1d173 && code <= 0x1d17a) || (code >= 0xe0000 && code <= 0xe0fff)
// Расширенная пиктографика Unicode (эмодзи, ©, ®, ™) и keycap-последовательности.
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u
const isVariationSelector = (code) => (code >= 0xfe00 && code <= 0xfe0f) || (code >= 0x180b && code <= 0x180d)
const isEmojiPresentation = (contents, index) => {
  const previous = index > 0 ? contents[index - 1] : ''
  const next = index + 1 < contents.length ? contents[index + 1] : ''
  if (previous && PICTOGRAPHIC.test(previous)) return true
  return next === '\u20E3'
}
export const isInvisible = (code, contents, index) => isInvisibleCode(code) || (isVariationSelector(code) && !isEmojiPresentation(contents ?? '', index ?? -1))

/** Проверка строки целиком: возвращает найденные невидимые символы (для тестов и pre-audit). */
export function findInvisible(text) {
  const symbols = [...String(text)]
  const found = []
  symbols.forEach((char, index) => {
    const code = char.codePointAt(0)
    if (isInvisible(code, symbols, index)) found.push({ index, code: `U+${code.toString(16).toUpperCase().padStart(4, '0')}` })
  })
  return found
}

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString('utf8').split('\0').filter(Boolean)
const candidates = tracked.filter((file) => extensions.has(path.extname(file).toLowerCase()) && !skip.test(file))
const violations = []

for (const file of candidates) {
  const contents = readFileSync(path.join(root, file), 'utf8')
  let line = 1
  let column = 0
  const symbols = [...contents]
  for (let index = 0; index < symbols.length; index += 1) {
    const char = symbols[index]
    const code = char.codePointAt(0)
    if (isInvisible(code, symbols, index)) violations.push({ file, line, column: column + 1, code: `U+${code.toString(16).toUpperCase().padStart(4, '0')}` })
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

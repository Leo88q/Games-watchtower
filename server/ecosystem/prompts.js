// ПРОМПТЫ ARENA: read-only выдача промптов из репозитория хаба.
// Нужна, чтобы в интерфейсе была рабочая кнопка «Приступить»: она копирует готовый
// промпт для конкретной игры/приложения, чтобы вставить его в новую сессию Arena.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const CATALOG = [
  { id: 'hub', title: 'Хаб — минимум', file: 'prompts/arena/PROMPT_ARENA_WATCHTOWER_HUB.md', target: 'Games-watchtower', level: 'L2' },
  { id: 'ares1', title: 'ARES-1 — минимум', file: 'prompts/arena/PROMPT_ARENA_ARES1.md', target: 'ares1', level: 'L2' },
  { id: 'aof', title: 'AOF — минимум', file: 'prompts/arena/PROMPT_ARENA_AOF.md', target: 'aof', level: 'L2' },
  { id: 'neonrelay', title: 'Neon Relay — минимум', file: 'prompts/arena/PROMPT_ARENA_NEONRELAY.md', target: 'neon-relay', level: 'L2' },
  { id: 'guttercaps', title: 'Gutter Caps — минимум', file: 'prompts/arena/PROMPT_ARENA_GUTTERCAPS.md', target: 'guttercaps', level: 'L2' },
  { id: 'trafficgen', title: 'TalkChart (приложение) — минимум', file: 'prompts/arena/PROMPT_ARENA_TRAFFICGEN.md', target: 'talkchart-traffic-generator', level: 'L2' },
  { id: 'max-hub', title: 'Хаб — максимум (L4)', file: 'prompts/arena/max/PROMPT_MAX_HUB.md', target: 'Games-watchtower', level: 'L4' },
  { id: 'max-ares1', title: 'ARES-1 — максимум (L3/L4)', file: 'prompts/arena/max/PROMPT_MAX_ARES1.md', target: 'ares1', level: 'L4' },
  { id: 'max-aof', title: 'AOF — максимум (L3/L4)', file: 'prompts/arena/max/PROMPT_MAX_AOF.md', target: 'aof', level: 'L4' },
  { id: 'max-neonrelay', title: 'Neon Relay — максимум (L3/L4)', file: 'prompts/arena/max/PROMPT_MAX_NEONRELAY.md', target: 'neon-relay', level: 'L4' },
  { id: 'max-guttercaps', title: 'Gutter Caps — максимум (L3/L4)', file: 'prompts/arena/max/PROMPT_MAX_GUTTERCAPS.md', target: 'guttercaps', level: 'L4' },
  { id: 'max-trafficgen', title: 'TalkChart — максимум (L4)', file: 'prompts/arena/max/PROMPT_MAX_TRAFFICGEN.md', target: 'talkchart-traffic-generator', level: 'L4' },
  { id: 'max-investor', title: 'Инвесторский лендинг — максимум (L4)', file: 'prompts/arena/max/PROMPT_MAX_INVESTOR.md', target: 'investor', level: 'L4' },
]

export function listArenaPrompts() {
  return {
    writes: false,
    count: CATALOG.length,
    prompts: CATALOG.map((entry) => {
      const full = path.join(root, entry.file)
      let exists = false
      let bytes = 0
      try { const stat = fs.statSync(full); exists = stat.isFile(); bytes = stat.size } catch { exists = false }
      return { ...entry, exists, bytes }
    }),
  }
}

export function readArenaPrompt(id) {
  const entry = CATALOG.find((item) => item.id === id)
  if (!entry) return null
  try {
    const text = fs.readFileSync(path.join(root, entry.file), 'utf8')
    return { ...entry, text, bytes: Buffer.byteLength(text) }
  } catch {
    return { ...entry, text: null, error: 'prompt_file_unavailable' }
  }
}

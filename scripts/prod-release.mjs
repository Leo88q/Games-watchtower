#!/usr/bin/env node
/**
 * Единый прогон студии: обновление → сборка → тесты → (опционально) деплой программ.
 *
 * Обходит все репозитории одного каталога студии, например:
 *
 *   ~/Library/Mobile Documents/com~apple~CloudDocs/LeoGamesStudio
 *     Games-watchtower/                  хаб (read-only): npm ci, verify, живой smoke, docker-образ
 *     ares1/ aof/ guttercaps/ neon-relay/ игры: npm ci, build, test, anchor build + anchor test
 *
 * В сеть по умолчанию ничего не отправляется. --deploy --cluster=devnet запускает деплой на devnet,
 * mainnet дополнительно требует AUDIT_ACK=1 и --i-understand-mainnet (см. docs/AUDIT_FIXES_2026-09-23.md:
 * опасные write-операции не автоматизируются без подтверждения).
 *
 *   node scripts/prod-release.mjs --dry-run                 # только план, без side-effects
 *   node scripts/prod-release.mjs                           # всё, во всех репозиториях
 *   node scripts/prod-release.mjs --only=ares1,Games-watchtower
 *   node scripts/prod-release.mjs --skip-tests --docker=0   # быстро: сборка без тестов
 *   node scripts/prod-release.mjs --deploy --cluster=devnet --only=ares1
 *   AUDIT_ACK=1 node scripts/prod-release.mjs --deploy --cluster=mainnet-beta --only=ares1 --i-understand-mainnet
 *
 * Код возврата: число упавших шагов (0 = всё зелёное). Отчёт — reports/prod-release-<UTC>.md
 */

import { spawn, spawnSync } from 'node:child_process'
import {
  closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync,
  realpathSync, writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

// ─────────────────────────────────────────────────────────── аргументы ──
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opt = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit === undefined ? dflt : hit.slice(`--${name}=`.length)
}
const DRY = flag('dry-run')
const DEPLOY = flag('deploy')
const CLUSTER = opt('cluster', 'devnet')
const MAINNET_ACK = flag('i-understand-mainnet')
const DOCKER = opt('docker', '1') !== '0'
const PULL = opt('pull', '1') !== '0'
const SKIP_TESTS = flag('skip-tests')
const ONLY = opt('only', '').split(',').map((s) => s.trim()).filter(Boolean)
const PORT = Number(opt('port', 8787))
const STAGE_TIMEOUT = Number(opt('timeout', 45 * 60 * 1000))
const HUB = 'Games-watchtower'

const HERE = path.dirname(realpathSync(fileURLToPath(import.meta.url)))
const HUB_ROOT = path.resolve(HERE, '..')
const STUDIO = path.resolve(opt('studio', path.dirname(HUB_ROOT)))
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const RUN_ID = `${TS}-p${process.pid}`
const LOG_DIR = path.resolve(opt('logs', path.join(os.tmpdir(), `leo-release-${RUN_ID}`)))
const REPORT = path.resolve(opt('report', path.join(HUB_ROOT, 'reports', `prod-release-${RUN_ID}.md`)))
mkdirSync(LOG_DIR, { recursive: true })
mkdirSync(path.dirname(REPORT), { recursive: true })

// ─────────────────────────────────────────────────────────────── вывод ──
const COLOR = Boolean(process.stdout.isTTY) && !flag('no-color')
const c = (code, s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : String(s))
const bold = (s) => c('1', s)
const dim = (s) => c('2', s)
const rows = []
let failures = 0
/** Падения по репозиториям: красный шаг в репо блокирует выход в сеть для этого же репо. */
const repoFailures = new Map()

const step = (repo, label) => console.log(`\n${bold(`▸ ${repo} · ${label}`)}`)
const ok = (m) => console.log(`  ${c('32', '✓')} ${m}`)
const warn = (m) => console.log(`  ${c('33', '!')} ${m}`)
const bad = (m) => console.log(`  ${c('31', '✗')} ${m}`)

function record(repo, label, status, detail = '') {
  rows.push({ repo, label, status, detail })
  if (status === 'fail') {
    failures += 1
    repoFailures.set(repo, (repoFailures.get(repo) || 0) + 1)
  }
}

const readJson = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null } }
const cwdOf = (repo) => (repo === HUB ? HUB_ROOT : path.join(STUDIO, repo))

/** Команда идёт через /bin/sh -c (пайплайны работают), вывод — в лог-файл, а не в буфер. */
function exec(repo, label, command, { cwd, env = {} } = {}) {
  step(repo, label)
  const where = cwd || cwdOf(repo)
  if (DRY) {
    console.log(dim(`      [dry-run] cd ${where} && ${command}`))
    record(repo, label, 'dry')
    return { ok: true, dry: true }
  }
  const file = path.join(LOG_DIR, `${repo}__${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.log`)
  const fd = openSync(file, 'w')
  const started = Date.now()
  const res = spawnSync('/bin/sh', ['-c', command], {
    cwd: where,
    env: { ...process.env, ...env },
    stdio: ['ignore', fd, fd],
    timeout: STAGE_TIMEOUT,
    killSignal: 'SIGKILL',
  })
  closeSync(fd)
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  if (res.error) {
    bad(`${label}: не удалось запустить (${res.error.code || res.error.message})`)
    record(repo, label, 'fail', res.error.code || 'spawn error')
    return { ok: false }
  }
  if (res.status !== 0) {
    const tail = readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-12)
    bad(`${label}: код ${res.status} за ${secs} с${res.status === null ? ' (таймаут, процесс убит)' : ''}`)
    if (tail.length) console.log(dim(tail.map((l) => `      ${l}`).join('\n')))
    console.log(dim(`      полный лог: ${file}`))
    record(repo, label, 'fail', `exit ${res.status}`)
    return { ok: false }
  }
  ok(`${label} (${secs} с) ${dim(path.basename(file))}`)
  record(repo, label, 'pass', `${secs}s`)
  return { ok: true }
}

const gitOut = (dir, cmd) => { try { return spawnSync('/bin/sh', ['-c', cmd], { cwd: dir, encoding: 'utf8' }).stdout.trim() } catch { return '' } }

// ─────────────────────────────────────────────── адрес программы: валид ──
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function checkProgramId(id) {
  if (typeof id !== 'string' || id.length < 32 || id.length > 44) return 'длина не 32–44 символа'
  if (!id.split('').every((ch) => B58.includes(ch))) return 'не base58 (символов 0 O I l в алфавите нет)'
  let n = 0n
  for (const ch of id) n = n * 58n + BigInt(B58.indexOf(ch))
  let hex = n.toString(16)
  if (hex.length % 2) hex = `0${hex}`
  let ones = 0
  for (const ch of id) { if (ch === '1') ones += 1; else break }
  const bytes = ones + hex.length / 2
  return bytes === 32 ? 'ok' : `${bytes} байт вместо 32`
}

// ───────────────────────────────── поиск Anchor-воркспейса и чтение toml ──
function findAnchorWorkspace(repoDir) {
  const hits = []
  const SKIP = new Set(['node_modules', '.git', 'target', 'dist', 'build', 'Library', 'Library', 'obj'])
  const walk = (dir, depth) => {
    if (depth > 3) return
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(full, depth + 1) }
      else if (e.isFile() && /^anchor\.toml$/i.test(e.name)) hits.push(full)
    }
  }
  walk(repoDir, 0)
  // Anchor.toml обязан называться именно так: lowercase anchor.toml Anchor не читает (на Linux/в git).
  return hits.sort((a, b) => (path.basename(a) === 'Anchor.toml' ? -1 : 1) - (path.basename(b) === 'Anchor.toml' ? -1 : 1))
    .map((toml) => ({ toml, dir: path.dirname(toml), exactName: path.basename(toml) === 'Anchor.toml' }))
}

function tomlSection(toml, section) {
  const out = {}
  let inside = false
  for (const raw of toml.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('[') && line.endsWith(']')) { inside = line.slice(1, -1).trim() === section; continue }
    if (!inside || !line || line.startsWith('#')) continue
    const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"|^([A-Za-z0-9_-]+)\s*=\s*([^#\n]+)$/)
    if (m) out[m[1] || m[3]] = (m[2] ?? m[4]).trim()
  }
  return out
}

const clusterSection = () => (CLUSTER === 'mainnet-beta' ? 'programs.mainnet' : CLUSTER === 'localnet' ? 'programs.localnet' : 'programs.devnet')

// ───────────────────────────────────────────── один репозиторий целиком ──
function processRepo(repo) {
  const dir = cwdOf(repo)
  console.log(`\n${c('4;1', `══ ${repo} ${'═'.repeat(Math.max(2, 58 - repo.length))}`)}`)
  if (!existsSync(dir)) { bad(`каталог не найден: ${dir}`); record(repo, 'каталог', 'fail', 'нет папки'); return }

  // 1 · Обновление.
  if (!existsSync(path.join(dir, '.git'))) {
    warn('не git-репозиторий — обновление пропущено, проверяется текущее состояние')
    record(repo, 'git pull', 'skip', 'нет .git')
  } else {
    const dirty = gitOut(dir, 'git status --porcelain --untracked-files=no')
    if (dirty) {
      bad('незакоммиченные правки в отслеживаемых файлах:')
      console.log(dim(dirty.split('\n').slice(0, 8).map((l) => `      ${l}`).join('\n')))
      console.log(dim('      commit или stash — иначе артефакт не соответствует ни одному коммиту'))
      record(repo, 'рабочее дерево', 'fail', 'dirty')
      return
    }
    if (PULL) {
      const r = exec(repo, 'git pull --ff-only',
        'git fetch --all --prune && (git pull --ff-only || git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD)")', { cwd: dir })
      if (!r.ok) { warn('дальше идёт проверка текущего HEAD'); }
    } else {
      warn('pull выключен (--pull=0)')
      record(repo, 'git pull', 'skip', '--pull=0')
    }
  }
  const sha = gitOut(dir, 'git rev-parse --short HEAD') || 'нет-git'
  console.log(`  ${dim(`HEAD ${sha} · ${gitOut(dir, 'git rev-parse --abbrev-ref HEAD')}`)}`)

  const pkg = readJson(path.join(dir, 'package.json'))
  const scripts = pkg?.scripts ?? {}

  // 2 · Зависимости с нуля.
  if (pkg) {
    const lock = existsSync(path.join(dir, 'package-lock.json'))
    if (!lock) warn('нет package-lock.json: установка не воспроизводима (зафиксируйте lock в git)')
    exec(repo, lock ? 'npm ci' : 'npm install', lock
      ? 'rm -rf node_modules && npm ci --no-audit --no-fund'
      : 'npm install --no-audit --no-fund')
  } else {
    warn('нет package.json — npm-шаги пропущены')
    record(repo, 'npm', 'skip', 'нет package.json')
  }

  // 3 · Сборки.
  const builds = Object.keys(scripts).filter((s) => /^build(:.+)?$/.test(s)).slice(0, 5)
  for (const b of builds) exec(repo, `npm run ${b}`, `npm run ${b}`)
  if (pkg && !builds.length) { warn('build-скриптов нет — собирать нечего'); record(repo, 'build', 'skip', 'нет build-скриптов') }

  // 4 · Тесты.
  if (SKIP_TESTS) { warn('тесты пропущены (--skip-tests)'); record(repo, 'тесты', 'skip', '--skip-tests') }
  else if (repo === HUB) {
    exec(repo, 'npm run verify — тесты + мутации + сборка', 'npm run verify')
    liveSmoke(repo, dir)
  } else if (pkg) {
    const suites = ['test', 'test:unit', 'test:integration', 'test:contract', 'test:e2e', 'test:smoke', 'smoke']
      .filter((s) => scripts[s]).slice(0, 5)
    if (suites.length) for (const s of suites) exec(repo, `npm run ${s}`, `npm run ${s}`, { env: { CI: '1' } })
    else { warn('тестовых npm-скриптов нет — тестировать нечего'); record(repo, 'тесты', 'warn', 'нет скриптов') }
  }

  // 5 · Программы.
  if (repo === HUB) { hubContractStatus(repo); return }
  const workspaces = findAnchorWorkspace(dir)
  if (!workspaces.length) {
    warn('Anchor-воркспейс не найден (нет Anchor.toml в 3 уровнях) — программы не собираются')
    record(repo, 'anchor', 'skip', 'нет Anchor.toml')
  }
  for (const ws of workspaces) {
    const rel = path.relative(dir, ws.dir) || '.'
    if (!ws.exactName) {
      warn(`${rel}: файл «${path.basename(ws.toml)}» → переименуйте в «Anchor.toml», иначе anchor его не находит (Linux/CI, git)`)
      record(repo, 'имя Anchor.toml', 'warn')
    }
    if (!SKIP_TESTS) {
      exec(repo, `anchor build (${rel})`, 'anchor build', { cwd: ws.dir })
      exec(repo, `anchor test (${rel})`, 'anchor test', { cwd: ws.dir })
    } else record(repo, 'anchor build/test', 'skip', '--skip-tests')
    const ids = checkClusterConfig(repo, ws, rel)
    deployStage(repo, ws, rel, ids)
  }

  // 6 · Образ — только хаб.
  if (repo === HUB) {
    if (!DOCKER) { warn('docker пропущен (--docker=0)'); record(repo, 'docker', 'skip', '--docker=0') }
    else if (spawnSync('/bin/sh', ['-c', 'docker info >/dev/null 2>&1'], { encoding: 'utf8', timeout: 20000 }).status !== 0) {
      warn('docker-демон не отвечает — включите Docker Desktop и повторите (или --docker=0)')
      record(repo, 'docker', 'warn', 'демон недоступен')
    } else {
      exec(repo, 'docker build + тег :current',
        `docker build -q -t "watchtower-os:${sha}" . && docker tag "watchtower-os:${sha}" watchtower-os:current`)
    }
  }
}

/**
 * Контракты хаба — только спецификация: Cargo.toml/Anchor.toml нет, program id в реестре заглушки.
 * Собирать здесь нельзя: server/contracts/target существует по определению не должен быть,
 * иначе npm run test:docs краснеет, а CI падает на пустом месте. Деплой — в репозитории игры.
 */
function hubContractStatus(repo) {
  step(repo, 'контракты: статус (хаб ничего не деплоит)')
  const dir = path.join(HUB_ROOT, 'server', 'contracts')
  const tomlFile = ['Anchor.toml', 'anchor.toml'].map((n) => path.join(dir, n)).find(existsSync)
  const toml = tomlFile ? readFileSync(tomlFile, 'utf8') : ''
  const hasCrate = ['Cargo.toml', 'programs'].some((n) => existsSync(path.join(dir, n)))
  const artifacts = existsSync(path.join(dir, 'target')) || existsSync(path.join(dir, 'app'))
  if (artifacts) {
    bad('в хаб-репозитории появились артефакты сборки программ (server/contracts/target) — удалите: npm run test:docs на этом падает')
    record(repo, 'артефакты программ', 'fail', 'target/ в репозитории')
  } else ok('артефактов программ нет (server/contracts/target отсутствует)')
  if (hasCrate) {
    warn('в server/contracts появился Rust-крейт: хаб его не собирает и не тестирует — перенесите в игру или заведите отдельный CI с toolchain')
    record(repo, 'статус программ', 'warn', 'крейт в хабе')
  } else {
    warn('программы хаба — спецификация (нет Cargo.toml/Anchor.toml): здесь не собираются, не тестируются и не деплоятся')
    record(repo, 'статус программ', 'skip', 'spec-only')
  }
  for (const [name, id] of Object.entries(tomlSection(toml, 'programs.devnet'))) {
    const verdict = checkProgramId(id)
    if (verdict === 'ok') ok(`devnet ${name} → ${id}`)
    else warn(`devnet ${name} → ${id}: ${verdict} — заглушка, обновить после реального деплоя в игре`)
  }
  if (DEPLOY) {
    bad('--deploy в каталоге хаба запрещён: писать в сеть может только пайплайн игры. Запустите скрипт из репозитория игры (--only=<игра>)')
    record(repo, 'деплой', 'fail', 'деплой не зона ответственности хаба')
  } else ok('деплой из хаба не выполнялся и не будет выполнен: writes:false — инвариант (npm run test:readonly)')
}

/** Что реально ломает деплой: секция сети, валидность program id, cluster у provider. */
function checkClusterConfig(repo, ws, rel) {
  const toml = (() => { try { return readFileSync(ws.toml, 'utf8') } catch { return '' } })()
  const section = clusterSection()
  step(repo, `конфигурация ${CLUSTER} (${rel})`)
  if (!toml.includes(`[${section}]`)) {
    bad(`нет секции [${section}] в ${path.basename(ws.toml)} — деплой в ${CLUSTER} не настроен`)
    record(repo, `[${section}]`, 'fail', 'нет секции')
    return {}
  }
  ok(`секция [${section}] есть`)
  const ids = tomlSection(toml, section)
  const entries = Object.entries(ids)
  if (!entries.length) { bad('секция пуста: program id не указан'); record(repo, 'program ids', 'fail', 'пусто'); return {} }
  let invalid = 0
  for (const [name, id] of entries) {
    const verdict = checkProgramId(id)
    if (verdict === 'ok') ok(`${name} → ${id}`)
    else { bad(`${name} → ${id} : ${verdict} — заглушка, а не адрес`); record(repo, `program id ${name}`, 'fail', verdict); invalid += 1 }
  }
  if (invalid) console.log(dim(`      реальный адрес выдаёт деплой: ${path.basename(ws.toml)} обновляют ПОСЛЕ него, а не до`))
  const provider = tomlSection(toml, 'provider')
  if (!provider.cluster) warn('нет [provider] cluster — нужен явный --provider.cluster')
  return ids
}

function deployStage(repo, ws, rel, ids) {
  step(repo, `деплой (${CLUSTER})`)
  const keypair = (process.env.SOLANA_KEYPAIR || '~/.config/solana/id.json').replace(/^~/, os.homedir())
  const anchorCluster = CLUSTER === 'mainnet-beta' ? 'mainnet' : CLUSTER
  const plan = [
    `cd "${ws.dir}"`,
    'anchor build --verifiable',
    `solana-keygen pubkey "${keypair}"        # пэйер и будущий владелец буфера`,
    `# program id из [${clusterSection()}] обязан совпасть с задеплоенным: ${Object.entries(ids).map(([k, v]) => `${k}=${v}`).join(' ') || 'не задан'}`,
    `anchor deploy --provider.cluster ${anchorCluster}`,
    `solana program show --programs --url ${CLUSTER}`,
    `# затем: upgrade authority → multisig (Squads 2/3), programId → в реестр хаба и в SDK игр`,
  ]
  if (!DEPLOY) {
    warn('--deploy не задан: в сеть ничего не отправлялось')
    console.log(dim(plan.map((l) => `      ${l}`).join('\n')))
    console.log(dim(`      для исполнения: --deploy --cluster=${CLUSTER}${CLUSTER === 'mainnet-beta' ? ' + AUDIT_ACK=1 + --i-understand-mainnet' : ''}`))
    record(repo, 'деплой', 'skip', 'не запрошен')
    return
  }
  const blockers = []
  const red = repoFailures.get(repo) || 0
  if (red) blockers.push(`${red} упавших шаг(ов) в этом репозитории — сначала зелёный прогон`)
  if (process.env.AUDIT_ACK !== '1') blockers.push('AUDIT_ACK=1 — внешний аудит программ пройден (docs/AUDIT_FIXES_2026-09-23.md)')
  if (CLUSTER === 'mainnet-beta' && !MAINNET_ACK) blockers.push('--i-understand-mainnet — явное согласие на mainnet')
  if (!existsSync(keypair)) blockers.push(`keypair деплой-кошелька: ${keypair}`)
  for (const tool of ['anchor', 'solana', 'cargo']) {
    if (spawnSync('/bin/sh', ['-c', `command -v ${tool} >/dev/null 2>&1`], { encoding: 'utf8' }).status !== 0) blockers.push(`toolchain: ${tool}`)
  }
  for (const [name, id] of Object.entries(ids)) {
    if (checkProgramId(id) !== 'ok') blockers.push(`program id ${name} невалиден (${checkProgramId(id)})`)
  }
  if (!Object.keys(ids).length) blockers.push(`program id в [${clusterSection()}] не задан`)
  if (blockers.length) {
    bad('деплой заблокирован:')
    console.log(blockers.map((b) => c('33', `      · ${b}`)).join('\n'))
    console.log(dim('      команды для ручного выполнения после снятия блокировок:\n' + plan.map((l) => `      ${l}`).join('\n')))
    record(repo, 'деплой', 'fail', `${blockers.length} блок.`)
    return
  }
  writeFileSync(path.join(LOG_DIR, `${repo}__deploy-audit.log`),
    `${new Date().toISOString()} repo=${repo} cluster=${CLUSTER} workspace=${ws.dir} payer=${keypair}\n${plan.join('\n')}\n`)
  console.log(dim(`      журнал: ${path.join(LOG_DIR, `${repo}__deploy-audit.log`)}`))
  if (CLUSTER === 'mainnet-beta') {
    console.log(c('33', '      mainnet: 5 с на Ctrl-C'))
    if (!DRY) spawnSync('/bin/sleep', ['5'])
  }
  const deployed = exec(repo, `anchor deploy → ${CLUSTER}`, `anchor deploy --provider.cluster ${anchorCluster}`, { cwd: ws.dir })
  exec(repo, `solana program show (${CLUSTER})`, `solana program show --programs --url ${CLUSTER}`, { cwd: ws.dir })
  if (deployed.ok) warn('деплой выполнен: впишите ФАКТИЧЕСКИЙ program id из вывода в реестр хаба, затем npm run test:docs && npm run test:readonly')
}

/** Живой сервер хаба: инвариант writes:false и смоук-контракт. Токены нужны и серверу, и смоуку. */
function liveSmoke(repo, dir) {
  step(repo, 'живой сервер: writes:false + test:smoke')
  if (DRY) { console.log(dim(`      [dry-run] node server/index.js (порт ${PORT}) → npm run test:smoke`)); record(repo, 'smoke', 'dry'); return }
  const port = freePort(PORT)
  if (!port) { bad(`порты ${PORT}–${PORT + 11} заняты — освободите или укажите --port=`); record(repo, 'smoke', 'fail', 'нет свободного порта'); return }
  if (port !== PORT) warn(`порт ${PORT} занят (чужой процесс) — беру ${port}, чтобы смоук шёл против этой сборки`)
  const base = `http://127.0.0.1:${port}`
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    WATCHTOWER_ALLOW_DEMO: '0',
    WATCHTOWER_INGEST_TOKEN: process.env.RELEASE_INGEST_TOKEN || 'release-ingest-token',
    WATCHTOWER_READ_TOKEN: process.env.RELEASE_READ_TOKEN || 'release-read-token',
    WATCHTOWER_PII_SALT: process.env.RELEASE_PII_SALT || 'release-salt-0123456789abcdef',
    API_PORT: String(port),
    WATCHTOWER_API_URL: base,
  }
  const logFile = path.join(LOG_DIR, 'server.log')
  const fd = openSync(logFile, 'w')
  // detached + группа процессов: иначе SIGTERM уходит обёртке, а сервер остаётся сиротой и держит порт.
  const child = spawn('node', ['server/index.js'], { cwd: dir, env, stdio: ['ignore', fd, fd], detached: true })
  const stop = () => { try { process.kill(-child.pid, 'SIGTERM') } catch { /* уже завершился */ } }
  let health = null
  const deadline = Date.now() + 40000
  while (Date.now() < deadline && !health) {
    const r = spawnSync('/bin/sh', ['-c', `curl -sf --max-time 2 ${base}/api/health`], { encoding: 'utf8', timeout: 4000 })
    if (r.status === 0) health = r.stdout
    else spawnSync('/bin/sleep', ['1'])
  }
  if (!health) {
    bad(`сервер не поднялся за 40 с — ${logFile}`)
    record(repo, 'writes:false', 'fail', 'сервер не поднялся')
  } else if (!health.includes('"writes":false')) {
    bad('read-only инвариант нарушен: в /api/health нет "writes":false — выкат останавливать')
    record(repo, 'writes:false', 'fail', 'writes ≠ false')
  } else {
    ok('/api/health: writes:false')
    record(repo, 'writes:false', 'pass')
    const r = exec(repo, 'npm run test:smoke', 'npm run test:smoke', { cwd: dir, env })
    if (r.ok) ok('смоук-контракт на живом сервере пройден')
  }
  stop()
  closeSync(fd)
}

/** Свободный порт: сначала lsof (есть в macOS), иначе — проверка, отвечает ли что-то. */
function freePort(from) {
  for (let port = from; port < from + 12; port += 1) {
    const lsof = spawnSync('/bin/sh', ['-c', `lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null`], { encoding: 'utf8', timeout: 8000 })
    if (!lsof.error && lsof.stdout.trim()) continue
    const answered = spawnSync('/bin/sh', ['-c', `curl -s -o /dev/null --max-time 1 http://127.0.0.1:${port}/api/health`], { encoding: 'utf8', timeout: 4000 })
    if (answered.status !== 0) return port
  }
  return null
}

// ───────────────────────────────────────────────────── список репозиториев ──
function discoverRepos() {
  let entries = []
  try { entries = readdirSync(STUDIO, { withFileTypes: true }) } catch { return [HUB] }
  const repos = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== HUB)
    .map((e) => e.name)
    .filter((name) => {
      const dir = path.join(STUDIO, name)
      return existsSync(path.join(dir, '.git')) || existsSync(path.join(dir, 'package.json')) || findAnchorWorkspace(dir).length > 0
    })
    .sort()
  const all = [HUB, ...repos]
  return ONLY.length ? all.filter((n) => ONLY.includes(n)) : all
}

// ───────────────────────────────────────────────────────────────── старт ──
console.log(bold(`\nКаталог студии: ${STUDIO}`))
if (!existsSync(path.join(HUB_ROOT, 'server', 'index.js'))) {
  console.log(c('31', '✗ этот скрипт должен лежать в Games-watchtower/scripts/ (или укажите --studio=/путь)'))
  process.exit(2)
}
const nodeVersion = spawnSync('/bin/sh', ['-c', 'node -v'], { encoding: 'utf8' }).stdout.trim()
const needNode = Number(String(readJson(path.join(HUB_ROOT, 'package.json'))?.engines?.node || '20').replace(/[^\d]/g, ''))
if (Number(nodeVersion.replace(/^v/, '').split('.')[0]) < needNode) {
  console.log(c('31', `✗ Node ${nodeVersion}, требуется ≥ ${needNode}. Обновите: brew install node@22`))
  process.exit(2)
}
console.log(dim(`режим: ${DRY ? 'dry-run (план без side-effects)' : 'полный прогон'} · деплой: ${DEPLOY ? CLUSTER : 'выключен'} · docker: ${DOCKER ? 'вкл' : 'выкл'} · pull: ${PULL ? 'вкл' : 'выкл'} · тесты: ${SKIP_TESTS ? 'пропущены' : 'вкл'}`))
console.log(dim(`логи: ${LOG_DIR}`))
console.log(dim(`нода: ${nodeVersion}`))

for (const repo of discoverRepos()) processRepo(repo)

// ───────────────────────────────────────────────────────────── отчёт ──────
const ICON = { pass: '✓', fail: '✗', warn: '!', skip: '·', dry: '…' }
const report = [
  `# Прогон сборки и тестов — ${TS}`,
  '',
  `- Каталог: \`${STUDIO}\``,
  `- Режим: ${DRY ? 'dry-run' : 'полный'}; деплой: ${DEPLOY ? CLUSTER : 'не выполнялся'}; docker: ${DOCKER ? 'вкл' : 'выкл'}`,
  `- Логи: \`${LOG_DIR}\``,
  '',
  '| Репозиторий | Шаг | Итог | Детали |',
  '|---|---|---|---|',
  ...rows.map((r) => `| ${r.repo} | ${r.label} | ${ICON[r.status] ?? r.status} | ${r.detail || ''} |`),
  '',
  `Шагов с ошибкой: **${failures}**.`,
  '',
  'Проверяемые инварианты: `writes:false` в `/api/health` (npm run test:readonly), совпадение ENV и',
  'документации (npm run test:docs), отсутствие собранных артефактов программ в `server/contracts`.',
  'Программы студии до внешнего аудита считаются непроверенными — см. server/contracts/README.md.',
  '',
].join('\n')
writeFileSync(REPORT, report)

console.log(`\n${failures ? c('41;1', ` ИТОГ: ${failures} шаг(ов) с ошибкой `) : c('42;1', ' ИТОГ: все шаги зелёные ')}${failures ? '' : '   '}`)
for (const r of rows.filter((x) => x.status === 'fail')) console.log(c('31', `  ✗ ${r.repo} · ${r.label} — ${r.detail}`))
for (const r of rows.filter((x) => x.status === 'warn')) console.log(c('33', `  ! ${r.repo} · ${r.label} — ${r.detail}`))
console.log(dim(`  отчёт: ${REPORT}`))
if (DRY) console.log(dim('  dry-run: side-effects не выполнялись'))
process.exit(failures ? 1 : 0)

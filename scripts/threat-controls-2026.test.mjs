import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadConfig } from '../server/config.js'
import { normalizeEvent, validateEvent } from '../server/ingestion/provider.js'
import { godotSdkSetup } from '../server/modules/engines/godot.js'
import { godotSolanaSdkSetup } from '../server/modules/engines/godot-solana-sdk.js'
import { unrealSdkSetup } from '../server/modules/engines/unreal.js'

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')

test('production fails closed if unknown game IDs are enabled', () => {
  assert.throws(() => loadConfig({
    NODE_ENV: 'production',
    WATCHTOWER_INGEST_TOKEN: 'redacted-test-value',
    WATCHTOWER_READ_TOKEN: 'redacted-test-value',
    WATCHTOWER_PII_SALT: '0123456789abcdef0123456789abcdef',
    WATCHTOWER_ALLOW_UNKNOWN_GAMES: 'true',
  }), /production нельзя отключать allowlist игр/)
})

test('ephemeral IP pseudonym salt uses CSPRNG, not Math.random', () => {
  const originalRandom = Math.random
  Math.random = () => { throw new Error('Math.random must not be used for privacy/security material') }
  try {
    const config = loadConfig({ NODE_ENV: 'test' })
    assert.match(config.ipHashSalt, /^ephemeral:[a-f0-9]{64}$/)
  } finally {
    Math.random = originalRandom
  }
  const source = read('../server/config.js')
  assert.match(source, /randomBytes\(32\)\.toString\('hex'\)/)
  assert.doesNotMatch(source, /Math\.random\s*\(/)
})

test('snapshot identifier no longer depends on Math.random', () => {
  const source = read('../server/analytics/snapshots.js')
  assert.match(source, /randomUUID\(\)/)
  assert.doesNotMatch(source, /Math\.random\s*\(/)
})

test('unknown games remain rejected by the ingestion registry by default', () => {
  const event = normalizeEvent({
    cluster: 'devnet', slot: 1, signature: 'coverage-test', programId: 'Program111',
    gameId: 'unregistered-asset-project', eventType: 'TokenMinted',
    payload: { amount: 1 },
  })
  const result = validateEvent(event)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('unknown gameId')))
})

test('third-party wallet snippets label generated keys devnet-only and require human review', () => {
  const examples = [
    JSON.stringify(godotSdkSetup({ gameId: 'test' }).codeExamples),
    JSON.stringify(godotSolanaSdkSetup({ gameId: 'test' }).codeExamples),
    JSON.stringify(unrealSdkSetup({ gameId: 'test' }).codeExamples),
  ]
  for (const examplesJson of examples) {
    const generatedKeys = [...examplesJson.matchAll(/(?:Keypair\.new_random\(\)|GenerateRandom\(\))/g)]
    assert.ok(generatedKeys.length > 0, 'expected test key examples to be covered')
    for (const match of generatedKeys) {
      const context = examplesJson.slice(Math.max(0, match.index - 500), match.index)
      assert.match(context, /devnet[- ]only|devnet-only|DEVNET/i, 'generated key example must be clearly restricted to disposable devnet/test use')
    }
    assert.match(examplesJson, /explicit (?:user )?approval|explicit wallet approval/i)
    assert.match(examplesJson, /never send a private key|never put mainnet seed\/private keys/i)
  }
})

test('security coverage has a separate status row for every supplied item 94–130', () => {
  const coverage = read('../docs/SECURITY_CONTROL_COVERAGE_RU.md')
  const checklist = read('../docs/SOLANA_CRYPTO_GAME_SECURITY_CHECKLIST_RU.md')
  const missing = []
  for (let item = 94; item <= 130; item += 1) {
    if (!new RegExp(`^\\| ${item} \\|`, 'm').test(coverage)) missing.push(item)
    if (!new RegExp(`^${item}\\. \\[ \\]`, 'm').test(checklist)) missing.push(`checklist:${item}`)
  }
  assert.deepEqual(missing, [], `Threat coverage gaps: ${missing.join(', ')}`)
  assert.match(checklist, /нормализованы в классы угроз[\s\S]*не перепроверялись по первичным источникам/i)
  assert.match(coverage, /не верифицировались отдельно/i)
})

test('CI uses script-disabled install, audits locked dependencies and configures Dependabot', () => {
  const ci = read('../.github/workflows/ci.yml')
  assert.match(ci, /npm ci --ignore-scripts/)
  assert.match(ci, /npm audit --audit-level=high/)
  const dependabot = read('../.github/dependabot.yml')
  assert.match(dependabot, /package-ecosystem: npm/)
  assert.match(dependabot, /package-ecosystem: github-actions/)
})

test('incident response runbook avoids claims of automatic external containment', () => {
  const runbook = read('../docs/INCIDENT_RESPONSE_SECURITY_RU.md')
  assert.match(runbook, /не даёт полномочий замораживать средства/i)
  assert.match(runbook, /не вставляйте секреты/i)
  assert.match(runbook, /Anchor-файлы|не deployed program|не является/i)
})

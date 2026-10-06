import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { copyPublicSite, PUBLIC_FILES } from './build-public-site.mjs'

function listFiles(root, prefix = '') {
  return readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name)
    return entry.isDirectory() ? listFiles(root, relative) : [relative]
  })
}

test('public-site build contains only the explicit site allowlist', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'watchtower-public-site-'))
  const output = path.join(tempRoot, 'dist-public')
  try {
    copyPublicSite(output)
    const actual = listFiles(output).sort()
    const expected = [...PUBLIC_FILES, 'index.html'].sort()
    assert.deepEqual(actual, expected)
    assert.ok(readFileSync(path.join(output, 'index.html'), 'utf8').includes('watchtower-site/'))
    const landing = readFileSync(path.join(output, 'index.html'), 'utf8')
    assert.ok(landing.includes('Leo Games Studio'))
    assert.ok(landing.includes('watchtower-site/terms-of-use.html'))
    assert.ok(landing.includes('watchtower-site/privacy-policy.html'))
    assert.ok(readFileSync(path.join(output, 'token-landing/index.html'), 'utf8').includes('../web-shared/'))
    for (const file of [
      'watchtower-site/studio.css',
      'watchtower-site/studio.js',
      'watchtower-site/terms-of-use.html',
      'watchtower-site/terms-of-use-en.html',
      'watchtower-site/privacy-policy.html',
      'watchtower-site/privacy-policy-en.html',
      'web-shared/brand-world.jpg',
      'web-shared/brand-studio.jpg',
      'web-shared/brand-console.jpg',
      'public/cosmos/backgrounds/holo-grain.jpg',
      'public/cosmos/scene-ares.webp',
      'public/cosmos/scene-guttercaps.webp',
      'public/cosmos/scene-hub.webp',
      'public/cosmos/scene-neonrelay.webp',
      'public/cosmos/scene-neuroforge.webp',
    ]) assert.ok(actual.includes(file), `публичный allowlist потерял ресурс ребрендинга ${file}`)
    assert.ok(!actual.some((file) => /(?:\.md$|\.json$|\.sql$|\.env|\.map$|README|Dockerfile)/i.test(file)))
    assert.ok(!actual.some((file) => file.startsWith('docs/')), 'внутренняя документация не должна попадать в публичную сборку')
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

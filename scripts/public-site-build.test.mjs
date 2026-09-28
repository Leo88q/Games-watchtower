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
    assert.ok(readFileSync(path.join(output, 'token-landing/index.html'), 'utf8').includes('../web-shared/'))
    assert.ok(!actual.some((file) => /(?:\.md$|\.json$|\.sql$|\.env|\.map$|README|Dockerfile)/i.test(file)))
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

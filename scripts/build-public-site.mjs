#!/usr/bin/env node
/**
 * Assemble an explicit, allowlisted static-site artifact. Never deploy the repository root.
 * Usage: npm run build:public-site -> dist-public/
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

// Deliberately enumerate browser-facing files: new repository files are not published by default.
export const PUBLIC_FILES = [
  'watchtower-site/index.html',
  'watchtower-site/en.html',
  'token-landing/index.html',
  'token-landing/en.html',
  'token-landing/skin-2035.css',
  'token-landing/skin-2035.js',
  'token-landing/token-data.mjs',
  'token-landing/token-render.mjs',
  'web-shared/favicon.svg',
  'web-shared/og-watchtower.jpg',
  'web-shared/og-wtwr.jpg',
  'web-shared/wt-forms.js',
  'web-shared/wt-landing.js',
  'web-shared/wt-params.js',
  'robots.txt',
]

export function copyPublicSite(outputDir) {
  const destination = path.resolve(outputDir)
  mkdirSync(destination, { recursive: true })

  for (const relative of PUBLIC_FILES) {
    const source = path.join(ROOT, relative)
    const target = path.join(destination, relative)
    mkdirSync(path.dirname(target), { recursive: true })
    copyFileSync(source, target)
  }

  writeFileSync(path.join(destination, 'index.html'), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>Watchtower</title></head>
<body><main><h1>Watchtower</h1><nav aria-label="Public sites"><ul><li><a href="watchtower-site/">Watchtower OS</a></li><li><a href="token-landing/">$WTWR information</a></li></ul></nav></main></body>
</html>\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = path.join(ROOT, 'dist-public')
  // CLI is intentionally fixed to this generated directory, never a user-supplied path.
  const { rmSync } = await import('node:fs')
  rmSync(output, { recursive: true, force: true })
  copyPublicSite(output)
  console.log(`Allowlisted public site written to ${path.relative(ROOT, output)} (${PUBLIC_FILES.length + 1} files).`)
}

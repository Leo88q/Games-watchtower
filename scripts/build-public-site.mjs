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
  'watchtower-site/studio.css',
  'watchtower-site/studio.js',
  'watchtower-site/terms-of-use.html',
  'watchtower-site/terms-of-use-en.html',
  'watchtower-site/privacy-policy.html',
  'watchtower-site/privacy-policy-en.html',
  'token-landing/index.html',
  'token-landing/en.html',
  'token-landing/skin-2035.css',
  'token-landing/skin-2035.js',
  'token-landing/token-data.mjs',
  'token-landing/token-render.mjs',
  'web-shared/favicon.svg',
  'web-shared/brand-world.jpg',
  'web-shared/brand-studio.jpg',
  'web-shared/brand-console.jpg',
  'web-shared/og-wtwr.jpg',
  'public/cosmos/backgrounds/holo-grain.jpg',
  'public/cosmos/backgrounds/watchtower-nebula.jpg',
  'public/cosmos/scene-ares.webp',
  'public/cosmos/scene-guttercaps.webp',
  'public/cosmos/scene-hub.webp',
  'public/cosmos/scene-neonrelay.webp',
  'public/cosmos/scene-neuroforge.webp',
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
<html lang="ru">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><meta name="theme-color" content="#050811">
<title>Leo Games Studio — игровые миры и Watchtower</title>
<meta name="description" content="Leo Games Studio создаёт игры и Watchtower — внутреннюю систему студии.">
<meta property="og:title" content="Leo Games Studio — игровые миры и Watchtower"><meta property="og:image" content="web-shared/brand-world.jpg">
<link rel="icon" type="image/svg+xml" href="web-shared/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#050811;color:#f3f6fb;font:16px/1.6 'DM Sans',system-ui,sans-serif}
main{position:relative;width:min(1120px,100%);min-height:min(720px,calc(100vh - 48px));display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;padding:clamp(24px,5vw,58px);border:1px solid rgba(161,187,229,.2);border-radius:28px;background:linear-gradient(90deg,rgba(5,8,17,.97),rgba(5,8,17,.82) 43%,rgba(5,8,17,.1)),linear-gradient(0deg,rgba(5,8,17,.7),transparent 50%),url('web-shared/brand-world.jpg') center/cover}
nav{display:flex;justify-content:space-between;align-items:center;gap:16px}nav b{font:700 12px 'Space Grotesk',sans-serif;letter-spacing:.13em}nav span{color:#9aa9bd;font-size:12px}
section{max-width:700px;margin:auto 0;padding:80px 0}small{color:#65dcf2;font:600 10px 'DM Sans',sans-serif;letter-spacing:.16em;text-transform:uppercase}
h1{margin:18px 0;font:700 clamp(48px,9vw,96px)/.95 'Space Grotesk',sans-serif;letter-spacing:-.07em}h1 em{color:#b8ff68;font-style:normal}p{max-width:610px;color:#bdc8d8;font-size:clamp(16px,2vw,19px)}.actions{display:flex;flex-wrap:wrap;gap:11px;margin-top:26px}a{color:inherit;text-decoration:none}.button{display:inline-flex;padding:13px 17px;border:1px solid rgba(161,187,229,.24);border-radius:12px;font-size:13px;font-weight:700;background:rgba(8,14,25,.65)}.primary{color:#101a0b;background:#b8ff68;border-color:#b8ff68}.foot{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;color:#8190a7;font-size:11px}.foot a:hover{color:#b8ff68}
@media(max-width:600px){main{min-height:calc(100svh - 48px);padding:24px;border-radius:20px;background-position:58% center}.foot{display:grid}section{padding:55px 0}}
</style>
</head>
<body><main><nav aria-label="Навигация"><b>LEO GAMES / WATCHTOWER</b><span>INDEPENDENT GAME STUDIO</span></nav><section><small>ИГРЫ — В ЦЕНТРЕ · СТУДИЯ — ЗА НИМИ</small><h1>Игры, которые<br><em>живут дольше релиза.</em></h1><p>Четыре игровых мира и Watchtower — внутренняя система, созданная помогать студии понимать, улучшать и защищать свои игры.</p><div class="actions"><a class="button primary" href="watchtower-site/">Игры и Watchtower ↗</a><a class="button" href="watchtower-site/en.html" lang="en">English</a></div></section><div class="foot"><span>© 2026 Leo Games Studio · Проекты развиваются по проверяемым этапам.</span><span><a href="watchtower-site/terms-of-use.html">Условия</a> · <a href="watchtower-site/privacy-policy.html">Конфиденциальность</a> · <a href="watchtower-site/terms-of-use-en.html" lang="en">Terms</a> · <a href="watchtower-site/privacy-policy-en.html" lang="en">Privacy</a></span><a href="token-landing/">Отдельная информация о $WTWR</a></div></main></body>
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

/**
 * Согласованность статических площадок (сайт Watchtower OS + лендинг $WTWR):
 *   node --test scripts/site-consistency.test.mjs   (npm run test:site)
 *
 * Проверяет, что маркетинговые страницы живут по тем же правилам, что и продукт:
 *   • числа лендинга сходятся и берутся из единого источника (token-data.mjs);
 *   • RU и EN версии структурно и численно паритетны — разойтись им негде;
 *   • стоп-лист хайпа (X_POSTS.md): запрещённые обещания дохода отсутствуют;
 *   • локальные ресурсы (скрипты, стили, картинки, favicon, OG) существуют;
 *   • кросс-ссылки между сайтами и языковых версий валидны;
 *   • трекер переходов на страницах байт-в-байт совпадает с патчем для игр.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const read = (relative) => readFileSync(path.join(root, relative), 'utf8')

const { validateTokenData, ALLOC, FUNDS, HW, DIVIDEND_SCENARIOS, dividendFor } = await import('../token-landing/token-data.mjs')
const { renderTokenLanding } = await import('../token-landing/token-render.mjs')

const PAGES = [
  'watchtower-site/index.html',
  'watchtower-site/en.html',
  'token-landing/index.html',
  'token-landing/en.html',
]

// ── 1. Данные лендинга сходятся ────────────────────────────────────────────

test('token-data: аллокация = 100%, статьи сбора = $350k, раунды = $350k, доли NFT = 25%', () => {
  const verdict = validateTokenData()
  assert.deepEqual(verdict.errors, [], `расхождения: ${verdict.errors.join('; ')}`)
})

test('рендер лендинга наполняет все таблицы и показывает плашку самопроверки (RU и EN)', () => {
  for (const [file, lang] of [['token-landing/index.html', 'ru'], ['token-landing/en.html', 'en']]) {
    const dom = new JSDOM(read(file))
    const doc = dom.window.document
    renderTokenLanding(doc, lang)
    assert.equal(doc.querySelectorAll('#alloc tbody tr').length, ALLOC.length, `${file}: строк аллокации`)
    assert.equal(doc.querySelectorAll('#funds tbody tr').length, FUNDS.length, `${file}: строк use of funds`)
    assert.equal(doc.querySelectorAll('#hw .card').length, HW.length, `${file}: карточек железа`)
    assert.equal(doc.querySelectorAll('#dividends tbody tr').length, DIVIDEND_SCENARIOS.length, `${file}: сценариев дивиденда`)
    const check = doc.getElementById('data-check')
    assert.match(check.textContent, /^✓/, `${file}: плашка #data-check обязана подтверждать сходимость`)
    const donut = doc.getElementById('donut')
    assert.match(donut.style.background, /^conic-gradient\(/, `${file}: donut не отрисован`)
    // Денежные факты, переехавшие в единый источник данных, не должны потеряться после рендера.
    const text = doc.body.textContent.replace(/\s+/g, ' ')
    const marker = lang === 'en' ? '4 seasons × 25M' : '4 сезона по 25 млн'
    assert.ok(text.includes(marker), `${file}: после рендера потерян факт «${marker}»`)
    const wallet = lang === 'en' ? 'pool locked for 12 months' : 'пул заблокирован на 12 мес.'
    assert.ok(text.includes(wallet), `${file}: после рендера потерян факт «${wallet}»`)
  }
})

test('сценарии дивиденда из брифа: $200k прибыли → $500 на NFT в год', () => {
  // Контрольный пример из INVESTOR_LANDING_BRIEF.md обязан выводиться из данных, а не хардкодиться.
  assert.equal(DIVIDEND_SCENARIOS[1], 200_000)
  assert.equal(dividendFor(DIVIDEND_SCENARIOS[1]).perNftYear, 500)
})

// ── 2. Паритет языковых версий ─────────────────────────────────────────────

const idsOf = (html) => [...html.matchAll(/ id="[a-z0-9-]+"/gi)].map((m) => m[0]).sort()

test('RU и EN версии имеют одинаковый набор якорей (section/element ids)', () => {
  for (const [a, b] of [['token-landing/index.html', 'token-landing/en.html'], ['watchtower-site/index.html', 'watchtower-site/en.html']]) {
    assert.deepEqual(idsOf(read(a)), idsOf(read(b)), `наборы id разошлись: ${a} vs ${b}`)
  }
})

test('ключевые денежные факты паритетны между языками (локализованные написания)', () => {
  const pairs = [
    ['$350 000', '$350,000'], ['$250 000', '$250,000'], ['$100 000', '$100,000'],
    ['$0,0025', '$0.0025'], ['$0,0040', '$0.0040'],
    ['60 000 000', '60,000,000'], ['25 000 000', '25,000,000'],
    ['150 000 000', '150,000,000'], ['80 000 000', '80,000,000'],
    ['$1 000', '$1,000'], ['$87 500', '$87,500'],
    ['$2,5 млн', '$2.5M'], ['$4 млн', '$4M'], ['−37,5%', '−37.5%'],
  ]
  const ru = read('token-landing/index.html')
  const en = read('token-landing/en.html')
  for (const [r, e] of pairs) {
    assert.ok(ru.includes(r), `RU-лендинг потерял факт «${r}»`)
    assert.ok(en.includes(e), `EN-лендинг потерял факт «${e}»`)
  }
})

test('тарифы сайта паритетны между языками', () => {
  const ru = read('watchtower-site/index.html')
  const en = read('watchtower-site/en.html')
  for (const fact of ['$299', '$0', '3–5%', '#api-waitlist', '1 млн', '1M']) {
    const inRu = ru.includes(fact.replace('1M', '1 млн'))
    const inEn = en.includes(fact.replace('1 млн', '1M').replace('50 млн', '50M'))
    assert.ok(inRu && inEn, `тариф «${fact}» должен быть на обеих версиях сайта`)
  }
  for (const fact of ['50 млн']) assert.ok(ru.includes(fact) && en.includes('50M'), 'лимит событий Studio')
})

// ── 3. Анти-хайп: стоп-лист X_POSTS.md действует на публичных страницах ────

test('на страницах нет обещаний дохода из стоп-листа (кроме явного отрицания)', () => {
  const forbidden = [
    /гарантированн\w*\s+(?:доход|прибыль|выплат)/i,
    /пассивн\w*\s+доход/i,
    /безрисков/i,
    /(?<![\w×])x(?:10|100)(?![\d\w])/i,
    /\bAPY\b/i,
    /to the moon/i,
    /не упустите/i,
    /последний шанс/i,
    /цена будет расти/i,
  ]
  for (const page of PAGES) {
    // Убираем теги, чтобы проверять видимый текст, а стили не мешали «x10».
    const text = read(page).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, ' ')
    for (const re of forbidden) {
      const match = text.match(re)
      if (!match) continue
      const before = text.slice(Math.max(0, match.index - 40), match.index)
      const negated = /(не|нет|no|not|without|без)\s*$/i.test(before.trim())
      assert.ok(negated, `${page}: запрещённое обещание «${match[0]}» без отрицания (контекст: «${before.trim()}»)`)
    }
  }
})

// ── 4. Ресурсы, кросс-ссылки и трекер ──────────────────────────────────────

test('локальные ресурсы, на которые ссылаются страницы, существуют', () => {
  const attrRe = /(?:src|href|content)="([^"#]+)"/g
  const skipExt = /^mailto:/i
  for (const page of PAGES) {
    const dir = path.dirname(page)
    for (const m of read(page).matchAll(attrRe)) {
      const ref = m[1]
      if (/^https?:\/\//.test(ref) || skipExt.test(ref)) continue
      if (!/\.(js|mjs|css|svg|jpg|jpeg|png|webp|html)$/i.test(ref)) continue
      const full = path.resolve(path.join(root, dir), ref)
      assert.ok(existsSync(full), `${page}: нет файла ${ref}`)
    }
  }
})

test('кросс-ссылки сайтов и языков валидны', () => {
  for (const [from, to] of [
    ['watchtower-site/index.html', 'token-landing/index.html'],
    ['watchtower-site/index.html', 'watchtower-site/en.html'],
    ['token-landing/index.html', 'watchtower-site/index.html'],
    ['token-landing/en.html', 'watchtower-site/en.html'],
    ['token-landing/en.html', 'token-landing/index.html'],
  ]) {
    assert.match(read(from), new RegExp(`href="\\.\\./${to.replace('/', '\\/')}"|href="${to.split('/')[1]}"`), `${from} не ссылается на ${to}`)
  }
})

test('трекер переходов на страницах — точная копия патча для игр (no drift)', () => {
  assert.equal(read('web-shared/wt-landing.js'), read('patches/games/wt-landing.js'),
    'web-shared/wt-landing.js разошёлся с patches/games/wt-landing.js — править надо патч, копия синхронизируется')
})

test('формы и трекинг на страницах подключены ожидаемо', () => {
  for (const page of PAGES) {
    const html = read(page)
    assert.match(html, /\.\.\/web-shared\/wt-landing\.js/, `${page}: не подключён трекер wt-landing.js`)
    assert.match(html, /\.\.\/web-shared\/wt-params\.js/, `${page}: не подключены параметры запуска`)
    assert.match(html, /\.\.\/web-shared\/wt-forms\.js/, `${page}: не подключена логика форм`)
    assert.match(html, /<meta name="wt-page" content="target_[a-z_]{2,40}">/, `${page}: нет метки целевой страницы TalkChart`)
    const { document: doc } = new JSDOM(html).window
    for (const form of doc.querySelectorAll('form[data-wt-waitlist]')) {
      assert.ok(form.querySelector('input[type="email"]'), `${page}: в форме нет email`)
      assert.ok(form.querySelector('[data-wt-hp]'), `${page}: в форме нет honeypot`)
      assert.ok(form.querySelector('[data-wt-msg]'), `${page}: в форме нет блока сообщений`)
    }
  }
  // Лендинг дополнительно рендерится из единого источника данных.
  for (const page of ['token-landing/index.html', 'token-landing/en.html']) {
    assert.match(read(page), /type="module" src="token-render\.mjs"/, `${page}: не подключён token-render.mjs`)
  }
})

test('публикуемые держателю страницы не заявляют открытую продажу до параметров', () => {
  const params = read('web-shared/wt-params.js')
  // Пока URL не заданы, CTA покупки обязаны быть скрытыми якорями вайтлиста.
  assert.match(params, /MARKETPLACE_URL:\s*''/, 'до старта MARKETPLACE_URL пуст — проверьте чек-лист WEBSITES.md')
  for (const page of ['token-landing/index.html', 'token-landing/en.html']) {
    assert.match(read(page), /data-wt-buy hidden/, `${page}: кнопка покупки должна быть hidden до MARKETPLACE_URL`)
  }
})

test('x-cards/render.py берёт числа из единого источника, а не из устаревшего inline-кода', () => {
  const render = read('token-landing/x-cards/render.py')
  assert.match(render, /token-data\.mjs/, 'render.py обязан парсить token-data.mjs')
  assert.ok(!/const ALLOC/.test(render), 'render.py не должен парсить inline-данные страниц (источник переехал в token-data.mjs)')
})

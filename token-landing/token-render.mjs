/* token-render — рендер чисел лендинга $WTWR из token-data.mjs (единый источник).
 * Работает в браузере (module script обеих страниц) и в Node-тестах: все функции
 * чистые по документу, язык определяется параметром, а не глобальным состоянием.
 */
import { ALLOC, FUNDS, HW, RAISE, TOKEN, DIVIDEND_SCENARIOS, dividendFor, validateTokenData } from './token-data.mjs'

export function fmtNum(n, lang) {
  return n.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 12 })
}
export function fmtUsd(n, lang) {
  return '$' + fmtNum(n, lang)
}
export function fmtPrice(p, lang) {
  return p.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
const pick = (obj, lang) => obj[lang === 'en' ? 'en' : 'ru']

export function renderTokenLanding(doc, lang) {
  const l = lang === 'en' ? 'en' : 'ru'
  const params = (typeof window !== 'undefined' && window.WT_PARAMS) || {}
  const raisedHw = (params.raised && params.raised.hardware) || {}

  // 1. Donut + таблица аллокации.
  const donut = doc.getElementById('donut')
  if (donut) {
    let acc = 0
    donut.style.background = 'conic-gradient(' + ALLOC.map((a) => {
      const s = acc; acc += a.pct
      return `${a.color} ${s}% ${acc}%`
    }).join(',') + ')'
  }
  const allocBody = doc.querySelector('#alloc tbody')
  if (allocBody) {
    allocBody.innerHTML = ALLOC.map((a) =>
      `<tr><td><span class="dot" style="background:${a.color}"></span>${pick(a.key, l)}</td>` +
      `<td class="num">${String(a.pct).replace('.', l === 'en' ? '.' : ',')}</td>` +
      `<td class="num">${fmtNum(Math.round(a.pct * (TOKEN.supply / 100)), l)}</td>` +
      `<td class="muted" style="font-size:13px">${pick(a.unlock, l)}</td></tr>`
    ).join('')
  }

  // 2. Use of funds.
  const fundsBody = doc.querySelector('#funds tbody')
  if (fundsBody) {
    fundsBody.innerHTML = FUNDS.map((f) =>
      `<tr><td><b>${pick(f.item, l)}</b></td>` +
      `<td class="num">${String(Math.round((f.usd / RAISE.targetUsd) * 1000) / 10).replace('.', l === 'en' ? '.' : ',')}</td>` +
      `<td class="num">${fmtUsd(f.usd, l)}</td>` +
      `<td class="muted">${pick(f.what, l)}</td></tr>`
    ).join('')
  }

  // 3. Железо: карточки с прогрессом сбора (факт — только из wt-params.js).
  const hw = doc.getElementById('hw')
  if (hw) {
    hw.innerHTML = HW.map((h) => {
      const raised = Math.max(0, Number(raisedHw[h.id] || 0))
      const pct = Math.min(100, (raised / h.usd) * 100)
      const state = l === 'en'
        ? `raised ${fmtUsd(raised, l)} of ${fmtUsd(h.usd, l)} · cost estimate`
        : `собрано ${fmtUsd(raised, l)} из ${fmtUsd(h.usd, l)} · оценка стоимости`
      return `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px"><h3>${pick(h.name, l)}</h3>` +
        `<span class="num">${fmtUsd(h.usd, l)}</span></div>` +
        `<p class="muted" style="font-size:14px">${pick(h.what, l)}</p>` +
        `<div class="bar"><i style="width:${pct}%"></i></div>` +
        `<div class="muted mono" style="font-size:12px;margin-top:6px">${state}</div></div>`
    }).join('')
  }

  // 4. Сценарии дивиденда раунда 0 — иллюстрация, выводится с пометкой страницы.
  const divBody = doc.querySelector('#dividends tbody')
  if (divBody) {
    const fmtPct = (x) => String(Math.round(x * 10) / 10).replace('.', l === 'en' ? '.' : ',')
    const fmtMoney = (x) => fmtUsd(Number.isInteger(x) ? x : Math.round(x * 100) / 100, l)
    divBody.innerHTML = DIVIDEND_SCENARIOS.map((profit) => {
      const d = dividendFor(profit)
      return `<tr><td class="num">${fmtMoney(profit)}</td>` +
        `<td class="num">${fmtMoney(d.pool)}</td>` +
        `<td class="num">${fmtMoney(d.perNftYear)}</td>` +
        `<td class="num">${fmtMoney(d.perNftQuarter)}</td>` +
        `<td class="num">${fmtPct(d.pctOfPrice)}%</td></tr>`
    }).join('')
  }

  // 5. Плашка самопроверки: страница подтверждает сходимость собственных цифр.
  const check = doc.getElementById('data-check')
  if (check) {
    const v = validateTokenData()
    if (v.ok) {
      check.textContent = l === 'en'
        ? '✓ figures reconcile: allocation = 100%, use of funds = $350,000, rounds total = $350,000'
        : '✓ цифры сходятся: аллокация = 100%, статьи сбора = $350 000, раунды = $350 000'
      check.classList.add('g')
    } else {
      check.textContent = (l === 'en' ? '⚠ data mismatch: ' : '⚠ расхождение данных: ') + v.errors.join('; ')
      check.classList.add('r')
      // Не молчим: расхождение чисел на странице — это провал обещания честности.
      if (typeof console !== 'undefined') console.error('[watchtower] token data mismatch', v.errors)
    }
  }

  return validateTokenData()
}

export { RAISE, TOKEN }

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const boot = () => {
    const lang = (document.documentElement.getAttribute('lang') || 'ru').toLowerCase()
    renderTokenLanding(document, lang.startsWith('en') ? 'en' : 'ru')
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
}

// ---------------------------------------------------------------------------
// Портал партнёров Leo Games: /partners.html (и /r/<код> → сюда с ?ref=).
//  - приглашённый видит игры на своём языке, код уходит в ссылки на игры;
//  - партнёр входит кошельком, вступает в программу и видит кабинет.
// Только чтение данных игр; награды выдают игры (server/operations/partner-rewards.js).
// ---------------------------------------------------------------------------
import '@fontsource/exo-2/latin-600.css'
import '@fontsource/exo-2/latin-ext-600.css'
import '@fontsource/exo-2/vietnamese-600.css'
import '@fontsource/exo-2/cyrillic-600.css'
import '@fontsource/exo-2/latin-800.css'
import '@fontsource/exo-2/latin-ext-800.css'
import '@fontsource/exo-2/vietnamese-800.css'
import '@fontsource/exo-2/cyrillic-800.css'
import './partners.css'
import { operatorApi, operatorSession, partnerApi } from '../cosmos/live.js'
import { detectWallets, signInWithWallet } from '../cosmos/wallet.js'
import { LANGS, pickLang, translator } from './i18n.js'

const BASE = import.meta.env.BASE_URL
const REF_RE = /^[A-HJ-NP-Z2-9]{8}$/
const REF_KEY = 'wt-partner-ref' // общий с картой вахты
const LANG_KEY = 'wt-partner-lang'
const GAMES = [
  { id: 'ares1', name: 'ARES-1', sprite: 'planet-ares.webp', site: 'https://ares1-7e1.pages.dev/' },
  { id: 'aof', name: 'NeuroForge', sprite: 'planet-neuroforge.webp', site: 'https://aof.pages.dev/site/home' },
  { id: 'guttercaps', name: 'GUTTERCAPS', sprite: 'planet-guttercaps.webp', site: 'https://guttercapslending.pages.dev/guttercaps-landing' },
  { id: 'neonrelay', name: 'Neon Relay', sprite: 'planet-neonrelay.webp', site: null },
]
// Коды ошибок, о которых приглашённому говорить незачем: код просто не нужен
const CLAIM_SILENT = ['already_referred', 'self_referral', 'not_new_player', 'cyclic_referral']

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const app = document.getElementById('app')

function storedRef() {
  try {
    const v = JSON.parse(localStorage.getItem(REF_KEY) || 'null')
    if (v && REF_RE.test(v.code) && Date.now() - v.at < 30 * 24 * 3600 * 1000) return v.code
  } catch { /* повреждено — нет кода */ }
  return null
}

const S = {
  lang: 'en',
  ref: null,
  rules: null,
  cabinet: null,
  auth: null,
  busy: false,
  previewGame: 'ares1',
  toast: null,
}

;(function init() {
  const url = new URL(location.href)
  const fromUrl = (url.searchParams.get('lang') || '').toLowerCase()
  let saved = null
  try { saved = localStorage.getItem(LANG_KEY) } catch { /* приватный режим */ }
  S.lang = LANGS.some((l) => l.id === fromUrl) ? fromUrl : LANGS.some((l) => l.id === saved) ? saved : pickLang(navigator.languages || [navigator.language])
  const code = (url.searchParams.get('ref') || '').toUpperCase()
  // Первый пригласивший остаётся: чужая ссылка позже приглашение не перехватывает
  if (REF_RE.test(code) && !storedRef()) {
    try { localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() })) } catch { /* приватный режим */ }
  }
  S.ref = storedRef()
  if (url.searchParams.has('ref')) { url.searchParams.delete('ref'); history.replaceState(null, '', url.pathname + url.search + url.hash) }
})()

let t = translator(S.lang)
const intl = () => LANGS.find((l) => l.id === S.lang)?.intl || 'en'
const countryName = (cc) => { try { return new Intl.DisplayNames([intl()], { type: 'region' }).of(cc) || cc } catch { return cc } }
const dateText = (ts) => (ts ? new Date(ts).toLocaleDateString(intl(), { day: 'numeric', month: 'short' }) : '')
const numText = (n) => Number(n || 0).toLocaleString(intl())
const itemName = (it) => it?.name?.[S.lang] || it?.name?.en || it?.id || ''

function gameLink(game) {
  if (!game.site) return null
  const u = new URL(game.site)
  u.searchParams.set('lang', S.lang)
  if (S.ref) u.searchParams.set('ref', S.ref)
  return u.toString()
}

function errorText(err) {
  if (err?.code === 4001 || /reject|denied|отклон|cancel/i.test(String(err?.message))) return t('err_sign_cancelled')
  const code = err?.code || err?.message
  const key = `err_${code}`
  const text = t(key, { h: S.rules?.minReferrerHours ?? 10 })
  return text === key ? t('err_generic') : text
}

function toast(text, tone = 'good') {
  S.toast = { text, tone }
  render()
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => { S.toast = null; render() }, 4200)
}

// ---------------------------------------------------------------------------
// Данные
// ---------------------------------------------------------------------------
async function load() {
  try { S.rules = await partnerApi.rules() } catch { S.rules = null }
  try {
    const state = await fetch('/api/operator/state', { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null))
    S.auth = state?.auth || null
  } catch { S.auth = null }
  await loadCabinet()
}

async function loadCabinet() {
  if (!operatorSession.get()) { S.cabinet = null; return render() }
  await claimStoredRef()
  try { S.cabinet = await partnerApi.me() } catch (err) {
    if (err?.status === 401) operatorSession.clear()
    S.cabinet = null
  }
  if (S.cabinet?.partner?.rewardGame) S.previewGame = S.cabinet.partner.rewardGame
  render()
}

async function claimStoredRef() {
  const code = storedRef()
  if (!code) return
  try {
    await partnerApi.claim(code)
    localStorage.removeItem(REF_KEY)
    toast(t('inviteApplied'))
  } catch (err) {
    if (err?.status === 401 || err?.status === 503 || !err?.status) return // попробуем позже
    localStorage.removeItem(REF_KEY)
    if (!CLAIM_SILENT.includes(err.code)) toast(errorText(err), 'bad')
  }
}

// ---------------------------------------------------------------------------
// Разметка
// ---------------------------------------------------------------------------
function header() {
  return `<header class="lp-head">
    <a class="lp-brand" href="${BASE}partners.html"><img src="${BASE}cosmos/star-solana.webp" alt="" aria-hidden="true" /><span>${esc(t('title'))}</span></a>
    <label class="lp-lang"><span>${esc(t('language'))}</span>
      <select data-act="lang" aria-label="${esc(t('language'))}">${LANGS.map((l) => `<option value="${l.id}" ${l.id === S.lang ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select>
    </label>
  </header>`
}

function gameCard(g) {
  const link = gameLink(g)
  return `<article class="lp-game">
    <img class="lp-game-art" src="${BASE}cosmos/${g.sprite}" alt="" aria-hidden="true" loading="lazy" />
    <div><h3>${esc(g.name)}</h3><p>${esc(t(`game_${g.id}`))}</p></div>
    ${link ? `<a class="lp-btn primary" href="${esc(link)}" target="_blank" rel="noopener">${esc(t('play'))}</a>` : `<span class="lp-btn ghost" aria-disabled="true">${esc(t('soon'))}</span>`}
  </article>`
}

function inviteBlock() {
  if (!S.ref) return ''
  return `<section class="lp-hero">
    <h1>${esc(t('inviteTitle'))}</h1>
    <p class="lp-lead">${esc(t('inviteText'))}</p>
    <div class="lp-games">${GAMES.map(gameCard).join('')}</div>
    <p class="lp-note">${esc(t('inviteNote'))}</p>
  </section>`
}

function bundleText(b) {
  const parts = []
  if (b?.tokens) parts.push(`${numText(b.tokens.amount)} ${esc(b.tokens.symbol)}`)
  for (const it of b?.items || []) parts.push(`${numText(it.amount)} × ${esc(itemName(it))}`)
  return parts.join(' + ') || esc(t('nothingYet'))
}

function aggregateText(agg) {
  const parts = Object.entries(agg?.tokens || {}).map(([sym, n]) => `${numText(n)} ${esc(sym)}`)
  for (const it of agg?.items || []) parts.push(`${numText(it.amount)} × ${esc(itemName(it))}`)
  return parts.length ? parts.join(', ') : esc(t('nothingYet'))
}

function rewardsBlock() {
  const r = S.rules
  if (!r) return ''
  const g = r.games[S.previewGame]
  const rows = r.kinds.map((k) => {
    const tokens = g.token && g.tokens?.[k] ? `${numText(g.tokens[k])} ${esc(g.token)}` : ''
    const item = g.item.amount[k] ? `${numText(g.item.amount[k])} × ${esc(itemName(g.item))}` : ''
    return `<tr><th scope="row">${esc(t(`kind_${k}`))}</th><td>${[tokens, item].filter(Boolean).join(' + ')}</td></tr>`
  }).join('')
  return `<section class="lp-card">
    <h2>${esc(t('rewardsTitle'))}</h2>
    <p class="lp-note">${esc(t('rewardsGame'))}</p>
    <div class="lp-tabs" role="tablist">${GAMES.map((x) => `<button role="tab" class="lp-tab" data-act="preview" data-game="${x.id}" aria-selected="${x.id === S.previewGame}">${esc(x.name)}</button>`).join('')}</div>
    <table class="lp-table"><tbody>${rows}</tbody></table>
    ${g.token
      ? `<p class="lp-note">${esc(t('tokenCountries', { list: r.tokenCountries.map(countryName).join(', ') || '—' }))} <b>${esc(itemName(g.substitute))}</b></p>`
      : `<p class="lp-note">${esc(t('noTokenGame'))}</p>`}
    <h3>${esc(t('milestonesTitle'))}</h3>
    <ul class="lp-milestones">${r.milestones.map((m) => `<li><b>${esc(t('milestoneAt', { n: m }))}</b><span>${esc(itemName(g.milestones[m]))}</span></li>`).join('')}</ul>
  </section>`
}

function howBlock() {
  const r = S.rules
  if (!r) return ''
  return `<section class="lp-card">
    <h2>${esc(t('programTitle'))}</h2>
    <p class="lp-lead">${esc(t('programLead'))}</p>
    <h3>${esc(t('howTitle'))}</h3>
    <ol class="lp-steps">
      <li>${esc(t('how1'))}</li>
      <li>${esc(t('how2', { newMax: r.newPlayerMaxHours }))}</li>
      <li>${esc(t('how3', { hours: r.qualify.hours, days: r.qualify.activeDays, window: r.qualify.withinDays }))}</li>
      <li>${esc(t('how4', { hold: r.holdbackDays }))}</li>
    </ol>
  </section>`
}

function rulesBlock() {
  const r = S.rules
  const countries = r?.countries || []
  const region = [['GB', 'ruleGB'], ['PH', 'rulePH'], ['ES', 'ruleES']].filter(([cc]) => countries.includes(cc))
  return `<section class="lp-card">
    <h2>${esc(t('rulesTitle'))}</h2>
    <ul class="lp-rules">
      <li>${esc(t('rule1'))}</li><li>${esc(t('rule2'))}</li><li>${esc(t('rule3'))}</li><li>${esc(t('rule4'))}</li>
      ${region.map(([cc, key]) => `<li class="region"><b>${esc(countryName(cc))}:</b> ${esc(t(key).replace(/^[^:]+:\s*/, ''))}</li>`).join('')}
    </ul>
  </section>`
}

function loginBlock() {
  const wallets = detectWallets()
  return `<section class="lp-card" id="account">
    <h2>${esc(t('loginTitle'))}</h2>
    ${wallets.length
      ? `<div class="lp-wallets">${wallets.map((w) => `<button class="lp-btn primary wide" data-act="wallet-login" data-id="${esc(w.id)}" ${S.busy ? 'disabled' : ''}>${esc(t('loginWith', { wallet: w.name }))}</button>`).join('')}</div>`
      : `<p class="lp-callout">${esc(t('loginNone'))}</p>`}
    ${S.auth?.demoLogin ? `<form class="lp-form" data-act="demo-login">
      <label>${esc(t('loginDemo'))}<input name="wallet" autocomplete="off" spellcheck="false" value="test_wallet" required /></label>
      <button class="lp-btn wide" type="submit" ${S.busy ? 'disabled' : ''}>${esc(t('signIn'))}</button>
    </form>` : ''}
  </section>`
}

function joinBlock(c) {
  const r = c.rules
  const select = (name, options, selected) => `<select name="${name}" required>${options.map(([v, label]) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`
  const kinds = r.kinds.map((k) => `<label class="lp-kind"><input type="radio" name="kind" value="${k}" ${k === (c.canJoinAsPlayer ? 'player' : 'creator') ? 'checked' : ''} ${k === 'player' && !c.canJoinAsPlayer ? 'disabled' : ''} />
    <span><b>${esc(t(`kind_${k}`))}</b><small>${esc(t(`kindHint_${k}`, { h: r.minReferrerHours }))}</small></span></label>`).join('')
  return `<section class="lp-card">
    <h2>${esc(t('joinTitle'))}</h2>
    <form class="lp-form" data-act="join">
      <fieldset><legend>${esc(t('joinKind'))}</legend>${kinds}</fieldset>
      <label>${esc(t('joinCountry'))}${select('country', r.countries.map((cc) => [cc, countryName(cc)]), r.countries[0])}</label>
      <label>${esc(t('joinGame'))}${select('rewardGame', GAMES.map((g) => [g.id, g.name]), S.previewGame)}</label>
      <label>${esc(t('joinChannel'))}<input name="channel" autocomplete="off" spellcheck="false" maxlength="200" placeholder="${esc(t('joinChannelHint'))}" /></label>
      <button class="lp-btn primary wide" type="submit" ${S.busy ? 'disabled' : ''}>${esc(t('apply'))}</button>
    </form>
    ${c.canJoinAsPlayer ? '' : `<p class="lp-note">${esc(t('needHours', { h: r.minReferrerHours }))}</p>`}
  </section>`
}

function cabinetBlock(c) {
  const p = c.partner
  const s = c.summary
  const link = `${location.origin}/r/${p.code}`
  const status = `<span class="lp-status ${esc(p.status)}">${esc(t(`status_${p.status}`))}</span>`
  const head = `<section class="lp-card">
    <div class="lp-row-head"><h2>${esc(t(`kind_${p.kind}`))}</h2>${status}</div>
    ${p.status === 'active'
      ? `<label class="lp-linkbox"><span>${esc(t('yourLink'))}</span><input readonly value="${esc(link)}" data-act="select" /><button class="lp-btn small" data-act="copy" data-link="${esc(link)}">${esc(t('copy'))}</button></label>`
      : `<p class="lp-callout">${esc(t(p.status === 'pending' ? 'pendingText' : 'inactiveText'))}</p>`}
    ${p.underReview ? `<p class="lp-callout warn">${esc(t('reviewText'))}</p>` : ''}
    <form class="lp-inline" data-act="settings">
      <label>${esc(t('joinGame'))}<select name="rewardGame">${GAMES.map((g) => `<option value="${g.id}" ${g.id === p.rewardGame ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
      <button class="lp-btn small" type="submit">${esc(t('save'))}</button>
    </form>
    <p class="lp-note">${esc(t('joinCountry'))}: ${esc(countryName(p.country))}</p>
  </section>`
  if (p.status !== 'active') return head
  const metric = (label, value) => `<div class="lp-metric"><span>${esc(label)}</span><b>${value}</b></div>`
  const countries = (c.clicks?.byCountry7d || []).map((x) => `<li><span>${esc(x.country === 'other' ? t('otherCountries') : countryName(x.country))}</span><b>${numText(x.clicks)}</b></li>`).join('')
  const players = c.referrals.slice(0, 20).map((x) => {
    const extra = x.status === 'tracking'
      ? t('progress', { h: x.hours, needH: x.need.hours, d: x.activeDays, needD: x.need.activeDays, date: dateText(x.need.until) })
      : x.status === 'holdback' ? t('unlocks', { date: dateText(x.releaseAt) }) : ''
    return `<li class="lp-player"><span><b>${esc(x.wallet)}</b><small>${esc(t(`ref_${x.status}`))}${extra ? `, ${esc(extra)}` : ''}</small></span>${x.reward ? `<em class="${x.status === 'granted' ? 'ok' : ''}">${bundleText(x.reward)}${x.reward.tokenBlocked ? ` <small>(${esc(t('instead'))})</small>` : ''}</em>` : ''}</li>`
  }).join('')
  return `${head}
  <section class="lp-card">
    <div class="lp-metrics">
      ${metric(t('clicks30'), numText(c.clicks?.last30))}
      ${metric(t('invited'), numText(s.invited))}
      ${metric(t('playing'), numText(s.tracking))}
      ${metric(t('onHold'), numText(s.holdback))}
      ${metric(t('delivering'), numText(s.issuing))}
      ${metric(t('delivered'), numText(s.granted))}
    </div>
    <div class="lp-split">
      <div><h3>${esc(t('pendingRewards'))}</h3><p>${aggregateText(s.pendingRewards)}</p></div>
      <div><h3>${esc(t('earnedRewards'))}</h3><p>${aggregateText(s.grantedRewards)}</p></div>
    </div>
    ${countries ? `<h3>${esc(t('byCountry'))}</h3><ul class="lp-countries">${countries}</ul>` : ''}
    <h3>${esc(t('milestonesTitle'))}</h3>
    <ul class="lp-milestones">${c.milestones.map((m) => `<li class="${m.reached ? 'done' : ''}"><b>${esc(t('milestoneAt', { n: m.at }))}</b><span>${bundleText(m.reward)}</span>${m.reached ? `<em>${esc(t('reached'))}</em>` : ''}</li>`).join('')}</ul>
    <h3>${esc(t('playersTitle'))}</h3>
    ${players ? `<ul class="lp-players">${players}</ul>` : `<p class="lp-note">${esc(t('playersEmpty'))}</p>`}
  </section>`
}

function accountBlock() {
  const session = operatorSession.get()
  if (!session) return loginBlock()
  const c = S.cabinet
  const who = `<div class="lp-who"><span>${esc(String(session.wallet).slice(0, 4))}…${esc(String(session.wallet).slice(-4))}</span><button class="lp-btn small ghost" data-act="logout">${esc(t('signOut'))}</button></div>`
  if (!c) return `<section class="lp-card">${who}</section>`
  const invited = c.invitedBy ? `<p class="lp-note">${esc(t('invitedBy', { status: t(`ref_${c.invitedBy.status}`) }))}</p>` : ''
  return `<div id="account">${who}${c.partner ? cabinetBlock(c) : joinBlock(c)}${invited}</div>`
}

function render() {
  document.documentElement.lang = S.lang
  document.title = t('title')
  const focus = document.activeElement?.name
  app.innerHTML = `<div class="lp">
    ${header()}
    <main class="lp-main">
      ${inviteBlock()}
      <div class="lp-grid">
        <div class="lp-col">${howBlock()}${rewardsBlock()}${rulesBlock()}</div>
        <div class="lp-col">${accountBlock()}</div>
      </div>
    </main>
    ${S.toast ? `<div class="lp-toast ${S.toast.tone}" role="status">${esc(S.toast.text)}</div>` : ''}
  </div>`
  if (focus) app.querySelector(`[name="${CSS.escape(focus)}"]`)?.focus?.()
}

// ---------------------------------------------------------------------------
// События
// ---------------------------------------------------------------------------
app.addEventListener('change', (e) => {
  if (e.target.dataset.act !== 'lang') return
  S.lang = e.target.value
  try { localStorage.setItem(LANG_KEY, S.lang) } catch { /* приватный режим */ }
  t = translator(S.lang)
  render()
})

app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]')
  if (!el) return
  const act = el.dataset.act
  if (act === 'select') return el.select?.()
  if (act === 'preview') { S.previewGame = el.dataset.game; return render() }
  if (act === 'copy') {
    try { await navigator.clipboard.writeText(el.dataset.link); toast(t('copied')) } catch { app.querySelector('[data-act="select"]')?.select?.() }
    return
  }
  if (act === 'logout') { operatorSession.clear(); S.cabinet = null; return render() }
  if (act === 'wallet-login') {
    const w = detectWallets().find((x) => x.id === el.dataset.id)
    if (!w) return
    S.busy = true; render()
    try { await signInWithWallet(w.provider, operatorApi) } catch (err) { toast(errorText(err), 'bad') }
    S.busy = false
    return loadCabinet()
  }
})

app.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-act]')
  if (!form) return
  e.preventDefault()
  const f = new FormData(form)
  const act = form.dataset.act
  S.busy = true; render()
  try {
    if (act === 'demo-login') await operatorApi.auth(String(f.get('wallet') || '').trim())
    if (act === 'join') await partnerApi.join(f.get('kind'), f.get('channel'), { country: f.get('country'), rewardGame: f.get('rewardGame') })
    if (act === 'settings') { await partnerApi.settings(f.get('rewardGame')); toast(t('settingsSaved')) }
  } catch (err) {
    if (err?.status === 401) operatorSession.clear()
    toast(errorText(err), 'bad')
  }
  S.busy = false
  return loadCabinet()
})

render()
load()

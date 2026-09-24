/* wt-landing v1 — подтверждение перехода «пост/кнопка → игра» для Watchtower.
 *
 * Генератор ведёт кнопки через /r/<clickId>, оттуда 302 сюда с ?wt_click=<clickId>.
 * Этот скрипт один раз отправляет LandingReached с тем же clickId на POST /api/track
 * генератора и убирает wt_click из адресной строки. Больше ничего:
 *   • без <meta name="wt-trafficgen" content="https://…"> — ничего не делает;
 *   • DNT / Global Privacy Control — ничего не отправляет;
 *   • не читает кошелёк, cookies, localStorage игры; не шлёт IP/UA сам (их видит только сервер);
 *   • повторная загрузка той же вкладки не шлёт событие второй раз (sessionStorage);
 *   • sendBeacon с text/plain — «простой» запрос, без CORS-preflight и без блокировки игры.
 * Настройка страницы: <meta name="wt-page" content="target_sixsec"> (id целевой страницы).
 */
(function (w, d) {
  'use strict'
  var CLICK_RE = /^[A-Za-z0-9_-]{8,64}$/
  var PAGE_RE = /^target_[a-z_]{2,40}$/

  function meta(name) {
    var el = d.querySelector('meta[name="' + name + '"]')
    return el ? (el.getAttribute('content') || '').trim() : ''
  }

  function readClickId(loc) {
    var m = /[?&]wt_click=([^&#]*)/.exec(loc.search || '')
    // SPA с hash-роутингом: /#/play?wt_click=…
    if (!m) m = /[?&]wt_click=([^&#]*)/.exec(loc.hash || '')
    if (!m) return null
    var id
    try { id = decodeURIComponent(m[1]) } catch (e) { return null }
    return CLICK_RE.test(id) ? id : null
  }

  function stripClickId(loc, history) {
    if (!history || !history.replaceState) return
    var clean = function (s) {
      return s.replace(/([?&])wt_click=[^&#]*&?/, '$1').replace(/[?&]$/, '')
    }
    var next = loc.pathname + clean(loc.search || '') + clean(loc.hash || '')
    try { history.replaceState(history.state, '', next) } catch (e) { /* file:// и т.п. */ }
  }

  function optedOut(nav) {
    return !!nav && (nav.doNotTrack === '1' || w.doNotTrack === '1' || nav.globalPrivacyControl === true)
  }

  function randomId() {
    var c = w.crypto
    if (c && c.getRandomValues) {
      var b = new Uint8Array(12); c.getRandomValues(b)
      return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2) }).join('')
    }
    return String(Date.now()) + Math.random().toString(16).slice(2, 10)
  }

  function send(url, body) {
    var nav = w.navigator
    try {
      if (nav && nav.sendBeacon && nav.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return 'beacon'
    } catch (e) { /* упадём на fetch */ }
    if (w.fetch) {
      w.fetch(url, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } })
        .catch(function () {})
      return 'fetch'
    }
    return null
  }

  function run() {
    var loc = w.location
    var clickId = readClickId(loc)
    if (!clickId) return { status: 'no_click' }
    stripClickId(loc, w.history)        // из адреса убираем всегда: ссылку не расшарят с чужим clickId
    var base = meta('wt-trafficgen')
    if (!/^https?:\/\//.test(base)) return { status: 'not_configured' }
    if (optedOut(w.navigator)) return { status: 'opted_out' }
    var key = 'wt_landing_' + clickId
    try { if (w.sessionStorage.getItem(key)) return { status: 'already_sent' } } catch (e) { /* приватный режим */ }
    var page = meta('wt-page')
    var event = {
      eventType: 'LandingReached',
      pageId: PAGE_RE.test(page) ? page : undefined,
      sessionId: 'sess_' + randomId(),
      seq: 1,
      sourceType: 'real',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      payload: { clickId: clickId, landing: loc.pathname.slice(0, 120) },
    }
    var via = send(base.replace(/\/+$/, '') + '/api/track', JSON.stringify(event))
    try { w.sessionStorage.setItem(key, '1') } catch (e) { /* ok */ }
    return { status: via ? 'sent' : 'no_transport', via: via, clickId: clickId }
  }

  w.__wtLanding = { run: run, readClickId: readClickId, version: 1 }
  w.__wtLandingResult = run()
})(window, document)

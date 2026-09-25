/* wt-forms v1 — логика ссылок и форм статических площадок Watchtower.
 *
 * Что делает:
 *  1) a[data-wt-buy]  → MARKETPLACE_URL, когда он задан (раунд открыт);
 *     до этого CTA остаётся честным якорем на вайтлист (#waitlist).
 *  2) a[data-wt-contact] → CONTACT_URL, когда задан.
 *  3) form[data-wt-waitlist] → валидация e-mail, honeypot от ботов, POST JSON
 *     на FORM_ENDPOINT; без FORM_ENDPOINT — демо-сообщение (не притворяемся,
 *     что запись ушла). В payload прикладываем clickId перехода TalkChart,
 *     но только если wt-landing его реально отправил (DNT/GPC уважается).
 *  4) [data-wt-og-href] подставляет OG_BASE, если он задан (служебные ссылки).
 *
 * Без сетевых обращений при загрузке, без cookie, без PII кроме введённого
 * пользователем e-mail, который он отправляет явно.
 */
(function (w, d) {
  'use strict'

  var P = w.WT_PARAMS || {}
  var lang = (d.documentElement.getAttribute('lang') || 'ru').toLowerCase().indexOf('en') === 0 ? 'en' : 'ru'

  var T = {
    ru: {
      demo: 'Форма в демо-режиме: отправка подключится перед стартом раунда.',
      sent: 'Готово — вы в листе ожидания. Письмо придёт перед стартом.',
      failed: 'Не удалось отправить. Напишите нам напрямую',
      contactFallback: 'контакты публикуются ближе к старту',
      badEmail: 'Похоже, в адресе опечатка — проверьте ещё раз.',
      spam: 'Заявка отклонена.',
    },
    en: {
      demo: 'The form is in demo mode: submission goes live before the round opens.',
      sent: 'Done — you are on the waitlist. An e-mail will arrive before the launch.',
      failed: 'Could not submit. Reach us directly',
      contactFallback: 'contacts will be published closer to launch',
      badEmail: 'That address looks off — please double-check it.',
      spam: 'Submission rejected.',
    },
  }[lang]

  var EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/

  function str(v) { return typeof v === 'string' && /^https?:\/\//.test(v.trim()) ? v.trim() : '' }

  function setText(el, text) { if (el) { el.hidden = false; el.textContent = text } }

  function linkify() {
    var market = str(P.MARKETPLACE_URL)
    var contact = str(P.CONTACT_URL)
    // data-wt-buy и data-wt-contact скрыты в разметке и появляются только
    // когда параметр реально задан — страница не притворяется, что продажа открыта.
    d.querySelectorAll('a[data-wt-buy]').forEach(function (a) {
      if (market) { a.hidden = false; a.setAttribute('href', market); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener') }
    })
    d.querySelectorAll('a[data-wt-contact]').forEach(function (a) {
      if (contact) { a.hidden = false; a.setAttribute('href', contact) }
    })
    // Плашка раунда 0: Terms «выдаются до оплаты» — появляются, как только есть документ.
    var terms = str(P.NFT_TERMS_URL)
    d.querySelectorAll('[data-wt-terms]').forEach(function (el) {
      if (terms) { el.hidden = false; if (el.tagName === 'A') { el.setAttribute('href', terms); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener') } }
    })
  }

  function clickIdFromTracker() {
    // wt-landing.js кладёт результат в window.__wtLandingResult. clickId прикладываем
    // только когда событие было доставлено генератору (status 'sent'): иначе либо
    // человек отказался от учёта (DNT/GPC), либо приёмщик не настроен и атрибуция
    // была бы фальшивой.
    try {
      var r = w.__wtLandingResult
      if (r && r.status === 'sent' && r.clickId) return String(r.clickId).slice(0, 64)
    } catch (e) { /* приватный режим */ }
    return null
  }

  function bindForm(form) {
    var email = form.querySelector('input[type="email"]')
    var honeypot = form.querySelector('[data-wt-hp]')
    var msg = form.querySelector('[data-wt-msg]') || form.querySelector('p')
    var button = form.querySelector('button')
    form.addEventListener('submit', function (ev) {
      ev.preventDefault()
      if (honeypot && honeypot.value) { setText(msg, T.spam); return }
      var value = (email && email.value || '').trim()
      if (!EMAIL_RE.test(value)) { setText(msg, T.badEmail); if (email) email.focus(); return }
      var endpoint = str(P.FORM_ENDPOINT)
      if (!endpoint) { setText(msg, T.demo); return }
      if (button) { button.disabled = true }
      var payload = {
        email: value,
        lang: lang,
        page: (w.location.pathname || '').slice(0, 160),
        form: form.getAttribute('data-wt-waitlist') || 'waitlist',
        clickId: clickIdFromTracker(),
        ts: new Date().toISOString(),
      }
      w.fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (res) {
        if (res.ok) {
          setText(msg, T.sent)
          form.reset()
        } else {
          var contact = str(P.CONTACT_URL)
          setText(msg, T.failed + (contact ? ': ' + contact : ' — ' + T.contactFallback) + '.')
        }
      }).catch(function () {
        var contact = str(P.CONTACT_URL)
        setText(msg, T.failed + (contact ? ': ' + contact : ' — ' + T.contactFallback) + '.')
      }).finally(function () {
        if (button) { button.disabled = false }
      })
    })
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init)
  else init()

  function init() {
    linkify()
    d.querySelectorAll('form[data-wt-waitlist]').forEach(bindForm)
  }

  w.WT_FORMS = { version: 1, clickIdFromTracker: clickIdFromTracker }
})(window, document)

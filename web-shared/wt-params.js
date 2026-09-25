/* wt-params v1 — параметры запуска для статических площадок Watchtower.
 *
 * ЕДИНСТВЕННОЕ место, которое правится перед стартом продажи (см. чек-лист —
 * INVESTOR_LANDING_BRIEF.md §9 и WHITEPAPER). Пустая строка = функция честно
 * выключена; страницы показывают демо-сообщение, а не фальшивую кнопку.
 *
 * Правило системы «никаких выдуманных цифр» действует и здесь:
 * raised.* заполняется только фактически поступившими суммами (USDC/SOL
 * подтверждается транзакцией казны-мультиподписи), иначе остаётся 0.
 */
window.WT_PARAMS = {
  // Куда POST-ить вайтлист (JSON: email, lang, page, clickId, form). '' = демо.
  FORM_ENDPOINT: '',

  // После открытия раунда: ссылка на mint/marketplace. Пока '' — CTA ведёт на вайтлист.
  MARKETPLACE_URL: '',

  // Terms for the Ecosystem Share (документ прав, выдаётся покупателю до оплаты; юрист).
  NFT_TERMS_URL: '',

  // Канал связи с основателем (Telegram/e-mail) для блока «задать вопрос».
  CONTACT_URL: '',

  // Прод-приёмщик TalkChart (https://<генератор> — события LandingReached, протокол
  // patches/games/wt-landing.js). '' = трекер молчит, но wt_click из URL всё равно
  // вычищается и прикладывается к вайтлисту для ручной атрибуции.
  TRAFFICGEN_URL: '',

  // Фактические сборы (по транзакциям казны). До старта = 0 и так и отображается.
  raised: {
    round0_nft: 0, // USDC, раунд 0 — Ecosystem Share NFT
    round1: 0,     // USDC, пресейл $WTWR Founders
    round2: 0,     // USDC, пресейл $WTWR Builders
    // Позиции железа Compute Grid по id из token-landing/token-data.mjs (HW):
    hardware: {},  // например: { gpu_ai: 9000 } — только подтверждённые чеком суммы
  },
}

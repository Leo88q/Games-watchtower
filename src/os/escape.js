/**
 * Экранирование значений, приходящих из API, перед вставкой в innerHTML.
 * Панели OS v3 рендерятся строковыми шаблонами — любое значение обязано пройти esc().
 */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))

/** JSON внутри HTML тоже экранируется: кавычки и скобки не должны закрывать разметку. */
export const escJson = (value, space = 2) => esc(JSON.stringify(value, null, space))

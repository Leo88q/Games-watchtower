// ---------------------------------------------------------------------------
// Вход на вахту кошельком Solana: подпись одного текстового сообщения.
// Никаких транзакций и разрешений на списание — кошелёк только подтверждает адрес.
// ---------------------------------------------------------------------------
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58Encode(bytes) {
  const digits = []
  for (const byte of bytes) {
    let carry = byte
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8
      digits[i] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0 }
  }
  let out = ''
  for (const byte of bytes) { if (byte === 0) out += '1'; else break }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]]
  return out
}

/** Кошельки, которые встроились в страницу. Порядок — по популярности в экосистеме Solana. */
export function detectWallets(w = window) {
  const found = []
  const add = (id, name, provider) => { if (provider && typeof provider.signMessage === 'function' && !found.some((x) => x.provider === provider)) found.push({ id, name, provider }) }
  add('phantom', 'Phantom', w.phantom?.solana?.isPhantom ? w.phantom.solana : null)
  add('solflare', 'Solflare', w.solflare?.isSolflare ? w.solflare : null)
  add('backpack', 'Backpack', w.backpack?.solana || null)
  if (w.solana && !found.some((x) => x.provider === w.solana)) add('solana', w.solana.isPhantom ? 'Phantom' : 'Кошелёк Solana', w.solana)
  return found
}

function signatureBytes(signed) {
  const sig = signed?.signature ?? signed
  // Подпись может прийти из другого окна (iframe кошелька) — instanceof там не срабатывает
  if (ArrayBuffer.isView(sig) || Object.prototype.toString.call(sig) === '[object Uint8Array]') return Uint8Array.from(sig)
  if (Array.isArray(sig)) return Uint8Array.from(sig)
  if (sig?.data) return Uint8Array.from(sig.data)
  throw new Error('Кошелёк вернул подпись в неизвестном формате')
}

/**
 * Полный вход: подключение кошелька → сообщение с одноразовым кодом от сервера →
 * подпись → проверка подписи на сервере → сессия.
 */
export async function signInWithWallet(provider, api) {
  const res = await provider.connect()
  const publicKey = res?.publicKey || provider.publicKey
  if (!publicKey) throw new Error('Кошелёк не сообщил адрес')
  const wallet = publicKey.toString()
  const { message } = await api.nonce(wallet)
  const signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8')
  return api.auth(wallet, base58Encode(signatureBytes(signed)))
}

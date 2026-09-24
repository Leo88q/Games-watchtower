/**
 * Инвариант read-only: хаб не подписывает и не отправляет транзакции в блокчейн.
 *
 * Это не «флаг по умолчанию», а проверяемое свойство кодовой базы:
 *  - в серверном коде нет вызовов sendTransaction/signTransaction/sendRawTransaction/Keypair.fromSecretKey;
 *  - в зависимостях нет клиентов Solana (package.json → dependencies отсутствуют вовсе);
 *  - единственные записи на диск — файлы состояния хаба (курсоры, снапшоты).
 * Проверяется скриптом scripts/check-read-only.mjs в CI и в test:hardening.
 */
export const CAPABILITIES = Object.freeze({
  blockchainSigning: false,
  blockchainWrites: false,
  filesystemWrites: ['data/ingestion-cursors.json', 'data/investor-snapshots.json'],
  inboxWrites: true,
  reason: 'Хаб не хранит ключей и не импортирует клиент Solana; единственная запись — приём событий в inbox и файлы состояния хаба.',
})

export const FORBIDDEN_PATTERNS = Object.freeze([
  { pattern: /\bsendTransaction\b/, label: 'sendTransaction' },
  { pattern: /\bsignTransaction\b/, label: 'signTransaction' },
  { pattern: /\bsendRawTransaction\b/, label: 'sendRawTransaction' },
  { pattern: /\bsignAndSendRawTransaction\b/, label: 'signAndSendRawTransaction' },
  { pattern: /fromSecretKey\s*\(/, label: 'Keypair.fromSecretKey' },
  { pattern: /new\s+Keypair\s*\(/, label: 'new Keypair(' },
  { pattern: /secretKey\s*:/, label: 'secretKey:' },
  { pattern: /tweetnacl/, label: 'tweetnacl' },
  { pattern: /\.rpc\s*\(/, label: 'Anchor .rpc() — отправка транзакции' },
  { pattern: /sendAndConfirm(Transaction)?/, label: 'sendAndConfirm — отправка транзакции' },
])

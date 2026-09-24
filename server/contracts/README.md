# Контракты студии (спецификация)

Три Anchor-программы: `cross_game_inventory`, `studio_treasury`, `session_keys`.

Статус: **спецификация, а не развёрнутый код**. В репозитории нет Rust/Anchor toolchain, поэтому:

- программы не собираются в CI и не покрыты `anchor test`;
- адреса программ — заглушки-константы вида `CgInv...`; реальные адреса выдаёт деплой;
- хаб Watchtower их не вызывает: `writes: false`, проверяется `npm run test:readonly`.

Что проверено здесь статически (и что исправлено после аудита):

| Программа | Инвариант в коде |
|---|---|
| `studio_treasury` | authority назначается подписью инициатора (`require_keys_eq!`), вывод — через timelock ≥ 24 ч (`queue_withdraw` → `execute_withdraw`), инвариант `deposited ≥ withdrawn + liabilities` перепроверяется при исполнении, арифметика через `checked_add` |
| `cross_game_inventory` | изменение профиля только владельцем, `space` считается функцией `profile_space()`, строки и вектор ограничены `#[max_len]`, вставка сверх `MAX_CROSS_GAME_ITEMS` отклоняется |
| `session_keys` | `validate_session(instruction)` проверяет `denied_instructions`, scope, срок и отзыв; ответ — только `bool` |

Перед деплоем в devnet/mainnet обязательны: сборка с toolchain, `anchor test`, проверка адресов,
внешний аудит. До этого считать программы непроверенными.

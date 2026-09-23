#!/usr/bin/env bash
# Раскладывает промпт-файл по всем репозиториям экосистемы и пушит в main.
#
# Запуск:  bash ~/distribute_prompt.sh
#
# Путь к клонам искать не нужно: скрипт сам ищет их в домашней папке,
# а если клона нет — клонирует в ~/audit-dist/<репозиторий>.
# Повторный запуск безопасен: если файл уже такой, ничего не коммитится.
#
# Что кладём (SRC) и какие репозитории (REPOS) — можно переопределить окружением:
#   SRC=~/Downloads/другой.md REPOS="aof investor" bash ~/distribute_prompt.sh
set -u

SRC="${SRC:-$HOME/Downloads/PROMPT_AUDIT_FULL_STACK_V2.md}"
CLONE_DIR="${CLONE_DIR:-$HOME/audit-dist}"
OWNER="${OWNER:-Leo88q}"
URL_TEMPLATE="${URL_TEMPLATE:-https://github.com/$OWNER/%s.git}"
REPOS="${REPOS:-Games-watchtower aof ares1 guttercaps neon-relay talkchart-traffic-generator}"
BRANCH="${BRANCH:-main}"

# файл промпта: если точного имени нет — ищем по маске (в имени часто есть скобки: [V2])
if [ ! -f "$SRC" ]; then
  found="$(ls -1 "$HOME/Downloads"/*PROMPT_AUDIT_FULL_STACK*V2*.md 2>/dev/null | head -1)"
  [ -n "$found" ] && { echo "Точного пути нет, беру найденный файл: $found"; SRC="$found"; }
fi
if [ ! -f "$SRC" ]; then
  echo "Не нашёл файл промпта ($SRC)."
  echo "Что есть в ~/Downloads:"
  ls -1 "$HOME/Downloads" 2>/dev/null | grep -i "PROMPT_AUDIT" | sed 's/^/  /'
  echo "Укажи путь явно:  SRC=\"\$HOME/Downloads/имя.md\" bash ~/distribute_prompt.sh"
  exit 1
fi
echo "Файл: $SRC ($(wc -c < "$SRC" | tr -d ' ') байт)"

if [ -z "$(git config --get user.email 2>/dev/null || true)" ] && [ -z "$(git config --get user.name 2>/dev/null || true)" ]; then
  echo "git не знает, кто ты (нет user.name/user.email) — коммиты не создадутся. Выполни один раз:"
  echo "  git config --global user.name \"Твоё имя\""
  echo "  git config --global user.email \"твой@email\""
  exit 1
fi

ok=0; skip=0
for r in $REPOS; do
  # 1. Где клон: ищем в домашней папке, при отсутствии — клонируем в CLONE_DIR
  d="$(find "$HOME" -maxdepth 6 -type d -name "$r" -not -path "*/node_modules/*" \
        -not -path "$CLONE_DIR/*" -exec test -d '{}/.git' ';' -print -quit 2>/dev/null)"
  if [ -z "$d" ]; then
    d="$CLONE_DIR/$r"
    if [ -d "$d/.git" ]; then
      :
    else
      echo "$r: локального клона нет, клонирую в $d"
      mkdir -p "$CLONE_DIR"
      git clone -q "$(printf "$URL_TEMPLATE" "$r")" "$d" 2>/dev/null || {
        echo "$r: клонирование не удалось (нет доступа? репозиторий переименован?) — пропуск"
        skip=$((skip+1)); continue; }
    fi
  fi

  # 2. Куда кладём файл: в хабе — рядом с остальными аудит-промптами, в продуктах — в корень
  if [ "$r" = "Games-watchtower" ]; then
    f="prompts/audit/$(basename "$SRC")"
  else
    f="$(basename "$SRC")"
  fi

  # 3. Чистое ли состояние
  if [ -n "$(git -C "$d" status --porcelain)" ]; then
    echo "$r: есть незакоммиченные изменения — пропуск (разберись в $d, потом запусти снова)"
    skip=$((skip+1)); continue
  fi
  if ! git -C "$d" checkout -q "$BRANCH" 2>/dev/null; then
    if git -C "$d" rev-parse --verify -q "origin/$BRANCH" >/dev/null; then
      git -C "$d" checkout -q -B "$BRANCH" "origin/$BRANCH" || { echo "$r: не смог встать на $BRANCH — пропуск"; skip=$((skip+1)); continue; }
    else
      git -C "$d" checkout -q -B "$BRANCH" || { echo "$r: не смог встать на $BRANCH — пропуск"; skip=$((skip+1)); continue; }
    fi
  fi
  if ! git -C "$d" pull -q --rebase origin "$BRANCH" 2>/dev/null; then
    echo "$r: origin/$BRANCH не подтянулся — пропуск ($d)"; skip=$((skip+1)); continue
  fi

  # 4. Кладём файл
  mkdir -p "$(dirname "$d/$f")"
  cp "$SRC" "$d/$f"
  git -C "$d" add -- "$f"

  # в хабе раньше файл лёг в корень — убираем дубль, чтобы не было двух копий
  if [ "$r" = "Games-watchtower" ] && [ -f "$d/$(basename "$SRC")" ]; then
    git -C "$d" rm -q --cached -- "$(basename "$SRC")"
    rm -f "$d/$(basename "$SRC")"
    echo "$r: убрал дубль из корня репозитория"
  fi

  if git -C "$d" diff --cached --quiet; then
    echo "$r: файл уже на месте — коммитить нечего"; ok=$((ok+1)); continue
  fi
  git -C "$d" commit -q -m "docs(audit): add $(basename "$f")" || { echo "$r: коммит не прошёл"; skip=$((skip+1)); continue; }

  if git -C "$d" push -q origin "$BRANCH"; then
    echo "$r: OK → $f   (клон: $d)"; ok=$((ok+1))
  else
    echo "$r: пуш отклонён — пробую pull --rebase и повторяю"
    if git -C "$d" pull -q --rebase origin "$BRANCH" 2>/dev/null && git -C "$d" push -q origin "$BRANCH"; then
      echo "$r: OK (после rebase) → $f"; ok=$((ok+1))
    else
      echo "$r: ПУШ НЕ ПРОШЁЛ — проверь права, затем: git -C \"$d\" push origin $BRANCH"; skip=$((skip+1))
    fi
  fi
done

echo
echo "Готово: успешно $ok, пропущено $skip"
echo "Проверка: https://github.com/$OWNER/<репозиторий>/blame/$BRANCH/PROMPT_AUDIT_FULL_STACK_V2.md"

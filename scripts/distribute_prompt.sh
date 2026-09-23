#!/usr/bin/env bash
# Разложить один промпт-файл по всем репозиториям экосистемы и запушить в main.
#
# Запуск:            bash ~/distribute_audit_prompt.sh
# Проверка без пуша: DRY_RUN=1 bash ~/distribute_audit_prompt.sh
#
# Скрипт идемпотентен: если файл уже совпадает — повторно ничего не коммитит.
# Клоны лежат в ~/audit-dist/<репозиторий>, повторный запуск их переиспользует.
#
# Переопределяется окружением:
#   SRC=<файл>  REPOS="aof investor"  WORK=<каталог>  OWNER=Leo88q  DRY_RUN=1

set -u

SRC="${SRC:-$HOME/Downloads/PROMPT_AUDIT_FULL_STACK_V2.md}"
WORK="${WORK:-$HOME/audit-dist}"
OWNER="${OWNER:-Leo88q}"
REPOS="${REPOS:-Games-watchtower aof ares1 guttercaps neon-relay talkchart-traffic-generator investor}"
DRY_RUN="${DRY_RUN:-0}"
URL_TEMPLATE="${URL_TEMPLATE:-https://github.com/$OWNER/%s.git}"

# Куда кладём файл внутри репозитория: у хаба есть prompts/audit/, у продуктов — корень.
# Меняешь путь — поменяй здесь.
path_in_repo() {
  case "$1" in
    Games-watchtower) echo "prompts/audit/PROMPT_AUDIT_FULL_STACK_V2.md" ;;
    *)                echo "PROMPT_AUDIT_FULL_STACK_V2.md" ;;
  esac
}

if [ ! -f "$SRC" ]; then
  # в имени файла часто есть скобки ([V2]) — попробуем найти его по маске
  alt="$(ls -1 "$HOME/Downloads"/PROMPT_AUDIT_FULL_STACK*V2*.md 2>/dev/null | head -1)"
  if [ -n "$alt" ] && [ -f "$alt" ]; then
    echo "Точного пути нет, использую найденный файл: $alt"
    SRC="$alt"
  else
    echo "Файл не найден: $SRC"
    echo "Что есть похожего в ~/Downloads:"
    ls -1 "$HOME/Downloads" 2>/dev/null | grep -i "PROMPT_AUDIT" | sed 's/^/  /' || echo "  (ничего похожего)"
    echo
    echo "В имени бывают скобки и пробелы — тогда нужны кавычки, например:"
    echo "  SRC=\"\$HOME/Downloads/PROMPT_AUDIT_FULL_STACK_[V2].md\" bash ~/distribute_audit_prompt.sh"
    exit 1
  fi
fi

if [ -z "$(git config --global user.email || true)" ] && [ -z "$(git config user.email || true)" ]; then
  echo "ВНИМАНИЕ: git не знает, кто ты (нет user.name/user.email) — коммиты не создадутся."
  echo "Выполни один раз и запусти скрипт снова:"
  echo "  git config --global user.name \"Твоё имя\""
  echo "  git config --global user.email \"твой@email\""
  exit 1
fi

echo "Источник: $SRC ($(wc -c < "$SRC" | tr -d ' ') байт, $(wc -l < "$SRC" | tr -d ' ') строк)"
[ "$DRY_RUN" = "1" ] && echo "РЕЖИМ DRY RUN: коммиты создаются, пуш не выполняется"
mkdir -p "$WORK"
RESULTS="$WORK/.results"; : > "$RESULTS"
say() { echo "  $*"; }

for r in $REPOS; do
  printf '\n=== %s ===\n' "$r"
  dir="$WORK/$r"
  rel="$(path_in_repo "$r")"

  # 1. Клон (или обновление уже существующего)
  if [ -d "$dir/.git" ]; then
    # у клона пустого репозитория бывает не прописан refspec — без него нет origin/main
    git -C "$dir" config --get remote.origin.fetch >/dev/null 2>&1 ||
      git -C "$dir" config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
    if ! git -C "$dir" fetch -q origin 2>/dev/null; then
      say "предупреждение: origin/main не получен, работаю с локальной копией"
    fi
    if git -C "$dir" rev-parse --verify -q HEAD >/dev/null; then
      if ! git -C "$dir" checkout -q main; then say "не смог встать на main — пропускаю"; echo "$r | SKIP: checkout main не удался" >> "$RESULTS"; continue; fi
      if git -C "$dir" rev-parse --verify -q origin/main >/dev/null; then
        if ! git -C "$dir" merge -q --ff-only origin/main 2>/dev/null; then
          say "локальный main разошёлся с origin — пропускаю (в $dir есть свои коммиты;"
          say "  чтобы начать с чистого листа: rm -rf \"$dir\" и запусти скрипт снова)"
          echo "$r | SKIP: локальный main разошёлся с origin" >> "$RESULTS"; continue
        fi
      else
        say "на origin ещё нет ветки main — коммит её создаст"
      fi
    fi
  else
    if ! git clone -q --depth 1 "$(printf "$URL_TEMPLATE" "$r")" "$dir"; then
      say "клонирование не удалось (нет доступа? репозиторий переименован?) — пропускаю"
      echo "$r | SKIP: не удалось клонировать" >> "$RESULTS"; continue
    fi
  fi

  # 2. Пустой репозиторий или другое имя ветки
  if ! git -C "$dir" rev-parse --verify -q HEAD >/dev/null; then
    if git -C "$dir" rev-parse --verify -q origin/main >/dev/null; then
      git -C "$dir" checkout -q -B main origin/main || { say "ветка main недоступна — пропускаю"; echo "$r | SKIP: origin/main недоступен" >> "$RESULTS"; continue; }
      say "создал локальный main из origin/main"
    else
      git -C "$dir" checkout -q -B main || { say "не смог создать ветку main — пропускаю"; echo "$r | SKIP: ветка main не создаётся" >> "$RESULTS"; continue; }
      say "репозиторий пуст — файл станет первым коммитом в main"
    fi
  fi

  # 3. Раскладка файла
  mkdir -p "$(dirname "$dir/$rel")"
  cp "$SRC" "$dir/$rel"
  local_hash="$(git -C "$dir" hash-object -- "$rel")"
  remote_hash="$(git -C "$dir" rev-parse -q --verify "origin/main:$rel" 2>/dev/null || true)"

  if [ -n "$(git -C "$dir" status --porcelain -- "$rel")" ]; then
    git -C "$dir" add -- "$rel"
    if ! git -C "$dir" commit -q -m "docs(audit): add $(basename "$rel")"; then
      say "коммит не прошёл — пропускаю"; echo "$r | SKIP: коммит не прошёл" >> "$RESULTS"; continue
    fi
    say "коммит $(git -C "$dir" log -1 --format=%h) создан"
  fi

  if [ "$local_hash" = "$remote_hash" ]; then
    say "на origin/main уже лежит этот файл — пуш не нужен"
    echo "$r | OK (без изменений): $rel" >> "$RESULTS"; continue
  fi
  short="$(git -C "$dir" log -1 --format=%h)"
  local_extra="$(git -C "$dir" log --oneline origin/main..HEAD 2>/dev/null | grep -v "docs(audit): add $(basename "$rel")" || true)"
  if [ -n "$local_extra" ]; then
    say "внимание: в этом клоне есть другие локальные коммиты, они тоже уйдут в origin/main:"
    echo "$local_extra" | head -5 | sed 's/^/    /'
  fi

  if [ "$DRY_RUN" = "1" ]; then
    say "[dry-run] к пушу готов commit $short"
    echo "$r | DRY-RUN: коммит $short готов" >> "$RESULTS"; continue
  fi

  # 4. Пуш (с одним повтором через rebase, если ветка уехала вперёд)
  if git -C "$dir" push -q origin main; then
    say "OK → $r/$rel ($short)"; echo "$r | OK: $rel ($short)" >> "$RESULTS"
  elif git -C "$dir" pull -q --rebase origin main 2>/dev/null && git -C "$dir" push -q origin main; then
    say "OK (после rebase) → $r/$rel"; echo "$r | OK: $rel (после rebase)" >> "$RESULTS"
  else
    say "НЕ УДАЛОСЬ запушить — проверь права и ветку вручную: $dir"
    echo "$r | FAIL: пуш отклонён" >> "$RESULTS"
  fi
done

printf '\n=== ИТОГ ===\n'
column -t -s '|' "$RESULTS" 2>/dev/null || cat "$RESULTS"
echo
echo "Клоны: $WORK"
echo "Проверка в браузере: https://github.com/$OWNER/<репозиторий>/blame/main/<путь>"

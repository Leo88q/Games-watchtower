#!/usr/bin/env bash
# Применяет патчи подтверждения перехода: генератор (0004) + 4 игры.
# Запуск из любой папки:  bash ~/LeoGamesStudio/Games-watchtower/patches/games/apply.sh
# Флаги: --no-pr (только ветки и push), --dry-run (ничего не менять, показать план).
set -uo pipefail

STUDIO="${STUDIO:-$HOME/LeoGamesStudio}"
HUB="$STUDIO/Games-watchtower"
HUB_BRANCH="arena/01a0d32d-games-watchtower"
BRANCH="watchtower-landing-beacon"
DRY=0; PR=1
for a in "$@"; do case "$a" in --dry-run) DRY=1;; --no-pr) PR=0;; *) echo "неизвестный флаг $a"; exit 2;; esac; done

say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

say "Патчи берём прямо с ветки хаба $HUB_BRANCH (локальный checkout хаба не трогаем)"
git -C "$HUB" fetch -q origin "$HUB_BRANCH" || { echo "✗ не удалось получить $HUB_BRANCH"; exit 1; }
extract() { git -C "$HUB" show "FETCH_HEAD:$1" > "$2"; }

# repo | патч в хабе
JOBS=(
  "talkchart-traffic-generator|patches/talkchart-traffic-generator/0004-landing-absolute-game-targets.patch"
  "ares1|patches/games/ares1/0001-watchtower-LandingReached-wt_click.patch"
  "aof|patches/games/aof/0001-watchtower-LandingReached-wt_click.patch"
  "guttercaps|patches/games/guttercaps/0001-watchtower-LandingReached-wt_click.patch"
  "neon-relay|patches/games/neon-relay/0001-watchtower-LandingReached-wt_click.patch"
)

FAILED=()
for job in "${JOBS[@]}"; do
  repo="${job%%|*}"; patch="${job#*|}"; dir="$STUDIO/$repo"
  say "$repo"
  if [ ! -d "$dir/.git" ]; then echo "✗ нет $dir"; FAILED+=("$repo: нет папки"); continue; fi
  extract "$patch" "$TMP/$repo.patch" || { FAILED+=("$repo: патч не найден"); continue; }
  if [ -n "$(git -C "$dir" status --porcelain)" ]; then
    echo "✗ в $repo есть незакоммиченные изменения — пропускаю (git -C $dir status)"; FAILED+=("$repo: грязное дерево"); continue
  fi
  git -C "$dir" fetch -q origin main || { FAILED+=("$repo: fetch"); continue; }
  if [ "$DRY" = 1 ]; then echo "  (dry-run) ветка $BRANCH от origin/main + git am $(basename "$patch")"; continue; fi
  prev="$(git -C "$dir" branch --show-current)"
  git -C "$dir" switch -q -C "$BRANCH" origin/main || { FAILED+=("$repo: switch"); continue; }
  if ! git -C "$dir" am -q --3way "$TMP/$repo.patch"; then
    git -C "$dir" am --abort 2>/dev/null; git -C "$dir" switch -q "$prev" 2>/dev/null
    echo "✗ патч не применился"; FAILED+=("$repo: git am"); continue
  fi
  git -C "$dir" log --oneline -1
  if [ "$repo" = "talkchart-traffic-generator" ]; then
    (cd "$dir" && python3 scripts/test_landing_ledger.py >/dev/null 2>&1 && python3 scripts/smoke_watchtower.py 2>&1 | grep -q "ALL .* PASSED") \
      && echo "  ✓ тесты генератора" || { echo "  ✗ тесты генератора"; FAILED+=("$repo: тесты"); continue; }
  fi
  git -C "$dir" push -q --force-with-lease -u origin "$BRANCH" || { FAILED+=("$repo: push"); continue; }
  if [ "$PR" = 1 ] && command -v gh >/dev/null; then
    (cd "$dir" && gh pr view "$BRANCH" --json url -q .url 2>/dev/null \
      || gh pr create --base main --head "$BRANCH" --fill 2>&1 | tail -1)
  fi
done

say "Итог"
if [ ${#FAILED[@]} -eq 0 ]; then echo "✓ все 5 репозиториев"; else printf '✗ %s\n' "${FAILED[@]}"; fi
exit ${#FAILED[@]}

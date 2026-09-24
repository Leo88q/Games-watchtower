#!/usr/bin/env bash
# Прогон студии: обновление → сборка → тесты → (опц.) деплой программ.
#   ./mac-full-pipeline.sh --plan                    # только план
#   ./mac-full-pipeline.sh                           # полный прогон по всем репозиториям
#   ./mac-full-pipeline.sh --only=ares1              # один репозиторий
#   ./mac-full-pipeline.sh --deploy=devnet           # + деплой программ ares1 на devnet
#   AUDIT_ACK=1 ./mac-full-pipeline.sh --deploy=mainnet-beta --only=ares1 --i-understand-mainnet
# Неизвестные аргументы передаются в prod-release.mjs как есть.
set -Eeuo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Лончер лежит либо в корне студии, либо в Games-watchtower/scripts/ — студию находим по наличию хаба.
STUDIO="${LEO_STUDIO:-$HERE}"
if [ ! -d "$STUDIO/Games-watchtower/.git" ]; then STUDIO="$(cd "$HERE/../.." && pwd)"; fi
HUB="$STUDIO/Games-watchtower"
RUNNER="$HUB/scripts/prod-release.mjs"
[ -d "$HUB/.git" ] || { echo "✗ нет git-репозитория хаба: $HUB" >&2; exit 2; }

MODE="run"; CLUSTER=""; ARGS=()
for a in "$@"; do
  case "$a" in
    --plan) MODE="plan" ;;
    --deploy=*) MODE="deploy"; CLUSTER="${a#*=}" ;;
    *) ARGS+=("$a") ;;
  esac
done

cd "$HUB"
DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "$DIRTY" ]; then
  echo "✗ в Games-watchtower есть незакоммиченные правки (иначе артефакт не привязан к коммиту):"
  printf '%s\n' "$DIRTY" | head -8
  echo "  решите: git commit или git stash — и повторите"
  exit 1
fi

if [ "$MODE" = "plan" ]; then
  echo "▸ план: репозитории не обновляю (обновление — прогон без --plan)"
else
  echo "▸ обновление Games-watchtower"
  git fetch origin arena/01a0d32d-games-watchtower || echo "! fetch не удался (сеть или доступ к origin) — работаю на том, что уже лежит локально"
  if git merge --ff-only FETCH_HEAD; then :; else
    echo "! fast-forward невозможен (локальные коммиты) — продолжаю на текущем HEAD $(git rev-parse --short HEAD)"
  fi
fi
[ -f "$RUNNER" ] || { echo "✗ нет $RUNNER — обновите репозиторий" >&2; exit 2; }

echo "▸ студия: $STUDIO"
case "$MODE" in
  plan)   CMD=(--dry-run) ;;
  deploy) CMD=(--deploy "--cluster=$CLUSTER") ;;
  *)      CMD=() ;;
esac
if [ ${#ARGS[@]} -gt 0 ]; then CMD+=("${ARGS[@]}"); fi
if [ ${#CMD[@]} -gt 0 ]; then exec node "$RUNNER" --studio="$STUDIO" "${CMD[@]}"; else exec node "$RUNNER" --studio="$STUDIO"; fi

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INTERVAL_SECONDS="${SOURDOUGH_INTERVAL_SECONDS:-3600}"
LOG="$ROOT/logs/terminal-loop.log"
mkdir -p "$ROOT/logs"
cd "$ROOT"

echo "== $(date) == Starting Terminal/user-session sourdough loop every ${INTERVAL_SECONDS}s" | tee -a "$LOG"
echo "Close this Terminal window or press Ctrl-C to stop." | tee -a "$LOG"

while true; do
  scripts/publish-cycle.sh || true
  echo "== $(date) == Sleeping ${INTERVAL_SECONDS}s" | tee -a "$LOG"
  sleep "$INTERVAL_SECONDS"
done

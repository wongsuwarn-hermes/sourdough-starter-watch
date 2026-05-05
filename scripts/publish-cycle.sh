#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/publish-cycle.log"
DRY_RUN="${SOURDOUGH_DRY_RUN:-0}"
HEIGHT_CM="${SOURDOUGH_HEIGHT_CM:-}"
BASELINE_CM="${SOURDOUGH_BASELINE_CM:-}"
CONFIDENCE="${SOURDOUGH_CONFIDENCE:-0.45}"
NOTE="${SOURDOUGH_NOTE:-Fresh webcam frame captured; height reused until visual estimate is confirmed.}"

cd "$ROOT"
exec > >(tee -a "$LOG") 2>&1

echo "== $(date) =="
echo "Running sourdough publish cycle (dry_run=$DRY_RUN)"

git pull --ff-only || true

CAPTURE_OUTPUT="$(npm run --silent capture | tail -1)"
echo "Captured: $CAPTURE_OUTPUT"
file public/photos/starter.jpg

RECORD_ARGS=("scripts/record-reading.js" "--image" "public/photos/starter.jpg" "--confidence" "$CONFIDENCE" "--note" "$NOTE")
if [[ -n "$HEIGHT_CM" ]]; then
  RECORD_ARGS+=("--height-cm" "$HEIGHT_CM")
fi
if [[ -n "$BASELINE_CM" ]]; then
  RECORD_ARGS+=("--baseline-cm" "$BASELINE_CM")
fi

node "${RECORD_ARGS[@]}"
npm test
npm run build

python3 - <<'PY'
from pathlib import Path
html = Path('public/index.html').read_text()
for term in ['Mac Studio', 'OBSBOT']:
    if term in html:
        raise SystemExit(f'Privacy check failed: {term}')
print('Privacy check passed')
PY

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run complete; not committing or pushing."
  git status --short
  exit 0
fi

git add data/observations.json public/index.html public/photos/starter.jpg
if git diff --cached --quiet; then
  echo "No publishable changes."
  exit 0
fi

MESSAGE="$(node -e "import('./src/automation.js').then(m=>console.log(m.buildPublishCommitMessage()))")"
git commit -m "$MESSAGE"
git push

echo "Published."

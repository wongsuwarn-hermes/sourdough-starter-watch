#!/usr/bin/env bash
set -euo pipefail
cd /Users/mac_studio/Projects/sourdough-starter-watch
LOG=/Users/mac_studio/Projects/sourdough-starter-watch/logs/terminal-capture-once.log
mkdir -p logs
{
  echo "== $(date) =="
  scripts/capture-webcam.sh
} > "$LOG" 2>&1
cat "$LOG"

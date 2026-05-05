#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE_INDEX="${SOURDOUGH_CAMERA_INDEX:-0}"
OUT_DIR="$ROOT/public/photos/captures"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$OUT_DIR/$STAMP.jpg"
LATEST="$ROOT/public/photos/starter.jpg"

# Clear any stale AVFoundation capture that might be holding the camera.
pkill -f "ffmpeg .*avfoundation.*$DEVICE_INDEX:none" 2>/dev/null || true

ffmpeg -hide_banner -loglevel warning -y \
  -f avfoundation -framerate 30 -video_size 1920x1080 -pixel_format uyvy422 \
  -i "$DEVICE_INDEX:none" \
  -frames:v 1 -q:v 3 -update 1 "$OUT" &
PID=$!

for _ in {1..25}; do
  if [ -s "$OUT" ] && ! kill -0 "$PID" 2>/dev/null; then
    break
  fi
  if [ -s "$OUT" ]; then
    kill "$PID" 2>/dev/null || true
    break
  fi
  sleep 1
done

if kill -0 "$PID" 2>/dev/null; then
  kill -9 "$PID" 2>/dev/null || true
fi

if [ ! -s "$OUT" ]; then
  echo "capture failed or timed out: $OUT" >&2
  exit 1
fi

cp "$OUT" "$LATEST"
file "$OUT"
echo "$OUT"

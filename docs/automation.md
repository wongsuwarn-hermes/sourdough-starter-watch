# Sourdough Starter Watch Automation

## Local commands

From this project directory:

```bash
# Fresh frame; works when run from the Terminal.app session with Camera permission.
npm run capture

# One full cycle: capture → record conservative reading → test → build → commit → push.
npm run cycle

# Start a visible Terminal loop. Default cadence is hourly; close the Terminal window to stop.
# Safe default: captures/builds locally but does not commit/push unless SOURDOUGH_PUBLISH=1 is set.
npm run start:auto

# Manual starter events.
npm run fed -- --baseline 2.2 --note "Fed 1:1:1; rubber band reset to true surface."
npm run baseline -- 2.2
npm run note -- "Moved jar away from glare."

# Calibrated visual reading when Simon/Hermes has a height estimate in cm.
npm run reading -- --height-cm 2.8 --baseline-cm 2.2 --confidence 0.7 --image public/photos/starter.jpg --note "Bulk surface is around 2.8cm; glare on right side."

npm run build
npm run serve
```

## What is automated now

The site supports three layers:

1. **Camera capture** — `scripts/capture-webcam.sh` captures a timestamped frame and updates `public/photos/starter.jpg`.
2. **Calibrated reading** — `scripts/record-reading.js` converts `heightCm` and `baselineCm` into rise %, phase, confidence and next-check cadence.
3. **Publishing** — `scripts/publish-cycle.sh` runs tests/build and stops by default before committing or pushing. Set `SOURDOUGH_PUBLISH=1` only when you intentionally want the cycle to publish. It also skips `git pull` by default so remote code is not silently pulled and executed with local Camera permission; set `SOURDOUGH_ALLOW_PULL=1` only when you intentionally want to pull first.

By default, the publish cycle is conservative: if no confirmed height estimate is supplied, it reuses the last known height and records a low-confidence note rather than pretending to know the rise. Set these environment variables before `npm run cycle` when a visual estimate is available:

```bash
SOURDOUGH_HEIGHT_CM=2.8 SOURDOUGH_BASELINE_CM=2.2 SOURDOUGH_CONFIDENCE=0.7 npm run cycle

# Publish intentionally after a successful local cycle.
SOURDOUGH_PUBLISH=1 npm run cycle
```

## Camera permission note

macOS currently grants Camera access to Terminal.app/user-session commands, while Hermes' non-GUI tool shell can still fail to receive frames. If direct capture fails but Terminal capture works, run the capture/publish loop through Terminal.app:

```bash
npm run start:auto
```

or trigger one Terminal capture:

```bash
npm run capture:terminal
```

If `npm run capture` times out:

1. Check for stale capture processes:
   ```bash
   ps aux | grep '[f]fmpeg.*avfoundation'
   ```
2. Kill stale captures:
   ```bash
   pkill -9 -f 'ffmpeg .*avfoundation'
   ```
3. Confirm camera permission for Terminal/Hermes host app:
   ```bash
   open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
   ```
4. Confirm the camera is visible:
   ```bash
   ffmpeg -hide_banner -f avfoundation -list_devices true -i "" 2>&1 | sed -n '1,80p'
   ```

Public site copy should not name exact private hardware models.

## Recommended hourly operation

For now, use Terminal/user-session automation because it matches the permission context that successfully captures photos:

```bash
SOURDOUGH_INTERVAL_SECONDS=3600 npm run start:auto
```

To publish automatically from that visible loop, opt in explicitly:

```bash
SOURDOUGH_PUBLISH=1 SOURDOUGH_INTERVAL_SECONDS=3600 npm run start:auto
```

This keeps a visible Terminal window open. It is intentionally easy to stop: close the window or press `Ctrl-C`.

## Hermes-assisted visual reads

For higher-quality readings, Hermes should inspect the latest frame and then run:

```bash
npm run reading -- --height-cm <estimated-current-surface-cm> --baseline-cm <rubber-band-baseline-cm> --confidence <0-1> --image public/photos/starter.jpg --note "Short visual rationale and uncertainty."
npm run build
```

Be conservative. Do not treat old side residue, glare, or the rubber band as the active starter surface. Prefer lower confidence and a plain-language caveat when the view is ambiguous.

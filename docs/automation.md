# Sourdough Starter Watch Automation

## Local commands

From this project directory:

```bash
npm run capture
npm run record -- --rise 68 --phase rising --confidence 0.74 --image public/photos/captures/example.jpg --note "The starter is rising with visible activity."
npm run fed -- --note "Fed 1:2:2; baseline reset."
npm run build
npm run serve
```

## Camera troubleshooting

If `npm run capture` times out:

1. Check for stale capture processes:
   ```bash
   ps aux | grep '[f]fmpeg.*avfoundation'
   ```
2. Kill stale captures:
   ```bash
   pkill -9 -f 'ffmpeg .*avfoundation'
   ```
3. Confirm camera permission for the terminal/Hermes host app:
   ```bash
   open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
   ```
4. Confirm the camera is visible:
   ```bash
   ffmpeg -hide_banner -f avfoundation -list_devices true -i "" 2>&1 | sed -n '1,80p'
   ```

Public site copy should not name exact private hardware models.

## Planned monitor loop

A Hermes scheduled job will:

1. Capture a new image.
2. Analyse the image conservatively.
3. Record rise %, phase, confidence and note.
4. Rebuild the static site.
5. Send Telegram only for important changes: likely peak, collapse/falling, camera blocked, or unusually inactive after feeding.
6. Later, push the generated site to GitHub/Cloudflare when authentication is configured.

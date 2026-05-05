import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function writeData(current) {
  const dir = mkdtempSync(join(tmpdir(), 'sourdough-watch-wakeup-'));
  const dataPath = join(dir, 'observations.json');
  writeFileSync(dataPath, JSON.stringify({ current }));
  return dataPath;
}

test('watch-wakeup CLI waits quietly when adaptive cadence is not due', () => {
  const dataPath = writeData({
    timestamp: '2026-05-05T10:00:00+01:00',
    phase: 'rising',
    risePercent: 50,
    confidence: 0.72
  });

  const output = execFileSync('node', [
    'scripts/watch-wakeup.js',
    '--data', dataPath,
    '--now', '2026-05-05T10:04:00+01:00'
  ], { cwd: process.cwd(), encoding: 'utf8' });
  const wakeup = JSON.parse(output);

  assert.equal(wakeup.action, 'wait');
  assert.equal(wakeup.photoDue, false);
  assert.equal(wakeup.notifyTelegram, false);
  assert.equal(wakeup.minutesUntilDue, 6);
});

test('watch-wakeup CLI requests capture and milestone notification when due near peak', () => {
  const dataPath = writeData({
    timestamp: '2026-05-05T10:00:00+01:00',
    phase: 'rising',
    risePercent: 93,
    confidence: 0.82
  });

  const output = execFileSync('node', [
    'scripts/watch-wakeup.js',
    '--data', dataPath,
    '--now', '2026-05-05T10:06:00+01:00'
  ], { cwd: process.cwd(), encoding: 'utf8' });
  const wakeup = JSON.parse(output);

  assert.equal(wakeup.action, 'capture');
  assert.equal(wakeup.photoDue, true);
  assert.equal(wakeup.cadenceMinutes, 5);
  assert.equal(wakeup.notifyTelegram, true);
  assert.equal(wakeup.milestone, 'near_peak');
});

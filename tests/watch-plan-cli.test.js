import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('watch-plan CLI prints adaptive scheduling JSON for cron wakeups', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sourdough-watch-plan-'));
  const dataPath = join(dir, 'observations.json');
  writeFileSync(dataPath, JSON.stringify({
    current: {
      timestamp: '2026-05-05T10:00:00+01:00',
      phase: 'rising',
      risePercent: 92,
      confidence: 0.8
    }
  }));

  const output = execFileSync('node', [
    'scripts/watch-plan.js',
    '--data', dataPath,
    '--now', '2026-05-05T10:06:00+01:00'
  ], { cwd: process.cwd(), encoding: 'utf8' });
  const plan = JSON.parse(output);

  assert.equal(plan.photoDue, true);
  assert.equal(plan.cadenceMinutes, 5);
  assert.equal(plan.notifyTelegram, true);
  assert.equal(plan.milestone, 'near_peak');
});

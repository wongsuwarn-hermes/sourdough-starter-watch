import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultReadingFromData,
  buildPublishCommitMessage,
  localIsoTimestamp,
  normalizeManualCommand
} from '../src/automation.js';

test('defaultReadingFromData uses baseline and last known height when no AI estimate is supplied', () => {
  const reading = defaultReadingFromData({
    starter: { baselineCm: 2.2 },
    current: { heightCm: 2.2, risePercent: 0 }
  });

  assert.deepEqual(reading, {
    baselineCm: 2.2,
    heightCm: 2.2,
    previousRisePercent: 0,
    confidence: 0.45,
    note: 'Fresh webcam frame captured; height reused until visual estimate is confirmed.'
  });
});

test('buildPublishCommitMessage is timestamped but stable enough for audit logs', () => {
  assert.equal(
    buildPublishCommitMessage('2026-05-05T10:30:00+01:00'),
    'chore: publish starter observation 2026-05-05 10:30'
  );
});

test('localIsoTimestamp preserves local clock time with timezone offset', () => {
  const date = new Date('2026-05-05T09:01:02.000Z');
  assert.equal(localIsoTimestamp(date, 60), '2026-05-05T10:01:02+01:00');
});

test('normalizeManualCommand supports fed, baseline, and note shortcuts', () => {
  assert.deepEqual(normalizeManualCommand(['fed', '--baseline', '2.4', '--note', 'Fed 1:1:1.']), {
    type: 'fed',
    baselineCm: 2.4,
    title: 'Fed.',
    note: 'Fed 1:1:1.'
  });

  assert.deepEqual(normalizeManualCommand(['baseline', '2.2']), {
    type: 'baseline',
    baselineCm: 2.2,
    title: 'Baseline set.',
    note: 'Baseline set to 2.2cm.'
  });

  assert.deepEqual(normalizeManualCommand(['note', 'Moved jar away from glare.']), {
    type: 'note',
    title: 'Manual note.',
    note: 'Moved jar away from glare.'
  });
});

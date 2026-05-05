import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultReadingFromData,
  buildPublishCommitMessage,
  localIsoTimestamp,
  normalizeManualCommand,
  decideStarterWatchPlan
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

test('decideStarterWatchPlan waits until the adaptive cadence says a photo is due', () => {
  const now = new Date('2026-05-05T10:08:00+01:00');
  const plan = decideStarterWatchPlan({
    current: {
      timestamp: '2026-05-05T10:00:00+01:00',
      phase: 'rising',
      risePercent: 55,
      confidence: 0.72,
      nextCheckMinutes: 10
    }
  }, { now });

  assert.equal(plan.photoDue, false);
  assert.equal(plan.notifyTelegram, false);
  assert.equal(plan.cadenceMinutes, 10);
  assert.equal(plan.minutesUntilDue, 2);
  assert.equal(plan.reason, 'waiting for adaptive cadence');
});

test('decideStarterWatchPlan does not send milestone Telegram before the next photo is due', () => {
  const now = new Date('2026-05-05T10:03:00+01:00');
  const plan = decideStarterWatchPlan({
    current: {
      timestamp: '2026-05-05T10:00:00+01:00',
      phase: 'rising',
      risePercent: 94,
      confidence: 0.82,
      nextCheckMinutes: 5
    }
  }, { now });

  assert.equal(plan.photoDue, false);
  assert.equal(plan.milestone, 'near_peak');
  assert.equal(plan.notifyTelegram, false);
});

test('decideStarterWatchPlan allows five minute peak checks and milestone Telegram alerts', () => {
  const now = new Date('2026-05-05T10:06:00+01:00');
  const plan = decideStarterWatchPlan({
    current: {
      timestamp: '2026-05-05T10:00:00+01:00',
      phase: 'rising',
      risePercent: 92,
      confidence: 0.8,
      nextCheckMinutes: 5
    }
  }, { now });

  assert.equal(plan.photoDue, true);
  assert.equal(plan.cadenceMinutes, 5);
  assert.equal(plan.notifyTelegram, true);
  assert.equal(plan.milestone, 'near_peak');
});

test('decideStarterWatchPlan slows dormant readings but escalates low-confidence retries', () => {
  const dormant = decideStarterWatchPlan({
    current: {
      timestamp: '2026-05-05T10:00:00+01:00',
      phase: 'dormant',
      risePercent: 2,
      confidence: 0.75,
      nextCheckMinutes: 60
    }
  }, { now: new Date('2026-05-05T10:30:00+01:00') });

  assert.equal(dormant.photoDue, false);
  assert.equal(dormant.cadenceMinutes, 60);
  assert.equal(dormant.minutesUntilDue, 30);

  const uncertain = decideStarterWatchPlan({
    current: {
      timestamp: '2026-05-05T10:00:00+01:00',
      phase: 'unknown',
      risePercent: 40,
      confidence: 0.3,
      nextCheckMinutes: 5
    }
  }, { now: new Date('2026-05-05T10:05:00+01:00') });

  assert.equal(uncertain.photoDue, true);
  assert.equal(uncertain.cadenceMinutes, 5);
  assert.equal(uncertain.notifyTelegram, true);
  assert.equal(uncertain.milestone, 'needs_human_check');
});

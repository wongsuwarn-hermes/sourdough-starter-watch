import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateRiseFromHeight,
  inferPhaseFromTrend,
  buildObservationFromReading
} from '../src/estimation.js';

test('estimateRiseFromHeight converts measured cm above baseline into rise percent', () => {
  assert.deepEqual(estimateRiseFromHeight({ baselineCm: 2.2, heightCm: 3.3 }), {
    baselineCm: 2.2,
    heightCm: 3.3,
    risePercent: 50
  });
});

test('estimateRiseFromHeight clamps implausible negative readings to zero rise', () => {
  assert.equal(estimateRiseFromHeight({ baselineCm: 2.2, heightCm: 1.8 }).risePercent, 0);
});

test('inferPhaseFromTrend distinguishes rising, peaking, falling, and dormant readings', () => {
  assert.equal(inferPhaseFromTrend({ risePercent: 42, previousRisePercent: 20, confidence: 0.8 }), 'rising');
  assert.equal(inferPhaseFromTrend({ risePercent: 105, previousRisePercent: 102, confidence: 0.8 }), 'peaking');
  assert.equal(inferPhaseFromTrend({ risePercent: 60, previousRisePercent: 80, confidence: 0.8 }), 'falling');
  assert.equal(inferPhaseFromTrend({ risePercent: 3, previousRisePercent: 2, confidence: 0.8 }), 'dormant');
});

test('buildObservationFromReading produces a calibrated observation with uncertainty note', () => {
  const observation = buildObservationFromReading({
    timestamp: '2026-05-05T10:15:00+01:00',
    image: 'photos/starter.jpg',
    baselineCm: 2.2,
    heightCm: 2.75,
    previousRisePercent: 0,
    confidence: 0.62,
    note: 'Jar markings are visible but glare remains.'
  });

  assert.equal(observation.risePercent, 25);
  assert.equal(observation.phase, 'rising');
  assert.equal(observation.heightCm, 2.75);
  assert.equal(observation.baselineCm, 2.2);
  assert.equal(observation.confidence, 0.62);
  assert.match(observation.note, /Jar markings are visible/);
});

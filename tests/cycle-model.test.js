import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCycleModel, acceptObservationForCurve } from '../src/cycle-model.js';

const todayData = {
  starter: { baselineCm: 2.2 },
  cycles: [
    {
      date: '2026-05-04',
      feedTime: '08:00',
      peakTime: '11:30',
      peakHeightCm: 3.5,
      status: 'calibrated'
    }
  ],
  events: [
    { time: '08:10', title: 'Fed.', type: 'fed', source: 'manual' }
  ],
  observations: [
    { timestamp: '2026-05-05T09:43:50+01:00', time: '09:43', heightCm: 2.2, risePercent: 0, confidence: 0.55, phase: 'dormant' },
    { timestamp: '2026-05-05T10:01:43+01:00', time: '10:01', heightCm: 3.0, risePercent: 36, confidence: 0.72, phase: 'rising' },
    { timestamp: '2026-05-05T10:12:43+01:00', time: '10:12', heightCm: 3.2, risePercent: 45, confidence: 0.68, phase: 'rising' },
    { timestamp: '2026-05-05T11:16:32+01:00', time: '11:16', heightCm: 3.4, risePercent: 55, confidence: 0.72, phase: 'rising' },
    { timestamp: '2026-05-05T18:20:53+01:00', time: '18:20', heightCm: 3.3, risePercent: 50, confidence: 0.72, phase: 'falling' },
    { timestamp: '2026-05-05T19:46:23+01:00', time: '19:46', heightCm: 3.8, risePercent: 73, confidence: 0.62, phase: 'rising', validationStatus: 'suspect-wall-residue' }
  ]
};

test('buildCycleModel uses calibrated prior cycles and reliable early readings to estimate the peak', () => {
  const model = buildCycleModel(todayData, { date: '2026-05-05' });

  assert.equal(model.feedTime, '08:10');
  assert.equal(model.likelyPeak.time, '11:16');
  assert.equal(model.likelyPeak.heightCm, 3.4);
  assert.equal(model.likelyPeak.risePercent, 55);
  assert.equal(model.stage, 'past_peak');
  assert.equal(model.prior.source, 'recent calibrated cycles');
  assert.equal(model.prior.hoursToPeakMean, 3.5);
  assert.deepEqual(model.peakWindow, { start: '10:55', end: '11:45' });
  assert.match(model.explanation, /highest reliable reading/i);
});

test('acceptObservationForCurve downweights late high readings that conflict with post-peak trend and wall residue', () => {
  const decision = acceptObservationForCurve({
    observation: { time: '19:46', heightCm: 3.8, confidence: 0.62, validationStatus: 'suspect-wall-residue' },
    likelyPeak: { time: '11:16', heightCm: 3.4 },
    previousAccepted: { time: '18:20', heightCm: 3.3, phase: 'falling' }
  });

  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'late-high-wall-residue');
  assert.match(decision.explanation, /contradicts the post-peak curve/i);
});

test('buildCycleModel keeps raw visual readings but separates accepted curve readings from suspect readings', () => {
  const model = buildCycleModel(todayData, { date: '2026-05-05' });

  assert.equal(model.readings.raw.length, 6);
  assert.ok(model.readings.accepted.some((reading) => reading.time === '11:16'));
  assert.ok(model.readings.suspect.some((reading) => reading.time === '19:46' && reading.reason === 'late-high-wall-residue'));
  assert.equal(model.readings.suspect.find((reading) => reading.time === '19:46').rawHeightCm, 3.8);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { addObservation, addEvent, deriveCurrentFromObservation } from '../src/observations.js';

const baseData = {
  starter: { name: 'STARTER-001', displayName: "Simon’s Sourdough Starter Watch" },
  current: {
    timestamp: '2026-05-05T07:09:00+01:00',
    risePercent: 68,
    phase: 'rising',
    confidence: 0.74,
    nextCheckMinutes: 10,
    image: 'photos/starter.jpg',
    mood: 'ambitious',
    note: 'The starter is rising with visible activity.'
  },
  events: [],
  observations: []
};

test('addObservation appends a normalized observation and updates current state', () => {
  const updated = addObservation(baseData, {
    timestamp: '2026-05-05T12:30:00+01:00',
    risePercent: '82.4',
    phase: 'rising',
    confidence: '0.81',
    image: 'photos/captures/20260505_123000.jpg',
    note: 'Bubble activity increasing.'
  });

  assert.equal(updated.observations.length, 1);
  assert.deepEqual(updated.observations[0], {
    timestamp: '2026-05-05T12:30:00+01:00',
    time: '12:30',
    risePercent: 82,
    phase: 'rising',
    confidence: 0.81,
    image: 'photos/captures/20260505_123000.jpg',
    note: 'Bubble activity increasing.'
  });
  assert.equal(updated.current.risePercent, 82);
  assert.equal(updated.current.confidence, 0.81);
  assert.equal(updated.current.nextCheckMinutes, 10);
});

test('addObservation chooses slower cadence for dormant or low-confidence observations', () => {
  const lowConfidence = addObservation(baseData, {
    timestamp: '2026-05-05T23:00:00+01:00',
    risePercent: 4,
    phase: 'dormant',
    confidence: 0.31,
    image: 'photos/latest.jpg',
    note: 'Little visible change.'
  });

  assert.equal(lowConfidence.current.nextCheckMinutes, 60);
});

test('addEvent prepends a manual feeding event and can reset the current baseline', () => {
  const updated = addEvent(baseData, {
    time: '2026-05-05T08:10:00+01:00',
    title: 'Fed.',
    note: 'Simon reset the baseline.',
    type: 'fed',
    baselineCm: 2.4
  });

  assert.equal(updated.events[0].time, '08:10');
  assert.equal(updated.events[0].title, 'Fed.');
  assert.equal(updated.starter.baselineCm, 2.4);
  assert.equal(updated.current.heightCm, 2.4);
  assert.equal(updated.current.risePercent, 0);
  assert.equal(updated.current.phase, 'fed');
  assert.equal(updated.current.mood, 'freshly fed');
});

test('addEvent records baseline and note commands without resetting current observation unless fed', () => {
  const baseline = addEvent(baseData, {
    time: '2026-05-05T08:12:00+01:00',
    title: 'Baseline set.',
    note: 'Rubber band aligned with true starter surface.',
    type: 'baseline',
    baselineCm: 2.2
  });

  assert.equal(baseline.starter.baselineCm, 2.2);
  assert.equal(baseline.current.risePercent, 68);
  assert.equal(baseline.events[0].type, 'baseline');

  const note = addEvent(baseData, {
    time: '2026-05-05T08:20:00+01:00',
    title: 'Lighting note.',
    note: 'Moved jar away from glare.',
    type: 'note'
  });

  assert.equal(note.current.risePercent, 68);
  assert.equal(note.events[0].type, 'note');
});

test('deriveCurrentFromObservation produces story mood from phase', () => {
  assert.equal(deriveCurrentFromObservation({ phase: 'peaking', risePercent: 110, confidence: 0.9 }).mood, 'dramatic');
  assert.equal(deriveCurrentFromObservation({ phase: 'falling', risePercent: 50, confidence: 0.8 }).mood, 'settling');
  assert.equal(deriveCurrentFromObservation({ phase: 'rising', risePercent: 35, confidence: 0.8 }).mood, 'ambitious');
});

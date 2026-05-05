import test from 'node:test';
import assert from 'node:assert/strict';
import { buildViewModel, renderSite } from '../src/site-generator.js';

const sampleData = {
  starter: { name: 'Starter-001', displayName: "Simon’s Sourdough Starter Watch" },
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
  events: [
    { time: '08:10', title: 'Fed.', note: 'Simon reset the baseline.' },
    { time: '09:20', title: 'First bubbles.', note: 'Suspicious optimism detected.' }
  ],
  observations: [
    { time: '08:00', risePercent: 0 },
    { time: '10:00', risePercent: 30 },
    { time: '12:00', risePercent: 68 }
  ]
};

test('buildViewModel formats current starter status for display', () => {
  const vm = buildViewModel(sampleData);

  assert.equal(vm.title, "Simon’s Sourdough Starter Watch");
  assert.equal(vm.heroTitle, 'One Jar.\nOne AI Agent.\nMany Bubbles.');
  assert.equal(vm.current.riseLabel, '+68%');
  assert.equal(vm.current.phaseLabel, 'R+');
  assert.equal(vm.current.confidenceLabel, '74%');
  assert.equal(vm.current.nextLabel, '10m');
  assert.equal(vm.current.image, 'photos/starter.jpg');
});

test('renderSite includes the story-mode title, Hermes log, and privacy-safe hardware copy', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /One Jar\.<br>One AI Agent\.<br>Many Bubbles\./);
  assert.match(html, /Observed by Hermes/);
  assert.match(html, /HERMES OBSERVATION LOG/);
  assert.match(html, /small local computer/);
  assert.doesNotMatch(html, /Mac Studio/i);
  assert.doesNotMatch(html, /OBSBOT/i);
});

test('renderSite uses an intuitive cartoon bread loaf logo instead of the old camera-eye mark', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /aria-label="cartoon bread loaf logo"/);
  assert.match(html, /<span class="crust-mark crust-mark-a"/);
  assert.doesNotMatch(html, /<circle cx="24" cy="27"/);
  assert.doesNotMatch(html, /c3\.6-5\.2 8\.3-7\.8 14-7\.8/);
});

test('renderSite wraps the live webcam image in a mobile-friendly snapshot viewport', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /class="panel photo snapshotCard"/);
  assert.match(html, /class="snapshotViewport"/);
  assert.match(html, /class="starterSnapshot"/);
});

test('renderSite escapes user-provided event text', () => {
  const unsafe = structuredClone(sampleData);
  unsafe.events = [{ time: '13:37', title: '<script>alert(1)</script>', note: 'bubbles & <b>rise</b>' }];

  const html = renderSite(buildViewModel(unsafe));

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /bubbles &amp; &lt;b&gt;rise&lt;\/b&gt;/);
});

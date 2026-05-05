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
  assert.equal(vm.heroTitle, 'One Jar.\nOne Webcam.\nMany Bubbles.');
  assert.equal(vm.current.riseLabel, '+68%');
  assert.equal(vm.current.phaseLabel, 'Rising');
  assert.equal(vm.current.confidenceLabel, '74%');
  assert.equal(vm.current.nextLabel, '10m');
  assert.equal(vm.current.image, 'photos/starter.jpg');
});

test('renderSite includes the story-mode title, Hermes log, and privacy-safe hardware copy', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /One Jar\.<br>One Webcam\.<br>Many Bubbles\./);
  assert.match(html, /Observed by <a class="hermesLink" href="https:\/\/hermes-agent\.nousresearch\.com\/"/);
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

test('renderSite wraps the live webcam image in a polished snapshot viewport', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /class="panel photo snapshotCard"/);
  assert.match(html, /class="snapshotViewport"/);
  assert.match(html, /class="snapshotBackdrop"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /class="starterSnapshot"/);
});

test('renderSite gives the current mood an explicit status label', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /<span class="storylineLabel">Current status<\/span>/);
  assert.match(html, /<b>Today’s mood: ambitious\.<\/b>/);
});

test('renderSite links Hermes only in the website header', () => {
  const data = structuredClone(sampleData);
  data.current.note = 'Hermes noticed stronger bubbles.';
  const html = renderSite(buildViewModel(data));

  const matches = html.match(/href="https:\/\/hermes-agent\.nousresearch\.com\/"/g) ?? [];
  assert.equal(matches.length, 1);
  assert.match(html, /Observed by <a class="hermesLink" href="https:\/\/hermes-agent\.nousresearch\.com\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<b>Today’s mood: ambitious\.<\/b> Hermes noticed stronger bubbles\. Hermes has armed peak watch/);
});

test('renderSite uses visitor-friendly starter stage copy instead of code-like phase labels', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /<span>Stage<\/span><b>Rising<\/b>/);
  assert.doesNotMatch(html, /<span>Phase<\/span><b>R\+<\/b>/);
});

test('renderSite uses visitor-friendly confidence and timing labels', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /<span>Estimate<\/span><b>74%<\/b><small>how sure we are<\/small>/);
  assert.match(html, /<span>Next photo<\/span><b>10m<\/b><small>planned check-in<\/small>/);
  assert.doesNotMatch(html, /<span>AI conf\.<\/span>/);
  assert.doesNotMatch(html, /<span>Next<\/span>/);
});

test('renderSite draws the rise curve from actual observations and feeding events', () => {
  const data = structuredClone(sampleData);
  data.observations = [
    { time: '07:30', risePercent: 0 },
    { time: '08:45', risePercent: 25 },
    { time: '10:15', risePercent: 80 }
  ];
  data.events = [
    { time: '07:30', title: 'Fed.', note: 'Baseline reset.' }
  ];
  const html = renderSite(buildViewModel(data));

  assert.match(html, /data-chart="actual-observations"/);
  assert.match(html, /data-rise="80"/);
  assert.match(html, /aria-label="10:15: \+80% rise"/);
  assert.match(html, /07:30/);
  assert.match(html, /10:15/);
  assert.doesNotMatch(html, /class="chartDot cue-/);
  assert.doesNotMatch(html, /data-event-cue="1" data-rise/);
  assert.doesNotMatch(html, /class="eventMarker"/);
  assert.doesNotMatch(html, /curve flattening\?/);
});

test('renderSite groups diary events as annotations inside the rise curve panel', () => {
  const data = structuredClone(sampleData);
  data.events = [
    { time: '10:01', title: 'Baseline set.', note: 'Baseline set to 2.2cm.' },
    { time: '08:10', title: 'Fed.', note: 'Simon reset the baseline.' },
    { time: '09:20', title: 'First bubbles.', note: 'Suspicious optimism detected.' }
  ];
  const html = renderSite(buildViewModel(data));

  assert.match(html, /class="panel curvePanel"/);
  assert.match(html, /class="curveAnnotations"/);
  assert.match(html, /<h3>Key moments<\/h3>/);
  assert.doesNotMatch(html, /<h3>Diary annotations<\/h3>/);
  assert.doesNotMatch(html, /data-event-cue="1"/);
  assert.doesNotMatch(html, /class="chartDot cue-/);
  assert.match(html, /data-event-time="08:10"/);
  assert.match(html, /data-event-time="09:20"/);
  assert.match(html, /data-event-time="10:01"/);
  assert.doesNotMatch(html, /class="eventAccent/);
  assert.doesNotMatch(html, /class="cue-/);
  assert.match(html, /<span>notes from today’s rise<\/span>/);
  assert.doesNotMatch(html, /class="eventCue/);
  assert.doesNotMatch(html, /aria-hidden="true">1<\/span>/);
  assert.doesNotMatch(html, /<section class="diary">/);

  const fedIndex = html.indexOf('data-event-time="08:10"');
  const bubblesIndex = html.indexOf('data-event-time="09:20"');
  const baselineIndex = html.indexOf('data-event-time="10:01"');
  assert.ok(fedIndex < bubblesIndex);
  assert.ok(bubblesIndex < baselineIndex);
});

test('renderSite gives the latest photo a more explanatory observation card', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /class="photoInsight"/);
  assert.match(html, /What to look for/);
  assert.match(html, /Latest reading/);
  assert.match(html, /\+68% rise/);
  assert.match(html, /bubbles, the height line, and whether the top is domed or sinking/);
});

test('renderSite avoids mobile chart distortion with a larger mobile-specific SVG', () => {
  const html = renderSite(buildViewModel(sampleData));

  assert.match(html, /class="chartFrame"/);
  assert.match(html, /class="chart chartDesktop"/);
  assert.match(html, /class="chart chartMobile"/);
  assert.match(html, /viewBox="0 0 390 330"/);
  assert.match(html, /preserveAspectRatio="xMidYMid meet"/);
  assert.doesNotMatch(html, /preserveAspectRatio="none"/);
});

test('renderSite escapes user-provided event text', () => {
  const unsafe = structuredClone(sampleData);
  unsafe.events = [{ time: '13:37', title: '<script>alert(1)</script>', note: 'bubbles & <b>rise</b>' }];

  const html = renderSite(buildViewModel(unsafe));

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /bubbles &amp; &lt;b&gt;rise&lt;\/b&gt;/);
});

const HERO_TITLE = 'One Jar.\nOne Webcam.\nMany Bubbles.';
const HERMES_URL = 'https://hermes-agent.nousresearch.com/';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function phaseLabel(phase) {
  const normalized = String(phase ?? '').toLowerCase();
  if (normalized === 'rising') return 'Rising';
  if (normalized === 'falling') return 'Falling';
  if (normalized === 'peak' || normalized === 'peaking') return 'At peak';
  if (normalized === 'fed' || normalized === 'baseline') return 'Just fed';
  if (normalized === 'dormant') return 'Resting';
  return 'Unknown';
}

export function buildViewModel(data) {
  const current = data.current ?? {};
  const risePercent = Math.round(Number(current.risePercent ?? 0));
  const confidence = Math.round(Number(current.confidence ?? 0) * 100);
  const nextCheck = Number(current.nextCheckMinutes ?? 0);

  return {
    title: data.starter?.displayName ?? 'Simon’s Sourdough Starter Watch',
    starterName: data.starter?.name ?? 'STARTER-001',
    heroTitle: HERO_TITLE,
    current: {
      timestamp: current.timestamp ?? '',
      risePercent,
      riseLabel: `${risePercent >= 0 ? '+' : ''}${risePercent}%`,
      phase: current.phase ?? 'unknown',
      phaseLabel: phaseLabel(current.phase),
      confidence,
      confidenceLabel: `${confidence}%`,
      nextLabel: nextCheck > 0 ? `${nextCheck}m` : '—',
      image: current.image ?? 'photos/starter.jpg',
      mood: current.mood ?? 'curious',
      note: current.note ?? 'Hermes is watching for meaningful changes.'
    },
    events: Array.isArray(data.events) ? data.events : [],
    observations: Array.isArray(data.observations) ? data.observations : []
  };
}

function hermesLink(label = 'Hermes') {
  return `<a class="hermesLink" href="${HERMES_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function linkHermesText(value) {
  return escapeHtml(value).replaceAll('Hermes', hermesLink());
}

function renderMetric(label, value, helper = '') {
  const helperHtml = helper ? `<small>${escapeHtml(helper)}</small>` : '';
  return `<div class="metric"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b>${helperHtml}</div>`;
}

function sortedEvents(events) {
  return [...events].sort((a, b) => {
    const aMinutes = timeToMinutes(a.time);
    const bMinutes = timeToMinutes(b.time);
    if (!Number.isFinite(aMinutes) && !Number.isFinite(bMinutes)) return 0;
    if (!Number.isFinite(aMinutes)) return 1;
    if (!Number.isFinite(bMinutes)) return -1;
    return aMinutes - bMinutes;
  });
}

function renderCurveAnnotations(events) {
  const annotations = sortedEvents(events);
  if (annotations.length === 0) return '';

  return `<div class="curveAnnotations"><div class="annotationHead"><h3>Key moments</h3><span>notes from today’s rise</span></div><div class="annotationList">${annotations.map((event) => {
    return `
    <article class="annotation" data-event-time="${escapeHtml(event.time)}">
      <time>${escapeHtml(event.time)}</time>
      <div><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.note)}</p></div>
    </article>`;
  }).join('')}</div></div>`;
}

function timeToMinutes(time) {
  const match = String(time ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeChartData(observations) {
  return observations
    .map((observation) => ({
      time: String(observation.time ?? '').slice(0, 5),
      minutes: timeToMinutes(observation.time),
      rise: Math.max(0, Math.round(Number(observation.risePercent ?? 0)))
    }))
    .filter((point) => point.time && Number.isFinite(point.minutes) && Number.isFinite(point.rise))
    .sort((a, b) => a.minutes - b.minutes);
}

function chartPoints(observations, layout) {
  const usable = normalizeChartData(observations);

  if (usable.length === 0) return [];

  const minMinute = Math.min(...usable.map((point) => point.minutes));
  const maxMinute = Math.max(...usable.map((point) => point.minutes));
  const maxRise = Math.max(100, ...usable.map((point) => point.rise));
  const span = Math.max(1, maxMinute - minMinute);
  const plotWidth = layout.right - layout.left;
  const plotHeight = layout.bottom - layout.top;

  return usable.map((point) => ({
    ...point,
    x: layout.left + ((point.minutes - minMinute) / span) * plotWidth,
    y: layout.bottom - (Math.min(point.rise, maxRise) / maxRise) * plotHeight
  }));
}

function axisMarkup(layout) {
  const horizontal = [0, .25, .5, .75, 1]
    .map((step) => `M${layout.left} ${(layout.top + (layout.bottom - layout.top) * step).toFixed(1)}H${layout.right}`)
    .join('');
  const vertical = [0, .25, .5, .75, 1]
    .map((step) => `M${(layout.left + (layout.right - layout.left) * step).toFixed(1)} ${layout.top}V${layout.bottom}`)
    .join('');
  return `<g class="axis"><path d="${horizontal}"/><path d="${vertical}"/></g>`;
}

function renderChartSvg({ observations, events, width, height, className, layout, empty = false }) {
  const points = chartPoints(observations, layout);
  if (empty || points.length === 0) {
    return `<svg class="chart ${className}" data-chart="actual-observations" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-label="starter rise over time"><text x="${layout.left}" y="${height / 2}" class="emptyChart">Waiting for the first reading</text></svg>`;
  }

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points.at(-1).x.toFixed(1)} ${layout.bottom} L${points[0].x.toFixed(1)} ${layout.bottom} Z`;
  const labels = [points[0], points[Math.floor(points.length / 2)], points.at(-1)]
    .filter((point, index, array) => array.findIndex((candidate) => candidate.time === point.time) === index);
  const labelY = height - 12;
  const yLabelX = Math.max(4, layout.left - 46);

  return `<svg class="chart ${className}" data-chart="actual-observations" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-label="starter rise over time"><defs><linearGradient id="riseFill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f54e00" stop-opacity=".26"/><stop offset="100%" stop-color="#f54e00" stop-opacity="0"/></linearGradient></defs>${axisMarkup(layout)}<g class="ylabel"><text x="${yLabelX}" y="${layout.top + 6}">100%</text><text x="${yLabelX}" y="${layout.top + (layout.bottom - layout.top) * .25 + 6}">75%</text><text x="${yLabelX}" y="${layout.top + (layout.bottom - layout.top) * .5 + 6}">50%</text><text x="${yLabelX}" y="${layout.top + (layout.bottom - layout.top) * .75 + 6}">25%</text><text x="${yLabelX + 8}" y="${layout.bottom + 4}">0%</text></g><path class="area" d="${areaPath}"/><path class="line" d="${linePath}"/><g class="dots">${points.map((point, index) => `<circle class="chartDot" data-rise="${point.rise}" aria-label="${escapeHtml(point.time)}: ${point.rise >= 0 ? '+' : ''}${point.rise}% rise" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === points.length - 1 ? 7 : 5}"/>`).join('')}</g><g class="xlabel">${labels.map((point, index) => {
    const anchor = index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle';
    return `<text text-anchor="${anchor}" x="${point.x.toFixed(1)}" y="${labelY}">${escapeHtml(point.time)}</text>`;
  }).join('')}</g></svg>`;
}

function renderChart(observations = [], events = []) {
  const points = normalizeChartData(observations);
  const desktop = renderChartSvg({ observations, events, width: 760, height: 270, className: 'chartDesktop', layout: { left: 54, right: 730, top: 28, bottom: 244 }, empty: points.length === 0 });
  const mobile = renderChartSvg({ observations, events, width: 390, height: 330, className: 'chartMobile', layout: { left: 48, right: 366, top: 34, bottom: 286 }, empty: points.length === 0 });
  return `<div class="chartFrame">${desktop}${mobile}</div>`;
}
function logoSvg() {
  return `<div class="loafLogo" role="img" aria-label="cartoon bread loaf logo"><span class="loafBody"></span><span class="crust-mark crust-mark-a"></span><span class="crust-mark crust-mark-b"></span><span class="crust-mark crust-mark-c"></span><span class="loafSmile"></span></div>`;
}

export function renderSite(vm) {
  const titleLines = vm.heroTitle.split('\n').map(escapeHtml).join('<br>');
  const current = vm.current;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(vm.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,650;9..144,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css"></head><body><div class="wrap"><header class="topbar"><div class="brand"><div class="logo" aria-hidden="true">${logoSvg()}</div><div>${escapeHtml(vm.title)}</div></div><div class="navpills"><span class="pill dark">FERMENTATION LAB · STORY MODE</span><span class="pill orange">Observed by ${hermesLink()}</span></div></header>
<main><section class="hero"><div class="panel heroCopy"><span class="tag">${escapeHtml(vm.starterName)} · PUBLIC OBSERVATORY</span><h1>${titleLines}</h1><p class="sub">A living fermentation experiment watched by a webcam and narrated by Hermes. The agent checks the starter, estimates its rise, writes the log, and pings Telegram when the jar does something worth noticing.</p><div class="storyline"><span class="storylineLabel">Current status</span><b>Today’s mood: ${escapeHtml(current.mood)}.</b> ${escapeHtml(current.note)} Hermes has armed peak watch, which is less dramatic than it sounds — but only slightly.</div><div class="metrics">${renderMetric('Rise', current.riseLabel)}${renderMetric('Stage', current.phaseLabel, 'starter activity')}${renderMetric('Estimate', current.confidenceLabel, 'how sure we are')}${renderMetric('Next photo', current.nextLabel, 'planned check-in')}</div></div><div class="panel photo snapshotCard"><div class="snapshotViewport"><img class="snapshotBackdrop" src="${escapeHtml(current.image)}" alt="" aria-hidden="true"><img class="starterSnapshot" src="${escapeHtml(current.image)}" alt="latest webcam view of sourdough starter"></div><div class="photoOverlay"><div><strong>Latest webcam frame</strong><small>Actual camera view used for estimation</small></div><div><small>${escapeHtml(formatTime(current.timestamp))} · webcam</small></div></div><div class="photoInsight"><div><strong>Latest reading</strong><b>${escapeHtml(current.riseLabel)} rise</b></div><div><strong>What to look for</strong><span>bubbles, the height line, and whether the top is domed or sinking</span></div></div></div></section>
<section class="grid"><div class="panel curvePanel"><div class="sectionHead"><h2>Today’s rise curve</h2><span class="pill">actual readings vs. baseline</span></div>${renderChart(vm.observations, vm.events)}${renderCurveAnnotations(vm.events)}</div><div class="panel"><div style="padding:18px 18px 0"><span class="tag">HERMES OBSERVATION LOG</span></div><div class="agent"><h2>The agent is part of the story.</h2><p>Friends should be able to see not just the starter, but the little machine of observation around it.</p><div class="console"><span class="ok">${escapeHtml(formatTime(current.timestamp))}</span> image captured<br><span class="ai">${escapeHtml(formatTime(current.timestamp))}</span> Hermes estimates rise: ${escapeHtml(current.riseLabel)}<br><span class="ai">${escapeHtml(formatTime(current.timestamp))}</span> stage inferred: ${escapeHtml(current.phaseLabel)}<br><span class="warn">alert</span> peak_watch = armed<br><span class="ok">next</span> capture scheduled: ${escapeHtml(current.nextLabel)}<br><span class="ai">telegram</span> alert only if curve flattens</div></div></div></section>
<section class="how"><div class="panel howcopy"><span class="tag">HOW THE WATCH WORKS</span><div class="quote">Domestic science, narrated by an AI agent.</div><p class="note">Every few minutes, a small local computer captures a webcam image. Hermes estimates the starter’s current height, compares it with previous readings, records uncertainty, updates the website, and sends Telegram alerts for meaningful events. The AI can be wrong — glass, residue and lighting are tricky — so Simon can correct key moments like feeding or baseline resets.</p></div><div class="panel diagram"><div class="node"><b>Webcam</b><span>Fixed view of the jar, ideally square-on with a visible baseline.</span></div><div class="arrow">↓ photo capture</div><div class="node"><b>Local computer</b><span>Runs the scheduler, stores photos, and generates public site data.</span></div><div class="arrow">↓ image + context</div><div class="node"><b>Hermes AI</b><span>Estimates rise, labels stage, writes notes, decides whether to alert.</span></div><div class="arrow">↓ publish + notify</div><div class="node"><b>Website</b><span>Public story dashboard for friends; richer lab/debug view for Simon later.</span></div></div></section></main><div class="footer">Prototype: Fermentation Lab visual base × Living Storybook personality × AI-agent transparency</div></div></body></html>`;
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const match = String(timestamp).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(timestamp);
}

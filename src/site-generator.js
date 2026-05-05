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
  const observations = Array.isArray(data.observations) ? data.observations : [];

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
      note: current.note ?? 'Hermes is watching for meaningful changes.',
      baselineCm: current.baselineCm ?? data.starter?.baselineCm,
      heightCm: current.heightCm
    },
    events: Array.isArray(data.events) ? data.events : [],
    observations,
    validationReadings: buildValidationReadings(observations)
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

function formatCm(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(1).replace(/\.0$/, '');
}

function renderMeasurementOverlay(current) {
  const baseline = formatCm(current.baselineCm);
  const height = formatCm(current.heightCm);
  if (!baseline || !height) return '';

  return `<div class="measurementOverlay" aria-label="visual guide to the latest starter measurement">
    <span class="measureLine currentLine"><b>Current ~${escapeHtml(height)} cm</b></span>
    <span class="measureLine baselineLine"><b>Baseline ${escapeHtml(baseline)} cm</b></span>
  </div>`;
}

function renderMeasurementSummary(current) {
  const baseline = formatCm(current.baselineCm);
  const height = formatCm(current.heightCm);
  if (!baseline || !height) return '';
  return `<div class="measurementSummary"><strong>Measured from the photo</strong><span>Baseline ${escapeHtml(baseline)} cm → current ~${escapeHtml(height)} cm → ${escapeHtml(current.riseLabel)} rise</span></div>`;
}

function buildValidationReadings(observations) {
  return observations
    .map((observation) => {
      const time = formatTime(observation.timestamp ?? observation.time);
      const rise = Math.round(Number(observation.risePercent ?? 0));
      const confidence = Math.round(Number(observation.confidence ?? 0) * 100);
      return {
        time,
        image: observation.image ?? 'photos/starter.jpg',
        riseLabel: `${rise >= 0 ? '+' : ''}${rise}%`,
        phaseLabel: phaseLabel(observation.phase),
        confidenceLabel: `${confidence}% confidence`,
        note: observation.note ?? '',
        heightCm: formatCm(observation.heightCm),
        baselineCm: formatCm(observation.baselineCm)
      };
    })
    .filter((reading) => reading.time && reading.image)
    .sort((a, b) => timeToMinutes(b.time) - timeToMinutes(a.time));
}

function renderValidationReadings(readings = []) {
  if (readings.length === 0) return '';
  return `<section class="grid readingsGrid"><div class="panel validationPanel"><div class="sectionHead validationHead"><div><h2>Reading validation</h2><p>For early calibration: compare each webcam frame with Hermes’s label, rise estimate, phase, and confidence.</p></div><span class="pill">photo audit trail</span></div><div class="validationGrid">${readings.map((reading, index) => {
    const measurement = reading.heightCm && reading.baselineCm ? `<span>${escapeHtml(reading.baselineCm)} → ${escapeHtml(reading.heightCm)} cm</span>` : '';
    return `<article class="validationCard" data-observation-time="${escapeHtml(reading.time)}"><button class="validationOpen" type="button" data-viewer-index="${index}" aria-label="Open ${escapeHtml(reading.time)} photo in viewer"><img src="${escapeHtml(reading.image)}" alt="webcam frame for ${escapeHtml(reading.time)} starter reading" loading="eager"><span>Open photo</span></button><div class="validationMeta"><time>${escapeHtml(reading.time)}</time><strong>${escapeHtml(reading.riseLabel)}</strong><span>${escapeHtml(reading.phaseLabel)}</span><span>${escapeHtml(reading.confidenceLabel)}</span>${measurement}</div>${reading.note ? `<p>${escapeHtml(reading.note)}</p>` : ''}</article>`;
  }).join('')}</div></div></section>`;
}

function viewerCaption(reading) {
  const measurement = reading.heightCm && reading.baselineCm ? ` · ${reading.baselineCm} → ${reading.heightCm} cm` : '';
  return `${reading.time} · ${reading.riseLabel} · ${reading.phaseLabel} · ${reading.confidenceLabel}${measurement}`;
}

function renderPhotoViewer(readings = []) {
  if (readings.length === 0) return '';
  const viewerImages = readings.map((reading) => ({
    src: reading.image,
    alt: `large webcam frame for ${reading.time} starter reading`,
    caption: viewerCaption(reading),
    note: reading.note
  }));
  return `<div class="photoViewer" hidden role="dialog" aria-modal="true" aria-label="Reading photo viewer" data-viewer-images='${escapeHtml(JSON.stringify(viewerImages))}'><div class="viewerShell"><button class="viewerClose" type="button" aria-label="Close photo viewer">×</button><button class="viewerNav viewerPrev" type="button" aria-label="Previous photo">‹</button><figure><img class="viewerImage" src="" alt=""><figcaption><strong class="viewerCaption"></strong><span class="viewerNote"></span><small class="viewerCounter"></small></figcaption></figure><button class="viewerNav viewerNext" type="button" aria-label="Next photo">›</button></div></div>`;
}

function renderPhotoViewerScript() {
  return `<script>
function initPhotoViewer() {
  const viewer = document.querySelector('.photoViewer');
  if (!viewer) return;
  const images = JSON.parse(viewer.dataset.viewerImages || '[]');
  const image = viewer.querySelector('.viewerImage');
  const caption = viewer.querySelector('.viewerCaption');
  const note = viewer.querySelector('.viewerNote');
  const counter = viewer.querySelector('.viewerCounter');
  const close = viewer.querySelector('.viewerClose');
  const previous = viewer.querySelector('.viewerPrev');
  const next = viewer.querySelector('.viewerNext');
  let index = 0;

  function show(nextIndex) {
    if (!images.length) return;
    index = (nextIndex + images.length) % images.length;
    const current = images[index];
    image.src = current.src;
    image.alt = current.alt;
    caption.textContent = current.caption;
    note.textContent = current.note || '';
    counter.textContent = (index + 1) + ' of ' + images.length;
  }

  function open(nextIndex) {
    show(nextIndex);
    viewer.hidden = false;
    document.body.classList.add('viewerOpen');
    close.focus();
  }

  function hide() {
    viewer.hidden = true;
    document.body.classList.remove('viewerOpen');
  }

  document.querySelectorAll('.validationOpen').forEach((button) => {
    button.addEventListener('click', () => open(Number(button.dataset.viewerIndex || 0)));
  });
  close.addEventListener('click', hide);
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  viewer.addEventListener('click', (event) => {
    if (event.target === viewer) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (viewer.hidden) return;
    if (event.key === 'Escape') hide();
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
}
initPhotoViewer();
</script>`;
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

  return `<svg class="chart ${className}" data-chart="actual-observations" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-label="starter rise over time"><defs><linearGradient id="riseFill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f54e00" stop-opacity=".20"/><stop offset="100%" stop-color="#f54e00" stop-opacity="0"/></linearGradient></defs>${axisMarkup(layout)}<g class="ylabel"><text x="${yLabelX}" y="${layout.top + 6}">100%</text><text x="${yLabelX}" y="${layout.top + (layout.bottom - layout.top) * .25 + 6}">75%</text><text x="${yLabelX}" y="${layout.top + (layout.bottom - layout.top) * .5 + 6}">50%</text><text x="${yLabelX}" y="${layout.top + (layout.bottom - layout.top) * .75 + 6}">25%</text><text x="${yLabelX + 8}" y="${layout.bottom + 4}">0%</text></g><path class="area" d="${areaPath}"/><path class="line" d="${linePath}"/><g class="dots">${points.map((point, index) => `<circle class="chartDot" data-rise="${point.rise}" aria-label="${escapeHtml(point.time)}: ${point.rise >= 0 ? '+' : ''}${point.rise}% rise" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === points.length - 1 ? 7 : 5}"/>`).join('')}</g><g class="xlabel">${labels.map((point, index) => {
    const anchor = index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle';
    return `<text text-anchor="${anchor}" x="${point.x.toFixed(1)}" y="${labelY}">${escapeHtml(point.time)}</text>`;
  }).join('')}</g></svg>`;
}

function renderLatestReadingCallout(points) {
  const latest = points.at(-1);
  if (!latest) return '';
  const riseLabel = `${latest.rise >= 0 ? '+' : ''}${latest.rise}%`;
  return `<div class="latestReadingCallout"><strong>Now: ${escapeHtml(riseLabel)} at ${escapeHtml(latest.time)}</strong><span>latest measured point from the webcam sequence</span></div>`;
}

function renderChart(observations = [], events = []) {
  const points = normalizeChartData(observations);
  const desktop = renderChartSvg({ observations, events, width: 760, height: 270, className: 'chartDesktop', layout: { left: 54, right: 704, top: 28, bottom: 244 }, empty: points.length === 0 });
  const mobile = renderChartSvg({ observations, events, width: 390, height: 330, className: 'chartMobile', layout: { left: 48, right: 350, top: 34, bottom: 286 }, empty: points.length === 0 });
  return `<div class="chartFrame">${desktop}${mobile}</div>${renderLatestReadingCallout(points)}`;
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
<main><section class="hero"><div class="panel heroCopy"><span class="tag">${escapeHtml(vm.starterName)} · PUBLIC OBSERVATORY</span><h1>${titleLines}</h1><p class="sub">A living fermentation experiment watched by a webcam and narrated by Hermes. The agent checks the starter, estimates its rise, writes notes, and pings Telegram when the jar does something worth noticing.</p><div class="storyline"><span class="storylineLabel">Current status</span><b>Today’s mood: ${escapeHtml(current.mood)}.</b> ${escapeHtml(current.note)} Hermes has armed peak watch, which is less dramatic than it sounds — but only slightly.</div><div class="metrics">${renderMetric('Rise', current.riseLabel)}${renderMetric('Stage', current.phaseLabel, 'starter activity')}${renderMetric('Read confidence', current.confidenceLabel, 'visual read certainty')}${renderMetric('Watch cadence', current.nextLabel, 'checks adjust automatically')}</div></div><div class="panel photo snapshotCard"><div class="snapshotViewport"><img class="snapshotBackdrop" src="${escapeHtml(current.image)}" alt="" aria-hidden="true"><img class="starterSnapshot" src="${escapeHtml(current.image)}" alt="latest webcam view of sourdough starter">${renderMeasurementOverlay(current)}</div><div class="photoOverlay"><div><strong>Latest webcam frame</strong><small>Actual camera view used for estimation</small></div><div><small>${escapeHtml(formatTime(current.timestamp))} · webcam</small></div></div>${renderMeasurementSummary(current)}<div class="photoInsight"><div><strong>Latest reading</strong><b>${escapeHtml(current.riseLabel)} rise</b></div><div><strong>What to look for</strong><span>bubbles, the height line, and whether the top is domed or sinking</span></div></div></div></section>
<section class="grid readingsGrid"><div class="panel curvePanel"><div class="sectionHead"><h2>Today’s rise curve</h2><span class="pill">actual readings vs. baseline</span></div>${renderChart(vm.observations, vm.events)}${renderCurveAnnotations(vm.events)}</div></section>
${renderValidationReadings(vm.validationReadings)}
${renderPhotoViewer(vm.validationReadings)}
<div class="implementationDivider" aria-label="technical implementation section begins"><span class="dividerEyebrow">Technical implementation</span><strong>Behind the Scenes</strong></div>
<section class="how"><div class="panel howcopy"><span class="tag">HOW THE WATCH WORKS</span><div class="quote">Domestic science, narrated by an AI agent.</div><p class="note">Every few minutes, a small local computer captures a webcam image. Hermes estimates the starter’s current height, compares it with previous readings, records uncertainty, updates the website, and sends Telegram alerts for meaningful events. The AI can be wrong — glass, residue and lighting are tricky — so Simon can correct key moments like feeding or baseline resets.</p></div><div class="panel diagram"><div class="node"><b>Webcam</b><span>Fixed view of the jar, ideally square-on with a visible baseline.</span></div><div class="arrow">↓ photo capture</div><div class="node"><b>Local computer</b><span>Runs the scheduler, stores photos, and generates public site data.</span></div><div class="arrow">↓ image + context</div><div class="node"><b>Hermes AI</b><span>Estimates rise, labels stage, writes notes, decides whether to alert.</span></div><div class="arrow">↓ publish + notify</div><div class="node"><b>Website</b><span>Public story dashboard for friends; richer lab/debug view for Simon later.</span></div></div></section></main><div class="footer">Prototype: Fermentation Lab visual base × Living Storybook personality × AI-agent transparency</div></div>${renderPhotoViewerScript()}</body></html>`;
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const match = String(timestamp).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(timestamp);
}

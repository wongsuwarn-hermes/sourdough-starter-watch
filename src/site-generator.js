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

function renderEvents(events) {
  return events.map((event) => `
    <article class="entry">
      <time>${escapeHtml(event.time)}</time>
      <strong>${escapeHtml(event.title)}</strong>
      <p>${escapeHtml(event.note)}</p>
    </article>`).join('');
}

function renderChart() {
  return `<svg class="chart" viewBox="0 0 760 270" preserveAspectRatio="none" aria-label="starter rise over time"><defs><linearGradient id="riseFill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f54e00" stop-opacity=".26"/><stop offset="100%" stop-color="#f54e00" stop-opacity="0"/></linearGradient></defs><g class="axis"><path d="M54 28H730M54 82H730M54 136H730M54 190H730M54 244H730"/><path d="M54 28V244M223 28V244M392 28V244M561 28V244M730 28V244"/></g><g class="ylabel"><text x="8" y="34">120%</text><text x="16" y="88">90%</text><text x="16" y="142">60%</text><text x="16" y="196">30%</text><text x="24" y="249">0%</text></g><path class="area" d="M54 229 C90 226,130 217,172 198 C218 178,245 139,286 119 C335 96,388 70,456 53 C515 39,570 52,618 81 C666 110,705 138,730 165 L730 244 L54 244 Z"/><path class="line" d="M54 229 C90 226,130 217,172 198 C218 178,245 139,286 119 C335 96,388 70,456 53 C515 39,570 52,618 81 C666 110,705 138,730 165"/><g class="dots"><circle cx="54" cy="229" r="5"/><circle cx="172" cy="198" r="5"/><circle cx="286" cy="119" r="5"/><circle cx="456" cy="53" r="7"/><circle cx="618" cy="81" r="5"/><circle cx="730" cy="165" r="5"/></g><g class="callouts"><foreignObject x="72" y="202" width="132" height="48"><div xmlns="http://www.w3.org/1999/xhtml" class="bubble">fed: baseline reset</div></foreignObject><foreignObject x="410" y="12" width="154" height="54"><div xmlns="http://www.w3.org/1999/xhtml" class="bubble hot">peak watch armed</div></foreignObject><foreignObject x="604" y="92" width="150" height="54"><div xmlns="http://www.w3.org/1999/xhtml" class="bubble">curve flattening?</div></foreignObject></g><g class="xlabel"><text x="54" y="266">08:00</text><text x="223" y="266">10:00</text><text x="392" y="266">12:00</text><text x="561" y="266">14:00</text><text x="704" y="266">16:00</text></g></svg>`;
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
<main><section class="hero"><div class="panel heroCopy"><span class="tag">${escapeHtml(vm.starterName)} · PUBLIC OBSERVATORY</span><h1>${titleLines}</h1><p class="sub">A living fermentation experiment watched by a webcam and narrated by Hermes. The agent checks the starter, estimates its rise, writes the log, and pings Telegram when the jar does something worth noticing.</p><div class="storyline"><b>Today’s mood: ${escapeHtml(current.mood)}.</b> ${escapeHtml(current.note)} Hermes has armed peak watch, which is less dramatic than it sounds — but only slightly.</div><div class="metrics">${renderMetric('Rise', current.riseLabel)}${renderMetric('Stage', current.phaseLabel, 'starter activity')}${renderMetric('AI conf.', current.confidenceLabel)}${renderMetric('Next', current.nextLabel)}</div></div><div class="panel photo snapshotCard"><div class="snapshotViewport"><img class="starterSnapshot" src="${escapeHtml(current.image)}" alt="latest webcam view of sourdough starter"></div><div class="photoOverlay"><div><strong>Latest webcam frame</strong><small>Actual camera view used for estimation</small></div><div><small>${escapeHtml(formatTime(current.timestamp))} · webcam</small></div></div></div></section>
<section class="grid"><div class="panel" style="padding:18px"><div class="sectionHead"><h2>Today’s rise curve</h2><span class="pill">height estimate vs. baseline</span></div>${renderChart()}</div><div class="panel"><div style="padding:18px 18px 0"><span class="tag">HERMES OBSERVATION LOG</span></div><div class="agent"><h2>The agent is part of the story.</h2><p>Friends should be able to see not just the starter, but the little machine of observation around it.</p><div class="console"><span class="ok">${escapeHtml(formatTime(current.timestamp))}</span> image captured<br><span class="ai">${escapeHtml(formatTime(current.timestamp))}</span> Hermes estimates rise: ${escapeHtml(current.riseLabel)}<br><span class="ai">${escapeHtml(formatTime(current.timestamp))}</span> stage inferred: ${escapeHtml(current.phaseLabel)}<br><span class="warn">alert</span> peak_watch = armed<br><span class="ok">next</span> capture scheduled: ${escapeHtml(current.nextLabel)}<br><span class="ai">telegram</span> alert only if curve flattens</div></div></div></section>
<section class="diary">${renderEvents(vm.events)}</section>
<section class="how"><div class="panel howcopy"><span class="tag">HOW THE WATCH WORKS</span><div class="quote">Domestic science, narrated by an AI agent.</div><p class="note">Every few minutes, a small local computer captures a webcam image. Hermes estimates the starter’s current height, compares it with previous readings, records uncertainty, updates the website, and sends Telegram alerts for meaningful events. The AI can be wrong — glass, residue and lighting are tricky — so Simon can correct key moments like feeding or baseline resets.</p></div><div class="panel diagram"><div class="node"><b>Webcam</b><span>Fixed view of the jar, ideally square-on with a visible baseline.</span></div><div class="arrow">↓ photo capture</div><div class="node"><b>Local computer</b><span>Runs the scheduler, stores photos, and generates public site data.</span></div><div class="arrow">↓ image + context</div><div class="node"><b>Hermes AI</b><span>Estimates rise, labels stage, writes notes, decides whether to alert.</span></div><div class="arrow">↓ publish + notify</div><div class="node"><b>Website</b><span>Public story dashboard for friends; richer lab/debug view for Simon later.</span></div></div></section></main><div class="footer">Prototype: Fermentation Lab visual base × Living Storybook personality × AI-agent transparency</div></div></body></html>`;
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const match = String(timestamp).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(timestamp);
}

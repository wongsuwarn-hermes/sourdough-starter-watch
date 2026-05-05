export function buildCycleModel(data, { date = todayFromData(data) } = {}) {
  const observations = todaysObservations(data.observations ?? [], date);
  const feedTime = findFeedTime(data.events ?? [], observations);
  const prior = buildPrior(data.cycles ?? [], date);

  const raw = observations.map((observation) => normalizeReading(observation));
  const accepted = [];
  const suspect = [];
  let likelyPeak = null;

  for (const reading of raw) {
    const previousAccepted = accepted.at(-1);
    const decision = acceptObservationForCurve({
      observation: reading,
      likelyPeak,
      previousAccepted
    });

    if (decision.accepted) {
      accepted.push({ ...reading, acceptedForCurve: true });
      if (isPeakCandidate(reading, likelyPeak)) {
        likelyPeak = peakFromReading(reading);
      }
    } else {
      suspect.push({ ...reading, reason: decision.reason, explanation: decision.explanation });
    }
  }

  likelyPeak = likelyPeak ?? estimatePeakFromAccepted(accepted, prior, feedTime);
  const stage = inferCycleStage({ accepted, suspect, likelyPeak });
  const peakWindow = windowAround(likelyPeak?.time, 21);

  return {
    date,
    feedTime,
    prior,
    stage,
    likelyPeak,
    peakWindow,
    readings: { raw, accepted, suspect },
    explanation: explanationFor({ likelyPeak, stage, suspect })
  };
}

export function acceptObservationForCurve({ observation, likelyPeak = null, previousAccepted = null }) {
  const reading = normalizeReading(observation);
  const previous = previousAccepted ? normalizeReading(previousAccepted) : null;
  const peak = likelyPeak ? normalizeReading(likelyPeak) : null;
  const residueSuspect = String(reading.validationStatus ?? '').includes('wall-residue')
    || String(reading.wallResidueRisk ?? '').toLowerCase() === 'high';
  const afterPeak = peak && timeToMinutes(reading.time) > timeToMinutes(peak.time);
  const abovePeak = peak && Number.isFinite(reading.heightCm) && Number.isFinite(peak.heightCm) && reading.heightCm >= peak.heightCm;
  const previousFalling = previous && previous.phase === 'falling';

  if (afterPeak && abovePeak && residueSuspect) {
    return {
      accepted: false,
      reason: 'late-high-wall-residue',
      explanation: 'Late high visual reading contradicts the post-peak curve and is flagged as wall residue.'
    };
  }

  if (afterPeak && previousFalling && abovePeak && Number(reading.confidence ?? 0) < 0.8) {
    return {
      accepted: false,
      reason: 'late-high-trend-conflict',
      explanation: 'Late rebound is weak evidence because it conflicts with the falling trend.'
    };
  }

  return { accepted: true, reason: 'reliable-curve-reading', explanation: 'Reading is plausible for the current cycle curve.' };
}

function normalizeReading(observation) {
  const time = formatTime(observation.time ?? observation.timestamp);
  const heightCm = optionalNumber(observation.heightCm);
  const baselineCm = optionalNumber(observation.baselineCm);
  const risePercent = Number.isFinite(Number(observation.risePercent))
    ? Math.round(Number(observation.risePercent))
    : Number.isFinite(heightCm) && Number.isFinite(baselineCm) && baselineCm > 0
      ? Math.max(0, Math.round(((heightCm - baselineCm) / baselineCm) * 100))
      : undefined;
  return {
    ...observation,
    time,
    heightCm,
    rawHeightCm: heightCm,
    baselineCm,
    risePercent,
    confidence: Number(observation.confidence ?? 0),
    phase: String(observation.phase ?? 'unknown').toLowerCase()
  };
}

function isPeakCandidate(reading, likelyPeak) {
  if (!Number.isFinite(reading.heightCm)) return false;
  if (!likelyPeak) return true;
  return reading.heightCm > likelyPeak.heightCm;
}

function peakFromReading(reading) {
  return {
    time: reading.time,
    heightCm: Number(reading.heightCm.toFixed(1)),
    risePercent: Math.round(Number(reading.risePercent ?? 0)),
    source: 'accepted readings'
  };
}

function estimatePeakFromAccepted(accepted, prior, feedTime) {
  const withHeight = accepted.filter((reading) => Number.isFinite(reading.heightCm));
  if (withHeight.length > 0) return peakFromReading(withHeight.sort((a, b) => b.heightCm - a.heightCm)[0]);
  if (!feedTime || !Number.isFinite(prior.hoursToPeakMean)) return null;
  return {
    time: minutesToTime(timeToMinutes(feedTime) + Math.round(prior.hoursToPeakMean * 60)),
    heightCm: prior.peakHeightCmMean,
    risePercent: undefined,
    source: 'prior forecast'
  };
}

function inferCycleStage({ accepted, suspect, likelyPeak }) {
  const latestAccepted = accepted.at(-1);
  if (!latestAccepted || !likelyPeak) return 'unknown';
  const latestMinutes = timeToMinutes(latestAccepted.time);
  const peakMinutes = timeToMinutes(likelyPeak.time);
  const hasLaterLower = accepted.some((reading) => timeToMinutes(reading.time) > peakMinutes && Number.isFinite(reading.heightCm) && reading.heightCm < likelyPeak.heightCm);
  const hasLaterSuspect = suspect.some((reading) => timeToMinutes(reading.time) > peakMinutes);
  if (latestMinutes > peakMinutes && (hasLaterLower || hasLaterSuspect || latestAccepted.phase === 'falling')) return 'past_peak';
  if (latestAccepted.time === likelyPeak.time) return 'near_peak';
  return 'rising';
}

function explanationFor({ likelyPeak, stage, suspect }) {
  if (!likelyPeak) return 'Not enough reliable readings to estimate today’s peak yet.';
  if (stage === 'past_peak' && suspect.length) {
    return `Likely peak is ${likelyPeak.time}, the highest reliable reading; later high readings are treated as suspect residue instead of moving the peak.`;
  }
  return `Likely peak is ${likelyPeak.time}, based on the highest reliable reading and the recent cycle prior.`;
}

function buildPrior(cycles, date) {
  const calibrated = cycles.filter((cycle) => cycle.status === 'calibrated' && cycle.feedTime && cycle.peakTime && (!date || !cycle.date || cycle.date < date));
  if (calibrated.length === 0) {
    return { source: 'broad default', hoursToPeakMean: 4, hoursToPeakStd: 1.5, peakHeightCmMean: null };
  }
  const hours = calibrated.map((cycle) => (timeToMinutes(cycle.peakTime) - timeToMinutes(cycle.feedTime)) / 60).filter(Number.isFinite);
  const heights = calibrated.map((cycle) => optionalNumber(cycle.peakHeightCm)).filter(Number.isFinite);
  return {
    source: 'recent calibrated cycles',
    hoursToPeakMean: round(mean(hours), 2),
    hoursToPeakStd: round(std(hours) || 0.75, 2),
    peakHeightCmMean: heights.length ? round(mean(heights), 1) : null
  };
}

function todaysObservations(observations, date) {
  return observations
    .filter((observation) => !date || String(observation.timestamp ?? '').startsWith(date) || !observation.timestamp)
    .sort((a, b) => timeToMinutes(formatTime(a.time ?? a.timestamp)) - timeToMinutes(formatTime(b.time ?? b.timestamp)));
}

function findFeedTime(events, observations) {
  const fed = [...events].reverse().find((event) => ['fed', 'baseline'].includes(String(event.type ?? event.title ?? '').toLowerCase().replace('.', '')));
  return formatTime(fed?.time) || observations[0]?.time || null;
}

function windowAround(time, halfWidthMinutes) {
  const minutes = timeToMinutes(time);
  if (!Number.isFinite(minutes)) return null;
  return {
    start: minutesToTime(minutes - halfWidthMinutes),
    end: minutesToTime(minutes + halfWidthMinutes + 8)
  };
}

function todayFromData(data) {
  const timestamp = data.current?.timestamp ?? data.observations?.find((observation) => observation.timestamp)?.timestamp;
  return String(timestamp ?? '').slice(0, 10);
}

function formatTime(value) {
  if (!value) return null;
  const text = String(value);
  const iso = text.match(/T(\d{2}:\d{2})/);
  if (iso) return iso[1];
  const plain = text.match(/^(\d{1,2}:\d{2})/);
  return plain ? plain[1].padStart(5, '0') : null;
}

function timeToMinutes(time) {
  const match = String(time ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(minutes) {
  const day = 24 * 60;
  const normalized = ((Math.round(minutes) % day) + day) % day;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function round(value, places) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

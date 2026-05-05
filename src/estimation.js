export function estimateRiseFromHeight({ baselineCm, heightCm }) {
  const baseline = roundTo(Number(baselineCm), 2);
  const height = roundTo(Number(heightCm), 2);
  if (!Number.isFinite(baseline) || baseline <= 0) {
    throw new Error('baselineCm must be a positive number');
  }
  if (!Number.isFinite(height)) {
    throw new Error('heightCm must be a number');
  }

  const risePercent = Math.max(0, Math.round(((height - baseline) / baseline) * 100));
  return { baselineCm: baseline, heightCm: height, risePercent };
}

export function inferPhaseFromTrend({ risePercent, previousRisePercent = 0, confidence = 0.5 }) {
  const rise = Number(risePercent ?? 0);
  const previous = Number(previousRisePercent ?? 0);
  const conf = Number(confidence ?? 0.5);

  if (conf < 0.35) return 'unknown';
  if (rise <= 5) return 'dormant';
  if (rise >= 95 && Math.abs(rise - previous) <= 8) return 'peaking';
  if (rise < previous - 8) return 'falling';
  if (rise > previous + 5) return 'rising';
  if (rise >= 90) return 'peaking';
  return 'rising';
}

export function buildObservationFromReading({
  timestamp = new Date().toISOString(),
  image = 'photos/starter.jpg',
  baselineCm,
  heightCm,
  previousRisePercent = 0,
  confidence = 0.5,
  note
}) {
  const estimate = estimateRiseFromHeight({ baselineCm, heightCm });
  const normalizedConfidence = clamp(Number(confidence), 0, 1);
  const phase = inferPhaseFromTrend({
    risePercent: estimate.risePercent,
    previousRisePercent,
    confidence: normalizedConfidence
  });

  return {
    timestamp,
    image,
    baselineCm: estimate.baselineCm,
    heightCm: estimate.heightCm,
    risePercent: estimate.risePercent,
    phase,
    confidence: Number(normalizedConfidence.toFixed(2)),
    note: note ?? noteForReading({ phase, confidence: normalizedConfidence })
  };
}

function noteForReading({ phase, confidence }) {
  const caveat = confidence < 0.65 ? ' Estimate is approximate because webcam readings through the jar can be noisy.' : '';
  if (phase === 'dormant') return `Starter appears close to baseline.${caveat}`;
  if (phase === 'rising') return `Starter appears to be rising.${caveat}`;
  if (phase === 'peaking') return `Starter may be near peak; watch for flattening.${caveat}`;
  if (phase === 'falling') return `Starter appears to be settling after a higher reading.${caveat}`;
  return `Hermes could not confidently classify this frame.${caveat}`;
}

function roundTo(value, places) {
  if (!Number.isFinite(value)) return value;
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

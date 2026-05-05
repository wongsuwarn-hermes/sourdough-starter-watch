export function addObservation(data, rawObservation) {
  const observation = normalizeObservation(rawObservation);
  const observations = [...(data.observations ?? []), observation];
  const current = deriveCurrentFromObservation(observation);

  return {
    ...data,
    observations,
    current: {
      ...(data.current ?? {}),
      ...current
    }
  };
}

export function addEvent(data, rawEvent) {
  const event = normalizeEvent(rawEvent);
  const events = [event, ...(data.events ?? [])];
  const base = { ...data, events };

  if (rawEvent.type === 'fed') {
    return {
      ...base,
      current: {
        ...(data.current ?? {}),
        timestamp: rawEvent.time ?? new Date().toISOString(),
        risePercent: 0,
        phase: 'fed',
        confidence: 1,
        nextCheckMinutes: 10,
        mood: 'freshly fed',
        note: 'Baseline reset after feeding.'
      }
    };
  }

  return base;
}

export function deriveCurrentFromObservation(observation) {
  const phase = String(observation.phase ?? 'unknown').toLowerCase();
  const confidence = Number(observation.confidence ?? 0);
  const risePercent = Math.round(Number(observation.risePercent ?? 0));

  return {
    timestamp: observation.timestamp,
    risePercent,
    phase,
    confidence,
    image: observation.image,
    mood: moodForPhase(phase, risePercent),
    note: observation.note ?? noteForPhase(phase),
    nextCheckMinutes: nextCadenceMinutes({ phase, confidence, risePercent })
  };
}

function normalizeObservation(raw) {
  const timestamp = raw.timestamp ?? new Date().toISOString();
  const confidence = clamp(Number(raw.confidence ?? 0.5), 0, 1);

  return {
    timestamp,
    time: formatTime(timestamp),
    risePercent: Math.round(Number(raw.risePercent ?? 0)),
    phase: String(raw.phase ?? 'unknown').toLowerCase(),
    confidence: Number(confidence.toFixed(2)),
    image: raw.image ?? 'photos/starter.jpg',
    note: raw.note ?? noteForPhase(raw.phase)
  };
}

function normalizeEvent(raw) {
  const timestamp = raw.time ?? new Date().toISOString();
  return {
    time: formatTime(timestamp),
    title: raw.title ?? 'Manual note.',
    note: raw.note ?? '',
    type: raw.type ?? 'note'
  };
}

function nextCadenceMinutes({ phase, confidence, risePercent }) {
  if (confidence < 0.45) return 60;
  if (phase === 'dormant') return 60;
  if (phase === 'peaking' || phase === 'peak') return 5;
  if (phase === 'rising' && risePercent >= 90) return 5;
  if (phase === 'rising') return 10;
  return 30;
}

function moodForPhase(phase, risePercent) {
  if (phase === 'peaking' || phase === 'peak' || risePercent >= 100) return 'dramatic';
  if (phase === 'falling') return 'settling';
  if (phase === 'fed') return 'freshly fed';
  if (phase === 'dormant') return 'sleepy';
  if (phase === 'rising') return 'ambitious';
  return 'curious';
}

function noteForPhase(phase) {
  const normalized = String(phase ?? '').toLowerCase();
  if (normalized === 'rising') return 'The starter is rising with visible activity.';
  if (normalized === 'peaking' || normalized === 'peak') return 'The starter may be near its peak.';
  if (normalized === 'falling') return 'The starter appears to be settling after peak activity.';
  if (normalized === 'dormant') return 'Little visible change detected.';
  return 'Hermes is watching for meaningful changes.';
}

function formatTime(timestamp) {
  const match = String(timestamp).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(timestamp).slice(0, 5);
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

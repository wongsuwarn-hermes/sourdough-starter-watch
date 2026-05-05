import { isAbsolute, relative } from 'node:path';

export function defaultReadingFromData(data) {
  const baselineCm = Number(data.starter?.baselineCm ?? data.current?.baselineCm ?? data.current?.heightCm ?? 2.2);
  const heightCm = Number(data.current?.heightCm ?? baselineCm);
  const previousRisePercent = Number(data.current?.risePercent ?? 0);
  return {
    baselineCm,
    heightCm,
    previousRisePercent,
    confidence: 0.45,
    note: 'Fresh webcam frame captured; height reused until visual estimate is confirmed.'
  };
}

export function buildPublishCommitMessage(timestamp = localIsoTimestamp()) {
  const text = String(timestamp).replace('T', ' ').slice(0, 16);
  return `chore: publish starter observation ${text}`;
}

export function localIsoTimestamp(date = new Date(), offsetMinutes = -date.getTimezoneOffset()) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const offsetMins = String(absolute % 60).padStart(2, '0');
  return `${shifted.toISOString().slice(0, 19)}${sign}${offsetHours}:${offsetMins}`;
}

export function normalizeManualCommand(argv) {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);

  if (command === 'fed') {
    return {
      type: 'fed',
      baselineCm: parseOptionalNumber(args.baseline),
      title: 'Fed.',
      note: args.note ?? 'Simon reset the baseline after feeding.'
    };
  }

  if (command === 'baseline') {
    const baselineCm = parseOptionalNumber(args.baseline ?? rest.find((item) => !item.startsWith('--')));
    return {
      type: 'baseline',
      baselineCm,
      title: 'Baseline set.',
      note: `Baseline set to ${baselineCm}cm.`
    };
  }

  if (command === 'note') {
    const note = args.note ?? rest.join(' ');
    return {
      type: 'note',
      title: args.title ?? 'Manual note.',
      note
    };
  }

  throw new Error('Usage: manual fed --baseline 2.2 --note "..." | manual baseline 2.2 | manual note "..."');
}

export function normalizeImagePath(image, publicDir = 'public') {
  if (!image) return 'photos/starter.jpg';
  const value = String(image);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    throw new Error('Unsafe image path: external URLs are not allowed');
  }

  const relativePath = value.startsWith('public/')
    ? value.slice('public/'.length)
    : isAbsolute(value)
      ? relative(publicDir, value)
      : value;

  const normalized = relativePath.replaceAll('\\\\', '/');
  if (
    normalized.startsWith('../') ||
    normalized === '..' ||
    normalized.startsWith('/') ||
    !normalized.startsWith('photos/')
  ) {
    throw new Error('Unsafe image path: must stay under public/photos');
  }
  return normalized;
}

export function decideStarterWatchPlan(data, { now = new Date() } = {}) {
  const current = data.current ?? {};
  const phase = String(current.phase ?? 'unknown').toLowerCase();
  const confidence = Number(current.confidence ?? 0);
  const risePercent = Math.round(Number(current.risePercent ?? 0));
  const lastTimestamp = Date.parse(current.timestamp ?? '');
  const cadenceMinutes = adaptiveCadenceMinutes({ phase, confidence, risePercent });
  const elapsedMinutes = Number.isFinite(lastTimestamp)
    ? Math.max(0, Math.floor((now.getTime() - lastTimestamp) / 60_000))
    : Number.POSITIVE_INFINITY;
  const minutesUntilDue = Number.isFinite(elapsedMinutes)
    ? Math.max(0, cadenceMinutes - elapsedMinutes)
    : 0;
  const photoDue = !Number.isFinite(elapsedMinutes) || elapsedMinutes >= cadenceMinutes;
  const milestone = milestoneForState({ phase, confidence, risePercent });

  return {
    photoDue,
    notifyTelegram: photoDue && Boolean(milestone),
    milestone,
    cadenceMinutes,
    elapsedMinutes,
    minutesUntilDue,
    reason: photoDue ? 'adaptive cadence due' : 'waiting for adaptive cadence'
  };
}

function adaptiveCadenceMinutes({ phase, confidence, risePercent }) {
  if (confidence < 0.45) return 5;
  if (phase === 'peaking' || phase === 'peak') return 5;
  if (phase === 'falling') return 5;
  if (phase === 'rising' && risePercent >= 90) return 5;
  if (phase === 'rising') return 10;
  if (phase === 'fed') return 30;
  if (phase === 'dormant') return 60;
  return 30;
}

function milestoneForState({ phase, confidence, risePercent }) {
  if (confidence < 0.45) return 'needs_human_check';
  if (phase === 'falling') return 'falling_after_peak';
  if (phase === 'peaking' || phase === 'peak') return 'peak_reached';
  if (phase === 'rising' && risePercent >= 90) return 'near_peak';
  return null;
}

function parseArgs(argv) {
  const args = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      positionals.push(item);
      continue;
    }
    const key = item.slice(2);
    args[key] = argv[i + 1];
    i += 1;
  }
  if (positionals.length) args._ = positionals;
  return args;
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

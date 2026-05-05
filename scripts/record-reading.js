import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addObservation } from '../src/observations.js';
import { buildObservationFromReading } from '../src/estimation.js';
import { defaultReadingFromData, localIsoTimestamp } from '../src/automation.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, 'data', 'observations.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    args[arg.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function normalizeImagePath(image) {
  const publicDir = join(root, 'public');
  if (!image) return 'photos/starter.jpg';
  if (image.startsWith('public/')) return image.slice('public/'.length);
  if (image.startsWith('/')) return relative(publicDir, image);
  return image;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const fallback = defaultReadingFromData(data);
  const image = normalizeImagePath(args.image ?? 'public/photos/starter.jpg');

  const reading = {
    ...fallback,
    timestamp: args.timestamp ?? localIsoTimestamp(),
    image,
    baselineCm: Number(args['baseline-cm'] ?? args.baseline ?? fallback.baselineCm),
    heightCm: Number(args['height-cm'] ?? args.height ?? fallback.heightCm),
    confidence: Number(args.confidence ?? fallback.confidence),
    note: args.note ?? fallback.note
  };

  const observation = buildObservationFromReading(reading);
  const updated = addObservation(data, observation);
  await writeFile(dataPath, `${JSON.stringify(updated, null, 2)}\n`);

  console.log(JSON.stringify({
    recorded: true,
    image,
    heightCm: observation.heightCm,
    baselineCm: observation.baselineCm,
    risePercent: observation.risePercent,
    phase: observation.phase,
    confidence: observation.confidence,
    nextCheckMinutes: updated.current.nextCheckMinutes
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

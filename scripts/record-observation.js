import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addObservation } from '../src/observations.js';
import { normalizeImagePath } from '../src/automation.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, 'data', 'observations.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.rise || !args.phase || !args.image) {
    throw new Error('Usage: node scripts/record-observation.js --rise 68 --phase rising --confidence 0.74 --image public/photos/captures/file.jpg --note "..."');
  }

  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const imagePath = normalizeImagePath(args.image, join(root, 'public'));
  const updated = addObservation(data, {
    timestamp: args.timestamp ?? new Date().toISOString(),
    risePercent: args.rise,
    phase: args.phase,
    confidence: args.confidence ?? 0.5,
    image: imagePath,
    note: args.note
  });

  await writeFile(dataPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Recorded ${updated.current.risePercent}% ${updated.current.phase} observation; next check ${updated.current.nextCheckMinutes}m`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

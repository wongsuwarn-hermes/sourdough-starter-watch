import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addEvent } from '../src/observations.js';

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = args.type ?? 'note';
  const title = args.title ?? (type === 'fed' ? 'Fed.' : 'Manual note.');
  const note = args.note ?? (type === 'fed' ? 'Simon reset the baseline.' : 'Manual update from Simon.');

  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const updated = addEvent(data, {
    time: args.timestamp ?? new Date().toISOString(),
    type,
    title,
    note
  });

  await writeFile(dataPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Recorded event: ${title}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

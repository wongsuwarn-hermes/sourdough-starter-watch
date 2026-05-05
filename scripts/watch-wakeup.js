import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideStarterWatchPlan } from '../src/automation.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    args[item.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataPath = args.data ?? join(root, 'data', 'observations.json');
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const now = args.now ? new Date(args.now) : new Date();
  const plan = decideStarterWatchPlan(data, { now });
  const wakeup = {
    action: plan.photoDue ? 'capture' : 'wait',
    ...plan
  };
  console.log(JSON.stringify(wakeup, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

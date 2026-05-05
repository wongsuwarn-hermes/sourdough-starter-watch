import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addEvent } from '../src/observations.js';
import { normalizeManualCommand } from '../src/automation.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, 'data', 'observations.json');

async function main() {
  const command = normalizeManualCommand(process.argv.slice(2));
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const updated = addEvent(data, {
    time: new Date().toISOString(),
    ...command
  });

  await writeFile(dataPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Recorded ${command.type}: ${command.note}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

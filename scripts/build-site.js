import { access, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildViewModel, renderSite } from '../src/site-generator.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, 'data', 'observations.json');
const publicDir = join(root, 'public');
const photosDir = join(publicDir, 'photos');

async function main() {
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const html = renderSite(buildViewModel(data));

  await mkdir(photosDir, { recursive: true });
  await writeFile(join(publicDir, 'index.html'), html);
  await copyFile(join(root, 'src', 'styles.css'), join(publicDir, 'styles.css'));

  const starterPhoto = join(photosDir, 'starter.jpg');
  try {
    await access(starterPhoto, constants.F_OK);
  } catch {
    try {
      await copyFile('/Users/mac_studio/.hermes/tmp/sourdough_site_mockups/starter.jpg', starterPhoto);
    } catch {
      // The first real capture job will populate this file. The site still builds without it.
    }
  }

  console.log(`Built ${join(publicDir, 'index.html')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

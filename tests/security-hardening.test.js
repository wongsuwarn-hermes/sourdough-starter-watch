import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as automation from '../src/automation.js';

const root = new URL('../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('local preview server only binds to localhost', async () => {
  const pkg = JSON.parse(await text('package.json'));

  assert.match(pkg.scripts.serve, /--bind 127\.0\.0\.1/);
  assert.doesNotMatch(pkg.scripts.serve, /http\.server 8776 -d public$/);
});

test('publish cycle does not pull and execute remote code by default', async () => {
  const script = await text('scripts/publish-cycle.sh');

  assert.doesNotMatch(script, /git pull --ff-only \|\| true/);
  assert.match(script, /SOURDOUGH_ALLOW_PULL/);
  assert.match(script, /Skipping git pull by default/);
});

test('publish cycle requires explicit publishing consent before committing or pushing', async () => {
  const script = await text('scripts/publish-cycle.sh');

  assert.match(script, /SOURDOUGH_PUBLISH/);
  assert.match(script, /Publish disabled by default/);
  assert.ok(script.indexOf('SOURDOUGH_PUBLISH') < script.indexOf('git commit'));
  assert.ok(script.indexOf('SOURDOUGH_PUBLISH') < script.indexOf('git push'));
});

test('image paths are constrained to public relative photo paths', () => {
  assert.equal(automation.normalizeImagePath('public/photos/starter.jpg'), 'photos/starter.jpg');
  assert.equal(automation.normalizeImagePath('/repo/public/photos/starter.jpg', '/repo/public'), 'photos/starter.jpg');

  assert.throws(() => automation.normalizeImagePath('https://evil.example/starter.jpg'), /Unsafe image path/);
  assert.throws(() => automation.normalizeImagePath('../private.jpg'), /Unsafe image path/);
  assert.throws(() => automation.normalizeImagePath('/tmp/private.jpg', '/repo/public'), /Unsafe image path/);
});

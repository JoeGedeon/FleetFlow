import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  extractRegion,
  LOGIN_REGION_END,
  LOGIN_REGION_START,
  NAV_MARKER,
  validateGeneratedDocument,
} from './build-validation.mjs';

const root = new URL('../', import.meta.url);
const sourcePath = new URL('../index.html', import.meta.url);
const distPath = new URL('../dist/index.html', import.meta.url);

test('legacy build is deterministic and leaves production source untouched', () => {
  const sourceBefore = fs.readFileSync(sourcePath);
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const firstBuild = fs.readFileSync(distPath);
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const secondBuild = fs.readFileSync(distPath);

  assert.deepEqual(secondBuild, firstBuild);
  assert.deepEqual(fs.readFileSync(sourcePath), sourceBefore);
});

test('generated app preserves login and excludes Wednesday runtime assets', () => {
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const html = fs.readFileSync(distPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.match(html, /id="login-screen"/);
  assert.match(html, /function doLogin\(\)/);
  assert.equal(html.split(NAV_MARKER).length - 1, 1);
  assert.equal(
    extractRegion(html, LOGIN_REGION_START, LOGIN_REGION_END, 'generated login region'),
    extractRegion(source, LOGIN_REGION_START, LOGIN_REGION_END, 'source login region'),
  );
  assert.doesNotMatch(html, /wednesday-observer|fleetflow-wednesday|src\/components\/Wednesday/i);
  execFileSync(process.execPath, ['scripts/validate-dist.mjs'], { cwd: root });
});

test('validator rejects protected-core and Wednesday runtime changes', () => {
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const html = fs.readFileSync(distPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.throws(
    () => validateGeneratedDocument(html.replace('ENTER SYSTEM', 'ENTER FLEETFLOW'), source),
    /login region is not byte-for-byte identical/,
  );
  assert.throws(
    () => validateGeneratedDocument(html.replace('</body>', '<script src="/wednesday-observer.js"></script></body>'), source),
    /Wednesday runtime reference/,
  );
});

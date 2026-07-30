import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  EXTENSION_MARKER,
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

test('generated app preserves login and registers Wednesday after readiness', () => {
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
  assert.match(html, /wednesday-onboarding\.js/);
  assert.equal(html.split(EXTENSION_MARKER).length - 1, 1);
  execFileSync(process.execPath, ['scripts/validate-dist.mjs'], { cwd: root });
});

test('validator rejects protected-core changes', () => {
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const html = fs.readFileSync(distPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.throws(
    () => validateGeneratedDocument(html.replace('ENTER SYSTEM', 'ENTER FLEETFLOW'), source),
    /login region is not byte-for-byte identical/,
  );
});

test('validator rejects unsafe Wednesday extension structures', () => {
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const html = fs.readFileSync(distPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const invalid = [
    [html.replace('</head>', '<script src="/extensions/wednesday-onboarding.js"></script></head>'), /synchronously from the document head/],
    [html.replace('if (!context || !context.username || !context.companyId) return;', ''), /authenticated tenant context/],
    [html.replace("addEventListener('fleetflow:app-ready'", "addEventListener('fleetflow:not-ready'"), /behind fleetflow:app-ready/],
    [html.replace("const registrations = [", "import('./extensions/wednesday-onboarding.js');\n  const registrations = ["), /must not directly import/],
    [html.replace("const registrations = [", "await import('./extensions/wednesday-onboarding.js');\n  const registrations = ["), /must not directly import|must not await/],
    [html.replace('.catch(reportExtensionFailure)', ''), /failures must be contained/],
    [html.replace('function switchTab(tab) {', "function switchTab(tab) {\n  if (!window.Wednesday) return;"), /must not be required by function switchTab/],
  ];
  for (const [document, message] of invalid) {
    assert.throws(() => validateGeneratedDocument(document, source), message);
  }
});

test('generic optional extension registration and disabling Wednesday are accepted', () => {
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const html = fs.readFileSync(distPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.doesNotThrow(() => validateGeneratedDocument(
    html.replace("{ id: 'wednesday', module: './extensions/wednesday-onboarding.js' }", "{ id: 'training', module: './extensions/training.js' }"), source));
  assert.doesNotThrow(() => validateGeneratedDocument(
    html.replace("{ id: 'wednesday', module: './extensions/wednesday-onboarding.js' }", ''), source));
});

test('core readiness is exact-once and extension startup is asynchronous and failure-contained', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.equal(source.split('function signalFleetFlowAppReady()').length - 1, 1);
  assert.match(source, /if \(fleetflowAppReadySignaled \|\| !currentUser\) return/);
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const html = fs.readFileSync(distPath, 'utf8');
  assert.match(html, /queueMicrotask/);
  assert.match(html, /import\(registration\.module\).*\.catch\(reportExtensionFailure\)/);
});

test('login, navigation, and logout remain independent of Wednesday registration', () => {
  execFileSync(process.execPath, ['scripts/apply-nav-stacking-fix.mjs'], { cwd: root });
  const html = fs.readFileSync(distPath, 'utf8').replace("{ id: 'wednesday', module: './extensions/wednesday-onboarding.js' }", '');
  for (const entry of ['function doLogin()', 'function doLogout()', 'function switchTab(tab)', 'function renderActiveTab()']) {
    assert.match(html, new RegExp(entry.replace(/[()]/g, '\\$&')));
  }
});

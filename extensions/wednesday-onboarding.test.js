import assert from 'node:assert/strict';
import test from 'node:test';
import { progressKey, readProgress, STEPS, writeProgress } from './wednesday-onboarding.js';
import fs from 'node:fs';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
const user = { companyId: 'ERSA Logistics!', username: 'Giselle@example.com' };

test('progress is tenant and user scoped with sanitized identifiers', () => {
  assert.equal(progressKey(user), 'ff:onboarding:wednesday:v1:ersalogistics:giselleexamplecom');
  assert.notEqual(progressKey(user), progressKey({ ...user, username: 'other' }));
  assert.notEqual(progressKey(user), progressKey({ ...user, companyId: 'other' }));
});

test('progress persistence stores only guide state and safely restores it', () => {
  const storage = memoryStorage();
  writeProgress(storage, user, { step: 6, status: 'paused', skipped: [2] });
  assert.deepEqual(readProgress(storage, user), { step: 6, status: 'paused', skipped: [2] });
});

test('guide has every deterministic emergency onboarding step', () => {
  assert.equal(STEPS.length, 14);
  assert.deepEqual(STEPS.map(step => step[0]), [
    'Welcome to Wednesday', 'Review company profile', 'Confirm owner and office access',
    'Add drivers and helpers', 'Add trucks and fleet information', 'Review operational settings',
    'Create or review the first job', 'Explain Dashboard', 'Explain Jobs', 'Explain Calendar',
    'Explain Warehouse', 'Explain Payroll', 'Explain Documents', 'Onboarding completion summary'
  ]);
});

test('onboarding derives the active company without hardcoded tenant copy', () => {
  const source = fs.readFileSync(new URL('./wednesday-onboarding.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /ERSA/i);
  assert.match(source, /context\.companyName \|\| context\.companyId/);
  assert.match(source, /data-active-company/);
  assert.match(source, /\.textContent = companyLabel/);
  assert.match(source, /FleetFlow operations guide/);
});

test('resume control stays above mobile safe areas and browser toolbars', () => {
  const source = fs.readFileSync(new URL('./wednesday-onboarding.js', import.meta.url), 'utf8');
  assert.match(source, /right:max\(16px,env\(safe-area-inset-right\)\)/);
  assert.match(source, /bottom:calc\(max\(16px,env\(safe-area-inset-bottom\)\) \+ 72px\)/);
  assert.match(source, /z-index:7000/);
  assert.match(source, /\.ffw-resume\{display:block;margin-left:auto/);
  assert.doesNotMatch(source, /\.ffw-resume\{float:/);
});

test('floating assistant has reachable window controls and explicit restore states', () => {
  const source = fs.readFileSync(new URL('./wednesday-onboarding.js', import.meta.url), 'utf8');

  assert.match(source, /top:max\(20px,env\(safe-area-inset-top\)\)/);
  assert.match(source, /class="ffw-head"/);
  assert.match(source, /aria-label="Minimize Wednesday"/);
  assert.match(source, /aria-label="Collapse Wednesday to the right edge"/);
  assert.match(source, /aria-label="Close Wednesday"/);
  assert.match(source, /aria-label="Open Wednesday"/);
  assert.match(source, /windowState === 'collapsed'/);
  assert.match(source, /windowState === 'minimized'/);
  assert.match(source, /windowState === 'closed'/);
  assert.match(source, /function enableDragging\(handle\)/);
  assert.match(source, /handle\.onpointerdown/);
});

test('voice narration is opt-in, adjustable, and lifecycle-contained', () => {
  const source = fs.readFileSync(new URL('./wednesday-onboarding.js', import.meta.url), 'utf8');
  assert.match(source, /Narration starts only when you press Play/);
  assert.match(source, /no microphone, OpenAI Voice, or PACER connection/);
  assert.match(source, /▶ Play voice/);
  assert.match(source, />Pause</);
  assert.match(source, />Stop</);
  assert.match(source, /data-voice-setting="voice"/);
  assert.match(source, /data-voice-setting="rate"/);
  assert.match(source, /data-voice-setting="volume"/);
  assert.match(source, /fleetflow:route-changed/);
  assert.match(source, /function remove\(\) \{ stopNarration\(\)/);
  assert.match(source, /Wednesday remains fully usable without it/);
});

test('voice render cannot be overwritten by the legacy onboarding card', () => {
  const source = fs.readFileSync(new URL('./wednesday-onboarding.js', import.meta.url), 'utf8');
  const renderStart = source.indexOf('function render()');
  const renderEnd = source.indexOf('\n  function advance()', renderStart);
  const renderSource = source.slice(renderStart, renderEnd);
  const cardAssignments = renderSource.match(/root\.innerHTML\s*=\s*`<section class="ffw-card"/g) || [];

  assert.ok(renderStart >= 0 && renderEnd > renderStart);
  assert.equal(cardAssignments.length, 1, 'render must assign the onboarding card exactly once');
  assert.match(renderSource, /const voiceControls = [\s\S]*root\.innerHTML\s*=\s*`[^`]*\$\{voiceControls\}/);
  assert.match(renderSource, /root\.querySelector\('\[data-voice="play"\]'\)\.onclick/);
  assert.equal((renderSource.match(/root\.querySelector\('\[data-action="back"\]'\)\.onclick/g) || []).length, 1);
  assert.equal((renderSource.match(/root\.querySelector\('\[data-action="skip"\]'\)\.onclick/g) || []).length, 1);
  assert.equal((renderSource.match(/root\.querySelector\('\[data-action="continue"\]'\)\.onclick/g) || []).length, 1);
  assert.match(renderSource, /if \(narrationEnabled\) queueMicrotask\(speakCurrent\);\s*return;\s*}\s*$/);
});

test('onboarding lifecycle helpers have single definitions', () => {
  const source = fs.readFileSync(new URL('./wednesday-onboarding.js', import.meta.url), 'utf8');

  assert.equal((source.match(/\bfunction persist\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bfunction remove\s*\(/g) || []).length, 1);
  assert.match(source, /function remove\(\) \{ stopNarration\(\); root\.remove\(\); style\.remove\(\); \}/);
});

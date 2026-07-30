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
    'Welcome to FleetFlow', 'Confirm ERSA Logistics company profile', 'Confirm owner and office access',
    'Add drivers and helpers', 'Add trucks and fleet information', 'Review operational settings',
    'Create or review the first job', 'Explain Dashboard', 'Explain Jobs', 'Explain Calendar',
    'Explain Warehouse', 'Explain Payroll', 'Explain Documents', 'Onboarding completion summary'
  ]);
});

test('resume control stays above mobile safe areas and browser toolbars', () => {
  const source = fs.readFileSync(new URL('./wednesday-onboarding.js', import.meta.url), 'utf8');
  assert.match(source, /right:max\(16px,env\(safe-area-inset-right\)\)/);
  assert.match(source, /bottom:calc\(max\(16px,env\(safe-area-inset-bottom\)\) \+ 72px\)/);
  assert.match(source, /z-index:7000/);
  assert.match(source, /\.ffw-resume\{display:block;margin-left:auto/);
  assert.doesNotMatch(source, /\.ffw-resume\{float:/);
});

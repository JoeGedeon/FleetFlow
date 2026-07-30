import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('calendar does not force historical months back to today', () => {
  const renderStart = source.indexOf('function renderCalendar()');
  const renderEnd = source.indexOf('\nfunction setCalView(', renderStart);
  const renderCalendar = source.slice(renderStart, renderEnd);

  assert.ok(renderStart >= 0 && renderEnd > renderStart);
  assert.doesNotMatch(renderCalendar, /monthDiff|more than 2 months behind/);
});

test('calendar previous navigation crosses month and year boundaries', () => {
  const navStart = source.indexOf('function calNav(dir)');
  const navEnd = source.indexOf('\nfunction openCalDay(', navStart);
  const calNav = source.slice(navStart, navEnd);

  assert.ok(navStart >= 0 && navEnd > navStart);
  assert.match(calNav, /calMonth \+= dir/);
  assert.match(calNav, /if \(calMonth < 0\)\s+\{ calMonth = 11; calYear--; \}/);
  assert.match(calNav, /if \(dir === 0\)[\s\S]*new Date\(\)\.getMonth\(\)/);
});

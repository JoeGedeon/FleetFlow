import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const schema = JSON.parse(fs.readFileSync(
  new URL('../docs/fleetflow-context-packet-v1.schema.json', import.meta.url),
  'utf8'
));

test('Context Packet v1 has one strict, read-only screen envelope', () => {
  assert.equal(schema.properties.contextVersion.const, '1.0');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    'contextVersion', 'contextId', 'contextEpoch', 'contextState', 'generatedAt',
    'module', 'screen', 'selection', 'summary', 'attentionItems', 'allowedActions',
    'citations'
  ]);
  assert.deepEqual(schema.properties.contextEpoch, { type: 'integer', minimum: 0 });
  assert.deepEqual(schema.properties.contextState.enum, ['ACTIVE', 'INVALIDATED']);
  assert.equal(schema.properties.selection.$ref, '#/$defs/safeMap');
  assert.equal(schema.properties.summary.$ref, '#/$defs/safeMap');
});

test('Context Packet lifecycle metadata has distinct, closed semantics', () => {
  assert.match(schema.properties.contextId.pattern, /^\^ctx_/);
  assert.equal(schema.properties.contextEpoch.type, 'integer');
  assert.deepEqual(schema.properties.contextState.enum, ['ACTIVE', 'INVALIDATED']);
  assert.equal(schema.additionalProperties, false);
});

test('Context Packet fields are bounded and citations point to FleetFlow sources', () => {
  const safeMap = schema.$defs.safeMap;
  const citation = schema.properties.citations.items;

  assert.equal(safeMap.maxProperties, 100);
  assert.equal(safeMap.additionalProperties.oneOf.some(rule => rule.type === 'object'), false);
  assert.equal(safeMap.additionalProperties.oneOf.some(rule => rule.type === 'array'), false);
  assert.equal(schema.properties.attentionItems.maxItems, 100);
  assert.equal(schema.properties.allowedActions.uniqueItems, true);
  assert.equal(citation.additionalProperties, false);
  assert.equal(citation.properties.sourceType.pattern, '^fleetflow-[a-z0-9_-]+$');
  assert.ok(citation.required.includes('version'));
  assert.ok(citation.required.includes('locator'));
});

test('Context Packet cannot carry authority or unrestricted tenant internals', () => {
  const exposedFields = new Set(Object.keys(schema.properties));
  for (const forbidden of [
    'companyId', 'tenant', 'role', 'permissions', 'authorized', 'execute', 'write',
    'rawDocument', 'storagePath', 'collection', 'credentials', 'payroll'
  ]) {
    assert.equal(exposedFields.has(forbidden), false, `${forbidden} must not be exposed`);
  }
});

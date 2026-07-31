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
    'contextVersion', 'contextId', 'contextEpoch', 'generatedAt', 'module', 'screen',
    'selection', 'summary', 'attentionItems', 'allowedActions', 'citations'
  ]);
  assert.deepEqual(schema.properties.contextEpoch, { type: 'integer', minimum: 0 });
  assert.equal(schema.properties.selection.$ref, '#/$defs/safeMap');
  assert.equal(schema.properties.summary.$ref, '#/$defs/safeMap');
});

test('Context Packet epoch requires an exact current-session match', () => {
  const architecture = fs.readFileSync(
    new URL('../docs/fleetflow-read-gateway-v1.md', import.meta.url),
    'utf8'
  );

  assert.match(architecture, /server is the sole issuer of `contextEpoch`/);
  assert.match(architecture, /packet\.contextEpoch === currentSession\.contextEpoch/);
  assert.match(architecture, /produced under the current authenticated server session/);
  assert.match(architecture, /must use exact equality/);
  assert.match(architecture, /must never infer freshness with ordering logic/);
  assert.match(architecture, /packet\.contextEpoch > previousContextEpoch/);
  assert.match(architecture, /not chronology, tenant identity, proof of authorization/);
});

test('Context Packet epoch rotates for every authorization invalidation', () => {
  const architecture = fs.readFileSync(
    new URL('../docs/fleetflow-read-gateway-v1.md', import.meta.url),
    'utf8'
  );

  for (const invalidation of [
    'active-tenant switch',
    'logout or session termination',
    'authentication refresh that changes access',
    'Creator permission change',
    'tenant membership removal',
    'policy, role, or authorization event'
  ]) {
    assert.match(architecture, new RegExp(invalidation));
  }
  assert.match(architecture, /visible company has not changed/);
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

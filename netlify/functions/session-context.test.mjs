import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler } from './session-context.mjs';
import { AuthenticationError } from './_shared/verify-id-token.mjs';
import { IdentityError, loadFleetFlowIdentity } from './_shared/load-fleetflow-identity.mjs';

const identity = {
  uid: 'uid-1',
  username: 'joe',
  displayName: 'Joe',
  role: 'creator',
  companyId: 'jpg',
  allowedRoles: ['creator'],
  membershipVersion: 1
};

function makeHandler(overrides = {}) {
  return createHandler({
    adminFactory: () => ({ auth: {}, db: {} }),
    verifyToken: async (_auth, token) => {
      if (token !== 'valid-token') throw new AuthenticationError();
      return { uid: 'uid-1' };
    },
    loadIdentity: async () => identity,
    createRequestId: () => 'request-1',
    env: { FLEETFLOW_ALLOWED_ORIGINS: 'https://fleetflow.example' },
    ...overrides
  });
}

function event(overrides = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      authorization: 'Bearer valid-token',
      origin: 'https://fleetflow.example'
    },
    body: '{}',
    ...overrides
  };
}

test('returns only server-derived identity', async () => {
  const response = await makeHandler()(event());
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { requestId: 'request-1', identity });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['access-control-allow-origin'], 'https://fleetflow.example');
});

test('rejects unsupported methods before authentication', async () => {
  const response = await makeHandler()(event({ httpMethod: 'GET' }));
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, 'POST');
});

test('rejects unapproved origins', async () => {
  const response = await makeHandler()(event({
    headers: { authorization: 'Bearer valid-token', origin: 'https://evil.example' }
  }));
  assert.equal(response.statusCode, 403);
});

test('rejects missing or invalid bearer tokens', async () => {
  const response = await makeHandler()(event({ headers: { origin: 'https://fleetflow.example' } }));
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).error.code, 'unauthorized');
});

test('rejects non-empty and oversized bodies', async () => {
  assert.equal((await makeHandler()(event({ body: '{"role":"creator"}' }))).statusCode, 400);
  assert.equal((await makeHandler()(event({ body: 'x'.repeat(2049) }))).statusCode, 400);
});

test('preserves neutral identity failures', async () => {
  const response = await makeHandler({
    loadIdentity: async () => { throw new IdentityError('identity_inactive'); }
  })(event());
  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error.code, 'identity_inactive');
});

test('does not leak unexpected error details', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await makeHandler({
      loadIdentity: async () => { throw new Error('secret database details'); }
    })(event());
    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), {
      error: { code: 'internal_error', requestId: 'request-1' }
    });
  } finally {
    console.error = originalError;
  }
});

function firestore({ users = [], company = { exists: true, data: () => ({ active: true }) } } = {}) {
  return {
    collection(name) {
      if (name === 'ff_users') {
        return {
          where: () => ({
            limit: () => ({
              get: async () => ({
                empty: users.length === 0,
                size: users.length,
                docs: users
              })
            })
          })
        };
      }
      if (name === 'ff_company') return { doc: () => ({ get: async () => company }) };
      throw new Error(`Unexpected collection: ${name}`);
    }
  };
}

function userDoc(data) {
  return { id: 'joe', data: () => data };
}

test('loads active identity from the immutable uid mapping', async () => {
  const result = await loadFleetFlowIdentity(firestore({
    users: [userDoc({
      uid: 'uid-1',
      username: 'joe',
      displayName: 'Joe',
      active: true,
      companyId: 'jpg',
      role: 'creator',
      allowedRoles: ['creator', 'creator'],
      membershipVersion: 4
    })]
  }), { uid: 'uid-1' });

  assert.deepEqual(result, { ...identity, membershipVersion: 4 });
});

test('rejects missing, duplicate, inactive, and cross-role identity mappings', async () => {
  await assert.rejects(
    loadFleetFlowIdentity(firestore(), { uid: 'uid-1' }),
    (error) => error.code === 'identity_not_enrolled'
  );
  await assert.rejects(
    loadFleetFlowIdentity(firestore({ users: [userDoc({}), userDoc({})] }), { uid: 'uid-1' }),
    (error) => error.code === 'identity_mapping_conflict' && error.statusCode === 409
  );
  await assert.rejects(
    loadFleetFlowIdentity(firestore({ users: [userDoc({ active: false })] }), { uid: 'uid-1' }),
    (error) => error.code === 'identity_inactive'
  );
  await assert.rejects(
    loadFleetFlowIdentity(firestore({
      users: [userDoc({
        active: true,
        companyId: 'jpg',
        displayName: 'Joe',
        role: 'creator',
        allowedRoles: ['owner']
      })]
    }), { uid: 'uid-1' }),
    (error) => error.code === 'identity_role_invalid'
  );
});

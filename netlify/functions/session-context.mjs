import { randomUUID } from 'node:crypto';
import { getFirebaseAdmin } from './_shared/firebase-admin.mjs';
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  parseAllowedOrigins,
  readBearerToken,
  validateEmptyJsonBody
} from './_shared/http.mjs';
import { loadFleetFlowIdentity, IdentityError } from './_shared/load-fleetflow-identity.mjs';
import { verifyIdToken, AuthenticationError } from './_shared/verify-id-token.mjs';

export function createHandler({
  adminFactory = getFirebaseAdmin,
  verifyToken = verifyIdToken,
  loadIdentity = loadFleetFlowIdentity,
  createRequestId = randomUUID,
  env = process.env
} = {}) {
  return async function handler(event = {}) {
    const requestId = createRequestId();
    const origin = event.headers?.origin || event.headers?.Origin || '';
    const cors = corsHeaders(origin, parseAllowedOrigins(env.FLEETFLOW_ALLOWED_ORIGINS));

    if (cors === null) return errorResponse(403, 'origin_not_allowed', requestId);
    if (event.httpMethod !== 'POST') {
      return {
        ...errorResponse(405, 'method_not_allowed', requestId),
        headers: { ...errorResponse(405, 'method_not_allowed', requestId).headers, ...cors, allow: 'POST' }
      };
    }
    if (!validateEmptyJsonBody(event.body)) {
      return { ...errorResponse(400, 'invalid_request', requestId), headers: { ...errorResponse(400, 'invalid_request', requestId).headers, ...cors } };
    }

    try {
      const token = readBearerToken(event.headers);
      const { auth, db } = adminFactory(env);
      const decodedToken = await verifyToken(auth, token);
      const identity = await loadIdentity(db, decodedToken);
      return jsonResponse(200, { requestId, identity }, cors);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return { ...errorResponse(401, error.code, requestId), headers: { ...errorResponse(401, error.code, requestId).headers, ...cors } };
      }
      if (error instanceof IdentityError) {
        return { ...errorResponse(error.statusCode, error.code, requestId), headers: { ...errorResponse(error.statusCode, error.code, requestId).headers, ...cors } };
      }
      console.error('session-context failed', { requestId, errorName: error?.name || 'Error' });
      return { ...errorResponse(500, 'internal_error', requestId), headers: { ...errorResponse(500, 'internal_error', requestId).headers, ...cors } };
    }
  };
}

export const handler = createHandler();

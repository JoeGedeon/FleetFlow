const NO_STORE_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff'
};

export function jsonResponse(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: { ...NO_STORE_HEADERS, ...headers },
    body: JSON.stringify(payload)
  };
}

export function errorResponse(statusCode, code, requestId) {
  return jsonResponse(statusCode, {
    error: { code, requestId }
  });
}

export function readBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1] || null;
}

export function parseAllowedOrigins(value = '') {
  return new Set(value.split(',').map((origin) => origin.trim()).filter(Boolean));
}

export function corsHeaders(origin, allowedOrigins) {
  if (!origin) return {};
  if (!allowedOrigins.has(origin)) return null;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST',
    'access-control-allow-headers': 'Authorization, Content-Type',
    vary: 'Origin'
  };
}

export function validateEmptyJsonBody(body) {
  if (!body) return true;
  if (Buffer.byteLength(body, 'utf8') > 2048) return false;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && Object.keys(parsed).length === 0;
  } catch {
    return false;
  }
}

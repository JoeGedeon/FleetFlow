import { parse } from 'acorn';
import { createHash } from 'node:crypto';

export const NAV_MARKER = 'fleetflow-original-nav-stacking-fix-v2';
export const HEAD_EXTENSION_ANCHOR = '<!-- FLEETFLOW_BUILD_HEAD_EXTENSIONS -->';
export const LOGIN_REGION_START = '<div id="login-screen">';
export const LOGIN_REGION_END = '<!-- APP -->';
// SHA-256 of the login region in production blob
// 1a709a3965e394ff3e3873e3c514780e8c62b783. This must change only through an
// explicit protected-core review, never merely because index.html changed.
export const PRODUCTION_LOGIN_SHA256 = '1e51f30fc0cc2ebc82d208cac6af99b55dea2d033921de794efdd5c856895330';

export function requireExactlyOnce(document, value, label = value) {
  const count = document.split(value).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one ${label}; found ${count}.`);
  }
}

export function extractRegion(document, start, end, label) {
  requireExactlyOnce(document, start, `${label} start marker`);
  requireExactlyOnce(document, end, `${label} end marker`);
  const startIndex = document.indexOf(start);
  const endIndex = document.indexOf(end, startIndex);
  if (endIndex <= startIndex) throw new Error(`${label} markers are out of order.`);
  return document.slice(startIndex, endIndex);
}

export function assertLoginRegionUnchanged(source, generated) {
  const sourceLogin = extractRegion(source, LOGIN_REGION_START, LOGIN_REGION_END, 'login region');
  const generatedLogin = extractRegion(generated, LOGIN_REGION_START, LOGIN_REGION_END, 'login region');
  if (generatedLogin !== sourceLogin) {
    throw new Error('Generated login region is not byte-for-byte identical to index.html.');
  }
  for (const [label, login] of [['source', sourceLogin], ['generated', generatedLogin]]) {
    const digest = createHash('sha256').update(login).digest('hex');
    if (digest !== PRODUCTION_LOGIN_SHA256) {
      throw new Error(`${label} login region differs from the known-good production fingerprint.`);
    }
  }
}

export function validateGeneratedDocument(document, source) {
  if (!document.startsWith('<!DOCTYPE html>')) {
    throw new Error('Generated document does not begin with the HTML doctype.');
  }
  requireExactlyOnce(document, '<html lang="en">', 'root FleetFlow element');
  requireExactlyOnce(document, 'id="login-screen"', 'login screen');
  requireExactlyOnce(document, 'id="login-name"', 'login username control');
  requireExactlyOnce(document, 'function doLogin()', 'login entry point');
  requireExactlyOnce(document, NAV_MARKER, 'navigation build extension marker');

  if (!document.trimEnd().endsWith('</html>')) {
    throw new Error('Generated document does not end with </html>.');
  }
  if (/wednesday-observer|fleetflow-wednesday|src\/components\/Wednesday/i.test(document)) {
    throw new Error('Wednesday runtime reference reached the production document.');
  }

  let inlineScriptCount = 0;
  for (const match of document.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    inlineScriptCount += 1;
    parse(match[2], {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
    });
  }
  if (inlineScriptCount === 0) throw new Error('No inline FleetFlow runtime found.');
  if (source !== undefined) assertLoginRegionUnchanged(source, document);
}

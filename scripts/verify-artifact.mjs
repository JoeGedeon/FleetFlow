import { createHash } from 'node:crypto';
import fs from 'node:fs';
import {
  extractRegion,
  LOGIN_REGION_END,
  LOGIN_REGION_START,
  NAV_MARKER,
  PRODUCTION_LOGIN_SHA256,
  validateGeneratedDocument,
} from './build-validation.mjs';

const sourcePath = new URL('../index.html', import.meta.url);
const distPath = new URL('../dist/index.html', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const artifact = fs.readFileSync(distPath, 'utf8');

validateGeneratedDocument(artifact, source);

const login = extractRegion(artifact, LOGIN_REGION_START, LOGIN_REGION_END, 'artifact login region');
const loginSha256 = createHash('sha256').update(login).digest('hex');
const artifactSha256 = createHash('sha256').update(artifact).digest('hex');
const markerCount = artifact.split(NAV_MARKER).length - 1;
const wednesdayFeatureCount = [
  /wednesday-observer/gi,
  /fleetflow-wednesday/gi,
  /src\/components\/Wednesday/gi,
].reduce((count, pattern) => count + [...artifact.matchAll(pattern)].length, 0);

console.log(JSON.stringify({
  artifact: 'dist/index.html',
  artifactSha256,
  extensionMarkerCount: markerCount,
  loginSha256,
  approvedLoginSha256: PRODUCTION_LOGIN_SHA256,
  wednesdayFeatureRuntimeReferences: wednesdayFeatureCount,
}, null, 2));

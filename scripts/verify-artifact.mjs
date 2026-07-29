import { createHash } from 'node:crypto';
import fs from 'node:fs';
import {
  extractRegion,
  EXTENSION_MARKER,
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
const extensionLoaderCount = artifact.split(EXTENSION_MARKER).length - 1;
const wednesdayPath = new URL('../dist/extensions/wednesday-onboarding.js', import.meta.url);
if (!fs.existsSync(wednesdayPath)) throw new Error('Wednesday extension module is missing from the artifact.');
const wednesdaySha256 = createHash('sha256').update(fs.readFileSync(wednesdayPath)).digest('hex');

console.log(JSON.stringify({
  artifact: 'dist/index.html',
  artifactSha256,
  navigationMarkerCount: markerCount,
  extensionLoaderCount,
  loginSha256,
  approvedLoginSha256: PRODUCTION_LOGIN_SHA256,
  wednesdayModule: 'dist/extensions/wednesday-onboarding.js',
  wednesdaySha256,
}, null, 2));

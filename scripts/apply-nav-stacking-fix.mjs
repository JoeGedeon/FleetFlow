import fs from 'node:fs';
import {
  HEAD_EXTENSION_ANCHOR,
  NAV_MARKER,
  requireExactlyOnce,
  validateGeneratedDocument,
} from './build-validation.mjs';

const sourcePath = new URL('../index.html', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const distIndexPath = new URL('../dist/index.html', import.meta.url);
const marker = NAV_MARKER;
const insertionAnchor = HEAD_EXTENSION_ANCHOR;

const sourceHtml = fs.readFileSync(sourcePath, 'utf8');
let html = sourceHtml;

requireExactlyOnce(sourceHtml, insertionAnchor, 'head extension anchor');

if (!html.includes(marker)) {
  const patch = `
<style id="${marker}">
  /*
   * Preserve the original navigation contract:
   * - dropdown coordinates are calculated from getBoundingClientRect()
   * - dropdowns therefore remain viewport-relative (position: fixed)
   * - nav groups remain non-positioning ancestors (position: static)
   */
  .topbar {
    z-index: 5000 !important;
    overflow: visible !important;
  }

  .tabs,
  #tabs-container,
  .nav-bar {
    z-index: 4500 !important;
    overflow: visible !important;
  }

  .nav-group {
    position: static !important;
    z-index: auto !important;
    overflow: visible !important;
  }

  .nav-dropdown {
    position: fixed !important;
    z-index: 6000 !important;
  }

  .main-content,
  .content,
  main,
  .page,
  .dashboard,
  .dashboard-content {
    position: relative;
    z-index: 1 !important;
  }

  @media (hover: none), (pointer: coarse), (max-width: 1180px) {
    .tabs,
    #tabs-container,
    .nav-bar {
      overflow: visible !important;
    }

    .nav-group {
      position: static !important;
    }

    .nav-dropdown {
      position: fixed !important;
      z-index: 6000 !important;
    }
  }
</style>
`;

  html = html.replace(insertionAnchor, `${insertionAnchor}${patch}`);
  console.log('Injected original navigation coordinate-system fix.');
} else {
  console.log('Original navigation coordinate-system fix already present.');
}

validateGeneratedDocument(html, sourceHtml);

// Building must never modify the authoritative production monolith.
if (fs.readFileSync(sourcePath, 'utf8') !== sourceHtml) {
  throw new Error('index.html changed during assembly; refusing to publish.');
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(distIndexPath, html);
validateGeneratedDocument(fs.readFileSync(distIndexPath, 'utf8'), sourceHtml);
console.log('Validated and staged patched legacy FleetFlow index.html in dist/.');

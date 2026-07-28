import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const sourcePath = new URL('../index.html', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const distIndexPath = new URL('../dist/index.html', import.meta.url);
const marker = 'fleetflow-original-nav-stacking-fix-v2';

let html = fs.readFileSync(sourcePath, 'utf8');

// Resolve `// LEGACY_EXTRACT: <path>` markers left by the ongoing legacy
// decomposition (see docs/legacy-app-map.md): index.html keeps the extracted
// source out of the monolith for readability/review, and the build splices
// each file's content back into the same inline <script> block it always
// occupied, wrapped in BEGIN/END markers. This is invisible to the browser —
// dist/index.html still ships one script block, identical apart from the
// two marker comment lines per extraction.
const extractRe = /^\/\/ LEGACY_EXTRACT: (.+)$/gm;
html = html.replace(extractRe, (full, relPath) => {
  const filePath = path.join(repoRoot, relPath.trim());
  const content = fs.readFileSync(filePath, 'utf8');
  return `/* ===== BEGIN ${relPath.trim()} ===== */\n${content}/* ===== END ${relPath.trim()} ===== */`;
});

if (!html.includes(marker)) {
  const patch = `
<!-- ${marker} -->
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

  if (!html.includes('</head>')) {
    throw new Error('index.html is missing </head>; refusing to patch.');
  }

  html = html.replace('</head>', `${patch}\n</head>`);
  console.log('Injected original navigation coordinate-system fix.');
} else {
  console.log('Original navigation coordinate-system fix already present.');
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(distIndexPath, html);
console.log('Staged patched legacy FleetFlow index.html in dist/.');

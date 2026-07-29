import fs from 'node:fs';

const sourcePath = new URL('../index.html', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const distAssetsDir = new URL('../dist/assets/', import.meta.url);
const distIndexPath = new URL('../dist/index.html', import.meta.url);
const extensionsSource = new URL('../assets/operational-extensions.js', import.meta.url);
const extensionsDist = new URL('../dist/assets/operational-extensions.js', import.meta.url);
const marker = 'fleetflow-original-nav-stacking-fix-v2';
const extensionsMarker = 'fleetflow-operational-extensions-v1';

let html = fs.readFileSync(sourcePath, 'utf8');

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

if (!fs.existsSync(extensionsSource)) {
  throw new Error('assets/operational-extensions.js is missing; refusing to stage an incomplete deploy.');
}

if (!html.includes(extensionsMarker)) {
  if (!html.includes('</body>')) {
    throw new Error('index.html is missing </body>; refusing to attach operational extensions.');
  }

  const scriptTag = `\n<!-- ${extensionsMarker} -->\n<script defer src="/assets/operational-extensions.js"></script>\n`;
  html = html.replace('</body>', `${scriptTag}</body>`);
  console.log('Attached isolated post-login operational extensions.');
} else {
  console.log('Operational extensions already attached.');
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distAssetsDir, { recursive: true });
fs.writeFileSync(distIndexPath, html);
fs.copyFileSync(extensionsSource, extensionsDist);
console.log('Staged FleetFlow with isolated upload entrances and Wednesday observer in dist/.');

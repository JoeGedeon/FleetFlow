import fs from 'node:fs';

const sourcePath = new URL('../index.html', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const distIndexPath = new URL('../dist/index.html', import.meta.url);
const wednesdayCssSource = new URL('../assets/wednesday.css', import.meta.url);
const wednesdayJsSource = new URL('../assets/wednesday.js', import.meta.url);
const wednesdayCssDist = new URL('../dist/wednesday.css', import.meta.url);
const wednesdayJsDist = new URL('../dist/wednesday.js', import.meta.url);
const marker = 'fleetflow-original-nav-stacking-fix-v2';
const wednesdayMarker = 'fleetflow-wednesday-safe-runtime-v2';

let html = fs.readFileSync(sourcePath, 'utf8');

if (!html.includes(marker)) {
  const patch = `
<!-- ${marker} -->
<style id="${marker}">
  .topbar { z-index: 5000 !important; overflow: visible !important; }
  .tabs, #tabs-container, .nav-bar { z-index: 4500 !important; overflow: visible !important; }
  .nav-group { position: static !important; z-index: auto !important; overflow: visible !important; }
  .nav-dropdown { position: fixed !important; z-index: 6000 !important; }
  .main-content, .content, main, .page, .dashboard, .dashboard-content {
    position: relative;
    z-index: 1 !important;
  }
  @media (hover: none), (pointer: coarse), (max-width: 1180px) {
    .tabs, #tabs-container, .nav-bar { overflow: visible !important; }
    .nav-group { position: static !important; }
    .nav-dropdown { position: fixed !important; z-index: 6000 !important; }
  }
</style>
`;
  if (!html.includes('</head>')) throw new Error('index.html is missing </head>; refusing to patch.');
  html = html.replace('</head>', `${patch}\n</head>`);
  console.log('Injected original navigation coordinate-system fix.');
} else {
  console.log('Original navigation coordinate-system fix already present.');
}

if (!html.includes(wednesdayMarker)) {
  if (!html.includes('</head>') || !html.includes('</body>')) {
    throw new Error('index.html is missing required closing tags; refusing to attach Wednesday.');
  }
  html = html.replace('</head>', `<link rel="stylesheet" href="/wednesday.css" data-feature="${wednesdayMarker}">\n</head>`);
  html = html.replace('</body>', `<script src="/wednesday.js" defer data-feature="${wednesdayMarker}"></script>\n</body>`);
  console.log('Attached isolated Wednesday assets.');
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(distIndexPath, html);
fs.copyFileSync(wednesdayCssSource, wednesdayCssDist);
fs.copyFileSync(wednesdayJsSource, wednesdayJsDist);
console.log('Staged patched legacy FleetFlow and isolated Wednesday assets in dist/.');

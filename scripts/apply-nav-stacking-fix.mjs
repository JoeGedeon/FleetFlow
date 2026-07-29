import fs from 'node:fs';

const sourcePath = new URL('../index.html', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const distIndexPath = new URL('../dist/index.html', import.meta.url);
const marker = 'fleetflow-original-nav-stacking-fix-v2';

let html = fs.readFileSync(sourcePath, 'utf8');

const brokenLoadSheetRowsPattern = /\$\{jobs\.map\(\(j,i\)=>`[\s\S]*?<\/tr>`\)\.join\(''\)\}/;
const fixedLoadSheetRows = `\${jobs.map((j,i)=>[
  '<tr>',
  '<td>' + (i + 1) + '</td>',
  '<td><strong>' + (j.jobId || j.refNum || '—') + '</strong></td>',
  '<td>' + (j.client || '—') + '</td>',
  '<td>' + (j.origin || '—') + '</td>',
  '<td>' + (j.dest || '—') + '</td>',
  '<td style="text-align:right">' + (j.cubicFt || '—') + '</td>',
  '<td style="text-align:right">' + (j.weight || '—') + '</td>',
  '<td style="text-align:center">' + (j.loaded ? '✓' : '') + '</td>',
  '</tr>'
].join('')).join('')}`;

if (!brokenLoadSheetRowsPattern.test(html)) {
  throw new Error('Broken load-sheet row template was not found; refusing to stage an unverified syntax repair.');
}
html = html.replace(brokenLoadSheetRowsPattern, fixedLoadSheetRows);
console.log('Repaired nested load-sheet template literal in deployed HTML.');

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
fs.copyFileSync(wednesdayCssSource, wednesdayCssDist);
fs.copyFileSync(wednesdayJsSource, wednesdayJsDist);
fs.copyFileSync(startupWatchdogSource, startupWatchdogDist);
console.log('Staged patched legacy FleetFlow with syntax repair, inline startup recovery, and Wednesday observer assets in dist/.');
console.log('Staged patched legacy FleetFlow index.html in dist/.');

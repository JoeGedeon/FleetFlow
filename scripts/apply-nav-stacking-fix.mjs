import fs from 'node:fs';

const sourcePath = new URL('../index.html', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const distIndexPath = new URL('../dist/index.html', import.meta.url);
const marker = 'fleetflow-original-nav-stacking-fix-v2';
const uploadEntrancesMarker = 'fleetflow-global-upload-entrances-v1';

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

if (!html.includes(uploadEntrancesMarker)) {
  const uploadEntrances = `
<!-- ${uploadEntrancesMarker} -->
<script id="${uploadEntrancesMarker}">
(function () {
  'use strict';

  var allowedRoles = ['CREATOR', 'OWNER', 'OFFICE'];

  function textOf(node) {
    return String(node && node.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function roleCanUpload() {
    var pageText = textOf(document.body);
    return allowedRoles.some(function (role) {
      return pageText.indexOf(role) !== -1;
    });
  }

  function makeUploadButton(id) {
    var button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'btn secondary';
    button.textContent = '📎 UPLOAD FILES';
    button.setAttribute('onclick', 'openDocumentsModal(null)');
    button.setAttribute('aria-label', 'Upload operational documents');
    button.style.marginLeft = '8px';
    button.style.whiteSpace = 'nowrap';
    return button;
  }

  function insertAfter(anchor, button) {
    if (!anchor || !anchor.parentNode || document.getElementById(button.id)) return;
    anchor.parentNode.insertBefore(button, anchor.nextSibling);
  }

  function ensureUploadEntrances() {
    if (!roleCanUpload()) return;
    if (typeof window.openDocumentsModal !== 'function') return;

    var actions = Array.prototype.slice.call(document.querySelectorAll('button, a'));

    var dashboardAnchor = actions.find(function (node) {
      var label = textOf(node).replace(/^\\+\\s*/, '');
      return label === 'ADD JOB';
    });
    if (dashboardAnchor) {
      insertAfter(dashboardAnchor, makeUploadButton('dashboard-upload-files-btn'));
    }

    var calendarAnchor = actions.find(function (node) {
      var label = textOf(node).replace(/^\\+\\s*/, '');
      return label === 'RECEIPT';
    });
    if (calendarAnchor) {
      insertAfter(calendarAnchor, makeUploadButton('calendar-upload-files-btn'));
    }
  }

  var scheduled = false;
  function scheduleEnsure() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      ensureUploadEntrances();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnsure, { once: true });
  } else {
    scheduleEnsure();
  }

  window.addEventListener('load', scheduleEnsure, { once: true });

  var observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
`;

  if (!html.includes('</body>')) {
    throw new Error('index.html is missing </body>; refusing to add upload entrances.');
  }

  html = html.replace('</body>', `${uploadEntrances}\n</body>`);
  console.log('Injected Dashboard and Calendar upload entrances.');
} else {
  console.log('Dashboard and Calendar upload entrances already present.');
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(distIndexPath, html);
console.log('Staged patched legacy FleetFlow index.html in dist/.');

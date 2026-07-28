import fs from 'node:fs';

const path = new URL('../index.html', import.meta.url);
let html = fs.readFileSync(path, 'utf8');
const marker = 'fleetflow-original-nav-stacking-fix-v1';

if (html.includes(marker)) {
  console.log('Original navigation stacking fix already present.');
  process.exit(0);
}

const patch = `
<!-- ${marker} -->
<style id="${marker}">
  /* Preserve the original FleetFlow dropdown behavior. Only correct its paint order. */
  .topbar {
    z-index: 5000 !important;
    overflow: visible !important;
  }

  nav,
  .nav,
  .nav-bar,
  .nav-shell,
  .nav-container,
  .nav-row,
  .nav-groups,
  .nav-group,
  .nav-item {
    position: relative;
    z-index: 4500 !important;
    overflow: visible !important;
  }

  .nav-dropdown,
  .dropdown,
  .dropdown-menu,
  .submenu,
  .sub-menu,
  [class*="nav-dropdown"],
  [class*="dropdown-menu"],
  [class*="submenu"] {
    z-index: 6000 !important;
    isolation: isolate;
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
    .topbar,
    nav,
    .nav,
    .nav-bar,
    .nav-shell,
    .nav-container,
    .nav-row,
    .nav-groups,
    .nav-group,
    .nav-item {
      overflow: visible !important;
    }

    .nav-dropdown,
    .dropdown,
    .dropdown-menu,
    .submenu,
    .sub-menu,
    [class*="nav-dropdown"],
    [class*="dropdown-menu"],
    [class*="submenu"] {
      position: absolute !important;
      z-index: 6000 !important;
    }
  }
</style>
`;

if (!html.includes('</head>')) {
  throw new Error('index.html is missing </head>; refusing to patch.');
}

html = html.replace('</head>', `${patch}\n</head>`);
fs.writeFileSync(path, html);
console.log('Injected original navigation stacking fix.');

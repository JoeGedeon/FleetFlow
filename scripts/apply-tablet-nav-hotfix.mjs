import fs from 'node:fs';

const path = new URL('../index.html', import.meta.url);
let html = fs.readFileSync(path, 'utf8');

const marker = 'fleetflow-tablet-nav-hotfix-v1';
if (html.includes(marker)) {
  console.log('Tablet navigation hotfix already present.');
  process.exit(0);
}

const patch = String.raw`
<!-- ${marker} -->
<style id="${marker}-styles">
  @media (hover: none), (pointer: coarse), (max-width: 1180px) {
    .topbar,
    nav,
    [class*="nav"],
    [class*="menu"] {
      overflow: visible !important;
    }

    .topbar { z-index: 9000 !important; }

    .ff-touch-menu-tray {
      position: fixed !important;
      left: max(12px, env(safe-area-inset-left)) !important;
      right: max(12px, env(safe-area-inset-right)) !important;
      top: var(--ff-touch-menu-top, 116px) !important;
      z-index: 10050 !important;
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
      gap: 1px !important;
      max-height: min(62vh, 520px) !important;
      overflow: auto !important;
      padding: 8px !important;
      background: var(--navy2, #0d1f3c) !important;
      border: 1px solid var(--green3, #008822) !important;
      border-radius: 4px !important;
      box-shadow: 0 18px 48px rgba(0,0,0,.5) !important;
      -webkit-overflow-scrolling: touch !important;
    }

    .ff-touch-menu-tray > * {
      position: static !important;
      inset: auto !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      transform: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }

    .ff-touch-menu-tray button,
    .ff-touch-menu-tray a,
    .ff-touch-menu-tray [role="menuitem"] {
      min-height: 48px !important;
      width: 100% !important;
      display: flex !important;
      align-items: center !important;
      padding: 12px 14px !important;
      touch-action: manipulation !important;
    }
  }
</style>
<script id="${marker}-script">
(() => {
  const topLabels = new Set(['COMMAND', 'JOBS', 'MONEY', 'TEAM', 'SYSTEM']);
  const coarse = () => window.matchMedia('(hover: none), (pointer: coarse), (max-width: 1180px)').matches;
  let tray = null;
  let restore = [];

  const textOf = element => (element?.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const isVisible = element => {
    if (!element || element.closest('.ff-touch-menu-tray')) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0 && rect.width > 0 && rect.height > 0;
  };

  function closeTray() {
    if (!tray) return;
    restore.reverse().forEach(({ element, parent, next }) => {
      if (!element || !parent) return;
      parent.insertBefore(element, next && next.parentNode === parent ? next : null);
    });
    restore = [];
    tray.remove();
    tray = null;
  }

  function findMenuItems(trigger) {
    const triggerRect = trigger.getBoundingClientRect();
    const candidates = [...document.querySelectorAll('button, a, [role="menuitem"], [onclick]')]
      .filter(element => element !== trigger && isVisible(element))
      .filter(element => !topLabels.has(textOf(element)))
      .filter(element => {
        const rect = element.getBoundingClientRect();
        const nearNav = rect.top < triggerRect.bottom + 130 && rect.bottom > triggerRect.top - 12;
        const menuSized = rect.width >= 90 && rect.height >= 28;
        return nearNav && menuSized;
      });

    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
      const key = `${textOf(candidate)}:${Math.round(candidate.getBoundingClientRect().left)}`;
      if (!textOf(candidate) || seen.has(key)) continue;
      seen.add(key);
      unique.push(candidate);
    }
    return unique;
  }

  function openTray(trigger) {
    closeTray();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const items = findMenuItems(trigger);
      if (!items.length) return;

      tray = document.createElement('div');
      tray.className = 'ff-touch-menu-tray';
      tray.setAttribute('role', 'menu');
      const navBottom = Math.max(trigger.getBoundingClientRect().bottom, 96);
      tray.style.setProperty('--ff-touch-menu-top', `${Math.min(navBottom + 4, window.innerHeight - 120)}px`);

      for (const element of items) {
        restore.push({ element, parent: element.parentNode, next: element.nextSibling });
        tray.appendChild(element);
      }
      document.body.appendChild(tray);

      tray.addEventListener('click', event => {
        if (event.target.closest('button, a, [role="menuitem"], [onclick]')) {
          setTimeout(closeTray, 0);
        }
      });
    }));
  }

  document.addEventListener('click', event => {
    if (!coarse()) return;
    const trigger = event.target.closest('button, a, [role="button"], [onclick]');
    if (!trigger) {
      if (tray && !event.target.closest('.ff-touch-menu-tray')) closeTray();
      return;
    }

    const label = textOf(trigger).replace(/[▾▼⌄]/g, '').trim();
    if (topLabels.has(label)) {
      setTimeout(() => openTray(trigger), 20);
      return;
    }

    if (tray && !event.target.closest('.ff-touch-menu-tray')) closeTray();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeTray();
  });

  window.addEventListener('resize', closeTray, { passive: true });
  window.addEventListener('orientationchange', closeTray, { passive: true });
})();
</script>
`;

if (!html.includes('</body>')) {
  throw new Error('index.html is missing </body>; refusing to patch.');
}

html = html.replace('</body>', `${patch}\n</body>`);
fs.writeFileSync(path, html);
console.log('Injected FleetFlow tablet navigation hotfix.');

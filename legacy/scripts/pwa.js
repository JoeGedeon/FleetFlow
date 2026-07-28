// ============================================================
// PWA — SPLASH, INSTALL PROMPT, SERVICE WORKER
// ============================================================

// Dismiss splash after load — non-blocking, login can appear behind it
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('pwa-splash');
    if (splash) {
      splash.style.transition = 'opacity 0.4s';
      splash.style.opacity = '0';
      setTimeout(() => { if (splash.parentNode) splash.remove(); }, 400);
    }
  }, 1200); // Reduced from 1800ms — faster to login
});

// Install prompt (Android Chrome / Edge)
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.style.display = 'flex';
    setTimeout(() => banner.classList.add('show'), 100);
  }
});

async function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  dismissInstall();
  if (result.outcome === 'accepted') notify('FleetFlow installed ✓');
}

function dismissInstall() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => banner.style.display = 'none', 400);
  }
}


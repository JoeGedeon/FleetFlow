(() => {
  'use strict';

  if (window.__fleetFlowStartupWatchdogLoaded) return;
  window.__fleetFlowStartupWatchdogLoaded = true;

  const STARTED_AT = Date.now();
  const SOFT_TIMEOUT_MS = 8000;
  const HARD_TIMEOUT_MS = 15000;
  const POLL_MS = 250;
  let recovered = false;
  let intervalId = null;
  let firstStartupError = '';

  window.addEventListener('error', event => {
    if (!firstStartupError) firstStartupError = event.message || 'Unknown script error';
  }, true);

  window.addEventListener('unhandledrejection', event => {
    if (!firstStartupError) {
      const reason = event.reason;
      firstStartupError = reason?.message || String(reason || 'Unhandled promise rejection');
    }
  });

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || 1) !== 0
      && rect.width > 0
      && rect.height > 0;
  }

  function findSplash() {
    return document.getElementById('pwa-splash')
      || document.getElementById('splash-screen')
      || document.getElementById('splash')
      || document.querySelector('.splash-screen')
      || document.querySelector('[data-splash]');
  }

  function findLogin() {
    return document.getElementById('login-screen');
  }

  function findApp() {
    return document.getElementById('app');
  }

  function suppressSplashPermanently() {
    const removeSplash = () => {
      const splash = findSplash();
      if (splash) splash.remove();
    };

    removeSplash();
    const observer = new MutationObserver(removeSplash);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 60000);
  }

  function ensureStatusMessage(message) {
    const login = findLogin();
    if (!login) return;
    const host = login.querySelector('.login-box') || login;
    let notice = document.getElementById('fleetflow-startup-watchdog-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'fleetflow-startup-watchdog-notice';
      notice.setAttribute('role', 'status');
      notice.style.cssText = [
        'margin-top:16px',
        'padding:10px 12px',
        'border:1px solid rgba(255,170,0,.55)',
        'background:rgba(255,170,0,.08)',
        'color:#ffaa00',
        'font:12px/1.45 monospace',
        'letter-spacing:.4px',
        'text-align:left',
        'position:relative',
        'z-index:2147483647'
      ].join(';');
      host.appendChild(notice);
    }
    notice.textContent = message;
  }

  function revealLogin(reason) {
    if (recovered) return;
    const login = findLogin();
    const app = findApp();

    if (isVisible(app)) {
      suppressSplashPermanently();
      recovered = true;
      return;
    }

    if (!login) return;

    suppressSplashPermanently();
    login.style.cssText += ';display:flex !important;visibility:visible !important;opacity:1 !important;position:fixed !important;inset:0 !important;z-index:2147483646 !important;';
    login.removeAttribute('aria-hidden');

    const firebaseReady = typeof window.firebase !== 'undefined';
    const detail = firstStartupError ? ` First error: ${firstStartupError}` : '';
    ensureStatusMessage(
      firebaseReady
        ? `FleetFlow startup stalled. Login was restored in recovery mode.${detail}`
        : `FleetFlow could not finish loading an external service.${detail}`
    );

    console.error('[FleetFlow startup watchdog] Entered terminal recovery mode.', {
      reason,
      elapsedMs: Date.now() - STARTED_AT,
      readyState: document.readyState,
      firebaseReady,
      firstStartupError,
      appVisible: isVisible(app),
      loginVisible: isVisible(login)
    });
    recovered = true;
  }

  function inspectStartup() {
    const login = findLogin();
    const app = findApp();

    if (isVisible(app) || isVisible(login)) {
      suppressSplashPermanently();
      recovered = true;
      if (intervalId) window.clearInterval(intervalId);
      return;
    }

    const elapsed = Date.now() - STARTED_AT;
    if (elapsed >= HARD_TIMEOUT_MS) {
      revealLogin('hard-timeout');
      if (intervalId) window.clearInterval(intervalId);
      return;
    }

    if (elapsed >= SOFT_TIMEOUT_MS && findSplash() && isVisible(findSplash())) {
      revealLogin('visible-splash-timeout');
      if (intervalId) window.clearInterval(intervalId);
    }
  }

  function start() {
    inspectStartup();
    if (!recovered) intervalId = window.setInterval(inspectStartup, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('load', inspectStartup, { once: true });
})();

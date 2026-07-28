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
    return document.getElementById('splash-screen')
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
        'text-align:left'
      ].join(';');
      host.appendChild(notice);
    }
    notice.textContent = message;
  }

  function revealLogin(reason) {
    if (recovered) return;
    const splash = findSplash();
    const login = findLogin();
    const app = findApp();

    if (isVisible(app)) {
      if (splash) splash.style.display = 'none';
      recovered = true;
      return;
    }

    if (!login) return;

    if (splash) {
      splash.style.display = 'none';
      splash.setAttribute('aria-hidden', 'true');
    }
    login.style.display = 'flex';
    login.style.visibility = 'visible';
    login.removeAttribute('aria-hidden');

    const firebaseReady = typeof window.firebase !== 'undefined';
    ensureStatusMessage(
      firebaseReady
        ? 'FleetFlow startup took too long. The login screen was restored safely. You may sign in or refresh once.'
        : 'FleetFlow could not finish loading an external service. Check the connection, then refresh once.'
    );

    console.error('[FleetFlow startup watchdog] Recovered from stalled splash screen.', {
      reason,
      elapsedMs: Date.now() - STARTED_AT,
      readyState: document.readyState,
      firebaseReady,
      appVisible: isVisible(app),
      loginVisible: isVisible(login)
    });
    recovered = true;
  }

  function inspectStartup() {
    const splash = findSplash();
    const login = findLogin();
    const app = findApp();

    if (isVisible(app) || isVisible(login)) {
      if (splash && isVisible(splash)) splash.style.display = 'none';
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

    if (elapsed >= SOFT_TIMEOUT_MS && splash && isVisible(splash)) {
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

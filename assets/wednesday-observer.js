(() => {
  'use strict';

  try {
    if (window.__fleetFlowWednesdayObserverLoaded) return;
    window.__fleetFlowWednesdayObserverLoaded = true;

    let launcher = null;
    let panel = null;
    let lastSignature = '';

    function appIsVisible() {
      const app = document.getElementById('app');
      if (!app) return false;
      const style = window.getComputedStyle(app);
      const rect = app.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }

    function getSnapshot() {
      if (!appIsVisible()) return null;
      if (typeof STATE === 'undefined' || !STATE) return null;
      if (typeof currentUser === 'undefined' || !currentUser) return null;

      const jobs = Array.isArray(STATE.jobs) ? STATE.jobs : [];
      const documents = Array.isArray(STATE.documents) ? STATE.documents : [];
      const today = new Date().toISOString().slice(0, 10);
      const completed = jobs.filter(job => String(job.status || '').toLowerCase() === 'completed');
      const unassigned = documents.filter(doc => !doc.jobId);
      const otherCategory = documents.filter(doc => !doc.category || doc.category === 'other');
      const uploadedToday = documents.filter(doc => String(doc.uploadedAt || '').slice(0, 10) === today);
      const linkedJobIds = new Set(documents.map(doc => doc.jobId).filter(Boolean));
      const completedWithoutDocuments = completed.filter(job => !linkedJobIds.has(job.id));

      return {
        jobs,
        documents,
        completed,
        unassigned,
        otherCategory,
        uploadedToday,
        completedWithoutDocuments
      };
    }

    function buildAlerts(snapshot) {
      const alerts = [];

      if (snapshot.unassigned.length) {
        alerts.push({
          level: 'warn',
          icon: '📥',
          title: `${snapshot.unassigned.length} document${snapshot.unassigned.length === 1 ? '' : 's'} awaiting a job`,
          detail: 'Uploaded through the global intake and not yet linked.'
        });
      }

      if (snapshot.otherCategory.length) {
        alerts.push({
          level: 'warn',
          icon: '🗂️',
          title: `${snapshot.otherCategory.length} document${snapshot.otherCategory.length === 1 ? '' : 's'} need classification review`,
          detail: 'Category is missing or currently filed as Other.'
        });
      }

      if (snapshot.completedWithoutDocuments.length) {
        alerts.push({
          level: 'warn',
          icon: '⚠️',
          title: `${snapshot.completedWithoutDocuments.length} completed job${snapshot.completedWithoutDocuments.length === 1 ? '' : 's'} have no linked documents`,
          detail: 'Review closeout paperwork before the weekly reconciliation.'
        });
      }

      if (snapshot.uploadedToday.length) {
        alerts.push({
          level: 'ok',
          icon: '✓',
          title: `${snapshot.uploadedToday.length} document${snapshot.uploadedToday.length === 1 ? '' : 's'} received today`,
          detail: 'Wednesday is observing the intake stream in read-only mode.'
        });
      }

      if (!alerts.length) {
        alerts.push({
          level: 'ok',
          icon: '●',
          title: 'No document exceptions detected',
          detail: 'FleetFlow is running and Wednesday is observing quietly.'
        });
      }

      return alerts.slice(0, 6);
    }

    function render(snapshot) {
      if (!panel || !snapshot) return;

      const signature = JSON.stringify({
        jobs: snapshot.jobs.length,
        documents: snapshot.documents.length,
        unassigned: snapshot.unassigned.length,
        other: snapshot.otherCategory.length,
        today: snapshot.uploadedToday.length,
        completedWithoutDocuments: snapshot.completedWithoutDocuments.length
      });
      if (signature === lastSignature) return;
      lastSignature = signature;

      const alerts = buildAlerts(snapshot);
      panel.querySelector('.ff-wed-body').innerHTML = `
        <div class="ff-wed-summary">
          <div class="ff-wed-stat"><b>${snapshot.jobs.length}</b><span>Jobs</span></div>
          <div class="ff-wed-stat"><b>${snapshot.documents.length}</b><span>Documents</span></div>
          <div class="ff-wed-stat"><b>${snapshot.unassigned.length}</b><span>Unassigned</span></div>
        </div>
        <div class="ff-wed-section-title">Operational attention</div>
        ${alerts.map(alert => `
          <div class="ff-wed-alert" data-level="${alert.level}">
            <div class="ff-wed-icon">${alert.icon}</div>
            <div class="ff-wed-copy"><strong>${alert.title}</strong><small>${alert.detail}</small></div>
          </div>
        `).join('')}
      `;
    }

    function syncVisibility() {
      const snapshot = getSnapshot();
      const visible = Boolean(snapshot);
      if (launcher) launcher.style.display = visible ? 'grid' : 'none';
      if (!visible && panel) panel.classList.remove('ff-open');
      if (visible) render(snapshot);
    }

    function mount() {
      if (document.getElementById('ff-wednesday-launcher')) return;

      launcher = document.createElement('button');
      launcher.id = 'ff-wednesday-launcher';
      launcher.type = 'button';
      launcher.textContent = 'W';
      launcher.setAttribute('aria-label', 'Open Wednesday observer');

      panel = document.createElement('aside');
      panel.id = 'ff-wednesday-panel';
      panel.setAttribute('aria-label', 'Wednesday operational observer');
      panel.innerHTML = `
        <div class="ff-wed-head">
          <div class="ff-wed-title">
            <div class="ff-wed-mark">W</div>
            <div><div class="ff-wed-name">WEDNESDAY</div><div class="ff-wed-mode">OBSERVING · READ ONLY</div></div>
          </div>
          <button class="ff-wed-close" type="button" aria-label="Close Wednesday">×</button>
        </div>
        <div class="ff-wed-body"></div>
        <div class="ff-wed-foot">No writes · No automation · Human approval remains required</div>
      `;

      document.body.append(launcher, panel);
      launcher.addEventListener('click', () => {
        panel.classList.toggle('ff-open');
        const snapshot = getSnapshot();
        if (snapshot) render(snapshot);
      });
      panel.querySelector('.ff-wed-close').addEventListener('click', () => panel.classList.remove('ff-open'));

      syncVisibility();
      window.setInterval(syncVisibility, 1500);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
      mount();
    }
  } catch (error) {
    console.error('Wednesday failed safely without blocking FleetFlow', error);
  }
})();

(() => {
  'use strict';

  if (window.__fleetFlowOperationalExtensionsLoaded) return;
  window.__fleetFlowOperationalExtensionsLoaded = true;

  const logFailure = (error) => console.error('FleetFlow operational extensions failed safely', error);

  try {
    const style = document.createElement('style');
    style.textContent = `
      .ff-op-upload-btn{margin-left:8px;white-space:nowrap}
      #ff-wednesday-launcher{position:fixed;right:18px;bottom:18px;width:48px;height:48px;border-radius:50%;border:1px solid currentColor;display:none;place-items:center;z-index:7000;cursor:pointer;font-weight:700;background:#10151d;color:#77ff77}
      #ff-wednesday-panel{position:fixed;right:18px;bottom:78px;width:min(390px,calc(100vw - 36px));max-height:70vh;overflow:auto;z-index:6999;transform:translateY(16px);opacity:0;pointer-events:none;transition:.18s ease;border:1px solid #3a4655;background:#10151d;color:#f4f7fb;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      #ff-wednesday-panel.ff-open{transform:translateY(0);opacity:1;pointer-events:auto}
      .ff-wed-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border-bottom:1px solid #3a4655}
      .ff-wed-title{display:flex;align-items:center;gap:10px}.ff-wed-mark{width:34px;height:34px;display:grid;place-items:center;border:1px solid currentColor;border-radius:50%}
      .ff-wed-name{font-weight:700;letter-spacing:.12em}.ff-wed-mode{font-size:11px;opacity:.65}.ff-wed-close{border:0;background:transparent;color:inherit;font-size:24px;cursor:pointer}
      .ff-wed-body{padding:14px}.ff-wed-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.ff-wed-stat{padding:10px;border:1px solid #3a4655;text-align:center}.ff-wed-stat b,.ff-wed-stat span{display:block}.ff-wed-stat span{font-size:11px;opacity:.65}
      .ff-wed-section-title{margin:10px 0 8px;font-size:12px;letter-spacing:.1em;opacity:.7}.ff-wed-alert{display:grid;grid-template-columns:28px 1fr;gap:10px;padding:10px 0;border-top:1px solid #3a4655}.ff-wed-copy strong,.ff-wed-copy small{display:block}.ff-wed-copy small{margin-top:3px;opacity:.7}.ff-wed-foot{padding:10px 14px;border-top:1px solid #3a4655;font-size:11px;opacity:.65}
    `;
    document.head.appendChild(style);

    const textOf = (node) => String(node?.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();

    function appIsVisible() {
      const app = document.getElementById('app');
      if (!app) return false;
      const css = getComputedStyle(app);
      const rect = app.getBoundingClientRect();
      return css.display !== 'none' && css.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }

    function canUpload() {
      if (!appIsVisible() || typeof window.openDocumentsModal !== 'function') return false;
      const body = textOf(document.body);
      return ['CREATOR','OWNER','OFFICE'].some((role) => body.includes(role));
    }

    function makeUploadButton(id, label = '📎 UPLOAD FILES') {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = id;
      button.className = 'btn secondary ff-op-upload-btn';
      button.textContent = label;
      button.addEventListener('click', () => window.openDocumentsModal(null));
      return button;
    }

    function insertAfter(anchor, node) {
      if (!anchor?.parentNode || document.getElementById(node.id)) return;
      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }

    function ensureUploadEntrances() {
      if (!canUpload()) return;
      const actions = Array.from(document.querySelectorAll('button,a'));

      const refresh = actions.find((node) => textOf(node).includes('REFRESH'));
      if (refresh) insertAfter(refresh, makeUploadButton('command-upload-files-btn'));

      const receipt = actions.find((node) => textOf(node).replace(/^\+\s*/, '') === 'RECEIPT');
      if (receipt) insertAfter(receipt, makeUploadButton('calendar-upload-files-btn'));

      const jobsDropdown = Array.from(document.querySelectorAll('.nav-dropdown,[role="menu"],.dropdown-menu')).find((node) => {
        const text = textOf(node);
        return text.includes('ACTIVE JOBS') && text.includes('ESTIMATE');
      });
      if (jobsDropdown && !document.getElementById('jobs-menu-upload-files-btn')) {
        const divider = document.createElement('div');
        divider.style.borderTop = '1px solid #3a4655';
        divider.style.margin = '6px 0';
        const button = makeUploadButton('jobs-menu-upload-files-btn', '📎 Upload Documents');
        button.style.display = 'block';
        button.style.width = '100%';
        button.style.margin = '0';
        jobsDropdown.append(divider, button);
      }
    }

    let launcher;
    let panel;
    let lastSignature = '';

    function getSnapshot() {
      if (!appIsVisible() || typeof STATE === 'undefined' || !STATE || typeof currentUser === 'undefined' || !currentUser) return null;
      const jobs = Array.isArray(STATE.jobs) ? STATE.jobs : [];
      const documents = Array.isArray(STATE.documents) ? STATE.documents : [];
      const today = new Date().toISOString().slice(0,10);
      const completed = jobs.filter((job) => String(job.status || '').toLowerCase() === 'completed');
      const unassigned = documents.filter((doc) => !doc.jobId);
      const otherCategory = documents.filter((doc) => !doc.category || doc.category === 'other');
      const uploadedToday = documents.filter((doc) => String(doc.uploadedAt || '').slice(0,10) === today);
      const linked = new Set(documents.map((doc) => doc.jobId).filter(Boolean));
      const completedWithoutDocuments = completed.filter((job) => !linked.has(job.id));
      return { jobs, documents, unassigned, otherCategory, uploadedToday, completedWithoutDocuments };
    }

    function buildAlerts(snapshot) {
      const alerts = [];
      if (snapshot.unassigned.length) alerts.push(['📥', `${snapshot.unassigned.length} document${snapshot.unassigned.length===1?'':'s'} awaiting a job`, 'Uploaded globally and not yet linked.']);
      if (snapshot.otherCategory.length) alerts.push(['🗂️', `${snapshot.otherCategory.length} document${snapshot.otherCategory.length===1?'':'s'} need classification review`, 'Category is missing or filed as Other.']);
      if (snapshot.completedWithoutDocuments.length) alerts.push(['⚠️', `${snapshot.completedWithoutDocuments.length} completed job${snapshot.completedWithoutDocuments.length===1?'':'s'} have no linked documents`, 'Review closeout paperwork before reconciliation.']);
      if (snapshot.uploadedToday.length) alerts.push(['✓', `${snapshot.uploadedToday.length} document${snapshot.uploadedToday.length===1?'':'s'} received today`, 'Wednesday is observing the intake stream in read-only mode.']);
      if (!alerts.length) alerts.push(['●', 'No document exceptions detected', 'FleetFlow is running and Wednesday is observing quietly.']);
      return alerts.slice(0,6);
    }

    function renderWednesday(snapshot) {
      if (!panel || !snapshot) return;
      const signature = JSON.stringify([snapshot.jobs.length,snapshot.documents.length,snapshot.unassigned.length,snapshot.otherCategory.length,snapshot.uploadedToday.length,snapshot.completedWithoutDocuments.length]);
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
        ${alerts.map((a) => `<div class="ff-wed-alert"><div>${a[0]}</div><div class="ff-wed-copy"><strong>${a[1]}</strong><small>${a[2]}</small></div></div>`).join('')}
      `;
    }

    function ensureWednesday() {
      if (!launcher) {
        launcher = document.createElement('button');
        launcher.id = 'ff-wednesday-launcher';
        launcher.type = 'button';
        launcher.textContent = 'W';
        launcher.setAttribute('aria-label','Open Wednesday observer');

        panel = document.createElement('aside');
        panel.id = 'ff-wednesday-panel';
        panel.innerHTML = `<div class="ff-wed-head"><div class="ff-wed-title"><div class="ff-wed-mark">W</div><div><div class="ff-wed-name">WEDNESDAY</div><div class="ff-wed-mode">OBSERVING · READ ONLY</div></div></div><button class="ff-wed-close" type="button">×</button></div><div class="ff-wed-body"></div><div class="ff-wed-foot">No writes · No automation · Human approval required</div>`;
        document.body.append(launcher,panel);
        launcher.addEventListener('click', () => panel.classList.toggle('ff-open'));
        panel.querySelector('.ff-wed-close').addEventListener('click', () => panel.classList.remove('ff-open'));
      }

      const snapshot = getSnapshot();
      launcher.style.display = snapshot ? 'grid' : 'none';
      if (!snapshot) panel.classList.remove('ff-open');
      if (snapshot) renderWednesday(snapshot);
    }

    function sync() {
      try {
        ensureUploadEntrances();
        ensureWednesday();
      } catch (error) {
        logFailure(error);
      }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, { once:true });
    else sync();
    window.addEventListener('load', sync, { once:true });
    window.setInterval(sync, 1500);
  } catch (error) {
    logFailure(error);
  }
})();

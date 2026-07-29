const STEPS = Object.freeze([
  ['Welcome to FleetFlow', 'Wednesday is a deterministic guide for ERSA Logistics. I will explain each setup area and never invent missing information.'],
  ['Confirm ERSA Logistics company profile', 'Review the legal company name, contact details, service area, and operating preferences in Settings. Contact Joe if any value is unknown.', 'settings'],
  ['Confirm owner and office access', 'Review authorized owner and office accounts. Do not add or change access unless the responsible owner confirms it.', 'users'],
  ['Add drivers and helpers', 'Use Users to review the driver and helper roster. Confirm spelling, role, and access with ERSA before saving.', 'users'],
  ['Add trucks and fleet information', 'Review Fleet for each truck. Enter only verified identifiers, capacity, insurance, and maintenance information.', 'fleet'],
  ['Review operational settings', 'Check ERSA scheduling, pricing, notifications, and operating preferences. Contact Joe before guessing a value.', 'settings'],
  ['Create or review the first job', 'Open Jobs to review an existing job or explicitly confirm every field before creating one. Wednesday never creates records automatically.', 'jobs'],
  ['Explain Dashboard', 'Dashboard summarizes today’s work, exceptions, revenue, and operational status.', 'dashboard'],
  ['Explain Jobs', 'Jobs is the controlled record for customer, move, crew, pricing, and gate details.', 'jobs'],
  ['Explain Calendar', 'Calendar shows scheduled jobs, crew work, and operational timing.', 'calendar'],
  ['Explain Warehouse', 'Warehouse tracks verified storage activity and inventory movement.', 'warehouse'],
  ['Explain Payroll', 'Payroll shows job-linked earnings and payment status. Verify personnel and rates before making changes.', 'payroll'],
  ['Explain Documents', 'Documents are available through job records and the Bill of Lading area. Secure uploads are not added by this release; do not assume a file was saved.', 'bol'],
  ['Onboarding completion summary', 'Review the steps you completed or skipped. ERSA can resume this guide at any time; unresolved information should go to Joe.']
]);

export function progressKey(context) {
  const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80);
  const company = clean(context?.companyId);
  const user = clean(context?.username);
  if (!company || !user) throw new Error('Authenticated company and user are required');
  return `ff:onboarding:wednesday:v1:${company}:${user}`;
}

export function readProgress(storage, context) {
  const fallback = { step: 0, status: 'active', skipped: [] };
  try {
    const parsed = JSON.parse(storage.getItem(progressKey(context)) || 'null');
    if (!parsed || !Number.isInteger(parsed.step)) return fallback;
    return {
      step: Math.max(0, Math.min(STEPS.length - 1, parsed.step)),
      status: ['active', 'paused', 'complete'].includes(parsed.status) ? parsed.status : 'active',
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped.filter(Number.isInteger).filter(i => i >= 0 && i < STEPS.length) : []
    };
  } catch {
    return fallback;
  }
}

export function writeProgress(storage, context, progress) {
  storage.setItem(progressKey(context), JSON.stringify({
    step: progress.step,
    status: progress.status,
    skipped: progress.skipped
  }));
}

export function initialize(context) {
  if (!globalThis.document || !globalThis.localStorage) return;
  if (!context?.username || !context?.companyId) throw new Error('Wednesday requires authenticated context');
  if (document.getElementById('ff-wednesday-onboarding')) return;

  const style = document.createElement('style');
  style.textContent = `
    #ff-wednesday-onboarding{position:fixed;right:20px;bottom:20px;z-index:4000;width:min(390px,calc(100vw - 24px));font-family:var(--font-mono,monospace);color:#e5e7eb}
    .ffw-card{border:1px solid #22c55e;border-radius:12px;background:#071426;box-shadow:0 18px 60px #000b;overflow:hidden}.ffw-head{display:flex;justify-content:space-between;gap:12px;padding:16px;background:#0d2038}.ffw-title{margin:0;color:#22c55e;font-size:20px}.ffw-kicker,.ffw-count{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8}.ffw-body{padding:18px}.ffw-progress{height:6px;background:#1e293b;border-radius:9px;overflow:hidden;margin:10px 0 18px}.ffw-progress span{display:block;height:100%;background:#22c55e}.ffw-step{font-size:17px;margin:0 0 10px}.ffw-copy{font:13px/1.55 system-ui,sans-serif;color:#cbd5e1}.ffw-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.ffw-actions button,.ffw-resume{border:1px solid #475569;border-radius:6px;background:#0f223c;color:#e5e7eb;padding:9px 11px;cursor:pointer;font:700 10px var(--font-mono,monospace);text-transform:uppercase}.ffw-actions .primary{background:#22c55e;border-color:#22c55e;color:#03120a}.ffw-contact{display:block;margin-top:15px;color:#4ade80;font-size:11px}.ffw-close{border:0;background:transparent;color:#94a3b8;cursor:pointer;font-size:18px}.ffw-resume{float:right;background:#22c55e;color:#03120a;border-color:#22c55e}.ffw-note{font-size:10px;color:#94a3b8;margin-top:12px}
  `;
  document.head.appendChild(style);
  const root = document.createElement('aside');
  root.id = 'ff-wednesday-onboarding';
  root.setAttribute('aria-label', 'Wednesday ERSA onboarding guide');
  document.body.appendChild(root);
  let progress = readProgress(localStorage, context);

  function persist() { writeProgress(localStorage, context, progress); }
  function navigate(tab) {
    if (tab && typeof globalThis.switchTab === 'function') globalThis.switchTab(tab);
  }
  function render() {
    if (progress.status === 'paused' || progress.status === 'complete') {
      root.innerHTML = `<button class="ffw-resume" type="button">${progress.status === 'complete' ? 'Review onboarding' : 'Resume onboarding'}</button>`;
      root.querySelector('button').onclick = () => { progress.status = 'active'; persist(); render(); };
      return;
    }
    const [title, copy, tab] = STEPS[progress.step];
    const percent = Math.round(((progress.step + 1) / STEPS.length) * 100);
    root.innerHTML = `<section class="ffw-card"><header class="ffw-head"><div><div class="ffw-kicker">ERSA Logistics onboarding</div><h2 class="ffw-title">Wednesday</h2></div><button class="ffw-close" type="button" aria-label="Exit onboarding">×</button></header><div class="ffw-body"><div class="ffw-count">Step ${progress.step + 1} of ${STEPS.length} · ${percent}%</div><div class="ffw-progress" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div><h3 class="ffw-step">${title}</h3><p class="ffw-copy">${copy}</p><div class="ffw-actions"><button data-action="back" type="button" ${progress.step === 0 ? 'disabled' : ''}>Back</button><button data-action="skip" type="button">Skip for now</button><button data-action="continue" class="primary" type="button">${progress.step === STEPS.length - 1 ? 'Complete' : 'Continue'}</button></div><a class="ffw-contact" href="mailto:JPGventures22@gmail.com?subject=ERSA%20FleetFlow%20onboarding">Contact Joe when information is unknown →</a><p class="ffw-note">Wednesday saves guide progress only. It does not create or change operational records.</p></div></section>`;
    root.querySelector('.ffw-close').onclick = () => { progress.status = 'paused'; persist(); render(); };
    root.querySelector('[data-action="back"]').onclick = () => { progress.step = Math.max(0, progress.step - 1); persist(); render(); };
    root.querySelector('[data-action="skip"]').onclick = () => { if (!progress.skipped.includes(progress.step)) progress.skipped.push(progress.step); advance(); };
    root.querySelector('[data-action="continue"]').onclick = () => { navigate(tab); advance(); };
  }
  function advance() {
    if (progress.step === STEPS.length - 1) progress.status = 'complete';
    else progress.step += 1;
    persist(); render();
  }
  function remove() { root.remove(); style.remove(); }
  window.addEventListener('fleetflow:session-ended', remove, { once: true });
  render();
}

export { STEPS };

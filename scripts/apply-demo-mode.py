#!/usr/bin/env python3
"""
apply-demo-mode.py
Patches index.html in-place to add FleetFlow Demo Sandbox mode.

Changes applied:
  1. Firebase config → dual prod/demo config with DEMO_MODE detection
  2. Demo banner CSS
  3. Demo banner HTML element
  4. createJob() → 5-job cap + demoCreated flag on new jobs
  5. deleteJob() → blocked in demo mode
  6. openEditJob() → demoCloned jobs are read-only
  7. saveCompanySettings() → blocked in demo mode
  8. deleteUser() → blocked in demo mode
"""

import sys
import os

def patch(html: str, find: str, replace: str, label: str) -> str:
    if find not in html:
        print(f"ERROR: Could not find anchor for: {label}", file=sys.stderr)
        sys.exit(1)
    count = html.count(find)
    if count > 1:
        print(f"WARNING: '{label}' anchor matches {count} times — using first occurrence")
    result = html.replace(find, replace, 1)
    print(f"  ✓ {label}")
    return result


def main():
    path = "index.html"
    if len(sys.argv) > 1:
        path = sys.argv[1]

    if not os.path.exists(path):
        print(f"ERROR: {path} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Reading {path}...")
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    original_len = len(html)
    print(f"File size: {original_len:,} bytes")

    # ────────────────────────────────────────────────────────────────────────────
    # 1. Firebase config + DEMO_MODE declaration
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        'const firebaseConfig = {\n'
        '  apiKey: "AIzaSyA0f42Pv4N7MDKWYixg5a-D3MrjldU--Pw",\n'
        '  authDomain: "movemastersos.firebaseapp.com",\n'
        '  projectId: "movemastersos",\n'
        '  storageBucket: "movemastersos.firebasestorage.app",\n'
        '  messagingSenderId: "422211525514",\n'
        '  appId: "1:422211525514:web:e94d355b1720d816eec673"\n'
        '};\n'
        '\n'
        'firebase.initializeApp(firebaseConfig);',

        '// ── DEMO MODE DETECTION ──────────────────────────────────────────────────────────────────────────
'
        'const DEMO_MODE = (\n'
        '  window.location.hostname === \'demo.fleetflow.app\' ||\n'
        '  window.location.hostname.includes(\'fleetflow-demo\') ||\n'
        '  new URLSearchParams(window.location.search).get(\'demo\') === \'1\'\n'
        ');\n'
        '\n'
        'const PROD_FIREBASE_CONFIG = {\n'
        '  apiKey: "AIzaSyA0f42Pv4N7MDKWYixg5a-D3MrjldU--Pw",\n'
        '  authDomain: "movemastersos.firebaseapp.com",\n'
        '  projectId: "movemastersos",\n'
        '  storageBucket: "movemastersos.firebasestorage.app",\n'
        '  messagingSenderId: "422211525514",\n'
        '  appId: "1:422211525514:web:e94d355b1720d816eec673"\n'
        '};\n'
        '\n'
        '// Replace placeholder values after creating your fleetflow-demo Firebase project\n'
        'const DEMO_FIREBASE_CONFIG = {\n'
        '  apiKey: "REPLACE_DEMO_API_KEY",\n'
        '  authDomain: "fleetflow-demo.firebaseapp.com",\n'
        '  projectId: "fleetflow-demo",\n'
        '  storageBucket: "fleetflow-demo.appspot.com",\n'
        '  messagingSenderId: "REPLACE_DEMO_SENDER_ID",\n'
        '  appId: "REPLACE_DEMO_APP_ID"\n'
        '};\n'
        '\n'
        'const firebaseConfig = DEMO_MODE ? DEMO_FIREBASE_CONFIG : PROD_FIREBASE_CONFIG;\n'
        'firebase.initializeApp(firebaseConfig);\n'
        'if (DEMO_MODE) {\n'
        '  document.addEventListener(\'DOMContentLoaded\', function() {\n'
        '    const b = document.getElementById(\'ff-demo-banner\');\n'
        '    if (b) b.style.display = \'block\';\n'
        '    document.body.classList.add(\'demo-active\');\n'
        '  });\n'
        '}',

        "Firebase config + DEMO_MODE declaration"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 2. Demo banner CSS (inserted before closing </style>)
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        '  .nav-pinned { display:flex; align-items:center; gap:4px; margin-left:auto; flex-shrink:0; padding-left:8px; }\n'
        '</style>',

        '  .nav-pinned { display:flex; align-items:center; gap:4px; margin-left:auto; flex-shrink:0; padding-left:8px; }\n'
        '  /* ── DEMO MODE BANNER ── */\n'
        '  #ff-demo-banner{display:none;position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#b34700,#d96000);color:#fff;font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:2px;text-align:center;padding:6px 16px;box-shadow:0 2px 8px rgba(180,80,0,0.5);}\n'
        '  body.demo-active .topbar{top:28px!important;}\n'
        '  body.demo-active{padding-top:28px;}\n'
        '</style>',

        "Demo banner CSS"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 3. Demo banner HTML element (right after <body>)
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        '<body>\n'
        '\n'
        '<!-- PWA SPLASH SCREEN -->',

        '<body>\n'
        '<div id="ff-demo-banner">🔬 FLEETFLOW DEMO — Sample data only. No production data is affected.</div>\n'
        '\n'
        '<!-- PWA SPLASH SCREEN -->',

        "Demo banner HTML element"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 4. createJob() — tag new jobs with demoCreated flag
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        '    companyId:     COMPANY_ID,\n'
        '    status:        \'pending\',',

        '    companyId:     COMPANY_ID,\n'
        '    demoCreated:   DEMO_MODE,\n'
        '    status:        \'pending\',',

        "createJob — demoCreated flag on new jobs"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 5. createJob() — 5-job cap before the try/save block
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        '    payroll:       { driver:0, helpers }\n'
        '  };\n'
        '\n'
        '  try {\n'
        '    await db.collection(COL_JOBS).doc(newJob.id).set(newJob);',

        '    payroll:       { driver:0, helpers }\n'
        '  };\n'
        '\n'
        '  if (DEMO_MODE) {\n'
        '    const demoCap = (STATE.jobs || []).filter(j => j.demoCreated === true).length;\n'
        '    if (demoCap >= 5) {\n'
        "      notify('⚠ Demo limit reached. This workspace allows up to 5 sample jobs.', true);\n"
        '      return;\n'
        '    }\n'
        '  }\n'
        '\n'
        '  try {\n'
        '    await db.collection(COL_JOBS).doc(newJob.id).set(newJob);',

        "createJob — 5-job demo cap"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 6. deleteJob() — blocked entirely in demo mode
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        'async function deleteJob(jobId) {\n'
        '  const job = STATE.jobs.find(j => j.id === jobId);\n'
        '  if (!job) return;\n'
        '  if (!confirm(`Delete job ${jobId}',

        'async function deleteJob(jobId) {\n'
        "  if (DEMO_MODE) { notify('⚠ Job deletion is disabled in demo mode.', true); return; }\n"
        '  const job = STATE.jobs.find(j => j.id === jobId);\n'
        '  if (!job) return;\n'
        '  if (!confirm(`Delete job ${jobId}',

        "deleteJob — demo mode guard"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 7. openEditJob() — demoCloned jobs are read-only
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        'function openEditJob(jobId) {\n'
        '  const job = STATE.jobs.find(j => j.id === jobId);\n'
        '  if (!job) return;\n'
        '\n'
        '  // Close ALL open modals before opening edit',

        'function openEditJob(jobId) {\n'
        '  const job = STATE.jobs.find(j => j.id === jobId);\n'
        '  if (!job) return;\n'
        '  if (DEMO_MODE && job.demoCloned) {\n'
        "    notify('⚠ Historical demo jobs are read-only. Create a new job to experiment.', true); return;\n"
        '  }\n'
        '\n'
        '  // Close ALL open modals before opening edit',

        "openEditJob — demoCloned read-only guard"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 8. saveCompanySettings() — blocked in demo mode
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        'async function saveCompanySettings() {\n'
        '  const data = {\n'
        "    name:    document.getElementById('co-name')?.value.trim(),",

        'async function saveCompanySettings() {\n'
        "  if (DEMO_MODE) { notify('⚠ Company settings are locked in demo mode.', true); return; }\n"
        '  const data = {\n'
        "    name:    document.getElementById('co-name')?.value.trim(),",

        "saveCompanySettings — demo mode guard"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # 9. deleteUser() — blocked in demo mode
    # ────────────────────────────────────────────────────────────────────────────
    html = patch(html,
        'async function deleteUser(username, role) {\n'
        '  if (!canDeleteUser(username, role)) {',

        'async function deleteUser(username, role) {\n'
        "  if (DEMO_MODE) { notify('⚠ User management is disabled in demo mode.', true); return; }\n"
        '  if (!canDeleteUser(username, role)) {',

        "deleteUser — demo mode guard"
    )

    # ────────────────────────────────────────────────────────────────────────────
    # Write patched file
    # ────────────────────────────────────────────────────────────────────────────
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)

    new_len = len(html)
    print(f"\nPatched {path}")
    print(f"  Before: {original_len:,} bytes")
    print(f"  After:  {new_len:,} bytes")
    print(f"  Delta:  +{new_len - original_len:,} bytes")
    print("Done.")


if __name__ == "__main__":
    main()

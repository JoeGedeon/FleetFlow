#!/usr/bin/env node
/**
 * seed-demo.js
 * Reads from movemastersos (production) Firebase project, sanitizes all PII,
 * and writes clean demo data to fleetflow-demo Firebase project.
 *
 * Usage:
 *   1. npm install firebase-admin
 *   2. Download service account keys:
 *      - scripts/prod-service-account.json  (movemastersos project)
 *      - scripts/demo-service-account.json  (fleetflow-demo project)
 *   3. node scripts/seed-demo.js
 *
 * What gets seeded:
 *   COPY + SANITIZE:  ff_jobs, ff_users, ff_receipts, ff_disbursements,
 *                     ff_payroll_ledger, ff_fleet, ff_inventory, ff_warehouse_log,
 *                     ff_load_sheets, ff_travel, ff_company, ff_leads
 *   NEVER ENTERED:    ff_notifications, ff_licensees, ff_feedback, ff_events
 *   GENERATED FRESH:  demo creator account, demo company record
 *
 * All seeded records get demoCloned: true so the app can mark them read-only.
 */

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── CONFIG ────────────────────────────────────────────────────────────────────────────────

const PROD_KEY_PATH = path.join(__dirname, 'prod-service-account.json');
const DEMO_KEY_PATH = path.join(__dirname, 'demo-service-account.json');
const DEMO_COMPANY_ID = 'demo';
const DEMO_PASSWORD   = 'Demo1234!';

// ── FAKE DATA POOLS ─────────────────────────────────────────────────────────────────────────

const FAKE_FIRST = ['Alex','Jordan','Morgan','Riley','Taylor','Casey','Drew','Quinn','Avery','Blake','Cameron','Devon','Elliot','Finley','Harper'];
const FAKE_LAST  = ['Thompson','Rivera','Patel','Williams','Johnson','Garcia','Martinez','Anderson','Wilson','Moore','Jackson','Lee','Harris','Clark','Lewis'];
const FAKE_STREETS = [
  '142 Peachtree Rd', '875 Cascade Ave', '2100 MLK Jr Dr', '400 Memorial Dr',
  '318 Dekalb Ave', '1001 Moreland Ave', '755 Edgewood Ave', '2800 Campbellton Rd',
  '920 Joseph E Lowery Blvd', '500 Park Ave', '1432 Ponce De Leon', '600 North Ave',
  '3200 Buford Hwy', '1800 Stewart Ave', '4400 Roswell Rd'
];
const FAKE_CITIES = [
  'Atlanta, GA', 'Decatur, GA', 'Stone Mountain, GA', 'Lithonia, GA',
  'Tucker, GA', 'Clarkston, GA', 'Smyrna, GA', 'Marietta, GA',
  'College Park, GA', 'East Point, GA', 'Morrow, GA', 'Jonesboro, GA'
];
const FAKE_VENDORS = [
  'Metro Supply Co.', 'Atlanta Fuel Stop', 'Downtown Parking LLC',
  'Peach State Tools', 'Southeast Equipment', 'QuickLube Express',
  'Budget Auto Parts', 'City Materials', 'Delta Moving Supply', 'GA Equipment Rental'
];
const FAKE_VINS   = () => 'W' + Math.random().toString(36).slice(2,12).toUpperCase();
const FAKE_PLATES = () => {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  return Array.from({length:3},()=>letters[Math.floor(Math.random()*letters.length)]).join('') +
         String(Math.floor(1000+Math.random()*8999));
};
const FAKE_PHONE = () => {
  const area = ['404','678','770','470'][Math.floor(Math.random()*4)];
  return `(${area}) ${String(200+Math.floor(Math.random()*799)).padStart(3,'0')}-${String(1000+Math.floor(Math.random()*8999)).padStart(4,'0')}`;
};
const FAKE_EMAIL  = (username) => `${username.toLowerCase().replace(/\s+/g,'.')}@demo.fleetflow.app`;
const FAKE_NAME   = () => `${FAKE_FIRST[Math.floor(Math.random()*FAKE_FIRST.length)]} ${FAKE_LAST[Math.floor(Math.random()*FAKE_LAST.length)]}`;
const FAKE_ADDR   = () => `${FAKE_STREETS[Math.floor(Math.random()*FAKE_STREETS.length)]}, ${FAKE_CITIES[Math.floor(Math.random()*FAKE_CITIES.length)]}`;
const FAKE_VENDOR = () => FAKE_VENDORS[Math.floor(Math.random()*FAKE_VENDORS.length)];

// ── NAME MAPPING (preserve crew relationships within the demo dataset) ─────────────────
const nameMap = new Map();
function fakePerson(realName) {
  if (!realName) return '';
  if (!nameMap.has(realName)) nameMap.set(realName, FAKE_NAME());
  return nameMap.get(realName);
}

// ── SANITIZERS ───────────────────────────────────────────────────────────────────────────────

function sanitizeJob(job) {
  const fakeClient = fakePerson(job.client);
  return {
    ...job,
    client:         fakeClient,
    phone:          FAKE_PHONE(),
    email:          FAKE_EMAIL(fakeClient.split(' ')[0]),
    origin:         FAKE_ADDR(),
    dest:           FAKE_ADDR(),
    driver:         job.driver    ? fakePerson(job.driver)   : '',
    notes:          job.notes     ? '[demo note]'            : '',
    bolNotes:       job.bolNotes  ? '[demo bol]'             : '',
    crewNames:      (job.crewNames || []).map(n => fakePerson(n)),
    messages:       { crew: [], client: [] },
    photos:         [],
    signatures:     [],
    payroll:        sanitizePayroll(job.payroll),
    companyId:      DEMO_COMPANY_ID,
    demoCloned:     true,
  };
}

function sanitizePayroll(payroll) {
  if (!payroll) return { driver: 0, helpers: [] };
  return {
    ...payroll,
    helpers: (payroll.helpers || []).map(h => ({
      ...h,
      name: fakePerson(h.name),
    })),
  };
}

function sanitizeUser(user) {
  const fakeDisplay = fakePerson(user.displayName || user.username);
  return {
    username:       user.username,
    displayName:    fakeDisplay,
    password:       DEMO_PASSWORD,
    role:           user.role,
    allowedRoles:   user.allowedRoles || [user.role],
    active:         true,
    companyId:      DEMO_COMPANY_ID,
    email:          FAKE_EMAIL(user.username),
    demoCloned:     true,
    createdAt:      user.createdAt || new Date().toISOString(),
  };
}

function sanitizeReceipt(rec) {
  return {
    ...rec,
    vendor:     FAKE_VENDOR(),
    notes:      rec.notes ? '[demo expense]' : '',
    companyId:  DEMO_COMPANY_ID,
    demoCloned: true,
  };
}

function sanitizeDisbursement(d) {
  return {
    ...d,
    payee:      d.payee ? fakePerson(d.payee) : '',
    notes:      d.notes ? '[demo]' : '',
    companyId:  DEMO_COMPANY_ID,
    demoCloned: true,
  };
}

function sanitizePayrollLedger(entry) {
  return {
    ...entry,
    name:       entry.name ? fakePerson(entry.name) : '',
    companyId:  DEMO_COMPANY_ID,
    demoCloned: true,
  };
}

function sanitizeFleet(vehicle) {
  return {
    ...vehicle,
    vin:        FAKE_VINS(),
    plate:      FAKE_PLATES(),
    companyId:  DEMO_COMPANY_ID,
    demoCloned: true,
  };
}

function sanitizeInventory(item) {
  return { ...item, companyId: DEMO_COMPANY_ID, demoCloned: true };
}

function sanitizeWarehouseLog(log) {
  return {
    ...log,
    notes:      log.notes ? '[demo]' : '',
    companyId:  DEMO_COMPANY_ID,
    demoCloned: true,
  };
}

function sanitizeLoadSheet(ls) {
  return { ...ls, companyId: DEMO_COMPANY_ID, demoCloned: true };
}

function sanitizeTravel(t) {
  return {
    ...t,
    origin:     t.origin ? FAKE_ADDR() : '',
    dest:       t.dest   ? FAKE_ADDR() : '',
    notes:      t.notes  ? '[demo]'    : '',
    companyId:  DEMO_COMPANY_ID,
    demoCloned: true,
  };
}

function sanitizeLead(lead) {
  const fakeName = fakePerson(lead.name || lead.client || '');
  return {
    ...lead,
    name:       fakeName,
    client:     fakeName,
    phone:      FAKE_PHONE(),
    email:      FAKE_EMAIL(fakeName.split(' ')[0]),
    address:    lead.address   ? FAKE_ADDR() : '',
    origin:     lead.origin    ? FAKE_ADDR() : '',
    dest:       lead.dest      ? FAKE_ADDR() : '',
    notes:      lead.notes     ? '[demo lead]'    : '',
    companyId:  DEMO_COMPANY_ID,
    demoCloned: true,
  };
}

function sanitizeCompany(company) {
  const STRIP = [
    'ein','twilioAuthToken','twilioAccountSid','twilioPhone','twilioNumber',
    'stripeKey','stripeSecretKey','stripePublishableKey','twilioApiKey',
    'twilioApiSecret','smtp','smtpPass','smtpUser','webhookSecret',
  ];
  const safe = { ...company };
  STRIP.forEach(k => delete safe[k]);
  safe.name       = 'FleetFlow Demo Co.';
  safe.phone      = FAKE_PHONE();
  safe.email      = 'demo@demo.fleetflow.app';
  safe.address    = '1000 Demo Pkwy, Atlanta, GA 30303';
  safe.companyId  = DEMO_COMPANY_ID;
  safe.demoCloned = true;
  return safe;
}

// ── BATCH WRITER ───────────────────────────────────────────────────────────────────────────────

async function writeBatch(demoDB, collection, docs) {
  const CHUNK = 400;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = demoDB.batch();
    docs.slice(i, i + CHUNK).forEach(({ id, data }) => {
      batch.set(demoDB.collection(collection).doc(id), data);
    });
    await batch.commit();
  }
  console.log(`  ✓ ${collection}: ${docs.length} records`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────────────────

async function main() {
  for (const p of [PROD_KEY_PATH, DEMO_KEY_PATH]) {
    if (!fs.existsSync(p)) {
      console.error(`\nERROR: Missing service account file: ${p}`);
      console.error('Download it from Firebase Console → Project Settings → Service Accounts\n');
      process.exit(1);
    }
  }

  const prodApp = admin.initializeApp({
    credential: admin.credential.cert(require(PROD_KEY_PATH)),
  }, 'prod');

  const demoApp = admin.initializeApp({
    credential: admin.credential.cert(require(DEMO_KEY_PATH)),
  }, 'demo');

  const prodDB = prodApp.firestore();
  const demoDB = demoApp.firestore();

  console.log('\n── FleetFlow Demo Seed ───────────────────────────────────────────────');
  console.log('Source:      movemastersos (production)');
  console.log('Destination: fleetflow-demo\n');

  const companySnap = await prodDB.collection('ff_company').get();
  const companyDocs = companySnap.docs.map(d => ({
    id:   d.id === 'default' ? DEMO_COMPANY_ID : d.id,
    data: sanitizeCompany(d.data()),
  }));
  await writeBatch(demoDB, 'ff_company', companyDocs);

  const usersSnap = await prodDB.collection('ff_users').get();
  const userDocs = usersSnap.docs
    .filter(d => !['joe','recovery'].includes(d.id))
    .map(d => ({ id: d.id, data: sanitizeUser(d.data()) }));
  userDocs.push({
    id: 'demo',
    data: {
      username:     'demo',
      displayName:  'Demo User',
      password:     DEMO_PASSWORD,
      role:         'owner',
      allowedRoles: ['owner','office','driver','helper','warehouse'],
      active:       true,
      companyId:    DEMO_COMPANY_ID,
      email:        'demo@demo.fleetflow.app',
      demoCloned:   false,
      createdAt:    new Date().toISOString(),
    }
  });
  await writeBatch(demoDB, 'ff_users', userDocs);

  const jobsSnap = await prodDB.collection('ff_jobs').where('companyId','==','default').get();
  const jobDocs = jobsSnap.docs.map(d => ({ id: d.id, data: sanitizeJob(d.data()) }));
  await writeBatch(demoDB, 'ff_jobs', jobDocs);

  const receiptsSnap = await prodDB.collection('ff_receipts').get();
  const receiptDocs = receiptsSnap.docs.map(d => ({ id: d.id, data: sanitizeReceipt(d.data()) }));
  await writeBatch(demoDB, 'ff_receipts', receiptDocs);

  const disbSnap = await prodDB.collection('ff_disbursements').get();
  const disbDocs = disbSnap.docs.map(d => ({ id: d.id, data: sanitizeDisbursement(d.data()) }));
  await writeBatch(demoDB, 'ff_disbursements', disbDocs);

  const payrollSnap = await prodDB.collection('ff_payroll_ledger').get();
  const payrollDocs = payrollSnap.docs.map(d => ({ id: d.id, data: sanitizePayrollLedger(d.data()) }));
  await writeBatch(demoDB, 'ff_payroll_ledger', payrollDocs);

  const fleetSnap = await prodDB.collection('ff_fleet').get();
  const fleetDocs = fleetSnap.docs.map(d => ({ id: d.id, data: sanitizeFleet(d.data()) }));
  await writeBatch(demoDB, 'ff_fleet', fleetDocs);

  const invSnap = await prodDB.collection('ff_inventory').get();
  const invDocs = invSnap.docs.map(d => ({ id: d.id, data: sanitizeInventory(d.data()) }));
  await writeBatch(demoDB, 'ff_inventory', invDocs);

  const whSnap = await prodDB.collection('ff_warehouse_log').get();
  const whDocs = whSnap.docs.map(d => ({ id: d.id, data: sanitizeWarehouseLog(d.data()) }));
  await writeBatch(demoDB, 'ff_warehouse_log', whDocs);

  const lsSnap = await prodDB.collection('ff_load_sheets').get();
  const lsDocs = lsSnap.docs.map(d => ({ id: d.id, data: sanitizeLoadSheet(d.data()) }));
  await writeBatch(demoDB, 'ff_load_sheets', lsDocs);

  const travelSnap = await prodDB.collection('ff_travel').get();
  const travelDocs = travelSnap.docs.map(d => ({ id: d.id, data: sanitizeTravel(d.data()) }));
  await writeBatch(demoDB, 'ff_travel', travelDocs);

  const leadsSnap = await prodDB.collection('ff_leads').get();
  const leadDocs = leadsSnap.docs.map(d => ({ id: d.id, data: sanitizeLead(d.data()) }));
  await writeBatch(demoDB, 'ff_leads', leadDocs);

  console.log('\n── Seed complete ─────────────────────────────────────────────────────────');
  console.log('Demo credentials:');
  console.log(`  username: demo`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log('\nAll seeded records are tagged demoCloned: true (read-only in the app).');
  console.log('Demo users can create up to 5 new jobs (demoCreated: true).');
  console.log('\nNext steps:');
  console.log('  1. Create fleetflow-demo Firebase project');
  console.log('  2. Update DEMO_FIREBASE_CONFIG in index.html with real credentials');
  console.log('  3. Deploy a second Netlify site pointing to this repo');
  console.log('  4. Set Netlify site name to include "fleetflow-demo" in hostname');
  console.log('     OR configure custom domain: demo.fleetflow.app\n');

  await prodApp.delete();
  await demoApp.delete();
}

main().catch(err => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});

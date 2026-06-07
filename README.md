# FleetFlow

Logistics execution engine by JPG Systems. Enforces operational honesty — no truck loads without client signature, no unload without payment verification. Real-time multi-role job tracking backed by Firebase Firestore.

## Tech Stack

- React 18 + Vite
- Tailwind CSS + custom CSS variables (`src/styles/app.css`)
- Firebase Firestore (real-time job state, shared `movemastersos` project)
- Netlify (deployment)

## Setup

```bash
git clone https://github.com/JoeGedeon/FleetFlow.git
cd FleetFlow
npm install
cp .env.example .env
```

Edit `.env` with your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com). The project currently uses `movemastersos`.

## Run

```bash
npm run dev
```

Opens at `http://localhost:3000`. Hot-reload enabled.

## Build

```bash
npm run build
```

Output in `dist/`. Preview the production build locally:

```bash
npm run preview
```

## Deploy to Netlify

**Option A — Connect GitHub repo (recommended)**

1. Push this repo to GitHub
2. Netlify → New Site → Import from GitHub → select `FleetFlow`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add all `VITE_FIREBASE_*` environment variables in Site Settings → Environment Variables
6. Deploy

**Option B — Netlify CLI**

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir dist
```

SPA routing is handled by `netlify.toml` — all paths redirect to `index.html`.

## Project Structure

```
FleetFlow/
├── index.html                        # Vite entry point
├── netlify.toml                      # Build config + SPA redirect
├── postcss.config.js                 # Tailwind PostCSS processing
├── tailwind.config.js
├── vite.config.js
├── .env.example                      # Firebase env var template
├── archive/
│   └── main_monolith.jsx             # Backup of original monolithic main.jsx
└── src/
    ├── main.jsx                      # React bootstrap (ReactDOM.createRoot)
    ├── App.jsx                       # Main app — all 5 role panels
    ├── firebase.js                   # Firebase init (reads VITE_ env vars)
    ├── index.css                     # Tailwind directives
    ├── api/
    │   └── moveMastersApi.js         # All Firestore read/write operations
    ├── components/
    │   ├── BatonDisplay.jsx          # Active-actor indicator
    │   ├── DriverEarningsPanel.jsx   # Driver pay summary
    │   ├── InventoryPanel.jsx        # Inventory list + CF editing
    │   ├── ProgressTracker.jsx       # Workflow step bar
    │   └── PricingSummary.jsx        # Pricing totals + breakdown
    ├── shared/
    │   ├── jobSchema.js              # JobStatus enum + createJob() factory
    │   └── pricingTables.js          # Regional CF rate tables (FL, NYC)
    ├── state/
    │   └── useJobStore.js            # Local state hook (future use)
    └── styles/
        └── app.css                   # CSS variables + component class definitions
```

## Status Flow

```
SURVEY
  → PENDING_APPROVAL          (office reviews field survey)
  → AWAITING_SIGNATURE        (client signs pricing)
  → LOADING                   (driver loads truck)
  → AWAITING_DISPATCH         (office routes job)
  → EN_ROUTE_TO_WAREHOUSE     (driver drives to storage)
  → IN_WAREHOUSE              (warehouse intake)
  → AWAITING_WAREHOUSE_DISPATCH (office releases from storage)
  → AWAITING_OUTTAKE          (warehouse releases to driver)
  → OUT_FOR_DELIVERY          (driver en route to client)
  → PAYMENT_PENDING           (office confirms payment)
  → DELIVERY_AWAITING_CLIENT_CONFIRMATION (client signs delivery)
  → DELIVERY_AWAITING_DRIVER_EVIDENCE     (driver submits photos)
  → COMPLETED
```

Direct delivery skips the warehouse steps.

## Workflow Gates

| Gate | Enforced By |
|------|-------------|
| No loading until client signs | `authorizeLoading()` checks `job.clientSigned` |
| No delivery confirmation until payment | `confirmPayment()` required before client sign-off |
| Pricing locked after approval | `clientSigned` prevents re-pricing |
| Evidence required at closeout | `submitDeliveryEvidence()` before `signOffByDriver()` |

## PACER Integration

FleetFlow writes all job state to Firestore collection `jobs`. PACER connects by subscribing to real-time snapshots:

```js
import { db } from './src/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';

// Subscribe to a specific job
onSnapshot(doc(db, 'jobs', 'FLEETFLOW-001'), snap => {
  const job = snap.data();
  // job.status       — current workflow gate (string, see JobStatus in jobSchema.js)
  // job.billing      — approvedTotal, pricingBreakdown, paymentReceived
  // job.inventory    — full item manifest with CF measurements
  // job.labor        — driver + helper payouts
  // job.warehouse    — inbound/outbound timestamps and vault assignment
});
```

Firebase collection: `jobs`
Default job ID: `FLEETFLOW-001` (set in `App.jsx` → `MoveMastersAPI.getJob()`)
Firebase project: `movemastersos` (shared with Move Masters OS)

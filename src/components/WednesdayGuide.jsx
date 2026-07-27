import { useEffect, useMemo, useState } from 'react';

const GUIDE_VERSION = '2026.07.1';

const ROLE_STEPS = {
  driver: [
    { title: 'Your route starts here', body: 'Open the assigned job, review addresses, crew notes, and the truck before departure.', action: 'Review assigned job' },
    { title: 'Document the survey', body: 'Record inventory, cubic footage changes, access conditions, and required photos before pricing approval.', action: 'Open survey tools' },
    { title: 'Follow the baton', body: 'FleetFlow will show when you are cleared to load, route, collect evidence, and close delivery.', action: 'View job status' },
  ],
  helper: [
    { title: 'Know when you are cleared', body: 'Your screen shows the active job stage and whether work is authorized.', action: 'View authorization' },
    { title: 'Stay connected', body: 'Use job communications for field updates instead of scattering information across personal text threads.', action: 'Open communications' },
  ],
  office: [
    { title: 'Set up the operation', body: 'Confirm company information, DOT and MC details, users, trucks, pricing, and permissions.', action: 'Review company setup' },
    { title: 'Work the lead pipeline', body: 'Capture the customer name, email, phone number, source, consent, estimate, and follow-up history in Leads.', action: 'Open Leads' },
    { title: 'Control the job baton', body: 'Review surveys, approve pricing, assign resources, confirm payments, and release each operational gate.', action: 'Open Jobs' },
    { title: 'Use operational memory', body: 'Record exceptions, decisions, and outcomes so FleetFlow can improve without inventing facts like a confident intern.', action: 'Open Operational Intake' },
  ],
  warehouse: [
    { title: 'Receive with evidence', body: 'Confirm facility and vault placement, photograph intake condition, and preserve chain of custody.', action: 'Open inbound intake' },
    { title: 'Release with certainty', body: 'Verify the correct shipment and capture outbound evidence before handing the load back to the driver.', action: 'Open outbound workflow' },
  ],
  client: [
    { title: 'Review your move', body: 'Confirm inventory, approved pricing, signatures, status, and delivery completion from one place.', action: 'Review move details' },
    { title: 'Keep communication attached', body: 'Messages remain connected to the move so important details do not vanish into somebody’s phone.', action: 'Open messages' },
  ],
};

const RELEASE_STEPS = [
  {
    title: 'Wednesday is now on duty',
    body: 'First-time users receive a role-based tour. Returning users only see guidance for features added since their last visit.',
    action: 'Continue tour',
  },
  {
    title: 'Progress follows you',
    body: 'Your completed version is stored on this device, so the tour will not restart every time you log in.',
    action: 'Got it',
  },
];

function storageKey(role) {
  return `ff_wednesday_${role}_${GUIDE_VERSION}`;
}

export default function WednesdayGuide({ role, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState('onboarding');

  const steps = useMemo(() => {
    const roleSteps = ROLE_STEPS[role] || ROLE_STEPS.driver;
    return mode === 'release' ? RELEASE_STEPS : roleSteps;
  }, [mode, role]);

  useEffect(() => {
    const completedVersion = localStorage.getItem(storageKey(role));
    if (completedVersion !== GUIDE_VERSION) {
      setMode('onboarding');
      setStepIndex(0);
      setOpen(true);
    }
  }, [role]);

  const finish = () => {
    localStorage.setItem(storageKey(role), GUIDE_VERSION);
    setOpen(false);
    setStepIndex(0);
  };

  const next = () => {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }
    setStepIndex(current => current + 1);
  };

  const previous = () => setStepIndex(current => Math.max(0, current - 1));

  const restart = (nextMode = 'onboarding') => {
    setMode(nextMode);
    setStepIndex(0);
    setOpen(true);
  };

  const currentStep = steps[stepIndex];

  return (
    <>
      <button
        type="button"
        aria-label="Open Wednesday guide"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-amber-400 text-2xl font-black text-stone-900 shadow-2xl transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-200"
      >
        W
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-3 md:items-center" role="dialog" aria-modal="true" aria-labelledby="wednesday-title">
          <section className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-[#fff7dc] shadow-2xl">
            <header className="flex items-center gap-4 border-b border-amber-200 bg-amber-300 px-5 py-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-stone-900 bg-white text-xl font-black text-stone-900">
                W
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[10px] font-black uppercase tracking-[0.24em] text-stone-600">FleetFlow operations guide</p>
                <h2 id="wednesday-title" className="m-0 text-2xl font-black uppercase tracking-tight text-stone-950">Wednesday</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-lg font-black text-stone-700 hover:bg-white/60" aria-label="Close guide">×</button>
            </header>

            <div className="p-6">
              <div className="mb-5 flex gap-2" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
                {steps.map((_, index) => (
                  <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-stone-900' : 'bg-amber-200'}`} />
                ))}
              </div>

              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">{role} setup · {stepIndex + 1}/{steps.length}</p>
              <h3 className="mb-3 text-2xl font-black leading-tight text-stone-950">{currentStep.title}</h3>
              <p className="mb-6 text-sm font-medium leading-6 text-stone-700">{currentStep.body}</p>

              <button
                type="button"
                onClick={() => {
                  onNavigate?.(currentStep.action, role);
                  next();
                }}
                className="mb-3 w-full rounded-xl bg-stone-950 px-4 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-stone-800 active:scale-[0.99]"
              >
                {stepIndex === steps.length - 1 ? 'Finish setup' : currentStep.action}
              </button>

              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={previous} disabled={stepIndex === 0} className="text-xs font-black uppercase tracking-wider text-stone-500 disabled:opacity-30">Back</button>
                <button type="button" onClick={finish} className="text-xs font-black uppercase tracking-wider text-stone-500">Skip for now</button>
              </div>
            </div>

            <footer className="flex items-center justify-between border-t border-amber-200 bg-white/50 px-5 py-3">
              <button type="button" onClick={() => restart('onboarding')} className="text-[10px] font-black uppercase tracking-wider text-stone-500">Restart onboarding</button>
              <button type="button" onClick={() => restart('release')} className="text-[10px] font-black uppercase tracking-wider text-stone-500">What’s new</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

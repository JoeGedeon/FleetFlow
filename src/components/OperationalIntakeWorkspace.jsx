import { useState } from 'react';

const intakeQueues = [
  {
    title: 'Draft Imports',
    description: 'Broker packets saved for review before approval.',
    count: 0
  },
  {
    title: 'Pending Approval',
    description: 'Reviewed imports waiting for office authorization.',
    count: 0
  },
  {
    title: 'Completed Imports',
    description: 'Approved imports that entered the normal FleetFlow workflow.',
    count: 0
  }
];

export default function OperationalIntakeWorkspace() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <section className="space-y-6" aria-labelledby="operational-intake-heading">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
            Office Workspace
          </p>
          <h2
            id="operational-intake-heading"
            className="m-0 text-2xl font-black uppercase tracking-tight text-stone-900"
          >
            Operational Intake
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Bring broker paperwork into FleetFlow through a controlled review and approval process.
          </p>
        </div>

        <button
          type="button"
          className="w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-[0.99]"
          onClick={() => setShowNotice(true)}
        >
          + Upload Broker Packet
        </button>

        {showNotice && (
          <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800" role="status">
            The intake workspace is ready. PDF selection and processing will be added in the next intake slice.
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {intakeQueues.map(queue => (
          <article key={queue.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="m-0 text-sm font-black uppercase tracking-wider text-stone-900">
                  {queue.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-stone-500">{queue.description}</p>
              </div>
              <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-stone-100 px-3 text-sm font-black text-stone-700">
                {queue.count}
              </span>
            </div>
            <div className="mt-5 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-center text-xs font-bold uppercase tracking-widest text-stone-400">
              No records yet
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

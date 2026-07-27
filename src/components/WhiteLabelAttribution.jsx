import { useMemo } from 'react';

function resolveBrandName() {
  if (typeof window === 'undefined') return 'FleetFlow Partner';

  return (
    window.FLEETFLOW_BRAND?.companyName ||
    window.localStorage.getItem('ff_white_label_company_name') ||
    'FleetFlow Partner'
  );
}

export default function WhiteLabelAttribution({ companyName }) {
  const brandName = useMemo(() => companyName || resolveBrandName(), [companyName]);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-stone-500 backdrop-blur"
      aria-label="Platform attribution"
    >
      <span className="text-stone-700">{brandName}</span>
      <span aria-hidden="true"> · </span>
      <span>Powered by FleetFlow</span>
      <span aria-hidden="true"> · </span>
      <span>A JPG Ventures, LLC Production</span>
    </footer>
  );
}

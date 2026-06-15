'use client';

import { useEffect, useRef, useState } from 'react';
import { Business, Invoice } from '@/types';
import InvoiceDocument, { DOC_W, DOC_H } from './InvoiceDocument';

// Shows the full A4 invoice document scaled down to fit its container width,
// so the on-screen preview is identical to the exported PDF.
export default function ScaledInvoice({ invoice, business }: { invoice: Invoice; business: Business }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / DOC_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ width: '100%', height: scale ? DOC_H * scale : undefined, overflow: 'hidden', borderRadius: 14 }}
      className="bg-white shadow-md ring-1 ring-slate-200"
    >
      {scale > 0 && (
        <div style={{ width: DOC_W, height: DOC_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <InvoiceDocument invoice={invoice} business={business} />
        </div>
      )}
    </div>
  );
}

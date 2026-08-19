'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Business, Invoice } from '@/types';
import InvoiceDocument, { DOC_W, DOC_H, PAGE_GAP, paginateItems } from './InvoiceDocument';

// Shows the full A4 document (all pages, stacked) scaled down to fit its
// container width, so the on-screen preview is identical to the exported PDF.
export default function ScaledInvoice({ invoice, business }: { invoice: Invoice; business: Business }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const pageCount = useMemo(() => paginateItems(invoice).length, [invoice]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / DOC_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fullHeight = DOC_H * pageCount + PAGE_GAP * (pageCount - 1);

  return (
    <div
      ref={ref}
      style={{ width: '100%', height: scale ? fullHeight * scale : undefined, overflow: 'hidden', borderRadius: 14 }}
      className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-[0.5px] ring-hair"
    >
      {scale > 0 && (
        <div style={{ width: DOC_W, height: fullHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <InvoiceDocument invoice={invoice} business={business} />
        </div>
      )}
    </div>
  );
}

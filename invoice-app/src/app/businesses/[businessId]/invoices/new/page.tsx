'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import { getInvoice } from '@/lib/firestore';
import { Invoice } from '@/types';

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceInner />
    </Suspense>
  );
}

function NewInvoiceInner() {
  const { businessId } = useParams<{ businessId: string }>();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const [duplicateFrom, setDuplicateFrom] = useState<Invoice | undefined>();
  const [ready, setReady] = useState(!duplicateId);

  useEffect(() => {
    if (!duplicateId) return;
    getInvoice(duplicateId)
      .then((inv) => setDuplicateFrom(inv || undefined))
      .finally(() => setReady(true));
  }, [duplicateId]);

  return (
    <div>
      <TopBar title={duplicateId ? 'Duplicate Invoice' : 'New Invoice'} back={`/businesses/${businessId}/invoices`} />
      {ready ? (
        <InvoiceForm businessId={businessId} duplicateFrom={duplicateFrom} />
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      )}
    </div>
  );
}

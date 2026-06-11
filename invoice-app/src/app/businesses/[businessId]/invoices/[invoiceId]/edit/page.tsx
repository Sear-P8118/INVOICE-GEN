'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import { getInvoice } from '@/lib/firestore';
import { Invoice } from '@/types';

export default function EditInvoicePage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);

  useEffect(() => {
    getInvoice(invoiceId).then(setInvoice);
  }, [invoiceId]);

  return (
    <div>
      <TopBar title={invoice ? `Edit ${invoice.invoiceNumber}` : 'Edit Invoice'} back />
      {invoice === undefined && <p className="py-10 text-center text-sm text-slate-400">Loading…</p>}
      {invoice === null && <p className="py-10 text-center text-sm text-slate-400">Invoice not found.</p>}
      {invoice && <InvoiceForm businessId={businessId} existing={invoice} />}
    </div>
  );
}

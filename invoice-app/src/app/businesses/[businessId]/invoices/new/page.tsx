'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import { getCustomers, getInvoice } from '@/lib/firestore';
import { Customer, Invoice, InvoiceMode } from '@/types';

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
  // Started from a contact on the Customers page.
  const customerId = searchParams.get('customer');
  // A saved contact is by definition a repeat customer, so their invoice is a
  // trade one and gets filed back against the same record.
  const mode: InvoiceMode =
    searchParams.get('mode') === 'trade' || customerId ? 'trade' : 'fast';
  const [duplicateFrom, setDuplicateFrom] = useState<Invoice | undefined>();
  const [customer, setCustomer] = useState<Customer | undefined>();
  const [ready, setReady] = useState(!duplicateId && !customerId);

  useEffect(() => {
    if (!duplicateId) return;
    getInvoice(duplicateId)
      .then((inv) => setDuplicateFrom(inv || undefined))
      .finally(() => setReady(true));
  }, [duplicateId]);

  useEffect(() => {
    if (!customerId) return;
    getCustomers(businessId)
      .then((list) => setCustomer(list.find((c) => c.id === customerId)))
      .finally(() => setReady(true));
  }, [businessId, customerId]);

  return (
    <div>
      <TopBar
        title={
          duplicateId
            ? 'Duplicate Invoice'
            : customer
              ? `Invoice ${customer.name}`
              : mode === 'trade'
                ? 'Invoice Plus Trade Business'
                : 'Create Fast Invoice'
        }
        back={`/businesses/${businessId}/invoices`}
      />
      {ready ? (
        <InvoiceForm
          businessId={businessId}
          mode={mode}
          duplicateFrom={duplicateFrom}
          prefillCustomer={customer}
        />
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Share2, Download, Pencil, Copy, Trash2 } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import ScaledInvoice from '@/components/invoice/ScaledInvoice';
import { getBusiness, getInvoice, updateInvoiceStatus, deleteInvoice } from '@/lib/firestore';
import { downloadInvoicePDF, shareInvoicePDF } from '@/lib/pdf';
import { getBusinessConfig } from '@/lib/constants';
import { Business, Invoice, InvoiceStatus, INVOICE_STATUSES } from '@/types';

export default function InvoiceDetailPage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId: string }>();
  const router = useRouter();
  const config = getBusinessConfig(businessId)!;
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [business, setBusiness] = useState<Business | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInvoice(invoiceId).then(setInvoice);
    getBusiness(businessId).then(setBusiness);
  }, [invoiceId, businessId]);

  async function setStatus(status: InvoiceStatus) {
    if (!invoice) return;
    setInvoice({ ...invoice, status });
    await updateInvoiceStatus(invoice.id, status);
  }

  async function handleDelete() {
    if (!invoice) return;
    setBusy(true);
    await deleteInvoice(invoice.id);
    router.replace(`/businesses/${businessId}/invoices`);
  }

  if (invoice === undefined) {
    return (
      <div>
        <TopBar title="Invoice" back={`/businesses/${businessId}/invoices`} />
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (invoice === null) {
    return (
      <div>
        <TopBar title="Invoice" back={`/businesses/${businessId}/invoices`} />
        <p className="py-10 text-center text-sm text-slate-400">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title={invoice.invoiceNumber}
        back={`/businesses/${businessId}/invoices`}
        right={
          <button
            onClick={() => router.push(`/businesses/${businessId}/invoices/${invoice.id}/edit`)}
            className="rounded-xl p-2 text-slate-700 active:bg-slate-100"
            aria-label="Edit"
          >
            <Pencil size={20} />
          </button>
        }
      />

      <div className="space-y-4 px-4 py-4">
        {/* Live preview of the exact PDF that will be shared/downloaded */}
        {business ? (
          <ScaledInvoice invoice={invoice} business={business} />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 shadow-sm">
            Loading preview…
          </div>
        )}

        {/* Status switcher */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Status</p>
          <div className="grid grid-cols-4 gap-2">
            {INVOICE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-xl py-2.5 text-sm font-semibold ${
                  invoice.status === s
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            onClick={() => business && shareInvoicePDF(invoice, business)}
            disabled={!business}
            className={`${config.ui.accent} text-white`}
          >
            <Share2 size={18} /> Share PDF
          </Button>
          <Button variant="secondary" onClick={() => business && downloadInvoicePDF(invoice, business)} disabled={!business}>
            <Download size={18} /> Download
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push(`/businesses/${businessId}/invoices/new?duplicate=${invoice.id}`)}
          >
            <Copy size={18} /> Duplicate
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} /> Delete
          </Button>
        </div>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete invoice?">
        <p className="text-sm text-slate-600">
          {invoice.invoiceNumber} for {invoice.customerName} will be permanently deleted.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

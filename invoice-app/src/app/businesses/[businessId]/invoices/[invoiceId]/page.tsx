'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Share2, Download, Pencil, Copy, Trash2 } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { getBusiness, getInvoice, updateInvoiceStatus, deleteInvoice } from '@/lib/firestore';
import { downloadInvoicePDF, shareInvoicePDF } from '@/lib/pdf';
import { formatCurrency } from '@/lib/constants';
import { Business, Invoice, InvoiceStatus, INVOICE_STATUSES } from '@/types';

export default function InvoiceDetailPage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId: string }>();
  const router = useRouter();
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

  const docLabel = invoice.gstRegistered ? 'Tax Invoice' : 'Invoice';

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
        {/* Summary card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{docLabel}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{invoice.customerName}</p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(invoice.total)}</p>
          {invoice.gstRegistered && (
            <p className="mt-1 text-xs text-slate-400">includes {formatCurrency(invoice.gstAmount)} GST</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Issued</p>
              <p className="font-medium text-slate-700">{invoice.issueDate}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Due</p>
              <p className="font-medium text-slate-700">{invoice.dueDate}</p>
            </div>
          </div>
        </div>

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

        {/* Line items */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-900">Items</p>
          <div className="space-y-3">
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{item.description}</p>
                  <p className="text-xs text-slate-400">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-slate-900">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
            {invoice.gstRegistered && (
              <>
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (10%)</span>
                  <span>{formatCurrency(invoice.gstAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-1 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-1 text-sm font-bold text-slate-900">Notes</p>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button onClick={() => business && shareInvoicePDF(invoice, business)} disabled={!business}>
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

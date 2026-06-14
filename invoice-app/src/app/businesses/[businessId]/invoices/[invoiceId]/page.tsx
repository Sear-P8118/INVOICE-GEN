'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Share2, Download, Pencil, Copy, Trash2 } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { getBusiness, getInvoice, updateInvoiceStatus, deleteInvoice } from '@/lib/firestore';
import { downloadInvoicePDF, shareInvoicePDF } from '@/lib/pdf';
import { formatCurrency, getBusinessConfig } from '@/lib/constants';
import { Business, Invoice, InvoiceStatus, INVOICE_STATUSES, effectiveStatus, daysOverdue } from '@/types';

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

  const isQuote = invoice.status === 'Quote';
  const showDue = invoice.status === 'Pending' || invoice.status === 'Overdue';
  const docLabel = isQuote ? 'QUOTE' : invoice.gstRegistered ? 'TAX INVOICE' : 'INVOICE';
  const leftDateLabel = isQuote ? 'Dated' : invoice.status === 'Paid' ? 'Paid' : 'Issued';
  const totalLabel =
    invoice.status === 'Paid' ? 'Total paid' : isQuote ? 'Quote total' : 'Total due';
  const overdueDays = invoice.status === 'Overdue' ? daysOverdue(invoice.dueDate) : 0;
  const accentHex = `rgb(${config.pdf.accent.join(',')})`;
  const bandHex = `rgb(${config.pdf.band.join(',')})`;
  const bandIsLight = config.pdf.headerStyle === 'plain';

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
        {/* Document preview — mirrors the branded PDF */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
          {/* Brand header */}
          <div
            className="flex items-center justify-between gap-3 px-5 py-4"
            style={{ backgroundColor: bandIsLight ? '#ffffff' : bandHex }}
          >
            <span
              className="flex h-12 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={{ backgroundColor: config.logo.bg }}
            >
              <Image
                src={config.logo.src}
                alt=""
                width={config.logo.width}
                height={config.logo.height}
                className="h-11 w-auto object-contain"
              />
            </span>
            <div className="text-right">
              <p
                className="text-sm font-extrabold tracking-wide"
                style={{ color: bandIsLight ? accentHex : '#ffffff' }}
              >
                {docLabel}
              </p>
              <p
                className="text-xs font-medium"
                style={{ color: bandIsLight ? '#475569' : 'rgba(255,255,255,0.75)' }}
              >
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <div className="h-1" style={{ backgroundColor: accentHex }} />

          {/* Bill to / dates */}
          <div className="grid grid-cols-2 gap-3 px-5 py-4 text-sm">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentHex }}>
                Bill to
              </p>
              <p className="mt-1 truncate font-semibold text-slate-900">{invoice.customerName}</p>
              {invoice.customerAddress && (
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-500">{invoice.customerAddress}</p>
              )}
              {invoice.customerPhone && <p className="text-xs text-slate-500">{invoice.customerPhone}</p>}
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <StatusBadge status={effectiveStatus(invoice)} />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {leftDateLabel} <span className="font-medium text-slate-700">{invoice.issueDate}</span>
              </p>
              {showDue && (
                <p className="text-xs text-slate-400">
                  Due <span className="font-medium text-slate-700">{invoice.dueDate}</span>
                </p>
              )}
              {overdueDays > 0 && (
                <p className="text-xs font-semibold text-red-600">
                  {overdueDays} day{overdueDays === 1 ? '' : 's'} overdue
                </p>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="px-5">
            <div
              className="grid grid-cols-[1fr_auto] rounded-t-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: `rgb(${config.pdf.tableHeadFill.join(',')})`,
                color: `rgb(${config.pdf.tableHeadText.join(',')})`,
              }}
            >
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-slate-100 border-x border-b border-slate-100">
              {invoice.lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{item.description}</p>
                    <p className="text-xs text-slate-400">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="self-center font-semibold text-slate-900">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="px-5 pb-5 pt-3">
            <div className="ml-auto w-full max-w-[230px] space-y-1 text-sm">
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
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2 text-base font-bold text-white"
                style={{ backgroundColor: accentHex }}
              >
                <span>{totalLabel}</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <p className="text-right text-[11px] text-slate-400">
                {invoice.gstRegistered
                  ? `Includes ${formatCurrency(invoice.gstAmount)} GST`
                  : 'No GST has been charged'}
              </p>
            </div>

            {(business?.bsb || business?.accountNumber) && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600" style={{ borderLeft: `3px solid ${accentHex}` }}>
                <p className="font-bold text-slate-800">Payment details (EFT)</p>
                {business.accountName && <p className="mt-1">Account name: {business.accountName}</p>}
                {business.bankName && <p>Bank: {business.bankName}</p>}
                {business.bsb && <p>BSB: {business.bsb}</p>}
                {business.accountNumber && <p>Account no: {business.accountNumber}</p>}
                <p className="mt-1 font-semibold">Reference: {invoice.invoiceNumber}</p>
              </div>
            )}

            {invoice.notes && (
              <div className="mt-4 text-xs">
                <p className="font-bold uppercase tracking-wider" style={{ color: accentHex }}>
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{invoice.notes}</p>
              </div>
            )}

            <p className="mt-5 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-400">
              {config.pdf.footerNote}
            </p>
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

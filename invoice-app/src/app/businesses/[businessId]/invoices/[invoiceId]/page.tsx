'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Share2, Download, Pencil, Copy, Trash2, Mail, FileCheck2 } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { Input, Textarea } from '@/components/ui/Field';
import ScaledInvoice from '@/components/invoice/ScaledInvoice';
import { watchBusiness, watchInvoice, updateInvoiceStatus, deleteInvoice, convertQuoteToInvoice } from '@/lib/firestore';
import { getBusinessConfig } from '@/lib/constants';
import { auth } from '@/lib/firebase';
import { Business, Invoice, InvoiceStatus, INVOICE_STATUSES } from '@/types';

export default function InvoiceDetailPage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId: string }>();
  const router = useRouter();
  const config = getBusinessConfig(businessId)!;
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [business, setBusiness] = useState<Business | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // Quote → invoice
  const [converting, setConverting] = useState(false);
  const [convertWarn, setConvertWarn] = useState(false);

  // Email
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | string>('idle');

  // Live cache-first reads: the page renders instantly and stays accurate.
  useEffect(() => watchInvoice(invoiceId, setInvoice), [invoiceId]);
  useEffect(() => watchBusiness(businessId, setBusiness), [businessId]);

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

  async function doConvert() {
    if (!invoice) return;
    setConvertWarn(false);
    setConverting(true);
    try {
      const newId = await convertQuoteToInvoice(invoice);
      router.replace(`/businesses/${businessId}/invoices/${newId}`);
    } catch {
      setConverting(false);
    }
  }

  function handleConvert() {
    if (!invoice) return;
    if (invoice.convertedInvoiceId) setConvertWarn(true);
    else doConvert();
  }

  function openEmail() {
    if (!invoice) return;
    setEmailTo(invoice.customerEmail || '');
    setEmailMsg('');
    setEmailState('idle');
    setEmailOpen(true);
  }

  async function sendEmail() {
    if (!invoice || !business) return;
    if (!emailTo.trim()) {
      setEmailState('Enter a recipient email.');
      return;
    }
    setEmailState('sending');
    try {
      const token = await auth().currentUser?.getIdToken();
      const { invoicePdfBase64 } = await import('@/lib/pdf');
      const pdfBase64 = await invoicePdfBase64(invoice, business);
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({
          to: emailTo.trim(),
          businessName: business.name,
          invoiceNumber: invoice.invoiceNumber,
          docLabel: invoice.status === 'Quote' ? 'Quote' : invoice.gstRegistered ? 'Tax Invoice' : 'Invoice',
          pdfBase64,
          replyTo: business.email || undefined,
          message: emailMsg.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailState(data.error || 'Could not send the email.');
        return;
      }
      setEmailState('sent');
    } catch {
      setEmailState('Could not send. Check your connection and try again.');
    }
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

      <div className="px-4 py-4">
        <div className="space-y-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6 lg:space-y-0">
          {/* Live preview of the exact PDF that will be shared/downloaded */}
          {business ? (
            <ScaledInvoice invoice={invoice} business={business} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 shadow-sm">
              Loading preview…
            </div>
          )}

          {/* Controls (sticky rail on desktop) */}
          <div className="space-y-4 lg:sticky lg:top-20">
            {/* Status switcher */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Status</p>
              <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
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
            <div className="space-y-3 pt-1">
              {invoice.status === 'Quote' && (
                <Button
                  full
                  onClick={handleConvert}
                  disabled={converting}
                  className="min-h-12 bg-emerald-600 text-white active:bg-emerald-700"
                >
                  <FileCheck2 size={18} />{' '}
                  {converting ? 'Converting…' : invoice.convertedInvoiceId ? 'Convert to invoice again' : 'Convert to invoice'}
                </Button>
              )}
              <Button full onClick={openEmail} disabled={!business} className={`min-h-12 ${config.ui.accent} text-white`}>
                <Mail size={18} /> Email to customer
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={async () => { if (business) (await import('@/lib/pdf')).shareInvoicePDF(invoice, business); }} disabled={!business}>
                  <Share2 size={18} /> Share
                </Button>
                <Button variant="secondary" onClick={async () => { if (business) (await import('@/lib/pdf')).downloadInvoicePDF(invoice, business); }} disabled={!business}>
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
          </div>
        </div>
      </div>

      {/* Re-convert warning */}
      <Sheet open={convertWarn} onClose={() => setConvertWarn(false)} title="Already converted">
        <p className="text-sm text-slate-600">
          This quote has already been converted to an invoice. Converting again creates another, separate invoice with a
          new number.
        </p>
        <div className="mt-5 space-y-2">
          {invoice.convertedInvoiceId && (
            <Button
              full
              variant="secondary"
              onClick={() => router.replace(`/businesses/${businessId}/invoices/${invoice.convertedInvoiceId}`)}
            >
              Open the existing invoice
            </Button>
          )}
          <Button full onClick={doConvert} disabled={converting} className="bg-emerald-600 text-white">
            {converting ? 'Converting…' : 'Convert again'}
          </Button>
          <Button full variant="ghost" onClick={() => setConvertWarn(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>

      {/* Email sheet */}
      <Sheet open={emailOpen} onClose={() => setEmailOpen(false)} title="Email invoice">
        {emailState === 'sent' ? (
          <div className="py-4 text-center">
            <Mail className="mx-auto mb-2 text-emerald-500" size={32} />
            <p className="font-semibold text-slate-900">Sent to {emailTo}</p>
            <p className="mt-1 text-sm text-slate-500">The customer has the PDF in their inbox.</p>
            <Button full className="mt-5" onClick={() => setEmailOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Send to"
              type="email"
              inputMode="email"
              placeholder="customer@email.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
            <Textarea
              label="Message (optional)"
              rows={3}
              placeholder="Leave blank to use the default message."
              value={emailMsg}
              onChange={(e) => setEmailMsg(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Sends {invoice.invoiceNumber} as a PDF from {business?.name}. Replies go to {business?.email || 'your business email'}.
            </p>
            {typeof emailState === 'string' && emailState !== 'idle' && emailState !== 'sending' && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{emailState}</p>
            )}
            <Button full onClick={sendEmail} disabled={emailState === 'sending'} className={`${config.ui.accent} text-white`}>
              {emailState === 'sending' ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        )}
      </Sheet>

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

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Share2,
  Download,
  Pencil,
  Copy,
  Trash2,
  Mail,
  MessageSquare,
  Star,
  FileCheck2,
  Check,
} from 'lucide-react';
import TopBar, { NavButton } from '@/components/ui/TopBar';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { Input, Textarea, FieldGroup } from '@/components/ui/Field';
import { List, Row } from '@/components/ui/List';
import { statusColor, statusLabel } from '@/components/ui/StatusBadge';
import ScaledInvoice from '@/components/invoice/ScaledInvoice';
import {
  watchBusiness,
  watchInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  convertQuoteToInvoice,
} from '@/lib/firestore';
import { formatCurrency } from '@/lib/constants';
import {
  invoiceIntro,
  reviewSms,
  invoiceWithReviewSms,
  smsHref,
  formatDate,
} from '@/lib/messages';
import { auth } from '@/lib/firebase';
import { Business, Invoice, InvoiceStatus, INVOICE_STATUSES } from '@/types';

export default function InvoiceDetailPage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [business, setBusiness] = useState<Business | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Quote → invoice
  const [converting, setConverting] = useState(false);
  const [convertWarn, setConvertWarn] = useState(false);

  // Email
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailKind, setEmailKind] = useState<'invoice' | 'review'>('invoice');
  const [emailTo, setEmailTo] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [askReview, setAskReview] = useState(false);
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | string>('idle');

  // Text message
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsKind, setSmsKind] = useState<'invoice' | 'review'>('invoice');
  const [smsTo, setSmsTo] = useState('');
  const [smsMsg, setSmsMsg] = useState('');

  // Live cache-first reads: the page renders instantly and stays accurate.
  useEffect(() => watchInvoice(invoiceId, setInvoice), [invoiceId]);
  useEffect(() => watchBusiness(businessId, setBusiness), [businessId]);

  const hasReviewLink = Boolean(business?.reviewUrl?.trim());

  async function setStatus(status: InvoiceStatus) {
    if (!invoice) return;
    setInvoice({ ...invoice, status });
    setStatusOpen(false);
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

  // ---------- Email ----------

  function openEmail(kind: 'invoice' | 'review') {
    if (!invoice || !business) return;
    setEmailKind(kind);
    setEmailTo(invoice.customerEmail || '');
    setEmailMsg(invoiceIntro(invoice, business));
    // The invoice email asks for a review too, whenever there's a link to point at.
    setAskReview(hasReviewLink);
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
      // A review-only email has no document to attach.
      let pdfBase64: string | undefined;
      if (emailKind === 'invoice') {
        const { invoicePdfBase64 } = await import('@/lib/pdf');
        pdfBase64 = await invoicePdfBase64(invoice, business);
      }
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({
          to: emailTo.trim(),
          kind: emailKind,
          businessName: business.name,
          businessAddress: business.address,
          businessPhone: business.phone,
          businessEmail: business.email,
          customerName: invoice.customerName,
          invoiceNumber: invoice.invoiceNumber,
          amount: formatCurrency(invoice.total),
          dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : '',
          docLabel:
            invoice.status === 'Quote' ? 'Quote' : invoice.gstRegistered ? 'Tax Invoice' : 'Invoice',
          pdfBase64,
          replyTo: business.email || undefined,
          intro: emailKind === 'invoice' ? emailMsg.trim() || undefined : undefined,
          // A review-only email is nothing but the review ask.
          reviewUrl:
            emailKind === 'review' || (askReview && hasReviewLink) ? business.reviewUrl : undefined,
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

  // ---------- Text message ----------

  function openSms(kind: 'invoice' | 'review') {
    if (!invoice || !business) return;
    setSmsKind(kind);
    setSmsTo(invoice.customerPhone || '');
    setSmsMsg(
      kind === 'review' ? reviewSms(invoice, business) : invoiceWithReviewSms(invoice, business)
    );
    setSmsOpen(true);
  }

  function sendSms() {
    // Hands off to the phone's own Messages app with the text pre-written —
    // it sends from Sami's number, so replies come back to him.
    window.location.href = smsHref(smsTo, smsMsg);
    setSmsOpen(false);
  }

  if (invoice === undefined) {
    return (
      <div>
        <TopBar title="Invoice" back={`/businesses/${businessId}/invoices`} backLabel="Invoices" />
        <p className="py-10 text-center text-[15px] text-label3">Loading…</p>
      </div>
    );
  }
  if (invoice === null) {
    return (
      <div>
        <TopBar title="Invoice" back={`/businesses/${businessId}/invoices`} backLabel="Invoices" />
        <p className="py-10 text-center text-[15px] text-label3">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <TopBar
        title={invoice.invoiceNumber || 'Invoice'}
        back={`/businesses/${businessId}/invoices`}
        backLabel="Invoices"
        right={
          <NavButton
            href={`/businesses/${businessId}/invoices/${invoice.id}/edit`}
            label="Edit invoice"
          >
            <Pencil size={17} />
          </NavButton>
        }
      />

      <div className="px-4 py-4 lg:px-6">
        {/* Headline: who, how much, what state */}
        <div className="rounded-[14px] bg-surface px-4 py-4">
          <p className="text-[15px] text-label2">{invoice.customerName}</p>
          <p className="numeric mt-0.5 text-[34px] font-bold leading-none text-label">
            {formatCurrency(invoice.total)}
          </p>
          <button
            onClick={() => setStatusOpen(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[14px] font-semibold text-white active:opacity-70"
            style={{ backgroundColor: statusColor(invoice.status) }}
          >
            {statusLabel(invoice.status)}
            <span className="text-white/70">Change</span>
          </button>
        </div>

        <div className="mt-4 space-y-4 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6 lg:space-y-0">
          {/* Live preview of the exact PDF that will be shared/downloaded */}
          <div className="lg:order-2 lg:sticky lg:top-20 lg:space-y-4">
            {/* Send it */}
            <List header="Send to customer">
              <Row
                onClick={() => openEmail('invoice')}
                icon={<Mail size={17} />}
                iconColor="var(--color-info)"
                title="Email invoice"
                subtitle={invoice.customerEmail || 'No email on this invoice'}
              />
              <Row
                onClick={() => openSms('invoice')}
                icon={<MessageSquare size={17} />}
                iconColor="var(--color-pos)"
                title="Text invoice"
                subtitle={invoice.customerPhone || 'No phone on this invoice'}
              />
              <Row
                onClick={async () => {
                  if (business) (await import('@/lib/pdf')).shareInvoicePDF(invoice, business);
                }}
                icon={<Share2 size={17} />}
                iconColor="var(--color-mute)"
                title="Share PDF"
              />
            </List>

            {/* Ask for a review */}
            <List
              header="Reviews"
              footer={
                hasReviewLink ? (
                  'Sends the pre-written thank-you with your review link.'
                ) : (
                  <>
                    Add your review link in{' '}
                    <Link
                      href={`/businesses/${businessId}/settings`}
                      className="text-[var(--tint)]"
                    >
                      Settings
                    </Link>{' '}
                    to switch this on.
                  </>
                )
              }
            >
              <Row
                onClick={() => openSms('review')}
                disabled={!hasReviewLink}
                icon={<Star size={17} />}
                iconColor="var(--color-warn)"
                title="Text a review request"
              />
              <Row
                onClick={() => openEmail('review')}
                disabled={!hasReviewLink}
                icon={<Star size={17} />}
                iconColor="var(--color-warn)"
                title="Email a review request"
              />
            </List>

            {/* Everything else */}
            <List>
              {invoice.status === 'Quote' && (
                <Row
                  onClick={handleConvert}
                  disabled={converting}
                  icon={<FileCheck2 size={17} />}
                  iconColor="var(--color-pos)"
                  title={converting ? 'Converting…' : 'Convert to invoice'}
                />
              )}
              <Row
                onClick={async () => {
                  if (business) (await import('@/lib/pdf')).downloadInvoicePDF(invoice, business);
                }}
                icon={<Download size={17} />}
                iconColor="var(--color-mute)"
                title="Download PDF"
              />
              <Row
                href={`/businesses/${businessId}/invoices/new?duplicate=${invoice.id}`}
                icon={<Copy size={17} />}
                iconColor="var(--color-mute)"
                title="Duplicate"
              />
              <Row
                onClick={() => setConfirmDelete(true)}
                icon={<Trash2 size={17} />}
                iconColor="var(--color-neg)"
                title="Delete invoice"
                destructive
              />
            </List>
          </div>

          <div className="lg:order-1">
            {business ? (
              <ScaledInvoice invoice={invoice} business={business} />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-[14px] bg-surface text-[15px] text-label3">
                Loading preview…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status picker */}
      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Status">
        <div className="hairline overflow-hidden rounded-[14px] bg-surface">
          {INVOICE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="pressable flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span
                className="h-[10px] w-[10px] rounded-full"
                style={{ backgroundColor: statusColor(s) }}
              />
              <span className="flex-1 text-[17px] text-label">{s}</span>
              {invoice.status === s && (
                <Check size={20} strokeWidth={2.6} style={{ color: 'var(--tint)' }} />
              )}
            </button>
          ))}
        </div>
      </Sheet>

      {/* Re-convert warning */}
      <Sheet open={convertWarn} onClose={() => setConvertWarn(false)} title="Already converted">
        <p className="px-1 text-[15px] leading-snug text-label2">
          This quote has already been converted to an invoice. Converting again creates another,
          separate invoice with a new number.
        </p>
        <div className="mt-5 space-y-2">
          {invoice.convertedInvoiceId && (
            <Button
              full
              large
              onClick={() =>
                router.replace(`/businesses/${businessId}/invoices/${invoice.convertedInvoiceId}`)
              }
            >
              Open the existing invoice
            </Button>
          )}
          <Button full variant="secondary" onClick={doConvert} disabled={converting}>
            {converting ? 'Converting…' : 'Convert again'}
          </Button>
        </div>
      </Sheet>

      {/* Email sheet */}
      <Sheet
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title={emailKind === 'review' ? 'Review request' : 'Email invoice'}
      >
        {emailState === 'sent' ? (
          <div className="py-8 text-center">
            <Check className="mx-auto text-pos" size={44} strokeWidth={2.5} />
            <p className="mt-3 text-[19px] font-semibold text-label">Sent to {emailTo}</p>
            <p className="mt-1 text-[15px] text-label2">
              {emailKind === 'review'
                ? 'The review request is on its way.'
                : 'The customer has the PDF in their inbox.'}
            </p>
            <Button full large className="mt-6" onClick={() => setEmailOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <FieldGroup>
              <Input
                label="To"
                type="email"
                inputMode="email"
                placeholder="customer@email.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </FieldGroup>

            {emailKind === 'invoice' ? (
              <FieldGroup
                header="Message"
                footer={`Sends ${invoice.invoiceNumber} as a PDF in your branded template. Replies go to ${business?.email || 'your business email'}.`}
              >
                <Textarea rows={4} value={emailMsg} onChange={(e) => setEmailMsg(e.target.value)} />
              </FieldGroup>
            ) : (
              <p className="rounded-[12px] bg-surface px-4 py-3 text-[15px] leading-snug text-label2">
                Sends your branded &ldquo;Fully charged. Fully satisfied?&rdquo; thank-you with the
                Google review button. Nothing is attached.
              </p>
            )}

            {emailKind === 'invoice' && (
              <List
                footer={
                  hasReviewLink
                    ? 'Adds a "Leave us a review" button under the message.'
                    : 'Add your review link in Settings to use this.'
                }
              >
                <Row
                  onClick={() => hasReviewLink && setAskReview((v) => !v)}
                  disabled={!hasReviewLink}
                  chevron={false}
                  icon={<Star size={17} />}
                  iconColor="var(--color-warn)"
                  title="Ask for a review"
                  value={
                    askReview && hasReviewLink ? (
                      <Check size={20} strokeWidth={2.6} style={{ color: 'var(--tint)' }} />
                    ) : undefined
                  }
                />
              </List>
            )}

            {typeof emailState === 'string' && emailState !== 'idle' && emailState !== 'sending' && (
              <p className="rounded-[12px] bg-neg/10 px-4 py-3 text-[15px] text-neg">{emailState}</p>
            )}

            <Button full large onClick={sendEmail} disabled={emailState === 'sending'}>
              {emailState === 'sending' ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        )}
      </Sheet>

      {/* Text message sheet */}
      <Sheet
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        title={smsKind === 'review' ? 'Review request' : 'Text invoice'}
      >
        <div className="space-y-4 pt-1">
          <FieldGroup>
            <Input
              label="To"
              type="tel"
              inputMode="tel"
              placeholder="04…"
              value={smsTo}
              onChange={(e) => setSmsTo(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup
            header="Message"
            footer="Opens Messages with this ready to send — it goes from your own number, so replies come back to you."
          >
            <Textarea rows={6} value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} />
          </FieldGroup>

          <Button full large onClick={sendSms} disabled={!smsTo.trim()}>
            <MessageSquare size={18} /> Open Messages
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete invoice?">
        <p className="px-1 text-[15px] leading-snug text-label2">
          {invoice.invoiceNumber} for {invoice.customerName} will be permanently deleted.
        </p>
        <div className="mt-5 space-y-2">
          <Button full large variant="danger" onClick={handleDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete invoice'}
          </Button>
          <Button full variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

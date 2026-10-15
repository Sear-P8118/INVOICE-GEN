'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
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
  Paperclip,
  Loader2,
  CheckCircle2,
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
  markInvoiceEmailed,
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
import { format, isToday, parseISO } from 'date-fns';

function sentWhen(iso: string): string {
  const d = parseISO(iso);
  return isToday(d) ? `today at ${format(d, 'h:mm a')}` : format(d, "d MMM yyyy 'at' h:mm a");
}

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

  // The invoice PDF, built once and reused by every way of sending it. It is
  // prepared as soon as the page has its data, for two reasons: the email can
  // never go out without it, and iOS only lets navigator.share run inside the
  // tap that triggered it — so the file has to exist before the button is hit.
  // Held together with the version of the invoice it was rendered from, so an
  // edited invoice can never be sent using the PDF of the old one.
  const [built, setBuilt] = useState<{ key: string; file: File } | null>(null);
  const [pdfError, setPdfError] = useState('');

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
  const [smsDone, setSmsDone] = useState('');
  const [smsBusy, setSmsBusy] = useState(false);

  // Live cache-first reads: the page renders instantly and stays accurate.
  useEffect(() => watchInvoice(invoiceId, setInvoice), [invoiceId]);
  useEffect(() => watchBusiness(businessId, setBusiness), [businessId]);

  const hasReviewLink = Boolean(business?.reviewUrl?.trim());
  // Only true once the PDF exists AND this device can put a file into a
  // message. A plain sms: link carries text and nothing else.
  const [canAttachToSms, setCanAttachToSms] = useState(false);
  // A laptop cannot send a text at all: there is no Messages app behind an
  // sms: link, so following one just silently goes nowhere. Subscribed to
  // rather than assumed, and the server snapshot says desktop so the markup
  // matches on first paint.
  const isHandheld = useSyncExternalStore(subscribeCoarsePointer, isCoarsePointer, () => false);

  /**
   * What "Text invoice" can honestly do on this device:
   *   share   — put the PDF and the words into Messages (phone, iPad)
   *   sms     — open Messages with the words only (older Android)
   *   desktop — no texting at all; hand over the words and the file instead
   */
  const smsMode: 'share' | 'sms' | 'desktop' = canAttachToSms
    ? 'share'
    : isHandheld
      ? 'sms'
      : 'desktop';

  // Every edit and status change moves this, which retires the cached PDF
  // without anything having to remember to clear it.
  const pdfKey = invoice ? `${invoice.id}|${invoice.updatedAt}|${invoice.status}` : '';
  const pdf = built?.key === pdfKey ? built.file : null;

  // Built up front rather than at send time: the email must never go out
  // without it, and iOS only honours navigator.share inside the tap that
  // triggered it — so the file has to exist before the button is pressed.
  useEffect(() => {
    if (!invoice || !business) return;
    let cancelled = false;
    (async () => {
      try {
        const { invoicePdfFile, canShareFile } = await import('@/lib/pdf');
        const file = await invoicePdfFile(invoice, business);
        if (cancelled) return;
        setBuilt({ key: `${invoice.id}|${invoice.updatedAt}|${invoice.status}`, file });
        setCanAttachToSms(canShareFile(file));
        setPdfError('');
      } catch (e) {
        if (!cancelled) setPdfError((e as Error).message || 'The invoice PDF could not be built.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice, business]);

  /** The prepared PDF, waiting on the build if it is still running. */
  async function requirePdf(): Promise<File> {
    if (pdf) return pdf;
    if (!invoice || !business) throw new Error('The invoice is still loading.');
    const { invoicePdfFile } = await import('@/lib/pdf');
    return invoicePdfFile(invoice, business);
  }

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
      // Every email carries the invoice — the review request included. If the
      // PDF can't be built we stop here rather than sending a bare email.
      let file: File;
      try {
        file = await requirePdf();
      } catch (e) {
        setEmailState(
          `${(e as Error).message || 'The invoice PDF could not be built.'} Nothing was sent.`
        );
        return;
      }

      // Sent as multipart rather than base64 inside JSON: base64 adds a third
      // to the size, which is what used to tip a long invoice over the request
      // limit and lose the attachment.
      const form = new FormData();
      form.append('pdf', file, file.name);
      form.append(
        'payload',
        JSON.stringify({
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
          paid: invoice.status === 'Paid',
          status:
            invoice.status === 'Paid'
              ? 'Paid in full'
              : invoice.dueDate
                ? `Due ${formatDate(invoice.dueDate)}`
                : invoice.status,
          invoiceDate: invoice.issueDate ? formatDate(invoice.issueDate) : '',
          docLabel:
            invoice.status === 'Quote' ? 'Quote' : invoice.gstRegistered ? 'Tax Invoice' : 'Invoice',
          replyTo: business.email || undefined,
          intro: emailKind === 'invoice' ? emailMsg.trim() || undefined : undefined,
          // A review email leads with the ask; the invoice summary sits under
          // it either way, because the PDF is attached to both.
          reviewUrl:
            emailKind === 'review' || (askReview && hasReviewLink) ? business.reviewUrl : undefined,
        })
      );

      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        // No Content-Type: the browser writes the multipart boundary itself.
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailState(data.error || 'Could not send the email.');
        return;
      }
      setEmailState('sent');
      // Only the invoice email marks it sent — a review request isn't the invoice going out.
      if (emailKind === 'invoice') {
        const to = emailTo.trim();
        setInvoice({ ...invoice, emailedAt: new Date().toISOString(), emailedTo: to });
        markInvoiceEmailed(invoice.id, to).catch(() => {});
      }
    } catch {
      setEmailState('Could not send. Check your connection and try again.');
    }
  }

  // ---------- Text message ----------

  function openSms(kind: 'invoice' | 'review') {
    if (!invoice || !business) return;
    setSmsKind(kind);
    setSmsTo(invoice.customerPhone || '');
    // The wording follows what the message will actually carry, so it never
    // promises an attachment the text can't hold.
    // Only the share sheet genuinely carries the PDF, so only it may say so.
    const attaches = smsMode === 'share';
    setSmsMsg(
      kind === 'review'
        ? reviewSms(invoice, business, attaches)
        : invoiceWithReviewSms(invoice, business, attaches)
    );
    setSmsDone('');
    setSmsOpen(true);
  }

  /** Copies the message and saves the PDF — what a laptop can actually do. */
  async function handOffToPhone(prefix: string) {
    const { savePdfFile } = await import('@/lib/pdf');
    let copied = false;
    try {
      await navigator.clipboard.writeText(smsMsg);
      copied = true;
    } catch {
      // Clipboard access can be refused; the message is on screen to copy.
    }
    let saved = false;
    try {
      savePdfFile(await requirePdf());
      saved = true;
    } catch {
      /* the PDF error is already shown above the button */
    }
    setSmsDone(
      `${prefix}${copied ? 'Message copied' : 'Copy the message above'}${
        saved ? ' and the invoice downloaded' : ''
      } — send them from your phone.`
    );
  }

  async function sendSms() {
    if (!invoice || smsBusy) return;
    setSmsDone('');
    setSmsBusy(true);
    try {
      await runSms();
    } finally {
      setSmsBusy(false);
    }
  }

  async function runSms() {
    if (!invoice) return;

    // The share sheet is the only route that puts the PDF itself into a text;
    // an sms: link carries characters and nothing else. Picking Messages there
    // still sends from your own number, so replies come back to you.
    if (smsMode === 'share' && pdf) {
      const { sharePdfFile } = await import('@/lib/pdf');
      const result = await sharePdfFile(pdf, `Invoice ${invoice.invoiceNumber}`, smsMsg);
      if (result === 'shared' || result === 'cancelled') {
        setSmsOpen(false);
        return;
      }
      // The sheet refused to open. Say what happened instead of appearing dead.
      if (result === 'downloaded') {
        let copied = false;
        try {
          await navigator.clipboard.writeText(smsMsg);
          copied = true;
        } catch {
          /* the message is on screen to copy */
        }
        setSmsDone(
          `This device wouldn’t open the share sheet, so the invoice downloaded instead${
            copied ? ' and the message is copied' : ' — copy the message above'
          }.`
        );
        return;
      }
      await handOffToPhone('Sharing isn’t available here. ');
      return;
    }

    if (smsMode === 'sms') {
      window.location.href = smsHref(smsTo, smsMsg);
      setSmsOpen(false);
      return;
    }

    // Desktop. Rather than follow an sms: link into nothing, hand over the two
    // things needed to send it from a phone: the words and the invoice.
    await handOffToPhone('');
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
        {invoice.emailedAt && (
          <div
            key={invoice.emailedAt}
            className="sent-banner mb-3 flex items-center gap-3 rounded-[14px] bg-pos px-4 py-3.5 text-white shadow-[0_6px_20px_rgba(52,199,89,0.35)]"
          >
            <CheckCircle2 size={28} strokeWidth={2.4} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[17px] font-bold leading-tight">Invoice emailed</p>
              <p className="truncate text-[14px] text-white/90">
                To {invoice.emailedTo} · {sentWhen(invoice.emailedAt)}
              </p>
            </div>
          </div>
        )}
        <div
          className={`rounded-[14px] px-4 py-4 transition-colors duration-500 ${
            invoice.emailedAt ? 'bg-pos/10 ring-2 ring-pos' : 'bg-surface'
          }`}
        >
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
                icon={invoice.emailedAt ? <Check size={17} strokeWidth={3} /> : <Mail size={17} />}
                iconColor={invoice.emailedAt ? 'var(--color-pos)' : 'var(--color-info)'}
                title={invoice.emailedAt ? 'Emailed ✓ — send again' : 'Email invoice'}
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
                  // The same file the email attaches, so what you hand over by
                  // AirDrop or WhatsApp is byte-for-byte what a customer is sent.
                  const { sharePdfFile } = await import('@/lib/pdf');
                  await sharePdfFile(await requirePdf(), `Invoice ${invoice.invoiceNumber}`);
                }}
                icon={<Share2 size={17} />}
                iconColor="var(--color-mute)"
                title="Share PDF"
                subtitle={pdf ? undefined : 'Preparing…'}
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
          <div className="sent-panel -mx-4 -mb-6 bg-pos px-6 pb-8 pt-10 text-center text-white">
            <span className="sent-check mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <Check size={46} strokeWidth={3} />
            </span>
            <p className="mt-4 text-[24px] font-bold tracking-[-0.02em]">Email sent</p>
            <p className="mt-1 text-[15px] text-white/90">To {emailTo}</p>
            <p className="mt-0.5 text-[14px] text-white/80">
              {invoice.invoiceNumber || 'The invoice'} went with it as a PDF.
            </p>
            <button
              onClick={() => setEmailOpen(false)}
              className="mt-7 min-h-[50px] w-full rounded-[12px] bg-white text-[17px] font-semibold text-pos active:opacity-80"
            >
              Done
            </button>
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

            {emailKind === 'invoice' && askReview && hasReviewLink ? (
              <FieldGroup
                header="Review message"
                footer={`The line under the headline in the review panel. ${invoice.invoiceNumber} is attached as a PDF; replies go to ${business?.email || 'your business email'}.`}
              >
                <Textarea rows={4} value={emailMsg} onChange={(e) => setEmailMsg(e.target.value)} />
              </FieldGroup>
            ) : emailKind === 'invoice' ? (
              <p className="rounded-[12px] bg-surface px-4 py-3 text-[15px] leading-snug text-label2">
                Sends {invoice.invoiceNumber} as a PDF with the invoice summary. Switch on
                &ldquo;Ask for a review&rdquo; below to include the review panel.
              </p>
            ) : (
              <p className="rounded-[12px] bg-surface px-4 py-3 text-[15px] leading-snug text-label2">
                Leads with the Google review ask, with {invoice.invoiceNumber || 'the invoice'}{' '}
                attached as a PDF underneath.
              </p>
            )}

            <AttachmentStatus pdf={pdf} error={pdfError} />

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

            <Button
              full
              large
              onClick={sendEmail}
              disabled={emailState === 'sending' || (!pdf && !pdfError)}
            >
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
            footer={
              smsMode === 'share'
                ? 'Opens the share sheet — pick Messages and the invoice goes with the text, from your own number, so replies come back to you.'
                : smsMode === 'sms'
                  ? 'Opens Messages with this ready to send — it goes from your own number, so replies come back to you.'
                  : 'A laptop can’t send a text. This copies the message and downloads the invoice so you can send both from your phone.'
            }
          >
            <Textarea rows={6} value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} />
          </FieldGroup>

          <AttachmentStatus
            pdf={pdf}
            error={pdfError}
            note={
              pdf && smsMode === 'sms'
                ? 'This phone can’t put a file into a text, so the message goes on its own.'
                : undefined
            }
          />

          {smsDone && (
            <p className="flex items-start gap-2 rounded-[12px] bg-pos/10 px-4 py-3 text-[15px] leading-snug text-pos">
              <Check size={17} className="mt-0.5 shrink-0" strokeWidth={2.6} />
              {smsDone}
            </p>
          )}

          <Button
            full
            large
            onClick={sendSms}
            // A phone number only matters when we're actually opening Messages.
            disabled={
              smsBusy || (smsMode !== 'desktop' && !smsTo.trim()) || (!pdf && !pdfError)
            }
          >
            {smsBusy ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Working…
              </>
            ) : smsMode === 'share' ? (
              <>
                <Paperclip size={18} /> Send with invoice
              </>
            ) : smsMode === 'sms' ? (
              <>
                <MessageSquare size={18} /> Open Messages
              </>
            ) : (
              <>
                <Copy size={18} /> Copy message &amp; download PDF
              </>
            )}
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

/**
 * Says plainly whether the invoice is on the message yet. The old flow gave no
 * sign either way, so an email could go out with nothing attached and look
 * exactly like one that worked.
 */
function AttachmentStatus({
  pdf,
  error,
  note,
}: {
  pdf: File | null;
  error: string;
  note?: string;
}) {
  if (error) {
    return (
      <p className="rounded-[12px] bg-neg/10 px-4 py-3 text-[15px] leading-snug text-neg">
        {error} Nothing will be sent without it — try reopening the invoice.
      </p>
    );
  }
  if (!pdf) {
    return (
      <p className="flex items-center gap-2 rounded-[12px] bg-surface px-4 py-3 text-[15px] text-label2">
        <Loader2 size={16} className="animate-spin" /> Preparing the invoice PDF…
      </p>
    );
  }
  return (
    <div className="rounded-[12px] bg-surface px-4 py-3">
      <p className="flex items-center gap-2 text-[15px] text-label2">
        <Paperclip size={16} style={{ color: 'var(--color-pos)' }} />
        <span className="min-w-0 flex-1 truncate text-label">{pdf.name}</span>
        <span className="shrink-0 text-[13px] text-label3">
          {Math.max(1, Math.round(pdf.size / 1024))} KB
        </span>
      </p>
      {note && <p className="mt-1.5 text-[13px] leading-snug text-label2">{note}</p>}
    </div>
  );
}

// Whether this is a touch device — the difference between a phone that can
// open Messages and a laptop that cannot.
const COARSE_POINTER = '(pointer: coarse)';

function subscribeCoarsePointer(onChange: () => void): () => void {
  const mq = window.matchMedia(COARSE_POINTER);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function isCoarsePointer(): boolean {
  return window.matchMedia(COARSE_POINTER).matches;
}

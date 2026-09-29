import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyFirebaseUser } from '@/lib/serverAuth';
import { renderInvoiceEmail } from '@/lib/emailTemplate';

export const runtime = 'nodejs';

interface Body {
  to: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  customerName: string;
  invoiceNumber: string;
  amount: string; // pre-formatted, e.g. "$286.00"
  /** Pre-formatted status line, e.g. "Paid in full" / "Due 3 September 2026". */
  status?: string;
  paid?: boolean;
  invoiceDate?: string; // pre-formatted issue date
  /** Humour-bearing copy, all optional; the template has plain fallbacks. */
  reviewHeadline?: string;
  reviewMessage?: string;
  reviewMicrocopy?: string;
  invoiceFootnote?: string;
  logoUrl?: string;
  docLabel?: string; // "Tax Invoice" / "Quote"
  replyTo?: string;
  /** Replaces the template's default intro paragraph when Sear edits it. */
  intro?: string;
  /** Present = the review half of the email is included. */
  reviewUrl?: string;
  kind?: 'invoice' | 'review';
  subject?: string;
}

// Resend caps a message at 40 MB; the invoice is a fraction of that, and the
// client already trims it to 3 MB before posting. Anything smaller than a
// kilobyte is a failed render, not a document.
const MIN_PDF_BYTES = 1000;
const MAX_PDF_BYTES = 8_000_000;

export async function POST(req: Request) {
  // 1. Only signed-in, allowed users may send.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyFirebaseUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }

  // 2. Must be configured.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email sending is not set up yet (missing RESEND_API_KEY).' },
      { status: 503 }
    );
  }

  // The PDF rides along as a real file part rather than base64 inside JSON:
  // base64 inflates it by a third, which is what used to push a long invoice
  // past the 4.5 MB body limit and lose the attachment.
  let body: Body;
  let pdf: File | null;
  try {
    const form = await req.formData();
    body = JSON.parse(String(form.get('payload') ?? '{}')) as Body;
    const file = form.get('pdf');
    pdf = file instanceof File ? file : null;
  } catch {
    return NextResponse.json({ error: 'The invoice could not be uploaded.' }, { status: 400 });
  }

  if (!body.to) {
    return NextResponse.json({ error: 'Missing recipient.' }, { status: 400 });
  }

  // 3. No invoice, no email. Every message this app sends carries the document
  //    with it, so a silent send with nothing attached is a failure, not a
  //    degraded success.
  if (!pdf || pdf.size < MIN_PDF_BYTES) {
    return NextResponse.json(
      { error: 'The invoice PDF did not come through — nothing was sent. Try again.' },
      { status: 400 }
    );
  }
  if (pdf.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: 'The invoice PDF is too large to email. Share it from the invoice instead.' },
      { status: 413 }
    );
  }

  // From a verified domain if configured, otherwise Resend's test sender
  // (which can only deliver to your own Resend account email).
  const fromAddress = process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev';
  const from = `${body.businessName} <${fromAddress}>`;
  const label = body.docLabel || 'Invoice';
  const kind = body.kind || 'invoice';
  // A Draft carries no invoice number; a bare ".pdf" is a nameless dotfile that
  // several mail clients hide outright.
  const filename = pdf.name?.replace(/[^\w.\- ]+/g, '') || 'invoice.pdf';

  const html = renderInvoiceEmail({
    businessName: body.businessName,
    businessAddress: body.businessAddress,
    businessPhone: body.businessPhone,
    businessEmail: body.businessEmail,
    customerName: body.customerName || '',
    invoiceNumber: body.invoiceNumber,
    amount: body.amount || '',
    status: body.status,
    paid: body.paid,
    invoiceDate: body.invoiceDate,
    // The message box in the app writes the review copy, since the review is
    // now the hero of the email.
    reviewHeadline: body.reviewHeadline,
    reviewMessage: body.reviewMessage || body.intro,
    reviewMicrocopy: body.reviewMicrocopy,
    invoiceFootnote: body.invoiceFootnote,
    logoUrl: body.logoUrl,
    reviewUrl: body.reviewUrl,
    kind,
    attached: true,
  });

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: body.to,
    replyTo: body.replyTo || undefined,
    subject:
      body.subject ||
      (kind === 'review'
        ? `Thanks from ${body.businessName} — how did we do?`
        : `${body.businessName} — ${label} ${body.invoiceNumber}`),
    html,
    attachments: [
      {
        filename,
        content: Buffer.from(await pdf.arrayBuffer()),
        contentType: 'application/pdf',
      },
    ],
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Send failed.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

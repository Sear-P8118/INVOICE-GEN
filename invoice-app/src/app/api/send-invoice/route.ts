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
  dueDate?: string; // pre-formatted, empty when nothing is owed
  docLabel?: string; // "Tax Invoice" / "Quote"
  /** Omitted for a review-request email, which has nothing to attach. */
  pdfBase64?: string;
  replyTo?: string;
  /** Replaces the template's default intro paragraph when Sear edits it. */
  intro?: string;
  /** Present = the review half of the email is included. */
  reviewUrl?: string;
  kind?: 'invoice' | 'review';
  subject?: string;
}

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

  const body = (await req.json()) as Body;
  if (!body.to) {
    return NextResponse.json({ error: 'Missing recipient.' }, { status: 400 });
  }

  // From a verified domain if configured, otherwise Resend's test sender
  // (which can only deliver to your own Resend account email).
  const fromAddress = process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev';
  const from = `${body.businessName} <${fromAddress}>`;
  const label = body.docLabel || 'Invoice';
  const kind = body.kind || 'invoice';

  const html = renderInvoiceEmail({
    businessName: body.businessName,
    businessAddress: body.businessAddress,
    businessPhone: body.businessPhone,
    businessEmail: body.businessEmail,
    customerName: body.customerName || '',
    invoiceNumber: body.invoiceNumber,
    amount: body.amount || '',
    dueDate: body.dueDate,
    intro: body.intro,
    reviewUrl: body.reviewUrl,
    kind,
    attached: Boolean(body.pdfBase64),
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
    attachments: body.pdfBase64
      ? [{ filename: `${body.invoiceNumber}.pdf`, content: body.pdfBase64 }]
      : undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Send failed.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

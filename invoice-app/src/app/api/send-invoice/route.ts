import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyFirebaseUser } from '@/lib/serverAuth';

export const runtime = 'nodejs';

interface Body {
  to: string;
  businessName: string;
  invoiceNumber: string;
  docLabel?: string; // "Tax Invoice" / "Quote"
  pdfBase64: string;
  replyTo?: string;
  message?: string;
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
  if (!body.to || !body.pdfBase64) {
    return NextResponse.json({ error: 'Missing recipient or PDF.' }, { status: 400 });
  }

  // From a verified domain if configured, otherwise Resend's test sender
  // (which can only deliver to your own Resend account email).
  const fromAddress = process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev';
  const from = `${body.businessName} <${fromAddress}>`;
  const label = body.docLabel || 'Invoice';

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: body.to,
    replyTo: body.replyTo || undefined,
    subject: `${body.businessName} — ${label} ${body.invoiceNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a">
        <p>Hi,</p>
        <p>${body.message || `Please find your ${label.toLowerCase()} <strong>${body.invoiceNumber}</strong> from ${body.businessName} attached as a PDF.`}</p>
        <p>Thank you for your business.</p>
        <p style="color:#64748b">${body.businessName}</p>
      </div>`,
    attachments: [{ filename: `${body.invoiceNumber}.pdf`, content: body.pdfBase64 }],
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Send failed.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * A local preview of the customer email, so the template can be looked at in a
 * browser instead of being sent to a real inbox.
 *
 *   /api/email-preview             → review + invoice summary (the usual send)
 *   /api/email-preview?kind=review → the review-only email
 *   /api/email-preview?review=0    → invoice only, for a business with no
 *                                    Google review link set
 *
 * Development only: in production it 404s, because it renders sample data at a
 * URL that needs no sign-in.
 */

import { renderInvoiceEmail } from '@/lib/emailTemplate';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') === 'review' ? 'review' : 'invoice';

  const html = renderInvoiceEmail({
    businessName: searchParams.get('business') || 'Car Battery Perth 24/7',
    businessAddress: 'Mobile service — Perth metro',
    businessPhone: '0400 000 000',
    businessEmail: 'hello@carbatteryperth247.com.au',
    customerName: searchParams.get('name') || 'Dave Smith',
    reviewUrl:
      searchParams.get('review') === '0' ? undefined : 'https://g.page/r/CVRyN1uqdu4zEBM/review',
    invoiceNumber: 'INV-1043',
    amount: '$286.00',
    status: 'Paid in full',
    paid: true,
    invoiceDate: '20 August 2026',
    attached: kind === 'invoice',
    kind,
  });

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

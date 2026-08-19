import { Business, Invoice } from '@/types';

/**
 * Pre-written customer messages.
 *
 * The email body itself is the branded template in `emailTemplate.ts`; what
 * lives here is the editable intro line for that email plus the text-message
 * wording, kept in the same voice as the template so both feel like one brand.
 */

/** First name only: "Hi Dave," reads better than "Hi Dave Smith from ABC Pty Ltd,". */
export function firstName(customerName: string): string {
  const first = customerName.trim().split(/[\s,]+/)[0] || '';
  // Company names ("Bunnings", "ABC Auto") stay whole; only split real names.
  return first.length > 1 ? first : customerName.trim();
}

export function greeting(customerName: string): string {
  const name = firstName(customerName);
  return name ? `Hi ${name},` : 'Hi,';
}

const docWord = (invoice: Invoice) => (invoice.status === 'Quote' ? 'quote' : 'invoice');

/** The editable intro paragraph of the invoice email. */
export function invoiceIntro(invoice: Invoice, business: Business): string {
  if (invoice.status === 'Paid') {
    return `Thanks very much for your business — your ${docWord(invoice)} is attached, paid in full. Here's a summary for your records.`;
  }
  if (invoice.status === 'Quote') {
    return `Thanks for the opportunity to quote. The full breakdown from ${business.name} is attached — just reply if you'd like to go ahead.`;
  }
  return `Thanks for choosing ${business.name}. Here's a summary of your invoice — the full breakdown and payment details are in the attached PDF.`;
}

/** Invoice + review ask in one text message. */
export function invoiceWithReviewSms(invoice: Invoice, business: Business): string {
  const parts = [`${greeting(invoice.customerName)} your ${docWord(invoice)} ${invoice.invoiceNumber} from ${business.name}`];
  if (invoice.status === 'Paid') parts.push('is attached and paid in full — thanks very much.');
  else if (invoice.dueDate) parts.push(`is attached, due ${formatDate(invoice.dueDate)}.`);
  else parts.push('is attached.');
  if (business.reviewUrl) {
    parts.push(
      `\n\nIf we got your battery — and your day — sorted, a quick Google review helps other Perth drivers find a shop they can trust. Takes under a minute: ${business.reviewUrl}`
    );
  }
  return parts.join(' ');
}

/** Review-only text message, in the same voice as the email. */
export function reviewSms(invoice: Invoice, business: Business): string {
  return `${greeting(invoice.customerName)} thanks again for choosing ${business.name}. If we got your battery — and your day — sorted, a quick Google review helps other Perth drivers find a shop they can trust. Takes under 60 seconds and means a lot to a local, family-run business: ${business.reviewUrl}`;
}

export function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** sms: link that works on both iOS and Android. */
export function smsHref(phone: string, body: string): string {
  const number = phone.replace(/[^\d+]/g, '');
  const separator = /iPhone|iPad|Macintosh/i.test(
    typeof navigator === 'undefined' ? '' : navigator.userAgent
  )
    ? '&'
    : '?';
  return `sms:${number}${separator}body=${encodeURIComponent(body)}`;
}

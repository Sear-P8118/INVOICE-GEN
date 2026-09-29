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

/**
 * The same closing joke the review email signs off with, so a customer who
 * gets both doesn't feel like they're dealing with two different businesses.
 */
const REVIEW_JOKE_SMS = '\n\nYour car should now start when asked. Revolutionary stuff, we know!';

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

/**
 * Invoice + review ask in one text message.
 *
 * `attached` says whether the PDF is genuinely riding along (the share sheet
 * can carry it; a plain sms: link cannot). The copy follows the truth rather
 * than promising an attachment the message doesn't have — the old wording said
 * "is attached" every time, including on texts that carried nothing.
 */
export function invoiceWithReviewSms(
  invoice: Invoice,
  business: Business,
  attached = true
): string {
  const here = attached ? 'is attached' : 'is on its way';
  const parts = [`${greeting(invoice.customerName)} your ${docWord(invoice)} ${invoice.invoiceNumber} from ${business.name}`];
  if (invoice.status === 'Paid') parts.push(`${here} and paid in full — thanks very much.`);
  else if (invoice.dueDate) parts.push(`${here}, due ${formatDate(invoice.dueDate)}.`);
  else parts.push(`${here}.`);
  if (business.reviewUrl) {
    parts.push(
      `\n\nIf we got your battery — and your day — sorted, a quick Google review helps other Perth drivers find a shop they can trust. Takes under a minute: ${business.reviewUrl}${REVIEW_JOKE_SMS}`
    );
  }
  return parts.join(' ');
}

/**
 * Review request, with the invoice riding along. Even the review ask carries
 * the document now, so the customer always has a copy in the same thread.
 */
export function reviewSms(invoice: Invoice, business: Business, attached = true): string {
  const copy = attached
    ? ` Your ${docWord(invoice)} ${invoice.invoiceNumber} is attached for your records.`
    : '';
  return `${greeting(invoice.customerName)} thanks again for choosing ${business.name}.${copy} If we got your battery — and your day — sorted, a quick Google review helps other Perth drivers find a shop they can trust. Takes under 60 seconds and means a lot to a local, family-run business: ${business.reviewUrl}${REVIEW_JOKE_SMS}`;
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

/** True for iPhone and iPad, including iPadOS, which reports itself as a Mac. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // A desktop Mac also says "Macintosh"; only a touch one is an iPad.
  return /iPhone|iPod/.test(ua) || (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** sms: link that works on both iOS and Android. */
export function smsHref(phone: string, body: string): string {
  const number = phone.replace(/[^\d+]/g, '');
  // iOS wants sms:number&body=…; everything else wants ?body=. A desktop Mac
  // used to be misread as iOS here and got the malformed iOS form.
  const separator = isIOS() ? '&' : '?';
  return `sms:${number}${separator}body=${encodeURIComponent(body)}`;
}

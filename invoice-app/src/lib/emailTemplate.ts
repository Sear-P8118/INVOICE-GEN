/**
 * The customer email: a review request with the invoice attached to it, not the
 * other way round.
 *
 * One card, split 60/40 on desktop — a near-black review hero on the left, a
 * calm white invoice panel on the right, and a full-width black footer beneath
 * both. The review headline, stars and CTA come before the invoice in the
 * source, so when the columns stack on a phone the review still lands first.
 *
 * Every piece of humour-bearing copy is a parameter with a plain fallback
 * (reviewHeadline / reviewMessage / reviewMicrocopy / invoiceFootnote) so the
 * wording can be written later without touching this file.
 *
 * Table-based with inline styles: the only layout Gmail, Outlook, Apple Mail
 * and the Android clients all render the same way. No JavaScript, no flexbox,
 * no grid, no web fonts.
 */

export interface InvoiceEmailData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  customerName: string;

  // ---- Review panel (the hero) ----
  /** {{REVIEW_HEADLINE}} */
  reviewHeadline?: string;
  /** {{REVIEW_MESSAGE}} */
  reviewMessage?: string;
  /** {{REVIEW_MICROCOPY}} — the element is dropped entirely when empty. */
  reviewMicrocopy?: string;
  /** {{GOOGLE_REVIEW_URL}} — no link, no review panel. */
  reviewUrl?: string;
  /** {{LOGO_URL}} — optional; falls back to the business name as a wordmark. */
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;

  // ---- Invoice panel ----
  /** {{INVOICE_NUMBER}} */
  invoiceNumber: string;
  /** {{INVOICE_AMOUNT}} — already formatted, e.g. "$286.00". */
  amount: string;
  /** {{INVOICE_STATUS}} — e.g. "Paid in full", "Due 3 September 2026". */
  status?: string;
  /** Paid statuses get the green pill; everything else stays plain text. */
  paid?: boolean;
  /** {{INVOICE_DATE}} — already formatted, e.g. "20 August 2026". */
  invoiceDate?: string;
  /** {{INVOICE_FOOTNOTE}} */
  invoiceFootnote?: string;
  /** {{PDF_ATTACHMENT}} — true when the PDF rides along. */
  attached?: boolean;

  /** 'invoice' = review hero + invoice panel; 'review' = review panel only. */
  kind: 'invoice' | 'review';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** {{CUSTOMER_FIRST_NAME}} — "Dave" reads better than "Dave Smith". */
export function firstName(name: string): string {
  const first = name.trim().split(/[\s,]+/)[0] || '';
  return first.length > 1 ? first : name.trim();
}

// The colour system, exactly as specified.
const BLACK = '#0A0A0A';
const BLUE = '#0D5BEF';
const GOLD = '#FFC928';
const WHITE = '#FFFFFF';
const CANVAS = '#F5F6F8';
const GREY = '#5F6368';
const DIVIDER = '#E1E4E8';
const BADGE_BG = '#DDF7DF';
const BADGE_TEXT = '#187A2F';
const ON_BLACK = '#B8BCC4'; // secondary text on the dark panel

/**
 * A large Google mark, sat behind the review copy at low opacity.
 *
 * Email can't layer a translucent panel over an image — there's no reliable
 * z-index or positioning — so the transparency is baked into the artwork
 * instead: the mark is drawn at 16% and the panel keeps its solid black
 * behind it. Same look, and it degrades to plain black wherever background
 * images are stripped (Outlook's Word engine, images-off in Gmail).
 *
 * It's an inline SVG data URI rather than a hosted file, so there's nothing
 * to download and nothing for an inbox to block.
 */
const GOOGLE_WATERMARK =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg opacity='0.11'%3E%3Cpath d='M78.6 33.5A33.0 33.0 0 0 1 66.5 78.6' stroke='%234285F4' stroke-width='19.0' fill='none' stroke-linecap='butt'/%3E%3Cpath d='M66.5 78.6A33.0 33.0 0 0 1 21.4 66.5' stroke='%2334A853' stroke-width='19.0' fill='none' stroke-linecap='butt'/%3E%3Cpath d='M21.4 66.5A33.0 33.0 0 0 1 29.7 24.0' stroke='%23FBBC05' stroke-width='19.0' fill='none' stroke-linecap='butt'/%3E%3Cpath d='M29.7 24.0A33.0 33.0 0 0 1 78.6 33.5' stroke='%23EA4335' stroke-width='19.0' fill='none' stroke-linecap='butt'/%3E%3Crect x='50' y='40.5' width='42.0' height='19' fill='%234285F4'/%3E%3C/g%3E%3C/svg%3E";
// Single quotes inside deliberately: this string is interpolated into
// style="..." attributes, and a double quote there would terminate the
// attribute and silently drop every declaration after it.
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif";

export function renderInvoiceEmail(d: InvoiceEmailData): string {
  const name = esc(firstName(d.customerName));
  const business = esc(d.businessName);
  const showInvoice = d.kind === 'invoice';
  const showReview = Boolean(d.reviewUrl);

  const headline = esc(d.reviewHeadline || `Thanks for choosing ${d.businessName}.`);
  const message = esc(
    d.reviewMessage ||
      "If you were happy with our service, we'd really appreciate a quick Google review."
  );
  const microcopy = d.reviewMicrocopy?.trim() ? esc(d.reviewMicrocopy.trim()) : '';
  const footnote = esc(d.invoiceFootnote || 'Thanks again for your support.');

  const preheader = showReview
    ? `${d.reviewHeadline ? esc(d.reviewHeadline) : `Thanks ${name}`} — a quick Google review means a lot.`
    : `${esc(d.invoiceNumber)} · ${esc(d.amount)} from ${business}`;

  // Upper-left branding: the supplied logo if there is one, otherwise the
  // business name set as a wordmark so the corner is never empty.
  const branding = d.logoUrl
    ? `<img src="${esc(d.logoUrl)}" alt="${business}" width="${d.logoWidth || 150}" height="${d.logoHeight || 40}"
            style="display:block; width:${d.logoWidth || 150}px; height:${d.logoHeight || 40}px; border:0;">`
    : `<span style="font-family:${FONT}; font-size:15px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:${WHITE};">${business}</span>`;

  // The Google mark, drawn with a styled letter rather than an image: remote
  // images are blocked by default in most inboxes, and a button whose icon
  // vanishes looks broken. This always renders.
  const googleMark = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table; vertical-align:middle;">
      <tr>
        <td width="22" height="22" align="center" valign="middle"
            style="width:22px; height:22px; background:${WHITE}; border-radius:11px; font-family:${FONT}; font-size:15px; font-weight:700; line-height:22px; color:${BLUE};">G</td>
      </tr>
    </table>`;

  const reviewPanel = showReview
    ? `
    <td class="col" width="${showInvoice ? '60%' : '100%'}" valign="top" bgcolor="${BLACK}"
        style="width:${showInvoice ? '60%' : '100%'}; background-color:${BLACK};
               background-image:url(&quot;${GOOGLE_WATERMARK}&quot;);
               background-repeat:no-repeat;
               background-position:right -72px bottom -68px;
               background-size:340px 340px;
               padding:32px;">

      <!-- Branding -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="left" style="padding-bottom:26px;">${branding}</td></tr>
      </table>

      <!-- Review headline -->
      <h1 class="headline" style="margin:0; font-family:${FONT}; font-size:29px; line-height:34px; font-weight:800; letter-spacing:-0.5px; color:${WHITE};">
        ${headline}
      </h1>

      <!-- Review message -->
      <p style="margin:14px 0 0 0; font-family:${FONT}; font-size:15px; line-height:24px; color:${ON_BLACK};">
        ${message}
      </p>

      <!-- Five stars. Each is its own span so they can twinkle in sequence
           where CSS animation is supported (Apple Mail, iOS Mail); everywhere
           else they simply sit there, large and gold. -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:28px 0 24px 0; font-family:${FONT}; font-size:38px; line-height:44px; letter-spacing:6px; color:${GOLD};">
            ${[0, 1, 2, 3, 4]
              .map(
                (i) =>
                  `<span class="star star-${i + 1}" style="display:inline-block; color:${GOLD};">&#9733;</span>`
              )
              .join('')}
          </td>
        </tr>
      </table>

      <!-- Google review CTA -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta">
        <tr>
          <td align="center" bgcolor="${BLUE}" style="background:${BLUE}; border-radius:6px;">
            <a href="${esc(d.reviewUrl || '')}" target="_blank"
               style="display:block; padding:15px 26px; font-family:${FONT}; font-size:15px; font-weight:700; letter-spacing:0.6px; color:${WHITE}; text-decoration:none;">
              ${googleMark}<span style="display:inline-block; vertical-align:middle; padding-left:10px;">LEAVE A REVIEW</span>
            </a>
          </td>
        </tr>
      </table>
      ${
        microcopy
          ? `<p style="margin:14px 0 0 0; font-family:${FONT}; font-size:13px; line-height:19px; color:${ON_BLACK};">${microcopy}</p>`
          : ''
      }
    </td>`
    : '';

  /** One invoice row: label left, value right, hairline above. */
  const row = (label: string, value: string, opts: { first?: boolean; bold?: boolean } = {}) => `
    <tr>
      <td style="padding:${opts.first ? '0' : '13px'} 0 13px 0; ${opts.first ? '' : `border-top:1px solid ${DIVIDER};`} font-family:${FONT}; font-size:14px; color:${GREY};">
        ${esc(label)}
      </td>
      <td align="right" style="padding:${opts.first ? '0' : '13px'} 0 13px 0; ${opts.first ? '' : `border-top:1px solid ${DIVIDER};`} font-family:${FONT}; font-size:${opts.bold ? '17px' : '14px'}; font-weight:${opts.bold ? '700' : '500'}; color:${BLACK};">
        ${value}
      </td>
    </tr>`;

  const statusValue = d.paid
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="display:inline-table;">
         <tr><td style="background:${BADGE_BG}; border-radius:12px; padding:5px 11px; font-family:${FONT}; font-size:12.5px; font-weight:700; color:${BADGE_TEXT}; white-space:nowrap;">
           ${esc(d.status || 'Paid in full')}
         </td></tr>
       </table>`
    : esc(d.status || 'Due');

  const invoicePanel = showInvoice
    ? `
    <td class="col" width="${showReview ? '40%' : '100%'}" valign="top"
        style="width:${showReview ? '40%' : '100%'}; background:${WHITE}; padding:32px 28px;">

      ${
        // With no review panel there is no branding anywhere above the fold,
        // so the wordmark moves here rather than leaving the email anonymous.
        showReview
          ? ''
          : `<p style="margin:0 0 20px 0; font-family:${FONT}; font-size:14px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; color:${BLACK};">${business}</p>`
      }
      <p style="margin:0; font-family:${FONT}; font-size:13px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:${BLUE};">
        Invoice
      </p>
      <p style="margin:6px 0 0 0; font-family:${FONT}; font-size:26px; line-height:32px; font-weight:700; letter-spacing:-0.4px; color:${BLACK};">
        ${esc(d.invoiceNumber)}
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
        ${row('Status', statusValue, { first: true })}
        ${row('Amount', esc(d.amount), { bold: true })}
        ${d.invoiceDate ? row('Date', esc(d.invoiceDate)) : ''}
      </table>

      ${
        d.attached
          ? `<p style="margin:18px 0 0 0; font-family:${FONT}; font-size:12.5px; line-height:19px; color:${GREY};">
               Your full invoice is attached to this email as a PDF.
             </p>`
          : ''
      }
      <p style="margin:${d.attached ? '10px' : '20px'} 0 0 0; font-family:${FONT}; font-size:12.5px; line-height:19px; color:${GREY};">
        ${footnote}
      </p>
    </td>`
    : '';

  const footerCell = (icon: string, text: string, link?: string, last = false) => `
    <td class="foot" align="center" valign="middle"
        style="padding:14px 16px; ${last ? '' : `border-right:1px solid #262626;`} font-family:${FONT}; font-size:12.5px; line-height:18px; color:${ON_BLACK};">
      <span style="color:${BLUE};">${icon}</span>&nbsp;${
        link ? `<a href="${link}" style="color:${ON_BLACK}; text-decoration:none;">${esc(text)}</a>` : esc(text)
      }
    </td>`;

  const footerItems = [
    d.businessAddress ? footerCell('&#9679;', d.businessAddress) : '',
    d.businessPhone ? footerCell('&#9742;', d.businessPhone, `tel:${d.businessPhone.replace(/[^\d+]/g, '')}`) : '',
    d.businessEmail ? footerCell('&#9993;', d.businessEmail, `mailto:${d.businessEmail}`, true) : '',
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${showReview ? 'How did we do?' : 'Your invoice'}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  body { margin:0; padding:0; width:100% !important; background:${CANVAS}; }
  table { border-collapse:collapse !important; }
  a { text-decoration:none; }

  /* The stars land one after another, then hold. Clients that strip keyframes
     (Gmail, most of Outlook) just show them static and gold — the design does
     not depend on the motion. */
  @keyframes starPop {
    0%   { transform:scale(0.4); opacity:0; }
    55%  { transform:scale(1.25); opacity:1; }
    75%  { transform:scale(0.94); }
    100% { transform:scale(1); opacity:1; }
  }
  @keyframes starGlow {
    0%, 100% { text-shadow:0 0 0 rgba(255,201,40,0); }
    50%      { text-shadow:0 0 14px rgba(255,201,40,0.85); }
  }
  .star {
    animation:starPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both,
              starGlow 2.6s ease-in-out 2.2s infinite;
  }
  .star-1 { animation-delay:0.10s, 2.20s; }
  .star-2 { animation-delay:0.24s, 2.34s; }
  .star-3 { animation-delay:0.38s, 2.48s; }
  .star-4 { animation-delay:0.52s, 2.62s; }
  .star-5 { animation-delay:0.66s, 2.76s; }

  @media (prefers-reduced-motion: reduce) {
    .star { animation:none !important; opacity:1 !important; transform:none !important; }
  }

  /* Stack the two columns on a phone. The review panel is first in the source,
     so it stays above the invoice however narrow the screen gets. */
  @media screen and (max-width:620px) {
    /* Turning the card's own rows into blocks removes the table column
       algorithm, which is what was holding the layout at 660px and pushing
       content off the side of the screen. */
    .wrap { width:100% !important; max-width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .card, .cardrow, .footwrap, .foottable, .footrow {
      display:block !important; width:100% !important; max-width:100% !important;
    }
    .card { border-radius:0 !important; }
    .col { display:block !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; padding:28px 24px !important; }
    .cta { width:100% !important; }
    .cta td { text-align:center !important; }
    .headline { font-size:26px !important; line-height:31px !important; }
    .star { font-size:34px !important; }
    /* Footer items sit one per line, dividers off. */
    .foot { display:block !important; width:100% !important; border-right:0 !important; border-bottom:1px solid #262626 !important; padding:12px 16px !important; }
    .foot-last { border-bottom:0 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:${CANVAS};">

  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${CANVAS};">
    ${preheader}
  </div>

  <table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
    <tr>
      <td class="wrap" align="center" style="padding:32px 12px;">

        <table role="presentation" class="card" width="660" cellpadding="0" cellspacing="0" border="0"
               style="width:100%; max-width:660px; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(10,10,10,0.08);">

          <!-- Review (60%) + Invoice (40%) -->
          <tr class="cardrow">
            ${reviewPanel}
            ${invoicePanel}
          </tr>

          <!-- Full-width footer, same black as the review panel -->
          <tr class="cardrow">
            <td class="footwrap" colspan="${showReview && showInvoice ? '2' : '1'}" bgcolor="${BLACK}" style="background:${BLACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="foottable">
                <tr class="footrow">
                  ${footerItems.join('')}
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

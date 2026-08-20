/**
 * The customer email: a review request with the invoice attached to it, not the
 * other way round.
 *
 * One white, centred card in Google's own visual language — the four-colour
 * Google wordmark, a large friendly headline, five gold stars, a paragraph of
 * warm copy and a single blue pill button. The invoice, when there is one,
 * sits quietly underneath in a summary strip. Nothing competes with the ask.
 *
 * Every mark on the page is text, a table cell or a border. There are no
 * images at all, so the email looks identical whether or not the inbox
 * downloads remote content — which is what killed the previous versions.
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

  /** 'invoice' = review hero + invoice summary; 'review' = review only. */
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

// Google's palette, plus the greys Material uses around it.
const G_BLUE = '#4285F4';
const G_RED = '#EA4335';
const G_YELLOW = '#FBBC05';
const G_GREEN = '#34A853';
const BLUE = '#1A73E8'; // the button blue, one notch deeper than the logo blue
const INK = '#202124';
const GREY = '#5F6368';
const LIGHT_GREY = '#80868B';
const GOLD = '#FBBC05';
const WHITE = '#FFFFFF';
const CANVAS = '#F1F3F4';
const SOFT = '#F8F9FA';
const DIVIDER = '#E8EAED';
const BADGE_BG = '#E6F4EA';
const BADGE_TEXT = '#137333';

// Single quotes inside deliberately: this string is interpolated into
// style="..." attributes, and a double quote there would terminate the
// attribute and silently drop every declaration after it.
const FONT = "'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif";

/**
 * The house joke, sat under the button on every review ask. It's the one
 * unserious line in the email, which is exactly why it works — everything
 * above it is straight-faced.
 *
 * It lives inside the review panel and only ships with it: an invoice-only
 * email (a business with no Google link) never carries the joke, because a
 * plain invoice should stay straight-faced.
 *
 * Override it per-send with `reviewMicrocopy`; pass a single space to drop the
 * strip entirely.
 */
export const REVIEW_JOKE =
  'Your car should now start when asked. Revolutionary stuff, we know!';

/**
 * The Google wordmark, spelled out in coloured spans rather than drawn as an
 * image. Inboxes that block images can't block letters, so the brand cue is
 * always there.
 */
function googleWordmark(size: number): string {
  const letters: [string, string][] = [
    ['G', G_BLUE],
    ['o', G_RED],
    ['o', G_YELLOW],
    ['g', G_BLUE],
    ['l', G_GREEN],
    ['e', G_RED],
  ];
  return `<span style="font-family:${FONT}; font-size:${size}px; line-height:${Math.round(size * 1.2)}px; font-weight:500; letter-spacing:-0.5px;">${letters
    .map(([ch, colour]) => `<span style="color:${colour};">${ch}</span>`)
    .join('')}</span>`;
}

export function renderInvoiceEmail(d: InvoiceEmailData): string {
  const name = esc(firstName(d.customerName));
  const business = esc(d.businessName);
  const showInvoice = d.kind === 'invoice';
  const showReview = Boolean(d.reviewUrl);

  const headline = esc(
    d.reviewHeadline || (name ? `Thanks ${name} — how did we do?` : 'How did we do?')
  );
  const message = esc(
    d.reviewMessage ||
      `If we sorted you out, a quick Google review would mean a lot. It takes under a minute, and it's how other locals find a battery crew they can trust.`
  );
  // An explicitly blank microcopy (a space) means "no joke this time"; an
  // absent one gets the house joke.
  const microcopy =
    d.reviewMicrocopy === undefined ? esc(REVIEW_JOKE) : esc(d.reviewMicrocopy.trim());
  const footnote = esc(d.invoiceFootnote || 'Thanks again for your support.');

  const preheader = showReview
    ? `${d.reviewHeadline ? esc(d.reviewHeadline) : `Thanks ${name}`} — a quick Google review means a lot.`
    : `${esc(d.invoiceNumber)} · ${esc(d.amount)} from ${business}`;

  // Top of the card: the supplied logo if there is one, otherwise the business
  // name set as a wordmark so the header is never empty.
  const branding = d.logoUrl
    ? `<img src="${esc(d.logoUrl)}" alt="${business}" width="${d.logoWidth || 150}" height="${d.logoHeight || 40}"
            style="display:block; margin:0 auto; width:${d.logoWidth || 150}px; height:${d.logoHeight || 40}px; border:0;">`
    : `<span style="font-family:${FONT}; font-size:15px; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; color:${INK};">${business}</span>`;

  // A thumbs up, set in a soft round badge so it reads as a designed mark
  // rather than a stray emoji dropped into the copy. The glyph itself is a
  // text character, so there is still no image here to be blocked.
  const thumbsUpIcon = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table; vertical-align:middle;">
      <tr>
        <td align="center" valign="middle" width="44" height="44" bgcolor="${BADGE_BG}"
            style="width:44px; height:44px; background:${BADGE_BG}; border-radius:22px; font-size:22px; line-height:44px;">
          &#128077;
        </td>
      </tr>
    </table>`;

  // Five stars, each its own span so they land one after another where CSS
  // animation is supported; everywhere else they sit still, large and gold.
  const stars = [0, 1, 2, 3, 4]
    .map((i) => `<span class="star star-${i + 1}" style="display:inline-block; color:${GOLD};">&#9733;</span>`)
    .join('');

  const reviewPanel = showReview
    ? `
      <!-- Google wordmark: whose review this is, before a word is read -->
      <tr>
        <td align="center" style="padding:34px 34px 0 34px;">
          ${googleWordmark(34)}
        </td>
      </tr>

      <!-- Headline -->
      <tr>
        <td align="center" style="padding:22px 40px 0 40px;">
          <h1 class="headline" style="margin:0; font-family:${FONT}; font-size:30px; line-height:38px; font-weight:400; letter-spacing:-0.4px; color:${INK};">
            ${headline}
          </h1>
        </td>
      </tr>

      <!-- Stars -->
      <tr>
        <td align="center" style="padding:24px 24px 0 24px; font-family:${FONT}; font-size:34px; line-height:40px; letter-spacing:8px; color:${GOLD};">
          ${stars}
        </td>
      </tr>

      <!-- Copy -->
      <tr>
        <td align="center" style="padding:24px 46px 0 46px;">
          <p style="margin:0; font-family:${FONT}; font-size:16px; line-height:26px; color:${GREY};">
            ${message}
          </p>
        </td>
      </tr>

      <!-- Review CTA: one Material pill, nothing else -->
      <tr>
        <td align="center" style="padding:30px 34px 0 34px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta">
            <tr>
              <td align="center" bgcolor="${BLUE}" style="background:${BLUE}; border-radius:24px;">
                <a href="${esc(d.reviewUrl || '')}" target="_blank"
                   style="display:block; padding:15px 40px; font-family:${FONT}; font-size:15px; font-weight:500; letter-spacing:0.3px; color:${WHITE}; text-decoration:none;">
                  Write a review
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${
        microcopy
          ? `<tr>
               <td align="center" class="pad" style="padding:26px 40px 0 40px;">
                 <!-- The joke, in its own soft strip, with a thumbs up
                      drawn on the right. -->
                 <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="joke"
                        style="background:${SOFT}; border:1px solid ${DIVIDER}; border-radius:12px;">
                   <tr>
                     <td valign="middle" style="padding:14px 12px 14px 18px; font-family:${FONT}; font-size:13.5px; line-height:20px; font-style:italic; color:${GREY};">
                       ${microcopy}
                     </td>
                     <td valign="middle" align="right" style="padding:14px 18px 14px 0;">
                       ${thumbsUpIcon}
                     </td>
                   </tr>
                 </table>
               </td>
             </tr>`
          : ''
      }
      <tr><td style="height:36px; line-height:36px; font-size:0;">&nbsp;</td></tr>`
    : '';

  /** One invoice row: label left, value right, hairline above. */
  const row = (label: string, value: string, opts: { first?: boolean; bold?: boolean } = {}) => `
    <tr>
      <td style="padding:${opts.first ? '0' : '12px'} 0 12px 0; ${opts.first ? '' : `border-top:1px solid ${DIVIDER};`} font-family:${FONT}; font-size:14px; color:${GREY};">
        ${esc(label)}
      </td>
      <td align="right" style="padding:${opts.first ? '0' : '12px'} 0 12px 0; ${opts.first ? '' : `border-top:1px solid ${DIVIDER};`} font-family:${FONT}; font-size:${opts.bold ? '17px' : '14px'}; font-weight:${opts.bold ? '700' : '500'}; color:${INK};">
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

  // The invoice is the postscript now: a soft grey strip under the ask.
  const invoicePanel = showInvoice
    ? `
      <tr>
        <td class="pad" bgcolor="${SOFT}" style="background:${SOFT}; border-top:1px solid ${DIVIDER}; padding:26px 34px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:${FONT}; font-size:12px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:${GREY};">
                Your invoice
              </td>
              <td align="right" style="font-family:${FONT}; font-size:15px; font-weight:700; color:${INK};">
                ${esc(d.invoiceNumber)}
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
            ${row('Status', statusValue, { first: true })}
            ${row('Amount', esc(d.amount), { bold: true })}
            ${d.invoiceDate ? row('Date', esc(d.invoiceDate)) : ''}
          </table>

          ${
            d.attached
              ? `<p style="margin:16px 0 0 0; font-family:${FONT}; font-size:12.5px; line-height:19px; color:${GREY};">
                   Your full invoice is attached to this email as a PDF.
                 </p>`
              : ''
          }
          <p style="margin:${d.attached ? '8px' : '16px'} 0 0 0; font-family:${FONT}; font-size:12.5px; line-height:19px; color:${GREY};">
            ${footnote}
          </p>
        </td>
      </tr>`
    : '';

  const footerCell = (icon: string, text: string, link?: string, last = false) => `
    <td class="foot${last ? ' foot-last' : ''}" align="center" valign="middle"
        style="padding:14px 16px; ${last ? '' : `border-right:1px solid ${DIVIDER};`} font-family:${FONT}; font-size:12.5px; line-height:18px; color:${GREY};">
      <span style="color:${LIGHT_GREY};">${icon}</span>&nbsp;${
        link ? `<a href="${link}" style="color:${GREY}; text-decoration:none;">${esc(text)}</a>` : esc(text)
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
  .star {
    animation:starPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .star-1 { animation-delay:0.10s; }
  .star-2 { animation-delay:0.24s; }
  .star-3 { animation-delay:0.38s; }
  .star-4 { animation-delay:0.52s; }
  .star-5 { animation-delay:0.66s; }

  @media (prefers-reduced-motion: reduce) {
    .star { animation:none !important; opacity:1 !important; transform:none !important; }
  }

  @media screen and (max-width:620px) {
    .wrap { width:100% !important; max-width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .card, .foottable, .footrow { display:block !important; width:100% !important; max-width:100% !important; }
    .card { border-radius:0 !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .headline { font-size:25px !important; line-height:32px !important; }
    .cta { width:100% !important; }
    .cta td { text-align:center !important; }
    .joke { width:100% !important; }
    /* Footer items sit one per line, dividers off. */
    .foot { display:block !important; width:100% !important; border-right:0 !important; border-bottom:1px solid ${DIVIDER} !important; padding:12px 16px !important; }
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
      <td class="wrap" align="center" style="padding:34px 12px;">

        <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:100%; max-width:600px; background:${WHITE}; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(60,64,67,0.16), 0 4px 14px rgba(60,64,67,0.10);">

          <!-- Business logo / wordmark -->
          <tr>
            <td align="center" style="padding:30px 34px 0 34px; border-bottom:0;">
              ${branding}
            </td>
          </tr>

          ${
            // With no review ask above it, the invoice strip would butt straight
            // up against the wordmark.
            showReview ? '' : `<tr><td style="height:26px; line-height:26px; font-size:0;">&nbsp;</td></tr>`
          }
          ${reviewPanel}
          ${invoicePanel}

          <!-- Contact strip -->
          <tr>
            <td bgcolor="${WHITE}" style="background:${WHITE}; border-top:1px solid ${DIVIDER};">
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

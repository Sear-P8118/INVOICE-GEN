/**
 * The invoice + review email.
 *
 * Deliberately plain: white card on grey, one weight of grey text, a single
 * blue action, and nothing decorative. It reads like a Google notification
 * because that's what people trust in an inbox — no gradients, no serif
 * display face, no brand furniture competing with the amount owed.
 *
 * Table-based with inline styles, which is the only layout Gmail, Outlook and
 * Apple Mail all render the same way.
 */

export interface InvoiceEmailData {
  businessName: string;
  /** Absolute https URL — email clients can't resolve relative paths. */
  logoUrl?: string;
  /** Rendered size, in px, worked out from the artwork's aspect ratio. */
  logoWidth?: number;
  logoHeight?: number;
  /** Background the artwork is drawn for; anything non-white gets a chip. */
  logoBg?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  customerName: string;
  invoiceNumber: string;
  /** Already formatted, e.g. "$286.00". */
  amount: string;
  /** Already formatted, e.g. "3 September 2026". Empty when nothing is owed. */
  dueDate?: string;
  /** Shown instead of the default intro paragraph when Sear edits the message. */
  intro?: string;
  reviewUrl?: string;
  /** 'invoice' = summary + review ask; 'review' = the review ask on its own. */
  kind: 'invoice' | 'review';
  /** True when the PDF rides along, so the copy can say so. */
  attached?: boolean;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** First name only: "Hi Dave" reads better than the full "Dave Smith". */
function firstName(name: string): string {
  const first = name.trim().split(/[\s,]+/)[0] || '';
  return first.length > 1 ? first : name.trim();
}

// Google's own palette — the greys do the work, the blue is used once.
const INK = '#202124'; // primary text
const GREY = '#5f6368'; // secondary text
const FAINT = '#80868b'; // footer text
const LINE = '#dadce0'; // borders
const CANVAS = '#f8f9fa'; // page + panel background
const BLUE = '#1a73e8'; // the single action
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function renderInvoiceEmail(d: InvoiceEmailData): string {
  const name = esc(firstName(d.customerName));
  const business = esc(d.businessName);
  const showInvoice = d.kind === 'invoice';
  const showReview = Boolean(d.reviewUrl);

  const preheader = showInvoice
    ? `${esc(d.invoiceNumber)} · ${esc(d.amount)} from ${business}`
    : `Thanks from ${business} — how did we do?`;

  const intro = d.intro
    ? esc(d.intro).replace(/\n+/g, '<br>')
    : `Thanks for choosing ${business}. Here are the details${d.attached ? ', with the full invoice attached as a PDF' : ''}.`;

  /** One line of the summary panel. */
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:10px 0; font-family:${FONT}; font-size:14px; color:${GREY};">${esc(label)}</td>
      <td align="right" style="padding:10px 0; font-family:${FONT}; font-size:${strong ? '16px' : '14px'}; font-weight:${strong ? '600' : '400'}; color:${INK};">${esc(value)}</td>
    </tr>`;

  const invoiceSection = showInvoice
    ? `
    <tr>
      <td style="padding:40px 40px 0 40px;" class="px-mobile">
        <h1 style="margin:0; font-family:${FONT}; font-size:24px; line-height:32px; font-weight:400; color:${INK};">
          Hi ${name}, your invoice is ready
        </h1>
        <p style="margin:12px 0 0 0; font-family:${FONT}; font-size:15px; line-height:24px; color:${GREY};">
          ${intro}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:28px 40px 0 40px;" class="px-mobile">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:${CANVAS}; border:1px solid ${LINE}; border-radius:8px;">
          <tr>
            <td style="padding:8px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row('Invoice', d.invoiceNumber)}
                ${d.dueDate ? row('Due', d.dueDate) : row('Status', 'Paid in full')}
                <tr><td colspan="2" style="border-top:1px solid ${LINE}; font-size:0; line-height:0;">&nbsp;</td></tr>
                ${row(d.dueDate ? 'Amount due' : 'Amount', d.amount, true)}
              </table>
            </td>
          </tr>
        </table>
        ${
          d.attached
            ? `<p style="margin:16px 0 0 0; font-family:${FONT}; font-size:13px; line-height:20px; color:${FAINT};">
                 📎 The full invoice is attached to this email as a PDF.
               </p>`
            : ''
        }
      </td>
    </tr>

    ${showReview ? `<tr><td style="padding:36px 40px 0 40px;" class="px-mobile"><div style="border-top:1px solid ${LINE}; font-size:0; line-height:0;">&nbsp;</div></td></tr>` : ''}`
    : '';

  const reviewSection = showReview
    ? `
    <tr>
      <td align="center" style="padding:${showInvoice ? '32px' : '44px'} 40px 0 40px; text-align:center;" class="px-mobile">
        ${
          showInvoice
            ? ''
            : `<p style="margin:0 0 20px 0; font-family:${FONT}; font-size:15px; line-height:24px; color:${GREY};">
                 Hi ${name}, thanks for choosing ${business}.
               </p>`
        }
        <div style="font-size:26px; line-height:34px; letter-spacing:2px;">⭐⭐⭐⭐⭐</div>
        <h2 style="margin:16px 0 0 0; font-family:${FONT}; font-size:20px; line-height:28px; font-weight:500; color:${INK};">
          How did we do?
        </h2>
        <p style="margin:10px auto 0 auto; max-width:400px; font-family:${FONT}; font-size:15px; line-height:24px; color:${GREY};">
          If you were happy with the job, a quick Google review helps other locals find us.
          It takes less than a minute.
        </p>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:24px 40px 8px 40px;" class="px-mobile">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="background:${BLUE}; border-radius:4px;">
              <a href="${esc(d.reviewUrl || '')}" target="_blank"
                 style="display:inline-block; padding:13px 32px; font-family:${FONT}; font-size:15px; font-weight:500; color:#ffffff; text-decoration:none;">
                Leave a review
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : '';

  // The logo sits above the card, where Google puts the sender. Artwork drawn
  // for a dark background gets that background back as a chip, otherwise a
  // black-on-black logo would vanish against the white page.
  const darkChip = Boolean(d.logoBg && d.logoBg.toLowerCase() !== '#ffffff' && d.logoBg.toLowerCase() !== '#fff');
  const senderBlock = d.logoUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0">
         <tr>
           <td style="${darkChip ? `background:${esc(d.logoBg || '#ffffff')}; border-radius:6px; padding:8px 12px;` : ''}">
             <img src="${esc(d.logoUrl)}" alt="${business}"
                  width="${d.logoWidth || 120}" height="${d.logoHeight || 40}"
                  style="display:block; width:${d.logoWidth || 120}px; height:${d.logoHeight || 40}px;">
           </td>
         </tr>
       </table>`
    : `<span style="font-family:${FONT}; font-size:13px; font-weight:500; letter-spacing:0.4px; text-transform:uppercase; color:${FAINT};">${business}</span>`;

  const contact = [d.businessPhone, d.businessEmail].filter(Boolean).join(' · ');
  const footerLines = [d.businessAddress, contact].filter(Boolean).map((l) => esc(l as string));

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${showInvoice ? 'Your invoice' : 'How did we do?'}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  body { margin:0; padding:0; width:100% !important; background:${CANVAS}; }
  table { border-collapse:collapse !important; }
  @media screen and (max-width:600px) {
    .card { width:100% !important; border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .px-mobile { padding-left:24px !important; padding-right:24px !important; }
    h1 { font-size:22px !important; line-height:30px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:${CANVAS};">

  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${CANVAS};">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <!-- Sender, above the card, the way Google puts it -->
        <table role="presentation" class="card" width="560" cellpadding="0" cellspacing="0" style="width:560px; max-width:560px;">
          <tr>
            <td style="padding:0 4px 14px 4px;">
              ${senderBlock}
            </td>
          </tr>
        </table>

        <table role="presentation" class="card" width="560" cellpadding="0" cellspacing="0"
               style="width:560px; max-width:560px; background:#ffffff; border:1px solid ${LINE}; border-radius:8px;">
          ${invoiceSection}
          ${reviewSection}

          <tr>
            <td style="padding:${showReview ? '36px' : '32px'} 40px 32px 40px;" class="px-mobile">
              <div style="border-top:1px solid ${LINE}; font-size:0; line-height:0;">&nbsp;</div>
              <p style="margin:20px 0 0 0; font-family:${FONT}; font-size:13px; line-height:20px; color:${FAINT};">
                ${business}${footerLines.length ? `<br>${footerLines.join('<br>')}` : ''}
              </p>
              <p style="margin:12px 0 0 0; font-family:${FONT}; font-size:12px; line-height:18px; color:${FAINT};">
                ${showInvoice ? 'Questions about this invoice?' : 'Anything we can help with?'} Just reply to this email.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

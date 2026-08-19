/**
 * The invoice + review email, built from Sear's design
 * (~/Desktop/invoice-review-email.html).
 *
 * Two sections: the invoice summary, then the review ask under a charge-level
 * divider. The review half is dropped when the business has no review link.
 *
 * Everything is inline-styled tables — the only layout email clients render
 * reliably — and the palette (ink #14171C, gold #C9973F, paper #EDEBE6) is
 * deliberately the same for all three businesses so the email reads as one
 * house style regardless of which company sent it.
 */

export interface InvoiceEmailData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  customerName: string;
  invoiceNumber: string;
  /** Already formatted, e.g. "$286.00". */
  amount: string;
  /** Already formatted, e.g. "3 September 2026", or "Paid" / "" when not owed. */
  dueDate?: string;
  /** Shown instead of the default intro paragraph when Sear edits the message. */
  intro?: string;
  reviewUrl?: string;
  /** 'invoice' = both sections; 'review' = the review ask on its own. */
  kind: 'invoice' | 'review';
  /** True when the PDF rides along, so the copy can say so. */
  attached?: boolean;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** First name only: "Hi Dave," reads better than the full "Dave Smith". */
function firstName(name: string): string {
  const first = name.trim().split(/[\s,]+/)[0] || '';
  return first.length > 1 ? first : name.trim();
}

const INK = '#14171C';
const GOLD = '#C9973F';
const PAPER = '#EDEBE6';
const CARD = '#F7F6F3';
const LINE = '#E9E6DE';
const BODY = "'Inter', Helvetica, Arial, sans-serif";
const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";

export function renderInvoiceEmail(d: InvoiceEmailData): string {
  const name = esc(firstName(d.customerName));
  const business = esc(d.businessName);
  const showInvoice = d.kind === 'invoice';
  const showReview = Boolean(d.reviewUrl);

  const preheader = showInvoice
    ? `Your invoice from ${business} is ready — and if we earned it, we'd love your review.`
    : `Thanks from ${business} — if we did a good job, a quick review would mean a lot.`;

  const intro = d.intro
    ? esc(d.intro).replace(/\n+/g, '<br>')
    : `Thanks for choosing ${business}. Here's a summary of your invoice — the full breakdown and payment details are in the attached PDF.`;

  const invoiceSection = showInvoice
    ? `
    <!-- SECTION 1: INVOICE -->
    <tr>
      <td style="padding:44px 40px 8px 40px;" class="px-mobile">
        <span style="font-family:${BODY}; color:${GOLD}; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase;">Invoice Ready</span>
        <h1 class="headline" style="margin:10px 0 0 0; font-family:${DISPLAY}; color:${INK}; font-size:30px; line-height:36px; font-weight:500;">
          Hi ${name}, your invoice<br>is ready to view.
        </h1>
        <p style="margin:14px 0 0 0; font-family:${BODY}; color:#5B6069; font-size:15px; line-height:24px;">
          ${intro}
        </p>
      </td>
    </tr>

    <!-- Invoice data card -->
    <tr>
      <td style="padding:24px 40px 0 40px;" class="px-mobile">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CARD}; border-radius:8px; border:1px solid ${LINE};">
          <tr>
            <td style="padding:22px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="stack-col" width="50%" valign="top">
                    <span style="font-family:${BODY}; color:#8A8F98; font-size:11px; letter-spacing:1px; text-transform:uppercase;">Invoice Number</span><br>
                    <span style="font-family:${BODY}; color:${INK}; font-size:16px; font-weight:600;">${esc(d.invoiceNumber)}</span>
                  </td>
                  <td class="stack-col" width="50%" valign="top" align="right">
                    <span style="font-family:${BODY}; color:#8A8F98; font-size:11px; letter-spacing:1px; text-transform:uppercase;">${d.dueDate ? 'Due Date' : 'Status'}</span><br>
                    <span style="font-family:${BODY}; color:${INK}; font-size:16px; font-weight:600;">${esc(d.dueDate || 'Paid in full')}</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px; padding-top:18px; border-top:1px solid ${LINE};">
                <tr>
                  <td valign="middle">
                    <span style="font-family:${BODY}; color:#8A8F98; font-size:11px; letter-spacing:1px; text-transform:uppercase;">${d.dueDate ? 'Amount Due' : 'Amount'}</span><br>
                    <span class="amount-cell" style="font-family:${DISPLAY}; color:${INK}; font-size:34px; font-weight:600;">${esc(d.amount)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        ${
          d.attached
            ? `<p style="margin:14px 0 0 0; font-family:${BODY}; color:#9CA3AF; font-size:12.5px; text-align:center;">
                 The full invoice is attached to this email as a PDF.
               </p>`
            : ''
        }
      </td>
    </tr>

    <!-- SIGNATURE DIVIDER: charge-level bar -->
    <tr>
      <td style="padding:36px 40px 0 40px;" class="px-mobile">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="20%" style="background-color:${GOLD}; height:5px; font-size:0; line-height:0; border-radius:3px 0 0 3px;">&nbsp;</td>
            <td width="2%" style="font-size:0; line-height:0;">&nbsp;</td>
            <td width="20%" style="background-color:${GOLD}; height:5px; font-size:0; line-height:0;">&nbsp;</td>
            <td width="2%" style="font-size:0; line-height:0;">&nbsp;</td>
            <td width="20%" style="background-color:${GOLD}; height:5px; font-size:0; line-height:0;">&nbsp;</td>
            <td width="2%" style="font-size:0; line-height:0;">&nbsp;</td>
            <td width="20%" style="background-color:#D8AE5F; height:5px; font-size:0; line-height:0;">&nbsp;</td>
            <td width="2%" style="font-size:0; line-height:0;">&nbsp;</td>
            <td width="20%" style="background-color:#EAD8AE; height:5px; font-size:0; line-height:0; border-radius:0 3px 3px 0;">&nbsp;</td>
          </tr>
        </table>
        <p align="center" style="margin:12px 0 0 0; font-family:${BODY}; color:#B8BAC0; font-size:10.5px; letter-spacing:2px; text-transform:uppercase; text-align:center;">
          Service Complete
        </p>
      </td>
    </tr>`
    : '';

  const reviewSection = showReview
    ? `
    <!-- SECTION 2: REVIEW -->
    <tr>
      <td style="padding:${showInvoice ? '28px' : '44px'} 40px 4px 40px; text-align:center;" class="px-mobile" align="center">
        <span style="font-family:${BODY}; color:${GOLD}; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase;">Your Feedback Matters</span>
        <h2 class="review-headline" style="margin:10px 0 0 0; font-family:${DISPLAY}; color:${INK}; font-size:25px; line-height:31px; font-weight:500;">
          Fully charged.<br>Fully satisfied?
        </h2>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 0 auto;">
          <tr><td style="font-size:22px; letter-spacing:4px; color:${GOLD};">★ ★ ★ ★ ★</td></tr>
        </table>

        <p style="margin:16px auto 0 auto; max-width:420px; font-family:${BODY}; color:#5B6069; font-size:15px; line-height:24px;">
          If we got your battery — and your day — sorted, a quick Google review helps other Perth
          drivers find a shop they can trust. It takes less than a minute.
        </p>
      </td>
    </tr>

    <!-- CTA: Review -->
    <tr>
      <td align="center" style="padding:22px 40px 44px 40px;" class="px-mobile">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" class="btn-secondary btn-full" style="border-radius:4px; border:1.5px solid ${GOLD};">
              <a href="${esc(d.reviewUrl || '')}" target="_blank" class="btn-full" style="display:inline-block; padding:14px 44px; font-family:${BODY}; font-size:14.5px; font-weight:700; letter-spacing:0.3px; text-decoration:none; color:${GOLD};">
                ★ Leave a Google Review
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0 0; font-family:${BODY}; color:#9CA3AF; font-size:12.5px;">
          Takes under 60 seconds · Means a lot to a local, family-run business
        </p>
      </td>
    </tr>`
    : `
    <tr>
      <td style="padding:8px 40px 44px 40px;" class="px-mobile"></td>
    </tr>`;

  const footerContact = [d.businessAddress, [d.businessPhone, d.businessEmail].filter(Boolean).join(' · ')]
    .filter(Boolean)
    .map((line) => esc(line as string))
    .join('<br>');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${showInvoice ? 'Your Invoice is Ready' : 'How did we do?'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  body { margin:0; padding:0; width:100% !important; height:100% !important; background-color:${PAPER}; }
  table { border-collapse:collapse !important; }
  .btn-secondary:hover { background-color:${GOLD}; }
  .btn-secondary:hover a { color:${INK} !important; }
  @media screen and (max-width:600px) {
    .email-container { width:100% !important; }
    .stack-col { display:block !important; width:100% !important; text-align:center !important; padding-bottom:16px; }
    .px-mobile { padding-left:24px !important; padding-right:24px !important; }
    .headline { font-size:26px !important; line-height:32px !important; }
    .review-headline { font-size:22px !important; line-height:28px !important; }
    .btn-full { width:100% !important; display:block !important; }
    .amount-cell { font-size:30px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:${PAPER};">

  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${PAPER};">
    ${esc(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#FFFFFF; border-radius:10px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:${INK}; padding:28px 40px;" class="px-mobile">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="font-family:${DISPLAY}; color:#F7F6F3; font-size:20px; font-weight:600; letter-spacing:0.5px;">${business}</span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-family:${BODY}; color:#9CA3AF; font-size:11px; letter-spacing:1.5px; text-transform:uppercase;">${showInvoice ? 'Invoice Notice' : 'Thank You'}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${GOLD}; height:3px; line-height:3px; font-size:0;">&nbsp;</td>
          </tr>
          ${invoiceSection}
          ${reviewSection}

          <!-- FOOTER -->
          <tr>
            <td style="background-color:${CARD}; padding:26px 40px; border-top:1px solid ${LINE};" class="px-mobile">
              <p style="margin:0; font-family:${BODY}; color:#8A8F98; font-size:12px; line-height:19px; text-align:center;">
                ${business}${footerContact ? `<br>${footerContact}` : ''}
              </p>
              <p style="margin:12px 0 0 0; font-family:${BODY}; color:#B8BAC0; font-size:11px; line-height:17px; text-align:center;">
                This is a transactional notice regarding your recent service. Questions about your
                invoice? Just reply to this email.
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

'use client';

import { createRoot } from 'react-dom/client';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Business, Invoice } from '@/types';
import InvoiceDocument, { DOC_W, DOC_H } from '@/components/invoice/InvoiceDocument';

// A Vercel function rejects a request body over 4.5 MB, and the rejection comes
// back as HTML rather than JSON — which is how an oversized invoice used to
// turn into a vague "could not send" with no attachment. We keep the PDF well
// under that on the way out instead, dropping quality a step at a time until it
// fits. 3 MB leaves plenty of room for the rest of the multipart body.
const MAX_PDF_BYTES = 3_000_000;

// Tried in order. PNG at 2× is the sharp one we want for a one-page invoice;
// the JPEG passes only come into play for long multi-page documents.
const QUALITY_STEPS: { pixelRatio: number; jpegQuality?: number }[] = [
  { pixelRatio: 2 },
  { pixelRatio: 2, jpegQuality: 0.92 },
  { pixelRatio: 1.5, jpegQuality: 0.88 },
  { pixelRatio: 1.25, jpegQuality: 0.82 },
];

// Render the branded HTML invoice off-screen and capture every A4 page as an
// image data URL (long invoices flow onto extra pages).
async function renderInvoiceImages(
  invoice: Invoice,
  business: Business,
  step: { pixelRatio: number; jpegQuality?: number }
): Promise<string[]> {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${DOC_W}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<InvoiceDocument invoice={invoice} business={business} />);

  try {
    // Let React commit, fonts load, and logo images decode before capturing.
    await new Promise((r) => setTimeout(r, 100));
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(host.querySelectorAll('img')).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = img.onerror = () => res(null);
            })
      )
    );

    // InvoiceDocument re-measures its page fit once fonts are in; let that
    // re-render commit before we pick up the pages.
    await new Promise((r) => setTimeout(r, 50));

    const pages = Array.from(host.querySelectorAll('[data-invoice-page]')).map(
      (wrap) => wrap.firstElementChild as HTMLElement
    );
    // An empty render would otherwise sail on and produce a blank PDF that
    // still gets emailed — the exact failure this whole path had.
    if (pages.length === 0) throw new Error('The invoice could not be rendered.');

    const opts = {
      pixelRatio: step.pixelRatio,
      width: DOC_W,
      height: DOC_H,
      backgroundColor: '#ffffff',
    };
    const capture = (node: HTMLElement, extra: object = {}) =>
      step.jpegQuality === undefined
        ? toPng(node, { ...opts, ...extra })
        : toJpeg(node, { ...opts, ...extra, quality: step.jpegQuality });

    // First pass warms up font/image embedding; then take the clean captures.
    await capture(pages[0]);
    const out: string[] = [];
    for (const node of pages) {
      out.push(await capture(node, { cacheBust: true }));
    }
    return out;
  } finally {
    root.unmount();
    host.remove();
  }
}

function assemble(images: string[], format: 'PNG' | 'JPEG'): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  images.forEach((img, i) => {
    if (i > 0) doc.addPage();
    doc.addImage(img, format, 0, 0, w, h, undefined, 'FAST');
  });
  return doc;
}

/**
 * The PDF as raw bytes, guaranteed non-empty and under the send budget.
 *
 * Everything that puts an invoice in front of a customer — the email
 * attachment, the Messages share sheet, the download — goes through here, so
 * they can never disagree about what the customer receives.
 */
export async function invoicePdfBytes(invoice: Invoice, business: Business): Promise<Blob> {
  let last: Blob | null = null;
  for (const step of QUALITY_STEPS) {
    const images = await renderInvoiceImages(invoice, business, step);
    const blob = assemble(images, step.jpegQuality === undefined ? 'PNG' : 'JPEG').output('blob');
    // A capture that silently produced nothing must never reach a customer.
    if (blob.size < 1000) throw new Error('The invoice PDF came out empty.');
    last = blob;
    if (blob.size <= MAX_PDF_BYTES) return blob;
  }
  // Even the lowest quality step is over budget — hand it back anyway so a
  // download or share still works; only the email path enforces the ceiling.
  return last!;
}

export function pdfFilename(invoice: Invoice): string {
  // A Draft holds no invoice number yet, and a bare ".pdf" is a nameless
  // dotfile that several mail clients hide entirely.
  const base = invoice.invoiceNumber?.trim() || `invoice-${invoice.id.slice(0, 6)}`;
  return `${base}.pdf`;
}

export async function invoicePdfFile(invoice: Invoice, business: Business): Promise<File> {
  const blob = await invoicePdfBytes(invoice, business);
  return new File([blob], pdfFilename(invoice), { type: 'application/pdf' });
}

export async function buildInvoicePDF(invoice: Invoice, business: Business): Promise<jsPDF> {
  const images = await renderInvoiceImages(invoice, business, QUALITY_STEPS[0]);
  return assemble(images, 'PNG');
}

export async function downloadInvoicePDF(invoice: Invoice, business: Business): Promise<void> {
  const doc = await buildInvoicePDF(invoice, business);
  doc.save(pdfFilename(invoice));
}

/**
 * True when this device can actually hand a PDF to the OS share sheet.
 *
 * The touch check is not cosmetic. Desktop Chrome answers `canShare({files})`
 * with `true`, then `navigator.share()` never settles — the promise neither
 * resolves nor rejects, so anything awaiting it hangs and the button looks
 * dead. Confirmed by driving real Chrome. A device with no touch input can't
 * send a text anyway, so it is offered the file directly instead.
 */
export function canShareFile(file: File): boolean {
  if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') {
    return false;
  }
  if (!window.matchMedia('(pointer: coarse)').matches) return false;
  return navigator.canShare({ files: [file] });
}

/** Saves an already-built PDF to disk, for when sharing isn't available. */
export function savePdfFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  // The anchor has to be in the document: a detached one is ignored outright by
  // some browsers, which is how a "download" could end up doing nothing at all.
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Uses the native share sheet on phones (AirDrop, SMS, email, WhatsApp…).
// Falls back to a normal download on desktop browsers.
export async function shareInvoicePDF(
  invoice: Invoice,
  business: Business,
  text?: string
): Promise<void> {
  const file = await invoicePdfFile(invoice, business);
  await sharePdfFile(file, `Invoice ${invoice.invoiceNumber}`, text);
}

/** What actually became of a share attempt, so the caller can say so. */
export type ShareResult = 'shared' | 'cancelled' | 'downloaded' | 'failed';

/**
 * Shares a PDF that was built earlier. Kept separate from building it because
 * iOS only honours navigator.share inside the user-gesture window — the PDF has
 * to already exist by the time the button is tapped.
 *
 * Never returns without something having happened: if the share sheet can't
 * open, the file is downloaded instead, and if even that fails the caller is
 * told so it can offer another way. A button that silently does nothing is the
 * one outcome this must not produce.
 */
export async function sharePdfFile(
  file: File,
  title: string,
  text?: string
): Promise<ShareResult> {
  if (canShareFile(file)) {
    try {
      // Raced against a timeout as a last resort: a share() that never settles
      // would otherwise leave the button spinning for good. It is deliberately
      // generous, because a sheet the user is still reading is not a failure.
      const timedOut = Symbol('timeout');
      const result = await Promise.race([
        navigator.share({ title, text, files: [file] }).then(() => 'shared' as const),
        new Promise<typeof timedOut>((r) => setTimeout(() => r(timedOut), 60_000)),
      ]);
      if (result === 'shared') return 'shared';
    } catch (err) {
      // The user closing the sheet is a decision, not a failure.
      if ((err as Error).name === 'AbortError') return 'cancelled';
      // Anything else (no permission, no activation) falls through to the
      // download below.
    }
  }
  try {
    savePdfFile(file);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

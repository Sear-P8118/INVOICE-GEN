'use client';

import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Business, Invoice } from '@/types';
import InvoiceDocument, { DOC_W, DOC_H } from '@/components/invoice/InvoiceDocument';

// Render the branded HTML invoice off-screen and capture it as a PNG data URL.
async function renderInvoicePng(invoice: Invoice, business: Business): Promise<string> {
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

    const node = host.firstElementChild as HTMLElement;
    const opts = { pixelRatio: 2, width: DOC_W, height: DOC_H, backgroundColor: '#ffffff' };
    // First pass warms up font/image embedding; the second is the clean capture.
    await toPng(node, opts);
    return await toPng(node, { ...opts, cacheBust: true });
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function buildInvoicePDF(invoice: Invoice, business: Business): Promise<jsPDF> {
  const png = await renderInvoicePng(invoice, business);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.addImage(png, 'PNG', 0, 0, w, h, undefined, 'FAST');
  return doc;
}

export async function downloadInvoicePDF(invoice: Invoice, business: Business): Promise<void> {
  const doc = await buildInvoicePDF(invoice, business);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

// Base64 (no data-URI prefix) for emailing the PDF as an attachment.
export async function invoicePdfBase64(invoice: Invoice, business: Business): Promise<string> {
  const doc = await buildInvoicePDF(invoice, business);
  const uri = doc.output('datauristring');
  return uri.substring(uri.indexOf(',') + 1);
}

// Uses the native share sheet on phones (AirDrop, SMS, email, WhatsApp…).
// Falls back to a normal download on desktop browsers.
export async function shareInvoicePDF(invoice: Invoice, business: Business): Promise<void> {
  const doc = await buildInvoicePDF(invoice, business);
  const blob = doc.output('blob');
  const file = new File([blob], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: `Invoice ${invoice.invoiceNumber}`, files: [file] });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user closed the share sheet
    }
  }
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

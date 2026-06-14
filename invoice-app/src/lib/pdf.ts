import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Business, Invoice, daysOverdue } from '@/types';
import { RGB, formatCurrency, getBusinessConfig } from './constants';
import { format, parseISO } from 'date-fns';

const SLATE: RGB = [30, 41, 59];
const GRAY: RGB = [100, 116, 139];
const LIGHT: RGB = [241, 245, 249];

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

// ---------- Logo loading (cached data URLs so PDFs embed the brand logo) ----------

const logoCache = new Map<string, string>();

async function loadLogo(src: string): Promise<string | null> {
  const cached = logoCache.get(src);
  if (cached) return cached;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    logoCache.set(src, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

// ---------- Invoice PDF ----------

export async function buildInvoicePDF(invoice: Invoice, business: Business): Promise<jsPDF> {
  const config = getBusinessConfig(invoice.businessId);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const right = pageW - margin;
  const isQuote = invoice.status === 'Quote';
  const isTaxInvoice = invoice.gstRegistered && !isQuote;
  const title = isQuote ? 'QUOTE' : isTaxInvoice ? 'TAX INVOICE' : 'INVOICE';

  const pdf = config?.pdf;
  const accent: RGB = pdf?.accent ?? SLATE;
  const logo = config ? await loadLogo(config.logo.src) : null;
  const logoFormat = config?.logo.src.endsWith('.jpg') ? 'JPEG' : 'PNG';

  let y: number;

  if (pdf?.headerStyle === 'plain' && config) {
    // ---- Plain header: white page, logo block top-left, big title right ----
    const logoW = 54;
    const logoH = (config.logo.height / config.logo.width) * logoW;
    if (logo) {
      doc.addImage(logo, logoFormat, margin, 12, logoW, logoH);
    } else {
      doc.setFillColor(...pdf.band);
      doc.rect(margin, 12, logoW, 24, 'F');
    }

    doc.setTextColor(...accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(title, right, 22, { align: 'right' });

    doc.setTextColor(...SLATE);
    doc.setFontSize(11);
    doc.text(invoice.invoiceNumber, right, 30, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    let cy = 36;
    const contact = [
      business.abn ? `ABN ${business.abn}` : '',
      business.phone,
      business.email,
    ].filter(Boolean);
    contact.forEach((line) => {
      doc.text(line, right, cy, { align: 'right' });
      cy += 4.2;
    });

    // brand rule under the header
    const headerBottom = Math.max(12 + logoH, cy - 4.2) + 6;
    doc.setDrawColor(...accent);
    doc.setLineWidth(1.2);
    doc.line(margin, headerBottom, right, headerBottom);

    y = headerBottom + 10;
  } else {
    // ---- Band header: full-width brand-coloured band ----
    const bandH = 40;
    doc.setFillColor(...(pdf?.band ?? SLATE));
    doc.rect(0, 0, pageW, bandH, 'F');
    // accent rule along the bottom of the band
    doc.setFillColor(...accent);
    doc.rect(0, bandH, pageW, 1.6, 'F');

    if (logo && config) {
      const logoH = 22;
      const logoW = (config.logo.width / config.logo.height) * logoH;
      if (pdf?.logoChip) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, 7, logoW + 8, logoH + 4, 2.5, 2.5, 'F');
        doc.addImage(logo, logoFormat, margin + 4, 9, logoW, logoH);
      } else {
        doc.addImage(logo, logoFormat, margin, 9, logoW, logoH);
      }
    } else {
      doc.setTextColor(...(pdf?.bandText ?? [255, 255, 255]));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(business.name, margin, 20);
    }

    doc.setTextColor(...(pdf?.bandText ?? [255, 255, 255]));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, right, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(invoice.invoiceNumber, right, 23, { align: 'right' });

    doc.setFontSize(8.5);
    const contact = [
      business.abn ? `ABN ${business.abn}` : '',
      business.phone,
      business.email,
    ].filter(Boolean);
    let hy = 30;
    contact.forEach((line) => {
      doc.text(line, right, hy, { align: 'right' });
      hy += 4.2;
    });

    y = bandH + 14;
  }

  // ---- Bill To / dates ----
  const showDue = invoice.status === 'Pending' || invoice.status === 'Overdue';
  const leftDateLabel =
    isQuote ? 'DATE' : invoice.status === 'Paid' ? 'DATE PAID' : 'ISSUE DATE';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text('BILL TO', margin, y);
  doc.text(leftDateLabel, 118, y);
  if (showDue) doc.text('DUE DATE', right, y, { align: 'right' });

  y += 5.5;
  doc.setTextColor(...SLATE);
  doc.setFontSize(10.5);
  doc.text(invoice.customerName || '—', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(fmtDate(invoice.issueDate), 118, y);
  if (showDue) doc.text(fmtDate(invoice.dueDate), right, y, { align: 'right' });

  if (invoice.status === 'Overdue') {
    const od = daysOverdue(invoice.dueDate);
    if (od > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`${od} DAY${od === 1 ? '' : 'S'} OVERDUE`, right, y + 4.8, { align: 'right' });
      doc.setTextColor(...SLATE);
      doc.setFont('helvetica', 'normal');
    }
  }

  y += 5;
  const detailTop = y;
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  const custLines: string[] = [];
  if (invoice.customerAddress) custLines.push(...doc.splitTextToSize(invoice.customerAddress, 85));
  if (invoice.customerPhone) custLines.push(invoice.customerPhone);
  if (invoice.customerEmail) custLines.push(invoice.customerEmail);
  custLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4.2;
  });

  if (business.address) {
    doc.text(doc.splitTextToSize(`From: ${business.address}`, 75), 118, detailTop);
  }

  y = Math.max(y, (pdf?.headerStyle === 'plain' ? 0 : 40) + 38) + 6;

  // ---- Line items ----
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: invoice.lineItems.map((item) => [
      item.description,
      String(item.quantity),
      formatCurrency(item.unitPrice),
      formatCurrency(item.quantity * item.unitPrice),
    ]),
    theme: 'plain',
    headStyles: {
      fillColor: [...(pdf?.tableHeadFill ?? LIGHT)],
      textColor: [...(pdf?.tableHeadText ?? SLATE)],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9.5, textColor: [...SLATE], cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index === 1) data.cell.styles.halign = 'center';
        if (data.column.index >= 2) data.cell.styles.halign = 'right';
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ty = (doc as any).lastAutoTable.finalY + 8;

  // ---- Totals ----
  const labelX = 126;
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE);
    doc.text(label, labelX, ty);
    doc.text(value, right, ty, { align: 'right' });
    ty += 6;
  };

  if (isTaxInvoice) {
    row('Subtotal', formatCurrency(invoice.subtotal));
    row('GST (10%)', formatCurrency(invoice.gstAmount));
  }

  // accent total bar
  const totalBarH = 11;
  doc.setFillColor(...accent);
  doc.roundedRect(labelX - 5, ty - 4, right - labelX + 5, totalBarH, 1.5, 1.5, 'F');
  const totalLabel =
    invoice.status === 'Paid' ? 'TOTAL PAID' : isQuote ? 'QUOTE TOTAL' : 'TOTAL DUE';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text(totalLabel, labelX, ty + 3);
  doc.text(formatCurrency(invoice.total), right - 2, ty + 3, { align: 'right' });
  ty += totalBarH + 4;

  if (!isTaxInvoice) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('No GST has been charged.', right, ty, { align: 'right' });
    ty += 5;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Total includes ${formatCurrency(invoice.gstAmount)} GST`, right, ty, { align: 'right' });
    ty += 5;
  }

  // ---- Payment details ----
  if (business.bsb || business.accountNumber || business.bankName || business.accountName) {
    ty += 4;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(margin, ty - 5, right - margin, 30, 2, 2, 'F');
    doc.setFillColor(...accent);
    doc.rect(margin, ty - 5, 1.6, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE);
    doc.text('Payment Details (EFT)', margin + 6, ty + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let py = ty + 7;
    const payLines = [
      business.accountName && `Account Name: ${business.accountName}`,
      business.bankName && `Bank: ${business.bankName}`,
      business.bsb && `BSB: ${business.bsb}`,
      business.accountNumber && `Account No: ${business.accountNumber}`,
    ].filter(Boolean) as string[];
    payLines.forEach((line) => {
      doc.text(line, margin + 6, py);
      py += 4.6;
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`Reference: ${invoice.invoiceNumber}`, right - 5, ty + 7, { align: 'right' });
    ty += 32;
  }

  // ---- Notes ----
  if (invoice.notes) {
    ty += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text('NOTES', margin, ty);
    ty += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(doc.splitTextToSize(invoice.notes, right - margin), margin, ty);
  }

  // ---- Footer ----
  doc.setFillColor(...accent);
  doc.rect(0, pageH - 12, pageW, 0.8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(pdf?.footerNote ?? 'Thank you for your business', pageW / 2, pageH - 6.5, {
    align: 'center',
  });

  return doc;
}

export async function downloadInvoicePDF(invoice: Invoice, business: Business): Promise<void> {
  const doc = await buildInvoicePDF(invoice, business);
  doc.save(`${invoice.invoiceNumber}.pdf`);
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

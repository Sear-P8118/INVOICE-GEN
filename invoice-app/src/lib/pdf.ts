import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Business, Invoice } from '@/types';
import { formatCurrency } from './constants';
import { format, parseISO } from 'date-fns';

const SLATE = [30, 41, 59] as const;
const GRAY = [100, 116, 139] as const;

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

export function buildInvoicePDF(invoice: Invoice, business: Business): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const right = pageW - margin;
  const isTaxInvoice = invoice.gstRegistered;

  // ---- Header band ----
  doc.setFillColor(...SLATE);
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(business.name, margin, 17);

  doc.setFontSize(13);
  doc.text(isTaxInvoice ? 'TAX INVOICE' : 'INVOICE', right, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.invoiceNumber, right, 21, { align: 'right' });

  doc.setFontSize(8.5);
  const headerContact = [
    business.abn ? `ABN ${business.abn}` : '',
    business.phone,
    business.email,
  ].filter(Boolean);
  let hy = 25;
  headerContact.forEach((line) => {
    doc.text(line, margin, hy);
    hy += 4.5;
  });

  // ---- Dates / Bill To ----
  doc.setTextColor(...SLATE);
  let y = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('BILL TO', margin, y);
  doc.text('ISSUE DATE', 120, y);
  doc.text('DUE DATE', right, y, { align: 'right' });

  y += 5.5;
  doc.setTextColor(...SLATE);
  doc.setFontSize(10.5);
  doc.text(invoice.customerName || '—', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(fmtDate(invoice.issueDate), 120, y);
  doc.text(fmtDate(invoice.dueDate), right, y, { align: 'right' });

  y += 5;
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
    doc.text(doc.splitTextToSize(business.address, 70), 120, 58.5);
  }

  y = Math.max(y, 72) + 4;

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
      fillColor: [241, 245, 249],
      textColor: [...SLATE],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9.5, textColor: [...SLATE], cellPadding: 3 },
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
  const labelX = 130;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11.5 : 9.5);
    doc.setTextColor(...SLATE);
    doc.text(label, labelX, ty);
    doc.text(value, right, ty, { align: 'right' });
    ty += bold ? 8 : 6;
  };

  if (isTaxInvoice) {
    row('Subtotal', formatCurrency(invoice.subtotal));
    row('GST (10%)', formatCurrency(invoice.gstAmount));
    doc.setDrawColor(...SLATE);
    doc.setLineWidth(0.4);
    doc.line(labelX, ty - 3.5, right, ty - 3.5);
    row('Total Due', formatCurrency(invoice.total), true);
  } else {
    doc.setDrawColor(...SLATE);
    doc.setLineWidth(0.4);
    doc.line(labelX, ty - 3.5, right, ty - 3.5);
    row('Total Due', formatCurrency(invoice.total), true);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('No GST has been charged.', right, ty, { align: 'right' });
    ty += 6;
  }

  // ---- Payment details ----
  if (business.bsb || business.accountNumber || business.bankName) {
    ty += 4;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, ty - 5, right - margin, 30, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE);
    doc.text('Payment Details', margin + 5, ty + 1);
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
      doc.text(line, margin + 5, py);
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
    doc.setTextColor(...GRAY);
    doc.text('NOTES', margin, ty);
    ty += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(doc.splitTextToSize(invoice.notes, right - margin), margin, ty);
  }

  // ---- Footer ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Thank you for your business', pageW / 2, 287, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(invoice: Invoice, business: Business): void {
  buildInvoicePDF(invoice, business).save(`${invoice.invoiceNumber}.pdf`);
}

// Uses the native share sheet on phones (AirDrop, SMS, email, WhatsApp…).
// Falls back to a normal download on desktop browsers.
export async function shareInvoicePDF(invoice: Invoice, business: Business): Promise<void> {
  const blob = buildInvoicePDF(invoice, business).output('blob');
  const file = new File([blob], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: `Invoice ${invoice.invoiceNumber}`, files: [file] });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user closed the share sheet
    }
  }
  downloadInvoicePDF(invoice, business);
}

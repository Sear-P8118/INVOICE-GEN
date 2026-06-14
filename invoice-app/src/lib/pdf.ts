import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Business, Invoice, InvoiceStatus, daysOverdue } from '@/types';
import { BusinessConfig, RGB, formatCurrency, getBusinessConfig } from './constants';
import { format, parseISO } from 'date-fns';

const SLATE: RGB = [30, 41, 59];
const GRAY: RGB = [100, 116, 139];
const LIGHT: RGB = [241, 245, 249];
const WHITE: RGB = [255, 255, 255];
const GST_RATE = 0.1;

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

function statusColor(status: InvoiceStatus): RGB {
  switch (status) {
    case 'Paid':
      return [16, 185, 129];
    case 'Overdue':
      return [220, 38, 38];
    case 'Pending':
      return [245, 158, 11];
    case 'Quote':
      return [37, 99, 235];
    default:
      return [100, 116, 139];
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

// ---------- Shared render context ----------

interface Ctx {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  margin: number;
  right: number;
  config: BusinessConfig;
  invoice: Invoice;
  business: Business;
  logo: string | null;
  logoFmt: 'PNG' | 'JPEG';
  title: string;
  isQuote: boolean;
  gstReg: boolean;
}

interface LineParts {
  unit: number;
  net: number;
  gst: number;
  gross: number;
}

function lineParts(qty: number, price: number, gstReg: boolean, inclusive: boolean): LineParts {
  const gross0 = (qty || 0) * (price || 0);
  if (!gstReg) return { unit: price, net: gross0, gst: 0, gross: gross0 };
  if (inclusive) {
    const net = gross0 / (1 + GST_RATE);
    return { unit: price, net, gst: gross0 - net, gross: gross0 };
  }
  const gst = gross0 * GST_RATE;
  return { unit: price, net: gross0, gst, gross: gross0 + gst };
}

// Paid → fully paid, nothing owing. Otherwise the total is the balance owing.
function paidAndBalance(invoice: Invoice): { paid: number; balance: number } {
  if (invoice.status === 'Paid') return { paid: invoice.total, balance: 0 };
  return { paid: 0, balance: invoice.total };
}

function contactLines(b: Business): string[] {
  return [b.address, b.phone, b.email, b.abn ? `ABN ${b.abn}` : ''].filter(Boolean) as string[];
}

function addLogo(ctx: Ctx, x: number, y: number, maxW: number, maxH: number, chip?: RGB) {
  const { doc, logo, logoFmt, config } = ctx;
  const ratio = config.logo.width / config.logo.height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  if (chip) {
    doc.setFillColor(...chip);
    doc.roundedRect(x - 2, y - 2, w + 4, h + 4, 1.5, 1.5, 'F');
  }
  if (logo) doc.addImage(logo, logoFmt, x, y, w, h);
  return h;
}

// ============================================================
//  TEMPLATE: Car Battery Perth — navy + orange
// ============================================================

function renderCBP(ctx: Ctx) {
  const { doc, pageH, margin, right, invoice, business, config, title, isQuote, gstReg } = ctx;
  const navy = config.pdf.band;
  const orange = config.pdf.accent;

  // Header: navy panel left (logo), navy panel right (title + details)
  const colGap = 8;
  const leftW = (right - margin - colGap) * 0.52;
  const rightX = margin + leftW + colGap;
  const rightW = right - rightX;

  // Left navy logo panel
  doc.setFillColor(...navy);
  doc.roundedRect(margin, 14, leftW, 30, 2.5, 2.5, 'F');
  addLogo(ctx, margin + 5, 19, leftW - 10, 20, [255, 255, 255]);

  // Contact under the panel
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  let cy = 49;
  contactLines(business).forEach((l) => {
    doc.text(l, margin, cy);
    cy += 4.4;
  });

  // Right title block
  doc.setFillColor(...navy);
  doc.roundedRect(rightX, 14, rightW, 13, 2.5, 2.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, rightX + rightW - 4, 22.5, { align: 'right' });

  // Details card
  const cardY = 29;
  const rows: [string, string][] = [
    [isQuote ? 'QUOTE NO.' : 'INVOICE NO.', invoice.invoiceNumber],
    [isQuote ? 'DATE' : invoice.status === 'Paid' ? 'DATE PAID' : 'ISSUE DATE', fmtDate(invoice.issueDate)],
  ];
  if (invoice.status === 'Pending' || invoice.status === 'Overdue') rows.push(['DUE DATE', fmtDate(invoice.dueDate)]);
  const rowH = 7;
  const cardH = rows.length * rowH + 9;
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightX, cardY, rightW, cardH, 2, 2, 'S');
  let ry = cardY + 5.5;
  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(k, rightX + 4, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(v, rightX + rightW - 4, ry, { align: 'right' });
    ry += rowH;
  });
  // Status pill row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(isQuote ? 'TYPE' : 'STATUS', rightX + 4, ry + 0.5);
  drawPill(doc, invoice.status, rightX + rightW - 4, ry - 2.6, 'right');

  let y = Math.max(cy, cardY + cardH) + 8;

  // BILL TO bar
  doc.setFillColor(...navy);
  doc.roundedRect(margin, y, right - margin, 7, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('BILL TO', margin + 4, y + 4.8);
  y += 11;
  doc.setTextColor(...SLATE);
  doc.setFontSize(10);
  doc.text(invoice.customerName || '—', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  y += 4.6;
  [invoice.customerAddress, invoice.customerPhone, invoice.customerEmail]
    .filter(Boolean)
    .forEach((l) => {
      doc.splitTextToSize(l, right - margin).forEach((ln: string) => {
        doc.text(ln, margin, y);
        y += 4.2;
      });
    });
  if (invoice.status === 'Overdue' && daysOverdue(invoice.dueDate) > 0) {
    const od = daysOverdue(invoice.dueDate);
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text(`${od} day${od === 1 ? '' : 's'} overdue`, right, y - 4.2, { align: 'right' });
  }
  y += 3;

  // Items table — # | DESCRIPTION | QTY | UNIT (ex) | GST | AMOUNT (inc)
  const body = invoice.lineItems.map((it, i) => {
    const p = lineParts(it.quantity, it.unitPrice, gstReg, config.pdf.gstInclusive);
    return [
      String(i + 1).padStart(2, '0'),
      it.description,
      String(it.quantity),
      formatCurrency(p.unit),
      gstReg ? formatCurrency(p.gst) : '—',
      formatCurrency(p.gross),
    ];
  });
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'GST', 'AMOUNT']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [...navy], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: [...SLATE], cellPadding: 2.6, lineColor: [...LIGHT], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: [...orange], fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ty = (doc as any).lastAutoTable.finalY + 8;

  // Totals (right) + payment (left)
  const totalsX = right - 78;
  drawPaymentBox(ctx, margin, ty, totalsX - margin - 6, navy);
  ty = drawTotals(ctx, totalsX, ty, 78, navy, orange);

  // Notes + terms
  const blockY = Math.max(ty, pageH - 52);
  drawNotesTerms(ctx, blockY);

  drawFooter(ctx, orange);
}

// ============================================================
//  TEMPLATE: Battery Factory Direct — black / white / red
// ============================================================

function renderBFD(ctx: Ctx) {
  const { doc, margin, right, invoice, business, config, title, isQuote, gstReg } = ctx;
  const black = config.pdf.band;
  const red = config.pdf.accent;

  // Big title + red rule
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(title, margin, 24);
  doc.setFillColor(...red);
  doc.rect(margin, 28, right - margin, 1.4, 'F');

  // Left: round logo + business
  const logoR = 11;
  doc.setFillColor(...black);
  doc.circle(margin + logoR, 42 + logoR, logoR + 1.5, 'F');
  addLogo(ctx, margin + 3, 42 + 4, logoR * 2 - 6, logoR * 2 - 8);
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(business.name, margin + logoR * 2 + 6, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let ly = 51;
  contactLines(business).forEach((l) => {
    doc.text(l, margin + logoR * 2 + 6, ly);
    ly += 4.3;
  });

  // Right: INVOICE DETAILS card
  const cardW = 74;
  const cardX = right - cardW;
  doc.setFillColor(...black);
  doc.rect(cardX, 36, cardW, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INVOICE DETAILS', cardX + 4, 41.2);
  const dRows: [string, string, boolean][] = [
    [isQuote ? 'Quote Number:' : 'Invoice Number:', invoice.invoiceNumber, true],
    [invoice.status === 'Paid' ? 'Date Paid:' : 'Issue Date:', fmtDate(invoice.issueDate), false],
  ];
  if (invoice.status === 'Pending' || invoice.status === 'Overdue') dRows.push(['Due Date:', fmtDate(invoice.dueDate), false]);
  doc.setDrawColor(...LIGHT);
  doc.rect(cardX, 44, cardW, dRows.length * 7 + 10, 'S');
  let dy = 50;
  dRows.forEach(([k, v, hot]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(k, cardX + 4, dy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(hot ? red : SLATE));
    doc.text(v, cardX + cardW - 4, dy, { align: 'right' });
    dy += 7;
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text('Status:', cardX + 4, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusColor(invoice.status));
  doc.text(invoice.status.toUpperCase(), cardX + cardW - 4, dy, { align: 'right' });

  // Bill to (red bar)
  let y = Math.max(ly, dy) + 8;
  doc.setFillColor(...red);
  doc.rect(margin, y, 30, 6.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILL TO', margin + 3, y + 4.4);
  y += 11;
  doc.setTextColor(...SLATE);
  doc.setFontSize(10.5);
  doc.text(invoice.customerName || '—', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  y += 4.6;
  [invoice.customerAddress, invoice.customerPhone, invoice.customerEmail].filter(Boolean).forEach((l) => {
    doc.splitTextToSize(l, 90).forEach((ln: string) => {
      doc.text(ln, margin, y);
      y += 4.2;
    });
  });
  y += 3;

  // Items — DESCRIPTION | QTY | UNIT PRICE | GST | TOTAL
  const body = invoice.lineItems.map((it) => {
    const p = lineParts(it.quantity, it.unitPrice, gstReg, config.pdf.gstInclusive);
    return [it.description, String(it.quantity), formatCurrency(p.unit), gstReg ? formatCurrency(p.gst) : '—', formatCurrency(p.gross)];
  });
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'GST', 'TOTAL']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [...black], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 9, textColor: [...SLATE], cellPadding: 3, lineColor: [...LIGHT], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: (d) => {
      if (d.section === 'head' && d.column.index >= 1) d.cell.styles.halign = d.column.index === 1 ? 'center' : 'right';
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ty = (doc as any).lastAutoTable.finalY + 8;

  drawTotals(ctx, right - 78, ty, 78, black, red, true);

  // Left: payment method + warranty
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text('Payment Method:', margin, ty + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(business.bsb || business.accountNumber ? 'Card / EFT' : 'Card', margin + 34, ty + 2);
  if (business.bsb || business.accountNumber) {
    let py = ty + 8;
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    [
      business.accountName && `Account: ${business.accountName}`,
      business.bsb && `BSB: ${business.bsb}`,
      business.accountNumber && `Acc: ${business.accountNumber}`,
      `Reference: ${invoice.invoiceNumber}`,
    ]
      .filter(Boolean)
      .forEach((l) => {
        doc.text(l as string, margin, py);
        py += 4.4;
      });
  }

  drawFooterNote(ctx);
}

// ============================================================
//  TEMPLATE: Fremantle Batteries — red
// ============================================================

function renderFremantle(ctx: Ctx) {
  const { doc, pageW, margin, right, invoice, business, config, title, isQuote, gstReg } = ctx;
  const red = config.pdf.band;

  // Red header band, logo seamless (logo art is on red)
  const bandH = 38;
  doc.setFillColor(...red);
  doc.rect(0, 0, pageW, bandH, 'F');
  addLogo(ctx, margin, 8, 60, bandH - 16);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, right, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let hy = 21;
  contactLines(business).forEach((l) => {
    doc.text(l, right, hy, { align: 'right' });
    hy += 3.7;
  });

  // Detail strip
  let y = bandH + 10;
  const cells: [string, string][] = [
    [isQuote ? 'QUOTE NO.' : 'INVOICE NO.', invoice.invoiceNumber],
    [invoice.status === 'Paid' ? 'DATE PAID' : 'ISSUE DATE', fmtDate(invoice.issueDate)],
    ['STATUS', invoice.status.toUpperCase()],
  ];
  if (invoice.status === 'Pending' || invoice.status === 'Overdue') {
    cells.splice(2, 0, ['DUE DATE', fmtDate(invoice.dueDate)]);
  }
  const cw = (right - margin) / cells.length;
  cells.forEach(([k, v], i) => {
    const x = margin + cw * i;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...red);
    doc.text(k, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text(v, x, y + 5.5);
  });
  y += 13;
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.line(margin, y, right, y);
  y += 8;

  // Bill to + summary
  const colW = (right - margin) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...red);
  doc.text('BILL TO', margin, y);
  doc.text('INVOICE SUMMARY', margin + colW, y);
  doc.setTextColor(...SLATE);
  doc.setFontSize(10);
  doc.text(invoice.customerName || '—', margin, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let by = y + 11;
  [invoice.customerPhone, invoice.customerEmail, invoice.customerAddress].filter(Boolean).forEach((l) => {
    doc.text(l, margin, by);
    by += 4.3;
  });
  const { paid, balance } = paidAndBalance(invoice);
  const summary = isQuote
    ? ['This is a quotation.', 'Valid for 14 days from the date above.']
    : [
        `Sale status: ${invoice.status}`,
        balance <= 0 ? 'Payment received in full' : `Amount paid: ${formatCurrency(paid)}`,
        `Balance outstanding: ${formatCurrency(balance)}`,
      ];
  let sy = y + 6;
  summary.forEach((l) => {
    doc.text(l, margin + colW, sy);
    sy += 4.6;
  });
  y = Math.max(by, sy) + 4;

  // Items — DESCRIPTION | QTY | UNIT PRICE | GST | LINE TOTAL (GST shown "Included")
  const body = invoice.lineItems.map((it) => {
    const p = lineParts(it.quantity, it.unitPrice, gstReg, config.pdf.gstInclusive);
    return [it.description, String(it.quantity), formatCurrency(p.unit), gstReg ? 'Included' : '—', formatCurrency(p.gross)];
  });
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'GST', 'LINE TOTAL']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [...red], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 9, textColor: [...SLATE], cellPadding: 3, lineColor: [...LIGHT], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: (d) => {
      if (d.section === 'head' && d.column.index >= 1) d.cell.styles.halign = d.column.index === 2 || d.column.index === 4 ? 'right' : 'center';
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ty = (doc as any).lastAutoTable.finalY + 8;

  drawPaymentBox(ctx, margin, ty, right - 78 - margin - 6, red, true);
  drawTotals(ctx, right - 78, ty, 78, red, red, true, true);

  drawFooterNote(ctx);
}

// ---------- Shared building blocks ----------

function drawPill(doc: jsPDF, status: InvoiceStatus, x: number, y: number, align: 'left' | 'right') {
  const label = status.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const w = doc.getTextWidth(label) + 7;
  const px = align === 'right' ? x - w : x;
  doc.setFillColor(...statusColor(status));
  doc.roundedRect(px, y, w, 5.6, 2.8, 2.8, 'F');
  doc.setTextColor(...WHITE);
  doc.text(label, px + w / 2, y + 3.8, { align: 'center' });
}

// Totals block; returns the y below it.
function drawTotals(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  barFill: RGB,
  accent: RGB,
  withBalance = false,
  gstIncludedLabel = false
): number {
  const { doc, invoice, gstReg, isQuote } = ctx;
  const rx = x + w;
  let ty = y;
  const line = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...(bold ? SLATE : GRAY));
    doc.text(label, x, ty);
    doc.text(value, rx, ty, { align: 'right' });
    ty += 5.6;
  };
  if (gstReg) {
    line('Subtotal (ex GST)', formatCurrency(invoice.subtotal));
    line('GST (10%)', gstIncludedLabel ? 'Included' : formatCurrency(invoice.gstAmount));
  } else {
    line('Subtotal', formatCurrency(invoice.subtotal));
  }

  // Total bar
  const totalLabel = invoice.status === 'Paid' ? 'TOTAL PAID' : isQuote ? 'QUOTE TOTAL' : 'TOTAL DUE';
  doc.setFillColor(...barFill);
  doc.roundedRect(x - 3, ty - 4, w + 3, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(totalLabel, x, ty + 2.5);
  doc.text(formatCurrency(invoice.total), rx - 2, ty + 2.5, { align: 'right' });
  ty += 11;

  if (withBalance && !isQuote) {
    const { paid, balance } = paidAndBalance(invoice);
    line('Amount Paid', formatCurrency(paid));
    // Balance Due highlight
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.4);
    ty += 0.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...accent);
    doc.text('Balance Due', x, ty);
    doc.text(formatCurrency(balance), rx, ty, { align: 'right' });
    ty += 6;
  }
  return ty + 2;
}

// EFT payment details box; returns y below.
function drawPaymentBox(ctx: Ctx, x: number, y: number, w: number, accent: RGB, eftTitle = false): number {
  const { doc, business, invoice } = ctx;
  if (!business.bsb && !business.accountNumber && !business.accountName) return y;
  const h = 28;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFillColor(...accent);
  doc.rect(x, y, 1.6, h, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(eftTitle ? 'EFT PAYMENT DETAILS' : 'PAYMENT METHOD', x + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  let py = y + 12;
  [
    business.accountName && `Account Name: ${business.accountName}`,
    business.bsb && `BSB: ${business.bsb}`,
    business.accountNumber && `Account Number: ${business.accountNumber}`,
    `Reference: ${invoice.invoiceNumber}`,
  ]
    .filter(Boolean)
    .forEach((l) => {
      doc.text(l as string, x + 5, py);
      py += 4.4;
    });
  return y + h;
}

function drawNotesTerms(ctx: Ctx, y: number) {
  const { doc, margin, right, config, invoice } = ctx;
  const colW = (right - margin) / 2 - 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...config.pdf.accent);
  doc.text('NOTES', margin, y);
  doc.text('TERMS', margin + colW + 8, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...GRAY);
  const notes = invoice.notes || config.pdf.footerNote;
  doc.text(doc.splitTextToSize(notes, colW), margin, y + 5);
  let ty = y + 5;
  config.pdf.terms.forEach((t) => {
    const lines = doc.splitTextToSize(`• ${t}`, colW);
    doc.text(lines, margin + colW + 8, ty);
    ty += lines.length * 3.6 + 1.5;
  });
}

function drawFooter(ctx: Ctx, accent: RGB) {
  const { doc, pageW, pageH, config } = ctx;
  doc.setFillColor(...accent);
  doc.rect(0, pageH - 12, pageW, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...accent);
  doc.text(config.pdf.footerNote, pageW / 2, pageH - 6.5, { align: 'center' });
}

function drawFooterNote(ctx: Ctx) {
  const { doc, pageW, pageH, config } = ctx;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(config.pdf.footerNote, pageW / 2, pageH - 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(config.pdf.terms.join('   •   '), pageW / 2, pageH - 10, { align: 'center', maxWidth: pageW - 30 });
}

// ---------- Public API ----------

export async function buildInvoicePDF(invoice: Invoice, business: Business): Promise<jsPDF> {
  const config = getBusinessConfig(invoice.businessId)!;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadLogo(config.logo.src);
  const isQuote = invoice.status === 'Quote';
  const isTaxInvoice = invoice.gstRegistered && !isQuote;

  const ctx: Ctx = {
    doc,
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
    margin: 14,
    right: doc.internal.pageSize.getWidth() - 14,
    config,
    invoice,
    business,
    logo,
    logoFmt: config.logo.src.endsWith('.jpg') ? 'JPEG' : 'PNG',
    title: isQuote ? 'QUOTE' : isTaxInvoice ? 'TAX INVOICE' : 'INVOICE',
    isQuote,
    gstReg: invoice.gstRegistered,
  };

  if (config.pdf.template === 'bfd') renderBFD(ctx);
  else if (config.pdf.template === 'fremantle') renderFremantle(ctx);
  else renderCBP(ctx);

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

import { Invoice, effectiveStatus } from '@/types';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The Australian financial year (1 Jul – 30 Jun) containing `date`. */
export function australianFinancialYear(date = new Date()): { start: string; end: string; label: string } {
  const y = date.getFullYear();
  const startYear = date.getMonth() >= 6 ? y : y - 1; // July = month index 6
  return {
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
    label: `FY ${startYear}–${String(startYear + 1).slice(2)}`,
  };
}

export function thisMonth(date = new Date()): { start: string; end: string } {
  return {
    start: iso(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: iso(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

// Quotes and drafts are not sales, so they're excluded from revenue.
function isSale(inv: Invoice): boolean {
  return inv.status !== 'Quote' && inv.status !== 'Draft';
}

export interface ReportSummary {
  count: number;
  totalIncGst: number; // sum of invoice totals (GST-inclusive)
  gst: number; // GST portion contained within those totals
  netExGst: number; // totals minus GST
  paid: number;
  pending: number;
  overdue: number;
}

export function summarise(invoices: Invoice[], from: string, to: string): ReportSummary {
  const inRange = invoices.filter((i) => isSale(i) && i.issueDate >= from && i.issueDate <= to);
  const s: ReportSummary = { count: inRange.length, totalIncGst: 0, gst: 0, netExGst: 0, paid: 0, pending: 0, overdue: 0 };
  for (const inv of inRange) {
    s.totalIncGst += inv.total;
    s.gst += inv.gstAmount;
    s.netExGst += inv.subtotal;
    const eff = effectiveStatus(inv);
    if (eff === 'Paid') s.paid += inv.total;
    else if (eff === 'Overdue') s.overdue += inv.total;
    else if (eff === 'Pending') s.pending += inv.total;
  }
  // round to cents
  (Object.keys(s) as (keyof ReportSummary)[]).forEach((k) => {
    if (k !== 'count') s[k] = Math.round(s[k] * 100) / 100;
  });
  return s;
}

export function salesInRange(invoices: Invoice[], from: string, to: string): Invoice[] {
  return invoices
    .filter((i) => isSale(i) && i.issueDate >= from && i.issueDate <= to)
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate));
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Accountant-friendly CSV of the sales in range. */
export function toCSV(invoices: Invoice[], from: string, to: string, businessName: string): string {
  const rows = salesInRange(invoices, from, to);
  const header = [
    'Business',
    'Invoice #',
    'Issue date',
    'Due date',
    'Customer',
    'Status',
    'Subtotal (ex GST)',
    'GST',
    'Total (inc GST)',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const i of rows) {
    lines.push(
      [
        businessName,
        i.invoiceNumber,
        i.issueDate,
        i.dueDate,
        i.customerName,
        effectiveStatus(i),
        i.subtotal.toFixed(2),
        i.gstAmount.toFixed(2),
        i.total.toFixed(2),
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return lines.join('\n');
}

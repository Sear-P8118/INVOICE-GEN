export interface Business {
  id: string;
  name: string;
  abn: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  bsb: string;
  accountNumber: string;
  accountName: string;
  gstRegistered: boolean;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  paymentTermsDays: number;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

// 'Draft' is legacy (kept so old records + their badge still render); we no longer
// create drafts. 'Quote' is a non-invoice document type that shares this field.
export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue' | 'Quote';

// The types you can pick when creating, in the order shown in the picker.
export const INVOICE_STATUSES: InvoiceStatus[] = ['Pending', 'Paid', 'Overdue', 'Quote'];

// Quote = priced offer, no payment owed. Pending/Overdue carry a due date.
export const DOC_TYPES_NEED_DUE: InvoiceStatus[] = ['Pending', 'Overdue'];

// Invoices saved before the rename used 'Sent'.
export function normalizeStatus(status: string): InvoiceStatus {
  if (status === 'Sent') return 'Pending';
  if (status === 'Draft') return 'Draft';
  return (INVOICE_STATUSES as string[]).includes(status) ? (status as InvoiceStatus) : 'Draft';
}

function localToday(): string {
  const now = new Date(); // local date, not UTC
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Whole days a date is in the past (0 if today or future). */
export function daysOverdue(dueDate: string): number {
  if (!dueDate) return 0;
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = Date.UTC(y, m - 1, d);
  const [ty, tm, td] = localToday().split('-').map(Number);
  const today = Date.UTC(ty, tm - 1, td);
  const diff = Math.floor((today - due) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/** What the invoice effectively is right now: a Pending invoice past its due date shows as Overdue. */
export function effectiveStatus(invoice: Pick<Invoice, 'status' | 'dueDate'>): InvoiceStatus {
  if (invoice.status === 'Pending' && invoice.dueDate) {
    if (invoice.dueDate < localToday()) return 'Overdue';
  }
  return invoice.status;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  issueDate: string; // yyyy-MM-dd
  dueDate: string; // yyyy-MM-dd
  lineItems: LineItem[];
  gstRegistered: boolean; // snapshot at time of creation
  subtotal: number;
  gstAmount: number;
  total: number;
  status: InvoiceStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

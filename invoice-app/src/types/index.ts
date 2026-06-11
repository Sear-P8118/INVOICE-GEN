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

export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue';

export const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Pending', 'Paid', 'Overdue'];

// Invoices saved before the rename used 'Sent'.
export function normalizeStatus(status: string): InvoiceStatus {
  if (status === 'Sent') return 'Pending';
  return (INVOICE_STATUSES as string[]).includes(status) ? (status as InvoiceStatus) : 'Draft';
}

/** What the invoice effectively is right now: a Pending invoice past its due date shows as Overdue. */
export function effectiveStatus(invoice: Pick<Invoice, 'status' | 'dueDate'>): InvoiceStatus {
  if (invoice.status === 'Pending' && invoice.dueDate) {
    const now = new Date(); // local date, not UTC
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (invoice.dueDate < today) return 'Overdue';
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

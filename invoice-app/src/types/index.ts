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

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

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

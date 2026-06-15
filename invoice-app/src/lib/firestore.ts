import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { Business, Customer, Invoice, LineItem, SavedItem, normalizeStatus } from '@/types';
import { GST_RATE, getBusinessConfig } from './constants';

// ---------- Business settings ----------

export function defaultBusiness(businessId: string): Business {
  const config = getBusinessConfig(businessId);
  return {
    id: businessId,
    name: config?.name || '',
    abn: '',
    phone: '',
    email: '',
    address: '',
    bankName: '',
    bsb: '',
    accountNumber: '',
    accountName: '',
    gstRegistered: false,
    invoicePrefix: config?.invoicePrefix || 'INV',
    nextInvoiceNumber: 1001,
    paymentTermsDays: 14,
    ...config?.defaults,
  };
}

export async function getBusiness(businessId: string): Promise<Business> {
  const snap = await getDoc(doc(db(), 'businesses', businessId));
  if (!snap.exists()) return defaultBusiness(businessId);
  return { ...defaultBusiness(businessId), ...snap.data(), id: businessId };
}

export async function saveBusiness(business: Business): Promise<void> {
  const { id, ...data } = business;
  await setDoc(doc(db(), 'businesses', id), data, { merge: true });
}

// ---------- Saved item presets (stored on the business record) ----------

export async function getSavedItems(businessId: string): Promise<SavedItem[]> {
  const biz = await getBusiness(businessId);
  return biz.savedItems || [];
}

export async function saveSavedItems(businessId: string, items: SavedItem[]): Promise<void> {
  await setDoc(doc(db(), 'businesses', businessId), { savedItems: items }, { merge: true });
}

// ---------- Customers ----------

export async function getCustomers(businessId: string): Promise<Customer[]> {
  const q = query(collection(db(), 'customers'), where('businessId', '==', businessId));
  const snap = await getDocs(q);
  const customers = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Customer));
  return customers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCustomer(
  customer: Omit<Customer, 'id' | 'createdAt'> & { id?: string }
): Promise<string> {
  if (customer.id) {
    const { id, ...data } = customer;
    await updateDoc(doc(db(), 'customers', id), data);
    return id;
  }
  const ref = await addDoc(collection(db(), 'customers'), {
    ...customer,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'customers', id));
}

// ---------- Invoices ----------

export async function getInvoices(businessId: string): Promise<Invoice[]> {
  const q = query(collection(db(), 'invoices'), where('businessId', '==', businessId));
  const snap = await getDocs(q);
  const invoices = snap.docs.map((d) => {
    const inv = { ...d.data(), id: d.id } as Invoice;
    return { ...inv, status: normalizeStatus(inv.status) };
  });
  return invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db(), 'invoices', id));
  if (!snap.exists()) return null;
  const inv = { ...snap.data(), id: snap.id } as Invoice;
  return { ...inv, status: normalizeStatus(inv.status) };
}

export async function saveInvoice(
  invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const now = new Date().toISOString();
  // Strip `id` from the written data — for a new invoice it is undefined,
  // and Firestore rejects any field whose value is undefined.
  const { id, ...data } = invoice;
  if (id) {
    await updateDoc(doc(db(), 'invoices', id), { ...data, updatedAt: now });
    return id;
  }
  const ref = await addDoc(collection(db(), 'invoices'), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
  await updateDoc(doc(db(), 'invoices', id), { status, updatedAt: new Date().toISOString() });
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'invoices', id));
}

// Atomically claims the next invoice number for a business so two
// devices can never issue the same number.
export async function claimNextInvoiceNumber(businessId: string): Promise<string> {
  return runTransaction(db(), async (tx) => {
    const ref = doc(db(), 'businesses', businessId);
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : defaultBusiness(businessId);
    const prefix = data.invoicePrefix || getBusinessConfig(businessId)?.invoicePrefix || 'INV';
    const next = data.nextInvoiceNumber || 1001;
    tx.set(ref, { nextInvoiceNumber: next + 1 }, { merge: true });
    return `${prefix}-${String(next).padStart(4, '0')}`;
  });
}

// ---------- Totals ----------

export function calcTotals(lineItems: LineItem[], gstRegistered: boolean, gstInclusive = false) {
  const sum = lineItems.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);

  if (!gstRegistered) {
    return { subtotal: round2(sum), gstAmount: 0, total: round2(sum) };
  }
  if (gstInclusive) {
    // Listed prices already include GST: back it out of the total.
    const subtotal = sum / (1 + GST_RATE);
    return { subtotal: round2(subtotal), gstAmount: round2(sum - subtotal), total: round2(sum) };
  }
  // GST added on top of listed prices.
  const gstAmount = sum * GST_RATE;
  return { subtotal: round2(sum), gstAmount: round2(gstAmount), total: round2(sum + gstAmount) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

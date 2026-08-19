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
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Business, Customer, Invoice, Job, LineItem, normalizeStatus } from '@/types';
import { GST_RATE, getBusinessConfig } from './constants';

// Firestore writes only resolve once the server acknowledges them. On a flaky
// connection (or in the PWA offline) that promise can hang forever, which used
// to freeze the app on "Adding…" / "Working…" with no way out. The write itself
// is already durable in the local cache and syncs later, so after a short wait
// we carry on as if it succeeded — real errors raised inside the window (e.g.
// permission-denied) still surface.
const ACK_WAIT_MS = 6000;

function settled<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ACK_WAIT_MS)),
  ]);
}

// For reads/transactions, where carrying on isn't an option: fail loudly
// instead of spinning forever.
function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'unavailable' })), ms)
    ),
  ]);
}

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
    reviewUrl: '',
    ...config?.defaults,
  };
}

export async function getBusiness(businessId: string): Promise<Business> {
  const snap = await getDoc(doc(db(), 'businesses', businessId));
  if (!snap.exists()) return defaultBusiness(businessId);
  return { ...defaultBusiness(businessId), ...snap.data(), id: businessId };
}

// Live version: fires instantly from the local cache, then again with fresh
// server data — pages render immediately instead of waiting a network round-trip.
export function watchBusiness(businessId: string, cb: (b: Business) => void): Unsubscribe {
  return onSnapshot(doc(db(), 'businesses', businessId), (snap) => {
    if (!snap.exists()) cb(defaultBusiness(businessId));
    else cb({ ...defaultBusiness(businessId), ...snap.data(), id: businessId });
  });
}

export async function saveBusiness(business: Business): Promise<void> {
  const { id, ...data } = business;
  await setDoc(doc(db(), 'businesses', id), data, { merge: true });
}

// ---------- Customers ----------

// Two records are "the same person" if the trimmed name and phone digits match.
function customerKey(c: Pick<Customer, 'name' | 'phone'>): string {
  return `${c.name.trim().toLowerCase()}|${(c.phone || '').replace(/\D/g, '')}`;
}

// Collapses accidental double-entries (same name + phone) so each contact shows
// once. Keeps the oldest record and quietly deletes the newer exact copies.
function dedupeCustomers(customers: Customer[]): Customer[] {
  const byKey = new Map<string, Customer>();
  const extras: Customer[] = [];
  const sorted = [...customers].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  for (const c of sorted) {
    const key = customerKey(c);
    const kept = byKey.get(key);
    if (!kept) {
      byKey.set(key, c);
    } else if (
      c.email === kept.email &&
      c.address === kept.address
    ) {
      extras.push(c); // a perfect duplicate — safe to remove
    }
    // Same name+phone but different email/address: keep both visible so no data is lost.
  }
  // Fire-and-forget cleanup of perfect duplicates.
  extras.forEach((c) => deleteDoc(doc(db(), 'customers', c.id)).catch(() => {}));
  const extraIds = new Set(extras.map((c) => c.id));
  return customers
    .filter((c) => !extraIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCustomers(businessId: string): Promise<Customer[]> {
  const q = query(collection(db(), 'customers'), where('businessId', '==', businessId));
  const snap = await getDocs(q);
  const customers = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Customer));
  return dedupeCustomers(customers);
}

export function watchCustomers(businessId: string, cb: (c: Customer[]) => void): Unsubscribe {
  const q = query(collection(db(), 'customers'), where('businessId', '==', businessId));
  return onSnapshot(q, (snap) => {
    const customers = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Customer));
    cb(dedupeCustomers(customers));
  });
}

// Looks for an existing contact with the same name + phone. Returns null if the
// lookup can't complete — better to risk a duplicate (which dedupeCustomers
// tidies up) than to block the save.
async function findMatchingCustomer(
  businessId: string,
  customer: Pick<Customer, 'name' | 'phone'>
): Promise<Customer | null> {
  try {
    const q = query(collection(db(), 'customers'), where('businessId', '==', businessId));
    const snap = await withTimeout(getDocs(q));
    const key = customerKey(customer);
    const match = snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as Customer))
      .find((c) => customerKey(c) === key);
    return match || null;
  } catch {
    return null;
  }
}

export async function saveCustomer(
  customer: Omit<Customer, 'id' | 'createdAt'> & { id?: string }
): Promise<string> {
  if (customer.id) {
    const { id, ...data } = customer;
    await settled(updateDoc(doc(db(), 'customers', id), data), undefined);
    return id;
  }
  // If this person already exists (same name + phone), update them instead of
  // creating a second contact.
  const match = await findMatchingCustomer(customer.businessId, customer);
  if (match) {
    const { name, email, phone, address } = customer;
    await settled(updateDoc(doc(db(), 'customers', match.id), { name, email, phone, address }), undefined);
    return match.id;
  }
  // Client-generated id: we know the contact's id straight away, so the UI can
  // move on without waiting for the server round-trip.
  const ref = doc(collection(db(), 'customers'));
  await settled(setDoc(ref, { ...customer, createdAt: new Date().toISOString() }), undefined);
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

export function watchInvoices(businessId: string, cb: (i: Invoice[]) => void): Unsubscribe {
  const q = query(collection(db(), 'invoices'), where('businessId', '==', businessId));
  return onSnapshot(q, (snap) => {
    const invoices = snap.docs.map((d) => {
      const inv = { ...d.data(), id: d.id } as Invoice;
      return { ...inv, status: normalizeStatus(inv.status) };
    });
    cb(invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

export function watchInvoice(id: string, cb: (i: Invoice | null) => void): Unsubscribe {
  return onSnapshot(doc(db(), 'invoices', id), (snap) => {
    if (!snap.exists()) return cb(null);
    const inv = { ...snap.data(), id: snap.id } as Invoice;
    cb({ ...inv, status: normalizeStatus(inv.status) });
  });
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
  const { id, ...rest } = invoice;
  // Firestore rejects undefined values outright, so drop any optional field
  // that wasn't set (e.g. `mode` on older records).
  const data = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  if (id) {
    await settled(updateDoc(doc(db(), 'invoices', id), { ...data, updatedAt: now }), undefined);
    return id;
  }
  const ref = doc(collection(db(), 'invoices'));
  await settled(setDoc(ref, { ...data, createdAt: now, updatedAt: now }), undefined);
  return ref.id;
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
  await settled(
    updateDoc(doc(db(), 'invoices', id), { status, updatedAt: new Date().toISOString() }),
    undefined
  );
}

// Creates a new Pending invoice from a quote, keeping the quote intact, and
// records the link back on the quote so we can warn about re-converting.
export async function convertQuoteToInvoice(quote: Invoice): Promise<string> {
  const business = await getBusiness(quote.businessId);
  const invoiceNumber = await claimNextInvoiceNumber(quote.businessId);
  const now = new Date().toISOString();
  const issueDate = now.slice(0, 10);
  const due = new Date();
  due.setDate(due.getDate() + (business.paymentTermsDays || 14));
  const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

  const ref = await addDoc(collection(db(), 'invoices'), {
    invoiceNumber,
    businessId: quote.businessId,
    customerId: quote.customerId,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    customerAddress: quote.customerAddress,
    issueDate,
    dueDate,
    lineItems: quote.lineItems,
    gstRegistered: quote.gstRegistered,
    subtotal: quote.subtotal,
    gstAmount: quote.gstAmount,
    total: quote.total,
    status: 'Pending',
    notes: quote.notes,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(doc(db(), 'invoices', quote.id), { convertedInvoiceId: ref.id, updatedAt: now });
  return ref.id;
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'invoices', id));
}

// ---------- Job Log ----------

export async function getJobs(businessId: string): Promise<Job[]> {
  const q = query(collection(db(), 'jobs'), where('businessId', '==', businessId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id } as Job))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function watchJobs(businessId: string, cb: (j: Job[]) => void): Unsubscribe {
  const q = query(collection(db(), 'jobs'), where('businessId', '==', businessId));
  return onSnapshot(q, (snap) => {
    const jobs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Job));
    cb(jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

export async function saveJob(job: Omit<Job, 'id' | 'createdAt'> & { id?: string }): Promise<string> {
  const now = new Date().toISOString();
  const { id, ...data } = job;
  if (id) {
    await updateDoc(doc(db(), 'jobs', id), { ...data, updatedAt: now });
    return id;
  }
  const ref = await addDoc(collection(db(), 'jobs'), { ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function deleteJob(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'jobs', id));
}

// Creates an invoice from a logged job and links them. Paid jobs become Paid
// invoices; owing jobs become Pending with a due date.
export async function convertJobToInvoice(job: Job): Promise<string> {
  if (job.invoiceId) return job.invoiceId; // already invoiced — never duplicate
  const business = await getBusiness(job.businessId);
  const inclusive = getBusinessConfig(job.businessId)?.pdf.gstInclusive ?? false;
  const invoiceNumber = await claimNextInvoiceNumber(job.businessId);
  const now = new Date().toISOString();
  const issueDate = now.slice(0, 10);
  const items: LineItem[] = [
    { id: crypto.randomUUID(), description: job.description, quantity: 1, unitPrice: job.amount },
  ];
  const totals = calcTotals(items, business.gstRegistered, inclusive);
  const isPaid = job.paymentStatus === 'Paid';

  let dueDate = '';
  if (!isPaid) {
    if (job.dueDate) dueDate = job.dueDate;
    else {
      const d = new Date();
      d.setDate(d.getDate() + (business.paymentTermsDays || 14));
      dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  const notes = [job.notes, job.rego ? `Rego: ${job.rego}` : ''].filter(Boolean).join('\n');

  const ref = await addDoc(collection(db(), 'invoices'), {
    invoiceNumber,
    businessId: job.businessId,
    customerId: '',
    customerName: job.customerName,
    customerEmail: job.customerEmail || '',
    customerPhone: job.customerPhone,
    customerAddress: job.location || '',
    issueDate,
    dueDate,
    lineItems: items,
    gstRegistered: business.gstRegistered,
    ...totals,
    status: isPaid ? 'Paid' : 'Pending',
    notes,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(doc(db(), 'jobs', job.id), { invoiceId: ref.id, updatedAt: now });
  return ref.id;
}

// Atomically claims the next invoice number for a business so two
// devices can never issue the same number.
export async function claimNextInvoiceNumber(businessId: string): Promise<string> {
  // A transaction needs the network — time it out rather than hang the form.
  return withTimeout(
    runTransaction(db(), async (tx) => {
    const ref = doc(db(), 'businesses', businessId);
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : defaultBusiness(businessId);
    const prefix = data.invoicePrefix || getBusinessConfig(businessId)?.invoicePrefix || 'INV';
      const next = data.nextInvoiceNumber || 1001;
      tx.set(ref, { nextInvoiceNumber: next + 1 }, { merge: true });
      return `${prefix}-${String(next).padStart(4, '0')}`;
    })
  );
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

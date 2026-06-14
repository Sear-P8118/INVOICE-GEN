'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, UserPlus, Truck, Wrench, Share2, Save } from 'lucide-react';
import { Business, Customer, Invoice, InvoiceStatus, LineItem, daysOverdue } from '@/types';
import {
  calcTotals,
  claimNextInvoiceNumber,
  getBusiness,
  getCustomers,
  saveCustomer,
  saveInvoice,
} from '@/lib/firestore';
import { formatCurrency, getBusinessConfig } from '@/lib/constants';
import { shareInvoicePDF } from '@/lib/pdf';
import { Input, Textarea, Select, Label } from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { addDays, format } from 'date-fns';

interface Props {
  businessId: string;
  existing?: Invoice; // edit mode when set
  duplicateFrom?: Invoice; // prefill for duplicates
}

// The four document types you can create, with their button colours.
const TYPES: {
  value: InvoiceStatus;
  label: string;
  on: string; // selected
  off: string; // not selected
}[] = [
  { value: 'Paid', label: 'Paid', on: 'bg-emerald-600 text-white shadow-sm', off: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  { value: 'Overdue', label: 'Overdue', on: 'bg-red-600 text-white shadow-sm', off: 'bg-red-50 text-red-700 border border-red-200' },
  { value: 'Pending', label: 'Pending', on: 'bg-amber-500 text-white shadow-sm', off: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { value: 'Quote', label: 'Quote', on: 'bg-blue-600 text-white shadow-sm', off: 'bg-blue-50 text-blue-700 border border-blue-200' },
];

const TYPE_HINT: Record<string, string> = {
  Paid: 'Sale already paid — records the date paid.',
  Overdue: 'Unpaid past its due date — shows how many days overdue.',
  Pending: 'Awaiting payment — issued now, due later.',
  Quote: 'A priced offer. No payment owed, no due date.',
};

const today = () => format(new Date(), 'yyyy-MM-dd');

const emptyItem = (description = ''): LineItem => ({
  id: crypto.randomUUID(),
  description,
  quantity: 1,
  unitPrice: 0,
});

function initialType(source?: Invoice): InvoiceStatus {
  const s = source?.status;
  if (s === 'Paid' || s === 'Overdue' || s === 'Pending' || s === 'Quote') return s;
  return 'Pending'; // default for new + legacy drafts
}

export default function InvoiceForm({ businessId, existing, duplicateFrom }: Props) {
  const router = useRouter();
  const source = existing || duplicateFrom;
  const config = getBusinessConfig(businessId)!;

  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(source?.customerId || '');
  const [type, setType] = useState<InvoiceStatus>(initialType(source));
  const [issueDate, setIssueDate] = useState(existing?.issueDate || today());
  const [dueDate, setDueDate] = useState(existing?.dueDate || '');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    source ? source.lineItems.map((i) => ({ ...i, id: crypto.randomUUID() })) : [emptyItem()]
  );
  const [notes, setNotes] = useState(source?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New-customer sheet
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', address: '' });

  const needsDue = type === 'Pending' || type === 'Overdue';

  useEffect(() => {
    Promise.all([getBusiness(businessId), getCustomers(businessId)]).then(([biz, custs]) => {
      setBusiness(biz);
      setCustomers(custs);
      if (!existing) {
        setDueDate((d) => d || format(addDays(new Date(), biz.paymentTermsDays || 14), 'yyyy-MM-dd'));
      }
    });
  }, [businessId, existing]);

  // Switching to a type that needs a due date fills a sensible default.
  function chooseType(next: InvoiceStatus) {
    setType(next);
    if ((next === 'Pending' || next === 'Overdue') && !dueDate) {
      const terms = business?.paymentTermsDays ?? 14;
      setDueDate(format(addDays(new Date(), terms), 'yyyy-MM-dd'));
    }
  }

  const gstRegistered = existing ? existing.gstRegistered : business?.gstRegistered || false;
  const gstInclusive = config.pdf.gstInclusive;
  const totals = useMemo(
    () => calcTotals(lineItems, gstRegistered, gstInclusive),
    [lineItems, gstRegistered, gstInclusive]
  );
  const overdueDays = type === 'Overdue' ? daysOverdue(dueDate) : 0;

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setLineItems((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addItem = (description = '') => setLineItems((items) => [...items, emptyItem(description)]);

  async function handleAddCustomer() {
    if (!newCust.name.trim()) return;
    const id = await saveCustomer({ ...newCust, businessId });
    const created: Customer = { ...newCust, id, businessId, createdAt: new Date().toISOString() };
    setCustomers((c) => [...c, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCustomerId(id);
    setShowNewCustomer(false);
    setNewCust({ name: '', email: '', phone: '', address: '' });
  }

  // Persist the invoice; returns the saved record (with id) or null on failure.
  async function persist(): Promise<{ invoice: Invoice; business: Business } | null> {
    setError('');
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      setError('Please choose a customer.');
      return null;
    }
    const items = lineItems.filter((i) => i.description.trim());
    if (items.length === 0) {
      setError('Add at least one line item with a description.');
      return null;
    }
    if (!business) return null;

    // Quote = today's date, no due. Paid = the single date, no due.
    const finalIssue = type === 'Quote' ? today() : issueDate;
    const finalDue = needsDue ? dueDate : '';

    const invoiceNumber = existing
      ? existing.invoiceNumber
      : await claimNextInvoiceNumber(businessId);

    const totalsNow = calcTotals(items, gstRegistered, gstInclusive);
    const now = new Date().toISOString();

    const id = await saveInvoice({
      id: existing?.id,
      invoiceNumber,
      businessId,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      issueDate: finalIssue,
      dueDate: finalDue,
      lineItems: items,
      gstRegistered,
      ...totalsNow,
      status: type,
      notes,
    });

    const invoice: Invoice = {
      id,
      invoiceNumber,
      businessId,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      issueDate: finalIssue,
      dueDate: finalDue,
      lineItems: items,
      gstRegistered,
      ...totalsNow,
      status: type,
      notes,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    return { invoice, business };
  }

  function describeSaveError(e: unknown): string {
    const err = e as { code?: string; message?: string };
    switch (err?.code) {
      case 'permission-denied':
        return 'The database blocked this save. Your sign-in email needs adding to the Firestore security rules (Firebase console → Firestore → Rules), then re-publish.';
      case 'unavailable':
      case 'failed-precondition':
      case 'deadline-exceeded':
        return 'Can’t reach the database right now. Check your internet connection and try again.';
      default:
        return `Could not save: ${err?.code || err?.message || 'unknown error'}.`;
    }
  }

  async function handleSaveAndShare() {
    setSaving(true);
    let res: Awaited<ReturnType<typeof persist>>;
    try {
      res = await persist();
    } catch (e) {
      setError(describeSaveError(e));
      setSaving(false);
      return;
    }
    if (!res) {
      setSaving(false);
      return;
    }
    // The invoice is saved. Sharing is best-effort and must never report a save error.
    try {
      await shareInvoicePDF(res.invoice, res.business);
    } catch {
      /* user cancelled or the platform blocked sharing — the invoice is still saved */
    }
    router.replace(`/businesses/${businessId}/invoices/${res.invoice.id}`);
  }

  async function handleSaveOnly() {
    setSaving(true);
    try {
      const res = await persist();
      if (!res) {
        setSaving(false);
        return;
      }
      router.replace(`/businesses/${businessId}/invoices/${res.invoice.id}`);
    } catch (e) {
      setError(describeSaveError(e));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-4">
      {/* Document type */}
      <section>
        <Label>Type</Label>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => chooseType(t.value)}
              className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${
                type === t.value ? t.on : t.off
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{TYPE_HINT[type]}</p>
      </section>

      {/* Customer */}
      <section>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => setShowNewCustomer(true)}
            className={`flex h-[50px] w-[50px] items-center justify-center rounded-xl text-white ${config.ui.accent}`}
            aria-label="Add customer"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </section>

      {/* Dates — depend on the type */}
      <section>
        {type === 'Quote' && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Quote date</p>
            <p className="text-base font-semibold text-slate-900">{format(new Date(), 'd MMM yyyy')}</p>
          </div>
        )}

        {type === 'Paid' && (
          <Input
            label="Date paid"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        )}

        {needsDue && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Issue date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        )}

        {type === 'Overdue' && (
          <p className="mt-2 inline-flex rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
            {overdueDays > 0 ? `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue` : 'Not past due yet — set an earlier due date'}
          </p>
        )}
      </section>

      {/* Line items */}
      <section>
        <Label>Items</Label>
        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <textarea
                placeholder="Description (e.g. Century NS70 battery supplied & fitted)"
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-base placeholder-slate-400 focus:border-slate-500 focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <div className="w-20">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="Qty"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center text-base focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <span className="text-slate-400">×</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-base focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <span className="w-20 text-right text-sm font-semibold text-slate-700">
                  {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                </span>
                <button
                  type="button"
                  onClick={() => setLineItems((items) => items.filter((i) => i.id !== item.id))}
                  disabled={lineItems.length === 1}
                  className="rounded-lg p-2 text-slate-400 active:bg-red-50 active:text-red-500 disabled:opacity-30"
                  aria-label="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add item + quick adds (all coloured in the brand) */}
        <button
          type="button"
          onClick={() => addItem()}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-bold ${config.ui.accentText}`}
          style={{ borderColor: 'currentColor' }}
        >
          <Plus size={18} /> Add item
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addItem('Delivery')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white ${config.ui.accent}`}
          >
            <Truck size={18} /> Delivery
          </button>
          <button
            type="button"
            onClick={() => addItem('Installation')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white ${config.ui.accent}`}
          >
            <Wrench size={18} /> Installation
          </button>
        </div>
      </section>

      {/* Totals */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        {gstRegistered ? (
          <>
            <div className="flex justify-between py-1 text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-slate-600">
              <span>GST (10%)</span>
              <span>{formatCurrency(totals.gstAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-base font-bold text-slate-900">
            <span>Total (no GST)</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        )}
      </section>

      <Textarea
        label="Notes (shown on the document)"
        rows={2}
        placeholder="e.g. 12 month warranty on all batteries"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="space-y-2">
        <Button
          full
          disabled={saving || !business}
          onClick={handleSaveAndShare}
          className={`min-h-13 ${config.ui.accent} text-white`}
        >
          <Share2 size={18} /> {saving ? 'Working…' : 'Save & Share'}
        </Button>
        <button
          type="button"
          disabled={saving || !business}
          onClick={handleSaveOnly}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-500 disabled:opacity-40"
        >
          <Save size={16} /> Save without sharing
        </button>
      </div>

      {/* New customer sheet */}
      <Sheet open={showNewCustomer} onClose={() => setShowNewCustomer(false)} title="New Customer">
        <div className="space-y-4">
          <Input label="Name" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="Customer or company name" />
          <Input label="Phone" type="tel" inputMode="tel" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
          <Input label="Email" type="email" inputMode="email" value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })} />
          <Textarea label="Address" rows={2} value={newCust.address} onChange={(e) => setNewCust({ ...newCust, address: e.target.value })} />
          <Button full onClick={handleAddCustomer} disabled={!newCust.name.trim()} className={`${config.ui.accent} text-white`}>
            Add Customer
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

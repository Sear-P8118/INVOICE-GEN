'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { Business, Customer, Invoice, InvoiceStatus, LineItem } from '@/types';
import {
  calcTotals,
  claimNextInvoiceNumber,
  getBusiness,
  getCustomers,
  saveCustomer,
  saveInvoice,
} from '@/lib/firestore';
import { formatCurrency } from '@/lib/constants';
import { Input, Textarea, Select, Label } from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { addDays, format } from 'date-fns';

interface Props {
  businessId: string;
  existing?: Invoice; // edit mode when set
  duplicateFrom?: Invoice; // prefill for duplicates
}

const emptyItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unitPrice: 0,
});

export default function InvoiceForm({ businessId, existing, duplicateFrom }: Props) {
  const router = useRouter();
  const source = existing || duplicateFrom;

  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(source?.customerId || '');
  const [issueDate, setIssueDate] = useState(
    existing?.issueDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [dueDate, setDueDate] = useState(existing?.dueDate || '');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    source ? source.lineItems.map((i) => ({ ...i, id: crypto.randomUUID() })) : [emptyItem()]
  );
  const [notes, setNotes] = useState(source?.notes || '');
  const [status, setStatus] = useState<InvoiceStatus>(existing?.status || 'Draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New-customer sheet
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    Promise.all([getBusiness(businessId), getCustomers(businessId)]).then(([biz, custs]) => {
      setBusiness(biz);
      setCustomers(custs);
      if (!existing) {
        setDueDate((d) => d || format(addDays(new Date(), biz.paymentTermsDays || 14), 'yyyy-MM-dd'));
      }
    });
  }, [businessId, existing]);

  const gstRegistered = existing ? existing.gstRegistered : business?.gstRegistered || false;
  const totals = useMemo(() => calcTotals(lineItems, gstRegistered), [lineItems, gstRegistered]);

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setLineItems((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  async function handleAddCustomer() {
    if (!newCust.name.trim()) return;
    const id = await saveCustomer({ ...newCust, businessId });
    const created: Customer = { ...newCust, id, businessId, createdAt: new Date().toISOString() };
    setCustomers((c) => [...c, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCustomerId(id);
    setShowNewCustomer(false);
    setNewCust({ name: '', email: '', phone: '', address: '' });
  }

  async function handleSave() {
    setError('');
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      setError('Please choose a customer.');
      return;
    }
    const items = lineItems.filter((i) => i.description.trim());
    if (items.length === 0) {
      setError('Add at least one line item with a description.');
      return;
    }

    setSaving(true);
    try {
      const invoiceNumber = existing
        ? existing.invoiceNumber
        : await claimNextInvoiceNumber(businessId);

      const id = await saveInvoice({
        id: existing?.id,
        invoiceNumber,
        businessId,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        issueDate,
        dueDate,
        lineItems: items,
        gstRegistered,
        ...calcTotals(items, gstRegistered),
        status,
        notes,
      });
      router.replace(`/businesses/${businessId}/invoices/${id}`);
    } catch {
      setError('Could not save the invoice. Check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-4">
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
            onClick={() => setShowNewCustomer(true)}
            className="flex h-[50px] w-[50px] items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 active:bg-slate-100"
            aria-label="Add customer"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </section>

      {/* Dates */}
      <section className="grid grid-cols-2 gap-3">
        <Input label="Issue date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
        <button
          onClick={() => setLineItems((items) => [...items, emptyItem()])}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 active:bg-slate-100"
        >
          <Plus size={18} /> Add item
        </button>
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

      {/* Status + notes */}
      <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
        <option>Draft</option>
        <option>Pending</option>
        <option>Paid</option>
        <option>Overdue</option>
      </Select>

      <Textarea
        label="Notes (shown on the invoice)"
        rows={2}
        placeholder="e.g. 12 month warranty on all batteries"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Button full disabled={saving || !business} onClick={handleSave} className="min-h-13">
        {saving ? 'Saving…' : existing ? 'Save Changes' : 'Save Invoice'}
      </Button>

      {/* New customer sheet */}
      <Sheet open={showNewCustomer} onClose={() => setShowNewCustomer(false)} title="New Customer">
        <div className="space-y-4">
          <Input label="Name" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="Customer or company name" />
          <Input label="Phone" type="tel" inputMode="tel" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
          <Input label="Email" type="email" inputMode="email" value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })} />
          <Textarea label="Address" rows={2} value={newCust.address} onChange={(e) => setNewCust({ ...newCust, address: e.target.value })} />
          <Button full onClick={handleAddCustomer} disabled={!newCust.name.trim()}>
            Add Customer
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

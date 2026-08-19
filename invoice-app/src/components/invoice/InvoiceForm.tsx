'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Truck, Wrench, Share2, Clock, Check } from 'lucide-react';
import {
  Business,
  Customer,
  Invoice,
  InvoiceMode,
  InvoiceStatus,
  LineItem,
  daysOverdue,
} from '@/types';
import {
  calcTotals,
  claimNextInvoiceNumber,
  watchBusiness,
  watchCustomers,
  saveCustomer,
  saveInvoice,
} from '@/lib/firestore';
import { formatCurrency, getBusinessConfig } from '@/lib/constants';
import { describeSaveError } from '@/lib/errors';
import { Input, Textarea, FieldGroup } from '@/components/ui/Field';
import { statusColor } from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { addDays, format } from 'date-fns';

interface Props {
  businessId: string;
  mode?: InvoiceMode; // 'fast' (default) = don't save the customer; 'trade' = do
  existing?: Invoice; // edit mode when set
  duplicateFrom?: Invoice; // prefill for duplicates
}

// The four document types you can create.
const TYPES: { value: InvoiceStatus; label: string }[] = [
  { value: 'Paid', label: 'Paid' },
  { value: 'Pending', label: 'Unpaid' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Quote', label: 'Quote' },
];

const TYPE_HINT: Record<string, string> = {
  Paid: 'Already paid — records the date it was paid.',
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
  // Most jobs are paid on the spot, so that's what a new invoice starts as.
  return 'Paid';
}

export default function InvoiceForm({ businessId, mode: modeProp, existing, duplicateFrom }: Props) {
  const router = useRouter();
  const source = existing || duplicateFrom;
  const config = getBusinessConfig(businessId)!;
  // Resuming a saved-for-later invoice keeps the mode it was started in.
  const mode: InvoiceMode = modeProp ?? source?.mode ?? 'fast';
  const isTrade = mode === 'trade';

  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  // Customer details are typed straight onto the invoice. Only trade invoices
  // then get filed into the customer list.
  const [cust, setCust] = useState({
    name: source?.customerName || '',
    phone: source?.customerPhone || '',
    email: source?.customerEmail || '',
    address: source?.customerAddress || '',
  });
  const [type, setType] = useState<InvoiceStatus>(initialType(source));
  const [issueDate, setIssueDate] = useState(existing?.issueDate || today());
  const [dueDate, setDueDate] = useState(existing?.dueDate || '');
  const [lineItems, setLineItems] = useState<LineItem[]>(
    source ? source.lineItems.map((i) => ({ ...i, id: crypto.randomUUID() })) : [emptyItem()]
  );
  const [notes, setNotes] = useState(source?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const needsDue = type === 'Pending' || type === 'Overdue';

  // Live cache-first loads: the form is usable instantly instead of waiting
  // on two network round-trips.
  useEffect(
    () =>
      watchBusiness(businessId, (biz) => {
        setBusiness(biz);
        if (!existing) {
          setDueDate((d) => d || format(addDays(new Date(), biz.paymentTermsDays || 14), 'yyyy-MM-dd'));
        }
      }),
    [businessId, existing]
  );

  // Only trade invoices need the saved contacts (for the name suggestions).
  useEffect(() => {
    if (!isTrade) return;
    return watchCustomers(businessId, setCustomers);
  }, [businessId, isTrade]);

  // Typing a saved trade customer's name fills in the rest of their details.
  function chooseName(name: string) {
    setCust((c) => ({ ...c, name }));
    if (!isTrade) return;
    const match = customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (match) {
      setCust({
        name: match.name,
        phone: match.phone || '',
        email: match.email || '',
        address: match.address || '',
      });
    }
  }

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

  // Persist the invoice; returns the saved record (with id) or null on failure.
  async function persist(): Promise<{ invoice: Invoice; business: Business } | null> {
    setError('');
    const name = cust.name.trim();
    if (!name) {
      setError('Please enter a customer name.');
      return null;
    }
    const items = lineItems.filter((i) => i.description.trim());
    if (items.length === 0) {
      setError('Add at least one line item with a description.');
      return null;
    }
    if (!business) return null;

    // Trade invoices file the customer away for next time. Fast invoices never
    // touch the customer list.
    let customerId = existing?.customerId || '';
    if (isTrade) {
      try {
        customerId = await saveCustomer({
          id: customerId || undefined,
          businessId,
          name,
          phone: cust.phone.trim(),
          email: cust.email.trim(),
          address: cust.address.trim(),
        });
      } catch {
        // Filing the contact is a convenience — never block the invoice on it.
      }
    }

    // Quote = today's date, no due. Paid = the single date, no due.
    const finalIssue = type === 'Quote' ? today() : issueDate;
    const finalDue = needsDue ? dueDate : '';

    // Saved-for-later invoices hold no number until they're finished, so a
    // parked job never burns an invoice number.
    const invoiceNumber = existing?.invoiceNumber || (await claimNextInvoiceNumber(businessId));

    const totalsNow = calcTotals(items, gstRegistered, gstInclusive);
    const now = new Date().toISOString();

    const record = {
      invoiceNumber,
      businessId,
      customerId,
      customerName: name,
      customerEmail: cust.email.trim(),
      customerPhone: cust.phone.trim(),
      customerAddress: cust.address.trim(),
      issueDate: finalIssue,
      dueDate: finalDue,
      lineItems: items,
      gstRegistered,
      ...totalsNow,
      status: type,
      notes,
      mode,
    };

    const id = await saveInvoice({ id: existing?.id, ...record });

    const invoice: Invoice = {
      id,
      ...record,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    return { invoice, business };
  }

  // Parks an unfinished invoice as a Draft: no validation, no invoice number,
  // and it stays editable from the Invoices list.
  async function handleSaveForLater() {
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      const items = lineItems.filter((i) => i.description.trim());
      const totalsNow = calcTotals(items, gstRegistered, gstInclusive);
      await saveInvoice({
        id: existing?.id,
        invoiceNumber: existing?.invoiceNumber || '',
        businessId,
        customerId: existing?.customerId || '',
        customerName: cust.name.trim() || 'Unfinished invoice',
        customerEmail: cust.email.trim(),
        customerPhone: cust.phone.trim(),
        customerAddress: cust.address.trim(),
        issueDate,
        dueDate: needsDue ? dueDate : '',
        lineItems: items,
        gstRegistered,
        ...totalsNow,
        status: 'Draft',
        notes,
        mode,
      });
      router.replace(`/businesses/${businessId}/invoices?status=Draft`);
    } catch (e) {
      setError(describeSaveError(e));
      setSaving(false);
    }
  }

  // Always saves first; sharing is what happens after.
  async function handleSendAndSave() {
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
      // Loaded on demand so the heavy PDF machinery isn't in the page bundle.
      const { shareInvoicePDF } = await import('@/lib/pdf');
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
    <div className="space-y-6 px-4 py-4 lg:px-6">
      {/* Type — a plain choice list, one tap, no colour soup */}
      <FieldGroup header="Type" footer={TYPE_HINT[type]}>
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => chooseType(t.value)}
            className="pressable flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span
              className="h-[10px] w-[10px] shrink-0 rounded-full"
              style={{ backgroundColor: statusColor(t.value) }}
            />
            <span className="flex-1 text-[17px] text-label">{t.label}</span>
            {type === t.value && (
              <Check size={20} strokeWidth={2.6} style={{ color: 'var(--tint)' }} />
            )}
          </button>
        ))}
      </FieldGroup>

      {/* Customer — typed straight in, no contact to pick or create */}
      <FieldGroup
        header="Customer"
        footer={
          isTrade
            ? 'Saved to your customer list for next time.'
            : 'One-off job — these details stay on this invoice only.'
        }
      >
        <Input
          label="Name"
          value={cust.name}
          onChange={(e) => chooseName(e.target.value)}
          placeholder="Required"
          list={isTrade ? 'trade-customers' : undefined}
          autoComplete="off"
        />
        {isTrade && (
          <datalist id="trade-customers">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        )}
        <Input
          label="Phone"
          type="tel"
          inputMode="tel"
          value={cust.phone}
          onChange={(e) => setCust({ ...cust, phone: e.target.value })}
          placeholder="Optional"
        />
        <Input
          label="Email"
          type="email"
          inputMode="email"
          value={cust.email}
          onChange={(e) => setCust({ ...cust, email: e.target.value })}
          placeholder="Optional"
        />
        <Input
          label="Address"
          value={cust.address}
          onChange={(e) => setCust({ ...cust, address: e.target.value })}
          placeholder="Optional"
        />
      </FieldGroup>

      {/* Dates — only the ones this type actually needs */}
      {type !== 'Quote' && (
        <FieldGroup
          header="Dates"
          footer={
            type === 'Overdue'
              ? overdueDays > 0
                ? `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue.`
                : 'Not past due yet — set an earlier due date.'
              : undefined
          }
        >
          <Input
            label={type === 'Paid' ? 'Date paid' : 'Issued'}
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          {needsDue && (
            <Input
              label="Due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          )}
        </FieldGroup>
      )}

      {/* Line items */}
      <section>
        <h2 className="mb-2 px-4 text-[13px] uppercase tracking-[0.06em] text-label2">Items</h2>

        <div className="space-y-2.5">
          {lineItems.map((item, index) => (
            <div key={item.id} className="overflow-hidden rounded-[14px] bg-surface">
              <div className="flex items-center gap-2 border-b-[0.5px] border-hair px-4 py-2">
                <span className="text-[13px] text-label2">Item {index + 1}</span>
                <span className="numeric flex-1 text-right text-[15px] font-semibold text-label">
                  {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                </span>
                <button
                  type="button"
                  onClick={() => setLineItems((items) => items.filter((i) => i.id !== item.id))}
                  disabled={lineItems.length === 1}
                  className="-mr-1 rounded-lg p-1 text-label3 active:text-neg disabled:opacity-25"
                  aria-label="Remove item"
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <textarea
                placeholder="What was done? e.g. Century NS70 battery supplied & fitted"
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                rows={2}
                className="w-full resize-none border-b-[0.5px] border-hair bg-transparent px-4 py-3 text-[17px] text-label placeholder-label3 outline-none"
              />
              <div className="flex items-center">
                <label className="flex flex-1 items-center gap-2 border-r-[0.5px] border-hair px-4 py-2.5">
                  <span className="text-[15px] text-label2">Qty</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                    className="numeric w-full bg-transparent text-right text-[17px] outline-none"
                  />
                </label>
                <label className="flex flex-1 items-center gap-2 px-4 py-2.5">
                  <span className="text-[15px] text-label2">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                    className="numeric w-full bg-transparent text-right text-[17px] placeholder-label3 outline-none"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={() => addItem()}>
            <Plus size={17} /> Item
          </Button>
          <Button variant="secondary" onClick={() => addItem('Delivery')}>
            <Truck size={17} /> Delivery
          </Button>
          <Button variant="secondary" onClick={() => addItem('Installation')}>
            <Wrench size={17} /> Install
          </Button>
        </div>
      </section>

      {/* Totals */}
      <section className="hairline overflow-hidden rounded-[14px] bg-surface">
        {gstRegistered && (
          <>
            <div className="flex justify-between px-4 py-2.5 text-[15px] text-label2">
              <span>Subtotal</span>
              <span className="numeric">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-[15px] text-label2">
              <span>GST (10%)</span>
              <span className="numeric">{formatCurrency(totals.gstAmount)}</span>
            </div>
          </>
        )}
        <div className="flex items-baseline justify-between px-4 py-3">
          <span className="text-[17px] font-semibold text-label">
            Total{gstRegistered ? '' : ' (no GST)'}
          </span>
          <span className="numeric text-[22px] font-bold text-label">
            {formatCurrency(totals.total)}
          </span>
        </div>
      </section>

      <FieldGroup header="Notes" footer="Shown on the invoice.">
        <Textarea
          rows={2}
          placeholder="e.g. 12 month warranty on all batteries"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FieldGroup>

      {error && (
        <p className="rounded-[12px] bg-neg/10 px-4 py-3 text-[15px] text-neg">{error}</p>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <Button full large disabled={saving || !business} onClick={handleSendAndSave}>
          <Share2 size={18} /> {saving ? 'Working…' : 'Send & Save'}
        </Button>
        <Button full variant="secondary" disabled={saving || !business} onClick={handleSaveOnly}>
          Save without sending
        </Button>
        <Button full variant="plain" disabled={saving} onClick={handleSaveForLater}>
          <Clock size={17} /> Save for later
        </Button>
      </div>

      {/* The same action, always within reach down the side of a long form */}
      <button
        type="button"
        onClick={handleSaveForLater}
        disabled={saving}
        className="material fixed right-0 top-1/2 z-30 flex w-[52px] -translate-y-1/2 flex-col items-center gap-1 rounded-l-[12px] border-[0.5px] border-r-0 border-hair py-3 text-[10px] font-semibold leading-tight text-[var(--tint)] shadow-lg active:opacity-60 disabled:opacity-40 lg:hidden"
      >
        <Clock size={17} />
        Save
        <br />
        for later
      </button>
    </div>
  );
}

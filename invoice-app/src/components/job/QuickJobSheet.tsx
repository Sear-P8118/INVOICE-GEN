'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { saveJob } from '@/lib/firestore';
import { getBusinessConfig } from '@/lib/constants';
import { Job } from '@/types';

interface Props {
  businessId: string;
  existing?: Job; // edit mode
  onClose: () => void;
  onSaved: () => void;
}

// Mount this only while open (e.g. {open && <QuickJobSheet .../>}); it initialises
// its fields from `existing` on mount, so a fresh open always starts clean.
export default function QuickJobSheet({ businessId, existing, onClose, onSaved }: Props) {
  const config = getBusinessConfig(businessId)!;
  const [form, setForm] = useState(() => ({
    customerName: existing?.customerName ?? '',
    customerPhone: existing?.customerPhone ?? '',
    description: existing?.description ?? '',
    amount: existing ? String(existing.amount) : '',
    customerEmail: existing?.customerEmail ?? '',
    rego: existing?.rego ?? '',
    location: existing?.location ?? '',
    dueDate: existing?.dueDate ?? '',
    notes: existing?.notes ?? '',
  }));
  const [paid, setPaid] = useState(existing ? existing.paymentStatus === 'Paid' : true);
  const [showMore, setShowMore] = useState(
    Boolean(existing && (existing.customerEmail || existing.rego || existing.location || existing.dueDate || existing.notes))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function handleSave() {
    if (busy) return; // double-tap guard
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.description.trim()) {
      setError('Please add a name, phone and what was done.');
      return;
    }
    setBusy(true);
    try {
      await saveJob({
        id: existing?.id,
        businessId,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
        paymentStatus: paid ? 'Paid' : 'Owing',
        customerEmail: form.customerEmail.trim(),
        rego: form.rego.trim(),
        location: form.location.trim(),
        dueDate: form.dueDate,
        notes: form.notes.trim(),
        invoiceId: existing?.invoiceId,
      });
      onSaved();
      onClose();
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={existing ? 'Edit job' : 'Quick job'}>
      <div className="space-y-3.5">
        <Input label="Customer name" value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} placeholder="Who was it for?" />
        <Input label="Phone" type="tel" inputMode="tel" value={form.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} />
        <Textarea label="What was sold / done" rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="e.g. Supplied & fitted Century NS70 battery" />
        <Input label="Total amount ($)" type="number" inputMode="decimal" min={0} step="0.01" value={form.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="0.00" />

        <div>
          <p className="mb-1.5 block text-sm font-medium text-slate-700">Payment</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaid(true)}
              className={`rounded-xl py-3 text-sm font-bold ${paid ? 'bg-emerald-600 text-white' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setPaid(false)}
              className={`rounded-xl py-3 text-sm font-bold ${!paid ? 'bg-amber-500 text-white' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}
            >
              Owing
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className={`flex items-center gap-1 text-sm font-semibold ${config.ui.accentText}`}
        >
          <ChevronDown size={16} className={showMore ? 'rotate-180 transition' : 'transition'} /> More details (optional)
        </button>

        {showMore && (
          <div className="space-y-3.5 border-l-2 border-slate-100 pl-3">
            <Input label="Email" type="email" inputMode="email" value={form.customerEmail} onChange={(e) => set({ customerEmail: e.target.value })} />
            <Input label="Vehicle rego" value={form.rego} onChange={(e) => set({ rego: e.target.value.toUpperCase() })} />
            <Input label="Location" value={form.location} onChange={(e) => set({ location: e.target.value })} />
            {!paid && <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />}
            <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <Button full onClick={handleSave} disabled={busy} className={`min-h-12 ${config.ui.accent} text-white`}>
          {busy ? 'Saving…' : existing ? 'Save job' : 'Log job'}
        </Button>
      </div>
    </Sheet>
  );
}

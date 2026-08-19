'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import Segmented from '@/components/ui/Segmented';
import { Input, Textarea, FieldGroup } from '@/components/ui/Field';
import { saveJob } from '@/lib/firestore';
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
  const [paid, setPaid] = useState<'Paid' | 'Owing'>(
    existing ? existing.paymentStatus : 'Paid'
  );
  const [showMore, setShowMore] = useState(
    Boolean(
      existing &&
        (existing.customerEmail ||
          existing.rego ||
          existing.location ||
          existing.dueDate ||
          existing.notes)
    )
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
        paymentStatus: paid,
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
    <Sheet
      open
      onClose={onClose}
      title={existing ? 'Edit job' : 'Log a job'}
      action={
        <button
          onClick={handleSave}
          disabled={busy}
          className="text-[17px] font-semibold text-[var(--tint)] disabled:opacity-35"
        >
          {busy ? 'Saving…' : 'Done'}
        </button>
      }
    >
      <div className="space-y-5 pt-1">
        <FieldGroup>
          <Input
            label="Customer"
            value={form.customerName}
            onChange={(e) => set({ customerName: e.target.value })}
            placeholder="Who was it for?"
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            value={form.customerPhone}
            onChange={(e) => set({ customerPhone: e.target.value })}
          />
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            placeholder="0.00"
          />
          <Textarea
            label="What was sold / done"
            rows={2}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="e.g. Supplied & fitted Century NS70 battery"
          />
        </FieldGroup>

        <Segmented
          options={[
            { value: 'Paid', label: 'Paid' },
            { value: 'Owing', label: 'Owing' },
          ]}
          value={paid}
          onChange={setPaid}
        />

        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="flex items-center gap-1 px-1 text-[15px] font-medium text-[var(--tint)]"
        >
          <ChevronDown size={16} className={showMore ? 'rotate-180 transition' : 'transition'} />
          More details
        </button>

        {showMore && (
          <FieldGroup>
            <Input
              label="Email"
              type="email"
              inputMode="email"
              value={form.customerEmail}
              onChange={(e) => set({ customerEmail: e.target.value })}
            />
            <Input
              label="Rego"
              value={form.rego}
              onChange={(e) => set({ rego: e.target.value.toUpperCase() })}
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => set({ location: e.target.value })}
            />
            {paid === 'Owing' && (
              <Input
                label="Due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set({ dueDate: e.target.value })}
              />
            )}
            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </FieldGroup>
        )}

        {error && (
          <p className="rounded-[12px] bg-neg/10 px-4 py-3 text-[15px] text-neg">{error}</p>
        )}

        <Button full large onClick={handleSave} disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save job' : 'Log job'}
        </Button>
      </div>
    </Sheet>
  );
}

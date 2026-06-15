'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, Pencil, Package } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { getSavedItems, saveSavedItems } from '@/lib/firestore';
import { formatCurrency, getBusinessConfig } from '@/lib/constants';
import { SavedItem } from '@/types';

const blank = { name: '', description: '', unitPrice: '' };

export default function ItemsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const config = getBusinessConfig(businessId)!;
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [editing, setEditing] = useState<SavedItem | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [deleting, setDeleting] = useState<SavedItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSavedItems(businessId).then(setItems).catch(() => setItems([]));
  }, [businessId]);

  function openEditor(target: SavedItem | 'new') {
    setEditing(target);
    setForm(
      target === 'new'
        ? blank
        : { name: target.name, description: target.description, unitPrice: String(target.unitPrice) }
    );
  }

  async function persist(next: SavedItem[]) {
    setItems(next);
    await saveSavedItems(businessId, next);
  }

  async function handleSave() {
    if (!form.name.trim() || items === null) return;
    setBusy(true);
    const item: SavedItem = {
      id: editing !== 'new' && editing ? editing.id : crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      unitPrice: Number(form.unitPrice) || 0,
    };
    const next =
      editing !== 'new' && editing
        ? items.map((i) => (i.id === item.id ? item : i))
        : [...items, item];
    next.sort((a, b) => a.name.localeCompare(b.name));
    await persist(next);
    setBusy(false);
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleting || items === null) return;
    setBusy(true);
    await persist(items.filter((i) => i.id !== deleting.id));
    setBusy(false);
    setDeleting(null);
  }

  return (
    <div>
      <TopBar
        title="Saved Items"
        right={
          <button
            onClick={() => openEditor('new')}
            className={`rounded-xl p-2 text-white ${config.ui.accent}`}
            aria-label="Add item"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="px-4 py-3">
        <p className="mb-3 text-sm text-slate-500">
          Save the batteries and services you sell often. They become one-tap buttons when you make an invoice or quote.
        </p>

        <div className="space-y-2.5">
          {!items && <p className="py-10 text-center text-sm text-slate-400">Loading…</p>}
          {items && items.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white/70 py-12 text-center shadow-sm ring-1 ring-slate-100">
              <Package className="mx-auto mb-2 text-slate-300" size={34} strokeWidth={1.6} />
              <p className="text-sm font-semibold text-slate-600">No saved items yet</p>
              <p className="mt-0.5 text-xs text-slate-400">Tap + to add a battery or service you sell often.</p>
            </div>
          )}
          {items?.map((it) => (
            <div key={it.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/70">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{it.name}</p>
                  <p className="shrink-0 font-bold text-slate-900">{formatCurrency(it.unitPrice)}</p>
                </div>
                {it.description && <p className="mt-0.5 text-sm text-slate-500">{it.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditor(it)} className="rounded-lg p-1.5 text-slate-400 active:bg-slate-100" aria-label="Edit">
                  <Pencil size={16} />
                </button>
                <button onClick={() => setDeleting(it)} className="rounded-lg p-1.5 text-slate-400 active:bg-red-50 active:text-red-500" aria-label="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Saved Item' : 'Edit Saved Item'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Century NS70 Battery" />
          <Textarea label="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Supplied & fitted · 2-year warranty" />
          <Input
            label="Price (inc. GST)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            placeholder="0.00"
          />
          <Button full onClick={handleSave} disabled={busy || !form.name.trim()} className={`${config.ui.accent} text-white`}>
            {busy ? 'Saving…' : 'Save Item'}
          </Button>
        </div>
      </Sheet>

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete item?">
        <p className="text-sm text-slate-600">{deleting?.name} will be removed from your saved items. Existing invoices are unaffected.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Search, Phone, Mail, Trash2, Pencil } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { getCustomers, saveCustomer, deleteCustomer } from '@/lib/firestore';
import { Customer } from '@/types';

const blank = { name: '', email: '', phone: '', address: '' };

export default function CustomersPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCustomers(businessId).then(setCustomers).catch(() => setCustomers([]));
  }, [businessId]);

  const filtered = useMemo(() => {
    if (!customers) return null;
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [customers, search]);

  function openEditor(target: Customer | 'new') {
    setEditing(target);
    setForm(target === 'new' ? blank : { name: target.name, email: target.email, phone: target.phone, address: target.address });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setBusy(true);
    const id = await saveCustomer({
      ...form,
      businessId,
      id: editing !== 'new' && editing ? editing.id : undefined,
    });
    setCustomers(await getCustomers(businessId));
    setBusy(false);
    setEditing(null);
    void id;
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    await deleteCustomer(deleting.id);
    setCustomers((c) => c?.filter((x) => x.id !== deleting.id) || null);
    setBusy(false);
    setDeleting(null);
  }

  return (
    <div>
      <TopBar
        title="Customers"
        right={
          <button
            onClick={() => openEditor('new')}
            className="rounded-xl bg-slate-900 p-2 text-white active:bg-slate-700"
            aria-label="Add customer"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="px-4 py-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-base placeholder-slate-400 focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="mt-4 space-y-2.5">
          {!filtered && <p className="py-10 text-center text-sm text-slate-400">Loading…</p>}
          {filtered && filtered.length === 0 && (
            <p className="rounded-xl bg-white py-10 text-center text-sm text-slate-400">
              {customers?.length === 0 ? 'No customers yet. Tap + to add one.' : 'No matches.'}
            </p>
          )}
          {filtered?.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{c.name}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditor(c)}
                    className="rounded-lg p-1.5 text-slate-400 active:bg-slate-100"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleting(c)}
                    className="rounded-lg p-1.5 text-slate-400 active:bg-red-50 active:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-1.5 space-y-1 text-sm text-slate-500">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2">
                    <Phone size={14} /> {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2">
                    <Mail size={14} /> {c.email}
                  </a>
                )}
                {c.address && <p className="text-xs text-slate-400">{c.address}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New Customer' : 'Edit Customer'}
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer or company name" />
          <Input label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Textarea label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Button full onClick={handleSave} disabled={busy || !form.name.trim()}>
            {busy ? 'Saving…' : 'Save Customer'}
          </Button>
        </div>
      </Sheet>

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete customer?">
        <p className="text-sm text-slate-600">
          {deleting?.name} will be removed. Existing invoices keep their customer details.
        </p>
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

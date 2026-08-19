'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Search, Users, Trash2 } from 'lucide-react';
import TopBar, { NavButton } from '@/components/ui/TopBar';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import { Input, Textarea, FieldGroup } from '@/components/ui/Field';
import { List, Row, Empty } from '@/components/ui/List';
import { watchCustomers, saveCustomer, deleteCustomer } from '@/lib/firestore';
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

  useEffect(() => watchCustomers(businessId, setCustomers), [businessId]);

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
    setForm(
      target === 'new'
        ? blank
        : { name: target.name, email: target.email, phone: target.phone, address: target.address }
    );
  }

  async function handleSave() {
    if (!form.name.trim() || busy) return;
    setBusy(true);
    try {
      // The live watcher updates the list automatically after the save.
      await saveCustomer({
        ...form,
        businessId,
        id: editing !== 'new' && editing ? editing.id : undefined,
      });
      setEditing(null);
    } finally {
      setBusy(false);
    }
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
    <div className="pb-8">
      <TopBar
        title="Customers"
        large
        subtitle="Trade businesses and repeat customers"
        right={
          <NavButton onClick={() => openEditor('new')} label="Add customer">
            <Plus size={19} strokeWidth={2.4} />
          </NavButton>
        }
      />

      <div className="space-y-4 px-4 pt-3 lg:px-6">
        <div className="relative">
          <Search size={17} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-label3" />
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] bg-fill py-2 pl-8 pr-3 text-[17px] text-label placeholder-label3 outline-none"
          />
        </div>

        <List>
          {!filtered && <p className="px-4 py-10 text-center text-[15px] text-label3">Loading…</p>}
          {filtered && filtered.length === 0 && (
            <Empty
              icon={<Users size={38} strokeWidth={1.5} />}
              title={customers?.length === 0 ? 'No customers yet' : 'No matches'}
              hint={
                customers?.length === 0
                  ? 'Trade customers are added automatically when you use Invoice Plus Trade Business.'
                  : 'Try a different search.'
              }
            />
          )}
          {filtered?.map((c) => (
            <Row
              key={c.id}
              onClick={() => openEditor(c)}
              title={c.name}
              subtitle={[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}
            />
          ))}
        </List>
      </div>

      {/* Editor */}
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New Customer' : 'Edit Customer'}
        action={
          <button
            onClick={handleSave}
            disabled={busy || !form.name.trim()}
            className="text-[17px] font-semibold text-[var(--tint)] disabled:opacity-35"
          >
            {busy ? 'Saving…' : 'Done'}
          </button>
        }
      >
        <div className="space-y-5 pt-1">
          <FieldGroup>
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Required"
            />
            <Input
              label="Phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Textarea
              label="Address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </FieldGroup>

          {editing !== 'new' && editing && (
            <List>
              <Row
                onClick={() => {
                  const target = editing;
                  setEditing(null);
                  setDeleting(target);
                }}
                icon={<Trash2 size={17} />}
                iconColor="var(--color-neg)"
                title="Delete customer"
                destructive
                chevron={false}
              />
            </List>
          )}
        </div>
      </Sheet>

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete customer?">
        <p className="px-1 text-[15px] leading-snug text-label2">
          {deleting?.name} will be removed. Existing invoices keep their customer details.
        </p>
        <div className="mt-5 space-y-2">
          <Button full large variant="danger" onClick={handleDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete customer'}
          </Button>
          <Button full variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

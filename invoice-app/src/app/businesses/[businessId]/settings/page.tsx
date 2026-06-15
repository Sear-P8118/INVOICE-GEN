'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Package, ChevronRight } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Button from '@/components/ui/Button';
import { Input, Textarea, Toggle, Label } from '@/components/ui/Field';
import { getBusiness, saveBusiness } from '@/lib/firestore';
import { Business } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { signOut, user } = useAuth();
  const [biz, setBiz] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getBusiness(businessId).then(setBiz);
  }, [businessId]);

  async function handleSave() {
    if (!biz) return;
    setSaving(true);
    await saveBusiness(biz);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!biz) {
    return (
      <div>
        <TopBar title="Settings" />
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  const set = (patch: Partial<Business>) => setBiz({ ...biz, ...patch });

  return (
    <div>
      <TopBar title="Business Settings" />

      <div className="space-y-6 px-4 py-4">
        <Link
          href={`/businesses/${businessId}/items`}
          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/70 active:bg-slate-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Package size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Saved items</span>
            <span className="block text-xs text-slate-500">Products & prices you add with one tap</span>
          </span>
          <ChevronRight size={20} className="text-slate-400" />
        </Link>

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Business details</h2>
          <Input label="Business name" value={biz.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label="ABN" inputMode="numeric" placeholder="11 222 333 444" value={biz.abn} onChange={(e) => set({ abn: e.target.value })} />
          <Input label="Phone" type="tel" inputMode="tel" value={biz.phone} onChange={(e) => set({ phone: e.target.value })} />
          <Input label="Email" type="email" inputMode="email" value={biz.email} onChange={(e) => set({ email: e.target.value })} />
          <Textarea label="Address" rows={2} value={biz.address} onChange={(e) => set({ address: e.target.value })} />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">GST</h2>
          <Toggle
            label="GST registered"
            description={
              biz.gstRegistered
                ? 'Invoices add 10% GST and are labelled "Tax Invoice".'
                : 'Invoices are labelled "Invoice" with no GST line.'
            }
            checked={biz.gstRegistered}
            onChange={(v) => set({ gstRegistered: v })}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Bank details (shown on invoices)</h2>
          <Input label="Account name" value={biz.accountName} onChange={(e) => set({ accountName: e.target.value })} />
          <Input label="Bank" value={biz.bankName} onChange={(e) => set({ bankName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="BSB" inputMode="numeric" placeholder="000-000" value={biz.bsb} onChange={(e) => set({ bsb: e.target.value })} />
            <Input label="Account number" inputMode="numeric" value={biz.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Invoice numbering</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prefix" value={biz.invoicePrefix} onChange={(e) => set({ invoicePrefix: e.target.value.toUpperCase() })} />
            <Input
              label="Next number"
              type="number"
              inputMode="numeric"
              value={biz.nextInvoiceNumber}
              onChange={(e) => set({ nextInvoiceNumber: Number(e.target.value) || 1 })}
            />
          </div>
          <div>
            <Label>Default payment terms (days)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={biz.paymentTermsDays}
              onChange={(e) => set({ paymentTermsDays: Number(e.target.value) || 0 })}
            />
          </div>
        </section>

        <Button full onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
        </Button>

        <div className="border-t border-slate-200 pt-5">
          <p className="mb-3 text-center text-xs text-slate-400">Signed in as {user?.email}</p>
          <Button variant="ghost" full onClick={signOut}>
            <LogOut size={18} /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

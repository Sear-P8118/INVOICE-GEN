'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  LogOut,
  ClipboardList,
  BarChart3,
  ArrowLeftRight,
} from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Button from '@/components/ui/Button';
import { Input, Textarea, Toggle, FieldGroup } from '@/components/ui/Field';
import { List, Row } from '@/components/ui/List';
import { defaultBusiness, getBusiness, saveBusiness } from '@/lib/firestore';
import { Business } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { signOut, user } = useAuth();
  const [biz, setBiz] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Falling back to the defaults keeps the screen usable if the read fails
    // (offline, or a session without database access) instead of loading forever.
    getBusiness(businessId)
      .then(setBiz)
      .catch(() => setBiz(defaultBusiness(businessId)));
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
        <TopBar title="Settings" large />
        <p className="py-10 text-center text-[15px] text-label3">Loading…</p>
      </div>
    );
  }

  const set = (patch: Partial<Business>) => setBiz({ ...biz, ...patch });
  const base = `/businesses/${businessId}`;

  return (
    <div className="pb-8">
      <TopBar title="Settings" large />

      <div className="space-y-6 px-4 pt-3 lg:px-6">
        {/* Other screens live here rather than crowding the tab bar */}
        <List>
          <Row
            href={`${base}/jobs`}
            icon={<ClipboardList size={17} />}
            iconColor="var(--color-warn)"
            title="Job log"
            subtitle="Jobs logged now, invoiced later"
          />
          <Row
            href={`${base}/reports`}
            icon={<BarChart3 size={17} />}
            iconColor="var(--color-pos)"
            title="Reports"
            subtitle="Sales totals and CSV export"
          />
        </List>

        {/* The review link that powers the pre-written review messages */}
        <FieldGroup
          header="Reviews"
          footer={
            biz.reviewUrl?.trim()
              ? 'Used by the review request on every invoice.'
              : 'Paste your Google review link here. Until you do, the review requests stay switched off.'
          }
        >
          <Textarea
            label="Review link"
            rows={2}
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://g.page/r/…"
            value={biz.reviewUrl || ''}
            onChange={(e) => set({ reviewUrl: e.target.value.trim() })}
          />
        </FieldGroup>

        <FieldGroup header="Business details">
          <Input label="Name" value={biz.name} onChange={(e) => set({ name: e.target.value })} />
          <Input
            label="ABN"
            inputMode="numeric"
            placeholder="11 222 333 444"
            value={biz.abn}
            onChange={(e) => set({ abn: e.target.value })}
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            value={biz.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            inputMode="email"
            value={biz.email}
            onChange={(e) => set({ email: e.target.value })}
          />
          <Textarea
            label="Address"
            rows={2}
            value={biz.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </FieldGroup>

        <FieldGroup header="GST">
          <Toggle
            label="GST registered"
            description={
              biz.gstRegistered
                ? 'Invoices are labelled "Tax Invoice" and show a GST line.'
                : 'Invoices are labelled "Invoice" with no GST line.'
            }
            checked={biz.gstRegistered}
            onChange={(v) => set({ gstRegistered: v })}
          />
        </FieldGroup>

        <FieldGroup header="Bank details" footer="Shown on every invoice for direct deposit.">
          <Input
            label="Account"
            value={biz.accountName}
            onChange={(e) => set({ accountName: e.target.value })}
          />
          <Input label="Bank" value={biz.bankName} onChange={(e) => set({ bankName: e.target.value })} />
          <Input
            label="BSB"
            inputMode="numeric"
            placeholder="000-000"
            value={biz.bsb}
            onChange={(e) => set({ bsb: e.target.value })}
          />
          <Input
            label="Number"
            inputMode="numeric"
            value={biz.accountNumber}
            onChange={(e) => set({ accountNumber: e.target.value })}
          />
        </FieldGroup>

        <FieldGroup header="Invoice numbering">
          <Input
            label="Prefix"
            value={biz.invoicePrefix}
            onChange={(e) => set({ invoicePrefix: e.target.value.toUpperCase() })}
          />
          <Input
            label="Next number"
            type="number"
            inputMode="numeric"
            value={biz.nextInvoiceNumber}
            onChange={(e) => set({ nextInvoiceNumber: Number(e.target.value) || 1 })}
          />
          <Input
            label="Terms (days)"
            type="number"
            inputMode="numeric"
            value={biz.paymentTermsDays}
            onChange={(e) => set({ paymentTermsDays: Number(e.target.value) || 0 })}
          />
        </FieldGroup>

        <Button full large onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
        </Button>

        <List footer={`Signed in as ${user?.email || 'this device'}`}>
          <Row
            href="/home"
            icon={<ArrowLeftRight size={17} />}
            iconColor="var(--color-mute)"
            title="Switch business"
          />
          <Row
            onClick={signOut}
            icon={<LogOut size={17} />}
            iconColor="var(--color-neg)"
            title="Sign out"
            destructive
            chevron={false}
          />
        </List>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, FileText } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { watchInvoices } from '@/lib/firestore';
import { formatCurrency } from '@/lib/constants';
import { Invoice, InvoiceStatus, INVOICE_STATUSES, effectiveStatus } from '@/types';

export default function InvoicesPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');

  useEffect(() => watchInvoices(businessId, setInvoices), [businessId]);

  const filtered = useMemo(() => {
    if (!invoices) return null;
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'All' && effectiveStatus(inv) !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.customerName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.issueDate.includes(q) ||
        inv.dueDate.includes(q)
      );
    });
  }, [invoices, search, statusFilter]);

  return (
    <div>
      <TopBar
        title="Invoices"
        right={
          <Link
            href={`/businesses/${businessId}/invoices/new`}
            className="rounded-xl bg-slate-900 p-2 text-white active:bg-slate-700"
            aria-label="New invoice"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-4 py-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search customer, invoice # or date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-base placeholder-slate-400 focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {(['All', ...INVOICE_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2.5">
          {!filtered && <p className="py-10 text-center text-sm text-slate-400">Loading…</p>}
          {filtered && filtered.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white/70 py-12 text-center shadow-sm ring-1 ring-slate-100">
              <FileText className="mx-auto mb-2 text-slate-300" size={34} strokeWidth={1.6} />
              <p className="text-sm font-semibold text-slate-600">
                {invoices?.length === 0 ? 'No invoices yet' : 'No matches'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {invoices?.length === 0 ? 'Tap + to create your first one.' : 'Try a different search.'}
              </p>
            </div>
          )}
          {filtered?.map((inv) => (
            <Link
              key={inv.id}
              href={`/businesses/${businessId}/invoices/${inv.id}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/70 transition active:scale-[0.99] active:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{inv.customerName}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {inv.invoiceNumber} · {inv.issueDate}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(inv.total)}</p>
              <StatusBadge status={effectiveStatus(inv)} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

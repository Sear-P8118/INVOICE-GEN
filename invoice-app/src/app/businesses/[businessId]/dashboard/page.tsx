'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeftRight, FileWarning } from 'lucide-react';
import { getInvoices } from '@/lib/firestore';
import { getBusinessConfig, formatCurrency } from '@/lib/constants';
import { Invoice } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { isBefore, parseISO, startOfMonth, startOfDay } from 'date-fns';

export default function DashboardPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const config = getBusinessConfig(businessId)!;
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    getInvoices(businessId).then(setInvoices).catch(() => setInvoices([]));
  }, [businessId]);

  const stats = useMemo(() => {
    if (!invoices) return null;
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const unpaid = invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue');
    const overdue = unpaid.filter(
      (i) => i.status === 'Overdue' || isBefore(parseISO(i.dueDate), today)
    );
    const paidThisMonth = invoices
      .filter((i) => i.status === 'Paid' && parseISO(i.updatedAt) >= monthStart)
      .reduce((sum, i) => sum + i.total, 0);
    const unpaidTotal = unpaid.reduce((sum, i) => sum + i.total, 0);

    return { unpaid, overdue, paidThisMonth, unpaidTotal };
  }, [invoices]);

  return (
    <div>
      <header className={`bg-gradient-to-br ${config.gradient} px-5 pb-6 pt-12 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{config.name}</h1>
            <p className="mt-0.5 text-sm text-white/70">{config.tagline}</p>
          </div>
          <Link
            href="/home"
            className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold active:bg-white/25"
          >
            <ArrowLeftRight size={14} />
            Switch
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p className="text-xs font-medium text-white/70">Unpaid</p>
            <p className="mt-1 text-xl font-bold">
              {stats ? formatCurrency(stats.unpaidTotal) : '—'}
            </p>
            <p className="mt-0.5 text-xs text-white/60">
              {stats ? `${stats.unpaid.length} invoice${stats.unpaid.length === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p className="text-xs font-medium text-white/70">Paid this month</p>
            <p className="mt-1 text-xl font-bold">
              {stats ? formatCurrency(stats.paidThisMonth) : '—'}
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 py-5">
        <button
          onClick={() => router.push(`/businesses/${businessId}/invoices/new`)}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl ${config.accent} py-4 text-base font-bold text-white shadow-md transition-transform active:scale-[0.98]`}
        >
          <Plus size={20} strokeWidth={2.5} />
          New Invoice
        </button>

        {stats && stats.overdue.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <FileWarning size={18} />
            {stats.overdue.length} invoice{stats.overdue.length === 1 ? ' is' : 's are'} overdue
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Unpaid invoices</h2>
          <Link
            href={`/businesses/${businessId}/invoices`}
            className="text-sm font-semibold text-slate-500"
          >
            View all
          </Link>
        </div>

        <div className="mt-3 space-y-2.5">
          {!stats && <p className="py-8 text-center text-sm text-slate-400">Loading…</p>}
          {stats && stats.unpaid.length === 0 && (
            <p className="rounded-xl bg-white py-8 text-center text-sm text-slate-400">
              Nothing outstanding — nice work 🎉
            </p>
          )}
          {stats?.unpaid.slice(0, 8).map((inv) => (
            <Link
              key={inv.id}
              href={`/businesses/${businessId}/invoices/${inv.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{inv.customerName}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {inv.invoiceNumber} · due {inv.dueDate}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(inv.total)}</p>
              <StatusBadge status={inv.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

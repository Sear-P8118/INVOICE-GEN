'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { getInvoices } from '@/lib/firestore';
import { formatCurrency, getBusinessConfig } from '@/lib/constants';
import { australianFinancialYear, thisMonth, summarise, salesInRange, toCSV } from '@/lib/reports';
import { Invoice, effectiveStatus } from '@/types';

export default function ReportsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const config = getBusinessConfig(businessId)!;
  const fy = australianFinancialYear();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [from, setFrom] = useState(fy.start);
  const [to, setTo] = useState(fy.end);

  useEffect(() => {
    getInvoices(businessId).then(setInvoices).catch(() => setInvoices([]));
  }, [businessId]);

  const summary = useMemo(() => (invoices ? summarise(invoices, from, to) : null), [invoices, from, to]);
  const rows = useMemo(() => (invoices ? salesInRange(invoices, from, to) : []), [invoices, from, to]);

  function exportCsv() {
    if (!invoices) return;
    const csv = toCSV(invoices, from, to, config.name);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '-')}_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const month = thisMonth();
  const presets: { label: string; from: string; to: string }[] = [
    { label: fy.label, from: fy.start, to: fy.end },
    { label: 'This month', from: month.start, to: month.end },
    { label: 'All time', from: '2000-01-01', to: '2999-12-31' },
  ];

  return (
    <div>
      <TopBar title="Reports" />

      <div className="space-y-5 px-4 py-4 lg:px-6">
        {/* Date range */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/70">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const active = p.from === from && p.to === to;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setFrom(p.from);
                    setTo(p.to);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                    active ? `${config.ui.accent} text-white` : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-500">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-slate-500 focus:outline-none" />
            </label>
            <label className="text-xs font-medium text-slate-500">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-slate-500 focus:outline-none" />
            </label>
          </div>
        </div>

        {!summary && <p className="py-10 text-center text-sm text-slate-400">Loading…</p>}

        {summary && (
          <>
            {/* Money cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Revenue (inc. GST)" value={formatCurrency(summary.totalIncGst)} sub={`${summary.count} invoice${summary.count === 1 ? '' : 's'}`} big />
              <Stat label="GST collected" value={formatCurrency(summary.gst)} sub="contained in totals" />
              <Stat label="Net (ex. GST)" value={formatCurrency(summary.netExGst)} sub="your earnings" />
            </div>

            {/* Status split */}
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Paid" value={formatCurrency(summary.paid)} tone="emerald" />
              <Stat label="Pending" value={formatCurrency(summary.pending)} tone="amber" />
              <Stat label="Overdue" value={formatCurrency(summary.overdue)} tone="red" />
            </div>

            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-md ${config.ui.accent} disabled:opacity-40`}
            >
              <Download size={18} /> Export CSV for accountant
            </button>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/70 lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ex GST</th>
                    <th className="px-4 py-3 text-right">GST</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{i.invoiceNumber}</td>
                      <td className="px-4 py-2.5 text-slate-500">{i.issueDate}</td>
                      <td className="px-4 py-2.5 text-slate-700">{i.customerName}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={effectiveStatus(i)} /></td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(i.subtotal)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(i.gstAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(i.total)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">No invoices in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-center text-xs text-slate-400">
              Australian financial year runs 1 July – 30 June. Quotes and drafts are excluded. GST is the portion already included in each total.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  big,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  big?: boolean;
  tone?: 'emerald' | 'amber' | 'red';
}) {
  const toneText = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/70">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${big ? 'text-2xl' : 'text-xl'} ${toneText}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

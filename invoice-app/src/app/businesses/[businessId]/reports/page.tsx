'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Button from '@/components/ui/Button';
import Segmented from '@/components/ui/Segmented';
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
    <div className="pb-8">
      <TopBar title="Reports" large back backLabel="Settings" />

      <div className="space-y-5 px-4 pt-3 lg:px-6">
        {/* Date range */}
        <div className="space-y-3">
          <Segmented
            options={presets.map((p) => ({ value: p.label, label: p.label }))}
            value={presets.find((p) => p.from === from && p.to === to)?.label ?? ''}
            onChange={(label) => {
              const p = presets.find((x) => x.label === label);
              if (p) {
                setFrom(p.from);
                setTo(p.to);
              }
            }}
          />
          <div className="hairline overflow-hidden rounded-[14px] bg-surface">
            <label className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-[7.5rem] text-[17px] text-label">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="numeric w-full bg-transparent text-right text-[17px] outline-none"
              />
            </label>
            <label className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-[7.5rem] text-[17px] text-label">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="numeric w-full bg-transparent text-right text-[17px] outline-none"
              />
            </label>
          </div>
        </div>

        {!summary && <p className="py-10 text-center text-[15px] text-label3">Loading…</p>}

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

            <Button full large onClick={exportCsv} disabled={rows.length === 0}>
              <Download size={18} /> Export CSV for accountant
            </Button>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-[14px] bg-surface lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-group text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-label2">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ex GST</th>
                    <th className="px-4 py-3 text-right">GST</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[0.5px] divide-hair">
                  {rows.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-2.5 font-medium text-label">{i.invoiceNumber}</td>
                      <td className="px-4 py-2.5 text-label2">{i.issueDate}</td>
                      <td className="px-4 py-2.5 text-label">{i.customerName}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={effectiveStatus(i)} /></td>
                      <td className="px-4 py-2.5 text-right text-label2">{formatCurrency(i.subtotal)}</td>
                      <td className="px-4 py-2.5 text-right text-label2">{formatCurrency(i.gstAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-label">{formatCurrency(i.total)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-label3">No invoices in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="px-4 text-center text-[13px] leading-snug text-label3">
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
  const color =
    tone === 'emerald'
      ? 'var(--color-pos)'
      : tone === 'amber'
        ? 'var(--color-warn)'
        : tone === 'red'
          ? 'var(--color-neg)'
          : 'var(--color-label)';
  return (
    <div className="rounded-[14px] bg-surface p-4">
      <p className="text-[13px] text-label2">{label}</p>
      <p
        className={`numeric mt-1 font-bold leading-none ${big ? 'text-[26px]' : 'text-[20px]'}`}
        style={{ color }}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[13px] text-label3">{sub}</p>}
    </div>
  );
}

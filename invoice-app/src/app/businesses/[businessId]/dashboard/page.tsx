'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap,
  Building2,
  ArrowLeftRight,
  ClipboardList,
  Clock,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { watchInvoices, watchJobs } from '@/lib/firestore';
import { getBusinessConfig, formatCurrency } from '@/lib/constants';
import { Invoice, effectiveStatus } from '@/types';
import { StatusDot } from '@/components/ui/StatusBadge';
import { List, Row, Empty } from '@/components/ui/List';
import { parseISO, startOfMonth } from 'date-fns';

export default function DashboardPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const config = getBusinessConfig(businessId)!;
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [jobsNeeded, setJobsNeeded] = useState<number | null>(null);

  // Live snapshots render instantly from the on-device cache, then refresh
  // with server data — no waiting on the network for every page open.
  useEffect(() => watchInvoices(businessId, setInvoices), [businessId]);
  useEffect(
    () => watchJobs(businessId, (j) => setJobsNeeded(j.filter((x) => !x.invoiceId).length)),
    [businessId]
  );

  const stats = useMemo(() => {
    if (!invoices) return null;
    const monthStart = startOfMonth(new Date());

    const unpaid = invoices.filter((i) => {
      const s = effectiveStatus(i);
      return s === 'Pending' || s === 'Overdue';
    });
    const overdue = unpaid.filter((i) => effectiveStatus(i) === 'Overdue');
    const paidThisMonth = invoices
      .filter((i) => i.status === 'Paid' && parseISO(i.updatedAt) >= monthStart)
      .reduce((sum, i) => sum + i.total, 0);
    const unpaidTotal = unpaid.reduce((sum, i) => sum + i.total, 0);
    const drafts = invoices.filter((i) => i.status === 'Draft');

    return { unpaid, overdue, paidThisMonth, unpaidTotal, drafts };
  }, [invoices]);

  return (
    <div className="pb-8">
      {/* Header: business identity, kept quiet so the numbers lead. */}
      <header className="px-4 pb-1 pt-safe lg:px-6">
        {/* On desktop the sidebar already says which business you're in. */}
        <div className="flex items-center gap-3 pt-4 lg:hidden">
          <span
            className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
            style={{ backgroundColor: config.logo.bg }}
          >
            <Image
              src={config.logo.src}
              alt=""
              width={config.logo.width}
              height={config.logo.height}
              className="h-9 w-auto object-contain"
              priority
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-label">{config.name}</p>
            <p className="truncate text-[13px] text-label2">{config.tagline}</p>
          </div>
          <Link
            href="/home"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-fill text-[var(--tint)] active:opacity-50"
            aria-label="Switch business"
          >
            <ArrowLeftRight size={16} />
          </Link>
        </div>
        <h1 className="title-lg mt-4">Today</h1>
      </header>

      <div className="space-y-6 px-4 pt-4 lg:px-6">
        {/* The two numbers that matter */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/businesses/${businessId}/invoices?status=Pending`}
            className="pressable rounded-[14px] bg-surface p-4"
          >
            <p className="text-[13px] text-label2">Unpaid</p>
            <p className="numeric mt-1 text-[26px] font-bold leading-none text-label">
              {stats ? formatCurrency(stats.unpaidTotal) : '—'}
            </p>
            <p className="mt-1.5 text-[13px] text-label3">
              {stats ? `${stats.unpaid.length} invoice${stats.unpaid.length === 1 ? '' : 's'}` : ' '}
            </p>
          </Link>
          <div className="rounded-[14px] bg-surface p-4">
            <p className="text-[13px] text-label2">Paid this month</p>
            <p className="numeric mt-1 text-[26px] font-bold leading-none text-pos">
              {stats ? formatCurrency(stats.paidThisMonth) : '—'}
            </p>
            <p className="mt-1.5 text-[13px] text-label3">
              {stats && stats.overdue.length > 0
                ? `${stats.overdue.length} overdue`
                : stats
                  ? 'All on track'
                  : ' '}
            </p>
          </div>
        </div>

        {/* The two ways to make an invoice */}
        <div className="space-y-2.5">
          <button
            onClick={() => router.push(`/businesses/${businessId}/invoices/new?mode=fast`)}
            className="springy flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-white"
            style={{ backgroundColor: 'var(--tint2)' }}
          >
            <Zap size={22} strokeWidth={2.4} />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold leading-tight">
                Create Fast Invoice
              </span>
              <span className="block text-[13px] leading-tight text-white/75">
                One-off job — nothing saved
              </span>
            </span>
            <ChevronRight size={18} className="opacity-70" />
          </button>

          <button
            onClick={() => router.push(`/businesses/${businessId}/invoices/new?mode=trade`)}
            className="springy flex w-full items-center gap-3 rounded-[14px] bg-surface px-4 py-3.5 text-left"
          >
            <Building2 size={22} strokeWidth={2.2} style={{ color: 'var(--tint2)' }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold leading-tight text-label">
                Invoice Plus Trade Business
              </span>
              <span className="block text-[13px] leading-tight text-label2">
                Repeat customer — details saved
              </span>
            </span>
            <ChevronRight size={18} className="text-label3" />
          </button>
        </div>

        {/* Things waiting on you */}
        {((jobsNeeded ?? 0) > 0 || (stats?.drafts.length ?? 0) > 0) && (
          <List>
            {jobsNeeded !== null && jobsNeeded > 0 && (
              <Row
                href={`/businesses/${businessId}/jobs`}
                icon={<ClipboardList size={17} />}
                iconColor="var(--color-warn)"
                title={`${jobsNeeded} job${jobsNeeded === 1 ? '' : 's'} to invoice`}
              />
            )}
            {stats && stats.drafts.length > 0 && (
              <Row
                href={`/businesses/${businessId}/invoices?status=Draft`}
                icon={<Clock size={17} />}
                iconColor="var(--color-mute)"
                title={`${stats.drafts.length} saved for later`}
              />
            )}
          </List>
        )}

        {/* Unpaid list */}
        <List
          header="Awaiting payment"
          footer={
            stats && stats.unpaid.length > 6 ? (
              <Link href={`/businesses/${businessId}/invoices`} className="text-[var(--tint)]">
                View all {stats.unpaid.length} unpaid invoices
              </Link>
            ) : undefined
          }
        >
          {!stats && <p className="px-4 py-8 text-center text-[15px] text-label3">Loading…</p>}
          {stats && stats.unpaid.length === 0 && (
            <Empty
              icon={<CheckCircle2 size={38} strokeWidth={1.5} />}
              title="All caught up"
              hint="Nothing outstanding — nice work."
            />
          )}
          {stats?.unpaid.slice(0, 6).map((inv) => (
            <Row key={inv.id} href={`/businesses/${businessId}/invoices/${inv.id}`}>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <StatusDot status={effectiveStatus(inv)} />
                  <span className="truncate text-[17px] leading-tight text-label">
                    {inv.customerName}
                  </span>
                </span>
                <span className="mt-0.5 block truncate pl-[17px] text-[13px] text-label2">
                  {inv.invoiceNumber} · due {inv.dueDate || '—'}
                </span>
              </span>
              <span className="numeric shrink-0 text-[17px] font-semibold text-label">
                {formatCurrency(inv.total)}
              </span>
            </Row>
          ))}
        </List>
      </div>
    </div>
  );
}

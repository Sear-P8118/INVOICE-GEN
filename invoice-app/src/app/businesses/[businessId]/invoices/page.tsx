'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Plus, Search, FileText } from 'lucide-react';
import TopBar, { NavButton } from '@/components/ui/TopBar';
import Segmented from '@/components/ui/Segmented';
import { StatusDot, statusLabel } from '@/components/ui/StatusBadge';
import { List, Row, Empty } from '@/components/ui/List';
import { watchInvoices } from '@/lib/firestore';
import { formatCurrency } from '@/lib/constants';
import { Invoice, effectiveStatus } from '@/types';

// One segmented control instead of a row of chips — fewer choices, easier to hit.
type Filter = 'All' | 'Unpaid' | 'Paid' | 'Saved';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Unpaid', label: 'Unpaid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Saved', label: 'Saved' },
];

function matches(inv: Invoice, filter: Filter): boolean {
  const status = effectiveStatus(inv);
  switch (filter) {
    case 'Unpaid':
      return status === 'Pending' || status === 'Overdue';
    case 'Paid':
      return status === 'Paid';
    case 'Saved':
      return status === 'Draft';
    default:
      return true;
  }
}

export default function InvoicesPage() {
  return (
    <Suspense>
      <InvoicesInner />
    </Suspense>
  );
}

function InvoicesInner() {
  const { businessId } = useParams<{ businessId: string }>();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(() => {
    const s = searchParams.get('status');
    if (s === 'Draft') return 'Saved';
    if (s === 'Pending' || s === 'Overdue') return 'Unpaid';
    if (s === 'Paid') return 'Paid';
    return 'All';
  });

  useEffect(() => watchInvoices(businessId, setInvoices), [businessId]);

  const filtered = useMemo(() => {
    if (!invoices) return null;
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (!matches(inv, filter)) return false;
      if (!q) return true;
      return (
        inv.customerName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.issueDate.includes(q) ||
        inv.dueDate.includes(q)
      );
    });
  }, [invoices, search, filter]);

  const total = useMemo(
    () => (filtered ? filtered.reduce((sum, i) => sum + i.total, 0) : 0),
    [filtered]
  );

  return (
    <div className="pb-8">
      <TopBar
        title="Invoices"
        large
        right={
          <NavButton href={`/businesses/${businessId}/invoices/new?mode=fast`} label="New invoice">
            <Plus size={19} strokeWidth={2.4} />
          </NavButton>
        }
      />

      <div className="space-y-4 px-4 pt-3 lg:px-6">
        {/* Search */}
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

        <Segmented options={FILTERS} value={filter} onChange={setFilter} />

        <List
          footer={
            filtered && filtered.length > 0
              ? `${filtered.length} invoice${filtered.length === 1 ? '' : 's'} · ${formatCurrency(total)}`
              : undefined
          }
        >
          {!filtered && <p className="px-4 py-10 text-center text-[15px] text-label3">Loading…</p>}
          {filtered && filtered.length === 0 && (
            <Empty
              icon={<FileText size={38} strokeWidth={1.5} />}
              title={invoices?.length === 0 ? 'No invoices yet' : 'No matches'}
              hint={
                invoices?.length === 0
                  ? 'Tap + to create your first one.'
                  : 'Try a different search or filter.'
              }
            />
          )}
          {filtered?.map((inv) => {
            const status = effectiveStatus(inv);
            return (
              <Row
                key={inv.id}
                // A saved-for-later invoice reopens straight into the form to finish.
                href={
                  inv.status === 'Draft'
                    ? `/businesses/${businessId}/invoices/${inv.id}/edit`
                    : `/businesses/${businessId}/invoices/${inv.id}`
                }
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <StatusDot status={status} />
                    <span className="truncate text-[17px] leading-tight text-label">
                      {inv.customerName}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate pl-[17px] text-[13px] text-label2">
                    {inv.invoiceNumber ? `${inv.invoiceNumber} · ` : ''}
                    {inv.issueDate} · {statusLabel(status)}
                  </span>
                </span>
                <span className="numeric shrink-0 text-[17px] font-semibold text-label">
                  {formatCurrency(inv.total)}
                </span>
              </Row>
            );
          })}
        </List>
      </div>
    </div>
  );
}

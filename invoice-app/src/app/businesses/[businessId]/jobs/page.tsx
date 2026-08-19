'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, FileCheck2, ClipboardList } from 'lucide-react';
import TopBar, { NavButton } from '@/components/ui/TopBar';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import { List, Row, Empty } from '@/components/ui/List';
import QuickJobSheet from '@/components/job/QuickJobSheet';
import { watchJobs, deleteJob, convertJobToInvoice } from '@/lib/firestore';
import { formatCurrency } from '@/lib/constants';
import { Job } from '@/types';

function loggedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function JobsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Job | undefined>(undefined);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => watchJobs(businessId, setJobs), [businessId]);

  const { needed, invoiced } = useMemo(() => {
    const list = jobs || [];
    return {
      needed: list.filter((j) => !j.invoiceId),
      invoiced: list.filter((j) => j.invoiceId),
    };
  }, [jobs]);

  function openNew() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(job: Job) {
    setEditing(job);
    setSheetOpen(true);
  }

  async function createInvoice(job: Job) {
    setBusyId(job.id);
    try {
      const id = await convertJobToInvoice(job);
      router.push(`/businesses/${businessId}/invoices/${id}`);
    } catch {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteJob(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="pb-8">
      <TopBar
        title="Job Log"
        large
        back
        backLabel="Settings"
        subtitle="Log a job now, invoice it later"
        right={
          <NavButton onClick={openNew} label="Log a job">
            <Plus size={19} strokeWidth={2.4} />
          </NavButton>
        }
      />

      <div className="space-y-6 px-4 pt-3 lg:px-6">
        <Button full large onClick={openNew}>
          <Plus size={19} strokeWidth={2.4} /> Log a job
        </Button>

        <List header={needed.length > 0 ? `To invoice (${needed.length})` : 'To invoice'}>
          {!jobs && <p className="px-4 py-10 text-center text-[15px] text-label3">Loading…</p>}
          {jobs && needed.length === 0 && (
            <Empty
              icon={<ClipboardList size={38} strokeWidth={1.5} />}
              title="Nothing waiting"
              hint="Log a job after each call-out so nothing gets forgotten."
            />
          )}
          {needed.map((job) => (
            <div key={job.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] leading-tight text-label">{job.customerName}</p>
                  <p className="mt-0.5 truncate text-[13px] text-label2">
                    {job.customerPhone} · {loggedAt(job.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="numeric text-[17px] font-semibold text-label">
                    {formatCurrency(job.amount)}
                  </p>
                  <p
                    className="text-[13px] font-semibold"
                    style={{
                      color: job.paymentStatus === 'Paid' ? 'var(--color-pos)' : 'var(--color-warn)',
                    }}
                  >
                    {job.paymentStatus}
                  </p>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-snug text-label2">
                {job.description}
              </p>
              {(job.rego || job.location) && (
                <p className="mt-1 text-[13px] text-label3">
                  {[job.rego && `Rego ${job.rego}`, job.location].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  className="flex-1"
                  onClick={() => createInvoice(job)}
                  disabled={busyId === job.id}
                >
                  <FileCheck2 size={17} /> {busyId === job.id ? 'Creating…' : 'Create invoice'}
                </Button>
                <Button variant="secondary" onClick={() => openEdit(job)} aria-label="Edit job">
                  <Pencil size={17} />
                </Button>
                <Button variant="secondary" onClick={() => setDeleting(job)} aria-label="Delete job">
                  <Trash2 size={17} />
                </Button>
              </div>
            </div>
          ))}
        </List>

        {invoiced.length > 0 && (
          <List header="Invoiced">
            {invoiced.map((job) => (
              <Row
                key={job.id}
                href={`/businesses/${businessId}/invoices/${job.invoiceId}`}
                title={job.customerName}
                subtitle={job.description}
                value={
                  <span className="numeric font-semibold text-label">
                    {formatCurrency(job.amount)}
                  </span>
                }
              />
            ))}
          </List>
        )}
      </div>

      {sheetOpen && (
        <QuickJobSheet
          key={editing?.id ?? 'new'}
          businessId={businessId}
          existing={editing}
          onClose={() => setSheetOpen(false)}
          onSaved={() => {}}
        />
      )}

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete job?">
        <p className="px-1 text-[15px] leading-snug text-label2">
          {deleting?.customerName}&rsquo;s job will be removed from the log. This can&rsquo;t be
          undone.
        </p>
        <div className="mt-5 space-y-2">
          <Button full large variant="danger" onClick={handleDelete}>
            Delete job
          </Button>
          <Button full variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

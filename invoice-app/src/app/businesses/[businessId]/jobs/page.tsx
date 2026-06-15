'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, FileCheck2, ExternalLink, ClipboardList } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import QuickJobSheet from '@/components/job/QuickJobSheet';
import { getJobs, deleteJob, convertJobToInvoice } from '@/lib/firestore';
import { formatCurrency, getBusinessConfig } from '@/lib/constants';
import { Job } from '@/types';

function loggedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function JobsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const config = getBusinessConfig(businessId)!;
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Job | undefined>(undefined);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    getJobs(businessId).then(setJobs).catch(() => setJobs([]));
  }
  useEffect(reload, [businessId]);

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
    reload();
  }

  return (
    <div>
      <TopBar
        title="Job Log"
        right={
          <button onClick={openNew} className={`rounded-xl p-2 text-white ${config.ui.accent}`} aria-label="Quick job">
            <Plus size={20} />
          </button>
        }
      />

      <div className="space-y-6 px-4 py-4 lg:px-6">
        <button
          onClick={openNew}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl ${config.ui.accent} py-4 text-base font-bold text-white shadow-md transition-transform active:scale-[0.98]`}
        >
          <Plus size={20} strokeWidth={2.5} /> Quick Job
        </button>

        {/* Invoice Needed */}
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-900">
            Invoice needed
            {needed.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{needed.length}</span>
            )}
          </h2>

          {!jobs && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}
          {jobs && needed.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white/70 py-10 text-center shadow-sm ring-1 ring-slate-100">
              <ClipboardList className="mx-auto mb-2 text-slate-300" size={32} strokeWidth={1.6} />
              <p className="text-sm font-semibold text-slate-600">Nothing waiting</p>
              <p className="mt-0.5 text-xs text-slate-400">Tap Quick Job after each job so nothing gets forgotten.</p>
            </div>
          )}

          <div className="space-y-2.5">
            {needed.map((job) => (
              <div key={job.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/70">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{job.customerName}</p>
                    <p className="text-xs text-slate-400">{job.customerPhone} · logged {loggedAt(job.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-bold text-slate-900">{formatCurrency(job.amount)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        job.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {job.paymentStatus}
                    </span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{job.description}</p>
                {(job.rego || job.location) && (
                  <p className="mt-1 text-xs text-slate-400">
                    {[job.rego && `Rego ${job.rego}`, job.location].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    onClick={() => createInvoice(job)}
                    disabled={busyId === job.id}
                    className="flex-1 bg-emerald-600 text-white active:bg-emerald-700"
                  >
                    <FileCheck2 size={18} /> {busyId === job.id ? 'Creating…' : 'Create Invoice'}
                  </Button>
                  <button onClick={() => openEdit(job)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 active:bg-slate-100" aria-label="Edit">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => setDeleting(job)} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 active:bg-red-50 active:text-red-500" aria-label="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Invoiced (history) */}
        {invoiced.length > 0 && (
          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">Invoiced</h2>
            <div className="space-y-2.5">
              {invoiced.map((job) => (
                <Link
                  key={job.id}
                  href={`/businesses/${businessId}/invoices/${job.invoiceId}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 opacity-90 shadow-sm ring-1 ring-slate-100/70 active:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700">{job.customerName}</p>
                    <p className="truncate text-xs text-slate-400">{job.description}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{formatCurrency(job.amount)}</span>
                  <ExternalLink size={16} className="text-slate-400" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {sheetOpen && (
        <QuickJobSheet
          key={editing?.id ?? 'new'}
          businessId={businessId}
          existing={editing}
          onClose={() => setSheetOpen(false)}
          onSaved={reload}
        />
      )}

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete job?">
        <p className="text-sm text-slate-600">
          {deleting?.customerName}&rsquo;s job will be removed from the log. This can&rsquo;t be undone.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

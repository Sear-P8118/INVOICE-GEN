import { InvoiceStatus } from '@/types';

// iOS system colours: green = done, orange = waiting, red = attention,
// blue = informational, grey = inactive.
const colors: Record<InvoiceStatus, string> = {
  Draft: 'var(--color-mute)',
  Pending: 'var(--color-warn)',
  Paid: 'var(--color-pos)',
  Overdue: 'var(--color-neg)',
  Quote: 'var(--color-info)',
};

// 'Draft' is what "Save for later" produces — call it that in the UI.
export function statusLabel(status: InvoiceStatus): string {
  return status === 'Draft' ? 'Saved' : status;
}

export function statusColor(status: InvoiceStatus): string {
  return colors[status];
}

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-[3px] text-[12px] font-semibold leading-none text-white"
      style={{ backgroundColor: colors[status] }}
    >
      {statusLabel(status)}
    </span>
  );
}

/** Just the coloured dot — for dense list rows where a pill is too loud. */
export function StatusDot({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className="inline-block h-[9px] w-[9px] shrink-0 rounded-full"
      style={{ backgroundColor: colors[status] }}
      aria-label={statusLabel(status)}
    />
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Clock, FileText, LucideIcon } from 'lucide-react';
import { InvoiceStatus } from '@/types';
import { statusColor } from '@/components/ui/StatusBadge';

interface Choice {
  value: InvoiceStatus;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const STATUS_CHOICES: Choice[] = [
  { value: 'Pending', label: 'Pending', hint: 'Sent now, customer pays by the due date', icon: Clock },
  { value: 'Paid', label: 'Paid', hint: 'Already paid — records the date it was paid', icon: CheckCircle2 },
  { value: 'Overdue', label: 'Overdue', hint: 'Unpaid and past its due date', icon: AlertCircle },
  { value: 'Quote', label: 'Quote', hint: 'A priced offer — nothing owed yet', icon: FileText },
];

interface Props {
  /** Pre-selected choice — the one Continue confirms. */
  value: InvoiceStatus;
  onPick: (status: InvoiceStatus) => void;
}

const EXIT_MS = 260;

/**
 * The first thing a new invoice asks: what is it? Rises as an iOS sheet with
 * four big choices. Tapping one confirms it straight away; dismissing keeps
 * the pre-selected one (Pending), so nothing ever goes out marked Paid by
 * accident.
 */
export default function StatusPicker({ value, onPick }: Props) {
  const [selected, setSelected] = useState(value);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  function confirm(status: InvoiceStatus) {
    if (closing) return;
    setSelected(status);
    setClosing(true);
    // Let the tick land, then slide away.
    timer.current = setTimeout(() => onPick(status), EXIT_MS + 120);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && confirm(selected);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-picker-title"
    >
      <button
        aria-label="Keep selection"
        className={`absolute inset-0 bg-black/30 ${closing ? 'scrim-out' : 'sheet-scrim'}`}
        onClick={() => confirm(selected)}
      />
      <div
        className={`relative w-full rounded-t-[16px] bg-group pb-safe shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:max-w-md sm:rounded-[16px] ${
          closing ? 'sheet-down' : 'sheet-panel'
        }`}
      >
        <span className="mx-auto mt-2 block h-[5px] w-9 rounded-full bg-[#c7c7cc] sm:hidden" />
        <div className="px-5 pb-4 pt-4 text-center">
          <h2 id="status-picker-title" className="text-[20px] font-bold tracking-[-0.02em] text-label">
            What&rsquo;s this invoice?
          </h2>
          <p className="mt-1 text-[14px] text-label2">You can change it any time before sending.</p>
        </div>

        <div className="space-y-2 px-4">
          {STATUS_CHOICES.map((c, i) => {
            const active = selected === c.value;
            const color = statusColor(c.value);
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => confirm(c.value)}
                style={{
                  animationDelay: `${60 + i * 45}ms`,
                  borderColor: active ? color : 'transparent',
                  boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` : undefined,
                }}
                className="choice-in springy flex w-full items-center gap-3.5 rounded-[14px] border-2 bg-surface px-4 py-3.5 text-left transition-[border-color,box-shadow] duration-200"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                >
                  <Icon size={21} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold text-label">{c.label}</span>
                  <span className="block text-[13px] leading-snug text-label2">{c.hint}</span>
                </span>
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
                  style={{
                    borderColor: active ? color : 'var(--color-hair)',
                    backgroundColor: active ? color : 'transparent',
                  }}
                >
                  {active && <Check size={14} strokeWidth={3.2} className="text-white" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-5 pt-4">
          <button
            type="button"
            onClick={() => confirm(selected)}
            className="min-h-[50px] w-full rounded-[12px] bg-[var(--tint2)] text-[17px] font-semibold text-white active:opacity-80"
          >
            Continue as {STATUS_CHOICES.find((c) => c.value === selected)?.label}
          </button>
        </div>
      </div>
    </div>
  );
}

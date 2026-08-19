'use client';

import { ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Right-hand action in the sheet's header (defaults to nothing). */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * iOS sheet: rises from the bottom with a grabber, rounded top corners and a
 * Cancel/Done header. Becomes a centred card on large screens.
 */
export default function Sheet({ open, onClose, title, action, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        aria-label="Close"
        className="sheet-scrim absolute inset-0 bg-black/25"
        onClick={onClose}
      />
      <div className="sheet-panel relative flex max-h-[92dvh] w-full flex-col rounded-t-[14px] bg-group shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:max-w-lg sm:rounded-[14px]">
        <span className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-[#c7c7cc] sm:hidden" />
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onClose}
            className="flex-1 basis-0 text-left text-[17px] text-[var(--tint)] active:opacity-50"
          >
            Cancel
          </button>
          <h2 className="truncate px-2 text-[17px] font-semibold text-label">{title}</h2>
          <div className="flex-1 basis-0 text-right">{action}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 pb-safe">{children}</div>
      </div>
    </div>
  );
}

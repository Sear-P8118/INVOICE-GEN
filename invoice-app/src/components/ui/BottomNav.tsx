'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, FileText, Users, Settings } from 'lucide-react';

// iOS Safari mispositions position:fixed elements while the on-screen keyboard
// is open, leaving the bar stranded mid-screen after the keyboard closes.
// Hiding the bar whenever the keyboard is up (and re-mounting it on close)
// sidesteps the bug entirely and frees up screen space while typing.
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) =>
      el instanceof HTMLElement && el.matches('input, textarea, select, [contenteditable="true"]');

    const onFocusIn = (e: FocusEvent) => {
      if (isEditable(e.target)) setOpen(true);
    };
    const onFocusOut = () => {
      // Wait a tick: focus may be moving between two fields.
      setTimeout(() => {
        if (!isEditable(document.activeElement)) setOpen(false);
      }, 60);
    };
    const vv = window.visualViewport;
    const onViewport = () => {
      if (!vv) return;
      const keyboardUp = window.innerHeight - vv.height > 120;
      if (keyboardUp) setOpen(true);
      else if (!isEditable(document.activeElement)) setOpen(false);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    vv?.addEventListener('resize', onViewport);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      vv?.removeEventListener('resize', onViewport);
    };
  }, []);

  return open;
}

/** iOS tab bar: frosted material, hairline top, tinted active tab. */
export default function BottomNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  const base = `/businesses/${businessId}`;

  const items = [
    { href: `${base}/dashboard`, label: 'Home', icon: House },
    { href: `${base}/invoices`, label: 'Invoices', icon: FileText },
    { href: `${base}/customers`, label: 'Customers', icon: Users },
    { href: `${base}/settings`, label: 'Settings', icon: Settings },
  ];

  // Unmount (not just visually hide) so iOS recomputes the fixed position fresh
  // when the keyboard closes.
  if (keyboardOpen) return null;

  return (
    <nav className="material fixed inset-x-0 bottom-0 z-40 border-t-[0.5px] border-hair pb-safe lg:hidden">
      <div className="mx-auto flex max-w-2xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-[3px] pt-2 text-[10px] font-medium tracking-[0.01em]"
              style={{ color: active ? 'var(--tint)' : 'var(--color-mute)' }}
            >
              <Icon size={25} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

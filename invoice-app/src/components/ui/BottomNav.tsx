'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings } from 'lucide-react';

export default function BottomNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const base = `/businesses/${businessId}`;

  const items = [
    { href: `${base}/dashboard`, label: 'Home', icon: LayoutDashboard },
    { href: `${base}/invoices`, label: 'Invoices', icon: FileText },
    { href: `${base}/customers`, label: 'Customers', icon: Users },
    { href: `${base}/settings`, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-safe lg:hidden">
      <div className="mx-auto flex max-w-2xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? 'text-slate-900' : 'text-slate-400'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

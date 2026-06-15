'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Package, Settings, ArrowLeftRight, LogOut } from 'lucide-react';
import { getBusinessConfig } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

// Desktop-only left navigation. Hidden on phones (bottom nav is used there).
export default function Sidebar({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const config = getBusinessConfig(businessId);
  const { signOut, user } = useAuth();
  if (!config) return null;

  const base = `/businesses/${businessId}`;
  const items = [
    { href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `${base}/invoices`, label: 'Invoices', icon: FileText },
    { href: `${base}/customers`, label: 'Customers', icon: Users },
    { href: `${base}/items`, label: 'Saved items', icon: Package },
    { href: `${base}/settings`, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <span
          className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg"
          style={{ backgroundColor: config.logo.bg }}
        >
          <Image src={config.logo.src} alt="" width={config.logo.width} height={config.logo.height} className="h-9 w-auto object-contain" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{config.name}</p>
          <p className="truncate text-xs text-slate-400">{config.tagline}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? `${config.ui.accent} text-white shadow-sm` : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-100 px-3 py-3">
        <Link href="/home" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <ArrowLeftRight size={19} /> Switch business
        </Link>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut size={19} /> Sign out
        </button>
        {user?.email && <p className="px-3 pt-1 text-[11px] text-slate-400">{user.email}</p>}
      </div>
    </aside>
  );
}

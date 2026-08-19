'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Users,
  BarChart3,
  Settings,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react';
import { getBusinessConfig } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

// macOS-style source list. Hidden on phones (the tab bar is used there).
export default function Sidebar({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const config = getBusinessConfig(businessId);
  const { signOut, user } = useAuth();
  if (!config) return null;

  const base = `/businesses/${businessId}`;
  const items = [
    { href: `${base}/dashboard`, label: 'Home', icon: LayoutDashboard },
    { href: `${base}/invoices`, label: 'Invoices', icon: FileText },
    { href: `${base}/customers`, label: 'Customers', icon: Users },
    { href: `${base}/jobs`, label: 'Job Log', icon: ClipboardList },
    { href: `${base}/reports`, label: 'Reports', icon: BarChart3 },
    { href: `${base}/settings`, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r-[0.5px] border-hair bg-[#fbfbfd] lg:flex">
      <div className="flex items-center gap-3 px-4 py-5">
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
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-label">{config.name}</p>
          <p className="truncate text-[12px] text-label2">{config.tagline}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-[2px] px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: 'var(--tint)', color: '#fff' }
                  : { color: 'var(--color-label)' }
              }
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-[2px] border-t-[0.5px] border-hair px-2 py-3">
        <Link
          href="/home"
          className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium text-label2 hover:bg-fill"
        >
          <ArrowLeftRight size={18} /> Switch business
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium text-label2 hover:bg-fill"
        >
          <LogOut size={18} /> Sign out
        </button>
        {user?.email && <p className="px-3 pt-1 text-[11px] text-label3">{user.email}</p>}
      </div>
    </aside>
  );
}

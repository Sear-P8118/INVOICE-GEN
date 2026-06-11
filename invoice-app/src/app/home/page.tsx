'use client';

import Link from 'next/link';
import { LogOut, ChevronRight } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { BUSINESSES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeInner />
    </AuthGuard>
  );
}

function HomeInner() {
  const { signOut } = useAuth();

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-slate-900 px-5 pb-safe">
      <header className="flex items-center justify-between pb-2 pt-12">
        <div>
          <h1 className="text-2xl font-bold text-white">My Businesses</h1>
          <p className="mt-1 text-sm text-slate-400">Choose a business to send invoices</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-xl p-2.5 text-slate-400 active:bg-slate-800"
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="mt-6 flex flex-1 flex-col gap-4">
        {BUSINESSES.map((biz) => (
          <Link
            key={biz.id}
            href={`/businesses/${biz.id}/dashboard`}
            className={`flex items-center gap-4 rounded-2xl bg-gradient-to-br ${biz.gradient} p-5 shadow-lg transition-transform active:scale-[0.98]`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl">
              {biz.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-bold text-white">{biz.name}</span>
              <span className="block text-sm text-white/70">{biz.tagline}</span>
            </span>
            <ChevronRight className="shrink-0 text-white/60" size={22} />
          </Link>
        ))}
      </div>

      <p className="py-6 text-center text-xs text-slate-600">
        Battery Invoices · Private app
      </p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LogOut, ChevronRight } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import BirthdayGate from '@/components/BirthdayGate';
import { BUSINESSES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  return (
    <AuthGuard>
      <BirthdayGate />
      <HomeInner />
    </AuthGuard>
  );
}

function HomeInner() {
  const { signOut } = useAuth();

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pb-safe lg:max-w-5xl"
      style={{
        background:
          'radial-gradient(900px 520px at 100% 0%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(700px 500px at 0% 100%, rgba(99,102,241,0.14), transparent 55%), #060a14',
      }}
    >
      <header
        className="flex items-center justify-between pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Popal Holdings
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight text-white">
            Select a business
          </h1>
        </div>
        <button
          onClick={signOut}
          className="rounded-xl p-2.5 text-slate-500 active:bg-slate-800"
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {BUSINESSES.map((biz) => (
          <Link
            key={biz.id}
            href={`/businesses/${biz.id}/dashboard`}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/30 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div
              className="flex h-28 items-center justify-center px-6"
              style={{ backgroundColor: biz.logo.bg }}
            >
              <Image
                src={biz.logo.src}
                alt={`${biz.name} logo`}
                width={biz.logo.width}
                height={biz.logo.height}
                className="h-20 w-auto object-contain"
                priority
              />
            </div>
            <div className={`flex items-center gap-3 bg-gradient-to-r ${biz.ui.gradient} px-5 py-4`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-white">{biz.name}</span>
                <span className="block truncate text-xs text-white/65">{biz.tagline}</span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <ChevronRight className="text-white" size={18} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-auto py-6 text-center text-xs text-slate-700">
        Battery Invoices · Private app
      </p>
    </div>
  );
}

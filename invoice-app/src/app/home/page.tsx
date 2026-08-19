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
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-safe lg:max-w-4xl lg:px-6">
      <header className="flex items-end justify-between pb-4 pt-safe">
        <div className="pt-8">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-label2">
            Popal Holdings
          </p>
          <h1 className="title-lg mt-1">Businesses</h1>
        </div>
        <button
          onClick={signOut}
          className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-fill text-label2 active:opacity-50"
          aria-label="Sign out"
        >
          <LogOut size={17} />
        </button>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        {BUSINESSES.map((biz) => (
          <Link
            key={biz.id}
            href={`/businesses/${biz.id}/dashboard`}
            className="springy overflow-hidden rounded-[16px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <div
              className="flex h-24 items-center justify-center px-6"
              style={{ backgroundColor: biz.logo.bg }}
            >
              <Image
                src={biz.logo.src}
                alt={`${biz.name} logo`}
                width={biz.logo.width}
                height={biz.logo.height}
                className="h-16 w-auto object-contain"
                priority
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold leading-tight text-label">
                  {biz.name}
                </span>
                <span className="mt-0.5 block truncate text-[13px] leading-tight text-label2">
                  {biz.tagline}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0" style={{ color: biz.ui.tint }} />
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-auto py-6 text-center text-[12px] text-label3">Battery Invoices · Private app</p>
    </div>
  );
}

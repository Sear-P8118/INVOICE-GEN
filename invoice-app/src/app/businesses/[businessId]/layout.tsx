'use client';

import { ReactNode } from 'react';
import { useParams, notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import BottomNav from '@/components/ui/BottomNav';
import Sidebar from '@/components/ui/Sidebar';
import { getBusinessConfig } from '@/lib/constants';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  const { businessId } = useParams<{ businessId: string }>();
  if (!getBusinessConfig(businessId)) notFound();

  return (
    <AuthGuard>
      {/* Phone: single column + bottom nav. Desktop: sidebar + wider workspace. */}
      <div className="lg:flex">
        <Sidebar businessId={businessId} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto min-h-dvh max-w-2xl pb-24 lg:max-w-4xl lg:pb-12">{children}</div>
        </main>
      </div>
      <BottomNav businessId={businessId} />
    </AuthGuard>
  );
}

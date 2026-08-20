'use client';

import { ReactNode } from 'react';
import { useParams, notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import BottomNav from '@/components/ui/BottomNav';
import Sidebar from '@/components/ui/Sidebar';
import { getBusinessConfig } from '@/lib/constants';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  const { businessId } = useParams<{ businessId: string }>();
  const config = getBusinessConfig(businessId);
  if (!config) notFound();

  return (
    <AuthGuard>
      {/* One tint per business, the way an Apple app has a single accent colour.
          Everything below reads var(--tint), so nothing else needs branding. */}
      <div
        style={
          {
            '--tint': config.ui.tint,
            '--tint2': config.ui.tint2 || config.ui.tint,
          } as React.CSSProperties
        }
      >
        {/* Phone: single column + tab bar. Desktop: source list + wider workspace. */}
        <div className="lg:flex">
          <Sidebar businessId={businessId} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto min-h-dvh max-w-2xl pb-28 lg:max-w-4xl lg:pb-12">{children}</div>
          </main>
        </div>
        <BottomNav businessId={businessId} />
      </div>
    </AuthGuard>
  );
}

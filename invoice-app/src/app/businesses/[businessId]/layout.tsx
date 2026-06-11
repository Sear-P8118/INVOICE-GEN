'use client';

import { ReactNode } from 'react';
import { useParams, notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import BottomNav from '@/components/ui/BottomNav';
import { getBusinessConfig } from '@/lib/constants';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  const { businessId } = useParams<{ businessId: string }>();
  if (!getBusinessConfig(businessId)) notFound();

  return (
    <AuthGuard>
      <div className="mx-auto min-h-dvh max-w-2xl pb-24">{children}</div>
      <BottomNav businessId={businessId} />
    </AuthGuard>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/home' : '/login');
  }, [user, loading, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900">
      <span className="animate-pulse text-lg font-medium text-white">Loading…</span>
    </div>
  );
}
